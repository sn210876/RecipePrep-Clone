// src/lib/imageUtils.ts

import { supabase } from './supabase';

/**
 * Downloads an external image URL and uploads it to Supabase Storage
 * This prevents issues with expiring CDN URLs (Instagram, etc.)
 */
export async function reuploadExternalImage(
  imageUrl: string,
  userId: string
): Promise<string | null> {
  try {
    console.log('[Image Reupload] Starting reupload for:', imageUrl);

    // Check if it's already a Supabase storage URL
    if (imageUrl.includes('vohvdarghgqskzqjclux.supabase.co/storage')) {
      console.log('[Image Reupload] Already a Supabase URL, skipping');
      return imageUrl;
    }

    // Step 1: Download the image through your proxy
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    const proxyUrl = `https://vohvdarghgqskzqjclux.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    
    console.log('[Image Reupload] Downloading from proxy...');
    const response = await fetch(proxyUrl);
    
    if (!response.ok) {
      console.error('[Image Reupload] Failed to download:', response.status);
      return null;
    }

    // Step 2: Get the image as a blob
    const blob = await response.blob();
    console.log('[Image Reupload] Downloaded blob:', blob.size, 'bytes', blob.type);

    // Step 3: Determine file extension from content type
    const contentType = blob.type || 'image/jpeg';
    const extension = contentType.split('/')[1] || 'jpg';
    
    // Step 4: Generate a unique filename
    const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${extension}`;
    
    console.log('[Image Reupload] Uploading to Supabase Storage:', fileName);

    // Step 5: Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(fileName, blob, {
        contentType,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[Image Reupload] Upload failed:', uploadError);
      return null;
    }

    // Step 6: Get the public URL
    const { data: urlData } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);

    console.log('[Image Reupload] Success! New URL:', urlData.publicUrl);
    return urlData.publicUrl;

  } catch (error) {
    console.error('[Image Reupload] Exception:', error);
    return null;
  }
}

/**
 * Processes multiple image URLs (for multi-image posts)
 */
export async function reuploadMultipleImages(
  imageUrls: string[],
  userId: string
): Promise<string[]> {
  const reuploaded: string[] = [];
  
  for (const url of imageUrls) {
    const newUrl = await reuploadExternalImage(url, userId);
    if (newUrl) {
      reuploaded.push(newUrl);
    } else {
      // If reupload fails, keep original URL as fallback
      console.warn('[Image Reupload] Failed to reupload, keeping original:', url);
      reuploaded.push(url);
    }
  }
  
  return reuploaded;
}

/**
 * SIMPLIFIED: Now that we auto-reupload, this function is simpler
 * All images should be Supabase Storage URLs
 */
export const getProxiedImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) {
    console.log('[imageUtils] ⚠️ No image URL provided');
    return undefined;
  }

  console.log('[imageUtils] 📥 Input URL:', imageUrl);

  // If it's a Supabase storage URL, return directly
  if (imageUrl.includes('vohvdarghgqskzqjclux.supabase.co/storage')) {
    console.log('[imageUtils] ✅ Supabase storage URL - returning directly');
    return imageUrl;
  }

  // If it's still an Instagram URL (old posts), try to proxy it
  // But these will likely fail - the migration script should handle these
  if (imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')) {
    console.warn('[imageUtils] ⚠️ Instagram URL detected - this should have been reuploaded');
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    const proxiedUrl = `https://vohvdarghgqskzqjclux.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    console.log('[imageUtils] 🔄 Attempting to proxy:', proxiedUrl);
    return proxiedUrl;
  }

  // Return other URLs as-is
  console.log('[imageUtils] ➡️ Other URL - returning directly');
  return imageUrl;
};