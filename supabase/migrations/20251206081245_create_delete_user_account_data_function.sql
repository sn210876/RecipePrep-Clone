/*
  # Create delete user account data function
  
  1. Changes
    - Create `delete_user_account_data()` function to delete all user data except auth.users
    - Takes user_id as parameter for security and flexibility
    - Uses SECURITY DEFINER to allow deletion across all tables
  
  2. Security
    - Function validates caller is deleting their own data (auth.uid() check)
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
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Unauthorized: can only delete own account';
  END IF;

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
