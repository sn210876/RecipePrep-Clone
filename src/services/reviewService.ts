import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase credentials not configured, reviews will be disabled');
}

const supabase = supabaseUrl && supabaseKey
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export interface ReviewData {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  updated_at: string;
  user_id: string;
  recipe_id: string;
}

export interface ReviewImage {
  id: string;
  image_url: string;
  review_id: string;
}

export interface ReviewWithImages extends ReviewData {
  images: ReviewImage[];
  author?: string;
}

export async function getRecipeReviews(recipeId: string) {
  if (!supabase) return [];

  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (!post) return [];

  const { data: comments, error } = await supabase
    .from('comments')
    .select('*, profiles:user_id(username, avatar_url)')
    .eq('post_id', post.id)
    .not('rating', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;

  return comments || [];
}

export async function getUserReview(recipeId: string, userId: string) {
  if (!supabase) return null;

  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (!post) return null;

  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', post.id)
    .eq('user_id', userId)
    .not('rating', 'is', null)
    .maybeSingle();

  if (error) throw error;

  return data ? { ...data, comment: data.text, images: [] } : null;
}

export async function uploadReviewImage(file: File): Promise<string> {
  if (!supabase) throw new Error('Supabase not configured');

  const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${file.name}`;
  const filePath = `reviews/${fileName}`;

  const { error } = await supabase.storage
    .from('recipe-images')
    .upload(filePath, file);

  if (error) throw error;

  const { data } = supabase.storage
    .from('recipe-images')
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createReview(
  recipeId: string,
  rating: number,
  comment: string,
  _images: File[]
) {
  if (!supabase) throw new Error('Supabase not configured');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (!post) {
    throw new Error('No post found for this recipe');
  }

  const ratingText = '🔥'.repeat(rating);
  const commentText = comment ? ` - ${comment}` : '';

  const { data: commentData, error: commentError } = await supabase
    .from('comments')
    .insert({
      post_id: post.id,
      user_id: user.id,
      text: `${ratingText}${commentText}`,
      rating: rating,
    })
    .select()
    .single();

  if (commentError) throw commentError;

  return commentData;
}

export async function updateReview(
  reviewId: string,
  rating: number,
  comment: string,
  _newImages: File[]
) {
  if (!supabase) throw new Error('Supabase not configured');

  const ratingText = '🔥'.repeat(rating);
  const commentText = comment ? ` - ${comment}` : '';

  const { error: updateError } = await supabase
    .from('comments')
    .update({
      rating,
      text: `${ratingText}${commentText}`,
    })
    .eq('id', reviewId);

  if (updateError) throw updateError;

  return { id: reviewId, rating, comment };
}

export async function deleteReview(reviewId: string) {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
}

export async function getAverageRating(recipeId: string): Promise<number> {
  if (!supabase) return 0;

  const { data: post } = await supabase
    .from('posts')
    .select('id')
    .eq('recipe_id', recipeId)
    .maybeSingle();

  if (!post) return 0;

  const { data, error } = await supabase
    .from('comments')
    .select('rating')
    .eq('post_id', post.id)
    .not('rating', 'is', null);

  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return Math.round(average * 10) / 10;
}
