import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

// Smart text-based recipe parser with AI fallback
async function parseRecipeText(text: string) {
  if (!text.trim()) {
    console.log("[recipe-proxy] No text to parse");
    return { ingredients: [], instructions: [], notes: "", prep_time: 0, cook_time: 0, yield: "" };
  }

  // Clean the text
  const cleanText = text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();

  console.log("[recipe-proxy] Parsing text length:", cleanText.length);

  // Try AI parsing with OpenAI
  if (OPENAI_API_KEY) {
    try {
      const prompt = `You are a recipe extraction expert. Extract the recipe from this social media post/description.

RULES:
1. Extract ALL ingredients with quantities and measurements (e.g., "2 cups flour", "1 tsp salt")
2. Extract ALL instruction steps as separate items
3. Extract prep/cook times if mentioned (return as MINUTES only)
4. Extract servings/yield if mentioned
5. If text mentions "link in bio" or "full recipe on website", still extract whatever ingredients/steps ARE provided
6. Be thorough - extract EVERYTHING recipe-related from the text

Return ONLY valid JSON (no markdown, no extra text):
{
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity", ...],
  "instructions": ["step 1", "step 2", ...],
  "prep_time": 15,
  "cook_time": 30,
  "yield": "4 servings",
  "notes": ""
}

Text to parse:
${cleanText.slice(0, 15000)}`;

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
          max_tokens: 3000
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("[recipe-proxy] OpenAI API error:", response.status, errorText);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      console.log("[recipe-proxy] OpenAI response received");

      const content = data.choices?.[0]?.message?.content;
      if (!content) {
        console.error("[recipe-proxy] No content in OpenAI response");
        throw new Error("No content in AI response");
      }

      // Try to extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        console.log("[recipe-proxy] Successfully parsed AI response");
        console.log("[recipe-proxy] Ingredients found:", parsed.ingredients?.length || 0);
        console.log("[recipe-proxy] Instructions found:", parsed.instructions?.length || 0);

        return {
          ingredients: parsed.ingredients || [],
          instructions: parsed.instructions || [],
          notes: parsed.notes || "",
          prep_time: parsed.prep_time || 0,
          cook_time: parsed.cook_time || 0,
          yield: parsed.yield || ""
        };
      } else {
        console.error("[recipe-proxy] Could not find JSON in AI response");
      }
    } catch (e) {
      console.error("[recipe-proxy] AI parsing error:", e);
    }
  } else {
    console.log("[recipe-proxy] No OpenAI API key, using basic parsing");
  }

  // Fallback: Basic manual parsing
  console.log("[recipe-proxy] Using fallback manual parsing");
  const lines = cleanText.split(/\n+/).filter(line => line.trim().length > 0);

  const ingredients: string[] = [];
  const instructions: string[] = [];
  let inIngredientsSection = false;
  let inInstructionsSection = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Detect section headers
    if (lowerLine.includes('ingredient')) {
      inIngredientsSection = true;
      inInstructionsSection = false;
      continue;
    } else if (lowerLine.includes('instruction') || lowerLine.includes('direction') || lowerLine.includes('step')) {
      inIngredientsSection = false;
      inInstructionsSection = true;
      continue;
    }

    // Try to detect ingredients by pattern (starts with number or has measurement words)
    const hasQuantity = /^[\d\/\-\s]+/.test(line) || /\b(cup|tsp|tbsp|oz|lb|g|kg|ml|l|piece|clove|slice)\b/i.test(line);

    if (inIngredientsSection || (!inInstructionsSection && hasQuantity)) {
      ingredients.push(line.trim());
    } else if (inInstructionsSection || line.length > 30) {
      // Longer lines are more likely instructions
      instructions.push(line.trim());
    }
  }

  console.log("[recipe-proxy] Manual parse - Ingredients:", ingredients.length, "Instructions:", instructions.length);

  // If we couldn't parse anything structured, return the full text as a single instruction
  if (ingredients.length === 0 && instructions.length === 0 && cleanText.length > 20) {
    console.log("[recipe-proxy] No structured data found, returning full text");
    return {
      ingredients: ["See recipe description below"],
      instructions: [cleanText],
      notes: "⚠️ AI parsing unavailable. Full description provided - please extract recipe details manually.",
      prep_time: 0,
      cook_time: 0,
      yield: ""
    };
  }

  return {
    ingredients: ingredients.length > 0 ? ingredients : ["Check original post for full ingredient list"],
    instructions: instructions.length > 0 ? instructions : ["Check original post for full instructions"],
    notes: "⚠️ AI parsing unavailable. Basic extraction attempted - some details may be missing.",
    prep_time: 0,
    cook_time: 0,
    yield: ""
  };
}

