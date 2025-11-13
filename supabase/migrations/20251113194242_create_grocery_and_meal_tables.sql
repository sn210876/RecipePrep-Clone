/*
  # Create Grocery List and Meal Plan Tables

  ## Overview
  Creates tables for persistent grocery lists and meal plans.

  ## Changes
  1. New Tables
    - `grocery_list_categories`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `name` (text)
      - `sort_order` (integer)
      - `created_at` (timestamp)

    - `grocery_list_items`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `category_id` (uuid, references categories)
      - `name` (text)
      - `quantity` (text) - stored as text for flexibility
      - `unit` (text)
      - `checked` (boolean)
      - `created_at` (timestamp)

    - `meal_plans`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `recipe_id` (uuid, references public_recipes)
      - `meal_date` (date)
      - `meal_type` (text) - Breakfast, Lunch, Dinner, Snack
      - `servings` (integer)
      - `notes` (text, nullable)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
    - Full CRUD permissions for own data

  ## Important Notes
  - Grocery items use text for quantity to handle fractions like "1/2"
  - Meal plans link to public_recipes table
  - Data persists across sessions
*/

-- Create grocery list categories table
CREATE TABLE IF NOT EXISTS grocery_list_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create grocery list items table
CREATE TABLE IF NOT EXISTS grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  category_id uuid REFERENCES grocery_list_categories(id) ON DELETE SET NULL,
  name text NOT NULL,
  quantity text NOT NULL DEFAULT '1',
  unit text NOT NULL DEFAULT '',
  checked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create meal plans table
CREATE TABLE IF NOT EXISTS meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  recipe_id uuid NOT NULL REFERENCES public_recipes(id) ON DELETE CASCADE,
  meal_date date NOT NULL,
  meal_type text NOT NULL,
  servings integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE grocery_list_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_list_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for grocery_list_categories
CREATE POLICY "Users can view own categories"
  ON grocery_list_categories FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own categories"
  ON grocery_list_categories FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
  ON grocery_list_categories FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
  ON grocery_list_categories FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for grocery_list_items
CREATE POLICY "Users can view own items"
  ON grocery_list_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own items"
  ON grocery_list_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own items"
  ON grocery_list_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own items"
  ON grocery_list_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for meal_plans
CREATE POLICY "Users can view own meal plans"
  ON meal_plans FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own meal plans"
  ON meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own meal plans"
  ON meal_plans FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own meal plans"
  ON meal_plans FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_grocery_categories_user ON grocery_list_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_user ON grocery_list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_items_category ON grocery_list_items(category_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_user ON meal_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_meal_plans_date ON meal_plans(user_id, meal_date);
CREATE INDEX IF NOT EXISTS idx_meal_plans_recipe ON meal_plans(recipe_id);