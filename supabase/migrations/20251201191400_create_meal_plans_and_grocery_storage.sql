/*
  # Create Meal Plans and Grocery List Storage Tables

  1. New Tables
    - `user_meal_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `recipe_id` (uuid, references public_recipes)
      - `date` (date)
      - `meal_type` (text: Breakfast, Lunch, Dinner, Snack)
      - `servings` (integer)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_grocery_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `quantity` (numeric)
      - `unit` (text)
      - `category_id` (text)
      - `checked` (boolean)
      - `source_recipe_ids` (text array)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data

  3. Indexes
    - Index on user_id for fast lookups
    - Index on date for meal plans
    - Composite index on user_id + date + meal_type for meal plans
*/

-- Create user_meal_plans table
CREATE TABLE IF NOT EXISTS user_meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public_recipes(id) ON DELETE CASCADE,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  servings integer NOT NULL DEFAULT 2 CHECK (servings > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, meal_type)
);

-- Create user_grocery_items table
CREATE TABLE IF NOT EXISTS user_grocery_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 1,
  unit text NOT NULL DEFAULT '',
  category_id text NOT NULL DEFAULT 'Other',
  checked boolean DEFAULT false,
  source_recipe_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE user_meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_grocery_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_meal_plans
CREATE POLICY "Users can view own meal plans"
  ON user_meal_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans"
  ON user_meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON user_meal_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON user_meal_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for user_grocery_items
CREATE POLICY "Users can view own grocery items"
  ON user_grocery_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own grocery items"
  ON user_grocery_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own grocery items"
  ON user_grocery_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own grocery items"
  ON user_grocery_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_user ON user_meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_date ON user_meal_plans(date);
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_user_date_meal ON user_meal_plans(user_id, date, meal_type);

CREATE INDEX IF NOT EXISTS idx_user_grocery_items_user ON user_grocery_items(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grocery_items_checked ON user_grocery_items(user_id, checked);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
DROP TRIGGER IF EXISTS update_user_meal_plans_updated_at ON user_meal_plans;
CREATE TRIGGER update_user_meal_plans_updated_at
  BEFORE UPDATE ON user_meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_grocery_items_updated_at ON user_grocery_items;
CREATE TRIGGER update_user_grocery_items_updated_at
  BEFORE UPDATE ON user_grocery_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
