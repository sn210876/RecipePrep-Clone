import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { UserPlus, UserCheck, PiggyBank, Send, Heart, MessageCircle, Crown, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { CommentModal } from './CommentModal';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  title: string;
  caption: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
  latest_comment?: {
    id: string;
    user_id: string;
    text: string;
    profiles?: {
      username: string;
    };
  };
}

interface UserProfileViewProps {
  userId: string;
  currentUserId: string | null;
  posts: Post[];
  isFollowing: boolean;
  onBack: () => void;
  onToggleFollow: (userId: string) => void;
  onMessage?: (userId: string, username: string) => void;
  onRefresh?: () => void;
}

export function UserProfileView({
  userId,
  currentUserId,
  posts,
  isFollowing,
  onBack,
  onToggleFollow,
  onMessage,
  onRefresh,
}: UserProfileViewProps) {
  const userPosts = posts.filter(p => p.user_id === userId);
  const [userProfile, setUserProfile] = useState<{ username: string; avatar_url: string | null; bio?: string; banner_url?: string | null } | null>(null);
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

  const [supportersCount, setSupportersCount] = useState(0);
  const [supportingCount, setSupportingCount] = useState(0);
  const [showSupporters, setShowSupporters] = useState(false);
  const [showSupporting, setShowSupporting] = useState(false);
  const [supporters, setSupporters] = useState<any[]>([]);
  const [supporting, setSupporting] = useState<any[]>([]);
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null);
  useEffect(() => {
    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('username, avatar_url, bio, banner_url')
        .eq('id', userId)
        .maybeSingle();

      if (data) {
        setUserProfile(data);
      }
    };

    const fetchCounts = async () => {
      const { count: followersCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

      const { count: followingCount } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

      setSupportersCount(followersCount || 0);
      setSupportingCount(followingCount || 0);
    };

    const fetchLikes = async () => {
      if (!currentUserId) return;

      const { data } = await supabase
        .from('likes')
        .select('post_id')
        .eq('user_id', currentUserId)
        .in('post_id', userPosts.map(p => p.id));

      if (data) {
        setLikedPosts(new Set(data.map(like => like.post_id)));
      }
    };

    fetchProfile();
    fetchCounts();
    fetchLikes();
  }, [userId, currentUserId, userPosts.length]);

  const loadSupporters = async () => {
    const { data } = await supabase
      .from('follows')
      .select('follower_id, profiles:follower_id(id, username, avatar_url)')
      .eq('following_id', userId);

    setSupporters(data || []);
    setShowSupporters(true);
  };

  const loadSupporting = async () => {
    const { data } = await supabase
      .from('follows')
      .select('following_id, profiles:following_id(id, username, avatar_url)')
      .eq('follower_id', userId);

    setSupporting(data || []);
    setShowSupporting(true);
  };
