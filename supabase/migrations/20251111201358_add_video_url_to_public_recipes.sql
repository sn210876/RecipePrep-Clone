/*
  # Add video_url column to public_recipes table

  1. Changes
    - Add `video_url` column to `public_recipes` table for storing social media video URLs
    - Column is optional (nullable) to maintain backward compatibility
  
  2. Purpose
    - Enable storing video URLs from social media platforms (TikTok, Instagram, YouTube)
    - Allow recipes extracted from video sources to display embedded videos instead of static images
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'public_recipes' AND column_name = 'video_url'
  ) THEN
    ALTER TABLE public_recipes ADD COLUMN video_url text;
  END IF;
END $$;