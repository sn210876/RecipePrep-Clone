import { Button } from '../components/ui/button';
import { BookOpen, Plus, UtensilsCrossed } from 'lucide-react';
import { TutorialVideo } from '../components/TutorialVideo';

interface HomeProps {
  onNavigate: (page: string) => void;
}

export function Home({ onNavigate }: HomeProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-25 to-amber-50 overflow-hidden">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-transparent rounded-full blur-3xl" />

      <div
        className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-8 pb-safe overflow-y-auto"
        style={{
          paddingTop: 'max(2rem, env(safe-area-inset-top))',
          paddingBottom: 'max(2rem, env(safe-area-inset-bottom))'
        }}
      >
        <div className="text-center max-w-4xl mx-auto w-full space-y-8">
          {/* Welcome Video */}
          <div className="max-w-3xl mx-auto">
            <TutorialVideo
              src="https://vohvdarghgqskzqjclux.supabase.co/storage/v1/object/public/posts/videos/How%20To%20Use%20Mealscrape.mp4"
                width="30%"

              title="Welcome to Meal Scrape - Quick Start Guide"
            />
          </div>

          {/* Hero Header */}
          <div className="mb-8 sm:mb-12">
            <div className="inline-flex items-center justify-center w-32 h-32 sm:w-44 sm:h-44 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg mb-4 sm:mb-6 p-0">
              <img
                src="/favicon.ico.jpg"
                alt="Meal Scrape Logo"
                className="w-48 h-48 sm:w-64 sm:h-64 object-contain"
                loading="lazy"
              />
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-gray-900 mb-3 px-4">
              Meal Scrape
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-700 max-w-2xl mx-auto leading-relaxed px-4">
              Automate your <span className="font-semibold text-orange-700">Recipe</span>,{' '}
              <span className="font-semibold text-amber-700">Grocery List</span>, and{' '}
              <span className="font-semibold text-orange-600">Cooking</span> all in one place.
            </p>
          </div>

          {/* Centered Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-12 sm:mb-16 px-4">
            <Button
              onClick={() => onNavigate('discover')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-14 sm:h-16 text-base font-semibold bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <UtensilsCrossed className="w-5 h-5" />
              <span>Social Feed</span>
            </Button>
            <Button
              onClick={() => onNavigate('my-recipes')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-14 sm:h-16 text-base font-semibold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <BookOpen className="w-5 h-5" />
              <span>My Recipes</span>
            </Button>
            <Button
              onClick={() => onNavigate('add-recipe')}
              size="lg"
              className="w-full sm:w-auto min-w-48 h-14 sm:h-16 text-base font-semibold bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-700 hover:to-amber-600 text-white shadow-lg hover:shadow-xl transition-all duration-300 gap-3"
            >
              <Plus className="w-5 h-5" />
              <span>Add Recipe</span>
            </Button>
          </div>

          {/* Shortened & Readable Call-to-Action */}
          <div className="mt-6 sm:mt-8 pt-6 sm:pt-8 border-t border-orange-200/50 px-4">
            <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
              See a recipe online? <span className="font-bold text-red-600">"I want that!"</span><br />
              Just <span className="font-semibold text-orange-600">paste the link</span> in <span className="font-bold text-red-600">"Add Recipe"</span> — done.<br />
              Then plan, shop, and <span className="font-bold text-red-600">COOK!</span>
            </p>

            {/* Feature Dots */}
            <div className="flex flex-wrap justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-600 mt-4 sm:mt-6">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>Meal Planning</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Smart Grocery Lists</span>
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