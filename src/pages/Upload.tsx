import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music, Play, Pause } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface UploadProps {
  onNavigate: (page: string) => void;
}

interface UserRecipe {
  id: string;
  title: string;
  image_url: string;
}

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [postType, setPostType] = useState<'post' | 'daily'>('post');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Music states
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement>(null);

  useEffect(() => {
    loadUserRecipes();
  }, []);

  const loadUserRecipes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: recipes, error } = await supabase
        .from('public_recipes')
        .select('id, title, image_url')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserRecipes(recipes || []);
    } catch (error: any) {
      console.error('Error loading recipes:', error);
    }
  };
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      
      if (isNaN(duration) || duration === 0) {
        reject(new Error('Invalid video duration'));
      } else {
        resolve(duration);
      }
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
};
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;


  
// Filter for images only (for multi-upload, skip videos for now)
  const imageFiles = files.filter(f => f.type.startsWith('image/'));
  
  if (imageFiles.length === 0) {
    toast.error('Please select at least one image');
    return;
  }

  // Validate size for each image
  const validFiles: File[] = [];
  const validPreviews: string[] = [];

  for (const file of imageFiles) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error(`${file.name} is too large (max 10MB)`);
      continue;
    }
    validFiles.push(file);
    validPreviews.push(URL.createObjectURL(file));
  }

  if (validFiles.length === 0) {
    toast.error('No valid images to upload');
    return;
  }

  setSelectedFiles(validFiles);
  setPreviewUrls(validPreviews);
  setFileType('image');
};

    
  // ✅ Better file type validation
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');

  if (!isImage && !isVideo) {
    toast.error('Please select an image or video file');
    return;
  }

  // ✅ Better size validation
  if (isImage && file.size > 10 * 1024 * 1024) {
    toast.error('Image must be less than 10MB');
    return;
  }

  if (isVideo && file.size > 100 * 1024 * 1024) {
    toast.error('Video must be less than 100MB');
    return;
  }

  if (isImage) {
    setFileType('image');
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  } else if (isVideo) {
    // ✅ Better video duration handling
    try {
      const duration = await getVideoDuration(file);
      setVideoDuration(duration);

      if (postType === 'daily' && duration > 30) {
        toast.error('Daily videos must be 30 seconds or less');
        return;
      }

      setFileType('video');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } catch (error) {
      console.error('Video load error:', error);
      toast.error('Failed to load video. Please try another file.');
    }
  }
};

  const handleClearImage = () => {
    setSelectedFile(null);
    setFileType(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const togglePreview = () => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  // iTunes API search (free, no auth needed)
  const searchMusic = async (query: string) => {
    if (!query.trim()) {
      setMusicResults([]);
      return;
    }
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
      );
      const data = await res.json();

      const tracks = (data.results || []).map((t: any) => ({
        id: t.trackId.toString(),
        name: t.trackName || 'Unknown Song',
        artists: [{ name: t.artistName || 'Unknown Artist' }],
        album: { 
          images: [{ url: t.artworkUrl100?.replace('100x100', '300x300') || 'https://via.placeholder.com/300' }] 
        },
        preview_url: t.previewUrl || null,
      }));

      setMusicResults(tracks);
    } catch (err) {
      console.error('Music search failed:', err);
      toast.error('Search failed — try again');
      setMusicResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image or video');
      return;
    }
    if (postType === 'post' && !title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (postType === 'daily' && fileType === 'video' && videoDuration > 30) {
      toast.error('Daily videos must be 30 seconds or less');
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: userData.user.id,
          username: userData.user.email?.split('@')[0] || 'user',
          avatar_url: null,
        });
      }

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${userData.user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(fileName, selectedFile, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);

      // Music data for both posts & dailies
      const musicData: any = {
        spotify_track_id: selectedTrack?.id || null,
        spotify_track_name: selectedTrack?.name || null,
        spotify_artist_name: selectedTrack?.artists?.[0]?.name || null,
        spotify_album_art: selectedTrack?.album?.images?.[0]?.url || null,
        spotify_preview_url: selectedTrack?.preview_url || null,
      };

      if (postType === 'daily') {
        const dailyData: any = {
          user_id: userData.user.id,
          media_url: urlData.publicUrl,
          media_type: fileType === 'image' ? 'photo' : 'video',
          caption: caption.trim() || null,
          duration: fileType === 'video' ? videoDuration : null,
          ...musicData,
        };

        const { error: insertError } = await supabase.from('dailies').insert(dailyData);
        if (insertError) throw insertError;

        await supabase.from('posts').insert({
          user_id: userData.user.id,
          title: 'Daily',
          caption: caption.trim() || null,
          [fileType === 'image' ? 'image_url' : 'video_url']: urlData.publicUrl,
          ...musicData,
        });

        toast.success('Daily posted successfully!');
      } else {
        let recipeLink = selectedRecipeId
          ? `${window.location.origin}/#recipe/${selectedRecipeId}`
          : null;

        const postData: any = {
          user_id: userData.user.id,
          title: title.trim(),
          caption: caption.trim() || null,
          recipe_url: recipeLink,
          [fileType === 'image' ? 'image_url' : 'video_url']: urlData.publicUrl,
          ...musicData,
        };

        const { data: newPost, error: insertError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        if (insertError) throw insertError;

        const hashtagTexts = extractHashtags(caption);
        if (hashtagTexts.length > 0 && newPost) {
          for (const tag of hashtagTexts) {
            const { data: existingTag } = await supabase
              .from('hashtags')
              .select('id, usage_count')
              .eq('tag', tag)
              .maybeSingle();

            let hashtagId: string;
            if (existingTag) {
              hashtagId = existingTag.id;
              await supabase
                .from('hashtags')
                .update({ usage_count: existingTag.usage_count + 1 })
                .eq('id', existingTag.id);
            } else {
              const { data: newTag } = await supabase
                .from('hashtags')
                .insert({ tag, usage_count: 1 })
                .select()
                .single();
              hashtagId = newTag!.id;
            }
            await supabase
              .from('post_hashtags')
              .insert({ post_id: newPost.id, hashtag_id: hashtagId });
          }
        }

        toast.success('Post uploaded successfully!');
      }

      handleClearImage();
      setTitle('');
      setCaption('');
      setSelectedRecipeId('');
      setSelectedTrack(null);
      onNavigate('discover');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-gray-50 pb-40 overflow-x-hidden"
      style={{ paddingBottom: 'max(10rem, env(safe-area-inset-bottom))' }}
    >
      <div 
        className="sticky top-0 bg-white border-b border-gray-200 z-30"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => onNavigate('discover')} className="text-gray-600 hover:text-gray-900 font-medium">
            Cancel
          </button>
          <h1 className="text-lg font-semibold">New {postType === 'daily' ? 'Daily' : 'Post'}</h1>
          <div className="w-16"></div>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Post Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPostType('post')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                postType === 'post'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Post
            </button>
            <button
              onClick={() => setPostType('daily')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                postType === 'daily'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
          </div>
          {postType === 'daily' && (
            <p className="text-xs text-gray-500 mt-2">
              Dailies expire after 24 hours. Videos must be 30 seconds or less.
            </p>
          )}
        </div>

        {!previewUrl ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center hover:border-orange-500 transition-colors cursor-pointer">
            <label className="cursor-pointer">
            <input 
  type="file" 
  accept="image/*" 
  multiple 
  onChange={handleFileSelect} 
  className="hidden" 
/>
              <div className="space-y-4">
                <div className="flex gap-3 sm:gap-4 justify-center">
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                    <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                  <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                    <Video className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">Upload a photo or video</p>
                  <p className="text-xs sm:text-sm text-gray-500">Click to select a file from your device</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="relative">
            {fileType === 'image' ? (
              <img src={previewUrl} alt="Preview" className="w-full aspect-square object-cover rounded-xl" />
            ) : (
              <video src={previewUrl} controls className="w-full aspect-square object-cover rounded-xl" />
            )}
            <button
              onClick={handleClearImage}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Music Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Add Music (optional)</label>
            <button
              onClick={() => setShowMusicPicker(true)}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
            >
              <Music className="w-5 h-5" />
              {selectedTrack ? 'Change Music' : 'Add Music'}
            </button>
          </div>

          {selectedTrack && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <img
                src={selectedTrack.album.images[0]?.url}
                alt="album"
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedTrack.name}</p>
                <p className="text-xs text-gray-600 truncate">{selectedTrack.artists[0].name}</p>
              </div>
              <button 
                onClick={togglePreview}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 transition-colors"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button onClick={() => setSelectedTrack(null)} className="text-red-600">
                <X className="w-5 h-5" />
              </button>
              <audio
                ref={audioPreviewRef}
                src={selectedTrack.preview_url}
                onEnded={() => setIsPlayingPreview(false)}
                onPlay={() => setIsPlayingPreview(true)}
                onPause={() => setIsPlayingPreview(false)}
              />
            </div>
          )}
        </div>

        <div className="space-y-4 bg-white rounded-xl p-4 shadow-sm">
          {postType === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your post"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/200</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="min-h-24 resize-none"
              maxLength={2200}
            />
            <p className="text-xs text-gray-400 mt-1">{caption.length}/2200</p>
          </div>

          {postType === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Recipe (optional)
              </label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipe from your collection" />
                </SelectTrigger>
                <SelectContent>
                  {userRecipes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No recipes yet. Add some recipes first!
                    </div>
                  ) : (
                    userRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        <div className="flex items-center gap-2">
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt={recipe.title} className="w-8 h-8 rounded object-cover" />
                          )}
                          <span>{recipe.title}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {selectedFile && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <UploadIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-900">Ready to post</p>
                <p className="text-xs text-orange-700 mt-1 truncate">{selectedFile.name}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button at Bottom */}
      <div 
        className="fixed bottom-0 left-0 right-0 px-4 pb-6 bg-gradient-to-t from-white via-white to-transparent z-40"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="max-w-lg mx-auto flex justify-center">
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || (postType === 'post' && !title.trim()) || uploading}
            className="px-12 sm:px-16 py-5 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg rounded-full"
          >
            {uploading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>

      {/* Music Picker Modal */}
      {showMusicPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center">
          <div 
            className="bg-white w-full md:max-w-lg md:rounded-2xl flex flex-col"
            style={{ 
              maxHeight: '85vh',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-lg">Choose Music</h3>
              <button onClick={() => setShowMusicPicker(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 flex-shrink-0">
              <input
                type="text"
                value={musicSearch}
                onChange={(e) => {
                  setMusicSearch(e.target.value);
                  searchMusic(e.target.value);
                }}
                placeholder="Search any song..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {searchingMusic && <p className="text-center text-gray-500 py-8">Searching...</p>}
              {musicResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    setShowMusicPicker(false);
                    toast.success('Music added!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition text-left"
                >
                  <img
                    src={track.album.images[0]?.url || '/placeholder.png'}
                    alt="album"
                    className="w-12 h-12 rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.name}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex-shrink-0">30s Preview</span>
                </button>
              ))}
              {musicSearch && musicResults.length === 0 && !searchingMusic && (
                <p className="text-center text-gray-500 py-8">No tracks found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}