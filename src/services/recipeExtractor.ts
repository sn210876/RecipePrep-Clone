import { Ingredient } from '@/types/recipe';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://vohvdarghgqskzqjclux.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const RECIPE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;
const IMAGE_PROXY_URL = `${SUPABASE_URL}/functions/v1/image-proxy`;

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

  console.log('[RecipeExtractor] Fetching from:', RECIPE_FUNCTION_URL);
  console.log('[RecipeExtractor] URL to extract:', url);

  const response = await fetch(RECIPE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'apikey': SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ url: url.trim() }),
  });

  console.log('[RecipeExtractor] Response status:', response.status);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[RecipeExtractor] Error:', errorText);
    throw new Error('Failed to extract recipe. Try a different URL.');
  }

  const data = await response.json();
  console.log('[RecipeExtractor] Raw response:', data);

  // Parse HTML for JSON-LD structured data
  let recipeData: any = {};

  if (data.html) {
    const html = data.html;
    console.log('[RecipeExtractor] HTML length:', html.length);

    // Search for all <script type="application/ld+json"> tags
    const jsonLdMatches = html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

    for (const match of jsonLdMatches) {
      try {
        const jsonContent = match[1].trim();
        const parsed = JSON.parse(jsonContent);

        console.log('[RecipeExtractor] Found JSON-LD block:', parsed['@type']);

        // Check if it's a Recipe directly
        if (parsed['@type'] === 'Recipe') {
          recipeData = parsed;
          console.log('[RecipeExtractor] ✓ Found Recipe schema!');
          break;
        }

        // Check if it has @graph array (common in schema.org)
        if (Array.isArray(parsed['@graph'])) {
          const recipe = parsed['@graph'].find((item: any) => item['@type'] === 'Recipe');
          if (recipe) {
            recipeData = recipe;
            console.log('[RecipeExtractor] ✓ Found Recipe in @graph!');
            break;
          }
        }
      } catch (e) {
        console.error('[RecipeExtractor] Failed to parse JSON-LD:', e);
      }
    }

    if (!recipeData || !recipeData['@type']) {
      console.error('[RecipeExtractor] ✗ No Recipe schema found in HTML');
      throw new Error('Could not extract recipe - site may not be supported. Please try a different recipe URL from AllRecipes, Food Network, or similar sites.');
    }
  } else {
    throw new Error('No HTML data received from server');
  }

  // Extract ingredients from structured data
  const extractIngredients = (): string[] => {
    if (recipeData.recipeIngredient && Array.isArray(recipeData.recipeIngredient)) {
      console.log('[RecipeExtractor] Found', recipeData.recipeIngredient.length, 'ingredients');
      return recipeData.recipeIngredient;
    }
    return [];
  };

  // Extract instructions from structured data
  const extractInstructions = (): string[] => {
    if (recipeData.recipeInstructions) {
      const instructions = recipeData.recipeInstructions;
      
      // Handle array of objects with text property
      if (Array.isArray(instructions)) {
        const parsed = instructions.map((step: any) => {
          if (typeof step === 'string') return step;
          if (step.text) return step.text;
          if (step['@type'] === 'HowToStep' && step.text) return step.text;
          return '';
        }).filter(Boolean);
        
        console.log('[RecipeExtractor] Found', parsed.length, 'instructions');
        return parsed;
      }
      
      // Handle single string
      if (typeof instructions === 'string') {
        return instructions.split('\n').filter(s => s.trim());
      }
    }
    return [];
  };

  // Extract image from structured data
  const extractImage = (): string => {
    if (recipeData.image) {
      const img = recipeData.image;
      // Handle array of images
      if (Array.isArray(img)) {
        return typeof img[0] === 'string' ? img[0] : img[0]?.url || '';
      }
      // Handle object with url property
      if (typeof img === 'object' && img.url) {
        return img.url;
      }
      // Handle direct string
      if (typeof img === 'string') {
        return img;
      }
    }
    return '';
  };

  // Extract servings/yield
  const extractYield = (): string => {
    if (recipeData.recipeYield) {
      const y = recipeData.recipeYield;
      if (typeof y === 'string') return y.replace(/[^\d]/g, '') || '4';
      if (typeof y === 'number') return String(y);
      if (Array.isArray(y) && y[0]) return String(y[0]).replace(/[^\d]/g, '') || '4';
    }
    return '4';
  };

  // Extract times (in ISO 8601 duration format like PT30M)
  const parseISO8601Duration = (duration: string): string => {
    if (!duration) return '0';
    const match = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!match) return '0';
    const hours = match[1] ? parseInt(match[1]) * 60 : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    return String(hours + minutes);
  };

  const rawIngredients = extractIngredients();
  const rawInstructions = extractInstructions();
  const rawImageUrl = extractImage();

  console.log('[RecipeExtractor] Extracted:', {
    ingredients: rawIngredients.length,
    instructions: rawInstructions.length,
    image: rawImageUrl ? 'found' : 'missing'
  });

  // Parse ingredients into structured format
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

  const ingredients = parseIngredients(rawIngredients);
  const instructions = rawInstructions;

  const isSocialMedia = url.includes('tiktok.com') || url.includes('instagram.com') ||
                         url.includes('youtube.com') || url.includes('youtu.be');
  const isTikTokOrInstagram = url.includes('tiktok.com') || url.includes('instagram.com');
  const videoUrl = isSocialMedia ? url : '';

  // Proxy the image through image-proxy function
  const proxiedImageUrl = rawImageUrl 
    ? `${IMAGE_PROXY_URL}?url=${encodeURIComponent(rawImageUrl)}&apikey=${SUPABASE_ANON_KEY}`
    : '';

  const result: ExtractedRecipeData = {
    title: isTikTokOrInstagram ? '' : (recipeData.name || 'Untitled Recipe'),
    description: recipeData.description || 'Extracted recipe',
    creator: recipeData.author?.name || recipeData.author || 'Unknown',
    ingredients,
    instructions,
    prepTime: parseISO8601Duration(recipeData.prepTime) || '30',
    cookTime: parseISO8601Duration(recipeData.cookTime) || '45',
    servings: extractYield(),
    cuisineType: recipeData.recipeCuisine || 'Global',
    difficulty: 'Medium',
    mealTypes: recipeData.recipeCategory ? [recipeData.recipeCategory] : ['Dinner'],
    dietaryTags: recipeData.suitableForDiet || [],
    imageUrl: proxiedImageUrl,
    videoUrl,
    notes: '',
    sourceUrl: url,
  };

  console.log('[RecipeExtractor] FINAL RESULT:', result);
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