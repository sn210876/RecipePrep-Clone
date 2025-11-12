import { useState } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { MyRecipes } from './pages/MyRecipes';
import { AddRecipe } from './pages/AddRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { ShoppingList } from './pages/ShoppingList';
import { Settings } from './pages/Settings';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { VerifyEmail } from './pages/VerifyEmail';
import { Verifying } from './pages/Verifying';
import { ResetPassword } from './pages/ResetPassword';
import { Toaster } from './components/ui/sonner';
import { AuthForm } from './components/AuthForm';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [discoverKey, setDiscoverKey] = useState(0);
  const [completedVerifying, setCompletedVerifying] = useState(false);
  const { user, loading, isEmailVerified, showVerifying } = useAuth();

  const hash = window.location.hash;
  const isPasswordReset = hash && (hash.includes('type=recovery') || window.location.pathname === '/reset-password');

  const handleNavigate = (page: string) => {
    if (page === 'discover') {
      setDiscoverKey(prev => prev + 1);
    }
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return <Home onNavigate={handleNavigate} />;
      case 'discover':
        return <Discover key={discoverKey} />;
      case 'my-recipes':
        return <MyRecipes />;
      case 'add-recipe':
        return <AddRecipe onNavigate={handleNavigate} />;
      case 'meal-planner':
        return <MealPlanner />;
      case 'shopping-list':
        return <ShoppingList />;
      case 'settings':
        return <Settings />;
      case 'upload':
        return <Upload onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile />;
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

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
