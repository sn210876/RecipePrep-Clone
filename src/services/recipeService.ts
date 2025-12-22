import { createClient } from '@supabase/supabase-js';
import { Recipe } from '@/types/recipe';
import { downloadAndStoreImage } from '@/lib/imageStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface DBRecipe {
  id: string;
  user_id?: string;
  title: string;
  ingredients: any;
  instructions: any;
  prep_time: number;
  cook_time: number;
  servings: number;
  tags: any;
  cuisine_type: string;
  difficulty: string;
  dietary_tags: any;
  meal_type: any;
  image_url?: string;
  video_url?: string;
  source_url?: string;
  notes?: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

function dbRecipeToRecipe(dbRecipe: DBRecipe): Recipe {
  return {
    id: dbRecipe.id,
    userId: dbRecipe.user_id,
    title: dbRecipe.title,
    ingredients: dbRecipe.ingredients,
    instructions: dbRecipe.instructions,
    prepTime: dbRecipe.prep_time,
    cookTime: dbRecipe.cook_time,
    servings: dbRecipe.servings,
    tags: dbRecipe.tags || [],
    cuisineType: dbRecipe.cuisine_type,
    difficulty: dbRecipe.difficulty as 'Easy' | 'Medium' | 'Hard',
    dietaryTags: dbRecipe.dietary_tags || [],
    mealType: dbRecipe.meal_type || [],
    imageUrl: dbRecipe.image_url,
    videoUrl: dbRecipe.video_url,
    sourceUrl: dbRecipe.source_url,
    notes: dbRecipe.notes,
    isSaved: false,
  };
}

function recipeToDBRecipe(recipe: Omit<Recipe, 'id'>): Omit<DBRecipe, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: recipe.userId,
    title: recipe.title,
    ingredients: recipe.ingredients,
    instructions: recipe.instructions,
    prep_time: recipe.prepTime,
    cook_time: recipe.cookTime,
    servings: recipe.servings,
    tags: recipe.tags || [],
    cuisine_type: recipe.cuisineType,
    difficulty: recipe.difficulty,
    dietary_tags: recipe.dietaryTags || [],
    meal_type: recipe.mealType || [],
    image_url: recipe.imageUrl,
    video_url: recipe.videoUrl,
    source_url: recipe.sourceUrl,
    notes: recipe.notes,
    is_public: true,
  };
}

export async function getSavedRecipes(userId: string): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('saved_recipes')
    .select('id, recipe_id, recipe_data')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching saved recipes:', error);
    throw new Error('Failed to fetch saved recipes');
  }

  const recipes = (data || []).map(item => ({
    ...item.recipe_data,
    isSaved: true
  }));

  for (const item of data || []) {
    const recipe = item.recipe_data;
    if (recipe?.imageUrl && isExternalUrl(recipe.imageUrl)) {
      console.log('[getSavedRecipes] Detected external image URL, migrating in background...');
      migrateSavedRecipeImageInBackground(item.id, item.recipe_id || recipe.id, recipe.imageUrl);
    }
  }

  return recipes;
}

export async function saveRecipeToCloud(userId: string, recipe: Recipe): Promise<void> {
  try {
    const existingRecord = await supabase
      .from('saved_recipes')
      .select('id')
      .eq('user_id', userId)
      .eq('recipe_id', recipe.id)
      .maybeSingle();

    if (existingRecord.data) {
      const { error } = await supabase
        .from('saved_recipes')
        .update({
          recipe_data: { ...recipe, isSaved: true },
          updated_at: new Date().toISOString()
        })
        .eq('id', existingRecord.data.id);

      if (error) {
        console.error('Error updating recipe:', error);
        throw new Error('Failed to update recipe');
      }

      if (recipe.imageUrl && isExternalUrl(recipe.imageUrl)) {
        console.log('[saveRecipeToCloud] Detected external image URL, migrating in background...');
        migrateSavedRecipeImageInBackground(existingRecord.data.id, recipe.id, recipe.imageUrl);
      }
    } else {
      const { data: insertData, error } = await supabase
        .from('saved_recipes')
        .insert({
          user_id: userId,
          recipe_id: recipe.id,
          recipe_data: { ...recipe, isSaved: true }
        })
        .select('id')
        .single();

      if (error) {
        console.error('Error saving recipe:', error);
        throw new Error('Failed to save recipe');
      }

      if (insertData && recipe.imageUrl && isExternalUrl(recipe.imageUrl)) {
        console.log('[saveRecipeToCloud] Detected external image URL, migrating in background...');
        migrateSavedRecipeImageInBackground(insertData.id, recipe.id, recipe.imageUrl);
      }
    }
  } catch (error: any) {
    console.error('Error in saveRecipeToCloud:', error);
    throw new Error(error.message || 'Failed to save recipe');
  }
}

export async function removeRecipeFromCloud(userId: string, recipeId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_recipes')
    .delete()
    .eq('user_id', userId)
    .eq('recipe_id', recipeId);

  if (error) {
    console.error('Error removing recipe:', error);
    throw new Error('Failed to remove recipe');
  }
}

