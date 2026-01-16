# Recipe Images Fix - Preventing Disappearing Images

## Problem
Recipe images were disappearing on the "My Recipes" page while still showing correctly on the Discover and Profile pages.

## Root Cause
The issue was inconsistent image URL handling across components:

- **Discover page** and **Profile page** had a local `getDisplayImageUrl()` helper function that properly handled:
  - Already-proxied URLs (didn't re-proxy)
  - Supabase storage URLs (used as-is)
  - Instagram/Facebook CDN URLs (proxied them)
  - Other URLs (used as-is)

- **RecipeCard component** (used by My Recipes) only checked for Instagram URLs and didn't handle:
  - Already-proxied URLs (could break by double-proxying)
  - Supabase storage URLs (might not display correctly)
  - Other external URLs

- **RecipeDetailModal** had the same limited logic as RecipeCard

This inconsistency meant that images stored in Supabase or already proxied could fail to load on the My Recipes page.

## Solution Implemented

### 1. Created Shared Helper Function
**File:** `src/lib/imageUrl.ts`

Created a centralized `getDisplayImageUrl()` function that:
- Returns null for null/undefined URLs
- Preserves already-proxied URLs (don't double-proxy)
- Preserves Supabase storage URLs (they're already accessible)
- Proxies Instagram/Facebook CDN URLs (they expire/change)
- Returns other URLs as-is

```typescript
export const getDisplayImageUrl = (imageUrl: string | null): string | null => {
  if (!imageUrl) return null;

  // Already proxied - use as-is
  if (imageUrl.includes('/functions/v1/image-proxy')) {
    return imageUrl;
  }

  // Supabase storage - use as-is
  if (imageUrl.includes('supabase.co/storage/v1/object/public/')) {
    return imageUrl;
  }

  // Instagram/Facebook CDN - needs proxy
  if (imageUrl.includes('instagram.com') ||
      imageUrl.includes('cdninstagram.com') ||
      imageUrl.includes('fbcdn.net')) {
    return `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // Other URLs - use as-is
  return imageUrl;
};
```

### 2. Updated All Components to Use Shared Helper

**Updated Files:**

1. **src/components/RecipeCard.tsx**
   - Added import: `import { getDisplayImageUrl } from '@/lib/imageUrl';`
   - Changed: `src={getDisplayImageUrl(recipe.imageUrl) || ''}`
   - Removed inline Instagram check logic

2. **src/components/RecipeDetailModal.tsx**
   - Added import: `import { getDisplayImageUrl } from '../lib/imageUrl';`
   - Updated both image displays (hero image and lightbox)
   - Removed inline Instagram check logic

3. **src/pages/Discover.tsx**
   - Added import: `import { getDisplayImageUrl } from '../lib/imageUrl';`
   - Removed local `getDisplayImageUrl` function (now uses shared)

4. **src/pages/Profile.tsx**
   - Added import: `import { getDisplayImageUrl } from '../lib/imageUrl';`
   - Removed local `getDisplayImageUrl` function (now uses shared)

### 3. Benefits of This Fix

✅ **Consistent Image Handling:** All pages now use the same logic
✅ **Prevents Double-Proxying:** Checks if URL is already proxied
✅ **Handles Supabase URLs:** Direct access to Supabase storage
✅ **Handles Instagram/Facebook:** Proxies CDN URLs that expire
✅ **Maintainable:** Single source of truth for image URL logic
✅ **Extensible:** Easy to add new CDN domains if needed

## How It Works

### Image URL Flow

1. **User uploads recipe with image**
   - Image stored in Supabase storage
   - URL: `https://[project].supabase.co/storage/v1/object/public/recipe-images/[file]`

2. **Image displayed in components**
   - `getDisplayImageUrl()` checks URL
   - Supabase storage URL detected
   - Returns URL as-is (no proxy needed)
   - Image loads directly from Supabase

3. **External Instagram/Facebook images**
   - `getDisplayImageUrl()` checks URL
   - Instagram/Facebook CDN detected
   - Returns proxied URL: `https://[project].supabase.co/functions/v1/image-proxy?url=[encoded]`
   - Image loads through proxy

### Example Cases

**Case 1: Supabase Storage Image**
```
Input:  https://abc123.supabase.co/storage/v1/object/public/recipe-images/photo.jpg
Output: https://abc123.supabase.co/storage/v1/object/public/recipe-images/photo.jpg
Result: ✅ Loads directly
```

**Case 2: Instagram Image**
```
Input:  https://scontent.cdninstagram.com/v/t51.2885-15/photo.jpg?...
Output: https://abc123.supabase.co/functions/v1/image-proxy?url=[encoded]
Result: ✅ Loads via proxy
```

**Case 3: Already Proxied Image**
```
Input:  https://abc123.supabase.co/functions/v1/image-proxy?url=[encoded]
Output: https://abc123.supabase.co/functions/v1/image-proxy?url=[encoded]
Result: ✅ No double-proxying
```

## Testing

### How to Verify the Fix

1. **Test My Recipes Page:**
   - Go to "My Recipes"
   - Check that all recipe images load correctly
   - Look for recipes that were previously missing images
   - Example: "french onion braised chuckroast" should now show image

2. **Test Discover Page:**
   - Verify all post images still load
   - Check both regular posts and recipe-linked posts

3. **Test Profile Page:**
   - View your own profile
   - View other users' profiles
   - Check post images load correctly

4. **Test Recipe Detail Modal:**
   - Click on any recipe card
   - Verify the large image displays
   - Test the image zoom/lightbox feature

5. **Test with Different Image Sources:**
   - Recipes with Supabase-uploaded images
   - Recipes scraped from Instagram
   - Recipes from other external URLs

### Debug Checklist

If images still don't load:

1. **Check Browser Console:**
   - Look for 404 errors on image URLs
   - Check for CORS errors
   - Verify the image URL format

2. **Check Database:**
   ```sql
   SELECT id, title, image_url FROM public_recipes WHERE title LIKE '%french onion%';
   ```
   - Verify the `image_url` field is populated
   - Check if URL is valid

3. **Check Storage:**
   - Go to Supabase Dashboard > Storage
   - Verify the image file exists
   - Check file permissions (should be public)

4. **Check Image Proxy:**
   - If Instagram/Facebook images fail
   - Check the `image-proxy` Edge Function is deployed
   - Test the proxy directly in browser

## Files Modified

1. `src/lib/imageUrl.ts` - NEW FILE - Shared helper function
2. `src/components/RecipeCard.tsx` - Updated to use shared helper
3. `src/components/RecipeDetailModal.tsx` - Updated to use shared helper
4. `src/pages/Discover.tsx` - Updated to use shared helper
5. `src/pages/Profile.tsx` - Updated to use shared helper

## Build Status

✅ Build successful
✅ TypeScript compilation passed
✅ No errors or warnings
✅ Ready for deployment

## Next Steps

1. **Deploy to production:**
   ```bash
   # Already built in dist/
   # Deploy via your hosting provider
   ```

2. **Monitor for issues:**
   - Check for any console errors
   - Monitor for missing images
   - Watch for image proxy errors

3. **Future improvements:**
   - Add more CDN domains if needed
   - Implement image caching
   - Add fallback images for failed loads
   - Consider image optimization service

## Technical Notes

- The helper function is pure and has no side effects
- Uses environment variable for Supabase URL
- Returns null for invalid inputs (handled by components)
- URL encoding handled for special characters
- Backwards compatible with existing images
