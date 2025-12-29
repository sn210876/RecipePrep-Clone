/*
  # Update Welcome DM System to Use Existing Admin Account

  ## Changes
  - Updates the `send_welcome_message()` function to use the existing admin account
  - Admin account ID: d298f0c2-8748-4a0a-bb0c-9c8605595c58
  - Admin username: MealScrape
  - Removes dependency on 'mealscrape_bot' username lookup

  ## Purpose
  - Use the actual admin account instead of creating a separate bot
  - Ensures welcome messages are sent from the official MealScrape account
*/

-- Update function to use the specific admin account ID
CREATE OR REPLACE FUNCTION public.send_welcome_message()
RETURNS trigger AS $$
DECLARE
  bot_id uuid := 'd298f0c2-8748-4a0a-bb0c-9c8605595c58';
  conv_id uuid;
  user_name text;
BEGIN
  -- Don't send welcome message to the admin itself
  IF NEW.id = bot_id THEN
    RETURN NEW;
  END IF;

  -- Get the user's name from metadata or email
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    split_part(NEW.email, '@', 1)
  );

  -- Create conversation between new user and admin
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
