# API Configuration Summary

## ✅ Recipe Extraction API Endpoint

**File:** `src/services/recipeExtractor.ts`

**Current Configuration:**
```typescript
const API_URL = 'https://recipeapi-py.onrender.com/extract';
```

### Confirmed Settings:
- ✅ Using Render hosted API
- ✅ **NOT** using localhost
- ✅ Points to `https://recipeapi-py.onrender.com/extract`
- ✅ No local server required

## How It Works

1. **User pastes URL** in "Add Recipe" → "Import from URL"
2. **Frontend sends POST request** to `https://recipeapi-py.onrender.com/extract`
3. **Render API processes** the video/URL and extracts recipe data
4. **Response is parsed** and displayed in preview modal
5. **User can review/edit** before saving

## API Request Format

```json
POST https://recipeapi-py.onrender.com/extract
Content-Type: application/json

{
  "url": "https://instagram.com/p/..."
}
```

## API Response Format

The Render API returns:
```json
{
  "recipe": {
    "title": "Recipe Name",
    "description": "Description",
    "ingredients": ["2 cups flour", "1 tsp salt"],
    "steps": ["Mix ingredients", "Bake at 350°F"],
    "time": 10,
    "cookTime": 20,
    "serves": 4,
    "cuisine": "Italian",
    "difficulty": "Easy",
    "mealTypes": ["Dinner"],
    "dietary": ["Vegetarian"],
    "imageUrl": "https://..."
  },
  "creator": "@username",
  "thumb": "https://...",
  "transcript": "Full transcript text..."
}
```

## Features

- ✅ Extracts from Instagram, TikTok, YouTube, and recipe websites
- ✅ Powered by your Render API backend
- ✅ No local setup required
- ✅ No OpenAI key needed in frontend
- ✅ Works in bolt.new preview

## Error Handling

The code handles these scenarios:
- Invalid URLs → "Please enter a valid URL"
- Connection errors → "Cannot connect to recipe extraction service"
- API errors → Displays specific error message from API
- Missing data → Uses sensible defaults

## Testing

To test the extraction:
1. Navigate to "Add Recipe"
2. Paste an Instagram reel URL: `https://instagram.com/p/...`
3. Click "Extract Recipe"
4. Review the extracted data in the modal
5. Click "Use This Recipe" to populate the form

## No Local Server Needed

The previous configuration required:
- ❌ Local Node.js server running
- ❌ OpenAI API key in .env
- ❌ yt-dlp installation

**Current configuration only requires:**
- ✅ Your Render API to be running
- ✅ Internet connection

Your Render API handles all the heavy lifting!
