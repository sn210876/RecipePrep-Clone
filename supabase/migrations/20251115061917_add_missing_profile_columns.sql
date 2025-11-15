/*
  # Add missing columns to profiles table

  1. Changes
    - Add `bio` column (text, nullable) for user biographies
    - Add `banner_url` column (text, nullable) for profile banners
    
  2. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'bio'
  ) THEN
    ALTER TABLE profiles ADD COLUMN bio text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banner_url text;
  END IF;
END $$;