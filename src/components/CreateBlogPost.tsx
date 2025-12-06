import { useState } from 'react';
import { X, Image as ImageIcon, Upload } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Label } from './ui/label';
import { createBlogPost } from '../services/blogService';
import { uploadImage } from '../lib/imageStorage';
import { toast } from 'sonner';
import { extractTextFromHTML } from '../lib/seo';
import { compressImageWithOptions } from '../lib/imageCompression';

interface CreateBlogPostProps {
  open: boolean;
  onClose: () => void;
  onPostCreated: (slug: string) => void;
}

export function CreateBlogPost({ open, onClose, onPostCreated }: CreateBlogPostProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be less than 10MB');
      return;
    }

    setIsUploading(true);
    try {
      const result = await compressImageWithOptions(file, {
        maxSizeMB: 0.2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/jpeg',
        initialQuality: 0.85,
      });

      const imageUrl = await uploadImage(result.file, 'blog-covers');
      setCoverImage(imageUrl);
      setImageFile(result.file);
      toast.success(`Cover image uploaded! (${Math.round(result.compressedSize / 1024)}KB)`);
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!content.trim()) {
      toast.error('Please enter some content');
      return;
    }

    setIsSubmitting(true);
    try {
      const excerpt = extractTextFromHTML(content, 200);

      const post = await createBlogPost({
        title: title.trim(),
        content: { html: content },
        excerpt,
        cover_image: coverImage || undefined,
      });

      toast.success('Post published!');
      onPostCreated(post.slug);
      handleClose();
    } catch (error) {
      console.error('Error creating post:', error);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setTitle('');
    setContent('');
    setCoverImage(null);
    setImageFile(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Create New Blog Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              placeholder="Enter an engaging title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cover">Cover Image</Label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={isUploading}
                onClick={() => document.getElementById('cover-upload')?.click()}
              >
                <Upload className="h-4 w-4 mr-2" />
                {isUploading ? 'Uploading...' : coverImage ? 'Change Cover' : 'Upload Cover'}
              </Button>
              <input
                id="cover-upload"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </div>
            {coverImage && (
              <div className="relative mt-2 flex justify-center">
                <div className="relative w-full max-w-xs">
                  <img
                    src={coverImage}
                    alt="Cover preview"
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setCoverImage(null);
                      setImageFile(null);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              placeholder="Write your post content here... (Markdown supported)&#10;&#10;**Bold text**&#10;*Italic text*&#10;[Link text](https://example.com)&#10;&#10;- List item 1&#10;- List item 2"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-[300px] font-mono text-sm"
            />
            <p className="text-xs text-gray-500">
              Tip: Use markdown formatting for better readability
            </p>
          </div>

          {content && (
            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="border rounded-lg p-4 prose prose-sm max-w-none">
                <div
                  className="whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{
                    __html: content
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                      .replace(/(?<!href="|src=")(https?:\/\/[^\s<]+)/g, '<a href="$1" class="text-orange-600 hover:underline" target="_blank" rel="noopener noreferrer">$1</a>')
                      .replace(/^- (.+)$/gm, '<li>$1</li>')
                      .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-4">$&</ul>')
                      .replace(/\n\n/g, '</p><p class="mt-2">')
                      .replace(/^(.+)$/, '<p>$1</p>'),
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !title.trim() || !content.trim()}>
            {isSubmitting ? 'Publishing...' : 'Publish Post'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
