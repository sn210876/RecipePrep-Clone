import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Send, X, Play, Pause } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && postId) {
      loadPost();
      loadComments();
      loadRatings();
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id || null);
        if (data.user?.id) {
          loadUserRating(data.user.id);
        }
      });
    }
  }, [isOpen, postId]);

  const loadPost = async () => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .maybeSingle();

      if (error) throw error;
      setPost(data);

      // Auto-play music if available
      if (data?.spotify_preview_url) {
        setTimeout(() => {
          const audio = document.getElementById(`modal-audio-${postId}`) as HTMLAudioElement;
          if (audio) {
            audio.play().catch(err => console.log('Auto-play prevented:', err));
            setIsPlaying(true);
          }
        }, 500);
      }
    } catch (error) {
      console.error('Error loading post:', error);
    }
  };

  const loadComments = async () => {
    if (!postId) return;

    setLoading(true);
    try {
      const { data: commentsData, error: commentsError } = await supabase
        .from('comments')
        .select('*')
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (commentsError) {
        console.error('Error loading comments:', commentsError);
        throw commentsError;
      }

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        return;
      }

      // Get unique user IDs
      const userIds = [...new Set(commentsData.map(c => c.user_id))];

      // Fetch profiles for all users
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .in('id', userIds);

      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        throw profilesError;
      }

      // Create a map of user_id to profile
      const profilesMap = new Map(
        (profilesData || []).map(p => [p.id, p])
      );

      // Merge comments with profiles
      const commentsWithProfiles = commentsData.map(comment => ({
        ...comment,
        profiles: profilesMap.get(comment.user_id) || {
          username: 'Unknown User',
          avatar_url: null,
        },
      }));

      setComments(commentsWithProfiles);
    } catch (error: any) {
      console.error('Error loading comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const loadRatings = async () => {
    if (!postId) return;

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
      console.error('Error loading ratings:', error);
    }
  };

  const loadUserRating = async (userId: string) => {
    if (!postId) return;

    try {
      const { data, error } = await supabase
        .from('post_ratings')
        .select('rating')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) throw error;
      setUserRating(data?.rating || 0);
    } catch (error) {
      console.error('Error loading user rating:', error);
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
      await loadRatings();
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
        console.log('[Notifications] Sending comment notification:', {
          user_id: postData.user_id,
          actor_id: currentUserId,
          type: 'comment',
          post_id: postId,
        });
        const { data, error } = await supabase.from('notifications').insert({
          user_id: postData.user_id,
          actor_id: currentUserId,
          type: 'comment',
          post_id: postId,
        });
        if (error) {
          console.error('[Notifications] Error sending comment notification:', error);
        } else {
          console.log('[Notifications] Comment notification sent successfully:', data);
        }
      }

      setNewComment('');
      await loadComments();
      toast.success('Comment posted!');
      if (onCommentPosted) {
        onCommentPosted();
      }
      onClose();
    } catch (error: any) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
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
        <DialogContent className="max-w-4xl w-[95vw] h-[90vh] sm:h-[85vh] p-0 gap-0 z-[9999] overflow-hidden">
          <div className="flex items-center justify-center h-full">
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
              <p className="mt-4 text-gray-600">Loading post...</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-[85vh] p-0 gap-0 overflow-hidden">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row h-full">
          
          {/* Left Side - Image (now smaller) */}
          <div className="w-full md:w-[45%] h-[35vh] md:h-full bg-black flex items-center justify-center relative overflow-hidden flex-shrink-0">
            {post?.image_url ? (
              <img
                src={post.image_url}
                alt={post.title || 'Post'}
                className="w-full h-full object-cover md:object-contain"
              />
            ) : (
              <div className="text-white text-center">
                <p>No image available</p>
              </div>
            )}

            {/* Close button - visible on mobile */}
            <button
              onClick={onClose}
              className="absolute top-2 right-2 md:hidden w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90"
            >
              <X className="w-5 h-5" />
            </button>

            {post?.spotify_preview_url && (
              <div className="absolute bottom-2 left-2 right-2 md:top-4 md:right-4 md:left-auto md:bottom-auto z-10">
                <button
                  onClick={togglePlay}
                  className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg transition-all flex items-center gap-2 w-full md:w-auto"
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

          {/* Right Side - Details, Ratings, Comments (now larger) */}
          <div className="flex-1 flex flex-col bg-white min-h-0">
            {/* Header - more compact */}
            <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm sm:text-base truncate">{post?.title || 'Post'}</h3>
                  {post?.caption && (
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 line-clamp-2">{post.caption}</p>
                  )}
                </div>
                {/* Close button - desktop only */}
                <button
                  onClick={onClose}
                  className="hidden md:flex w-8 h-8 items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 flex-shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Ratings Section - more compact */}
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

            {/* Comments Section - larger scrollable area */}
            <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 space-y-2 sm:space-y-3 min-h-0">
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
                  <div key={comment.id} className="flex gap-2 sm:gap-3">
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
                      <div className="bg-gray-100 rounded-2xl px-3 py-2">
                        <button
                          onClick={() => window.location.href = `/${comment.profiles?.username || 'user'}`}
                          className="font-semibold text-xs sm:text-sm hover:underline"
                        >
                          {comment.profiles?.username}
                        </button>
                        <p className="text-xs sm:text-sm text-gray-700 break-words mt-0.5">{comment.text}</p>
                      </div>
                      <p className="text-[10px] sm:text-xs text-gray-400 mt-1 px-3">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Comment Input - fixed at bottom, always visible */}
            <form onSubmit={handleSubmitComment} className="border-t px-3 py-2 sm:px-4 sm:py-3 bg-white flex-shrink-0">
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
  );
}

export default CommentModal;