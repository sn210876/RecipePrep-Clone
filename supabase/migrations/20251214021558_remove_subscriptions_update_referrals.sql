/*
  # Remove Subscriptions and Update Referral System

  ## Overview
  This migration removes the subscription and family code systems, making the app completely free.
  Updates the referral system from "3 referrals = 2 months free" to "10 referrals = $5 reward"

  ## Changes Made

  1. **New Tables**:
     - `referral_rewards`: Stores $5 payout requests and status
  
  2. **Modified Tables**:
     - `referral_codes`: Remove `years_earned`, add `rewards_claimed`
     - `referrals`: Update to track 10-referral milestones instead of 3
  
  3. **Removed Tables**:
     - `subscriptions`: No longer needed (app is free)
     - `family_codes`: No longer needed (everyone has free access)
  
  4. **New Functions**:
     - `check_referral_payout_eligibility()`: Check if user qualifies for $5
     - `request_referral_payout()`: User requests payout
     - `get_user_referral_stats()`: Get referral statistics
  
  5. **Removed Functions**:
     - `check_referral_rewards()`: Old subscription-based system
     - `generate_family_code()`: No longer needed
     - `use_family_code()`: No longer needed

  ## Security
  - All tables have RLS enabled
  - Users can only view/modify their own referral data
  - Admin functions for payout processing
*/

-- =====================================================
-- 1. DROP OLD SUBSCRIPTION SYSTEM
-- =====================================================

-- Drop old triggers first
DROP TRIGGER IF EXISTS set_updated_at ON public.subscriptions;
DROP TRIGGER IF EXISTS set_updated_at ON public.family_codes;

-- Drop old functions
DROP FUNCTION IF EXISTS check_referral_rewards(uuid);
DROP FUNCTION IF EXISTS generate_family_code(text);
DROP FUNCTION IF EXISTS use_family_code(uuid, text);

-- Drop old tables (CASCADE will remove dependent objects)
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.family_codes CASCADE;

-- =====================================================
-- 2. CREATE REFERRAL REWARDS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Reward details
  referral_count integer NOT NULL, -- Number of referrals at time of payout (should be 10, 20, 30, etc.)
  reward_amount numeric(10,2) NOT NULL DEFAULT 5.00, -- $5.00 per 10 referrals
  
  -- Payout status
  payout_status text NOT NULL DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed', 'cancelled')),
  
  -- Payout method
  payout_method text, -- 'paypal', 'venmo', 'bank_transfer', 'gift_card', etc.
  payout_email text,
  payout_details jsonb, -- Store payment-specific info (account numbers, etc.)
  
  -- Processing
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  paid_at timestamptz,
  
  -- Admin notes
  admin_notes text,
  failure_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_rewards_user_id ON public.referral_rewards(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_payout_status ON public.referral_rewards(payout_status);
CREATE INDEX IF NOT EXISTS idx_referral_rewards_requested_at ON public.referral_rewards(requested_at DESC);

-- =====================================================
-- 3. MODIFY REFERRAL_CODES TABLE
-- =====================================================

-- Remove old subscription-related column
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referral_codes' AND column_name = 'years_earned'
  ) THEN
    ALTER TABLE public.referral_codes DROP COLUMN years_earned;
  END IF;
END $$;

-- Add new payout tracking column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referral_codes' AND column_name = 'rewards_claimed'
  ) THEN
    ALTER TABLE public.referral_codes ADD COLUMN rewards_claimed integer DEFAULT 0;
  END IF;
END $$;

-- =====================================================
-- 4. MODIFY REFERRALS TABLE
-- =====================================================

-- Remove old batch tracking
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals' AND column_name = 'reward_batch'
  ) THEN
    ALTER TABLE public.referrals DROP COLUMN reward_batch;
  END IF;
END $$;

-- Add column to track which payout this referral counted towards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'referrals' AND column_name = 'payout_id'
  ) THEN
    ALTER TABLE public.referrals ADD COLUMN payout_id uuid REFERENCES public.referral_rewards(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_referrals_payout_id ON public.referrals(payout_id);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY FOR NEW TABLE
-- =====================================================

ALTER TABLE public.referral_rewards ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES - REFERRAL REWARDS
-- =====================================================

CREATE POLICY "Users can view own referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own referral rewards"
  ON public.referral_rewards FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all referral rewards"
  ON public.referral_rewards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can update referral rewards"
  ON public.referral_rewards FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = auth.uid()
    )
  );

-- =====================================================
-- 7. HELPER FUNCTIONS - NEW REFERRAL SYSTEM
-- =====================================================

-- Function to get user referral stats
CREATE OR REPLACE FUNCTION public.get_user_referral_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_result jsonb;
  v_total_referrals integer;
  v_completed_referrals integer;
  v_pending_referrals integer;
  v_total_rewards_claimed integer;
  v_unrewarded_referrals integer;
  v_eligible_for_payout boolean;
  v_next_payout_at integer;
  v_total_earned numeric;
