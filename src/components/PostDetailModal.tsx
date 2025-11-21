import { useState, useEffect, useRef } from 'react';
import { X, Heart, MessageCircle, Play, Pause, Volume2, VolumeX, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { makeHashtagsClickable } from '../lib/hashtags';
import { formatDistanceToNow } from 'date-fns';

interface PostDetailModalProps {
  postId: string;
  onClose: () => void;
}

export function PostDetailModal({ postId, onClose }: PostDetailModalProps) {
  const [post, setPost] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showAllComments, setShowAllComments] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    fetchPost();
    fetchComments();
    getCurrentUser();
  }, [postId]);

  const getCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUserId(user?.id || null);
  };

  const fetchPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      setPost(data);
    } catch (error) {
      console.error('Error fetching post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          *,
          profiles:user_id (
            username,
            avatar_url,
            display_name
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setComments(data || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUserId || !post) return;

    try {
      const { data: existingLike } = await supabase
        .from('likes')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', currentUserId)
        .single();

      if (existingLike) {
        await supabase.from('likes').delete().eq('id', existingLike.id);
        setPost({ ...post, likes_count: (post.likes_count || 1) - 1 });
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });
        setPost({ ...post, likes_count: (post.likes_count || 0) + 1 });
      }
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !currentUserId) return;

    try {
      const { error } = await supabase.from('comments').insert({
        post_id: postId,
        user_id: currentUserId,
        text: newComment.trim(),
      });

      if (error) throw error;

      setNewComment('');
      fetchComments();
      toast.success('Comment posted!');
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    }
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
    }
    if (audioRef.current) {
      audioRef.current.muted = !isMuted;
    }
    setIsMuted(!isMuted);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center">
        <div className="text-white">Post not found</div>
      </div>
    );
  }

  const displayedComments = showAllComments ? comments : comments.slice(0, 3);

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-5xl h-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col md:flex-row" onClick={(e) => e.stopPropagation()}>
        {/* Media Section */}
        <div className="relative md:w-2/3 bg-black flex items-center justify-center">
          <button
            onClick={onClose}
            className="absolute top-4 left-4 z-10 p-2 bg-black/50 hover:bg-black/70 rounded-full transition-all"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {post.video_url ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                src={post.video_url}
                className="w-full h-full object-contain"
                loop
                playsInline
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
              />
              <button
                onClick={togglePlay}
                className="absolute bottom-4 left-4 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white" />}
              </button>
              <button
                onClick={toggleMute}
                className="absolute bottom-4 right-4 p-3 bg-black/50 hover:bg-black/70 rounded-full transition-all"
              >
                {isMuted ? <VolumeX className="w-6 h-6 text-white" /> : <Volume2 className="w-6 h-6 text-white" />}
              </button>
            </div>
          ) : post.image_url ? (
            <img src={post.image_url} alt={post.title} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white">
              No media available
            </div>
          )}

          {post.music_url && (
            <audio ref={audioRef} src={post.music_url} loop autoPlay muted={isMuted} />
          )}
        </div>

        {/* Comments Section */}
        <div className="md:w-1/3 flex flex-col bg-white">
          {/* Header */}
          <div className="p-4 border-b flex items-center gap-3">
            {post.profiles?.avatar_url ? (
              <img
                src={post.profiles.avatar_url}
                alt={post.profiles.username}
                className="w-10 h-10 rounded-full object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {post.profiles?.username?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
            )}
            <div>
              <p className="font-semibold">{post.profiles?.display_name || post.profiles?.username}</p>
              <p className="text-xs text-gray-500">@{post.profiles?.username}</p>
            </div>
          </div>

          {/* Caption */}
          <div className="p-4 border-b">
            <p className="font-semibold mb-1">{post.title}</p>
            <p className="text-sm text-gray-700">
              {makeHashtagsClickable(post.caption || '', (tag) => console.log('Clicked hashtag:', tag))}
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
            </p>
          </div>

          {/* Actions */}
          <div className="p-4 border-b flex items-center gap-4">
            <button onClick={handleLike} className="flex items-center gap-2 hover:text-red-500 transition-colors">
              <Heart className="w-6 h-6" />
              <span className="text-sm">{post.likes_count || 0}</span>
            </button>
            <button className="flex items-center gap-2">
              <MessageCircle className="w-6 h-6" />
              <span className="text-sm">{comments.length}</span>
            </button>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {displayedComments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                {comment.profiles?.avatar_url ? (
                  <img
                    src={comment.profiles.avatar_url}
                    alt={comment.profiles.username}
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center flex-shrink-0">
                    <span className="text-white font-bold text-xs">
                      {comment.profiles?.username?.[0]?.toUpperCase() || '?'}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{comment.profiles?.username}</p>
                  <p className="text-sm text-gray-700">{comment.text}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}

            {comments.length > 3 && !showAllComments && (
              <button
                onClick={() => setShowAllComments(true)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                View all {comments.length} comments
              </button>
            )}
          </div>

          {/* Comment Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                placeholder="Add a comment..."
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <button
                onClick={handleComment}
                disabled={!newComment.trim()}
                className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-lg disabled:opacity-50 hover:from-orange-600 hover:to-red-700 transition-all"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
