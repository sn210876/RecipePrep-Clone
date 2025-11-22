// Create this file: src/lib/imageUtils.ts

export const getProxiedImageUrl = (imageUrl: string | null | undefined): string | undefined => {
  if (!imageUrl) return undefined;

  // Don't proxy Supabase storage URLs - use them directly
  if (imageUrl.includes('supabase.co/storage') || 
      imageUrl.startsWith(import.meta.env.VITE_SUPABASE_URL)) {
    return imageUrl;
  }

  // Proxy Instagram/CDN Instagram URLs
  if (imageUrl.includes('instagram.com') || imageUrl.includes('cdninstagram.com')) {
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
  }

  // Return all other URLs as-is
  return imageUrl;
};

// Then use it everywhere like this:
// <img src={getProxiedImageUrl(post.image_url)} alt="..." />