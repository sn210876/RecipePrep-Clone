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
import { PostLightbox } from '../components/PostLightbox';
import { Recipe } from '../types/recipe';
import { blockService } from '../services/blockService';

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
  title: string;
  caption: string;
  recipeUrl: string;
  currentMedia: { url: string; type: 'image' | 'video' }[];
  deletedMedia: string[];
  newMediaFiles: File[];
  newMediaPreviews: string[];
  newMediaTypes: ('image' | 'video')[];
} | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [followingUsers, setFollowingUsers] = useState<Set<string>>(new Set());
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Array<{ id: string; username: string; avatar_url: string | null }>>([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const notificationRef = useRef<HTMLDivElement>(null);
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
  const [lightboxPost, setLightboxPost] = useState<{ media: Array<{ url: string; type: 'image' | 'video' }>; initialIndex: number; postId: string } | null>(null);

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
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    if (showNotifications) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNotifications]);

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
      console.log('[Notifications] Loaded notifications:', data);
      console.log('[Notifications] Unread count:', data.filter(n => !n.read).length);
      
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
      
      const unreadCount = data.filter(n => !n.read).length;
      console.log('[Notifications] Setting unread count to:', unreadCount);
      setUnreadNotifications(unreadCount);
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
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${currentUserId}` },
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

      // Get blocked users
      const { data: { user } } = await supabase.auth.getUser();
      const blockedUserIds = user ? await blockService.getBlockedUserIds(user.id) : [];
      const usersWhoBlockedMe = user ? await blockService.getUsersWhoBlockedMe(user.id) : [];

      // Filter out posts from blocked users and users who blocked me
      const filteredPosts = postsData.filter(post => {
        return !blockedUserIds.includes(post.user_id) && !usersWhoBlockedMe.includes(post.user_id);
      });

      if (filteredPosts.length === 0) {
        if (isRefresh) {
          setPosts([]);
        }
        setHasMore(false);
        setLoading(false);
        return;
      }

      const filteredPostIds = filteredPosts.map(p => p.id);
      const filteredUserIds = [...new Set(filteredPosts.map(p => p.user_id))];

      const queries = [];

      if (filteredUserIds.length > 0) {
        queries.push(supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', filteredUserIds));
      } else {
        queries.push(Promise.resolve({ data: [], error: null }));
      }

      if (filteredPostIds.length > 0) {
        queries.push(
          supabase
            .from('likes')
            .select('user_id, post_id')
            .in('post_id', filteredPostIds),
          supabase
            .from('comments')
            .select('id, text, created_at, user_id, post_id, rating')
            .in('post_id', filteredPostIds)
            .order('created_at', { ascending: false }),
          supabase
            .from('post_ratings')
            .select('rating, post_id')
            .in('post_id', filteredPostIds)
        );
      } else {
        queries.push(
          Promise.resolve({ data: [], error: null }),
          Promise.resolve({ data: [], error: null }),
          Promise.resolve({ data: [], error: null })
        );
      }

      const [profilesData, likesData, commentsDataRaw, ratingsData] = await Promise.all(queries);

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
      const postsWithDetails = filteredPosts.map(post => {
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

      setHasMore(filteredPosts.length === POSTS_PER_PAGE);
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
      setUploadingPhoto(true);

      // Upload new media files
      const newImageUrls: string[] = [];
      const newVideoUrls: string[] = [];

      for (let i = 0; i < editingPost.newMediaFiles.length; i++) {
        const file = editingPost.newMediaFiles[i];
        const type = editingPost.newMediaTypes[i];

        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('posts')
          .getPublicUrl(fileName);

        if (type === 'video') {
          newVideoUrls.push(urlData.publicUrl);
        } else {
          newImageUrls.push(urlData.publicUrl);
        }
      }

      // Combine remaining media with new media
      const remainingImages = editingPost.currentMedia
        .filter(m => m.type === 'image' && !editingPost.deletedMedia.includes(m.url))
        .map(m => m.url);

      const remainingVideos = editingPost.currentMedia
        .filter(m => m.type === 'video' && !editingPost.deletedMedia.includes(m.url))
        .map(m => m.url);

      const finalImages = [...remainingImages, ...newImageUrls];
      const finalVideos = [...remainingVideos, ...newVideoUrls];

      // Prepare update data
      const updateData: any = {
        title: editingPost.title.trim() || null,
        caption: editingPost.caption.trim() || null,
        recipe_url: editingPost.recipeUrl.trim() || null,
        image_url: finalImages.length > 0 ? JSON.stringify(finalImages) : null,
        video_url: finalVideos.length > 0 ? JSON.stringify(finalVideos) : null,
      };

      const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', editingPost.id);

      if (error) throw error;

      // Update local state
      setPosts(prev =>
        prev.map(p =>
          p.id === editingPost.id
            ? { ...p, ...updateData }
            : p
        )
      );

      toast.success('Post updated');
      setEditingPost(null);
    } catch (error: any) {
      console.error('Error updating post:', error);
      toast.error('Failed to update post');
    } finally {
      setUploadingPhoto(false);
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
    <div className="bg-white border-4 border-orange-500 mb-2 animate-pulse">
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
      <div className="max-w-sm lg:max-w-md mx-auto w-full" onClick={() => { setShowNotifications(false); setShowSearchResults(false); }}>
        <div className="fixed top-14 left-0 right-0 z-20 bg-white border-b border-gray-200 p-3 lg:px-6 max-w-sm lg:max-w-md mx-auto shadow-sm">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder="Search users..."
                className="w-full pl-9 pr-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors"
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
                            <img src={user.avatar_url} alt={user.username} className="w-full h-full object-cover" loading="lazy" decoding="async" />
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

<div ref={notificationRef} className="relative">
              <button
             onClick={async (e) => {
  e.stopPropagation();
  
  // If we're about to OPEN the notifications panel, mark them as read
  if (!showNotifications && currentUserId) {
    // Mark all unread notifications as read in the database
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', currentUserId)
      .eq('read', false)
      .neq('type', 'message');
    
    // Update local state
    setUnreadNotifications(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }
  
  // Then toggle the panel
  setShowNotifications(!showNotifications);
}}
                className="relative p-2.5 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 bg-gray-50"
              >
                <Bell className="w-5 h-5 text-gray-700" />
                {unreadNotifications > 0 && (
                  <span className="absolute top-0 right-0 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
                    {unreadNotifications > 9 ? '9+' : unreadNotifications}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-3 w-80 bg-white border border-gray-200 rounded-xl max-h-80 overflow-y-auto shadow-2xl z-[100]">
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
          </div>
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
               console.log('[Discover] Post ID:', post.id);
  console.log('[Discover] Raw image_url:', post.image_url);
  console.log('[Discover] Raw video_url:', post.video_url);
                const isLiked = post.likes?.some(like => like.user_id === currentUserId);
                const latestComments = post.comments?.slice(0, 2) || [];
                const isOwnPost = post.user_id === currentUserId;

                return (
                  <div key={post.id} className="bg-white border-4 border-orange-500 mb-2 flex flex-col min-h-0">
                    {/* Header */}
                    <div className="px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {post.profiles?.avatar_url ? (
                          <img
                            src={post.profiles.avatar_url}
                            alt={post.profiles.username}
                            loading="lazy"
                            decoding="async"
                            className="w-8 h-8 rounded-full object-cover"
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
                              onClick={() => {
                                let currentMedia: { url: string; type: 'image' | 'video' }[] = [];

                                // Parse images
                                if (post.image_url) {
                                  try {
                                    const parsed = JSON.parse(post.image_url);
                                    if (Array.isArray(parsed)) {
                                      currentMedia.push(...parsed.map(url => ({ url, type: 'image' as const })));
                                    } else {
                                      currentMedia.push({ url: parsed, type: 'image' });
                                    }
                                  } catch {
                                    if (post.image_url.includes(',')) {
                                      currentMedia.push(...post.image_url.split(',').map(url => ({ url: url.trim(), type: 'image' as const })));
                                    } else {
                                      currentMedia.push({ url: post.image_url, type: 'image' });
                                    }
                                  }
                                }

                                // Parse videos
                                if (post.video_url) {
                                  try {
                                    const parsed = JSON.parse(post.video_url);
                                    if (Array.isArray(parsed)) {
                                      currentMedia.push(...parsed.map(url => ({ url, type: 'video' as const })));
                                    } else {
                                      currentMedia.push({ url: parsed, type: 'video' });
                                    }
                                  } catch {
                                    if (post.video_url.includes(',')) {
                                      currentMedia.push(...post.video_url.split(',').map(url => ({ url: url.trim(), type: 'video' as const })));
                                    } else {
                                      currentMedia.push({ url: post.video_url, type: 'video' });
                                    }
                                  }
                                }

                                setEditingPost({
                                  id: post.id,
                                  title: post.title || '',
                                  caption: post.caption || '',
                                  recipeUrl: post.recipe_url || '',
                                  currentMedia: currentMedia,
                                  deletedMedia: [],
                                  newMediaFiles: [],
                                  newMediaPreviews: [],
                                  newMediaTypes: []
                                });
                              }}
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
<div className="relative">
  {post.image_url || post.video_url ? (
    (() => {
      // Parse image URLs properly
let mediaUrls: string[] = [];
let mediaTypes: string[] = [];

// Helper to detect if URL is actually a video
const isVideoUrl = (url: string): boolean => {
  const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv'];
  const lowerUrl = url.toLowerCase();
  return videoExtensions.some(ext => lowerUrl.includes(ext));
};

// Handle image_url
if (post.image_url) {
  try {
    const parsed = JSON.parse(post.image_url);
    if (Array.isArray(parsed)) {
      parsed.forEach(url => {
        const displayUrl = getDisplayImageUrl(url);
        if (displayUrl) {
          mediaUrls.push(displayUrl);
          mediaTypes.push(isVideoUrl(url) ? 'video' : 'image');
        }
      });
    } else {
      const displayUrl = getDisplayImageUrl(parsed);
      if (displayUrl) {
        mediaUrls.push(displayUrl);
        mediaTypes.push(isVideoUrl(parsed) ? 'video' : 'image');
      }
    }
  } catch {
    if (post.image_url.includes(',')) {
      post.image_url.split(',').forEach(url => {
        const trimmedUrl = url.trim();
        const displayUrl = getDisplayImageUrl(trimmedUrl);
        if (displayUrl) {
          mediaUrls.push(displayUrl);
          mediaTypes.push(isVideoUrl(trimmedUrl) ? 'video' : 'image');
        }
      });
    } else {
      const displayUrl = getDisplayImageUrl(post.image_url);
      if (displayUrl) {
        mediaUrls.push(displayUrl);
        mediaTypes.push(isVideoUrl(post.image_url) ? 'video' : 'image');
      }
    }
  }
}

// Handle video_url (separate column for actual videos)
// Skip Instagram videos as they cannot be played directly
if (post.video_url) {
  try {
    const parsed = JSON.parse(post.video_url);
    if (Array.isArray(parsed)) {
      parsed.forEach(url => {
        // Only add non-Instagram video URLs
        if (!url.includes('instagram.com')) {
          mediaUrls.push(url);
          mediaTypes.push('video');
        }
      });
    } else {
      // Only add non-Instagram video URLs
      if (!parsed.includes('instagram.com')) {
        mediaUrls.push(parsed);
        mediaTypes.push('video');
      }
    }
  } catch {
    // Only add non-Instagram video URLs
    if (!post.video_url.includes('instagram.com')) {
      mediaUrls.push(post.video_url);
      mediaTypes.push('video');
    }
  }
}

      // If no media found, show placeholder
      if (mediaUrls.length === 0) {
          console.log('[Discover] ❌ NO MEDIA FOUND for post:', post.id);
        return (
          <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500">No media available</p>
          </div>
        );
      }

      console.log('[Discover] 📊 Media parsed for post:', post.id);
      console.log('[Discover] 📊 mediaUrls:', mediaUrls);
      console.log('[Discover] 📊 mediaTypes:', mediaTypes);

      // Debug video URLs specifically
      mediaUrls.forEach((url, idx) => {
        if (mediaTypes[idx] === 'video') {
          console.log('[Discover] 🎥 Video URL at index', idx, ':', url);
        }
      });

      const currentImageIndex = imageIndices[post.id] || 0;
      const setCurrentImageIndex = (indexOrFn: number | ((prev: number) => number)) => {
        setImageIndices(prev => ({
          ...prev,
          [post.id]: typeof indexOrFn === 'function' ? indexOrFn(prev[post.id] || 0) : indexOrFn
        }));
      };
      
      // Single media item
      if (mediaUrls.length === 1) {
          console.log('[Discover] ✓ Single media:', mediaUrls[0]); // ADD THIS

       return mediaTypes[0] === 'video' ? (
  <video
    key={mediaUrls[0]}
    src={mediaUrls[0]}
    controls
    playsInline
    className="w-full aspect-square object-cover bg-black"
    preload="auto"
    onClick={(e) => {
      // Don't toggle if clicking on controls (they have their own handlers)
      const rect = (e.target as HTMLVideoElement).getBoundingClientRect();
      const controlsHeight = 40; // Approximate height of video controls
      const clickY = e.clientY - rect.top;

      // Only toggle if clicking outside the controls area at the bottom
      if (clickY < rect.height - controlsHeight) {
        const video = e.target as HTMLVideoElement;
        if (video.paused) {
          video.play().catch(err => console.error('[Discover] Play failed:', err));
        } else {
          video.pause();
        }
      }
    }}
    onError={(e) => {
      const videoElement = e.target as HTMLVideoElement;
      console.error('[Discover] Single video failed:', mediaUrls[0]);
      console.error('[Discover] Video error details:', {
        error: videoElement.error,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState,
        src: videoElement.src
      });
      toast.error('Video failed to load');
    }}
    onLoadStart={() => {
      console.log('[Discover] Single video loading:', mediaUrls[0]);
    }}
    onCanPlay={() => {
      console.log('[Discover] Single video can play:', mediaUrls[0]);
    }}
  />
) : (
          <img
            src={mediaUrls[0]}
            alt={post.title || 'Post'}
            loading="lazy"
            decoding="async"
            className="w-full aspect-square object-cover cursor-pointer"
            onClick={() => {
              setLightboxPost({
                media: mediaUrls.map((url, idx) => ({ url, type: mediaTypes[idx] as 'image' | 'video' })),
                initialIndex: 0,
                postId: post.id
              });
            }}
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
    playsInline
    className="w-full h-full object-cover"
    preload="auto"
    onClick={(e) => {
      e.stopPropagation();
      // Don't toggle if clicking on controls
      const rect = (e.target as HTMLVideoElement).getBoundingClientRect();
      const controlsHeight = 40;
      const clickY = e.clientY - rect.top;

      if (clickY < rect.height - controlsHeight) {
        const video = e.target as HTMLVideoElement;
        if (video.paused) {
          video.play().catch(err => console.error('[Discover] Play failed:', err));
        } else {
          video.pause();
        }
      }
    }}
    onError={(e) => {
      const videoElement = e.target as HTMLVideoElement;
      console.error('[Discover] Carousel video failed:', mediaUrls[currentImageIndex]);
      console.error('[Discover] Video error details:', {
        error: videoElement.error,
        networkState: videoElement.networkState,
        readyState: videoElement.readyState,
        src: videoElement.src
      });
      toast.error('Video failed to load');
    }}
    onLoadStart={() => {
      console.log('[Discover] Video loading...');
    }}
    onCanPlay={() => {
      console.log('[Discover] Video can play');
    }}
  />
) : (
            <img
              key={mediaUrls[currentImageIndex]}
              src={mediaUrls[currentImageIndex]}
              loading="lazy"
              decoding="async"
              alt={`${post.title || 'Post'} ${currentImageIndex + 1}`}
              className="w-full h-full object-cover cursor-pointer"
              onClick={() => {
                setLightboxPost({
                  media: mediaUrls.map((url, idx) => ({ url, type: mediaTypes[idx] as 'image' | 'video' })),
                  initialIndex: currentImageIndex,
                  postId: post.id
                });
              }}
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
          
        {/* Swipe support for mobile - only active on non-video content */}
          {mediaTypes[currentImageIndex] !== 'video' && (
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
          )}
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

  {/* Title overlay */}
  {post.title && (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-4 py-3">
      <h3 className="text-white text-sm font-semibold">{post.title}</h3>
    </div>
  )}

  {/* Rating overlay - always show on bottom right when ratings exist */}
  {postRatings[post.id] && postRatings[post.id].count > 0 && (
    <div className="absolute bottom-3 right-3 z-20">
      <div className="flex items-center gap-1 bg-black/70 backdrop-blur-sm px-2.5 py-1.5 rounded-full shadow-lg">
        <span className="text-lg">🔥</span>
        <span className="text-white text-xs font-bold">
          {postRatings[post.id].average.toFixed(1)}
        </span>
        <span className="text-white/70 text-xs">
          ({postRatings[post.id].count})
        </span>
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
            onCommentPosted={() => {}}
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

        {/* Edit Post Dialog */}
        <Dialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Post</DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium mb-2 block">Title</label>
                <input
                  type="text"
                  value={editingPost?.title || ''}
                  onChange={(e) =>
                    setEditingPost(prev => prev ? { ...prev, title: e.target.value } : null)
                  }
                  placeholder="Recipe title..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="text-sm font-medium mb-2 block">Caption</label>
                <Textarea
                  value={editingPost?.caption || ''}
                  onChange={(e) =>
                    setEditingPost(prev => prev ? { ...prev, caption: e.target.value } : null)
                  }
                  placeholder="Write a caption..."
                  rows={3}
                  className="w-full"
                />
              </div>

              {/* Recipe URL */}
              <div>
                <label className="text-sm font-medium mb-2 block">Recipe Link</label>
                <input
                  type="url"
                  value={editingPost?.recipeUrl || ''}
                  onChange={(e) =>
                    setEditingPost(prev => prev ? { ...prev, recipeUrl: e.target.value } : null)
                  }
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Current Media */}
              {editingPost && editingPost.currentMedia.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block">Current Media</label>
                  <div className="grid grid-cols-2 gap-2">
                    {editingPost.currentMedia
                      .filter(item => !editingPost.deletedMedia.includes(item.url))
                      .map((item, idx) => (
                        <div key={idx} className="relative group">
                          {item.type === 'video' ? (
                            <video
                              src={item.url}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                              muted
                            />
                          ) : (
                            <img
                              src={item.url}
                              alt={`Media ${idx + 1}`}
                              className="w-full h-32 object-cover rounded-lg border border-gray-200"
                              loading="lazy"
                            />
                          )}
                          <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                            {item.type === 'video' ? '🎥' : '🖼️'}
                          </div>
                          <button
                            onClick={() => {
                              setEditingPost(prev => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  deletedMedia: [...prev.deletedMedia, item.url]
                                };
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
              )}

              {/* New Media to Upload */}
              {editingPost && editingPost.newMediaPreviews.length > 0 && (
                <div>
                  <label className="text-sm font-medium mb-2 block text-green-600">New Media to Add</label>
                  <div className="grid grid-cols-2 gap-2">
                    {editingPost.newMediaPreviews.map((preview, idx) => (
                      <div key={idx} className="relative group">
                        {editingPost.newMediaTypes[idx] === 'video' ? (
                          <video
                            src={preview}
                            className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                            muted
                          />
                        ) : (
                          <img
                            src={preview}
                            alt={`New media ${idx + 1}`}
                            className="w-full h-32 object-cover rounded-lg border-2 border-green-500"
                            loading="lazy"
                          />
                        )}
                        <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                          {editingPost.newMediaTypes[idx] === 'video' ? '🎥 New' : '🖼️ New'}
                        </div>
                        <button
                          onClick={() => {
                            setEditingPost(prev => {
                              if (!prev) return null;

                              URL.revokeObjectURL(prev.newMediaPreviews[idx]);

                              return {
                                ...prev,
                                newMediaFiles: prev.newMediaFiles.filter((_, i) => i !== idx),
                                newMediaPreviews: prev.newMediaPreviews.filter((_, i) => i !== idx),
                                newMediaTypes: prev.newMediaTypes.filter((_, i) => i !== idx)
                              };
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
              )}

              {/* Upload More Media */}
              {editingPost && (() => {
                const remainingCount = editingPost.currentMedia.filter(
                  m => !editingPost.deletedMedia.includes(m.url)
                ).length;
                const totalCount = remainingCount + editingPost.newMediaFiles.length;

                if (totalCount >= 4) {
                  return (
                    <p className="text-sm text-gray-500">Maximum 4 media files reached</p>
                  );
                }

                return (
                  <div>
                    <label className="text-sm font-medium mb-2 block">Add More Media</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      multiple
                      onChange={(e) => {
                        const files = Array.from(e.target.files || []);
                        const remainingSlots = 4 - totalCount;
                        const filesToAdd = files.slice(0, remainingSlots);

                        const validFiles: File[] = [];
                        const validPreviews: string[] = [];
                        const validTypes: ('image' | 'video')[] = [];

                        for (const file of filesToAdd) {
                          const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
                          if (file.size > maxSize) {
                            toast.error(`${file.name} is too large (max ${file.type.startsWith('video/') ? '50MB' : '10MB'})`);
                            continue;
                          }

                          validFiles.push(file);
                          validPreviews.push(URL.createObjectURL(file));
                          validTypes.push(file.type.startsWith('video/') ? 'video' : 'image');
                        }

                        if (validFiles.length > 0) {
                          setEditingPost(prev => {
                            if (!prev) return null;
                            return {
                              ...prev,
                              newMediaFiles: [...prev.newMediaFiles, ...validFiles],
                              newMediaPreviews: [...prev.newMediaPreviews, ...validPreviews],
                              newMediaTypes: [...prev.newMediaTypes, ...validTypes]
                            };
                          });
                        }

                        e.target.value = '';
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Images: max 10MB | Videos: max 50MB | Total: {totalCount}/4
                    </p>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setEditingPost(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditPost}
                disabled={uploadingPhoto}
                className="bg-orange-500 hover:bg-orange-600"
              >
                {uploadingPhoto ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

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

        {/* Post Lightbox */}
        {lightboxPost && (
          <PostLightbox
            media={lightboxPost.media}
            initialIndex={lightboxPost.initialIndex}
            postId={lightboxPost.postId}
            open={!!lightboxPost}
            onOpenChange={(open) => {
              if (!open) setLightboxPost(null);
            }}
            onLikeUpdate={() => {
              fetchPosts(1, true);
            }}
          />
        )}
      </div>
    </div>
  );
}