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
import { ResetPassword } from './pages/ResetPassword';
import { Messages } from './pages/Messages';
import { Toaster } from './components/ui/sonner';
import { AuthForm } from './components/AuthForm';
import { Home } from './pages/Home';

function AppContent() {
  const { user, loading, isEmailVerified, showVerifying } = useAuth();
  const [completedVerifying, setCompletedVerifying] = useState(false);

  // Get current path
  const pathname = window.location.pathname;
  const searchParams = new URLSearchParams(window.location.search);

  // Handle password reset
  const isPasswordReset = searchParams.get('type') === 'recovery' || pathname === '/reset-password';

  // Determine current page from URL
  const getCurrentPage = () => {
    if (isPasswordReset) return 'reset-password';
    if (pathname === '/' || pathname === '/discover-recipes') return 'discover-recipes';
    if (pathname === '/discover') return 'discover';
    if (pathname === '/recipes' || pathname === '/my-recipes') return 'my-recipes';
    if (pathname === '/add-recipe') return 'add-recipe';
    if (pathname === '/meal-planner') return 'meal-planner';
    if (pathname === '/grocery-list') return 'grocery-list';
    if (pathname === '/cart') return 'cart';
    if (pathname === '/upload') return 'upload';
    if (pathname === '/profile') return 'profile';
    if (pathname === '/messages') return 'messages';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/onboarding') return 'onboarding';
    return 'discover-recipes';
  };

  
  // Update page when URL changes
  useEffect(() => {
    const handlePopState = () => setCurrentPage(getCurrentPage());
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
//input
 // ←←← ADD THIS WHOLE BLOCK ←←←
  useEffect(() => {
  const path = window.location.pathname;
  const match = path.match(/^\/post\/([a-f0-9-]{36})$/);
  if (match) {
    const postId = match[1];

    // 1. Navigate to discover feed
    handleNavigate('discover');

    // 2. Fire event IMMEDIATELY + store fallback
    window.dispatchEvent(new CustomEvent('open-shared-post', { detail: postId }));
    (window as any).__pendingSharedPostId = postId;

    // 3. Clean up fallback after 2 seconds
    setTimeout(() => {
      delete (window as any).__pendingSharedPostId;
    }, 2000);

    // 4. Clean URL
    window.history.replaceState({}, '', '/discover');
  }
}, []);
  // ←←← END OF BLOCK ←←←
//output
  // Navigation function that updates URL
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

  const renderPage = () => {
    switch (currentPage) {
      case 'discover-recipes':
        return <DiscoverRecipes onNavigate={handleNavigate} />;
      case 'discover':
        return <Discover onNavigate={handleNavigate} />;
      case 'my-recipes':
        return <MyRecipes />;
      case 'add-recipe':
        return <AddRecipe onNavigate={handleNavigate} />;
      case 'meal-planner':
        return <MealPlanner onNavigate={handleNavigate} />;
      case 'grocery-list':
        return <GroceryList onNavigate={handleNavigate} />;
      case 'cart':
        return <Cart onNavigate={handleNavigate} />;
      case 'upload':
        return <Upload onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile />;
      case 'messages':
        return <Messages onBack={() => handleNavigate('discover')} />;
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'reset-password':
        return <ResetPassword />;
      default:
        return <Home onNavigate={handleNavigate} />;
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