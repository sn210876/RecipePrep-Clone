import { Ingredient } from '@/types/recipe';

// Use Render API endpoint
const API_URL = 'https://recipeapi-py.onrender.com/extract';

export interface ExtractedRecipeData {
  title: string;
  description: string;
  creator: string;
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: string;
  cookTime: string;
  servings: string;
  cuisineType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  mealTypes: string[];
  dietaryTags: string[];
  imageUrl: string;
  notes: string;
  sourceUrl: string;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(error || 'Failed to extract recipe from URL');
    }

    const data = await response.json();

    // Handle video transcripts (YouTube, Instagram, TikTok)
    if (data.transcript && data.transcript.length > 500) {
      console.log('Video detected! Transcript available:', data.transcript.substring(0, 200));
    }

    // Check if recipe extraction failed
    const hasNoData = !data.recipe ||
                      !data.recipe.title ||
                      data.recipe.title === 'Unavailable' ||
                      (data.recipe.ingredients?.length === 0 && data.recipe.instructions?.length === 0);

    if (hasNoData) {
      throw new Error(
        'Could not extract recipe from this URL. ' +
        'Try a public recipe website like AllRecipes.com, or use manual entry.'
      );
    }

    // Parse ingredients from string format to structured format
    const parseIngredients = (ingredients: string[]): Ingredient[] => {
      if (!ingredients || ingredients.length === 0) {
        throw new Error('No ingredients found in the recipe.');
      }

      return ingredients.map(ing => {
        const parts = ing.trim().split(' ');
        const quantity = parts[0] || '1';
        const unit = parts[1] || 'piece';
        const name = parts.slice(2).join(' ') || ing;

        return { quantity, unit, name };
      });
    };

    // Handle video sources differently
    const isVideo = data.recipe.source === 'video';

    return {
      title: data.recipe.title || 'Untitled Recipe',
      description: data.recipe.description || 'Delicious recipe',
      creator: data.recipe.author || '@unknown',
      ingredients: isVideo && data.recipe.ingredients?.length === 0
        ? []
        : parseIngredients(data.recipe.ingredients),
      instructions: data.recipe.instructions || [],
      prepTime: String(data.recipe.prep_time || data.recipe.time || 10),
      cookTime: String(data.recipe.cook_time || data.recipe.cookTime || 20),
      servings: String(data.recipe.servings || data.recipe.serves || 2),
      cuisineType: data.recipe.cuisine || 'Global',
      difficulty: (data.recipe.difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard',
      mealTypes: data.recipe.mealTypes || ['Dinner'],
      dietaryTags: data.recipe.dietary || [],
      imageUrl: data.imageUrl || data.thumb || '',
      notes: data.transcript ? `Video Transcript:\n${data.transcript.slice(0, 500)}...` : '',
      sourceUrl: url,
    };
  } catch (err: any) {
    console.error('Extraction error:', err);

    if (err.message?.includes('fetch') || err.name === 'TypeError') {
      throw new Error('Cannot connect to recipe extraction service. Please check your internet connection.');
    }

    throw new Error(err.message || 'Failed to extract recipe. Please try a different URL.');
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function getPlatformFromUrl(url: string): string {
  return url.includes('instagram') ? 'Instagram' : 'Website';
}
