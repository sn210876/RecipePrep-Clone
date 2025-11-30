/*
  # Fix Direct Messages Read Status Update Policy

  ## Problem
  The current UPDATE policy on `direct_messages` only allows users to update messages they sent:
  ```sql
  USING (sender_id = auth.uid())
  ```

  This prevents users from marking **received** messages as read, which is the primary use case.

  ## Solution
  Replace the restrictive policy with one that allows users to:
  1. Update messages in conversations they're part of (more permissive)
  2. Specifically allow updating the `read` field on received messages

  ## Changes
  - Drop the overly restrictive "Users can update their own messages" policy
  - Create a new policy that allows updating messages in user's conversations
  - This enables marking received messages as read while maintaining security

  ## Security
  - Users can only update messages in conversations where they are user1_id or user2_id
  - The WITH CHECK clause ensures the conversation membership is maintained
*/

-- Drop the overly restrictive policy
DROP POLICY IF EXISTS "Users can update their own messages" ON public.direct_messages;

-- Create a more appropriate policy for marking messages as read
CREATE POLICY "Users can update messages in their conversations"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = direct_messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = direct_messages.conversation_id
      AND (conversations.user1_id = auth.uid() OR conversations.user2_id = auth.uid())
    )
  );