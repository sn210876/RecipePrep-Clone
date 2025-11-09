import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

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
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  console.log('[RecipeExtractor] Calling API:', API_URL);
  console.log('[RecipeExtractor] URL to extract:', url);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Response status:', response.status);

  const data = await response.json();
  console.log('[RecipeExtractor] Raw API Response:', data);

  if (!response.ok) {
    console.error('[RecipeExtractor] API Error:', data);
    if (response.status === 404) {
      throw new Error('Backend not found.');
    }
    const errorDetail = data.detail || '';
    if (errorDetail.includes('Unsupported URL') || errorDetail.includes('not supported')) {
      throw new Error('This recipe site is not supported yet. Try BBC Good Food, Food Network, or Serious Eats.');
    }
    throw new Error('Failed to extract recipe. Try a different recipe website.');
  }

  const parseIngredients = (ings: string[]): Ingredient[] => {
    return ings.map(ing => {
      const trimmed = ing.trim();
      if (!trimmed) return { quantity: '', unit: '', name: '' };
      const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)\s*/);
      const quantity = quantityMatch ? quantityMatch[1].trim() : '';
      let rest = trimmed.slice(quantity.length).trim();
      const unitMatch = rest.match(/^([a-zA-Z]+\.?\s*[a-zA-Z]*)\s+/);
      const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : '';
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
      const name = rest || trimmed;
      return { quantity, unit, name };
    });
  };

  const ingredients = parseIngredients(data.recipe?.ingredients || []);
  let instructions = data.recipe?.instructions || [];
  if (typeof instructions === 'string') {
    instructions = instructions.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
  }

  const result: ExtractedRecipeData = {
    title: data.recipe?.title || 'Untitled Recipe',
    description: 'Extracted recipe',
    creator: data.recipe?.author || 'Unknown',
    ingredients,
    instructions,
    prepTime: String(data.recipe?.prep_time || 30),
    cookTime: String(data.recipe?.cook_time || 45),
    servings: String(data.recipe?.servings || '4'),
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.imageUrl || '',
    notes: data.transcript ? `Description:\n${data.transcript}` : '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] Final result:', result);
  console.log('[RecipeExtractor] Ingredients count:', result.ingredients.length);
  console.log('[RecipeExtractor] Instructions count:', result.instructions.length);

  return result;
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
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}