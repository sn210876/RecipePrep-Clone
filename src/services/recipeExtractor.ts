import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

// THIS SERVER IS ALWAYS AWAKE — NO COLD STARTS — 100% PUBLIC
const FAST_VIDEO_EXTRACTOR = 'https://recipe-video-extractor.up.railway.app/extract';

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

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  const isSocialMedia = 
    url.includes('tiktok.com') || 
    url.includes('instagram.com') || 
    url.includes('youtube.com') || 
    url.includes('youtu.be');

  // SOCIAL MEDIA → FAST, ALWAYS-AWAKE SERVER
  if (isSocialMedia) {
    console.log('[RecipeExtractor] Using FAST public server (no cold start)');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      const res = await fetch(FAST_VIDEO_EXTRACTOR, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) throw new Error('Server error');

      const data = await res.json();

      const ingredients = parseIngredients(data.ingredients || []);
      const imageUrl = data.thumbnail ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.thumbnail)}&apikey=${SUPABASE_ANON_KEY}` : '';

      return {
        title: data.title || 'Video Recipe',
        description: 'Extracted from spoken audio',
        creator: data.creator || 'Unknown',
        ingredients,
        instructions: data.instructions || [],
        prepTime: String(data.prep_time || 20),
        cookTime: String(data.cook_time || 40),
        servings: data.servings || '4',
        cuisineType: 'Global',
        difficulty: 'Medium',
        mealTypes: ['Dinner'],
        dietaryTags: [],
        imageUrl,
        videoUrl: url,
        notes: 'Extracted from video using public server',
        sourceUrl: url,
      };
    } catch (err) {
      throw new Error('Video extraction taking longer than usual — try again in 10 seconds!');
    }
  }

  // REGULAR WEBSITES → SUPABASE
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
    throw new Error('Failed to extract recipe from website');
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
    prepTime: String(data.prep_time || 30),
    cookTime: String(data.cook_time || 45),
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
  try { new URL(url); return true; } catch { return false; }
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}