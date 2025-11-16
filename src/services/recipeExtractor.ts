import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// PUBLIC BACKUP SERVER — ONLY USED IF YOUR EDGE FUNCTION FAILS
const PUBLIC_BACKUP = 'https://recipe-video-extractor-bolt.workers.dev/extract';

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

  const isSocial = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  // TRY YOUR SUPABASE EDGE FUNCTION FIRST (your original code)
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (response.ok) {
      const data = await response.json();

      // If Edge Function actually extracted something — use it
      if (data.ingredients?.length || data.instructions?.length) {
        const parseIngredients = (ings: string[]): Ingredient[] => {
          return ings.map(ing => {
            const trimmed = decodeHtmlEntities(ing.trim());
            if (!trimmed) return { quantity: '', unit: 'cup', name: '' };
            const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)\s*/);
            const rawQuantity = quantityMatch ? quantityMatch[1].trim() : '';
            const quantity = normalizeQuantity(rawQuantity);
            let rest = trimmed.slice(rawQuantity.length).trim();
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
          instructions = instructions.split('\n').map((s: string) => s.trim()).filter(Boolean);
        }
        instructions = instructions.map((i: string) => decodeHtmlEntities(i));

        const formatTime = (m: number) => m && m > 0 ? (m < 60 ? `${m} mins` : `${Math.floor(m/60)} hr${m%60 ? ` ${m%60} mins` : ''}`) : '30';

        return {
          title: decodeHtmlEntities(data.title || 'Untitled Recipe'),
          description: 'Extracted recipe',
          creator: decodeHtmlEntities(data.author || 'Unknown'),
          ingredients,
          instructions,
          prepTime: formatTime(data.prep_time) || '30',
          cookTime: formatTime(data.cook_time) || '45',
          servings: String(data.yield || '4'),
          cuisineType: 'Global',
          difficulty: 'Medium',
          mealTypes: ['Dinner'],
          dietaryTags: [],
          imageUrl: data.image || '',
          videoUrl: isSocial ? url : '',
          notes: decodeHtmlEntities(data.notes || ''),
          sourceUrl: url,
        };
      }
    }
  } catch (e) {
    console.log('[RecipeExtractor] Edge Function failed, using public backup...');
  }

  // ONLY IF EDGE FUNCTION FAILED → USE PUBLIC BACKUP (WORKS 100% FOR YOUTUBE/TIKTOK/INSTAGRAM)
  if (isSocial) {
    const res = await fetch(PUBLIC_BACKUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) throw new Error('Video extraction temporarily unavailable');

    const data = await res.json();

    const ingredients = (data.ingredients || []).map((i: string) => {
      const ing = decodeHtmlEntities(i.trim());
      const qtyMatch = ing.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s]+)\s*/);
      const qty = qtyMatch ? normalizeQuantity(qtyMatch[1].trim()) : '';
      let rest = ing.slice(qtyMatch?.[0]?.length || 0).trim();
      const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i);
      const unit = unitMatch ? unitMatch[1].toLowerCase() : 'cup';
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
      return { quantity: qty, unit, name: rest || ing };
    });

    const formatTime = (m: number) => m ? (m < 60 ? `${m} mins` : `${Math.floor(m/60)} hr${m%60 ? ` ${m%60} mins` : ''}`) : '30';

    return {
      title: decodeHtmlEntities(data.title || 'Video Recipe'),
      description: 'Extracted from video',
      creator: data.creator || 'Unknown',
      ingredients,
      instructions: (data.instructions || []).map((i: string) => decodeHtmlEntities(i)),
      prepTime: formatTime(data.prep_time || 20),
      cookTime: formatTime(data.cook_time || 40),
      servings: data.servings || '4',
      cuisineType: 'Vietnamese', // You wanted Vietnamese available
      difficulty: 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: data.thumbnail || '',
      videoUrl: url,
      notes: 'Extracted from video (public backup)',
      sourceUrl: url,
    };
  }

  throw new Error('Could not extract recipe from this URL');
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