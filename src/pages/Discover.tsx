import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, ExternalLink, MoreVertical, Trash2, Edit3, UserPlus, UserCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CommentModal } from '../components/CommentModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { Textarea } from '../components/ui/textarea';

interface Post {
  id: string;
  user_id: string;
  image_url: string;
  caption: string | null;
  recipe_url: string | null;
  created_at: string;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  likes: { user_id: string }[];
  comments: {
    id: string;
    text: string;
    created_at: string;
    profiles: {
      username: string;
    };
  }[];
  _count?: {
    likes: number;
    comments: number;
  };
}

export function Discover() {
  const { isAdmin } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<{ id: string; caption: string; recipeUrl: string } | null>(null);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());

  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const userId = data.user?.id || null;
      setCurrentUserId(userId);

      if (userId) {
        const { data: follows } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', userId);

        if (follows) {
          setFollowingUsers(new Set(follows.map(f => f.following_id)));
        }
      }
    });
  }, []);

  const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (postsError) throw postsError;

      const postsWithDetails = await Promise.all(
        (postsData || []).map(async (post) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', post.user_id)
            .single();

          const { data: likes } = await supabase
            .from('likes')
            .select('user_id')
            .eq('post_id', post.id);

          const { count: commentsCount } = await supabase
            .from('comments')
            .select('*', { count: 'exact', head: true })
            .eq('post_id', post.id);

          const { data: comments } = await supabase
            .from('comments')
            .select('id, text, created_at, user_id')
            .eq('post_id', post.id)
            .order('created_at', { ascending: false })
            .limit(2);

          const commentsWithProfiles = await Promise.all(
            (comments || []).map(async (comment) => {
              const { data: commentProfile } = await supabase
                .from('profiles')
                .select('username')
                .eq('id', comment.user_id)
                .single();

              return {
                ...comment,
                profiles: commentProfile,
              };
            })
          );

          return {
            ...post,
            profiles: profile,
            likes: likes || [],
            comments: commentsWithProfiles,
            _count: {
              likes: likes?.length || 0,
              comments: commentsCount || 0,
            },
          };
        })
      );

      if (isRefresh) {
        setPosts(postsWithDetails);
      } else {
        setPosts(prev => [...prev, ...postsWithDetails]);
      }

      setHasMore((postsData || []).length === POSTS_PER_PAGE);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts(0);

    const channel = supabase
      .channel('posts-and-comments-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
        () => {
          fetchPosts(0, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments' },
        () => {
          fetchPosts(0, true);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes' },
        () => {
          fetchPosts(0, true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchPosts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPosts(nextPage);
  };

  const toggleFollow = async (userId: string) => {
    if (!currentUserId) return;

    try {
      const isFollowing = followingUsers.has(userId);

      if (isFollowing) {
        const { error } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', currentUserId)
          .eq('following_id', userId);

        if (error) throw error;

        setFollowingUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(userId);
          return newSet;
        });
        toast.success('Unfollowed');
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: userId,
        });

        if (error) throw error;

        setFollowingUsers(prev => new Set([...prev, userId]));
        toast.success('Following!');
      }
    } catch (error: any) {
      console.error('Error toggling follow:', error);
      toast.error('Failed to update follow status');
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase.from('posts').delete().eq('id', deletePostId);

      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== deletePostId));
      toast.success('Post deleted');
      setDeletePostId(null);
    } catch (error: any) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  const handleEditPost = async () => {
    if (!editingPost) return;

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          caption: editingPost.caption.trim() || null,
          recipe_url: editingPost.recipeUrl.trim() || null,
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      setPosts(prev =>
        prev.map(p =>
          p.id === editingPost.id
            ? { ...p, caption: editingPost.caption.trim() || null, recipe_url: editingPost.recipeUrl.trim() || null }
            : p
        )
      );
      toast.success('Post updated');
      setEditingPost(null);
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    }
  };

  const toggleLike = async (postId: string) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.some(like => like.user_id === currentUserId);

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: currentUserId });

        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes.filter(like => like.user_id !== currentUserId),
                  _count: { ...p._count!, likes: p._count!.likes - 1 },
                }
              : p
          )
        );
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });

        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? {
                  ...p,
                  likes: [...p.likes, { user_id: currentUserId }],
                  _count: { ...p._count!, likes: p._count!.likes + 1 },
                }
              : p
          )
        );
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-lg mx-auto">
        {posts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <>
            {posts.map(post => {
              const isLiked = post.likes?.some(like => like.user_id === currentUserId);
              const latestComments = post.comments?.slice(0, 2) || [];

              const isOwnPost = post.user_id === currentUserId;
              const isFollowing = followingUsers.has(post.user_id);

              return (
                <div key={post.id} className="bg-white border-b border-gray-200 mb-2">
                  <div className="px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {post.profiles?.avatar_url ? (
                        <img
                          src={post.profiles.avatar_url}
                          alt={post.profiles.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-sm">
                          {post.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}
                      <span className="font-semibold text-sm">{post.profiles?.username}</span>
                      {!isOwnPost && (
                        <button
                          onClick={() => toggleFollow(post.user_id)}
                          className="ml-2"
                        >
                          {isFollowing ? (
                            <UserCheck className="w-5 h-5 text-orange-600" />
                          ) : (
                            <UserPlus className="w-5 h-5 text-gray-600 hover:text-orange-600" />
                          )}
                        </button>
                      )}
                    </div>

                    {(isOwnPost || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-2 hover:bg-gray-100 rounded-full">
                            <MoreVertical className="w-5 h-5 text-gray-600" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingPost({ id: post.id, caption: post.caption || '', recipeUrl: post.recipe_url || '' })}
                            className="cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4 mr-2" />
                            Edit post
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeletePostId(post.id)}
                            className="cursor-pointer text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  <img
                    src={post.image_url}
                    alt={post.caption || 'Post'}
                    className="w-full aspect-square object-cover"
                  />

                  <div className="px-4 py-3 space-y-2">
                    <div className="flex items-center gap-4">
                      <button onClick={() => toggleLike(post.id)} className="transition-transform hover:scale-110">
                        <Heart
                          className={`w-7 h-7 ${
                            isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'
                          }`}
                        />
                      </button>
                      <button
                        onClick={() => setCommentModalPostId(post.id)}
                        className="transition-transform hover:scale-110"
                      >
                        <MessageCircle className="w-7 h-7 text-gray-700" />
                      </button>
                    </div>

                    <div className="text-sm font-semibold">
                      {post._count?.likes || 0} {post._count?.likes === 1 ? 'like' : 'likes'}
                    </div>

                    {post.caption && (
                      <div className="text-sm">
                        <span className="font-semibold">{post.profiles?.username}</span>{' '}
                        <span className="text-gray-700">{post.caption}</span>
                      </div>
                    )}

                    {(post._count?.comments || 0) > 0 && (
                      <button
                        onClick={() => setCommentModalPostId(post.id)}
                        className="text-sm text-gray-500 hover:text-gray-700"
                      >
                        View all {post._count?.comments} comments
                      </button>
                    )}

                    {latestComments.map(comment => (
                      <div key={comment.id} className="text-sm">
                        <span className="font-semibold">{comment.profiles?.username}</span>{' '}
                        <span className="text-gray-700">{comment.text}</span>
                      </div>
                    ))}

                    {post.recipe_url && (
                      <Button
                        onClick={() => window.open(post.recipe_url!, '_blank')}
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-orange-600 text-orange-600 hover:bg-orange-50"
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View Recipe
                      </Button>
                    )}

                    <div className="text-xs text-gray-400 uppercase pt-1">
                      {new Date(post.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="py-8 text-center">
                <Button onClick={handleLoadMore} variant="outline">
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {commentModalPostId && (
        <CommentModal
          postId={commentModalPostId}
          isOpen={!!commentModalPostId}
          onClose={() => setCommentModalPostId(null)}
        />
      )}

      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Edit post</AlertDialogTitle>
            <AlertDialogDescription>
              Update your caption and recipe link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Caption</label>
              <Textarea
                value={editingPost?.caption || ''}
                onChange={(e) => setEditingPost(prev => prev ? { ...prev, caption: e.target.value } : null)}
                placeholder="Write a caption..."
                className="resize-none"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Recipe URL</label>
              <input
                type="url"
                value={editingPost?.recipeUrl || ''}
                onChange={(e) => setEditingPost(prev => prev ? { ...prev, recipeUrl: e.target.value } : null)}
                placeholder="https://..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditPost} className="bg-orange-600 hover:bg-orange-700">
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
