import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon } from 'lucide-react';

interface UploadProps {
  onNavigate: (page: string) => void;
}

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState('');
  const [recipeUrl, setRecipeUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select an image');
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

      const { error: insertError } = await supabase.from('posts').insert({
        user_id: userData.user.id,
        image_url: urlData.publicUrl,
        caption: caption.trim() || null,
        recipe_url: recipeUrl.trim() || null,
      });

      if (insertError) throw insertError;

      toast.success('Post uploaded successfully!');
      handleClearImage();
      setCaption('');
      setRecipeUrl('');
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
            disabled={!selectedFile || uploading}
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
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="space-y-4">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                  <ImageIcon className="w-10 h-10 text-white" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-gray-900 mb-1">Upload a photo</p>
                  <p className="text-sm text-gray-500">Click to select an image from your device</p>
                  <p className="text-xs text-gray-400 mt-2">Maximum size: 5MB</p>
                </div>
              </div>
            </label>
          </div>
        ) : (
          <div className="relative">
            <img
              src={previewUrl}
              alt="Preview"
              className="w-full aspect-square object-cover rounded-xl"
            />
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
              Recipe URL (optional)
            </label>
            <Input
              type="url"
              value={recipeUrl}
              onChange={(e) => setRecipeUrl(e.target.value)}
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500 mt-1">
              Link to the full recipe from your collection
            </p>
          </div>
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
    </div>
  );
}
