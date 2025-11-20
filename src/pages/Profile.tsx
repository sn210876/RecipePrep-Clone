import { useState, useEffect } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { toast } from 'sonner';
import { Camera, Grid3x3, Upload as UploadIcon, Edit2, Crown, Trash2, ArrowLeft, Edit3 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { CommentModal } from '../components/CommentModal';
const validateUsername = (username: string): string | null => {
  const trimmed = username.trim();
  if (trimmed.length === 0) return 'Username required';
  if (trimmed.length > 10) return 'Max 10 characters';
  if (trimmed.includes(' ')) return 'No spaces allowed';
  if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) return 'Only letters, numbers, _ . allowed';
  if (/^[._]/.test(trimmed) || /[._]$/.test(trimmed)) return 'Cannot start or end with _ or .';
  return null; // valid
};
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
  likes_count?: number;
  comments_count?: number;
}

interface ProfileData {
  id: string;
  username: string;
  avatar_url: string | null;
  banner_url?: string | null;
  bio?: string | null;
  link?: string | null;
  followers_count?: number;
  following_count?: number;
}

interface ProfileProps {
  username?: string | null;
}

export function Profile({ username: targetUsername }: ProfileProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [targetUserId, setTargetUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newBio, setNewBio] = useState('');
  const [newLink, setNewLink] = useState('');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [editingPost, setEditingPost] = useState<{
  id: string;
  title: string;
  caption: string;
  recipeUrl: string;
  photoUrl: string;
} | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          toast.error('Please log in');
          window.history.pushState({}, '', '/');
          return;
        }
        setCurrentUserId(user.id);

        let profileToLoad: ProfileData | null = null;
        let userIdToLoad: string | null = null;

        if (targetUsername) {
          // Load someone else's profile by username
          const { data, error } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, banner_url, bio, link')
            .ilike('username', targetUsername)
            .single();

          if (error || !data) {
            toast.error('User not found');
            window.history.pushState({}, '', '/discover');
            setLoading(false);
            return;
          }

          profileToLoad = data;
          userIdToLoad = data.id;
        } else {
          // Load current user's profile
          const { data } = await supabase
            .from('profiles')
            .select('id, username, avatar_url, banner_url, bio, link')
            .eq('id', user.id)
            .single();

          if (!data) {
            const defaultUsername = user.email?.split('@')[0] || 'user';
            await supabase.from('profiles').insert({
              id: user.id,
              username: defaultUsername,
            });
            profileToLoad = { id: user.id, username: defaultUsername, avatar_url: null };
          } else {
            profileToLoad = data;
          }
          userIdToLoad = user.id;
        }

        setTargetUserId(userIdToLoad);
        setIsOwnProfile(user.id === userIdToLoad);

        // Fetch follower counts
        const { count: followersCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userIdToLoad);

        const { count: followingCount } = await supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userIdToLoad);

        // Check if current user is following this profile
        if (user.id !== userIdToLoad) {
          const { data: followData } = await supabase
            .from('follows')
            .select('id')
            .eq('follower_id', user.id)
            .eq('following_id', userIdToLoad)
            .maybeSingle();
          setIsFollowing(!!followData);
        }

        setProfile({
          ...profileToLoad,
          followers_count: followersCount || 0,
          following_count: followingCount || 0,
        });

        // Load posts
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, user_id, title, image_url, video_url, caption, recipe_url, recipe_id, created_at')
          .eq('user_id', userIdToLoad)
          .order('created_at', { ascending: false });

        setPosts(postsData || []);

        // Update URL if needed (for own profile)
        if (!targetUsername && profileToLoad?.username) {
          window.history.replaceState({}, '', `/profile/${profileToLoad.username}`);
        }

        setIsUserAdmin(await isAdmin());
      } catch (err) {
        toast.error('Failed to load profile');
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [targetUsername]);

  // Check for ?post= query parameter to open a specific post
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const postId = urlParams.get('post');
    if (postId) {
      setSelectedPostId(postId);
      // Clean up the URL
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    setUploading(true);
    toast.loading('Resizing & uploading avatar...', { duration: 0 });
    try {
      const resizedFile = await resizeImage(file, 1080, 1080, 0.9);
      const fileExt = resizedFile.name.split('.').pop() || 'jpg';
      const fileName = `${currentUserId}/avatar.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, resizedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl + '?t=' + Date.now() })
        .eq('id', currentUserId);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, avatar_url: publicUrl + '?t=' + Date.now() } : null);
      toast.dismiss();
      toast.success('Avatar updated instantly!');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUserId) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image');
      return;
    }
    setUploading(true);
    toast.loading('Resizing & uploading banner...', { duration: 0 });
    try {
      const resizedFile = await resizeImage(file, 1920, 600, 0.9);
      const fileExt = resizedFile.name.split('.').pop() || 'jpg';
      const fileName = `${currentUserId}/banner.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('banners')
        .upload(fileName, resizedFile, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('banners').getPublicUrl(fileName);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ banner_url: publicUrl + '?t=' + Date.now() })
        .eq('id', currentUserId);
      if (updateError) throw updateError;
      setProfile(prev => prev ? { ...prev, banner_url: publicUrl + '?t=' + Date.now() } : null);
      toast.dismiss();
      toast.success('Banner updated instantly!');
    } catch (err: any) {
      toast.dismiss();
      toast.error('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!currentUserId) return;
    await supabase.from('profiles').update({ avatar_url: null }).eq('id', currentUserId);
    setProfile(prev => prev ? { ...prev, avatar_url: null } : null);
    toast.success('Avatar removed');
  };

  const handleDeleteBanner = async () => {
    if (!currentUserId) return;
    await supabase.from('profiles').update({ banner_url: null }).eq('id', currentUserId);
    setProfile(prev => prev ? { ...prev, banner_url: null } : null);
    toast.success('Banner removed');
  };

  const handleEditProfile = async () => {
  if (!currentUserId) return;

  // Validate username
  const usernameValidationError = validateUsername(newUsername);
  if (usernameValidationError) {
    setUsernameError(usernameValidationError);
    toast.error(usernameValidationError);
    return;
  }
  setUsernameError(null);

  // Bio validation
  const lines = newBio.trim().split('\n');
  if (lines.length > 3) {
    toast.error('Maximum 3 lines allowed');
    return;
  }
  if (lines.some(line => line.length > 40)) {
    toast.error('Maximum 40 characters per line');
    return;
  }

  const updates: any = {};
  const trimmedUsername = newUsername.trim();

  if (trimmedUsername !== profile?.username) {
    updates.username = trimmedUsername;
  }
  if (newBio.trim() !== (profile?.bio || '').trim()) {
    updates.bio = newBio.trim() || null;
  }
  if (newLink.trim() !== (profile?.link || '').trim()) {
    updates.link = newLink.trim() || null;
  }

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', currentUserId);

    if (error) {
      if (error.message.includes('profiles_username_key')) {
        toast.error('Username already taken');
      } else {
        toast.error('Failed to update profile');
      }
      return;
    }

    setProfile(prev => prev ? { ...prev, ...updates } : null);
    toast.success('Profile updated!');

    if (updates.username) {
      window.history.replaceState({}, '', `/profile/${updates.username}`);
    }
  }

  setEditingProfile(false);
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

  if (!profile) {
    return <div className="text-center py-20 text-gray-500">Profile not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Back Button + Username Header */}
      {!isOwnProfile && (
        <div className="sticky top-0 bg-white border-b border-gray-200 z-40">
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">@{profile.username}</h1>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto">
        <div className="bg-white border-b border-gray-200">
          {/* Banner */}
          <div className="relative h-32">
            {profile.banner_url ? (
              <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-100 to-amber-100" />
            )}
            {isOwnProfile && (
              <label className="absolute top-2 right-2 bg-white rounded-full p-2 shadow-lg cursor-pointer hover:bg-gray-50">
                <input type="file" accept="image/*" onChange={handleBannerUpload} disabled={uploading} className="hidden" />
                <Camera className="w-4 h-4 text-gray-600" />
              </label>
            )}
          </div>

          {/* Avatar + Bio */}
          <div className="relative px-4 pb-3">
            <div className="flex items-start gap-3 -mt-10">
              <div className="flex-shrink-0">
                <div className="relative z-10 w-20 h-20">
                  {profile.avatar_url ? (
                    <img src={profile.avatar_url} alt={profile.username} className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-lg">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                  {isOwnProfile && (
                    <label className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-50 z-20">
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                      <Camera className="w-4 h-4 text-gray-700" />
                    </label>
                  )}
                </div>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-gray-900">{profile.username}</h2>
                    {isUserAdmin && <Crown className="w-5 h-5 text-yellow-500 fill-yellow-500" />}
                  </div>
                </div>
              </div>

              {/* CENTERED 3-LINE BIO */}
              <div className="flex-1 pt-11 text-center min-w-0 max-w-[60%]">
                {profile.bio ? (
                  <div className="space-y-2 mt-2">
                    {profile.bio
                      .split('\n')
                      .slice(0, 3)
                      .map((line, i) => (
                        <p key={i} className="text-sm font-medium text-gray-800 italic tracking-wide leading-snug" style={{ wordBreak: 'break-word' }}>
                          {line.slice(0, 40)}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic font-light mt-3">
                    {isOwnProfile ? 'Tap Edit Profile to add a bio' : 'No bio yet'}
                  </p>
                )}
                {profile.link && (
                  <a
                    href={profile.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-800 mt-2 block underline break-all"
                  >
                    {profile.link}
                  </a>
                )}
              </div>
            </div>

            {isOwnProfile && (
              <div className="mt-4 flex justify-center">
                <button
                  onClick={() => {
                    setNewUsername(profile.username || '');
                    setNewBio(profile.bio || '');
                    setNewLink(profile.link || '');
                    setEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 text-white font-medium rounded-full hover:bg-orange-700 shadow-md"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>

          {/* Support Button */}
          {!isOwnProfile && (
            <div className="px-4 py-3 border-t border-gray-200">
              <Button
                onClick={async () => {
                  if (!currentUserId || !targetUserId) return;
                  try {
                    if (isFollowing) {
                      await supabase
                        .from('follows')
                        .delete()
                        .eq('follower_id', currentUserId)
                        .eq('following_id', targetUserId);
                      setIsFollowing(false);
                      setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) - 1 } : null);
                      toast.success('Unsupported');
                    } else {
                      await supabase
                        .from('follows')
                        .insert({ follower_id: currentUserId, following_id: targetUserId });
                      setIsFollowing(true);
                      setProfile(prev => prev ? { ...prev, followers_count: (prev.followers_count || 0) + 1 } : null);
                      toast.success('Supporting!');
                    }
                  } catch (error) {
                    console.error('Error toggling follow:', error);
                    toast.error('Failed to update');
                  }
                }}
                className={`w-full ${isFollowing ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'}`}
              >
                {isFollowing ? 'Supporting' : 'Support'}
              </Button>
            </div>
          )}

          {/* Stats */}
          <div className="px-4 py-4 border-t border-gray-200">
            <div className="flex justify-center gap-10">
              <div className="text-center">
                <div className="text-xl font-bold">{posts.length}</div>
                <div className="text-xs text-gray-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{profile.followers_count || 0}</div>
                <div className="text-xs text-gray-500">supporters</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{profile.following_count || 0}</div>
                <div className="text-xs text-gray-500">supporting</div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Grid */}
        <div className="border-b border-gray-200 bg-white">
          <div className="flex items-center justify-center gap-2 py-3">
            <Grid3x3 className="w-5 h-5 text-gray-900" />
            <span className="text-sm font-semibold uppercase tracking-wider">Posts</span>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg mb-4">
              <UploadIcon className="w-10 h-10 text-white" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">No posts yet</p>
            <p className="text-gray-500">Share your first recipe!</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {posts.map(post => {
              let displayImageUrl = post.image_url;
              if (displayImageUrl && !displayImageUrl.includes('image-proxy')) {
                const needsProxy = displayImageUrl.includes('instagram.com') ||
                                  displayImageUrl.includes('cdninstagram.com') ||
                                  displayImageUrl.includes('fbcdn.net');
                if (needsProxy) {
                  displayImageUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(displayImageUrl)}`;
                }
              }
              return (
                <div
                  key={post.id}
                  className="aspect-square bg-gray-100 overflow-hidden cursor-pointer hover:opacity-90 relative"
                  onClick={() => setSelectedPostId(post.id)}
                >
                  {displayImageUrl ? (
                    <img
                      src={displayImageUrl}
                      alt={post.title || 'Post'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error('[Profile] Image failed to load:', displayImageUrl);
                        (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400?text=No+Image';
                      }}
                    />
                  ) : post.video_url ? (
                    <video src={post.video_url} className="w-full h-full object-cover" />
                  ) : null}
                  {post.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                      <p className="text-white text-xs font-semibold truncate">{post.title}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* EDIT DIALOG */}
      <Dialog open={editingProfile} onOpenChange={setEditingProfile}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Max 40 characters per line • Max 3 lines</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
             <div className="space-y-1">
  <Input
    id="username"
    value={newUsername}
    onChange={(e) => {
      setNewUsername(e.target.value);
      setUsernameError(null);
    }}
    placeholder="max 20 chars, no spaces"
    maxLength={20}
    className={usernameError ? 'border-red-500' : ''}
  />
  {usernameError && (
    <p className="text-xs text-red-600 font-medium">{usernameError}</p>
  )}
  <p className="text-xs text-gray-500">
    {newUsername.length}/20 • letters, numbers, _ .
  </p>
</div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="bio">Bio</Label>
                <span className={`text-xs font-medium ${newBio.length > 120 || newBio.split('\n').length > 3 ? 'text-red-600' : 'text-gray-500'}`}>
                  {newBio.length}/120 • {newBio.split('\n').length}/3 lines
                </span>
              </div>
              <Textarea
                id="bio"
                value={newBio}
                onChange={(e) => {
                  let value = e.target.value;
                  const lines = value.split('\n');
                  if (lines.length > 3) value = lines.slice(0, 3).join('\n');
                  value = value.split('\n').map(line => line.slice(0, 40)).join('\n');
                  setNewBio(value);
                }}
                placeholder="i love peegi love peegi love peegi\ni love peegi love peegi love peegi\ni love peegi love peegi snguyen7"
                className="min-h-[110px] resize-none text-center font-medium"
                rows={3}
              />
              <p className="text-xs text-gray-500 text-center -mt-2">Press Enter for new line</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="link">Link</Label>
              <Input
                id="link"
                value={newLink}
                onChange={e => setNewLink(e.target.value)}
                placeholder="https://example.com"
                type="url"
              />
            </div>
            <div className="flex gap-2">
              {profile.avatar_url && (
                <Button variant="outline" onClick={handleDeleteAvatar} disabled={uploading} className="flex-1 text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Remove Avatar
                </Button>
              )}
              {profile.banner_url && (
                <Button variant="outline" onClick={handleDeleteBanner} disabled={uploading} className="flex-1 text-red-600">
                  <Trash2 className="w-4 h-4 mr-2" /> Remove Banner
                </Button>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingProfile(false)}>Cancel</Button>
            <Button onClick={handleEditProfile}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

         {/* FULL POST VIEW MODAL WITH EDIT BUTTON */}
      {selectedPostId && (
        <Dialog open={!!selectedPostId} onOpenChange={() => setSelectedPostId(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden bg-black h-[90vh] rounded-t-3xl">
            {/* Find the actual post */}
            {(() => {
              const post = posts.find(p => p.id === selectedPostId);
              if (!post) return null;

              const isOwner = currentUserId === post.user_id;

              return (
                <>
                  {/* TOP BAR WITH BACK + EDIT */}
                  <div className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 bg-gradient-to-b from-black/70 to-transparent">
                    <button
                      onClick={() => setSelectedPostId(null)}
                      className="p-3 bg-white/20 backdrop-blur-md rounded-full"
                    >
                      <ArrowLeft className="w-6 h-6 text-white" />
                    </button>

                    {isOwner && (
                      <button
                        onClick={() => {
                          setEditingPost({
                            id: post.id,
                            title: post.title || '',
                            caption: post.caption || '',
                            recipeUrl: post.recipe_url || '',
                            photoUrl: post.image_url || post.video_url || '',
                          });
                          setSelectedPostId(null);
                        }}
                        className="p-3 bg-white/20 backdrop-blur-md rounded-full"
                      >
                        <Edit3 className="w-6 h-6 text-white" />
                      </button>
                    )}
                  </div>

                  {/* POST IMAGE/VIDEO */}
                  <div className="relative w-full h-full">
                    {post.image_url ? (
                      <img
                        src={post.image_url.includes('instagram.com') || post.image_url.includes('fbcdn.net')
                          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(post.image_url)}`
                          : post.image_url}
                        alt={post.title || ''}
                        className="w-full h-full object-contain"
                      />
                    ) : post.video_url ? (
                      <video
                        src={post.video_url}
                        controls
                        className="w-full h-full object-contain"
                      />
                    ) : null}

                    {/* TITLE & CAPTION OVERLAY */}
                    {(post.title || post.caption) && (
                      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent text-white">
                        {post.title && <h2 className="text-2xl font-bold mb-2">{post.title}</h2>}
                        {post.caption && <p className="text-lg opacity-90">{post.caption}</p>}
                      </div>
                    )}
                  </div>
                </>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}