export function getProxiedImageUrl(imageUrl: string | null | undefined): string | null {
  if (!imageUrl) return null;
  
  // If already proxied, return as-is
  if (imageUrl.includes('image-proxy')) return imageUrl;
  
  // If it's a Supabase storage URL, no proxy needed
  if (imageUrl.includes('supabase.co/storage')) return imageUrl;
  
  // Check if it needs proxying (Instagram, Facebook CDN)
  const needsProxy = imageUrl.includes('instagram.com') || 
                     imageUrl.includes('cdninstagram.com') ||
                     imageUrl.includes('fbcdn.net');
  
  if (needsProxy) {
    const cleanUrl = imageUrl.replace(/&amp;/g, '&');
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
  }
  
  return imageUrl;
}