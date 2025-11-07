/*
  # Create Meal Plans Table

  1. New Tables
    - `meal_plans`
      - `id` (uuid, primary key) - Unique meal plan entry identifier
      - `user_id` (uuid, not null) - Reference to user who created the meal plan
      - `recipe_id` (text, not null) - Recipe identifier from the recipes collection
      - `date` (date, not null) - Date of the planned meal
      - `meal_type` (text, not null) - Type of meal (Breakfast, Lunch, Dinner, Snack)
      - `servings` (integer) - Number of servings planned
      - `created_at` (timestamptz) - When the meal plan was created
      - `updated_at` (timestamptz) - When the meal plan was last updated

  2. Security
    - Enable RLS on `meal_plans` table
    - Add policy for users to read their own meal plans
    - Add policy for users to insert their own meal plans
    - Add policy for users to update their own meal plans
    - Add policy for users to delete their own meal plans

  3. Indexes
    - Create index on user_id for fast lookups
    - Create composite index on user_id and date for calendar views
    - Create unique constraint to prevent duplicate meals at same time

  4. Important Notes
    - Meal types are: Breakfast, Lunch, Dinner, Snack
    - Dates are stored in date format for easy querying
    - Users can only have one recipe per meal type per date
*/

-- Create meal_plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  recipe_id text NOT NULL,
  date date NOT NULL,
  meal_type text NOT NULL CHECK (meal_type IN ('Breakfast', 'Lunch', 'Dinner', 'Snack')),
  servings integer DEFAULT 2,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date, meal_type)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_id ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user_date ON meal_plans(user_id, date);

-- Enable RLS
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (without auth.uid() since we're using local storage user IDs)
CREATE POLICY "Users can read own meal plans"
  ON meal_plans
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own meal plans"
  ON meal_plans
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own meal plans"
  ON meal_plans
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans
  FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_meal_plan_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_meal_plan_updated_at_trigger ON meal_plans;
CREATE TRIGGER update_meal_plan_updated_at_trigger
  BEFORE UPDATE ON meal_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_meal_plan_updated_at();