/*
  # Fix Security and Performance Issues

  1. Add Missing Indexes for Foreign Keys
    - Add indexes for all unindexed foreign keys to improve query performance
    
  2. Optimize RLS Policies
    - Wrap auth.uid() calls with (SELECT auth.uid()) to avoid re-evaluation per row
    
  3. Remove Unused Indexes
    - Drop indexes that have not been used to save storage
    
  4. Consolidate Multiple Permissive Policies
    - Merge overlapping policies for better performance
    
  5. Fix Function Search Paths
    - Set immutable search_path on functions
    
  Note: pg_net extension cannot be moved from public schema (not supported by extension)
*/

-- =====================================================
-- 1. ADD MISSING INDEXES FOR FOREIGN KEYS
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_dailies_user_id ON public.dailies(user_id);
CREATE INDEX IF NOT EXISTS idx_family_codes_used_by_user_id ON public.family_codes(used_by_user_id);
CREATE INDEX IF NOT EXISTS idx_ingredient_mappings_created_by ON public.ingredient_product_mappings(created_by);
CREATE INDEX IF NOT EXISTS idx_notifications_actor_id ON public.notifications(actor_id);
CREATE INDEX IF NOT EXISTS idx_notifications_conversation_id ON public.notifications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_notifications_post_id ON public.notifications(post_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_user_meal_plans_recipe_id ON public.user_meal_plans(recipe_id);

-- =====================================================
-- 2. DROP UNUSED INDEXES
-- =====================================================

DROP INDEX IF EXISTS public.idx_subscriptions_stripe_customer;
DROP INDEX IF EXISTS public.idx_subscriptions_stripe_subscription;
DROP INDEX IF EXISTS public.idx_payment_history_user_id;
DROP INDEX IF EXISTS public.idx_payment_history_stripe_payment;
DROP INDEX IF EXISTS public.idx_payment_history_status;
DROP INDEX IF EXISTS public.idx_payment_history_created;
DROP INDEX IF EXISTS public.idx_user_meal_plans_user;
DROP INDEX IF EXISTS public.idx_user_meal_plans_date;
DROP INDEX IF EXISTS public.idx_amazon_products_asin;
DROP INDEX IF EXISTS public.idx_amazon_products_category;
DROP INDEX IF EXISTS public.idx_amazon_products_active;
DROP INDEX IF EXISTS public.idx_amazon_products_search;
DROP INDEX IF EXISTS public.idx_amazon_products_keywords;
DROP INDEX IF EXISTS public.idx_cart_items_asin;
DROP INDEX IF EXISTS public.idx_comments_user_id;
DROP INDEX IF EXISTS public.idx_family_codes_created_by_admin_id;
DROP INDEX IF EXISTS public.idx_follows_following_id;
DROP INDEX IF EXISTS public.idx_likes_user_id;
DROP INDEX IF EXISTS public.idx_post_ratings_user_id;
DROP INDEX IF EXISTS public.idx_comments_post_id;
DROP INDEX IF EXISTS public.blocked_users_blocked_id_idx;

-- =====================================================
-- 3. OPTIMIZE RLS POLICIES - POSTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can delete any post" ON public.posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON public.posts;

CREATE POLICY "Users and admins can delete posts"
  ON public.posts FOR DELETE
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 4. OPTIMIZE RLS POLICIES - DIRECT MESSAGES
-- =====================================================

DROP POLICY IF EXISTS "Users can update messages in their conversations" ON public.direct_messages;

CREATE POLICY "Users can update messages in their conversations"
  ON public.direct_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id
      AND ((SELECT auth.uid()) = c.user1_id OR (SELECT auth.uid()) = c.user2_id)
    )
  );

-- =====================================================
-- 5. OPTIMIZE RLS POLICIES - SUBSCRIPTIONS
-- =====================================================

DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

-- =====================================================
-- 6. OPTIMIZE RLS POLICIES - PAYMENT HISTORY
-- =====================================================

DROP POLICY IF EXISTS "Admins can insert payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Admins can view all payment history" ON public.payment_history;
DROP POLICY IF EXISTS "Users can view own payment history" ON public.payment_history;

