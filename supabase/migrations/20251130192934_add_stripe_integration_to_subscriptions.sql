/*
  # Add Stripe Integration to Subscriptions

  1. Changes to subscriptions table
    - Add `stripe_customer_id` (text) - Stripe customer ID for payment management
    - Add `stripe_subscription_id` (text) - Stripe subscription ID for tracking
    - Add `stripe_price_id` (text) - Which Stripe price/product tier user selected
    - Add `payment_method_last4` (text) - Last 4 digits of card for display
    - Add `billing_cycle_anchor` (timestamptz) - When the billing cycle renews
    - Add `cancelled_at` (timestamptz) - When user cancelled (if applicable)

  2. New Table: payment_history
    - Track all payment events from Stripe webhooks
    - Columns: user_id, stripe_payment_intent_id, amount, status, created_at
    - Useful for admin tracking, user invoice history, and debugging

  3. Security
    - Enable RLS on payment_history table
    - Users can view their own payment history
    - Admins can view all payment history
*/

-- Add Stripe columns to subscriptions table
ALTER TABLE public.subscriptions
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS payment_method_last4 text,
ADD COLUMN IF NOT EXISTS billing_cycle_anchor timestamptz,
ADD COLUMN IF NOT EXISTS cancelled_at timestamptz;

-- Add indexes for Stripe lookups
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON public.subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON public.subscriptions(stripe_subscription_id);

-- Create payment_history table
CREATE TABLE IF NOT EXISTS public.payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Stripe IDs
  stripe_payment_intent_id text,
  stripe_invoice_id text,
  stripe_subscription_id text,
  
  -- Payment details
  amount integer NOT NULL, -- in cents
  currency text DEFAULT 'usd',
  status text NOT NULL CHECK (status IN ('succeeded', 'pending', 'failed', 'refunded')),
  
  -- Event metadata
  event_type text, -- checkout.session.completed, invoice.payment_succeeded, etc.
  failure_reason text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  processed_at timestamptz DEFAULT now()
);

-- Indexes for payment_history
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_payment ON public.payment_history(stripe_payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_status ON public.payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_history_created ON public.payment_history(created_at DESC);

-- Enable RLS on payment_history
ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own payment history
CREATE POLICY "Users can view own payment history"
  ON public.payment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all payment history
CREATE POLICY "Admins can view all payment history"
  ON public.payment_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Admins can insert payment records (for manual adjustments)
CREATE POLICY "Admins can insert payment history"
  ON public.payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_users
      WHERE admin_users.user_id = auth.uid()
    )
  );

-- Add comment for documentation
COMMENT ON TABLE public.payment_history IS 'Tracks all payment events from Stripe webhooks for auditing and user invoice history';