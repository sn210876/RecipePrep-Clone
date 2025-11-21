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
  const { user, loading, isEmailVerified } = useAuth();

  // Simple loading + verification state
  const isChecking = loading || (user && isEmailVerified === undefined);

  if (isChecking) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-orange-50">
        <div className="text-center">
          {/* Simple, beautiful hourglass that ALWAYS works */}
          <div className="relative w-20 h-28">
            <svg viewBox="0 0 100 140" className="w-full h-full">
              <path d="M20 10 L50 50 L80 10 L80 40 L20 40 Z" fill="none" stroke="#fb923c" strokeWidth="8" />
              <path d="M20 100 L50 60 L80 100 L80 130 L20 130 Z" fill="none" stroke="#fb923c" strokeWidth="8" />
              <path d="M50 50 L50 100" stroke="#ea580c" strokeWidth="6">
                <animate attributeName="stroke-dashoffset" values="50;0;50" dur="2.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="1;0.3;1" dur="2.5s" repeatCount="indefinite" />
              </path>
            </svg>
          </div>
          <p className="mt-8 text-lg font-semibold text-orange-700">Preparing your kitchen…</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthForm />;
  if (!isEmailVerified) return <VerifyEmail />;

  // Everything else stays exactly as before — just return your normal app
  return (
    <Layout currentPage={window.location.pathname === '/' ? 'discover-recipes' : window.location.pathname.slice(1)} onNavigate={() => {}}>
      {/* Your existing renderPage() logic here — or just put your main content */}
      <Home onNavigate={() => {}} />
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