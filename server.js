import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import OpenAI from 'openai';

dotenv.config();

const app = express();
const execPromise = promisify(exec);

app.use(express.json());
app.use(cors());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(limiter);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const tempDir = path.join(process.cwd(), 'temp');

// Find yt-dlp in system path or local bin directory
async function getYtDlpPath() {
  // Try multiple possible paths
  const possiblePaths = [
    path.join(process.cwd(), 'bin', 'yt-dlp'),
    './bin/yt-dlp',
    '/opt/render/project/bin/yt-dlp',
  ];

  for (const testPath of possiblePaths) {
    try {
      await fs.access(testPath);
      console.log('✅ Found yt-dlp at:', testPath);
      return testPath;
    } catch (e) {
      // Path doesn't exist, try next
    }
  }

  console.log('⚠️  Local yt-dlp not found, using system PATH');
  return 'yt-dlp'; // Use system PATH
}

let ytDlpCmd = await getYtDlpPath();
console.log('🔍 Using yt-dlp at:', ytDlpCmd);

// Verify yt-dlp is accessible
try {
  if (ytDlpCmd !== 'yt-dlp') {
    await fs.access(ytDlpCmd, fs.constants.X_OK);
    console.log('✅ yt-dlp is executable');
  }
  const { stdout } = await execPromise(`${ytDlpCmd} --version`);
  console.log('✅ yt-dlp version:', stdout.trim());
} catch (error) {
  console.error('⚠️  WARNING: yt-dlp verification failed:', error.message);
  console.error('⚠️  Video extraction will not work until yt-dlp is available');
}

async function ensureTempDir() {
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
}

