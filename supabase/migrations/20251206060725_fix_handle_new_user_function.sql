/*
  # Fix handle_new_user Function

  1. Problem
    - Function tries to insert into 'full_name' column that doesn't exist
    - Causing "Database error saving new user" on signup
    
  2. Solution
    - Update function to only use existing columns: id, username, email
    - Handle both email and Google OAuth signups
    
  3. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Works with both email and OAuth providers
*/

-- Fix handle_new_user function to use only existing columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Insert profile with only existing columns
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'username',
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    ),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    email = EXCLUDED.email,
    username = CASE 
      WHEN profiles.username IS NULL OR profiles.username = '' 
      THEN EXCLUDED.username 
      ELSE profiles.username 
    END;
  
  RETURN NEW;
END;
$$;