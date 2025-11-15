import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

async function parseWithAI(text: string): Promise<{ ingredients: string[], instructions: string[], notes: string, prep_time: number, cook_time: number, yield: string }> {
  if (!text.trim() || !OPENAI_API_KEY) return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };

  const prompt = `You are a recipe extraction expert. Extract ALL ingredients, ALL instructions, prep time, cook time, and yield from the recipe text. TRANSLATE EVERYTHING TO ENGLISH.

CRITICAL RULES:
1. If the recipe is in another language (Vietnamese, Spanish, French, etc.), you MUST translate all ingredients and instructions to English.
2. Extract EVERY SINGLE ingredient listed in the recipe - do not skip any.
3. Extract EVERY SINGLE instruction step - include all details and sub-steps.
4. Preserve quantities, measurements, and cooking times exactly.
5. If there are multiple ingredient sections (like "For the broth", "For the noodles"), include all of them.
6. If there are detailed preparation steps, include them all.
7. Extract prep time and cook time in MINUTES (convert hours to minutes if needed).
8. Extract yield/servings information.

Return ONLY valid JSON in this exact format:
{
  "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt", ...],
  "instructions": ["Step 1 with full details", "Step 2 with full details", ...],
  "prep_time": 15,
  "cook_time": 120,
  "yield": "4-5 servings",
  "notes": "Any cooking tips or notes"
}

Text to extract from:
${text.slice(0, 20000)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 3000,
      }),
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
        yield: parsed.yield || "",
      };
    }
  } catch (e) {
    console.error("AI parse error:", e);
  }

  return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
}

async function scrapeRecipeSite(url: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const response = await fetch(url, { headers });
    const html = await response.text();

    const ogTitleMatch = html.match(/<meta\s+property="og:title"\s+content="([^"]+)"/i);
    const twitterTitleMatch = html.match(/<meta\s+name="twitter:title"\s+content="([^"]+)"/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = ogTitleMatch?.[1] || twitterTitleMatch?.[1] || (titleMatch ? titleMatch[1] : 'Recipe');
    const title = rawTitle.split('|')[0].split('-')[0].split('•')[0].split(':')[0].trim();

    const recipeMatches = html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/gi);
    for (const match of recipeMatches) {
      try {
        const json = JSON.parse(match[1]);
        const recipes = Array.isArray(json) ? json : [json];

        for (const item of recipes) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@graph']) && item['@graph'].some((g: any) => g['@type'] === 'Recipe'))) {
            const recipe = item['@type'] === 'Recipe' ? item : item['@graph'].find((g: any) => g['@type'] === 'Recipe');

            if (recipe && recipe.recipeIngredient && recipe.recipeInstructions) {
              const instructions = Array.isArray(recipe.recipeInstructions)
                ? recipe.recipeInstructions.map((i: any) => {
                    if (typeof i === 'string') return i;
                    if (i.text) return i.text;
                    if (i.itemListElement) {
                      return i.itemListElement.map((e: any) => e.text || '').join(' ');
                    }
                    return '';
                  }).filter(Boolean)
                : typeof recipe.recipeInstructions === 'string'
                  ? recipe.recipeInstructions.split('\n').filter(Boolean)
                  : [];

              const parseTime = (time: string) => {
                if (!time) return 0;
                const match = time.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
                if (match) {
                  const hours = parseInt(match[1] || '0');
                  const minutes = parseInt(match[2] || '0');
                  return hours * 60 + minutes;
                }
                return 0;
              };

              return {
                title: recipe.name || title,
                ingredients: recipe.recipeIngredient || [],
                instructions,
                image: recipe.image?.url || (Array.isArray(recipe.image) ? recipe.image[0] : recipe.image) || '',
                yield: recipe.recipeYield || '',
                prep_time: parseTime(recipe.prepTime),
                cook_time: parseTime(recipe.cookTime),
                time: parseTime(recipe.totalTime) || (parseTime(recipe.prepTime) + parseTime(recipe.cookTime)),
                notes: 'Extracted from structured data',
              };
            }
          }
        }
      } catch (e) {
        console.error("JSON parse error:", e);
        continue;
      }
    }

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    const firstImgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || firstImgMatch?.[1] || '';

    const aiResult = await parseWithAI(html);
    if (aiResult.ingredients.length > 0) {
      return {
        title,
        ingredients: aiResult.ingredients,
        instructions: aiResult.instructions,
        image: imageUrl,
        yield: aiResult.yield || '',
        prep_time: aiResult.prep_time || 0,
        cook_time: aiResult.cook_time || 0,
        time: aiResult.prep_time + aiResult.cook_time || 0,
        notes: `AI parsed: ${aiResult.notes}`,
      };
    }

    return null;
  } catch (e) {
    console.error("Scrape error:", e);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { url } = await req.json();

    if (!url) {
      return new Response(
        JSON.stringify({ error: "URL is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log("Extracting from:", url);

    const result = await scrapeRecipeSite(url);

    if (result) {
      return new Response(
        JSON.stringify(result),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // For social media (Instagram, TikTok, YouTube), we need transcript extraction
    // This requires yt-dlp + Whisper which can't run in Edge Functions
    // The user needs to run the local server: npm run server
    // Or deploy the server.js to a service that supports Node.js

    return new Response(
      JSON.stringify({
        error: "Video transcript extraction requires running the local server (npm run server) or deploying server.js to a Node.js hosting service",
        title: "Unable to extract recipe",
        ingredients: [],
        instructions: ["Please run 'npm run server' locally to extract recipes from Instagram/TikTok/YouTube videos"],
        image: "",
        notes: "Video extraction requires the Node.js server with yt-dlp and OpenAI Whisper support"
      }),
      {
        status: 503,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Failed to extract recipe" }),
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