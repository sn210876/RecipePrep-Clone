/*
  # Recipe Recommendation System Database Schema

  1. New Tables
    - `recipes`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `ingredients` (jsonb) - array of ingredient objects
      - `instructions` (jsonb) - array of instruction strings
      - `steps` (jsonb) - array of step objects with techniques
      - `prep_time` (integer) - in minutes
      - `cook_time` (integer) - in minutes
      - `servings` (integer)
      - `tags` (jsonb) - array of tags
      - `cuisine_type` (text)
      - `difficulty` (text) - Easy/Medium/Hard
      - `dietary_tags` (jsonb) - array of dietary tags
      - `image_url` (text, optional)
      - `source_url` (text, optional)
      - `notes` (text, optional)
      - `meal_type` (jsonb) - array of meal types
      - `popularity` (integer, default 0)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_recipe_interactions`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `recipe_id` (uuid, foreign key to recipes)
      - `is_saved` (boolean, default false)
      - `interaction_type` (text) - saved/viewed/cooked
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_preference_analytics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `cuisine_preferences` (jsonb) - cuisine type counts
      - `dietary_preferences` (jsonb) - dietary tag frequencies
      - `difficulty_preferences` (jsonb) - difficulty level counts
      - `avg_cook_time` (integer)
      - `total_recipes_saved` (integer, default 0)
      - `last_updated` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Users can view all recipes but only modify their own interactions
*/

CREATE TABLE IF NOT EXISTS recipes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  ingredients jsonb NOT NULL DEFAULT '[]'::jsonb,
  instructions jsonb NOT NULL DEFAULT '[]'::jsonb,
  steps jsonb DEFAULT '[]'::jsonb,
  prep_time integer NOT NULL DEFAULT 0,
  cook_time integer NOT NULL DEFAULT 0,
  servings integer NOT NULL DEFAULT 1,
  tags jsonb DEFAULT '[]'::jsonb,
  cuisine_type text NOT NULL DEFAULT '',
  difficulty text NOT NULL DEFAULT 'Easy',
  dietary_tags jsonb DEFAULT '[]'::jsonb,
  image_url text,
  source_url text,
  notes text,
  meal_type jsonb DEFAULT '[]'::jsonb,
  popularity integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_recipe_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_id uuid REFERENCES recipes(id) ON DELETE CASCADE NOT NULL,
  is_saved boolean DEFAULT false,
  interaction_type text NOT NULL DEFAULT 'viewed',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, recipe_id, interaction_type)
);

CREATE TABLE IF NOT EXISTS user_preference_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  cuisine_preferences jsonb DEFAULT '{}'::jsonb,
  dietary_preferences jsonb DEFAULT '[]'::jsonb,
  difficulty_preferences jsonb DEFAULT '{}'::jsonb,
  avg_cook_time integer DEFAULT 0,
  total_recipes_saved integer DEFAULT 0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preference_analytics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all recipes"
  ON recipes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert their own recipes"
  ON recipes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recipes"
  ON recipes FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recipes"
  ON recipes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own interactions"
  ON user_recipe_interactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own interactions"
  ON user_recipe_interactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own interactions"
  ON user_recipe_interactions FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own interactions"
  ON user_recipe_interactions FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own analytics"
  ON user_preference_analytics FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own analytics"
  ON user_preference_analytics FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own analytics"
  ON user_preference_analytics FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_recipes_cuisine_type ON recipes(cuisine_type);
CREATE INDEX IF NOT EXISTS idx_recipes_difficulty ON recipes(difficulty);
CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_interactions_user_id ON user_recipe_interactions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_recipe_interactions_recipe_id ON user_recipe_interactions(recipe_id);
CREATE INDEX IF NOT EXISTS idx_user_preference_analytics_user_id ON user_preference_analytics(user_id);

CREATE OR REPLACE FUNCTION update_user_preference_analytics()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_saved = true AND (OLD IS NULL OR OLD.is_saved = false) THEN
    INSERT INTO user_preference_analytics (user_id, last_updated)
    VALUES (NEW.user_id, now())
    ON CONFLICT (user_id)
    DO UPDATE SET
      total_recipes_saved = user_preference_analytics.total_recipes_saved + 1,
      last_updated = now();
  ELSIF NEW.is_saved = false AND OLD.is_saved = true THEN
    UPDATE user_preference_analytics
    SET 
      total_recipes_saved = GREATEST(0, total_recipes_saved - 1),
      last_updated = now()
    WHERE user_id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_user_preference_analytics
  AFTER INSERT OR UPDATE OF is_saved ON user_recipe_interactions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preference_analytics();
