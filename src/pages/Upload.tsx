import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
import { MusicSelectionModal } from '../components/MusicSelectionModal';
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

interface SelectedSong {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
}

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedSong, setSelectedSong] = useState<SelectedSong | null>(null);
  const [showMusicModal, setShowMusicModal] = useState(false);

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
      } else if (file.type.startsWith('video/')) {
        setFileType('video');
      } else {
        toast.error('Please select an image or video file');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image or video');
      return;
    }
    if (!title.trim()) {
      toast.error('Please enter a title');
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
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);
      let recipeLink = null;
      if (selectedRecipeId) {
        recipeLink = `${window.location.origin}/#recipe/${selectedRecipeId}`;
      }

      const songId = selectedSong?.id || null;
      const songTitle = selectedSong?.title || null;
      const songArtist = selectedSong?.artist || null;
      const songPreview = songId
        ? `https://www.youtube.com/embed/${songId}?autoplay=1&mute=1&loop=1&playlist=${songId}&modestbranding=1&controls=0`
        : null;

      const postData: any = {
        user_id: userData.user.id,
        title: title.trim(),
        caption: caption.trim() || null,
        recipe_url: recipeLink,
        song_id: songId,
        song_title: songTitle,
        song_artist: songArtist,
        song_preview_url: songPreview,
      };

      if (fileType === 'image') {
        postData.image_url = urlData.publicUrl;
      } else if (fileType === 'video') {
        postData.video_url = urlData.publicUrl;
      }

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
            if (newTag) {
              hashtagId = newTag.id;
            } else {
              continue;
            }
          }
          await supabase
            .from('post_hashtags')
            .insert({ post_id: newPost.id, hashtag_id: hashtagId });
        }
      }

      toast.success('Post uploaded successfully!');
      handleClearImage();
      setTitle('');
      setCaption('');
      setSelectedRecipeId('');
      setSelectedSong(null);
      onNavigate('discover');
    } catch (error: any) {
      console.error('Error uploading post:', error);
      toast.error(error.message || 'Failed to upload post');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => onNavigate('discover')}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            Cancel
          </button>
          <h1 className="text-lg font-semibold">New Post</h1>
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || !title.trim() || uploading}
            size="sm"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            {uploading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>
      <div className="max-w-lg mx-auto p-4 space-y-4">
        {!previewUrl ? (
          <div className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center hover:border-orange-500 transition-colors cursor-pointer">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
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
                  <p className="text-xs text-gray-400 mt-2">Images: max 10MB • Videos: no limit</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="relative">
            {fileType === 'image' ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="w-full aspect-square object-cover rounded-xl"
              />
            ) : (
              <video
                src={previewUrl}
                controls
                className="w-full aspect-square object-cover rounded-xl"
              />
            )}
            <button
              onClick={handleClearImage}
              className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="space-y-4 bg-white rounded-xl p-4 shadow-sm">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Caption
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="min-h-24 resize-none"
              maxLength={2200}
            />
            <p className="text-xs text-gray-400 mt-1">{caption.length}/2200</p>
          </div>
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
                          <img
                            src={recipe.image_url}
                            alt={recipe.title}
                            className="w-8 h-8 rounded object-cover"
                          />
                        )}
                        <span>{recipe.title}</span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500 mt-1">
              Choose a recipe from your collection to link with this post
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Music (optional)
            </label>
            {selectedSong ? (
              <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
                  <Music className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">{selectedSong.title}</div>
                  <div className="text-xs text-gray-600 truncate">{selectedSong.artist}</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowMusicModal(true)}
                  className="text-orange-600 hover:text-orange-700"
                >
                  Change
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowMusicModal(true)}
                className="w-full flex items-center justify-center gap-2 h-12 border-2 border-dashed hover:border-orange-500 hover:bg-orange-50 transition-colors"
              >
                <Music className="w-5 h-5" />
                <span>Add Music</span>
              </Button>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Add a song to your post like Instagram Reels
            </p>
          </div>
        </div>
        <MusicSelectionModal
          open={showMusicModal}
          onClose={() => setShowMusicModal(false)}
          onSelect={setSelectedSong}
          selectedSong={selectedSong}
        />
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
    </div>
  );
}