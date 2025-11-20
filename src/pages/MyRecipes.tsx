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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Recipes</h1>
            <p className="text-xl text-gray-600">Your saved recipes collection</p>
          </div>

          <div className="flex flex-col items-center justify-center py-20">
            <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-8 rounded-full mb-6">
              <BookmarkCheck className="w-20 h-20 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Saved Recipes Yet
            </h2>
            <p className="text-gray-600 text-center max-w-md mb-6">
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">My Recipes</h1>
            <p className="text-xl text-gray-600">
              {state.savedRecipes.length} saved recipe
              {state.savedRecipes.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="bg-gradient-to-br from-emerald-100 to-teal-100 p-4 rounded-full">
            <ChefHat className="w-8 h-8 text-emerald-600" />
          </div>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      {cookingRecipe && (
        <CookMode
          recipe={cookingRecipe}
          onClose={() => setCookingRecipe(null)}
        />
      )}
    </div>
  );
}
