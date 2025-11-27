import { useState, useEffect } from 'react';
import { Plus, Heart, MessageSquare, Eye, TrendingUp, MoreVertical, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import { CreateBlogPost } from '../components/CreateBlogPost';
import { getAllBlogPosts, BlogPost, deleteBlogPost } from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { setPageMeta } from '../lib/seo';

interface BlogPageProps {
  onNavigate: (page: string) => void;
}

export function Blog({ onNavigate }: BlogPageProps) {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setPageMeta({
      title: 'Blog & Discussion Board',
      description: 'Join the MealScrape community. Share recipes, cooking tips, and food stories with fellow food enthusiasts.',
      type: 'website',
    });
  }, []);

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

  useEffect(() => {
    loadPosts();
  }, [page]);

  useEffect(() => {
    const channel = supabase
      .channel('blog-posts-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'blog_posts',
        },
        () => {
          loadPosts(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadPosts = async (reset = false) => {
    try {
      const newPosts = await getAllBlogPosts(reset ? 1 : page, 20);
      if (reset) {
        // Remove duplicates by ID
        const uniquePosts = Array.from(
          new Map(newPosts.map(post => [post.id, post])).values()
        );
        setPosts(uniquePosts);
        setPage(1);
      } else {
        // Merge with existing posts and remove duplicates
        const allPosts = [...posts, ...newPosts];
        const uniquePosts = Array.from(
          new Map(allPosts.map(post => [post.id, post])).values()
        );
        setPosts(uniquePosts);
      }
      setHasMore(newPosts.length === 20);
    } catch (error) {
      console.error('Error loading posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePostCreated = (slug: string) => {
    // Don't manually reload - realtime subscription will handle it
    onNavigate(`blog:${slug}`);
  };

  const handlePostClick = (slug: string) => {
    onNavigate(`blog:${slug}`);
  };

  const handleDeletePost = async (postId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this post?')) return;

    try {
      await deleteBlogPost(postId);
      toast.success('Post deleted successfully');
      loadPosts(true);
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="space-y-6">
            {[...Array(5)].map((_, i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
                <div className="h-4 bg-gray-200 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 rounded w-2/3" />
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2 flex items-center gap-2">
              <TrendingUp className="h-8 w-8 text-orange-500" />
              Blog & Discussions
            </h1>
            <p className="text-gray-600">
              Share your cooking journey, tips, and stories with the community
            </p>
          </div>
          {user && (
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              New Post
            </Button>
          )}
        </div>

        {!user && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
            <p className="text-center text-gray-700">
              <strong>Join the conversation!</strong> Log in to create posts, comment, and vote.
            </p>
          </Card>
        )}

        <div className="space-y-6">
          {posts.map((post) => (
            <Card
              key={post.id}
              className="p-6 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => handlePostClick(post.slug)}
            >
              <div className="flex gap-4">
                {post.cover_image && (
                  <div className="flex-shrink-0 w-32 h-32 rounded-lg overflow-hidden">
                    <img
                      src={post.cover_image}
                      alt={post.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h2 className="text-2xl font-bold text-gray-900 hover:text-orange-600 transition-colors flex-1">
                      {post.title}
                    </h2>
                    {(user?.id === post.user_id || isAdmin) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => handleDeletePost(post.id, e)}
                            className="text-red-600 focus:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Post
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>

                  {post.excerpt && (
                    <p className="text-gray-600 mb-3 line-clamp-2">{post.excerpt}</p>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <Avatar
                      className="h-6 w-6 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.author?.username) onNavigate(`profile:${post.author.username}`);
                      }}
                    >
                      <AvatarImage src={post.author?.avatar_url || undefined} />
                      <AvatarFallback>
                        {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (post.author?.username) onNavigate(`profile:${post.author.username}`);
                      }}
                      className="text-sm font-medium text-gray-700 hover:text-orange-600 hover:underline cursor-pointer transition-colors"
                    >
                      {post.author?.username || 'Anonymous'}
                    </button>
                    <span className="text-sm text-gray-500">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-500">
                    <div className="flex items-center gap-1">
                      <Heart className="h-4 w-4" />
                      {post.like_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      {post.comment_count || 0}
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      {post.views || 0}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {hasMore && (
          <div className="text-center mt-8">
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={loading}
            >
              {loading ? 'Loading...' : 'Load More'}
            </Button>
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No posts yet</h3>
            <p className="text-gray-600 mb-4">Be the first to share something!</p>
            {user && (
              <Button onClick={() => setShowCreateModal(true)}>Create First Post</Button>
            )}
          </div>
        )}
      </div>

      <CreateBlogPost
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onPostCreated={handlePostCreated}
      />
    </div>
  );
}
