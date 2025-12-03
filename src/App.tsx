import { useState, useEffect } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import { LanguageProvider } from './context/LanguageContext';
import { SubscriptionGate } from './components/SubscriptionGate';
import Layout from './components/Layout';
import { Discover as DiscoverRecipes } from './pages/DiscoverRecipes';
import { Discover } from './pages/Discover';
import { MyRecipes } from './pages/MyRecipes';
import { AddRecipe } from './pages/AddRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { GroceryList } from './pages/GroceryList';
import { Cart } from './pages/CartEnhanced';
import Settings from './pages/Settings';
import { Subscription } from './pages/Subscription';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { VerifyEmail } from './pages/VerifyEmail';
import { Messages } from './pages/Messages';
import { Blog } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { FAQ } from './pages/FAQ';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import AuthForm from './components/AuthForm';

// Mobile-safe wrapper — fixes notch & home bar on iPhone/Android
const MobileSafeWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] bg-gradient-to-br from-orange-50 to-amber-50">
    {children}
  </div>
);

function AppContent() {
  const { user, loading, isEmailVerified } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);

 const [currentPage, setCurrentPage] = useState<string>(() => {
  const path = window.location.pathname;
  if (path.match(/^\/post\/[a-f0-9-]{36}$/)) return 'discover';
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
  if (path === '/subscription') return 'subscription';
  if (path === '/subscription/success') return 'subscription-success';
  if (path === '/faq') return 'faq';
  if (path === '/onboarding') return 'onboarding';
  if (path === '/blog') return 'blog';
  if (path.startsWith('/blog/') && path !== '/blog') {
    const slug = path.split('/blog/')[1];
    if (slug) return `blog:${slug}`;
  }
  if (path.startsWith('/profile/') && path !== '/profile') {
    const username = path.split('/profile/')[1];
    if (username) return `profile:${username}`;
  }

  // Only treat as username if not a known route
  if (path !== '/' && path.length > 1 && !path.includes('.')) {
    const username = path.substring(1);
    const knownRoutes = ['add-recipe', 'meal-planner', 'grocery-list', 'cart', 'upload', 'messages', 'settings', 'blog'];
    if (username && !username.includes('/') && !knownRoutes.includes(username)) {
      return `profile:${username}`;
    }
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
  // Add mobile app initialization
useEffect(() => {
  const initializeMobileApp = async () => {
    // Only run on native platforms (iOS/Android)
    if (Capacitor.isNativePlatform()) {
      
      // Configure status bar
      try {
        await StatusBar.setStyle({ style: Style.Light });
        if (Capacitor.getPlatform() === 'android') {
          await StatusBar.setBackgroundColor({ color: '#FF6B35' });
        }
      } catch (e) {
        console.log('Status bar error:', e);
      }
      
      // Hide splash screen after app loads
      setTimeout(() => {
        SplashScreen.hide();
      }, 1000);
      
      // Handle Android back button - IMPROVED
      CapApp.addListener('backButton', (data) => {
        console.log('Back button pressed, canGoBack:', data.canGoBack);

        // Check if we're on the home page
        const isHomePage = window.location.pathname === '/' ||
                          window.location.pathname === '/discover-recipes';

        if (isHomePage && !data.canGoBack) {
          // Exit app if on home page with no history
          CapApp.exitApp();
        } else {
          // Navigate back in history
          window.history.back();
        }
      });
      
      // Handle deep links (e.g., mealscrape://recipe/123)
      CapApp.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data.url);
        // Handle deep link navigation here
        const url = new URL(data.url);
        if (url.pathname.startsWith('/post/')) {
          const postId = url.pathname.split('/post/')[1];
          setCurrentPage('discover');
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('open-shared-post', { detail: postId }));
          }, 500);
        }
      });
    }
  };
  
  initializeMobileApp();
  
  return () => {
    if (Capacitor.isNativePlatform()) {
      CapApp.removeAllListeners();
    }
  };
}, []);
  // Explicit route checks first
  if (path === '/' || path === '/discover-recipes') {
    setCurrentPage('discover-recipes');
  } else if (path === '/discover') {
    setCurrentPage('discover');
  } else if (path === '/recipes' || path === '/my-recipes') {
    setCurrentPage('my-recipes');
  } else if (path === '/upload') {
    setCurrentPage('upload');
  } else if (path === '/messages') {
    setCurrentPage('messages');
  } else if (path === '/settings') {
    setCurrentPage('settings');
  } else if (path === '/blog') {
    setCurrentPage('blog');
  } else if (path.startsWith('/blog/') && path !== '/blog') {
    const slug = path.split('/blog/')[1];
    if (slug) setCurrentPage(`blog:${slug}`);
  } else if (path === '/profile') {
    setCurrentPage('profile');
  } else if (path.startsWith('/profile/') && path !== '/profile') {
    const username = path.split('/profile/')[1];
    if (username) setCurrentPage(`profile:${username}`);
  } else if (path.match(/^\/post\/[a-f0-9-]{36}$/)) {
    // Handle post deep links
    setCurrentPage('discover');
  } else if (path !== '/' && path.length > 1 && !path.includes('.')) {
    // Only treat as username if it doesn't match any known routes
    const username = path.substring(1);
    const knownRoutes = ['add-recipe', 'meal-planner', 'grocery-list', 'cart', 'blog'];
    if (username && !username.includes('/') && !knownRoutes.includes(username)) {
      setCurrentPage(`profile:${username}`);
    } else {
      setCurrentPage('discover-recipes'); // Default fallback
    }
  } else {
    setCurrentPage('discover-recipes');
  }
};
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  const handleNavigate = (page: string) => {
    // Protected pages that require authentication
    const protectedPages = [
      'discover',
      'my-recipes',
      'add-recipe',
      'meal-planner',
      'grocery-list',
      'cart',
      'upload',
      'profile',
      'messages',
      'settings'
    ];

    // Check if user is trying to access a protected page without login
    if (!user && (protectedPages.includes(page) || page.startsWith('profile:'))) {
      // Show auth form
      setShowAuthPrompt(true);
      return;
    }

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
     'subscription': '/subscription',
      'faq': '/faq',
      'onboarding': '/onboarding',
      'blog': '/blog',
    };
    if (page.startsWith('profile:')) {
      const username = page.split('profile:')[1];
      window.history.pushState({}, '', `/${username}`);
      setCurrentPage(page);
      return;
    }
    if (page.startsWith('blog:')) {
      const slug = page.split('blog:')[1];
      window.history.pushState({}, '', `/blog/${slug}`);
      setCurrentPage(page);
      return;
    }

    // Handle pages with query parameters (e.g., add-recipe?edit=123)
    if (page.includes('?')) {
      const [pageName, queryString] = page.split('?');
      const url = routes[pageName] || '/';
      window.history.pushState({}, '', `${url}?${queryString}`);
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
    if (currentPage.startsWith('blog:')) {
      const slug = currentPage.split('blog:')[1];
      return <BlogPostPage slug={slug} onNavigate={handleNavigate} />;
    }
    switch (currentPage) {
      case 'discover-recipes': return <DiscoverRecipes onNavigate={handleNavigate} />;
      case 'discover':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Social Feed">
            <Discover onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'my-recipes':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="My Recipes">
            <MyRecipes />
          </SubscriptionGate>
        );
      case 'add-recipe':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Add Recipe">
            <AddRecipe onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'meal-planner':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Meal Planner">
            <MealPlanner onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'grocery-list':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Grocery List">
            <GroceryList onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'cart':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Shopping Cart">
            <Cart onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'upload':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Upload">
            <Upload onNavigate={handleNavigate} />
          </SubscriptionGate>
        );
      case 'profile':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Profile">
            <Profile />
          </SubscriptionGate>
        );
      case 'messages':
        return (
          <SubscriptionGate onNavigate={handleNavigate} featureName="Messages">
            <Messages onBack={() => handleNavigate('discover')} />
          </SubscriptionGate>
        );
      case 'settings': return <Settings onNavigate={handleNavigate} />;
      case 'subscription': return <Subscription onNavigate={handleNavigate} />;
      case 'subscription-success': return <SubscriptionSuccess onNavigate={handleNavigate} />;
      case 'faq': return <FAQ />;
      case 'blog': return <Blog onNavigate={handleNavigate} />;
      default: return <DiscoverRecipes onNavigate={handleNavigate} />;
    }
  };

  // Beautiful hourglass while loading or checking email
if (loading || (user && isEmailVerified === undefined)) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-64 h-64">
            <img 
              src="/spoon-nobg.png" 
              alt="Loading"
              className="w-full h-full object-contain animate-bowl-splash"
            />
          </div>
        </div>

        <style>{`
          @keyframes bowl-splash {
            0%, 100% { 
              transform: scale(1);
            }
            50% { 
              transform: scale(1.1);
            }
          }
          @keyframes splash-out {
            0%, 100% {
              transform: translateY(0) scale(1);
              opacity: 1;
            }
            50% {
              transform: translateY(-20px) scale(1.2);
              opacity: 0.8;
            }
          }
          .animate-bowl-splash { 
            animation: bowl-splash 1.5s ease-in-out infinite, splash-out 1.5s ease-in-out infinite;
            filter: drop-shadow(0 10px 30px rgba(255, 107, 53, 0.3));
          }
        `}</style>
      </div>
    );
  }

  // Allow access to DiscoverRecipes, Blog, FAQ, and Subscription without login
  const publicPages = ['discover-recipes', 'blog', 'faq', 'subscription'];
  const isPublicPage = publicPages.includes(currentPage) || currentPage.startsWith('blog:');

  // Show auth form if not logged in and trying to access protected content OR if showAuthPrompt is true
  if ((!user && !isPublicPage) || showAuthPrompt) return <AuthForm />;
  // Only check email verification if user is logged in and not on public pages
  if (user && !isEmailVerified && !isPublicPage) return <VerifyEmail />;

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
      <LanguageProvider>
        <SubscriptionProvider>
          <RecipeProvider>
            <AppContent />
          </RecipeProvider>
        </SubscriptionProvider>
      </LanguageProvider>
    </AuthProvider>
  );
}

export default App;