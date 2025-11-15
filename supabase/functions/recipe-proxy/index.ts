import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

async function parseWithAI(text: string): Promise<{ ingredients: string[], instructions: string[], notes: string, prep_time: number, cook_time: number, yield: string }> {
  if (!text.trim() || !OPENAI_API_KEY) {
    console.log("[recipe-proxy] AI parsing skipped:", !text.trim() ? "No text" : "No API key");
    return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
  }

  console.log("[recipe-proxy] Calling OpenAI for extraction...");
  const prompt = `You are a recipe extraction expert. Extract ALL ingredients, ALL instructions, prep time, cook time, and yield from the recipe text. TRANSLATE EVERYTHING TO ENGLISH.

CRITICAL RULES:
1. If the recipe is in another language (Vietnamese, Spanish, French, etc.), you MUST translate all ingredients and instructions to English.
2. Extract EVERY SINGLE ingredient listed in the recipe - do not skip ANY ingredients, no matter how small.
3. Extract EVERY SINGLE instruction step - include ALL details, sub-steps, temperatures, and cooking techniques.
4. Preserve quantities, measurements, temperatures, and cooking times EXACTLY as written.
5. If there are multiple ingredient sections (like "For the broth", "For the noodles"), include ALL of them.
6. If there are detailed preparation steps, include EVERY SINGLE ONE with full details.
7. Extract prep time and cook time in MINUTES (convert hours to minutes if needed, e.g., 1 hour = 60 minutes).
8. Extract yield/servings information exactly as stated.
9. Include ALL cooking details: temperatures, baking times, resting times, checking for doneness, etc.
10. DO NOT summarize or combine steps - each instruction should be complete and detailed.

Return ONLY valid JSON in this exact format:
{
  "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt", ...],
  "instructions": ["Step 1 with full details including temperatures and times", "Step 2 with full details", ...],
  "prep_time": 15,
  "cook_time": 120,
  "yield": "4-5 servings",
  "notes": "Any cooking tips or notes"
}

Text to extract from:
${text.slice(0, 25000)}`;

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
        max_tokens: 4000,
      }),
    });

    const data = await response.json();
    console.log("[recipe-proxy] OpenAI response received");
    const content = data.choices[0].message.content;
    const jsonMatch = content.match(/\{.*\}/s);

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      console.log("[recipe-proxy] AI extracted:", parsed.ingredients?.length, "ingredients",parsed.instructions?.length, "instructions");
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
    console.error("[recipe-proxy] AI parse error:", e);
  }

  return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
}

