/*
  # Add updated_at column to posts table

  ## Changes
  - Add `updated_at` column to `posts` table (timestamptz, defaults to now())
  - Add trigger to automatically update the timestamp on row updates

  ## Details
  This migration adds missing timestamp tracking for post updates.
  The column is added with a default value of now() for existing posts.
  A trigger will automatically update this timestamp whenever a post is modified.
*/

-- Add updated_at column to posts table if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE posts ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_posts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists (to avoid duplicates)
DROP TRIGGER IF EXISTS posts_updated_at ON posts;

-- Create trigger for posts table
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_posts_updated_at();
