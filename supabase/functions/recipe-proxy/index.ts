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
1. Extract EVERY SINGLE ingredient listed in the recipe - do not skip any. Include ALL sections (Dough, Filling, Topping, Sauce, etc.).
2. Extract EVERY SINGLE instruction step - include all details and sub-steps.
3. Preserve quantities and units EXACTLY as written - do not convert units (keep g, kg, cups, tsp as-is).
4. For yield/servings: READ THE INSTRUCTIONS CAREFULLY. Look for phrases like "divide into X pieces", "makes X servings", "cut into X portions". The yield MUST match what the instructions say, NOT what a website header might claim.
5. For prep time: Add up ALL non-cooking time (mixing, proofing, rising, resting, chilling, assembly). Convert hours to minutes.
6. For cook time: ONLY the actual oven/stove/cooking time. Do NOT include proofing or prep time.
7. If there are multiple ingredient sections, include them ALL with their section names.
8. If the recipe is in another language, translate all ingredients and instructions to English.

EXAMPLE:
If instructions say "Divide dough into 12 pieces" but the website says "Serves: 7", the correct yield is "12" (trust the instructions, not the website metadata).

Return ONLY valid JSON in this exact format:
{
  "ingredients": ["520g bread flour", "30g powdered skim milk", "Salt flakes for topping", ...],
  "instructions": ["Place all the ingredients in a mixer bowl and mix for 5 minutes at slow speed.", "Increase the speed to medium and continue mixing for 5 more minutes.", ...],
  "prep_time": 115,
  "cook_time": 25,
  "yield": "12 rolls",
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

async function extractYouTubeDescription(url: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const response = await fetch(url, { headers });
    const html = await response.text();

    console.log('[YouTube] Fetched HTML, length:', html.length);

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Recipe';
    console.log('[YouTube] Title:', title);

    // Try multiple patterns for description
    let description = '';

    // Pattern 1: simpleText
    const simpleTextMatch = html.match(/"description":\{"simpleText":"([^"]+)"\}/);
    if (simpleTextMatch) {
      description = simpleTextMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      console.log('[YouTube] Found description (simpleText):', description.substring(0, 100));
    }

    // Pattern 2: attributedDescriptionBodyText
    if (!description) {
      const attrDescMatch = html.match(/"attributedDescriptionBodyText":\{"content":"([^"]+)"\}/);
      if (attrDescMatch) {
        description = attrDescMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        console.log('[YouTube] Found description (attributedDescriptionBodyText):', description.substring(0, 100));
      }
    }

    // Pattern 3: Find any description field
    if (!description) {
      const anyDescMatch = html.match(/"description":"([^"]+)"/);
      if (anyDescMatch) {
        description = anyDescMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
        console.log('[YouTube] Found description (generic):', description.substring(0, 100));
      }
    }

    const thumbnailMatch = html.match(/"thumbnails":\[{"url":"([^"]+)"/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    if (description && description.length > 50) {
      console.log('[YouTube] Sending to AI for parsing...');
      const aiResult = await parseWithAI(`Title: ${title}\n\nDescription:\n${description}`);
      console.log('[YouTube] AI result:', aiResult);

      if (aiResult.ingredients.length > 0) {
        return {
          title,
          ingredients: aiResult.ingredients,
          instructions: aiResult.instructions,
          image: thumbnail,
          yield: aiResult.yield || '4',
          prep_time: aiResult.prep_time || 15,
          cook_time: aiResult.cook_time || 30,
          time: aiResult.prep_time + aiResult.cook_time || 45,
          notes: aiResult.notes || 'Extracted from YouTube description',
        };
      }
    }

    console.log('[YouTube] No valid recipe found in description');
    return null;
  } catch (e) {
    console.error("YouTube extraction error:", e);
    return null;
  }
}

