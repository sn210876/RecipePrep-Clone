import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Edit2, Trash2, Heart, MessageCircle, Crown, Play, Pause, Music, X } from 'lucide-react';
import { supabase, isAdmin } from '@/lib/supabase';
import { toast } from 'sonner';

interface Post {
  id: string;
  user_id: string;
  image_url: string | null;
  video_url: string | null;
  title: string | null;
  caption: string | null;
  recipe_url: string | null;
  recipe_id?: string | null;
  created_at: string;
  likes_count?: number;
  comments_count?: number;
  spotify_track_id?: string | null;
  spotify_track_name?: string | null;
  spotify_artist_name?: string | null;
  spotify_album_art?: string | null;
  spotify_preview_url?: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface Comment {
  id: string;
  text: string;
  created_at: string;
  user_id: string;
  username?: string;
}

interface PostDetailModalProps {
  post: Post | null;
  open: boolean;
  onClose: () => void;
  onDelete: (postId: string) => void;
  onUpdate: () => void;
}

export function PostDetailModal({ post, open, onClose, onDelete, onUpdate }: PostDetailModalProps) {
  const [editingCaption, setEditingCaption] = useState(false);
  const [editingMusic, setEditingMusic] = useState(false);
  const [caption, setCaption] = useState('');
  const [reviews, setReviews] = useState<Review[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isUserAdmin, setIsUserAdmin] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Music editing states
  const [showMusicPicker, setShowMusicPicker] = useState(false);
  const [musicSearch, setMusicSearch] = useState('');
  const [musicResults, setMusicResults] = useState<any[]>([]);
  const [selectedTrack, setSelectedTrack] = useState<any>(null);
  const [searchingMusic, setSearchingMusic] = useState(false);

  useEffect(() => {
    if (post) {
      setCaption(post.caption || '');
      loadReviewsAndComments();
      checkLikeStatus();
      loadCurrentUserAndAdminStatus();
      setIsPlaying(false);
      
      // Load existing music if present
      if (post.spotify_track_id) {
        setSelectedTrack({
          id: post.spotify_track_id,
          name: post.spotify_track_name,
          artists: [{ name: post.spotify_artist_name }],
          album: { images: [{ url: post.spotify_album_art }] },
          preview_url: post.spotify_preview_url,
        });
      } else {
        setSelectedTrack(null);
      }
    }
  }, [post]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, [open]);

  const toggleMusic = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const searchMusic = async (query: string) => {
    if (!query.trim()) {
      setMusicResults([]);
      return;
    }
    setSearchingMusic(true);
    try {
      const res = await fetch(
        `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=20`
      );
      const data = await res.json();
      const tracks = (data.results || []).map((t: any) => ({
        id: t.trackId.toString(),
        name: t.trackName || 'Unknown Song',
        artists: [{ name: t.artistName || 'Unknown Artist' }],
        album: { 
          images: [{ url: t.artworkUrl100?.replace('100x100', '300x300') || 'https://via.placeholder.com/300' }] 
        },
        preview_url: t.previewUrl || null,
      }));
      setMusicResults(tracks);
    } catch (err) {
      console.error('Music search failed:', err);
      toast.error('Search failed');
      setMusicResults([]);
    } finally {
      setSearchingMusic(false);
    }
  };

  const loadCurrentUserAndAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
      const admin = await isAdmin();
      setIsUserAdmin(admin);
    }
  };

  const loadReviewsAndComments = async () => {
    if (!post) return;
    try {
      if (post.recipe_url) {
        const { data: recipeData } = await supabase
          .from('public_recipes')
          .select('id')
          .eq('video_url', post.recipe_url)
          .maybeSingle();
        if (recipeData) {
          const { data: reviewsData } = await supabase
            .from('reviews')
            .select(`
              id,
              rating,
              comment,
              created_at,
              user_id,
              profiles:user_id (username)
            `)
            .eq('recipe_id', recipeData.id)
            .order('created_at', { ascending: false });
          if (reviewsData) {
            setReviews(reviewsData.map((r: any) => ({
              ...r,
              username: r.profiles?.username
            })));
          }
        }
      }

      const { data: commentsData } = await supabase
        .from('comments')
        .select(`
          id,
          text,
          created_at,
          user_id,
          profiles:user_id (username)
        `)
        .eq('post_id', post.id)
        .order('created_at', { ascending: false });
      if (commentsData) {
        setComments(commentsData.map((c: any) => ({
          ...c,
          username: c.profiles?.username
        })));
      }
    } catch (error) {
      console.error('Error loading reviews and comments:', error);
    }
  };

  const checkLikeStatus = async () => {
    if (!post) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('post_id', post.id)
      .eq('user_id', user.id)
      .maybeSingle();
    setIsLiked(!!data);
  };

  const handleUpdateCaption = async () => {
    if (!post) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({ caption: caption.trim() })
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Caption updated!');
      setEditingCaption(false);
      onUpdate();
    } catch (error) {
      console.error('Error updating caption:', error);
      toast.error('Failed to update caption');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMusic = async () => {
    if (!post) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          spotify_track_id: selectedTrack?.id || null,
          spotify_track_name: selectedTrack?.name || null,
          spotify_artist_name: selectedTrack?.artists?.[0]?.name || null,
          spotify_album_art: selectedTrack?.album?.images?.[0]?.url || null,
          spotify_preview_url: selectedTrack?.preview_url || null,
        })
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Music updated!');
      setEditingMusic(false);
      onUpdate();
      onClose();
      setTimeout(() => window.location.reload(), 500);
    } catch (error) {
      console.error('Error updating music:', error);
      toast.error('Failed to update music');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePost = async () => {
    if (!post) return;
    if (!confirm('Are you sure you want to delete this post?')) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', post.id);
      if (error) throw error;
      toast.success('Post deleted!');
      onDelete(post.id);
      onClose();
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Delete this comment?')) return;
    try {
      const { error } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
      setComments(comments.filter(c => c.id !== commentId));
      toast.success('Comment deleted');
    } catch (error) {
      toast.error('Failed to delete comment');
    }
  };

  const handleAddComment = async () => {
    if (!post || !newComment.trim()) return;
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: user.id,
          text: newComment.trim()
        });

      if (user.id !== post.user_id) {
        await supabase.from('notifications').insert({
          user_id: post.user_id,
          actor_id: user.id,
          type: 'comment',
          post_id: post.id,
          read: false
        });
      }
      if (error) throw error;
      setNewComment('');
      await loadReviewsAndComments();
      toast.success('Comment added!');
    } catch (error) {
      console.error('Error adding comment:', error);
      toast.error('Failed to add comment');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleLike = async () => {
    if (!post) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const userId = user.id;
    const postOwnerId = post.user_id;
    try {
      if (isLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('post_id', post.id)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({
            post_id: post.id,
            user_id: userId
          });
        if (error) throw error;
        if (userId !== postOwnerId) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: postOwnerId,
              actor_id: userId,
              type: 'like',
              post_id: post.id,
              read: false
            });
          if (notifError) console.error("Notification error:", notifError);
        }
      }
      setIsLiked(!isLiked);
      onUpdate();
    } catch (error: any) {
      console.error("Error toggling like:", error);
      toast.error("Failed to toggle like");
    }
  };

  if (!post) return null;
  const canDeletePost = post.user_id === currentUserId || isUserAdmin;
  const canDeleteComment = (commentUserId: string) => commentUserId === currentUserId || isUserAdmin;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 overflow-hidden z-[9999]">
        <DialogTitle><VisuallyHidden>Post Details</VisuallyHidden></DialogTitle>
        <DialogDescription><VisuallyHidden>View post with comments and music</VisuallyHidden></DialogDescription>

        <style jsx global>{`
          @keyframes spin-slow {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
            animation: spin-slow 4s linear infinite;
          }
        `}</style>

        <div className="flex flex-col md:flex-row h-full">
          <div className="md:w-3/5 bg-black flex items-center justify-center relative overflow-hidden">
            {post.image_url ? (
              <img
                src={post.image_url}
                alt={post.title || 'Post'}
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : post.video_url ? (
              <video
                src={post.video_url}
                controls
                className="max-w-full max-h-[90vh] object-contain"
              />
            ) : null}

          {post.spotify_preview_url && (
              <>
                <audio
                  ref={audioRef}
                  src={post.spotify_preview_url}
                  onEnded={() => setIsPlaying(false)}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                />

                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/70 to-transparent p-6 z-30">
                  <div className="flex items-center gap-2 max-w-3xl mx-auto **opacity-60**">
                    <div className="relative">
                      <img
                        src={post.spotify_album_art || '/placeholder-album.png'}
                        alt="Album"
                        className={`**w-8 h-8** rounded-full shadow-2xl border-2 border-white/40 ${isPlaying ? 'animate-spin-slow' : ''}`}
                      />
                      <button
                        onClick={toggleMusic}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full hover:bg-black/70 transition-all"
                      >
                        {isPlaying ? (
                          <Pause className="**w-3 h-3** text-white" />
                        ) : (
                          <Play className="**w-3 h-3** text-white ml-0.5" />
                        )}
                      </button>
                    </div>
                    <div className="flex-1 text-white">
                      <p className="font-bold **text-xs** truncate">{post.spotify_track_name || 'Song'}</p>
                      <p className="**text-xs** opacity-90">{post.spotify_artist_name || 'Artist'}</p>
                    </div>
                    <button onClick={toggleMusic} className="text-white **text-xl** hover:scale-110 transition-transform">
                      ♪
                    </button>
                  </div>
                </div>
            </>
            )}
          </div>

          <div className="md:w-2/5 flex flex-col bg-white">
            <div className="p-4 border-b flex items-center justify-between">
  <h3 className="font-semibold text-lg flex-1 pr-4">{post.title || 'Post'}</h3>
  <div className="flex gap-1 mr-8">
    {post.user_id === currentUserId && (
      <>
        <Button variant="ghost" size="sm" onClick={() => setEditingCaption(!editingCaption)} title="Edit Caption">
          <Edit2 className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setEditingMusic(!editingMusic)} title="Edit Music">
          <Music className="w-4 h-4 text-purple-600" />
        </Button>
      </>
    )}
    {canDeletePost && (
      <Button variant="ghost" size="sm" onClick={handleDeletePost} disabled={loading}>
        <Trash2 className="w-4 h-4 text-red-600" />
      </Button>
    )}
  </div>
