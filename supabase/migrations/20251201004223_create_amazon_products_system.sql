/*
  # Create Amazon Products and Ingredient Mapping System

  ## Overview
  Creates comprehensive system for Amazon affiliate product catalog,
  ingredient-to-product mappings, and smart cart functionality.

  ## Changes
  1. New Tables
    - `amazon_products` - Catalog of curated Amazon products
    - `ingredient_product_mappings` - Maps ingredients to products
    - `product_categories` - Product category taxonomy

  2. Security
    - Enable RLS on all tables
    - Public read access for products
    - Admin-only write access
    - Users can read all products but only modify own cart

  3. Performance
    - Indexes on search fields and foreign keys
    - GIN index for text search on product names
    - Category and keyword indexes for filtering

  ## Important Notes
  - Amazon affiliate tag: mealscrape-20
  - Products include ASIN for Amazon API integration
  - Categories use icons and colors for UI
  - Mapping confidence scores for matching accuracy
*/

-- Create product categories table
CREATE TABLE IF NOT EXISTS product_categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT '🛒',
  color text NOT NULL DEFAULT 'gray',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Create amazon_products table
CREATE TABLE IF NOT EXISTS amazon_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id text NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  description text,
  amazon_url text NOT NULL,
  asin text,
  price numeric(10, 2),
  image_url text,
  brand text,
  package_size text,
  is_prime boolean DEFAULT false,
  search_keywords text[] DEFAULT '{}',
  popularity_score int DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create ingredient_product_mappings table
CREATE TABLE IF NOT EXISTS ingredient_product_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  amazon_product_id uuid NOT NULL REFERENCES amazon_products(id) ON DELETE CASCADE,
  confidence_score decimal(3, 2) DEFAULT 0.5,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(ingredient_name, amazon_product_id)
);

-- Enable RLS
ALTER TABLE product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE amazon_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredient_product_mappings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for product_categories
CREATE POLICY "Anyone can view categories"
  ON product_categories FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only admins can manage categories"
  ON product_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- RLS Policies for amazon_products
CREATE POLICY "Anyone can view active products"
  ON amazon_products FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Admins can view all products"
  ON amazon_products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can manage products"
  ON amazon_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- RLS Policies for ingredient_product_mappings
CREATE POLICY "Anyone can view mappings"
  ON ingredient_product_mappings FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can create mappings"
  ON ingredient_product_mappings FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Only admins can modify mappings"
  ON ingredient_product_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can delete mappings"
  ON ingredient_product_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_amazon_products_category ON amazon_products(category_id);
CREATE INDEX IF NOT EXISTS idx_amazon_products_asin ON amazon_products(asin);
CREATE INDEX IF NOT EXISTS idx_amazon_products_active ON amazon_products(is_active);
CREATE INDEX IF NOT EXISTS idx_amazon_products_popularity ON amazon_products(popularity_score DESC);
CREATE INDEX IF NOT EXISTS idx_ingredient_mappings_name ON ingredient_product_mappings(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_ingredient_mappings_product ON ingredient_product_mappings(amazon_product_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_mappings_confidence ON ingredient_product_mappings(confidence_score DESC);

-- GIN index for text search on product names and keywords
CREATE INDEX IF NOT EXISTS idx_amazon_products_search
  ON amazon_products USING gin(to_tsvector('english', product_name || ' ' || COALESCE(description, '')));
CREATE INDEX IF NOT EXISTS idx_amazon_products_keywords
  ON amazon_products USING gin(search_keywords);

-- Insert default product categories
INSERT INTO product_categories (id, name, description, icon, color, sort_order) VALUES
  ('condiments', 'Condiments & Sauces', 'Ketchup, mustard, soy sauce, hot sauce, and more', '🍯', 'amber', 1),
  ('oils', 'Oils & Vinegars', 'Olive oil, vegetable oil, vinegar, and cooking oils', '🫗', 'yellow', 2),
  ('spices', 'Herbs & Spices', 'Dried herbs, spices, and seasonings', '🌿', 'green', 3),
  ('baking', 'Baking Supplies', 'Flour, sugar, baking powder, vanilla extract', '🧁', 'pink', 4),
  ('canned', 'Canned & Jarred', 'Canned vegetables, beans, tomatoes, and preserves', '🥫', 'red', 5),
  ('grains', 'Grains & Pasta', 'Rice, pasta, quinoa, oats, and cereals', '🌾', 'orange', 6),
  ('dairy', 'Dairy Alternatives', 'Shelf-stable milk, creamer, and cheese', '🥛', 'blue', 7),
  ('snacks', 'Snacks & Sweets', 'Nuts, chips, chocolate, and treats', '🍿', 'purple', 8),
  ('beverages', 'Beverages', 'Coffee, tea, juice, and drink mixes', '☕', 'brown', 9),
  ('other', 'Other Pantry Staples', 'Miscellaneous grocery items', '🛒', 'gray', 10)
ON CONFLICT (id) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_amazon_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_amazon_products_timestamp ON amazon_products;
CREATE TRIGGER update_amazon_products_timestamp
  BEFORE UPDATE ON amazon_products
  FOR EACH ROW
  EXECUTE FUNCTION update_amazon_products_updated_at();