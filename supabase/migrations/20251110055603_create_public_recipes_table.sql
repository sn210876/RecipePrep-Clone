/*
  # Create Public Recipes System

  1. New Tables
    - `public_recipes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, optional - recipes can be anonymous)
      - `title` (text)
      - `ingredients` (jsonb) - array of ingredient objects
      - `instructions` (jsonb) - array of instruction strings
      - `prep_time` (integer) - in minutes
      - `cook_time` (integer) - in minutes
      - `servings` (integer)
      - `tags` (jsonb) - array of tags
      - `cuisine_type` (text)
      - `difficulty` (text) - Easy/Medium/Hard
      - `dietary_tags` (jsonb) - array of dietary tags
      - `meal_type` (jsonb) - array of meal types
      - `image_url` (text, optional)
      - `source_url` (text, optional)
      - `notes` (text, optional)
      - `is_public` (boolean, default true)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on public_recipes table
    - Everyone can view public recipes
    - Anyone can insert recipes (no auth required)
    - Only recipe creator can update/delete their own recipes
*/

CREATE TABLE IF NOT EXISTS public_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  title text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  prep_time integer NOT NULL DEFAULT 0,
  cook_time integer NOT NULL DEFAULT 0,
  servings integer NOT NULL DEFAULT 1,
  tags jsonb DEFAULT '[]'::jsonb,
  cuisine_type text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'Easy',
  dietary_tags jsonb DEFAULT '[]'::jsonb,
  meal_type jsonb DEFAULT '[]'::jsonb,
  image_url text,
  source_url text,
  notes text,
  is_public boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view public recipes"
  ON public_recipes FOR SELECT
  USING (is_public = true);

CREATE POLICY "Anyone can insert recipes"
  ON public_recipes FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update their own recipes"
  ON public_recipes FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON public_recipes FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_public_recipes_cuisine_type ON public_recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_public_recipes_difficulty ON public_recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_public_recipes_created_at ON public_recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_public_recipes_is_public ON public_recipes(is_public);
