/*
  # Fix Blog Foreign Keys and Storage

  1. Changes
    - Drop old foreign key constraint on blog_posts
    - Add new foreign key to profiles table
    - Create blog-covers storage bucket
    - Add storage policies for blog covers

  2. Security
    - Authenticated users can upload to blog-covers
    - Anyone can view blog cover images
*/

-- Drop existing foreign key if it exists
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blog_posts_user_id_fkey' 
    AND table_name = 'blog_posts'
  ) THEN
    ALTER TABLE blog_posts DROP CONSTRAINT blog_posts_user_id_fkey;
  END IF;
END $$;

-- Add foreign key to profiles table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'blog_posts_user_id_profiles_fkey' 
    AND table_name = 'blog_posts'
  ) THEN
    ALTER TABLE blog_posts 
    ADD CONSTRAINT blog_posts_user_id_profiles_fkey 
    FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Create blog-covers storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-covers', 'blog-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for blog-covers bucket
DO $$
BEGIN
  -- Delete existing policies if they exist
  DROP POLICY IF EXISTS "Authenticated users can upload blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Anyone can view blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can update their own blog covers" ON storage.objects;
  DROP POLICY IF EXISTS "Users can delete their own blog covers" ON storage.objects;
END $$;

-- Create new policies
CREATE POLICY "Authenticated users can upload blog covers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'blog-covers');

CREATE POLICY "Anyone can view blog covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'blog-covers');

CREATE POLICY "Users can update their own blog covers"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'blog-covers' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'blog-covers');

CREATE POLICY "Users can delete their own blog covers"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'blog-covers' AND auth.uid()::text = (storage.foldername(name))[1]);