let token = '';
let tokenExpiry = 0;

export const getSpotifyToken = async () => {
  if (Date.now() < tokenExpiry) return token;
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: 'Basic ' + btoa(import.meta.env.VITE_SPOTIFY_CLIENT_ID + ':' + import.meta.env.VITE_SPOTIFY_CLIENT_SECRET),
    },
    body: 'grant_type=client_credentials',
  });
  const data = await res.json();
  token = data.access_token;
  tokenExpiry = Date.now() + data.expires_in * 1000;
  return token;
};

export const searchSpotify = async (query: string) => {
  const token = await getSpotifyToken();
  const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(query)}&type=track&limit=10`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data.tracks?.items || []).map((t: any) => ({
    id: t.id,
    title: t.name,
    artist: t.artists[0].name,
    preview: t.preview_url,
    cover: t.album.images[1]?.url,
  })).filter((s: any) => s.preview);
};
