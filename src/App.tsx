import { useState, useEffect } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import Layout from './components/Layout';
import { imageMonitorService } from './services/imageMonitorService';
import { Discover as DiscoverRecipes } from './pages/DiscoverRecipes';
import { Discover } from './pages/Discover';
import { MyRecipes } from './pages/MyRecipes';
import { AddRecipe } from './pages/AddRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { GroceryList } from './pages/GroceryList';
import { Cart } from './pages/CartEnhanced';
import Settings from './pages/Settings';
import Referrals from './pages/Referrals';
import AdminPayouts from './pages/AdminPayouts';
import AdminImageMigration from './pages/AdminImageMigration';
import { AdminProducts } from './pages/AdminProducts';
import { AdminMappings } from './pages/AdminMappings';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { VerifyEmail } from './pages/VerifyEmail';
import { Messages } from './pages/Messages';
import { Blog } from './pages/Blog';
import { BlogPostPage } from './pages/BlogPost';
import { FAQ } from './pages/FAQ';
import { Onboarding } from './pages/Onboarding';
import { Toaster } from './components/ui/sonner';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { supabase } from './lib/supabase';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { SendIntent } from '@supernotes/capacitor-send-intent';
import AuthForm from './components/AuthForm';
import { ErrorBanner } from './components/ErrorBanner';
import { errorHandler } from './lib/errorHandler';
import { checkEnvironment } from './lib/envChecker';
import { safeStorage } from './lib/safeStorage';
import { withTimeout, forceSessionCheck, AuthTimeoutError } from './lib/authTimeout';

// Mobile-safe wrapper — fixes notch & home bar on iPhone/Android
const MobileSafeWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
    {children}
  </div>
);

function AppContent() {
  const { user, loading, isEmailVerified } = useAuth();
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [envError, setEnvError] = useState<{
    message: string;
    details: string[];
  } | null>(null);

  useEffect(() => {
    errorHandler.info('App', '🎬 AppContent mounted');
    const envCheck = checkEnvironment();
    if (!envCheck.isValid) {
      errorHandler.error('App', '❌ Environment check failed in AppContent');
      setEnvError({
        message: 'Critical environment variables are missing. The app may not function correctly.',
        details: envCheck.missing.map(v => `Missing: ${v}`)
      });
    }

    return () => {
      errorHandler.info('App', '🧹 AppContent unmounting');
    };
  }, []);

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
  if (path === '/referrals') return 'referrals';
  if (path === '/admin-payouts') return 'admin-payouts';
  if (path === '/admin-image-migration') return 'admin-image-migration';
  if (path === '/admin-products') return 'admin-products';
  if (path === '/admin-mappings') return 'admin-mappings';
  if (path === '/faq') return 'faq';
  if (path === '/onboarding') return 'onboarding';
  if (path === '/auth/callback') return 'auth-callback';
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
    const knownRoutes = ['add-recipe', 'meal-planner', 'grocery-list', 'cart', 'upload', 'messages', 'settings', 'admin-payouts', 'admin-image-migration', 'admin-products', 'admin-mappings', 'blog'];
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

  useEffect(() => {
    try {
      errorHandler.info('App', '📸 Starting image monitoring service...');
      imageMonitorService.startMonitoring();

      return () => {
        try {
          errorHandler.info('App', '🛑 Stopping image monitoring service...');
          imageMonitorService.stopMonitoring();
        } catch (error) {
          errorHandler.error('App', 'Failed to stop image monitoring', error);
        }
      };
    } catch (error) {
      errorHandler.error('App', 'Failed to start image monitoring', error);
    }
  }, []);

  // Sync back/forward buttons
  useEffect(() => {
    const handlePop = () => {
      const path = window.location.pathname;

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
      } else if (path === '/admin-payouts') {
        setCurrentPage('admin-payouts');
      } else if (path === '/admin-image-migration') {
        setCurrentPage('admin-image-migration');
      } else if (path === '/admin-products') {
        setCurrentPage('admin-products');
      } else if (path === '/admin-mappings') {
        setCurrentPage('admin-mappings');
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
        setCurrentPage('discover');
      } else if (path !== '/' && path.length > 1 && !path.includes('.')) {
        const username = path.substring(1);
        const knownRoutes = ['add-recipe', 'meal-planner', 'grocery-list', 'cart', 'admin-payouts', 'admin-image-migration', 'admin-products', 'admin-mappings', 'blog'];
        if (username && !username.includes('/') && !knownRoutes.includes(username)) {
          setCurrentPage(`profile:${username}`);
        } else {
          setCurrentPage('discover-recipes');
        }
      } else {
        setCurrentPage('discover-recipes');
      }
    };

    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Mobile app initialization
  useEffect(() => {
    const initializeMobileApp = async () => {
      if (Capacitor.isNativePlatform()) {
        errorHandler.info('App', '📱 Initializing mobile app...');
        try {
          errorHandler.info('App', '🎨 Setting status bar style...');
          await StatusBar.setStyle({ style: Style.Light });
          if (Capacitor.getPlatform() === 'android') {
            errorHandler.info('App', '🤖 Setting Android status bar color...');
            await StatusBar.setBackgroundColor({ color: '#FF6B35' });
          }
          errorHandler.info('App', '✅ Status bar configured');
        } catch (e) {
          errorHandler.error('App', 'Status bar configuration error', e);
        }

        setTimeout(() => {
          try {
            errorHandler.info('App', '👋 Hiding splash screen...');
            SplashScreen.hide();
          } catch (error) {
            errorHandler.error('App', 'Failed to hide splash screen', error);
          }
        }, 1000);

        CapApp.addListener('backButton', (data) => {
          const isHomePage = window.location.pathname === '/' ||
                            window.location.pathname === '/discover-recipes';

          if (isHomePage && !data.canGoBack) {
            CapApp.exitApp();
          } else {
            window.history.back();
          }
        });

        CapApp.addListener('appUrlOpen', async (data) => {
          errorHandler.info('App', '🔗 Deep link received:', data.url);
          const url = new URL(data.url);

          const hash = url.hash;
          const searchParams = url.searchParams;
          const hasError = searchParams.has('error');
          const errorDescription = searchParams.get('error_description');

          errorHandler.info('App', '🔍 Deep link details:', {
            fullUrl: data.url,
            hash: hash.substring(0, 100),
            searchParams: searchParams.toString().substring(0, 100),
            pathname: url.pathname,
            hasError,
            errorDescription
          });

          if (hasError) {
            const errorMsg = searchParams.get('error');
            errorHandler.error('App', '❌ OAuth error in deep link:', {
              error: errorMsg,
              description: errorDescription,
              fullUrl: data.url
            });

            let userFriendlyError = errorDescription || 'OAuth authentication failed';
            if (errorDescription?.includes('redirect_uri_mismatch')) {
              userFriendlyError = 'OAuth configuration error: The redirect URL does not match. Expected: https://mealscrape.com/auth/callback. Please verify your Google Cloud Console and Supabase settings.';
            }

            localStorage.setItem('oauth_error', userFriendlyError);
            window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
              detail: { success: false, error: userFriendlyError }
            }));
            return;
          }

          // Handle PKCE flow - exchange code for session
          if (searchParams.has('code')) {
            errorHandler.info('App', '🔑 PKCE code detected, exchanging for session');
            const code = searchParams.get('code');

            if (code) {
              try {
                errorHandler.info('App', '🔄 Calling exchangeCodeForSession with code:', code.substring(0, 8) + '...');

                const { data, error } = await supabase.auth.exchangeCodeForSession(code);

                if (error) {
                  errorHandler.error('App', '❌ Code exchange failed:', error);
                  localStorage.setItem('oauth_error', error.message);
                  window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                    detail: { success: false, error }
                  }));
                } else if (data.session) {
                  errorHandler.info('App', '✅ Code exchanged successfully!', {
                    hasUser: !!data.user,
                    userEmail: data.user?.email
                  });

                  errorHandler.info('App', '📢 Dispatching oauth-callback-complete event');
                  window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                    detail: { success: true }
                  }));
                } else {
                  errorHandler.error('App', '❌ No session returned from code exchange');
                  localStorage.setItem('oauth_error', 'No session returned');
                  window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                    detail: { success: false, error: 'No session returned' }
                  }));
                }
              } catch (error) {
                errorHandler.error('App', '❌ Exception during code exchange:', error);
                localStorage.setItem('oauth_error', error instanceof Error ? error.message : 'Unknown error');
                window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                  detail: { success: false, error }
                }));
              }
            }
            return;
          }

          if (hash && hash.includes('access_token')) {
            errorHandler.info('App', '🔐 OAuth callback detected in hash');
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const refreshToken = params.get('refresh_token');
            const type = params.get('type');

            errorHandler.info('App', '🔑 Extracted tokens:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              type,
              accessTokenLength: accessToken?.length || 0
            });

            if (accessToken && refreshToken) {
              try {
                errorHandler.info('App', '✅ Setting session from OAuth tokens with timeout');

                const setSessionResult = await withTimeout(
                  supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                  }),
                  { timeoutMs: 15000, operationName: 'OAuth setSession' }
                );

                const { data: sessionData, error: setSessionError } = setSessionResult as any;

                if (setSessionError) {
                  errorHandler.error('App', '❌ Failed to set session:', setSessionError);
                  localStorage.setItem('oauth_error', setSessionError.message);
                } else {
                  errorHandler.info('App', '✅ OAuth session set successfully!', {
                    hasUser: !!sessionData?.user,
                    userEmail: sessionData?.user?.email
                  });

                  errorHandler.info('App', '📢 Dispatching oauth-callback-complete event');
                  window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                    detail: { success: true }
                  }));
                }
              } catch (error) {
                errorHandler.error('App', '❌ Exception setting session:', error);
                localStorage.setItem('oauth_error', error instanceof Error ? error.message : 'Unknown error');

                window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                  detail: { success: false, error }
                }));
              }
            }
          } else if (searchParams.has('access_token')) {
            errorHandler.info('App', '🔐 OAuth callback detected in query params');
            const accessToken = searchParams.get('access_token');
            const refreshToken = searchParams.get('refresh_token');

            errorHandler.info('App', '🔑 Extracted tokens:', {
              hasAccessToken: !!accessToken,
              hasRefreshToken: !!refreshToken,
              accessTokenLength: accessToken?.length || 0
            });

            if (accessToken && refreshToken) {
              try {
                errorHandler.info('App', '✅ Setting session from OAuth tokens with timeout');

                const setSessionResult = await withTimeout(
                  supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: refreshToken
                  }),
                  { timeoutMs: 15000, operationName: 'OAuth setSession' }
                );

                const { data: sessionData, error: setSessionError } = setSessionResult as any;

                if (setSessionError) {
                  errorHandler.error('App', '❌ Failed to set session:', setSessionError);
                  localStorage.setItem('oauth_error', setSessionError.message);
                } else {
                  errorHandler.info('App', '✅ OAuth session set successfully!', {
                    hasUser: !!sessionData?.user,
                    userEmail: sessionData?.user?.email
                  });

                  errorHandler.info('App', '📢 Dispatching oauth-callback-complete event');
                  window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                    detail: { success: true }
                  }));
                }
              } catch (error) {
                errorHandler.error('App', '❌ Exception setting session:', error);
                localStorage.setItem('oauth_error', error instanceof Error ? error.message : 'Unknown error');

                window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
                  detail: { success: false, error }
                }));
              }
            }
          } else if (url.pathname.startsWith('/post/')) {
            const postId = url.pathname.split('/post/')[1];
            setCurrentPage('discover');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('open-shared-post', { detail: postId }));
            }, 500);
          } else if (localStorage.getItem('oauth_in_progress')) {
            errorHandler.error('App', '⚠️ OAuth in progress but NO code/tokens in deep link URL!');
            errorHandler.error('App', '📋 Deep link URL received:', data.url);
            errorHandler.error('App', '📋 Expected: https://mealscrape.com/auth/callback?code=...');
            errorHandler.error('App', '⚠️ This usually means the redirect URL in Google Console does not match.');
            errorHandler.error('App', '⚠️ Check that https://mealscrape.com/auth/callback is configured in:');
            errorHandler.error('App', '   1. Google Cloud Console > APIs & Services > Credentials > OAuth 2.0 Client > Authorized redirect URIs');
            errorHandler.error('App', '   2. Supabase Dashboard > Authentication > URL Configuration > Redirect URLs');

            const detailedError = `OAuth callback received but missing authorization code or tokens.

Received URL: ${data.url}
Expected format: https://mealscrape.com/auth/callback?code=...

This error means the OAuth redirect URL configuration doesn't match between:
• Google Cloud Console (should have: https://mealscrape.com/auth/callback)
• Supabase Dashboard (should have: https://mealscrape.com/auth/callback)

Please verify both configurations match exactly.`;

            localStorage.setItem('oauth_error', detailedError);
            window.dispatchEvent(new CustomEvent('oauth-callback-complete', {
              detail: { success: false, error: 'OAuth redirect URL mismatch' }
            }));
          }
        });

        CapApp.addListener('appStateChange', async ({ isActive }) => {
          if (isActive) {
            errorHandler.info('App', '🔄 App resumed - refreshing session');
            try {
              const { data: { session }, error } = await supabase.auth.getSession();
              if (error) {
                errorHandler.error('App', '❌ Failed to refresh session on resume', error);
              } else if (session) {
                errorHandler.info('App', '✅ Session found, triggering auth state update');
                await supabase.auth.setSession({
                  access_token: session.access_token,
                  refresh_token: session.refresh_token
                });
              } else {
                errorHandler.info('App', '⚠️ No session found on resume');
              }
            } catch (error) {
              errorHandler.error('App', '❌ Exception during session refresh', error);
            }
          } else {
            errorHandler.info('App', '⏸️ App paused');
          }
        });

        try {
          errorHandler.info('App', '📤 Checking for shared content...');
          const intent = await SendIntent.checkSendIntentReceived();
          if (intent && intent.url) {
            errorHandler.info('App', '🔗 Shared URL received:', intent.url);
            setCurrentPage('add-recipe');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('shared-url', { detail: intent.url }));
            }, 500);
          } else if (intent && intent.title) {
            errorHandler.info('App', '📝 Shared text received:', intent.title);
            setCurrentPage('add-recipe');
            setTimeout(() => {
              window.dispatchEvent(new CustomEvent('shared-url', { detail: intent.title }));
            }, 500);
          }
        } catch (error) {
          errorHandler.info('App', 'No shared intent or error checking:', error);
        }
      }
    };

    initializeMobileApp();

    return () => {
      if (Capacitor.isNativePlatform()) {
        CapApp.removeAllListeners();
      }
    };
  }, []);

  // Clear auth prompt when user logs in
  useEffect(() => {
    if (user && showAuthPrompt) {
      errorHandler.info('App', '🔓 User logged in, clearing auth prompt');
      setShowAuthPrompt(false);
    }
  }, [user, showAuthPrompt]);

  // Check if onboarding should be shown
  useEffect(() => {
    if (user && !loading && isEmailVerified) {
      const checkOnboarding = async () => {
        try {
          errorHandler.info('App', '🎓 Checking onboarding status...');

          let hasSeenOnboarding: string | null = null;

          if (Capacitor.isNativePlatform()) {
            const { Preferences } = await import('@capacitor/preferences');
            const result = await Preferences.get({ key: `onboarding_seen_${user.id}` });
            hasSeenOnboarding = result.value;
          } else {
            hasSeenOnboarding = safeStorage.getItem(`onboarding_seen_${user.id}`);
          }

          if (!hasSeenOnboarding) {
            errorHandler.info('App', '🆕 New user detected, showing onboarding');
            setShowOnboarding(true);
          } else {
            errorHandler.info('App', '✅ User has seen onboarding');
          }
        } catch (error) {
          errorHandler.error('App', 'Failed to check onboarding status', error);
        }
      };

      checkOnboarding();
    }
  }, [user, loading, isEmailVerified]);

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
      'settings',
      'admin-payouts',
      'admin-image-migration',
      'admin-products',
      'admin-mappings'
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
      'referrals': '/referrals',
      'admin-payouts': '/admin-payouts',
      'admin-image-migration': '/admin-image-migration',
      'admin-products': '/admin-products',
      'admin-mappings': '/admin-mappings',
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
      case 'referrals': return <Referrals />;
      case 'admin-payouts': return <AdminPayouts />;
      case 'admin-image-migration': return <AdminImageMigration />;
      case 'admin-products': return <AdminProducts />;
      case 'admin-mappings': return <AdminMappings />;
      case 'faq': return <FAQ />;
      case 'onboarding': return <Onboarding onComplete={() => handleNavigate('discover-recipes')} />;
      case 'auth-callback': return (
        <div className="fixed inset-0 bg-gradient-to-br from-orange-50 to-rose-50 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <img src="/spoon-nobg.png" alt="MealScrape" className="w-32 h-32 mx-auto mb-6 animate-bounce" />
            <h1 className="text-2xl font-bold text-gray-900 mb-3">Completing Sign In</h1>
            <p className="text-gray-600">Redirecting to app...</p>
          </div>
        </div>
      );
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

  const handleOnboardingComplete = async () => {
    if (user) {
      try {
        if (Capacitor.isNativePlatform()) {
          const { Preferences } = await import('@capacitor/preferences');
          await Preferences.set({
            key: `onboarding_seen_${user.id}`,
            value: 'true'
          });
        } else {
          safeStorage.setItem(`onboarding_seen_${user.id}`, 'true');
        }
        errorHandler.info('App', '✅ Onboarding marked as complete');
      } catch (error) {
        errorHandler.error('App', 'Failed to save onboarding status', error);
      }
    }
    setShowOnboarding(false);
    handleNavigate('discover-recipes');
  };

  // Allow access to DiscoverRecipes, Blog, and FAQ without login
  const publicPages = ['discover-recipes', 'blog', 'faq'];
  const isPublicPage = publicPages.includes(currentPage) || currentPage.startsWith('blog:');

  // Show onboarding for new users
  if (showOnboarding && user && !loading) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Show auth form if not logged in and trying to access protected content OR if showAuthPrompt is true
  // But DON'T show it if we're still loading (session might be restoring)
  if ((!user && !isPublicPage && !loading) || showAuthPrompt) return <AuthForm />;
  // Only check email verification if user is logged in and not on public pages
  if (user && !isEmailVerified && !isPublicPage) return <VerifyEmail />;

  // Main app with mobile-safe padding
  return (
    <MobileSafeWrapper>
      {envError && (
        <ErrorBanner
          title="Configuration Error"
          message={envError.message}
          details={envError.details}
          severity="error"
          onDismiss={() => setEnvError(null)}
        />
      )}
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
        <Toaster />
      </Layout>
    </MobileSafeWrapper>
  );
}

function App() {
  useEffect(() => {
    errorHandler.info('App', '🚀 App component mounting...');
    return () => {
      errorHandler.info('App', '👋 App component unmounting...');
    };
  }, []);

  try {
    return (
      <AuthProvider>
        <LanguageProvider>
          <RecipeProvider>
            <AppContent />
          </RecipeProvider>
        </LanguageProvider>
      </AuthProvider>
    );
  } catch (error) {
    errorHandler.error('App', '❌ Failed to render App', error);
    throw error;
  }
}

export default App;