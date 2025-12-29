/*
  # Add Admin Update Policy for Recipes

  1. Changes
    - Add policy allowing admins to update any recipe
    - Keeps existing owner update policy
  
  2. Security
    - Only users with `role = 'admin'` in admin_users table can update any recipe
    - Regular users can still update only their own recipes
*/

-- Add admin update policy
CREATE POLICY "Admins can update any recipe"
  ON public.public_recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
      AND admin_users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
      AND admin_users.role = 'admin'
    )
  );
