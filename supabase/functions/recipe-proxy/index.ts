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

        if (description.length > 20) {
          const aiResult = await parseWithAI(description);
          if (aiResult.ingredients.length > 0 || aiResult.instructions.length > 0) {
            return {
              title: description.substring(0, 60) + (description.length > 60 ? "..." : ""),
              author,
              ingredients: aiResult.ingredients,
              instructions: aiResult.instructions,
              image: thumbnail,
              yield: aiResult.yield || '',
              prep_time: aiResult.prep_time || 0,
              cook_time: aiResult.cook_time || 0,
              notes: "Extracted from TikTok description"
            };
          }
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

    // Extract description
    const descMatch = html.match(/"description":{"simpleText":"([^"]+)"}/);
    const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : "";

    // Extract thumbnail
    const thumbnail = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

    // Extract channel name
    const channelMatch = html.match(/"author":"([^"]+)"/);
    const author = channelMatch ? channelMatch[1] : "";

    if (description.length > 50) {
      const aiResult = await parseWithAI(description);
      if (aiResult.ingredients.length > 0 || aiResult.instructions.length > 0) {
        return {
          title,
          author,
          ingredients: aiResult.ingredients,
          instructions: aiResult.instructions,
          image: thumbnail,
          yield: aiResult.yield || '',
          prep_time: aiResult.prep_time || 0,
          cook_time: aiResult.cook_time || 0,
          notes: "Extracted from YouTube description"
        };
      }
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

    if (!description || description.length < 20) {
      console.log("[recipe-proxy] No caption found");
      return null;
    }

    const aiResult = await parseWithAI(description);
    if (aiResult.ingredients.length > 0 || aiResult.instructions.length > 0) {
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
    const aiResult = await parseWithAI(html);

    if (aiResult.ingredients.length > 0 || aiResult.instructions.length > 0) {
      // Try to get title from page
      const titleMatch = html.match(/<title>([^<]+)<\/title>/);
      const title = titleMatch ? titleMatch[1].split('|')[0].split('-')[0].trim() : "Extracted Recipe";

      // Try to get image from og:image
      const ogImageMatch = html.match(/<meta property="og:image" content="([^"]+)"/);
      const image = ogImageMatch ? ogImageMatch[1] : "";

      return {
        title,
        author: "",
        ingredients: aiResult.ingredients,
        instructions: aiResult.instructions,
        image,
        yield: aiResult.yield || "",
        prep_time: aiResult.prep_time || 0,
        cook_time: aiResult.cook_time || 0,
        notes: aiResult.notes || "Extracted with AI"
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
