import { supabase } from '../lib/supabase';
import { generateSlug } from '../lib/seo';

export interface BlogPost {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: any;
  excerpt: string | null;
  cover_image: string | null;
  published: boolean;
  views: number;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  like_count?: number;
  comment_count?: number;
  user_has_liked?: boolean;
}

export interface BlogComment {
  id: string;
  post_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  author: {
    id: string;
    username: string;
    avatar_url: string | null;
  };
  vote_score?: number;
  user_vote?: 'up' | 'down' | null;
  replies?: BlogComment[];
}

export async function getAllBlogPosts(page = 1, limit = 20): Promise<BlogPost[]> {
  const offset = (page - 1) * limit;

  const { data: posts, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      profiles!blog_posts_user_id_profiles_fkey(id, username, avatar_url)
    `)
    .eq('published', true)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;

  const postsWithCounts = await Promise.all(
    (posts || []).map(async (post) => {
      const [likeCountData, commentCountData, userLikeData] = await Promise.all([
        supabase
          .from('blog_likes')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id),
        supabase
          .from('blog_comments')
          .select('*', { count: 'exact', head: true })
          .eq('post_id', post.id),
        (async () => {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return null;
          return supabase
            .from('blog_likes')
            .select('*')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();
        })(),
      ]);

      return {
        ...post,
        author: post.profiles,
        like_count: likeCountData.count || 0,
        comment_count: commentCountData.count || 0,
        user_has_liked: !!userLikeData?.data,
      };
    })
  );

  return postsWithCounts;
}

export async function getBlogPostBySlug(slug: string): Promise<BlogPost | null> {
  const { data: post, error } = await supabase
    .from('blog_posts')
    .select(`
      *,
      profiles!blog_posts_user_id_profiles_fkey(id, username, avatar_url)
    `)
    .eq('slug', slug)
    .eq('published', true)
    .single();

  if (error || !post) return null;

  await supabase.rpc('increment_blog_post_views', { post_id: post.id });

  const [likeCountData, commentCountData, userLikeData] = await Promise.all([
    supabase
      .from('blog_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id),
    supabase
      .from('blog_comments')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', post.id),
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      return supabase
        .from('blog_likes')
        .select('*')
        .eq('post_id', post.id)
        .eq('user_id', user.id)
        .single();
    })(),
  ]);

  return {
    ...post,
    author: post.profiles,
    like_count: likeCountData.count || 0,
    comment_count: commentCountData.count || 0,
    user_has_liked: !!userLikeData?.data,
  };
}

export async function createBlogPost(data: {
  title: string;
  content: any;
  excerpt?: string;
  cover_image?: string;
}): Promise<BlogPost> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  let slug = generateSlug(data.title);

  const { data: existing } = await supabase
    .from('blog_posts')
    .select('slug')
    .eq('slug', slug)
    .single();

  if (existing) {
    slug = `${slug}-${Date.now()}`;
  }

  const { data: post, error } = await supabase
    .from('blog_posts')
    .insert({
      user_id: user.id,
      title: data.title,
      slug,
      content: data.content,
      excerpt: data.excerpt,
      cover_image: data.cover_image,
    })
    .select(`
      *,
      profiles!blog_posts_user_id_profiles_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    ...post,
    author: post.profiles,
    like_count: 0,
    comment_count: 0,
    user_has_liked: false,
  };
}

export async function toggleBlogLike(postId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('blog_likes')
    .select('*')
    .eq('post_id', postId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    await supabase
      .from('blog_likes')
      .delete()
      .eq('post_id', postId)
      .eq('user_id', user.id);
    return false;
  } else {
    await supabase
      .from('blog_likes')
      .insert({ post_id: postId, user_id: user.id });
    return true;
  }
}

