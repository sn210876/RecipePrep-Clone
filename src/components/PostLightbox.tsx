import { X, ChevronLeft, ChevronRight, Heart, MessageCircle } from 'lucide-react';
import { Dialog, DialogPortal, DialogOverlay, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import CommentModal from './CommentModal';

interface PostLightboxProps {
  media: Array<{ url: string; type: 'image' | 'video' }>;
  initialIndex?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  onLikeUpdate?: () => void;
}

export function PostLightbox({ media, initialIndex = 0, open, onOpenChange, postId, onLikeUpdate }: PostLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    const loadLikeStatus = async () => {
      if (!postId || !open) return;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;
      setCurrentUserId(userId);

      if (!userId) return;

      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      setIsLiked(!!likeData);

      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('post_id', postId);

      setLikeCount(count || 0);
    };

    loadLikeStatus();
  }, [postId, open]);

  const toggleLike = async () => {
    if (!postId || !currentUserId) {
      toast.error('Please sign in to like posts');
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', currentUserId);

        setIsLiked(false);
        setLikeCount(prev => Math.max(0, prev - 1));
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: postId, user_id: currentUserId });

        setIsLiked(true);
        setLikeCount(prev => prev + 1);
      }

      if (onLikeUpdate) onLikeUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  const goToNext = () => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const goToPrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const currentMedia = media[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="z-[9999998] bg-black/95" />
        <DialogContent className="max-w-[95vw] max-h-[95vh] p-0 bg-black border-0 overflow-hidden z-[9999999]">
          <div className="relative w-full h-full flex items-center justify-center">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            {media.length > 1 && currentIndex > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                onClick={goToPrevious}
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
            )}

            {media.length > 1 && currentIndex < media.length - 1 && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 z-[10] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                onClick={goToNext}
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            )}

            {currentMedia.type === 'video' ? (
              <video
                src={currentMedia.url}
                controls
                className="max-w-full max-h-[95vh] w-auto h-auto"
                autoPlay
              />
            ) : (
              <img
                src={currentMedia.url}
                alt="Post"
                className="max-w-full max-h-[95vh] w-auto h-auto object-contain"
                loading="lazy"
              />
            )}

            {media.length > 1 && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                {media.map((_, idx) => (
                  <div
                    key={idx}
                    className={`w-2 h-2 rounded-full transition-all ${
                      idx === currentIndex ? 'bg-white w-6' : 'bg-white/50'
                    }`}
                  />
                ))}
              </div>
            )}

            {postId && (
              <div className="absolute bottom-4 right-4 flex flex-col gap-3 z-[10]">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleLike();
                  }}
                  className="bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[48px] min-w-[48px] touch-manipulation active:scale-95"
                >
                  <Heart
                    className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`}
                  />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowComments(true);
                  }}
                  className="bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[48px] min-w-[48px] touch-manipulation active:scale-95"
                >
                  <MessageCircle className="w-6 h-6 text-gray-700" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </DialogPortal>

      {showComments && postId && (
        <CommentModal
          postId={postId}
          isOpen={showComments}
          onClose={() => setShowComments(false)}
          onCommentPosted={() => {
            if (onLikeUpdate) onLikeUpdate();
          }}
        />
      )}
    </Dialog>
  );
}
