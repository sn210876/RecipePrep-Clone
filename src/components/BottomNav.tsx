import { User, Camera, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function BottomNav() {
  const [currentPage, setCurrentPage] = useState('messages');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(3);

  // Simulate avatar loading
  useEffect(() => {
    // In real app, load from Supabase
    // setAvatarUrl('https://example.com/avatar.jpg');
  }, []);

  // Simulate real-time unread count updates
  useEffect(() => {
    // In real app, subscribe to Supabase real-time
    const interval = setInterval(() => {
      // Demo: randomly update count
      if (Math.random() > 0.7) {
        setUnreadCount(prev => Math.min(prev + 1, 9));
      }
    }, 10000);

    return () => clearInterval(interval);
  }, []);

  const handleNavigate = (page) => {
    setCurrentPage(page);
    console.log('Navigate to:', page);
    
    // Clear unread count when navigating to messages
    if (page === 'messages') {
      setUnreadCount(0);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 pb-20">
      {/* Demo Content Area */}
      <div className="max-w-lg mx-auto p-4 pt-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-slate-900">
            {currentPage === 'messages' && 'Messages'}
            {currentPage === 'upload' && 'Upload Recipe'}
            {currentPage === 'profile' && 'Profile'}
          </h1>
          <p className="text-slate-600">
            Tap the navigation buttons below to switch pages
          </p>

          {/* Demo Cards */}
          <div className="grid gap-4 mt-8">
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <h3 className="font-semibold text-lg mb-2">Bottom Navigation Features</h3>
              <ul className="text-sm text-slate-600 space-y-2 text-left">
                <li>✓ Fixed bottom position with safe area padding</li>
                <li>✓ Touch-friendly 44px minimum tap targets</li>
                <li>✓ Real-time unread message badge with animation</li>
                <li>✓ Prominent centered upload button</li>
                <li>✓ Profile avatar or fallback icon</li>
                <li>✓ Active state indicators</li>
                <li>✓ Smooth hover and press effects</li>
              </ul>
            </div>

            <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <MessageCircle className="w-5 h-5 text-cyan-600" />
                Message Badge Demo
              </h3>
              <p className="text-sm text-slate-600">
                Current unread count: <span className="font-bold text-cyan-600">{unreadCount}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => setUnreadCount(prev => Math.min(prev + 1, 15))}
                  className="px-3 py-1.5 bg-cyan-500 text-white rounded-lg text-sm hover:bg-cyan-600"
                >
                  Add Message
                </button>
                <button
                  onClick={() => setUnreadCount(0)}
                  className="px-3 py-1.5 bg-slate-200 text-slate-700 rounded-lg text-sm hover:bg-slate-300"
                >
                  Clear All
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
              <h3 className="font-semibold text-lg mb-2 flex items-center gap-2">
                <Camera className="w-5 h-5 text-orange-600" />
                Upload Button
              </h3>
              <p className="text-sm text-slate-600">
                The centered upload button is elevated above the nav bar with a gradient background and hover effects for emphasis.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 shadow-lg">
        {/* Safe area padding for iOS notch */}
        <div className="pb-safe">
          <div className="max-w-lg mx-auto px-4 sm:px-6">
            <div className="h-16 sm:h-18 flex items-center justify-around">
              
              {/* Messages Button with Badge */}
             {/* Messages Button with Badge */}
<button
  onClick={() => handleNavigate('messages')}
  className={`relative flex flex-col items-center justify-center transition-all duration-200 touch-manipulation ${
    currentPage === 'messages' 
      ? 'text-cyan-500 scale-105' 
      : 'text-slate-600 hover:text-cyan-500 active:scale-95'
  }`}
  style={{ minWidth: '56px', minHeight: '48px' }}
>
  <div className="relative">
    <MessageCircle 
      className="w-6 h-6" 
      strokeWidth={currentPage === 'messages' ? 2.5 : 2} 
    />
    
    {/* Unread Badge */}
    {unreadCount > 0 && (
      <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold shadow-md animate-pulse">
        {unreadCount > 9 ? '9+' : unreadCount}
      </span>
    )}
  </div>
  
  <span className={`text-[10px] mt-1 font-medium ${
    currentPage === 'messages' ? 'opacity-100' : 'opacity-70'
  }`}>
    Messages
  </span>
</button>

{/* Social Feed Button */}
<button
  onClick={() => handleNavigate('discover')}
  className={`relative flex flex-col items-center justify-center transition-all duration-200 touch-manipulation ${
    currentPage === 'discover' 
      ? 'text-orange-500 scale-105' 
      : 'text-slate-600 hover:text-orange-500 active:scale-95'
  }`}
  style={{ minWidth: '56px', minHeight: '48px' }}
>
  <UtensilsCrossed 
    className="w-6 h-6" 
    strokeWidth={currentPage === 'discover' ? 2.5 : 2} 
  />
  
  <span className={`text-[10px] mt-1 font-medium ${
    currentPage === 'discover' ? 'opacity-100' : 'opacity-70'
  }`}>
    Feed
  </span>
</button>

{/* Centered Upload Button - Elevated */}
<button
  onClick={() => handleNavigate('upload')}
  className="relative -mt-6 flex flex-col items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 active:scale-100 touch-manipulation"
  style={{ width: '56px', height: '56px' }}
>
  <Camera className="w-7 h-7 text-white" strokeWidth={2.5} />
</button>

{/* Profile Button */}
<button
  onClick={() => handleNavigate('profile')}
  className={`relative flex flex-col items-center justify-center transition-all duration-200 touch-manipulation ${
    currentPage === 'profile' 
      ? 'text-orange-600 scale-105' 
      : 'text-slate-600 hover:text-slate-900 active:scale-95'
  }`}
  style={{ minWidth: '56px', minHeight: '48px' }}
>
  <div className="relative">
    {avatarUrl ? (
      <img
        src={avatarUrl}
        alt="Profile"
        className={`w-7 h-7 rounded-full object-cover transition-all duration-200 ${
          currentPage === 'profile' 
            ? 'ring-2 ring-orange-600 ring-offset-2' 
            : 'ring-1 ring-slate-300'
        }`}
      />
    ) : (
      <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 ${
        currentPage === 'profile'
          ? 'bg-orange-100 ring-2 ring-orange-600'
          : 'bg-slate-100'
      }`}>
        <User 
          className="w-4 h-4" 
          strokeWidth={currentPage === 'profile' ? 2.5 : 2} 
        />
      </div>
    )}
  </div>
  
  <span className={`text-[10px] mt-1 font-medium ${
    currentPage === 'profile' ? 'opacity-100' : 'opacity-70'
  }`}>
    Profile
  </span>
</button>

            </div>
          </div>
        </div>
      </nav>

      {/* Demo: Simulate Avatar Toggle */}
      <button
        onClick={() => setAvatarUrl(prev => 
          prev ? null : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
        )}
        className="fixed bottom-20 right-4 bg-slate-800 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-slate-700"
      >
        Toggle Avatar
      </button>
    </div>
  );
}