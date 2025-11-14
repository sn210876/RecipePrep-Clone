import { useState, useEffect } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { toast } from 'sonner';
import { Camera, Grid3x3, LogOut, Upload as UploadIcon, Edit2, Crown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { PostDetailModal } from '../components/PostDetailModal';

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
  likes_count?: number;
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

  useEffect(() => {
    loadProfile();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const admin = await isAdmin();
    setIsUserAdmin(admin);
  };

  const loadProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUserId(userData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url, banner_url, bio')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError;
      }

      if (!profileData) {
        const defaultUsername = userData.user.email?.split('@')[0] || 'user';
        const { error: insertError } = await supabase.from('profiles').insert({
          id: userData.user.id,
          username: defaultUsername,
          avatar_url: null,
        });

        if (insertError) throw insertError;

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

      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('id, user_id, title, image_url, video_url, caption, recipe_url, recipe_id, created_at')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      setPosts(postsData || []);
    } catch (error: any) {
      console.error('Error loading profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, avatar_url: urlData.publicUrl } : null);
      toast.success('Avatar updated successfully!');
    } catch (error: any) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/banner.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: urlData.publicUrl })
        .eq('id', userId);

      if (updateError) throw updateError;

      setProfile(prev => prev ? { ...prev, banner_url: urlData.publicUrl } : null);
      toast.success('Banner updated successfully!');
    } catch (error: any) {
      console.error('Error uploading banner:', error);
      toast.error('Failed to upload banner');
    } finally {
      setUploading(false);
    }
  };

  const handleEditProfile = async () => {
    if (!userId) return;

    try {
      const updates: any = {};
      if (newUsername && newUsername !== profile?.username) {
        updates.username = newUsername;
      }
      if (newBio !== undefined) {
        updates.bio = newBio;
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);

        if (error) throw error;

        setProfile(prev => prev ? { ...prev, ...updates } : null);
        toast.success('Profile updated successfully!');
      }

      setEditingProfile(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error('Failed to sign out');
    }
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
      <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Profile</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white border-b border-gray-200">
          {/* Banner with camera button */}
          <div className="relative h-32">
            {profile?.banner_url ? (
              <img
                src={profile.banner_url}
                alt="Banner"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100" />
            )}
            <label className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="file"
                accept="image/*"
                onChange={handleBannerUpload}
                disabled={uploading}
                className="hidden"
              />
              <Camera className="w-4 h-4 text-gray-600" />
            </label>
          </div>

          {/* Avatar + Username + Bio section - Instagram style left-aligned */}
          <div className="relative px-4 pb-3">
            <div className="flex items-start gap-3 -mt-10">
              {/* Avatar overlapping banner */}
              <div className="relative flex-shrink-0">
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                    {profile?.username?.[0]?.toUpperCase()}
                  </div>
                )}
                <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    disabled={uploading}
                    className="hidden"
                  />
                  <Camera className="w-4 h-4 text-gray-700" />
                </label>
              </div>

              {/* Bio aligned to right of avatar, vertically centered */}
              <div className="flex-1 pt-10 min-w-0">
                {profile?.bio ? (
                  <p className="text-sm text-gray-700 line-clamp-1 overflow-hidden text-ellipsis">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Add your bio</p>
                )}
              </div>
            </div>

            {/* Username directly under avatar with minimal gap */}
            <div className="mt-2 flex items-center gap-2">
              <h2 className="text-lg font-bold text-gray-900">{profile?.username}</h2>
              {isUserAdmin && (
                <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />
              )}
            </div>

            {/* Edit Profile button */}
            <button
              onClick={() => {
                setNewUsername(profile?.username || '');
                setNewBio(profile?.bio || '');
                setEditingProfile(true);
              }}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-orange-600 text-white text-sm font-medium rounded-full hover:bg-orange-700 transition-colors shadow-md"
            >
              <Edit2 className="w-4 h-4" />
              Edit Profile
            </button>
          </div>

          {/* Stats section - centered with reduced gaps */}
          <div className="px-4 py-3 border-t border-gray-200">
            <div className="flex items-center justify-center gap-8">
              <div className="text-center">
                <div className="text-lg font-bold">{posts.length}</div>
                <div className="text-xs text-gray-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{profile?.followers_count || 0}</div>
                <div className="text-xs text-gray-500">supporters</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold">{profile?.following_count || 0}</div>
                <div className="text-xs text-gray-500">supporting</div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-2 py-3">
            <Grid3x3 className="w-5 h-5 text-gray-900" />
            <span className="text-sm font-semibold uppercase tracking-wider">Posts</span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg mb-4">
              <UploadIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">No posts yet</p>
            <p className="text-gray-500">Share your first recipe!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => (
              <div
                key={post.id}
                onClick={() => setSelectedPost(post)}
                className="aspect-square bg-gray-100 overflow-hidden cursor-pointer hover:opacity-90 transition-opacity relative"
              >
                {post.image_url ? (
                  <img
                    src={post.image_url}
                    alt={post.title || 'Post'}
                    className="w-full h-full object-cover"
                  />
                ) : post.video_url ? (
                  <video
                    src={post.video_url}
                    className="w-full h-full object-cover"
                  />
                ) : null}
                {post.title && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-white text-xs font-semibold truncate">{post.title}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your username and bio
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                placeholder="Enter your username"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={newBio}
                onChange={(e) => setNewBio(e.target.value)}
                placeholder="Tell us about yourself..."
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PostDetailModal
        post={selectedPost}
        open={!!selectedPost}
        onClose={() => setSelectedPost(null)}
        onDelete={(postId) => {
          setPosts(posts.filter(p => p.id !== postId));
        }}
        onUpdate={() => {
          loadProfile();
        }}
      />
    </div>
  );
}
