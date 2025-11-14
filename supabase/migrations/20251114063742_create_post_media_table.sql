/*
  # Create post media table for carousel support
  
  1. New Tables
    - `post_media`
      - `id` (uuid, primary key) - Unique media ID
      - `post_id` (uuid) - References posts table
      - `media_url` (text) - URL to the image or video
      - `media_type` (text) - 'photo' or 'video'
      - `order_index` (integer) - Order in carousel (0-4)
      - `created_at` (timestamptz) - When media was added
      
  2. Security
    - Enable RLS on `post_media` table
    - Add policy for anyone to view media
    - Add policy for post owners to manage their media
    
  3. Indexes
    - Add index on post_id for faster lookups
    - Add index on (post_id, order_index) for ordered retrieval
*/

CREATE TABLE IF NOT EXISTS post_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text NOT NULL CHECK (media_type IN ('photo', 'video')),
  order_index integer NOT NULL DEFAULT 0 CHECK (order_index >= 0 AND order_index < 5),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post media"
  ON post_media FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert media for their own posts"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own post media"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts
      WHERE posts.id = post_media.post_id
      AND posts.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_post_media_post_order ON post_media(post_id, order_index);