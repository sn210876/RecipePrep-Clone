import { useState } from 'react';
import { Recipe } from '../types/recipe';
import { useRecipes } from '../context/RecipeContext';
import { Dialog, DialogContent, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Clock,
  Users,
  ChefHat,
  Bookmark,
  Trash2,
  Edit,
  Calendar,
  GroceryCart,
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
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(
    new Set()
  );
  const [cookMode, setCookMode] = useState(false);

  const isSaved = state.savedRecipes.some((r) => r.id === recipe.id);
  const hasSteps = recipe.steps && recipe.steps.length > 0;

  if (cookMode && hasSteps) {
    return <CookMode recipe={recipe} onClose={() => setCookMode(false)} />;
  }

  const handleToggleIngredient = (index: number) => {
    setCheckedIngredients((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const handleSaveRecipe = () => {
    if (isSaved) {
      dispatch({ type: 'REMOVE_RECIPE', payload: recipe.id });
      toast.success('Recipe removed from your collection');
    } else {
      dispatch({ type: 'SAVE_RECIPE', payload: recipe });
      toast.success('Recipe saved to your collection');
    }
  };

  const handleAddToShoppingList = () => {
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
    toast.success('Ingredients added to shopping list');
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">{recipe.title}</DialogTitle>
        <ScrollArea className="h-[90vh]">
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-4 right-4 z-10 bg-white/90 hover:bg-white shadow-lg rounded-full"
              onClick={() => onOpenChange(false)}
            >
              <X className="w-5 h-5" />
            </Button>

            <div className="relative h-80 overflow-hidden">
              <img
                src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
                  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
                  : recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h1 className="text-4xl font-bold mb-3">{recipe.title}</h1>
                <div className="flex flex-wrap gap-2">
                  <Badge className="bg-white/90 text-gray-900 hover:bg-white">
                    {recipe.cuisineType}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`${difficultyColors[recipe.difficulty]} border`}
                  >
                    {recipe.difficulty}
                  </Badge>
                  {recipe.dietaryTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-white/80 text-gray-900"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8">
              <div className="grid grid-cols-3 gap-4 mb-8">
                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-xl border border-orange-100">
                  <div className="bg-primary p-3 rounded-lg">
                    <Clock className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">
                      Total Time
                    </p>
                    <p className="text-xl font-bold text-gray-900">
                      {recipe.prepTime + recipe.cookTime} min
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                  <div className="bg-blue-500 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Servings</p>
                    <p className="text-xl font-bold text-gray-900">
                      {recipe.servings}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-4 bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                  <div className="bg-amber-500 p-3 rounded-lg">
                    <Timer className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 font-medium">Prep Time</p>
                    <p className="text-xl font-bold text-gray-900">
                      {recipe.prepTime} min
                    </p>
                  </div>
                </div>
              </div>

              {hasSteps && (
                <div className="mb-8">
                  <Button
                    size="lg"
                    onClick={() => setCookMode(true)}
                    className="w-full bg-accent hover:bg-accent/90 text-white text-lg py-7 gap-3 shadow-lg hover:shadow-xl transition-all"
                  >
                    <PlayCircle className="w-7 h-7" />
                    Start Cooking
                  </Button>
                  <p className="text-center text-xs text-gray-600 mt-2">
                    Full-screen mode with ingredient checklist, timers, and step-by-step guidance
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-6 mb-8">
                <Button
                  size="lg"
                  variant={isSaved ? 'outline' : 'default'}
                  onClick={handleSaveRecipe}
                  className={
                    isSaved
                      ? 'gap-2 border-2 border-secondary text-secondary hover:bg-orange-50'
                      : 'gap-2 bg-secondary hover:bg-secondary/90 text-white'
                  }
                >
                  <Bookmark
                    className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`}
                  />
                  {isSaved ? 'Saved' : 'Save Recipe'}
                </Button>

                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleAddToMealPlan}
                  className="gap-2 border-2 hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700"
                >
                  <Calendar className="w-5 h-5" />
                  Add to Meal Plan
                </Button>
              </div>

              <div className="flex gap-3 mb-8">
                <Button
                  variant="outline"
                  onClick={handleAddToShoppingList}
                  className="flex-1 gap-2 hover:bg-orange-50 hover:border-primary hover:text-primary"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Add to Shopping List
                </Button>

                {isSaved && (
                  <>
                    <Button
                      variant="outline"
                      size="icon"
                      className="hover:bg-blue-50 hover:border-blue-500 hover:text-blue-700"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleDelete}
                      className="hover:bg-rose-50 hover:border-rose-500 hover:text-rose-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>

              <Separator className="my-8" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-orange-100 p-2 rounded-lg">
                      <UtensilsCrossed className="w-5 h-5 text-primary" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Ingredients
                    </h2>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                    <div className="space-y-3">
                      {recipe.ingredients.map((ingredient, index) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors"
                        >
                          <Checkbox
                            id={`ingredient-${index}`}
                            checked={checkedIngredients.has(index)}
                            onCheckedChange={() => handleToggleIngredient(index)}
                            className="mt-1"
                          />
                          <label
                            htmlFor={`ingredient-${index}`}
                            className={`flex-1 text-gray-700 cursor-pointer ${
                              checkedIngredients.has(index)
                                ? 'line-through text-gray-400'
                                : ''
                            }`}
                          >
                            <span className="font-semibold text-primary">
                              {ingredient.quantity} {ingredient.unit}
                            </span>{' '}
                            {ingredient.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <ChefHat className="w-5 h-5 text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      Instructions
                    </h2>
                  </div>
                  <div className="bg-gradient-to-br from-gray-50 to-white border border-gray-200 rounded-xl p-6">
                    <ol className="space-y-4">
                      {recipe.instructions.map((instruction, index) => (
                        <li key={index} className="flex gap-4">
                          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm shadow-md">
                            {index + 1}
                          </div>
                          <p className="text-gray-700 pt-0.5 leading-relaxed">
                            {instruction}
                          </p>
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>

              {recipe.notes && (
                <>
                  <Separator className="my-8" />
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">
                      Notes
                    </h2>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                      <p className="text-gray-700 leading-relaxed">
                        {recipe.notes}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {recipe.sourceUrl && (
                <>
                  <Separator className="my-8" />
                  <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-xl p-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-1">
                        Recipe Source
                      </h3>
                      <p className="text-sm text-gray-600">
                        View original recipe
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="gap-2 hover:bg-white"
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
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
