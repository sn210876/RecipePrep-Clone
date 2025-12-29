/*
  # Fix Security and Performance Issues

  ## Overview
  This migration addresses critical security and performance issues identified in the database audit:
  - Adds missing indexes on foreign keys for optimal query performance
  - Optimizes RLS policies to use SELECT wrapper for auth functions (prevents re-evaluation per row)
  - Fixes function search path mutability issues
  
  ## Changes

  ### 1. Add Missing Foreign Key Indexes
  Creates indexes on all foreign key columns that were missing coverage:
  - comments.user_id
  - conversations.created_by, user2_id
  - likes.user_id
  - messages.sender_id
  - notifications.actor_id, message_id, post_id

  ### 2. Optimize RLS Policies
  Recreates all policies that call auth.uid() to use (SELECT auth.uid()) pattern.
  This prevents the function from being re-evaluated for each row, significantly improving performance at scale.
  
  Affected tables:
  - comments, follows, profiles, posts, likes, post_hashtags
  - notifications, post_ratings, dailies, saved_recipes
  - grocery_list_categories, grocery_list_items, meal_plans
  - cart_items, reviews, review_images, post_media
  - conversations, conversation_participants, messages

  ### 3. Fix Function Search Paths
  Updates functions to have immutable search paths:
  - create_message_notification
  - update_post_rating_updated_at

  ## Security Impact
  - Enhanced query performance prevents potential DoS through slow queries
  - Maintains all existing security restrictions
  - No changes to access control logic
*/

-- =====================================================
-- PART 1: Add Missing Foreign Key Indexes
-- =====================================================

-- Comments table
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);

-- Conversations table
CREATE INDEX IF NOT EXISTS idx_conversations_created_by ON public.conversations(created_by);
CREATE INDEX IF NOT EXISTS idx_conversations_user2_id ON public.conversations(user2_id);

-- Likes table
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON public.likes(user_id);

-- Messages table
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

-- Notifications table
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_message_id ON public.notifications(message_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications(post_id);

-- =====================================================
-- PART 2: Optimize RLS Policies
-- =====================================================

-- Comments policies
DROP POLICY IF EXISTS "Users can delete own comments" ON public.comments;
CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Follows policies
DROP POLICY IF EXISTS "Users can follow others" ON public.follows;
CREATE POLICY "Users can follow others"
  ON public.follows FOR INSERT
  TO authenticated
  WITH CHECK (follower_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unfollow" ON public.follows;
CREATE POLICY "Users can unfollow"
  ON public.follows FOR DELETE
  TO authenticated
  USING (follower_id = (SELECT auth.uid()));

-- Profiles policies
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = (SELECT auth.uid()))
  WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = (SELECT auth.uid()));

-- Posts policies
DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts"
  ON public.posts FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own posts" ON public.posts;
CREATE POLICY "Users can update own posts"
  ON public.posts FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;
CREATE POLICY "Users can delete own posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Likes policies
DROP POLICY IF EXISTS "Users can like posts" ON public.likes;
CREATE POLICY "Users can like posts"
  ON public.likes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unlike posts" ON public.likes;
CREATE POLICY "Users can unlike posts"
  ON public.likes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Post hashtags policies
DROP POLICY IF EXISTS "Users can create hashtags for their posts" ON public.post_hashtags;
CREATE POLICY "Users can create hashtags for their posts"
  ON public.post_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete hashtags from their posts" ON public.post_hashtags;
CREATE POLICY "Users can delete hashtags from their posts"
  ON public.post_hashtags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = (SELECT auth.uid())
    )
  );

-- Notifications policies
DROP POLICY IF EXISTS "Users can read own notifications" ON public.notifications;
CREATE POLICY "Users can read own notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own notifications" ON public.notifications;
CREATE POLICY "Users can update own notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Post ratings policies
DROP POLICY IF EXISTS "Users can create own ratings" ON public.post_ratings;
CREATE POLICY "Users can create own ratings"
  ON public.post_ratings FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own ratings" ON public.post_ratings;
CREATE POLICY "Users can update own ratings"
  ON public.post_ratings FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own ratings" ON public.post_ratings;
CREATE POLICY "Users can delete own ratings"
  ON public.post_ratings FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Dailies policies
DROP POLICY IF EXISTS "Users can create own dailies" ON public.dailies;
CREATE POLICY "Users can create own dailies"
  ON public.dailies FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own dailies" ON public.dailies;
CREATE POLICY "Users can delete own dailies"
  ON public.dailies FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Saved recipes policies
DROP POLICY IF EXISTS "Users can view own saved recipes" ON public.saved_recipes;
CREATE POLICY "Users can view own saved recipes"
  ON public.saved_recipes FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can save recipes" ON public.saved_recipes;
CREATE POLICY "Users can save recipes"
  ON public.saved_recipes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can unsave recipes" ON public.saved_recipes;
CREATE POLICY "Users can unsave recipes"
  ON public.saved_recipes FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Grocery list categories policies
DROP POLICY IF EXISTS "Users can view own categories" ON public.grocery_list_categories;
CREATE POLICY "Users can view own categories"
  ON public.grocery_list_categories FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own categories" ON public.grocery_list_categories;
CREATE POLICY "Users can create own categories"
  ON public.grocery_list_categories FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own categories" ON public.grocery_list_categories;
CREATE POLICY "Users can update own categories"
  ON public.grocery_list_categories FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own categories" ON public.grocery_list_categories;