CREATE POLICY "Users and admins can view payment history"
  ON public.payment_history FOR SELECT
  TO authenticated
  USING (
    user_id = (SELECT auth.uid()) OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can insert payment history"
  ON public.payment_history FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 7. OPTIMIZE RLS POLICIES - PRODUCT CATEGORIES
-- =====================================================

DROP POLICY IF EXISTS "Only admins can manage categories" ON public.product_categories;
DROP POLICY IF EXISTS "Anyone can view categories" ON public.product_categories;

CREATE POLICY "Anyone can view categories"
  ON public.product_categories FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage categories"
  ON public.product_categories FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 8. OPTIMIZE RLS POLICIES - AMAZON PRODUCTS
-- =====================================================

DROP POLICY IF EXISTS "Admins can view all products" ON public.amazon_products;
DROP POLICY IF EXISTS "Anyone can view active products" ON public.amazon_products;
DROP POLICY IF EXISTS "Only admins can manage products" ON public.amazon_products;

CREATE POLICY "Users can view active products, admins can view all"
  ON public.amazon_products FOR SELECT
  TO authenticated
  USING (
    is_active = true OR
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can manage products"
  ON public.amazon_products FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 9. OPTIMIZE RLS POLICIES - INGREDIENT MAPPINGS
-- =====================================================

DROP POLICY IF EXISTS "Authenticated users can create mappings" ON public.ingredient_product_mappings;
DROP POLICY IF EXISTS "Only admins can delete mappings" ON public.ingredient_product_mappings;
DROP POLICY IF EXISTS "Only admins can modify mappings" ON public.ingredient_product_mappings;

CREATE POLICY "Authenticated users can create mappings"
  ON public.ingredient_product_mappings FOR INSERT
  TO authenticated
  WITH CHECK (created_by = (SELECT auth.uid()));

CREATE POLICY "Admins can modify mappings"
  ON public.ingredient_product_mappings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "Admins can delete mappings"
  ON public.ingredient_product_mappings FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (SELECT auth.uid())
    )
  );

-- =====================================================
-- 10. OPTIMIZE RLS POLICIES - CART ITEMS
-- =====================================================

DROP POLICY IF EXISTS "Users can add to cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can remove from cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can update cart" ON public.cart_items;
DROP POLICY IF EXISTS "Users can view own cart" ON public.cart_items;

CREATE POLICY "Users can view own cart"
  ON public.cart_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can add to cart"
  ON public.cart_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update cart"
  ON public.cart_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can remove from cart"
  ON public.cart_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 11. OPTIMIZE RLS POLICIES - USER MEAL PLANS
-- =====================================================

DROP POLICY IF EXISTS "Users can create own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can delete own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can update own meal plans" ON public.user_meal_plans;
DROP POLICY IF EXISTS "Users can view own meal plans" ON public.user_meal_plans;

CREATE POLICY "Users can view own meal plans"
  ON public.user_meal_plans FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own meal plans"
  ON public.user_meal_plans FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own meal plans"
  ON public.user_meal_plans FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own meal plans"
  ON public.user_meal_plans FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 12. OPTIMIZE RLS POLICIES - USER GROCERY ITEMS
-- =====================================================

DROP POLICY IF EXISTS "Users can create own grocery items" ON public.user_grocery_items;
DROP POLICY IF EXISTS "Users can delete own grocery items" ON public.user_grocery_items;
DROP POLICY IF EXISTS "Users can update own grocery items" ON public.user_grocery_items;
DROP POLICY IF EXISTS "Users can view own grocery items" ON public.user_grocery_items;

CREATE POLICY "Users can view own grocery items"
  ON public.user_grocery_items FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can create own grocery items"
  ON public.user_grocery_items FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own grocery items"
  ON public.user_grocery_items FOR UPDATE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own grocery items"
  ON public.user_grocery_items FOR DELETE
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- =====================================================
-- 13. OPTIMIZE RLS POLICIES - BLOCKED USERS
-- =====================================================

DROP POLICY IF EXISTS "Users can delete own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can insert own blocks" ON public.blocked_users;
DROP POLICY IF EXISTS "Users can view own blocks" ON public.blocked_users;

CREATE POLICY "Users can view own blocks"
  ON public.blocked_users FOR SELECT
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own blocks"
  ON public.blocked_users FOR INSERT
  TO authenticated
  WITH CHECK (blocker_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own blocks"
  ON public.blocked_users FOR DELETE
  TO authenticated
  USING (blocker_id = (SELECT auth.uid()));

-- =====================================================
-- 14. FIX FUNCTION SEARCH PATHS
-- =====================================================

-- Drop and recreate is_user_blocked
DROP FUNCTION IF EXISTS public.is_user_blocked(uuid);

CREATE FUNCTION public.is_user_blocked(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = auth.uid()
    AND blocked_id = target_user_id
  );
$$;

-- Drop and recreate am_i_blocked_by
DROP FUNCTION IF EXISTS public.am_i_blocked_by(uuid);

CREATE FUNCTION public.am_i_blocked_by(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1 FROM blocked_users
    WHERE blocker_id = target_user_id
    AND blocked_id = auth.uid()
  );
$$;

-- Fix update_updated_at_column
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;

CREATE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Fix update_amazon_products_updated_at
DROP FUNCTION IF EXISTS public.update_amazon_products_updated_at() CASCADE;

CREATE FUNCTION public.update_amazon_products_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers that were dropped
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'set_updated_at_posts'
  ) THEN
    CREATE TRIGGER set_updated_at_posts
      BEFORE UPDATE ON public.posts
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'update_amazon_products_updated_at_trigger'
  ) THEN
    CREATE TRIGGER update_amazon_products_updated_at_trigger
      BEFORE UPDATE ON public.amazon_products
      FOR EACH ROW
      EXECUTE FUNCTION update_amazon_products_updated_at();
  END IF;
END $$;
