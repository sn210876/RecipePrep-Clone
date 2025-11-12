import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { Camera, Grid3x3, LogOut, Upload as UploadIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface Post {
  id: string;
  title: string;
  image_url: string | null;
  video_url: string | null;
  caption: string | null;
  created_at: string;
}

interface Profile {
  username: string;
  avatar_url: string | null;
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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      setUserId(userData.user.id);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('username, avatar_url')
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
        .select('id, title, image_url, video_url, caption, created_at')
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
          <h1 className="text-lg font-semibold">{profile?.username}</h1>
          <button
            onClick={handleLogout}
            className="text-gray-600 hover:text-gray-900 p-2"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto">
        <div className="bg-white border-b border-gray-200 p-6">
          <div className="flex items-center gap-6 mb-6">
            <div className="relative">
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
                  {profile?.username?.[0]?.toUpperCase()}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white rounded-full p-1.5 shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                  className="hidden"
                />
                <Camera className="w-4 h-4 text-gray-600" />
              </label>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-8">
                <div className="text-center">
                  <div className="text-xl font-bold">{posts.length}</div>
                  <div className="text-sm text-gray-500">posts</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile?.followers_count || 0}</div>
                  <div className="text-sm text-gray-500">pals</div>
                </div>
                <div className="text-center">
                  <div className="text-xl font-bold">{profile?.following_count || 0}</div>
                  <div className="text-sm text-gray-500">following</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className="font-semibold text-gray-900">{profile?.username}</p>
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
    </div>
  );
}
