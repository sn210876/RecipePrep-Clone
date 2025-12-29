/*
  # Delivery Service Integration System

  1. New Tables
    - `delivery_service_configs`
      - Stores API credentials and configuration for delivery services (Instacart, etc.)
      - `id` (uuid, primary key)
      - `service_name` (text) - 'instacart', 'doordash', 'ubereats', etc.
      - `api_key` (text, encrypted)
      - `api_secret` (text, encrypted)
      - `affiliate_tag` (text) - Affiliate/partner ID
      - `is_active` (boolean) - Whether service is enabled
      - `webhook_url` (text) - URL for receiving webhooks
      - `config_data` (jsonb) - Additional configuration
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `user_delivery_preferences`
      - Stores user delivery addresses and service preferences
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `default_service` (text) - 'instacart', 'amazon', 'auto'
      - `delivery_address` (jsonb) - Full address object
      - `delivery_instructions` (text)
      - `preferred_delivery_window` (text)
      - `auto_route_fresh_items` (boolean) - Auto-route fresh items to Instacart
      - `auto_route_pantry_items` (boolean) - Auto-route pantry to Amazon
      - `enable_cost_optimization` (boolean)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `affiliate_conversions`
      - Tracks conversion events and affiliate commissions
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `service_name` (text) - Which service generated conversion
      - `order_id` (text) - External order ID
      - `conversion_type` (text) - 'order', 'signup', 'subscription'
      - `order_total` (decimal)
      - `commission_amount` (decimal)
      - `commission_rate` (decimal)
      - `tracking_id` (text) - Affiliate tracking ID
      - `conversion_date` (timestamptz)
      - `status` (text) - 'pending', 'confirmed', 'paid'
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

    - `delivery_orders`
      - Tracks orders placed through delivery services
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `service_name` (text)
      - `external_order_id` (text) - Order ID from delivery service
      - `cart_snapshot` (jsonb) - Items at time of order
      - `order_status` (text) - 'pending', 'confirmed', 'out_for_delivery', 'delivered', 'cancelled'
      - `order_total` (decimal)
      - `delivery_address` (jsonb)
      - `delivery_date` (timestamptz)
      - `tracking_url` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `ingredient_delivery_routing`
      - Smart routing rules for ingredients to delivery services
      - `id` (uuid, primary key)
      - `ingredient_name` (text)
      - `category` (text) - 'fresh_produce', 'meat', 'dairy', 'pantry', 'frozen'
      - `recommended_service` (text) - 'instacart', 'amazon'
      - `freshness_priority` (int) - 1-10 scale
      - `confidence_score` (decimal)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated user access
    - Admin-only access for delivery_service_configs
    - User-specific access for preferences and orders

  3. Indexes
    - Add indexes for common query patterns
    - Foreign key indexes for performance
*/

-- Create delivery_service_configs table
CREATE TABLE IF NOT EXISTS delivery_service_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL UNIQUE,
  api_key text,
  api_secret text,
  affiliate_tag text,
  is_active boolean DEFAULT false,
  webhook_url text,
  config_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_service_configs ENABLE ROW LEVEL SECURITY;

-- Only admins can manage delivery service configs
CREATE POLICY "Admins can manage delivery service configs"
  ON delivery_service_configs FOR ALL
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

-- Users can view active services
CREATE POLICY "Users can view active delivery services"
  ON delivery_service_configs FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Create user_delivery_preferences table
CREATE TABLE IF NOT EXISTS user_delivery_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  default_service text DEFAULT 'auto',
  delivery_address jsonb DEFAULT '{}'::jsonb,
  delivery_instructions text DEFAULT '',
  preferred_delivery_window text DEFAULT '',
  auto_route_fresh_items boolean DEFAULT true,
  auto_route_pantry_items boolean DEFAULT true,
  enable_cost_optimization boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE user_delivery_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery preferences"
  ON user_delivery_preferences FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own delivery preferences"
  ON user_delivery_preferences FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery preferences"
  ON user_delivery_preferences FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own delivery preferences"
  ON user_delivery_preferences FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create affiliate_conversions table
CREATE TABLE IF NOT EXISTS affiliate_conversions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  service_name text NOT NULL,
  order_id text,
  conversion_type text NOT NULL,
  order_total decimal(10,2) DEFAULT 0,
  commission_amount decimal(10,2) DEFAULT 0,
  commission_rate decimal(5,4) DEFAULT 0,
  tracking_id text,
  conversion_date timestamptz DEFAULT now(),
  status text DEFAULT 'pending',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE affiliate_conversions ENABLE ROW LEVEL SECURITY;

