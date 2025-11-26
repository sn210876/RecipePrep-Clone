import { useState, useEffect } from 'react';
import { ArrowLeft, Heart, MessageSquare, Eye, Share2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Separator } from '../components/ui/separator';
import { BlogComment } from '../components/BlogComment';
import {
  getBlogPostBySlug,
  toggleBlogLike,
  getBlogComments,
  createBlogComment,
  BlogPost as BlogPostType,
  BlogComment as BlogCommentType,
} from '../services/blogService';
import { useAuth } from '../context/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { setPageMeta, generateArticleSchema } from '../lib/seo';

interface BlogPostPageProps {
  slug: string;
  onNavigate: (page: string) => void;
}

export function BlogPostPage({ slug, onNavigate }: BlogPostPageProps) {
  const { user } = useAuth();
  const [post, setPost] = useState<BlogPostType | null>(null);
  const [comments, setComments] = useState<BlogCommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localLiked, setLocalLiked] = useState(false);
  const [localLikeCount, setLocalLikeCount] = useState(0);

  useEffect(() => {
    loadPost();
  }, [slug]);

  useEffect(() => {
    if (!post) return;

    setPageMeta({
      title: post.title,
      description: post.excerpt || 'Read this post on MealScrape',
      image: post.cover_image || undefined,
      url: `${window.location.origin}/blog/${post.slug}`,
      type: 'article',
      author: post.author?.username || 'MealScrape User',
      publishedTime: post.created_at,
    });

    generateArticleSchema({
      title: post.title,
      description: post.excerpt || '',
      image: post.cover_image || undefined,
      author: post.author?.username || 'MealScrape User',
      authorUrl: post.author ? `${window.location.origin}/${post.author.username}` : undefined,
      publishedTime: post.created_at,
      modifiedTime: post.updated_at,
      url: `${window.location.origin}/blog/${post.slug}`,
    });
  }, [post]);

  useEffect(() => {
    if (!post) return;

    const channel = supabase
      .channel(`blog-post-${post.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_comments',
          filter: `post_id=eq.${post.id}`,
        },
        () => {
          loadComments();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blog_likes',
          filter: `post_id=eq.${post.id}`,
        },
        () => {
          loadPost();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [post?.id]);

  const loadPost = async () => {
    try {
      const data = await getBlogPostBySlug(slug);
      if (!data) {
        toast.error('Post not found');
        onNavigate('blog');
        return;
      }
      setPost(data);
      setLocalLiked(data.user_has_liked || false);
      setLocalLikeCount(data.like_count || 0);
      loadComments();
    } catch (error) {
      console.error('Error loading post:', error);
      toast.error('Failed to load post');
    } finally {
      setLoading(false);
    }
  };

  const loadComments = async () => {
    if (!post) return;
    try {
      const data = await getBlogComments(post.id);
      setComments(data);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast.error('Please log in to like posts');
      return;
    }

    if (!post) return;

    const wasLiked = localLiked;
    setLocalLiked(!localLiked);
    setLocalLikeCount(localLikeCount + (wasLiked ? -1 : 1));

    try {
      await toggleBlogLike(post.id);
    } catch (error) {
      console.error('Error toggling like:', error);
      setLocalLiked(wasLiked);
      setLocalLikeCount(localLikeCount);
      toast.error('Failed to like post');
    }
  };

  const handleCommentSubmit = async () => {
    if (!user) {
      toast.error('Please log in to comment');
      return;
    }

    if (!post) return;

    if (!commentText.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setIsSubmitting(true);
    try {
      await createBlogComment(post.id, commentText);
      setCommentText('');
      toast.success('Comment posted!');
      loadComments();
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = async () => {
    if (!post) return;

    const url = `${window.location.origin}/blog/${post.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt || post.title,
          url,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Link copied to clipboard!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/4" />
            <div className="h-12 bg-gray-200 rounded w-3/4" />
            <div className="h-64 bg-gray-200 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Post not found</h2>
          <Button onClick={() => onNavigate('blog')}>Back to Blog</Button>
        </div>
      </div>
    );
  }

  const renderContent = (content: any) => {
    if (typeof content === 'string') return content;
    if (content.html) {
      return (
        <div
          className="prose prose-lg max-w-none"
          dangerouslySetInnerHTML={{
            __html: content.html
              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
              .replace(/\*(.*?)\*/g, '<em>$1</em>')
              .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" class="text-orange-600 hover:underline">$1</a>')
              .replace(/^- (.+)$/gm, '<li>$1</li>')
              .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc pl-4 my-4">$&</ul>')
              .replace(/\n\n/g, '</p><p class="mt-4">')
              .replace(/^(.+)$/, '<p>$1</p>'),
          }}
        />
      );
    }
    return JSON.stringify(content);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => onNavigate('blog')}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Blog
        </Button>

        <article>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
            {post.title}
          </h1>

          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={post.author?.avatar_url || undefined} />
                <AvatarFallback>
                  {post.author?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-900">
                  {post.author?.username || 'Anonymous'}
                </p>
                <p className="text-sm text-gray-500">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLike}
                className={localLiked ? 'text-red-500' : ''}
              >
                <Heart className={`h-5 w-5 mr-1 ${localLiked ? 'fill-red-500' : ''}`} />
                {localLikeCount}
              </Button>
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="h-5 w-5 mr-1" />
                Share
              </Button>
            </div>
          </div>

          {post.cover_image && (
            <img
              src={post.cover_image}
              alt={post.title}
              className="w-full h-96 object-cover rounded-xl mb-8"
            />
          )}

          <div className="prose prose-lg max-w-none mb-8">
            {renderContent(post.content)}
          </div>

          <div className="flex items-center gap-6 text-sm text-gray-500 mb-8">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {post.views} views
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              {comments.length} comments
            </div>
          </div>

          <Separator className="my-8" />

          <div className="mt-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              Comments ({comments.length})
            </h2>

            {user ? (
              <div className="mb-8 space-y-3">
                <Textarea
                  placeholder="Share your thoughts..."
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="min-h-[100px]"
                />
                <Button
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting || !commentText.trim()}
                >
                  {isSubmitting ? 'Posting...' : 'Post Comment'}
                </Button>
              </div>
            ) : (
              <div className="mb-8 p-4 bg-gray-50 rounded-lg text-center">
                <p className="text-gray-600">
                  Please log in to leave a comment
                </p>
              </div>
            )}

            <div className="space-y-4">
              {comments.map((comment) => (
                <BlogComment
                  key={comment.id}
                  comment={comment}
                  postId={post.id}
                  onCommentAdded={loadComments}
                  onNavigate={onNavigate}
                />
              ))}

              {comments.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No comments yet. Be the first to comment!
                </div>
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
