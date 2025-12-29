/*
  # Add Message Notification Type

  ## Overview
  Adds 'message' as a valid notification type to support DM notifications

  ## Changes
  - Drop existing check constraint on notifications.type
  - Add new constraint with 'message' type included

  ## Important Notes
  - Allows users to receive notifications for new messages
  - Does not affect existing notification records
*/

-- Drop existing constraint
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'notifications_type_check'
  ) THEN
    ALTER TABLE notifications DROP CONSTRAINT notifications_type_check;
  END IF;
END $$;

-- Add new constraint with message type
ALTER TABLE notifications 
  ADD CONSTRAINT notifications_type_check 
  CHECK (type IN ('follow', 'like', 'comment', 'message'));