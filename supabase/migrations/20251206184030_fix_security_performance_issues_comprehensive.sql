/*
  # Fix Security and Performance Issues

  ## Changes Made
  
  ### 1. Add Missing Foreign Key Indexes
  - `amazon_products.category_id`
  - `blocked_users.blocked_id`
  - `comments.post_id`
  - `comments.user_id`
  - `family_codes.created_by_admin_id`
  - `follows.following_id`
  - `likes.user_id`
  - `payment_history.user_id`
  - `post_ratings.user_id`
  
  ### 2. Remove Unused Indexes
  - `idx_dailies_user_id`
  - `idx_family_codes_used_by_user_id`
  - `idx_ingredient_mappings_created_by`
  - `idx_notifications_conversation_id`
  - `idx_notifications_post_id`
  - `idx_referrals_referred_user_id`
  - `idx_user_meal_plans_recipe_id`
  
  ### 3. Fix Multiple Permissive Policies
  - Consolidate amazon_products SELECT policies
  - Consolidate product_categories SELECT policies
  
  ### 4. Fix Function Search Path
  - Make process_post_hashtags function search_path immutable
  
  ### 5. Move pg_net Extension
  - Move pg_net from public schema to extensions schema
  
  ## Notes
  - Leaked password protection must be enabled via Supabase Dashboard:
    Authentication → Providers → Email → Enable "Check for compromised passwords"
*/

-- =====================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_amazon_products_category_id 
ON amazon_products(category_id);

CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked_id 
ON blocked_users(blocked_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id 
ON comments(post_id);

CREATE INDEX IF NOT EXISTS idx_comments_user_id 
ON comments(user_id);

CREATE INDEX IF NOT EXISTS idx_family_codes_created_by_admin_id 
ON family_codes(created_by_admin_id);

CREATE INDEX IF NOT EXISTS idx_follows_following_id 
ON follows(following_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_id 
ON likes(user_id);

CREATE INDEX IF NOT EXISTS idx_payment_history_user_id 
ON payment_history(user_id);

CREATE INDEX IF NOT EXISTS idx_post_ratings_user_id 
ON post_ratings(user_id);

-- =====================================================
-- 2. REMOVE UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS idx_dailies_user_id;
DROP INDEX IF EXISTS idx_family_codes_used_by_user_id;
DROP INDEX IF EXISTS idx_ingredient_mappings_created_by;
DROP INDEX IF EXISTS idx_notifications_conversation_id;
DROP INDEX IF EXISTS idx_notifications_post_id;
DROP INDEX IF EXISTS idx_referrals_referred_user_id;
DROP INDEX IF EXISTS idx_user_meal_plans_recipe_id;

-- =====================================================
-- 3. FIX MULTIPLE PERMISSIVE POLICIES
-- =====================================================

-- Fix amazon_products: Make admin policy restrictive, keep user policy permissive
DROP POLICY IF EXISTS "Admins can manage products" ON amazon_products;
DROP POLICY IF EXISTS "Users can view active products, admins can view all" ON amazon_products;

-- Single permissive policy for viewing
CREATE POLICY "Users can view products based on access level"
  ON amazon_products FOR SELECT
  TO authenticated
  USING (
    is_active = true 
    OR 
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Restrictive policies for modifications (admin-only)
CREATE POLICY "Only admins can insert products"
  ON amazon_products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update products"
  ON amazon_products FOR UPDATE
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

CREATE POLICY "Only admins can delete products"
  ON amazon_products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Fix product_categories: Make admin policy restrictive, keep public policy permissive
DROP POLICY IF EXISTS "Admins can manage categories" ON product_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON product_categories;

-- Single permissive policy for viewing
CREATE POLICY "Anyone can view categories"
  ON product_categories FOR SELECT
  TO authenticated
  USING (true);

-- Restrictive policies for modifications (admin-only)
CREATE POLICY "Only admins can insert categories"
  ON product_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

CREATE POLICY "Only admins can update categories"
  ON product_categories FOR UPDATE
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

CREATE POLICY "Only admins can delete categories"
  ON product_categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admin_users 
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- =====================================================
-- 4. FIX FUNCTION SEARCH PATH
-- =====================================================

CREATE OR REPLACE FUNCTION process_post_hashtags(
  p_post_id uuid,
  p_hashtags text[]
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM post_hashtags WHERE post_id = p_post_id;
  
  IF p_hashtags IS NOT NULL AND array_length(p_hashtags, 1) > 0 THEN
    INSERT INTO hashtags (tag, usage_count)
    SELECT DISTINCT tag, 1
    FROM unnest(p_hashtags) AS tag
    ON CONFLICT (tag) 
    DO UPDATE SET 
      usage_count = hashtags.usage_count + 1,
      last_used = now();
    
    INSERT INTO post_hashtags (post_id, hashtag_id)
    SELECT p_post_id, h.id
    FROM unnest(p_hashtags) AS tag
    JOIN hashtags h ON h.tag = tag;
  END IF;
END;
$$;

-- =====================================================
-- 5. MOVE PG_NET EXTENSION (if possible)
-- =====================================================

-- Note: pg_net extension movement requires superuser privileges
-- This is typically managed by Supabase infrastructure
-- If you have access to enable extensions in other schemas:

DO $$
BEGIN
  -- Check if extensions schema exists, create if not
  CREATE SCHEMA IF NOT EXISTS extensions;
  
  -- Try to move pg_net to extensions schema
  -- This may fail if you don't have sufficient privileges
  -- In that case, Supabase support needs to handle this
  BEGIN
    ALTER EXTENSION pg_net SET SCHEMA extensions;
  EXCEPTION
    WHEN insufficient_privilege THEN
      RAISE NOTICE 'Insufficient privileges to move pg_net extension. Contact Supabase support.';
    WHEN OTHERS THEN
      RAISE NOTICE 'Could not move pg_net extension: %', SQLERRM;
  END;
END $$;