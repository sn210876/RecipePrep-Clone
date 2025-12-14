import { supabase } from '@/lib/supabase';
import { downloadAndStoreImage } from '@/lib/imageStorage';

class ImageMonitorService {
  private isRunning = false;
  private checkInterval = 60000;
  private maxPerBatch = 10;

  startMonitoring() {
    if (this.isRunning) {
      console.log('[ImageMonitor] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[ImageMonitor] Started monitoring for external images');

    this.checkAndMigrateImages();

    setInterval(() => {
      this.checkAndMigrateImages();
    }, this.checkInterval);
  }

  stopMonitoring() {
    this.isRunning = false;
    console.log('[ImageMonitor] Stopped monitoring');
  }

  private async checkAndMigrateImages() {
    try {
      const recipes = await this.getRecipesWithExternalImages();

      if (recipes.length === 0) {
        console.log('[ImageMonitor] ✅ No recipes need migration');
        return;
      }

      console.log(`[ImageMonitor] Found ${recipes.length} recipes with external images`);

      const batch = recipes.slice(0, this.maxPerBatch);

      for (const recipe of batch) {
        await this.migrateRecipeImage(recipe.id, recipe.image_url);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      console.log(`[ImageMonitor] ✅ Migrated ${batch.length} recipe images`);
    } catch (error) {
      console.error('[ImageMonitor] Error during migration:', error);
    }
  }

  private async getRecipesWithExternalImages() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const { data, error } = await supabase
      .from('public_recipes')
      .select('id, image_url')
      .not('image_url', 'is', null)
      .limit(50);

    if (error) {
      console.error('[ImageMonitor] Error fetching recipes:', error);
      return [];
    }

    return (data || []).filter(recipe => {
      if (!recipe.image_url) return false;

      return !recipe.image_url.includes(supabaseUrl) && (
        recipe.image_url.includes('instagram.com') ||
        recipe.image_url.includes('cdninstagram.com') ||
        recipe.image_url.includes('fbcdn.net') ||
        recipe.image_url.startsWith('http://') ||
        recipe.image_url.startsWith('https://')
      );
    });
  }

  private async migrateRecipeImage(recipeId: string, imageUrl: string) {
    try {
      console.log(`[ImageMonitor] Migrating recipe ${recipeId}...`);

      const permanentUrl = await downloadAndStoreImage(imageUrl, recipeId);

      if (permanentUrl !== imageUrl) {
        const { error } = await supabase
          .from('public_recipes')
          .update({ image_url: permanentUrl })
          .eq('id', recipeId);

        if (error) {
          console.error(`[ImageMonitor] Failed to update recipe ${recipeId}:`, error);
        } else {
          console.log(`[ImageMonitor] ✅ Successfully migrated recipe ${recipeId}`);
        }
      } else {
        console.warn(`[ImageMonitor] ⚠️ Migration failed for recipe ${recipeId}`);
      }
    } catch (error) {
      console.error(`[ImageMonitor] Error migrating recipe ${recipeId}:`, error);
    }
  }

  async manualCheckRecipe(recipeId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('public_recipes')
        .select('image_url')
        .eq('id', recipeId)
        .maybeSingle();

      if (error || !data?.image_url) {
        return false;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const isExternal = !data.image_url.includes(supabaseUrl);

      if (isExternal) {
        await this.migrateRecipeImage(recipeId, data.image_url);
        return true;
      }

      return false;
    } catch (error) {
      console.error('[ImageMonitor] Error checking recipe:', error);
      return false;
    }
  }
}

export const imageMonitorService = new ImageMonitorService();
