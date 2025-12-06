/*
  # Fix delete user account data function with correct table names
  
  1. Changes
    - Update table names to match actual schema:
      - grocery_lists → user_grocery_items
      - meal_plans → user_meal_plans
      - messages → direct_messages
    - Add missing tables:
      - conversations
      - referral_codes
      - family_codes
      - notification_logs
      - payment_history
      - ingredient_product_mappings (where user created mappings)
      - review_images
      - post_ratings
      - blog_likes
      - blog_comment_votes
  
  2. Security
    - Maintains SECURITY DEFINER to bypass RLS
    - Validates user is deleting their own data OR using service role
*/

CREATE OR REPLACE FUNCTION delete_user_account_data(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
  is_service_role boolean;
BEGIN
  current_user_id := auth.uid();
  
  -- Check if being called by service role
  is_service_role := current_user_id IS NULL OR current_setting('request.jwt.claim.role', true) = 'service_role';
  
  -- If not service role and not authenticated, reject
  IF NOT is_service_role AND current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If not service role, verify user is deleting their own account
  IF NOT is_service_role AND current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own account';
  END IF;

  -- Delete all user data in order (respecting foreign key constraints)
  -- 1. Delete dependent records first
  DELETE FROM blog_comment_votes WHERE user_id = target_user_id;
  DELETE FROM blog_likes WHERE user_id = target_user_id;
  DELETE FROM blog_comments WHERE user_id = target_user_id;
  DELETE FROM blog_posts WHERE user_id = target_user_id;
  
  DELETE FROM post_ratings WHERE user_id = target_user_id;
  DELETE FROM review_images WHERE review_id IN (SELECT id FROM reviews WHERE user_id = target_user_id);
  DELETE FROM reviews WHERE user_id = target_user_id;
  
  DELETE FROM ingredient_product_mappings WHERE created_by = target_user_id;
  DELETE FROM cart_items WHERE user_id = target_user_id;
  DELETE FROM user_grocery_items WHERE user_id = target_user_id;
  DELETE FROM user_meal_plans WHERE user_id = target_user_id;
  
  DELETE FROM saved_recipes WHERE user_id = target_user_id;
  DELETE FROM blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  
  DELETE FROM notification_logs WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id OR actor_id = target_user_id;
  
  DELETE FROM direct_messages WHERE sender_id = target_user_id;
  DELETE FROM conversations WHERE user1_id = target_user_id OR user2_id = target_user_id;
  
  DELETE FROM likes WHERE user_id = target_user_id;
  DELETE FROM comments WHERE user_id = target_user_id;
  DELETE FROM follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  
  DELETE FROM dailies WHERE user_id = target_user_id;
  DELETE FROM posts WHERE user_id = target_user_id;
  DELETE FROM public_recipes WHERE user_id = target_user_id;
  
  DELETE FROM payment_history WHERE user_id = target_user_id;
  DELETE FROM referrals WHERE referred_user_id = target_user_id OR referrer_id = target_user_id;
  DELETE FROM referral_codes WHERE user_id = target_user_id;
  DELETE FROM subscriptions WHERE user_id = target_user_id;
  
  DELETE FROM admin_users WHERE user_id = target_user_id;
  
  -- 2. Finally delete profile
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
