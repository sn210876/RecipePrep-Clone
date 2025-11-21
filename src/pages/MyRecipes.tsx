import { useState } from 'react';
import { useRecipes } from '../context/RecipeContext';
import { RecipeCard } from '../components/RecipeCard';
import { BookmarkCheck, ChefHat } from 'lucide-react';
import { CookMode } from '../components/CookMode';
import { Recipe } from '../types/recipe';

export function MyRecipes() {
  const { state } = useRecipes();
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);

  if (state.savedRecipes.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {/* Mobile-optimized empty state */}
        <div className="max-w-7xl mx-auto px-4 py-8 pb-24">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">My Recipes</h1>
            <p className="text-lg md:text-xl text-gray-600">Your saved recipes collection</p>
          </div>
          
          <div className="flex flex-col items-center justify-center py-12 md:py-20">
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-6 md:p-8 rounded-full mb-6">
              <BookmarkCheck className="w-16 h-16 md:w-20 md:h-20 text-emerald-600" />
            </div>
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2 text-center px-4">
              No Saved Recipes Yet
            </h2>
            <p className="text-gray-600 text-center max-w-md mb-6 px-4 text-sm md:text-base">
              Start building your recipe collection by exploring and saving your
              favorite recipes from the Discover page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Mobile-optimized header with proper spacing */}
      <div className="max-w-7xl mx-auto px-4 py-6 pb-24">
        <div className="mb-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-1 md:mb-2 truncate">
              My Recipes
            </h1>
            <p className="text-base md:text-xl text-gray-600">
              {state.savedRecipes.length} saved recipe
              {state.savedRecipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-3 md:p-4 rounded-full shrink-0">
            <ChefHat className="w-6 h-6 md:w-8 md:h-8 text-emerald-600" />
          </div>
        </div>

        {/* Mobile-responsive grid: 1 column on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {state.savedRecipes.map((recipe) => (
            <div key={recipe.id} className="flex">
              <RecipeCard
                recipe={recipe}
                showReviewButton={true}
                onCook={(recipeId) => {
                  const recipe = state.savedRecipes.find(r => r.id === recipeId);
                  if (recipe) {
                    setCookingRecipe(recipe);
                  }
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Cook Mode modal */}
      {cookingRecipe && (
        <CookMode
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
        />
      )}
    </div>
  );
}