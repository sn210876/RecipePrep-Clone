import { supabase } from '../lib/supabase';
import type { DeliveryService } from './deliveryRoutingService';

export interface AmazonProduct {
  id: string;
  category_id: string;
  product_name: string;
  description: string | null;
  amazon_url: string;
  asin: string | null;
  price: number | null;
  image_url: string | null;
  brand: string | null;
  package_size: string | null;
  is_prime: boolean;
  search_keywords: string[];
  popularity_score: number;
  is_active: boolean;
}

export interface ProductCategory {
  id: string;
  name: string;
  description: string | null;
  icon: string;
  color: string;
  sort_order: number;
}

export interface IngredientMapping {
  id: string;
  ingredient_name: string;
  amazon_product_id: string;
  confidence_score: number;
  product?: AmazonProduct;
}

const AFFILIATE_TAG = 'mealscrape-20';

export function appendAffiliateTag(url: string): string {
  try {
    const urlObj = new URL(url);
    if (!urlObj.searchParams.has('tag')) {
      urlObj.searchParams.set('tag', AFFILIATE_TAG);
    }
    return urlObj.toString();
  } catch {
    return url.includes('?')
      ? `${url}&tag=${AFFILIATE_TAG}`
      : `${url}?tag=${AFFILIATE_TAG}`;
  }
}

export function extractAsinFromUrl(url: string): string | null {
  try {
    const asinMatch = url.match(/\/dp\/([A-Z0-9]{10})/i) || url.match(/\/gp\/product\/([A-Z0-9]{10})/i);
    return asinMatch ? asinMatch[1] : null;
  } catch {
    return null;
  }
}

export async function getAllProductCategories(): Promise<ProductCategory[]> {
  const { data, error } = await supabase
    .from('product_categories')
    .select('*')
    .order('sort_order');

  if (error) throw error;
  return data || [];
}

export async function getProductsByCategory(categoryId: string): Promise<AmazonProduct[]> {
  const { data, error } = await supabase
    .from('amazon_products')
    .select('*')
    .eq('category_id', categoryId)
    .eq('is_active', true)
    .order('popularity_score', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function searchProducts(query: string, categoryId?: string): Promise<AmazonProduct[]> {
  let queryBuilder = supabase
    .from('amazon_products')
    .select('*')
    .eq('is_active', true);

  if (categoryId) {
    queryBuilder = queryBuilder.eq('category_id', categoryId);
  }

  if (query.trim()) {
    queryBuilder = queryBuilder.or(
      `product_name.ilike.%${query}%,description.ilike.%${query}%,search_keywords.cs.{${query}}`
    );
  }

  const { data, error } = await queryBuilder
    .order('popularity_score', { ascending: false })
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function getProductById(productId: string): Promise<AmazonProduct | null> {
  const { data, error } = await supabase
    .from('amazon_products')
    .select('*')
    .eq('id', productId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findProductsForIngredient(
  ingredientName: string,
  limit: number = 5
): Promise<AmazonProduct[]> {
  const normalizedName = ingredientName.toLowerCase().trim();

  const { data: mappings, error: mappingError } = await supabase
    .from('ingredient_product_mappings')
    .select(`
      amazon_product_id,
      confidence_score,
      amazon_products (*)
    `)
    .eq('ingredient_name', normalizedName)
    .order('confidence_score', { ascending: false })
    .limit(limit);

  if (mappingError) {
    console.error('Error fetching mappings:', mappingError);
  }

  if (mappings && mappings.length > 0) {
    return mappings
      .filter(m => m.amazon_products)
      .map(m => m.amazon_products as unknown as AmazonProduct);
  }

  const searchTerm = normalizedName.split(',')[0].trim();

  let query = supabase
    .from('amazon_products')
    .select('*')
    .eq('is_active', true);

  query = query.or(
    `product_name.ilike.%${searchTerm}%,search_keywords.cs.{${searchTerm}}`
  );

  const { data: products, error: searchError } = await query
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (searchError) throw searchError;
  return products || [];
}

export async function addProductToCart(
  userId: string,
  product: AmazonProduct,
  quantity: string = '1',
  unit: string = '',
  sourceRecipeId?: string,
  deliveryService?: DeliveryService
) {
  const { data, error } = await supabase
    .from('cart_items')
    .insert({
      user_id: userId,
      ingredient_name: product.product_name,
      quantity,
      unit,
      amazon_product_url: appendAffiliateTag(product.amazon_url),
      amazon_product_name: product.product_name,
      price: product.price,
      image_url: product.image_url,
      asin: product.asin,
      source_recipe_id: sourceRecipeId,
      delivery_service: deliveryService || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function bulkAddToCart(
  userId: string,
  items: Array<{
    product: AmazonProduct;
    quantity: string;
    unit: string;
    sourceRecipeId?: string;
    deliveryService?: DeliveryService;
  }>
) {
  const cartItems = items.map(item => ({
    user_id: userId,
    ingredient_name: item.product.product_name,
    quantity: item.quantity,
    unit: item.unit,
    amazon_product_url: appendAffiliateTag(item.product.amazon_url),
    amazon_product_name: item.product.product_name,
    price: item.product.price,
    image_url: item.product.image_url,
    asin: item.product.asin,
    source_recipe_id: item.sourceRecipeId,
    delivery_service: item.deliveryService || null,
  }));

  const { data, error } = await supabase
    .from('cart_items')
    .insert(cartItems)
    .select();

  if (error) throw error;
  return data;
}

export async function incrementProductPopularity(productId: string) {
  const { error } = await supabase.rpc('increment_product_popularity', {
    product_id: productId,
  });

  if (error) {
    const { error: updateError } = await supabase
      .from('amazon_products')
      .update({ popularity_score: supabase.rpc('popularity_score') })
      .eq('id', productId);

    if (updateError) console.error('Failed to update popularity:', updateError);
  }
}
