import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, ExternalLink, MoreVertical, Trash2, Edit3, UserPlus, UserCheck, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CommentModal } from '../components/CommentModal';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { Recipe } from '../types/recipe';
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
  title: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  recipe_url: string | null;
  recipe_id: string | null;
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
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

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
        setPage(0);
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
    let isMounted = true;
    let channel: any = null;

    const loadInitialPosts = async () => {
      if (!isMounted) return;
      await fetchPosts(0, true);
    };

    loadInitialPosts();

    channel = supabase
      .channel('posts-and-comments-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        async (payload) => {
          if (!isMounted) return;
          const newPost = payload.new as any;

          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', newPost.user_id)
            .maybeSingle();

          const fullPost = {
            ...newPost,
            profiles: profile || { username: 'User', avatar_url: null },
            likes: [],
            comments: [],
            _count: { likes: 0, comments: 0 },
          };

          setPosts(prev => {
            if (prev.some(p => p.id === fullPost.id)) return prev;
            return [fullPost, ...prev];
          });
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments' },
        () => {
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        () => {
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

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
        toast.success('Unsupported');
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: userId,
        });

        if (error) throw error;

        setFollowingUsers(prev => new Set([...prev, userId]));
        toast.success('Supporting!');
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

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, avatar_url')
      .ilike('username', `${query}%`)
      .limit(10);

    if (error) {
      console.error('Search error:', error);
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchResults(data || []);
    setShowSearchResults(data && data.length > 0);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      if (searchResults.length > 0) {
        setViewingUserId(searchResults[0].id);
        setShowSearchResults(false);
        setSearchQuery('');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="max-w-sm mx-auto">
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute left-0 right-0 bg-white border border-gray-200 rounded-lg mt-2 mx-4 max-h-60 overflow-y-auto shadow-lg z-20">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setViewingUserId(user.id);
                    setShowSearchResults(false);
                    setSearchQuery('');
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-gray-300 overflow-hidden">
                    {user.avatar_url && (
                      <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <span className="font-medium">{user.username}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {viewingUserId ? (
          <div className="p-4">
            <Button
              onClick={() => setViewingUserId(null)}
              variant="outline"
              className="mb-4"
            >
              ← Back to Feed
            </Button>
            {/* User profile view will go here */}
            <div className="text-center py-8">
              <p className="text-gray-500">User profile view coming soon</p>
            </div>
          </div>
        ) : posts.length === 0 ? (
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
                            <>
                              <UserCheck className="w-5 h-5 text-orange-600" />
                              <span className="text-xs text-orange-600">Supporting</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="w-5 h-5 text-gray-600 hover:text-orange-600" />
                              <span className="text-xs text-gray-600">Support</span>
                            </>
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

                    {(post.recipe_id || post.recipe_url) && (
                      <Button
                        onClick={async () => {
                          if (post.recipe_id) {
                            const { getRecipeById } = await import('../services/recipeService');
                            const recipe = await getRecipeById(post.recipe_id);
                            if (recipe) {
                              setSelectedRecipe(recipe);
                            } else {
                              toast.error('Recipe not found');
                            }
                          } else if (post.recipe_url) {
                            window.open(post.recipe_url, '_blank');
                          }
                        }}
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

      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          open={!!selectedRecipe}
          onOpenChange={(open) => !open && setSelectedRecipe(null)}
        />
      )}
    </div>
  );
}
