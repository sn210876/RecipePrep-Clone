import { supabase } from '../lib/supabase';

export interface MealPlan {
  id: string;
  user_id: string;
  recipe_id: string;
  meal_date: string;
  meal_type: string;
  servings: number;
  notes?: string;
  created_at: string;
}

export async function getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
  let query = supabase
    .from('meal_plans')
    .select('*')
    .eq('user_id', userId)
    .order('meal_date', { ascending: true });

  if (startDate) {
    query = query.gte('meal_date', startDate);
  }
  if (endDate) {
    query = query.lte('meal_date', endDate);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data || [];
}

export async function addMealPlan(
  userId: string,
  recipeId: string,
  mealDate: string,
  mealType: string,
  servings: number,
  notes?: string
): Promise<MealPlan> {
  const { data, error } = await supabase
    .from('meal_plans')
    .insert({
      user_id: userId,
      recipe_id: recipeId,
      meal_date: mealDate,
      meal_type: mealType,
      servings,
      notes,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateMealPlan(
  mealPlanId: string,
  updates: Partial<Pick<MealPlan, 'meal_date' | 'meal_type' | 'servings' | 'notes'>>
): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .update(updates)
    .eq('id', mealPlanId);

  if (error) throw error;
}

export async function deleteMealPlan(mealPlanId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('id', mealPlanId);

  if (error) throw error;
}

export async function clearMealPlans(userId: string): Promise<void> {
  const { error } = await supabase
    .from('meal_plans')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
