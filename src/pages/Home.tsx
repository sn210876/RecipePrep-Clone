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
        <div className="text-center max-w-4xl mx-auto">
          {/* Hero Header */}
          <div className="mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg mb-6">
<div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg mb-6">
  <span className="text-4xl">Cooking Pot</span>
</div>            </div>
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 mb-3">
              Recipe Prep
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed">
              Automate your <span className="font-semibold text-orange-700">Recipe</span>,{' '}
              <span className="font-semibold text-amber-700">Shopping List</span>, and{' '}
              <span className="font-semibold text-orange-600">Cooking</span> all in one place.
            </p>
          </div>

          {/* Centered Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              onClick={() => onNavigate('discover')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-16 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300Suggest gap-3"
            >
              <Search className="w-5 h-5" />
              <span>Discover</span>
            </Button>
            <Button
              onClick={() => onNavigate('my-recipes')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-16 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <BookOpen className="w-5 h-5" />
              <span>My Recipes</span>
            </Button>
            <Button
              onClick={() => onNavigate('add-recipe')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-16 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <Plus className="w-5 h-5" />
              <span>Add Recipe</span>
            </Button>
          </div>

          {/* "Did you see..." Section */}
          <div className="mt-8 pt-8 border-t border-orange-200/50">
            <p className="text-base sm:text-lg text-gray-600 mb-6 max-w-3xl mx-auto leading-relaxed">
              Did you see an online recipe and thought <span className="font-bold text-red-600">"I wanna make that"</span>? 
              Then simply <span className="font-semibold text-orange-600">PASTE a link</span> in the 
              <span className="font-bold text-red-600">"Add Recipe"</span> button above to extract it instantly. 
              Then manage your collection, plan meals, and <span className="font-bold text-red-600">COOK!</span>
            </p>

            {/* Feature Dots - FIXED: Text inside <div> */}
            <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-600">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Meal Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Smart Shopping Lists</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-600" />
                <span>Hands-Free Cooking</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}