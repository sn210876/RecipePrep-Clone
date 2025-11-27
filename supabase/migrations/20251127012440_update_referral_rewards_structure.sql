/*
  # Update Referral Rewards Structure

  1. Changes
    - Update reward system: 3 referrals = 2 months free (not 1 year)
    - Add 50 referrals = lifetime free
    - Update check_referral_rewards function
    - Add referral tracking on signup

  2. New Logic
    - Every 3 completed referrals = 2 months added
    - At 50 total referrals = convert to lifetime (family_code type)
    - Track referrals properly during signup
*/

-- Update the check_referral_rewards function with new logic
CREATE OR REPLACE FUNCTION public.check_referral_rewards(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_completed_count integer;
  v_rewarded_count integer;
  v_rewards_to_grant integer;
  v_current_batch integer;
  v_months_to_add integer;
BEGIN
  -- Count completed referrals
  SELECT COUNT(*) INTO v_completed_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND status = 'completed';
  
  -- Check if user hit 50 referrals for lifetime
  IF v_completed_count >= 50 THEN
    -- Check if they already have lifetime
    IF NOT EXISTS (
      SELECT 1 FROM public.subscriptions 
      WHERE user_id = p_user_id 
      AND subscription_type = 'referral_lifetime'
    ) THEN
      -- Grant lifetime access
      INSERT INTO public.subscriptions (
        user_id,
        subscription_type,
        status,
        expires_at
      ) VALUES (
        p_user_id,
        'referral_lifetime',
        'active',
        NULL
      )
      ON CONFLICT (user_id) DO UPDATE SET
        subscription_type = 'referral_lifetime',
        status = 'active',
        expires_at = NULL,
        updated_at = now();
      
      -- Mark all referrals as rewarded
      UPDATE public.referrals
      SET reward_granted = true
      WHERE referrer_id = p_user_id;
      
      RETURN -1; -- Special code for lifetime
    END IF;
  END IF;
  
  -- Count already rewarded referrals
  SELECT COUNT(*) INTO v_rewarded_count
  FROM public.referrals
  WHERE referrer_id = p_user_id
    AND reward_granted = true;
  
  -- Calculate how many complete sets of 3 we have
  v_rewards_to_grant := (v_completed_count - v_rewarded_count) / 3;
  
  IF v_rewards_to_grant > 0 THEN
    -- Each reward is 2 months
    v_months_to_add := v_rewards_to_grant * 2;
    
    -- Calculate current batch number
    SELECT COALESCE(MAX(reward_batch), 0) + 1 INTO v_current_batch
    FROM public.referrals
    WHERE referrer_id = p_user_id
      AND reward_granted = true;
    
    -- Mark next 3*v_rewards_to_grant referrals as rewarded
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
      LIMIT v_rewards_to_grant * 3
    );
    
    -- Update subscription with months (not years)
    UPDATE public.subscriptions
    SET 
      referral_years_remaining = COALESCE(referral_years_remaining, 0),
      expires_at = CASE
        WHEN expires_at IS NULL OR expires_at < now() 
        THEN now() + (v_months_to_add || ' months')::interval
        ELSE expires_at + (v_months_to_add || ' months')::interval
      END,
      status = 'active',
      updated_at = now()
    WHERE user_id = p_user_id;
    
    -- Update referral code stats (store months earned, not years)
    UPDATE public.referral_codes
    SET 
      years_earned = COALESCE(years_earned, 0) + v_rewards_to_grant,
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_rewards_to_grant;
END;
$$;

-- Function to track referral on signup
CREATE OR REPLACE FUNCTION public.track_referral_signup(p_user_id uuid, p_referral_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_referrer_id uuid;
BEGIN
  -- Get referrer from code
  SELECT user_id INTO v_referrer_id
  FROM public.referral_codes
  WHERE code = p_referral_code;
  
  IF v_referrer_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Don't let users refer themselves
  IF v_referrer_id = p_user_id THEN
    RETURN false;
  END IF;
  
  -- Create referral record
  INSERT INTO public.referrals (
    referrer_id,
    referral_code,
    referred_user_id,
    referred_email,
    status,
    completed_at
  ) VALUES (
    v_referrer_id,
    p_referral_code,
    p_user_id,
    (SELECT email FROM auth.users WHERE id = p_user_id),
    'completed',
    now()
  );
  
  -- Update referral code stats
  UPDATE public.referral_codes
  SET 
    total_signups = total_signups + 1,
    successful_signups = successful_signups + 1,
    updated_at = now()
  WHERE user_id = v_referrer_id;
  
  -- Check and grant rewards
  PERFORM public.check_referral_rewards(v_referrer_id);
  
  RETURN true;
END;
$$;

-- Add column for tracking months instead of years (keep name for compatibility)
-- The column will now represent "reward sets earned" where each set = 2 months
COMMENT ON COLUMN public.subscriptions.referral_years_remaining IS 'Number of reward sets earned (each set = 2 months)';

-- Add new subscription type for referral lifetime
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'subscriptions_subscription_type_check'
  ) THEN
    ALTER TABLE public.subscriptions
    DROP CONSTRAINT IF EXISTS subscriptions_subscription_type_check;
  END IF;
END $$;

ALTER TABLE public.subscriptions
DROP CONSTRAINT IF EXISTS subscriptions_subscription_type_check;

ALTER TABLE public.subscriptions
ADD CONSTRAINT subscriptions_subscription_type_check 
CHECK (subscription_type IN ('early_bird', 'family_code', 'regular', 'referral_reward', 'referral_lifetime'));
