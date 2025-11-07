import { Ingredient } from '@/types/recipe';

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
    throw new Error('Please paste a valid Instagram reel URL');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || 'Failed to extract recipe — try another reel');
  }

  const data = await response.json();

  return {
    title: data.recipe.title,
    description: data.recipe.description || 'Delicious recipe extracted from Instagram',
    creator: data.creator || '@unknown',
    ingredients: data.recipe.ingredients.map((ing: string) => ({
      quantity: ing.split(' ')[0] || '',
      unit: ing.split(' ').slice(1, -1).join(' ') || '',
      name: ing.split(' ').slice(-1)[0] || ing,
    })),
    instructions: data.recipe.steps,
    prepTime: data.recipe.time || '10',
    cookTime: data.recipe.cookTime || '20',
    servings: data.recipe.serves || '2',
    cuisineType: data.recipe.cuisine || 'Global',
    difficulty: (data.recipe.difficulty || 'Easy') as 'Easy' | 'Medium' | 'Hard',
    mealTypes: data.recipe.mealTypes || ['Dinner'],
    dietaryTags: data.recipe.dietary || [],
    imageUrl: data.thumb || data.recipe.imageUrl || '',
    notes: data.transcript ? `Transcript: ${data.transcript.slice(0, 200)}...` : '',
    sourceUrl: url,
  };
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return url.includes('instagram.com');
  } catch {
    return false;
  }
}

export function getPlatformFromUrl(url: string): string {
  return url.includes('instagram') ? 'Instagram' : 'Website';
}