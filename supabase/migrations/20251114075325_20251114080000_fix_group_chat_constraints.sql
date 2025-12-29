/*
  # Fix Group Chat Constraints

  ## Overview
  This migration fixes CHECK constraints that are preventing group chat creation.

  ## Changes
  - Update ordered_users constraint to handle NULL user2_id properly
  - Ensure constraints only apply to non-group chats

  ## Important Notes
  - Allows NULL user2_id for group chats
  - Constraints still enforced for 1-on-1 chats
*/

-- Drop and recreate the ordered_users constraint to handle NULL properly
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS ordered_users;
ALTER TABLE conversations ADD CONSTRAINT ordered_users
  CHECK (is_group = true OR (user2_id IS NOT NULL AND user1_id < user2_id));

-- Drop and recreate the different_users constraint to handle NULL properly
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS different_users;
ALTER TABLE conversations ADD CONSTRAINT different_users
  CHECK (is_group = true OR (user2_id IS NOT NULL AND user1_id != user2_id));
