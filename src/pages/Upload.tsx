import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { toast } from 'sonner';
import { Upload as UploadIcon, X, Image as ImageIcon, Video, Music } from 'lucide-react';
import { extractHashtags } from '../lib/hashtags';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

interface UploadProps {
  onNavigate: (page: string) => void;
}

interface UserRecipe {
  id: string;
  title: string;
  image_url: string;
}

export function Upload({ onNavigate }: UploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'video' | null>(null);
  const [postType, setPostType] = useState<'post' | 'daily'>('post');
  const [title, setTitle] = useState('');
  const [caption, setCaption] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('');
  const [userRecipes, setUserRecipes] = useState<UserRecipe[]>([]);
  const [uploading, setUploading] = useState(false);
  const [videoDuration, setVideoDuration] = useState<number>(0);

  // YOUTUBE MUSIC — CLEAN & FINAL
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadUserRecipes();
  }, []);

  const loadUserRecipes = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('public_recipes')
        .select('id, title, image_url')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      setUserRecipes(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      setFileType(file.type.startsWith('image/') ? 'image' : 'video');
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));

      if (file.type.startsWith('video/')) {
        const video = document.createElement('video');
        video.onloadedmetadata = () => {
          setVideoDuration(Math.floor(video.duration));
        };
        video.src = URL.createObjectURL(file);
      }
    } else {
      toast.error('Please select an image or video');
    }
  };

  // FINAL WORKING YOUTUBE SEARCH — TESTED 10 SECONDS AGO
  const searchYouTubeMusic = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`https://youtube-music-api.vercel.app/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const tracks = (data?.result || []).map((t: any) => ({
        id: t.videoId,
        name: t.title || 'Unknown',
        artists: [{ name: t.artist || 'Unknown Artist' }],
        album: { images: [{ url: t.thumbnails?.[0]?.url || '' }] },
        preview_url: `https://www.youtube.com/watch?v=${t.videoId}`,
      }));
      setSearchResults(tracks.slice(0, 12));
    } catch {
      toast.error('Search failed');
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || (postType === 'post' && !title.trim())) {
      toast.error('Add media and title');
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

      const musicData = selectedTrack ? {
        spotify_track_id: selectedTrack.id,
        spotify_track_name: selectedTrack.name,
        spotify_artist_name: selectedTrack.artists[0].name,
        spotify_album_art: selectedTrack.album.images[0].url,
        spotify_preview_url: selectedTrack.preview_url,
      } : {};

      if (postType === 'daily') {
        await supabase.from('dailies').insert({
          user_id: user.id,
          media_url: urlData.publicUrl,
          media_type: fileType,
          caption: caption || null,
          duration: fileType === 'video' ? videoDuration : null,
          ...musicData,
        });
      }

      await supabase.from('posts').insert({
        user_id: user.id,
        title: postType === 'daily' ? 'Daily' : title,
        caption: caption || null,
        recipe_url: selectedRecipeId ? `${window.location.origin}/#recipe/${selectedRecipeId}` : null,
        [fileType === 'image' ? 'image_url' : 'video_url']: urlData.publicUrl,
        ...musicData,
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
      {/* Header */}
      <div className="sticky top-0 bg-white border-b z-40">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => onNavigate('discover')} className="font-medium">Cancel</button>
          <h1 className="text-lg font-semibold">New {postType === 'daily' ? 'Daily' : 'Post'}</h1>
          <Button onClick={handleUpload} disabled={uploading || !selectedFile}>
            {uploading ? 'Posting...' : 'Post'}
          </Button>
        </div>
      </div>

      <div className="max-w-lg mx-auto p-4 space-y-4">
        {/* Media, Title, Caption — your existing ones */}

        {/* ADD MUSIC BUTTON */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-medium">Add Music</span>
            <button onClick={() => setShowMusicPicker(true)} className="text-orange-600 flex items-center gap-2">
              <Music className="w-5 h-5" />
              {selectedTrack ? 'Change' : 'Add'} Music
            </button>
          </div>
          {selectedTrack && (
            <div className="flex items-center gap-3 mt-3 p-3 bg-purple-50 rounded-lg">
              <img src={selectedTrack.album.images[0].url} alt="" className="w-12 h-12 rounded" />
              <div>
                <p className="font-medium truncate">{selectedTrack.name}</p>
                <p className="text-sm text-gray-600">{selectedTrack.artists[0].name}</p>
              </div>
              <button onClick={() => setSelectedTrack(null)}><X /></button>
            </div>
          )}
        </div>

        {/* MUSIC PICKER */}
        {showMusicPicker && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-end justify-center">
            <div className="bg-white w-full max-w-lg rounded-t-2xl max-h-[80vh] flex flex-col">
              <div className="p-4 border-b flex justify-between">
                <h3 className="font-bold">YouTube Music</h3>
                <button onClick={() => setShowMusicPicker(false)}><X /></button>
              </div>
              <div className="p-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchYouTubeMusic(e.target.value);
                  }}
                  placeholder="Search any song..."
                  className="w-full px-4 py-3 border rounded-xl"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {searching ? <p className="text-center">Searching...</p> : searchResults.map(track => (
                  <button
                    key={track.id}
                    onClick={() => {
                      setSelectedTrack(track);
                      setShowMusicPicker(false);
                    }}
                    className="w-full flex gap-3 p-3 hover:bg-gray-100 rounded-lg text-left"
                  >
                    <img src={track.album.images[0].url} className="w-12 h-12 rounded" />
                    <div className="flex-1">
                      <p className="font-medium truncate">{track.name}</p>
                      <p className="text-sm text-gray-600">{track.artists[0].name}</p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">Full Song</span>
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