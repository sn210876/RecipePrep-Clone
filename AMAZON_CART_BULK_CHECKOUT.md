# Amazon Bulk Cart Checkout Guide

## Overview

The "Buy All on Amazon" feature now adds multiple products to your Amazon cart in a single click, instead of opening each product in separate tabs.

## How It Works

### Smart Checkout Logic

When users click "Buy All on Amazon", the system:

1. **Groups items by ASIN availability:**
   - Items WITH ASINs → Added to Amazon cart via bulk URL
   - Items WITHOUT ASINs → Opened in individual tabs (fallback)

2. **Builds Amazon cart URL:**
   ```
   https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=B001&Quantity.1=2&ASIN.2=B002&Quantity.2=1&tag=mealscrape-20
   ```

3. **Opens one tab** with all items pre-loaded in Amazon cart
4. **Maintains affiliate tracking** with tag `mealscrape-20`

## Database Changes

### Added ASIN Field to cart_items

```sql
ALTER TABLE cart_items ADD COLUMN asin text;
```

- Stores Amazon Standard Identification Number (10 characters)
- Nullable for backwards compatibility
- Indexed for performance

## Adding Products with ASINs

### Finding ASIN from Amazon URL

Amazon URLs contain the ASIN after `/dp/`:

```
https://www.amazon.com/Product-Name/dp/B08EXAMPLE123/...
                                      ^^^^^^^^^^^^^^
                                         ASIN
```

### Example SQL Insert

```sql
INSERT INTO amazon_products (
  category_id,
  product_name,
  amazon_url,
  asin,
  price
) VALUES (
  'condiments',
  'Heinz Ketchup',
  'https://www.amazon.com/dp/B001ABC123?tag=mealscrape-20',
  'B001ABC123',
  4.99
);
```

## Code Changes

### 1. amazonProductService.ts

**Added:**
- `extractAsinFromUrl()` - Extracts ASIN from Amazon URLs
- ASIN field included when adding products to cart

### 2. CartEnhanced.tsx

**Updated:**
- `CartItem` interface now includes `asin` field
- `handleCheckout()` - Smart routing based on ASIN availability
- `buildAmazonCartUrl()` - Constructs bulk cart URL

**New behavior:**
```typescript
// Items with ASINs → Single bulk URL
const cartUrl = buildAmazonCartUrl(itemsWithAsin);
window.open(cartUrl, '_blank');

// Items without ASINs → Individual tabs (fallback)
itemsWithoutAsin.forEach(item => {
  window.open(item.amazon_product_url, '_blank');
});
```

## User Experience

### Before (Multiple Tabs)
- Click "Buy All on Amazon"
- Opens 5 separate tabs for 5 items
- User must add each item manually
- Poor mobile experience (popup blockers)

### After (Bulk Cart)
- Click "Buy All on Amazon"
- Opens 1 tab with all items in cart
- Ready to checkout immediately
- Works perfectly on mobile

## Limitations

1. **Requires ASIN:** Products must have valid ASINs
2. **Amazon restriction:** Max ~50 items per URL (practical limit)
3. **Session required:** User must be logged into Amazon
4. **Browser popups:** Some browsers may block the tab

## Best Practices

1. **Always include ASINs** when adding products to database
2. **Verify ASINs** are 10 characters (letters/numbers)
3. **Test affiliate tags** to ensure commission tracking
4. **Monitor cart success rates** via analytics

## Fallback Behavior

If a product doesn't have an ASIN:
- Opens individual product page in new tab
- User sees toast notification explaining the split
- Affiliate tag still applied

## Testing

### Test with Sample Products

```sql
-- Insert test products with ASINs
INSERT INTO amazon_products (category_id, product_name, amazon_url, asin, price) VALUES
  ('condiments', 'Test Ketchup', 'https://amazon.com/dp/B001TEST01', 'B001TEST01', 4.99),
  ('oils', 'Test Olive Oil', 'https://amazon.com/dp/B002TEST02', 'B002TEST02', 12.99);
```

### Expected Result

Click "Buy All on Amazon" → Single tab opens with both items in Amazon cart ready to purchase.

## Affiliate Tracking

All URLs include affiliate tag: `tag=mealscrape-20`

Format: `https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=B001&tag=mealscrape-20`

This ensures you receive commission on all purchases.
