# Amazon Product Advertising API Setup Guide

## Overview

The MealScrape app currently uses a curated product catalog with Amazon affiliate links. This guide explains how to optionally integrate the Amazon Product Advertising API for dynamic product data.

## Current Implementation

### What's Already Working

1. **Static Product Catalog**: 30+ curated kitchen products across 10 categories
2. **Affiliate Links**: All products include the `mealscrape-20` affiliate tag
3. **Smart Matching**: Ingredients automatically match to relevant products
4. **Cart Integration**: One-click add to cart from grocery lists and meal planner

### Database Tables

- `product_categories`: 10 categories (Oils, Spices, Condiments, etc.)
- `amazon_products`: Product catalog with URLs, images, prices
- `ingredient_product_mappings`: Maps ingredients to best-match products
- `cart_items`: User shopping carts with affiliate links

## Amazon Product Advertising API (Optional Enhancement)

### Benefits of API Integration

- **Real-time Pricing**: Get current Amazon prices instead of static data
- **Product Availability**: Check if products are in stock
- **Customer Reviews**: Display Amazon ratings and reviews
- **More Products**: Access millions of products dynamically
- **Updated Images**: Get current product images from Amazon

### Prerequisites

1. **Amazon Associates Account**
   - Already have account with tag: `mealscrape-20`
   - Verify account is in good standing

2. **Product Advertising API Access**
   - Apply at: https://affiliate-program.amazon.com/assoc_credentials/home
   - Requires active Associates account with qualifying sales
   - API access is granted after meeting requirements

### API Credentials Needed

```env
AMAZON_PA_ACCESS_KEY=your_access_key
AMAZON_PA_SECRET_KEY=your_secret_key
AMAZON_PA_PARTNER_TAG=mealscrape-20
AMAZON_PA_REGION=us-east-1
```

### Implementation Steps

#### 1. Create Supabase Edge Function

```typescript
// supabase/functions/amazon-product-search/index.ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createHmac } from "node:crypto";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { keywords, category } = await req.json();

    // Amazon PA API v5 request
    const host = "webservices.amazon.com";
    const region = Deno.env.get("AMAZON_PA_REGION");
    const accessKey = Deno.env.get("AMAZON_PA_ACCESS_KEY");
    const secretKey = Deno.env.get("AMAZON_PA_SECRET_KEY");
    const partnerTag = Deno.env.get("AMAZON_PA_PARTNER_TAG");

    const payload = {
      Keywords: keywords,
      PartnerTag: partnerTag,
      PartnerType: "Associates",
      Marketplace: "www.amazon.com",
      Resources: [
        "Images.Primary.Large",
        "ItemInfo.Title",
        "ItemInfo.Features",
        "Offers.Listings.Price"
      ]
    };

    // Sign request with AWS Signature V4
    // Implementation details omitted for brevity

    const response = await fetch(`https://${host}/paapi5/searchitems`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Amz-Target": "com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems",
        // Add AWS signature headers
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
```

#### 2. Update Product Service

Add function to fetch live product data:

```typescript
// src/services/amazonProductService.ts

export async function searchLiveProducts(keywords: string) {
  const { data, error } = await supabase.functions.invoke('amazon-product-search', {
    body: { keywords }
  });

  if (error) throw error;
  return data;
}
```

#### 3. Configure Secrets

In Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add environment variables:
   - `AMAZON_PA_ACCESS_KEY`
   - `AMAZON_PA_SECRET_KEY`
   - `AMAZON_PA_PARTNER_TAG` = mealscrape-20
   - `AMAZON_PA_REGION` = us-east-1

### API Limits and Costs

- **Free Tier**: 8,640 requests per day (1 per 10 seconds)
- **Paid Tier**: Higher limits with approved API access
- **Requirements**: Must maintain qualifying sales as Amazon Associate

### Alternative: Keep Current System

The current implementation works well because:

1. **Curated Products**: Hand-picked quality items
2. **Fast Performance**: No API latency
3. **No API Limits**: Unlimited usage
4. **Simple Maintenance**: Update products as needed
5. **Works Immediately**: No API approval wait time

### Recommendation

**Start with current system**, then add API integration later if needed:

- Current system handles 90% of use cases
- Add API for product discovery features later
- Use hybrid approach: curated + API search
- API best for specialty ingredients not in catalog

## Testing the Current System

### Test Grocery List Integration

1. Go to Meal Planner
2. Add recipes to your meal plan
3. Click "See Grocery List"
4. Click shopping bag icon next to any ingredient
5. Select a product from the dialog
6. Verify product added to cart

### Test Meal Planner Sync

1. Go to Meal Planner with recipes added
2. Click "Sync to Cart" button
3. Wait for products to be matched
4. Check cart to see bulk-added products
5. Verify all affiliate links include `tag=mealscrape-20`

### Test Cart Browsing

1. Go to Cart page
2. Browse product categories
3. Search for specific products
4. Click "Add to Cart" on products
5. Verify cart updates correctly

## Troubleshooting

### Products Not Found

- Check ingredient names match search keywords
- Add more products to catalog
- Create custom ingredient mappings

### Cart Not Loading

- Verify `cart_items` table exists
- Check RLS policies allow user access
- Ensure user is authenticated

### Affiliate Links Missing Tag

- Check `appendAffiliateTag()` function
- Verify `AFFILIATE_TAG = 'mealscrape-20'`
- Test with Amazon link checker

## Support Resources

- [Amazon Associates Help](https://affiliate-program.amazon.com/help)
- [Product Advertising API Docs](https://webservices.amazon.com/paapi5/documentation/)
- [AWS Signature V4 Signing](https://docs.aws.amazon.com/general/latest/gr/signature-version-4.html)
