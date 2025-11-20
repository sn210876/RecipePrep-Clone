import { ReactNode, useState, useEffect } from 'react';
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
  User
} from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const navItems = [
    { id: 'discover-recipes', label: 'Discover Recipes', icon: ChefHat },
    { id: 'discover', label: 'Social Feed', icon: UtensilsCrossed },
    { id: 'my-recipes', label: 'My Recipes', icon: BookMarked },
    { id: 'add-recipe', label: 'Add Recipe', icon: Plus },
    { id: 'meal-planner', label: 'Meal Planner', icon: Calendar },
    { id: 'grocery-list', label: 'Grocery List', icon: ShoppingCart },
    { id: 'cart', label: 'Cart', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const socialPages = ['discover', 'upload', 'profile', 'messages'];

  // Load avatar + unread count + real-time listener
  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load avatar
      const { data: profile } = await supabase
        .from('profiles')
        .select('avatar_url')
        .eq('id', user.id)
        .single();
      setAvatarUrl(profile?.avatar_url || null);

      // Initial unread count
      await fetchUnreadCount(user.id);

      // Real-time subscription
      const channel = supabase
        .channel('messages-layout')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'direct_messages',
          },
          () => fetchUnreadCount(user.id) // Just refetch on any change — simple & bulletproof
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    init();
  }, []);

  const fetchUnreadCount = async (userId: string) => {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('id')
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

    if (!conversations || conversations.length === 0) {
      setUnreadCount(0);
      return;
    }

    const convoIds = conversations.map(c => c.id);

    const { count } = await supabase
      .from('direct_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convoIds)
      .eq('read', false)
      .neq('sender_id', userId);

    setUnreadCount(count || 0);
  };

  const FloatingNavIcons = () => (
    <div className="pointer-events-none fixed z-[500]">
      <div className="pointer-events-auto fixed top-4 right-4 p-2">
        <TooltipProvider>
          <div className="flex items-center gap-2 bg-white/80 backdrop-blur-lg rounded-full shadow-xl border border-gray-200/50 px-3 py-2">
            {navItems
              .filter(item => item.id !== 'discover' && item.id !== 'settings')
              .map((item) => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;
                return (
                  <Tooltip key={item.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-11 w-11 rounded-full transition-all ${
                          isActive
                            ? 'bg-orange-500 text-white shadow-lg'
                            : 'text-gray-700 hover:bg-gray-100 hover:scale-110'
                        }`}
                        onClick={() => onNavigate(item.id)}
                      >
                        <Icon className="h-5 w-5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
          </div>
        </TooltipProvider>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white">
      {/* Sidebar — unchanged */}
      <aside className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 lg:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-gray-200 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Meal Scrape</h1>
              <p className="text-xs text-gray-500">Online Recipe Book & Social Community</p>
            </div>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all ${
                    isActive ? 'bg-primary text-white shadow-md' : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
          <div className="border-t border-gray-200 p-4">
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <p className="text-xs font-medium text-gray-900">Discover, Save, Plan, Shop</p>
              <p className="mt-1 text-xs text-gray-600">All in One Place</p>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}

      <div className="lg:ml-64">
        <FloatingNavIcons />

        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
          <div className="flex h-16 items-center justify-between px-6">
            <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
              {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
            {!socialPages.includes(currentPage) && (
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {navItems.find(item => item.id === currentPage)?.label || 'Meal Scrape'}
              </h2>
            )}
            <div className="w-10" />
          </div>
        </header>

        <main className={socialPages.includes(currentPage) ? '' : 'p-6'}>
          {children}
        </main>

        {/* Messages + Profile + RED BADGE THAT ACTUALLY SHOWS */}
        <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
          <div className="pointer-events-auto max-w-lg mx-auto px-6 pb-6 flex justify-between items-end">
            <TooltipProvider>
              {/* Messages */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative">
                    <button
                      onClick={() => onNavigate('messages')}
                      className={`transition-all duration-200 ${
                        currentPage === 'messages'
                          ? 'text-cyan-500 scale-110'
                          : 'text-gray-500 hover:text-cyan-500 hover:scale-110 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <MessageCircle className="w-10 h-10" strokeWidth={currentPage === 'messages' ? 2.8 : 2} />
                    </button>

                    {/* RED BADGE — ALWAYS VISIBLE WHEN >0 */}
                    {unreadCount > 0 && (
                      <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center animate-pulse shadow-lg border-2 border-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </div>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white">
                  <p className="font-medium">Messages {unreadCount > 0 && `(${unreadCount})`}</p>
                </TooltipContent>
              </Tooltip>

              {/* Profile */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate('profile')}
                    className={`transition-all duration-200 ${
                      currentPage === 'profile'
                        ? 'text-orange-600 scale-110 ring-4 ring-orange-200'
                        : 'text-gray-500 hover:text-orange-600 hover:scale-110 opacity-70 hover:opacity-100'
                    }`}
                  >
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Profile" className={`w-11 h-11 rounded-full object-cover border-3 ${currentPage === 'profile' ? 'border-orange-600' : 'border-gray-300'}`} />
                    ) : (
                      <User className="w-10 h-10" strokeWidth={currentPage === 'profile' ? 2.8 : 2} />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white">
                  <p className="font-medium">Profile</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Upload Button — smaller */}
        {socialPages.includes(currentPage) && (
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate('upload')}
                    className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-3.5 shadow-2xl hover:shadow-3xl transition-all hover:scale-110 opacity-85 hover:opacity-100"
                  >
                    <Camera className="w-8 h-8 text-white" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white">
                  <p className="font-semibold">Create Post</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}

        {/* Social Feed Button */}
        {!socialPages.includes(currentPage) && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => onNavigate('discover')}
                    className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white w-16 h-16 rounded-full shadow-2xl hover:shadow-3xl transition-all hover:scale-110 flex items-center justify-center opacity-90 hover:opacity-100"
                  >
                    <UtensilsCrossed className="w-8 h-8" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-gray-900 text-white">
                  <p className="font-semibold">Social Feed</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>
    </div>
  );
}