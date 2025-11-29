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

async function ensureTempDir() {
  try {
    await fs.mkdir(tempDir, { recursive: true });
  } catch (error) {
    console.error('Error creating temp directory:', error);
  }
}

async function downloadAudio(videoUrl, videoId) {
  const audioPath = path.join(tempDir, `${videoId}_audio.mp3`);
  const command = `yt-dlp -f "bestaudio" -x --audio-format mp3 -o "${audioPath.replace(/\.mp3$/, '')}" "${videoUrl}"`;

  try {
    await execPromise(command);
    return audioPath;
  } catch (error) {
    throw new Error(`Failed to download audio: ${error.message}`);
  }
}

async function downloadThumbnail(videoUrl, videoId) {
  const thumbnailPath = path.join(tempDir, videoId);
  const command = `yt-dlp --skip-download --write-thumbnail --convert-thumbnails jpg -o "${thumbnailPath}" "${videoUrl}"`;

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
  const command = `yt-dlp --skip-download --write-info-json -o "${path.join(tempDir, videoId)}" "${videoUrl}"`;

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
  console.log(`Server running on port ${PORT}`);
});
