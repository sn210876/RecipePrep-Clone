/*
  # Add Banner Photo to Profiles

  ## Overview
  Adds a banner/cover photo field to user profiles, similar to LinkedIn's profile banner.

  ## Changes
  1. New Columns
    - `banner_url` (text, nullable) - URL to the user's banner/cover photo
  
  ## Security
  - No RLS changes needed - uses existing profile policies

  ## Important Notes
  - Banner photos will be stored in Supabase Storage
  - Users can upload and change their banner through profile settings
*/

-- Add banner_url column to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'banner_url'
  ) THEN
    ALTER TABLE profiles ADD COLUMN banner_url text;
  END IF;
END $$;