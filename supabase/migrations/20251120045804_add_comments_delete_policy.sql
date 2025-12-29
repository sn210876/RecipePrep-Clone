/*
  # Add DELETE policy for comments table

  1. Security Changes
    - Add DELETE policy to comments table
    - Users can only delete their own comments
    - Requires authentication
*/

CREATE POLICY "Users can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
