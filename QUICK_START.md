# Quick Start Guide

## ✅ Preview Window Fixed

The Vite config has been updated to work with bolt.new:
- Server binds to `0.0.0.0` (accessible from preview)
- Port set to `5173`
- **The preview should now work!**

## Current App Status

### ✅ Working Features (No Setup Required):
- Manual recipe entry with full form
- My Recipes - view and manage saved recipes
- Cook Mode with voice controls
- Shopping list generation
- Meal planner
- Recipe discovery and browsing

### ❌ Disabled Feature:
- **Import from URL** - Requires OpenAI API key and yt-dlp

## Using the App (Simple Mode)

1. The preview window should now display your app
2. Navigate to "Add Recipe"
3. Scroll past the "Import from URL" section
4. Use the manual form to create recipes:
   - Enter title, times, servings
   - Select cuisine and difficulty
   - Add ingredients and instructions
   - Save your recipe!

## Enable Recipe Extraction (Optional)

To enable importing recipes from URLs:

### 1. Get OpenAI API Key
Visit https://platform.openai.com/api-keys

### 2. Install yt-dlp

**Mac:**
```bash
brew install yt-dlp
```

**Linux:**
```bash
sudo wget https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -O /usr/local/bin/yt-dlp
sudo chmod a+rx /usr/local/bin/yt-dlp
```

### 3. Add API Key to .env
```bash
OPENAI_API_KEY=sk-your-key-here
```

### 4. Start Extraction Server
```bash
npm run server
```

Server runs on `http://localhost:3000`

### 5. Test It
```bash
curl http://localhost:3000/api/health
```

Should return: `{ "status": "ok" }`

## Cost Information

Recipe extraction uses OpenAI API:
- Whisper (transcription): ~$0.006/minute
- GPT-4 (extraction): ~$0.01-0.03/recipe
- **Total per recipe: $0.02-0.05**

## Troubleshooting Preview

### Preview shows "Connection Refused"
- Restart the dev server
- Check Vite output for errors
- Ensure port 5173 is available

### Recipe extraction not working
- Verify server is running: `npm run server`
- Check `.env` has `OPENAI_API_KEY`
- Confirm yt-dlp installed: `yt-dlp --version`

### "Cannot connect to extraction server"
The extraction feature needs the backend server running. Use manual entry instead, or set up the server (see above).

## More Documentation

- `RECIPE_EXTRACTION_SETUP.md` - Detailed extraction setup
- `SERVER_SETUP.md` - Server deployment guide
- `INTEGRATION_GUIDE.md` - API integration examples
