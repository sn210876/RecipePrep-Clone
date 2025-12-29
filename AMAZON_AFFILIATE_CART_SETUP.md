# Amazon Affiliate Shopping Cart - Implementation Guide

## Overview
Your cart page now features a complete Amazon affiliate product catalog system with intelligent ingredient-to-product matching, allowing users to browse and purchase kitchen staples directly through Amazon with your affiliate links.

**Amazon Affiliate Tag:** `mealscrape-20`

---

## What's Been Implemented

### 1. Database Tables Created ✅

#### `product_categories`
- Stores product categories (Condiments, Oils, Spices, etc.)
- Each category has an icon, color, and sort order for UI
- 10 default categories pre-populated

#### `amazon_products`
- Complete product catalog with 30+ starter products
- Fields: product_name, amazon_url (with affiliate tag), price, image_url, ASIN, brand, package_size
- Includes search keywords for intelligent matching
- Prime eligibility flag
- 30 starter products across all categories added

#### `ingredient_product_mappings`
- Maps grocery list ingredients to Amazon products
- Confidence scoring for match quality
- Allows custom mappings for better recommendations

### 2. Amazon Product Service (`/src/services/amazonProductService.ts`) ✅

**Key Functions:**
- `getAllProductCategories()` - Get all product categories
- `getProductsByCategory(categoryId)` - Get products by category
- `searchProducts(query, categoryId?)` - Search products with filters
- `findProductsForIngredient(ingredientName)` - Smart ingredient matching
- `addProductToCart(userId, product, quantity, unit)` - Add product to cart
- `appendAffiliateTag(url)` - Ensures all URLs have affiliate tag

### 3. Enhanced Cart Page (`/src/pages/CartEnhanced.tsx`) ✅

**New Features:**
- **Product Catalog Browser** - Browse 30+ Amazon products by category
- **Search & Filter** - Find products by name or category
- **Quick Add to Cart** - One-click add products from catalog
- **Product Cards** - Shows price, Prime badge, package size, brand
- **View on Amazon** - Direct links with affiliate tag
- **Buy All on Amazon** - Opens all cart items in separate tabs
- **Estimated Total** - Shows total price of cart items

**UI Highlights:**
- Clean, organized product grid (2-4 columns responsive)
- Category selector with icons
- Search bar for quick product lookup
- Collapsible catalog section
- Mobile-optimized design

### 4. Grocery List Integration (`/src/pages/GroceryList.tsx`) ✅

**New Features:**
- **Shopping Bag Icon** next to each grocery item
- **Click to Select Product** - Opens product selector dialog
- **Smart Product Matching** - Finds relevant Amazon products for each ingredient
- **Product Selector Dialog** - Shows 3-5 product suggestions with images, prices, and Prime badge
- **One-Click Add** - Select product and add to cart instantly

### 5. Product Selector Component (`/src/components/ProductSelectorDialog.tsx`) ✅

**Features:**
- Shows top 5 product matches for any ingredient
- Displays product images, prices, brand, package size
- Prime eligibility badge
- "View on Amazon" link
- Radio selection interface
- Fallback when no matches found

---

## Starter Products Included (30 Products)

### Condiments & Sauces (5)
- Heinz Tomato Ketchup
- French's Yellow Mustard
- Kikkoman Soy Sauce
- Tabasco Original Red Sauce
- Hellmann's Real Mayonnaise

### Oils & Vinegars (4)
- Filippo Berio Extra Virgin Olive Oil
- Crisco Pure Vegetable Oil
- Heinz Distilled White Vinegar
- Pompeian Grapeseed Oil

### Herbs & Spices (6)
- Morton Salt
- McCormick Black Pepper
- McCormick Garlic Powder
- McCormick Oregano Leaves
- McCormick Ground Cumin
- McCormick Paprika

### Baking Supplies (6)
- Gold Medal All Purpose Flour
- Domino Pure Cane Sugar
- C&H Light Brown Sugar
- Clabber Girl Baking Powder
- Arm & Hammer Baking Soda
- McCormick Pure Vanilla Extract

### Canned & Jarred (4)
- Hunt's Tomato Sauce (12-pack)
- Bush's Best Black Beans (12-pack)
- Campbell's Chicken Broth (12-pack)
- Del Monte Corn (12-pack)

### Grains & Pasta (4)
- Uncle Ben's Long Grain Rice
- Barilla Spaghetti Pasta
- Quaker Oats Old Fashioned
- Lundberg Organic Quinoa

---

## How It Works

### User Flow 1: Browse and Add from Cart Page
1. User goes to Cart page
2. Sees product catalog at top
3. Can search or filter by category
4. Clicks "Add" on any product
5. Product added to cart instantly with affiliate link

### User Flow 2: Add from Grocery List
1. User has items in grocery list (from meal planner or manual entry)
2. Clicks shopping bag icon next to any item
3. Product selector shows 3-5 relevant Amazon products
4. User selects preferred product
5. Product added to cart with correct quantity/unit

