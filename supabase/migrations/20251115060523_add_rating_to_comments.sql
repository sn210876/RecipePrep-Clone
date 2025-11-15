/*
  # Add Rating Support to Comments

  1. Changes
    - Add `rating` column to comments table (1-5 integer, nullable)
    - This allows comments to also serve as reviews with ratings
    
  2. Security
    - No RLS changes needed - existing comment policies apply
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'rating'
  ) THEN
    ALTER TABLE comments ADD COLUMN rating integer CHECK (rating >= 1 AND rating <= 5);
  END IF;
END $$;