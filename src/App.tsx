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
import { Verifying } from './pages/Verifying';
import { Messages } from './pages/Messages';
import { Toaster } from './components/ui/sonner';
import { AuthForm } from './components/AuthForm';
import { Home } from './pages/Home';

function AppContent() {
  const { user, loading, isEmailVerified, showVerifying } = useAuth();
  const [completedVerifying, setCompletedVerifying] = useState(false);

  // ──────────────────────────────
  // INITIAL PAGE + /post/ HANDLING
  // ──────────────────────────────
  const [currentPage, setCurrentPage] = useState<string>(() => {
    const path = window.location.pathname;

    // Direct deep link to a post → force Discover feed + modal
    if (path.match(/^\/post\/[a-f0-9]{36}$/)) {
      return 'discover';
    }

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

    return 'discover-recipes';
  });

  // ─────────────────────
  // HANDLE /post/ links
  // ─────────────────────
  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/post\/([a-f0-9]{36})$/);
    if (match) {
      const postId = match[1];

      // Force page to Discover
      setCurrentPage('discover');

      // Send event immediately + fallback for race condition
      window.dispatchEvent(new CustomEvent('open-shared-post', { detail: postId }));
      (window as any).__pendingSharedPostId = postId;

      // Clean fallback after 2s
      setTimeout(() => {
        delete (window as any).__pendingSharedPostId;
      }, 2000);

      // Clean URL
      window.history.replaceState({}, '', '/discover');
    }
  }, []);

  // ─────────────────────
  // Sync URL changes
  // ─────────────────────
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;
      if (path === '/' || path === '/discover-recipes') setCurrentPage('discover-recipes');
      else if (path === '/discover') setCurrentPage('discover');
      else if (path === '/recipes' || path === '/my-recipes') setCurrentPage('my-recipes');
      // ... add more if you want, but not needed for deep links
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // ─────────────────────
  // Navigation helper
  // ─────────────────────
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
    const url = routes[page] || '/';
    window.history.pushState({}, '', url);
    setCurrentPage(page);
  };

  // ─────────────────────
  // Render correct page
  // ──────────────────────
  const renderPage = () => {
    switch (currentPage) {
      case 'discover-recipes': return <DiscoverRecipes onNavigate={handleNavigate} />;
      case 'discover':         return <Discover onNavigate={handleNavigate} />;
      case 'my-recipes':       return <MyRecipes />;
      case 'add-recipe':       return <AddRecipe onNavigate={handleNavigate} />;
      case 'meal-planner':     return <MealPlanner onNavigate={handleNavigate} />;
      case 'grocery-list':     return <GroceryList onNavigate={handleNavigate} />;
      case 'cart':             return <Cart onNavigate={handleNavigate} />;
      case 'upload':           return <Upload onNavigate={handleNavigate} />;
      case 'profile':          return <Profile />;
      case 'messages':         return <Messages onBack={() => handleNavigate('discover')} />;
      case 'settings':         return <Settings onNavigate={handleNavigate} />;
      default:                 return <Home onNavigate={handleNavigate} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading MealScrape...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthForm />;
  if (showVerifying && !completedVerifying) return <Verifying onComplete={() => setCompletedVerifying(true)} />;
  if (!isEmailVerified) return <VerifyEmail />;

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
      <Toaster />
    </Layout>
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