import { useState, useEffect } from 'react';
import { supabase, isAdmin } from '../lib/supabase';
import { toast } from 'sonner';
import { Camera, Grid3x3, Upload as UploadIcon, Edit2, Crown, Trash2, ArrowLeft, Edit3, MoreVertical } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../components/ui/alert-dialog';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import CommentModal from '../components/CommentModal';
import { FollowersModal } from './FollowersModal'; // or wherever you save it


import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
// ✅ ADD THIS - Loading skeleton component
const ProfileSkeleton = () => (
  <div className="min-h-screen bg-gray-50 pb-32 overflow-x-hidden animate-pulse">
    <div className="sticky top-0 bg-white border-b border-gray-200 z-30">
      <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
        <div className="w-8 h-8 bg-gray-200 rounded-full" />
        <div className="h-4 bg-gray-200 rounded w-32" />
      </div>
    </div>
    
    <div className="max-w-lg mx-auto w-full">
      <div className="bg-white border-b border-gray-200">
        {/* Banner skeleton */}
        <div className="h-28 sm:h-32 bg-gray-200" />
        
        {/* Avatar + Bio skeleton */}
        <div className="relative px-4 pb-3">
          <div className="flex items-start gap-3 -mt-10">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-300 border-4 border-white" />
            <div className="flex-1 pt-8 sm:pt-11 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mx-auto" />
            </div>
          </div>
          <div className="mt-4 flex justify-center">
            <div className="h-10 bg-gray-200 rounded-full w-32" />
          </div>
        </div>
        
        {/* Stats skeleton */}
        <div className="px-4 py-3 sm:py-4 border-t border-gray-200">
          <div className="flex justify-center gap-8 sm:gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="text-center">
                <div className="h-6 w-12 bg-gray-200 rounded mx-auto mb-1" />
                <div className="h-3 w-16 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Posts grid skeleton */}
      <div className="border-b border-gray-200 bg-white py-3">
        <div className="h-4 w-16 bg-gray-200 rounded mx-auto" />
      </div>
      <div className="grid grid-cols-3 gap-0.5 sm:gap-1">
        {[...Array(9)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-200" />
        ))}
      </div>
    </div>
  </div>
);
// Add this NEW function right after your imports, around line 60
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
  
  return imageUrl;
}; // <-- Just ONE closing brace here
console.log('[Profile] VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);

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
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

    // ✅ REPLACE the entire useEffect with this optimized parallel loading version
useEffect(() => {
  let isMounted = true;

  const loadProfile = async () => {
    if (!isMounted) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in');
        window.history.pushState({}, '', '/');
        return;
      }

      setCurrentUserId(user.id);

      let profileToLoad: ProfileData | null = null;
      let userIdToLoad: string | null = null;

      // Determine which profile to load
      if (targetUsername) {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, avatar_url, banner_url, bio, link')
          .ilike('username', targetUsername)
          .single();

        if (!isMounted) return;

        if (error || !data) {
          if (isMounted) toast.error('User not found');
          if (isMounted) window.history.pushState({}, '', '/discover');
          if (isMounted) setLoading(false);
          return;
        }
        profileToLoad = data;
        userIdToLoad = data.id;
      } else {
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

      if (!isMounted) return;

      setTargetUserId(userIdToLoad);
      setIsOwnProfile(user.id === userIdToLoad);

      // ✅ NEW: Run all queries in parallel instead of sequentially
      const [
        followersResult,
        followingResult,
        followDataResult,
        postsResult,
        adminResult
      ] = await Promise.all([
        // Followers count
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', userIdToLoad),
        
        // Following count
        supabase
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('follower_id', userIdToLoad),
        
        // Check if current user follows this profile
        user.id !== userIdToLoad
          ? supabase
              .from('follows')
              .select('id')
              .eq('follower_id', user.id)
              .eq('following_id', userIdToLoad)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        
        // Get posts
        supabase
          .from('posts')
          .select('id, user_id, title, image_url, video_url, caption, recipe_url, recipe_id, created_at')
          .eq('user_id', userIdToLoad)
          .order('created_at', { ascending: false }),
        
        // Check admin status
        isAdmin()
      ]);

      if (!isMounted) return;

      // Set all data at once
      setIsFollowing(!!followDataResult.data);
      setPosts(postsResult.data || []);
      setIsUserAdmin(adminResult);

      setProfile({
        ...profileToLoad,
        followers_count: followersResult.count || 0,
        following_count: followingResult.count || 0,
      });

      // Update URL if viewing own profile
      if (!targetUsername && profileToLoad?.username) {
        window.history.replaceState({}, '', `/profile/${profileToLoad.username}`);
      }

    } catch (err) {
      if (isMounted) toast.error('Failed to load profile');
    } finally {
      if (isMounted) setLoading(false);
    }
  };

  loadProfile();

  return () => {
    isMounted = false;
  };
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingPost) return;

    setUploadingPhoto(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${currentUserId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      setEditingPost(prev => prev ? { ...prev, photoUrl: publicUrl } : null);
      toast.success('Photo uploaded!');
    } catch (error) {
      console.error('Upload error:', error);
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
              }
            : p
        )
      );

      toast.success('Post updated!');
      setEditingPost(null);
    } catch (error) {
      console.error('Edit error:', error);
      toast.error('Failed to update post');
    }
  };

  const handleDeletePost = async () => {
    if (!deletePostId) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', deletePostId);

      if (error) throw error;

      setPosts(prev => prev.filter(p => p.id !== deletePostId));
      toast.success('Post deleted!');
      setDeletePostId(null);
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Failed to delete post');
    }
  };

  // ✅ Show skeleton while loading
