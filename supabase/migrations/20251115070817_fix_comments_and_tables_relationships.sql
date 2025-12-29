/*
  # Fix Comments and Tables Relationships

  1. Add Missing Foreign Keys
    - comments.user_id -> profiles.id
    - comments.post_id -> posts.id
    - likes.user_id -> profiles.id
    - likes.post_id -> posts.id

  2. Security
    - Maintain existing RLS policies
*/

-- Add foreign key for comments.user_id to profiles.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_user_id_fkey'
  ) THEN
    ALTER TABLE comments 
    ADD CONSTRAINT comments_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for comments.post_id to posts.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'comments_post_id_fkey'
  ) THEN
    ALTER TABLE comments 
    ADD CONSTRAINT comments_post_id_fkey 
    FOREIGN KEY (post_id) 
    REFERENCES posts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for likes.user_id to profiles.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_user_id_fkey'
  ) THEN
    ALTER TABLE likes 
    ADD CONSTRAINT likes_user_id_fkey 
    FOREIGN KEY (user_id) 
    REFERENCES profiles(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add foreign key for likes.post_id to posts.id
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'likes_post_id_fkey'
  ) THEN
    ALTER TABLE likes 
    ADD CONSTRAINT likes_post_id_fkey 
    FOREIGN KEY (post_id) 
    REFERENCES posts(id) 
    ON DELETE CASCADE;
  END IF;
END $$;

-- Add index for better performance on comments
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);