export async function createRecipe(recipe: Omit<Recipe, 'id'>): Promise<Recipe> {
  let dbRecipe = recipeToDBRecipe(recipe);

  console.log('[createRecipe] Attempting to insert:', dbRecipe);

  const { data, error } = await supabase
    .from('public_recipes')
    .insert(dbRecipe)
    .select()
    .single();

  if (error) {
    console.error('Error creating recipe:', error);
    console.error('Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    console.error('Supabase request failed', error);
    throw new Error(error.message || 'Failed to create recipe');
  }

  const createdRecipe = dbRecipeToRecipe(data);

  if (createdRecipe.imageUrl && isExternalUrl(createdRecipe.imageUrl)) {
    console.log('[createRecipe] Detected external image URL, storing in Supabase...');
    migrateRecipeImageInBackground(createdRecipe.id, createdRecipe.imageUrl);
  }

  return createdRecipe;
}

function isExternalUrl(url: string): boolean {
  if (!url) return false;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  return !url.includes(supabaseUrl) && (
    url.includes('instagram.com') ||
    url.includes('cdninstagram.com') ||
    url.includes('fbcdn.net') ||
    url.includes('http://') ||
    url.includes('https://')
  );
}

async function migrateSavedRecipeImageInBackground(savedRecipeId: string, recipeId: string, imageUrl: string) {
  try {
    console.log('[migrateSavedRecipeImage] Starting migration for saved recipe:', savedRecipeId);
    const permanentUrl = await downloadAndStoreImage(imageUrl, recipeId);

    if (permanentUrl !== imageUrl) {
      const { data: currentData } = await supabase
        .from('saved_recipes')
        .select('recipe_data')
        .eq('id', savedRecipeId)
        .single();

      if (currentData) {
        const updatedRecipeData = {
          ...currentData.recipe_data,
          imageUrl: permanentUrl
        };

        await supabase
          .from('saved_recipes')
          .update({
            recipe_data: updatedRecipeData,
            updated_at: new Date().toISOString()
          })
          .eq('id', savedRecipeId);

        console.log('[migrateSavedRecipeImage] ✅ Successfully migrated saved recipe image');
      }
    }
  } catch (error) {
    console.error('[migrateSavedRecipeImage] Failed to migrate:', error);
  }
}

async function migrateRecipeImageInBackground(recipeId: string, imageUrl: string) {
  try {
    console.log('[migrateRecipeImage] Starting migration for recipe:', recipeId);
    const permanentUrl = await downloadAndStoreImage(imageUrl, recipeId);

    if (permanentUrl !== imageUrl) {
      const { error } = await supabase
        .from('public_recipes')
        .update({ image_url: permanentUrl })
        .eq('id', recipeId);

      if (error) {
        console.error('[migrateRecipeImage] Failed to update recipe:', error);
      } else {
        console.log('[migrateRecipeImage] ✅ Successfully migrated image for recipe:', recipeId);
      }
    }
  } catch (error) {
    console.error('[migrateRecipeImage] Error migrating image:', error);
  }
}

export async function getAllPublicRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase
    .from('public_recipes')
    .select('*')
    .eq('is_public', true)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching recipes:', error);
    throw new Error('Failed to fetch recipes');
  }

  const recipes = (data || []).map(dbRecipeToRecipe);

  checkAndMigrateRecipeImages(recipes);

  return recipes;
}

async function checkAndMigrateRecipeImages(recipes: Recipe[]) {
  const recipesToMigrate = recipes.filter(r => r.imageUrl && isExternalUrl(r.imageUrl));

  if (recipesToMigrate.length > 0) {
    console.log(`[Migration] Found ${recipesToMigrate.length} recipes with external images to migrate`);

    for (const recipe of recipesToMigrate.slice(0, 5)) {
      migrateRecipeImageInBackground(recipe.id, recipe.imageUrl!);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

export async function getRecipeById(id: string): Promise<Recipe | null> {
  const { data, error } = await supabase
    .from('public_recipes')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('Error fetching recipe:', error);
    return null;
  }

  return data ? dbRecipeToRecipe(data) : null;
}

export async function updateRecipe(id: string, updates: Partial<Recipe>): Promise<Recipe> {
  const dbUpdates = recipeToDBRecipe(updates as Recipe);

  const { data, error } = await supabase
    .from('public_recipes')
    .update({ ...dbUpdates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .maybeSingle();

  if (error) {
    console.error('Error updating recipe:', error);
    throw new Error('Failed to update recipe');
  }

  if (!data) {
    throw new Error('Recipe not found or you do not have permission to update it');
  }

  return dbRecipeToRecipe(data);
}

export async function deleteRecipe(id: string): Promise<void> {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  if (!uuidRegex.test(id)) {
    throw new Error('Cannot delete mock recipes - only database recipes can be deleted');
  }

  const { error } = await supabase
    .from('public_recipes')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting recipe:', error);
    throw new Error('Failed to delete recipe');
  }
}
