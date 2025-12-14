import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SearchRequest {
  searchTerm: string;
  category?: string;
  sortBy?: string;
  maxResults?: number;
}

interface AmazonProduct {
  asin: string;
  title: string;
  price?: number;
  imageUrl?: string;
  rating?: number;
  reviewCount?: number;
  features?: string[];
  brand?: string;
}

const AFFILIATE_TAG = 'mealscrape-20';

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase credentials');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { searchTerm, category, sortBy = 'relevance', maxResults = 10 }: SearchRequest = await req.json();

    if (!searchTerm || searchTerm.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search term is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const accessKey = Deno.env.get('AMAZON_PA_ACCESS_KEY');
    const secretKey = Deno.env.get('AMAZON_PA_SECRET_KEY');
    const partnerTag = Deno.env.get('AMAZON_PA_PARTNER_TAG') || AFFILIATE_TAG;
    const region = Deno.env.get('AMAZON_PA_REGION') || 'us-east-1';
    const host = Deno.env.get('AMAZON_PA_HOST') || 'webservices.amazon.com';

    if (!accessKey || !secretKey) {
      console.warn('Amazon PA-API credentials not configured. Returning empty results.');
      return new Response(
        JSON.stringify({
          items: [],
          message: 'Amazon PA-API not configured',
          searchTerm,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const endpoint = `https://${host}/paapi5/searchitems`;
    const service = 'ProductAdvertisingAPI';
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const datestamp = timestamp.substring(0, 8);

    const payload = {
      Keywords: searchTerm,
      Resources: [
        'Images.Primary.Large',
        'ItemInfo.Title',
        'ItemInfo.Features',
        'ItemInfo.ByLineInfo',
        'Offers.Listings.Price',
        'CustomerReviews.StarRating',
        'CustomerReviews.Count',
      ],
      PartnerTag: partnerTag,
      PartnerType: 'Associates',
      Marketplace: 'www.amazon.com',
      ItemCount: Math.min(maxResults, 10),
    };

    if (category) {
      Object.assign(payload, { SearchIndex: category });
    }

    const canonicalUri = '/paapi5/searchitems';
    const canonicalQueryString = '';
    const canonicalHeaders = `content-type:application/json; charset=utf-8\nhost:${host}\nx-amz-date:${timestamp}\n`;
    const signedHeaders = 'content-type;host;x-amz-date';
    const payloadHash = await sha256(JSON.stringify(payload));

    const canonicalRequest = `POST\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const algorithm = 'AWS4-HMAC-SHA256';
    const credentialScope = `${datestamp}/${region}/${service}/aws4_request`;
    const stringToSign = `${algorithm}\n${timestamp}\n${credentialScope}\n${await sha256(canonicalRequest)}`;

    const signingKey = await getSignatureKey(secretKey, datestamp, region, service);
    const signature = await hmacSHA256(signingKey, stringToSign);

    const authorizationHeader = `${algorithm} Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'X-Amz-Date': timestamp,
        'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
        'Authorization': authorizationHeader,
        'Host': host,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Amazon PA-API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch from Amazon API', details: errorText }),
        {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const data = await response.json();

    if (!data.SearchResult || !data.SearchResult.Items) {
      return new Response(
        JSON.stringify({ items: [], searchTerm }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const products: AmazonProduct[] = data.SearchResult.Items.map((item: any) => {
      const asin = item.ASIN;
      const title = item.ItemInfo?.Title?.DisplayValue || 'Unknown Product';
      const price = item.Offers?.Listings?.[0]?.Price?.Amount;
      const imageUrl = item.Images?.Primary?.Large?.URL;
      const rating = item.CustomerReviews?.StarRating?.Value;
      const reviewCount = item.CustomerReviews?.Count;
      const features = item.ItemInfo?.Features?.DisplayValues || [];
      const brand = item.ItemInfo?.ByLineInfo?.Brand?.DisplayValue;

      return {
        asin,
        title,
        price: price ? parseFloat(price) : undefined,
        imageUrl,
        rating: rating ? parseFloat(rating) : undefined,
        reviewCount,
        features,
        brand,
      };
    });

    for (const product of products) {
      try {
        const keywords = [
          searchTerm.toLowerCase(),
          ...(product.brand ? [product.brand.toLowerCase()] : []),
          ...(product.features ? product.features.map((f: string) => f.toLowerCase().split(' ').slice(0, 3).join(' ')) : []),
        ];

        await supabase.from('amazon_products').upsert({
          asin: product.asin,
          product_name: product.title,
          description: product.features?.join('. ') || '',
          amazon_url: `https://www.amazon.com/dp/${product.asin}?tag=${partnerTag}`,
          price: product.price || null,
          image_url: product.imageUrl || null,
          brand: product.brand || null,
          search_keywords: keywords,
          category_id: 'other',
          popularity_score: product.reviewCount || 0,
          is_active: true,
          is_prime: false,
        }, {
          onConflict: 'asin',
          ignoreDuplicates: false,
        });
      } catch (error) {
        console.error(`Failed to cache product ${product.asin}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        items: products,
        searchTerm,
        count: products.length,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function hmacSHA256(key: Uint8Array, message: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

async function getSignatureKey(key: string, dateStamp: string, regionName: string, serviceName: string): Promise<Uint8Array> {
  const kDate = await hmacSHA256Raw(new TextEncoder().encode('AWS4' + key), dateStamp);
  const kRegion = await hmacSHA256Raw(kDate, regionName);
  const kService = await hmacSHA256Raw(kRegion, serviceName);
  return await hmacSHA256Raw(kService, 'aws4_request');
}

async function hmacSHA256Raw(key: Uint8Array, message: string): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message));
  return new Uint8Array(signature);
}
