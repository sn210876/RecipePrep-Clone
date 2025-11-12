import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Music, Play, Pause, Check } from 'lucide-react';
import { mockSongs, Song } from '../data/mockSongs';

interface MusicSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (song: Song | null) => void;
  selectedSong: Song | null;
}

export function MusicSelectionModal({ open, onClose, onSelect, selectedSong }: MusicSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const filteredSongs = mockSongs.filter(
    song =>
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePlay = (song: Song) => {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.preview);
      audioRef.current.play();
      setPlayingId(song.id);

      audioRef.current.onended = () => {
        setPlayingId(null);
      };
    }
  };

  const handleSelect = (song: Song) => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    onSelect(song);
    onClose();
  };

  const handleRemove = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayingId(null);
    }
    onSelect(null);
    onClose();
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music className="w-5 h-5" />
            Add Music
          </DialogTitle>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search songs..."
            className="pl-10"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {filteredSongs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No songs found
            </div>
          ) : (
            filteredSongs.map((song) => {
              const isSelected = selectedSong?.id === song.id;
              const isPlaying = playingId === song.id;

              return (
                <div
                  key={song.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-gray-50 ${
                    isSelected ? 'border-orange-500 bg-orange-50' : 'border-gray-200'
                  }`}
                  onClick={() => handleSelect(song)}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlay(song);
                    }}
                    className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center hover:scale-105 transition-transform"
                  >
                    {isPlaying ? (
                      <Pause className="w-5 h-5 text-white" fill="white" />
                    ) : (
                      <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
                    )}
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm truncate">{song.title}</div>
                    <div className="text-xs text-gray-600 truncate">{song.artist}</div>
                  </div>

                  {isSelected && (
                    <Check className="w-5 h-5 text-orange-600 flex-shrink-0" />
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          {selectedSong && (
            <Button
              variant="outline"
              onClick={handleRemove}
              className="flex-1"
            >
              Remove Music
            </Button>
          )}
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
