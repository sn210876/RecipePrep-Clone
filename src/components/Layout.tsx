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
  User,
  MessageSquare,
  TrendingUp,
  Crown,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '../lib/supabase';
import { useLanguage } from '@/context/LanguageContext';

interface LayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  children: React.ReactNode;
}

export default function Layout({ currentPage: propCurrentPage, onNavigate, children }: LayoutProps) {
  const { t } = useLanguage();
  const [currentPage, setCurrentPage] = useState(propCurrentPage);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);


  const navItems = [
    { id: 'discover-recipes', label: t.nav.discoverRecipes, icon: ChefHat },
    { id: 'discover', label: t.nav.socialFeed, icon: UtensilsCrossed },
    { id: 'my-recipes', label: t.nav.myRecipes, icon: BookMarked },
    { id: 'add-recipe', label: t.nav.addRecipe, icon: Plus },
    { id: 'meal-planner', label: t.nav.mealPlanner, icon: Calendar },
    { id: 'grocery-list', label: t.nav.groceryList, icon: ShoppingCart },
    { id: 'cart', label: t.nav.cart, icon: PiggyBank },
    { id: 'blog', label: t.nav.blog, icon: MessageSquare },
    { id: 'subscription', label: t.nav.subscription, icon: Crown },
    { id: 'faq', label: t.nav.faq, icon: HelpCircle },
    { id: 'settings', label: t.nav.settings, icon: Settings }
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
      
           {/* Sidebar Overlay - for both mobile and desktop */}
      {(isMobileMenuOpen || isDesktopSidebarOpen) && (
        <div
          className="fixed inset-0 z-[200] bg-black/50"
          onClick={() => {
            setIsMobileMenuOpen(false);
            setIsDesktopSidebarOpen(false);
          }}
        />
      )}

      {/* Sidebar - works same on mobile and desktop */}
 <aside className={`fixed left-0 top-0 z-[250] h-screen w-[240px] sm:w-60 lg:w-64 transform bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
        (isMobileMenuOpen || isDesktopSidebarOpen) ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex h-full flex-col">

       {/* Logo/Brand - Mobile Optimized */}
<div className="flex items-center justify-between gap-2 border-b border-gray-200 p-3 sm:p-4 lg:p-6">
  <div className="flex items-center gap-2 flex-1 min-w-0">

    {/* WoodenSpoon with Orange Border */}
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 rounded-xl ring-3 ring-orange-500 shadow-xl -z-10"></div>
      <div className="relative flex h-9 w-9 sm:h-10 sm:w-10 lg:h-12 lg:w-12 items-center justify-center rounded-lg bg-white overflow-hidden shadow-lg">
        <img
          src="/Woodenspoon.png"
          alt="Meal Scrape"
          className="w-full h-full object-cover scale-110"
        />
      </div>
    </div>

   <div className="flex-1 min-w-0">
  <h1 className="text-base sm:text-base lg:text-xl font-bold text-gray-900 truncate">Meal Scrape</h1>
  <div className="flex flex-col text-[8px] sm:text-[8px] lg:text-[10px] text-gray-500 leading-tight">
    <span>Discover</span>
    <span>Plan</span>
    <span>Enjoy</span>
  </div>
</div>

  {/* Close button */}
  <Button
    variant="ghost"
    size="icon"
    onClick={() => {
      setIsMobileMenuOpen(false);
      setIsDesktopSidebarOpen(false);
    }}
    className="h-8 w-8 flex-shrink-0"
  >
    <X className="h-5 w-5" />
  </Button>
</div>

          {/* Navigation Items - Mobile Optimized */}
          <nav className="flex-1 space-y-0.5 p-3 sm:p-3 lg:p-4 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  className={`flex w-full items-center gap-3 sm:gap-3 rounded-lg px-3 py-2 sm:px-3 sm:py-2 lg:px-4 lg:py-2.5 text-left transition-all touch-manipulation ${
                    isActive
                      ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg scale-[1.02]'
                      : 'text-gray-700 hover:bg-gray-100 active:bg-gray-200'
                  }`}
                >
                  <Icon className={`h-5 w-5 sm:h-5 sm:w-5 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-70'}`} />
                  <span className="font-medium text-sm sm:text-sm lg:text-base truncate">{item.label}</span>

                  {item.id === 'messages' && unreadCount > 0 && (
                    <span className="ml-auto bg-red-500 text-white text-xs sm:text-xs rounded-full w-5 h-5 sm:w-5 sm:h-5 flex items-center justify-center font-bold flex-shrink-0">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

        
        </div> {
      </aside>

      {/* Main Content Area */}
      <div>
        
        {/* Top Header - Mobile Optimized */}
<header className="sticky top-0 z-[150] border-b border-gray-200 bg-white/95 backdrop-blur-sm shadow-sm">
  <div className="flex h-14 sm:h-16 items-center justify-between px-3 sm:px-4 md:px-6">
    {/* Mobile menu button */}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      className="lg:hidden h-9 w-9 sm:h-10 sm:w-10"
    >
      <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
    </Button>

    {/* Desktop sidebar toggle */}
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setIsDesktopSidebarOpen(!isDesktopSidebarOpen)}
      className="hidden lg:flex h-9 w-9 sm:h-10 sm:w-10"
    >
      <Menu className="h-5 w-5 sm:h-6 sm:w-6" />
    </Button>

         {!socialPages.includes(currentPage) && (
  <div className="flex-1 flex items-center justify-center gap-2">
    {currentPage === 'discover-recipes' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <ChefHat className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'my-recipes' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <BookMarked className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'meal-planner' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'grocery-list' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'cart' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <PiggyBank className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'blog' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <MessageSquare className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'subscription' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
   {currentPage === 'settings' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    {currentPage === 'faq' && (
      <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
        <HelpCircle className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      </div>
    )}
    <span className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 truncate">
      {navItems.find(item => item.id === currentPage)?.label || 'Meal Scrape'}
    </span>
  </div>
)}
            
        {socialPages.includes(currentPage) && (
  <div className="flex-1 flex items-center justify-center gap-2">
    <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-600">
      {currentPage === 'add-recipe' ? (
        <Plus className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      ) : currentPage === 'upload' ? (
        <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      ) : (
        <UtensilsCrossed className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
      )}
    </div>
    <span className="text-base sm:text-lg font-semibold text-gray-900">
      {currentPage === 'add-recipe' ? 'Add Recipe' : currentPage === 'upload' ? 'New Post' : 'Social Feed'}
    </span>
  </div>
)}
            
            <div className="w-9 sm:w-10 lg:hidden" />
          </div>
        </header>

        {/* Quick Access Toolbar - Desktop Only */}
<div className="hidden lg:block fixed top-3 right-3 z-40">
  <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-lg rounded-full shadow-lg border border-gray-200/50 px-2 py-1.5">
    {navItems
      .filter((item) => !['discover', 'settings', 'messages'].includes(item.id))
      .map((item) => {
        const Icon = item.icon;
        const isActive = currentPage === item.id;
        return (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={`h-8 w-8 rounded-full transition-all flex items-center justify-center ${
              isActive 
                ? 'bg-orange-500 text-white shadow-md scale-110' 
                : 'text-gray-600 hover:bg-gray-100 hover:scale-105'
            }`}
            title={item.label}
          >
            <Icon className="h-4 w-4" />
          </button>
        );
      })}
  </div>
</div>

        {/* Main Content - Add bottom padding for fixed nav */}
        <main className={`${socialPages.includes(currentPage) ? 'pt-0' : 'pt-0'} pb-20`}>
           <div className={currentPage === 'discover' ? 'pt-24' : ''}></div>
  {children}
</main>

         

       {/* Bottom Navigation - ALWAYS VISIBLE (Mobile & Desktop) */}
<div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
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
        style={{ minWidth: '50px', minHeight: '48px' }}
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

      {/* Social Feed Button */}
      <button
        onClick={() => handleNavigate('discover')}
        className={`relative flex flex-col items-center gap-1 transition-all touch-manipulation ${
          currentPage === 'discover' 
            ? 'text-orange-500 scale-110' 
            : 'text-gray-600'
        }`}
        style={{ minWidth: '50px', minHeight: '48px' }}
      >
        <UtensilsCrossed 
          className="w-6 h-6" 
          strokeWidth={currentPage === 'discover' ? 2.5 : 2} 
        />
        <span className="text-[10px] font-medium">Feed</span>
      </button>

      {/* Upload Button - Elevated */}
      <button
        onClick={() => handleNavigate('upload')}
        className="relative -mt-6 flex items-center justify-center bg-gradient-to-br from-orange-500 to-red-600 rounded-full shadow-xl hover:shadow-2xl transition-all active:scale-95 touch-manipulation"
        style={{ width: '56px', height: '56px' }}
      >
        <Camera className="w-7 h-7 text-white" strokeWidth={2.5} />
      </button>
{/* Profile */}
      <button
        onClick={() => handleNavigate('profile')}
        className={`flex flex-col items-center gap-1 transition-all touch-manipulation ${
          currentPage === 'profile' 
            ? 'text-orange-600 scale-110' 
            : 'text-gray-600'
        }`}
        style={{ minWidth: '50px', minHeight: '48px' }}
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

       
      </div>

     
    </div>
  );
}

