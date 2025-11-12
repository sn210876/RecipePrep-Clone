export interface Song {
  id: string;
  title: string;
  artist: string;
  preview: string;
}

export const mockSongs: Song[] = [
  {
    id: '1',
    title: 'Blinding Lights',
    artist: 'The Weeknd',
    preview: 'https://cdns-preview-d.dzcdn.net/stream/c-deda7fa9316d9e9e4e8f3f9f9f9f9f9f-5.mp3'
  },
  {
    id: '2',
    title: 'Levitating',
    artist: 'Dua Lipa',
    preview: 'https://cdns-preview-b.dzcdn.net/stream/c-b9e9e9e9e9e9e9e9e9e9e9e9e9e9e9e9-5.mp3'
  },
  {
    id: '3',
    title: 'Good 4 U',
    artist: 'Olivia Rodrigo',
    preview: 'https://cdns-preview-a.dzcdn.net/stream/c-a8e8e8e8e8e8e8e8e8e8e8e8e8e8e8e8-5.mp3'
  },
  {
    id: '4',
    title: 'Stay',
    artist: 'The Kid LAROI & Justin Bieber',
    preview: 'https://cdns-preview-c.dzcdn.net/stream/c-c7e7e7e7e7e7e7e7e7e7e7e7e7e7e7e7-5.mp3'
  },
  {
    id: '5',
    title: 'Heat Waves',
    artist: 'Glass Animals',
    preview: 'https://cdns-preview-e.dzcdn.net/stream/c-e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6e6-5.mp3'
  }
];
