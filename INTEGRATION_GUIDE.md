# Server Integration Guide

This guide explains how to integrate the recipe extraction server with the React frontend.

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Setup Environment Variables
Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_api_key
PORT=3000
```

### 3. Install yt-dlp
```bash
# macOS
brew install yt-dlp

# Ubuntu/Debian
sudo apt-get install yt-dlp

# Windows
choco install yt-dlp
```

### 4. Run Both Dev Server and Express Server

In separate terminal windows:

**Terminal 1 - React Frontend (Vite):**
```bash
npm run dev
```

**Terminal 2 - Express Backend:**
```bash
npm run server:dev
```

## Frontend Integration

To integrate the video extraction feature in your React app, create a service:

### `src/services/videoRecipeService.ts`
```typescript
export async function extractRecipeFromVideo(videoUrl: string) {
  try {
    const response = await fetch('http://localhost:3000/api/extract-recipe-from-video', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: videoUrl }),
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.success) {
      return data.recipe;
    } else {
      throw new Error(data.error);
    }
  } catch (error) {
    throw new Error(`Failed to extract recipe: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
```

### Usage in Component
```typescript
import { extractRecipeFromVideo } from '../services/videoRecipeService';
import { toast } from 'sonner';

export function AddRecipeFromVideo() {
  const [videoUrl, setVideoUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { dispatch } = useRecipes();

  const handleExtract = async () => {
    try {
      setLoading(true);
      const recipe = await extractRecipeFromVideo(videoUrl);

      // Save to recipes
      dispatch({ type: 'SAVE_RECIPE', payload: recipe });

      toast.success('Recipe extracted successfully!');
      setVideoUrl('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to extract recipe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input
        type="text"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        placeholder="Paste YouTube video URL..."
      />
      <button onClick={handleExtract} disabled={loading}>
        {loading ? 'Extracting...' : 'Extract Recipe'}
      </button>
    </div>
  );
}
```

## API Response Format

The server returns recipes in this format:

```json
{
  "success": true,
  "recipe": {
    "id": "auto-generated",
    "title": "Recipe Name",
    "description": "Brief description",
    "ingredients": [
      {
        "quantity": "2",
        "unit": "cups",
        "name": "flour"
      }
    ],
    "instructions": [
      "Step 1 instructions",
      "Step 2 instructions"
    ],
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4,
    "cuisine": "Italian",
    "difficulty": "Easy",
    "dietaryTags": ["Vegetarian"],
    "imageUrl": "data:image/jpeg;base64,...",
    "mealType": ["Dinner"],
    "tags": [],
    "sourceUrl": "https://youtube.com/...",
    "isSaved": false
  }
}
```

## Error Handling

The server returns errors in this format:

```json
{
  "error": "Descriptive error message"
}
```

Common error codes:
- **400**: Missing or invalid URL
- **500**: Processing error, yt-dlp not found, or OpenAI API error
- **429**: Rate limit exceeded (10 requests per 15 minutes)

## Production Deployment

For production, you'll want to:

1. **Use a proper video queue system** - Process videos asynchronously
2. **Store recipes in Supabase** - Persist extracted recipes
3. **Add authentication** - Protect the video extraction endpoint
4. **Use environment-specific URLs** - Don't hardcode localhost:3000
5. **Add request logging** - Monitor video extraction requests
6. **Set up error tracking** - Use Sentry or similar

### Example Production Setup:

```typescript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

export async function extractRecipeFromVideo(videoUrl: string) {
  const response = await fetch(`${API_BASE_URL}/api/extract-recipe-from-video`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
    body: JSON.stringify({ url: videoUrl }),
  });

  // ... rest of implementation
}
```

## Monitoring

Monitor these server metrics:

- Video processing time
- API error rates
- OpenAI token usage and costs
- Rate limit hits
- Temporary file cleanup success

Add logging to `server.js`:

```javascript
app.post('/api/extract-recipe-from-video', async (req, res) => {
  const startTime = Date.now();

  // ... processing code ...

  const duration = Date.now() - startTime;
  console.log(`Video processed in ${duration}ms`);
  console.log(`OpenAI usage: ${tokens.completion} completion tokens`);
});
```

## Troubleshooting

### Videos not processing
- Check that yt-dlp is installed and in PATH
- Verify video URL is accessible
- Check OpenAI API quotas

### High API costs
- Videos with long durations consume more tokens
- Implement transcript length limits
- Cache extracted recipes

### Slow processing
- Check server disk space for temp files
- Monitor OpenAI API latency
- Consider adding request queue/worker pool
