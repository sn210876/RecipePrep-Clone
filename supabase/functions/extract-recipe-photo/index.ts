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
    const { images } = await req.json();

    if (!images || !Array.isArray(images) || images.length === 0) {
      return new Response(
        JSON.stringify({ error: 'At least one image is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (images.length > 4) {
      return new Response(
        JSON.stringify({ error: 'Maximum 4 images allowed' }),
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

    console.log(`Processing ${images.length} image(s)...`);

    const prompt = images.length === 1
      ? `You are a recipe extraction expert. Analyze this image which contains a recipe (could be from a recipe card, cookbook page, handwritten note, or screen capture).

Extract ALL visible recipe information with extreme precision:

CRITICAL EXTRACTION RULES:
1. Extract EXACTLY what you see - word for word, number for number
2. If measurements are written as fractions (1/2, 1/4, etc.), keep them as fractions
3. If measurements use abbreviations (tbsp, tsp, oz, etc.), use those exact abbreviations
4. Preserve ALL cooking instructions in their original order and wording
5. If there are section headers or notes, include them
6. If nutrition facts are visible, extract them
7. If the recipe mentions cook time, prep time, servings, extract them
8. If ingredients have special notes (e.g., "divided", "plus extra for dusting"), include those

Return ONLY a valid JSON object with this structure (no markdown, no code blocks):
{
  "title": "exact recipe title from image",
  "description": "brief description if visible",
  "ingredients": [
    {"quantity": "exact amount", "unit": "exact unit", "name": "exact ingredient with any notes"}
  ],
  "instructions": [
    "step 1 exactly as written",
    "step 2 exactly as written"
  ],
  "prepTime": number in minutes or 0 if not specified,
  "cookTime": number in minutes or 0 if not specified,
  "totalTime": number in minutes or 0 if not specified,
  "servings": number or 0 if not specified,
  "yield": "serving description if specified",
  "difficulty": "Easy" or "Medium" or "Hard" (estimate if not specified),
  "cuisine": "cuisine type if mentioned or 'Other'",
  "dietaryTags": ["tags if mentioned, like Vegetarian, Gluten-Free, etc"],
  "notes": "any additional notes, tips, or special instructions",
  "nutrition": {
    "calories": number or null,
    "protein": number or null,
    "carbs": number or null,
    "fat": number or null,
    "fiber": number or null,
    "sugar": number or null
  }
}`
      : `You are a recipe extraction expert. Analyze these ${images.length} images which together contain ONE COMPLETE RECIPE.

The images may show:
- Different pages of the same recipe (e.g., ingredients on one page, instructions on another)
- Multiple photos of the same recipe card from different angles
- A recipe split across multiple photos

CRITICAL EXTRACTION RULES:
1. COMBINE all information from ALL images into ONE COMPLETE recipe
2. Extract EXACTLY what you see - word for word, number for number
3. If ingredients are in one image and instructions in another, combine them
4. Remove any duplicate information that appears in multiple images
5. Preserve the exact measurements, abbreviations, and wording
6. Keep instructions in logical order even if they're split across images
7. If multiple images show the same text, use the clearest version

Return ONLY a valid JSON object with this structure (no markdown, no code blocks):
{
  "title": "exact recipe title from images",
  "description": "brief description if visible",
  "ingredients": [
    {"quantity": "exact amount", "unit": "exact unit", "name": "exact ingredient with any notes"}
  ],
  "instructions": [
    "step 1 exactly as written",
    "step 2 exactly as written"
  ],
  "prepTime": number in minutes or 0 if not specified,
  "cookTime": number in minutes or 0 if not specified,
  "totalTime": number in minutes or 0 if not specified,
  "servings": number or 0 if not specified,
  "yield": "serving description if specified",
  "difficulty": "Easy" or "Medium" or "Hard" (estimate if not specified),
  "cuisine": "cuisine type if mentioned or 'Other'",
  "dietaryTags": ["tags if mentioned, like Vegetarian, Gluten-Free, etc"],
  "notes": "any additional notes, tips, or special instructions",
  "nutrition": {
    "calories": number or null,
    "protein": number or null,
    "carbs": number or null,
    "fat": number or null,
    "fiber": number or null,
    "sugar": number or null
  }
}`;

    const imageContents = images.map((img: string) => ({
      type: 'image_url',
      image_url: {
        url: img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`,
        detail: 'high'
      }
    }));

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 3000,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              ...imageContents
            ]
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
      throw new Error('Failed to parse recipe from images');
    }

    const ingredientStrings = (recipe.ingredients || []).map((ing: any) => {
      if (typeof ing === 'string') return ing;
      const parts = [];
      if (ing.quantity) parts.push(ing.quantity);
      if (ing.unit) parts.push(ing.unit);
      if (ing.name) parts.push(ing.name);
      return parts.join(' ').trim();
    });

    const result = {
      title: recipe.title || 'Recipe from Photo',
      description: recipe.description || '',
      channel: 'Photo Scan',
      creator: 'Photo Scan',
      ingredients: ingredientStrings,
      instructions: recipe.instructions || [],
      prep_time: recipe.prepTime || 0,
      cook_time: recipe.cookTime || 0,
      total_time: recipe.totalTime || 0,
      servings: String(recipe.servings || 4),
      yield: recipe.yield || String(recipe.servings || 4),
      difficulty: recipe.difficulty || 'Medium',
      cuisine: recipe.cuisine || 'Other',
      dietary_tags: recipe.dietaryTags || [],
      notes: recipe.notes || 'Scanned from photo',
      nutrition: recipe.nutrition || {},
      thumbnail: images[0],
      image: images[0]
    };

    return new Response(
      JSON.stringify(result),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error processing photos:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process photos',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});