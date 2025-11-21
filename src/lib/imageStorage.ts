// ============================================
// FILE 1: lib/imageStorage.ts
// ============================================

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


// ============================================
// FILE 2: Update your Recipe Scraper/Upload
// ============================================

// In your recipe scraping/upload function, use this:

import { downloadAndStoreImage } from '../lib/imageStorage';

export async function saveRecipeWithPermanentImage(recipe: Recipe) {
  try {
    // 1. First save the recipe to get an ID
    const { data: savedRecipe, error: recipeError } = await supabase
      .from('public_recipes')
      .insert({
        title: recipe.title,
        cuisine_type: recipe.cuisineType,
        difficulty: recipe.difficulty,
        prep_time: recipe.prepTime,
        cook_time: recipe.cookTime,
        servings: recipe.servings,
        ingredients: recipe.ingredients,
        instructions: recipe.instructions,
        image_url: recipe.imageUrl, // Temporary URL
        video_url: recipe.sourceUrl,
        dietary_tags: recipe.dietaryTags,
        meal_type: recipe.mealType,
      })
      .select()
      .single();

    if (recipeError) throw recipeError;

    // 2. Download and store the image permanently
    const permanentImageUrl = await downloadAndStoreImage(
      recipe.imageUrl,
      savedRecipe.id
    );

    // 3. Update recipe with permanent URL
    const { error: updateError } = await supabase
      .from('public_recipes')
      .update({ image_url: permanentImageUrl })
      .eq('id', savedRecipe.id);

    if (updateError) {
      console.error('Failed to update permanent URL:', updateError);
    }

    return { ...savedRecipe, image_url: permanentImageUrl };
  } catch (error) {
    console.error('Failed to save recipe:', error);
    throw error;
  }
}


// ============================================
// FILE 3: Migration Script (Run Once)
// Fix existing recipes with expired URLs
// ============================================

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


// ============================================
// FILE 4: Supabase Storage Setup
// Run this SQL in Supabase SQL Editor
// ============================================

/*
-- 1. Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true);

-- 2. Set up RLS policies for the bucket
CREATE POLICY "Public can view recipe images"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

CREATE POLICY "Authenticated users can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

CREATE POLICY "Users can update their own recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images');

CREATE POLICY "Users can delete their own recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');
*/


// ============================================
// FILE 5: Usage in Components
// ============================================

// Example: In your Upload component or recipe scraper
import { downloadAndStoreImage } from '../lib/imageStorage';

async function handleRecipeUpload(recipeData: any) {
  try {
    // Save recipe first to get ID
    const { data: recipe } = await supabase
      .from('public_recipes')
      .insert(recipeData)
      .select()
      .single();

    // Download and store image permanently
    const permanentUrl = await downloadAndStoreImage(
      recipeData.image_url,
      recipe.id
    );

    // Update with permanent URL
    await supabase
      .from('public_recipes')
      .update({ image_url: permanentUrl })
      .eq('id', recipe.id);

    toast.success('Recipe saved with permanent image!');
  } catch (error) {
    console.error('Upload failed:', error);
    toast.error('Failed to upload recipe');
  }
}


// ============================================
// FILE 6: Admin Panel - Run Migration
// Add this button to your admin panel
// ============================================

import { migrateExistingRecipes } from '../lib/imageStorage';

function AdminPanel() {
  const [isMigrating, setIsMigrating] = useState(false);

  const handleMigration = async () => {
    if (!confirm('This will download and re-store all Instagram images. Continue?')) {
      return;
    }

    setIsMigrating(true);
    try {
      await migrateExistingRecipes();
      toast.success('Migration complete!');
    } catch (error) {
      toast.error('Migration failed');
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">Admin Tools</h2>
      
      <Button
        onClick={handleMigration}
        disabled={isMigrating}
        className="bg-blue-600 hover:bg-blue-700"
      >
        {isMigrating ? 'Migrating...' : 'Migrate Instagram Images'}
      </Button>
      
      <p className="text-sm text-gray-600 mt-2">
        This will permanently store all Instagram images to prevent expiration
      </p>
    </div>
  );
}