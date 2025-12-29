# Image Migration Guide

## Problem

Recipe photos stored with Instagram URLs expire after a period of time. Instagram CDN URLs contain time-based security tokens that eventually become invalid, causing images to disappear from your app.

## Solution

A new admin tool automatically downloads expiring images and stores them permanently in Supabase Storage.

## How to Use

### For Admins

1. **Access the migration tool:**
   - Navigate to `/admin-image-migration` in your app
   - Only admins can access this page

2. **Migrate Recipe Images:**
   - Click "Migrate Recipe Images" button
   - The tool will:
     - Find all recipes with Instagram/CDN URLs
     - Download each image through the proxy
     - Upload to permanent Supabase storage (`recipe-images` bucket)
     - Update the database with new permanent URLs
   - Check browser console for detailed progress

3. **Migrate Post Images:**
   - Click "Migrate Post Images" button
   - Same process for social posts
   - Posts with expired URLs will be identified (these cannot be recovered)

### What Gets Fixed

Currently in your database:
- **47 total recipes**
- **1 recipe** has an Instagram URL (needs migration)
- **30 recipes** already use Supabase storage (safe)
- **16 recipes** have other URL types or no images

### Running the Migration

The migration is **safe to run multiple times**. It will:
- Skip images already in Supabase storage
- Only download Instagram/CDN URLs
- Keep original URLs if download fails (as fallback)
- Add delays between downloads to avoid rate limits

### Important Notes

1. **Expired URLs Cannot Be Recovered**
   - If an Instagram URL has already expired, the image is gone
   - These will be identified in the results
   - You'll need to re-upload these manually

2. **Storage Buckets**
   - Recipe images: `recipe-images` bucket
   - Post images: `posts` bucket
   - Both have public read access

3. **Preventing Future Issues**
   - New uploads automatically go to Supabase storage
   - The image proxy is a temporary solution
   - This migration makes images permanent

## Technical Details

### Storage Policies

The `recipe-images` bucket has these policies:
- ✅ Authenticated users can upload
- ✅ Public can read
- ✅ Users can update their own images
- ✅ Users can delete their own images

### Migration Functions

Located in `/src/lib/imageStorage.ts`:
- `migrateExistingRecipes()` - Migrates recipe images
- `migrateExistingPosts()` - Migrates post images
- `downloadAndStoreImage()` - Core download/upload logic

### URL Patterns Detected

The migration looks for these URL patterns:
- `instagram.com`
- `cdninstagram.com`
- `fbcdn.net`

## Troubleshooting

### If migration fails:

1. **Check browser console** for detailed error messages
2. **Verify storage buckets exist** in Supabase dashboard
3. **Check storage policies** allow authenticated uploads
4. **Verify image proxy is working** (edge function)

### Common Issues:

- **"Failed to fetch image: 403"** - Instagram URL has expired
- **"Upload error"** - Check storage bucket permissions
- **"Network error"** - Check internet connection

## Monitoring

After running the migration:
1. Check the results summary
2. Verify images load correctly in the app
3. Run the migration again for any new Instagram URLs
4. Consider running monthly to catch new content

## Next Steps

1. Run the recipe migration now (you have 1 recipe to fix)
2. Run the post migration if you have social posts
3. Set a reminder to run this monthly
4. Consider adding automatic migration on upload

---

**Created:** 2025-12-14
**Last Updated:** 2025-12-14
