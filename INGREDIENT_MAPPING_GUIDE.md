# Ingredient to Amazon Product Mapping Guide

## Problem Fixed

**Issue:** When sending ingredients from Meal Planner/Grocery List to Cart:
1. "all purpose flour" didn't sync to cart
2. Items without Amazon products were being added to cart (empty items)
3. "C all purpose flour" (with measurement prefix) wasn't matching

**Root Cause:** Three issues were found:
1. GroceryList.tsx was using wrong field names for cart_items table
2. GroceryList.tsx was adding ALL items instead of only ones with Amazon products
3. No ingredient mappings existed for "flour" variations (including with measurement prefixes)

## What Was Fixed

### 1. Fixed GroceryList.tsx Cart Insert

**Before (Wrong):**
```typescript
{
  user_id: userId,
  product_name: item.name,        // ❌ Wrong field
  quantity: `${qty} ${unit}`,     // ❌ Combined string
  affiliate_link: null,           // ❌ Wrong field
}
```

**After (Correct):**
```typescript
{
  user_id: userId,
  ingredient_name: item.name,     // ✅ Correct field
  quantity: item.quantity.toString(), // ✅ Separate
  unit: item.unit,                // ✅ Separate
  amazon_product_url: null,       // ✅ Correct field
  asin: null,                     // ✅ Added for bulk cart
}
```

### 2. Fixed handleSendToCart to Only Add Amazon Products

**Before (Added everything):**
```typescript
const cartItems = items.map(item => ({
  ingredient_name: item.name,
  // ... no Amazon product
}));
await supabase.from('cart_items').insert(cartItems);
```

**After (Only adds items with matching Amazon products):**
```typescript
for (const item of items) {
  const products = await findProductsForIngredient(item.name, 1);
  if (products.length > 0) {
    itemsToAdd.push({ product: products[0], ... });
  }
}
await bulkAddToCart(userId, itemsToAdd);
```

### 3. Added Ingredient Mappings for Flour

Added mappings to help the system find flour products:
- "all purpose flour" → King Arthur Organic All Purpose Flour
- "flour" → King Arthur Organic All Purpose Flour
- "all-purpose flour" → King Arthur Organic All Purpose Flour
- "ap flour" → King Arthur Organic All Purpose Flour
- "c all purpose flour" → King Arthur Organic All Purpose Flour (handles cup measurement)
- "cup all purpose flour" → King Arthur Organic All Purpose Flour
- "cups all purpose flour" → King Arthur Organic All Purpose Flour

## How Ingredient Matching Works

### Step 1: Check Mappings Table

System first looks in `ingredient_product_mappings`:
```sql
SELECT * FROM ingredient_product_mappings
WHERE ingredient_name = 'all purpose flour';
```

### Step 2: Fallback to Text Search

If no mapping found, searches `amazon_products`:
```sql
SELECT * FROM amazon_products
WHERE is_active = true
AND (
  product_name ILIKE '%all purpose flour%'
  OR 'all purpose flour' = ANY(search_keywords)
);
```

## Adding New Ingredient Mappings

### Method 1: SQL Insert (Recommended)

```sql
INSERT INTO ingredient_product_mappings (
  ingredient_name,
  amazon_product_id,
  confidence_score
) VALUES (
  'olive oil',
  'YOUR-PRODUCT-UUID-HERE',
  0.95
);
```

### Method 2: Via Supabase Dashboard

1. Go to Table Editor → ingredient_product_mappings
2. Click "Insert row"
3. Fill in:
   - `ingredient_name`: lowercase ingredient (e.g., "olive oil")
   - `amazon_product_id`: UUID from amazon_products table
   - `confidence_score`: 0.5 to 1.0 (higher = better match)

## Confidence Score Guide

- **0.95-1.0**: Exact match (e.g., "olive oil" → "Olive Oil Product")
- **0.85-0.94**: Very good match (e.g., "salt" → "Sea Salt")
- **0.70-0.84**: Good match (e.g., "flour" → "All-Purpose Flour")
- **0.50-0.69**: Acceptable match (e.g., "cheese" → "Cheddar Cheese")

## Common Ingredient Variations

