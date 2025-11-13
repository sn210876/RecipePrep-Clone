import { User, UtensilsCrossed, Camera, MessageCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function BottomNav({ currentPage, onNavigate }: BottomNavProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    loadAvatar();
    loadUnreadCount();

    const interval = setInterval(loadUnreadCount, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadAvatar = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: profileData } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', userData.user.id)
        .maybeSingle();

      if (profileData?.avatar_url) {
        setAvatarUrl(profileData.avatar_url);
      }
    } catch (error) {
      console.error('Error loading avatar:', error);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      const { data: conversations } = await supabase
        .from('conversations')
        .select('id, user1_id, user2_id, last_message_at')
        .or(`user1_id.eq.${userData.user.id},user2_id.eq.${userData.user.id}`)
        .order('last_message_at', { ascending: false });

      if (!conversations) {
        setUnreadCount(0);
        return;
      }

      let totalUnread = 0;
      for (const convo of conversations) {
        const { count } = await supabase
          .from('messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', convo.id)
          .eq('is_read', false)
          .neq('sender_id', userData.user.id);

        totalUnread += count || 0;
      }

      setUnreadCount(totalUnread);
    } catch (error) {
      console.error('Error loading unread count:', error);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-bottom">
      <div className="max-w-lg mx-auto px-4 h-16 flex items-center justify-around">
        <button
          onClick={() => onNavigate('discover')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPage === 'discover' ? 'text-cyan-500' : 'text-gray-600 hover:text-cyan-500'
          }`}
        >
          <UtensilsCrossed className="w-7 h-7" strokeWidth={currentPage === 'discover' ? 2.5 : 2} />
        </button>

        <button
          onClick={() => onNavigate('messages')}
          className={`flex flex-col items-center gap-1 transition-colors relative ${
            currentPage === 'messages' ? 'text-cyan-500' : 'text-gray-600 hover:text-cyan-500'
          }`}
        >
          <MessageCircle className="w-7 h-7" strokeWidth={currentPage === 'messages' ? 2.5 : 2} />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate('upload')}
          className="flex flex-col items-center -mt-6 bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-3 shadow-lg hover:shadow-xl transition-all hover:scale-105"
        >
          <Camera className="w-8 h-8 text-white" strokeWidth={2} />
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className={`flex flex-col items-center gap-1 transition-colors ${
            currentPage === 'profile' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className={`w-8 h-8 rounded-full object-cover ${
                currentPage === 'profile' ? 'ring-2 ring-orange-600' : ''
              }`}
            />
          ) : (
            <User className="w-7 h-7" strokeWidth={currentPage === 'profile' ? 2.5 : 2} />
          )}
        </button>
      </div>
    </nav>
  );
}
