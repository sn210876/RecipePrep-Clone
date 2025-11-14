import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Edit2, Trash2, Heart, MessageCircle, Crown } from 'lucide-react';
import { supabase, isAdmin } from '@/lib/supabase'; // ← Added isAdmin
import { toast } from 'sonner';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  caption: string | null;
  recipe_url: string | null;
  recipe_id?: string | null;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface PostDetailModalProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  onDelete: (postId: string) => void;
  onUpdate: () => void;
}

export function PostDetailModal({ post, open, onClose, onDelete, onUpdate }: PostDetailModalProps) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [caption, setCaption] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      loadReviewsAndComments();
      checkLikeStatus();
      loadCurrentUserAndAdminStatus();
    }
  }, [post]);

  const loadCurrentUserAndAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const admin = await isAdmin();
      setIsUserAdmin(admin);
    }
  };

  const loadReviewsAndComments = async () => {
    if (!post?.recipe_url) return;
    try {
      const { data: recipeData } = await supabase
        .from('public_recipes')
        .select('id')
        .eq('video_url', post.recipe_url)
        .maybeSingle();

      if (recipeData) {
        const { data: reviewsData } = await supabase
          .from('reviews')
          .select(`
            id,
            rating,
            comment,
            created_at,
            user_id,
            profiles:user_id (username)
          `)
          .eq('recipe_id', recipeData.id)
          .order('created_at', { ascending: false });

        if (reviewsData) {
          setReviews(reviewsData.map((r: any) => ({
            ...r,
            username: r.profiles?.username
          })));
        }
      }

      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          created_at,
          user_id,
          profiles:user_id (username)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });

      if (commentsData) {
        setComments(commentsData.map((c: any) => ({
          ...c,
          username: c.profiles?.username
        })));
      }
    } catch (error) {
      console.error('Error loading reviews and comments:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!post) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const handleUpdateCaption = async () => {
    if (!post) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ caption: caption.trim() })
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Caption updated!');
      setEditingCaption(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating caption:', error);
      toast.error('Failed to update caption');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm('Are you sure you want to delete this post?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Post deleted!');
      onDelete(post.id);
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          text: newComment.trim()
        });
      if (error) throw error;
      setNewComment('');
      await loadReviewsAndComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!post) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({ post_id: post.id, user_id: user.id });
      }
      setIsLiked(!isLiked);
      onUpdate();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  if (!post) return null;

  const canDeletePost = post.user_id === currentUserId || isUserAdmin;
  const canDeleteComment = (commentUserId: string) => commentUserId === currentUserId || isUserAdmin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col md:flex-row h-full">
          <div className="md:w-3/5 bg-black flex items-center justify-center">
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title || 'Post'}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : post.video_url ? (
              <video
                src={post.video_url}
                controls
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : null}
          </div>

          <div className="md:w-2/5 flex flex-col bg-white">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="font-semibold text-lg">{post.title || 'Post'}</h3>
              <div className="flex gap-2">
                {(post.user_id === currentUserId) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingCaption(!editingCaption)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                )}
                {canDeletePost && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDeletePost}
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                  </Button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                {editingCaption ? (
                  <div className="space-y-2">
                    <Textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption..."
                      rows={3}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateCaption} disabled={loading}>
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingCaption(false);
                          setCaption(post.caption || '');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {post.caption?.split(' ').map((word, i) => {
                      if (word.startsWith('http://') || word.startsWith('https://')) {
                        return (
                          <a
                            key={i}
                            href={word}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            {word}
                          </a>
                        );
                      }
                      return word + ' ';
                    })}
                  </p>
                )}
              </div>

              {reviews.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Reviews</h4>
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{review.username || 'User'}</span>
                        {review.user_id === 'd298f0c2-8748-4a0a-bb0c-9c8605595c58' && (
                          <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                        )}
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className={i < review.rating ? 'text-yellow-400' : 'text-gray-300'}>
                              Star
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {comments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Comments</h4>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <span className="font-medium text-sm">{comment.username || 'User'}</span>
                          {comment.user_id === 'd298f0c2-8748-4a0a-bb0c-9c8605595c58' && (
                            <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{comment.text}</p>
                      </div>
                      {canDeleteComment(comment.user_id) && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex items-center gap-4">
                <button onClick={handleToggleLike} className="transition-transform hover:scale-110">
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
                </button>
                <MessageCircle className="w-6 h-6 text-gray-700" />
              </div>

              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button onClick={handleAddComment} disabled={loading || !newComment.trim()} size="sm">
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}