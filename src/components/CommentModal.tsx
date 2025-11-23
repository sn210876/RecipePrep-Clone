import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Send, X, Play, Pause, ExternalLink } from 'lucide-react';
import { RecipeDetailModal } from './RecipeDetailModal';
import { getProxiedImageUrl } from '../lib/imageUtils';
import { Recipe } from '../types/recipe';

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
  const [isMinimized, setIsMinimized] = useState(false);


  useEffect(() => {
    if (isOpen && postId) {
      console.log('[CommentModal] 🔵 Modal opened with postId:', postId);
      loadAllData();
    }
  }, [isOpen, postId]);

  const loadAllData = async () => {
    setLoading(true);
    
    try {
      console.log('[CommentModal] 🟡 Starting to load data for post:', postId);
      
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id || null;
      setCurrentUserId(userId);

      const { data: postData, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      console.log('[CommentModal] 📦 Raw post data:', postData);
      console.log('[CommentModal] 📋 Post columns:', postData ? Object.keys(postData) : 'none');

      if (postError) throw postError;
      if (!postData) {
        console.log('[CommentModal] ⚠️ Post not found!');
        toast.error('Post not found');
        onClose();
        return;
      }

      console.log('[CommentModal] 🔍 Post fields:', {
        id: postData.id,
        title: postData.title,
        image_url: postData.image_url,
        recipe_id: postData.recipe_id,
        recipe_url: postData.recipe_url,
        hasImageUrl: !!postData.image_url
      });

      let recipeData = null;
      if (postData.recipe_id) {
        console.log('[CommentModal] 🔄 Fetching recipe with ID:', postData.recipe_id);
        const { data: recipe, error: recipeError } = await supabase
          .from('public_recipes')
          .select('image_url, video_url, title')
          .eq('id', postData.recipe_id)
          .maybeSingle();
        
        console.log('[CommentModal] 📦 Recipe data:', recipe);
        recipeData = recipe;

        if (recipe) {
          console.log('[CommentModal] 🔍 Recipe fields:', {
            id: postData.recipe_id,
            title: recipe.title,
            image_url: recipe.image_url,
            hasImageUrl: !!recipe.image_url
          });
        }
      }

      if (!postData.image_url && recipeData?.image_url) {
        console.log('[CommentModal] ✅ Using recipe image as fallback:', recipeData.image_url);
        postData.image_url = recipeData.image_url;
      } else if (!postData.image_url) {
        console.log('[CommentModal] 🚨 NO IMAGE AVAILABLE');
      }

      setPost(postData);

      const [ratingsResult, commentsResult, userRatingResult] = await Promise.all([
        supabase.from('post_ratings').select('rating').eq('post_id', postId),
        supabase.from('comments').select(`id, text, created_at, user_id, profiles!comments_user_id_fkey(username, avatar_url)`).eq('post_id', postId).order('created_at', { ascending: true }),
        userId ? supabase.from('post_ratings').select('rating').eq('post_id', postId).eq('user_id', userId).maybeSingle() : Promise.resolve({ data: null, error: null })
      ]);

      if (ratingsResult.data && ratingsResult.data.length > 0) {
        const avg = ratingsResult.data.reduce((sum, r) => sum + r.rating, 0) / ratingsResult.data.length;
        setAverageRating(avg);
        setTotalRatings(ratingsResult.data.length);
      }

      if (commentsResult.data) {
        setComments(commentsResult.data);
      }

      setUserRating(userRatingResult.data?.rating || 0);

      if (postData.spotify_preview_url) {
        setTimeout(() => {
          const audio = document.getElementById(`modal-audio-${postId}`) as HTMLAudioElement;
          if (audio) {
            audio.play().catch(err => console.log('Auto-play prevented:', err));
            setIsPlaying(true);
          }
        }, 500);
      }

    } catch (error: any) {
      console.error('[CommentModal] 💥 Error loading modal data:', error);
      toast.error('Failed to load post details');
    } finally {
      setLoading(false);
    }
  };

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
            <div className="w-full h-[35vh] sm:h-[40vh] bg-gray-300 animate-pulse flex-shrink-0 relative">
              <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 z-10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col bg-white min-h-0">
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0 space-y-2 animate-pulse">
                <div className="h-4 bg-gray-300 rounded w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-full" />
              </div>
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <RatingSkeleton />
              </div>
              <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 space-y-3 min-h-[100px]">
                <CommentSkeleton />
                <CommentSkeleton />
                <CommentSkeleton />
              </div>
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
           <div className="w-full h-[25vh] sm:h-[30vh] bg-black flex items-center justify-center relative overflow-hidden flex-shrink-0">

              {post?.image_url ? (
                <img
                  src={getProxiedImageUrl(post.image_url)}
                  alt={post.title || 'Post'}
                  className="w-full h-full object-contain"
                  onLoad={() => {
                    console.log('[CommentModal] ✅ Image loaded successfully');
                    console.log('[CommentModal] 📸 Original URL:', post.image_url);
                    console.log('[CommentModal] 🔗 Proxied URL:', getProxiedImageUrl(post.image_url));
                  }}
                  onError={(e) => {
                    console.log('[CommentModal] ❌ Image failed to load');
                    console.log('[CommentModal] 📸 Original URL:', post.image_url);
                    console.log('[CommentModal] 🔗 Proxied URL:', getProxiedImageUrl(post.image_url));
                  }}
                />
              ) : (
                <div className="text-white text-center">
                  <p>No image available</p>
                  <p className="text-xs mt-2">Post ID: {postId}</p>
                  {post?.recipe_id && (
                    <p className="text-xs mt-1">Recipe ID: {post.recipe_id}</p>
                  )}
                </div>
              )}

              <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90 z-10">
                <X className="w-5 h-5" />
              </button>

              {post?.spotify_preview_url && (
                <div className="absolute bottom-2 left-2 right-2 z-10">
                  <button onClick={togglePlay} className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg transition-all flex items-center gap-2 w-full">
                    {isPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
                    <div className="text-left text-[10px] sm:text-xs flex-1 min-w-0">
                      <div className="font-semibold truncate">{post.spotify_track_name}</div>
                      <div className="text-white/80 truncate">{post.spotify_artist_name}</div>
                    </div>
                  </button>
                  <audio id={`modal-audio-${postId}`} src={post.spotify_preview_url} />
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col bg-white min-h-0">
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <h3 className="font-bold text-sm sm:text-base truncate">{post?.title || 'Post'}</h3>
                {post?.caption && (
                  <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">{post.caption}</p>
                )}
              </div>

            {/* Ratings and View Recipe Button - Side by Side */}
<div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
  <div className="flex gap-3 items-start">
    {/* Ratings Section - Left side */}
    <div className="flex-1 space-y-1.5 sm:space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((fire) => (
            <span key={fire} className={`text-sm sm:text-base ${fire <= averageRating ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔥</span>
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
            <button key={fire} type="button" onClick={() => handleRatingClick(fire)} onMouseEnter={() => setHoverRating(fire)} onMouseLeave={() => setHoverRating(0)} className="transition-transform active:scale-110 touch-manipulation p-1">
              <span className={`text-base sm:text-lg ${fire <= (hoverRating || userRating) ? 'opacity-100' : 'opacity-20 grayscale'}`}>🔥</span>
            </button>
          ))}
        </div>
      </div>
    </div>

  {/* View Recipe Button - Right side */}
{(post?.recipe_id || post?.recipe_url) && (
  <Button
 onClick={async () => {
  if (post.recipe_id) {
    const { getRecipeById } = await import('../services/recipeService');
    const recipe = await getRecipeById(post.recipe_id);
    if (recipe) {
      setSelectedRecipe(recipe);
      onClose(); // Close the comment modal
    } else {
      toast.error('Recipe not found');
    }
  } else if (post.recipe_url) {
    window.open(post.recipe_url, '_blank');
  }
}}
    variant="outline"
    size="sm"
    className="border-orange-600 text-orange-600 hover:bg-orange-50 flex-shrink-0 h-auto py-2 px-3 whitespace-nowrap"
  >
    <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5" />
    <span className="text-xs sm:text-sm">View Recipe</span>
  </Button>
)}
  </div>
</div>

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
                        <img src={comment.profiles.avatar_url} alt={comment.profiles.username} className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                          {comment.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2 relative">
                          <button onClick={() => window.location.href = `/${comment.profiles?.username || 'user'}`} className="font-semibold text-xs sm:text-sm hover:underline">
                            {comment.profiles?.username}
                          </button>
                          <p className="text-xs sm:text-sm text-gray-700 break-words mt-0.5">{comment.text}</p>
                          {currentUserId === comment.user_id && (
                            <button onClick={() => handleDeleteComment(comment.id)} className="absolute top-1 right-1 p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity touch-manipulation" title="Delete comment">
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

              <form onSubmit={handleSubmitComment} className="border-t px-3 py-3 sm:px-4 sm:py-4 bg-white flex-shrink-0 sticky bottom-0">
                <div className="flex gap-2">
                  <Input value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." disabled={submitting} className="flex-1 text-xs sm:text-sm h-9 sm:h-10" />
                  <Button type="submit" disabled={!newComment.trim() || submitting} size="icon" className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10">
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {selectedRecipe && (
        <RecipeDetailModal recipe={selectedRecipe} open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)} />
      )}
    </>
  );
}

export default CommentModal;