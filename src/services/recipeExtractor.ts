import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

// Local server — 100% reliable in Bolt
const LOCAL_VIDEO_EXTRACTOR = 'http://localhost:3001/extract';

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

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  const isSocialMedia = 
    url.includes('instagram.com') || 
    url.includes('tiktok.com') || 
    url.includes('youtube.com') || 
    url.includes('youtu.be');

  // SOCIAL MEDIA → LOCAL SERVER (must run `npm run server`)
  if (isSocialMedia) {
    try {
      const res = await fetch(LOCAL_VIDEO_EXTRACTOR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });

      if (!res.ok) {
        throw new Error('Local server not running');
      }

      const data = await res.json();
      const ingredients = parseIngredients(data.ingredients || []);
      const imageUrl = data.thumbnail 
        ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.thumbnail)}&apikey=${SUPABASE_ANON_KEY}`
        : '';

      return {
        title: data.title || 'Video Recipe',
        description: 'Extracted from video audio',
        creator: data.creator || 'Unknown',
        ingredients,
        instructions: data.instructions || [],
        prepTime: String(data.prep_time || 20),
        cookTime: String(data.cook_time || 40),
        servings: data.yield || '4',
        cuisineType: 'Global',
        difficulty: 'Medium',
        mealTypes: ['Dinner'],
        dietaryTags: [],
        imageUrl,
        videoUrl: url,
        notes: 'Extracted using local server',
        sourceUrl: url,
      };
    } catch (err) {
      throw new Error('Instagram/TikTok extraction requires local server. Run: npm run server');
    }
  }

  // REGULAR WEBSITES → Supabase Edge Function
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
    throw new Error('Failed to extract from website');
  }

  const data = await response.json();
  const ingredients = parseIngredients(data.ingredients || []);
  let instructions = data.instructions || [];
  if (typeof instructions === 'string') {
    instructions = instructions.split('\n').map((s: string) => s.trim()).filter(Boolean);
  }

  const imageUrl = data.image 
    ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.image)}&apikey=${SUPABASE_ANON_KEY}`
    : '';

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
    imageUrl,
    videoUrl: '',
    notes: data.notes || '',
    sourceUrl: url,
  };
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

// FIXED: This export was missing → caused your error
export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}