import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// YOUR RENDER SERVER ONLY — 100% FINAL VERSION
const RENDER_SERVER = 'https://recipe-backend-nodejs-1.onrender.com/extract';

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

  // ALL SOCIAL MEDIA (YouTube, TikTok, Instagram) → YOUR RENDER SERVER ONLY
  // ALL SOCIAL MEDIA (YouTube, TikTok, Instagram) → YOUR RENDER SERVER ONLY
if (isSocial) {
  try {
    console.log('[Extractor] Sending to Render server:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000); // 50s max

    const response = await fetch(RENDER_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Extractor] Server response not OK:', response.status);
      if (response.status >= 500 || response.status === 429) {
        throw new Error('Server waking up — try again in 20 seconds');
      }
      const errorText = await response.text();
      console.error('[Extractor] Error response:', errorText);
      throw new Error('Video extraction failed');
    }

    const data = await response.json();
    console.log('[Extractor] Raw data from server:', data);
    console.log('[Extractor] Thumbnail/Image URLs:', {
      thumbnail: data.thumbnail,
      image: data.image,
      finalImageUrl: data.thumbnail || data.image || ''
    });

    // Normalize ingredients with your existing logic
    const ingredients = (data.ingredients || []).map((ing: string) => {
      const cleaned = decodeHtmlEntities(ing.trim());
      if (!cleaned) return { quantity: '', unit: 'cup', name: '' };

      const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]+)\s*/);
      const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
      const quantity = normalizeQuantity(rawQty);

      let rest = cleaned.slice(rawQty.length).trim();
      const unitMatch = rest.match(/^(cup|cups|tbsp|tablespoon|tsp|teaspoon|oz|ounce|lb|pound|g|gram|kg|ml|l|pinch|dash)\s+/i);
      const unit = unitMatch ? unitMatch[1].toLowerCase().replace(/s$/, '') : 'cup';
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();

      return { quantity, unit, name: rest || cleaned };
    });

    const formatTime = (mins: number): string => {
      if (!mins || mins <= 0) return '30 mins';
      if (mins < 60) return `${mins} mins`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h} hr ${m} mins` : `${h} hr`;
    };

    const finalImageUrl = data.thumbnail || data.image || '';
    console.log('[Extractor] Final image URL being returned:', finalImageUrl);

    return {
      title: decodeHtmlEntities(data.title || data.channel || 'Video Recipe'),
      description: 'Extracted from video',
      creator: decodeHtmlEntities(data.channel || data.creator || 'Unknown'),
      ingredients,
      instructions: (data.instructions || []).map((i: string) => decodeHtmlEntities(i)),
      prepTime: formatTime(data.prep_time || 15),
      cookTime: formatTime(data.cook_time || 35),
      servings: data.servings || data.yield || '4',
      cuisineType: 'Global',
      difficulty: 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: finalImageUrl,
      videoUrl: url,
      notes: 'Extracted using your Render server',
      sourceUrl: url,
    };
  } catch (err: any) {
    console.error('[Extractor] Catch block error:', err);
    if (err.name === 'AbortError') {
      throw new Error('Server is waking up — please wait 20-30 seconds and try again');
    }
    throw new Error('Video extraction temporarily unavailable — try again soon');
  }
}

  // Normal websites → Supabase Edge Function
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
    await response.text();
    throw new Error('Failed to extract from website');
  }

  const data = await response.json();

  const ingredients = (data.ingredients || []).map((ing: string) => {
    const cleaned = decodeHtmlEntities(ing.trim());
    const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
    const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
    const quantity = normalizeQuantity(rawQty);
    let rest = cleaned.slice(rawQty.length).trim();
    const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i);
    const unit = unitMatch ? unitMatch[1].toLowerCase() : 'cup';
    if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
    return { quantity, unit, name: rest || cleaned };
  });

  return {
    title: decodeHtmlEntities(data.title || 'Untitled Recipe'),
    description: 'Extracted recipe',
    creator: decodeHtmlEntities(data.author || 'Unknown'),
    ingredients,
    instructions: (data.instructions || []).map(decodeHtmlEntities),
    prepTime: data.prep_time ? `${data.prep_time} mins` : '30 mins',
    cookTime: data.cook_time ? `${data.cook_time} mins` : '45 mins',
    servings: String(data.yield || '4'),
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.image || '',
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

export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}