/*
  # Fix saved_recipes unique constraint for upsert operations

  ## Changes
  - Drop the partial unique index (with WHERE clause)
  - Create a proper unique constraint on (user_id, recipe_id)
  - This allows upsert with ON CONFLICT to work correctly

  ## Notes
  - Partial indexes cannot be used with ON CONFLICT
  - A unique constraint is needed instead
*/

-- Drop the partial unique index
DROP INDEX IF EXISTS idx_saved_recipes_user_recipe;

-- Add a unique constraint instead
ALTER TABLE saved_recipes 
  DROP CONSTRAINT IF EXISTS saved_recipes_user_recipe_unique;

ALTER TABLE saved_recipes 
  ADD CONSTRAINT saved_recipes_user_recipe_unique 
  UNIQUE (user_id, recipe_id);