const handleDeleteComment = async (commentId: string) => {
  if (!currentUserId) return;

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', currentUserId);

  if (error) {
    toast.error('Failed to delete comment');
  } else {
    toast.success('Comment deleted');
    if (onRefresh) {
      onRefresh();
    }
  }
};
  const toggleLike = async (postId: string) => {
    if (!currentUserId) return;

    const isLiked = likedPosts.has(postId);

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: currentUserId });

        setLikedPosts(prev => {
          const next = new Set(prev);
          next.delete(postId);
          return next;
        });
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });

        const post = userPosts.find(p => p.id === postId);
        if (post && post.user_id !== currentUserId) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'like',
            post_id: postId,
          });
        }

        setLikedPosts(prev => new Set(prev).add(postId));
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  return (
    <div className="p-4">
      <Button
        onClick={onBack}
        variant="outline"
        className="mb-4"
      >
        ← Back to Feed
      </Button>

      <div className="bg-white border-b border-gray-200 mb-4">
        {/* Banner */}
        <div className="relative h-32">
          {userProfile?.banner_url ? (
            <img
              src={userProfile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100" />
          )}
        </div>

        {/* Avatar + Username + Bio section - Instagram style left-aligned */}
        <div className="relative px-4 pb-3">
          <div className="flex items-start gap-3 -mt-10">
            {/* Avatar overlapping banner */}
            <div className="relative flex-shrink-0">
              {userProfile?.avatar_url ? (
                <img
                  src={userProfile.avatar_url}
                  alt={userProfile.username}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                  {userProfile?.username?.[0]?.toUpperCase()}
                </div>
              )}
            </div>

            {/* Bio aligned to right of avatar, vertically centered */}
            <div className="flex-1 pt-10 min-w-0">
              {userProfile?.bio ? (
                <p className="text-sm text-gray-700 line-clamp-1 overflow-hidden text-ellipsis">
                  {userProfile.bio}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No bio</p>
              )}
            </div>
          </div>

          {/* Username directly under avatar with minimal gap */}
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900">{userProfile?.username || 'Loading...'}</h2>
            {userId === '51ad04fa-6d63-4c45-9423-76183eea7b39' && (
              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
            )}
          </div>

          {/* Follow/Message buttons */}
          {userId !== currentUserId && (
            <div className="flex gap-2 mt-3">
              <Button
                onClick={() => {
                  if (onMessage && userProfile) {
                    onMessage(userId, userProfile.username);
                  }
                }}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Send className="w-4 h-4 mr-2" />
                Message
              </Button>
              <Button
                onClick={() => onToggleFollow(userId)}
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                className={isFollowing ? 'flex-1' : 'flex-1 bg-orange-500 hover:bg-orange-600'}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2" />
                    Supporting
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Support
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Stats section - centered with reduced gaps */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-center gap-8">
            <div className="text-center">
              <div className="text-lg font-bold">{userPosts.length}</div>
              <div className="text-xs text-gray-500">posts</div>
            </div>
            <button onClick={loadSupporters} className="text-center hover:bg-gray-50 px-3 py-1 rounded-lg transition">
              <div className="text-lg font-bold">{supportersCount}</div>
              <div className="text-xs text-gray-500">supporters</div>
            </button>
            <button onClick={loadSupporting} className="text-center hover:bg-gray-50 px-3 py-1 rounded-lg transition">
              <div className="text-lg font-bold">{supportingCount}</div>
              <div className="text-xs text-gray-500">supporting</div>
            </button>
          </div>
        </div>
      </div>

      {userPosts.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No posts yet
        </div>
      ) : (
        <div className="space-y-4">
          {userPosts.map(post => {
            const isLiked = likedPosts.has(post.id);
            return (
              <div key={post.id} className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="relative">
                  {post.image_url ? (
                    <img
                      src={post.image_url}
                      alt={post.title || 'Post'}
                      className="w-full aspect-square object-cover"
                    />
                  ) : post.video_url ? (
                    <video
                      src={post.video_url}
                      controls
                      className="w-full aspect-square object-cover"
                    />
                  ) : null}
                  {post.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
                      <h3 className="text-white text-sm font-semibold">{post.title}</h3>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="flex gap-4 mb-3">
                    <button onClick={() => toggleLike(post.id)} className="transition-transform hover:scale-110">
                      <Heart
                        className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                      />
                    </button>
                    <button onClick={() => setSelectedPostId(post.id)} className="transition-transform hover:scale-110">
                      <MessageCircle className="w-6 h-6 text-gray-600" />
                    </button>
                  </div>
                                  <div className="text-sm text-gray-600 mb-2">
                    {post._count?.likes || 0} likes
                  </div>
                  {post.caption && (
                    <p className="text-sm">{post.caption}</p>
                  )}

                  {/* Show latest comment with delete button for your own */}
                  {post.latest_comment && (
                    <div
                      className="mt-3 relative"
                      onMouseEnter={() => post.latest_comment?.user_id === currentUserId && setHoveredCommentId(post.latest_comment.id)}
                      onMouseLeave={() => setHoveredCommentId(null)}
                      onTouchStart={() => post.latest_comment?.user_id === currentUserId && setHoveredCommentId(post.latest_comment.id)}
                      onTouchEnd={() => setHoveredCommentId(null)}
                    >
                      <div className="flex items-start gap-2">
                        <span className="font-semibold text-sm">
                          {post.latest_comment.profiles?.username}
                        </span>
                        <span className="text-sm text-gray-700">
                          {post.latest_comment.text}
                        </span>
                      </div>

                      {/* DELETE BUTTON – only on your comment */}
                      {post.latest_comment.user_id === currentUserId && hoveredCommentId === post.latest_comment.id && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteComment(post.latest_comment!.id);
                          }}
                          className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-95 z-10"
                          title="Delete comment"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  )}

                  {post._count && post._count.comments > 0 && (
                    <button
                      onClick={() => setSelectedPostId(post.id)}
                      className="text-sm text-gray-500 mt-2 hover:text-gray-700 block"
                    >
                      View all {post._count.comments} {post._count.comments === 1 ? 'comment' : 'comments'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

     {selectedPostId && (
  <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center">
    <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full">
{/* EDIT POST BUTTON */}
{currentUserId === userId && (
  <button
    onClick={() => {
      const newCaption = prompt("Edit your caption:");
      if (!newCaption) return;

      supabase
        .from("posts")
        .update({ caption: newCaption })
        .eq("id", selectedPostId)
        .eq("user_id", currentUserId)
        .then(({ error }) => {
          if (error) {
            toast.error("Failed to update post");
          } else {
            toast.success("Post updated");
            if (onRefresh) onRefresh();
          }
        });
    }}
    className="absolute top-3 right-14 bg-blue-600 text-white p-2 rounded-full shadow hover:bg-blue-700"
  >
    ✏️
  </button>
)}
const selectedPost = userPosts.find(p => p.id === selectedPostId);

      {/* DELETE POST BUTTON */}
{currentUserId === postOwnerId && (
        <button
          onClick={async () => {
            const confirmed = confirm("Delete this post?");
            if (!confirmed) return;

            const { error } = await supabase
              .from("posts")
              .delete()
              .eq("id", selectedPostId)
              .eq("user_id", currentUserId);

            if (error) {
              toast.error("Failed to delete post");
            } else {
              toast.success("Post deleted");
              setSelectedPostId(null);
              if (onRefresh) onRefresh();
            }
          }}
          className="absolute top-3 right-3 bg-red-600 text-white p-2 rounded-full shadow hover:bg-red-700"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      )}

      {/* EXISTING COMMENT MODAL */}
      <CommentModal
        postId={selectedPostId}
        isOpen={true}
        onClose={() => setSelectedPostId(null)}
      />
    </div>
  </div>
)}


      <Dialog open={showSupporters} onOpenChange={setShowSupporters}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supporters</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {supporters.map((supporter) => (
              <div key={supporter.follower_id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold">
                  {supporter.profiles?.username?.[0]?.toUpperCase() || <PiggyBank className="w-5 h-5" />}
                </div>
                <span className="font-medium">{supporter.profiles?.username || 'User'}</span>
              </div>
            ))}
            {supporters.length === 0 && (
              <p className="text-center text-gray-500 py-4">No supporters yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showSupporting} onOpenChange={setShowSupporting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supporting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {supporting.map((followed) => (
              <div key={followed.following_id} className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold">
                  {followed.profiles?.username?.[0]?.toUpperCase() || <PiggyBank className="w-5 h-5" />}
                </div>
                <span className="font-medium">{followed.profiles?.username || 'User'}</span>
              </div>
            ))}
            {supporting.length === 0 && (
              <p className="text-center text-gray-500 py-4">Not supporting anyone yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
