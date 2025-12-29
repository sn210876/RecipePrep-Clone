/*
  # Hashtags System

  1. New Tables
    - `hashtags`
      - `id` (uuid, primary key)
      - `tag` (text, unique) - The hashtag text without the # symbol
      - `created_at` (timestamptz)
      - `usage_count` (integer) - Track how many times it's used
    
    - `post_hashtags`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key to posts)
      - `hashtag_id` (uuid, foreign key to hashtags)
      - `created_at` (timestamptz)
  
  2. Security
    - Enable RLS on both tables
    - Public can read hashtags
    - Authenticated users can create post_hashtags for their own posts
    - Cascade delete when posts are deleted
  
  3. Indexes
    - Index on hashtags.tag for fast lookups
    - Index on post_hashtags.post_id for fast post queries
    - Index on post_hashtags.hashtag_id for fast hashtag queries
*/

-- Create hashtags table
CREATE TABLE IF NOT EXISTS hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  usage_count integer DEFAULT 1
);

-- Create post_hashtags junction table
CREATE TABLE IF NOT EXISTS post_hashtags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  hashtag_id uuid NOT NULL REFERENCES hashtags(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, hashtag_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_hashtags_tag ON hashtags(tag);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_post_id ON post_hashtags(post_id);
CREATE INDEX IF NOT EXISTS idx_post_hashtags_hashtag_id ON post_hashtags(hashtag_id);

-- Enable RLS
ALTER TABLE hashtags ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_hashtags ENABLE ROW LEVEL SECURITY;

-- Hashtags policies - anyone can read
CREATE POLICY "Anyone can read hashtags"
  ON hashtags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create hashtags"
  ON hashtags FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update hashtag count"
  ON hashtags FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Post hashtags policies
CREATE POLICY "Anyone can read post hashtags"
  ON post_hashtags FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can create hashtags for their posts"
  ON post_hashtags FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete hashtags from their posts"
  ON post_hashtags FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_hashtags.post_id
      AND posts.user_id = auth.uid()
    )
  );
