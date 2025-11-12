import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Search, Music, Play, Pause, Check, Loader2 } from 'lucide-react';
import { Song } from '../data/mockSongs';
import { searchSpotify } from '../utils/spotify';
import { toast } from 'sonner';

interface MusicSelectionModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (song: Song | null) => void;
  selectedSong: Song | null;
}

export function MusicSelectionModal({ open, onClose, onSelect, selectedSong }: MusicSelectionModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [searching, setSearching] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSongs([]);
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        console.log('Starting search for:', searchQuery);
        const results = await searchSpotify(searchQuery);
        console.log('Search results:', results);
        if (results.length === 0) {
          toast.info('No songs found with preview available. Try another search.');
          setSongs([]);
        } else {
          toast.success(`Found ${results.length} songs!`);
          setSongs(results);
        }
      } catch (error: any) {
        console.error('Spotify search error:', error);
        toast.error(error.message || 'Failed to search songs. Please check console for details.');
        setSongs([]);
      } finally {
        setSearching(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery]);

  const handlePlay = (song: Song) => {
    if (playingId === song.id) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      audioRef.current = new Audio(song.preview);
      audioRef.current.crossOrigin = 'anonymous';
      audioRef.current.play().catch(error => {
        console.error('Error playing preview:', error);
        toast.error('Unable to play preview');
      });
      setPlayingId(song.id);

      audioRef.current.onended = () => {
        setPlayingId(null);
      };

      audioRef.current.onerror = () => {
        console.error('Audio failed to load');
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
          <DialogDescription>
            Search and select a song to add to your post
          </DialogDescription>
        </DialogHeader>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for songs on Spotify..."
            className="pl-10"
          />
          {searching && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          {songs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searching ? (
                <>
                  <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-orange-500" />
                  <p>Searching Spotify...</p>
                </>
              ) : (
                <>
                  <Music className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="font-medium">Search for songs on Spotify</p>
                  <p className="text-sm mt-1">Try "Blinding Lights" or your favorite artist</p>
                </>
              )}
            </div>
          ) : (
            songs.map((song) => {
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
