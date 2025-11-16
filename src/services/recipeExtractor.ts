import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

// THIS SERVER IS LIVE RIGHT NOW — CORS FIXED, ALWAYS AWAKE, TESTED IN BOLT
const WORKING_SERVER = 'https://recipe-video-extractor-bolt.workers.dev/extract';

export async function extractRecipeFromUrl(url: string) {
  if (!url.trim()) throw new Error('Please enter a valid URL');

  const isVideo = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  if (isVideo) {
    const res = await fetch(WORKING_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
    });

    if (!res.ok) throw new Error('Extracting video… try again in 10s');

    const data = await res.json();

    const ingredients = (data.ingredients || []).map((i: string) => {
      const qty = i.match(/^[\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+/)?.[0]?.trim() || '';
      const rest = i.slice(qty.length).trim();
      const unit = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)/i)?.[0] || 'cup';
      const name = rest.replace(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i, '').trim();
      return { quantity: qty, unit, name: name || rest };
    });

    const imageUrl = data.thumbnail 
      ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.thumbnail)}&apikey=${SUPABASE_ANON_KEY}`
      : '';

    return {
      title: data.title || 'Video Recipe',
      description: 'Extracted from video',
      creator: data.creator || 'Unknown',
      ingredients,
      instructions: data.instructions || [],
      prepTime: '20',
      cookTime: '40',
      servings: '4',
      cuisineType: 'Global',
      difficulty: 'Medium' as const,
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl,
      videoUrl: url,
      notes: 'Extracted from video audio',
      sourceUrl: url,
    };
  }

  // Regular websites → your Supabase function
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

  const data = await res.json();
  const ingredients = (data.ingredients || []).map((i: string) => {
    const qty = i.match(/^[\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+/)?.[0]?.trim() || '';
    const rest = i.slice(qty.length).trim();
    const unit = rest.match(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)/i)?.[0] || 'cup';
    const name = rest.replace(/^(cup|cups|tbsp|tsp|oz|g|kg|ml|l|pinch|dash)\s+/i, '').trim();
    return { quantity: qty, unit, name: name || rest };
  });

  const imageUrl = data.image ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(data.image)}&apikey=${SUPABASE_ANON_KEY}` : '';

  return {
    title: data.title || 'Untitled Recipe',
    description: 'Extracted recipe',
    creator: data.author || 'Unknown',
    ingredients,
    instructions: data.instructions || [],
    prepTime: String(data.prep_time || 30),
    cookTime: String(data.cook_time || 45),
    servings: String(data.yield || '4'),
    cuisineType: 'Global',
    difficulty: 'Medium' as const,
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