export async function getBlogComments(postId: string): Promise<BlogComment[]> {
  const { data: comments, error } = await supabase
    .from('blog_comments')
    .select(`
      *,
      profiles!blog_comments_user_id_profiles_fkey(id, username, avatar_url)
    `)
    .eq('post_id', postId)
    .order('created_at', { ascending: true });

  if (error) throw error;

  const { data: { user } } = await supabase.auth.getUser();

  const commentsWithVotes = await Promise.all(
    (comments || []).map(async (comment) => {
      const [upvotes, downvotes, userVote] = await Promise.all([
        supabase
          .from('blog_comment_votes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id)
          .eq('vote_type', 'up'),
        supabase
          .from('blog_comment_votes')
          .select('*', { count: 'exact', head: true })
          .eq('comment_id', comment.id)
          .eq('vote_type', 'down'),
        user
          ? supabase
              .from('blog_comment_votes')
              .select('vote_type')
              .eq('comment_id', comment.id)
              .eq('user_id', user.id)
              .single()
          : Promise.resolve({ data: null }),
      ]);

      return {
        ...comment,
        author: comment.profiles,
        vote_score: (upvotes.count || 0) - (downvotes.count || 0),
        user_vote: userVote.data?.vote_type || null,
      };
    })
  );

  const commentMap = new Map<string, BlogComment>();
  const rootComments: BlogComment[] = [];

  commentsWithVotes.forEach((comment) => {
    commentMap.set(comment.id, { ...comment, replies: [] });
  });

  commentsWithVotes.forEach((comment) => {
    const commentNode = commentMap.get(comment.id)!;
    if (comment.parent_id) {
      const parent = commentMap.get(comment.parent_id);
      if (parent) {
        parent.replies = parent.replies || [];
        parent.replies.push(commentNode);
      }
    } else {
      rootComments.push(commentNode);
    }
  });

  return rootComments;
}

export async function createBlogComment(
  postId: string,
  content: string,
  parentId?: string
): Promise<BlogComment> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: comment, error } = await supabase
    .from('blog_comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      parent_id: parentId || null,
      content,
    })
    .select(`
      *,
      profiles!blog_comments_user_id_profiles_fkey(id, username, avatar_url)
    `)
    .single();

  if (error) throw error;

  return {
    ...comment,
    author: comment.profiles,
    vote_score: 0,
    user_vote: null,
    replies: [],
  };
}

export async function voteOnComment(
  commentId: string,
  voteType: 'up' | 'down'
): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: existing } = await supabase
    .from('blog_comment_votes')
    .select('*')
    .eq('comment_id', commentId)
    .eq('user_id', user.id)
    .single();

  if (existing) {
    if (existing.vote_type === voteType) {
      await supabase
        .from('blog_comment_votes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('blog_comment_votes')
        .update({ vote_type: voteType })
        .eq('comment_id', commentId)
        .eq('user_id', user.id);
    }
  } else {
    await supabase
      .from('blog_comment_votes')
      .insert({ comment_id: commentId, user_id: user.id, vote_type: voteType });
  }
}

export async function deleteBlogPost(postId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const { data: post } = await supabase
    .from('blog_posts')
    .select('user_id')
    .eq('id', postId)
    .single();

  if (!post) throw new Error('Post not found');

  const isOwner = post.user_id === user.id;
  const isAdmin = profile?.is_admin === true;

  if (!isOwner && !isAdmin) {
    throw new Error('Not authorized to delete this post');
  }

  const { error } = await supabase
    .from('blog_posts')
    .delete()
    .eq('id', postId);

  if (error) throw error;
}

export async function deleteBlogComment(commentId: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  const { data: comment } = await supabase
    .from('blog_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (!comment) throw new Error('Comment not found');

  const isOwner = comment.user_id === user.id;
  const isAdmin = profile?.is_admin === true;

  if (!isOwner && !isAdmin) {
    throw new Error('Not authorized to delete this comment');
  }

  const { error } = await supabase
    .from('blog_comments')
    .delete()
    .eq('id', commentId);

  if (error) throw error;
}
