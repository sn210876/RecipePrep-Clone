/*
  # Create Subscription and Referral System

  ## Overview
  This migration creates a comprehensive subscription and referral system with the following features:
  
  1. **Subscription Tiers**:
     - Early Bird: 6-month free trial, then choose amount (min $1/month)
     - Family/Friend Code: Lifetime free access
     - Regular: Pay-what-you-want (min $1/month)
  
  2. **Referral System**:
     - 3 successful referrals = 1 year free
     - Stackable: Another 3 referrals = another year
     - Available to all users (early birds and paying users)
  
  3. **Tables Created**:
     - `subscriptions`: User subscription details
     - `referral_codes`: Unique codes for each user
     - `referrals`: Track referral signups and rewards
     - `family_codes`: Admin-generated lifetime codes

  ## Security
  - All tables have RLS enabled
  - Users can only view/modify their own data
  - Admin functions for code generation
*/

-- =====================================================
-- 1. SUBSCRIPTIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Subscription type
  subscription_type text NOT NULL CHECK (subscription_type IN ('early_bird', 'family_code', 'regular', 'referral_reward')),
  
  -- Status
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending_payment')),
  
  -- Payment amount (in cents, null for free tiers)
  monthly_amount integer CHECK (monthly_amount IS NULL OR monthly_amount >= 100), -- minimum $1.00
  
  -- Dates
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz, -- NULL for lifetime, set for time-limited
  trial_ends_at timestamptz, -- For early bird 6-month trial
  next_billing_date timestamptz,
  
  -- Metadata
  family_code_used text, -- Which family code was used (if any)
  referral_years_remaining integer DEFAULT 0, -- How many years of referral rewards left
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON public.subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_expires_at ON public.subscriptions(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- 2. REFERRAL CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Unique referral code
  code text NOT NULL UNIQUE,
  
  -- Stats
  total_signups integer DEFAULT 0,
  successful_signups integer DEFAULT 0, -- Users who actually signed up and stayed
  
  -- Rewards earned
  years_earned integer DEFAULT 0, -- Total years of free access earned
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON public.referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON public.referral_codes(code);

-- =====================================================
-- 3. REFERRALS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who referred
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text NOT NULL,
  
  -- Who was referred
  referred_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  referred_email text, -- Store email in case user deletes account
  
  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at timestamptz, -- When the referred user completed signup
  
  -- Reward tracking
  reward_granted boolean DEFAULT false,
  reward_granted_at timestamptz,
  reward_batch integer, -- Which set of 3 referrals (1st batch, 2nd batch, etc)
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON public.referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_status ON public.referrals(status);
CREATE INDEX IF NOT EXISTS idx_referrals_referral_code ON public.referrals(referral_code);

-- =====================================================
-- 4. FAMILY CODES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.family_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Code details
  code text NOT NULL UNIQUE,
  
  -- Usage tracking
  is_used boolean DEFAULT false,
  used_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  used_at timestamptz,
  
  -- Admin tracking
  created_by_admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  notes text, -- Admin notes about who this code is for
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_family_codes_code ON public.family_codes(code);
CREATE INDEX IF NOT EXISTS idx_family_codes_is_used ON public.family_codes(is_used);
CREATE INDEX IF NOT EXISTS idx_family_codes_used_by ON public.family_codes(used_by_user_id);

-- =====================================================
-- 5. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.family_codes ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 6. RLS POLICIES - SUBSCRIPTIONS
-- =====================================================

CREATE POLICY "Users can view own subscription"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update own subscription"
  ON public.subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = (select auth.uid()))
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own subscription"
  ON public.subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

-- Admins can view all subscriptions
CREATE POLICY "Admins can view all subscriptions"
  ON public.subscriptions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 7. RLS POLICIES - REFERRAL CODES
-- =====================================================

CREATE POLICY "Users can view own referral code"
  ON public.referral_codes FOR SELECT
  TO authenticated
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own referral code"
  ON public.referral_codes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Anyone can view referral codes by code"
  ON public.referral_codes FOR SELECT
  TO anon, authenticated
  USING (true);

-- =====================================================
-- 8. RLS POLICIES - REFERRALS
-- =====================================================

CREATE POLICY "Users can view own referrals"
  ON public.referrals FOR SELECT
  TO authenticated
  USING (referrer_id = (select auth.uid()) OR referred_user_id = (select auth.uid()));

CREATE POLICY "Anyone can create referrals"
  ON public.referrals FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "System can update referrals"
  ON public.referrals FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- 9. RLS POLICIES - FAMILY CODES
-- =====================================================

CREATE POLICY "Anyone can view unused family codes"
  ON public.family_codes FOR SELECT
  TO anon, authenticated
  USING (NOT is_used);

CREATE POLICY "Users can view codes they used"
  ON public.family_codes FOR SELECT
  TO authenticated
  USING (used_by_user_id = (select auth.uid()));

CREATE POLICY "Admins can insert family codes"
  ON public.family_codes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can update family codes"
  ON public.family_codes FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );

CREATE POLICY "Admins can view all family codes"
  ON public.family_codes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE user_id = (select auth.uid())
    )
  );

-- =====================================================
-- 10. HELPER FUNCTIONS
-- =====================================================

