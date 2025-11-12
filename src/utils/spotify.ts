let token = '';
let tokenExpiry = 0;

export const getSpotifyToken = async () => {
  if (Date.now() < tokenExpiry && token) return token;

  const clientId = import.meta.env.VITE_SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.VITE_SPOTIFY_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    console.error('Spotify credentials missing');
    throw new Error('Spotify API credentials not configured');
  }

  console.log('Fetching Spotify token...');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(clientId + ':' + clientSecret),
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const error = await res.text();
    console.error('Spotify token error:', error);
    throw new Error('Failed to get Spotify token');
  }

  const data = await res.json();
  token = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);
  console.log('Spotify token obtained successfully');
  return token;
};

export const searchSpotify = async (query: string) => {
  try {
    const authToken = await getSpotifyToken();
    console.log('Searching Spotify for:', query);

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Spotify search error:', error);
      throw new Error('Failed to search Spotify');
    }

    const data = await res.json();
    const tracks = (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      title: t.name,
      artist: t.artists[0].name,
      preview: t.preview_url,
      cover: t.album.images[1]?.url,
    })).filter((s: any) => s.preview);

    console.log(`Found ${tracks.length} tracks with previews`);
    return tracks;
  } catch (error) {
    console.error('Spotify search failed:', error);
    throw error;
  }
};
