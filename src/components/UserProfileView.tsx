import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { UserPlus, UserCheck, PiggyBank, Send, Heart, MessageCircle, Crown, Trash2, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import CommentModal from './CommentModal';
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
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Back Button - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 shadow-sm">
        <Button
          onClick={onBack}
          variant="ghost"
          className="min-h-[44px] gap-2 touch-manipulation active:scale-95 transition-all"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Feed
        </Button>
      </div>

      <div className="bg-white border-b border-gray-200">
        {/* Banner */}
        <div className="relative h-32">
          {userProfile?.banner_url ? (
            <img
              src={userProfile.banner_url}
              alt="Banner"
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100" />
          )}
        </div>

        {/* Profile Info */}
        <div className="relative px-4 pb-3">
          <div className="flex items-start gap-3 -mt-10">
            {/* Avatar */}
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

            {/* Bio */}
            <div className="flex-1 pt-10 min-w-0">
              {userProfile?.bio ? (
                <p className="text-sm text-gray-700 line-clamp-2 break-words">
                  {userProfile.bio}
                </p>
              ) : (
                <p className="text-sm text-gray-400 italic">No bio</p>
              )}
            </div>
          </div>

          {/* Username */}
          <div className="mt-2 flex items-center gap-2">
            <h2 className="text-lg font-bold text-gray-900 truncate">{userProfile?.username || 'Loading...'}</h2>
            {userId === '51ad04fa-6d63-4c45-9423-76183eea7b39' && (
              <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500 flex-shrink-0" />
            )}
          </div>

          {/* Action Buttons */}
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
                className="flex-1 min-h-[44px] touch-manipulation active:scale-95 transition-all"
              >
                <Send className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">Message</span>
              </Button>
              <Button
                onClick={() => onToggleFollow(userId)}
                variant={isFollowing ? 'outline' : 'default'}
                size="sm"
                className={`flex-1 min-h-[44px] touch-manipulation active:scale-95 transition-all ${
                  isFollowing ? '' : 'bg-orange-500 hover:bg-orange-600'
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Supporting</span>
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2 flex-shrink-0" />
                    <span className="truncate">Support</span>
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="px-4 py-3 border-t border-gray-200">
          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-base font-bold">{userPosts.length}</div>
              <div className="text-xs text-gray-500">posts</div>
            </div>
            <button 
              onClick={loadSupporters} 
              className="text-center hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors min-h-[44px] touch-manipulation active:scale-95"
            >
              <div className="text-base font-bold">{supportersCount}</div>
              <div className="text-xs text-gray-500">supporters</div>
            </button>
            <button 
              onClick={loadSupporting} 
              className="text-center hover:bg-gray-50 px-3 py-1 rounded-lg transition-colors min-h-[44px] touch-manipulation active:scale-95"
            >
              <div className="text-base font-bold">{supportingCount}</div>
              <div className="text-xs text-gray-500">supporting</div>
            </button>
          </div>
        </div>
      </div>

      {/* Posts Grid */}
      <div className="p-4">
        {userPosts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No posts yet
          </div>
        ) : (
          <div className="space-y-4">
            {userPosts.map(post => {
              const isLiked = likedPosts.has(post.id);
              return (
                <div key={post.id} className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="relative">
                    {post.image_url ? (
                      <img
                        src={post.image_url}
                        alt={post.title || 'Post'}
                        className="w-full aspect-square object-cover"
                        loading="lazy"
                      />
                    ) : post.video_url ? (
                      <video
                        src={post.video_url}
                        controls
                        className="w-full aspect-square object-cover"
                      />
                    ) : null}
                    {post.title && (
                      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-3 py-2">
                        <h3 className="text-white text-sm font-semibold line-clamp-2">{post.title}</h3>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-3">
                    <div className="flex gap-4 mb-2">
                      <button 
                        onClick={() => toggleLike(post.id)} 
                        className="transition-transform hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 touch-manipulation"
                      >
                        <Heart
                          className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-600'}`}
                        />
                      </button>
                      <button 
                        onClick={() => setSelectedPostId(post.id)} 
                        className="transition-transform hover:scale-110 active:scale-95 min-h-[44px] min-w-[44px] flex items-center justify-center -ml-2 touch-manipulation"
                      >
                        <MessageCircle className="w-6 h-6 text-gray-600" />
                      </button>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      {post._count?.likes || 0} {post._count?.likes === 1 ? 'like' : 'likes'}
                    </div>
                    
                    {post.caption && (
                      <p className="text-sm leading-relaxed break-words">{post.caption}</p>
                    )}

                    {/* Latest Comment */}
                    {post.latest_comment && (
                      <div
                        className="mt-3 relative"
                        onTouchStart={() => post.latest_comment?.user_id === currentUserId && setHoveredCommentId(post.latest_comment.id)}
                        onTouchEnd={() => setTimeout(() => setHoveredCommentId(null), 3000)}
                      >
                        <div className="flex items-start gap-2 pr-10">
                          <span className="font-semibold text-sm flex-shrink-0">
                            {post.latest_comment.profiles?.username}
                          </span>
                          <span className="text-sm text-gray-700 break-words">
                            {post.latest_comment.text}
                          </span>
                        </div>

                        {post.latest_comment.user_id === currentUserId && hoveredCommentId === post.latest_comment.id && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteComment(post.latest_comment!.id);
                            }}
                            className="absolute top-0 right-0 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-red-600 active:scale-90 z-10 touch-manipulation"
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
                        className="text-sm text-gray-500 mt-2 hover:text-gray-700 block min-h-[36px] touch-manipulation"
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
      </div>

      {/* Post Modal */}
      {selectedPostId && (() => {
        const selectedPost = userPosts.find(p => p.id === selectedPostId);
        const canEdit = selectedPost && currentUserId && (currentUserId === selectedPost.user_id);

        if (!selectedPost) return null;

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
            <div className="relative bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden">
              
              <CommentModal
                postId={selectedPostId}
                isOpen
                onClose={() => setSelectedPostId(null)}
              />

              <button
                onClick={() => setSelectedPostId(null)}
                className="absolute top-3 left-3 bg-black/50 backdrop-blur-md text-white p-2.5 rounded-full shadow hover:bg-black/70 z-[100] min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                title="Close"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {canEdit && (
                <>
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
                          if (error) toast.error("Failed to update post");
                          else {
                            toast.success("Post updated");
                            if (onRefresh) onRefresh();
                          }
                        });
                    }}
                    className="absolute top-3 right-14 bg-blue-600 text-white p-2.5 rounded-full shadow hover:bg-blue-700 z-[100] min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                    title="Edit post"
                  >
                    ✏️
                  </button>

                  <button
                    onClick={async () => {
                      if (!confirm("Delete this post?")) return;

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
                    className="absolute top-3 right-3 bg-red-600 text-white p-2.5 rounded-full shadow hover:bg-red-700 z-[100] min-h-[44px] min-w-[44px] touch-manipulation active:scale-95"
                    title="Delete post"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })()}

     <Dialog open={showSupporters} onOpenChange={setShowSupporters}>
  <DialogContent className="max-w-sm">
    <DialogHeader>
      <DialogTitle>Supporters</DialogTitle>
    </DialogHeader>

    <div className="space-y-3 max-h-96 overflow-y-auto">
      {supporters.map((supporter) => (
        <button
          key={supporter.follower_id}
          onClick={() => {
            console.log('Clicking supporter:', supporter); // Debug log
            setShowSupporters(false);
            // Use the follower_id which is the actual user ID
            window.location.href = `/${supporter.profiles?.username || supporter.follower_id}`;
          }}
          className="flex items-center gap-3 min-h-[44px] w-full hover:bg-gray-50 p-2 rounded-lg transition-colors touch-manipulation active:scale-95 text-left"
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
            {supporter.profiles?.avatar_url ? (
              <img
                src={supporter.profiles.avatar_url}
                alt={supporter.profiles.username}
                className="w-full h-full object-cover"
              />
            ) : (
              supporter.profiles?.username?.[0]?.toUpperCase() || <PiggyBank className="w-5 h-5" />
            )}
          </div>
          <span className="font-medium truncate">
            {supporter.profiles?.username || 'User'}
          </span>
        </button>
      ))}

      {supporters.length === 0 && (
        <p className="text-center text-gray-500 py-8">No supporters yet</p>
      )}
    </div>
  </DialogContent>
</Dialog>

      {/* Supporting Dialog */}
      <Dialog open={showSupporting} onOpenChange={setShowSupporting}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Supporting</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {supporting.map((followed) => (
             <button
  key={followed.following_id}
  onClick={() => {
    setShowSupporting(false);
    window.location.href = `/${followed.profiles?.username}`;
  }}
  className="flex items-center gap-3 min-h-[44px] w-full hover:bg-gray-50 p-2 rounded-lg transition-colors touch-manipulation active:scale-95"
>
  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-bold flex-shrink-0 overflow-hidden">
    {followed.profiles?.avatar_url ? (
      <img
        src={followed.profiles.avatar_url}
        alt={followed.profiles.username}
        className="w-full h-full object-cover"
      />
    ) : (
      followed.profiles?.username?.[0]?.toUpperCase() || <PiggyBank className="w-5 h-5" />
    )}
  </div>
  <span className="font-medium truncate">{followed.profiles?.username || 'User'}</span>
</button>
            ))}
            {supporting.length === 0 && (
              <p className="text-center text-gray-500 py-8">Not supporting anyone yet</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}