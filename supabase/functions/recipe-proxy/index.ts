import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

// Your excellent AI parser (keep it exactly as-is)
async function parseWithAI(text: string) {
  if (!text.trim() || !OPENAI_API_KEY) {
    console.log("[recipe-proxy] AI parsing skipped:", !text.trim() ? "No text" : "No API key");
    return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
  }
  const cleanText = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  const prompt = `You are a recipe extraction expert. Extract ALL ingredients and instructions EXACTLY as they appear in the text.

CRITICAL RULES:
1. Extract EVERY ingredient with its EXACT quantity and measurement as written
2. Extract EVERY instruction step EXACTLY as written - do not modify, summarize, or combine
3. If prep time is listed (e.g., "Prep Time: 45 mins"), extract the number in MINUTES
4. If cook time is listed (e.g., "Cook Time: 1 hr"), convert to MINUTES (1 hr = 60 minutes)
5. Extract servings/yield EXACTLY as stated (e.g., "Servings: 6" → "6 servings")
6. Preserve ALL temperatures, times, and measurements EXACTLY
7. Keep instructions in order and complete - include every detail

Return ONLY valid JSON:
{
  "ingredients": ["exact ingredient 1", "exact ingredient 2", ...],
  "instructions": ["exact instruction 1", "exact instruction 2", ...],
  "prep_time": 45,
  "cook_time": 60,
  "yield": "6 servings",
  "notes": ""
}

Text:
${cleanText.slice(0, 20000)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 4000
      })
    });
    const data = await response.json();
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        ingredients: parsed.ingredients || [],
        instructions: parsed.instructions || [],
        notes: parsed.notes || "",
        prep_time: parsed.prep_time || 0,
        cook_time: parsed.cook_time || 0,
        yield: parsed.yield || ""
      };
    }
  } catch (e) {
    console.error("[recipe-proxy] AI parse error:", e);
  }
  return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
}

// Your current excellent Instagram extractor
async function extractInstagramVideo(url: string) {
  try {
    console.log("[recipe-proxy] Extracting Instagram content");
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.instagram.com/'
    };
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Failed to fetch Instagram page: ${response.status}`);
    const html = await response.text();

    const descriptionMatch = html.match(/\"caption\":\"([^\"]+)\"/);
    const description = descriptionMatch ? descriptionMatch[1].replace(/\\n/g, '\n').replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(parseInt(code, 16))) : "";
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch ? titleMatch[1].split('•')[0].trim() : "Instagram Recipe";
    const imageMatch = html.match(/\"display_url\":\"([^\"]+)\"/);
    const thumbnail = imageMatch ? imageMatch[1].replace(/\\u0026/g, '&') : "";

    if (!description || description.length < 20) {
      console.log("[recipe-proxy] No caption found → falling back to Render.com");
      return null; // Let Render.com handle it
    }

    const aiResult = await parseWithAI(description);
    if (aiResult.ingredients.length > 0) {
      return {
        title: title.includes('Instagram') ? aiResult.instructions[0]?.substring(0, 50) || title : title,
        ingredients: aiResult.ingredients,
        instructions: aiResult.instructions,
        image: thumbnail,
        yield: aiResult.yield || '',
        prep_time: aiResult.prep_time || 0,
        cook_time: aiResult.cook_time || 0,
        notes: "Extracted from Instagram caption"
      };
    }
    return null;
  } catch (error) {
    console.error("[recipe-proxy] Instagram extraction failed:", error);
    return null;
  }
}

// Your current scrapeRecipeSite (keep it)
async function scrapeRecipeSite(url: string) {
  // ... (your full current scrapeRecipeSite function - keep exactly as-is)
  // I'm omitting it here for space, but KEEP YOUR CURRENT ONE
}

// MAIN HANDLER — THE MAGIC
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.log("[recipe-proxy] Extracting from:", url);

    // 1. Instagram/TikTok/YouTube → try smart caption first
    if (url.includes('instagram.com') || url.includes('tiktok.com') || url.includes('youtube.com') || url.includes('youtu.be')) {
      const socialResult = url.includes('instagram.com') ? await extractInstagramVideo(url) : null;
      if (socialResult) {
        return new Response(JSON.stringify(socialResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // 2. Normal websites
    const result = await scrapeRecipeSite(url);
    if (result) {
      return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. FINAL FALLBACK → RENDER.COM (your old working server)
    console.log("[recipe-proxy] Falling back to Render.com extractor");
    const renderResponse = await fetch("https://recipe-backend-nodejs-1.onrender.com/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });

    const renderData = await renderResponse.json();
    return new Response(JSON.stringify(renderData), {
      status: renderResponse.ok ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[recipe-proxy] Final error:", error);
    return new Response(JSON.stringify({ error: error.message || "Failed" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});