async function scrapeRecipeSite(url: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
      'Referer': 'https://www.google.com/'
    };

    console.log("[recipe-proxy] Fetching URL:", url);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      console.error("[recipe-proxy] Fetch failed:", response.status, response.statusText);
      throw new Error(`Failed to fetch: ${response.status}`);
    }

    const html = await response.text();
    console.log("[recipe-proxy] HTML fetched, length:", html.length);

    const ogTitleMatch = html.match(/<meta\s+property=\"og:title\"\s+content=\"([^\"]+)\"/i);
    const twitterTitleMatch = html.match(/<meta\s+name=\"twitter:title\"\s+content=\"([^\"]+)\"/i);
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const rawTitle = ogTitleMatch?.[1] || twitterTitleMatch?.[1] || (titleMatch ? titleMatch[1] : 'Recipe');
    const title = rawTitle.split('|')[0].split('-')[0].split('•')[0].split(':')[0].trim();

    const recipeMatches = html.matchAll(/<script[^>]*type=\"application\/ld\+json\"[^>]*>([\s\S]*?)<\/script>/gi);
    let foundCount = 0;
    for (const match of recipeMatches) {
      foundCount++;
      console.log(`[recipe-proxy] Found JSON-LD block #${foundCount}`);
      try {
        const json = JSON.parse(match[1]);
        const recipes = Array.isArray(json) ? json : [json];
        console.log(`[recipe-proxy] Parsed JSON-LD, checking for Recipe type...`);

        for (const item of recipes) {
          if (item['@type'] === 'Recipe' || (Array.isArray(item['@graph']) && item['@graph'].some((g: any) => g['@type'] === 'Recipe'))) {
            const recipe = item['@type'] === 'Recipe' ? item : item['@graph'].find((g: any) => g['@type'] === 'Recipe');

            if (recipe && recipe.recipeIngredient && recipe.recipeInstructions) {
              const instructions = Array.isArray(recipe.recipeInstructions)
                ? recipe.recipeInstructions.map((i: any) => {
                    if (typeof i === 'string') return i;
                    if (i.text) return i.text;
                    if (i.itemListElement) {
                      return i.itemListElement.map((e: any) => e.text || '').filter(Boolean);
                    }
                    return '';
                  }).flat().filter(Boolean)
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

              const extractImage = (img: any): string => {
                if (typeof img === 'string') return img;
                if (img?.url) return img.url;
                if (Array.isArray(img) && img.length > 0) {
                  return typeof img[0] === 'string' ? img[0] : img[0]?.url || '';
                }
                return '';
              };

              const extractYield = (yld: any): string => {
                if (typeof yld === 'string') return yld;
                if (typeof yld === 'number') return String(yld);
                if (Array.isArray(yld) && yld.length > 0) return String(yld[0]);
                return '';
              };

              console.log('[recipe-proxy] ✓ Structured data found');
              console.log('[recipe-proxy] Recipe name:', recipe.name);
              console.log('[recipe-proxy] Ingredients count:', recipe.recipeIngredient?.length);
              console.log('[recipe-proxy] Instructions count:', instructions.length);

              return {
                title: recipe.name || title,
                ingredients: recipe.recipeIngredient || [],
                instructions,
                image: extractImage(recipe.image),
                yield: extractYield(recipe.recipeYield),
                prep_time: parseTime(recipe.prepTime),
                cook_time: parseTime(recipe.cookTime),
                time: parseTime(recipe.totalTime) || (parseTime(recipe.prepTime) + parseTime(recipe.cookTime)),
                notes: 'Extracted from structured data',
              };
            }
          }
        }
      } catch (e) {
        console.error("[recipe-proxy] JSON parse error:", e);
        continue;
      }
    }

    console.log(`[recipe-proxy] Total JSON-LD blocks found: ${foundCount}`);
    console.log("[recipe-proxy] No Recipe schema found in structured data");

    const ogImageMatch = html.match(/<meta\s+property=\"og:image\"\s+content=\"([^\"]+)\"/i);
    const twitterImageMatch = html.match(/<meta\s+name=\"twitter:image\"\s+content=\"([^\"]+)\"/i);
    const firstImgMatch = html.match(/<img[^>]+src=\"([^\"]+)\"/i);
    const imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || firstImgMatch?.[1] || '';

    if (!OPENAI_API_KEY) {
      console.error("[recipe-proxy] OPENAI_API_KEY not configured!");
      throw new Error("OpenAI API key is not configured in Supabase Edge Function secrets. Please configure it in your Supabase dashboard.");
    }

    console.log("[recipe-proxy] Falling back to AI extraction");
    const aiResult = await parseWithAI(html);
    if (aiResult.ingredients.length > 0) {
      console.log("[recipe-proxy] AI extraction successful");
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

    console.log("[recipe-proxy] AI extraction failed - no ingredients found");
    return null;
  } catch (e) {
    console.error("[recipe-proxy] Scrape error:", e);
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

    console.log("[recipe-proxy] Extracting from:", url);

    const result = await scrapeRecipeSite(url);

    if (result) {
      console.log("[recipe-proxy] Returning result:", {
        title: result.title,
        ingredientsCount: result.ingredients?.length,
        instructionsCount: result.instructions?.length,
      });

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

    return new Response(
      JSON.stringify({ error: "Failed to extract recipe data" }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("[recipe-proxy] Error:", error);
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