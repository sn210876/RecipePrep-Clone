import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");
    if (!imageUrl) {
      console.error("No URL parameter provided");
      return new Response(JSON.stringify({
        error: "URL parameter is required"
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    console.log("=== Image Proxy Request ===");
    console.log("Requested URL:", imageUrl);
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.instagram.com/",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site"
    };
    const response = await fetch(imageUrl, {
      headers
    });
    console.log("Response status:", response.status);
    console.log("Response content-type:", response.headers.get("content-type"));
    if (!response.ok) {
      console.error("Image fetch failed with status:", response.status);
      const errorText = await response.text();
      console.error("Error response:", errorText);
      return new Response(JSON.stringify({
        error: "Failed to fetch image",
        status: response.status,
        details: errorText.substring(0, 200)
      }), {
        status: response.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";
    console.log("Successfully proxied image, size:", imageBuffer.byteLength, "bytes");
    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400"
      }
    });
  } catch (error) {
    console.error("Proxy error:", error);
    console.error("Error stack:", error.stack);
    return new Response(JSON.stringify({
      error: error.message || "Failed to proxy image",
      type: error.name,
      stack: error.stack?.substring(0, 200)
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
