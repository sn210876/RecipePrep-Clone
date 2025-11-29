/*
  # Fix Security and Performance Issues - Final
  
  ## Overview
  This migration addresses critical security and performance issues identified by Supabase.
  
  ## Changes Made
  
  ### 1. Add Missing Indexes on Foreign Keys (8 indexes)
  Improves query performance for foreign key lookups
  
  ### 2. Optimize RLS Policies with SELECT Wrapper (5 policies)
  Prevents policy re-evaluation for each row
  
  ### 3. Remove Unused Indexes (13 indexes)
  Reduces index maintenance overhead
  
  ### 4. Fix Function Search Paths (5 functions)
  Improves security and prevents search_path attacks
  
  ## Performance Impact
  - ✅ Faster foreign key lookups (8 new indexes)
  - ✅ Optimized RLS policy evaluation (5 policies)
  - ✅ Reduced write overhead (13 indexes removed)
  - ✅ More secure function execution (5 functions)
*/

-- =====================================================
-- 1. ADD MISSING INDEXES ON FOREIGN KEYS
-- =====================================================

-- Comments table indexes
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Direct messages table index
CREATE INDEX IF NOT EXISTS idx_direct_messages_sender_id ON public.direct_messages(sender_id);

-- Family codes table index
CREATE INDEX IF NOT EXISTS idx_family_codes_created_by_admin_id ON public.family_codes(created_by_admin_id);

-- Follows table index
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);

-- Likes table index
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- Post ratings table index
CREATE INDEX IF NOT EXISTS idx_post_ratings_user_id ON public.post_ratings(user_id);

-- Saved recipes table index
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON public.saved_recipes(recipe_id);

-- =====================================================
-- 2. OPTIMIZE RLS POLICIES WITH SELECT WRAPPER
-- =====================================================

-- Fix notification_logs RLS policy
DROP POLICY IF EXISTS "Users can view own notification logs" ON public.notification_logs;
CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Fix saved_recipes RLS policies
DROP POLICY IF EXISTS "Users can view own saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can view own saved recipes"
  ON public.saved_recipes
  FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can insert own saved recipes"
  ON public.saved_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can update own saved recipes"
  ON public.saved_recipes
  FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can delete own saved recipes"
  ON public.saved_recipes
  FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 3. REMOVE UNUSED INDEXES
-- =====================================================

-- Notifications indexes (unused - causing write overhead)
DROP INDEX IF EXISTS public.idx_notifications_actor_id;
DROP INDEX IF EXISTS public.idx_notifications_conversation_id;
DROP INDEX IF EXISTS public.idx_notifications_post_id;

-- Subscriptions indexes (unused)
DROP INDEX IF EXISTS public.idx_subscriptions_status;
DROP INDEX IF EXISTS public.idx_subscriptions_expires_at;

-- Dailies indexes (unused)
DROP INDEX IF EXISTS public.dailies_user_id_idx;
DROP INDEX IF EXISTS public.dailies_created_at_idx;

-- Referrals indexes (unused)
DROP INDEX IF EXISTS public.idx_referrals_referred_user_id;
DROP INDEX IF EXISTS public.idx_referrals_referral_code;

-- Family codes indexes (unused)
DROP INDEX IF EXISTS public.idx_family_codes_is_used;
DROP INDEX IF EXISTS public.idx_family_codes_used_by;

-- Notification logs indexes (unused)
DROP INDEX IF EXISTS public.idx_notification_logs_status;
DROP INDEX IF EXISTS public.idx_notification_logs_sent_at;
DROP INDEX IF EXISTS public.idx_notification_logs_category;

-- Public recipes index (unused)
DROP INDEX IF EXISTS public.idx_public_recipes_has_nutrition;

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATHS FOR SECURITY
-- =====================================================

-- Fix update_updated_at function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_posts_updated_at function
CREATE OR REPLACE FUNCTION public.update_posts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$;

-- Fix process_post_hashtags function
CREATE OR REPLACE FUNCTION public.process_post_hashtags()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  hashtag_text text;
  hashtag_array text[];
  existing_hashtag_id uuid;
BEGIN
  -- Extract hashtags from caption
  IF NEW.caption IS NOT NULL THEN
    hashtag_array := regexp_matches(NEW.caption, '#\w+', 'g');
    
    FOREACH hashtag_text IN ARRAY hashtag_array
    LOOP
      -- Remove the # symbol
      hashtag_text := substring(hashtag_text from 2);
      
      -- Check if hashtag exists
      SELECT id INTO existing_hashtag_id
      FROM public.hashtags
      WHERE tag = lower(hashtag_text);
      
      -- Create hashtag if it doesn't exist
      IF existing_hashtag_id IS NULL THEN
        INSERT INTO public.hashtags (tag)
        VALUES (lower(hashtag_text))
        RETURNING id INTO existing_hashtag_id;
      END IF;
      
      -- Link hashtag to post
      INSERT INTO public.post_hashtags (post_id, hashtag_id)
      VALUES (NEW.id, existing_hashtag_id)
      ON CONFLICT DO NOTHING;
      
      -- Increment usage count
      UPDATE public.hashtags
      SET usage_count = usage_count + 1
      WHERE id = existing_hashtag_id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Fix send_welcome_message function
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
  
  -- Send welcome message
  INSERT INTO public.direct_messages (
    conversation_id,
    sender_id,
    receiver_id,
    message
  )
  VALUES (
    conversation_id_var,
    admin_user_id,
    NEW.id,
    'Welcome to MealScrape! 👋 We''re excited to have you here. If you have any questions or need help getting started, feel free to reach out. Happy cooking! 🍳'
  );
  
  RETURN NEW;
END;
$$;

-- =====================================================
-- VERIFICATION AND LOGGING
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ SECURITY AND PERFORMANCE FIXES COMPLETED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Performance Improvements:';
  RAISE NOTICE '   • Added 8 foreign key indexes for faster lookups';
  RAISE NOTICE '   • Removed 13 unused indexes to reduce write overhead';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Security Improvements:';
  RAISE NOTICE '   • Optimized 5 RLS policies with SELECT wrapper';
  RAISE NOTICE '   • Fixed search paths for 5 functions';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️  Manual Action Required:';
  RAISE NOTICE '   • Enable "Leaked Password Protection" in Supabase Auth settings';
  RAISE NOTICE '   • Dashboard → Authentication → Policies → Enable HIBP check';
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════════════════════════';
END $$;