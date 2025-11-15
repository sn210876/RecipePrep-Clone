import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vohvdarghgqskzqjclux.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const RECIPE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

// YOUR WORKING RENDER.COM VIDEO EXTRACTOR (still perfect)
const RENDER_VIDEO_EXTRACTOR = 'https://recipe-backend-nodejs-1.onrender.com/extract';

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

  const isSocialMedia =
    url.includes('instagram.com') ||
    url.includes('tiktok.com') ||
    url.includes('youtube.com') ||
    url.includes('youtu.be');

  // SOCIAL MEDIA → RENDER.COM (your old perfect video extractor)
  if (isSocialMedia) {
    console.log('[RecipeExtractor] Social media detected → using Render.com extractor');
    try {
      const response = await fetch(RENDER_VIDEO_EXTRACTOR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!response.ok) {
        const err = await response.text();
        console.error('Render extractor failed:', err);
        throw new Error('Failed to extract from video. Try a different link.');
      }

      const data = await response.json();
      console.log('[RecipeExtractor] Render.com success:', data);

      const ingredients = parseIngredients(data.ingredients || []);
      const proxiedImage = data.thumbnail
        ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.thumbnail)}&apikey=${SUPABASE_ANON_KEY}`
        : '';

      return {
        title: data.title || 'Video Recipe',
        description: 'Extracted from video',
        creator: data.creator || 'Unknown',
        ingredients,
        instructions: data.instructions || [],
        prepTime: String(data.prep_time || 15),
        cookTime: String(data.cook_time || 30),
        servings: data.yield || '4',
        cuisineType: 'Global',
        difficulty: 'Medium',
        mealTypes: ['Dinner'],
        dietaryTags: [],
        imageUrl: proxiedImage,
        videoUrl: url,
        notes: data.notes || 'Extracted from video audio',
        sourceUrl: url,
      };
    } catch (e) {
      console.error('Render extractor error:', e);
      throw new Error('Video extraction failed. Try a different link.');
    }
  }

  // REGULAR WEBSITES → SUPABASE (AllRecipes, etc.)
  console.log('[RecipeExtractor] Regular website → using Supabase');
  const response = await fetch(RECIPE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Supabase response status:', response.status);
  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] Supabase error:', errorText);
    throw new Error('Failed to extract recipe. Try a different URL.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Supabase raw response:', data);

  if (!data.title || !data.ingredients || !data.instructions) {
    throw new Error('Invalid recipe data received from server');
  }

  const ingredients = parseIngredients(data.ingredients);
  const proxiedImageUrl = data.image
    ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.image)}&apikey=${SUPABASE_ANON_KEY}`
    : '';

  const result: ExtractedRecipeData = {
    title: data.title,
    description: 'Extracted recipe',
    creator: 'Unknown',
    ingredients,
    instructions: data.instructions,
    prepTime: data.prep_time ? String(data.prep_time) : '30',
    cookTime: data.cook_time ? String(data.cook_time) : '45',
    servings: data.yield || '4',
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: proxiedImageUrl,
    videoUrl: '',
    notes: data.notes || '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] FINAL RESULT:', result);
  return result;
}

// YOUR ORIGINAL INGREDIENT PARSER — 100% untouched
const parseIngredients = (ings: string[]): Ingredient[] => {
  return ings.map(ing => {
    const trimmed = ing.trim();
    if (!trimmed) return { quantity: '', unit: 'cup', name: '' };
    const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)\s*/);
    const quantity = quantityMatch ? quantityMatch[1].trim() : '';
    let rest = trimmed.slice(quantity.length).trim();
    const unitMatch = rest.match(/^(cups?|tbsps?|tsps?|tablespoons?|teaspoons?|ozs?|ounces?|lbs?|pounds?|grams?|kgs?|kilograms?|mls?|milliliters?|liters?|pinch|dash|cloves?|stalks?|pieces?|slices?|packages?)\s+/i);
    const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : 'cup';
    if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
    const name = rest || trimmed;
    return { quantity, unit, name };
  });
};

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