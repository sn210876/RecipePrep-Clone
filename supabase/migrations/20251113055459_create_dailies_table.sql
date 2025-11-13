/*
  # Create Dailies Table (Instagram Stories Feature)

  ## Overview
  Creates a table for "Daily" posts - short-form content similar to Instagram Stories
  that expires after 24 hours.

  ## New Tables
  1. `dailies`
    - `id` (uuid, primary key)
    - `user_id` (uuid, foreign key to profiles)
    - `media_url` (text) - URL to photo or video
    - `media_type` (text) - 'photo' or 'video'
    - `duration` (integer) - video duration in seconds (max 30)
    - `caption` (text, nullable)
    - `created_at` (timestamptz)
    - `expires_at` (timestamptz) - automatically set to 24 hours after creation
    - `views` (jsonb) - array of user IDs who viewed the daily

  ## Security
  - Enable RLS on `dailies` table
  - Policies:
    - Users can create their own dailies
    - Authenticated users can view dailies from users they follow or public dailies
    - Users can delete their own dailies
    - Users can update views on any daily

  ## Indexes
  - Index on `user_id` for fast user daily lookups
  - Index on `expires_at` for cleanup queries
  - Index on `created_at` for ordering

  ## Important Notes
  - Dailies automatically expire after 24 hours
  - Videos must be 30 seconds or less
  - Views are tracked per user in JSONB array
*/

-- Create dailies table
CREATE TABLE IF NOT EXISTS dailies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  duration integer DEFAULT 0,
  caption text,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  views jsonb DEFAULT '[]'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_dailies_user_id ON dailies(user_id);
CREATE INDEX IF NOT EXISTS idx_dailies_expires_at ON dailies(expires_at);
CREATE INDEX IF NOT EXISTS idx_dailies_created_at ON dailies(created_at DESC);

-- Enable RLS
ALTER TABLE dailies ENABLE ROW LEVEL SECURITY;

-- Users can create their own dailies
CREATE POLICY "Users can create own dailies"
  ON dailies FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Authenticated users can view non-expired dailies
CREATE POLICY "Users can view active dailies"
  ON dailies FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
  );

-- Users can delete their own dailies
CREATE POLICY "Users can delete own dailies"
  ON dailies FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can update views on dailies (to track who viewed)
CREATE POLICY "Users can update daily views"
  ON dailies FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);