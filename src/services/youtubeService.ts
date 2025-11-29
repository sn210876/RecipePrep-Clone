// Extract video ID from various YouTube URL formats
export function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /^([a-zA-Z0-9_-]{11})$/ // Direct video ID
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

// Fetch video data from YouTube Data API via backend proxy
export async function getYouTubeVideoData(videoId: string) {
  const RENDER_SERVER = import.meta.env.VITE_API_URL || 'https://recipe-backend-nodejs-1.onrender.com';

  // Call backend to proxy YouTube API request (avoids referrer restrictions)
  const response = await fetch(`${RENDER_SERVER}/youtube-metadata`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ videoId }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Service] Failed to fetch metadata:', errorText);
    throw new Error(`YouTube API error: ${response.status}`);
  }

  const data = await response.json();

  return {
    title: data.title,
    description: data.description,
    thumbnail: data.thumbnail,
    channelTitle: data.channelTitle,
  };
}

// Check if description likely contains a recipe
export function hasRecipeInDescription(description: string): boolean {
  const keywords = [
    'ingredients',
    'instructions',
    'directions',
    'recipe',
    'cups',
    'tablespoon',
    'teaspoon',
    'serves',
    'prep time',
    'cook time',
    'method',
    'step 1',
    'step 2',
  ];

  const lowerDesc = description.toLowerCase();
  const matchCount = keywords.filter(keyword => lowerDesc.includes(keyword)).length;
  
  // If 3+ recipe keywords found, likely has recipe
  return matchCount >= 3;
}

// Extract recipe from description using AI
export async function extractRecipeFromDescription(data: {
  title: string;
  description: string;
  thumbnail: string;
  channelTitle?: string;
}): Promise<any> {
  const RENDER_SERVER = import.meta.env.VITE_API_URL || 'https://recipe-backend-nodejs-1.onrender.com';

  const response = await fetch(`${RENDER_SERVER}/extract-from-description`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[YouTube Service] Description extraction failed:', errorText);
    throw new Error('Failed to extract recipe from description');
  }

  return response.json();
}