</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                {editingCaption ? (
                  <div className="space-y-2">
                    <Textarea value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Write a caption..." rows={3} />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateCaption} disabled={loading}>Save</Button>
                      <Button size="sm" variant="outline" onClick={() => { setEditingCaption(false); setCaption(post.caption || ''); }}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {post.caption?.split(' ').map((word, i) => {
                      if (word.startsWith('http://') || word.startsWith('https://')) {
                        return <a key={i} href={word} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{word}</a>;
                      }
                      return word + ' ';
                    })}
                  </p>
                )}
              </div>

              {editingMusic && (
                <div className="space-y-2 bg-purple-50 p-3 rounded-lg border border-purple-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-purple-900">Edit Music</span>
                    <button onClick={() => setShowMusicPicker(true)} className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Search Music
                    </button>
                  </div>
                  {selectedTrack && (
                    <div className="flex items-center gap-2 p-2 bg-white rounded border">
                      <img src={selectedTrack.album.images[0]?.url} className="w-10 h-10 rounded" alt="Album" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{selectedTrack.name}</p>
                        <p className="text-xs text-gray-600 truncate">{selectedTrack.artists[0].name}</p>
                      </div>
                      <button onClick={() => setSelectedTrack(null)} className="text-red-500 hover:text-red-700">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateMusic} disabled={loading}>Save Music</Button>
                    <Button size="sm" variant="outline" onClick={() => { setEditingMusic(false); setSelectedTrack(post.spotify_track_id ? { id: post.spotify_track_id, name: post.spotify_track_name, artists: [{ name: post.spotify_artist_name }], album: { images: [{ url: post.spotify_album_art }] }, preview_url: post.spotify_preview_url } : null); }}>Cancel</Button>
                  </div>
                </div>
              )}

              {reviews.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Reviews</h4>
                  {reviews.map((review) => (
                    <div key={review.id} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <button onClick={() => window.location.href = `/${review.username || 'user'}`} className="font-medium text-sm hover:underline">
                          {review.username || 'User'}
                        </button>
                        {review.user_id === '51ad04fa-6d63-4c45-9423-76183eea7b39' && <Crown className="w-4 h-4 text-yellow-500 fill-yellow-500" />}
                        <div className="flex">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="text-base">
                              {i < review.rating ? '🔥' : '☆'}
                            </span>
                          ))}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700">{review.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {comments.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm">Comments</h4>
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-1">
                          <button onClick={() => window.location.href = `/${comment.username || 'user'}`} className="font-medium text-sm hover:underline">
                            {comment.username || 'User'}
                          </button>
                          {comment.user_id === '51ad04fa-6d63-4c45-9423-76183eea7b39' && <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500" />}
                        </div>
                        <p className="text-sm text-gray-700 mt-0.5">{comment.text}</p>
                      </div>
                      {canDeleteComment(comment.user_id) && (
                        <button onClick={() => handleDeleteComment(comment.id)} className="text-red-600 hover:text-red-800 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t p-4 space-y-3">
              <div className="flex items-center gap-4">
                <button onClick={handleToggleLike} className="transition-transform hover:scale-110">
                  <Heart className={`w-6 h-6 ${isLiked ? 'fill-red-500 text-red-500' : 'text-gray-700'}`} />
                </button>
                <MessageCircle className="w-6 h-6 text-gray-700" />
              </div>
              <div className="flex gap-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment();
                    }
                  }}
                />
                <Button onClick={handleAddComment} disabled={loading || !newComment.trim()} size="sm">
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>

        {showMusicPicker && (
          <div className="absolute inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-lg max-h-[500px] flex flex-col">
              <div className="p-3 border-b flex items-center justify-between">
                <h4 className="font-semibold">Choose Music</h4>
                <button onClick={() => setShowMusicPicker(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-3">
                <input
                  type="text"
                  value={musicSearch}
                  onChange={(e) => { setMusicSearch(e.target.value); searchMusic(e.target.value); }}
                  placeholder="Search songs..."
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
                  autoFocus
                />
              </div>
              <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1">
                {searchingMusic && <p className="text-center text-gray-500 py-4">Searching...</p>}
                {musicResults.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => { setSelectedTrack(track); setShowMusicPicker(false); toast.success('Music selected!'); }}
                    className="w-full flex items-center gap-2 p-2 rounded hover:bg-gray-100"
                  >
                    <img src={track.album.images[0]?.url} className="w-10 h-10 rounded" alt="Album" />
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium truncate">{track.name}</p>
                      <p className="text-xs text-gray-600 truncate">{track.artists[0].name}</p>
                    </div>
                  </button>
                ))}
                {musicSearch && musicResults.length === 0 && !searchingMusic && (
                  <p className="text-center text-gray-500 py-4">No songs found</p>
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}