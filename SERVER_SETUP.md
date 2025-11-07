# Recipe Video Extract Server

A Node.js Express server that extracts recipe information from cooking videos using video processing, speech-to-text transcription, and AI analysis.

## Prerequisites

Before running the server, ensure you have:

1. **Node.js** (v16 or higher)
2. **yt-dlp** installed on your system
   - macOS: `brew install yt-dlp`
   - Ubuntu/Debian: `sudo apt-get install yt-dlp`
   - Windows: `choco install yt-dlp` or download from https://github.com/yt-dlp/yt-dlp

3. **OpenAI API Key** with access to:
   - Whisper API (for audio transcription)
   - GPT-4o (for recipe extraction)

## Installation

1. Install server dependencies:
```bash
npm install
```

2. Create a `.env` file in the project root:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_api_key_here
PORT=3000
```

## Running the Server

### Development (with auto-restart on file changes):
```bash
npm run server:dev
```

### Production:
```bash
npm run server
```

The server will start on `http://localhost:3000`

## API Endpoints

### Health Check
```
GET /api/health
```

Response:
```json
{
  "status": "ok"
}
```

### Extract Recipe from Video
```
POST /api/extract-recipe-from-video
Content-Type: application/json

{
  "url": "https://www.youtube.com/watch?v=..."
}
```

Response:
```json
{
  "success": true,
  "recipe": {
    "title": "Pasta Carbonara",
    "description": "Classic Italian pasta dish...",
    "ingredients": [
      {
        "quantity": "1",
        "unit": "lb",
        "name": "spaghetti"
      }
    ],
    "instructions": [
      "Boil water in a large pot...",
      "Cook spaghetti..."
    ],
    "prepTime": 10,
    "cookTime": 20,
    "servings": 4,
    "cuisine": "Italian",
    "difficulty": "Easy",
    "dietaryTags": ["Vegetarian"],
    "imageUrl": "data:image/jpeg;base64,..."
  }
}
```

## Rate Limiting

The server implements rate limiting: **10 requests per 15 minutes** per IP address.

If the limit is exceeded, you'll receive:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## How It Works

1. **Download Audio**: Uses yt-dlp to extract and convert video audio to MP3
2. **Download Thumbnail**: Uses yt-dlp to capture and convert video thumbnail to JPG
3. **Transcribe**: Sends audio to OpenAI's Whisper API for transcription
4. **Extract Recipe**: Sends transcript + thumbnail image to GPT-4o for recipe analysis
5. **Cleanup**: Removes temporary files after processing

## Error Handling

The server handles various errors gracefully:

- Missing or invalid URL
- OpenAI API key not configured
- yt-dlp not found on system
- Video processing failures
- API rate limits

All errors return a 500 status code with a descriptive error message.

## Environment Variables

- `OPENAI_API_KEY`: Your OpenAI API key (required)
- `PORT`: Server port (default: 3000)

## Temporary Files

Temporary files are stored in a `temp/` directory and automatically cleaned up after processing. Make sure your system has sufficient disk space for audio and image files.

## Troubleshooting

### yt-dlp not found
Make sure yt-dlp is installed and accessible from your PATH:
```bash
which yt-dlp  # on macOS/Linux
where yt-dlp  # on Windows
```

### OpenAI API errors
Verify your API key has access to:
- Whisper API (audio transcription)
- GPT-4o model (recipe extraction)

Check your OpenAI account limits and usage at https://platform.openai.com/account/billing/overview

### Timeout or processing errors
Longer videos may take more time to process. The server has reasonable timeout values, but very long videos might require increased limits.
