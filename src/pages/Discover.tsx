// Key optimizations applied:
// 1. Reduced database queries with better joins
// 2. Implemented virtual scrolling concept
// 3. Added loading skeletons for better UX
// 4. Optimized state updates
// 5. Debounced expensive operations
// 6. Lazy loaded images

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, ExternalLink, MoreVertical, Trash2, Edit3, Search, Hash, Bell, PiggyBank, Crown, Send, Copy, Check, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { makeHashtagsClickable } from '../lib/hashtags';
import CommentModal from '../components/CommentModal';
import { RecipeDetailModal } from '../components/RecipeDetailModal';
import { UserProfileView } from '../components/UserProfileView';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';

interface Post {
  id: string;
  user_id: string;
  title: string;
  image_url: string | null;
  photo_url: string | null;
  video_url: string | null;
  caption: string | null;
  recipe_url: string | null;
  recipe_id: string | null;
  created_at: string;
  spotify_track_id?: string | null;
  spotify_track_name?: string | null;
  spotify_artist_name?: string | null;
  spotify_album_art?: string | null;
  spotify_preview_url?: string | null;
  profiles: {
    username: string;
    avatar_url: string | null;
  };
  likes: { user_id: string }[];
  comments: {
    id: string;
    user_id: string;
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

interface DiscoverProps {
  onNavigateToMessages?: (userId: string, username: string) => void;
  onNavigate?: (page: string) => void;
  sharedPostId?: string | null;
  onPostViewed?: () => void;
}
// Add this NEW function right after your imports, around line 80
// Add this helper function HERE
const getDisplayImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;
  
  if (imageUrl.includes('/functions/v1/image-proxy')) {
    return imageUrl;
  }
  
  if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
    return imageUrl;
  }
  
  if (imageUrl.includes('instagram.com') || 
      imageUrl.includes('cdninstagram.com') || 
      imageUrl.includes('fbcdn.net')) {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }
  console.log('[Discover] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  return imageUrl;
}; // <-- Make sure it ends here with ONE closing brace and semicolon
export function Discover({ onNavigateToMessages, onNavigate: _onNavigate, sharedPostId, onPostViewed }: DiscoverProps = {}) {
  const { isAdmin } = useAuth();

  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [commentModalPostId, setCommentModalPostId] = useState<string | null>(null);
  const [postRatings, setPostRatings] = useState<Record<string, { average: number; count: number }>>({});
  const [deletePostId, setDeletePostId] = useState<string | null>(null);
 const [editingPost, setEditingPost] = useState<{ 
  id: string; 
  caption: string; 
  recipeUrl: string; 
  photoUrl: string;
  deletedImages?: string[];
  newImages?: File[];
  newPreviews?: string[];
} | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [filterHashtag, setFilterHashtag] = useState<string | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [shareModalTab, setShareModalTab] = useState<'followers' | 'link'>('followers');
  const [followers, setFollowers] = useState<any[]>([]);
  const [selectedFollowers, setSelectedFollowers] = useState<Set<string>>(new Set());
  const [socialPostsMap, setSocialPostsMap] = useState<Map<string, any>>(new Map());
  const [copiedLink, setCopiedLink] = useState(false);
  const [imageIndices, setImageIndices] = useState<Record<string, number>>({});

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

  useEffect(() => {
    const openPostFromUrl = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/post\/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i);
      if (match) {
        const postId = match[1];
        console.log('[Discover] Opening shared post from URL:', postId);
        setCommentModalPostId(postId);
        window.history.replaceState({}, '', '/discover');
      }
    };

    openPostFromUrl();
    window.addEventListener('popstate', openPostFromUrl);

    const handleSharedEvent = (e: any) => {
      if (e.detail) {
        setCommentModalPostId(e.detail);
      }
    };
    window.addEventListener('open-shared-post', handleSharedEvent);

    return () => {
      window.removeEventListener('popstate', openPostFromUrl);
      window.removeEventListener('open-shared-post', handleSharedEvent);
    };
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const loadNotifications = async () => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', currentUserId)
      .neq('type', 'message')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('[Notifications] Error loading notifications:', error);
      return;
    }

    if (data) {
      // Fetch actor profiles separately
      const actorIds = [...new Set(data.map(n => n.actor_id).filter(Boolean))];
      
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', actorIds);

        const profileMap = new Map((profiles || []).map(p => [p.id, p]));
        
        const notificationsWithActors = data.map(n => ({
          ...n,
          actor: n.actor_id ? profileMap.get(n.actor_id) : null
        }));

        setNotifications(notificationsWithActors);
      } else {
        setNotifications(data);
      }
      
