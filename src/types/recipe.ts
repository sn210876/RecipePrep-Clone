export interface Ingredient {
  quantity: string;
  unit: string;
  name: string;
}

export interface RecipeStep {
  stepNumber: number;
  instruction: string;
  technique: string;
  duration?: string;
  videoUrl?: string;
  diagramType?: string;
  ingredients?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  ingredients: Ingredient[];
  instructions: string[];
  steps?: RecipeStep[];
  prepTime: number;
  cookTime: number;
  servings: number;
  tags: string[];
  cuisineType: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  dietaryTags: string[];
  imageUrl?: string;
  sourceUrl?: string;
  notes?: string;
  mealType: string[];
  popularity?: number;
  isSaved?: boolean;
}

export interface MealPlanEntry {
  id: string;
  recipeId: string;
  date: string;
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  servings: number;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  checked: boolean;
  sourceRecipeIds: string[];
}

export interface UserPreferences {
  dietaryPreferences: string[];
  favoriteCuisines: string[];
  cookingSkillLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  householdSize: number;
  dislikedIngredients: string[];
  visualLearningStyle?: 'videos' | 'diagrams' | 'auto';
}

export interface Collection {
  id: string;
  name: string;
  description?: string;
  recipeIds: string[];
  createdAt: string;
}
