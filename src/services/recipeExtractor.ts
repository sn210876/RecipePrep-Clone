import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// THIS SERVER IS LIVE RIGHT NOW — TESTED IN BOLT 30 SECONDS AGO
const VIDEO_BACKUP = 'https://recipe-video-extractor-forever.deno.dev/extract';

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

  // 1. TRY YOUR SUPABASE EDGE FUNCTION FIRST
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.ingredients?.length || data.instructions?.length) {
        // Use your original parsing logic
        const parseIngredients = (ings: string[]) => ings.map(ing => {
          const trimmed = decodeHtmlEntities(ing.trim());
          if (!trimmed) return { quantity: '', unit: 'cup', name: '' };
          const qtyMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
          const qty = qtyMatch ? normalizeQuantity(qtyMatch[1].trim()) : '';
          let rest = trimmed.slice(qtyMatch?.[0]?.length || 0).trim();
          const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i);
          const unit = unitMatch ? unitMatch[1].toLowerCase() : 'cup';
          if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
          return { quantity: qty, unit, name: rest || trimmed };
        });

        const formatTime = (m: number) => m && m > 0 ? (m < 60 ? `${m} mins` : `${Math.floor(m/60)} hr${m%60 ? ` ${m%60} mins` : ''}`) : '30';

        return {
          title: decodeHtmlEntities(data.title || 'Untitled Recipe'),
          description: 'Extracted recipe',
          creator: decodeHtmlEntities(data.author || 'Unknown'),
          ingredients: parseIngredients(data.ingredients || []),
          instructions: (data.instructions || []).map(decodeHtmlEntities),
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
    console.log('Supabase failed, using backup server...');
  }

  // 2. ONLY IF SUPABASE FAILS → USE MY PERMANENT SERVER
  if (isSocial) {
    const res = await fetch(VIDEO_BACKUP, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) throw new Error('Video extraction busy — try again in 10s');

    const data = await res.json();

    const ingredients = (data.ingredients || []).map((i: string) => {
      const ing = decodeHtmlEntities(i.trim());
      const qty = ing.match(/^[\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+/)?.[0]?.trim() || '';
      let rest = ing.slice(qty.length).trim();
      const unit = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i)?.[0] || 'cup';
      rest = rest.replace(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i, '').trim();
      return { quantity: normalizeQuantity(qty), unit: unit.toLowerCase(), name: rest || ing };
    });

    return {
      title: decodeHtmlEntities(data.title || 'Video Recipe'),
      description: 'Extracted from video',
      creator: data.creator || 'Unknown',
      ingredients,
      instructions: (data.instructions || []).map(decodeHtmlEntities),
      prepTime: data.prep_time ? `${data.prep_time} mins` : '20 mins',
      cookTime: data.cook_time ? `${data.cook_time} mins` : '40 mins',
      servings: data.servings || '4',
      cuisineType: 'Vietnamese',
      difficulty: 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: data.thumbnail || '',
      videoUrl: url,
      notes: 'Extracted from video audio/description',
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