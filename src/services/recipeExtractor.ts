import { Ingredient } from '@/types/recipe';
import { decodeHtmlEntities, normalizeQuantity } from '@/lib/utils';
import {
  extractVideoId,
  getYouTubeVideoData,
  hasRecipeInDescription,
  extractRecipeFromDescription
} from './youtubeService';
import { trackExtraction } from './extractionMonitor';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const API_URL = `${SUPABASE_URL}/functions/v1/recipe-proxy`;

// YOUR RENDER SERVER ONLY — 100% FINAL VERSION
const RENDER_SERVER = 'https://recipe-backend-nodejs-1.onrender.com/extract';
const SUPABASE_PHOTO_FUNCTION = `${SUPABASE_URL}/functions/v1/extract-recipe-photo`;
const SUPABASE_TEXT_FUNCTION = `${SUPABASE_URL}/functions/v1/extract-recipe-text`;

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
  hasConflict?: boolean;
  structuredVersion?: any;
  aiVersion?: any;
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  if (!url.trim() || !isValidUrl(url)) {
    throw new Error('Please enter a valid URL');
  }

  // Check if it's a YouTube URL first - try fast description extraction
  const videoId = extractVideoId(url);
  if (videoId) {
    console.log('[Extractor] YouTube video detected:', videoId);
    try {
      return await extractFromYouTubeHybrid(url, videoId);
    } catch (error) {
      console.error('[Extractor] YouTube hybrid extraction failed:', error);
      // Fall through to regular social media extraction
    }
  }

  const isSocial = /tiktok\.com|instagram\.com|youtube\.com|youtu\.be/i.test(url);

  // ALL OTHER SOCIAL MEDIA (TikTok, Instagram) → YOUR RENDER SERVER ONLY
