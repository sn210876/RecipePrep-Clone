import { Button } from '../components/ui/button';
import { Search, BookOpen, Plus } from 'lucide-react';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-25 to-amber-50 overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 h-screen flex flex-col items-center justify-center px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg mb-6">
              <span className="text-4xl">🍳</span>
            </div>
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-4">
            Welcome to <span className="bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">Recipe Prep</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-700 mb-12 leading-relaxed">
            Automate your <span className="font-semibold text-orange-700">Recipe</span>, <span className="font-semibold text-amber-700">Shopping List</span>, and <span className="font-semibold text-orange-600">Cooking</span> all in one place.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-16">
            <Button
              onClick={() => onNavigate('discover')}
              size="lg"
              className="h-16 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <Search className="w-5 h-5" />
              <span>Discover</span>
            </Button>

            <Button
              onClick={() => onNavigate('my-recipes')}
              size="lg"
              className="h-16 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <BookOpen className="w-5 h-5" />
              <span>My Recipes</span>
            </Button>

            <Button
              onClick={() => onNavigate('add-recipe')}
              size="lg"
              className="h-16 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <Plus className="w-5 h-5" />
              <span>Add Recipe</span>
            </Button>
          </div>

          <div className="mt-16 pt-12 border-t border-orange-200/50">
            <p className="text-sm text-gray-600 mb-8">
              Did you see something online recipe and thought "I wanna make that", then simply PASTE a link in "Add Recipe" button above to recipe extraction. Then manage your collection, plan meals, and COOK!
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                Meal Planning
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                Smart Shopping Lists
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-600" />
                Hands-Free Cooking
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
