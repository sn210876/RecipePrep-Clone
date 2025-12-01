import { useState, useEffect, useMemo } from 'react';
import { useRecipes } from '../context/RecipeContext';
import { Recipe, MealPlanEntry } from '../types/recipe';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Users,
  Layers,
  Plus,
  Check,
  Trash2,
  ShoppingCart,
  Menu,
  X as XClose,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, startOfWeek, addDays, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { consolidateGroceryListItems } from '../services/groceryListService.local';
import { formatDateInTimezone, parseDateInTimezone } from '../lib/timezone';
import { supabase } from '../lib/supabase';
import { findProductsForIngredient, bulkAddToCart, addProductToCart, type AmazonProduct } from '../services/amazonProductService';
import { useAuth } from '../context/AuthContext';
import { getMealPlans, addMealPlan, updateMealPlan, deleteMealPlan, clearAllMealPlans } from '../services/mealPlannerService';
import { saveGroceryItems, getGroceryItems } from '../services/groceryListService';
import { useLanguage } from '../context/LanguageContext';

const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const;
type MealType = typeof MEAL_TYPES[number];

interface MealPlanWithRecipe extends MealPlanEntry {
  recipe?: Recipe;
}

interface MealPlannerProps {
  onNavigate?: (page: string) => void;
}

