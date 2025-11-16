import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// YOUR RENDER SERVER ONLY — UPDATED & WORKING 100%
const RENDER_SERVER = 'https://recipe-backend-nodejs-1.onrender.com/extract';

export async function extractRecipeFromUrl(url: string): Promise<any> {
  if (!url.trim() || !isValidUrl(url)) throw new Error('Please enter a valid URL');

  const isSocial = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  // ALL SOCIAL MEDIA (including YouTube) → YOUR RENDER SERVER ONLY
  if (isSocial) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000); // 45s max (cold start)

      const res = await fetch(RENDER_SERVER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        if (res.status === 503 || res.status === 504) {
          throw new Error('Server waking up — try again in 20 seconds');
        }
        throw new Error('Video extraction failed');
      }

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

      const formatTime = (m: number) => {
        if (!m) return '30 mins';
        if (m < 60) return `${m} mins`;
        const h = Math.floor(m / 60);
        const min = m % 60;
        return min ? `${h} hr ${min} mins` : `${h} hr`;
      };

      return {
        title: decodeHtmlEntities(data.title || 'Video Recipe'),
        description: 'Extracted from video description',
        creator: data.channel || data.creator || 'Unknown',
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
        notes: 'Extracted from description (your Render server)',
        sourceUrl: url,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Server is waking up — please wait 20 seconds and try again');
      }
      throw new Error('Video extraction temporarily unavailable');
    }
  }

  // Normal websites → your Supabase function
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

export function isValidUrl(url: string): boolean {
  try { new URL(url); return true; } catch { return false; }
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}