import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Send, X, Play, Pause, ExternalLink } from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';
import { Recipe } from '../types/recipe';

// Add after your imports
const CommentSkeleton = () => (
  <div className="flex gap-2 sm:gap-3 animate-pulse">
    <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gray-300 flex-shrink-0" />
    <div className="flex-1 space-y-2">
      <div className="bg-gray-200 rounded-2xl px-3 py-2 space-y-2">
        <div className="h-3 bg-gray-300 rounded w-24" />
        <div className="h-3 bg-gray-300 rounded w-full" />
        <div className="h-3 bg-gray-300 rounded w-3/4" />
      </div>
      <div className="h-2 bg-gray-200 rounded w-16 ml-3" />
    </div>
  </div>
);

const RatingSkeleton = () => (
  <div className="space-y-3 animate-pulse">
    <div className="flex items-center gap-2">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-4 h-4 bg-gray-300 rounded" />
        ))}
      </div>
      <div className="h-4 bg-gray-300 rounded w-24" />
    </div>
    <div className="flex items-center gap-2">
      <div className="h-4 bg-gray-300 rounded w-20" />
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="w-5 h-5 bg-gray-300 rounded" />
        ))}
      </div>
    </div>
  </div>
);
interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
}

interface CommentModalProps {
  postId: string;
  isOpen: boolean;
  onClose: () => void;
  onCommentPosted?: () => void;
}

