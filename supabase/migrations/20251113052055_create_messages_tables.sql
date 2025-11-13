/*
  # Create Direct Messages Tables

  ## Overview
  This migration creates the database structure for a direct messaging system between users.

  ## New Tables

  ### 1. `conversations`
  Represents a DM conversation between two users
  - `id` (uuid, primary key) - Unique conversation identifier
  - `user1_id` (uuid, references auth.users) - First participant
  - `user2_id` (uuid, references auth.users) - Second participant
  - `created_at` (timestamptz, default now()) - When conversation started
  - `updated_at` (timestamptz, default now()) - Last message timestamp
  - Unique constraint on (user1_id, user2_id) to prevent duplicates

  ### 2. `messages`
  Individual messages within conversations
  - `id` (uuid, primary key) - Unique message identifier
  - `conversation_id` (uuid, references conversations) - Parent conversation
  - `sender_id` (uuid, references auth.users) - Message sender
  - `content` (text, not null) - Message text content
  - `read` (boolean, default false) - Read status
  - `created_at` (timestamptz, default now()) - When message was sent

  ## Security (Row Level Security)

  ### Conversations Table
  - **SELECT**: Users can view conversations they are part of
  - **INSERT**: Users can create conversations where they are a participant
  - **UPDATE**: Users can update conversations they are part of (for updated_at)

  ### Messages Table
  - **SELECT**: Users can view messages in conversations they are part of
  - **INSERT**: Users can send messages in conversations they are part of
  - **UPDATE**: Users can mark messages as read in their conversations

  ## Indexes
  - Index on conversations (user1_id, user2_id) for fast conversation lookup
  - Index on messages (conversation_id) for fast message retrieval
  - Index on messages (created_at) for chronological ordering
  - Index on messages (read) for unread message counts

  ## Important Notes
  - Conversations are bidirectional (user1 and user2 can both send/receive)
  - Messages are never deleted, only conversations can be removed
  - Read status is per-user basis
  - updated_at on conversations tracks last message timestamp
*/

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user2_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_users CHECK (user1_id != user2_id),
  CONSTRAINT ordered_users CHECK (user1_id < user2_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_conversations_users 
  ON conversations(user1_id, user2_id);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_read ON messages(read);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Conversations policies
CREATE POLICY "Users can view own conversations"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can update own conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user1_id OR auth.uid() = user2_id)
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Messages policies
CREATE POLICY "Users can view messages in their conversations"
  ON messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can send messages in their conversations"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );

CREATE POLICY "Users can update messages in their conversations"
  ON messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );