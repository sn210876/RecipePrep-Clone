import { Ingredient } from '@/types/recipe';

// Use Supabase Edge Function proxy to avoid CORS issues
const API_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-proxy`;

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

  console.log('[RecipeExtractor] Calling API:', API_URL);
  console.log('[RecipeExtractor] URL to extract:', url);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Response status:', response.status);

  if (!response.ok) {
    const error = await response.json();
    console.error('[RecipeExtractor] API Error:', error);
    throw new Error(error.detail || error.error || 'Failed to extract recipe');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] API Response:', data);

  let instructions = data.recipe.instructions || [];
  if (typeof instructions === 'string') {
    instructions = instructions
      .split('\n')
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);
  }

  const isVideo = data.recipe.source === 'video';

  const hasRecipe = data.recipe && data.recipe.title && data.recipe.title !== 'Unavailable';

  if (!hasRecipe && !isVideo) {
    throw new Error('No recipe found. Try AllRecipes, BBC, or a public blog.');
  }

  const parseIngredients = (ings: string[]): Ingredient[] => {
    if (!ings || ings.length === 0) return [];
    return ings.map(ing => {
      const trimmed = ing.trim();
      if (!trimmed) return { quantity: '', unit: '', name: '' };

      const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)?\s*/);
      const quantity = quantityMatch ? (quantityMatch[1]?.trim() || '') : '';

      let rest = trimmed.slice(quantity.length).trim();

      const unitMatch = rest.match(/^([a-zA-Z]+\.?\s*[a-zA-Z]*\.?)\s+/);
      const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : '';

      if (unitMatch) {
        rest = rest.slice(unitMatch[0].length).trim();
      }

      const name = rest || trimmed;

      return {
        quantity: quantity || '',
        unit: unit || '',
        name: name || trimmed
      };
    });
  };

  const result = {
    title: data.recipe.title || 'Untitled Recipe',
    description: isVideo ? 'Recipe from video' : 'Delicious homemade recipe',
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
    notes: isVideo && data.transcript ? `Video Transcript:\n${data.transcript.slice(0, 1000)}...` : '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] Parsed result:', result);
  console.log('[RecipeExtractor] Ingredients count:', result.ingredients.length);
  console.log('[RecipeExtractor] Instructions count:', result.instructions.length);

  return result;
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}