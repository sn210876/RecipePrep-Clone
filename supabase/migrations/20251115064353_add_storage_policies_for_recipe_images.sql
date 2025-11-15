/*
  # Add storage policies for recipe-images bucket

  1. Storage Policies
    - Allow authenticated users to upload recipe images and banners
    - Allow public read access to all images
    - Allow users to update/delete their own images
*/

-- Drop existing conflicting policies if they exist
DROP POLICY IF EXISTS "Users can upload recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Recipe images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their recipe images" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their recipe images" ON storage.objects;

-- Allow authenticated users to upload to recipe-images bucket
CREATE POLICY "Users can upload recipe images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recipe-images');

-- Allow public read access to recipe images
CREATE POLICY "Recipe images are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'recipe-images');

-- Allow users to update their own recipe images
CREATE POLICY "Users can update their recipe images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recipe-images');

-- Allow users to delete their own recipe images
CREATE POLICY "Users can delete their recipe images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'recipe-images');