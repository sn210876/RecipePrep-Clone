/*
  # Create Users Table

  1. New Tables
    - `users`
      - `id` (uuid, primary key) - Unique user identifier
      - `email_id` (text, unique) - Unique forwarding email ID (e.g., "abc123")
      - `forwarding_email` (text, unique) - Full forwarding email address (e.g., "user-abc123@recipeprep.app")
      - `created_at` (timestamptz) - When the user account was created
      - `last_active` (timestamptz) - Last time user was active

  2. Security
    - Enable RLS on `users` table
    - Add policy for authenticated users to read their own data
    - Add policy for authenticated users to update their own data

  3. Functions
    - Create function to generate unique email ID
    - Create trigger to automatically generate forwarding email on user creation
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_id text UNIQUE NOT NULL,
  forwarding_email text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  last_active timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can read own data"
  ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own data"
  ON users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Function to generate unique email ID
CREATE OR REPLACE FUNCTION generate_email_id()
RETURNS text AS $$
DECLARE
  characters text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(characters, floor(random() * length(characters) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to set forwarding email on insert
CREATE OR REPLACE FUNCTION set_forwarding_email()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_id IS NULL THEN
    NEW.email_id := generate_email_id();
  END IF;
  NEW.forwarding_email := 'user-' || NEW.email_id || '@recipeprep.app';
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate forwarding email
DROP TRIGGER IF EXISTS set_forwarding_email_trigger ON users;
CREATE TRIGGER set_forwarding_email_trigger
  BEFORE INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION set_forwarding_email();