/*
  # Add delivery service field to cart items

  1. Changes
    - Add `delivery_service` column to `cart_items` table
      - Type: text (amazon_fresh, amazon_grocery, whole_foods, amazon, instacart, manual)
      - Nullable: true (existing items don't have a service)
      - Default: null
    
  2. Purpose
    - Track which delivery service each cart item is intended for
    - Enable grouping and filtering cart items by service
    - Support separate checkout flows for different services
*/

-- Add delivery_service column to cart_items
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cart_items' AND column_name = 'delivery_service'
  ) THEN
    ALTER TABLE cart_items ADD COLUMN delivery_service text;
  END IF;
END $$;

-- Add index for filtering by delivery service
CREATE INDEX IF NOT EXISTS idx_cart_items_delivery_service 
  ON cart_items(delivery_service) 
  WHERE delivery_service IS NOT NULL;

-- Add index for user + service queries
CREATE INDEX IF NOT EXISTS idx_cart_items_user_service 
  ON cart_items(user_id, delivery_service) 
  WHERE delivery_service IS NOT NULL;
