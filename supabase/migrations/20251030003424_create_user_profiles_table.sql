/*
  # Create user profiles table for recommendation tracking

  1. New Tables
    - `user_profiles`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `cuisine_preferences` (jsonb) - Stores cuisine type counts
      - `dietary_preferences` (text[]) - Array of dietary tags
      - `difficulty_preferences` (jsonb) - Stores difficulty level counts
      - `avg_cook_time` (integer) - Average cooking time in minutes
      - `total_recipes_saved` (integer) - Total number of saved recipes
      - `favorite_cuisines` (text[]) - User-selected favorite cuisines
      - `cooking_skill_level` (text) - Beginner, Intermediate, or Advanced
      - `household_size` (integer) - Number of people in household
      - `disliked_ingredients` (text[]) - Ingredients to avoid
      - `visual_learning_style` (text) - videos, diagrams, or auto
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `saved_recipes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `recipe_id` (text) - Recipe identifier
      - `recipe_data` (jsonb) - Full recipe data for analysis
      - `saved_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Important Notes
    - Cuisine and difficulty preferences are stored as JSONB for flexible counting
    - Arrays are used for dietary preferences and user selections
    - Recipe data is denormalized for fast recommendation calculations
    - Indexes added on user_id for query performance
*/

CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  cuisine_preferences jsonb DEFAULT '{}'::jsonb,
  dietary_preferences text[] DEFAULT ARRAY[]::text[],
  difficulty_preferences jsonb DEFAULT '{}'::jsonb,
  avg_cook_time integer DEFAULT 0,
  total_recipes_saved integer DEFAULT 0,
  favorite_cuisines text[] DEFAULT ARRAY[]::text[],
  cooking_skill_level text DEFAULT 'Beginner',
  household_size integer DEFAULT 2,
  disliked_ingredients text[] DEFAULT ARRAY[]::text[],
  visual_learning_style text DEFAULT 'auto',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE IF NOT EXISTS saved_recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id text NOT NULL,
  recipe_data jsonb NOT NULL,
  saved_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_recipes_recipe_id ON saved_recipes(recipe_id);

ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_recipes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own saved recipes"
  ON saved_recipes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own saved recipes"
  ON saved_recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved recipes"
  ON saved_recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
