import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Music } from 'lucide-react';

interface Song {
  id: string;
  title: string;
  artist: string;
  thumbnail?: string;
}

interface MusicSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (song: Song) => void;
  selectedSong: Song | null;
}

export function MusicSelectionModal({ open, onClose, onSelect, selectedSong }: MusicSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(false);

  const searchYTMusic = async () => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('https://recipe-backend-nodejs-1.onrender.com/ytmusic-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery, limit: 10 }),
      });
      const data = await res.json();
      setSongs(data.songs || []);
    } catch (err) {
      console.error('Search failed:', err);
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Add Music
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search for a song..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchYTMusic()}
              className="flex-1"
            />
            <Button onClick={searchYTMusic} disabled={loading}>
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {songs.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                {loading ? 'Searching...' : 'Type a song name to search'}
              </p>
            ) : (
              songs.map((song) => (
                <button
                  key={song.id}
                  onClick={() => {
                    onSelect(song);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors text-left"
                >
                  {song.thumbnail ? (
                    <img src={song.thumbnail} alt="" className="w-12 h-12 rounded object-cover" />
                  ) : (
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-red-400 rounded flex items-center justify-center">
                      <Music className="w-6 h-6 text-white" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{song.title}</p>
                    <p className="text-sm text-gray-600 truncate">{song.artist}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}