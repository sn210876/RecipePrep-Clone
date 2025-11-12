import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, ExternalLink } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { CommentModal } from '../components/CommentModal';

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
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);

  const POSTS_PER_PAGE = 10;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, []);

  const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (username, avatar_url),
          likes (user_id),
          comments (
            id,
            text,
            created_at,
            profiles:user_id (username)
          )
        `)
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (error) throw error;

      const postsWithCounts = (data || []).map(post => ({
        ...post,
        _count: {
          likes: post.likes?.length || 0,
          comments: post.comments?.length || 0,
        },
      }));

      if (isRefresh) {
        setPosts(postsWithCounts);
      } else {
        setPosts(prev => [...prev, ...postsWithCounts]);
      }

      setHasMore((data || []).length === POSTS_PER_PAGE);
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
      .channel('posts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'posts' },
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

              return (
                <div key={post.id} className="bg-white border-b border-gray-200 mb-2">
                  <div className="px-4 py-3 flex items-center gap-3">
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
    </div>
  );
}
