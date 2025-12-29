/*
  # Add UPDATE policy for profiles table

  1. Security
    - Add policy allowing users to update their own profile
    - Users can only update their own profile (auth.uid() = id)
*/

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
