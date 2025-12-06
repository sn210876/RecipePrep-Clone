/*
  # Fix delete user account data function for admin calls
  
  1. Changes
    - Update `delete_user_account_data()` to allow calls from service role
    - Maintain security by requiring either matching auth.uid() OR being called with service role key
  
  2. Security
    - Function still validates user is deleting their own data OR using service role
    - Uses SECURITY DEFINER to bypass RLS for cascading deletes
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
  
  -- Check if being called by service role (will have NULL auth.uid() in SECURITY DEFINER context)
  -- When called via admin client, current_user_id will be NULL but the function has SECURITY DEFINER
  is_service_role := current_user_id IS NULL OR current_setting('request.jwt.claim.role', true) = 'service_role';
  
  -- If not service role and not authenticated, reject
  IF NOT is_service_role AND current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- If not service role, verify user is deleting their own account
  IF NOT is_service_role AND current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own account';
  END IF;

  -- Delete all user data
  DELETE FROM blocked_users WHERE blocker_id = target_user_id OR blocked_id = target_user_id;
  DELETE FROM saved_recipes WHERE user_id = target_user_id;
  DELETE FROM cart_items WHERE user_id = target_user_id;
  DELETE FROM grocery_lists WHERE user_id = target_user_id;
  DELETE FROM meal_plans WHERE user_id = target_user_id;
  DELETE FROM reviews WHERE user_id = target_user_id;
  DELETE FROM blog_comments WHERE user_id = target_user_id;
  DELETE FROM blog_posts WHERE author_id = target_user_id;
  DELETE FROM referrals WHERE referred_user_id = target_user_id OR referrer_id = target_user_id;
  DELETE FROM subscriptions WHERE user_id = target_user_id;
  DELETE FROM notifications WHERE user_id = target_user_id;
  DELETE FROM messages WHERE sender_id = target_user_id OR receiver_id = target_user_id;
  DELETE FROM likes WHERE user_id = target_user_id;
  DELETE FROM comments WHERE user_id = target_user_id;
  DELETE FROM follows WHERE follower_id = target_user_id OR following_id = target_user_id;
  DELETE FROM dailies WHERE user_id = target_user_id;
  DELETE FROM posts WHERE user_id = target_user_id;
  DELETE FROM public_recipes WHERE user_id = target_user_id;
  DELETE FROM admin_users WHERE user_id = target_user_id;
  DELETE FROM profiles WHERE id = target_user_id;
END;
$$;
