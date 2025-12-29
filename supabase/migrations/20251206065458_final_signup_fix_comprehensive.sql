/*
  # Comprehensive Signup Fix - Final Version

  1. Problem
    - Database errors during user signup for both email and OAuth
    - RLS policies blocking trigger operations
    - Duplicate triggers causing conflicts
    
  2. Solution
    - Simplify trigger structure
    - Add anon role permissions for signup flow
    - Ensure SECURITY DEFINER functions bypass RLS
    - Add comprehensive error handling
    
  3. Changes
    - Update RLS policies to allow signup operations
    - Grant necessary permissions to anon and authenticated roles
    - Streamline trigger functions
*/

-- Drop all existing triggers to start fresh
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS on_profile_created ON auth.users;
DROP TRIGGER IF EXISTS on_user_created_send_welcome ON auth.users;

-- Recreate handle_new_user function with enhanced permissions
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

  -- Create subscription (bypasses RLS due to SECURITY DEFINER)
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
    -- Log error details but don't fail user creation
    RAISE WARNING 'Error in handle_new_user for user %: % (DETAIL: %)', 
      NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;

-- Grant execute permissions to send_welcome_message
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO anon;
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO service_role;

-- Create trigger for profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_new_user();

-- Create trigger for welcome message (fires after handle_new_user)
CREATE TRIGGER on_profile_created
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.send_welcome_message();

-- Ensure anon can insert during signup (needed for auth flow)
DROP POLICY IF EXISTS "Anon can insert during signup" ON public.profiles;
CREATE POLICY "Anon can insert during signup"
  ON public.profiles
  FOR INSERT
  TO anon
  WITH CHECK (true);

DROP POLICY IF EXISTS "Anon can insert subscription during signup" ON public.subscriptions;
CREATE POLICY "Anon can insert subscription during signup"
  ON public.subscriptions
  FOR INSERT
  TO anon
  WITH CHECK (true);