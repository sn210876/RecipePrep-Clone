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
    const { text } = await req.json();

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Processing text for recipe extraction...');

    const prompt = `You are a recipe extraction expert. Analyze the following text which contains recipe information (from an Instagram caption, social media post, or text description).

Extract ALL recipe information:

CRITICAL RULES:
1. Extract ingredients with quantities, units, and names
2. Extract any cooking instructions mentioned
3. Identify prep time, cook time, and servings if mentioned
4. If measurements are fractions, convert them to the format "1/2", "1/4", etc
5. Return empty arrays if no ingredients or instructions are found

Text to analyze:
${text}

Return ONLY a valid JSON object with this structure (no markdown, no code blocks):
{
  "title": "recipe title or 'Recipe from description' if not found",
  "description": "brief description",
  "ingredients": [
    {"quantity": "amount", "unit": "unit", "name": "ingredient name"}
  ],
  "instructions": ["step 1", "step 2"],
  "prepTime": "15 mins" or empty string,
  "cookTime": "30 mins" or empty string,
  "servings": "4" or empty string,
  "difficulty": "Easy" or "Medium" or "Hard",
  "cuisineType": "cuisine type or 'Global'",
  "mealTypes": ["Dinner"],
  "dietaryTags": []
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        response_format: { type: 'json_object' }
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('OpenAI API error:', error);
      throw new Error('OpenAI API request failed');
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    console.log('Raw GPT response:', content);

    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Failed to parse recipe from text');
    }

    return new Response(
      JSON.stringify(recipe),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing text:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process text',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});