if (loading) {
  return <ProfileSkeleton />;
}
  if (!profile) {
    return <div className="text-center py-20 text-gray-500">Profile not found</div>;
  }

  return (
    <div 
      className="min-h-screen bg-gray-50 pb-32 overflow-x-hidden"
      style={{ paddingBottom: 'max(8rem, env(safe-area-inset-bottom))' }}
    >
      {/* Back Button + Username Header */}
        <div 
          className="sticky top-0 bg-white border-b border-gray-200 z-30"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
            <button onClick={() => window.history.back()} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <h1 className="text-lg font-semibold">@{profile.username}</h1>
          </div>
        </div>
      )

      <div className="max-w-lg mx-auto w-full">
        <div className="bg-white border-b border-gray-200">
          {/* Banner */}
          <div className="relative h-28 sm:h-32">
            {profile.banner_url ? (
              <img src={profile.banner_url} alt="Banner" className="w-full h-full object-cover" loading="lazy" />
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
                <div className="relative z-10 w-16 h-16 sm:w-20 sm:h-20">
                  {profile.avatar_url ? (
                    <img 
  src={profile.avatar_url} 
  alt={profile.username} 
  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-4 border-white shadow-lg" 
  loading="lazy"
/>
                  ) : (
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white text-xl sm:text-2xl font-bold border-4 border-white shadow-lg">
                      {profile.username[0].toUpperCase()}
                    </div>
                  )}
                  {isOwnProfile && (
                    <label className="absolute -bottom-1 -right-1 bg-white rounded-full p-1.5 shadow-md cursor-pointer hover:bg-gray-50 z-20">
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} disabled={uploading} className="hidden" />
                      <Camera className="w-3 h-3 sm:w-4 sm:h-4 text-gray-700" />
                    </label>
                  )}
                </div>
                <div className="mt-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">{profile.username}</h2>
                    {isUserAdmin && <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 fill-yellow-500" />}
                  </div>
                </div>
              </div>

              {/* CENTERED 3-LINE BIO */}
              <div className="flex-1 pt-8 sm:pt-11 text-center min-w-0 max-w-[60%]">
                {profile.bio ? (
                  <div className="space-y-1 sm:space-y-2 mt-2">
                    {profile.bio
                      .split('\n')
                      .slice(0, 3)
                      .map((line, i) => (
                        <p key={i} className="text-xs sm:text-sm font-medium text-gray-800 italic tracking-wide leading-snug" style={{ wordBreak: 'break-word' }}>
                          {line.slice(0, 40)}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p className="text-xs sm:text-sm text-gray-400 italic font-light mt-3">
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
              <div className="mt-4 flex justify-center px-2">
                <button
                  onClick={() => {
                    setNewUsername(profile.username || '');
                    setNewBio(profile.bio || '');
                    setNewLink(profile.link || '');
                    setEditingProfile(true);
                  }}
                  className="inline-flex items-center gap-2 px-4 sm:px-6 py-2 sm:py-2.5 bg-orange-600 text-white text-sm sm:text-base font-medium rounded-full hover:bg-orange-700 shadow-md"
                >
                  <Edit2 className="w-4 h-4" />
                  Edit Profile
                </button>
              </div>
            )}
          </div>

                       {/* Action Buttons for visiting other profiles */}
          {!isOwnProfile && (
            <div className="px-4 py-3 border-t border-gray-200">
              <div className="flex gap-2">
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
                      toast.error('Failed to update');
                    }
                  }}
                  className={`flex-1 h-10 text-sm ${isFollowing ? 'bg-gray-200 text-gray-900 hover:bg-gray-300' : 'bg-gradient-to-r from-orange-500 to-red-500 text-white hover:from-orange-600 hover:to-red-600'}`}
                >
                  {isFollowing ? 'Supporting' : 'Support'}
                </Button>

                <Button
                  onClick={() => {
                    if (profile?.username) {
                      window.location.href = `/messages?user=${profile.username}`;
                    }
                  }}
                  className="flex-1 h-10 text-sm bg-white border-2 border-gray-300 text-gray-900 hover:bg-gray-50"
                >
                  Message
                </Button>
              </div>
            </div>
          )}

          {/* Stats */}

          {/* Stats */}
          <div className="px-4 py-3 sm:py-4 border-t border-gray-200">
            <div className="flex justify-center gap-8 sm:gap-10">
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">{posts.length}</div>
                <div className="text-xs text-gray-500">posts</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">{profile.followers_count || 0}</div>
                <div className="text-xs text-gray-500">supporters</div>
              </div>
              <div className="text-center">
                <div className="text-lg sm:text-xl font-bold">{profile.following_count || 0}</div>
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
          <div className="text-center py-12 sm:py-16 px-4">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg mb-4">
              <UploadIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <p className="text-gray-900 font-semibold text-base sm:text-lg mb-2">No posts yet</p>
            <p className="text-sm sm:text-base text-gray-500">Share your first recipe!</p>
          </div>
        ) : (
         // Fixed Posts Grid rendering in Profile.tsx
<div className="grid grid-cols-3 gap-0.5 sm:gap-1">
  {posts.map(post => {
    console.log('[Profile Grid] Post ID:', post.id, 'Raw image_url:', post.image_url);

    // Get display URL with proper handling
    const displayImageUrl = getDisplayImageUrl(post.image_url);
    
    // For grid view, show first image if multiple
    let firstImageUrl = displayImageUrl;
    if (displayImageUrl) {
      try {
        const parsed = JSON.parse(displayImageUrl);
        if (Array.isArray(parsed) && parsed.length > 0) {
          firstImageUrl = getDisplayImageUrl(parsed[0]);
        }
      } catch {
        // If comma-separated, take first
        if (displayImageUrl.includes(',')) {
          const urls = displayImageUrl.split(',').map(u => u.trim());
          firstImageUrl = getDisplayImageUrl(urls[0]);
        }
      }
    }
    
    return (
      <div
        key={post.id}
        className="aspect-square bg-gray-100 overflow-hidden relative group"
      >
        <div onClick={() => setSelectedPostId(post.id)} className="cursor-pointer hover:opacity-90 w-full h-full">
          {firstImageUrl ? (
            <img
              src={firstImageUrl}
              alt={post.title || 'Post'}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                console.error('[Profile] Image failed to load:', firstImageUrl);
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                // Show placeholder
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = '<div class="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">No image</div>';
                }
              }}
            />
          ) : post.video_url ? (
            <video src={post.video_url} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
              No media
            </div>
          )}
          {post.title && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
              <p className="text-white text-xs font-semibold truncate">{post.title}</p>
            </div>
          )}
        </div>

        {(isOwnProfile || isUserAdmin) && (
          <div className="absolute top-2 right-2 z-10" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 bg-black/50 hover:bg-black/70 rounded-full backdrop-blur-sm">
                  <MoreVertical className="w-4 h-4 text-white" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => {
                    setEditingPost({
                      id: post.id,
                      title: post.title || '',
                      caption: post.caption || '',
                      recipeUrl: post.recipe_url || '',
                      photoUrl: post.image_url || post.video_url || ''
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>Max 40 characters per line • Max 3 lines</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 sm:space-y-5 py-4">
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

      {selectedPostId && (
        <Dialog open={!!selectedPostId} onOpenChange={() => setSelectedPostId(null)}>
          <DialogContent className="max-w-lg p-0 overflow-hidden bg-black relative max-h-[90vh]">
            <CommentModal
              postId={selectedPostId}
              isOpen={true}
              onClose={() => setSelectedPostId(null)}
            />

            {/* Edit and Delete buttons - layered on top with high z-index */}
            <div className="absolute inset-x-0 top-0 z-[100] flex items-center justify-between px-4 pt-4 pb-6 pointer-events-none">
              <button
                onClick={() => setSelectedPostId(null)}
                className="pointer-events-auto p-2 sm:p-3 bg-black/50 backdrop-blur-md hover:bg-black/70 rounded-full transition-all shadow-lg"
              >
                <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </button>

              {(isOwnProfile || isUserAdmin) && currentUserId === posts.find(p => p.id === selectedPostId)?.user_id && (
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const post = posts.find(p => p.id === selectedPostId);
                      if (post) {
                        setEditingPost({
                          id: post.id,
                          title: post.title || '',
                          caption: post.caption || '',
                          recipeUrl: post.recipe_url || '',
                          photoUrl: post.image_url || post.video_url || '',
                        });
                      }
                      setSelectedPostId(null);
                    }}
                    className="pointer-events-auto p-2 sm:p-3 bg-black/50 backdrop-blur-md hover:bg-orange-600/70 rounded-full transition-all shadow-lg"
                    title="Edit post"
                  >
                    <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>

                  <button
                    onClick={() => {
                      setDeletePostId(selectedPostId);
                      setSelectedPostId(null);
                    }}
                    className="pointer-events-auto p-2 sm:p-3 bg-black/50 backdrop-blur-md hover:bg-red-600/70 rounded-full transition-all shadow-lg"
                    title="Delete post"
                  >
                    <Trash2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                  </button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Post Dialog */}
      <AlertDialog open={!!editingPost} onOpenChange={(open) => !open && setEditingPost(null)}>
        <AlertDialogContent className="max-h-[85vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle>Edit post</AlertDialogTitle>
            <AlertDialogDescription>
              Update your caption and recipe link.
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
            <div>
              <label className="text-sm font-medium mb-2 block">Change Photo/Video (Upload from device)</label>
              <input
                type="file"
                accept="image/*,video/*"
                onChange={handlePhotoUpload}
                disabled={uploadingPhoto}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {uploadingPhoto && <p className="text-sm text-gray-500 mt-1">Uploading...</p>}
              {editingPost?.photoUrl && (
               <img
  src={editingPost.photoUrl}
  alt="Preview"
  className="mt-2 w-32 h-32 object-cover rounded-lg"
  loading="lazy"
/>
              )}
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleEditPost} className="bg-orange-600 hover:bg-orange-700">
              Save changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Post Confirmation Dialog */}
      <AlertDialog open={!!deletePostId} onOpenChange={(open) => !open && setDeletePostId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete post</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this post? This action cannot be undone.
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
    </div>
  );
}