### User Flow 3: Checkout
1. User clicks "Buy All on Amazon" button
2. System opens each product in a new tab with affiliate link
3. User completes purchase on Amazon
4. You earn affiliate commission

---

## Adding More Products (For Admins)

### Via Supabase SQL Editor

```sql
INSERT INTO amazon_products (
  category_id,
  product_name,
  description,
  amazon_url,
  asin,
  price,
  brand,
  package_size,
  is_prime,
  search_keywords
) VALUES (
  'condiments',
  'Sriracha Hot Sauce',
  'Authentic Thai hot sauce',
  'https://www.amazon.com/dp/B00EXAMPLE?tag=mealscrape-20',
  'B00EXAMPLE',
  4.99,
  'Huy Fong',
  '17 oz',
  true,
  ARRAY['sriracha', 'hot sauce', 'spicy', 'asian']
);
```

### Product Fields Explained
- `category_id` - Must match a category in product_categories table
- `product_name` - Display name
- `amazon_url` - **MUST include ?tag=mealscrape-20**
- `asin` - Amazon Standard Identification Number (from product URL)
- `price` - Current price (update periodically)
- `is_prime` - true/false for Prime eligibility
- `search_keywords` - Array of keywords for matching

---

## Creating Ingredient Mappings

To improve product suggestions for specific ingredients:

```sql
INSERT INTO ingredient_product_mappings (
  ingredient_name,
  amazon_product_id,
  confidence_score
) VALUES (
  'soy sauce',
  '(select id from amazon_products where product_name = ''Kikkoman Soy Sauce'')',
  0.95
);
```

**Confidence Scores:**
- `0.9-1.0` - Exact match
- `0.7-0.9` - Very good match
- `0.5-0.7` - Good match
- `<0.5` - Weak match

---

## Revenue Tracking

### Amazon Associates Dashboard
1. Visit: https://affiliate-program.amazon.com
2. Login with your Amazon Associates account
3. View Reports → Earnings
4. Track clicks, conversions, and commissions

### Link Verification
All links automatically include `?tag=mealscrape-20`. To verify:
1. Open any product link from cart
2. Check URL contains `tag=mealscrape-20`
3. Amazon will track the referral

---

## Next Steps & Enhancements

### Immediate Tasks
- [ ] Test cart functionality with real user account
- [ ] Add more products to each category
- [ ] Create ingredient mappings for common items

### Future Enhancements
- [ ] Add meal planner "Sync to Cart" button (batch add ingredients)
- [ ] Product image optimization
- [ ] Price tracking and updates
- [ ] Amazon Product Advertising API integration
- [ ] Bulk product import via CSV
- [ ] User product ratings and reviews
- [ ] "Frequently Bought Together" suggestions

---

## Important Notes

### Affiliate Compliance
- All product links include your affiliate tag automatically
- Amazon requires disclosure: Add text like "As an Amazon Associate, we earn from qualifying purchases"
- Update prices periodically (Amazon prices change)

### Product Maintenance
- Review and update product availability quarterly
- Remove discontinued products
- Update prices to match current Amazon pricing
- Add seasonal/trending products

### Security
- RLS policies ensure users can only modify their own carts
- Products are publicly readable (no auth required for browsing)
- Only admins can add/edit products

---

## Troubleshooting

### Products Not Showing
```sql
-- Check if products exist
SELECT * FROM amazon_products WHERE is_active = true LIMIT 10;

-- Check categories
SELECT * FROM product_categories;
```

### Affiliate Links Not Working
- Verify tag is in URL: Check URL contains `?tag=mealscrape-20`
- Test link in incognito window
- Check Amazon Associates dashboard for clicks

### Product Matching Not Working
```sql
-- Add manual mapping
INSERT INTO ingredient_product_mappings (ingredient_name, amazon_product_id, confidence_score)
VALUES ('olive oil', (SELECT id FROM amazon_products WHERE product_name = 'Filippo Berio Extra Virgin Olive Oil'), 0.9);
```

---

## Testing Checklist

- [ ] Browse products in cart page
- [ ] Search for products works
- [ ] Filter by category works
- [ ] Add product to cart from catalog
- [ ] Add product to cart from grocery list
- [ ] Product selector shows relevant products
- [ ] Affiliate links contain mealscrape-20 tag
- [ ] Buy All on Amazon opens correct products
- [ ] Cart total calculates correctly
- [ ] Mobile responsive design works

---

## Support & Resources

- **Amazon Associates Help:** https://affiliate-program.amazon.com/help
- **Product Advertising API:** https://webservices.amazon.com/paapi5/documentation/
- **Supabase Dashboard:** Your project dashboard for database management

---

*Implementation Complete - Ready for Testing!* 🎉
