/*
  # Add Photo URL to Posts

  ## Overview
  Adds photo_url column to posts table to allow users to change post thumbnails

  ## Changes
  - Add photo_url column to posts table (nullable text)
  - Users can update this to change their post's displayed image

  ## Important Notes
  - If photo_url is set, it will be used instead of image_url
  - This allows Instagram-style thumbnail customization
*/

-- Add photo_url column
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'posts' 
    AND column_name = 'photo_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN photo_url text;
  END IF;
END $$;