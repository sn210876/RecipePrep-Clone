/*
  # Add admin delete policy for posts

  1. Changes
    - Add DELETE policy for posts table allowing admins to delete any post
    - Admins are identified by checking the admin_users table

  2. Security
    - Only users with entries in admin_users table can delete any post
    - Regular users can still only delete their own posts
    - This enables proper content moderation by admin users
*/

CREATE POLICY "Admins can delete any post"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );
