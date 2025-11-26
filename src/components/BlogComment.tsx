import { useState, useEffect } from 'react';
import { ArrowUp, ArrowDown, MessageSquare, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { BlogComment as BlogCommentType, voteOnComment, createBlogComment, deleteBlogComment } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '../lib/supabase';

interface BlogCommentProps {
  comment: BlogCommentType;
  postId: string;
  onCommentAdded: () => void;
  depth?: number;
  onNavigate?: (page: string, userId?: string) => void;
}

export function BlogComment({ comment, postId, onCommentAdded, depth = 0, onNavigate }: BlogCommentProps) {
  const { user } = useAuth();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localVoteScore, setLocalVoteScore] = useState(comment.vote_score || 0);
  const [localUserVote, setLocalUserVote] = useState(comment.user_vote);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single()
        .then(({ data }) => setIsAdmin(data?.is_admin === true));
    }
  }, [user]);

  const handleVote = async (voteType: 'up' | 'down') => {
    if (!user) {
      toast.error('Please log in to vote');
      return;
    }

    try {
      const wasVoted = localUserVote === voteType;
      const oldVote = localUserVote;

      if (wasVoted) {
        setLocalUserVote(null);
        setLocalVoteScore(localVoteScore + (voteType === 'up' ? -1 : 1));
      } else {
        setLocalUserVote(voteType);
        if (oldVote) {
          setLocalVoteScore(localVoteScore + (voteType === 'up' ? 2 : -2));
        } else {
          setLocalVoteScore(localVoteScore + (voteType === 'up' ? 1 : -1));
        }
      }

      await voteOnComment(comment.id, voteType);
    } catch (error) {
      console.error('Error voting:', error);
      setLocalUserVote(comment.user_vote);
      setLocalVoteScore(comment.vote_score || 0);
      toast.error('Failed to vote');
    }
  };

  const handleReplySubmit = async () => {
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!replyText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBlogComment(postId, replyText, comment.id);
      setReplyText('');
      setShowReply(false);
      toast.success('Reply posted!');
      onCommentAdded();
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!confirm('Are you sure you want to delete this comment?')) return;

    try {
      await deleteBlogComment(comment.id);
      toast.success('Comment deleted successfully');
      onCommentAdded();
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const maxDepth = 5;
  const canNest = depth < maxDepth;

  return (
    <div className={`${depth > 0 ? 'ml-8 mt-4' : 'mt-4'}`}>
      <div className="flex gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ${localUserVote === 'up' ? 'text-orange-500' : 'text-gray-400'}`}
            onClick={() => handleVote('up')}
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
          <span className={`text-xs font-medium ${
            localVoteScore > 0 ? 'text-orange-500' :
            localVoteScore < 0 ? 'text-blue-500' :
            'text-gray-500'
          }`}>
            {localVoteScore}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className={`h-6 w-6 p-0 ${localUserVote === 'down' ? 'text-blue-500' : 'text-gray-400'}`}
            onClick={() => handleVote('down')}
          >
            <ArrowDown className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={comment.author.avatar_url || undefined} />
              <AvatarFallback>
                {comment.author.username?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={() => onNavigate?.('profile', comment.author.id)}
              className="text-sm font-medium text-gray-900 hover:text-orange-600 hover:underline cursor-pointer transition-colors"
            >
              {comment.author.username || 'Anonymous'}
            </button>
            <span className="text-xs text-gray-500">
              {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
            </span>
            {(user?.id === comment.user_id || isAdmin) && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0 ml-auto">
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={handleDeleteComment}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Comment
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <p className="text-sm text-gray-700 mb-2 whitespace-pre-wrap">{comment.content}</p>

          <div className="flex items-center gap-2">
            {canNest && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setShowReply(!showReply)}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Reply
              </Button>
            )}
          </div>

          {showReply && (
            <div className="mt-3 space-y-2">
              <Textarea
                placeholder="Write a reply..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="min-h-[80px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={handleReplySubmit}
                  disabled={isSubmitting || !replyText.trim()}
                >
                  {isSubmitting ? 'Posting...' : 'Post Reply'}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowReply(false);
                    setReplyText('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {comment.replies && comment.replies.length > 0 && (
            <div className="mt-2">
              {comment.replies.map((reply) => (
                <BlogComment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  onCommentAdded={onCommentAdded}
                  depth={depth + 1}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