async function downloadAudio(videoUrl, videoId) {
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
  const command = `${ytDlpCmd} -f "bestaudio" -x --audio-format mp3 -o "${audioPath.replace(/\.mp3$/, '')}" "${videoUrl}"`;

  try {
    await execPromise(command);
    return audioPath;
  } catch (error) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function downloadThumbnail(videoUrl, videoId) {
  const thumbnailPath = path.join(tempDir, videoId);
  const command = `${ytDlpCmd} --skip-download --write-thumbnail --convert-thumbnails jpg -o "${thumbnailPath}" "${videoUrl}"`;

  try {
    await execPromise(command);
    const jpgPath = `${thumbnailPath}.jpg`;
    await fs.access(jpgPath);
    return jpgPath;
  } catch (error) {
    throw new Error(`Failed to download thumbnail: ${error.message}`);
  }
}

async function getVideoMetadata(videoUrl, videoId) {
  const infoPath = path.join(tempDir, `${videoId}.info.json`);
  const command = `${ytDlpCmd} --skip-download --write-info-json -o "${path.join(tempDir, videoId)}" "${videoUrl}"`;

  try {
    await execPromise(command);
    const infoContent = await fs.readFile(infoPath, 'utf-8');
    const metadata = JSON.parse(infoContent);

    return {
      description: metadata.description || '',
      title: metadata.title || '',
      uploader: metadata.uploader || '',
    };
  } catch (error) {
    console.error('Failed to get video metadata:', error);
    return { description: '', title: '', uploader: '' };
  }
}

async function transcribeAudio(audioPath) {
  try {
    const audioBuffer = await fs.readFile(audioPath);
    const file = new File([audioBuffer], 'audio.mp3', { type: 'audio/mpeg' });

    const transcript = await openai.audio.transcriptions.create({
      model: 'whisper-1',
      file: file,
    });

    return transcript.text;
  } catch (error) {
    throw new Error(`Failed to transcribe audio: ${error.message}`);
  }
}

async function convertImageToBase64(imagePath) {
  try {
    const imageBuffer = await fs.readFile(imagePath);
    return imageBuffer.toString('base64');
  } catch (error) {
    throw new Error(`Failed to convert image to base64: ${error.message}`);
  }
}

async function extractRecipeFromTranscript(transcript, thumbnailBase64, videoMetadata) {
  const prompt = `You are a recipe extraction expert. Your PRIMARY SOURCE is the video transcript - this is the most important source of information.

===== VIDEO TRANSCRIPT (PRIMARY SOURCE - USE THIS FIRST) =====
${transcript}

${videoMetadata.description ? `===== VIDEO DESCRIPTION (SECONDARY SOURCE) =====\n${videoMetadata.description}\n` : ''}

CRITICAL EXTRACTION RULES:
1. THE TRANSCRIPT IS YOUR PRIMARY SOURCE - extract ALL ingredients and instructions from it first
2. Only use the description if the transcript is incomplete or unclear
3. Extract ingredients WORD-FOR-WORD from the transcript - do not paraphrase
4. Extract cooking steps EXACTLY as spoken in the transcript, in the exact order
5. If measurements are mentioned in the transcript (cups, tablespoons, pinches), use those EXACT terms
6. If the creator says "some", "a bit", "to taste", preserve those exact phrases
7. Each sentence or instruction in the transcript should typically become one step
8. Do NOT make up or infer information - only use what was actually said

RESPONSE FORMAT REQUIREMENT:
You MUST respond with ONLY a valid JSON object. NO markdown formatting, NO code blocks, NO backticks, NO explanation text.
Just the raw JSON object starting with { and ending with }.

The JSON structure MUST be exactly:
{
  "title": "recipe name from video",
  "description": "brief description from video",
  "ingredients": [
    {"quantity": "2", "unit": "cup", "name": "flour"},
    {"quantity": "1", "unit": "tsp", "name": "salt"}
  ],
  "instructions": [
    "First step exactly as said",
    "Second step exactly as said"
  ],
  "prepTime": 15,
  "cookTime": 30,
  "servings": 4,
  "cuisine": "cuisine type",
  "difficulty": "Easy",
  "dietaryTags": []
}

IMPORTANT: Each ingredient MUST be an object with "quantity", "unit", and "name" properties. Never use strings.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content;
    console.log('Raw GPT response:', content);

    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in response');
      }
      recipe = JSON.parse(jsonMatch[0]);
    }

    if (!Array.isArray(recipe.ingredients)) {
      console.error('Invalid ingredients format:', recipe.ingredients);
      recipe.ingredients = [];
    }

    recipe.imageUrl = `data:image/jpeg;base64,${thumbnailBase64}`;

    return recipe;
  } catch (error) {
    console.error('Failed to extract recipe:', error);
    throw new Error(`Failed to extract recipe: ${error.message}`);
  }
}

async function cleanupFiles(videoId) {
  try {
    const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
    const jpgPath = path.join(tempDir, `${videoId}.jpg`);
    const infoPath = path.join(tempDir, `${videoId}.info.json`);

    await Promise.all([
      fs.unlink(audioPath).catch(() => {}),
      fs.unlink(jpgPath).catch(() => {}),
      fs.unlink(infoPath).catch(() => {}),
    ]);
  } catch (error) {
    console.error('Error cleaning up files:', error);
  }
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.post('/extract', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const videoId = `video_${Date.now()}`;

    const audioPath = await downloadAudio(url, videoId);
    const thumbnailPath = await downloadThumbnail(url, videoId);
    const videoMetadata = await getVideoMetadata(url, videoId);

    const transcript = await transcribeAudio(audioPath);

    const thumbnailBase64 = await convertImageToBase64(thumbnailPath);

    const recipe = await extractRecipeFromTranscript(transcript, thumbnailBase64, videoMetadata);

    console.log('Raw recipe from GPT:', JSON.stringify(recipe, null, 2));
    console.log('Transcript was:', transcript.substring(0, 500) + '...');

    await cleanupFiles(videoId);

    const ingredientStrings = recipe.ingredients?.map(ing => {
      if (typeof ing === 'string') {
        return ing;
      }
      const parts = [];
      if (ing.quantity) parts.push(ing.quantity);
      if (ing.unit) parts.push(ing.unit);
      if (ing.name) parts.push(ing.name);
      return parts.join(' ').trim();
    }) || [];

    console.log('Formatted ingredients:', ingredientStrings);

    res.json({
      title: recipe.title || videoMetadata.title,
      channel: videoMetadata.uploader,
      creator: videoMetadata.uploader,
      ingredients: ingredientStrings,
      instructions: recipe.instructions || [],
      prep_time: recipe.prepTime || 15,
      cook_time: recipe.cookTime || 30,
      servings: String(recipe.servings || 4),
      yield: String(recipe.servings || 4),
      thumbnail: recipe.imageUrl || '',
      image: recipe.imageUrl || '',
      notes: 'extracted from video'
    });
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({
      error: error.message || 'Failed to process video',
    });
  }
});

app.post('/api/extract-recipe-from-video', async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    const videoId = `video_${Date.now()}`;

    const audioPath = await downloadAudio(url, videoId);
    const thumbnailPath = await downloadThumbnail(url, videoId);
    const videoMetadata = await getVideoMetadata(url, videoId);

    const transcript = await transcribeAudio(audioPath);

    const thumbnailBase64 = await convertImageToBase64(thumbnailPath);

    const recipe = await extractRecipeFromTranscript(transcript, thumbnailBase64, videoMetadata);

    await cleanupFiles(videoId);

    res.json({
      success: true,
      recipe: recipe,
      metadata: {
        transcript: transcript,
        description: videoMetadata.description,
      },
    });
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({
      error: error.message || 'Failed to process video',
    });
  }
});

app.post('/youtube-metadata', async (req, res) => {
  try {
    const { videoId } = req.body;

    if (!videoId) {
      return res.status(400).json({ error: 'Video ID is required' });
    }

    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'YouTube API key not configured' });
    }

    console.log('Fetching YouTube metadata for:', videoId);

    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${videoId}&key=${apiKey}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('YouTube API error:', errorText);
      return res.status(response.status).json({ error: 'YouTube API error', detail: errorText });
    }

    const data = await response.json();

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const video = data.items[0];
    const result = {
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.default?.url || '',
      channelTitle: video.snippet.channelTitle,
    };

    console.log('YouTube metadata retrieved:', result.title);

    res.json(result);
  } catch (error) {
    console.error('Error fetching YouTube metadata:', error);
    res.status(500).json({
      error: error.message || 'Failed to fetch YouTube metadata',
    });
  }
});

app.post('/extract-from-description', async (req, res) => {
  try {
    const { title, description, thumbnail, channelTitle } = req.body;

    if (!description) {
      return res.status(400).json({ error: 'Description is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('Extracting recipe from description...');

    const prompt = `Extract a structured recipe from this YouTube video description.

Video Title: ${title || 'Unknown'}
Channel: ${channelTitle || 'Unknown'}

Description:
${description}

EXTRACTION RULES:
1. Extract ALL ingredients with their measurements exactly as written
2. Extract ALL cooking instructions in order
3. Extract prep time, cook time, and servings if mentioned
4. If times aren't specified, estimate based on recipe complexity
5. Identify cuisine type and difficulty level
6. Extract any dietary tags (vegetarian, vegan, gluten-free, etc.)

RESPONSE FORMAT:
Respond with ONLY a valid JSON object (no markdown, no code blocks):
{
  "title": "recipe title from description or video title",
  "description": "brief description of the dish",
  "prepTime": number (minutes),
  "cookTime": number (minutes),
  "servings": number,
  "difficulty": "Easy" or "Medium" or "Hard",
  "cuisineType": "type of cuisine",
  "ingredients": [
    {"name": "ingredient name", "quantity": "amount", "unit": "unit"}
  ],
  "instructions": ["step 1", "step 2", ...],
  "dietaryTags": ["tag1", "tag2", ...],
  "notes": "any additional notes"
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a recipe extraction expert. Extract recipes from text descriptions accurately.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const recipeData = JSON.parse(response.choices[0].message.content);

    console.log('Description extraction successful:', recipeData.title);

    const result = {
      title: recipeData.title || title,
      description: recipeData.description || '',
      creator: channelTitle || 'YouTube',
      ingredients: (recipeData.ingredients || []).map(ing => {
        if (typeof ing === 'string') return ing;
        const parts = [];
        if (ing.quantity) parts.push(ing.quantity);
        if (ing.unit) parts.push(ing.unit);
        if (ing.name) parts.push(ing.name);
        return parts.join(' ').trim();
      }),
      instructions: recipeData.instructions || [],
      prep_time: recipeData.prepTime || 15,
      cook_time: recipeData.cookTime || 30,
      servings: String(recipeData.servings || 4),
      yield: String(recipeData.servings || 4),
      difficulty: recipeData.difficulty || 'Medium',
      cuisineType: recipeData.cuisineType || 'Global',
      dietaryTags: recipeData.dietaryTags || [],
      thumbnail: thumbnail || '',
      image: thumbnail || '',
      imageUrl: thumbnail || '',
      notes: recipeData.notes || 'Extracted from video description',
      extractionMethod: 'description'
    };

    res.json(result);
  } catch (error) {
    console.error('Error extracting from description:', error);
    res.status(500).json({
      error: error.message || 'Failed to extract recipe from description',
      detail: error.toString()
    });
  }
});