async function scrapeRecipeSite(url: string) {
  try {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      return await extractYouTubeDescription(url);
    }

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

    let structuredData: any = null;

    // Extract JSON-LD structured data - use a more robust regex that handles multiline content
    const scriptRegex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    const recipeMatches = html.matchAll(scriptRegex);

    for (const match of recipeMatches) {
      try {
        const jsonString = match[1].trim();
        const json = JSON.parse(jsonString);
        const recipes = Array.isArray(json) ? json : [json];

        for (const item of recipes) {
          // Check if this item is a Recipe or contains Recipe in @type array
          const isRecipe = item['@type'] === 'Recipe' ||
                          (Array.isArray(item['@type']) && item['@type'].includes('Recipe'));

          const hasGraphWithRecipe = item['@graph'] && Array.isArray(item['@graph']) &&
                                     item['@graph'].some((g: any) =>
                                       g['@type'] === 'Recipe' ||
                                       (Array.isArray(g['@type']) && g['@type'].includes('Recipe'))
                                     );

          if (isRecipe || hasGraphWithRecipe) {
            const recipe = isRecipe ? item : item['@graph'].find((g: any) =>
              g['@type'] === 'Recipe' ||
              (Array.isArray(g['@type']) && g['@type'].includes('Recipe'))
            );

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

              // Handle yield - can be string, number, or array
              let yieldValue = '';
              if (recipe.recipeYield) {
                if (Array.isArray(recipe.recipeYield)) {
                  yieldValue = recipe.recipeYield[0] || '';
                } else {
                  yieldValue = String(recipe.recipeYield);
                }
              }

              structuredData = {
                title: recipe.name || title,
                ingredients: recipe.recipeIngredient || [],
                instructions,
                image: recipe.image?.url || (Array.isArray(recipe.image) ? recipe.image[0] : recipe.image) || '',
                yield: yieldValue,
                prep_time: parseTime(recipe.prepTime),
                cook_time: parseTime(recipe.cookTime),
                time: parseTime(recipe.totalTime) || (parseTime(recipe.prepTime) + parseTime(recipe.cookTime)),
                notes: 'Extracted from structured data',
              };
              break;
            }
          }
        }
        if (structuredData) break;
      } catch (e) {
        console.error("JSON parse error:", e);
        continue;
      }
    }

    const ogImageMatch = html.match(/<meta\s+property="og:image"\s+content="([^"]+)"/i);
    const twitterImageMatch = html.match(/<meta\s+name="twitter:image"\s+content="([^"]+)"/i);
    const firstImgMatch = html.match(/<img[^>]+src="([^"]+)"/i);
    const imageUrl = ogImageMatch?.[1] || twitterImageMatch?.[1] || firstImgMatch?.[1] || '';

    // Always try AI parsing as well
    const aiResult = await parseWithAI(html);

    // If we have both, check for conflicts
    if (structuredData && aiResult.ingredients.length > 0) {
      const hasConflict = checkForConflicts(structuredData, aiResult);

      if (hasConflict) {
        console.log('[Conflict detected] Structured vs AI-parsed data differ');
        return {
          title: structuredData.title,
          image: structuredData.image || imageUrl,
          hasConflict: true,
          structuredVersion: structuredData,
          aiVersion: {
            title: title,
            ingredients: aiResult.ingredients,
            instructions: aiResult.instructions,
            image: imageUrl,
            yield: aiResult.yield || '',
            prep_time: aiResult.prep_time || 0,
            cook_time: aiResult.cook_time || 0,
            time: aiResult.prep_time + aiResult.cook_time || 0,
            notes: 'AI parsed from blog content',
          },
          // Default to structured data
          ingredients: structuredData.ingredients,
          instructions: structuredData.instructions,
          yield: structuredData.yield,
          prep_time: structuredData.prep_time,
          cook_time: structuredData.cook_time,
          time: structuredData.time,
          notes: 'CONFLICT: Recipe card and blog content differ. Review both versions.',
        };
      }
    }

    // Return whichever version we have
    if (structuredData) {
      return structuredData;
    }

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

function checkForConflicts(structured: any, ai: any): boolean {
  // Check if yield differs significantly
  const structuredYield = String(structured.yield || '').match(/\d+/)?.[0];
  const aiYield = String(ai.yield || '').match(/\d+/)?.[0];

  if (structuredYield && aiYield && structuredYield !== aiYield) {
    console.log(`[Conflict] Yield: ${structuredYield} vs ${aiYield}`);
    return true;
  }

  // Check if ingredient counts differ significantly
  const ingredientDiff = Math.abs(structured.ingredients.length - ai.ingredients.length);
  if (ingredientDiff > 2) {
    console.log(`[Conflict] Ingredient count: ${structured.ingredients.length} vs ${ai.ingredients.length}`);
    return true;
  }

  // Check if key ingredients have different quantities
  for (const structIng of structured.ingredients.slice(0, 5)) {
    const structQty = structIng.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|cup|tbsp|tsp)/)?.[1];
    if (!structQty) continue;

    for (const aiIng of ai.ingredients) {
      // Check if it's roughly the same ingredient
      const structName = structIng.replace(/[\d\s.,]+(?:g|kg|ml|l|cup|tbsp|tsp|oz|lb)\s*/gi, '').trim().toLowerCase();
      const aiName = aiIng.replace(/[\d\s.,]+(?:g|kg|ml|l|cup|tbsp|tsp|oz|lb)\s*/gi, '').trim().toLowerCase();

      if (structName.includes(aiName.split(' ')[0]) || aiName.includes(structName.split(' ')[0])) {
        const aiQty = aiIng.match(/(\d+(?:\.\d+)?)\s*(?:g|kg|ml|l|cup|tbsp|tsp)/)?.[1];
        if (aiQty && Math.abs(parseFloat(structQty) - parseFloat(aiQty)) > parseFloat(structQty) * 0.2) {
          console.log(`[Conflict] Ingredient quantity: ${structIng} vs ${aiIng}`);
          return true;
        }
      }
    }
  }

  return false;
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

    return new Response(
      JSON.stringify({
        error: "Could not extract recipe from this URL",
        title: "Unable to extract recipe",
        ingredients: [],
        instructions: ["Unable to find recipe data in the provided URL"],
        image: "",
        notes: "Try a different recipe URL or enter the recipe manually"
      }),
      {
        status: 404,
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