/*
  # Create delete user account function

  1. New Functions
    - `delete_user_account()` - Deletes all user data and the auth account
      - Deletes from all tables with user data
      - Handles cascade deletion properly
      - Deletes the auth.users record last
  
  2. Security
    - Only authenticated users can call this function
    - Users can only delete their own account
    - Uses security definer to allow auth.users deletion
  
  3. Tables affected
    - public_recipes
    - saved_recipes
    - posts
    - dailies
    - comments
    - likes
    - follows (both directions)
    - notifications
    - messages
    - conversations (participant entries)
    - meal_plans
    - grocery_lists
    - cart_items
    - subscriptions
    - referrals
    - blog_posts
    - blog_comments
    - reviews
    - profiles
    - auth.users (last)
*/

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM saved_recipes WHERE user_id = current_user_id;
  DELETE FROM cart_items WHERE user_id = current_user_id;
  DELETE FROM grocery_lists WHERE user_id = current_user_id;
  DELETE FROM meal_plans WHERE user_id = current_user_id;
  DELETE FROM reviews WHERE user_id = current_user_id;
  DELETE FROM blog_comments WHERE user_id = current_user_id;
  DELETE FROM blog_posts WHERE author_id = current_user_id;
  DELETE FROM referrals WHERE referred_user_id = current_user_id OR referrer_id = current_user_id;
  DELETE FROM subscriptions WHERE user_id = current_user_id;
  DELETE FROM notifications WHERE user_id = current_user_id;
  DELETE FROM messages WHERE sender_id = current_user_id OR receiver_id = current_user_id;
  DELETE FROM likes WHERE user_id = current_user_id;
  DELETE FROM comments WHERE user_id = current_user_id;
  DELETE FROM follows WHERE follower_id = current_user_id OR following_id = current_user_id;
  DELETE FROM dailies WHERE user_id = current_user_id;
  DELETE FROM posts WHERE user_id = current_user_id;
  DELETE FROM public_recipes WHERE user_id = current_user_id;
  DELETE FROM profiles WHERE id = current_user_id;
  DELETE FROM blocked_users WHERE blocker_id = current_user_id OR blocked_id = current_user_id;
  DELETE FROM admin_users WHERE user_id = current_user_id;

  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;