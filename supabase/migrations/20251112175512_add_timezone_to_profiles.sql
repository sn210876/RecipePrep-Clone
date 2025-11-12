/*
  # Add timezone support to user profiles

  1. Changes
    - Add `timezone` column to `profiles` table
    - Default to 'America/New_York' (UTC-5)
    - Users can change this in settings

  2. Notes
    - Timezone stored as IANA timezone string (e.g., 'America/New_York', 'Europe/London')
    - Used for consistent date handling across meal planning and scheduling
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'timezone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN timezone text DEFAULT 'America/New_York';
  END IF;
END $$;
