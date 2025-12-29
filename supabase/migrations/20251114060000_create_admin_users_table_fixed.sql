/*
  # Create admin users table
  
  1. New Tables
    - `admin_users`
      - `user_id` (uuid, primary key) - References auth.users
      - `created_at` (timestamptz) - When admin privilege was granted
      
  2. Security
    - Enable RLS on `admin_users` table
    - Add policy for anyone to check admin status (needed for crown display)
*/

CREATE TABLE IF NOT EXISTS admin_users (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can check if user is admin"
  ON admin_users FOR SELECT
  TO authenticated
  USING (true);

-- Insert the admin user (snguyen7@msn.com)
INSERT INTO admin_users (user_id)
VALUES ('51ad04fa-6d63-4c45-9423-76183eea7b39')
ON CONFLICT (user_id) DO NOTHING;