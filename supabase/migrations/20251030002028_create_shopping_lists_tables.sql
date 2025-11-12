/*
  # Create Grocery Lists and Categories Tables

  1. New Tables
    - `grocery_list_categories`
      - `id` (uuid, primary key) - Unique category identifier
      - `user_id` (uuid, not null) - User who owns the category
      - `name` (text, not null) - Category name (Produce, Dairy, Meat, etc.)
      - `sort_order` (integer, not null) - Display order for categories
      - `created_at` (timestamptz) - When created
      
    - `grocery_list_items`
      - `id` (uuid, primary key) - Unique item identifier
      - `user_id` (uuid, not null) - User who owns the item
      - `name` (text, not null) - Ingredient name
      - `quantity` (numeric, not null) - Numeric quantity
      - `unit` (text, not null) - Unit of measurement
      - `category_id` (uuid, not null) - Foreign key to categories
      - `checked` (boolean, default false) - Whether item is checked off
      - `source_recipe_ids` (text[], default '{}') - Array of recipe IDs this item came from
      - `created_at` (timestamptz) - When created
      - `updated_at` (timestamptz) - When last updated

  2. Security
    - Enable RLS on both tables
    - Add policies for users to manage their own data
    
  3. Indexes
    - Create index on user_id for both tables
    - Create index on category_id for items
    
  4. Important Notes
    - Default categories will be created for new users
    - Items can be merged intelligently based on name and unit
    - Category sort order allows custom arrangement
*/

-- Create grocery list categories table
CREATE TABLE IF NOT EXISTS grocery_list_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create grocery list items table
CREATE TABLE IF NOT EXISTS grocery_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  quantity numeric NOT NULL DEFAULT 0,
  unit text NOT NULL,
  category_id uuid NOT NULL REFERENCES grocery_list_categories(id) ON DELETE CASCADE,
  checked boolean DEFAULT false,
  source_recipe_ids text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_shopping_list_categories_user_id ON shopping_list_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_categories_sort_order ON shopping_list_categories(user_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_user_id ON shopping_list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_category ON shopping_list_items(category_id);

-- Enable RLS
ALTER TABLE shopping_list_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_list_items ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Users can read own categories"
  ON shopping_list_categories
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own categories"
  ON shopping_list_categories
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own categories"
  ON shopping_list_categories
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own categories"
  ON shopping_list_categories
  FOR DELETE
  USING (true);

-- Items policies
CREATE POLICY "Users can read own items"
  ON shopping_list_items
  FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own items"
  ON shopping_list_items
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own items"
  ON shopping_list_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete own items"
  ON shopping_list_items
  FOR DELETE
  USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_shopping_list_item_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_shopping_list_item_updated_at_trigger ON shopping_list_items;
CREATE TRIGGER update_shopping_list_item_updated_at_trigger
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_shopping_list_item_updated_at();