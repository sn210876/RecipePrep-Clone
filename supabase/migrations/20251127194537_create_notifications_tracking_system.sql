/*
  # Create Notifications Tracking System

  1. Purpose
    - Track all notification attempts (emails and DMs)
    - Prevent duplicate notifications
    - Store notification history
    - Monitor delivery status

  2. New Tables
    - `notification_logs`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `notification_type` (text) - 'email' or 'dm'
      - `notification_category` (text) - 'trial_warning', 'trial_expired', 'grace_period', 'access_blocked', 'payment_confirmed'
      - `days_until_expiration` (integer) - Days remaining in trial (7, 6, 5...0, negative for past expiration)
      - `message_content` (text) - Content of notification
      - `status` (text) - 'sent', 'failed', 'pending'
      - `error_message` (text) - Error details if failed
      - `sent_at` (timestamptz)
      - `created_at` (timestamptz)

  3. Security
    - Enable RLS
    - Users can view their own notification history
    - Service role can manage all notifications
*/

CREATE TABLE IF NOT EXISTS public.notification_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  notification_type text NOT NULL CHECK (notification_type IN ('email', 'dm')),
  notification_category text NOT NULL CHECK (notification_category IN (
    'trial_warning',
    'trial_expired', 
    'grace_period',
    'access_blocked',
    'payment_confirmed'
  )),
  
  days_until_expiration integer,
  message_content text NOT NULL,
  
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('sent', 'failed', 'pending')),
  error_message text,
  
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_id ON public.notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_status ON public.notification_logs(status);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON public.notification_logs(sent_at);
CREATE INDEX IF NOT EXISTS idx_notification_logs_category ON public.notification_logs(notification_category);

-- Composite index for querying
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_type_day ON public.notification_logs(
  user_id, 
  notification_type, 
  notification_category,
  days_until_expiration,
  sent_at
) WHERE status = 'sent';

-- Enable RLS
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notification history
CREATE POLICY "Users can view own notification logs"
  ON public.notification_logs
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Service role can insert notifications (for edge functions)
CREATE POLICY "Service can insert notifications"
  ON public.notification_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Service can update notifications  
CREATE POLICY "Service can update notifications"
  ON public.notification_logs
  FOR UPDATE
  TO authenticated
  USING (true);

-- Helper function to check if notification was recently sent
CREATE OR REPLACE FUNCTION public.was_notification_sent_today(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_days_until integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.notification_logs
    WHERE user_id = p_user_id
      AND notification_type = p_type
      AND notification_category = p_category
      AND days_until_expiration = p_days_until
      AND sent_at > now() - interval '24 hours'
      AND status = 'sent'
  );
END;
$$;

-- Function to log notification attempt
CREATE OR REPLACE FUNCTION public.log_notification(
  p_user_id uuid,
  p_type text,
  p_category text,
  p_days_until integer,
  p_message text,
  p_status text DEFAULT 'sent',
  p_error text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_log_id uuid;
BEGIN
  INSERT INTO public.notification_logs (
    user_id,
    notification_type,
    notification_category,
    days_until_expiration,
    message_content,
    status,
    error_message,
    sent_at
  ) VALUES (
    p_user_id,
    p_type,
    p_category,
    p_days_until,
    p_message,
    p_status,
    p_error,
    CASE WHEN p_status = 'sent' THEN now() ELSE NULL END
  )
  RETURNING id INTO v_log_id;
  
  RETURN v_log_id;
END;
$$;