When adding mappings, include common variations:

### Oils
```sql
INSERT INTO ingredient_product_mappings (ingredient_name, amazon_product_id, confidence_score) VALUES
  ('olive oil', 'product-id', 0.95),
  ('extra virgin olive oil', 'product-id', 0.98),
  ('evoo', 'product-id', 0.90),
  ('extra-virgin olive oil', 'product-id', 0.98);
```

### Sugar
```sql
INSERT INTO ingredient_product_mappings (ingredient_name, amazon_product_id, confidence_score) VALUES
  ('sugar', 'product-id', 0.90),
  ('white sugar', 'product-id', 0.95),
  ('granulated sugar', 'product-id', 0.95),
  ('cane sugar', 'product-id', 0.90);
```

### Salt
```sql
INSERT INTO ingredient_product_mappings (ingredient_name, amazon_product_id, confidence_score) VALUES
  ('salt', 'product-id', 0.90),
  ('table salt', 'product-id', 0.95),
  ('sea salt', 'product-id', 0.95),
  ('kosher salt', 'product-id', 0.90);
```

## Improving Search Keywords

Also add keywords to products for fallback search:

```sql
UPDATE amazon_products
SET search_keywords = ARRAY[
  'olive oil',
  'extra virgin',
  'evoo',
  'cooking oil',
  'salad oil'
]
WHERE id = 'product-id';
```

## Finding Product IDs

### Get product UUID from name:
```sql
SELECT id, product_name
FROM amazon_products
WHERE product_name ILIKE '%olive oil%';
```

### List all products in a category:
```sql
SELECT id, product_name, category_id
FROM amazon_products
WHERE category_id = 'oils'
AND is_active = true;
```

## Testing Ingredient Matching

Test if an ingredient will find a product:

```sql
-- Check for mapping
SELECT * FROM ingredient_product_mappings
WHERE ingredient_name = 'all purpose flour';

-- Check text search
SELECT product_name, search_keywords
FROM amazon_products
WHERE is_active = true
AND (
  product_name ILIKE '%all purpose flour%'
  OR 'all purpose flour' = ANY(search_keywords)
);
```

## Best Practices

1. **Use lowercase** for ingredient_name (system normalizes automatically)
2. **Include variations** (with hyphens, without, abbreviations)
3. **Set appropriate confidence scores** (exact matches = higher)
4. **Map common ingredients first** (flour, sugar, salt, oil, butter, etc.)
5. **Test in meal planner** after adding mappings
6. **Update search_keywords** on products for better fallback search

## Bulk Adding Common Mappings

Here's a template for adding multiple common ingredient mappings:

```sql
-- First, find your product IDs
SELECT id, product_name FROM amazon_products WHERE category_id = 'oils';
SELECT id, product_name FROM amazon_products WHERE category_id = 'baking';

-- Then add mappings (replace UUIDs with actual product IDs)
INSERT INTO ingredient_product_mappings (ingredient_name, amazon_product_id, confidence_score) VALUES
  -- Flour mappings
  ('all purpose flour', 'FLOUR-PRODUCT-UUID', 0.95),
  ('ap flour', 'FLOUR-PRODUCT-UUID', 0.90),
  ('flour', 'FLOUR-PRODUCT-UUID', 0.90),

  -- Oil mappings
  ('olive oil', 'OIL-PRODUCT-UUID', 0.95),
  ('evoo', 'OIL-PRODUCT-UUID', 0.90),

  -- Sugar mappings
  ('sugar', 'SUGAR-PRODUCT-UUID', 0.90),
  ('white sugar', 'SUGAR-PRODUCT-UUID', 0.95)
ON CONFLICT (ingredient_name, amazon_product_id) DO NOTHING;
```

## Monitoring

Check which ingredients are NOT finding products:

```sql
-- See recent cart additions without Amazon links
SELECT DISTINCT ingredient_name, COUNT(*) as times_added
FROM cart_items
WHERE amazon_product_url IS NULL
AND created_at > NOW() - INTERVAL '7 days'
GROUP BY ingredient_name
ORDER BY times_added DESC;
```

These are candidates for new mappings!
