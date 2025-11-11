/*
  # Fix RLS Policies and Remove Unused Indexes

  1. Security Performance Improvements
    - Update RLS policies to use (select auth.uid()) instead of auth.uid()
    - This prevents re-evaluation of auth functions for each row
    - Significantly improves query performance at scale

  2. Index Optimization
    - Remove unused indexes that are not being utilized
    - Keep only the created_at index which is likely used for sorting

  3. Function Security
    - Fix set_user_number function to have immutable search_path

  4. Tables Affected
    - public_recipes: Update 2 policies, remove 3 unused indexes
    - user_tracking: Update 2 policies, remove 2 unused indexes
*/

-- Drop and recreate public_recipes policies with optimized auth calls
DROP POLICY IF EXISTS "Users can update their own recipes" ON public_recipes;
CREATE POLICY "Users can update their own recipes"
  ON public_recipes FOR UPDATE
  USING ((select auth.uid()) = user_id)
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own recipes" ON public_recipes;
CREATE POLICY "Users can delete their own recipes"
  ON public_recipes FOR DELETE
  USING ((select auth.uid()) = user_id);

-- Drop and recreate user_tracking policies with optimized auth calls
DROP POLICY IF EXISTS "Users can read own tracking data" ON user_tracking;
CREATE POLICY "Users can read own tracking data"
  ON user_tracking
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Service can insert tracking data" ON user_tracking;
CREATE POLICY "Service can insert tracking data"
  ON user_tracking
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

-- Remove unused indexes from public_recipes
DROP INDEX IF EXISTS idx_public_recipes_cuisine_type;
DROP INDEX IF EXISTS idx_public_recipes_difficulty;
DROP INDEX IF EXISTS idx_public_recipes_is_public;

-- Remove unused indexes from user_tracking
DROP INDEX IF EXISTS idx_user_tracking_user_id;
DROP INDEX IF EXISTS idx_user_tracking_email;

-- Fix function search_path mutability
DROP FUNCTION IF EXISTS set_user_number() CASCADE;
CREATE OR REPLACE FUNCTION set_user_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.user_number := nextval('user_number_seq');
  NEW.is_early_access := NEW.user_number <= 1000;
  RETURN NEW;
END;
$$;

-- Recreate trigger
DROP TRIGGER IF EXISTS set_user_number_trigger ON user_tracking;
CREATE TRIGGER set_user_number_trigger
  BEFORE INSERT ON user_tracking
  FOR EACH ROW
  EXECUTE FUNCTION set_user_number();