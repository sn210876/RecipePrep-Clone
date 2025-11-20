import { ReactNode, useState } from 'react';
import { ChefHat, BookMarked, Plus, Calendar, ShoppingCart, Settings, Menu, X, UtensilsCrossed, PiggyBank } from 'lucide-react';
import { Button } from './ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
// import { useAuth } from '../context/AuthContext';
// import { toast } from 'sonner';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // const { signOut } = useAuth(); // Logout in Settings

  // Logout handled in Settings page

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

  const socialPages = ['discover', 'upload', 'profile', 'messages'];

  // REUSABLE FLOATING ICON BAR — ALWAYS ON TOP
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
    {/* LEFT SIDEBAR - desktop + mobile menu */}
    <aside className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 lg:translate-x-0 ${
      isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
    }`}>
      {/* ... your sidebar content stays exactly the same ... */}
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
        <div className="border-t border-gray-200 p-4 space-y-3">
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

      {/* 1. Messages + Profile — visible on EVERY page */}
      <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
        <div className="pointer-events-auto max-w-lg mx-auto px-6 pb-4 flex justify-between">
          {/* Messages */}
          <button
            onClick={() => onNavigate('messages')}
            className={`transition-colors ${currentPage === 'messages' ? 'text-cyan-500' : 'text-gray-600 hover:text-cyan-500'}`}
          >
            <MessageCircle className="w-8 h-8" strokeWidth={currentPage === 'messages' ? 2.5 : 2} />
          </button>

          {/* Profile */}
          <button
            onClick={() => onNavigate('profile')}
            className={`transition-colors ${currentPage === 'profile' ? 'text-orange-600' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className={`w-9 h-9 rounded-full object-cover ${currentPage === 'profile' ? 'ring-2 ring-orange-600' : ''}`} />
            ) : (
              <User className="w-8 h-8" strokeWidth={currentPage === 'profile' ? 2.5 : 2} />
            )}
          </button>
        </div>
      </div>

      {/* 2. Big Upload button — ONLY on social pages */}
      {socialPages.includes(currentPage) && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
          <button
            onClick={() => onNavigate('upload')}
            className="bg-gradient-to-r from-orange-500 to-red-500 rounded-full p-4 shadow-2xl hover:shadow-3xl transition-all hover:scale-110"
          >
            <Camera className="w-10 h-10 text-white" />
          </button>
        </div>
      )}

      {/* 3. Social Feed button — only on NON-social pages */}
      {!socialPages.includes(currentPage) && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onNavigate('discover')}
                  className="flex items-center justify-center bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white w-14 h-14 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-105"
                >
                  <UtensilsCrossed className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="bg-gray-900 text-white">
                <p className="font-medium">Social Feed</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  </div>
);
