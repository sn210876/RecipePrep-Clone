/*
  # Create Welcome DM System for New Users

  ## Overview
  Automatically sends a welcome direct message to every new user upon signup.

  ## Changes

  ### 1. System Bot User Creation
  - Creates a system bot profile with a known UUID
  - Bot username: 'mealscrape_bot'
  - Bot bio explains its purpose

  ### 2. Welcome Message Trigger Function
  - Function: `send_welcome_message()`
  - Triggers automatically after new user creation in auth.users
  - Creates a conversation between new user and bot
  - Sends personalized welcome message with feature overview

  ### 3. Welcome Message Content
  - Greets user by name
  - Explains key features: Add recipes, Post meals, Meal planning
  - Encourages exploration and engagement
  - Friendly, casual tone

  ## Security
  - Bot messages only sent to real users (not to bot itself)
  - Uses existing RLS policies for conversations and messages
  - Bot identified by username 'mealscrape_bot'

  ## Important Notes
  - Bot profile must be created manually first via signup
  - Existing users will NOT receive welcome messages (only new signups)
  - Welcome messages appear in user's Messages inbox as unread
  - Users can reply to bot messages (manual responses needed)
*/

-- Function to send welcome message to new users
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS trigger AS $$
DECLARE
  bot_id uuid;
  conv_id uuid;
  user_name text;
BEGIN
  -- Get the bot user ID by username
  SELECT id INTO bot_id FROM public.profiles WHERE username = 'mealscrape_bot' LIMIT 1;
  
  -- If bot doesn't exist yet, skip (will be set up later)
  IF bot_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Don't send welcome message to the bot itself
  IF NEW.id = bot_id THEN
    RETURN NEW;
  END IF;

  -- Get the user's name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create conversation between new user and bot
  -- Ensure user IDs are ordered correctly (smaller UUID first)
  IF NEW.id < bot_id THEN
    INSERT INTO public.conversations (user1_id, user2_id, last_message_at)
    VALUES (NEW.id, bot_id, now())
    ON CONFLICT (user1_id, user2_id) DO UPDATE
    SET last_message_at = now()
    RETURNING id INTO conv_id;
  ELSE
    INSERT INTO public.conversations (user1_id, user2_id, last_message_at)
    VALUES (bot_id, NEW.id, now())
    ON CONFLICT (user1_id, user2_id) DO UPDATE
    SET last_message_at = now()
    RETURNING id INTO conv_id;
  END IF;

  -- If conversation already existed, get its ID
  IF conv_id IS NULL THEN
    IF NEW.id < bot_id THEN
      SELECT id INTO conv_id FROM public.conversations
      WHERE user1_id = NEW.id AND user2_id = bot_id;
    ELSE
      SELECT id INTO conv_id FROM public.conversations
      WHERE user1_id = bot_id AND user2_id = NEW.id;
    END IF;
  END IF;

  -- Insert welcome message
  INSERT INTO public.direct_messages (conversation_id, sender_id, content, read)
  VALUES (
    conv_id,
    bot_id,
    format('Hey %s! 👋 Welcome to MealScrape!

We''re excited to have you join our community of food lovers! Here''s what you can do:

🍳 **Add Recipes** - Tap the + button to save your favorite recipes or import them from any website

📸 **Share Your Meals** - Post photos of what you''re cooking to the Discover feed and connect with other foodies

📅 **Plan Meals** - Use the meal planner to organize your week and auto-generate grocery lists

💬 **Connect** - Follow other cooks, share tips, and discover amazing recipes

Need help getting started? Just reply here and I''ll be happy to assist!

Happy cooking! 🎉', user_name),
    false
  );

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail user creation
    RAISE WARNING 'Failed to send welcome message to user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to send welcome message on user creation
DROP TRIGGER IF EXISTS on_user_created_send_welcome ON auth.users;
CREATE TRIGGER on_user_created_send_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.send_welcome_message();

-- Note: You must create a user account with username 'mealscrape_bot' for this to work
-- Existing users will not receive retroactive welcome messages
-- Only new signups from this point forward will receive the welcome DM
