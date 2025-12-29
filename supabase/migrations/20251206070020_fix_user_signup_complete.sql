/*
  # Fix User Signup - Add Missing Username to Subscriptions

  1. Problem
    - Subscriptions table requires username (NOT NULL)
    - Trigger function not setting username field
    - Causing "Database error saving new user"
    
  2. Solution
    - Update handle_new_user function to include username in subscription insert
    
  3. Security
    - Maintains existing SECURITY DEFINER to bypass RLS
*/

-- Update handle_new_user function to include username
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

  -- Create subscription with username (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.subscriptions (
    user_id,
    username,
    subscription_type,
    status,
    trial_ends_at,
    expires_at,
    monthly_amount
  ) VALUES (
    NEW.id,
    user_username,
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO anon;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;