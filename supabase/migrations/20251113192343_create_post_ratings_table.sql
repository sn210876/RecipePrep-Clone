/*
  # Create Post Ratings Table

  ## Overview
  Creates a rating system for post comments similar to Amazon reviews.
  Users can rate posts with 1-5 stars when they comment.

  ## Changes
  1. New Tables
    - `post_ratings`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references auth.users)
      - `rating` (integer, 1-5 stars)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - Unique constraint: one rating per user per post
    - Users can update their rating

  2. Security
    - Enable RLS on post_ratings table
    - Anyone can view ratings
    - Users can create their own ratings
    - Users can update only their own ratings
    - Users can delete only their own ratings

  3. Indexes
    - Index on post_id for fast lookup
    - Index on user_id for user's ratings
    - Composite index on (post_id, user_id) for uniqueness

  ## Important Notes
  - Rating is stored separately from comments
  - Users can rate without commenting
  - Users can comment without rating
  - Average rating can be calculated on-the-fly
*/

-- Create post_ratings table
CREATE TABLE IF NOT EXISTS post_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_post_ratings_post_id ON post_ratings(post_id);
CREATE INDEX IF NOT EXISTS idx_post_ratings_user_id ON post_ratings(user_id);

-- Enable RLS
ALTER TABLE post_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view ratings"
  ON post_ratings FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create own ratings"
  ON post_ratings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own ratings"
  ON post_ratings FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own ratings"
  ON post_ratings FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_post_rating_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS on_post_rating_updated ON post_ratings;
CREATE TRIGGER on_post_rating_updated
  BEFORE UPDATE ON post_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_post_rating_updated_at();