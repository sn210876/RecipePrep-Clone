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

Extract and return ONLY a valid JSON object with this exact structure (no markdown, no code blocks, just raw JSON):
{
  "title": "string - recipe name from video",
  "description": "string - brief description from video",
  "ingredients": [
    {
      "quantity": "string - EXACT amount from transcript",
      "unit": "string - EXACT unit from transcript (cup, tbsp, pinch, to taste, etc)",
      "name": "string - EXACT ingredient name from transcript"
    }
  ],
  "instructions": [
    "string - step 1 EXACTLY as said in transcript",
    "string - step 2 EXACTLY as said in transcript"
  ],
  "prepTime": number - minutes (estimate if not mentioned),
  "cookTime": number - minutes (estimate if not mentioned),
  "servings": number - servings mentioned or estimate,
  "cuisine": "string - cuisine type",
  "difficulty": "Easy|Medium|Hard",
  "dietaryTags": ["string - tags like Vegetarian, Vegan, etc"]
}

Remember: The transcript is the truth - extract from it verbatim. Do not create, invent, or modify ingredients or steps.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 3000,
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