BEGIN
  -- Count total referrals
  SELECT COUNT(*) INTO v_total_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id;
  
  -- Count completed referrals
  SELECT COUNT(*) INTO v_completed_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'completed';
  
  -- Count pending referrals
  SELECT COUNT(*) INTO v_pending_referrals
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'pending';
  
  -- Get rewards claimed count
  SELECT COALESCE(rewards_claimed, 0) INTO v_total_rewards_claimed
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  -- Calculate unrewarded referrals
  v_unrewarded_referrals := v_completed_referrals - (v_total_rewards_claimed * 10);
  
  -- Check if eligible for payout (10 or more unrewarded referrals)
  v_eligible_for_payout := v_unrewarded_referrals >= 10;
  
  -- Calculate next payout milestone
  v_next_payout_at := ((v_total_rewards_claimed + 1) * 10);
  
  -- Calculate total earned
  v_total_earned := v_total_rewards_claimed * 5.00;
  
  -- Build result JSON
  v_result := jsonb_build_object(
    'total_referrals', v_total_referrals,
    'completed_referrals', v_completed_referrals,
    'pending_referrals', v_pending_referrals,
    'unrewarded_referrals', v_unrewarded_referrals,
    'rewards_claimed', v_total_rewards_claimed,
    'eligible_for_payout', v_eligible_for_payout,
    'next_payout_at', v_next_payout_at,
    'total_earned', v_total_earned
  );
  
  RETURN v_result;
END;
$$;

-- Function to check payout eligibility
CREATE OR REPLACE FUNCTION public.check_referral_payout_eligibility(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_completed_count integer;
  v_rewarded_count integer;
  v_unrewarded_count integer;
BEGIN
  -- Count completed referrals
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'completed';
  
  -- Get rewards claimed count (each reward = 10 referrals)
  SELECT COALESCE(rewards_claimed, 0) INTO v_rewarded_count
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  -- Calculate unrewarded referrals
  v_unrewarded_count := v_completed_count - (v_rewarded_count * 10);
  
  -- Return true if user has 10 or more unrewarded referrals
  RETURN v_unrewarded_count >= 10;
END;
$$;

-- Function to request referral payout
CREATE OR REPLACE FUNCTION public.request_referral_payout(
  p_user_id uuid,
  p_payout_method text,
  p_payout_email text,
  p_payout_details jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_completed_count integer;
  v_rewarded_count integer;
  v_unrewarded_count integer;
  v_payouts_available integer;
  v_reward_id uuid;
  v_referral_ids uuid[];
BEGIN
  -- Check if user is authenticated
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  -- Count completed referrals
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'completed';
  
  -- Get rewards claimed count
  SELECT COALESCE(rewards_claimed, 0) INTO v_rewarded_count
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  -- Calculate unrewarded referrals
  v_unrewarded_count := v_completed_count - (v_rewarded_count * 10);
  
  -- Check if eligible (need at least 10 unrewarded referrals)
  IF v_unrewarded_count < 10 THEN
    RAISE EXCEPTION 'Not enough referrals. Need 10 completed referrals for payout.';
  END IF;
  
  -- Calculate how many $5 payouts user can claim
  v_payouts_available := v_unrewarded_count / 10;
  
  -- For now, only process one payout at a time
  -- In future, could allow claiming multiple at once
  
  -- Get the next 10 unrewarded referrals
  SELECT ARRAY_AGG(id) INTO v_referral_ids
  FROM (
    SELECT id FROM public.referrals
    WHERE referrer_id = p_user_id
      AND status = 'completed'
      AND reward_granted = false
    ORDER BY completed_at
    LIMIT 10
  ) sub;
  
  -- Create payout request
  INSERT INTO public.referral_rewards (
    user_id,
    referral_count,
    reward_amount,
    payout_status,
    payout_method,
    payout_email,
    payout_details,
    requested_at
  ) VALUES (
    p_user_id,
    (v_rewarded_count + 1) * 10, -- 10, 20, 30, etc.
    5.00,
    'pending',
    p_payout_method,
    p_payout_email,
    p_payout_details,
    now()
  )
  RETURNING id INTO v_reward_id;
  
  -- Mark these 10 referrals as rewarded
  UPDATE public.referrals
  SET 
    reward_granted = true,
    reward_granted_at = now(),
    payout_id = v_reward_id
  WHERE id = ANY(v_referral_ids);
  
  -- Increment rewards claimed counter
  UPDATE public.referral_codes
  SET 
    rewards_claimed = rewards_claimed + 1,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN v_reward_id;
END;
$$;

-- Function for admins to process payout
CREATE OR REPLACE FUNCTION public.admin_process_payout(
  p_reward_id uuid,
  p_new_status text,
  p_admin_notes text DEFAULT NULL,
  p_failure_reason text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_admin_id uuid;
BEGIN
  -- Check if user is admin
  SELECT user_id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only admins can process payouts';
  END IF;
  
  -- Validate status
  IF p_new_status NOT IN ('processing', 'paid', 'failed', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  
  -- Update payout
  UPDATE public.referral_rewards
  SET 
    payout_status = p_new_status,
    processed_at = CASE WHEN p_new_status IN ('processing', 'paid', 'failed', 'cancelled') THEN now() ELSE processed_at END,
    paid_at = CASE WHEN p_new_status = 'paid' THEN now() ELSE paid_at END,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    failure_reason = p_failure_reason,
    updated_at = now()
  WHERE id = p_reward_id;
  
  RETURN true;
END;
$$;

-- =====================================================
-- 8. TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.referral_rewards
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
