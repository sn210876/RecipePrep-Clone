import { Ingredient } from '@/types/recipe';

// YOUR NEW PYTHON BACKEND WITH AI PARSING
const API_URL = 'https://recipe-backend-nodejs-1.onrender.com/extract';

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
  notes: string;
  sourceUrl: string;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  console.log('[RecipeExtractor] Calling API:', API_URL);
  console.log('[RecipeExtractor] URL to extract:', url);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] API Error:', errorText);
    
    if (response.status === 404) {
      throw new Error('Backend not found. Check your Render URL.');
    }
    throw new Error('Failed to extract recipe. Try a supported site or video.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Raw API Response:', data);

  // Parse ingredients (now strings from recipe-scrapers or AI)
  const parseIngredients = (ings: string[]): Ingredient[] => {
    return ings.map(ing => {
      const trimmed = ing.trim();
      if (!trimmed) return { quantity: '', unit: '', name: '' };

      // Match quantity (numbers, fractions, etc.)
      const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)\s*/);
      const quantity = quantityMatch ? quantityMatch[1].trim() : '';
      let rest = trimmed.slice(quantity.length).trim();

      // Match unit (cup, tsp, etc.)
      const unitMatch = rest.match(/^([a-zA-Z]+\.?\s*[a-zA-Z]*)\s+/);
      const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : '';
      if (unitMatch) rest = rest.slice(unitMatch[0].length).trim();

      const name = rest || trimmed;
      return { quantity, unit, name };
    });
  };

  const ingredients = parseIngredients(data.ingredients || []);
  const instructions = Array.isArray(data.instructions)
    ? data.instructions
    : (data.instructions || '').split('\n').filter(Boolean);

  // Preview fix: always show dialog even if AI is still parsing (common on free Render tier)
if (!result.title || result.title === 'Untitled Recipe') result.title = 'Loading recipe...';
  }

  const result: ExtractedRecipeData = {
    title: data.title || 'Untitled Recipe',
    description: 'Extracted recipe',
    creator: 'Auto-extracted',
    ingredients,
    instructions,
    prepTime: data.time ? `${data.time} min` : '30 min',
    cookTime: data.time ? `${data.time} min` : '45 min',
    servings: data.yield || '4',
    cuisineType: 'Global',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: data.image || '',
    notes: data.notes || '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] Final result:', result);
  console.log('[RecipeExtractor] Ingredients count:', result.ingredients.length);
  console.log('[RecipeExtractor] Instructions count:', result.instructions.length);

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