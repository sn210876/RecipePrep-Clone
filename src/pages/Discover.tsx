import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Heart, MessageCircle, ExternalLink, MoreVertical, Trash2, Edit3, Search, Hash, Bell, PiggyBank, Crown, Send, Copy, Check } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { makeHashtagsClickable } from '../lib/hashtags';
import { CommentModal } from '../components/CommentModal';
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
  const [editingPost, setEditingPost] = useState<{ id: string; caption: string; recipeUrl: string; photoUrl: string } | null>(null);
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
  const [copiedLink, setCopiedLink] = useState(false);

  const POSTS_PER_PAGE = 10;

  // Get current user
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

  // Handle shared post links
  useEffect(() => {
    const handleSharedPost = (e: any) => {
      const postId = e.detail;
      if (postId) {
        console.log('[Share] Opening shared post:', postId);
        setCommentModalPostId(postId);
      }
    };

    window.addEventListener('open-shared-post', handleSharedPost);
    
    // Fallback: if App.tsx dispatched before we mounted
    if ((window as any).__pendingSharedPostId) {
      console.log('[Share] Found pending shared post:', (window as any).__pendingSharedPostId);
      setCommentModalPostId((window as any).__pendingSharedPostId);
      delete (window as any).__pendingSharedPostId;
    }
    
    // Also check on first load (in case link was opened directly)
    const path = window.location.pathname;
    const match = path.match(/^\/post\/([a-f0-9-]{36})$/);
    if (match) {
      console.log('[Share] Direct post link detected:', match[1]);
      setCommentModalPostId(match[1]);
      // Don't replace the URL immediately - let the user see it
      setTimeout(() => {
        window.history.replaceState({}, '', '/discover');
      }, 100);
    }

    return () => {
      window.removeEventListener('open-shared-post', handleSharedPost);
    };
  }, []);

  // Load notifications
  useEffect(() => {
    if (!currentUserId) return;

    const loadNotifications = async () => {
      console.log('[Notifications] Loading notifications for user:', currentUserId);
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

      console.log('[Notifications] Loaded notifications:', data);

      if (data) {
        // Manually fetch actor profiles for each notification
        const actorIds = [...new Set(data.map(n => n.actor_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, username, avatar_url')
          .in('id', actorIds);

        console.log('[Notifications] Loaded actor profiles:', profiles);

        // Map profiles to notifications
        const profilesMap = new Map(profiles?.map(p => [p.id, p]) || []);
        const mappedData = data.map(n => ({
          ...n,
          actor: profilesMap.get(n.actor_id) || { username: 'Unknown', avatar_url: null }
        }));

        setNotifications(mappedData);
        setUnreadNotifications(mappedData.filter(n => !n.read).length);
        console.log('[Notifications] Unread count:', mappedData.filter(n => !n.read).length);
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

  // Handle sharedPostId prop
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

  // Fetch posts
  const fetchPosts = useCallback(async (pageNum: number, isRefresh = false) => {
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });

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

          const postIds = (postHashtags || []).map(ph => ph.post_id);

          if (postIds.length === 0) {
            setPosts([]);
            setHasMore(false);
            setLoading(false);
            return;
          }

          query = query.in('id', postIds);
        } else {
          setPosts([]);
          setHasMore(false);
          setLoading(false);
          return;
        }
      }

      const { data: postsData, error: postsError } = await query
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
            .select('id, text, created_at, user_id, rating')
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

          const { data: postRatingsData } = await supabase
            .from('post_ratings')
            .select('rating')
            .eq('post_id', post.id);

          const ratingsCount = postRatingsData?.length || 0;
          const averageRating = ratingsCount > 0
            ? postRatingsData!.reduce((sum, r) => sum + r.rating, 0) / ratingsCount
            : 0;

          setPostRatings(prev => ({
            ...prev,
            [post.id]: { average: averageRating, count: ratingsCount }
          }));

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
  }, [filterHashtag]);

  // Load initial posts and subscribe to changes
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
          // Could refresh comments here if needed
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'likes' },
        () => {
          // Could refresh likes here if needed
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
        toast.success('Unfollowed');
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentUserId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      setEditingPost(prev => prev ? { ...prev, photoUrl: urlData.publicUrl } : null);
      toast.success('Photo uploaded!');
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
      const { error } = await supabase
        .from('posts')
        .update({
          caption: editingPost.caption.trim() || null,
          recipe_url: editingPost.recipeUrl.trim() || null,
          photo_url: editingPost.photoUrl.trim() || null,
          image_url: editingPost.photoUrl.trim() || null,
        })
        .eq('id', editingPost.id);

      if (error) throw error;

      setPosts(prev =>
        prev.map(p =>
          p.id === editingPost.id
            ? {
                ...p,
                caption: editingPost.caption.trim() || null,
                image_url: editingPost.photoUrl.trim() || null,
                recipe_url: editingPost.recipeUrl.trim() || null,
                photo_url: editingPost.photoUrl.trim() || null
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

        const post = posts.find(p => p.id === postId);
        if (post && post.user_id !== currentUserId) {
          console.log('[Notifications] Sending like notification:', {
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'like',
            post_id: postId,
          });
          const { data, error } = await supabase.from('notifications').insert({
            user_id: post.user_id,
            actor_id: currentUserId,
            type: 'like',
            post_id: postId,
          });
          if (error) {
            console.error('[Notifications] Error sending like notification:', error);
          } else {
            console.log('[Notifications] Like notification sent successfully:', data);
          }
        }

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

  const performSearch = async (query: string) => {
    console.log('[Search] Performing search for:', query);

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .ilike('username', `${query}%`)
        .limit(10);

      if (error) {
        console.error('[Search] Error:', error);
        toast.error('Search failed: ' + error.message);
        setSearchResults([]);
        setShowSearchResults(false);
        return;
      }

      console.log('[Search] Results:', data);
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
    
    const shareUrl = `https://mealscrape.com/post/${postId}`;
    const shareData = {
      title: post.title || 'Check out this recipe!',
      text: post.caption || 'Found this amazing recipe on MealScrape!',
      url: shareUrl
    };

    if (navigator.share && navigator.canShare?.(shareData)) {
      try {
        await navigator.share(shareData);
        toast.success('Shared successfully!');
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast.success('Link copied to clipboard!');
    }
  };

  const handleCopyLink = (postId: string) => {
    const shareUrl = `https://mealscrape.com/post/${postId}`;
    
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

    const shareUrl = `https://mealscrape.com/post/${sharePostId}`;
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

        await supabase.from('messages').insert({
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
    } catch (error) {
      console.error('Error sharing post:', error);
      toast.error('Failed to share post');
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
      <div className="max-w-sm mx-auto" onClick={() => { setShowNotifications(false); setShowSearchResults(false); }}>
        <div className="fixed top-0 left-0 right-0 z-[100] bg-white border-b border-gray-200 p-4 max-w-sm mx-auto">
          <div className="flex items-center gap-2">
            <div className="relative" style={{ width: '70%' }}>
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
                        <div className="w-7 h-7 rounded-