import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { toast } from 'sonner';
import { Send } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen && postId) {
      loadComments();
      supabase.auth.getUser().then(({ data }) => {
        setCurrentUserId(data.user?.id || null);
      });
    }
  }, [isOpen, postId]);

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="px-4 py-3 border-b">
          <DialogTitle>Comments</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No comments yet. Be the first to comment!
            </div>
          ) : (
            comments.map(comment => (
              <div key={comment.id} className="flex gap-3">
                {comment.profiles?.avatar_url ? (
                  <img
                    src={comment.profiles.avatar_url}
                    alt={comment.profiles.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                    {comment.profiles?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="bg-gray-100 rounded-2xl px-3 py-2">
                    <p className="font-semibold text-sm">{comment.profiles?.username}</p>
                    <p className="text-sm text-gray-700 break-words">{comment.text}</p>
                  </div>
                  <p className="text-xs text-gray-400 mt-1 px-3">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSubmitComment} className="border-t px-4 py-3 flex gap-2">
          <Input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            disabled={submitting}
            className="flex-1"
          />
          <Button
            type="submit"
            disabled={!newComment.trim() || submitting}
            size="icon"
            className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
