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

async function extractRecipeFromTranscript(transcript, thumbnailBase64) {
  const prompt = `You are a recipe extraction expert. Based on the following video transcript, extract a complete recipe and return it as valid JSON with no additional text or markdown.

Transcript:
${transcript}

Extract and return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "title": "string - recipe name",
  "description": "string - brief description of the dish",
  "ingredients": [
    {
      "quantity": "string - amount",
      "unit": "string - measurement unit (cups, tbsp, etc)",
      "name": "string - ingredient name"
    }
  ],
  "instructions": [
    "string - step 1",
    "string - step 2"
  ],
  "prepTime": number - minutes,
  "cookTime": number - minutes,
  "servings": number,
  "cuisine": "string - cuisine type",
  "difficulty": "Easy|Medium|Hard",
  "dietaryTags": ["string - tags like Vegetarian, Vegan, etc"]
}

Make sure all fields are present. If information is not mentioned, use reasonable defaults.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const content = response.choices[0].message.content;

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No valid JSON found in response');
    }

    const recipe = JSON.parse(jsonMatch[0]);
    recipe.imageUrl = `data:image/jpeg;base64,${thumbnailBase64}`;

    return recipe;
  } catch (error) {
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

    const transcript = await transcribeAudio(audioPath);

    const thumbnailBase64 = await convertImageToBase64(thumbnailPath);

    const recipe = await extractRecipeFromTranscript(transcript, thumbnailBase64);

    await cleanupFiles(videoId);

    res.json({
      success: true,
      recipe: recipe,
    });
  } catch (error) {
    console.error('Error processing video:', error);
    res.status(500).json({
      error: error.message || 'Failed to process video',
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
