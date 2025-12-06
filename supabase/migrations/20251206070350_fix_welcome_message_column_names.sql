/*
  # Fix Welcome Message Function - Column Name Mismatch

  1. Problem
    - send_welcome_message() uses wrong column names
    - Trying to insert 'receiver_id' and 'message' 
    - But table has 'content' (not 'message') and no 'receiver_id'
    - This causes signup to fail completely
    
  2. Solution
    - Update function to use correct column name: 'content'
    - Remove 'receiver_id' column from insert
    
  3. Security
    - Maintains SECURITY DEFINER to bypass RLS
*/

-- Fix the send_welcome_message function with correct column names
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
  -- Get admin user ID
  SELECT user_id INTO admin_user_id
  FROM public.admin_users
  WHERE email = 'mealscrapeapp@gmail.com'
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
