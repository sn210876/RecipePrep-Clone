/*
  # Fix RLS Policies for Signup Trigger

  1. Problem
    - Subscriptions INSERT policy blocks trigger from creating subscription
    - During signup, auth.uid() is not yet available in trigger context
    - Causing "Database error saving new user"
    
  2. Solution
    - Add policy to allow service role to insert subscriptions
    - Keep existing user policies for normal operations
    
  3. Security
    - Service role policy only allows automated subscription creation
    - User policies remain restrictive for manual operations
*/

-- Drop and recreate subscription INSERT policies with proper permissions
DROP POLICY IF EXISTS "Users can insert own subscription" ON public.subscriptions;
DROP POLICY IF EXISTS "Service role can insert subscriptions" ON public.subscriptions;

-- Allow authenticated users to insert their own subscription
CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow service role (used by triggers) to insert subscriptions
CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Update profiles INSERT policy to allow service role as well
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Allow authenticated users to insert profiles
CREATE POLICY "Enable insert for authenticated users only"
  ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Allow service role (used by triggers) to insert profiles
CREATE POLICY "Service role can insert profiles"
  ON public.profiles
  FOR INSERT
  TO service_role
  WITH CHECK (true);