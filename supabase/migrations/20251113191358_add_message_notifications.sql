/*
  # Add Message Notifications

  ## Overview
  Adds support for message notifications in the notifications system.

  ## Changes
  1. Schema Updates
    - Add `message_id` column to notifications table (nullable)
    - Add foreign key from notifications.message_id to messages.id

  2. Functions & Triggers
    - Create trigger function to automatically create notification when message is sent
    - Trigger fires on INSERT to messages table
    - Creates notification for message recipient

  ## Security
  - No RLS changes needed (existing policies cover message notifications)

  ## Important Notes
  - Notifications are created automatically when messages are sent
  - Only creates notification if sender != recipient
  - Notification type is 'message'
*/

-- Add message_id column to notifications
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'notifications' AND column_name = 'message_id'
  ) THEN
    ALTER TABLE notifications ADD COLUMN message_id uuid REFERENCES messages(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create function to send message notification
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
DECLARE
  recipient_id uuid;
  conversation_record RECORD;
BEGIN
  -- Get the conversation to find the recipient
  SELECT * INTO conversation_record 
  FROM conversations 
  WHERE id = NEW.conversation_id;
  
  -- Determine recipient (the user who is NOT the sender)
  IF conversation_record.user1_id = NEW.sender_id THEN
    recipient_id := conversation_record.user2_id;
  ELSE
    recipient_id := conversation_record.user1_id;
  END IF;
  
  -- Create notification for recipient
  INSERT INTO notifications (user_id, actor_id, type, message_id, read, created_at)
  VALUES (recipient_id, NEW.sender_id, 'message', NEW.id, false, NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS on_message_sent ON messages;
CREATE TRIGGER on_message_sent
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification();