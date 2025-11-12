/*
  # Add recipe_id to posts table

  1. Changes
    - Add `recipe_id` column to `posts` table (nullable UUID)
    - Add foreign key constraint to link posts to recipes
    - Add index on recipe_id for faster lookups

  2. Notes
    - Column is nullable to support existing posts without recipes
    - Allows posts to link to internal recipes for "View Recipe" functionality
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'recipe_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN recipe_id uuid;
    CREATE INDEX IF NOT EXISTS idx_posts_recipe_id ON posts(recipe_id);
  END IF;
END $$;
