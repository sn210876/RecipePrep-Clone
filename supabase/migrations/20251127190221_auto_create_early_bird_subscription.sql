/*
  # Auto-Create Early Bird Subscriptions on Signup

  1. Purpose
    - Automatically create 6-month free trial subscription for all new users
    - Users signed up in first 1000 get early_bird status
    - Trial expires 6 months after signup

  2. Changes
    - Update handle_new_user() function to create subscription
    - Create subscription with trial_ends_at = now() + 6 months
    - Backfill existing users without subscriptions

  3. Early Bird Benefits
    - 6 months free trial
    - Full access to all features
    - After trial: choose payment amount (min $1/month)
*/

-- Update the handle_new_user function to also create subscription
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  -- Create early bird subscription (6 month trial)
  INSERT INTO public.subscriptions (
    user_id,
    subscription_type,
    status,
    trial_ends_at,
    expires_at,
    monthly_amount
  ) VALUES (
    NEW.id,
    'early_bird',
    'active',
    now() + interval '6 months',
    now() + interval '6 months',
    NULL
  )
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Backfill existing users without subscriptions
INSERT INTO public.subscriptions (
  user_id,
  subscription_type,
  status,
  trial_ends_at,
  expires_at,
  monthly_amount
)
SELECT
  id,
  'early_bird',
  'active',
  now() + interval '6 months',
  now() + interval '6 months',
  NULL
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM public.subscriptions)
ON CONFLICT (user_id) DO NOTHING;