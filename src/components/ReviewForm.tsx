import { useState, useRef, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RatingDisplay } from './RatingDisplay';
import { Recipe } from '../types/recipe';
import { createReview, updateReview, getUserReview } from '../services/reviewService';
import { toast } from 'sonner';

interface ReviewFormProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReviewSubmitted?: () => void;
}

export function ReviewForm({ recipe, open, onOpenChange, onReviewSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      loadExistingReview();
    }
  }, [open, recipe.id]);

  const loadExistingReview = async () => {
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) return;

      const existingReview = await getUserReview(recipe.id, userId);
      if (existingReview) {
        setRating(existingReview.rating);
        setComment(existingReview.comment);
        setExistingReviewId(existingReview.id);
      } else {
        setRating(0);
        setComment('');
        setExistingReviewId(null);
      }
    } catch (error) {
      console.error('Failed to load existing review:', error);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newFiles = files.slice(0, 4 - selectedImages.length);

    setSelectedImages((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews((prev) => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }

    setLoading(true);
    try {
      if (existingReviewId) {
        await updateReview(existingReviewId, rating, comment, selectedImages);
        toast.success('Review updated successfully!');
      } else {
        await createReview(recipe.id, rating, comment, selectedImages);
        toast.success('Review submitted successfully!');
      }

      onReviewSubmitted?.();
      onOpenChange(false);

      setRating(0);
      setComment('');
      setSelectedImages([]);
      setPreviews([]);
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existingReviewId ? 'Edit Your Review' : 'Write a Review'}</DialogTitle>
          <DialogDescription>
            Share your experience with {recipe.title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Your Rating</label>
            <RatingDisplay rating={rating} size="lg" interactive onRate={setRating} />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">Comments (Optional)</label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Share your experience with this recipe..."
              className="min-h-24 resize-none"
              disabled={loading}
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-2 block">
              Upload Photos (Up to 4)
            </label>
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={selectedImages.length >= 4 || loading}
                className="w-full border-2 border-dashed border-primary rounded-lg p-4 text-center hover:border-primary/80 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="w-5 h-5 mx-auto mb-1 text-primary" />
                <p className="text-sm text-gray-600">Click to upload photos</p>
                <p className="text-xs text-gray-500">
                  {selectedImages.length}/4 photos selected
                </p>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageSelect}
                className="hidden"
                disabled={loading}
              />

              {previews.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {previews.map((preview, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={preview}
                        alt={`Preview ${index + 1}`}
                        className="w-full h-24 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => removeImage(index)}
                        disabled={loading}
                        className="absolute top-1 right-1 bg-accent text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || rating === 0}
              className="bg-accent hover:bg-accent/90"
            >
              {loading ? 'Submitting...' : existingReviewId ? 'Update Review' : 'Submit Review'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
