// src/lib/imageUtils.ts

export const getProxiedImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) {
    console.log('[imageUtils] ⚠️ No image URL provided');
    return undefined;
  }

  console.log('[imageUtils] 📥 Input URL:', imageUrl);
  console.log('[imageUtils] 🔍 URL length:', imageUrl.length);
  console.log('[imageUtils] 🔍 Contains "vohvdarghgqskzqjclux"?', imageUrl.includes('vohvdarghgqskzqjclux'));
  console.log('[imageUtils] 🔍 Contains "storage"?', imageUrl.includes('storage'));
  console.log('[imageUtils] 🔍 Contains "instagram"?', imageUrl.includes('instagram'));
  console.log('[imageUtils] 🔍 Contains "image-proxy"?', imageUrl.includes('image-proxy'));

  // If URL contains your Supabase domain AND storage path, return directly
  if (imageUrl.includes('vohvdarghgqskzqjclux.supabase.co/storage')) {
    console.log('[imageUtils] ✅ MATCH: Supabase storage URL - returning directly');
    return imageUrl;
  }

  // If it's already proxied, return as-is
  if (imageUrl.includes('/functions/v1/image-proxy')) {
    console.log('[imageUtils] ✅ Already proxied - returning as-is');
    return imageUrl;
  }

  // If it's an Instagram URL that's NOT already proxied
  if ((imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')) && 
      !imageUrl.includes('/functions/v1/image-proxy')) {
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    const proxiedUrl = `https://vohvdarghgqskzqjclux.supabase.co/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    console.log('[imageUtils] 🔄 Instagram URL - proxying to:', proxiedUrl);
    return proxiedUrl;
  }

  // Return everything else as-is
  console.log('[imageUtils] ➡️ Other URL - returning directly');
  return imageUrl;
};