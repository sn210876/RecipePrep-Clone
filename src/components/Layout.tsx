import { useState, useEffect } from 'react';
import {
  ChefHat,
  BookMarked,
  Plus,
  Calendar,
  ShoppingCart,
  Settings,
  Menu,
  X,
  UtensilsCrossed,
  MessageCircle,
  Camera,
  PiggyBank,
  User
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage: propCurrentPage, onNavigate, children }: LayoutProps) {
  const [currentPage, setCurrentPage] = useState(propCurrentPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(3);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  
  const navItems = [
    { id: 'discover-recipes', label: 'Discover Recipes', icon: ChefHat },
    { id: 'discover', label: 'Social Feed', icon: UtensilsCrossed },
    { id: 'my-recipes', label: 'My Recipes', icon: BookMarked },
    { id: 'add-recipe', label: 'Add Recipe', icon: Plus },
    { id: 'meal-planner', label: 'Meal Planner', icon: Calendar },
    { id: 'grocery-list', label: 'Grocery List', icon: ShoppingCart },
    { id: 'cart', label: 'Cart', icon: PiggyBank },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const socialPages = ['discover', 'upload', 'profile', 'messages', 'add-recipe'];

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    onNavigate(page);
    setIsMobileMenuOpen(false);

    // Clear unread when navigating to messages
    if (page === 'messages') {
      setUnreadCount(0);
    }
  };

// Load avatar and messaging on mount
useEffect(() => {
  loadAvatar();
  initializeMessaging();
}, []);

// Real-time message subscriptions
useEffect(() => {
  if (!currentUserId) return;

  const channel = supabase
    .channel('direct-message-notifications')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'direct_messages',
      },
      async (payload) => {
        const newMessage = payload.new as any;
        if (newMessage.sender_id !== currentUserId && !newMessage.read) {
          const { data: convo } = await supabase
            .from('conversations')
            .select('id')
            .eq('id', newMessage.conversation_id)
            .or(`user1_id.eq.${currentUserId},user2_id.eq.${currentUserId}`)
            .maybeSingle();
          if (convo) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'direct_messages',
      },
      (payload) => {
        const updatedMessage = payload.new as any;
        const oldMessage = payload.old as any;
        if (updatedMessage.read && !oldMessage.read && updatedMessage.sender_id !== currentUserId) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, [currentUserId]);

const initializeMessaging = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setCurrentUserId(user.id);
    await loadUnreadCount(user.id);
  } catch (error) {
    console.error('Error initializing messaging:', error);
  }
};

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

const loadUnreadCount = async (userId: string) => {
  try {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id, user1_id, user2_id, last_message_at')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (!conversations || conversations.length === 0) {
      setUnreadCount(0);
      return;
    }

    let totalUnread = 0;
    for (const convo of conversations) {
      const { count } = await supabase
        .from('direct_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', convo.id)
        .eq('read', false)
        .neq('sender_id', userId);
      totalUnread += count || 0;
    }
    setUnreadCount(totalUnread);
  } catch (error) {
    console.error('Error loading unread count:', error);
  }
}; 

  return (
    <div className="min-h-screen bg-white">
      
           {/* Mobile Sidebar Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Mobile Optimized */}
      <aside className={`fixed left-0 top-0 z-50 h-screen w-64 sm:w-72 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex h-full flex-col">

          {/* Logo/Brand */}
          <div className="flex items-center justify-between gap-3 border-b border-gray-200 p-4 sm:p-6">
            <div className="flex items-center gap-3 flex-1 min-w-0">

              {/* Your WoodenSpoon with Orange Border */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 rounded-xl ring-4 ring-orange-500 shadow-xl -z-10"></div>
               <div className="relative flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-lg bg-white overflow-hidden shadow-lg">
  <img
    src="/Woodenspoon.png"
    alt="Meal Scrape"
    className="w-full h-full object-cover scale-110"
  />
</div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">Meal Scrape</h1>
                <p className="text-[10px] sm:text-xs text-gray-500 truncate">E-Recipe Book & Social Media</p>
              </div>
            </div>

            {/* Close button - mobile only */}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(false)}
              className="lg:hidden h-8 w-8 flex-shrink-0"
            >
              <X className="h-5 h-5" />
            </Button>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 space-y-1 p-3 sm:p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 sm:px-4 sm:py-3 text-left transition-all touch-manipulation ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                  <span className="font-medium text-sm sm:text-base">{item.label}</span>

                  {item.id === 'messages' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer Card */}
          <div className="border-t border-gray-200 p-3 sm:p-4 flex-shrink-0">
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-4 border border-orange-200">
              <p className="text-xs sm:text-sm font-semibold text-gray-900">Discover, Save, Plan, Shop</p>
              <p className="mt-1 text-[10px] sm:text-xs text-gray-600">All in One Place</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="lg:ml-64">
        
        {/* Top Header - Mobile Optimized */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
          <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
            >
              <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
            </Button>
            
            {!socialPages.includes(currentPage) && (
              <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate flex-1 text-center lg:text-left">
                {navItems.find(item => item.id === currentPage)?.label || 'Meal Scrape'}
              </h2>
            )}
            
            {socialPages.includes(currentPage) && (
              <div className="flex-1 flex justify-center lg:justify-start">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
                  <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                </div>
              </div>
            )}
            
            <div className="w-9 sm:w-10 lg:hidden" />
          </div>
        </header>

        {/* Quick Access Toolbar - Desktop Only */}
        <div className="hidden lg:block fixed top-4 right-4 z-40">
          <div className="flex items-center gap-2 bg-white/90 backdrop-blur-lg rounded-full shadow-xl border border-gray-200/50 px-3 py-2">
            {navItems
              .filter((item) => !['discover', 'settings', 'messages'].includes(item.id))
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    className={`h-10 w-10 rounded-full transition-all flex items-center justify-center ${
                      isActive 
                        ? 'bg-orange-500 text-white shadow-lg scale-110' 
                        : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
                    }`}
                    title={item.label}
                  >
                    <Icon className="h-5 w-5" />
                  </button>
                );
              })}
          </div>
        </div>

        {/* Main Content */}
        <main className={socialPages.includes(currentPage) ? '' : 'p-3 sm:p-4 md:p-6 pb-24'}>
          {children}
        </main>

        {/* Bottom Navigation - Mobile Only */}
        {currentPage !== 'add-recipe' && (
        <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
          <div className="max-w-lg mx-auto px-4 py-3">
            <div className="flex items-center justify-around">
              
              {/* Messages with Badge */}
              <button
                onClick={() => handleNavigate('messages')}
                className={`relative flex flex-col items-center gap-1 transition-all touch-manipulation ${
                  currentPage === 'messages' 
                    ? 'text-cyan-500 scale-110' 
                    : 'text-gray-600'
                }`}
                style={{ minWidth: '60px', minHeight: '48px' }}
              >
                <div className="relative">
                  <MessageCircle 
                    className="w-6 h-6" 
                    strokeWidth={currentPage === 'messages' ? 2.5 : 2} 
                  />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center font-bold animate-pulse">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-medium">Messages</span>
              </button>

              {/* Upload Button - Elevated */}
            <button
  onClick={() => handleNavigate('add-recipe')}
  className="relative -mt-6 grid place-items-center bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95"
  style={{ width: '56px', height: '56px' }}
>
  <Camera className="w-8 h-8 text-white" strokeWidth={2.75} />
</button>

              {/* Profile */}
              <button
                onClick={() => handleNavigate('profile')}
                className={`flex flex-col items-center gap-1 transition-all touch-manipulation ${
                  currentPage === 'profile' 
                    ? 'text-orange-600 scale-110' 
                    : 'text-gray-600'
                }`}
                style={{ minWidth: '60px', minHeight: '48px' }}
              >
                <div className="relative">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className={`w-7 h-7 rounded-full object-cover ${
                        currentPage === 'profile' 
                          ? 'ring-2 ring-orange-600 ring-offset-2' 
                          : 'ring-1 ring-gray-300'
                      }`}
                    />
                  ) : (
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                      currentPage === 'profile'
                        ? 'bg-orange-100 ring-2 ring-orange-600'
                        : 'bg-gray-100'
                    }`}>
                      <User 
                        className="w-4 h-4" 
                        strokeWidth={currentPage === 'profile' ? 2.5 : 2} 
                      />
                    </div>
                  )}
                </div>
                <span className="text-[10px] font-medium">Profile</span>
              </button>
            </div>
          </div>
        </div>

        {/* Social Feed FAB - For non-social pages, Desktop */}
        {!socialPages.includes(currentPage) && (
          <div className="hidden lg:block fixed bottom-6 left-1/2 -translate-x-1/2 z-40">
            <button
              onClick={() => handleNavigate('discover')}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white w-14 h-14 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 flex items-center justify-center"
              title="Social Feed"
            >
              <UtensilsCrossed className="w-7 h-7" />
            </button>
          </div>
        )}

       
      </div>

      {/* Demo: Avatar Toggle Button */}
      <button
        onClick={() => setAvatarUrl(prev => 
          prev ? null : 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop'
        )}
        className="fixed top-20 right-4 bg-slate-800 text-white text-xs px-3 py-2 rounded-full shadow-lg hover:bg-slate-700 z-50 hidden lg:block"
      >
        Toggle Avatar
      </button>
    </div>
  );
}