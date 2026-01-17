import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music, Play, Pause, Camera as CameraIcon } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
import React from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { compressMultipleImages, isImageFile, formatFileSize } from '../lib/imageCompression';
import { compressVideo, isVideoFile, getVideoInfo } from '../lib/videoCompression';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

interface UploadProps {
  onNavigate: (page: string) => void;
}

interface UserRecipe {
  id: string;
  title: string;
  image_url: string;
}

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [postType, setPostType] = useState<'post' | 'daily'>('post');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // Component mount/unmount tracking and restore pending uploads
  useEffect(() => {
    const mountTime = Date.now();
    console.log('🚀 Upload component MOUNTED at', mountTime);

    // Check for pending upload that was interrupted by unmount
    const checkPendingUpload = async () => {
      try {
        const { value } = await Preferences.get({ key: 'pending_upload_webpath' });
        if (value) {
          console.log('🔄 Found pending upload, restoring...');
          const pendingData = JSON.parse(value);

          // Show loading toast
          const toastId = toast.loading('Loading photo...', { duration: 0 });

          try {
            // Fetch the image from the cached webPath
            console.log('🔄 Fetching from webPath:', pendingData.webPath);
            const response = await fetch(pendingData.webPath);

            if (!response.ok) {
              throw new Error('Failed to load cached image');
            }

            const blob = await response.blob();
            const file = new File(
              [blob],
              `photo-${pendingData.timestamp}.${pendingData.format}`,
              { type: pendingData.mimeType }
            );

            console.log('🗜️ Compressing restored image...');
            const compressedResults = await compressMultipleImages([file]);
            const compressedFile = compressedResults[0].file;

            const previewUrl = URL.createObjectURL(compressedFile);

            setSelectedFiles([compressedFile]);
            setPreviewUrls([previewUrl]);
            setFileType('image');

            // Clear the pending upload
            await Preferences.remove({ key: 'pending_upload_webpath' });

            console.log('✅ Restored and compressed pending upload');
            toast.success('Photo loaded!', { id: toastId });
          } catch (error) {
            console.error('❌ Failed to restore pending upload:', error);
            toast.error('Failed to load photo', { id: toastId });
            await Preferences.remove({ key: 'pending_upload_webpath' });
          }
        }
      } catch (error) {
        console.error('❌ Error checking for pending upload:', error);
        await Preferences.remove({ key: 'pending_upload_webpath' });
      }
    };

    checkPendingUpload();

    return () => {
      console.log('💀 Upload component UNMOUNTED at', Date.now(), 'lived for', Date.now() - mountTime, 'ms');
    };
  }, []);

  // Track state changes
  useEffect(() => {
    console.log('📊 State changed - selectedFiles:', selectedFiles.length, 'previewUrls:', previewUrls.length, 'fileType:', fileType);
  }, [selectedFiles, previewUrls, fileType]);

  // Music states
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchingMusic, setSearchingMusic] = useState(false);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const audioPreviewRef = React.useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadUserRecipes();
  }, []);

  const loadUserRecipes = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;
      const { data: recipes, error } = await supabase
        .from('public_recipes')
        .select('id, title, image_url')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setUserRecipes(recipes || []);
    } catch (error: any) {
      console.error('Error loading recipes:', error);
    }
  };
