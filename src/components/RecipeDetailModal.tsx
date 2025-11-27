import { useState, useEffect } from 'react';
import { Recipe } from '../types/recipe';
import { useRecipes } from '../context/RecipeContext';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  Clock,
  Users,
  ChefHat,
  Bookmark,
  Trash2,
  Calendar,
  ShoppingCart,
  ExternalLink,
  X,
  Timer,
  UtensilsCrossed,
  PlayCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import { CookMode } from './CookMode';

interface RecipeDetailModalProps {
  recipe: Recipe;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecipeDetailModal({
  recipe,
  open,
  onOpenChange,
}: RecipeDetailModalProps) {
  const { state, dispatch } = useRecipes();
  const [cookMode, setCookMode] = useState(false);

  const isSaved = state.savedRecipes.some((r) => r.id === recipe.id);
  const hasSteps = recipe.steps && recipe.steps.length > 0;

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (cookMode && hasSteps) {
    return <CookMode recipe={recipe} onClose={() => setCookMode(false)} />;
  }

  const handleSaveRecipe = () => {
    if (isSaved) {
      dispatch({ type: 'REMOVE_RECIPE', payload: recipe.id });
      toast.success('Recipe removed from your collection');
    } else {
      dispatch({ type: 'SAVE_RECIPE', payload: recipe });
      toast.success('Recipe saved to your collection');
    }
  };

  const handleAddToGroceryList = () => {
    recipe.ingredients.forEach((ingredient) => {
      const item = {
        id: `${recipe.id}-${ingredient.name}-${Date.now()}`,
        name: ingredient.name,
        quantity: parseFloat(ingredient.quantity) || 1,
        unit: ingredient.unit,
        categoryId: 'cat-7',
        checked: false,
        sourceRecipeIds: [recipe.id],
      };
      dispatch({ type: 'ADD_GROCERY_ITEM', payload: item });
    });
    toast.success('Ingredients added to grocery list');
  };

  const handleAddToMealPlan = () => {
    const mealPlanEntry = {
      id: `${recipe.id}-${Date.now()}`,
      recipeId: recipe.id,
      date: new Date().toISOString().split('T')[0],
      mealType: (recipe.mealType[0] as 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack') || 'Dinner',
      servings: recipe.servings,
    };
    dispatch({ type: 'ADD_MEAL_PLAN', payload: mealPlanEntry });
    toast.success('Recipe added to meal plan');
  };

  const handleDelete = () => {
    if (isSaved) {
      dispatch({ type: 'REMOVE_RECIPE', payload: recipe.id });
      toast.success('Recipe deleted');
      onOpenChange(false);
    }
  };

  const difficultyColors = {
    Easy: 'bg-orange-100 text-orange-700 border-orange-200',
    Medium: 'bg-amber-100 text-amber-700 border-amber-200',
    Hard: 'bg-red-100 text-red-700 border-red-200',
  };

  return (
    <>
      {/* Custom styles to control z-index of dialog components */}
      <style>
        {`
          [data-radix-dialog-overlay] {
            z-index: 9998 !important;
          }
          [data-radix-dialog-content] {
            z-index: 9999 !important;
          }
        `}
      </style>

      <Dialog open={open} onOpenChange={onOpenChange} modal={true}>
        <DialogContent className="max-w-4xl w-[85%] h-[85vh] p-0 gap-0 overflow-hidden rounded-xl border">
          <DialogTitle className="sr-only">{recipe.title}</DialogTitle>
          <div className="h-full overflow-y-auto overscroll-contain scroll-smooth">
            <div className="relative">
              {/* Close Button - Sticky Position with highest z-index */}
              <Button
                variant="ghost"
                size="icon"
                className="sticky top-2 right-2 float-right z-[10000] bg-white/95 hover:bg-white shadow-lg rounded-full min-h-[44px] min-w-[44px] touch-manipulation active:scale-95 cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChange(false);
                }}
              >
                <X className="w-5 h-5" />
              </Button>

              {/* Hero Image Section with Header */}
              <div className="relative w-full h-48 sm:h-56 bg-gray-100 mb-4">
                <img
                  src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
                    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
                    : recipe.imageUrl}
                  alt={recipe.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4 text-white z-10">
                  <h1 className="text-xl sm:text-2xl font-bold mb-2 leading-tight pr-12">{recipe.title}</h1>
                  <div className="flex flex-wrap gap-1 sm:gap-1.5">
                    <Badge className="bg-white/95 text-gray-900 hover:bg-white text-[10px] sm:text-xs px-2 py-0.5">
                      {recipe.cuisineType}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={`${difficultyColors[recipe.difficulty]} border text-[10px] sm:text-xs px-2 py-0.5`}
                    >
                      {recipe.difficulty}
                    </Badge>
                    {recipe.dietaryTags.slice(0, 2).map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="bg-white/90 text-gray-900 text-[10px] sm:text-xs px-2 py-0.5"
                      >
                        {tag}
                      </Badge>
                    ))}
                    {recipe.dietaryTags.length > 2 && (
                      <Badge variant="secondary" className="bg-white/90 text-gray-900 text-[10px] sm:text-xs px-2 py-0.5">
                        +{recipe.dietaryTags.length - 2}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-4 sm:p-6 pb-8 bg-white relative z-20">
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-3 gap-2 mb-4 sm:mb-6">
                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-gradient-to-br from-orange-50 to-amber-50 rounded-lg border border-orange-100">
                    <div className="bg-primary p-1.5 sm:p-2 rounded-lg">
                      <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Total</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {recipe.prepTime + recipe.cookTime}m
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg border border-blue-100">
                    <div className="bg-blue-500 p-1.5 sm:p-2 rounded-lg">
                      <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Serves</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {recipe.servings}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2.5 sm:p-3 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg border border-amber-100">
                    <div className="bg-amber-500 p-1.5 sm:p-2 rounded-lg">
                      <Timer className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" />
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] sm:text-xs text-gray-600 font-medium">Prep</p>
                      <p className="text-xs sm:text-sm font-bold text-gray-900">
                        {recipe.prepTime}m
                      </p>
                    </div>
                  </div>
                </div>

                {/* Start Cooking Button */}
                {hasSteps && (
                  <div className="mb-2 sm:mb-3">
                    <Button
                      size="lg"
                      onClick={() => setCookMode(true)}
                      className="w-full bg-accent hover:bg-accent/90 text-white text-sm sm:text-base min-h-[48px] sm:min-h-[52px] gap-2 shadow-lg hover:shadow-xl active:scale-[0.98] transition-all touch-manipulation"
                    >
                      <PlayCircle className="w-4 h-4 sm:w-5 sm:h-5" />
                      Start Cooking
                    </Button>
                    <p className="text-center text-[10px] sm:text-xs text-gray-600 mt-2 px-2">
                      Step-by-step mode with timers and ingredient checklist
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mb-2 sm:mb-3">
                  <Button
                    size="lg"
                    onClick={handleSaveRecipe}
                    className={`gap-2 min-h-[44px] sm:min-h-[48px] touch-manipulation active:scale-95 transition-all text-xs sm:text-sm font-semibold ${
                      isSaved
                        ? 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600'
                        : 'bg-orange-500 hover:bg-orange-600 text-white border-2 border-orange-600'
                    }`}
                  >
                    <Bookmark
                      className={`w-4 h-4 flex-shrink-0 ${isSaved ? 'fill-current' : ''}`}
                    />
                    <span className="truncate">{isSaved ? 'Saved' : 'Save'}</span>
                  </Button>

                  <Button
                    size="lg"
                    onClick={handleAddToMealPlan}
                    className="gap-2 bg-blue-500 hover:bg-blue-600 text-white border-2 border-blue-600 min-h-[44px] sm:min-h-[48px] touch-manipulation active:scale-95 transition-all text-xs sm:text-sm font-semibold"
                  >
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Meal Plan</span>
                  </Button>
                </div>

                {/* Secondary Actions */}
                <div className="flex gap-2 mb-3 sm:mb-4">
                  <Button
                    onClick={handleAddToGroceryList}
                    className="flex-1 gap-2 bg-green-500 hover:bg-green-600 text-white border-2 border-green-600 min-h-[40px] sm:min-h-[44px] touch-manipulation active:scale-95 transition-all text-xs sm:text-sm font-semibold"
                  >
                    <ShoppingCart className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">Grocery List</span>
                  </Button>

                  {isSaved && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDelete}
                      className="hover:bg-rose-50 hover:border-rose-500 hover:text-rose-700 min-h-[40px] min-w-[40px] sm:min-h-[44px] sm:min-w-[44px] touch-manipulation active:scale-95 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <Separator className="my-3 sm:my-4" />

                {/* Ingredients Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <UtensilsCrossed className="w-4 h-4 text-primary" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Ingredients
                    </h2>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <div className="space-y-2">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-2 sm:gap-3 p-2 rounded-lg hover:bg-orange-50 transition-colors min-h-[40px] sm:min-h-[44px]"
                        >
                          <div className="flex-1 text-xs sm:text-sm text-gray-700 leading-relaxed">
                            <span className="font-semibold text-primary">
                              {ingredient.quantity} {ingredient.unit}
                            </span>{' '}
                            {ingredient.name}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Instructions Section */}
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <ChefHat className="w-4 h-4 text-blue-600" />
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                      Instructions
                    </h2>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <ol className="space-y-3 sm:space-y-4">
                      {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-2 sm:gap-3">
                          <div className="flex-shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs sm:text-sm shadow-md">
                            {index + 1}
                          </div>
                          <p className="text-xs sm:text-sm text-gray-700 pt-0.5 leading-relaxed">
                            {instruction}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>

                {/* Notes Section */}
                {recipe.notes && (
                  <>
                    <Separator className="my-3 sm:my-4" />
                    <div className="mb-6">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900 mb-3">
                        Notes
                      </h2>
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 sm:p-4">
                        <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {recipe.notes}
                        </p>
                      </div>
                    </div>
                  </>
                )}

                {/* Source Link */}
                {recipe.sourceUrl && (
                  <>
                    <Separator className="my-3 sm:my-4" />
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50 border border-gray-200 rounded-lg p-3 sm:p-4">
                      <div>
                        <h3 className="font-semibold text-gray-900 text-xs sm:text-sm mb-1">
                          Recipe Source
                        </h3>
                        <p className="text-xs text-gray-600">
                          View original recipe
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2 hover:bg-white min-h-[40px] touch-manipulation active:scale-95 transition-all w-full sm:w-auto text-xs sm:text-sm"
                      >
                        <a
                          href={recipe.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Visit Source
                        </a>
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}