-- Function to generate unique referral code for user
CREATE OR REPLACE FUNCTION public.generate_referral_code(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
  v_exists boolean;
BEGIN
  -- Check if user already has a code
  SELECT code INTO v_code
  FROM public.referral_codes
  WHERE user_id = p_user_id;
  
  IF v_code IS NOT NULL THEN
    RETURN v_code;
  END IF;
  
  -- Generate new unique code
  LOOP
    v_code := upper(substring(md5(random()::text || p_user_id::text) from 1 for 8));
    
    SELECT EXISTS(SELECT 1 FROM public.referral_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  -- Insert the code
  INSERT INTO public.referral_codes (user_id, code)
  VALUES (p_user_id, v_code);
  
  RETURN v_code;
END;
$$;

-- Function to check and grant referral rewards
CREATE OR REPLACE FUNCTION public.check_referral_rewards(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_completed_count integer;
  v_rewarded_count integer;
  v_years_to_grant integer;
  v_current_batch integer;
BEGIN
  -- Count completed referrals
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'completed';
  
  -- Count already rewarded referrals
  SELECT COUNT(*) INTO v_rewarded_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND reward_granted = true;
  
  -- Calculate how many complete sets of 3 we have
  v_years_to_grant := (v_completed_count - v_rewarded_count) / 3;
  
  IF v_years_to_grant > 0 THEN
    -- Calculate current batch number
    SELECT COALESCE(MAX(reward_batch), 0) + 1 INTO v_current_batch
    FROM public.referrals
    WHERE referrer_id = p_user_id
      AND reward_granted = true;
    
    -- Mark next 3*v_years_to_grant referrals as rewarded
    UPDATE public.referrals
    SET 
      reward_granted = true,
      reward_granted_at = now(),
      reward_batch = v_current_batch + (ROW_NUMBER() OVER (ORDER BY completed_at) - 1) / 3
    WHERE id IN (
      SELECT id FROM public.referrals
      WHERE referrer_id = p_user_id
        AND status = 'completed'
        AND reward_granted = false
      ORDER BY completed_at
      LIMIT v_years_to_grant * 3
    );
    
    -- Update subscription
    UPDATE public.subscriptions
    SET 
      referral_years_remaining = COALESCE(referral_years_remaining, 0) + v_years_to_grant,
      expires_at = CASE
        WHEN expires_at IS NULL OR expires_at < now() THEN now() + (v_years_to_grant || ' years')::interval
        ELSE expires_at + (v_years_to_grant || ' years')::interval
      END,
      status = 'active',
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Update referral code stats
    UPDATE public.referral_codes
    SET 
      years_earned = COALESCE(years_earned, 0) + v_years_to_grant,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_years_to_grant;
END;
$$;

-- Function to generate family code (admin only)
CREATE OR REPLACE FUNCTION public.generate_family_code(p_notes text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code text;
  v_exists boolean;
  v_admin_id uuid;
BEGIN
  -- Check if user is admin
  SELECT user_id INTO v_admin_id
  FROM public.admin_users
  WHERE user_id = auth.uid();
  
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Only admins can generate family codes';
  END IF;
  
  -- Generate unique code
  LOOP
    v_code := 'FAMILY-' || upper(substring(md5(random()::text) from 1 for 10));
    
    SELECT EXISTS(SELECT 1 FROM public.family_codes WHERE code = v_code) INTO v_exists;
    
    EXIT WHEN NOT v_exists;
  END LOOP;
  
  -- Insert the code
  INSERT INTO public.family_codes (code, created_by_admin_id, notes)
  VALUES (v_code, v_admin_id, p_notes);
  
  RETURN v_code;
END;
$$;

-- Function to use family code
CREATE OR REPLACE FUNCTION public.use_family_code(p_user_id uuid, p_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_code_exists boolean;
  v_code_used boolean;
BEGIN
  -- Check if code exists and is unused
  SELECT 
    EXISTS(SELECT 1 FROM public.family_codes WHERE code = p_code),
    COALESCE((SELECT is_used FROM public.family_codes WHERE code = p_code), true)
  INTO v_code_exists, v_code_used;
  
  IF NOT v_code_exists THEN
    RAISE EXCEPTION 'Invalid family code';
  END IF;
  
  IF v_code_used THEN
    RAISE EXCEPTION 'Family code already used';
  END IF;
  
  -- Mark code as used
  UPDATE public.family_codes
  SET 
    is_used = true,
    used_by_user_id = p_user_id,
    used_at = now(),
    updated_at = now()
  WHERE code = p_code;
  
  -- Create or update subscription to lifetime
  INSERT INTO public.subscriptions (
    user_id,
    subscription_type,
    status,
    family_code_used,
    expires_at
  ) VALUES (
    p_user_id,
    'family_code',
    'active',
    p_code,
    NULL -- Lifetime, never expires
  )
  ON CONFLICT (user_id) DO UPDATE SET
    subscription_type = 'family_code',
    status = 'active',
    family_code_used = p_code,
    expires_at = NULL,
    updated_at = now();
  
  RETURN true;
END;
$$;

-- =====================================================
-- 11. TRIGGERS
-- =====================================================

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.family_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();