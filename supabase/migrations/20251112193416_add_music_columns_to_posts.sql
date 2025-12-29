/*
  # Add Music Columns to Posts Table

  1. Changes
    - Add `song_id` (text) - ID of the selected song
    - Add `song_title` (text) - Title of the song
    - Add `song_artist` (text) - Artist name
    - Add `song_preview_url` (text) - Preview audio URL
  
  2. Notes
    - All columns are nullable (optional)
    - Supports Instagram-style music feature
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'song_id'
  ) THEN
    ALTER TABLE posts ADD COLUMN song_id text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'song_title'
  ) THEN
    ALTER TABLE posts ADD COLUMN song_title text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'song_artist'
  ) THEN
    ALTER TABLE posts ADD COLUMN song_artist text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'song_preview_url'
  ) THEN
    ALTER TABLE posts ADD COLUMN song_preview_url text;
  END IF;
END $$;
