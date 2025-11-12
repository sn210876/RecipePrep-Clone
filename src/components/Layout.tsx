import { ReactNode, useState } from 'react';
import { ChefHat, Compass, BookMarked, Plus, Calendar, ShoppingCart, Settings, Menu, X, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { BottomNav } from './BottomNav';

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { signOut } = useAuth();

  const handleLogout = async () => {
    try {
      await signOut();
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to log out');
    }
  };

  const navItems = [
    { id: 'discover', label: 'Social Feed', icon: Compass },
    { id: 'my-recipes', label: 'My Recipes', icon: BookMarked },
    { id: 'add-recipe', label: 'Add Recipe', icon: Plus },
    { id: 'meal-planner', label: 'Meal Planner', icon: Calendar },
    { id: 'shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  const socialPages = ['discover', 'upload', 'profile'];

  if (currentPage === 'home') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white">
      <aside className={`fixed left-0 top-0 z-40 h-screen w-64 transform bg-white shadow-lg transition-transform duration-300 lg:translate-x-0 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex h-full flex-col">
          <div className="flex items-center gap-3 border-b border-gray-200 p-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <ChefHat className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Recipe Prep</h1>
              <p className="text-xs text-gray-500">Plan, Cook, Enjoy</p>
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
                    isActive
                      ? 'bg-primary text-white shadow-md'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="border-t border-gray-200 p-4 space-y-3">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-left transition-all text-red-700 hover:bg-red-50 border border-red-200"
            >
              <LogOut className="h-5 w-5 text-red-600" />
              <span className="font-medium">Log Out</span>
            </button>
            <div className="rounded-lg bg-gradient-to-br from-amber-50 to-orange-50 p-4">
              <p className="text-xs font-medium text-gray-900">Discover, Save, Plan, Shop</p>
              <p className="mt-1 text-xs text-gray-600">All in One Place</p>
            </div>
          </div>
        </div>
      </aside>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <div className="lg:pl-64">
        {!socialPages.includes(currentPage) && (
          <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
            <div className="flex h-16 items-center justify-between px-6">
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
              <h2 className="text-xl font-semibold text-gray-900 capitalize">
                {navItems.find(item => item.id === currentPage)?.label || 'Recipe Prep'}
              </h2>
              <div className="w-10 lg:w-0" />
            </div>
          </header>
        )}

        <main className={socialPages.includes(currentPage) ? '' : 'p-6'}>
          {children}
        </main>

        {socialPages.includes(currentPage) && (
          <BottomNav currentPage={currentPage} onNavigate={onNavigate} />
        )}
      </div>
    </div>
  );
}
