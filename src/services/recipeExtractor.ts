import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_PROXY = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// === ADD YOUR RENDER BACKEND HERE (CHANGE TO YOUR REAL URL) ===
const DIRECT_RENDER_URL = 'https://recipe-backend-nodejs-1.onrender.com/extract'; // ← CHANGE IF NEEDED

// Use Supabase proxy first, fallback to direct Render if it fails
const API_URL = SUPABASE_PROXY;

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

  console.log('[RecipeExtractor] Trying Supabase proxy:', SUPABASE_PROXY);
  console.log('[RecipeExtractor] URL to extract:', url);

  let response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  // === FALLBACK TO DIRECT RENDER IF SUPABASE FAILS ===
  if (!response.ok || response.status === 400) {
    console.warn('[RecipeExtractor] Supabase proxy failed, falling back to direct Render backend');
    response = await fetch(DIRECT_RENDER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });
  }

  console.log('[RecipeExtractor] Final response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] Final API Error:', errorText);
    throw new Error('Failed to extract recipe. Try a different recipe website.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Raw API Response:', data);

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

  const ingredients = parseIngredients(data.ingredients || []);
  let instructions = data.instructions || [];
  if (typeof instructions === 'string') {
    instructions = instructions.split('\n').map((s: string) => s.trim()).filter((s: string) => s);
  }

  const result: ExtractedRecipeData = {
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
    imageUrl: data.image || '',
    notes: data.notes || data.transcript ? `Description:\n${data.transcript || data.notes}` : '',
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