export function CommentModal({ postId, isOpen, onClose, onCommentPosted }: CommentModalProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userRating, setUserRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [averageRating, setAverageRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [post, setPost] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  useEffect(() => {
    if (isOpen && postId) {
      loadAllData();
    }
  }, [isOpen, postId]);

  // ✅ OPTIMIZED: Load everything in parallel with just 2 queries
  const loadAllData = async () => {
  setLoading(true);
  
  try {
    // Get current user first
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id || null;
    setCurrentUserId(userId);

    // ✅ OPTIMIZED: Use joins to get everything in fewer queries
    const [postWithRatings, commentsWithProfiles, userRatingResult] = await Promise.all([
      // Query 1: Get post WITH all ratings AND recipe image in one query
      supabase
        .from('posts')
        .select(`
          *,
          post_ratings(rating),
          public_recipes!posts_recipe_id_fkey(image_url, video_url)
        `)
        .eq('id', postId)
        .maybeSingle(),
      
      // ... rest of your queries stay the same
    ]);

    // Handle post and ratings
    if (postWithRatings.error) throw postWithRatings.error;
    
    // ✅ Use recipe image as fallback
    const postData = postWithRatings.data;
    if (postData) {
      // If post doesn't have image_url, use the recipe's image
      if (!postData.image_url && postData.public_recipes?.image_url) {
        postData.image_url = postData.public_recipes.image_url;
      }
    }
    
    setPost(postData);

    console.log('[CommentModal] Post loaded:', {
      postId: postId,
      hasImageUrl: !!postData?.image_url,
      imageUrl: postData?.image_url,
      recipeImageUrl: postData?.public_recipes?.image_url,
      title: postData?.title
    });

    // ... rest of your code
  } catch (error: any) {
    console.error('Error loading modal data:', error);
    toast.error('Failed to load post details');
  } finally {
    setLoading(false);
  }
};

  // ✅ OPTIMIZED: Only reload comments when needed
  const reloadComments = async () => {
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) throw commentsError;

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      const userIds = [...new Set(commentsData.map(c => c.user_id))];
      
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || {
          username: 'Unknown User',
          avatar_url: null,
        },
      }));

      setComments(commentsWithProfiles);
    } catch (error: any) {
      console.error('Error reloading comments:', error);
    }
  };

  // ✅ OPTIMIZED: Only reload ratings when needed
  const reloadRatings = async () => {
    try {
      const { data, error } = await supabase
        .from('post_ratings')
        .select('rating')
        .eq('post_id', postId);

      if (error) throw error;

      if (data && data.length > 0) {
        const avg = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
        setAverageRating(avg);
        setTotalRatings(data.length);
      } else {
        setAverageRating(0);
        setTotalRatings(0);
      }
    } catch (error) {
      console.error('Error reloading ratings:', error);
    }
  };

  const handleRatingClick = async (rating: number) => {
    if (!currentUserId) {
      toast.error('Please log in to rate');
      return;
    }

    try {
      const { error } = await supabase
        .from('post_ratings')
        .upsert({
          post_id: postId,
          user_id: currentUserId,
          rating: rating,
        }, {
          onConflict: 'post_id,user_id'
        });

      if (error) throw error;

      setUserRating(rating);
      await reloadRatings();
      if (onCommentPosted) {
        onCommentPosted();
      }
      toast.success('Rating submitted!');
    } catch (error: any) {
      console.error('Error submitting rating:', error);
      toast.error('Failed to submit rating');
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUserId) return;

    setSubmitting(true);
    try {
      const { data: postData } = await supabase
        .from('posts')
        .select('user_id')
        .eq('id', postId)
        .maybeSingle();

      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        text: newComment.trim(),
      });

      if (error) throw error;

      if (postData && postData.user_id !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: postData.user_id,
          actor_id: currentUserId,
          type: 'comment',
          post_id: postId,
        });
      }

      setNewComment('');
      await reloadComments();
      toast.success('Comment posted!');
      if (onCommentPosted) {
        onCommentPosted();
      }
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId)
        .eq('user_id', currentUserId!);
      
      if (error) throw error;
      
      await reloadComments();
      toast.success('Comment deleted');
      if (onCommentPosted) onCommentPosted();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const togglePlay = () => {
    const audio = document.getElementById(`modal-audio-${postId}`) as HTMLAudioElement;
    if (audio) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

 if (!post && loading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg w-[95vw] h-[90vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden z-[9999] flex flex-col">
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Image Skeleton */}
            <div className="w-full h-[35vh] sm:h-[40vh] bg-gray-300 animate-pulse flex-shrink-0 relative">
              <button
                onClick={onClose}
                className="absolute top-2 right-2 w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 z-10"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Skeleton */}
            <div className="flex-1 flex flex-col bg-white min-h-0">
              
              {/* Header Skeleton */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0 space-y-2 animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>

              {/* Ratings Skeleton */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <RatingSkeleton />
              </div>

              {/* Comments Skeleton */}
              <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 space-y-3 min-h-[100px]">
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </div>

              {/* Input Skeleton */}
              <div className="border-t px-3 py-3 sm:px-4 sm:py-4 bg-white flex-shrink-0">
                <div className="flex gap-2 animate-pulse">
                  <div className="flex-1 h-9 sm:h-10 bg-gray-200 rounded-lg" />
                  <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gray-300 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-lg w-[95vw] h-[90vh] sm:max-h-[85vh] p-0 gap-0 overflow-hidden z-[9999] flex flex-col">
          <div className="flex flex-col h-full overflow-hidden">
            
            {/* Image Section - Top */}
            <div className="w-full h-[35vh] sm:h-[40vh] bg-black flex items-center justify-center relative overflow-hidden flex-shrink-0">
             {post?.image_url ? (
  <img
    src={post.image_url?.includes('instagram.com') || post.image_url?.includes('cdninstagram.com')
      ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(post.image_url.replace(/&amp;/g, '&'))}`
      : post.image_url}
    alt={post.title || 'Post'}
    className="w-full h-full object-contain"
  />
) : (
  <div className="text-white text-center">
    <p>No image available</p>
  </div>
)}

              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 z-10"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Music Player */}
              {post?.spotify_preview_url && (
                <div className="absolute bottom-2 left-2 right-2 z-10">
                  <button
                    onClick={togglePlay}
                    className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg transition-all flex items-center gap-2 w-full"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <div className="text-left text-[10px] sm:text-xs flex-1 min-w-0">
                      <div className="font-semibold truncate">{post.spotify_track_name}</div>
                      <div className="text-white/80 truncate">{post.spotify_artist_name}</div>
                    </div>
                  </button>
                  <audio id={`modal-audio-${postId}`} src={post.spotify_preview_url} />
                </div>
              )}
            </div>

            {/* Content Section - Bottom */}
            <div className="flex-1 flex flex-col bg-white min-h-0">
              {/* Header with title */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <h3 className="font-bold text-sm sm:text-base truncate">{post?.title || 'Post'}</h3>
                {post?.caption && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">{post.caption}</p>
                )}
              </div>

              {/* Ratings Section */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <div className="space-y-1.5 sm:space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((fire) => (
                        <span
                          key={fire}
                          className={`text-sm sm:text-base ${
                            fire <= averageRating
                              ? 'opacity-100'
                              : 'opacity-20 grayscale'
                          }`}
                        >🔥</span>
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                      {averageRating > 0 ? averageRating.toFixed(1) : 'No ratings'}
                      {totalRatings > 0 && ` (${totalRatings})`}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">Your rating:</span>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[1, 2, 3, 4, 5].map((fire) => (
                        <button
                          key={fire}
                          type="button"
                          onClick={() => handleRatingClick(fire)}
                          onMouseEnter={() => setHoverRating(fire)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform active:scale-110 touch-manipulation p-1"
                        >
                          <span
                            className={`text-base sm:text-lg ${
                              fire <= (hoverRating || userRating)
                                ? 'opacity-100'
                                : 'opacity-20 grayscale'
                            }`}
                          >🔥</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* View Recipe Button */}
              {(post?.recipe_id || post?.recipe_url) && (
                <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                  <Button
                    onClick={async () => {
                      if (post.recipe_id) {
                        const { getRecipeById } = await import('../services/recipeService');
                        const recipe = await getRecipeById(post.recipe_id);
                        if (recipe) setSelectedRecipe(recipe);
                        else toast.error('Recipe not found');
                      } else if (post.recipe_url) {
                        window.open(post.recipe_url, '_blank');
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full border-orange-600 text-orange-600 hover:bg-orange-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Recipe
                  </Button>
                </div>
              )}

              {/* Comments Section - scrollable */}
              <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 space-y-2 sm:space-y-3 min-h-[100px] max-h-[30vh] sm:max-h-none">
                {loading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
                  </div>
                ) : comments.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-2 sm:gap-3 group">
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.username}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                          {comment.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2 relative">
                          <button
                            onClick={() => window.location.href = `/${comment.profiles?.username || 'user'}`}
                            className="font-semibold text-xs sm:text-sm hover:underline"
                          >
                            {comment.profiles?.username}
                          </button>
                          <p className="text-xs sm:text-sm text-gray-700 break-words mt-0.5">{comment.text}</p>
                          
                          {currentUserId === comment.user_id && (
                            <button
                              onClick={() => handleDeleteComment(comment.id)}
                              className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation"
                              title="Delete comment"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 px-3">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input - fixed at bottom */}
              <form onSubmit={handleSubmitComment} className="border-t px-3 py-3 sm:px-4 sm:py-4 bg-white flex-shrink-0 sticky bottom-0">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    disabled={submitting}
                    className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                  />
                  <Button
                    type="submit"
                    disabled={!newComment.trim() || submitting}
                    size="icon"
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
        />
      )}
    </>
  );
}

export default CommentModal;