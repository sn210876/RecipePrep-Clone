/*
  # Create Blocked Users System

  1. New Tables
    - `blocked_users`
      - `id` (uuid, primary key)
      - `blocker_id` (uuid, references auth.users) - User who is blocking
      - `blocked_id` (uuid, references auth.users) - User who is blocked
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `blocked_users` table
    - Users can insert their own blocks
    - Users can view their own blocks
    - Users can delete their own blocks (unblock)
    - Blocked users cannot see that they are blocked

  3. Indexes
    - Index on blocker_id for fast lookups
    - Index on blocked_id for checking if user is blocked
    - Unique constraint to prevent duplicate blocks

  4. Notes
    - Blocking is one-way (if A blocks B, B doesn't automatically block A)
    - Users can unblock by deleting the record
*/

-- Create blocked_users table
CREATE TABLE IF NOT EXISTS blocked_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  blocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT blocked_users_unique UNIQUE (blocker_id, blocked_id),
  CONSTRAINT cannot_block_self CHECK (blocker_id != blocked_id)
);

-- Enable RLS
ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

-- Policies for blocked_users
DROP POLICY IF EXISTS "Users can insert own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can view own blocks" ON blocked_users;
DROP POLICY IF EXISTS "Users can delete own blocks" ON blocked_users;

CREATE POLICY "Users can insert own blocks"
  ON blocked_users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = blocker_id);

CREATE POLICY "Users can view own blocks"
  ON blocked_users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can delete own blocks"
  ON blocked_users
  FOR DELETE
  TO authenticated
  USING (auth.uid() = blocker_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS blocked_users_blocker_id_idx ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS blocked_users_blocked_id_idx ON blocked_users(blocked_id);

-- Helper function to check if a user is blocked by current user
CREATE OR REPLACE FUNCTION is_user_blocked(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = auth.uid()
    AND blocked_id = target_user_id
  );
$$;

-- Helper function to check if current user is blocked by target user
CREATE OR REPLACE FUNCTION am_i_blocked_by(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = target_user_id
    AND blocked_id = auth.uid()
  );
$$;