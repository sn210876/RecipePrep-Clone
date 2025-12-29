import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { searchTerm } = await req.json();

    return new Response(
      JSON.stringify({
        items: [],
        message: 'Amazon PA-API not yet implemented. Please use the CSV bulk import feature to add products manually, or wait for API credentials to be configured.',
        searchTerm,
        affiliateTag: 'mealscrape-20',
        instructions: 'To enable automatic product search:\n1. Apply for Amazon Product Advertising API access\n2. Get your Access Key and Secret Key\n3. Add credentials as Supabase Edge Function secrets:\n   - AMAZON_PA_ACCESS_KEY\n   - AMAZON_PA_SECRET_KEY\n   - AMAZON_PA_PARTNER_TAG (optional, defaults to mealscrape-20)',
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
        message: 'Amazon PA-API not yet implemented',
      }),
      {
        status: 501,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
