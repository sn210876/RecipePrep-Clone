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
    throw new Error('Please enter a valid URL');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || error.error || 'Failed to extract recipe');
  }

  const data = await response.json();

  // FIX: Handle instructions as string OR array
  let instructions = data.recipe.instructions || [];
  if (typeof instructions === 'string') {
    instructions = instructions
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  // FIX: Better detection of empty recipe
  const hasRecipe = data.recipe && 
                    data.recipe.title && 
                    data.recipe.title !== 'Unavailable' &&
                    (data.recipe.ingredients?.length > 0 || instructions.length > 0);

  if (!hasRecipe && !data.transcript) {
    throw new Error('No recipe found. Try AllRecipes or a public blog.');
  }

  const parseIngredients = (ings: string[]): Ingredient[] => {
    return ings.map(ing => {
      const trimmed = ing.trim();
      if (!trimmed) return { quantity: '1', unit: '', name: '' };
      
      const match = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s]+)\s*([^\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s]+)?\s*(.*)$/);
      if (match) {
        return {
          quantity: match[1].trim(),
          unit: match[2]?.trim() || '',
          name: match[3].trim() || trimmed
        };
      }
      return { quantity: '1', unit: '', name: trimmed };
    });
  };

  const isVideo = data.recipe.source === 'video' || data.transcript?.length > 500;

  return {
    title: data.recipe.title || 'Untitled Recipe',
    description: data.recipe.description || (isVideo ? 'Recipe from video' : 'Delicious homemade recipe'),
    creator: data.recipe.author || (isVideo ? 'Video Creator' : 'Unknown'),
    ingredients: isVideo ? [] : parseIngredients(data.recipe.ingredients || []),
    instructions: instructions,
    prepTime: String(data.recipe.prep_time || 15),
    cookTime: String(data.recipe.cook_time || 30),
    servings: String(data.recipe.servings || 4),
    cuisineType: 'Global',
    difficulty: 'Medium' as const,
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.imageUrl || '',
    notes: data.transcript ? `Transcript:\n${data.transcript.slice(0, 1000)}...` : '',
    sourceUrl: url,
  };
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}