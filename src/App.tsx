import { useState } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { BottomNav } from './components/BottomNav';
import { Feed } from './pages/Feed';
import { Upload } from './pages/Upload';
import { Profile } from './pages/Profile';
import { VerifyEmail } from './pages/VerifyEmail';
import { Verifying } from './pages/Verifying';
import { ResetPassword } from './pages/ResetPassword';
import { Toaster } from './components/ui/sonner';
import { AuthForm } from './components/AuthForm';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('feed');
  const [completedVerifying, setCompletedVerifying] = useState(false);
  const { user, loading, isEmailVerified, showVerifying } = useAuth();

  const hash = window.location.hash;
  const isPasswordReset = hash && (hash.includes('type=recovery') || window.location.pathname === '/reset-password');

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
  };

  const renderPage = () => {
    switch (currentPage) {
      case 'feed':
        return <Feed />;
      case 'upload':
        return <Upload onNavigate={handleNavigate} />;
      case 'profile':
        return <Profile />;
      default:
        return <Feed />;
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
    <>
      {renderPage()}
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />
    </>
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
