/*
  # Create saved_recipes table for cross-device synchronization

  ## Description
  This migration creates a table to store users' saved recipes in the cloud,
  enabling cross-device synchronization. Previously, recipes were stored in 
  localStorage which is device-specific.

  ## New Tables
    - `saved_recipes`
      - `id` (uuid, primary key) - Unique identifier
      - `user_id` (uuid, foreign key to auth.users) - Owner of the saved recipe
      - `recipe_id` (uuid, foreign key to public_recipes) - Reference to the recipe
      - `recipe_data` (jsonb) - Full recipe data snapshot for fast loading
      - `created_at` (timestamptz) - When recipe was saved
      - `updated_at` (timestamptz) - Last update timestamp

  ## Security
    - Enable RLS on `saved_recipes` table
    - Policy: Users can only view their own saved recipes
    - Policy: Users can only insert their own saved recipes
    - Policy: Users can only delete their own saved recipes
    - Policy: Users can only update their own saved recipes

  ## Indexes
    - Index on (user_id, created_at) for fast user recipe queries
    - Unique index on (user_id, recipe_id) to prevent duplicates
*/

-- Create saved_recipes table
CREATE TABLE IF NOT EXISTS saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id uuid REFERENCES public_recipes(id) ON DELETE CASCADE,
  recipe_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own saved recipes
CREATE POLICY "Users can view own saved recipes"
  ON saved_recipes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved recipes"
  ON saved_recipes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved recipes"
  ON saved_recipes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved recipes"
  ON saved_recipes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_created 
  ON saved_recipes(user_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_saved_recipes_user_recipe 
  ON saved_recipes(user_id, recipe_id)
  WHERE recipe_id IS NOT NULL;