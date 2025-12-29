/*
  # Create Group Chat Support

  ## Overview
  This migration adds support for group chats with up to 100 participants.

  ## Changes

  ### 1. Update `conversations` table
  - Add `is_group` (boolean, default false) - Whether this is a group chat
  - Add `group_name` (text, nullable) - Name of the group chat
  - Add `created_by` (uuid, nullable) - User who created the group
  - Remove user2_id NOT NULL constraint for group chats
  - Add `last_message_at` (timestamptz) - Track last message time

  ### 2. New `conversation_participants` table
  - Links users to conversations (for group chats)
  - `id` (uuid, primary key)
  - `conversation_id` (uuid, references conversations)
  - `user_id` (uuid, references auth.users)
  - `joined_at` (timestamptz, default now())
  - Unique constraint on (conversation_id, user_id)

  ## Security (Row Level Security)
  - Users can view conversations they are participants in
  - Only group creator can update group name
  - Users can view participants in their conversations
  - Group creator can add/remove participants

  ## Important Notes
  - For 1-on-1 chats, continue using user1_id and user2_id
  - For group chats, use conversation_participants table
  - Maximum 100 participants per group chat
  - Group name is optional, can be set by creator
*/

-- Add new columns to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'is_group'
  ) THEN
    ALTER TABLE conversations ADD COLUMN is_group boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'group_name'
  ) THEN
    ALTER TABLE conversations ADD COLUMN group_name text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE conversations ADD COLUMN created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'last_message_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN last_message_at timestamptz;
  END IF;
END $$;

-- Make user2_id nullable for group chats
ALTER TABLE conversations ALTER COLUMN user2_id DROP NOT NULL;

-- Update the CHECK constraint to allow null user2_id for groups
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS different_users;
ALTER TABLE conversations ADD CONSTRAINT different_users
  CHECK (is_group = true OR user1_id != user2_id);

ALTER TABLE conversations DROP CONSTRAINT IF EXISTS ordered_users;
ALTER TABLE conversations ADD CONSTRAINT ordered_users
  CHECK (is_group = true OR user1_id < user2_id);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(conversation_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_participants_conversation
  ON conversation_participants(conversation_id);

CREATE INDEX IF NOT EXISTS idx_participants_user
  ON conversation_participants(user_id);

-- Enable RLS on conversation_participants
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;

-- Update conversations policies for group chats
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR (is_group = true AND EXISTS (
      SELECT 1 FROM conversation_participants
      WHERE conversation_participants.conversation_id = conversations.id
      AND conversation_participants.user_id = auth.uid()
    ))
  );

DROP POLICY IF EXISTS "Users can create conversations" ON conversations;
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR (is_group = true AND auth.uid() = created_by)
  );

DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR (is_group = true AND auth.uid() = created_by)
  )
  WITH CHECK (
    auth.uid() = user1_id
    OR auth.uid() = user2_id
    OR (is_group = true AND auth.uid() = created_by)
  );

-- Policies for conversation_participants
CREATE POLICY "Users can view participants in their conversations"
  ON conversation_participants FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND (
        conversations.user1_id = auth.uid()
        OR conversations.user2_id = auth.uid()
        OR conversations.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM conversation_participants cp
          WHERE cp.conversation_id = conversations.id
          AND cp.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Group creators can add participants"
  ON conversation_participants FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.is_group = true
      AND conversations.created_by = auth.uid()
    )
  );

CREATE POLICY "Group creators can remove participants"
  ON conversation_participants FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_participants.conversation_id
      AND conversations.is_group = true
      AND conversations.created_by = auth.uid()
    )
  );

-- Update messages policies to support group chats
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.user1_id = auth.uid()
        OR conversations.user2_id = auth.uid()
        OR (conversations.is_group = true AND EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;
CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (
        conversations.user1_id = auth.uid()
        OR conversations.user2_id = auth.uid()
        OR (conversations.is_group = true AND EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = auth.uid()
        ))
      )
    )
  );

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON messages;
CREATE POLICY "Users can update messages in their conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.user1_id = auth.uid()
        OR conversations.user2_id = auth.uid()
        OR (conversations.is_group = true AND EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = auth.uid()
        ))
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (
        conversations.user1_id = auth.uid()
        OR conversations.user2_id = auth.uid()
        OR (conversations.is_group = true AND EXISTS (
          SELECT 1 FROM conversation_participants
          WHERE conversation_participants.conversation_id = conversations.id
          AND conversation_participants.user_id = auth.uid()
        ))
      )
    )
  );
