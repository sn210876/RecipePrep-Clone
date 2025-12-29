import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import RatingDisplay from './RatingDisplay';
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
  const [loading, setLoading] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | null>(null);

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
      } else {
        setRating(0);
        setComment('');
        setExistingReviewId(null);
      }
    } catch (error) {
      console.error('Failed to load existing review:', error);
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      toast.error('Please select a rating');
      return;
    }
    setLoading(true);
    try {
      if (existingReviewId) {
        await updateReview(existingReviewId, rating, comment, []);
        toast.success('Review updated successfully!');
      } else {
        await createReview(recipe.id, rating, comment, []);
        toast.success('Review submitted successfully!');
      }
      onReviewSubmitted?.();
      onOpenChange(false);
      setRating(0);
      setComment('');
    } catch (error) {
      console.error('Failed to submit review:', error);
      toast.error('Failed to submit review. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-full max-h-full h-full p-0 gap-0 m-0 rounded-none sm:max-w-2xl sm:max-h-[90vh] sm:rounded-lg sm:m-4">
        <div className="flex flex-col h-full">
          {/* Header - Fixed at top */}
          <DialogHeader className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
            <DialogTitle className="text-xl">
              {existingReviewId ? 'Edit Your Review' : 'Write a Review'}
            </DialogTitle>
            <DialogDescription className="text-sm">
              Share your experience with {recipe.title}
            </DialogDescription>
          </DialogHeader>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <div className="space-y-6">
              {/* Rating Section */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-3 block">
                  Your Rating
                </label>
                <div className="flex justify-center py-2">
                  <RatingDisplay 
                    rating={rating} 
                    size="lg" 
                    interactive 
                    onRate={setRating} 
                  />
                </div>
                {rating > 0 && (
                  <p className="text-center text-sm text-gray-600 mt-2">
                    {rating === 5 ? '🔥 Amazing!' : 
                     rating === 4 ? '😊 Great!' : 
                     rating === 3 ? '👍 Good' : 
                     rating === 2 ? '😐 Okay' : 
                     '😕 Not great'}
                  </p>
                )}
              </div>

              {/* Comment Section */}
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-2 block">
                  Comments (Optional)
                </label>
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Share your experience with this recipe... What did you love? Any tips for others?"
                  className="min-h-32 text-base resize-none"
                  disabled={loading}
                  maxLength={500}
                />
                <p className="text-xs text-gray-500 mt-1 text-right">
                  {comment.length}/500 characters
                </p>
              </div>
            </div>
          </div>

          {/* Footer - Fixed at bottom */}
          <div className="px-4 py-4 border-t border-gray-200 flex-shrink-0 bg-white">
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
                className="w-full sm:w-auto min-h-[48px] touch-manipulation active:scale-95 transition-all"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || rating === 0}
                className="w-full sm:w-auto min-h-[48px] bg-accent hover:bg-accent/90 touch-manipulation active:scale-95 transition-all"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </span>
                ) : (
                  existingReviewId ? 'Update Review' : 'Submit Review'
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}