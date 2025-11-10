import { useState, useEffect } from 'react';
import { useRecipes } from '../context/RecipeContext';
import { Recipe, MealPlanEntry } from '../types/recipe';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Grip,
  X,
  Clock,
  Users,
  Layers,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { consolidateShoppingListItems } from '../services/shoppingListService.local';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = typeof MEAL_TYPES[number];

interface DraggedRecipe {
  recipe: Recipe;
  type: 'recipe';
}

interface MealPlanWithRecipe extends MealPlanEntry {
  recipe?: Recipe;
}

export function MealPlanner() {
  const { state, dispatch } = useRecipes();
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeksToShow, setWeeksToShow] = useState<1 | 4>(1);
  const [draggedItem, setDraggedItem] = useState<DraggedRecipe | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlanWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      // If no userId, still load meal plans
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMealPlans();
  }, [userId, currentWeekStart, weeksToShow, state.mealPlan, state.savedRecipes]);

  const loadMealPlans = async () => {
    setLoading(true);
    try {
      const plansWithRecipes: MealPlanWithRecipe[] = state.mealPlan.map(plan => {
        const recipe = state.savedRecipes.find(r => r.id === plan.recipeId);
        return {
          ...plan,
          recipe
        };
      });

      setMealPlans(plansWithRecipes);
    } catch (error) {
      console.error('Error loading meal plans:', error);
      toast.error('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const syncShoppingList = async () => {
    try {
      const mealPlansWithServings = state.mealPlan.map(plan => ({
        recipeId: plan.recipeId,
        servings: plan.servings || 2,
      }));

      const items = consolidateShoppingListItems(mealPlansWithServings, state.savedRecipes);

      dispatch({
        type: 'UPDATE_SHOPPING_LIST',
        payload: items
      });

      toast.success('Shopping list updated!');
    } catch (error) {
      console.error('Error syncing shopping list:', error);
      toast.error('Failed to update shopping list');
    }
  };

  const getDaysToShow = () => {
    const days = [];
    for (let i = 0; i < weeksToShow * 7; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const getMealForSlot = (date: Date, mealType: MealType): MealPlanWithRecipe | undefined => {
    return mealPlans.find(
      plan => isSameDay(new Date(plan.date), date) && plan.mealType === mealType
    );
  };

  const handleDragStart = (recipe: Recipe) => {
    setDraggedItem({ recipe, type: 'recipe' });
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const handleDrop = async (date: Date, mealType: MealType, recipeOverride?: Recipe) => {
    const recipeToAdd = recipeOverride || draggedItem?.recipe;
    if (!recipeToAdd || !userId) return;

    const dateString = format(date, 'yyyy-MM-dd');
    const existingMeal = getMealForSlot(date, mealType);

    try {
      if (existingMeal) {
        dispatch({
          type: 'UPDATE_MEAL_PLAN',
          payload: {
            id: existingMeal.id,
            recipeId: recipeToAdd.id,
            date: dateString,
            mealType: mealType,
            servings: recipeToAdd.servings
          }
        });
      } else {
        dispatch({
          type: 'ADD_MEAL_PLAN',
          payload: {
            id: `meal-${Date.now()}`,
            recipeId: recipeToAdd.id,
            date: dateString,
            mealType: mealType,
            servings: recipeToAdd.servings
          }
        });
      }

      if (!recipeOverride) {
        toast.success('Meal added to calendar');
      }
      await loadMealPlans();
      await syncShoppingList();
    } catch (error) {
      console.error('Error adding meal:', error);
      toast.error('Failed to add meal');
    }

    setDraggedItem(null);
  };

  const handleRemoveMeal = async (mealPlanId: string) => {
    try {
      dispatch({
        type: 'REMOVE_MEAL_PLAN',
        payload: mealPlanId
      });

      toast.success('Meal removed');
      await loadMealPlans();
      await syncShoppingList();
    } catch (error) {
      console.error('Error removing meal:', error);
      toast.error('Failed to remove meal');
    }
  };

  const handlePreviousWeek = () => {
    setCurrentWeekStart(prev => subWeeks(prev, weeksToShow));
  };

  const handleNextWeek = () => {
    setCurrentWeekStart(prev => addWeeks(prev, weeksToShow));
  };

  const handleToday = () => {
    setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }));
  };

  const suggestRecipe = async (date: Date, mealType: MealType) => {
    if (state.savedRecipes.length === 0) {
      toast.error('Please save some recipes first to get suggestions');
      return;
    }

    const plannedRecipeIds = mealPlans.map(plan => plan.recipeId);
    const { userPreferences } = state;

    let availableRecipes = state.savedRecipes.filter(recipe => {
      const isAppropriateForMeal = recipe.mealType.includes(mealType) || recipe.mealType.length === 0;
      return isAppropriateForMeal;
    });

    if (availableRecipes.length === 0) {
      availableRecipes = state.savedRecipes;
    }

    const scoredRecipes = availableRecipes.map(recipe => {
      let score = 0;

      const timesUsedRecently = plannedRecipeIds.filter(id => id === recipe.id).length;
      score -= timesUsedRecently * 50;

      if (userPreferences.favoriteCuisines.includes(recipe.cuisineType)) {
        score += 30;
      }

      const matchesDietaryPrefs = userPreferences.dietaryPreferences.every(pref => {
        return recipe.dietaryTags.some(tag =>
          tag.toLowerCase().includes(pref.toLowerCase())
        );
      });
      if (matchesDietaryPrefs) {
        score += 40;
      }

      const hasDislikedIngredients = recipe.ingredients.some(ingredient =>
        userPreferences.dislikedIngredients.some(disliked =>
          ingredient.name.toLowerCase().includes(disliked.toLowerCase())
        )
      );
      if (hasDislikedIngredients) {
        score -= 100;
      }

      const skillMap: Record<string, string> = {
        'Beginner': 'Easy',
        'Intermediate': 'Medium',
        'Advanced': 'Hard'
      };

      if (recipe.difficulty === skillMap[userPreferences.cookingSkillLevel]) {
        score += 20;
      } else if (
        (userPreferences.cookingSkillLevel === 'Advanced' && recipe.difficulty === 'Medium') ||
        (userPreferences.cookingSkillLevel === 'Intermediate' && recipe.difficulty === 'Easy')
      ) {
        score += 10;
      }

      const totalTime = recipe.prepTime + recipe.cookTime;
      if (mealType === 'Breakfast' && totalTime <= 30) {
        score += 25;
      } else if (mealType === 'Lunch' && totalTime <= 45) {
        score += 15;
      } else if (mealType === 'Dinner' && totalTime <= 60) {
        score += 10;
      } else if (mealType === 'Snack' && totalTime <= 20) {
        score += 30;
      }

      score += Math.random() * 20;

      return { recipe, score };
    });

    scoredRecipes.sort((a, b) => b.score - a.score);
    const suggestedRecipe = scoredRecipes[0].recipe;

    await handleDrop(date, mealType, suggestedRecipe);
    toast.success(`Suggested: ${suggestedRecipe.title}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      <div className="flex h-screen">
        <div className="w-80 border-r border-slate-200 bg-white shadow-sm flex flex-col">
          <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-cyan-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">My Recipes</h2>
            </div>
            <p className="text-sm text-slate-600">
              Drag recipes to your calendar
            </p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-3">
              {state.savedRecipes.length === 0 ? (
                <div className="text-center py-8 px-4">
                  <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-sm text-slate-500">
                    No saved recipes yet. Save recipes from the Discover page to add them to your meal plan.
                  </p>
                </div>
              ) : (
                state.savedRecipes.map(recipe => (
                  <div
                    key={recipe.id}
                    draggable
                    onDragStart={() => handleDragStart(recipe)}
                    onDragEnd={handleDragEnd}
                    className="group cursor-move"
                  >
                    <Card className="overflow-hidden hover:shadow-md transition-all border-slate-200 hover:border-blue-300 bg-white">
                      <CardContent className="p-0">
                        <div className="flex gap-3 p-3">
                          {recipe.imageUrl && (
                            <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 bg-slate-100">
                              <img
                                src={recipe.imageUrl?.includes('instagram.com') || recipe.imageUrl?.includes('cdninstagram.com')
                                  ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(recipe.imageUrl.replace(/&amp;/g, '&'))}`
                                  : recipe.imageUrl}
                                alt={recipe.title}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2 mb-1">
                              <h3 className="font-semibold text-sm text-slate-900 line-clamp-2">
                                {recipe.title}
                              </h3>
                              <Grip className="w-4 h-4 text-slate-400 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span>{recipe.prepTime + recipe.cookTime}m</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                <span>{recipe.servings}</span>
                              </div>
                            </div>
                            {recipe.mealType.length > 0 && (
                              <div className="flex gap-1 mt-2 flex-wrap">
                                {recipe.mealType.slice(0, 2).map(type => (
                                  <Badge key={type} variant="secondary" className="text-xs">
                                    {type}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-slate-200 bg-white shadow-sm">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-slate-900">Meal Planner</h1>
                    <p className="text-slate-600">Plan your weekly meals</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 bg-slate-100 rounded-lg p-1">
                    <Button
                      variant={weeksToShow === 1 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWeeksToShow(1)}
                      className="h-8"
                    >
                      1 Week
                    </Button>
                    <Button
                      variant={weeksToShow === 4 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setWeeksToShow(4)}
                      className="h-8"
                    >
                      4 Weeks
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleNextWeek}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                <h2 className="text-lg font-semibold text-slate-700">
                  {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, weeksToShow * 7 - 1), 'MMM d, yyyy')}
                </h2>
              </div>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="grid gap-4" style={{
                  gridTemplateColumns: `repeat(${weeksToShow === 1 ? 7 : 7}, minmax(0, 1fr))`
                }}>
                  {getDaysToShow().map((day, dayIndex) => (
                    <div key={dayIndex} className="space-y-2">
                      <div className="text-center pb-2 border-b-2 border-slate-200">
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                          {format(day, 'EEE')}
                        </div>
                        <div className={`text-lg font-bold ${
                          isSameDay(day, new Date())
                            ? 'text-blue-600'
                            : 'text-slate-900'
                        }`}>
                          {format(day, 'd')}
                        </div>
                      </div>

                      <div className="space-y-2">
                        {MEAL_TYPES.map(mealType => {
                          const meal = getMealForSlot(day, mealType);

                          return (
                            <div
                              key={`${dayIndex}-${mealType}`}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={() => handleDrop(day, mealType)}
                              className={`
                                min-h-[100px] rounded-lg border-2 border-dashed p-2
                                transition-all relative group
                                ${draggedItem
                                  ? 'border-blue-400 bg-blue-50/50 hover:bg-blue-50'
                                  : 'border-slate-200 bg-slate-50/50'
                                }
                                ${meal ? 'border-solid bg-white hover:shadow-md' : ''}
                              `}
                            >
                              {meal && meal.recipe ? (
                                <div className="relative">
                                  <button
                                    onClick={() => handleRemoveMeal(meal.id)}
                                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 shadow-sm"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>

                                  {meal.recipe.imageUrl && (
                                    <div className="w-full h-16 rounded-md overflow-hidden mb-2 bg-slate-100">
                                      <img
                                        src={meal.recipe.imageUrl?.includes('instagram.com') || meal.recipe.imageUrl?.includes('cdninstagram.com')
                                          ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(meal.recipe.imageUrl.replace(/&amp;/g, '&'))}`
                                          : meal.recipe.imageUrl}
                                        alt={meal.recipe.title}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  )}

                                  <div className="text-xs">
                                    <div className="font-medium text-slate-500 mb-1">
                                      {mealType}
                                    </div>
                                    <div className="font-semibold text-slate-900 line-clamp-2 text-xs">
                                      {meal.recipe.title}
                                    </div>
                                    <div className="flex items-center gap-2 mt-1 text-slate-500">
                                      <div className="flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{meal.recipe.prepTime + meal.recipe.cookTime}m</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-full text-center gap-2">
                                  <div className="text-xs font-medium text-slate-400 mb-1">
                                    {mealType}
                                  </div>
                                  <div className="text-xs text-slate-400">
                                    Drop recipe here
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => suggestRecipe(day, mealType)}
                                    className="h-7 text-xs px-2 gap-1 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Suggest
                                  </Button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
