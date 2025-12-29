/*
  # Create User Tracking Table

  1. New Tables
    - `user_tracking`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `email` (text, not null)
      - `signup_date` (timestamptz, default now())
      - `is_early_access` (boolean, default true for first 1000 users)
      - `user_number` (integer, tracks signup order)

  2. Security
    - Enable RLS on `user_tracking` table
    - Add policy for users to read their own data
    - Add policy for service role to insert new users

  3. Changes
    - Add trigger to auto-increment user_number
    - Add function to check if user is within first 1000
*/

-- Create user tracking table
CREATE TABLE IF NOT EXISTS user_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  signup_date timestamptz DEFAULT now(),
  is_early_access boolean DEFAULT true,
  user_number integer,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_tracking ENABLE ROW LEVEL SECURITY;

-- Policy for users to read their own data
CREATE POLICY "Users can read own tracking data"
  ON user_tracking
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy for service to insert new users
CREATE POLICY "Service can insert tracking data"
  ON user_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create sequence for user numbers
CREATE SEQUENCE IF NOT EXISTS user_number_seq START 1;

-- Function to set user number and early access status
CREATE OR REPLACE FUNCTION set_user_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_number := nextval('user_number_seq');
  NEW.is_early_access := NEW.user_number <= 1000;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-set user number
DROP TRIGGER IF EXISTS set_user_number_trigger ON user_tracking;
CREATE TRIGGER set_user_number_trigger
  BEFORE INSERT ON user_tracking
  FOR EACH ROW
  EXECUTE FUNCTION set_user_number();

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_tracking_user_id ON user_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tracking_email ON user_tracking(email);
