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

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=50&market=US`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (!res.ok) {
      const error = await res.text();
      console.error('Spotify search error:', error);
      throw new Error('Failed to search Spotify');
    }

    const data = await res.json();

    console.log('Raw Spotify response:', data.tracks?.items?.length, 'tracks');

    const allTracks = (data.tracks?.items || []).map((t: any) => ({
      id: t.id,
      title: t.name,
      artist: t.artists[0]?.name || 'Unknown',
      preview: t.preview_url,
      cover: t.album?.images?.[1]?.url || t.album?.images?.[0]?.url,
      hasPreview: !!t.preview_url
    }));

    console.log('All tracks:', allTracks);
    console.log('Tracks with previews:', allTracks.filter((t: any) => t.hasPreview).length);
    console.log('Tracks without previews:', allTracks.filter((t: any) => !t.hasPreview).length);

    const tracksWithPreview = allTracks.filter((s: any) => s.preview).slice(0, 10);

    if (tracksWithPreview.length === 0 && allTracks.length > 0) {
      console.warn('⚠️ Spotify returned tracks but none have preview URLs. This is common for some regions/accounts.');
      console.warn('💡 Preview URLs are typically available for tracks in markets like US, UK, etc.');
    }

    console.log(`Found ${tracksWithPreview.length} tracks with previews out of ${allTracks.length} total`);
    return tracksWithPreview;
  } catch (error) {
    console.error('Spotify search failed:', error);
    throw error;
  }
};
