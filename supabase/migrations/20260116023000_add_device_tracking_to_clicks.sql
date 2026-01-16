/*
  # Add Device and Checkout Method Tracking

  1. Updates to Existing Tables
    - `amazon_service_clicks`
      - Add `checkout_method` (text) - tracks how user checked out (mobile_browser_forced, desktop_cart_api, etc.)
      - Add `device_type` (text) - mobile or desktop
      - Add `os` (text) - operating system (ios, android, windows, macos, linux)
      - Add `browser` (text) - browser used (safari, chrome, firefox, edge, samsung)

  2. Purpose
    - Track affiliate link effectiveness across different devices
    - Monitor which checkout methods preserve affiliate tracking
    - Analyze conversion rates by device/browser combination
    - Help optimize affiliate revenue

  3. Security
    - No RLS changes needed - existing policies cover new columns
*/

-- Add device and checkout tracking columns to amazon_service_clicks
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amazon_service_clicks' AND column_name = 'checkout_method'
  ) THEN
    ALTER TABLE amazon_service_clicks 
    ADD COLUMN checkout_method text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amazon_service_clicks' AND column_name = 'device_type'
  ) THEN
    ALTER TABLE amazon_service_clicks 
    ADD COLUMN device_type text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amazon_service_clicks' AND column_name = 'os'
  ) THEN
    ALTER TABLE amazon_service_clicks 
    ADD COLUMN os text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'amazon_service_clicks' AND column_name = 'browser'
  ) THEN
    ALTER TABLE amazon_service_clicks 
    ADD COLUMN browser text;
  END IF;
END $$;

-- Add indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_checkout_method 
  ON amazon_service_clicks(checkout_method);

CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_device_type 
  ON amazon_service_clicks(device_type);

CREATE INDEX IF NOT EXISTS idx_amazon_service_clicks_os 
  ON amazon_service_clicks(os);
