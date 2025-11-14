import { useState } from 'react';
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

function AppContent() {
  const hash = window.location.hash;
  const pathname = window.location.pathname;

  // Check for password reset FIRST before anything else
  const isPasswordReset =
    (hash && (
      hash.includes('type=recovery') ||
      hash.includes('access_token') ||
      hash.includes('#reset-password') ||
      hash.startsWith('#reset-password')
    )) ||
    pathname === '/reset-password' ||
    pathname.includes('reset-password');

  console.log('App loaded - Hash:', hash);
  console.log('App loaded - Pathname:', pathname);
  console.log('Is password reset?', isPasswordReset);

  const getInitialPage = () => {
    if (hash === '#settings') return 'settings';
    if (hash.startsWith('#post/')) return 'discover';
    return 'discover-recipes';
  };

  const [currentPage, setCurrentPage] = useState(getInitialPage());
  const [discoverKey, setDiscoverKey] = useState(0);
  const [completedVerifying, setCompletedVerifying] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState<{ userId: string; username: string } | null>(null);
  const [sharedPostId, setSharedPostId] = useState<string | null>(
    hash.startsWith('#post/') ? hash.replace('#post/', '') : null
  );
  const { user, loading, isEmailVerified, showVerifying } = useAuth();

  const handleNavigate = (page: string) => {
    if (page === 'discover') {
      setDiscoverKey(prev => prev + 1);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'discover-recipes':
        return <DiscoverRecipes onNavigate={handleNavigate} />;
      case 'discover':
        return <Discover
          key={discoverKey}
          sharedPostId={sharedPostId}
          onNavigateToMessages={(userId, username) => {
            setMessageRecipient({ userId, username });
            setCurrentPage('messages');
          }}
          onPostViewed={() => setSharedPostId(null)}
        />;
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
      case 'settings':
        return <Settings onNavigate={handleNavigate} />;
      case 'upload':
        return <Upload onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile />;
      case 'messages':
        return <Messages
          recipientUserId={messageRecipient?.userId}
          recipientUsername={messageRecipient?.username}
          onBack={() => {
            setMessageRecipient(null);
            setCurrentPage('discover');
          }}
        />;
      default:
        return <DiscoverRecipes onNavigate={handleNavigate} />;
    }
  };

  // CRITICAL: Check password reset BEFORE checking auth status
  // Password reset links work without being logged in
  if (isPasswordReset) {
    return <ResetPassword />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  if (showVerifying && !completedVerifying) {
    return <Verifying onComplete={() => setCompletedVerifying(true)} />;
  }

  if (!isEmailVerified) {
    return <VerifyEmail />;
  }

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <AuthProvider>
      <RecipeProvider>
        <AppContent />
        <Toaster />
      </RecipeProvider>
    </AuthProvider>
  );
}

export default App;
