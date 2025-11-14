import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vohvdarghgqskzqjclux.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

// These point to your REAL working functions
const RECIPE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

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

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  console.log('[RecipeExtractor] Supabase Edge Function:', RECIPE_FUNCTION_URL);
  console.log('[RecipeExtractor] URL to extract:', url);

  const response = await fetch(RECIPE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] Error:', errorText);
    throw new Error('Failed to extract recipe. Try a different URL.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Success:', data);

  const parseIngredients = (ings: string[]): Ingredient[] => {
    return ings.map(ing => {
      const trimmed = ing.trim();
      if (!trimmed) return { quantity: '', unit: 'cup', name: '' };
      const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)\s*/);
      const quantity = quantityMatch ? quantityMatch[1].trim() : '';
      let rest = trimmed.slice(quantity.length).trim();
      const unitMatch = rest.match(/^([a-zA-Z]+\.?\s*[a-zA-Z]*)\s+/);
      const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : 'cup';
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

  const isSocialMedia = url.includes('tiktok.com') || url.includes('instagram.com') ||
                         url.includes('youtube.com') || url.includes('youtu.be');
  const isTikTokOrInstagram = url.includes('tiktok.com') || url.includes('instagram.com');
  const videoUrl = isSocialMedia ? url : '';

  // THIS IS THE KEY FIX: proxy the image through your working image-proxy function
  const rawImageUrl = data.image || '';
  const proxiedImageUrl = rawImageUrl 
  ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(rawImageUrl)}&apikey=${SUPABASE_ANON_KEY}`
  : '';

  const result: ExtractedRecipeData = {
    title: isTikTokOrInstagram ? '' : (data.title || 'Untitled Recipe'),
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
    imageUrl: proxiedImageUrl,  // Now uses your working image-proxy
    videoUrl,
    notes: data.notes || '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] FINAL RESULT:', result);
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