/*
  # Fix Welcome Message - Admin Lookup

  1. Problem
    - send_welcome_message() trying to query admin_users by email
    - admin_users table only has user_id and role columns
    - Need to join with profiles to find admin by email
    
  2. Solution
    - Update function to join admin_users with profiles to find admin
    
  3. Security
    - Maintains SECURITY DEFINER to bypass RLS
*/

-- Fix the send_welcome_message function with correct admin lookup
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  admin_user_id uuid;
  conversation_id_var uuid;
BEGIN
  -- Get admin user ID by joining admin_users with profiles
  SELECT a.user_id INTO admin_user_id
  FROM public.admin_users a
  JOIN public.profiles p ON p.id = a.user_id
  WHERE p.email = 'mealscrapeapp@gmail.com'
  LIMIT 1;

  IF admin_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Create or get conversation
  SELECT id INTO conversation_id_var
  FROM public.conversations
  WHERE (user1_id = admin_user_id AND user2_id = NEW.id)
     OR (user1_id = NEW.id AND user2_id = admin_user_id)
  LIMIT 1;

  IF conversation_id_var IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id)
    VALUES (admin_user_id, NEW.id)
    RETURNING id INTO conversation_id_var;
  END IF;

  -- Send welcome message with correct column name 'content'
  INSERT INTO public.direct_messages (
    conversation_id,
    sender_id,
    content
  )
  VALUES (
    conversation_id_var,
    admin_user_id,
    'Welcome to MealScrape! 👋 We''re excited to have you here. If you have any questions or need help getting started, feel free to reach out. Happy cooking! 🍳'
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Error in send_welcome_message for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO anon;
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_welcome_message() TO service_role;
