/*
  # Create Reviews Table
  
  1. New Tables
    - `reviews`
      - `id` (uuid, primary key)
      - `recipe_id` (uuid, references public_recipes)
      - `user_id` (uuid, references auth.users)
      - `rating` (integer, 1-5)
      - `comment` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `review_images`
      - `id` (uuid, primary key)
      - `review_id` (uuid, references reviews)
      - `image_url` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Anyone can view reviews
    - Authenticated users can create reviews
    - Users can update/delete their own reviews
*/

CREATE TABLE IF NOT EXISTS reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id uuid NOT NULL,
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS review_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view reviews"
  ON reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create reviews"
  ON reviews FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reviews"
  ON reviews FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reviews"
  ON reviews FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view review images"
  ON review_images FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create review images"
  ON review_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM reviews
      WHERE reviews.id = review_images.review_id
      AND reviews.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_reviews_recipe_id ON reviews(recipe_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_images_review_id ON review_images(review_id);