app.post('/api/extract-photo', async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({ error: 'OpenAI API key not configured' });
    }

    console.log('Processing recipe photo...');

    const prompt = `You are a recipe extraction expert. Analyze this image which contains a recipe (could be from a recipe card, cookbook page, handwritten note, or screen capture).

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
}`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
                detail: 'high'
              }
            }
          ]
        }
      ],
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0].message.content;
    console.log('Raw GPT response:', content);

    let recipe;
    try {
      recipe = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      throw new Error('Failed to parse recipe from image');
    }

    const ingredientStrings = (recipe.ingredients || []).map(ing => {
      if (typeof ing === 'string') return ing;
      const parts = [];
      if (ing.quantity) parts.push(ing.quantity);
      if (ing.unit) parts.push(ing.unit);
      if (ing.name) parts.push(ing.name);
      return parts.join(' ').trim();
    });

    res.json({
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
      thumbnail: imageBase64,
      image: imageBase64
    });
  } catch (error) {
    console.error('Error processing photo:', error);
    res.status(500).json({
      error: error.message || 'Failed to process photo',
    });
  }
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
  });
});

await ensureTempDir();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('================================================');
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`📁 Working directory: ${process.cwd()}`);
  console.log(`🔧 yt-dlp command: ${ytDlpCmd}`);
  console.log(`📂 Temp directory: ${tempDir}`);
  console.log('================================================');
});
