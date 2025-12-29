# Recipe Video Extraction Server

Complete Node.js Express server for extracting recipe information from cooking videos.

## Files Created

- **server.js** - Main server implementation (ES6 modules)
- **SERVER_SETUP.md** - Setup and installation guide
- **INTEGRATION_GUIDE.md** - How to integrate with React frontend
- **.env.example** - Environment variables template

## What's Included

### server.js Features

✓ **ES6 Modules** - Full ES6 import/export syntax
✓ **Express Server** - HTTP API with proper error handling
✓ **CORS Support** - Cross-origin requests enabled
✓ **Rate Limiting** - 10 requests per 15 minutes per IP
✓ **Video Processing** - Uses yt-dlp for audio and thumbnail extraction
✓ **Speech to Text** - OpenAI Whisper API integration
✓ **Recipe Extraction** - GPT-4o AI analysis of transcript
✓ **File Management** - Automatic cleanup of temporary files
✓ **Environment Config** - dotenv for configuration

### Endpoints

**GET /api/health**
- Health check endpoint
- Response: `{ status: 'ok' }`

**POST /api/extract-recipe-from-video**
- Extract recipe from video
- Request: `{ url: "video_url" }`
- Response: Complete recipe object with base64 image

## Installation

```bash
# Install all dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env and add your OPENAI_API_KEY

# Install yt-dlp (if not already installed)
# macOS: brew install yt-dlp
# Ubuntu: sudo apt-get install yt-dlp
# Windows: choco install yt-dlp
```

## Running

### Development
```bash
npm run server:dev
```

### Production
```bash
npm run server
```

Server runs on port 3000 (configurable via PORT env var)

## Architecture

### Video Processing Flow

```
1. Download Audio
   ├─ Use yt-dlp to extract audio
   ├─ Convert to MP3 format
   └─ Save as temp file

2. Download Thumbnail
   ├─ Use yt-dlp to extract video thumbnail
   ├─ Convert to JPG format
   └─ Save as temp file

3. Transcribe Audio
   ├─ Read audio file
   ├─ Send to OpenAI Whisper API
   └─ Get text transcript

4. Extract Recipe
   ├─ Convert thumbnail to base64
   ├─ Send transcript + image to GPT-4o
   ├─ Parse JSON response
   └─ Include base64 image in response

5. Cleanup
   ├─ Delete audio file
   ├─ Delete thumbnail file
   └─ Delete metadata files
```

## Dependencies

```json
{
  "cors": "^2.8.5",              // Cross-origin requests
  "dotenv": "^16.3.1",           // Environment configuration
  "express": "^4.18.2",          // HTTP framework
  "express-rate-limit": "^7.1.5", // Rate limiting
  "openai": "^4.52.7"            // OpenAI API client
}
```

### External Requirements

- **yt-dlp** - Video processing and downloading
- **OpenAI API Key** - Whisper + GPT-4o access

## Configuration

### Environment Variables

```
OPENAI_API_KEY=your_api_key_here    # Required
PORT=3000                            # Optional (default: 3000)
```

### Rate Limiting

- Window: 15 minutes
- Limit: 10 requests per IP
- Enforced on all routes

## API Response Format

### Success Response
```json
{
  "success": true,
  "recipe": {
    "title": "Recipe Name",
    "description": "Description",
    "ingredients": [...],
    "instructions": [...],
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "cuisine": "Italian",
    "difficulty": "Easy",
    "dietaryTags": [],
    "imageUrl": "data:image/jpeg;base64,..."
  }
}
```

### Error Response
```json
{
  "error": "Error message describing what went wrong"
}
```

## Code Quality

✓ No syntax errors (verified with `node --check`)
✓ Proper async/await error handling
✓ Comprehensive try-catch blocks
✓ Descriptive error messages
✓ Resource cleanup on completion
✓ Rate limiting on all endpoints

## Testing the Server

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Extract Recipe (requires valid video URL)
```bash
curl -X POST http://localhost:3000/api/extract-recipe-from-video \
  -H "Content-Type: application/json" \
  -d '{"url": "https://www.youtube.com/watch?v=VIDEO_ID"}'
```

## Performance Considerations

- Average processing time: 30-60 seconds per video
- Audio quality: Best available, converted to MP3
- Thumbnail quality: Highest available, converted to JPG
- Transcript accuracy: Depends on audio quality and language
- OpenAI costs: ~$0.05-0.15 per video (Whisper + GPT-4o)

## Security

- Rate limiting prevents abuse
- No API keys exposed in logs
- Temporary files cleaned up immediately
- Input validation on URL parameter
- CORS configured for trusted origins

## Troubleshooting

### Server won't start
- Check port 3000 is available
- Verify Node.js version (v16+)
- Check all dependencies installed

### Video processing fails
- Verify yt-dlp is installed and in PATH
- Check video URL is valid and accessible
- Verify OpenAI API key is correct

### High API costs
- Monitor transcript lengths
- Consider caching results
- Implement request queuing

## Next Steps

1. Read SERVER_SETUP.md for detailed setup
2. Read INTEGRATION_GUIDE.md to integrate with frontend
3. Test with `npm run server:dev`
4. Deploy to production environment

## Support

For issues:
1. Check error messages in console
2. Verify environment variables
3. Ensure yt-dlp is properly installed
4. Check OpenAI API status and quotas
5. Review logs for detailed error info
