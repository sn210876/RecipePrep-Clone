/*
  # Fix track_referral_signup Function
  
  ## Problem
  - The track_referral_signup function calls check_referral_rewards which was removed
  - This causes referral tracking to fail during signup
  - Users who sign up with referral codes don't get tracked
  
  ## Solution
  - Update track_referral_signup to remove the call to check_referral_rewards
  - The new referral system uses manual payout requests instead of automatic rewards
  
  ## Changes
  1. Replace track_referral_signup function without check_referral_rewards call
  2. Referrals are tracked as 'completed' immediately
  3. Users can request payouts manually when they reach 10 referrals
*/

-- Replace the track_referral_signup function
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
    RAISE WARNING 'Referral code not found: %', p_referral_code;
    RETURN false;
  END IF;
  
  -- Don't let users refer themselves
  IF v_referrer_id = p_user_id THEN
    RAISE WARNING 'User cannot refer themselves: %', p_user_id;
    RETURN false;
  END IF;
  
  -- Check if referral already exists (prevent duplicates)
  IF EXISTS (
    SELECT 1 FROM public.referrals
    WHERE referrer_id = v_referrer_id 
    AND referred_user_id = p_user_id
  ) THEN
    RAISE WARNING 'Referral already exists for user: %', p_user_id;
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
  
  RAISE NOTICE 'Referral tracked successfully for user % with referrer %', p_user_id, v_referrer_id;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error tracking referral: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
    RETURN false;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.track_referral_signup(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.track_referral_signup(uuid, text) TO authenticated;
