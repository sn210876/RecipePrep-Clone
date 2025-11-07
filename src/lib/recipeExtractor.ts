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

// ✅ Your backend API URL (update this to your actual Render URL)
const API_BASE_URL = 'https://recipeprep-clone.onrender.com';

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  try {
    console.log('Extracting recipe from:', url);
    
    // Call your Python backend
    const response = await fetch(`${API_BASE_URL}/extract`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Backend response:', data);

    // Transform backend response to match your frontend format
    const recipe = data.recipe;
    
    return {
      title: recipe.title || 'Untitled Recipe',
      ingredients: recipe.ingredients || [],
      instructions: recipe.instructions || [],
      prepTime: recipe.prepTime || '0',
      cookTime: recipe.cookTime || '0',
      servings: recipe.servings || '1',
      cuisineType: recipe.cuisineType || 'International',
      difficulty: recipe.difficulty || 'Medium',
      mealTypes: recipe.mealTypes || ['Dinner'],
      dietaryTags: recipe.dietaryTags || [],
      imageUrl: data.imageUrl || 'https://via.placeholder.com/400x300?text=Recipe',
      notes: recipe.notes || '',
    };
    
  } catch (error) {
    console.error('Error extracting recipe:', error);
    
    // If backend fails, throw a helpful error
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