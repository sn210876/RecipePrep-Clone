/*
  # Add Title and Video URL to Posts

  ## Changes
  - Add `title` column to `posts` table (text, not null with default)
  - Add `video_url` column to `posts` table (text, nullable)
  - Make `image_url` nullable since posts can now have either image or video

  ## Details
  1. Column Additions:
     - `title`: Required field for all posts, defaults to empty string for existing posts
     - `video_url`: Optional field for video posts
     - `image_url`: Changed to nullable to support video-only posts

  2. Notes:
     - Existing posts will have title set to empty string by default
     - Posts can have either image_url or video_url or both
*/

-- Add title column to posts (not null with default for existing rows)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'title'
  ) THEN
    ALTER TABLE posts ADD COLUMN title text NOT NULL DEFAULT '';
  END IF;
END $$;

-- Add video_url column to posts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN video_url text;
  END IF;
END $$;

-- Make image_url nullable since posts can now have video instead
DO $$
BEGIN
  ALTER TABLE posts ALTER COLUMN image_url DROP NOT NULL;
EXCEPTION
  WHEN others THEN
    NULL;
END $$;