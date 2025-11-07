# Recipe Extraction Setup Guide

The recipe extraction feature requires a backend server to process video URLs and extract recipes using AI.

## Prerequisites

1. **OpenAI API Key** - Required for transcription (Whisper) and recipe extraction (GPT-4)
2. **yt-dlp** - Command-line tool for downloading videos

## Setup Steps

### 1. Install yt-dlp

**Mac (with Homebrew):**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

**Windows:**
Download from: https://github.com/yt-dlp/yt-dlp/releases

### 2. Configure OpenAI API Key

Add your OpenAI API key to the `.env` file:

```env
OPENAI_API_KEY=sk-your-api-key-here
```

Get your API key from: https://platform.openai.com/api-keys

### 3. Start the Extraction Server

```bash
npm run server
```

The server will run on `http://localhost:3000`

### 4. Use the Feature

1. Go to "Add Recipe" page in the app
2. Paste a video URL (Instagram, TikTok, YouTube, etc.)
3. Click "Extract Recipe"
4. Review and edit the extracted recipe
5. Save to your collection

## How It Works

1. **Download**: yt-dlp downloads the video's audio and thumbnail
2. **Transcribe**: OpenAI Whisper converts audio to text
3. **Extract**: GPT-4 analyzes the transcript and extracts structured recipe data
4. **Display**: The recipe is shown in a preview modal for review

## Costs

- **Whisper API**: ~$0.006 per minute of audio
- **GPT-4 API**: ~$0.01-0.03 per recipe extraction

Typical cost per recipe: **$0.02-0.05**

## Troubleshooting

### "Cannot connect to extraction server"
- Make sure you ran `npm run server`
- Check that port 3000 is available

### "OpenAI API key not configured"
- Add `OPENAI_API_KEY` to your `.env` file
- Restart the server after adding the key

### "Failed to download audio"
- Verify yt-dlp is installed: `yt-dlp --version`
- Some platforms may block downloads (try a different URL)

### "No recipe data returned"
- The video may not contain recipe instructions
- Try a video with clear verbal cooking instructions

## Alternative: Manual Entry

If you don't want to set up the extraction server, you can still manually enter recipes using the form on the "Add Recipe" page.