const getVideoDuration = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      window.URL.revokeObjectURL(video.src);
      const duration = Math.floor(video.duration);
      
      if (isNaN(duration) || duration === 0) {
        reject(new Error('Invalid video duration'));
      } else {
        resolve(duration);
      }
    };

    video.onerror = () => {
      window.URL.revokeObjectURL(video.src);
      reject(new Error('Failed to load video metadata'));
    };

    video.src = URL.createObjectURL(file);
  });
};
 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
  console.log('🔍 File select triggered');
  console.log('📱 Platform:', Capacitor.getPlatform());
  const files = Array.from(e.target.files || []);
  console.log('📁 Selected files count:', files.length);

  if (files.length === 0) {
    console.log('⚠️ No files selected');
    return;
  }

  console.log('📝 File details:', files.map(f => ({
    name: f.name,
    size: f.size,
    type: f.type,
  })));

  // Filter for images and videos
  const allMediaFiles = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'));
  console.log('🎯 Media files after filter:', allMediaFiles.length);

  if (allMediaFiles.length === 0) {
    console.log('❌ No valid media files');
    toast.error('Please select at least one image or video');
    return;
  }

  // Limit to 4 total media files
  if (allMediaFiles.length > 4) {
    toast.error('You can only upload up to 4 images/videos total');
    return;
  }

  console.log('✅ Processing', allMediaFiles.length, 'media files');

  const validFiles: File[] = [];
  const validPreviews: string[] = [];
  let hasVideo = false;

  const imageFiles: File[] = [];
  const videoFiles: File[] = [];

  for (const file of allMediaFiles) {
    const isImage = isImageFile(file);
    const isVideo = file.type.startsWith('video/');

    if (isImage) {
      imageFiles.push(file);
    } else if (isVideo) {
      if (file.size > 100 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 100MB for videos)`);
        continue;
      }

      try {
        const duration = await getVideoDuration(file);

        if (postType === 'daily' && duration > 30) {
          toast.error(`${file.name}: Daily videos must be 30 seconds or less`);
          continue;
        }

        hasVideo = true;
        videoFiles.push(file);
      } catch (error) {
        console.error('Video load error:', error);
        toast.error(`Failed to load ${file.name}`);
        continue;
      }
    }
  }

  if (imageFiles.length > 0) {
    const toastId = toast.loading('Compressing images...', { duration: 0 });

    try {
      console.log('🗜️ Starting compression for', imageFiles.length, 'images');
      const compressedResults = await compressMultipleImages(imageFiles, (index, total, progress) => {
        if (progress.isCompressing) {
          console.log(`Compressing ${index + 1}/${total}: ${Math.round(progress.percent)}%`);
          toast.loading(
            `Compressing image ${index + 1}/${total}... ${Math.round(progress.percent)}%`,
            { id: toastId, duration: 0 }
          );
        }
      });

      console.log('✅ Compression complete:', compressedResults);
      const totalSaved = compressedResults.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0);

      toast.success(
        `Images compressed! Saved ${formatFileSize(totalSaved)}`,
        { id: toastId, duration: 3000 }
      );

      for (const result of compressedResults) {
        validFiles.push(result.file);
        const blobUrl = URL.createObjectURL(result.file);
        console.log('📸 Created preview URL:', blobUrl);
        validPreviews.push(blobUrl);
      }
    } catch (error: any) {
      console.error('❌ Compression error:', error);
      toast.error(error.message || 'Failed to compress images', { id: toastId });
      return;
    }
  }

  for (const file of videoFiles) {
    validFiles.push(file);
    validPreviews.push(URL.createObjectURL(file));
  }

  if (validFiles.length === 0) {
    console.log('❌ No valid files to upload');
    toast.error('No valid files to upload');
    return;
  }

  console.log('✅ Setting state with', validFiles.length, 'files');
  console.log('📸 Preview URLs:', validPreviews);
  setSelectedFiles(validFiles);
  setPreviewUrls(validPreviews);
  setFileType(hasVideo ? 'video' : 'image');
  console.log('✅ State updated successfully');
};

    
  // ✅ Better file type validation
 

 const handleClearImage = async () => {
  previewUrls.forEach(url => URL.revokeObjectURL(url));
  setSelectedFiles([]);
  setPreviewUrls([]);
  setFileType(null);
  // Clear any pending upload
  await Preferences.remove({ key: 'pending_upload_webpath' });
};

const handleCapacitorCamera = async (source: CameraSource) => {
  const loadingToastId = toast.loading(
    source === CameraSource.Camera ? 'Opening camera...' : 'Opening gallery...',
    { duration: 0 }
  );

  try {
    console.log('📸 handleCapacitorCamera called with source:', source);

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: source,
      saveToGallery: source === CameraSource.Camera,
    });

    console.log('✅ Camera.getPhoto succeeded:', {
      hasWebPath: !!image.webPath,
      hasPath: !!image.path,
      format: image.format
    });

    toast.loading('Processing image...', { id: loadingToastId });

    if (!image.webPath) {
      console.error('❌ No webPath in image result');
      toast.error('Failed to get image path', { id: loadingToastId });
      return;
    }

    console.log('🔄 Fetching image from webPath:', image.webPath);
    const response = await fetch(image.webPath);

    if (!response.ok) {
      console.error('❌ Fetch failed:', response.status, response.statusText);
      toast.error('Failed to load image from device', { id: loadingToastId });
      return;
    }

    const blob = await response.blob();
    console.log('✅ Blob created:', { size: blob.size, type: blob.type });

    let mimeType = blob.type;
    if (!mimeType || mimeType === 'application/octet-stream') {
      const format = image.format || 'jpeg';
      mimeType = `image/${format}`;
      console.log('⚠️ Blob type was empty/generic, using format:', mimeType);
    }

    const file = new File([blob], `photo-${Date.now()}.${image.format || 'jpg'}`, {
      type: mimeType
    });
    console.log('✅ File created:', { name: file.name, size: file.size, type: file.type });

    console.log('💾 Saving to Preferences for recovery...');
    await Preferences.set({
      key: 'pending_upload_webpath',
      value: JSON.stringify({
        webPath: image.webPath,
        format: image.format || 'jpeg',
        mimeType: mimeType,
        timestamp: Date.now()
      })
    });

    toast.loading('Compressing image...', { id: loadingToastId });

    try {
      console.log('🗜️ Starting compression...');
      const compressedResults = await compressMultipleImages([file]);
      const compressedFile = compressedResults[0].file;
      console.log('✅ Compression complete:', { size: compressedFile.size });

      const previewUrl = URL.createObjectURL(compressedFile);
      console.log('✅ Preview URL created:', previewUrl);

      console.log('🔧 Setting state immediately...');
      setSelectedFiles([compressedFile]);
      setPreviewUrls([previewUrl]);
      setFileType('image');
      console.log('✅ State updated successfully');

      await Preferences.remove({ key: 'pending_upload_webpath' });

      toast.success(
        source === CameraSource.Camera ? 'Photo captured!' : 'Photo selected!',
        { id: loadingToastId }
      );
    } catch (error: any) {
      console.error('❌ Compression error:', error);
      toast.error(error.message || 'Failed to compress image', { id: loadingToastId });
      await Preferences.remove({ key: 'pending_upload_webpath' });
    }
  } catch (error: any) {
    console.error('❌ Camera/Gallery error:', error);
    if (error.message !== 'User cancelled photos app') {
      toast.error(
        `Failed to ${source === CameraSource.Camera ? 'capture photo' : 'select from gallery'}`,
        { id: loadingToastId }
      );
    } else {
      toast.dismiss(loadingToastId);
    }
  }
};

const handleTakePhoto = () => {
  if (Capacitor.isNativePlatform()) {
    handleCapacitorCamera(CameraSource.Camera);
  } else {
    toast.info('Camera only available on mobile app');
  }
};

const handlePickFromGallery = () => {
  console.log('📷 From Gallery button clicked');
  console.log('📱 Platform:', Capacitor.getPlatform());
  console.log('📱 Is Native:', Capacitor.isNativePlatform());

  if (Capacitor.isNativePlatform()) {
    console.log('✅ On native platform - using Capacitor Camera with Photos source');
    handleCapacitorCamera(CameraSource.Photos);
  } else {
    console.log('✅ On web platform - triggering file input');
    if (fileInputRef.current) {
      console.log('✅ File input ref exists, clicking...');
      fileInputRef.current.click();
    } else {
      console.error('❌ File input ref is null!');
    }
  }
};


  const togglePreview = () => {
    if (audioPreviewRef.current) {
      if (isPlayingPreview) {
        audioPreviewRef.current.pause();
      } else {
        audioPreviewRef.current.play();
      }
      setIsPlayingPreview(!isPlayingPreview);
    }
  };

  // iTunes API search (free, no auth needed)
  const searchMusic = async (query: string) => {
    if (!query.trim()) {
      setMusicResults([]);
      return;
    }
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
      );
      const data = await res.json();

      const tracks = (data.results || []).map((t: any) => ({
        id: t.trackId.toString(),
        name: t.trackName || 'Unknown Song',
        artists: [{ name: t.artistName || 'Unknown Artist' }],
        album: { 
          images: [{ url: t.artworkUrl100?.replace('100x100', '300x300') || 'https://via.placeholder.com/300' }] 
        },
        preview_url: t.previewUrl || null,
      }));

      setMusicResults(tracks);
    } catch (err) {
      console.error('Music search failed:', err);
      toast.error('Search failed — try again');
      setMusicResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };

  const handleUpload = async () => {
if (selectedFiles.length === 0) {      toast.error('Please select an image or video');
      return;
    }
    if (postType === 'post' && !title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (postType === 'daily' && fileType === 'video' && videoDuration > 30) {
      toast.error('Daily videos must be 30 seconds or less');
      return;
    }

    setUploading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Not authenticated');

      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: userData.user.id,
          username: userData.user.email?.split('@')[0] || 'user',
          avatar_url: null,
        });
      }

      const toastId = toast.loading('Preparing files...', { duration: 0 });
      const uploadedImageUrls: string[] = [];
      const uploadedVideoUrls: string[] = [];

      const imageFiles = selectedFiles.filter(isImageFile);
      const videoFiles = selectedFiles.filter(isVideoFile);

      let compressedImages: File[] = [];
      if (imageFiles.length > 0) {
        toast.loading(`Compressing ${imageFiles.length} image(s)...`, { id: toastId });
        const results = await compressMultipleImages(imageFiles);
        compressedImages = results.map(r => r.file);
        const totalSaved = results.reduce((sum, r) => sum + (r.originalSize - r.compressedSize), 0);
        console.log(`Images compressed: saved ${formatFileSize(totalSaved)}`);
      }

      const allFilesToUpload = [...compressedImages, ...videoFiles];
      const totalFiles = allFilesToUpload.length;
      let completedUploads = 0;

      toast.loading(`Uploading ${totalFiles} file(s)...`, { id: toastId });

      const uploadPromises = allFilesToUpload.map(async (fileToUpload) => {
        const fileExt = fileToUpload.name.split('.').pop()?.toLowerCase();
        const fileName = `${userData.user.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(fileName, fileToUpload, { cacheControl: '3600', upsert: false });

        if (uploadError) throw uploadError;

        completedUploads++;
        toast.loading(`Uploaded ${completedUploads}/${totalFiles} file(s)...`, { id: toastId });

        const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);

        return {
          url: urlData.publicUrl,
          isVideo: isVideoFile(fileToUpload)
        };
      });

      const uploadResults = await Promise.all(uploadPromises);

      uploadResults.forEach(result => {
        if (result.isVideo) {
          uploadedVideoUrls.push(result.url);
        } else {
          uploadedImageUrls.push(result.url);
        }
      });

      toast.success('Upload complete!', { id: toastId });

