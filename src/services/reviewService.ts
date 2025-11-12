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

  const { data: reviews, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('recipe_id', recipeId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  const reviewsWithImages = await Promise.all(
    (reviews || []).map(async (review) => {
      const { data: images } = await supabase!
        .from('review_images')
        .select('id, image_url')
        .eq('review_id', review.id);

      return {
        ...review,
        images: images || [],
      };
    })
  );

  return reviewsWithImages;
}

export async function getUserReview(recipeId: string, userId: string) {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('reviews')
    .select('*')
    .eq('recipe_id', recipeId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!data) return null;

  const { data: images } = await supabase
    .from('review_images')
    .select('id, image_url')
    .eq('review_id', data.id);

  return {
    ...data,
    images: images || [],
  };
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
  images: File[]
) {
  if (!supabase) throw new Error('Supabase not configured');

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error('User not authenticated');

  const { data: review, error: reviewError } = await supabase
    .from('reviews')
    .insert({
      recipe_id: recipeId,
      user_id: user.id,
      rating,
      comment,
    })
    .select()
    .single();

  if (reviewError) throw reviewError;

  if (images.length > 0) {
    const imageUrls = await Promise.all(images.map(uploadReviewImage));

    const { error: imagesError } = await supabase
      .from('review_images')
      .insert(
        imageUrls.map((url) => ({
          review_id: review.id,
          image_url: url,
        }))
      );

    if (imagesError) throw imagesError;
  }

  try {
    const { data: recipe } = await supabase
      .from('public_recipes')
      .select('video_url')
      .eq('id', recipeId)
      .maybeSingle();

    if (recipe?.video_url) {
      const { data: post } = await supabase
        .from('posts')
        .select('id')
        .eq('recipe_url', recipe.video_url)
        .maybeSingle();

      if (post) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .maybeSingle();

        const ratingText = '🔥'.repeat(rating);
        const commentText = comment ? `: ${comment}` : '';

        await supabase.from('comments').insert({
          post_id: post.id,
          user_id: user.id,
          text: `${profile?.username || 'User'} rated this ${ratingText}${commentText}`,
        });
      }
    }
  } catch (error) {
    console.error('Failed to add review as comment to social post:', error);
  }

  return review;
}

export async function updateReview(
  reviewId: string,
  rating: number,
  comment: string,
  newImages: File[]
) {
  if (!supabase) throw new Error('Supabase not configured');

  const { error: updateError } = await supabase
    .from('reviews')
    .update({
      rating,
      comment,
      updated_at: new Date().toISOString(),
    })
    .eq('id', reviewId);

  if (updateError) throw updateError;

  if (newImages.length > 0) {
    const imageUrls = await Promise.all(newImages.map(uploadReviewImage));

    const { error: imagesError } = await supabase
      .from('review_images')
      .insert(
        imageUrls.map((url) => ({
          review_id: reviewId,
          image_url: url,
        }))
      );

    if (imagesError) throw imagesError;
  }

  return { id: reviewId, rating, comment };
}

export async function deleteReview(reviewId: string) {
  if (!supabase) throw new Error('Supabase not configured');

  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('id', reviewId);

  if (error) throw error;
}

export async function getAverageRating(recipeId: string): Promise<number> {
  if (!supabase) return 0;

  const { data, error } = await supabase
    .from('reviews')
    .select('rating')
    .eq('recipe_id', recipeId);

  if (error) throw error;
  if (!data || data.length === 0) return 0;

  const average = data.reduce((sum, r) => sum + r.rating, 0) / data.length;
  return Math.round(average * 10) / 10;
}
