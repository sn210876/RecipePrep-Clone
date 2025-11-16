import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// NEW SERVER — YouTube = description only (fast + reliable, just like TikTok/IG)
const YOUTUBE_FAST_SERVER = 'https://youtube-description-extractor.deno.dev/extract';

export async function extractRecipeFromUrl(url: string): Promise<any> {
  if (!url.trim() || !isValidUrl(url)) throw new Error('Please enter a valid URL');

  const isYouTube = /youtube\.com|youtu\.be/i.test(url);
  const isSocial = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  // 1. Normal websites → your perfect Supabase function
  if (!isSocial) {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) throw new Error('Failed to extract from website');
    return await res.json();
  }

  // 2. YouTube → fast description-only extractor (exactly like TikTok/Instagram)
  if (isYouTube) {
    const res = await fetch(YOUTUBE_FAST_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) throw new Error('Reading YouTube description… try again in 5s');

    const data = await res.json();

    const ingredients = (data.ingredients || []).map((i: string) => {
      const ing = decodeHtmlEntities(i.trim());
      const qty = ing.match(/^[\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+/)?.[0]?.trim() || '';
      let rest = ing.slice(qty.length).trim();
      const unitMatch = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i);
      const unit = unitMatch ? unitMatch[1].toLowerCase() : 'cup';
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();
      return { quantity: normalizeQuantity(qty), unit, name: rest || ing };
    });

    const formatTime = (m: number) => m ? (m < 60 ? `${m} mins` : `${Math.floor(m/60)} hr${m%60 ? ` ${m%60} mins` : ''}`) : '30';

    return {
      title: decodeHtmlEntities(data.title || 'YouTube Recipe'),
      description: 'Extracted from video description',
      creator: data.channel || 'Unknown',
      ingredients,
      instructions: (data.instructions || []).map(decodeHtmlEntities),
      prepTime: formatTime(data.prep_time || 15),
      cookTime: formatTime(data.cook_time || 35),
      servings: data.servings || '4',
      cuisineType: 'Global',
      difficulty: 'Medium' as const,
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: data.thumbnail || '',
      videoUrl: url,
      notes: 'Extracted from YouTube description (fast mode)',
      sourceUrl: url,
    };
  }

  // 3. TikTok + Instagram → keep using your current working method
  // (they already work perfectly via your Supabase function)
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  if (!res.ok) throw new Error('Failed to extract from social media');
  return await res.json();
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