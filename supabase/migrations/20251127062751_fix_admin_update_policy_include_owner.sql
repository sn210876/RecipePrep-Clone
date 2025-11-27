/*
  # Fix Admin Update Policy to Include Owner

  1. Changes
    - Drop existing admin update policy
    - Create new policy that allows both 'admin' and 'owner' roles to update any recipe
  
  2. Security
    - Users with role = 'admin' OR role = 'owner' can update any recipe
    - Regular users can still update only their own recipes
*/

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can update any recipe" ON public.public_recipes;

-- Create new policy that includes both admin and owner
CREATE POLICY "Admins and owners can update any recipe"
  ON public.public_recipes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
      AND admin_users.role IN ('admin', 'owner')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = (select auth.uid())
      AND admin_users.role IN ('admin', 'owner')
    )
  );
