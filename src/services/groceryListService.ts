import { supabase } from '../lib/supabase';

export interface GroceryItem {
  id: string;
  user_id: string;
  name: string;
  quantity: string;
  unit: string;
  category_id: string | null;
  checked: boolean;
  created_at: string;
}

export async function getGroceryItems(userId: string): Promise<GroceryItem[]> {
  const { data, error } = await supabase
    .from('grocery_list_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function addGroceryItem(
  userId: string,
  name: string,
  quantity: string,
  unit: string,
  categoryId: string | null = null
): Promise<GroceryItem> {
  const { data, error } = await supabase
    .from('grocery_list_items')
    .insert({
      user_id: userId,
      name,
      quantity,
      unit,
      category_id: categoryId,
      checked: false,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function toggleGroceryItem(itemId: string, checked: boolean): Promise<void> {
  const { error } = await supabase
    .from('grocery_list_items')
    .update({ checked })
    .eq('id', itemId);

  if (error) throw error;
}

export async function deleteGroceryItem(itemId: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_list_items')
    .delete()
    .eq('id', itemId);

  if (error) throw error;
}

export async function clearGroceryList(userId: string): Promise<void> {
  const { error } = await supabase
    .from('grocery_list_items')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}
