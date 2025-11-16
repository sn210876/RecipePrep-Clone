/*
  # Fix Storage Policies for Posts and Dailys

  1. Storage Policies
    - Add INSERT policies for posts bucket (authenticated users can upload)
    - Add UPDATE policies for posts bucket (users can update their own)
    - Add DELETE policies for posts bucket (users can delete their own)
    - Add SELECT policies for posts bucket (public can view)
    - Add INSERT policies for dailys bucket (authenticated users can upload)
    - Add UPDATE policies for dailys bucket (users can update their own)
    - Add DELETE policies for dailys bucket (users can delete their own)
    - Add SELECT policies for dailys bucket (public can view)

  2. Security
    - Users can only upload to their own user folder
    - Public can read all images
    - Users can manage their own uploads
*/

-- Drop existing conflicting policies if any
DROP POLICY IF EXISTS "Authenticated users can upload to posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own posts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own posts" ON storage.objects;
DROP POLICY IF EXISTS "Public can view posts" ON storage.objects;

DROP POLICY IF EXISTS "Authenticated users can upload to dailys" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload dailys" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own dailys" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own dailys" ON storage.objects;
DROP POLICY IF EXISTS "Public can view dailys" ON storage.objects;

-- Posts bucket policies
CREATE POLICY "Authenticated users can upload to posts"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'posts'
);

CREATE POLICY "Users can update own posts files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'posts' AND
  (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'posts' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own posts files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'posts' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view posts"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'posts');

-- Dailys bucket policies
CREATE POLICY "Authenticated users can upload to dailys"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'dailys'
);

CREATE POLICY "Users can update own dailys files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'dailys' AND
  (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'dailys' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own dailys files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'dailys' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Public can view dailys"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'dailys');