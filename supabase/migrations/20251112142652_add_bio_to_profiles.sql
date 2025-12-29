/*
  # Add bio field to profiles table

  1. Changes
    - Add `bio` column to `profiles` table (text, nullable)
    - This allows users to add a description/bio to their profile

  2. Notes
    - Existing profiles will have null bio by default
    - Bio is optional and can be updated by users
*/

-- Add bio column to profiles
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;
END $$;