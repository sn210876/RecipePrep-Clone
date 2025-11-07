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

const MOCK_RECIPES: Record<string, ExtractedRecipeData> = {
  instagram: {
    title: 'Creamy Tuscan Garlic Chicken',
    ingredients: [
      { quantity: '4', unit: 'piece', name: 'Boneless chicken breasts' },
      { quantity: '2', unit: 'tbsp', name: 'Olive oil' },
      { quantity: '4', unit: 'piece', name: 'Garlic cloves, minced' },
      { quantity: '1', unit: 'cup', name: 'Heavy cream' },
      { quantity: '1/2', unit: 'cup', name: 'Chicken broth' },
      { quantity: '1', unit: 'cup', name: 'Sun-dried tomatoes, chopped' },
      { quantity: '2', unit: 'cup', name: 'Fresh spinach' },
      { quantity: '1/2', unit: 'cup', name: 'Parmesan cheese, grated' },
      { quantity: '1', unit: 'tsp', name: 'Italian seasoning' },
      { quantity: '1', unit: 'pinch', name: 'Salt and pepper' },
    ],
    instructions: [
      'Season chicken breasts with salt, pepper, and Italian seasoning on both sides.',
      'Heat olive oil in a large skillet over medium-high heat. Add chicken and cook for 5-6 minutes per side until golden and cooked through. Remove and set aside.',
      'In the same skillet, add minced garlic and sauté for 1 minute until fragrant.',
      'Add chicken broth and heavy cream, stirring to combine. Bring to a gentle simmer.',
      'Add sun-dried tomatoes and Parmesan cheese. Stir until cheese is melted and sauce is creamy.',
      'Add fresh spinach and cook until wilted, about 2-3 minutes.',
      'Return chicken to the skillet and spoon sauce over it. Simmer for 3-4 minutes to heat through.',
      'Serve hot with pasta, rice, or crusty bread.'
    ],
    prepTime: '10',
    cookTime: '20',
    servings: '4',
    cuisineType: 'Italian',
    difficulty: 'Medium',
    mealTypes: ['Dinner'],
    dietaryTags: ['High-Protein'],
    imageUrl: 'https://images.pexels.com/photos/2338407/pexels-photo-2338407.jpeg',
    notes: 'For a lighter version, substitute half-and-half for heavy cream. You can also add mushrooms for extra flavor.'
  },
  tiktok: {
    title: 'Viral Baked Feta Pasta',
    ingredients: [
      { quantity: '2', unit: 'cup', name: 'Cherry tomatoes' },
      { quantity: '8', unit: 'oz', name: 'Block of feta cheese' },
      { quantity: '1/3', unit: 'cup', name: 'Olive oil' },
      { quantity: '3', unit: 'piece', name: 'Garlic cloves, minced' },
      { quantity: '12', unit: 'oz', name: 'Pasta of choice' },
      { quantity: '1/4', unit: 'cup', name: 'Fresh basil, chopped' },
      { quantity: '1', unit: 'tsp', name: 'Red pepper flakes' },
      { quantity: '1', unit: 'pinch', name: 'Salt and black pepper' },
    ],
    instructions: [
      'Preheat oven to 400°F (200°C).',
      'Add cherry tomatoes to a baking dish. Place the feta block in the center.',
      'Drizzle everything with olive oil and season with salt, pepper, and red pepper flakes.',
      'Bake for 30-35 minutes until tomatoes burst and feta is golden.',
      'Meanwhile, cook pasta according to package directions. Reserve 1 cup pasta water before draining.',
      'Remove baking dish from oven. Add minced garlic and fresh basil.',
      'Mix everything together, mashing the feta and tomatoes to create a creamy sauce.',
      'Add cooked pasta and toss to combine. Add reserved pasta water if needed to reach desired consistency.',
      'Serve immediately with extra basil and Parmesan if desired.'
    ],
    prepTime: '10',
    cookTime: '35',
    servings: '4',
    cuisineType: 'Mediterranean',
    difficulty: 'Easy',
    mealTypes: ['Dinner'],
    dietaryTags: ['Vegetarian'],
    imageUrl: 'https://images.pexels.com/photos/1438672/pexels-photo-1438672.jpeg',
    notes: 'This viral TikTok recipe is incredibly easy and flavorful. Feel free to add protein like grilled chicken or shrimp.'
  },
  website: {
    title: 'Classic Chocolate Chip Cookies',
    ingredients: [
      { quantity: '2 1/4', unit: 'cup', name: 'All-purpose flour' },
      { quantity: '1', unit: 'tsp', name: 'Baking soda' },
      { quantity: '1', unit: 'tsp', name: 'Salt' },
      { quantity: '1', unit: 'cup', name: 'Butter, softened' },
      { quantity: '3/4', unit: 'cup', name: 'Granulated sugar' },
      { quantity: '3/4', unit: 'cup', name: 'Brown sugar, packed' },
      { quantity: '2', unit: 'piece', name: 'Large eggs' },
      { quantity: '2', unit: 'tsp', name: 'Vanilla extract' },
      { quantity: '2', unit: 'cup', name: 'Semi-sweet chocolate chips' },
    ],
    instructions: [
      'Preheat oven to 375°F (190°C).',
      'In a medium bowl, whisk together flour, baking soda, and salt. Set aside.',
      'In a large bowl, cream together softened butter, granulated sugar, and brown sugar until light and fluffy, about 3-4 minutes.',
      'Beat in eggs one at a time, then add vanilla extract.',
      'Gradually mix in the flour mixture until just combined. Do not overmix.',
      'Fold in chocolate chips with a spatula.',
      'Drop rounded tablespoons of dough onto ungreased baking sheets, spacing them 2 inches apart.',
      'Bake for 9-11 minutes or until golden brown around the edges but still soft in the center.',
      'Cool on baking sheet for 2 minutes before transferring to a wire rack.',
      'Store in an airtight container for up to 5 days.'
    ],
    prepTime: '15',
    cookTime: '11',
    servings: '48',
    cuisineType: 'American',
    difficulty: 'Easy',
    mealTypes: ['Snack', 'Dessert'],
    dietaryTags: ['Vegetarian'],
    imageUrl: 'https://images.pexels.com/photos/230325/pexels-photo-230325.jpeg',
    notes: 'For chewier cookies, slightly underbake them. For crispier cookies, bake a minute or two longer. You can also chill the dough for 30 minutes before baking for thicker cookies.'
  }
};

export async function extractRecipeFromUrl(url: string): Promise<ExtractedRecipeData> {
  await new Promise(resolve => setTimeout(resolve, 2500));

  const urlLower = url.toLowerCase();

  if (urlLower.includes('instagram')) {
    return MOCK_RECIPES.instagram;
  } else if (urlLower.includes('tiktok')) {
    return MOCK_RECIPES.tiktok;
  } else {
    return MOCK_RECIPES.website;
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