// Format URLs as JSON arrays if multiple, or single string if one
const imageUrlForDb = uploadedImageUrls.length > 1
  ? JSON.stringify(uploadedImageUrls)
  : uploadedImageUrls.length === 1
    ? uploadedImageUrls[0]
    : null;

const videoUrlForDb = uploadedVideoUrls.length > 1
  ? JSON.stringify(uploadedVideoUrls)
  : uploadedVideoUrls.length === 1
    ? uploadedVideoUrls[0]
    : null;

// For dailies/single file posts, use the first uploaded file
const mainImageUrl = uploadedImageUrls[0] || uploadedVideoUrls[0];

      // Music data for both posts & dailies
      const musicData: any = {
        spotify_track_id: selectedTrack?.id || null,
        spotify_track_name: selectedTrack?.name || null,
        spotify_artist_name: selectedTrack?.artists?.[0]?.name || null,
        spotify_album_art: selectedTrack?.album?.images?.[0]?.url || null,
        spotify_preview_url: selectedTrack?.preview_url || null,
      };

      if (postType === 'daily') {
        const dailyData: any = {
          user_id: userData.user.id,
          media_url: mainImageUrl,
          media_type: fileType === 'image' ? 'photo' : 'video',
          caption: caption.trim() || null,
          duration: fileType === 'video' ? videoDuration : null,
          ...musicData,
        };

        const { error: insertError } = await supabase.from('dailies').insert(dailyData);
        if (insertError) throw insertError;

        await supabase.from('posts').insert({
          user_id: userData.user.id,
          title: 'Daily',
          caption: caption.trim() || null,
          [fileType === 'image' ? 'image_url' : 'video_url']: mainImageUrl,
          ...musicData,
        });

        toast.success('Daily posted successfully!');
      } else {
        let recipeLink = selectedRecipeId
          ? `${window.location.origin}/#recipe/${selectedRecipeId}`
          : null;

        const postData: any = {
          user_id: userData.user.id,
          title: title.trim(),
          caption: caption.trim() || null,
          recipe_url: recipeLink,
          image_url: imageUrlForDb,
          video_url: videoUrlForDb,
          ...musicData,
        };

        const { data: newPost, error: insertError } = await supabase
          .from('posts')
          .insert(postData)
          .select()
          .single();
        if (insertError) throw insertError;

        const hashtagTexts = extractHashtags(caption);
        if (hashtagTexts.length > 0 && newPost) {
          await supabase.rpc('process_post_hashtags', {
            p_post_id: newPost.id,
            p_hashtags: hashtagTexts
          });
        }

        toast.success('Post uploaded successfully!');
      }