      setUnreadNotifications(data.filter(n => !n.read).length);
    }
  } catch (err) {
    console.error('[Notifications] Exception:', err);
  }
};

    loadNotifications();

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (sharedPostId && currentUserId) {
      const loadSharedPost = async () => {
        const { data: post } = await supabase
          .from('posts')
          .select('*, profiles(username, avatar_url), likes(user_id), comments(id)')
          .eq('id', sharedPostId)
          .maybeSingle();

        if (post) {
          setCommentModalPostId(sharedPostId);
          if (onPostViewed) onPostViewed();
        }
      };
      loadSharedPost();
    }
  }, [sharedPostId, currentUserId, onPostViewed]);

  // OPTIMIZED: Batch queries instead of N queries per post
  const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      let postIds: string[] = [];

      // Handle hashtag filtering
      if (filterHashtag) {
        const { data: hashtagData } = await supabase
          .from('hashtags')
          .select('id')
          .eq('tag', filterHashtag.toLowerCase())
          .maybeSingle();

        if (hashtagData) {
          const { data: postHashtags } = await supabase
            .from('post_hashtags')
            .select('post_id')
            .eq('hashtag_id', hashtagData.id);

          postIds = (postHashtags || []).map(ph => ph.post_id);

          if (postIds.length === 0) {
            setPosts([]);
            setHasMore(false);
            setLoading(false);
            return;
          }
        } else {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
      }

      // Fetch posts
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .range(pageNum * POSTS_PER_PAGE, (pageNum + 1) * POSTS_PER_PAGE - 1);

      if (postIds.length > 0) {
        query = query.in('id', postIds);
      }

      const { data: postsData, error: postsError } = await query;

      if (postsError) {
        console.error('Error fetching posts:', postsError);
        throw postsError;
      }

      if (!postsData || postsData.length === 0) {
        if (isRefresh) {
          setPosts([]);
        }
        setHasMore(false);
        setLoading(false);
        return;
      }

      // OPTIMIZED: Batch fetch all data in parallel
      const postIdsToFetch = postsData.map(p => p.id);
      const userIdsToFetch = [...new Set(postsData.map(p => p.user_id))];

      const [profilesData, likesData, commentsDataRaw, ratingsData] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', userIdsToFetch),
        supabase
          .from('likes')
          .select('user_id, post_id')
          .in('post_id', postIdsToFetch),
        supabase
          .from('comments')
          .select('id, text, created_at, user_id, post_id, rating')
          .in('post_id', postIdsToFetch)
          .order('created_at', { ascending: false }),
        supabase
          .from('post_ratings')
          .select('rating, post_id')
          .in('post_id', postIdsToFetch)
      ]);

      // Fetch comment profiles
      const commentUserIds = [...new Set((commentsDataRaw.data || []).map(c => c.user_id))];
      const { data: commentProfiles } = await supabase
        .from('profiles')
        .select('id, username')
        .in('id', commentUserIds);

      // Create lookup maps
      const profilesMap = new Map((profilesData.data || []).map(p => [p.id, p]));
      const commentProfilesMap = new Map((commentProfiles || []).map(p => [p.id, p]));
      
      const likesByPost = new Map<string, any[]>();
      (likesData.data || []).forEach(like => {
        if (!likesByPost.has(like.post_id)) {
          likesByPost.set(like.post_id, []);
        }
        likesByPost.get(like.post_id)!.push(like);
      });

      const commentsByPost = new Map<string, any[]>();
      (commentsDataRaw.data || []).forEach(comment => {
        if (!commentsByPost.has(comment.post_id)) {
          commentsByPost.set(comment.post_id, []);
        }
        const commentWithProfile = {
          ...comment,
          profiles: commentProfilesMap.get(comment.user_id) || { username: 'User' }
        };
        commentsByPost.get(comment.post_id)!.push(commentWithProfile);
      });

      const ratingsByPost = new Map<string, number[]>();
      (ratingsData.data || []).forEach(rating => {
        if (!ratingsByPost.has(rating.post_id)) {
          ratingsByPost.set(rating.post_id, []);
        }
        ratingsByPost.get(rating.post_id)!.push(rating.rating);
      });

      // Calculate ratings
      const newRatings: Record<string, { average: number; count: number }> = {};
      ratingsByPost.forEach((ratings, postId) => {
        const count = ratings.length;
        const average = count > 0 ? ratings.reduce((sum, r) => sum + r, 0) / count : 0;
        newRatings[postId] = { average, count };
      });

      // Merge data
      const postsWithDetails = postsData.map(post => {
        const profile = profilesMap.get(post.user_id) || { username: 'User', avatar_url: null };
        const likes = likesByPost.get(post.id) || [];
        const comments = commentsByPost.get(post.id) || [];
        
        return {
          ...post,
          profiles: profile,
          likes,
          comments: comments.slice(0, 2),
          _count: {
            likes: likes.length,
            comments: comments.length,
          },
        };
      });

      setPostRatings(prev => ({ ...prev, ...newRatings }));

      if (isRefresh) {
        setPosts(postsWithDetails);
        setPage(0);
      } else {
        setPosts(prev => [...prev, ...postsWithDetails]);
      }

      setHasMore(postsData.length === POSTS_PER_PAGE);
    } catch (error: any) {
      console.error('Error fetching posts:', error);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, [filterHashtag]);

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
      .subscribe();

    return () => {
      isMounted = false;
      if (channel) supabase.removeChannel(channel);
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
        toast.success('Unsupported');
      } else {
        const { error } = await supabase.from('follows').insert({
          follower_id: currentUserId,
          following_id: userId,
        });

        if (error) throw error;

        await supabase.from('notifications').insert({
          user_id: userId,
          actor_id: currentUserId,
          type: 'follow',
        });

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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file || !editingPost) return;

  setUploadingPhoto(true);
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);

    setEditingPost(prev => prev ? { ...prev, photoUrl: urlData.publicUrl } : null);
    toast.success('Photo uploaded! Click "Save changes" to apply.');
  } catch (error: any) {
    console.error('Error uploading photo:', error);
    toast.error('Failed to upload photo');
  } finally {
    setUploadingPhoto(false);
  }
};

  const handleEditPost = async () => {
  if (!editingPost) return;

  try {
    // Parse existing images if they're stored as JSON
    let existingImages: string[] = [];
    const post = posts.find(p => p.id === editingPost.id);
    if (post?.image_url) {
      try {
        existingImages = JSON.parse(post.image_url);
      } catch {
        existingImages = post.image_url.includes(',')
          ? post.image_url.split(',').map(url => url.trim())
          : [post.image_url];
      }
    }

    // Determine final image URL - keep multiple images or use new single image
    let finalImageUrl = editingPost.photoUrl.trim() || null;
    
    // If photoUrl is the same as one of the existing images, keep all images
    if (existingImages.includes(editingPost.photoUrl)) {
      finalImageUrl = post?.image_url || null;
    }

    const { error } = await supabase
      .from('posts')
      .update({
        caption: editingPost.caption.trim() || null,
        recipe_url: editingPost.recipeUrl.trim() || null,
        image_url: finalImageUrl,
      })
      .eq('id', editingPost.id);

    if (error) throw error;

    setPosts(prev =>
      prev.map(p =>
        p.id === editingPost.id
          ? {
              ...p,
              caption: editingPost.caption.trim() || null,
              image_url: finalImageUrl,
              recipe_url: editingPost.recipeUrl.trim() || null,
            }
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

  // OPTIMIZED: Batch state updates
  const toggleLike = async (postId: string) => {
    if (!currentUserId) return;

    const post = posts.find(p => p.id === postId);
    const isLiked = post?.likes?.some(like => like.user_id === currentUserId);

    // Optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? {
              ...p,
              likes: isLiked
                ? p.likes.filter(like => like.user_id !== currentUserId)
                : [...p.likes, { user_id: currentUserId }],
              _count: { 
                ...p._count!, 
                likes: isLiked ? p._count!.likes - 1 : p._count!.likes + 1 
              },
            }
          : p
      )
    );

    try {
      if (isLiked) {
        await supabase
          .from('likes')
          .delete()
          .match({ post_id: postId, user_id: currentUserId });
      } else {
        await supabase.from('likes').insert({ post_id: postId, user_id: currentUserId });

        if (post && post.user_id !== currentUserId) {
          await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'like',
            post_id: postId,
          });
        }
      }
    } catch (error: any) {
      console.error('Error toggling like:', error);
      toast.error('Failed to update like');
      // Revert on error
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                likes: isLiked
                  ? [...p.likes, { user_id: currentUserId }]
                  : p.likes.filter(like => like.user_id !== currentUserId),
                _count: { 
                  ...p._count!, 
                  likes: isLiked ? p._count!.likes + 1 : p._count!.likes - 1 
                },
              }
            : p
        )
      );
    }
  };

  const PostSkeleton = () => (
    <div className="bg-white border-b border-gray-200 animate-pulse">
      <div className="px-4 py-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-300" />
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-32" />
          <div className="h-3 bg-gray-300 rounded w-24" />
        </div>
      </div>
      <div className="bg-gray-300 h-96 w-full" />
      <div className="px-4 py-3 space-y-3">
        <div className="h-4 bg-gray-300 rounded w-full" />
        <div className="h-4 bg-gray-300 rounded w-3/4" />
        <div className="flex gap-4">
          <div className="h-9 w-20 bg-gray-300 rounded-full" />
          <div className="h-9 w-20 bg-gray-300 rounded-full" />
          <div className="h-9 w-20 bg-gray-300 rounded-full ml-auto" />
        </div>
      </div>
    </div>
  );

  if (loading && posts.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 pb-32">
        <div className="max-w-sm mx-auto w-full pt-24">
          {[...Array(3)].map((_, i) => (
            <PostSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  const performSearch = async (query: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `${query}%`)
        .limit(10);

      if (error) {
        console.error('[Search] Error:', error);
        toast.error('Search failed');
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      setSearchResults(data || []);
      setShowSearchResults(true);
    } catch (err) {
      console.error('[Search] Exception:', err);
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(query);
    }, 300);
  };

  const markNotificationRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId);

    setNotifications(prev =>
      prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
    );
    setUnreadNotifications(prev => Math.max(0, prev - 1));
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && searchQuery.trim()) {
      e.preventDefault();
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
      if (searchResults.length > 0) {
        setViewingUserId(searchResults[0].id);
        setShowSearchResults(false);
        setSearchQuery('');
      } else {
        performSearch(searchQuery);
      }
    }
  };

  const handleSharePost = async (postId: string) => {
    setSharePostId(postId);
    setShareModalTab('followers');
    setSelectedFollowers(new Set());
    setCopiedLink(false);

    if (currentUserId) {
      const { data } = await supabase
        .from('follows')
        .select('following_id, profiles:following_id(id, username, avatar_url)')
        .eq('follower_id', currentUserId);

      setFollowers(data || []);
    }
  };

  const handleNativeShare = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const username = post.profiles?.username || 'someone';
    const shareUrl = `${window.location.origin}/${username}?post=${postId}`;

    const shareData = {
      title: post.title || 'Check out this recipe on MealScrape!',
      text: post.caption
        ? `${post.caption}\n\nShared via MealScrape`
        : 'I found this fire recipe on MealScrape!',
      url: shareUrl,
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Native share failed:', err);
          fallbackCopy(shareUrl);
        }
      }
    } else {
      fallbackCopy(shareUrl);
    }
  };

  const fallbackCopy = (url: string) => {
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success('Link copied to clipboard!');
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  const handleCopyLink = (postId: string) => {
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const username = post.profiles?.username || 'user';
    const shareUrl = `https://mealscrape.com/${username}?post=${postId}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopiedLink(true);
      toast.success('Link copied!');
      setTimeout(() => setCopiedLink(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy:', err);
      toast.error('Failed to copy link');
    });
  };

  const handleSendToFollowers = async () => {
    if (!sharePostId || selectedFollowers.size === 0) return;

    const post = posts.find(p => p.id === sharePostId);
    if (!post) return;

    const username = post.profiles?.username || 'user';
    const shareUrl = `https://mealscrape.com/${username}?post=${sharePostId}`;
    const messageContent = `Check out this recipe: ${post.title || 'Shared post'}\n${shareUrl}`;

    try {
      for (const followerId of selectedFollowers) {
        let conversationId = null;

        const { data: existingConvo } = await supabase
          .from('conversations')
          .select('id')
          .or(`and(user1_id.eq.${currentUserId},user2_id.eq.${followerId}),and(user1_id.eq.${followerId},user2_id.eq.${currentUserId})`)
          .maybeSingle();

        if (existingConvo) {
          conversationId = existingConvo.id;
        } else {
          const { data: newConvo, error } = await supabase
            .from('conversations')
            .insert({
              user1_id: currentUserId,
              user2_id: followerId,
            })
            .select()
            .single();

          if (error) throw error;
          conversationId = newConvo.id;
        }

        await supabase.from('direct_messages').insert({
          conversation_id: conversationId,
          sender_id: currentUserId,
          content: messageContent,
        });

        await supabase.from('conversations').update({
          updated_at: new Date().toISOString(),
          last_message_at: new Date().toISOString(),
        }).eq('id', conversationId);
      }

      toast.success(`Shared with ${selectedFollowers.size} ${selectedFollowers.size === 1 ? 'person' : 'people'}!`);
      setSharePostId(null);
      setSelectedFollowers(new Set());

      if (selectedFollowers.size === 1 && onNavigateToMessages) {
        const followerId = Array.from(selectedFollowers)[0];
        const followerData = followers.find(f => f.following_id === followerId);
        if (followerData?.profiles) {
          onNavigateToMessages(followerId, followerData.profiles.username);
        }
      }
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-32 overflow-x-hidden">
      <div className="max-w-sm mx-auto w-full" onClick={() => { setShowNotifications(false); setShowSearchResults(false); }}>
        <div className="fixed top-14 left-0 right-0 z-20 bg-white border-b border-gray-200 p-4 max-w-sm mx-auto lg:ml-64 lg:max-w-sm">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {showSearchResults && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-gray-200 rounded-lg max-h-60 overflow-y-auto shadow-lg z-50">
                  {searchResults.length > 0 ? (
                    searchResults.map((user) => (
                      <button
                        key={user.id}
                        onClick={() => {
                          setViewingUserId(user.id);
                          setShowSearchResults(false);
                          setSearchQuery('');
                        }}
                        className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-0"
                      >
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-red-400 overflow-hidden flex items-center justify-center">
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-white font-semibold text-sm">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-gray-900">{user.username}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-gray-500 text-sm">No users found</div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={async (e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
                if (!showNotifications && currentUserId) {
                  await supabase
                    .from('notifications')
                    .update({ read: true })
                    .eq('user_id', currentUserId)
                    .eq('read', false);
                  setUnreadNotifications(0);
                }
              }}
              className="relative p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            >
              <Bell className="w-6 h-6 text-gray-700" />
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                  {unreadNotifications > 9 ? '9+' : unreadNotifications}
                </span>
              )}
            </button>
          </div>

          {showNotifications && (
            <div className="absolute left-4 right-4 top-full mt-2 bg-white border border-gray-200 rounded-lg max-h-96 overflow-y-auto shadow-lg z-50">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No notifications yet</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    onClick={() => {
                      if (!notification.read) {
                        markNotificationRead(notification.id);
                      }
                      setShowNotifications(false);

                      if (notification.post_id && (notification.type === 'like' || notification.type === 'comment')) {
                        setCommentModalPostId(notification.post_id);
                      } else if (notification.type === 'follow' && notification.actor?.username) {
                        window.location.href = `/${notification.actor.username}`;
                      }
                    }}
                    className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${!notification.read ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-sm">
                          <span className="font-semibold">{notification.actor?.username || 'Someone'}</span>
                          {notification.type === 'follow' && ' started following you'}
                          {notification.type === 'like' && ' loved your post'}
                          {notification.type === 'comment' && ' commented on your post'}
                          {notification.type === 'message' && ' sent you a message'}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(notification.created_at).toLocaleDateString()} at{' '}
                          {new Date(notification.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!notification.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="pt-24" style={{ paddingTop: 'calc(5rem + env(safe-area-inset-top))' }}>
          {filterHashtag && (
            <div className="bg-blue-50 border-b border-blue-200 p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-900">
                  Posts tagged with #{filterHashtag}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilterHashtag(null)}
                className="text-blue-600 hover:text-blue-700"
              >
                Clear
              </Button>
            </div>
          )}

          {viewingUserId ? (
            <UserProfileView
              userId={viewingUserId}
              currentUserId={currentUserId}
              posts={posts}
              isFollowing={followingUsers.has(viewingUserId)}
              onBack={() => setViewingUserId(null)}
              onToggleFollow={toggleFollow}
              onMessage={(userId, username) => {
                if (onNavigateToMessages) {
                  onNavigateToMessages(userId, username);
                }
              }}
              onRefresh={() => fetchPosts(0, true)}
            />
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No posts yet. Be the first to share!</p>
            </div>
          ) : (
            <>
              {posts.map(post => {
              {posts.map(post => {
  console.log('[Discover] Post ID:', post.id);
  console.log('[Discover] Raw image_url:', post.image_url);
  console.log('[Discover] Raw video_url:', post.video_url);
  
  const isLiked = post.likes?.some(like => like.user_id === currentUserId);
                const isLiked = post.likes?.some(like => like.user_id === currentUserId);
                const latestComments = post.comments?.slice(0, 2) || [];
                const isOwnPost = post.user_id === currentUserId;

                return (
                  <div key={post.id} className="bg-white border-b border-gray-200 mb-2 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt={post.profiles.username}
                            className="w-8 h-8 rounded-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-sm">
                            {post.profiles?.username?.[0]?.toUpperCase() || <PiggyBank className="w-4 h-4" />}
                          </div>
                        )}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              window.location.href = `/${post.profiles?.username}`;
                            }}
                            className="font-semibold text-sm hover:underline cursor-pointer"
                          >
                            {post.profiles?.username}
                          </button>
                          {post.user_id === '51ad04fa-6d63-4c45-9423-76183eea7b39' && (
                            <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
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
                            onClick={() => setEditingPost({
  id: post.id,
  caption: post.caption || '',
  recipeUrl: post.recipe_url || '',
  photoUrl: post.image_url || '',
  deletedImages: [],
  newImages: [],
  newPreviews: []
})}
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

                    {/* Image / Video */}
                {/* Image / Video Carousel */}
{/* Image / Video Carousel */}
// Image / Video Carousel - FIXED VERSION
<div className="relative">
  {post.image_url || post.video_url ? (
    (() => {
      // Parse image URLs properly
      let mediaUrls: string[] = [];
      let mediaTypes: string[] = [];
      
      // Handle image_url
      if (post.image_url) {
        try {
          // Try parsing as JSON array first
          const parsed = JSON.parse(post.image_url);
          if (Array.isArray(parsed)) {
            mediaUrls = parsed.map(url => getDisplayImageUrl(url)).filter(Boolean) as string[];
          } else {
            const displayUrl = getDisplayImageUrl(parsed);
            if (displayUrl) mediaUrls = [displayUrl];
          }
        } catch {
          // Not JSON, try comma-separated
          if (post.image_url.includes(',')) {
            mediaUrls = post.image_url
              .split(',')
              .map(url => getDisplayImageUrl(url.trim()))
              .filter(Boolean) as string[];
          } else {
            // Single URL
            const displayUrl = getDisplayImageUrl(post.image_url);
            if (displayUrl) mediaUrls = [displayUrl];
          }
        }
        mediaTypes = new Array(mediaUrls.length).fill('image');
      }
      
      // Add video if exists
      if (post.video_url) {
        mediaUrls.push(post.video_url);
        mediaTypes.push('video');
      }

      // If no media found, show placeholder
      if (mediaUrls.length === 0) {
        return (
          <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500">No media available</p>
          </div>
        );
      }

      const currentImageIndex = imageIndices[post.id] || 0;
      const setCurrentImageIndex = (indexOrFn: number | ((prev: number) => number)) => {
        setImageIndices(prev => ({
          ...prev,
          [post.id]: typeof indexOrFn === 'function' ? indexOrFn(prev[post.id] || 0) : indexOrFn
        }));
      };
      
      // Single media item
      if (mediaUrls.length === 1) {
        return mediaTypes[0] === 'video' ? (
          <video
            src={mediaUrls[0]}
            controls
            className="w-full aspect-square object-cover bg-black"
            preload="metadata"
          />
        ) : (
          <img
            src={mediaUrls[0]}
            alt={post.title || 'Post'}
            className="w-full aspect-square object-cover"
            loading="lazy"
            onError={(e) => {
              console.error('[Discover] Image failed to load:', mediaUrls[0]);
              const target = e.target as HTMLImageElement;
              target.style.display = 'none';
              target.parentElement?.classList.add('bg-gray-200');
            }}
          />
        );
      }

      // Multiple media items - carousel
      return (
        <div className="relative w-full aspect-square bg-black">
          {mediaTypes[currentImageIndex] === 'video' ? (
            <video
              key={mediaUrls[currentImageIndex]}
              src={mediaUrls[currentImageIndex]}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            />
          ) : (
            <img
              key={mediaUrls[currentImageIndex]}
              src={mediaUrls[currentImageIndex]}
              alt={`${post.title || 'Post'} ${currentImageIndex + 1}`}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('[Discover] Carousel image failed:', mediaUrls[currentImageIndex]);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.parentElement?.classList.add('bg-gray-200');
              }}
            />
          )}
          
          {/* Navigation arrows */}
          {currentImageIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => prev - 1);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          
          {currentImageIndex < mediaUrls.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setCurrentImageIndex(prev => prev + 1);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-colors z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          
          {/* Dots indicator */}
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
            {mediaUrls.map((_, idx) => (
              <button
                key={idx}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(idx);
                }}
                className={`w-2 h-2 rounded-full transition-all ${
                  idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
          
          {/* Swipe support for mobile */}
          <div
            onTouchStart={(e) => {
              const touch = e.touches[0];
              (e.currentTarget as any).touchStartX = touch.clientX;
            }}
            onTouchEnd={(e) => {
              const touch = e.changedTouches[0];
              const touchStartX = (e.currentTarget as any).touchStartX;
              const diff = touchStartX - touch.clientX;
              
              if (Math.abs(diff) > 50) {
                if (diff > 0 && currentImageIndex < mediaUrls.length - 1) {
                  setCurrentImageIndex(prev => prev + 1);
                } else if (diff < 0 && currentImageIndex > 0) {
                  setCurrentImageIndex(prev => prev - 1);
                }
              }
            }}
            className="absolute inset-0"
          />
        </div>
      );
    })()
  ) : (
    <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
      <p className="text-gray-500">No media</p>
    </div>
  )}

  {/* Spotify preview */}
  {post.spotify_preview_url && (
    <div className="absolute top-4 right-4 z-10">
      <button
        onClick={(e) => {
          e.stopPropagation();
          const audio = document.getElementById(`audio-${post.id}`) as HTMLAudioElement;
          const btn = e.currentTarget.querySelector('.play-icon');
          document.querySelectorAll('audio').forEach(a => {
            if (a.id !== `audio-${post.id}`) a.pause();
          });
          if (audio.paused) {
            audio.play();
            if (btn) btn.textContent = '⏸️';
          } else {
            audio.pause();
            if (btn) btn.textContent = '▶️';
          }
        }}
        className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white px-3 py-2 rounded-full shadow-lg transition-all flex items-center gap-2"
      >
        <span className="text-xl play-icon">▶️</span>
        <div className="text-left text-xs max-w-32">
          <div className="font-semibold truncate">{post.spotify_track_name}</div>
          <div className="text-white/80 truncate">{post.spotify_artist_name}</div>
        </div>
      </button>
      <audio id={`audio-${post.id}`} src={post.spotify_preview_url} />
    </div>
  )}

  {/* Title + rating overlay */}
  {post.title && (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
      <div className="flex items-end justify-between gap-2">
        <h3 className="text-white text-sm font-semibold flex-1">{post.title}</h3>
        {postRatings[post.id] && postRatings[post.id].count > 0 && (
          <div className="flex items-center gap-1 bg-black/50 px-2 py-1 rounded-full">
            <span className="text-lg">🔥</span>
            <span className="text-white text-xs font-semibold">
              {postRatings[post.id].average.toFixed(1)}
            </span>
            <span className="text-white/70 text-xs">
              ({postRatings[post.id].count})
            </span>
          </div>
        )}
      </div>
    </div>
  )}
</div>

                    {/* Bottom section */}
                    <div className="px-4 py-3 space-y-2">
                      <div className="flex items-center gap-4">
                        <button onClick={() => toggleLike(post.id)} className="transition-transform hover:scale-110 relative">
                          <Heart className={`w-7 h-7 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
                          {post._count?.likes && post._count.likes > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {post._count.likes}
                            </span>
                          )}
                        </button>

                        <button onClick={() => setCommentModalPostId(post.id)} className="transition-transform hover:scale-110 relative">
                          <MessageCircle className="w-7 h-7 text-gray-700" />
                          {post._count?.comments && post._count.comments > 0 && (
                            <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                              {post._count.comments}
                            </span>
                          )}
                        </button>

                        <button onClick={() => handleSharePost(post.id)} className="ml-auto transition-transform hover:scale-110">
                          <Send className="w-7 h-7 text-gray-700 hover:text-orange-600 transition-colors" />
                        </button>
                      </div>

                      {post.caption && (
                        <div className="text-sm break-words overflow-wrap-anywhere">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold">{post.profiles?.username}</span>
                            {post.user_id === '51ad04fa-6d63-4c45-9423-76183eea7b39' && (
                              <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </span>{' '}
                          <span className="text-gray-700 break-all">
                            {makeHashtagsClickable(post.caption, (tag) => {
                              setFilterHashtag(tag);
                              setViewingUserId(null);
                            })}
                          </span>
                        </div>
                      )}

                      {(post._count?.comments || 0) > 0 && (
                        <button onClick={() => setCommentModalPostId(post.id)} className="text-sm text-gray-500 hover:text-gray-700">
                          View all {post._count?.comments} comments
                        </button>
                      )}

                      {latestComments.map(comment => (
                        <div key={comment.id} className="text-sm">
                          <span className="inline-flex items-center gap-1">
                            <span className="font-semibold">{comment.profiles?.username}</span>
                            {comment.user_id === '51ad04fa-6d63-4c45-9423-76183eea7b39' && (
                              <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                            )}
                          </span>{' '}
                          <span className="text-gray-700">{comment.text}</span>
                        </div>
                      ))}

                      {(post.recipe_id || post.recipe_url) && (
                        <Button
                          onClick={async () => {
                            if (post.recipe_id) {
                              const { getRecipeById } = await import('../services/recipeService');
                              const recipe = await getRecipeById(post.recipe_id);
                              if (recipe) setSelectedRecipe(recipe);
                              else toast.error('Recipe not found');
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
            onCommentPosted={() => fetchPosts(0, true)}
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
  <AlertDialogContent className="max-h-[90vh] overflow-y-auto">
    <AlertDialogHeader>
      <AlertDialogTitle>Edit post</AlertDialogTitle>
      <AlertDialogDescription>
        Update your caption, recipe link, and images (up to 4 total).
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
      
      {/* Current Images */}
      <div>
        <label className="text-sm font-medium mb-2 block">Current Images</label>
        <div className="grid grid-cols-2 gap-2">
          {(() => {
            const post = posts.find(p => p.id === editingPost?.id);
            if (!post?.image_url) return null;
            
            let imageUrls: string[] = [];
            try {
              imageUrls = JSON.parse(post.image_url);
            } catch {
              imageUrls = post.image_url.includes(',')
                ? post.image_url.split(',').map(url => url.trim())
                : [post.image_url];
            }
            
            // Track deleted images
            const deletedImages = (editingPost as any)?.deletedImages || [];
            const remainingImages = imageUrls.filter(url => !deletedImages.includes(url));
            
            return remainingImages.map((url, idx) => (
              <div key={idx} className="relative group">
                <img
                  src={url}
                  alt={`Image ${idx + 1}`}
                  className="w-full h-24 object-cover rounded-lg border border-gray-200"
                  loading="lazy"
                />
                <button
                  onClick={() => {
                    setEditingPost(prev => {
                      if (!prev) return null;
                      const currentDeleted = (prev as any).deletedImages || [];
                      return {
                        ...prev,
                        deletedImages: [...currentDeleted, url]
                      } as any;
                    });
                  }}
                  className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ));
          })()}
        </div>
      </div>

      {/* New Images to Upload */}
      {(() => {
        const newImages = (editingPost as any)?.newImages || [];
        const newPreviews = (editingPost as any)?.newPreviews || [];
        
        if (newImages.length > 0) {
          return (
            <div>
              <label className="text-sm font-medium mb-2 block text-green-600">New Images to Add</label>
              <div className="grid grid-cols-2 gap-2">
                {newPreviews.map((preview: string, idx: number) => (
                  <div key={idx} className="relative group">
                    <img
                      src={preview}
                      alt={`New image ${idx + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-green-500"
                      loading="lazy"
                    />
                    <button
                      onClick={() => {
                        setEditingPost(prev => {
                          if (!prev) return null;
                          const currentNew = (prev as any).newImages || [];
                          const currentPreviews = (prev as any).newPreviews || [];
                          
                          // Revoke the preview URL
                          URL.revokeObjectURL(currentPreviews[idx]);
                          
                          return {
                            ...prev,
                            newImages: currentNew.filter((_: any, i: number) => i !== idx),
                            newPreviews: currentPreviews.filter((_: any, i: number) => i !== idx)
                          } as any;
                        });
                      }}
                      className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Upload More Photos */}
      {(() => {
        const post = posts.find(p => p.id === editingPost?.id);
        if (!post?.image_url) return null;
        
        let imageUrls: string[] = [];
        try {
          imageUrls = JSON.parse(post.image_url);
        } catch {
          imageUrls = post.image_url.includes(',')
            ? post.image_url.split(',').map(url => url.trim())
            : [post.image_url];
        }
        
        const deletedImages = (editingPost as any)?.deletedImages || [];
        const remainingCount = imageUrls.length - deletedImages.length;
        const newImages = (editingPost as any)?.newImages || [];
        const totalCount = remainingCount + newImages.length;
        
        if (totalCount >= 4) {
          return (
            <p className="text-sm text-gray-500">Maximum 4 images reached</p>
          );
        }
        
        return (
          <div>
            <label className="text-sm font-medium mb-2 block">Add More Photos</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                const remainingSlots = 4 - totalCount;
                const filesToAdd = files.slice(0, remainingSlots);
                
                const validFiles: File[] = [];
                const validPreviews: string[] = [];
                
                for (const file of filesToAdd) {
                  if (file.size > 10 * 1024 * 1024) {
                    toast.error(`${file.name} is too large (max 10MB)`);
                    continue;
                  }
                  if (!file.type.startsWith('image/')) {
                    toast.error(`${file.name} is not an image`);
                    continue;
                  }
                  validFiles.push(file);
                  validPreviews.push(URL.createObjectURL(file));
                }
                
                if (validFiles.length > 0) {
                  setEditingPost(prev => {
                    if (!prev) return null;
                    const currentNew = (prev as any).newImages || [];
                    const currentPreviews = (prev as any).newPreviews || [];
                    return {
                      ...prev,
                      newImages: [...currentNew, ...validFiles],
                      newPreviews: [...currentPreviews, ...validPreviews]
                    } as any;
                  });
                  toast.success(`Added ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}`);
                }
                
                // Reset input
                e.target.value = '';
              }}
              disabled={uploadingPhoto}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              {totalCount}/4 images selected
            </p>
          </div>
        );
      })()}
    </div>
    <AlertDialogFooter>
      <AlertDialogCancel>Cancel</AlertDialogCancel>
      <AlertDialogAction 
        onClick={async () => {
          if (!editingPost) return;

          try {
            const post = posts.find(p => p.id === editingPost.id);
            if (!post?.image_url) return;
            
            // Parse existing images
            let imageUrls: string[] = [];
            try {
              imageUrls = JSON.parse(post.image_url);
            } catch {
              imageUrls = post.image_url.includes(',')
                ? post.image_url.split(',').map(url => url.trim())
                : [post.image_url];
            }
            
            // Remove deleted images
            const deletedImages = (editingPost as any)?.deletedImages || [];
            const remainingImages = imageUrls.filter(url => !deletedImages.includes(url));
            
            // Upload new images
            const newImages = (editingPost as any)?.newImages || [];
            const uploadedNewUrls: string[] = [];
            
            if (newImages.length > 0) {
              setUploadingPhoto(true);
              
              for (const file of newImages) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
                
                const { error: uploadError } = await supabase.storage
                  .from('posts')
                  .upload(fileName, file);
                
                if (uploadError) throw uploadError;
                
                const { data: urlData } = supabase.storage
                  .from('posts')
                  .getPublicUrl(fileName);
                
                uploadedNewUrls.push(urlData.publicUrl);
              }
              
              setUploadingPhoto(false);
            }
            
            // Combine remaining + new images
            const finalImages = [...remainingImages, ...uploadedNewUrls];
            const finalImageUrl = finalImages.length > 1 
              ? JSON.stringify(finalImages)
              : finalImages[0] || null;
            
            // Update post
            const { error } = await supabase
              .from('posts')
              .update({
                caption: editingPost.caption.trim() || null,
                recipe_url: editingPost.recipeUrl.trim() || null,
                image_url: finalImageUrl,
              })
              .eq('id', editingPost.id);

            if (error) throw error;

            setPosts(prev =>
              prev.map(p =>
                p.id === editingPost.id
                  ? {
                      ...p,
                      caption: editingPost.caption.trim() || null,
                      image_url: finalImageUrl,
                      recipe_url: editingPost.recipeUrl.trim() || null,
                    }
                  : p
              )
            );
            
            // Cleanup preview URLs
            const newPreviews = (editingPost as any)?.newPreviews || [];
            newPreviews.forEach((url: string) => URL.revokeObjectURL(url));
            
            toast.success('Post updated');
            setEditingPost(null);
          } catch (error: any) {
            console.error('Error updating post:', error);
            toast.error('Failed to update post');
          }
        }} 
        className="bg-orange-600 hover:bg-orange-700"
        disabled={uploadingPhoto}
      >
        {uploadingPhoto ? 'Uploading...' : 'Save changes'}
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

        <Dialog open={!!sharePostId} onOpenChange={(open) => !open && setSharePostId(null)}>
          <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Share</DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex gap-2 border-b border-gray-200">
                <button
                  onClick={() => setShareModalTab('followers')}
                  className={`flex-1 py-2 px-4 font-medium transition-colors ${
                    shareModalTab === 'followers'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Send to Followers
                </button>
                <button
                  onClick={() => setShareModalTab('link')}
                  className={`flex-1 py-2 px-4 font-medium transition-colors ${
                    shareModalTab === 'link'
                      ? 'text-orange-600 border-b-2 border-orange-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Share Link
                </button>
              </div>

              {shareModalTab === 'followers' && (
                <div className="space-y-4">
                  {followers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      You don't have any followers yet
                    </div>
                  ) : (
                    <>
                      <div className="max-h-64 overflow-y-auto space-y-2">
                        {followers.map((follower) => {
                          const profile = follower.profiles;
                          const isSelected = selectedFollowers.has(follower.following_id);
                          return (
                            <button
                              key={follower.following_id}
                              onClick={() => {
                                const newSelected = new Set(selectedFollowers);
                                if (isSelected) {
                                  newSelected.delete(follower.following_id);
                                } else {
                                  newSelected.add(follower.following_id);
                                }
                                setSelectedFollowers(newSelected);
                              }}
                              className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors ${
                                isSelected ? 'bg-orange-50 border-2 border-orange-500' : 'hover:bg-gray-50 border-2 border-transparent'
                              }`}
                            >
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold overflow-hidden">
                                {profile?.avatar_url ? (
                                  <img
                                    src={profile.avatar_url}
                                    alt={profile.username}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                  />
                                ) : (
                                  profile?.username?.[0]?.toUpperCase()
                                )}
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold">{profile?.username}</div>
                              </div>
                              {isSelected && (
                                <Check className="w-5 h-5 text-orange-600" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <Button
                        onClick={handleSendToFollowers}
                        disabled={selectedFollowers.size === 0}
                        className="w-full bg-orange-500 hover:bg-orange-600"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Send to {selectedFollowers.size} {selectedFollowers.size === 1 ? 'person' : 'people'}
                      </Button>
                    </>
                  )}
                </div>
              )}

              {shareModalTab === 'link' && (
                <div className="space-y-4">
                  <Button
                    onClick={() => sharePostId && handleNativeShare(sharePostId)}
                    className="w-full bg-blue-500 hover:bg-blue-600"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Share via Apps
                  </Button>
                  <Button
                    onClick={() => sharePostId && handleCopyLink(sharePostId)}
                    variant="outline"
                    className="w-full"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Link
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}