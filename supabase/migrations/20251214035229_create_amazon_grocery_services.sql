/*
  # Amazon Grocery Services Integration

  1. New Tables
    - `amazon_service_availability`
      - Tracks which Amazon grocery services are available by zip code
      - `id` (uuid, primary key)
      - `zip_code` (text)
      - `service_type` (text: amazon_fresh, amazon_grocery, whole_foods)
      - `is_available` (boolean)
      - `delivery_available` (boolean)
      - `pickup_available` (boolean)
      - `estimated_delivery_time` (text)
      - `last_checked` (timestamptz)
      - `created_at` (timestamptz)

    - `amazon_service_configs`
      - Configuration for each Amazon grocery service
      - `id` (uuid, primary key)
      - `service_type` (text)
      - `display_name` (text)
      - `description` (text)
      - `base_url` (text)
      - `icon_name` (text)
      - `color_class` (text)
      - `commission_rate` (decimal)
      - `is_active` (boolean)
      - `sort_order` (integer)

    - `amazon_service_clicks`
      - Track affiliate clicks and conversions
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `service_type` (text)
      - `clicked_at` (timestamptz)
      - `recipe_id` (uuid, nullable)
      - `item_count` (integer)
      - `estimated_value` (decimal, nullable)

  2. Updates to Existing Tables
    - Add `preferred_amazon_service` to `user_delivery_preferences`
    - Add `enable_amazon_fresh`, `enable_amazon_grocery`, `enable_whole_foods` toggles
    - Add `user_zip_code` for availability checking

  3. Security
    - Enable RLS on all new tables
    - Add policies for authenticated users

  4. Indexes
    - Add indexes for zip code lookups
    - Add indexes for user click tracking
*/

-- Create amazon_service_availability table
CREATE TABLE IF NOT EXISTS amazon_service_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  zip_code text NOT NULL,
  service_type text NOT NULL CHECK (service_type IN ('amazon_fresh', 'amazon_grocery', 'whole_foods')),
  is_available boolean DEFAULT false,
  delivery_available boolean DEFAULT false,
  pickup_available boolean DEFAULT false,
  estimated_delivery_time text,
  last_checked timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE amazon_service_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service availability"
  ON amazon_service_availability FOR SELECT
  TO authenticated
  USING (true);

CREATE INDEX IF NOT EXISTS idx_amazon_service_availability_zip 
  ON amazon_service_availability(zip_code);

CREATE INDEX IF NOT EXISTS idx_amazon_service_availability_service_type 
  ON amazon_service_availability(service_type);

-- Create amazon_service_configs table
CREATE TABLE IF NOT EXISTS amazon_service_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_type text UNIQUE NOT NULL CHECK (service_type IN ('amazon_fresh', 'amazon_grocery', 'whole_foods', 'amazon')),
  display_name text NOT NULL,
  description text NOT NULL,
  base_url text NOT NULL,
  icon_name text NOT NULL,
  color_class text NOT NULL,
  commission_rate decimal(5,2) DEFAULT 1.00,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE amazon_service_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read service configs"
  ON amazon_service_configs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Insert default configurations
INSERT INTO amazon_service_configs (service_type, display_name, description, base_url, icon_name, color_class, commission_rate, sort_order)
VALUES 
  ('amazon_fresh', 'Amazon Fresh', 'Same-day fresh grocery delivery', 'https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo', 'Leaf', 'text-green-600', 1.00, 1),
  ('amazon_grocery', 'Amazon Grocery', 'Pantry staples with standard shipping', 'https://www.amazon.com/Amazon-Grocery/b?node=16318821', 'Package', 'text-orange-600', 1.00, 2),
  ('whole_foods', 'Whole Foods', 'Premium organic groceries', 'https://www.amazon.com/fmc/m/20220601?almBrandId=VUZHIHdob2xlZm9vZHM%3D', 'ShoppingBag', 'text-emerald-600', 1.00, 3),
  ('amazon', 'Amazon', 'General Amazon shopping', 'https://www.amazon.com', 'Package', 'text-orange-600', 1.00, 4)
ON CONFLICT (service_type) DO NOTHING;

-- Create amazon_service_clicks table
CREATE TABLE IF NOT EXISTS amazon_service_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  service_type text NOT NULL CHECK (service_type IN ('amazon_fresh', 'amazon_grocery', 'whole_foods', 'amazon')),
  clicked_at timestamptz DEFAULT now(),
  recipe_id uuid REFERENCES public_recipes(id) ON DELETE SET NULL,
  item_count integer DEFAULT 0,
  estimated_value decimal(10,2)
);

ALTER TABLE amazon_service_clicks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own clicks"
  ON amazon_service_clicks FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own clicks"
  ON amazon_service_clicks FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_user 
  ON amazon_service_clicks(user_id);

CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_service 
  ON amazon_service_clicks(service_type);

CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_date 
  ON amazon_service_clicks(clicked_at);

-- Update user_delivery_preferences table with Amazon grocery service options
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_delivery_preferences' AND column_name = 'preferred_amazon_service'
  ) THEN
    ALTER TABLE user_delivery_preferences 
    ADD COLUMN preferred_amazon_service text DEFAULT 'auto' CHECK (preferred_amazon_service IN ('auto', 'amazon_fresh', 'amazon_grocery', 'whole_foods', 'amazon'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_delivery_preferences' AND column_name = 'enable_amazon_fresh'
  ) THEN
    ALTER TABLE user_delivery_preferences 
    ADD COLUMN enable_amazon_fresh boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_delivery_preferences' AND column_name = 'enable_amazon_grocery'
  ) THEN
    ALTER TABLE user_delivery_preferences 
    ADD COLUMN enable_amazon_grocery boolean DEFAULT true;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_delivery_preferences' AND column_name = 'enable_whole_foods'
  ) THEN
    ALTER TABLE user_delivery_preferences 
    ADD COLUMN enable_whole_foods boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_delivery_preferences' AND column_name = 'user_zip_code'
  ) THEN
    ALTER TABLE user_delivery_preferences 
    ADD COLUMN user_zip_code text;
  END IF;
END $$;