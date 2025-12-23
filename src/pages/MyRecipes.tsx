import { useState, useMemo } from 'react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeCard } from '../components/RecipeCard';
import { BookmarkCheck, ChefHat, Search } from 'lucide-react';
import { CookMode } from '../components/CookMode';
import { Recipe } from '../types/recipe';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

export function MyRecipes() {
  const { state } = useRecipes();
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<string>('all');

  const filteredRecipes = useMemo(() => {
    let filtered = state.savedRecipes;

    if (selectedRecipe !== 'all') {
      filtered = filtered.filter(recipe => recipe.id === selectedRecipe);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(recipe =>
        recipe.title.toLowerCase().includes(query) ||
        recipe.cuisineType?.toLowerCase().includes(query) ||
        recipe.tags?.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return filtered;
  }, [state.savedRecipes, searchQuery, selectedRecipe]);

  if (state.savedRecipes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pt-safe pb-safe">
        {/* Mobile-optimized empty state */}
        <div className="max-w-7xl mx-auto px-4 pt-2 pb-28 sm:pb-24">
          {/* Header - responsive sizing */}
          <div className="mb-8 sm:mb-6">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1 sm:mb-2">
              My Recipes
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Your saved recipes collection
            </p>
          </div>
          
          {/* Empty state - centered and responsive */}
          <div className="flex flex-col items-center justify-center py-16 sm:py-12 md:py-20 px-4">
            {/* Icon container - responsive sizing */}
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-8 sm:p-6 md:p-8 rounded-full mb-6 shadow-lg">
              <BookmarkCheck className="w-20 h-20 sm:w-16 sm:h-16 md:w-20 md:h-20 text-emerald-600" />
            </div>
            
            {/* Heading - responsive text */}
            <h2 className="text-xl sm:text-xl md:text-2xl font-bold text-gray-900 mb-3 text-center px-4 leading-tight">
              No Saved Recipes Yet
            </h2>
            
            {/* Description - responsive and readable */}
            <p className="text-gray-600 text-center max-w-md mb-6 px-4 text-base sm:text-sm md:text-base leading-relaxed">
              Start building your recipe collection by exploring and saving your
              favorite recipes from the Discover page.
            </p>

            {/* Optional: Add a call-to-action button */}
            <div className="mt-2">
              <div className="inline-flex items-center gap-2 text-sm text-emerald-600 font-medium bg-emerald-50 px-4 py-2 rounded-full">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Explore recipes to get started</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 pt-safe pb-safe">
      {/* Mobile-optimized header with proper spacing */}
      <div className="max-w-7xl mx-auto px-4 pt-2 pb-28 sm:pb-24">
       {/* Header section - centered layout */}
        <div className="mb-6 sm:mb-6 flex flex-col items-center text-center gap-2">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            My Recipes
          </h1>
          <p className="text-sm sm:text-base md:text-xl text-gray-600 flex items-center gap-2">
            <span className="font-semibold text-emerald-600">
              {filteredRecipes.length}
            </span>
            <span>
              {selectedRecipe !== 'all' || searchQuery ? 'matching' : 'saved'} recipe{filteredRecipes.length !== 1 ? 's' : ''}
            </span>
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="mb-6 space-y-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search recipes by name, cuisine, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 w-full h-12 text-base"
            />
          </div>

          {/* Recipe Dropdown Filter */}
          <div className="flex items-center gap-2">
            <Select value={selectedRecipe} onValueChange={setSelectedRecipe}>
              <SelectTrigger className="w-full sm:w-64 h-12">
                <SelectValue placeholder="Filter by recipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipes ({state.savedRecipes.length})</SelectItem>
                {state.savedRecipes.map((recipe) => (
                  <SelectItem key={recipe.id} value={recipe.id}>
                    {recipe.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Results count for filtered view */}
        {(searchQuery || selectedRecipe !== 'all') && (
          <div className="mb-4 text-sm text-gray-600">
            {filteredRecipes.length === 0 ? (
              <p>No recipes found matching your criteria.</p>
            ) : (
              <p>Showing {filteredRecipes.length} of {state.savedRecipes.length} recipes</p>
            )}
          </div>
        )}

        {/* Mobile-responsive grid: 2 per row on mobile, 4 per row on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              showReviewButton={true}
              onCook={(recipeId) => {
                const recipe = state.savedRecipes.find(r => r.id === recipeId);
                if (recipe) {
                  setCookingRecipe(recipe);
                }
              }}
            />
          ))}
        </div>

        {/* Optional: Scroll indicator for long lists on mobile */}
        {state.savedRecipes.length > 6 && (
          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 text-xs text-gray-400">
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
              <div className="w-1.5 h-1.5 rounded-full bg-gray-300"></div>
            </div>
          </div>
        )}
      </div>

      {/* Cook Mode modal - already mobile-friendly but ensure proper z-index */}
      {cookingRecipe && (
        <div className="fixed inset-0 z-50">
          <CookMode
            recipe={cookingRecipe}
            onClose={() => setCookingRecipe(null)}
          />
        </div>
      )}
    </div>
  );
}