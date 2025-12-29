/*
  # Fix Blog Comments Foreign Key

  1. Changes
    - Drop old foreign key constraint on blog_comments
    - Add new foreign key to profiles table
*/

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blog_comments_user_id_fkey' 
    AND table_name = 'blog_comments'
  ) THEN
    ALTER TABLE blog_comments DROP CONSTRAINT blog_comments_user_id_fkey;
  END IF;
END $$;

-- Add foreign key to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blog_comments_user_id_profiles_fkey' 
    AND table_name = 'blog_comments'
  ) THEN
    ALTER TABLE blog_comments 
    ADD CONSTRAINT blog_comments_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;