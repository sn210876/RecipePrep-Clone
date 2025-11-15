import { Ingredient } from '@/types/recipe';

interface ExtractedRecipeData {
  title: string;
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
}

const RECIPE_PROXY_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/recipe-proxy`;
const LOCAL_VIDEO_EXTRACT_URL = 'http://localhost:3000/api/extract-recipe-from-video';

function isSocialMediaUrl(url: string): boolean {
  return url.includes('instagram.com') ||
         url.includes('tiktok.com') ||
         url.includes('youtube.com') ||
         url.includes('youtu.be') ||
         url.includes('facebook.com') ||
         url.includes('fb.watch');
}

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  try {
    const useLocalServer = isSocialMediaUrl(url);
    const endpoint = useLocalServer ? LOCAL_VIDEO_EXTRACT_URL : RECIPE_PROXY_URL;

    console.log('[RecipeExtractor] Fetching from:', endpoint);
    console.log('[RecipeExtractor] URL to extract:', url);
    console.log('[RecipeExtractor] Using local server:', useLocalServer);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (!useLocalServer) {
      headers['Authorization'] = `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`;
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ url }),
    });

    console.log('[RecipeExtractor] Response status:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[RecipeExtractor] Error response:', errorData);
      throw new Error(errorData.error || `Failed to extract recipe: ${response.status}`);
    }

    const data = await response.json();
    console.log('[RecipeExtractor] Raw response:', data);

    const recipeData = useLocalServer && data.recipe ? data.recipe : data;

    if (!recipeData.title || !recipeData.ingredients || !recipeData.instructions) {
      throw new Error('Invalid recipe data received from server');
    }

    const ingredients: Ingredient[] = recipeData.ingredients.map((ing: string) => {
      const match = ing.match(/^([\d\/\.]+)\s*(\w+)?\s+(.+)$/);
      if (match) {
        return {
          quantity: match[1],
          unit: match[2] || 'piece',
          name: match[3]
        };
      }
      return {
        quantity: '1',
        unit: 'piece',
        name: ing
      };
    });

    return {
      title: recipeData.title,
      ingredients,
      instructions: recipeData.instructions,
      prepTime: recipeData.prep_time ? String(recipeData.prep_time) : '0',
      cookTime: recipeData.cook_time ? String(recipeData.cook_time) : '0',
      servings: recipeData.yield || '4',
      cuisineType: 'International',
      difficulty: 'Medium',
      mealTypes: ['Dinner'],
      dietaryTags: [],
      imageUrl: recipeData.image || 'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg',
      notes: recipeData.notes || 'Extracted from recipe URL',
    };

  } catch (error) {
    console.error('[RecipeExtractor] Error:', error);

    if (error instanceof Error) {
      throw new Error(`Failed to extract recipe: ${error.message}`);
    }
    throw new Error('Failed to extract recipe. Please check the URL and try again.');
  }
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export async function extractRecipeFromText(text: string): Promise<ExtractedRecipeData> {
  // Parse text manually (keep existing logic)
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
    notes: 'Imported from email. Edit to add more details.'
  };
}