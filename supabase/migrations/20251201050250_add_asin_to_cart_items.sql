/*
  # Add ASIN field to cart_items table

  ## Overview
  Adds ASIN (Amazon Standard Identification Number) field to cart_items table
  to support bulk Amazon cart checkout functionality.

  ## Changes
  1. Add asin column to cart_items table
  2. Add index for performance

  ## Important Notes
  - ASIN is optional (nullable) for backwards compatibility
  - When present, enables multi-item Amazon cart checkout
  - ASIN is 10-character Amazon product identifier
*/

-- Add ASIN column to cart_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'asin'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN asin text;
  END IF;
END $$;

-- Add index for ASIN lookups
CREATE INDEX IF NOT EXISTS idx_cart_items_asin ON cart_items(asin) WHERE asin IS NOT NULL;