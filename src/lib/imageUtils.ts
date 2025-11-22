// src/lib/imageUtils.ts

export const getProxiedImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) {
    console.log('[imageUtils] ⚠️ No image URL provided');
    return undefined;
  }

  console.log('[imageUtils] 📥 Input URL:', imageUrl);

  // Don't proxy Supabase storage URLs - use them directly
  if (imageUrl.includes('supabase.co/storage')) {
    console.log('[imageUtils] ✅ Supabase storage URL - using directly');
    return imageUrl;
  }

  if (imageUrl.startsWith(import.meta.env.VITE_SUPABASE_URL)) {
    console.log('[imageUtils] ✅ Supabase URL - using directly');
    return imageUrl;
  }

  // Proxy Instagram/CDN Instagram URLs
  if (imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')) {
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    const proxiedUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    console.log('[imageUtils] 🔄 Instagram URL - proxying:', proxiedUrl);
    return proxiedUrl;
  }

  // Return all other URLs as-is
  console.log('[imageUtils] ➡️ Other URL - using directly');
  return imageUrl;
};