-- Admins can view all conversions
CREATE POLICY "Admins can view all affiliate conversions"
  ON affiliate_conversions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Users can view their own conversions
CREATE POLICY "Users can view own affiliate conversions"
  ON affiliate_conversions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- System can insert conversions (webhook handler)
CREATE POLICY "Authenticated users can insert conversions"
  ON affiliate_conversions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Create delivery_orders table
CREATE TABLE IF NOT EXISTS delivery_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  external_order_id text,
  cart_snapshot jsonb DEFAULT '[]'::jsonb,
  order_status text DEFAULT 'pending',
  order_total decimal(10,2) DEFAULT 0,
  delivery_address jsonb DEFAULT '{}'::jsonb,
  delivery_date timestamptz,
  tracking_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE delivery_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own delivery orders"
  ON delivery_orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own delivery orders"
  ON delivery_orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own delivery orders"
  ON delivery_orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all orders
CREATE POLICY "Admins can view all delivery orders"
  ON delivery_orders FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Create ingredient_delivery_routing table
CREATE TABLE IF NOT EXISTS ingredient_delivery_routing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name text NOT NULL,
  category text NOT NULL,
  recommended_service text NOT NULL,
  freshness_priority int DEFAULT 5,
  confidence_score decimal(3,2) DEFAULT 0.5,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(ingredient_name)
);

ALTER TABLE ingredient_delivery_routing ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read routing rules
CREATE POLICY "Users can view ingredient routing rules"
  ON ingredient_delivery_routing FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can manage routing rules
CREATE POLICY "Admins can manage ingredient routing rules"
  ON ingredient_delivery_routing FOR ALL
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

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_delivery_prefs_user_id ON user_delivery_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_user_id ON affiliate_conversions(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_service ON affiliate_conversions(service_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_conversions_date ON affiliate_conversions(conversion_date);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_user_id ON delivery_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_service ON delivery_orders(service_name);
CREATE INDEX IF NOT EXISTS idx_delivery_orders_status ON delivery_orders(order_status);
CREATE INDEX IF NOT EXISTS idx_ingredient_routing_name ON ingredient_delivery_routing(ingredient_name);
CREATE INDEX IF NOT EXISTS idx_ingredient_routing_category ON ingredient_delivery_routing(category);

-- Insert default Instacart configuration
INSERT INTO delivery_service_configs (service_name, affiliate_tag, is_active, config_data)
VALUES (
  'instacart',
  'mealscrape',
  false,
  '{"api_base_url": "https://api.instacart.com/v2", "requires_oauth": true}'::jsonb
) ON CONFLICT (service_name) DO NOTHING;

-- Insert default Amazon configuration (existing affiliate)
INSERT INTO delivery_service_configs (service_name, affiliate_tag, is_active, config_data)
VALUES (
  'amazon',
  'mealscrape-20',
  true,
  '{"api_base_url": "https://www.amazon.com", "requires_oauth": false}'::jsonb
) ON CONFLICT (service_name) DO NOTHING;

-- Insert default ingredient routing rules
INSERT INTO ingredient_delivery_routing (ingredient_name, category, recommended_service, freshness_priority, confidence_score)
VALUES
  ('tomato', 'fresh_produce', 'instacart', 10, 0.95),
  ('lettuce', 'fresh_produce', 'instacart', 10, 0.95),
  ('chicken breast', 'meat', 'instacart', 10, 0.95),
  ('ground beef', 'meat', 'instacart', 10, 0.95),
  ('milk', 'dairy', 'instacart', 9, 0.90),
  ('eggs', 'dairy', 'instacart', 9, 0.90),
  ('rice', 'pantry', 'amazon', 2, 0.85),
  ('pasta', 'pantry', 'amazon', 2, 0.85),
  ('olive oil', 'pantry', 'amazon', 2, 0.85),
  ('salt', 'pantry', 'amazon', 1, 0.90),
  ('flour', 'pantry', 'amazon', 2, 0.85),
  ('sugar', 'pantry', 'amazon', 2, 0.85),
  ('frozen peas', 'frozen', 'instacart', 6, 0.80),
  ('ice cream', 'frozen', 'instacart', 6, 0.80)
ON CONFLICT (ingredient_name) DO NOTHING;
