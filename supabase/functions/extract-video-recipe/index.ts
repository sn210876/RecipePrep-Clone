import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ASSEMBLYAI_API_KEY = Deno.env.get("ASSEMBLYAI_API_KEY") || "";

interface RecipeExtractionResult {
  title: string;
  description: string;
  channel: string;
  ingredients: string[];
  instructions: string[];
  prep_time: number;
  cook_time: number;
  servings: string;
  thumbnail: string;
  transcript?: string;
}

async function extractVideoId(url: string): Promise<{ platform: string; videoId: string; embedUrl: string }> {
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    let videoId = '';
    if (url.includes('youtu.be/')) {
      videoId = url.split('youtu.be/')[1].split('?')[0];
    } else if (url.includes('v=')) {
      videoId = url.split('v=')[1].split('&')[0];
    }
    return {
      platform: 'youtube',
      videoId,
      embedUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  }

  if (url.includes('tiktok.com')) {
    return {
      platform: 'tiktok',
      videoId: url,
      embedUrl: url
    };
  }

  if (url.includes('instagram.com')) {
    return {
      platform: 'instagram',
      videoId: url,
      embedUrl: url
    };
  }

  throw new Error('Unsupported video platform');
}

async function transcribeVideo(videoUrl: string): Promise<{ transcript: string; thumbnail?: string }> {
  console.log('[AssemblyAI] Starting transcription for:', videoUrl);

  const transcriptResponse = await fetch('https://api.assemblyai.com/v2/transcript', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      audio_url: videoUrl,
      language_code: 'en',
    }),
  });

  if (!transcriptResponse.ok) {
    const error = await transcriptResponse.text();
    console.error('[AssemblyAI] Transcription request failed:', error);
    throw new Error('Failed to start transcription');
  }

  const { id: transcriptId } = await transcriptResponse.json();
  console.log('[AssemblyAI] Transcript ID:', transcriptId);

  let transcript = null;
  let attempts = 0;
  const maxAttempts = 60;

  while (attempts < maxAttempts) {
    const pollingResponse = await fetch(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: {
        'Authorization': ASSEMBLYAI_API_KEY,
      },
    });

    const result = await pollingResponse.json();
    console.log('[AssemblyAI] Status:', result.status);

    if (result.status === 'completed') {
      transcript = result.text;
      break;
    } else if (result.status === 'error') {
      throw new Error(`Transcription failed: ${result.error}`);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));
    attempts++;
  }

  if (!transcript) {
    throw new Error('Transcription timeout');
  }

  console.log('[AssemblyAI] Transcription completed, length:', transcript.length);
  return { transcript };
}

async function extractRecipeWithLeMUR(transcript: string, videoMetadata: any): Promise<RecipeExtractionResult> {
  console.log('[AssemblyAI LeMUR] Extracting recipe from transcript');

  const prompt = `You are a recipe extraction expert. Extract a complete recipe from this video transcript.

TRANSCRIPT:
${transcript}

${videoMetadata.title ? `VIDEO TITLE: ${videoMetadata.title}` : ''}
${videoMetadata.description ? `VIDEO DESCRIPTION: ${videoMetadata.description}` : ''}

EXTRACTION RULES:
1. Extract ALL ingredients mentioned with their exact quantities and units
2. Extract ALL cooking steps in the exact order they appear
3. If measurements are vague ("some", "a bit"), keep those terms
4. Estimate prep and cook times based on the instructions
5. Extract servings/yield if mentioned
6. Use the video title as the recipe title

Return ONLY valid JSON in this exact format:
{
  "title": "Recipe Name",
  "description": "Brief description",
  "ingredients": ["1 cup flour", "2 eggs", ...],
  "instructions": ["Step 1", "Step 2", ...],
  "prep_time": 15,
  "cook_time": 30,
  "servings": "4"
}`;

  const lemurResponse = await fetch('https://api.assemblyai.com/lemur/v3/generate/task', {
    method: 'POST',
    headers: {
      'Authorization': ASSEMBLYAI_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt,
      context: transcript,
      final_model: 'anthropic/claude-3-5-sonnet',
    }),
  });

  if (!lemurResponse.ok) {
    const error = await lemurResponse.text();
    console.error('[AssemblyAI LeMUR] Failed:', error);
    throw new Error('Failed to extract recipe with LeMUR');
  }

  const lemurResult = await lemurResponse.json();
  console.log('[AssemblyAI LeMUR] Raw response:', lemurResult.response);

  const jsonMatch = lemurResult.response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in LeMUR response');
  }

  const recipe = JSON.parse(jsonMatch[0]);

  return {
    title: recipe.title || videoMetadata.title || 'Video Recipe',
    description: recipe.description || '',
    channel: videoMetadata.channel || 'Unknown',
    ingredients: recipe.ingredients || [],
    instructions: recipe.instructions || [],
    prep_time: recipe.prep_time || 15,
    cook_time: recipe.cook_time || 30,
    servings: recipe.servings || '4',
    thumbnail: videoMetadata.thumbnail || '',
    transcript,
  };
}

async function getYouTubeMetadata(url: string): Promise<any> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });
    const html = await response.text();

    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].replace(' - YouTube', '').trim() : 'YouTube Recipe';

    const channelMatch = html.match(/"author":"([^"]+)"/);
    const channel = channelMatch ? channelMatch[1] : 'Unknown';

    const thumbnailMatch = html.match(/"thumbnails":\[{"url":"([^"]+)"/);
    const thumbnail = thumbnailMatch ? thumbnailMatch[1] : '';

    const descMatch = html.match(/"description":\{"simpleText":"([^"]+)"\}/);
    const description = descMatch ? descMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"') : '';

    return { title, channel, thumbnail, description };
  } catch (e) {
    console.error('[YouTube] Metadata extraction failed:', e);
    return { title: 'Video Recipe', channel: 'Unknown', thumbnail: '', description: '' };
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

    if (!ASSEMBLYAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "AssemblyAI API key not configured" }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    console.log('[Video Extractor] Processing:', url);

    const { platform, embedUrl } = await extractVideoId(url);
    console.log('[Video Extractor] Platform:', platform);

    let videoMetadata: any = { title: 'Video Recipe', channel: 'Unknown', thumbnail: '', description: '' };
    if (platform === 'youtube') {
      videoMetadata = await getYouTubeMetadata(embedUrl);
    }

    const { transcript } = await transcribeVideo(embedUrl);

    const recipe = await extractRecipeWithLeMUR(transcript, videoMetadata);

    return new Response(
      JSON.stringify({
        success: true,
        ...recipe,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error('[Video Extractor] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || "Failed to extract recipe from video",
        success: false,
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
