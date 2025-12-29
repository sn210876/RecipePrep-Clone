/*
  # Fix User Signup Process - Complete Fix

  1. Problem
    - handle_new_user() function was referencing non-existent 'full_name' column
    - Causing "Database error saving new user" for both email and OAuth signups
    
  2. Solution
    - Update function to use only existing profile columns
    - Handle OAuth providers (Google, etc) metadata correctly
    - Create subscription automatically
    - Add proper error handling
    
  3. Security
    - Maintains SECURITY DEFINER for proper permissions
    - Works with email and all OAuth providers
*/

-- Drop existing trigger to recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Fix handle_new_user function with complete signup flow
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  user_username text;
  user_email text;
BEGIN
  -- Get email (handle OAuth providers that might not have email immediately)
  user_email := COALESCE(NEW.email, 'user_' || NEW.id::text);
  
  -- Get username from various possible sources (OAuth providers store differently)
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(user_email, '@', 1),
    'user_' || substring(NEW.id::text, 1, 8)
  );
  
  -- Create profile with existing columns only
  INSERT INTO public.profiles (id, username, email)
  VALUES (NEW.id, user_username, user_email)
  ON CONFLICT (id) DO UPDATE
  SET 
    email = COALESCE(EXCLUDED.email, profiles.email),
    username = CASE 
      WHEN profiles.username IS NULL OR profiles.username = '' 
      THEN EXCLUDED.username 
      ELSE profiles.username 
    END;

  -- Create early bird subscription (6 month trial)
  INSERT INTO public.subscriptions (
    user_id,
    subscription_type,
    status,
    trial_ends_at,
    expires_at,
    monthly_amount
  ) VALUES (
    NEW.id,
    'early_bird',
    'active',
    now() + interval '6 months',
    now() + interval '6 months',
    NULL
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure welcome message trigger exists and runs after handle_new_user
DROP TRIGGER IF EXISTS on_profile_created ON auth.users;
CREATE TRIGGER on_profile_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.send_welcome_message();