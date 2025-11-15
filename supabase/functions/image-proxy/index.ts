import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
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
    const url = new URL(req.url);
    const imageUrl = url.searchParams.get("url");

    if (!imageUrl) {
      console.error("No URL parameter provided");
      return new Response(
        JSON.stringify({ error: "URL parameter is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("[image-proxy] Fetching:", imageUrl);

    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Referer": "https://www.allrecipes.com/",
      "Sec-Fetch-Dest": "image",
      "Sec-Fetch-Mode": "no-cors",
      "Sec-Fetch-Site": "cross-site",
    };

    const response = await fetch(imageUrl, { headers });

    console.log("[image-proxy] Response status:", response.status);
    console.log("[image-proxy] Content-Type:", response.headers.get("content-type"));

    if (!response.ok) {
      console.error("[image-proxy] Fetch failed:", response.status);
      const errorText = await response.text();
      console.error("[image-proxy] Error:", errorText.substring(0, 200));
      return new Response(
        JSON.stringify({
          error: "Failed to fetch image",
          status: response.status,
          details: errorText.substring(0, 200)
        }),
        {
          status: response.status,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const imageBuffer = await response.arrayBuffer();
    const contentType = response.headers.get("content-type") || "image/jpeg";

    console.log("[image-proxy] Success! Size:", imageBuffer.byteLength, "bytes");

    return new Response(imageBuffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (error) {
    console.error("[image-proxy] Error:", error);
    console.error("[image-proxy] Stack:", error.stack);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to proxy image",
        type: error.name,
        stack: error.stack?.substring(0, 200)
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});