import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [postType, setPostType] = useState<'post' | 'daily'>('post');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // ── SPOTIFY STATES ───────────────────────────────────────
  const [showSpotifyPicker, setShowSpotifyPicker] = useState(false);
  const [spotifySearch, setSpotifySearch] = useState('');
  const [spotifyResults, setSpotifyResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchingMusic, setSearchingMusic] = useState(false);
  // ───────────────────────────────────────────────────────────

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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Image size must be less than 10MB');
          return;
        }
        setFileType('image');
        setSelectedFile(file);
        setPreviewUrl(URL.createObjectURL(file));
      } else if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.preload = 'metadata';
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(video.src);
          const duration = Math.floor(video.duration);
          setVideoDuration(duration);
          if (postType === 'daily' && duration > 30) {
            toast.error('Daily videos must be 30 seconds or less');
            return;
          }
          setFileType('video');
          setSelectedFile(file);
          setPreviewUrl(URL.createObjectURL(file));
        };
        video.src = URL.createObjectURL(file);
      } else {
        toast.error('Please select an image or video file');
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

  // ── SPOTIFY SEARCH FUNCTION ─────────────────────────────────
    // YOUTUBE MUSIC SEARCH — WORKING 100%
  const searchYouTubeMusic = async (query: string) => {
    if (!query.trim()) {
      setSpotifyResults([]);
      return;
    }
    setSearchingMusic(true);
    try {
      const res = await fetch(`https://youtube-music-api.vercel.app/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const tracks = (data?.result || []).map((t: any) => ({
        id: t.videoId,
        name: t.title || 'Unknown',
        artists: [{ name: t.artist || 'Unknown Artist' }],
        album: { images: [{ url: t.thumbnails?.[0]?.url || '' }] },
        preview_url: `https://www.youtube.com/watch?v=${t.videoId}`,
      }));
      setSpotifyResults(tracks.slice(0, 12));
    } catch (err) {
      console.error(err);
      toast.error('Search failed');
      setSpotifyResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };
    const data = await res.json();

    // THIS IS THE FIX: make sure we always have an array
    if (Array.isArray(data)) {
      setSpotifyResults(data);
    } else {
      console.error("Spotify returned non-array:", data);
      setSpotifyResults([]);
      if (data?.error) {
        toast.error(data.error);
      }
    }
  } catch (err) {
    console.error("Spotify search failed:", err);
    setSpotifyResults([]);
    toast.error('Spotify search failed');
  } finally {
    setSearchingMusic(false);
  }
};
    
  // ─────────────────────────────────────────────────────────────

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

      // Ensure profile exists
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

      // ── COMMON DATA FOR BOTH POSTS & DAILIES ─────────────────────
      const commonData: any = {
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
          ...commonData,
        };

        const { error: insertError } = await supabase.from('dailies').insert(dailyData);
        if (insertError) throw insertError;

        // Mirror to posts table for feed
        await supabase.from('posts').insert({
          user_id: userData.user.id,
          title: 'Daily',
          caption: caption.trim() || null,
          [fileType === 'image' ? 'image_url' : 'video_url']: urlData.publicUrl,
          ...commonData,
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
          ...commonData,
        };

        const { data: newPost, error: insertError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        if (insertError) throw insertError;

        // Hashtags (unchanged)
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

      // Reset everything
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => onNavigate('discover')} className="text-gray-600 hover:text-gray-900 font-medium">
            Cancel
          </button>
          <h1 className="text-lg font-semibold">New {postType === 'daily' ? 'Daily' : 'Post'}</h1>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || (postType === 'post' && !title.trim()) || uploading}
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            {uploading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Post Type */}
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

        {/* Media Preview */}
        {!previewUrl ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-500 transition-colors cursor-pointer">
            <label className="cursor-pointer">
              <input type="file" accept="image/*,video/*" onChange={handleFileSelect} className="hidden" />
              <div className="space-y-4">
                <div className="flex gap-4 justify-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                    <ImageIcon className="w-10 h-10 text-white" />
                  </div>
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">Upload a photo or video</p>
                  <p className="text-sm text-gray-500">Click to select a file from your device</p>
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

        {/* Add Music Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Add Music (optional)</label>
            <button
              onClick={() => setShowSpotifyPicker(true)}
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
              <button onClick={() => setSelectedTrack(null)} className="text-red-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Title, Caption, Recipe */}
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

      {/* ── SPOTIFY PICKER MODAL ── */}
      {showSpotifyPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-end md:items-center justify-center">
          <div className="bg-white w-full md:max-w-lg md:rounded-2xl md:max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">Choose Music</h3>
              <button onClick={() => setShowSpotifyPicker(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4">
              <input
  type="text"
  value={spotifySearch}
  onChange={(e) => {
    setSpotifySearch(e.target.value);
    searchYouTubeMusic(e.target.value);
  }}
  placeholder="Search any song..."
  className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
  autoFocus
/>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-20 md:pb-4 space-y-2">
              {searchingMusic && <p className="text-center text-gray-500 py-8">Searching...</p>}
              {spotifyResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    setShowSpotifyPicker(false);
                    toast.success('Music added!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition text-left"
                >
                  <img
                    src={track.album.images[0]?.url || '/placeholder.png'}
                    alt="album"
                    className="w-12 h-12 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{track.name}</p>
                    <p className="text-sm text-gray-600 truncate">
                      {track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  {track.preview_url ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">30s</span>
                  ) : (
                    <span className="text-xs text-gray-400">No preview</span>
                  )}
                </button>
              ))}
              {spotifySearch && spotifyResults.length === 0 && !searchingMusic && (
                <p className="text-center text-gray-500 py-8">No tracks found</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}