// Extract from TikTok video
async function extractTikTokVideo(url: string) {
  try {
    console.log("[recipe-proxy] Extracting TikTok content");
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Failed to fetch TikTok page: ${response.status}`);
    const html = await response.text();

    // Extract JSON data from the page
    const scriptMatch = html.match(/<script id="__UNIVERSAL_DATA_FOR_REHYDRATION__" type="application\/json">(.*?)<\/script>/s);
    if (scriptMatch) {
      const data = JSON.parse(scriptMatch[1]);
      const videoDetail = data?.__DEFAULT_SCOPE__?.['webapp.video-detail']?.itemInfo?.itemStruct;

      if (videoDetail) {
        const description = videoDetail.desc || "";
        const thumbnail = videoDetail.video?.cover || "";
        const author = videoDetail.author?.nickname || "";

        console.log("[recipe-proxy] TikTok description length:", description.length);

        if (description.length > 10) {
          const recipeData = await parseRecipeText(description);

          // Always return something, even if parsing was limited
          return {
            title: description.substring(0, 60) + (description.length > 60 ? "..." : ""),
            author,
            ingredients: recipeData.ingredients,
            instructions: recipeData.instructions,
            image: thumbnail,
            yield: recipeData.yield || '',
            prep_time: recipeData.prep_time || 0,
            cook_time: recipeData.cook_time || 0,
            notes: recipeData.notes || "Extracted from TikTok"
          };
        }
      }
    }
    return null;
  } catch (error) {
    console.error("[recipe-proxy] TikTok extraction failed:", error);
    return null;
  }
}

// Extract from YouTube video
async function extractYouTubeVideo(url: string) {
  try {
    console.log("[recipe-proxy] Extracting YouTube content");

    // Extract video ID from URL
    let videoId = "";
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    } else if (url.includes('youtube.com/watch')) {
      const urlParams = new URL(url).searchParams;
      videoId = urlParams.get('v') || "";
    }

    if (!videoId) return null;

    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };

    const response = await fetch(`https://www.youtube.com/watch?v=${videoId}`, { headers });
    if (!response.ok) throw new Error(`Failed to fetch YouTube page: ${response.status}`);
    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/"title":"([^"]+)"/);
    const title = titleMatch ? titleMatch[1].replace(/\\"/g, '"') : "YouTube Recipe";

    // Extract description - try multiple patterns
    let description = "";
    const descMatch1 = html.match(/"description":{"simpleText":"([^"]+)"\}/);
    if (descMatch1) {
      description = descMatch1[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
    } else {
      // Try alternative pattern for longer descriptions
      const descMatch2 = html.match(/"description":\{"simpleText":"((?:[^"\\]|\\.)*)"\}/);
      if (descMatch2) {
        description = descMatch2[1].replace(/\\n/g, '\n').replace(/\\"/g, '"');
      }
    }

    // Extract thumbnail
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Extract channel name
    const channelMatch = html.match(/"author":"([^"]+)"/);
    const author = channelMatch ? channelMatch[1] : "";

    console.log("[recipe-proxy] YouTube description length:", description.length);

    if (description.length > 20) {
      const recipeData = await parseRecipeText(description);

      // Always return something
      return {
        title,
        author,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        image: thumbnail,
        yield: recipeData.yield || '',
        prep_time: recipeData.prep_time || 0,
        cook_time: recipeData.cook_time || 0,
        notes: recipeData.notes || "Extracted from YouTube"
      };
    }
    return null;
  } catch (error) {
    console.error("[recipe-proxy] YouTube extraction failed:", error);
    return null;
  }
}

// Extract from Instagram
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

    console.log("[recipe-proxy] Instagram caption length:", description.length);

    if (!description || description.length < 10) {
      console.log("[recipe-proxy] No caption found");
      return null;
    }

    const recipeData = await parseRecipeText(description);

    // Always return something
    return {
      title: title.includes('Instagram') ? (description.substring(0, 50) + (description.length > 50 ? "..." : "")) : title,
      ingredients: recipeData.ingredients,
      instructions: recipeData.instructions,
      image: thumbnail,
      yield: recipeData.yield || '',
      prep_time: recipeData.prep_time || 0,
      cook_time: recipeData.cook_time || 0,
      notes: recipeData.notes || "Extracted from Instagram"
    };
  } catch (error) {
    console.error("[recipe-proxy] Instagram extraction failed:", error);
    return null;
  }
}

