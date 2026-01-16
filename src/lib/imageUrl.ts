export const getDisplayImageUrl = (imageUrl: string | null): string | null => {
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
};
