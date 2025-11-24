import { supabase } from './supabase';

/**
 * Downloads an image from Instagram/external URL and stores it permanently in Supabase
 * @param imageUrl - The external image URL (Instagram, etc)
 * @param recipeId - The recipe ID to organize storage
 * @returns Permanent Supabase storage URL
 */
export async function downloadAndStoreImage(
  imageUrl: string,
  recipeId: string
): Promise<string> {
  try {
    console.log('[ImageStorage] Downloading image:', imageUrl);

    // Check if it's an Instagram URL that needs proxying
    const needsProxy = imageUrl.includes('instagram.com') || 
                      imageUrl.includes('cdninstagram.com') ||
                      imageUrl.includes('fbcdn.net');

    let fetchUrl = imageUrl;
    if (needsProxy) {
      fetchUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(imageUrl)}`;
    }

    // Download the image
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('[ImageStorage] Downloaded blob:', blob.type, blob.size);

    // Generate unique filename
    const fileExtension = blob.type.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const fileName = `recipes/${recipeId}/${timestamp}.${fileExtension}`;

    console.log('[ImageStorage] Uploading to:', fileName);

    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from('recipe-images')
      .upload(fileName, blob, {
        contentType: blob.type,
        cacheControl: '31536000', // 1 year cache
        upsert: false
      });

    if (error) {
      console.error('[ImageStorage] Upload error:', error);
      throw error;
    }

    console.log('[ImageStorage] Upload successful:', data);

    // Get permanent public URL
    const { data: { publicUrl } } = supabase.storage
      .from('recipe-images')
      .getPublicUrl(fileName);

    console.log('[ImageStorage] ✅ Permanent URL:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('[ImageStorage] ❌ Failed to store image:', error);
    // Return original URL as fallback
    return imageUrl;
  }
}

/**
 * Batch download and store multiple images
 * @param images - Array of {url, recipeId}
 * @returns Array of permanent URLs
 */
export async function downloadAndStoreImages(
  images: Array<{ url: string; recipeId: string }>
): Promise<string[]> {
  const results = await Promise.allSettled(
    images.map(({ url, recipeId }) => downloadAndStoreImage(url, recipeId))
  );

  return results.map((result, index) => 
    result.status === 'fulfilled' ? result.value : images[index].url
  );
}

/**
 * Downloads and stores a post image permanently in Supabase
 * @param imageUrl - The external image URL (Instagram, etc)
 * @param postId - The post ID to organize storage
 * @returns Permanent Supabase storage URL
 */
export async function downloadAndStorePostImage(
  imageUrl: string,
  postId: string
): Promise<string> {
  try {
    console.log('[ImageStorage] Downloading post image:', imageUrl);

    // Check if URL is already proxied (double-proxy situation)
    let actualUrl = imageUrl;
    if (imageUrl.includes('/functions/v1/image-proxy?url=')) {
      try {
        const urlObj = new URL(imageUrl);
        const encodedUrl = urlObj.searchParams.get('url');
        if (encodedUrl) {
          actualUrl = decodeURIComponent(encodedUrl);
          console.log('[ImageStorage] Extracted original URL from proxy:', actualUrl);
        }
      } catch (e) {
        console.warn('[ImageStorage] Failed to extract URL from proxy:', e);
      }
    }

    // Check if it's an Instagram URL that needs proxying
    const needsProxy = actualUrl.includes('instagram.com') ||
                      actualUrl.includes('cdninstagram.com') ||
                      actualUrl.includes('fbcdn.net');

    // If it's an expired Instagram URL, we can't download it
    // These URLs have time-based tokens that have expired
    if (needsProxy && (actualUrl.includes('x-expires') || actualUrl.includes('_nc_ht'))) {
      console.warn('[ImageStorage] ⚠️ Instagram URL has expired tokens, cannot download');
      throw new Error('Instagram URL expired - image no longer accessible');
    }

    let fetchUrl = actualUrl;
    if (needsProxy) {
      fetchUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(actualUrl)}`;
    }

    // Download the image
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status}`);
    }

    const blob = await response.blob();
    console.log('[ImageStorage] Downloaded post blob:', blob.type, blob.size);

    // Generate unique filename
    const fileExtension = blob.type.split('/')[1] || 'jpg';
    const timestamp = Date.now();
    const fileName = `posts/${postId}/${timestamp}.${fileExtension}`;

    console.log('[ImageStorage] Uploading post image to:', fileName);

    // Upload to Supabase storage (using 'posts' bucket)
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(fileName, blob, {
        contentType: blob.type,
        cacheControl: '31536000',
        upsert: false
      });

    if (error) {
      console.error('[ImageStorage] Upload error:', error);
      throw error;
    }

    console.log('[ImageStorage] Upload successful:', data);

    // Get permanent public URL
    const { data: { publicUrl } } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);

    console.log('[ImageStorage] ✅ Permanent post URL:', publicUrl);
    return publicUrl;

  } catch (error) {
    console.error('[ImageStorage] ❌ Failed to store post image:', error);
    return imageUrl;
  }
}

/**
 * Migration function to fix existing recipes with expired URLs
 * Run this once to migrate all existing Instagram images
 */
export async function migrateExistingRecipes() {
  console.log('[Migration] Starting recipe image migration...');

  // Get all recipes with Instagram URLs
  const { data: recipes, error } = await supabase
    .from('public_recipes')
    .select('id, image_url')
    .or('image_url.ilike.%instagram%,image_url.ilike.%cdninstagram%,image_url.ilike.%fbcdn%');

  if (error) {
    console.error('[Migration] Error fetching recipes:', error);
    return;
  }

  console.log(`[Migration] Found ${recipes?.length || 0} recipes to migrate`);

  let successCount = 0;
  let failCount = 0;

  for (const recipe of recipes || []) {
    try {
      console.log(`[Migration] Processing recipe ${recipe.id}...`);

      // Download and store permanently
      const permanentUrl = await downloadAndStoreImage(
        recipe.image_url,
        recipe.id
      );

      // Only update if we got a different URL (means it worked)
      if (permanentUrl !== recipe.image_url) {
        const { error: updateError } = await supabase
          .from('public_recipes')
          .update({ image_url: permanentUrl })
          .eq('id', recipe.id);

        if (updateError) {
          console.error(`[Migration] Failed to update recipe ${recipe.id}:`, updateError);
          failCount++;
        } else {
          console.log(`[Migration] ✅ Migrated recipe ${recipe.id}`);
          successCount++;
        }
      } else {
        console.warn(`[Migration] ⚠️ Skipped recipe ${recipe.id} (download failed)`);
        failCount++;
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`[Migration] Error processing recipe ${recipe.id}:`, error);
      failCount++;
    }
  }

  console.log(`[Migration] ✅ Complete! Success: ${successCount}, Failed: ${failCount}`);
}

/**
 * Migration function to fix existing posts with expired Instagram URLs
 * Run this once to migrate all existing Instagram post images
 */
export async function migrateExistingPosts() {
  console.log('[Migration] Starting post image migration...');

  // Get all posts with Instagram URLs
  const { data: posts, error } = await supabase
    .from('posts')
    .select('id, image_url, title')
    .or('image_url.ilike.%instagram%,image_url.ilike.%cdninstagram%,image_url.ilike.%fbcdn%')
    .not('image_url', 'is', null);

  if (error) {
    console.error('[Migration] Error fetching posts:', error);
    return;
  }

  console.log(`[Migration] Found ${posts?.length || 0} posts to check`);

  let successCount = 0;
  let failCount = 0;
  let expiredCount = 0;
  const expiredPosts: any[] = [];

  for (const post of posts || []) {
    try {
      console.log(`[Migration] Processing post ${post.id} - "${post.title}"...`);

      // Handle multiple images stored as JSON array
      let imageUrls: string[] = [];
      try {
        imageUrls = JSON.parse(post.image_url);
      } catch {
        imageUrls = post.image_url.includes(',')
          ? post.image_url.split(',').map((url: string) => url.trim())
          : [post.image_url];
      }

      // Download and store each image permanently
      const permanentUrls: string[] = [];
      let hasExpired = false;

      for (const imageUrl of imageUrls) {
        const needsDownload = imageUrl.includes('instagram.com') ||
                             imageUrl.includes('cdninstagram.com') ||
                             imageUrl.includes('fbcdn.net');

        if (needsDownload) {
          try {
            const permanentUrl = await downloadAndStorePostImage(imageUrl, post.id);
            if (permanentUrl !== imageUrl) {
              permanentUrls.push(permanentUrl);
            } else {
              // Download failed, keep original
              permanentUrls.push(imageUrl);
            }
          } catch (error: any) {
            if (error.message.includes('expired')) {
              console.warn(`[Migration] ⚠️ Post ${post.id} has expired Instagram URL`);
              hasExpired = true;
              expiredPosts.push({ id: post.id, title: post.title, url: imageUrl });
            } else {
              permanentUrls.push(imageUrl);
            }
          }
        } else {
          permanentUrls.push(imageUrl);
        }
      }

      if (hasExpired) {
        expiredCount++;
        failCount++;
        continue;
      }

      // Update the post with permanent URLs
      const finalImageUrl = permanentUrls.length > 1
        ? JSON.stringify(permanentUrls)
        : permanentUrls[0];

      if (finalImageUrl !== post.image_url) {
        const { error: updateError } = await supabase
          .from('posts')
          .update({ image_url: finalImageUrl })
          .eq('id', post.id);

        if (updateError) {
          console.error(`[Migration] Failed to update post ${post.id}:`, updateError);
          failCount++;
        } else {
          console.log(`[Migration] ✅ Migrated post ${post.id}`);
          successCount++;
        }
      } else {
        console.log(`[Migration] ⏭️ Skipped post ${post.id} (no change needed)`);
      }

      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`[Migration] Error processing post ${post.id}:`, error);
      failCount++;
    }
  }

  console.log(`[Migration] ✅ Complete!`);
  console.log(`  - Migrated: ${successCount}`);
  console.log(`  - Expired: ${expiredCount}`);
  console.log(`  - Failed: ${failCount - expiredCount}`);

  if (expiredPosts.length > 0) {
    console.log(`\n⚠️ Posts with expired Instagram URLs (need to be re-added):`);
    expiredPosts.forEach(p => console.log(`  - "${p.title}" (ID: ${p.id})`));
  }

  return {
    successCount,
    failCount,
    expiredCount,
    expiredPosts,
    total: posts?.length || 0
  };
}