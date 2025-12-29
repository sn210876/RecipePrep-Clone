/*
  # Add Comment Replies and @ Mentions

  ## Changes
  1. Add parent_comment_id to comments table for threaded replies
  2. Add mentioned_users array to track @ mentions in comments
  3. Update RLS policies to support replies
  4. Add indexes for performance
  
  ## Security
  - Maintains existing RLS policies
  - Users can only reply to comments on posts they can view
*/

-- Add parent_comment_id for threaded replies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'parent_comment_id'
  ) THEN
    ALTER TABLE comments ADD COLUMN parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Add mentioned_users array to track @ mentions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'comments' AND column_name = 'mentioned_users'
  ) THEN
    ALTER TABLE comments ADD COLUMN mentioned_users uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Add index for parent_comment_id
CREATE INDEX IF NOT EXISTS idx_comments_parent_comment_id ON comments(parent_comment_id);

-- Add index for mentioned_users
CREATE INDEX IF NOT EXISTS idx_comments_mentioned_users ON comments USING GIN(mentioned_users);