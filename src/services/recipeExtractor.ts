import { Ingredient } from '@/types/recipe';

// Use local server endpoint
const API_URL = 'http://localhost:3000/api/extract-recipe-from-video';

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
      throw new Error(error || 'Failed to extract recipe. Make sure the extraction server is running with: npm run server');
    }

    const data = await response.json();

    if (!data.success || !data.recipe) {
      throw new Error('No recipe data returned from server');
    }

    const recipe = data.recipe;

    return {
      title: recipe.title || 'Untitled Recipe',
      description: recipe.description || 'Delicious recipe extracted from video',
      creator: '@user',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      prepTime: String(recipe.prepTime || 10),
      cookTime: String(recipe.cookTime || 20),
      servings: String(recipe.servings || 2),
      cuisineType: recipe.cuisine || 'Global',
      difficulty: (recipe.difficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard',
      mealTypes: ['Dinner'],
      dietaryTags: recipe.dietaryTags || [],
      imageUrl: recipe.imageUrl || '',
      notes: '',
      sourceUrl: url,
    };
  } catch (err: any) {
    console.error('Extraction error:', err);

    if (err.message?.includes('fetch')) {
      throw new Error('Cannot connect to extraction server. Start it with: npm run server');
    }

    throw new Error(err.message || 'Failed to extract recipe');
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
