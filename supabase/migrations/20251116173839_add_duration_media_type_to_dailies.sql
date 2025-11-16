/*
  # Add duration and media_type columns to dailies table

  1. Changes
    - Add `duration` column (integer, nullable) - video duration in seconds
    - Add `media_type` column (text, nullable) - 'photo' or 'video'
    - Add `expires_at` column (timestamptz) - when the daily expires (24 hours from creation)
  
  2. Notes
    - Dailies should expire 24 hours after posting
    - Media type helps differentiate between photos and videos
    - Duration is only relevant for videos
*/

-- Add missing columns to dailies table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dailies' AND column_name = 'duration'
  ) THEN
    ALTER TABLE dailies ADD COLUMN duration integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dailies' AND column_name = 'media_type'
  ) THEN
    ALTER TABLE dailies ADD COLUMN media_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'dailies' AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE dailies ADD COLUMN expires_at timestamptz DEFAULT (now() + interval '24 hours');
  END IF;
END $$;

-- Add constraint to ensure media_type is either 'photo' or 'video'
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dailies_media_type_check'
  ) THEN
    ALTER TABLE dailies ADD CONSTRAINT dailies_media_type_check 
      CHECK (media_type IN ('photo', 'video'));
  END IF;
END $$;

-- Add index on expires_at for efficient querying of active dailies
CREATE INDEX IF NOT EXISTS dailies_expires_at_idx ON dailies(expires_at DESC);