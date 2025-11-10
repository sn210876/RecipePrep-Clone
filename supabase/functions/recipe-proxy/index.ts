import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") || "";

async function parseWithAI(text: string): Promise<{ ingredients: string[], instructions: string[], notes: string }> {
  if (!text.trim() || !OPENAI_API_KEY) return { ingredients: [], instructions: [], notes: "" };

  const prompt = `You are a recipe extraction expert. Extract the recipe from the text and TRANSLATE EVERYTHING TO ENGLISH.

CRITICAL: If the recipe is in another language (Vietnamese, Spanish, French, etc.), you MUST translate all ingredients and instructions to English.

Return ONLY valid JSON in this exact format:
{
  "ingredients": ["1 cup flour", "2 eggs", "1 tsp salt"],
  "instructions": ["Preheat oven to 350F", "Mix ingredients", "Bake for 30 minutes"],
  "notes": "Any cooking tips or notes"
}

Text to extract from:
${text.slice(0, 15000)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: prompt }],
        temperature: 0.1,
        max_tokens: 1200,
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
      };
    }
  } catch (e) {
    console.error("AI parse error:", e);
  }

  return { ingredients: [], instructions: [], notes: "" };
}

async function scrapeRecipeSite(url: string) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    };

    const response = await fetch(url, { headers });
    const html = await response.text();

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].split('|')[0].trim() : 'Recipe';

    const recipeMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([^<]+)<\/script>/i);
    if (recipeMatch) {
      const json = JSON.parse(recipeMatch[1]);
      const recipe = Array.isArray(json) ? json.find((r: any) => r['@type'] === 'Recipe') : json['@type'] === 'Recipe' ? json : null;

      if (recipe) {
        return {
          title: recipe.name || title,
          ingredients: recipe.recipeIngredient || [],
          instructions: Array.isArray(recipe.recipeInstructions)
            ? recipe.recipeInstructions.map((i: any) => typeof i === 'string' ? i : i.text || '')
            : typeof recipe.recipeInstructions === 'string'
              ? recipe.recipeInstructions.split('\n')
              : [],
          image: recipe.image?.url || recipe.image || '',
          yield: recipe.recipeYield || '',
          time: recipe.totalTime || 0,
          notes: 'Scraped from structured data',
        };
      }
    }

    const aiResult = await parseWithAI(html);
    if (aiResult.ingredients.length > 0) {
      return {
        title,
        ingredients: aiResult.ingredients,
        instructions: aiResult.instructions,
        image: '',
        yield: '',
        time: 0,
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

    const renderResponse = await fetch("https://recipe-backend-nodejs-1.onrender.com/extract", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
    });

    const renderData = await renderResponse.json();

    return new Response(
      JSON.stringify(renderData),
      {
        status: renderResponse.ok ? 200 : renderResponse.status,
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
