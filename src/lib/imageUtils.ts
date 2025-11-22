// src/lib/imageUtils.ts

export const getProxiedImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) {
    console.log('[imageUtils] ⚠️ No image URL provided');
    return undefined;
  }

  console.log('[imageUtils] 📥 Input URL:', imageUrl);

  // Don't proxy Supabase storage URLs - use them directly
  // Check for both the full storage URL pattern and the base domain
  if (imageUrl.includes('supabase.co/storage') || 
      imageUrl.includes('/storage/v1/object/public/')) {
    console.log('[imageUtils] ✅ Supabase storage URL - using directly');
    return imageUrl;
  }

  // Also check if it starts with the base Supabase URL
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  if (supabaseUrl && imageUrl.startsWith(supabaseUrl) && !imageUrl.includes('/functions/v1/image-proxy')) {
    console.log('[imageUtils] ✅ Supabase base URL - using directly');
    return imageUrl;
  }

  // Proxy Instagram/CDN Instagram URLs (but not if they're already proxied)
  if ((imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')) && 
      !imageUrl.includes('/functions/v1/image-proxy')) {
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    const proxiedUrl = `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
    console.log('[imageUtils] 🔄 Instagram URL - proxying');
    return proxiedUrl;
  }

  // If it's already proxied, use it as-is
  if (imageUrl.includes('/functions/v1/image-proxy')) {
    console.log('[imageUtils] ✅ Already proxied - using as-is');
    return imageUrl;
  }

  // Return all other URLs as-is
  console.log('[imageUtils] ➡️ Other URL - using directly');
  return imageUrl;
};