export function MealPlanner({ onNavigate }: MealPlannerProps = {}) {
  const { state, dispatch } = useRecipes();
  const { user } = useAuth();
  const { t } = useLanguage();

  const getMealTypeTranslation = (mealType: string): string => {
    const mealTypeMap: Record<string, string> = {
      'Breakfast': t.mealPlanner.breakfast,
      'Lunch': t.mealPlanner.lunch,
      'Dinner': t.mealPlanner.dinner,
      'Snack': t.mealPlanner.snack
    };
    return mealTypeMap[mealType] || mealType;
  };

  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [weeksToShow, setWeeksToShow] = useState<1 | 4>(1);
  const [mealPlans, setMealPlans] = useState<MealPlanWithRecipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');
  const [showAddMealDialog, setShowAddMealDialog] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedMealType, setSelectedMealType] = useState<MealType | ''>('');
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);
  const [slotDate, setSlotDate] = useState<Date | null>(null);
  const [slotMealType, setSlotMealType] = useState<MealType | null>(null);
  const [selectedRecipeForAssignment, setSelectedRecipeForAssignment] = useState<Recipe | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [selectedDateForView, setSelectedDateForView] = useState<Date>(new Date());

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) {
      setUserId(storedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.id) {
      loadMealPlans();
    }
  }, [user?.id, state.savedRecipes]);

  const recipesByCuisine = useMemo(() => {
    const grouped: Record<string, Recipe[]> = {};
    state.savedRecipes.forEach(recipe => {
      const cuisine = recipe.cuisineType || 'Other';
      if (!grouped[cuisine]) {
        grouped[cuisine] = [];
      }
      grouped[cuisine].push(recipe);
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([cuisine, recipes]) => ({ cuisine, recipes }));
  }, [state.savedRecipes]);

  const loadMealPlans = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const dbMealPlans = await getMealPlans(user.id);

      const plansWithRecipes: MealPlanWithRecipe[] = dbMealPlans.map(plan => {
        const recipe = state.savedRecipes.find(r => r.id === plan.recipeId);
        return { ...plan, recipe };
      });
      setMealPlans(plansWithRecipes);

      dispatch({ type: 'LOAD_STATE', payload: { ...state, mealPlan: dbMealPlans } });
    } catch (error) {
      console.error('Error loading meal plans:', error);
      toast.error('Failed to load meal plans');
    } finally {
      setLoading(false);
    }
  };

  const syncGroceryList = async () => {
    if (!user?.id) return;

    try {
      const mealPlansWithServings = mealPlans.map(plan => ({
        recipeId: plan.recipeId,
        servings: plan.servings || 2,
      }));
      const items = consolidateGroceryListItems(mealPlansWithServings, state.savedRecipes);

      await saveGroceryItems(user.id, items);
      dispatch({ type: 'UPDATE_GROCERY_LIST', payload: items });

      toast.success('Grocery list updated!');
    } catch (error) {
      console.error('Error syncing grocery list:', error);
      toast.error('Failed to update grocery list');
    }
  };

  const syncToCart = async () => {
    if (!user) {
      toast.error('Please sign in to sync to cart');
      return;
    }

    try {
      const mealPlansWithServings = state.mealPlan.map(plan => ({
        recipeId: plan.recipeId,
        servings: plan.servings || 2,
      }));
      const groceryItems = consolidateGroceryListItems(mealPlansWithServings, state.savedRecipes);

      if (groceryItems.length === 0) {
        toast.error('No ingredients to sync to cart');
        return;
      }

      toast.info('Finding matching products...');

      const itemsToAdd: Array<{
        product: AmazonProduct;
        quantity: string;
        unit: string;
        sourceRecipeId?: string;
      }> = [];

      for (const item of groceryItems) {
        const products = await findProductsForIngredient(item.name, 1);
        if (products.length > 0) {
          itemsToAdd.push({
            product: products[0],
            quantity: item.quantity?.toString() || '1',
            unit: item.unit || '',
            sourceRecipeId: item.sourceRecipeIds?.[0],
          });
        }
      }

      if (itemsToAdd.length === 0) {
        toast.info('No matching products found for your ingredients');
        return;
      }

      const addedItems = await bulkAddToCart(user.id, itemsToAdd);
      toast.success(`Added ${addedItems.length} product${addedItems.length !== 1 ? 's' : ''} to cart!`);

      if (onNavigate) {
        setTimeout(() => {
          toast.info('View your cart to see the added products');
        }, 1000);
      }
    } catch (error) {
      console.error('Error syncing to cart:', error);
      toast.error('Failed to sync to cart');
    }
  };

  const getMealForSlot = (date: Date, mealType: MealType): MealPlanWithRecipe | undefined => {
    return mealPlans.find(
      plan => isSameDay(parseDateInTimezone(plan.date), date) && plan.mealType === mealType
    );
  };

  const handleRecipeClick = (recipe: Recipe) => {
    if (selectedRecipeForAssignment?.id === recipe.id) {
      setSelectedRecipeForAssignment(null);
      toast.info('Recipe deselected');
    } else {
      setSelectedRecipeForAssignment(recipe);
      toast.success('Recipe selected - now click a meal slot to assign');
      if (isMobile) setSidebarOpen(false);
    }
  };

  const addMealToSlot = async (date: Date, mealType: MealType, recipe: Recipe) => {
    if (!user?.id) {
      toast.error('Please sign in to add meals');
      return;
    }

    const dateString = formatDateInTimezone(date, 'local');
    const existingMeal = getMealForSlot(date, mealType);

    try {
      const mealPlanData = {
        recipeId: recipe.id,
        date: dateString,
        mealType: mealType,
        servings: recipe.servings
      };

      if (existingMeal) {
        await updateMealPlan(user.id, { id: existingMeal.id, ...mealPlanData });
      } else {
        await addMealPlan(user.id, mealPlanData);
      }

      await loadMealPlans();
      await syncGroceryList();
    } catch (error) {
      console.error('Error adding meal:', error);
      throw error;
    }
  };

  const handleSlotClick = async (date: Date, mealType: MealType) => {
    const recipeToAdd = selectedRecipeForAssignment;
    if (!recipeToAdd) return;
    try {
      await addMealToSlot(date, mealType, recipeToAdd);
      toast.success('Meal assigned to calendar');
      setSelectedRecipeForAssignment(null);
    } catch (error) {
      toast.error('Failed to add meal');
    }
  };

  const handleRemoveMeal = async (mealPlanId: string) => {
    if (!user?.id) {
      toast.error('Please sign in to remove meals');
      return;
    }

    try {
      await deleteMealPlan(user.id, mealPlanId);
      toast.success('Meal removed');

      await loadMealPlans();
      await syncGroceryList();
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

  const handleOpenAddMealDialog = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowAddMealDialog(true);
  };

  const handleAddMealViaDialog = async () => {
    if (!selectedRecipe || !selectedDate || !selectedMealType) {
      toast.error('Please select both date and meal type');
      return;
    }
    const date = new Date(selectedDate);
    try {
      await addMealToSlot(date, selectedMealType as MealType, selectedRecipe);
      toast.success('Meal added to calendar');
      setShowAddMealDialog(false);
      setSelectedRecipe(null);
      setSelectedDate('');
      setSelectedMealType('');
    } catch (error) {
      toast.error('Failed to add meal');
    }
  };

  const handleOpenSlotDropdown = (date: Date, mealType: MealType) => {
    setSlotDate(date);
    setSlotMealType(mealType);
    setShowSlotDropdown(true);
  };

  const handleAddRecipeToSlot = async (recipeId: string) => {
    if (!slotDate || !slotMealType) return;
    const recipe = state.savedRecipes.find(r => r.id === recipeId);
    if (!recipe) return;
    try {
      await addMealToSlot(slotDate, slotMealType, recipe);
      toast.success('Meal added to calendar');
      setShowSlotDropdown(false);
      setSlotDate(null);
      setSlotMealType(null);
    } catch (error) {
      toast.error('Failed to add meal');
    }
  };

  const getDaysToShow = (): Date[] => {
    const days: Date[] = [];
    const totalDays = weeksToShow * 7;
    for (let i = 0; i < totalDays; i++) {
      days.push(addDays(currentWeekStart, i));
    }
    return days;
  };

  const handleToday = () => {
    const today = startOfWeek(new Date(), { weekStartsOn: 0 });
    setCurrentWeekStart(today);
    setSelectedDateForView(new Date());
  };

  const handleWeekToggle = (weeks: 1 | 4) => {
    setWeeksToShow(weeks);
    setSelectedDateForView(currentWeekStart);
  };

  const RecipesSidebar = () => (
    <div className={`${isMobile ? 'fixed inset-0 z-40 bg-black/50' : ''}`} onClick={() => isMobile && setSidebarOpen(false)}>
      <div className={`${isMobile ? 'fixed left-0 top-0 bottom-0 w-80 bg-white shadow-lg' : 'w-80 border-r border-slate-200 bg-white shadow-sm'} flex flex-col`} onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">My Recipes</h2>
              <p className="text-xs text-slate-600">Select & click slot</p>
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setSidebarOpen(false)} className="p-1">
              <XClose className="w-6 h-6" />
            </button>
          )}
        </div>

        <ScrollArea className="flex-1">
          <div className="p-4">
            {state.savedRecipes.length === 0 ? (
              <div className="text-center py-8 px-4">
                <Layers className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  No saved recipes yet. Save recipes from the Discover page.
                </p>
              </div>
            ) : (
              <Accordion type="multiple" defaultValue={recipesByCuisine.map(g => g.cuisine)} className="space-y-2">
                {recipesByCuisine.map(({ cuisine, recipes }) => (
                  <AccordionItem key={cuisine} value={cuisine} className="border rounded-lg px-4 bg-slate-50">
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center justify-between w-full pr-2">
                        <span className="font-semibold text-slate-900">{cuisine}</span>
                        <Badge variant="secondary">{recipes.length}</Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pb-3">
                      <div className="space-y-3 pt-2">
                        {recipes.map(recipe => (
                          <div key={recipe.id} className="group">
                            <Card className={`overflow-hidden hover:shadow-md transition-all duration-200 ${selectedRecipeForAssignment?.id === recipe.id ? 'border-2 border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-blue-300 bg-white'}`}>
                              <CardContent className="p-0">
                                <div onClick={() => handleRecipeClick(recipe)} className="flex gap-3 p-3 cursor-pointer">
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
                                      {selectedRecipeForAssignment?.id === recipe.id && (
                                        <Check className="w-4 h-4 text-orange-600 shrink-0" />
                                      )}
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
                                <div className="px-3 pb-3">
                                  <Button
                                    size="sm"
                                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleOpenAddMealDialog(recipe);
                                    }}
                                  >
                                    <Plus className="w-4 h-4 mr-1" />
                                    Add to Plan
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex flex-col md:flex-row">
      {/* Sidebar - hidden on mobile by default */}
      {!isMobile && <RecipesSidebar />}
      {isMobile && sidebarOpen && <RecipesSidebar />}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-slate-200 bg-white shadow-sm">
          <div className="p-4 md:p-6 space-y-4">
            {/* Title + Mobile Menu */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-blue-600 to-cyan-600 flex items-center justify-center">
                  <Calendar className="w-5 h-5 md:w-6 md:h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{t.mealPlanner.title}</h1>
                  <p className="text-xs md:text-sm text-slate-600">Select recipe, click slot</p>
                </div>
              </div>
              {isMobile && (
                <button
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="flex items-center gap-2 px-3 py-2 border-2 border-green-500 text-green-700 hover:border-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Menu className="w-5 h-5" />
                  <span className="text-sm font-medium">Add by Recipe</span>
                </button>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                <Button
                  onClick={() => onNavigate?.('grocery-list')}
                  className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white gap-2 text-xs md:text-sm"
                  size="sm"
                >
                  <ShoppingCart className="w-4 h-4" />
                  See Grocery List
                </Button>

                <Button
                  onClick={syncToCart}
                  className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white gap-2 text-xs md:text-sm"
                  size="sm"
                  disabled={state.mealPlan.length === 0}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Sync to Cart
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    if (!user?.id) {
                      toast.error('You must be logged in');
                      return;
                    }
                    if (confirm('Clear all meal plans?')) {
                      try {
                        await clearAllMealPlans(user.id);
                        dispatch({ type: 'CLEAR_MEAL_PLAN' });
                        setMealPlans([]);
                        toast.success('All meals cleared');
                      } catch (error) {
                        console.error('Error clearing meal plans:', error);
                        toast.error('Failed to clear meal plans');
                      }
                    }
                  }}
                  className="gap-2 text-xs md:text-sm"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear
                </Button>

                {/* Only show week toggle on desktop */}
                {!isMobile && (
                  <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
                    <Button
                      variant={weeksToShow === 1 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleWeekToggle(1)}
                      className="h-8 text-xs"
                    >
                      1W
                    </Button>
                    <Button
                      variant={weeksToShow === 4 ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => handleWeekToggle(4)}
                      className="h-8 text-xs"
                    >
                      4W
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Week Navigation */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="h-8 w-8 p-0">
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs px-2">
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-8 w-8 p-0">
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <h2 className="text-sm md:text-lg font-semibold text-slate-700 whitespace-nowrap">
                {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, weeksToShow * 7 - 1), 'MMM d')}
              </h2>
            </div>
          </div>
        </div>

        {/* Calendar - Mobile vs Desktop View */}
        <ScrollArea className="flex-1">
          <div className="p-4 md:p-6 pb-32 md:pb-6">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : isMobile ? (
              // MOBILE VIEW - Day Picker + Single Day List
              <div className="space-y-4">
                {/* Week Navigation for Mobile */}
                <div className="flex items-center justify-between gap-2 -mx-4 px-4">
                  <Button variant="outline" size="sm" onClick={handlePreviousWeek} className="h-8">
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium text-slate-600 whitespace-nowrap">
                    {format(currentWeekStart, 'MMM d')} - {format(addDays(currentWeekStart, 6), 'MMM d')}
                  </span>
                  <Button variant="outline" size="sm" onClick={handleNextWeek} className="h-8">
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>

                {/* Day Selector Carousel - Always 7 days on mobile */}
                <div className="overflow-x-auto -mx-4 px-4">
                  <div className="flex gap-2 pb-2">
                    {Array.from({ length: 7 }).map((_, i) => {
                      const day = addDays(currentWeekStart, i);
                      return (
                        <button
                          key={day.toISOString()}
                          onClick={() => setSelectedDateForView(day)}
                          className={`flex-shrink-0 rounded-lg p-3 transition-all ${
                            isSameDay(day, selectedDateForView)
                              ? 'bg-blue-600 text-white shadow-lg'
                              : isSameDay(day, new Date())
                              ? 'bg-blue-100 text-blue-600 border-2 border-blue-300'
                              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          }`}
                        >
                          <div className="text-xs font-medium text-center">
                            {format(day, 'EEE')}
                          </div>
                          <div className="text-lg font-bold text-center">
                            {format(day, 'd')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Single Day Full View */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-slate-900">
                    {format(selectedDateForView, 'EEEE, MMMM d')}
                  </h3>

                  {MEAL_TYPES.map((mealType) => {
                    const meal = getMealForSlot(selectedDateForView, mealType);

                    return (
                      <div
                        key={mealType}
                        onClick={() => {
                          if (selectedRecipeForAssignment && !meal) {
                            handleSlotClick(selectedDateForView, mealType);
                          }
                        }}
                        className={`rounded-lg border-2 overflow-hidden transition-all ${
                          meal
                            ? 'bg-white border-slate-200 shadow-sm'
                            : selectedRecipeForAssignment
                            ? 'border-orange-400 bg-orange-50 border-dashed cursor-pointer active:bg-orange-100'
                            : 'border-slate-200 bg-slate-50 border-dashed'
                        }`}
                      >
                        {meal && meal.recipe ? (
                          <div className="group">
                            {meal.recipe.imageUrl && (
                              <div className="w-full h-48 overflow-hidden bg-slate-100 relative">
                                <img
                                  src={meal.recipe.imageUrl?.includes('instagram.com') || meal.recipe.imageUrl?.includes('cdninstagram.com')
                                    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/image-proxy?url=${encodeURIComponent(meal.recipe.imageUrl.replace(/&amp;/g, '&'))}`
                                    : meal.recipe.imageUrl}
                                  alt={meal.recipe.title}
                                  className="w-full h-full object-cover"
                                />
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMeal(meal.id);
                                  }}
                                  className="absolute top-2 right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                            <div className="p-4">
                              <div className="text-sm font-medium text-slate-500 mb-2">
                                {mealType}
                              </div>
                              <h4 className="text-lg font-semibold text-slate-900 mb-2">
                                {meal.recipe.title}
                              </h4>
                              <div className="flex items-center gap-4 text-sm text-slate-600">
                                <div className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  <span>{meal.recipe.prepTime + meal.recipe.cookTime}m</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="w-4 h-4" />
                                  <span>{meal.recipe.servings} servings</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center">
                            <div className="text-sm font-medium text-slate-500 mb-2">
                              {mealType}
                            </div>
                            <p className="text-sm text-slate-400 mb-4">No meal planned</p>
                            <Button
                              size="sm"
                              onClick={() => handleOpenSlotDropdown(selectedDateForView, mealType)}
                              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                              <Plus className="w-4 h-4" />
                              Add Meal
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              // DESKTOP VIEW - Grid Calendar
              <div className={`grid gap-4 ${weeksToShow === 4 ? 'grid-cols-7' : 'grid-cols-7'}`}>
                {getDaysToShow().map((day, dayIndex) => (
                  <div key={dayIndex} className="space-y-2">
                    <div className="text-center pb-2 border-b-2 border-slate-200">
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {format(day, 'EEE')}
                      </div>
                      <div className={`text-lg font-bold ${
                        isSameDay(day, new Date()) ? 'text-blue-600' : 'text-slate-900'
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
                            onClick={() => {
                              if (selectedRecipeForAssignment) {
                                handleSlotClick(day, mealType);
                              }
                            }}
                            className={`
                              min-h-[100px] rounded-lg border-2 p-2
                              transition-all relative group
                              ${selectedRecipeForAssignment && !meal
                                ? 'border-orange-400 bg-orange-50 cursor-pointer hover:bg-orange-100 hover:border-orange-500 border-dashed'
                                : 'border-slate-200 bg-slate-50/50'
                              }
                              ${meal ? 'border-solid bg-white hover:shadow-md' : 'border-dashed'}
                            `}
                          >
                            {meal && meal.recipe ? (
                              <div className="relative h-full">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveMeal(meal.id);
                                  }}
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
                                  <div className="flex items-center gap-1 mt-1 text-slate-500 text-xs">
                                    <Clock className="w-3 h-3" />
                                    <span>{meal.recipe.prepTime + meal.recipe.cookTime}m</span>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col items-center justify-center h-full text-center gap-1">
                                <div className="text-xs font-medium text-slate-400">
                                  {mealType}
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenSlotDropdown(day, mealType)}
                                  className="h-6 text-xs px-2 gap-1 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                                >
                                  <Plus className="w-3 h-3" />
                                  Add
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

      {/* Add Meal Dialog */}
      <Dialog open={showAddMealDialog} onOpenChange={setShowAddMealDialog}>
        <DialogContent className="w-[95vw] max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Meal to Plan</DialogTitle>
            <DialogDescription>
              {selectedRecipe && `Add "${selectedRecipe.title}" to your meal plan`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Select value={selectedDate} onValueChange={setSelectedDate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select date" />
                </SelectTrigger>
                <SelectContent>
                  {getDaysToShow().map((day) => (
                    <SelectItem key={day.toISOString()} value={format(day, 'yyyy-MM-dd')}>
                      {format(day, 'EEE, MMM d')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Meal Type</label>
              <Select value={selectedMealType} onValueChange={(value) => setSelectedMealType(value as MealType)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  {MEAL_TYPES.map((mealType) => (
                    <SelectItem key={mealType} value={mealType}>
                      {mealType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowAddMealDialog(false);
                setSelectedRecipe(null);
                setSelectedDate('');
                setSelectedMealType('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMealViaDialog}
              disabled={!selectedDate || !selectedMealType}
              className="bg-emerald-600 hover:bg-emerald-700 text-white disabled:bg-gray-300 disabled:text-gray-500"
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Recipe Selection Dialog */}
      <Dialog open={showSlotDropdown} onOpenChange={setShowSlotDropdown}>
        <DialogContent className="w-[95vw] max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Select Recipe</DialogTitle>
            <DialogDescription>
              {slotDate && slotMealType && `Add a recipe for ${slotMealType} on ${format(slotDate, 'EEE, MMM d')}`}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[50vh]">
            <div className="space-y-4 py-4 pr-4">
              {recipesByCuisine.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  No saved recipes. Save recipes from the Discover page first.
                </div>
              ) : (
                <Accordion type="multiple" defaultValue={recipesByCuisine.map(g => g.cuisine)}>
                  {recipesByCuisine.map(({ cuisine, recipes }) => (
                    <AccordionItem key={cuisine} value={cuisine}>
                      <AccordionTrigger>
                        <div className="flex items-center justify-between w-full pr-2">
                          <span className="font-semibold">{cuisine}</span>
                          <Badge variant="secondary">{recipes.length}</Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-2 pt-2">
                          {recipes.map(recipe => (
                            <button
                              key={recipe.id}
                              onClick={() => handleAddRecipeToSlot(recipe.id)}
                              className="w-full text-left p-3 rounded-lg border border-slate-200 hover:border-blue-300 hover:bg-blue-50 transition-all"
                            >
                              <div className="flex gap-3">
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
                                  <h3 className="font-semibold text-sm text-slate-900 mb-1">
                                    {recipe.title}
                                  </h3>
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
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowSlotDropdown(false);
                setSlotDate(null);
                setSlotMealType(null);
              }}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}