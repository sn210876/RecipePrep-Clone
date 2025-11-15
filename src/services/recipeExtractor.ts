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
  videoUrl?: string;
  notes: string;
  sourceUrl: string;
}

const parseIngredients = (ings: string[]): Ingredient[] => {
  return (ings || []).map(ing => {
    const trimmed = ing.trim();
    if (!trimmed) return { quantity: '', unit: 'cup', name: '' };

    // MUCH BETTER REGEX — handles 1 cup, 2 tsp, 1/2 lb, 3-4 cloves, etc.
    const quantityMatch = trimmed.match(/^([\d⅛⅙¼⅓½⅔¾⅞⅕⅖⅗⅘⅙⅚⅐⅑⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\.\/\-\s⅟½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s*/);
    const quantity = quantityMatch ? quantityMatch[1].trim() : '';

    let rest = trimmed;
    if (quantityMatch) rest = trimmed.slice(quantityMatch[0].length).trim();

    // Common units
    const unitMatch = rest.match(/^(teaspoons?|tsp\.?|tablespoons?|tbsp\.?|cups?|c\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kg\.?|ml|milliliters?|liters?|l\.?|pinch|dash|cloves?|slices?|cans?|packages?|bunches?|heads?|sprigs?)\s+/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase().replace(/\.$/, '') : 'cup';

    if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
    const name = rest || trimmed;

    return { quantity, unit, name };
  });
};

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  console.log('[RecipeExtractor] Extracting from:', url);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] Error:', errorText);
    throw new Error('Failed to extract recipe. Try a different URL.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Raw data:', data);

  const ingredients = parseIngredients(data.ingredients || []);
  const instructions = Array.isArray(data.instructions)
    ? data.instructions
    : typeof data.instructions === 'string'
      ? data.instructions.split('\n').map(s => s.trim()).filter(Boolean)
      : [];

  const isSocialMedia = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  return {
    title: data.title || 'Untitled Recipe',
    description: 'Extracted recipe',
    creator: data.author || 'Unknown',
    ingredients,
    instructions,
    prepTime: String(data.prep_time || data.time || 30),
    cookTime: String(data.cook_time || data.time || 45),
    servings: String(data.yield || '4'),
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.image || data.thumbnail || '',
    videoUrl: isSocialMedia ? url : undefined,
    notes: data.notes || '',
    sourceUrl: url,
  };
}

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function getPlatformFromUrl(url: string): string {
  if (/tiktok\.com/i.test(url)) return 'TikTok';
  if (/instagram\.com/i.test(url)) return 'Instagram';
  if (/youtube\.com|youtu\.be/i.test(url)) return 'YouTube';
  return 'Website';
}