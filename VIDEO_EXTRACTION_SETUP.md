# Video Recipe Extraction with AssemblyAI

## Overview

Video recipe extraction now uses **AssemblyAI** for transcription and recipe extraction. This replaces the previous Render.com/yt-dlp setup.

## How It Works

1. **User pastes video URL** (YouTube, TikTok, Instagram)
2. **Frontend calls Supabase Edge Function** at `/functions/v1/extract-video-recipe`
3. **Edge function uses AssemblyAI**:
   - Transcribes video audio
   - Uses LeMUR (Claude 3.5 Sonnet) to extract recipe from transcript
4. **Returns structured recipe data** to frontend

## Architecture

```
User Input (Video URL)
    ↓
Frontend (recipeExtractor.ts)
    ↓
Supabase Edge Function (extract-video-recipe)
    ↓
AssemblyAI API
    ├── Transcription API (audio → text)
    └── LeMUR API (text → structured recipe)
    ↓
Structured Recipe Data
    ↓
Frontend Display
```

## Key Files

### Edge Function
- **Location:** `supabase/functions/extract-video-recipe/index.ts`
- **Endpoint:** `https://vohvdarghgqskzqjclux.supabase.co/functions/v1/extract-video-recipe`
- **Features:**
  - Transcribes video using AssemblyAI
  - Extracts recipe using LeMUR
  - Handles YouTube metadata extraction
  - Supports YouTube, TikTok, Instagram

### Frontend Service
- **Location:** `src/services/recipeExtractor.ts`
- **Key Changes:**
  - Removed Render.com references
  - Now uses `VIDEO_API_URL` pointing to edge function
  - Increased timeout to 120 seconds for transcription

## Environment Variables

### Required in Supabase
- `ASSEMBLYAI_API_KEY` - Your AssemblyAI API key (automatically configured)

### Required in Frontend (.env)
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

## Benefits Over Previous Setup

### ✅ Advantages
- Works in WebContainer (no system binaries needed)
- No separate backend server required
- Faster transcription with AssemblyAI
- Better recipe extraction with LeMUR (Claude 3.5 Sonnet)
- Scalable through Supabase edge functions
- No yt-dlp installation needed

### ❌ Removed
- Render.com backend server
- Local Node.js server (server.js)
- OpenAI direct integration
- yt-dlp dependency
- Backend folder and files

## Supported Platforms

- ✅ YouTube
- ✅ TikTok (if audio accessible)
- ✅ Instagram (if audio accessible)
- ✅ Any platform with accessible audio

## Error Handling

The system handles:
- Invalid URLs
- Unsupported platforms
- Transcription failures
- Timeout errors (2-minute max)
- Missing AssemblyAI key

## Testing

To test video extraction:

1. Navigate to "Add Recipe" page
2. Click "Import from URL" tab
3. Paste a YouTube URL (e.g., `https://www.youtube.com/watch?v=xDcoMO0QwF0`)
4. Click "Extract Recipe"
5. Wait 1-2 minutes for transcription
6. Review extracted recipe in preview modal

## Limitations

- Video transcription takes 1-2 minutes
- Videos must have clear audio with recipe instructions
- Non-English videos may have issues (currently set to English)
- Very long videos may hit timeout

## Future Improvements

- Add support for multiple languages
- Implement streaming progress updates
- Cache transcriptions for repeated requests
- Add fallback to YouTube description parsing
