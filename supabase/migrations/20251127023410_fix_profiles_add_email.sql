/*
  # Fix Profiles Table and Add Email

  1. Changes
    - Drop broken updated_at trigger
    - Add email column to profiles
    - Add updated_at column if needed
    - Populate emails from auth.users
    - Update handle_new_user trigger

  2. Purpose
    - Fix trigger error on profiles
    - Store emails in profiles for easy access
*/

-- Drop the broken trigger first
DROP TRIGGER IF EXISTS set_updated_at ON public.profiles;

-- Add updated_at column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add email column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'profiles' 
      AND column_name = 'email'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN email text;
  END IF;
END $$;

-- Populate email from auth.users
UPDATE public.profiles p
SET email = u.email
FROM auth.users u
WHERE p.id = u.id AND (p.email IS NULL OR p.email = '');

-- Recreate updated_at trigger properly
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Update handle_new_user to include email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;