CREATE POLICY "Users can delete own categories"
  ON public.grocery_list_categories FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Grocery list items policies
DROP POLICY IF EXISTS "Users can view own items" ON public.grocery_list_items;
CREATE POLICY "Users can view own items"
  ON public.grocery_list_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own items" ON public.grocery_list_items;
CREATE POLICY "Users can create own items"
  ON public.grocery_list_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own items" ON public.grocery_list_items;
CREATE POLICY "Users can update own items"
  ON public.grocery_list_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own items" ON public.grocery_list_items;
CREATE POLICY "Users can delete own items"
  ON public.grocery_list_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Meal plans policies
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.meal_plans;
CREATE POLICY "Users can view own meal plans"
  ON public.meal_plans FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can create own meal plans" ON public.meal_plans;
CREATE POLICY "Users can create own meal plans"
  ON public.meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own meal plans" ON public.meal_plans;
CREATE POLICY "Users can update own meal plans"
  ON public.meal_plans FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.meal_plans;
CREATE POLICY "Users can delete own meal plans"
  ON public.meal_plans FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Cart items policies
DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;
CREATE POLICY "Users can view own cart"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can add to cart" ON public.cart_items;
CREATE POLICY "Users can add to cart"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update cart" ON public.cart_items;
CREATE POLICY "Users can update cart"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can remove from cart" ON public.cart_items;
CREATE POLICY "Users can remove from cart"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Reviews policies
DROP POLICY IF EXISTS "Users can create reviews" ON public.reviews;
CREATE POLICY "Users can create reviews"
  ON public.reviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own reviews" ON public.reviews;
CREATE POLICY "Users can update own reviews"
  ON public.reviews FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can delete own reviews" ON public.reviews;
CREATE POLICY "Users can delete own reviews"
  ON public.reviews FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Review images policies
DROP POLICY IF EXISTS "Users can add images to own reviews" ON public.review_images;
CREATE POLICY "Users can add images to own reviews"
  ON public.review_images FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.id = review_images.review_id
      AND reviews.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete own review images" ON public.review_images;
CREATE POLICY "Users can delete own review images"
  ON public.review_images FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reviews
      WHERE reviews.id = review_images.review_id
      AND reviews.user_id = (SELECT auth.uid())
    )
  );

-- Post media policies
DROP POLICY IF EXISTS "Users can insert media for their own posts" ON public.post_media;
CREATE POLICY "Users can insert media for their own posts"
  ON public.post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can delete their own post media" ON public.post_media;
CREATE POLICY "Users can delete their own post media"
  ON public.post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = (SELECT auth.uid())
    )
  );

-- Conversations policies
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
  ON public.conversations FOR SELECT
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR 
    user2_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;
CREATE POLICY "Users can create conversations"
  ON public.conversations FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
  ON public.conversations FOR UPDATE
  TO authenticated
  USING (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    created_by = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = (SELECT auth.uid())
    )
  );

-- Conversation participants policies
DROP POLICY IF EXISTS "Users can view participants in their conversations" ON public.conversation_participants;
CREATE POLICY "Users can view participants in their conversations"
  ON public.conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND (
        conversations.created_by = (SELECT auth.uid()) OR
        conversations.user2_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants cp2
          WHERE cp2.conversation_id = conversations.id
          AND cp2.user_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Group creators can add participants" ON public.conversation_participants;
CREATE POLICY "Group creators can add participants"
  ON public.conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = (SELECT auth.uid())
    )
  );

DROP POLICY IF EXISTS "Group creators can remove participants" ON public.conversation_participants;
CREATE POLICY "Group creators can remove participants"
  ON public.conversation_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.created_by = (SELECT auth.uid())
    )
  );

-- Messages policies
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON public.messages;
CREATE POLICY "Users can view messages in their conversations"
  ON public.messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.created_by = (SELECT auth.uid()) OR
        conversations.user2_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON public.messages;
CREATE POLICY "Users can send messages in their conversations"
  ON public.messages FOR INSERT
  TO authenticated
  WITH CHECK (
    sender_id = (SELECT auth.uid()) AND
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.created_by = (SELECT auth.uid()) OR
        conversations.user2_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = (SELECT auth.uid())
        )
      )
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.messages;
CREATE POLICY "Users can update messages in their conversations"
  ON public.messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.created_by = (SELECT auth.uid()) OR
        conversations.user2_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = (SELECT auth.uid())
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.created_by = (SELECT auth.uid()) OR
        conversations.user2_id = (SELECT auth.uid()) OR
        EXISTS (
          SELECT 1 FROM public.conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = (SELECT auth.uid())
        )
      )
    )
  );

-- =====================================================
-- PART 3: Fix Function Search Paths
-- =====================================================

-- Recreate create_message_notification with stable search path
CREATE OR REPLACE FUNCTION public.create_message_notification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, message_id, actor_id)
  SELECT 
    CASE 
      WHEN c.created_by = NEW.sender_id THEN c.user2_id
      ELSE c.created_by
    END,
    'message',
    NEW.id,
    NEW.sender_id
  FROM public.conversations c
  WHERE c.id = NEW.conversation_id
    AND CASE 
      WHEN c.created_by = NEW.sender_id THEN c.user2_id
      ELSE c.created_by
    END IS NOT NULL;
  
  RETURN NEW;
END;
$$;

-- Recreate update_post_rating_updated_at with stable search path
CREATE OR REPLACE FUNCTION public.update_post_rating_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;
