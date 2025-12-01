/*
  # Add timezone to profiles table

  1. Changes
    - Add `timezone` column to `profiles` table
    - Default to 'America/New_York'

  2. Notes
    - Timezone stored as IANA timezone string (e.g., 'America/New_York', 'Europe/London')
    - Used for accurate time display and meal planning
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
