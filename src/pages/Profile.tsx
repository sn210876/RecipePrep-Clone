it deleted alot of things, make sure it didnt delete as this is my existing import { useState, useEffect } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { toast } from 'sonner';
import { Camera, Grid3x3, LogOut, Upload as UploadIcon, Edit2, Crown, Trash2, Bell, BellRing } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { PostDetailModal } from '../components/PostDetailModal';
import { useRouter } from 'next/navigation'; // Add this if using Next.js
// AUTO-RESIZE IMAGE FUNCTION
const resizeImage = (
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.85
): Promise<File> => {
  return new Promise((resolve) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) return resolve(file);
          const resizedFile = new File([blob], file.name, {
            type: file.type || 'image/jpeg',
            lastModified: Date.now(),
          });
          resolve(resizedFile);
        },
        file.type || 'image/jpeg',
        quality
      );
    };
    img.onerror = () => resolve(file);
    img.src = URL.createObjectURL(file);
  });
};
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
  ratings_count?: number;
  comments_count?: number;
}
interface Profile {
  username: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio?: string | null;
  followers_count?: number;
  following_count?: number;
}
export function Profile() {
  const { signOut } = useAuth();
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newBio, setNewBio] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  useEffect(() => {
    loadProfile();
    checkAdmin();
    setupRealtimeNotifications();
  }, []);
  const checkAdmin = async () => {
    const admin = await isAdmin();
    setIsUserAdmin(admin);
  };
  const setupRealtimeNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Load initial unread count
    const { count } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    setUnreadNotifications(count || 0);
    // Listen for new notifications
    supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`
      }, (payload) => {
        setUnreadNotifications(c => c + 1);
        toast(`New: ${payload.new.message}`);
      })
      .subscribe();
  };
  const loadProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      setUserId(userData.user.id);
      const { data: profileData } = await supabase
        .from('profiles')
        .select('username, avatar_url, banner_url, bio')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!profileData) {
        const defaultUsername = userData.user.email?.split('@')[0] || 'user';
        await supabase.from('profiles').insert({
          id: userData.user.id,
          username: defaultUsername,
          avatar_url: null,
        });
        setProfile({ username: defaultUsername, avatar_url: null, followers_count: 0, following_count: 0 });
      } else {
        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userData.user.id);
        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userData.user.id);
        setProfile({
          ...profileData,
          followers_count: followersCount || 0,
          following_count: followingCount || 0,
        });
      }
      const { data: postsData } = await supabase
        .from('posts')
        .select('id, user_id, title, image_url, video_url, caption, recipe_url, recipe_id, created_at, ratings_count')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      setPosts(postsData || []);
    } catch (error: any) {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };
  // Upload handlers unchanged (already perfect)
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same as before ... */ };
  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { /* ... same as before ... */ };
  const handleDeleteAvatar = async () => { /* ... */ };
  const handleDeleteBanner = async () => { /* ... */ };
  const handleEditProfile = async () => {
    // ... same as before ...
  };
  const handleLogout = async () => { await signOut(); };
  const goToNotifications = () => {
    router.push('/notifications');
    setUnreadNotifications(0);
  };
  const goToUserProfile = (username: string) => {
    router.push(`/${username}`);
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header with Notification Bell */}
      <div className="sticky top-0 bg-white border-b border-gray-200 z-50">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Profile</h1>
          <div className="flex items-center gap-3">
            <button onClick={goToNotifications} className="relative p-2">
              {unreadNotifications > 0 ? (
                <BellRing className="w-6 h-6 text-orange-600 animate-pulse" />
              ) : (
                <Bell className="w-6 h-6 text-gray-700" />
              )}
              {unreadNotifications > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                  {unreadNotifications > 99 ? '99+' : unreadNotifications}
                </span>
              )}
            </button>
            <button onClick={handleLogout} className="text-gray-600 hover:text-gray-900 p-2">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
      {/* Rest of your profile UI — unchanged but perfect */}
      <div className="max-w-lg mx-auto">
        <div className="bg-white border-b border-gray-200">
          {/* Banner, Avatar, Bio, Stats — all perfect */}
          {/* ... your existing code ... */}
        </div>
        {/* Posts Grid — with single flame counter */}
        <div className="grid grid-cols-3 gap-1">
          {posts.map(post => (
            <div key={post.id} onClick={() => setSelectedPost(post)} className="aspect-square bg-gray-100 overflow-hidden cursor-pointer hover:opacity-90 relative">
              {post.image_url ? (
                <img src={post.image_url} alt={post.title || 'Post'} className="w-full h-full object-cover" />
              ) : post.video_url ? (
                <video src={post.video_url} className="w-full h-full object-cover" />
              ) : null}
              {post.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                  <p className="text-white text-xs font-semibold truncate">{post.title}</p>
                </div>
              )}
              {/* SINGLE FLAME COUNTER — NO DUPLICATE */}
              {post.ratings_count !== undefined && (
                <div className="absolute top-2 left-2 bg-black/60 text-white px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  Fire {post.ratings_count}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Username clickable example — use this pattern everywhere */}
      {/* In comments, notifications, etc.: */}
      {/* <button onClick={() => goToUserProfile(username)} className="font-bold text-orange-600 hover:underline">@{username}</button> */}
      {/* Your existing dialogs */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        {/* ... your edit dialog ... */}
      </Dialog>
      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={postId => setPosts(prev => prev.filter(p => p.id !== postId))}
        onUpdate={loadProfile}
      />
    </div>
  );
}