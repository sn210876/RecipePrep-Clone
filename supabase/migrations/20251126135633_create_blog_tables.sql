/*
  # Create Blog/Discussion Board Tables

  1. New Tables
    - `blog_posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text, required)
      - `slug` (text, unique, required)
      - `content` (jsonb, for rich text content)
      - `excerpt` (text, for previews)
      - `cover_image` (text, URL)
      - `published` (boolean, default true)
      - `views` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blog_likes`
      - `user_id` (uuid, foreign key)
      - `post_id` (uuid, foreign key)
      - `created_at` (timestamptz)
      - Primary key: (user_id, post_id)

    - `blog_comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, foreign key)
      - `user_id` (uuid, foreign key)
      - `parent_id` (uuid, nullable, for nested comments)
      - `content` (text, required)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `blog_comment_votes`
      - `user_id` (uuid, foreign key)
      - `comment_id` (uuid, foreign key)
      - `vote_type` (text, 'up' or 'down')
      - `created_at` (timestamptz)
      - Primary key: (user_id, comment_id)

  2. Security
    - Enable RLS on all tables
    - Public can read posts and comments
    - Only authenticated users can create/like/vote
    - Only owners can update/delete their content

  3. Indexes
    - slug for fast lookups
    - post_id for comment queries
    - parent_id for nested comment traversal
*/

-- Create blog_posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  content jsonb NOT NULL DEFAULT '{}',
  excerpt text,
  cover_image text,
  published boolean DEFAULT true,
  views integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog_likes table
CREATE TABLE IF NOT EXISTS blog_likes (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, post_id)
);

-- Create blog_comments table
CREATE TABLE IF NOT EXISTS blog_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES blog_posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  parent_id uuid REFERENCES blog_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create blog_comment_votes table
CREATE TABLE IF NOT EXISTS blog_comment_votes (
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  comment_id uuid REFERENCES blog_comments(id) ON DELETE CASCADE NOT NULL,
  vote_type text CHECK (vote_type IN ('up', 'down')) NOT NULL,
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (user_id, comment_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS blog_posts_slug_idx ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS blog_posts_user_id_idx ON blog_posts(user_id);
CREATE INDEX IF NOT EXISTS blog_posts_created_at_idx ON blog_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS blog_likes_post_id_idx ON blog_likes(post_id);
CREATE INDEX IF NOT EXISTS blog_comments_post_id_idx ON blog_comments(post_id);
CREATE INDEX IF NOT EXISTS blog_comments_parent_id_idx ON blog_comments(parent_id);
CREATE INDEX IF NOT EXISTS blog_comments_user_id_idx ON blog_comments(user_id);
CREATE INDEX IF NOT EXISTS blog_comment_votes_comment_id_idx ON blog_comment_votes(comment_id);

-- Enable Row Level Security
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comment_votes ENABLE ROW LEVEL SECURITY;

-- blog_posts policies
CREATE POLICY "Anyone can view published blog posts"
  ON blog_posts FOR SELECT
  USING (published = true);

CREATE POLICY "Authenticated users can create blog posts"
  ON blog_posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own blog posts"
  ON blog_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own blog posts"
  ON blog_posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- blog_likes policies
CREATE POLICY "Anyone can view blog likes"
  ON blog_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like posts"
  ON blog_likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike posts"
  ON blog_likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- blog_comments policies
CREATE POLICY "Anyone can view blog comments"
  ON blog_comments FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create comments"
  ON blog_comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON blog_comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON blog_comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- blog_comment_votes policies
CREATE POLICY "Anyone can view comment votes"
  ON blog_comment_votes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can vote on comments"
  ON blog_comment_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change their votes"
  ON blog_comment_votes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their votes"
  ON blog_comment_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER blog_comments_updated_at
  BEFORE UPDATE ON blog_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_blog_post_views(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE blog_posts
  SET views = views + 1
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;