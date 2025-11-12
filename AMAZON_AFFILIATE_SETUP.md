# Amazon Affiliate Integration Setup

This guide explains how to set up Amazon Affiliate links for grocery list ingredients.

## Prerequisites

### 1. Amazon Associates Account
You need an Amazon Associates account to generate affiliate links and earn commissions.

**Steps to create an account:**
1. Go to https://affiliate-program.amazon.com/
2. Click "Sign Up" or "Join Now for Free"
3. Sign in with your existing Amazon account or create a new one
4. Fill out the application:
   - Provide your website/app information (use your app URL)
   - Describe how you'll use affiliate links (recipe app grocery lists)
   - Choose your payment method
5. Complete verification (may require phone verification)
6. Wait for approval (usually 1-3 business days)

### 2. Get Your Associate ID
Once approved:
1. Log in to Amazon Associates Central
2. Find your **Associate ID** (also called "Tracking ID")
   - Format: `yourname-20` (US) or similar for other countries
3. Save this ID - you'll need it for generating links

## Implementation Options

### Option 1: Product Advertising API (Recommended for Scale)
Amazon provides an API for searching products and getting affiliate links.

**Requirements:**
- Amazon Associates account (approved)
- AWS account (free tier available)
- Access Key and Secret Key from Amazon Associates

**Steps:**
1. Go to Amazon Associates Central
2. Navigate to Tools → Product Advertising API
3. Request API access
4. Get your Access Key and Secret Access Key
5. Store these securely in your `.env` file:
   ```
   VITE_AMAZON_ASSOCIATE_ID=yourname-20
   AMAZON_PA_ACCESS_KEY=your_access_key
   AMAZON_PA_SECRET_KEY=your_secret_key
   ```

**API Features:**
- Search for products by keyword
- Get product details, prices, images
- Generate affiliate links automatically
- Support for multiple marketplaces (US, UK, CA, etc.)

### Option 2: Manual Link Generation (Simple, Immediate Start)
Generate affiliate links manually through Amazon Associates interface.

**Link Format:**
```
https://www.amazon.com/dp/{PRODUCT_ASIN}/ref=nosim?tag={YOUR_ASSOCIATE_ID}
```

**Example:**
```
https://www.amazon.com/dp/B00EXAMPLE/ref=nosim?tag=yourname-20
```

### Option 3: Amazon OneLink (Global)
OneLink automatically directs users to their local Amazon store.

**Link Format:**
```
https://amzn.to/{SHORT_CODE}
```

## Implementation in Your App

### Database Schema
Add an `amazon_asin` column to your ingredients or grocery list items:

```sql
ALTER TABLE grocery_list_items ADD COLUMN amazon_asin TEXT;
ALTER TABLE grocery_list_items ADD COLUMN amazon_search_term TEXT;
```

### Frontend Implementation

Create a component to display Amazon product options:

```typescript
// src/components/AmazonProductSearch.tsx
import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ExternalLink } from 'lucide-react';

interface AmazonProductSearchProps {
  ingredient: string;
  associateId: string;
}

export function AmazonProductSearch({ ingredient, associateId }: AmazonProductSearchProps) {
  const generateAffiliateLink = (searchTerm: string) => {
    const encoded = encodeURIComponent(searchTerm);
    return `https://www.amazon.com/s?k=${encoded}&tag=${associateId}`;
  };

  const affiliateLink = generateAffiliateLink(ingredient);

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open(affiliateLink, '_blank')}
      className="flex items-center gap-2"
    >
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg"
        alt="Amazon"
        className="h-4"
      />
      <span>Buy on Amazon</span>
      <ExternalLink className="w-3 h-3" />
    </Button>
  );
}
```

### Add to Grocery List Page

Update `src/pages/GroceryList.tsx` to include Amazon links:

```typescript
import { AmazonProductSearch } from '../components/AmazonProductSearch';

const AMAZON_ASSOCIATE_ID = import.meta.env.VITE_AMAZON_ASSOCIATE_ID || 'your-default-id';

// In your grocery list item rendering:
<div className="flex items-center justify-between">
  <span>{item.ingredient}</span>
  <AmazonProductSearch
    ingredient={item.ingredient}
    associateId={AMAZON_ASSOCIATE_ID}
  />
</div>
```

## Amazon Product Advertising API Integration (Advanced)

If you want to show specific products with prices and images:

### 1. Install SDK
```bash
npm install amazon-paapi
```

### 2. Create API Service
```typescript
// src/services/amazonApi.ts
import PAAPI from 'amazon-paapi';

const client = new PAAPI({
  accessKey: import.meta.env.AMAZON_PA_ACCESS_KEY,
  secretKey: import.meta.env.AMAZON_PA_SECRET_KEY,
  partnerId: import.meta.env.VITE_AMAZON_ASSOCIATE_ID,
  partnerType: 'Associates',
  marketplace: 'US' // or 'UK', 'CA', etc.
});

export async function searchProducts(keyword: string) {
  try {
    const result = await client.searchItems({
      keywords: keyword,
      searchIndex: 'Grocery',
      itemCount: 3,
      resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'Offers.Listings.Price'
      ]
    });
    return result.data;
  } catch (error) {
    console.error('Amazon API error:', error);
    return null;
  }
}
```

## Important Compliance Notes

### Amazon Associates Program Operating Agreement
You MUST comply with these requirements:

1. **Disclosure**: Clearly state that you earn from qualifying purchases
   ```
   "As an Amazon Associate, I earn from qualifying purchases."
   ```

2. **Link Freshness**: Product links must be refreshed at least every 24 hours

3. **No Price Display**: Cannot display Amazon prices or make price claims

4. **Proper Link Attribution**: Must use your Associate ID in all links

5. **No Shortened Links**: Cannot use third-party URL shorteners (except amzn.to)

### Add Disclosure to Your App

In your footer or grocery list page:
```typescript
<p className="text-xs text-gray-500 mt-4 text-center">
  As an Amazon Associate, Recipe Prep earns from qualifying purchases.
</p>
```

## Testing

Before going live:
1. Test links in incognito mode
2. Verify Associate ID is included in URLs
3. Check that clicks are tracked in Associates Central
4. Ensure disclosure is visible
5. Test on different devices

## Monitoring Performance

Track your affiliate performance in Amazon Associates Central:
- Go to Reports → Earnings
- Monitor clicks, conversions, and earnings
- Optimize which products you link to based on performance

## Alternative: Amazon Fresh/Whole Foods Integration

For a more integrated experience, consider:
- Amazon Fresh API (requires special partnership)
- Whole Foods delivery integration
- One-click add to Amazon cart

## Support

- Amazon Associates Help: https://affiliate-program.amazon.com/help
- Product Advertising API Docs: https://webservices.amazon.com/paapi5/documentation/
- Associates Forum: https://amazonsellercommunity.com/

## Next Steps

1. Apply for Amazon Associates account
2. Get approved and receive Associate ID
3. Add Associate ID to `.env` file
4. Implement basic affiliate links in grocery list
5. (Optional) Apply for Product Advertising API access
6. Add compliance disclosure to your app
7. Test thoroughly before launch
