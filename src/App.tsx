import { useState, useEffect } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Discover as DiscoverRecipes } from './pages/DiscoverRecipes';
import { Discover } from './pages/Discover';
import { MyRecipes } from './pages/MyRecipes';
import { AddRecipe } from './pages/AddRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { GroceryList } from './pages/GroceryList';
import { Cart } from './pages/Cart';
import { Settings } from './pages/Settings';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { VerifyEmail } from './pages/VerifyEmail';
import { Messages } from './pages/Messages';
import { Toaster } from './components/ui/sonner';
import { AuthForm } from './components/AuthForm';
import { Home } from './pages/Home';

// Mobile-safe wrapper — fixes notch & home bar on iPhone/Android
const MobileSafeWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-orange-50 to-amber-50">
    {children}
  </div>
);

function AppContent() {
  const { user, loading, isEmailVerified } = useAuth();

  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;
    if (path.match(/^\/post\/[a-f0-9]{36}$/)) return 'discover';
    if (path === '/' || path === '/discover-recipes') return 'discover-recipes';
    if (path === '/discover') return 'discover';
    if (path === '/recipes' || path === '/my-recipes') return 'my-recipes';
    if (path === '/add-recipe') return 'add-recipe';
    if (path === '/meal-planner') return 'meal-planner';
    if (path === '/grocery-list') return 'grocery-list';
    if (path === '/cart') return 'cart';
    if (path === '/upload') return 'upload';
    if (path === '/profile') return 'profile';
    if (path === '/messages') return 'messages';
    if (path === '/settings') return 'settings';
    if (path === '/onboarding') return 'onboarding';
    if (path.startsWith('/profile/') && path !== '/profile') {
      const username = path.split('/profile/')[1];
      if (username) return `profile:${username}`;
    }
    if (path !== '/' && path.length > 1 && !path.includes('.')) {
      const username = path.substring(1);
      if (username && !username.includes('/')) return `profile:${username}`;
    }
    return 'discover-recipes';
  });

  // Handle /post/ deep links
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/post\/([a-f0-9]{36})$/);
    if (match) {
      const postId = match[1];
      setCurrentPage('discover');
      window.dispatchEvent(new CustomEvent('open-shared-post', { detail: postId }));
      window.history.replaceState({}, '', '/discover');
    }
  }, []);

  // Sync back/forward buttons
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '/discover-recipes') setCurrentPage('discover-recipes');
      else if (path === '/discover') setCurrentPage('discover');
      else if (path === '/recipes' || path === '/my-recipes') setCurrentPage('my-recipes');
      else if (path === '/profile') setCurrentPage('profile');
      else if (path.startsWith('/profile/') && path !== '/profile') {
        const username = path.split('/profile/')[1];
        if (username) setCurrentPage(`profile:${username}`);
      }
      else if (path !== '/' && path.length > 1 && !path.includes('.')) {
        const username = path.substring(1);
        if (username && !username.includes('/')) setCurrentPage(`profile:${username}`);
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const handleNavigate = (page: string) => {
    const routes: Record<string, string> = {
      'discover-recipes': '/',
      'discover': '/discover',
      'my-recipes': '/recipes',
      'add-recipe': '/add-recipe',
      'meal-planner': '/meal-planner',
      'grocery-list': '/grocery-list',
      'cart': '/cart',
      'upload': '/upload',
      'profile': '/profile',
      'messages': '/messages',
      'settings': '/settings',
      'onboarding': '/onboarding',
    };
    if (page.startsWith('profile:')) {
      const username = page.split('profile:')[1];
      window.history.pushState({}, '', `/${username}`);
      setCurrentPage(page);
      return;
    }
    const url = routes[page] || '/';
    window.history.pushState({}, '', url);
    setCurrentPage(page);
  };

  const renderPage = () => {
    if (currentPage.startsWith('profile:')) {
      const username = currentPage.split('profile:')[1];
      return <Profile username={username} />;
    }
    switch (currentPage) {
      case 'discover-recipes': return <DiscoverRecipes onNavigate={handleNavigate} />;
      case 'discover': return <Discover onNavigate={handleNavigate} />;
      case 'my-recipes': return <MyRecipes />;
      case 'add-recipe': return <AddRecipe onNavigate={handleNavigate} />;
      case 'meal-planner': return <MealPlanner onNavigate={handleNavigate} />;
      case 'grocery-list': return <GroceryList onNavigate={handleNavigate} />;
      case 'cart': return <Cart onNavigate={handleNavigate} />;
      case 'upload': return <Upload onNavigate={handleNavigate} />;
      case 'profile': return <Profile />;
      case 'messages': return <Messages onBack={() => handleNavigate('discover')} />;
      case 'settings': return <Settings onNavigate={handleNavigate} />;
      default: return <Home onNavigate={handleNavigate} />;
    }
  };

  // Beautiful hourglass while loading or checking email
  if (loading || (user && isEmailVerified === undefined)) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-20 h-28">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-12 border-8 border-orange-300 rounded-t-full"></div>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-12 border-8 border-orange-300 rounded-b-full"></div>
            <div className="absolute top-10 left-1/2 -translate-x-1/2 w-1 bg-orange-600 origin-top animate-sand"></div>
          </div>
          <p className="mt-8 text-lg font-medium text-orange-800">Preparing your kitchen…</p>
        </div>

        <style jsx>{`
          @keyframes sand {
            0%, 100% { height: 0; opacity: 1; }
            50% { height: 40px; opacity: 1; }
          }
          .animate-sand { animation: sand 2.4s infinite ease-in-out; }
        `}</style>
      </div>
    );
  }

  if (!user) return <AuthForm />;
  if (!isEmailVerified) return <VerifyEmail />;

  // Main app with mobile-safe padding
  return (
    <MobileSafeWrapper>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
        <Toaster />
      </Layout>
    </MobileSafeWrapper>
  );
}

function App() {
  return (
    <AuthProvider>
      <RecipeProvider>
        <AppContent />
      </RecipeProvider>
    </AuthProvider>
  );
}

export default App;