// Comprehensive recipe site scraper
async function scrapeRecipeSite(url: string) {
  try {
    console.log("[recipe-proxy] Scraping recipe site:", url);
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    };

    const response = await fetch(url, { headers });
    if (!response.ok) {
      console.log("[recipe-proxy] HTTP error:", response.status);
      return null;
    }

    const html = await response.text();

    // Try JSON-LD first (standard for recipe sites)
    const jsonLdMatch = html.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gis);
    if (jsonLdMatch) {
      for (const match of jsonLdMatch) {
        try {
          const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '').trim();
          const data = JSON.parse(jsonContent);

          // Handle both single recipe and array of recipes
          const recipes = Array.isArray(data) ? data : (data['@graph'] ? data['@graph'] : [data]);
          const recipe = recipes.find((item: any) => item['@type'] === 'Recipe');

          if (recipe) {
            console.log("[recipe-proxy] Found JSON-LD recipe");

            // Parse ingredients
            const ingredients = Array.isArray(recipe.recipeIngredient)
              ? recipe.recipeIngredient
              : typeof recipe.recipeIngredient === 'string'
                ? [recipe.recipeIngredient]
                : [];

            // Parse instructions
            let instructions: string[] = [];
            if (Array.isArray(recipe.recipeInstructions)) {
              instructions = recipe.recipeInstructions.map((step: any) => {
                if (typeof step === 'string') return step;
                if (step.text) return step.text;
                if (step['@type'] === 'HowToStep' && step.text) return step.text;
                return '';
              }).filter(Boolean);
            } else if (typeof recipe.recipeInstructions === 'string') {
              instructions = [recipe.recipeInstructions];
            }

            // Parse times (ISO 8601 duration format: PT15M, PT1H30M)
            const parseISODuration = (duration: string): number => {
              if (!duration) return 0;
              const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
              if (!match) return 0;
              const hours = parseInt(match[1] || '0', 10);
              const minutes = parseInt(match[2] || '0', 10);
              return hours * 60 + minutes;
            };

            const prep_time = parseISODuration(recipe.prepTime || '');
            const cook_time = parseISODuration(recipe.cookTime || recipe.totalTime || '');

            // Get image
            let image = '';
            if (recipe.image) {
              if (typeof recipe.image === 'string') {
                image = recipe.image;
              } else if (Array.isArray(recipe.image)) {
                image = recipe.image[0];
              } else if (recipe.image.url) {
                image = recipe.image.url;
              }
            }

            return {
              title: recipe.name || recipe.headline || "Untitled Recipe",
              author: recipe.author?.name || recipe.author || "",
              ingredients,
              instructions,
              image,
              yield: recipe.recipeYield ? String(recipe.recipeYield) : "",
              prep_time,
              cook_time,
              notes: recipe.description || ""
            };
          }
        } catch (e) {
          console.log("[recipe-proxy] JSON-LD parse failed:", e);
          continue;
        }
      }
    }

    // Fallback: Try to parse HTML with AI
    console.log("[recipe-proxy] No JSON-LD found, trying AI extraction from HTML");
    const recipeData = await parseRecipeText(html);

    if (recipeData.ingredients.length > 0 || recipeData.instructions.length > 0) {
      // Try to get title from page
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1].split('|')[0].split('-')[0].trim() : "Extracted Recipe";

      // Try to get image from og:image
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      const image = ogImageMatch ? ogImageMatch[1] : "";

      return {
        title,
        author: "",
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        image,
        yield: recipeData.yield || "",
        prep_time: recipeData.prep_time || 0,
        cook_time: recipeData.cook_time || 0,
        notes: recipeData.notes || "Extracted with AI"
      };
    }

    console.log("[recipe-proxy] Could not extract recipe from site");
    return null;
  } catch (error) {
    console.error("[recipe-proxy] scrapeRecipeSite error:", error);
    return null;
  }
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

    // 1. Try platform-specific extractors for social media
    let socialResult = null;

    if (url.includes('instagram.com')) {
      console.log("[recipe-proxy] Detected Instagram URL");
      socialResult = await extractInstagramVideo(url);
    } else if (url.includes('tiktok.com')) {
      console.log("[recipe-proxy] Detected TikTok URL");
      socialResult = await extractTikTokVideo(url);
    } else if (url.includes('youtube.com') || url.includes('youtu.be')) {
      console.log("[recipe-proxy] Detected YouTube URL");
      socialResult = await extractYouTubeVideo(url);
    }

    if (socialResult) {
      console.log("[recipe-proxy] Successfully extracted from social media");
      return new Response(JSON.stringify(socialResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 2. Try scraping recipe websites (AllRecipes, Food Network, etc.)
    console.log("[recipe-proxy] Trying recipe website extraction");
    const websiteResult = await scrapeRecipeSite(url);
    if (websiteResult) {
      console.log("[recipe-proxy] Successfully extracted from recipe website");
      return new Response(JSON.stringify(websiteResult), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 3. FINAL FALLBACK → RENDER.COM (backup server)
    console.log("[recipe-proxy] All extractions failed, falling back to Render.com");
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
    return new Response(JSON.stringify({ error: error.message || "Failed to extract recipe" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
