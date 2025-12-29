/*
  # Add Admin Delete Policy for Recipes

  1. Changes
    - Add policy allowing admin users to delete any recipe
    
  2. Security
    - Only users in admin_users table can delete any recipe
    - Regular users can still only delete their own recipes
*/

-- Add policy for admins to delete any recipe
CREATE POLICY "Admins can delete any recipe"
  ON public_recipes FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );