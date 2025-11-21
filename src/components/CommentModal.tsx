import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Trash2, X, Play, Pause } from 'lucide-react';

export default function CommentModal() {
  const [isOpen, setIsOpen] = useState(true);
  const [comments, setComments] = useState([
    {
      id: '1',
      text: 'This recipe looks absolutely delicious! Can\'t wait to try it 😋',
      created_at: '2024-01-15T10:30:00',
      user_id: 'user1',
      profiles: {
        username: 'foodlover',
        avatar_url: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'
      }
    },
    {
      id: '2',
      text: 'I made this last night and it was amazing! The whole family loved it.',
      created_at: '2024-01-16T14:20:00',
      user_id: 'currentUser',
      profiles: {
        username: 'chefmike',
        avatar_url: null
      }
    },
    {
      id: '3',
      text: 'Do you think I could substitute almond flour for regular flour?',
      created_at: '2024-01-17T09:15:00',
      user_id: 'user3',
      profiles: {
        username: 'healthyeats',
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
      }
    }
  ]);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId] = useState('currentUser');
  const [userRating, setUserRating] = useState(4);
  const [hoverRating, setHoverRating] = useState(0);
  const [averageRating] = useState(4.3);
  const [totalRatings] = useState(127);
  const [isPlaying, setIsPlaying] = useState(false);

  const post = {
    id: 'demo-post',
    title: 'Chocolate Chip Cookies',
    caption: 'The perfect chewy cookies with crispy edges. A family favorite recipe!',
    image_url: 'https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=800&h=600&fit=crop',
    spotify_preview_url: null,
    spotify_track_name: 'Cooking Vibes',
    spotify_artist_name: 'Lo-Fi Beats'
  };

  const handleSubmitComment = (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      const newCommentObj = {
        id: Date.now().toString(),
        text: newComment.trim(),
        created_at: new Date().toISOString(),
        user_id: currentUserId,
        profiles: {
          username: 'chefmike',
          avatar_url: null
        }
      };
      
      setComments(prev => [...prev, newCommentObj]);
      setNewComment('');
      setSubmitting(false);
    }, 500);
  };

  const handleDeleteComment = (commentId) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  };

  const handleRatingClick = (rating) => {
    setUserRating(rating);
    console.log('Rating submitted:', rating);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-4 flex items-center justify-center">
      <Button onClick={() => setIsOpen(true)} className="fixed top-4 left-4 z-50">
        Open Modal
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="w-[95vw] max-w-4xl h-[90vh] sm:h-[85vh] p-0 gap-0 overflow-hidden">
          {/* Mobile: Stack vertically, Desktop: Side by side */}
          <div className="flex flex-col md:flex-row h-full">
            
            {/* Image Section */}
            <div className="w-full md:w-[45%] h-[35vh] md:h-full bg-black flex items-center justify-center relative overflow-hidden flex-shrink-0">
              <img
                src={post.image_url}
                alt={post.title}
                className="w-full h-full object-cover md:object-contain"
              />
              
              {/* Close button - visible on mobile */}
              <button
                onClick={() => setIsOpen(false)}
                className="absolute top-2 right-2 md:hidden w-8 h-8 bg-black/70 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-black/90"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Music Player */}
              {post.spotify_preview_url && (
                <div className="absolute bottom-2 left-2 right-2 md:top-4 md:right-4 md:left-auto md:bottom-auto z-10">
                  <button
                    onClick={togglePlay}
                    className="bg-black/70 hover:bg-black/90 backdrop-blur-sm text-white px-2 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg transition-all flex items-center gap-2 w-full md:w-auto"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <Play className="w-4 h-4 sm:w-5 sm:h-5" />
                    )}
                    <div className="text-left text-[10px] sm:text-xs flex-1 min-w-0">
                      <div className="font-semibold truncate">{post.spotify_track_name}</div>
                      <div className="text-white/80 truncate">{post.spotify_artist_name}</div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* Content Section */}
            <div className="flex-1 flex flex-col bg-white min-h-0">
              
              {/* Header */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm sm:text-base md:text-lg truncate">
                      {post.title}
                    </h3>
                    {post.caption && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1 line-clamp-2">
                        {post.caption}
                      </p>
                    )}
                  </div>
                  {/* Close button - desktop only */}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="hidden md:flex w-8 h-8 items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 flex-shrink-0"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Ratings Section */}
              <div className="px-3 py-2 sm:px-4 sm:py-3 border-b flex-shrink-0">
                <div className="space-y-1.5 sm:space-y-2">
                  {/* Average Rating */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((fire) => (
                        <span
                          key={fire}
                          className={`text-sm sm:text-base ${
                            fire <= averageRating ? 'opacity-100' : 'opacity-20 grayscale'
                          }`}
                        >
                          🔥
                        </span>
                      ))}
                    </div>
                    <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">
                      {averageRating.toFixed(1)} ({totalRatings} ratings)
                    </span>
                  </div>

                  {/* User Rating */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs sm:text-sm text-gray-700 font-medium">
                      Your rating:
                    </span>
                    <div className="flex items-center gap-0.5 sm:gap-1">
                      {[1, 2, 3, 4, 5].map((fire) => (
                        <button
                          key={fire}
                          onClick={() => handleRatingClick(fire)}
                          onMouseEnter={() => setHoverRating(fire)}
                          onMouseLeave={() => setHoverRating(0)}
                          className="transition-transform active:scale-110 touch-manipulation p-1"
                        >
                          <span
                            className={`text-base sm:text-lg ${
                              fire <= (hoverRating || userRating)
                                ? 'opacity-100'
                                : 'opacity-20 grayscale'
                            }`}
                          >
                            🔥
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Comments Section - Scrollable */}
              <div className="flex-1 overflow-y-auto px-3 py-2 sm:px-4 sm:py-3 space-y-2 sm:space-y-3 min-h-0">
                {comments.length === 0 ? (
                  <div className="text-center py-8 sm:py-12 text-gray-500 text-xs sm:text-sm">
                    No comments yet. Be the first to comment!
                  </div>
                ) : (
                  comments.map(comment => (
                    <div key={comment.id} className="flex gap-2 sm:gap-3 relative group">
                      {/* Avatar */}
                      {comment.profiles?.avatar_url ? (
                        <img
                          src={comment.profiles.avatar_url}
                          alt={comment.profiles.username}
                          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center text-white font-medium text-xs flex-shrink-0">
                          {comment.profiles?.username?.[0]?.toUpperCase()}
                        </div>
                      )}

                      {/* Comment Content */}
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 rounded-2xl px-3 py-2">
                          <button
                            onClick={() => console.log('Navigate to profile:', comment.profiles?.username)}
                            className="font-semibold text-xs sm:text-sm hover:underline"
                          >
                            {comment.profiles?.username}
                          </button>
                          <p className="text-xs sm:text-sm text-gray-700 break-words mt-0.5">
                            {comment.text}
                          </p>
                        </div>
                        <p className="text-[10px] sm:text-xs text-gray-400 mt-1 px-3">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Delete Button - Only for own comments */}
                      {comment.user_id === currentUserId && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="absolute top-0 right-0 w-6 h-6 sm:w-7 sm:h-7 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-600 transition-all touch-manipulation"
                          title="Delete comment"
                        >
                          <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Comment Input - Fixed at bottom */}
              <div className="border-t px-3 py-2 sm:px-4 sm:py-3 bg-white flex-shrink-0">
                <div className="flex gap-2">
                  <Input
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment(e);
                      }
                    }}
                    placeholder="Add a comment..."
                    disabled={submitting}
                    className="flex-1 text-xs sm:text-sm h-9 sm:h-10"
                  />
                  <Button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || submitting}
                    size="icon"
                    className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10"
                  >
                    <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}