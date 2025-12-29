import { supabase } from '../lib/supabase';
import { MealPlanEntry } from '../types/recipe';

export interface DbMealPlan {
  id: string;
  user_id: string;
  recipe_id: string;
  date: string;
  meal_type: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack';
  servings: number;
  created_at: string;
  updated_at: string;
}

export async function getMealPlans(userId: string): Promise<MealPlanEntry[]> {
  const { data, error } = await supabase
    .from('user_meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true });

  if (error) {
    console.error('Error fetching meal plans:', error);
    throw error;
  }

  return data.map(dbPlan => ({
    id: dbPlan.id,
    recipeId: dbPlan.recipe_id,
    date: dbPlan.date,
    mealType: dbPlan.meal_type,
    servings: dbPlan.servings,
  }));
}

export async function addMealPlan(
  userId: string,
  mealPlan: Omit<MealPlanEntry, 'id'>
): Promise<MealPlanEntry> {
  const { data, error } = await supabase
    .from('user_meal_plans')
    .insert({
      user_id: userId,
      recipe_id: mealPlan.recipeId,
      date: mealPlan.date,
      meal_type: mealPlan.mealType,
      servings: mealPlan.servings,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding meal plan:', error);
    throw error;
  }

  return {
    id: data.id,
    recipeId: data.recipe_id,
    date: data.date,
    mealType: data.meal_type,
    servings: data.servings,
  };
}

export async function updateMealPlan(
  userId: string,
  mealPlan: MealPlanEntry
): Promise<MealPlanEntry> {
  const { data, error } = await supabase
    .from('user_meal_plans')
    .upsert({
      id: mealPlan.id,
      user_id: userId,
      recipe_id: mealPlan.recipeId,
      date: mealPlan.date,
      meal_type: mealPlan.mealType,
      servings: mealPlan.servings,
    }, {
      onConflict: 'user_id,date,meal_type'
    })
    .select()
    .single();

  if (error) {
    console.error('Error updating meal plan:', error);
    throw error;
  }

  return {
    id: data.id,
    recipeId: data.recipe_id,
    date: data.date,
    mealType: data.meal_type,
    servings: data.servings,
  };
}

export async function deleteMealPlan(userId: string, mealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('user_meal_plans')
    .delete()
    .eq('id', mealPlanId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting meal plan:', error);
    throw error;
  }
}

export async function clearAllMealPlans(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_meal_plans')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing meal plans:', error);
    throw error;
  }
}
