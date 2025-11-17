// src/pages/upload.tsx  →  FULLY CLEANED, YOUTUBE MUSIC ONLY
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface UploadProps { onNavigate: (page: string) => void; }

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  // YOUTUBE MUSIC STATES ONLY
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setFileType(file.type.startsWith('image/') ? 'image' : 'video');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    } else {
      toast.error('Please select an image or video');
    }
  };

  const searchYouTubeMusic = async (query: string) => {
    if (!query.trim()) {
      setMusicResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://vohvdarghgqskzqjclux.supabase.co/functions/v1/ytmusic-search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setMusicResults(Array.isArray(data) ? data : []);
    } catch {
      toast.error('Music search failed');
      setMusicResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title.trim()) {
      toast.error('Image/video and title required');
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not logged in');

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadErr } = await supabase.storage.from('posts').upload(fileName, selectedFile);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from('posts').getPublicUrl(fileName);

      await supabase.from('posts').insert({
        user_id: user.id,
        title: title.trim(),
        caption: caption.trim() || null,
        [fileType === 'image' ? 'image_url' : 'video_url']: urlData.publicUrl,
        youtube_track_id: selectedTrack?.id || null,
        youtube_title: selectedTrack?.name || null,
        youtube_artist: selectedTrack?.artists?.[0]?.name || null,
        youtube_thumbnail: selectedTrack?.album?.images?.[0]?.url || null,
        youtube_url: selectedTrack?.preview_url || null,
      });

      toast.success('Posted with music!');
      onNavigate('discover');
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ... same header as before ... */}

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Media preview, title, caption - same as before */}

        {/* CLEAN YOUTUBE MUSIC SECTION */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Add Music (YouTube)</span>
            <button onClick={() => setShowMusicPicker(true)} className="text-orange-600 flex items-center gap-2">
              <Music className="w-5 h-5" />
              {selectedTrack ? 'Change' : 'Add'} Music
            </button>
          </div>
          {selectedTrack && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-purple-50 rounded-lg">
              <img src={selectedTrack.album.images[0]?.url} alt="" className="w-12 h-12 rounded" />
              <div>
                <p className="font-medium truncate">{selectedTrack.name}</p>
                <p className="text-sm text-gray-600">{selectedTrack.artists[0].name}</p>
              </div>
              <button onClick={() => setSelectedTrack(null)}><X className="w-5 h-5" /></button>
            </div>
          )}
        </div>

        {/* YOUTUBE PICKER MODAL */}
        {showMusicPicker && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-2xl overflow-hidden">
              <div className="p-4 border-b flex justify-between">
                <h3 className="font-bold">YouTube Music</h3>
                <button onClick={() => setShowMusicPicker(false)}><X /></button>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={musicSearch}
                  onChange={(e) => { setMusicSearch(e.target.value); searchYouTubeMusic(e.target.value); }}
                  placeholder="Search songs..."
                  className="w-full px-4 py-3 border rounded-xl"
                  autoFocus
                />
              </div>
              <div className="max-h-96 overflow-y-auto p-4 space-y-2">
                {searching ? <p className="text-center">Searching...</p> :
                 musicResults.length === 0 ? <p className="text-center text-gray-500">No results</p> :
                 musicResults.map(track => (
                   <button key={track.id} onClick={() => { setSelectedTrack(track); setShowMusicPicker(false); }} className="w-full flex gap-3 p-3 hover:bg-gray-100 rounded-lg text-left">
                     <img src={track.album.images[0]?.url} className="w-12 h-12 rounded" />
                     <div className="flex-1">
                       <p className="font-medium truncate">{track.name}</p>
                       <p className="text-sm text-gray-600">{track.artists[0].name}</p>
                     </div>
                     <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Full</span>
                   </button>
                 ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}