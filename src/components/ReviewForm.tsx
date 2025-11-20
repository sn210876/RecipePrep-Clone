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
        setComment(existingReview.comment || '');
        setExistingReviewId(existingReview.id);
        // If your backend already returns images, you’d load them here — we’re just leaving it empty
        setSelectedImages([]);
        setPreviews([]);
      } else {
        setRating(0);
        setComment('');
        setExistingReviewId(null);
        setSelectedImages([]);
        setPreviews([]);
      }
    } catch (error) {
      console.error('Failed to load existing review:', error);
    }
  };

  // ──────────────────────────────────────────────────────
  // THESE TWO FUNCTIONS ARE STILL HERE (so no errors)
  // but they do nothing now because the button is gone
  // ──────────────────────────────────────────────────────
  const handleImageSelect = () => {};
  const removeImage = () => {};

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setLoading(true);
    try {
      if (existingReviewId) {
        await updateReview(existingReviewId, rating, comment);
        toast.success('Review updated successfully!');
      } else {
        await createReview(recipe.id, rating, comment);
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

          {/* ↑↑↑ ONLY THIS ENTIRE BLOCK BELOW IS REMOVED ↑↑↑ */}
          {/* Everything else is exactly the same as your original file */}

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