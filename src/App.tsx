import { useState } from 'react';
import { RecipeProvider } from './context/RecipeContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Discover } from './pages/Discover';
import { MyRecipes } from './pages/MyRecipes';
import { AddRecipe } from './pages/AddRecipe';
import { MealPlanner } from './pages/MealPlanner';
import { ShoppingList } from './pages/ShoppingList';
import { Settings } from './pages/Settings';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const [currentPage, setCurrentPage] = useState('home');
  const [discoverKey, setDiscoverKey] = useState(0);

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
      default:
        return <Home onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <RecipeProvider>
      <AppContent />
      <Toaster />
    </RecipeProvider>
  );
}

export default App;
