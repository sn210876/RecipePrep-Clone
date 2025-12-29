import { Recipe, UserPreferences } from '@/types/recipe';

export interface UserProfile {
  cuisinePreferences: Record<string, number>;
  dietaryPreferences: string[];
  difficultyPreferences: Record<string, number>;
  avgCookTime: number;
  totalRecipesSaved: number;
}

export function buildUserProfile(savedRecipes: Recipe[]): UserProfile {
  if (savedRecipes.length === 0) {
    return {
      cuisinePreferences: {},
      dietaryPreferences: [],
      difficultyPreferences: {},
      avgCookTime: 0,
      totalRecipesSaved: 0
    };
  }

  const cuisineCount: Record<string, number> = {};
  const dietarySet = new Set<string>();
  const difficultyCount: Record<string, number> = {};
  let totalCookTime = 0;

  savedRecipes.forEach(recipe => {
    cuisineCount[recipe.cuisineType] = (cuisineCount[recipe.cuisineType] || 0) + 1;

    difficultyCount[recipe.difficulty] = (difficultyCount[recipe.difficulty] || 0) + 1;

    recipe.dietaryTags.forEach(tag => dietarySet.add(tag));

    totalCookTime += recipe.prepTime + recipe.cookTime;
  });

  return {
    cuisinePreferences: cuisineCount,
    dietaryPreferences: Array.from(dietarySet),
    difficultyPreferences: difficultyCount,
    avgCookTime: totalCookTime / savedRecipes.length,
    totalRecipesSaved: savedRecipes.length
  };
}

export function scoreRecipe(
  recipe: Recipe,
  userProfile: UserProfile,
  userPreferences: UserPreferences,
  savedRecipeIds: Set<string>
): number {
  if (savedRecipeIds.has(recipe.id)) {
    return -1000;
  }

  let score = 0;

  const cuisineScore = userProfile.cuisinePreferences[recipe.cuisineType] || 0;
  score += cuisineScore * 10;

  const favCuisineMatch = userPreferences.favoriteCuisines.includes(recipe.cuisineType);
  if (favCuisineMatch) {
    score += 15;
  }

  let dietaryMatches = 0;
  recipe.dietaryTags.forEach(tag => {
    if (userProfile.dietaryPreferences.includes(tag)) {
      dietaryMatches++;
    }
    if (userPreferences.dietaryPreferences.includes(tag)) {
      dietaryMatches++;
    }
  });
  score += dietaryMatches * 8;

  const difficultyScore = userProfile.difficultyPreferences[recipe.difficulty] || 0;
  score += difficultyScore * 5;

  const skillLevelMap = { 'Beginner': 'Easy', 'Intermediate': 'Medium', 'Advanced': 'Hard' };
  const preferredDifficulty = skillLevelMap[userPreferences.cookingSkillLevel];
  if (recipe.difficulty === preferredDifficulty) {
    score += 10;
  } else if (
    (userPreferences.cookingSkillLevel === 'Intermediate' && recipe.difficulty === 'Easy') ||
    (userPreferences.cookingSkillLevel === 'Advanced' && recipe.difficulty === 'Medium')
  ) {
    score += 5;
  }

  if (userProfile.avgCookTime > 0) {
    const recipeTotalTime = recipe.prepTime + recipe.cookTime;
    const timeDifference = Math.abs(recipeTotalTime - userProfile.avgCookTime);
    const timeScore = Math.max(0, 10 - (timeDifference / 10));
    score += timeScore;
  }

  const hasDislikedIngredient = recipe.ingredients.some(ing =>
    userPreferences.dislikedIngredients.some(disliked =>
      ing.name.toLowerCase().includes(disliked.toLowerCase())
    )
  );
  if (hasDislikedIngredient) {
    score -= 50;
  }

  if (recipe.popularity) {
    score += recipe.popularity * 0.5;
  }

  const recencyBoost = Math.random() * 5;
  score += recencyBoost;

  return score;
}

export function getRecommendedRecipes(
  allRecipes: Recipe[],
  savedRecipes: Recipe[],
  userPreferences: UserPreferences,
  limit: number = 6
): Recipe[] {
  const userProfile = buildUserProfile(savedRecipes);
  const savedRecipeIds = new Set(savedRecipes.map(r => r.id));

  if (savedRecipes.length === 0) {
    return allRecipes
      .filter(r => !savedRecipeIds.has(r.id))
      .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, limit);
  }

  const scoredRecipes = allRecipes.map(recipe => ({
    recipe,
    score: scoreRecipe(recipe, userProfile, userPreferences, savedRecipeIds)
  }));

  return scoredRecipes
    .filter(item => item.score >= 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(item => item.recipe);
}

export function getRecommendationInsights(
  savedRecipes: Recipe[]
): string {
  if (savedRecipes.length === 0) {
    return 'Popular recipes to get you started';
  }

  const userProfile = buildUserProfile(savedRecipes);
  const topCuisine = Object.entries(userProfile.cuisinePreferences)
    .sort((a, b) => b[1] - a[1])[0];

  const insights: string[] = [];

  if (topCuisine) {
    insights.push(topCuisine[0]);
  }

  if (userProfile.dietaryPreferences.length > 0) {
    insights.push(userProfile.dietaryPreferences[0]);
  }

  if (insights.length > 0) {
    return `Based on your love for ${insights.join(' and ')} recipes`;
  }

  return 'Personalized recommendations based on your saved recipes';
}

export async function trackRecipeInteraction(): Promise<void> {
  // LocalStorage only - no tracking needed
}

export async function updateUserPreferenceAnalytics(): Promise<void> {
  // LocalStorage only - no analytics tracking needed
}

export async function getUserPreferenceAnalytics(): Promise<UserProfile | null> {
  // LocalStorage only - no remote analytics
  return null;
}

export async function getSavedRecipeIds(): Promise<Set<string>> {
  // LocalStorage only - recipes managed in context
  return new Set();
}
