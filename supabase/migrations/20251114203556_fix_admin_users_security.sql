/*
  # Fix Admin Users Table Security

  ## Overview
  Fixes critical security vulnerability in admin_users table and adds missing role column.
  
  ## Changes

  ### 1. Schema Updates
  - Add `role` column with default value 'admin'
  - Add index on user_id for query performance

  ### 2. Security Fixes
  - **CRITICAL**: Drop insecure policy that allows anyone to read all admin records
  - Create restrictive policy: users can ONLY read their own admin record
  - Ensure only service_role can insert/update/delete (enforced by RLS - no policies for these operations)

  ### 3. RLS Policies
  - SELECT: Users can read ONLY their own record (user_id = auth.uid())
  - INSERT/UPDATE/DELETE: No policies (only service_role can perform these operations)

  ## Security Impact
  - **BEFORE**: Any authenticated user could read ALL admin records (INSECURE)
  - **AFTER**: Users can only read their own admin status (SECURE)
  - Only backend (service_role) can modify admin_users table
*/

-- =====================================================
-- PART 1: Add Missing Role Column
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' 
    AND table_name = 'admin_users' 
    AND column_name = 'role'
  ) THEN
    ALTER TABLE public.admin_users 
    ADD COLUMN role text NOT NULL DEFAULT 'admin';
  END IF;
END $$;

-- =====================================================
-- PART 2: Add Performance Index
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_admin_users_user_id 
ON public.admin_users(user_id);

-- =====================================================
-- PART 3: Fix RLS Policies
-- =====================================================

-- Drop the insecure policy that allows anyone to read all admin records
DROP POLICY IF EXISTS "Anyone can check if user is admin" ON public.admin_users;

-- Create secure policy: users can ONLY read their own admin record
CREATE POLICY "Users can read own admin record"
  ON public.admin_users FOR SELECT
  TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- Note: No INSERT/UPDATE/DELETE policies are created
-- This means only service_role can perform these operations
-- Regular authenticated users cannot insert, update, or delete any records
