import { supabase } from '../lib/supabase';
import { GroceryListItem } from './groceryListService.local';

export interface DbGroceryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: number;
  unit: string;
  category_id: string;
  checked: boolean;
  source_recipe_ids: string[];
  created_at: string;
  updated_at: string;
}

export async function getGroceryItems(userId: string): Promise<GroceryListItem[]> {
  const { data, error } = await supabase
    .from('user_grocery_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching grocery items:', error);
    throw error;
  }

  return data.map(item => ({
    id: item.id,
    name: item.name,
    quantity: Number(item.quantity),
    unit: item.unit,
    categoryId: item.category_id,
    checked: item.checked,
    sourceRecipeIds: item.source_recipe_ids || [],
  }));
}

export async function saveGroceryItems(
  userId: string,
  items: GroceryListItem[]
): Promise<void> {
  await supabase
    .from('user_grocery_items')
    .delete()
    .eq('user_id', userId);

  if (items.length === 0) {
    return;
  }

  const dbItems = items.map(item => ({
    user_id: userId,
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    unit: item.unit,
    category_id: item.categoryId,
    checked: item.checked,
    source_recipe_ids: item.sourceRecipeIds,
  }));

  const { error } = await supabase
    .from('user_grocery_items')
    .insert(dbItems);

  if (error) {
    console.error('Error saving grocery items:', error);
    throw error;
  }
}

export async function addGroceryItem(
  userId: string,
  item: Omit<GroceryListItem, 'id'>
): Promise<GroceryListItem> {
  const { data, error } = await supabase
    .from('user_grocery_items')
    .insert({
      user_id: userId,
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category_id: item.categoryId,
      checked: item.checked,
      source_recipe_ids: item.sourceRecipeIds,
    })
    .select()
    .single();

  if (error) {
    console.error('Error adding grocery item:', error);
    throw error;
  }

  return {
    id: data.id,
    name: data.name,
    quantity: Number(data.quantity),
    unit: data.unit,
    categoryId: data.category_id,
    checked: data.checked,
    sourceRecipeIds: data.source_recipe_ids || [],
  };
}

export async function updateGroceryItem(
  userId: string,
  item: GroceryListItem
): Promise<void> {
  const { error } = await supabase
    .from('user_grocery_items')
    .update({
      name: item.name,
      quantity: item.quantity,
      unit: item.unit,
      category_id: item.categoryId,
      checked: item.checked,
      source_recipe_ids: item.sourceRecipeIds,
    })
    .eq('id', item.id)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating grocery item:', error);
    throw error;
  }
}

export async function deleteGroceryItem(userId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('user_grocery_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting grocery item:', error);
    throw error;
  }
}

export async function clearAllGroceryItems(userId: string): Promise<void> {
  const { error } = await supabase
    .from('user_grocery_items')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error clearing grocery items:', error);
    throw error;
  }
}

export async function toggleGroceryItemChecked(
  userId: string,
  itemId: string,
  checked: boolean
): Promise<void> {
  const { error } = await supabase
    .from('user_grocery_items')
    .update({ checked })
    .eq('id', itemId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error toggling grocery item:', error);
    throw error;
  }
}
