import { Ingredient } from '@/types/recipe';

// Use Supabase Edge Function proxy to avoid CORS issues
const API_URL = `https://recipeprep-clone.onrender.com/api/extract-recipe-from-video';

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
  if (!isValidUrl(url)) {
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
    const error = await response.json();
    console.error('[RecipeExtractor] API Error:', error);
    throw new Error(error.detail || error.error || 'Failed to extract recipe');
  }

  const data = await response.json();
console.log('[RecipeExtractor] API Response:', data);

// Check if this is from YOUR backend (has title directly) or old backend (has data.recipe)
const isYourBackend = data.title && !data.recipe;

if (isYourBackend) {
  // Handle response from YOUR OpenAI backend
  const ingredients: Ingredient[] = (data.ingredients || []).map((ing: any) => ({
    quantity: ing.quantity || '',
    unit: ing.unit || '',
    name: ing.ingredient || ing.name || ''
  }));

  return {
    title: data.title || 'Untitled Recipe',
    description: data.description || 'Recipe from video',
    creator: data.creator || 'Unknown',
    ingredients: ingredients,
    instructions: data.instructions || [],
    prepTime: String(data.prepTime || 15),
    cookTime: String(data.cookTime || 30),
    servings: String(data.servings || 4),
    cuisineType: data.cuisine || 'Global',
    difficulty: (data.difficulty || 'Medium') as 'Easy' | 'Medium' | 'Hard',
    mealTypes: ['Dinner'],
    dietaryTags: data.dietaryTags || [],
    imageUrl: data.image || '',
    notes: data.transcript ? `Video Transcript:\n${data.transcript}` : '',
    sourceUrl: data.sourceUrl || url,
  };
}

// OLD CODE BELOW (for recipe websites) - keep as-is
let instructions = data.recipe.instructions || [];
if (typeof instructions === 'string') {
  instructions = instructions
    .split('\n')
    .map((s: string) => s.trim())
    .filter((s: string) => s.length > 0);
}

const isVideo = data.recipe.source === 'video';

const hasRecipe = data.recipe &&
  data.recipe.title &&
  data.recipe.title !== 'Unavailable' &&
  data.recipe.title !== 'Unsupported Site';

if (!hasRecipe && !isVideo) {
  const errorMsg = data.transcript || 'No recipe found';
  if (errorMsg.includes('not supported') || errorMsg.includes('Unsupported')) {
    throw new Error('This website is not supported yet. Try AllRecipes, BBC Good Food, Food Network, or Serious Eats.');
  }
  throw new Error('No recipe found. Try AllRecipes, BBC, or a public blog.');
}

const parseIngredients = (ings: string[]): Ingredient[] => {
  if (!ings || ings.length === 0) return [];
  return ings.map(ing => {
    const trimmed = ing.trim();
    if (!trimmed) return { quantity: '', unit: '', name: '' };

    const quantityMatch = trimmed.match(/^([\d¼½¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞\/\-\.\s\,]+)?\s*/);
    const quantity = quantityMatch ? (quantityMatch[1]?.trim() || '') : '';

    let rest = trimmed.slice(quantity.length).trim();

    const unitMatch = rest.match(/^([a-zA-Z]+\.?\s*[a-zA-Z]*\.?)\s+/);
    const unit = unitMatch ? unitMatch[1].trim().replace(/\.$/, '') : '';

    if (unitMatch) {
      rest = rest.slice(unitMatch[0].length).trim();
    }

    const name = rest || trimmed;

    return {
      quantity: quantity || '',
      unit: unit || '',
      name: name || trimmed
    };
  });
};

if (isVideo && (!data.recipe.ingredients || data.recipe.ingredients.length === 0)) {
  const transcript = data.transcript || '';
  throw new Error(
    `Video extraction found description but no recipe details. ` +
    `This video may not contain a complete recipe with ingredients and instructions. ` +
    `Try: AllRecipes, BBC Good Food, or Food Network instead.${transcript ? `\n\nVideo description: ${transcript.slice(0, 200)}...` : ''}`
  );
}

const result = {
  title: data.recipe.title || 'Untitled Recipe',
  description: isVideo ? 'Recipe from video' : 'Delicious homemade recipe',
  creator: data.recipe.author || (isVideo ? 'Video Creator' : 'Unknown'),
  ingredients: isVideo ? [] : parseIngredients(data.recipe.ingredients || []),
  instructions: instructions,
  prepTime: String(data.recipe.prep_time || 15),
  cookTime: String(data.recipe.cook_time || 30),
  servings: String(data.recipe.servings || 4),
  cuisineType: 'Global',
  difficulty: 'Medium' as const,
  mealTypes: ['Dinner'],
  dietaryTags: [],
  imageUrl: data.imageUrl || '',
  notes: isVideo && data.transcript ? `Video Transcript:\n${data.transcript.slice(0, 1000)}...` : '',
  sourceUrl: url,
};

console.log('[RecipeExtractor] Parsed result:', result);
console.log('[RecipeExtractor] Ingredients count:', result.ingredients.length);
console.log('[RecipeExtractor] Instructions count:', result.instructions.length);

  return result;
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