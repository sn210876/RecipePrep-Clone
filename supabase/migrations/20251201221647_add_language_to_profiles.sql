/*
  # Add language support to user profiles

  1. Changes
    - Add `language` column to `profiles` table
    - Default to English ('en')

  2. Supported Languages
    - English (en)
    - Spanish (es)
    - Italian (it)
    - Thai (th)
    - Vietnamese (vi)
    - Japanese (ja)
    - Korean (ko)
    - French (fr)
    - German (de)
    - Farsi/Persian (fa)
    - Portuguese (pt)
    - Chinese (zh)
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'language'
  ) THEN
    ALTER TABLE profiles ADD COLUMN language text DEFAULT 'en';
  END IF;
END $$;