if (isSocial) {
  try {
    console.log('[Extractor] Sending to Render server:', url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 50000);

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

    // Get the raw image URL
    const rawImageUrl = data.thumbnail || data.image || '';
    console.log('[Extractor] Raw image URL:', rawImageUrl);

    // ✅ NEW: Check if it's an Instagram/Facebook CDN URL that needs proxying
    let finalImageUrl = rawImageUrl;
    if (rawImageUrl) {
      const needsProxy = rawImageUrl.includes('cdninstagram.com') ||
                         rawImageUrl.includes('fbcdn.net') ||
                         rawImageUrl.includes('instagram.com');

      if (needsProxy) {
        // Wrap it with your Supabase proxy
        const cleanUrl = rawImageUrl.replace(/&amp;/g, '&');
        finalImageUrl = `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
        console.log('[Extractor] Instagram image detected, proxying:', finalImageUrl);
      } else {
        console.log('[Extractor] Direct image URL (no proxy needed):', finalImageUrl);
      }
    }

    const rawIngredients = Array.isArray(data.ingredients) ? data.ingredients : [];
    console.log('[Extractor] Processing ingredients:', rawIngredients);

    const ingredients = rawIngredients.map((ing: string) => {
      const cleaned = decodeHtmlEntities(ing.trim());
      if (!cleaned) return { quantity: '', unit: '', name: '' };

      const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
      const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
      const quantity = normalizeQuantity(rawQty);

      let rest = cleaned.slice(rawQty.length).trim();

      const unitMatch = rest.match(/^(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|kilograms?|ml|milliliters?|l|liters?|pinch|dash|piece|pieces|clove|cloves|slice|slices|can|cans)\s+/i);

      let unit = '';
      if (unitMatch) {
        const matchedUnit = unitMatch[1].toLowerCase();
        rest = rest.slice(unitMatch[0].length).trim();

        if (matchedUnit === 'g' || matchedUnit === 'gram' || matchedUnit === 'grams') {
          unit = 'g';
        } else if (matchedUnit === 'kg' || matchedUnit === 'kilogram' || matchedUnit === 'kilograms') {
          unit = 'kg';
        } else if (matchedUnit === 'ml' || matchedUnit === 'milliliter' || matchedUnit === 'milliliters') {
          unit = 'ml';
        } else if (matchedUnit === 'l' || matchedUnit === 'liter' || matchedUnit === 'liters') {
          unit = 'l';
        } else if (matchedUnit.startsWith('cup')) {
          unit = 'cup';
        } else if (matchedUnit.startsWith('tbsp') || matchedUnit.startsWith('tablespoon')) {
          unit = 'tbsp';
        } else if (matchedUnit.startsWith('tsp') || matchedUnit.startsWith('teaspoon')) {
          unit = 'tsp';
        } else if (matchedUnit === 'oz' || matchedUnit.startsWith('ounce')) {
          unit = 'oz';
        } else if (matchedUnit.startsWith('lb') || matchedUnit.startsWith('pound')) {
          unit = 'lb';
        } else {
          unit = matchedUnit;
        }
      } else {
        unit = quantity ? 'piece' : '';
      }

      return { quantity, unit, name: rest || cleaned };
    });

    const formatTime = (mins: number): string => {
      if (!mins || mins <= 0) return '30 mins';
      if (mins < 60) return `${mins} mins`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h} hr ${m} mins` : `${h} hr`;
    };

    console.log('[Extractor] Final image URL being returned:', finalImageUrl);

    const rawInstructions = Array.isArray(data.instructions) ? data.instructions : [];
    console.log('[Extractor] Processing instructions:', rawInstructions);

    const description = decodeHtmlEntities(
      data.description ||
      data.shortDescription ||
      data.content ||
      ''
    );

    if (ingredients.length === 0 && rawInstructions.length === 0 && description) {
      console.log('[Extractor] No recipe data found, trying AI extraction from description...');
      try {
        const aiResponse = await fetch(SUPABASE_TEXT_FUNCTION, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            text: description,
          }),
        });

        if (aiResponse.ok) {
          const aiData = await aiResponse.json();
          console.log('[Extractor] AI extraction successful:', aiData);

          if (aiData.ingredients && aiData.ingredients.length > 0) {
            return {
              title: decodeHtmlEntities(data.title || data.channel || aiData.title || 'Video Recipe'),
              description: aiData.description || description,
              creator: decodeHtmlEntities(data.channel || data.creator || 'Unknown'),
              ingredients: aiData.ingredients,
              instructions: aiData.instructions || [],
              prepTime: aiData.prepTime || formatTime(data.prep_time || 15),
              cookTime: aiData.cookTime || formatTime(data.cook_time || 35),
              servings: aiData.servings || data.servings || data.yield || '4',
              cuisineType: aiData.cuisineType || 'Global',
              difficulty: aiData.difficulty || 'Medium',
              mealTypes: aiData.mealTypes || ['Dinner'],
              dietaryTags: aiData.dietaryTags || [],
              imageUrl: finalImageUrl,
              videoUrl: url,
              notes: `Recipe extracted from description`,
              sourceUrl: url,
            };
          }
        }
      } catch (aiError) {
        console.error('[Extractor] AI extraction failed:', aiError);
      }
    }

    return {
      title: decodeHtmlEntities(data.title || data.channel || 'Video Recipe'),
      description,
      creator: decodeHtmlEntities(data.channel || data.creator || 'Unknown'),
      ingredients,
      instructions: rawInstructions.map((i: string) => decodeHtmlEntities(i)),
      prepTime: formatTime(data.prep_time || 15),
      cookTime: formatTime(data.cook_time || 35),
      servings: data.servings || data.yield || '4',
      cuisineType: 'Global',
      difficulty: 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: finalImageUrl,
      videoUrl: url,
      notes: `Recipe from ${data.channel || data.creator || 'video'}`,
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

  const parseIngredients = (ingredientList: string[]) => {
    return ingredientList.map((ing: string) => {
    const cleaned = decodeHtmlEntities(ing.trim());

    const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
    const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
    const quantity = normalizeQuantity(rawQty);

    let rest = cleaned.slice(rawQty.length).trim();

    const unitMatch = rest.match(/^(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|kilograms?|ml|milliliters?|l|liters?|pinch|dash|piece|pieces|clove|cloves|slice|slices|can|cans)\s+/i);

    let unit = '';
    if (unitMatch) {
      const matchedUnit = unitMatch[1].toLowerCase();
      rest = rest.slice(unitMatch[0].length).trim();

      if (matchedUnit === 'g' || matchedUnit === 'gram' || matchedUnit === 'grams') {
        unit = 'g';
      } else if (matchedUnit === 'kg' || matchedUnit === 'kilogram' || matchedUnit === 'kilograms') {
        unit = 'kg';
      } else if (matchedUnit === 'ml' || matchedUnit === 'milliliter' || matchedUnit === 'milliliters') {
        unit = 'ml';
      } else if (matchedUnit === 'l' || matchedUnit === 'liter' || matchedUnit === 'liters') {
        unit = 'l';
      } else if (matchedUnit.startsWith('cup')) {
        unit = 'cup';
      } else if (matchedUnit.startsWith('tbsp') || matchedUnit.startsWith('tablespoon')) {
        unit = 'tbsp';
      } else if (matchedUnit.startsWith('tsp') || matchedUnit.startsWith('teaspoon')) {
        unit = 'tsp';
      } else if (matchedUnit === 'oz' || matchedUnit.startsWith('ounce')) {
        unit = 'oz';
      } else if (matchedUnit.startsWith('lb') || matchedUnit.startsWith('pound')) {
        unit = 'lb';
      } else {
        unit = matchedUnit;
      }
    } else {
      unit = quantity ? 'piece' : '';
    }

      return {
        quantity,
        unit,
        name: rest || cleaned
      };
    });
  };

  const ingredients = parseIngredients(data.ingredients || []);

  const result: ExtractedRecipeData = {
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

  if (data.hasConflict) {
    result.hasConflict = true;
    result.structuredVersion = {
      ...result,
      ingredients: parseIngredients(data.structuredVersion?.ingredients || []),
      instructions: (data.structuredVersion?.instructions || []).map(decodeHtmlEntities),
      prepTime: data.structuredVersion?.prep_time ? `${data.structuredVersion.prep_time} mins` : '30 mins',
      cookTime: data.structuredVersion?.cook_time ? `${data.structuredVersion.cook_time} mins` : '45 mins',
      servings: String(data.structuredVersion?.yield || '4'),
      notes: '',
    };
    result.aiVersion = {
      ...result,
      ingredients: parseIngredients(data.aiVersion?.ingredients || []),
      instructions: (data.aiVersion?.instructions || []).map(decodeHtmlEntities),
      prepTime: data.aiVersion?.prep_time ? `${data.aiVersion.prep_time} mins` : '30 mins',
      cookTime: data.aiVersion?.cook_time ? `${data.aiVersion.cook_time} mins` : '45 mins',
      servings: String(data.aiVersion?.yield || '4'),
      notes: '',
    };
  }

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

// Hybrid YouTube extraction: Try description first, fall back to audio
async function extractFromYouTubeHybrid(url: string, videoId: string): Promise<ExtractedRecipeData> {
  try {
    // STEP 1: Try fast description extraction first
    console.log('[Extractor] Attempting YouTube description extraction...');

    const videoData = await trackExtraction(
      url,
      'YouTube',
      'metadata',
      () => getYouTubeVideoData(videoId)
    );

    const hasRecipeKeywords = hasRecipeInDescription(videoData.description);
    console.log(`[Extractor] Recipe keywords found: ${hasRecipeKeywords}`);

    // ALWAYS try description extraction, even if keywords aren't detected
    // The AI backend is smart enough to find recipes even without obvious keywords
    try {
      console.log('[Extractor] Attempting AI-powered description extraction...');

      const descriptionRecipe = await trackExtraction(
        url,
        'YouTube',
        'description',
        () => extractRecipeFromDescription({
          title: videoData.title,
          description: videoData.description,
          thumbnail: videoData.thumbnail,
          channelTitle: videoData.channelTitle,
        })
      );

      // Check if we got valid recipe data
      if (descriptionRecipe &&
          descriptionRecipe.ingredients &&
          descriptionRecipe.ingredients.length > 0 &&
          descriptionRecipe.instructions &&
          descriptionRecipe.instructions.length > 0) {
        console.log('[Extractor] ✅ Recipe successfully extracted from description!');
        return formatDescriptionRecipe(descriptionRecipe, url, videoData);
      }

      console.log('[Extractor] Description extraction returned incomplete data, trying audio...');
    } catch (descError: any) {
      console.log('[Extractor] Description extraction failed:', descError.message);
    }

    // STEP 2: Fall back to audio transcription only if description extraction failed
    console.log('[Extractor] Falling back to audio transcription...');
    return await trackExtraction(
      url,
      'YouTube',
      'audio',
      () => extractFromRenderServer(url)
    );

  } catch (error: any) {
    console.error('[Extractor] YouTube hybrid extraction error:', error);

    // Check if backend needs update or API issue
    if (error.message?.includes('404') || error.message?.includes('YouTube API error')) {
      console.log('[Extractor] YouTube metadata endpoint not available. Backend needs deployment.');
      throw new Error('YouTube extraction temporarily unavailable. Please copy and paste the video description from YouTube into the recipe form manually, or wait for the server to update.');
    }

    throw error;
  }
}

// Extract from Render server (audio transcription)
async function extractFromRenderServer(url: string): Promise<ExtractedRecipeData> {
  console.log('[Extractor] Sending to Render server for audio extraction:', url);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout

  try {
    const response = await fetch(RENDER_SERVER, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: url.trim() }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Extractor] Server response not OK:', response.status);
      const errorText = await response.text();
      console.error('[Extractor] Error response:', errorText);

      // Enhanced error detection and user guidance
      if (response.status === 403) {
        if (errorText.includes('bot detection') || errorText.includes('Sign in to confirm') || errorText.includes('not a bot')) {
          throw new Error('🤖 YouTube detected automated access. Try these alternatives:\n\n1. Wait 5 minutes and retry\n2. Copy the video description from YouTube and paste it in the manual entry form\n3. Try a different YouTube video');
        }
        if (errorText.includes('Age-restricted')) {
          throw new Error('❌ This video is age-restricted and cannot be extracted automatically. Please copy the recipe from the video description.');
        }
      }

      if (response.status === 404) {
        throw new Error('❌ Video not found or is private. Please check the URL and try again.');
      }

      if (response.status >= 500 || response.status === 429) {
        throw new Error('⏳ Server is waking up or busy. Please wait 20-30 seconds and try again.');
      }

      throw new Error('Video extraction failed. Please try the manual description paste method.');
    }

    const data = await response.json();
    console.log('[Extractor] Raw data from server:', data);

    // Get the raw image URL
    const rawImageUrl = data.thumbnail || data.image || '';

    // Check if it's an Instagram/Facebook CDN URL that needs proxying
    let finalImageUrl = rawImageUrl;
    if (rawImageUrl) {
      const needsProxy = rawImageUrl.includes('cdninstagram.com') ||
                         rawImageUrl.includes('fbcdn.net') ||
                         rawImageUrl.includes('instagram.com');

      if (needsProxy) {
        const cleanUrl = rawImageUrl.replace(/&amp;/g, '&');
        finalImageUrl = `${SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(cleanUrl)}`;
      }
    }

    // Normalize ingredients
    const ingredients = (data.ingredients || []).map((ing: string) => {
      const cleaned = decodeHtmlEntities(ing.trim());
      if (!cleaned) return { quantity: '', unit: '', name: '' };

      const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
      const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
      const quantity = normalizeQuantity(rawQty);

      let rest = cleaned.slice(rawQty.length).trim();
      const unitMatch = rest.match(/^(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|kilograms?|ml|milliliters?|l|liters?|pinch|dash|piece|pieces|clove|cloves|slice|slices|can|cans)\s+/i);

      let unit = '';
      if (unitMatch) {
        const matchedUnit = unitMatch[1].toLowerCase();
        rest = rest.slice(unitMatch[0].length).trim();

        const unitMap: Record<string, string> = {
          'cups': 'cup', 'cup': 'cup',
          'tablespoons': 'tbsp', 'tablespoon': 'tbsp', 'tbsp': 'tbsp', 'tbsps': 'tbsp',
          'teaspoons': 'tsp', 'teaspoon': 'tsp', 'tsp': 'tsp', 'tsps': 'tsp',
          'ounces': 'oz', 'ounce': 'oz', 'oz': 'oz',
          'pounds': 'lb', 'pound': 'lb', 'lbs': 'lb', 'lb': 'lb',
          'grams': 'g', 'gram': 'g', 'g': 'g',
          'kilograms': 'kg', 'kilogram': 'kg', 'kg': 'kg',
          'milliliters': 'ml', 'milliliter': 'ml', 'ml': 'ml',
          'liters': 'l', 'liter': 'l', 'l': 'l',
        };

        unit = unitMap[matchedUnit] || matchedUnit;
      }

      return { quantity, unit, name: rest };
    });

    return {
      title: decodeHtmlEntities(data.title || data.channel || 'Video Recipe'),
      description: decodeHtmlEntities(data.description || data.shortDescription || data.content || ''),
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
      notes: `Recipe from ${data.channel || data.creator || 'video'}`,
      sourceUrl: url,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.error('[Extractor] Render server error:', err);

    if (err.name === 'AbortError') {
      throw new Error('⏳ Request timed out. The server may be busy or the video may be too long. Please try again or use the manual description paste method.');
    }

    // Re-throw with existing message if it's already formatted
    if (err.message?.includes('🤖') || err.message?.includes('❌') || err.message?.includes('⏳')) {
      throw err;
    }

    // Generic fallback
    throw new Error(`Extraction failed: ${err.message || 'Unknown error'}. Try pasting the video description manually.`);
  }
}

// Format description-extracted recipe to match ExtractedRecipeData interface
function formatDescriptionRecipe(recipe: any, sourceUrl: string, videoData: any): ExtractedRecipeData {
  // Parse ingredients from description extraction
  const ingredients = (recipe.ingredients || []).map((ing: any) => {
    if (typeof ing === 'string') {
      // Parse string ingredient
      const cleaned = decodeHtmlEntities(ing.trim());
      const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
      const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
      const quantity = normalizeQuantity(rawQty);
      let rest = cleaned.slice(rawQty.length).trim();

      const unitMatch = rest.match(/^(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|ml|l|pinch|dash|piece|pieces|clove|cloves|slice|slices|can|cans)\s+/i);
      let unit = '';
      if (unitMatch) {
        unit = unitMatch[1].toLowerCase();
        rest = rest.slice(unitMatch[0].length).trim();
      }

      return { quantity, unit, name: rest };
    }

    // Already structured
    return {
      quantity: normalizeQuantity(ing.quantity || ''),
      unit: ing.unit || '',
      name: decodeHtmlEntities(ing.name || '')
    };
  });

  return {
    title: decodeHtmlEntities(recipe.title || videoData.title || 'YouTube Recipe'),
    description: decodeHtmlEntities(recipe.description || ''),
    creator: decodeHtmlEntities(recipe.creator || videoData.channelTitle || 'Unknown'),
    ingredients,
    instructions: (recipe.instructions || []).map((i: string) => decodeHtmlEntities(i)),
    prepTime: formatTime(recipe.prepTime || recipe.prep_time || 15),
    cookTime: formatTime(recipe.cookTime || recipe.cook_time || 30),
    servings: String(recipe.servings || 4),
    cuisineType: recipe.cuisineType || recipe.cuisine || 'Global',
    difficulty: (recipe.difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard',
    mealTypes: recipe.mealTypes || ['Dinner'],
    dietaryTags: recipe.dietaryTags || recipe.tags || [],
    imageUrl: recipe.imageUrl || videoData.thumbnail || '',
    videoUrl: sourceUrl,
    notes: recipe.notes || `Recipe from ${videoData.channelTitle || 'YouTube'}`,
    sourceUrl: sourceUrl,
  };
}

function formatTime(minutes: number | string): string {
  const mins = typeof minutes === 'string' ? parseInt(minutes) : minutes;
  if (isNaN(mins)) return '30 mins';
  return `${mins} mins`;
}

export function getPlatformFromUrl(url: string): string {
  if (url.includes('tiktok.com')) return 'TikTok';
  if (url.includes('instagram.com')) return 'Instagram';
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
  return 'Website';
}

export async function extractRecipeFromPhoto(imageFiles: File[]): Promise<ExtractedRecipeData> {
  try {
    if (!imageFiles || imageFiles.length === 0) {
      throw new Error('Please select at least one photo');
    }

    if (imageFiles.length > 4) {
      throw new Error('Maximum 4 photos allowed');
    }

    console.log(`[Photo Extractor] Processing ${imageFiles.length} image(s)`);

    const compressImage = async (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            const maxDimension = 2000;
            if (width > height && width > maxDimension) {
              height = (height * maxDimension) / width;
              width = maxDimension;
            } else if (height > maxDimension) {
              width = (width * maxDimension) / height;
              height = maxDimension;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Failed to get canvas context'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            const quality = file.size > 1000000 ? 0.7 : 0.85;
            resolve(canvas.toDataURL('image/jpeg', quality));
          };
          img.onerror = reject;
          img.src = e.target?.result as string;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    };

    const compressedImages = await Promise.all(
      imageFiles.map(file => compressImage(file))
    );

    console.log('[Photo Extractor] Images compressed, sending to server...');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 90000);

    const response = await fetch(SUPABASE_PHOTO_FUNCTION, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({ images: compressedImages }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      console.error('[Photo Extractor] Server response not OK:', response.status);
      if (response.status >= 500 || response.status === 429) {
        throw new Error('Server is processing - try again in 30 seconds');
      }
      const errorText = await response.text();
      console.error('[Photo Extractor] Error response:', errorText);
      throw new Error('Photo extraction failed');
    }

    const data = await response.json();
    console.log('[Photo Extractor] Raw data from server:', data);

    const formatTime = (mins: number): string => {
      if (!mins || mins <= 0) return '30 mins';
      if (mins < 60) return `${mins} mins`;
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h} hr ${m} mins` : `${h} hr`;
    };

    return {
      title: decodeHtmlEntities(data.title || 'Recipe from Photo'),
      description: decodeHtmlEntities(data.description || 'Scanned from photo'),
      creator: 'Photo Scan',
      ingredients: (data.ingredients || []).map((ing: string) => {
        const cleaned = decodeHtmlEntities(ing.trim());
        if (!cleaned) return { quantity: '', unit: '', name: '' };

        const qtyMatch = cleaned.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\.\-\s\,]+)\s*/);
        const rawQty = qtyMatch ? qtyMatch[1].trim() : '';
        const quantity = normalizeQuantity(rawQty);

        let rest = cleaned.slice(rawQty.length).trim();

        const unitMatch = rest.match(/^(cups?|tbsps?|tablespoons?|tsps?|teaspoons?|oz|ounces?|lbs?|pounds?|grams?|g|kg|kilograms?|ml|milliliters?|l|liters?|pinch|dash|piece|pieces|clove|cloves|slice|slices|can|cans)\s+/i);

        let unit = '';
        if (unitMatch) {
          const matchedUnit = unitMatch[1].toLowerCase();
          rest = rest.slice(unitMatch[0].length).trim();

          if (matchedUnit === 'g' || matchedUnit === 'gram' || matchedUnit === 'grams') {
            unit = 'g';
          } else if (matchedUnit === 'kg' || matchedUnit === 'kilogram' || matchedUnit === 'kilograms') {
            unit = 'kg';
          } else if (matchedUnit === 'ml' || matchedUnit === 'milliliter' || matchedUnit === 'milliliters') {
            unit = 'ml';
          } else if (matchedUnit === 'l' || matchedUnit === 'liter' || matchedUnit === 'liters') {
            unit = 'l';
          } else if (matchedUnit.startsWith('cup')) {
            unit = 'cup';
          } else if (matchedUnit.startsWith('tbsp') || matchedUnit.startsWith('tablespoon')) {
            unit = 'tbsp';
          } else if (matchedUnit.startsWith('tsp') || matchedUnit.startsWith('teaspoon')) {
            unit = 'tsp';
          } else if (matchedUnit === 'oz' || matchedUnit.startsWith('ounce')) {
            unit = 'oz';
          } else if (matchedUnit.startsWith('lb') || matchedUnit.startsWith('pound')) {
            unit = 'lb';
          } else {
            unit = matchedUnit;
          }
        } else {
          unit = quantity ? 'piece' : '';
        }

        return { quantity, unit, name: rest || cleaned };
      }),
      instructions: (data.instructions || []).map((i: string) => decodeHtmlEntities(i)),
      prepTime: formatTime(data.prep_time || 15),
      cookTime: formatTime(data.cook_time || 35),
      servings: data.servings || '4',
      cuisineType: data.cuisine || 'Global',
      difficulty: data.difficulty || 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: data.dietary_tags || [],
      imageUrl: compressedImages[0],
      videoUrl: '',
      notes: data.notes || `Scanned from ${imageFiles.length} photo${imageFiles.length > 1 ? 's' : ''}`,
      sourceUrl: ''
    };
  } catch (err: any) {
    console.error('[Photo Extractor] Catch block error:', err);
    if (err.name === 'AbortError') {
      throw new Error('Server is processing — please wait 30-45 seconds and try again');
    }
    throw new Error(err.message || 'Photo extraction temporarily unavailable — try again soon');
  }
}

export async function extractRecipeFromText(text: string): Promise<ExtractedRecipeData> {
  await new Promise(resolve => setTimeout(resolve, 1500));

  const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

  let title = 'Imported Recipe';
  const ingredients: Ingredient[] = [];
  const instructions: string[] = [];
  let currentSection: 'none' | 'ingredients' | 'instructions' = 'none';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    if (i === 0 && !lowerLine.includes('ingredient') && !lowerLine.includes('instruction')) {
      title = line;
      continue;
    }

    if (lowerLine.includes('ingredient')) {
      currentSection = 'ingredients';
      continue;
    }

    if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('step')) {
      currentSection = 'instructions';
      continue;
    }

    if (currentSection === 'ingredients') {
      const ingredientMatch = line.match(/^(\d+\/?\d*)\s*(\w+)?\s+(.+)$/);
      if (ingredientMatch) {
        ingredients.push({
          quantity: ingredientMatch[1],
          unit: ingredientMatch[2] || 'piece',
          name: ingredientMatch[3]
        });
      } else {
        ingredients.push({
          quantity: '1',
          unit: 'piece',
          name: line
        });
      }
    }

    if (currentSection === 'instructions') {
      const cleanedLine = line.replace(/^\d+[\.)]\s*/, '');
      if (cleanedLine.length > 0) {
        instructions.push(cleanedLine);
      }
    }
  }

  if (ingredients.length === 0) {
    ingredients.push(
      { quantity: '2', unit: 'cup', name: 'All-purpose flour' },
      { quantity: '1', unit: 'tsp', name: 'Salt' }
    );
  }

  if (instructions.length === 0) {
    instructions.push(
      'Combine ingredients in a bowl.',
      'Mix well and follow your recipe as written.'
    );
  }

  return {
    title,
    description: 'Imported from text',
    creator: 'Unknown',
    ingredients,
    instructions,
    prepTime: '15',
    cookTime: '30',
    servings: '4',
    cuisineType: 'International',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: [],
    imageUrl: 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
    notes: 'Imported from text',
    sourceUrl: ''
  };
}