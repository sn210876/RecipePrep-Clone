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

// BEST INGREDIENT PARSER — handles everything
const parseIngredients = (ings: string[]): Ingredient[] => {
  return (ings || []).map(raw => {
    const ing = raw.trim();
    if (!ing) return { quantity: '', unit: 'cup', name: '' };

    // Match quantity: 1, 1/2, 1½, 2-3, 10.5, etc.
    const qtyMatch = ing.match(/^([\d⅛¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞\.\/\-\s⅟½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅐⅛⅜⅝⅞⅑⅒]+)\s*/);
    const quantity = qtyMatch ? qtyMatch[1].trim() : '';

    let rest = qtyMatch ? ing.slice(qtyMatch[0].length).trim() : ing;

    // Match unit: cup, tsp, tbsp, oz, lb, g, kg, ml, pinch, etc.
    const unitMatch = rest.match(/^(teaspoons?|tsps?\.?|tablespoons?|tbsps?\.?|cups?|c\.?|ounces?|oz\.?|pounds?|lbs?\.?|grams?|g\.?|kilograms?|kgs?\.?|ml|milliliters?|liters?|l\.?|pinch|dash|cloves?|slices?|cans?|packages?|bunches?|heads?|sprigs?)\s+/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase().replace(/\.$/, '') : 'cup';

    if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
    const name = rest || ing;

    return { quantity, unit, name };
  });
};

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) throw new Error('Please enter a valid URL');

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
    const err = await response.text();
    throw new Error('Failed to extract recipe: ' + err);
  }

  const data = await response.json();

  const isSocial = /instagram\.com|tiktok\.com|youtube\.com|youtu\.be/i.test(url);

  return {
    title: data.title || 'Untitled Recipe',
    description: 'Extracted recipe',
    creator: data.author || data.creator || 'Unknown',
    ingredients: parseIngredients(data.ingredients || []),
    instructions: Array.isArray(data.instructions)
      ? data.instructions
      : typeof data.instructions === 'string'
        ? data.instructions.split('\n').map((s: string) => s.trim()).filter(Boolean)
        : [],
    prepTime: String(data.prep_time || 30),
    cookTime: String(data.cook_time || 45),
    servings: String(data.yield || data.servings || '4'),
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.image || data.thumbnail || '',
    videoUrl: isSocial ? url : undefined,
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