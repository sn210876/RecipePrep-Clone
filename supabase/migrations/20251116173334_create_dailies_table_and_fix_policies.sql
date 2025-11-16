/*
  # Create Dailies Table and Fix Policies

  1. New Tables
    - `dailies`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `image_url` (text)
      - `video_url` (text)
      - `caption` (text)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on `dailies` table
    - Add policy for authenticated users to insert their own dailies
    - Add policy for public to view all dailies
    - Add policy for users to update their own dailies
    - Add policy for users to delete their own dailies
*/

-- Create dailies table
CREATE TABLE IF NOT EXISTS dailies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  image_url text,
  video_url text,
  caption text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE dailies ENABLE ROW LEVEL SECURITY;

-- Dailies policies
DROP POLICY IF EXISTS "Public can view dailies" ON dailies;
DROP POLICY IF EXISTS "Users can insert own dailies" ON dailies;
DROP POLICY IF EXISTS "Users can update own dailies" ON dailies;
DROP POLICY IF EXISTS "Users can delete own dailies" ON dailies;

CREATE POLICY "Public can view dailies"
  ON dailies
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can insert own dailies"
  ON dailies
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own dailies"
  ON dailies
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own dailies"
  ON dailies
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS dailies_user_id_idx ON dailies(user_id);
CREATE INDEX IF NOT EXISTS dailies_created_at_idx ON dailies(created_at DESC);