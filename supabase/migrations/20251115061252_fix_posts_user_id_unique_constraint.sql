/*
  # Fix posts table user_id constraint

  1. Changes
    - Remove unique constraint from user_id in posts table
    - Users should be able to create multiple posts
    
  2. Security
    - No RLS changes needed
*/

DO $$
BEGIN
  -- Drop unique constraint on user_id if it exists
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'posts_user_id_key'
  ) THEN
    ALTER TABLE posts DROP CONSTRAINT posts_user_id_key;
  END IF;
END $$;