handleClearImage();
setTitle('');
setCaption('');
setSelectedRecipeId('');
setSelectedTrack(null);

// Properly navigate to discover with clean URL
window.history.replaceState({}, '', '/discover');
onNavigate('discover');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload');
    } finally {
      setUploading(false);
    }
  };

  console.log('🔄 Upload component render:', JSON.stringify({
    previewUrlsCount: previewUrls.length,
    selectedFilesCount: selectedFiles.length,
    fileType,
    previewUrls: previewUrls.slice(0, 2), // Log first 2 to avoid spam
  }));

  return (
    <div className="fixed inset-0 z-50 bg-black/50 md:bg-transparent md:relative">
      <div
        className="absolute inset-x-0 bottom-0 md:relative md:inset-auto bg-gray-50 md:min-h-screen overflow-hidden md:overflow-visible rounded-t-3xl md:rounded-none shadow-2xl md:shadow-none pb-safe"
        style={{
          maxHeight: window.innerWidth >= 768 ? 'none' : '90vh',
          paddingBottom: 'max(10rem, env(safe-area-inset-bottom))'
        }}
      >
        {/* Grabber handle - mobile only */}
        <div className="flex md:hidden items-center justify-center pt-3 pb-2 bg-white">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        <div
          className="sticky top-0 bg-white border-b border-gray-200 z-20"
          style={{ paddingTop: 'env(safe-area-inset-top)' }}
        >
          <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                onNavigate('discover');
              }}
              className="text-gray-600 hover:text-gray-900 font-medium active:scale-95 transition-transform"
            >
              Cancel
            </button>
            <h1 className="text-lg font-semibold">New {postType === 'daily' ? 'Daily' : 'Post'}</h1>
            <div className="w-16"></div>
          </div>
        </div>

        {/* Scrollable content container */}
        <div className="overflow-y-auto max-h-[calc(90vh-4rem)] md:overflow-visible md:max-h-none overscroll-contain">
          <div className="max-w-lg mx-auto p-4 space-y-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <label className="text-sm font-medium text-gray-700 mb-2 block">Post Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setPostType('post')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                postType === 'post'
                  ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Post
            </button>
            <button
              onClick={() => setPostType('daily')}
              className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
                postType === 'daily'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Daily
            </button>
          </div>
          {postType === 'daily' && (
            <p className="text-xs text-gray-500 mt-2">
              Dailies expire after 24 hours. Videos must be 30 seconds or less.
            </p>
          )}
        </div>

