/*
  # Fix handle_new_user Function - Remove Subscriptions

  ## Overview
  The `handle_new_user` trigger function still references the `subscriptions` table
  which was removed in a recent migration. This causes new user signups to fail
  silently, preventing profiles from being created.

  ## Changes
  - Update `handle_new_user()` to remove subscription creation logic
  - Keep profile creation intact
  - Ensure Google OAuth signups work properly

  ## Impact
  - Fixes profile creation for new signups
  - Makes the app work correctly without subscriptions table
*/

-- Update the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth'
AS $function$
DECLARE
  user_username text;
  user_email text;
BEGIN
  -- Get email
  user_email := COALESCE(NEW.email, 'user_' || NEW.id::text);

  -- Get username from various OAuth providers
  user_username := COALESCE(
    NEW.raw_user_meta_data->>'username',
    NEW.raw_user_meta_data->>'user_name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'preferred_username',
    split_part(user_email, '@', 1),
    'user_' || substring(NEW.id::text, 1, 8)
  );

  -- Create profile (bypasses RLS due to SECURITY DEFINER)
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

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error details but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: % (DETAIL: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$function$;