{previewUrls.length === 0 ? (
          <div className="space-y-3">
            {Capacitor.isNativePlatform() && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={handleTakePhoto}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-500 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-2xl shadow-lg mx-auto">
                      <CameraIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">Take Photo</p>
                      <p className="text-xs text-gray-500">Use camera</p>
                    </div>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={handlePickFromGallery}
                  className="border-2 border-dashed border-gray-300 rounded-xl p-6 hover:border-orange-500 transition-colors"
                >
                  <div className="space-y-3">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg mx-auto">
                      <ImageIcon className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">From Gallery</p>
                      <p className="text-xs text-gray-500">Choose photo</p>
                    </div>
                  </div>
                </button>
              </div>
            )}
            <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center hover:border-orange-500 transition-colors cursor-pointer">
              <label className="cursor-pointer">
        <input
    ref={fileInputRef}
    type="file"
    accept="image/*,video/*"
    multiple
    onChange={handleFileSelect}
    className="hidden"
  />
                <div className="space-y-4">
                  <div className="flex gap-3 sm:gap-4 justify-center">
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-lg">
                      <ImageIcon className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                      <Video className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-base sm:text-lg font-semibold text-gray-900 mb-1">
                      {Capacitor.isNativePlatform() ? 'Or select files' : 'Upload a photo or video'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500">
                      {Capacitor.isNativePlatform() ? 'Browse your files' : 'Click to select a file from your device'}
                    </p>
                  </div>
                </div>
              </label>
            </div>
          </div>
    ) : (
  <div className="space-y-2">
    {(() => {
      console.log('📊 About to render previews. previewUrls.length:', previewUrls.length, 'selectedFiles.length:', selectedFiles.length);
      return null;
    })()}
    {previewUrls.map((url, index) => {
      const file = selectedFiles[index];
      const isVideo = file?.type.startsWith('video/');

      console.log(`🖼️ Rendering preview ${index}:`, JSON.stringify({
        url: url.substring(0, 50),
        isVideo,
        fileType: file?.type,
        fileName: file?.name,
        fileSize: file?.size
      }));

      return (
        <div key={index} className="relative">
          {isVideo ? (
            <video
              src={url}
              controls
              className="w-full max-h-64 object-cover rounded-xl"
              onError={(e) => {
                console.error('❌ Video failed to load:', e);
                toast.error('Failed to load video preview');
              }}
            />
          ) : (
            <img
              src={url}
              alt={`Preview ${index + 1}`}
              className="w-full max-h-64 object-cover rounded-xl"
              onLoad={() => console.log('✅ Image preview loaded successfully')}
              onError={(e) => {
                console.error('❌ Image failed to load:', e);
                toast.error('Failed to load image preview');
              }}
            />
          )}
          <button
            onClick={handleClearImage}
            className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      );
    })}
    {selectedFiles.length < 4 && (
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    const remainingSlots = 4 - selectedFiles.length;
                    const newFiles = files.slice(0, remainingSlots);
                    
                    const validFiles: File[] = [];
                    const validPreviews: string[] = [];
                    
                    for (const file of newFiles) {
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
                      setSelectedFiles([...selectedFiles, ...validFiles]);
                      setPreviewUrls([...previewUrls, ...validPreviews]);
                      toast.success(`Added ${validFiles.length} image${validFiles.length > 1 ? 's' : ''}`);
                    }
                  }}
                  className="hidden" 
                />
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-orange-500 transition-colors">
                  <ImageIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm font-medium text-gray-600">Add More Photos</p>
                  <p className="text-xs text-gray-400 mt-1">{selectedFiles.length}/4 selected</p>
                </div>
              </label>
            )}
          </div>
        )}
       

        {/* Music Section */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Add Music (optional)</label>
            <button
              onClick={() => setShowMusicPicker(true)}
              className="text-sm font-medium text-orange-600 hover:text-orange-700 flex items-center gap-1.5"
            >
              <Music className="w-5 h-5" />
              {selectedTrack ? 'Change Music' : 'Add Music'}
            </button>
          </div>

          {selectedTrack && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
              <img
                src={selectedTrack.album.images[0]?.url}
                loading="lazy"
                decoding="async"
                alt="album"
                className="w-12 h-12 rounded object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{selectedTrack.name}</p>
                <p className="text-xs text-gray-600 truncate">{selectedTrack.artists[0].name}</p>
              </div>
              <button 
                onClick={togglePreview}
                className="bg-green-600 hover:bg-green-700 text-white rounded-full p-2 transition-colors"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
              <button onClick={() => setSelectedTrack(null)} className="text-red-600">
                <X className="w-5 h-5" />
              </button>
              <audio
                ref={audioPreviewRef}
                src={selectedTrack.preview_url}
                onEnded={() => setIsPlayingPreview(false)}
                onPlay={() => setIsPlayingPreview(true)}
                onPause={() => setIsPlayingPreview(false)}
              />
            </div>
          )}
        </div>

        <div className="space-y-4 bg-white rounded-xl p-4 shadow-sm">
          {postType === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter a title for your post"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                maxLength={200}
              />
              <p className="text-xs text-gray-400 mt-1">{title.length}/200</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Caption</label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption..."
              className="min-h-24 resize-none"
              maxLength={2200}
            />
            <p className="text-xs text-gray-400 mt-1">{caption.length}/2200</p>
          </div>

          {postType === 'post' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Link to Recipe (optional)
              </label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a recipe from your collection" />
                </SelectTrigger>
                <SelectContent>
                  {userRecipes.length === 0 ? (
                    <div className="p-4 text-center text-sm text-gray-500">
                      No recipes yet. Add some recipes first!
                    </div>
                  ) : (
                    userRecipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        <div className="flex items-center gap-2">
                          {recipe.image_url && (
                            <img src={recipe.image_url} alt={recipe.title} className="w-8 h-8 rounded object-cover" loading="lazy" decoding="async" />
                          )}
                          <span>{recipe.title}</span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

{selectedFiles.length > 0 && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <UploadIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-900">Ready to post</p>
<p className="text-xs text-orange-700 mt-1 truncate">
  {selectedFiles.length} image{selectedFiles.length > 1 ? 's' : ''} selected
</p>              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit Button at Bottom */}
   <div 
  className="fixed left-0 right-0 px-4 pb-6 bg-gradient-to-t from-white via-white to-transparent z-[60] lg:z-10 lg:bottom-0"
  style={{ 
    bottom: '80px',
    paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))'
  }}
>
        <div className="max-w-lg mx-auto flex justify-center">
          <Button
            onClick={handleUpload}
disabled={selectedFiles.length === 0 || (postType === 'post' && !title.trim()) || uploading}
            className="px-12 sm:px-16 py-5 sm:py-6 text-base sm:text-lg font-semibold bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 shadow-lg rounded-full"
          >
            {uploading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
        </div>
      </div>

      {/* Music Picker Modal */}
      {showMusicPicker && (
  <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div
            className="bg-white w-full md:max-w-lg rounded-2xl flex flex-col"
            style={{
              maxHeight: '85vh',
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <h3 className="font-semibold text-lg">Choose Music</h3>
              <button onClick={() => setShowMusicPicker(false)}>
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 flex-shrink-0">
              <input
                type="text"
                value={musicSearch}
                onChange={(e) => {
                  setMusicSearch(e.target.value);
                  searchMusic(e.target.value);
                }}
                placeholder="Search any song..."
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
              {searchingMusic && <p className="text-center text-gray-500 py-8">Searching...</p>}
              {musicResults.map((track) => (
                <button
                  key={track.id}
                  onClick={() => {
                    setSelectedTrack(track);
                    setShowMusicPicker(false);
                    toast.success('Music added!');
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-gray-100 transition text-left"
                >
                  <img
                    src={track.album.images[0]?.url || '/placeholder.png'}
                    loading="lazy"
                    decoding="async"
                    alt="album"
                    className="w-12 h-12 rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{track.name}</p>
                    <p className="text-xs text-gray-600 truncate">
                      {track.artists.map((a: any) => a.name).join(', ')}
                    </p>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex-shrink-0">30s Preview</span>
                </button>
              ))}
              {musicSearch && musicResults.length === 0 && !searchingMusic && (
                <p className="text-center text-gray-500 py-8">No tracks found</p>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}