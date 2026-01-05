// Key mobile optimizations for GroceryList.tsx

// 1. Replace drag-and-drop with long-press/tap for mobile
// 2. Make buttons touch-friendly (bigger tap targets)
// 3. Improve layout for small screens
// 4. Add swipe-to-delete gesture

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Calendar, ChefHat, ShoppingCart, GripVertical, X, Apple, Beef, Milk, Wheat, Carrot, Fish, Egg, Cookie, Droplet, Flame, ShoppingBag, Truck } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import {
  getDefaultCategories,
  type GroceryListCategory,
  type GroceryListItem,
} from '../services/groceryListService.local';
import { useRecipes } from '../context/RecipeContext';
import { formatQuantity } from '../lib/unitConversion';
import { supabase } from '../lib/supabase';
import { ProductSelectorDialog } from '../components/ProductSelectorDialog';
import { addProductToCart, findProductsForIngredient, bulkAddToCart, type AmazonProduct } from '../services/amazonProductService';
import { getGroceryItems, saveGroceryItems, clearAllGroceryItems } from '../services/groceryListService';
import { getMealPlans } from '../services/mealPlannerService';
import { DeliveryServiceSelector } from '../components/DeliveryServiceSelector';
import { routeGroceryItems, getUserDeliveryPreferences, type RoutedItem } from '../services/deliveryRoutingService';
import { isInstacartEnabled } from '../services/instacartService';
import { createCheckoutResult, type CheckoutResult } from '../services/amazonSearchFallback';
import { CheckoutResultsDialog } from '../components/CheckoutResultsDialog';
import { App } from '@capacitor/app';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

interface GroceryListProps {
  onNavigate?: (page: string) => void;
}

export function GroceryList({ onNavigate }: GroceryListProps = {}) {
  const { state, dispatch } = useRecipes();
  const [categories, setCategories] = useState<GroceryListCategory[]>(getDefaultCategories());
  const loading = false;
  const [showAddItemDialog, setShowAddItemDialog] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('');
  const [showAddRecipeDialog, setShowAddRecipeDialog] = useState(false);
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  
  // Mobile-specific states
  const [showMoveDialog, setShowMoveDialog] = useState(false);
  const [itemToMove, setItemToMove] = useState<GroceryListItem | null>(null);
  const [swipedItem, setSwipedItem] = useState<string | null>(null);

  // Amazon product integration
  const [showProductSelector, setShowProductSelector] = useState(false);
  const [selectedGroceryItem, setSelectedGroceryItem] = useState<GroceryListItem | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Delivery service integration
  const [showDeliverySelector, setShowDeliverySelector] = useState(false);
  const [routedInstacartItems, setRoutedInstacartItems] = useState<RoutedItem[]>([]);
  const [routedAmazonItems, setRoutedAmazonItems] = useState<RoutedItem[]>([]);
  const [routedAmazonFreshItems, setRoutedAmazonFreshItems] = useState<RoutedItem[]>([]);
  const [routedAmazonGroceryItems, setRoutedAmazonGroceryItems] = useState<RoutedItem[]>([]);

  // Checkout results
  const [checkoutResult, setCheckoutResult] = useState<CheckoutResult | null>(null);
  const [showResultsDialog, setShowResultsDialog] = useState(false);
  const [routedWholeFoodsItems, setRoutedWholeFoodsItems] = useState<RoutedItem[]>([]);
  const [deliveryAddress, setDeliveryAddress] = useState<any>({});
  const [instacartEnabled, setInstacartEnabled] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);

  const items = state.groceryList;

  // Get user ID on mount and load grocery items
  useEffect(() => {
    const getUserId = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setUserId(data.user.id);
        try {
          const dbItems = await getGroceryItems(data.user.id);
          dispatch({ type: 'UPDATE_GROCERY_LIST', payload: dbItems });

          const enabled = await isInstacartEnabled();
          setInstacartEnabled(enabled);

          const prefs = await getUserDeliveryPreferences(data.user.id);
          if (prefs?.deliveryAddress) {
            setDeliveryAddress(prefs.deliveryAddress);
          }
        } catch (error) {
          console.error('Error loading grocery items:', error);
        }
      }
    };
    getUserId();
  }, []);

  // Persist checkout and delivery dialog states when they open
  useEffect(() => {
    const saveDialogState = async () => {
      if (!Capacitor.isNativePlatform()) return;

      if (showResultsDialog || showDeliverySelector) {
        try {
          await Preferences.set({
            key: 'groceryDialogState',
            value: JSON.stringify({
              showResultsDialog,
              showDeliverySelector,
              checkoutResult,
              routedInstacartItems,
              routedAmazonItems,
              routedAmazonFreshItems,
              routedAmazonGroceryItems,
              routedWholeFoodsItems,
              deliveryAddress,
            }),
          });
        } catch (error) {
          console.error('Error saving dialog state:', error);
        }
      } else {
        // Clear saved state when all dialogs are closed
        try {
          await Preferences.remove({ key: 'groceryDialogState' });
        } catch (error) {
          console.error('Error removing dialog state:', error);
        }
      }
    };
    saveDialogState();
  }, [showResultsDialog, showDeliverySelector, checkoutResult, routedInstacartItems, routedAmazonItems, routedAmazonFreshItems, routedAmazonGroceryItems, routedWholeFoodsItems, deliveryAddress]);

  // Restore dialog states on mount and when app resumes
  useEffect(() => {
    const restoreDialogState = async () => {
      if (!Capacitor.isNativePlatform()) return;

      try {
        const { value } = await Preferences.get({ key: 'groceryDialogState' });
        if (value) {
          const savedState = JSON.parse(value);
          if (savedState.showResultsDialog) setShowResultsDialog(true);
          if (savedState.showDeliverySelector) setShowDeliverySelector(true);
          if (savedState.checkoutResult) setCheckoutResult(savedState.checkoutResult);
          if (savedState.routedInstacartItems) setRoutedInstacartItems(savedState.routedInstacartItems);
          if (savedState.routedAmazonItems) setRoutedAmazonItems(savedState.routedAmazonItems);
          if (savedState.routedAmazonFreshItems) setRoutedAmazonFreshItems(savedState.routedAmazonFreshItems);
          if (savedState.routedAmazonGroceryItems) setRoutedAmazonGroceryItems(savedState.routedAmazonGroceryItems);
          if (savedState.routedWholeFoodsItems) setRoutedWholeFoodsItems(savedState.routedWholeFoodsItems);
          if (savedState.deliveryAddress) setDeliveryAddress(savedState.deliveryAddress);
        }
      } catch (error) {
        console.error('Error restoring dialog state:', error);
      }
    };

    // Restore on mount
    restoreDialogState();

    // Listen for app state changes (when app resumes from background)
    if (Capacitor.isNativePlatform()) {
      const listener = App.addListener('appStateChange', ({ isActive }) => {
        console.log('[GroceryList] App state changed, isActive:', isActive);
        setIsAppActive(isActive);
        if (isActive) {
          restoreDialogState();
        }
      });

      return () => {
        listener.then(l => l.remove());
      };
    }
  }, []);

  const deliveryServicesAvailable = true;

  // Helper function to get ingredient icon with comprehensive detection
  function getIngredientIcon(name: string, categoryId: string) {
    const nameLower = name.toLowerCase().trim();

    // EXACT MATCHES FIRST (highest priority)
    const exactMatches: Record<string, JSX.Element> = {
      'salt': <span className="text-lg">🧂</span>,
      'black pepper': <span className="text-lg">🌶️</span>,
      'pepper': <span className="text-lg">🌶️</span>,
      'paprika': <span className="text-lg">🌶️</span>,
      'water': <Droplet className="w-5 h-5 text-blue-500" />,
      'duck': <span className="text-lg">🦆</span>,
    };

    if (exactMatches[nameLower]) return exactMatches[nameLower];

    // POULTRY & FOWL - Check before general meats
    if (nameLower.match(/\b(duck|goose|quail|pheasant|turkey|chicken|poultry|wing|drumstick|breast|thigh)\b/))
      return <span className="text-lg">🍗</span>;

    // SPICES, HERBS & SEASONINGS - Very specific matching
    if (nameLower.match(/\b(cumin|coriander|turmeric|cardamom|clove|nutmeg|saffron|curry|chili|cayenne|red pepper|crushed pepper|pepper flake)/))
      return <Flame className="w-5 h-5 text-red-600" />;
    if (nameLower.match(/\b(basil|oregano|thyme|rosemary|sage|dill|parsley|cilantro|mint|bay leaf|herb)/))
      return <span className="text-lg">🌿</span>;
    if (nameLower.match(/\b(cinnamon|vanilla|allspice|anise|fennel)/))
      return <span className="text-lg">🌰</span>;
    if (nameLower.match(/\b(garlic|onion powder|garlic powder|shallot powder)/))
      return <span className="text-lg">🧄</span>;

    // OILS & FATS - Before checking for other ingredients
    if (nameLower.match(/\b(sesame oil|olive oil|vegetable oil|canola oil|coconut oil|peanut oil|avocado oil|oil)\b/))
      return <span className="text-lg">🫗</span>;
    if (nameLower.match(/\b(butter|ghee|lard|shortening)\b/))
      return <span className="text-lg">🧈</span>;

    // LIQUIDS & BEVERAGES
    if (nameLower.match(/\b(water|h2o)\b/)) return <Droplet className="w-5 h-5 text-blue-500" />;
    if (nameLower.match(/\b(milk|whole milk|skim milk|2%|almond milk|soy milk|oat milk)\b/))
      return <Milk className="w-5 h-5 text-blue-400" />;
    if (nameLower.match(/\b(juice|lemon juice|lime juice|orange juice)\b/))
      return <span className="text-lg">🧃</span>;
    if (nameLower.match(/\b(wine|beer|sake|liquor|vodka|rum|whiskey|brandy)\b/))
      return <span className="text-lg">🍷</span>;
    if (nameLower.match(/\b(stock|broth|bouillon)\b/))
      return <span className="text-lg">🥣</span>;

    // SAUCES & CONDIMENTS
    if (nameLower.match(/\b(soy sauce|tamari|worcestershire|fish sauce|oyster sauce|hoisin|teriyaki)\b/))
      return <span className="text-lg">🥫</span>;
    if (nameLower.match(/\b(ketchup|mustard|mayo|mayonnaise|aioli|relish)\b/))
      return <span className="text-lg">🍯</span>;
    if (nameLower.match(/\b(vinegar|balsamic|rice vinegar|apple cider vinegar)\b/))
      return <span className="text-lg">🧪</span>;
    if (nameLower.match(/\b(hot sauce|sriracha|tabasco|salsa|pico de gallo)\b/))
      return <span className="text-lg">🌶️</span>;

    // VEGETABLES - Comprehensive list
    if (nameLower.match(/\b(tomato|tomatoes)\b/)) return <span className="text-lg">🍅</span>;
    if (nameLower.match(/\b(onion|onions|red onion|white onion|yellow onion|sweet onion)\b/))
      return <span className="text-lg">🧅</span>;
    if (nameLower.match(/\b(garlic|garlic clove)\b/)) return <span className="text-lg">🧄</span>;
    if (nameLower.match(/\b(carrot|carrots)\b/)) return <Carrot className="w-5 h-5 text-orange-500" />;
    if (nameLower.match(/\b(potato|potatoes|russet|yukon)\b/)) return <span className="text-lg">🥔</span>;
    if (nameLower.match(/\b(sweet potato|yam)\b/)) return <span className="text-lg">🍠</span>;
    if (nameLower.match(/\b(lettuce|romaine|iceberg|arugula|salad|greens)\b/))
      return <span className="text-lg">🥬</span>;
    if (nameLower.match(/\b(spinach|kale|chard|collard)\b/)) return <span className="text-lg">🥬</span>;
    if (nameLower.match(/\b(broccoli)\b/)) return <span className="text-lg">🥦</span>;
    if (nameLower.match(/\b(cauliflower)\b/)) return <span className="text-lg">🥦</span>;
    if (nameLower.match(/\b(corn|maize)\b/)) return <span className="text-lg">🌽</span>;
    if (nameLower.match(/\b(pepper|bell pepper|capsicum|jalapeño|serrano)\b/))
      return <span className="text-lg">🫑</span>;
    if (nameLower.match(/\b(cucumber|cukes)\b/)) return <span className="text-lg">🥒</span>;
    if (nameLower.match(/\b(eggplant|aubergine)\b/)) return <span className="text-lg">🍆</span>;
    if (nameLower.match(/\b(zucchini|courgette|squash)\b/)) return <span className="text-lg">🥒</span>;
    if (nameLower.match(/\b(mushroom|shiitake|portobello|cremini)\b/))
      return <span className="text-lg">🍄</span>;
    if (nameLower.match(/\b(asparagus)\b/)) return <span className="text-lg">🥦</span>;
    if (nameLower.match(/\b(peas|snap pea|snow pea)\b/)) return <span className="text-lg">🫛</span>;
    if (nameLower.match(/\b(bean|green bean|kidney bean|black bean|pinto|chickpea|garbanzo)\b/))
      return <span className="text-lg">🫘</span>;
    if (nameLower.match(/\b(celery)\b/)) return <span className="text-lg">🥬</span>;
    if (nameLower.match(/\b(radish)\b/)) return <span className="text-lg">🌱</span>;
    if (nameLower.match(/\b(ginger|ginger root)\b/)) return <span className="text-lg">🫚</span>;
    if (nameLower.match(/\b(avocado)\b/)) return <span className="text-lg">🥑</span>;

    // FRUITS - Comprehensive list
    if (nameLower.match(/\b(apple|apples)\b/)) return <Apple className="w-5 h-5 text-red-500" />;
    if (nameLower.match(/\b(banana|bananas)\b/)) return <span className="text-lg">🍌</span>;
    if (nameLower.match(/\b(orange|oranges)\b/)) return <span className="text-lg">🍊</span>;
    if (nameLower.match(/\b(lemon|lemons)\b/)) return <span className="text-lg">🍋</span>;
    if (nameLower.match(/\b(lime|limes)\b/)) return <span className="text-lg">🍋</span>;
    if (nameLower.match(/\b(strawberry|strawberries)\b/)) return <span className="text-lg">🍓</span>;
    if (nameLower.match(/\b(blueberry|blueberries)\b/)) return <span className="text-lg">🫐</span>;
    if (nameLower.match(/\b(grape|grapes)\b/)) return <span className="text-lg">🍇</span>;
    if (nameLower.match(/\b(watermelon)\b/)) return <span className="text-lg">🍉</span>;
    if (nameLower.match(/\b(mango|mangoes)\b/)) return <span className="text-lg">🥭</span>;
    if (nameLower.match(/\b(pineapple)\b/)) return <span className="text-lg">🍍</span>;
    if (nameLower.match(/\b(peach|peaches)\b/)) return <span className="text-lg">🍑</span>;
    if (nameLower.match(/\b(cherry|cherries)\b/)) return <span className="text-lg">🍒</span>;
    if (nameLower.match(/\b(pear|pears)\b/)) return <span className="text-lg">🍐</span>;
    if (nameLower.match(/\b(berry|berries|raspberry|blackberry)\b/))
      return <span className="text-lg">🍓</span>;

    // MEAT & PROTEIN
    if (nameLower.match(/\b(beef|steak|ribeye|sirloin|chuck|brisket|ground beef)\b/))
      return <Beef className="w-5 h-5 text-red-700" />;
    if (nameLower.match(/\b(pork|ham|bacon|sausage|chorizo|pepperoni)\b/))
      return <span className="text-lg">🥓</span>;
    if (nameLower.match(/\b(lamb|mutton)\b/)) return <span className="text-lg">🍖</span>;
    if (nameLower.match(/\b(fish|salmon|tuna|cod|tilapia|halibut|trout)\b/))
      return <Fish className="w-5 h-5 text-blue-500" />;
    if (nameLower.match(/\b(shrimp|prawn|crab|lobster|scallop|clam|mussel|oyster|seafood)\b/))
      return <span className="text-lg">🦞</span>;
    if (nameLower.match(/\b(egg|eggs)\b/)) return <Egg className="w-5 h-5 text-yellow-600" />;
    if (nameLower.match(/\b(tofu|tempeh|seitan)\b/)) return <span className="text-lg">🥡</span>;

    // DAIRY
    if (nameLower.match(/\b(cheese|cheddar|mozzarella|parmesan|feta|gouda|brie)\b/))
      return <span className="text-lg">🧀</span>;
    if (nameLower.match(/\b(yogurt|yoghurt)\b/)) return <span className="text-lg">🥛</span>;
    if (nameLower.match(/\b(cream|heavy cream|sour cream|whipping cream)\b/))
      return <span className="text-lg">🥛</span>;

    // GRAINS & CARBS
    if (nameLower.match(/\b(rice|basmati|jasmine|brown rice|white rice)\b/))
      return <span className="text-lg">🍚</span>;
    if (nameLower.match(/\b(pasta|spaghetti|penne|rigatoni|linguine|fettuccine|noodle|macaroni)\b/))
      return <span className="text-lg">🍝</span>;
    if (nameLower.match(/\b(bread|baguette|roll|bun|loaf|sourdough|wheat bread)\b/))
      return <span className="text-lg">🥖</span>;
    if (nameLower.match(/\b(flour|all-purpose|wheat|bread flour|cake flour)\b/))
      return <Wheat className="w-5 h-5 text-amber-600" />;
    if (nameLower.match(/\b(tortilla|wrap|pita|flatbread|naan)\b/))
      return <span className="text-lg">🫓</span>;
    if (nameLower.match(/\b(cereal|oat|oatmeal|granola)\b/)) return <span className="text-lg">🥣</span>;
    if (nameLower.match(/\b(quinoa|couscous|barley|farro)\b/))
      return <span className="text-lg">🌾</span>;

    // BAKING & SWEETS
    if (nameLower.match(/\b(sugar|brown sugar|powdered sugar|confectioner)\b/))
      return <span className="text-lg">🍬</span>;
    if (nameLower.match(/\b(honey|maple syrup|agave|molasses)\b/))
      return <span className="text-lg">🍯</span>;
    if (nameLower.match(/\b(chocolate|cocoa|cacao)\b/)) return <span className="text-lg">🍫</span>;
    if (nameLower.match(/\b(cookie|biscuit)\b/)) return <Cookie className="w-5 h-5 text-amber-700" />;
    if (nameLower.match(/\b(cake|cupcake|muffin|pastry|brownie)\b/))
      return <span className="text-lg">🍰</span>;
    if (nameLower.match(/\b(baking powder|baking soda|yeast)\b/))
      return <span className="text-lg">🧪</span>;

    // NUTS & SEEDS
    if (nameLower.match(/\b(almond|peanut|walnut|cashew|pistachio|pecan|hazelnut|nut)\b/))
      return <span className="text-lg">🥜</span>;
    if (nameLower.match(/\b(seed|sesame|sunflower|pumpkin|chia|flax)\b/))
      return <span className="text-lg">🌻</span>;

    // Category-based fallback emojis
    if (categoryId === 'produce') return <span className="text-lg">🥬</span>;
    if (categoryId === 'meat') return <span className="text-lg">🥩</span>;
    if (categoryId === 'dairy') return <span className="text-lg">🥛</span>;
    if (categoryId === 'pantry') return <span className="text-lg">🥫</span>;
    if (categoryId === 'frozen') return <span className="text-lg">🧊</span>;
    if (categoryId === 'bakery') return <span className="text-lg">🥖</span>;
    if (categoryId === 'snacks') return <span className="text-lg">🍿</span>;
    if (categoryId === 'beverages') return <span className="text-lg">🥤</span>;

    // Default for uncategorized items
    return <span className="text-lg">🛒</span>;
  }

  useEffect(() => {
    if (userId) {
      loadMealPlannerItems();
    }
  }, [startDate, endDate, userId]);

  async function loadMealPlannerItems() {
    if (!userId) {
      return;
    }

    try {
      const dbMealPlans = await getMealPlans(userId);
      const dbGroceryItems = await getGroceryItems(userId);

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);

      const mealsInRange = dbMealPlans.filter(meal => {
        const mealDate = new Date(meal.date);
        mealDate.setHours(0, 0, 0, 0);
        return mealDate >= start && mealDate <= end;
      });

      if (mealsInRange.length === 0) {
        dispatch({
          type: 'UPDATE_GROCERY_LIST',
          payload: dbGroceryItems
        });
        toast.info('No meals planned in selected date range');
        return;
      }

      const recipeIds = [...new Set(mealsInRange.map(meal => meal.recipeId))];

      const { data: recipes, error: recipeError } = await supabase
        .from('public_recipes')
        .select('*')
        .in('id', recipeIds);

      if (recipeError) {
        console.error('Error fetching recipes:', recipeError);
        toast.error('Failed to fetch recipes from meal planner');
        return;
      }

      const ingredientsToAdd: { [key: string]: GroceryListItem } = {};

      mealsInRange.forEach(meal => {
        const recipe = recipes.find(r => r.id === meal.recipeId);
        if (recipe && recipe.ingredients) {
          const ingredients = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
          ingredients.forEach((ing: any) => {
            const key = `${ing.name.toLowerCase()}-${ing.unit || ''}`;
            if (ingredientsToAdd[key]) {
              ingredientsToAdd[key].quantity += parseFloat(ing.quantity) || 0;
              if (!ingredientsToAdd[key].sourceRecipeIds.includes(recipe.id)) {
                ingredientsToAdd[key].sourceRecipeIds.push(recipe.id);
              }
            } else {
              const categoryId = getCategoryForIngredient(ing.name);
              ingredientsToAdd[key] = {
                id: `item-${Date.now()}-${Math.random()}`,
                name: ing.name,
                quantity: parseFloat(ing.quantity) || 1,
                unit: ing.unit || '',
                categoryId,
                checked: false,
                sourceRecipeIds: [recipe.id],
              };
            }
          });
        }
      });

      const existingItemKeys = new Set(dbGroceryItems.map(item => `${item.name.toLowerCase()}-${item.unit}`));
      const newItems = Object.values(ingredientsToAdd).filter(
        item => !existingItemKeys.has(`${item.name.toLowerCase()}-${item.unit}`)
      );

      if (newItems.length > 0) {
        const updatedItems = [...dbGroceryItems, ...newItems];
        await saveGroceryItems(userId, updatedItems);
        dispatch({
          type: 'UPDATE_GROCERY_LIST',
          payload: updatedItems
        });
        toast.success(`Added ${newItems.length} items from meal planner`);
      } else {
        dispatch({
          type: 'UPDATE_GROCERY_LIST',
          payload: dbGroceryItems
        });
        toast.info('All meal planner items already in grocery list');
      }
    } catch (error) {
      console.error('Error loading meal planner items:', error);
      toast.error('Failed to load meal planner items');
    }
  }

  function getCategoryForIngredient(name: string): string {
    const nameLower = name.toLowerCase();

    // Produce - cat-0
    if (nameLower.match(/\b(apple|banana|orange|berry|fruit|lettuce|tomato|carrot|onion|vegetable|pepper|cucumber|zucchini|potato|spinach|broccoli|mushroom|garlic|avocado|cilantro|parsley|basil|lemon|lime)\b/)) {
      return 'cat-0';
    }

    // Meat & Seafood - cat-1
    if (nameLower.match(/\b(chicken|beef|pork|turkey|salmon|shrimp|fish|bacon|sausage|meat|seafood)\b/)) {
      return 'cat-1';
    }

    // Dairy & Eggs - cat-2
    if (nameLower.match(/\b(milk|cheese|yogurt|butter|cream|egg|dairy|cheddar|mozzarella|parmesan)\b/)) {
      return 'cat-2';
    }

    // Bakery - cat-3
    if (nameLower.match(/\b(bread|tortilla|buns|rolls|bagels|croissant|bakery)\b/)) {
      return 'cat-3';
    }

    // Pantry - cat-4
    if (nameLower.match(/\b(rice|pasta|flour|sugar|salt|pepper|oil|vinegar|sauce|beans|chickpeas|lentils|broth|stock|honey|peanut butter|spice|seasoning)\b/)) {
      return 'cat-4';
    }

    // Frozen - cat-5
    if (nameLower.match(/\b(frozen|ice cream)\b/)) {
      return 'cat-5';
    }

    // Beverages - cat-6
    if (nameLower.match(/\b(water|juice|coffee|tea|soda|beverage|drink)\b/)) {
      return 'cat-6';
    }

    // Other - cat-7
    return 'cat-7';
  }

  async function handleToggleItem(itemId: string) {
    if (!userId) return;

    try {
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, checked: !item.checked } : item
      );
      await saveGroceryItems(userId, updatedItems);
      dispatch({
        type: 'TOGGLE_GROCERY_ITEM',
        payload: itemId
      });
    } catch (error) {
      console.error('Error toggling item:', error);
      toast.error('Failed to update item');
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!userId) return;

    try {
      const updatedItems = items.filter(item => item.id !== itemId);
      await saveGroceryItems(userId, updatedItems);
      dispatch({
        type: 'REMOVE_GROCERY_ITEM',
        payload: itemId
      });
      setSwipedItem(null);
    } catch (error) {
      console.error('Error deleting item:', error);
      toast.error('Failed to delete item');
    }
  }

  async function handleClearChecked() {
    if (!userId) return;

    const uncheckedItems = items.filter(item => !item.checked);
    try {
      await saveGroceryItems(userId, uncheckedItems);
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: uncheckedItems
      });
    } catch (error) {
      console.error('Error clearing checked items:', error);
      toast.error('Failed to clear checked items');
    }
  }

  async function handleClearAll() {
    if (!userId) return;
    if (!window.confirm('Are you sure you want to clear all items from your grocery list?')) return;

    try {
      await clearAllGroceryItems(userId);
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: []
      });
      toast.success('Grocery list cleared');
    } catch (error) {
      console.error('Error clearing grocery list:', error);
      toast.error('Failed to clear grocery list');
    }
  }

  async function handleAddItem() {
    if (!userId || !newItemName.trim() || !newItemCategory) return;

    const newItem: GroceryListItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: newItemName.trim(),
      quantity: parseFloat(newItemQuantity) || 1,
      unit: newItemUnit || '',
      categoryId: newItemCategory,
      checked: false,
      sourceRecipeIds: [],
    };

    try {
      const currentItems = await getGroceryItems(userId);
      const updatedItems = [...currentItems, newItem];
      await saveGroceryItems(userId, updatedItems);

      const freshItems = await getGroceryItems(userId);
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: freshItems
      });

      setShowAddItemDialog(false);
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemUnit('');
      setNewItemCategory('');
    } catch (error) {
      console.error('Error adding item:', error);
      toast.error('Failed to add item');
    }
  }

  async function handleAddRecipe() {
    if (!userId || !selectedRecipeId) return;

    const recipe = state.savedRecipes.find(r => r.id === selectedRecipeId);
    if (!recipe) {
      toast.error('Recipe not found');
      return;
    }

    const newItems: GroceryListItem[] = recipe.ingredients.map((ing, idx) => {
      const categoryId = getCategoryForIngredient(ing.name);
      return {
        id: `item-${Date.now()}-${Math.random()}-${idx}`,
        name: ing.name,
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || '',
        categoryId,
        checked: false,
        sourceRecipeIds: [recipe.id],
      };
    });

    try {
      const currentItems = await getGroceryItems(userId);
      const updatedItems = [...currentItems, ...newItems];
      await saveGroceryItems(userId, updatedItems);

      const freshItems = await getGroceryItems(userId);
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: freshItems
      });

      toast.success(`Added ${newItems.length} ingredients from ${recipe.title}`);
      setShowAddRecipeDialog(false);
      setSelectedRecipeId('');
    } catch (error) {
      console.error('Error adding recipe:', error);
      toast.error('Failed to add recipe ingredients');
    }
  }

  async function handleMoveItem(itemId: string, newCategoryId: string) {
    if (!userId) return;

    try {
      const updatedItems = items.map(item =>
        item.id === itemId ? { ...item, categoryId: newCategoryId } : item
      );
      await saveGroceryItems(userId, updatedItems);
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: updatedItems
      });
    } catch (error) {
      console.error('Error moving item:', error);
      toast.error('Failed to move item');
    }
  }

  // Mobile: Long press to show move dialog
  function handleLongPress(item: GroceryListItem) {
    setItemToMove(item);
    setShowMoveDialog(true);
  }

  // Desktop: Drag and drop handlers
  function handleDragStart(itemId: string) {
    setDraggedItem(itemId);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(categoryId: string) {
    if (draggedItem) {
      handleMoveItem(draggedItem, categoryId);
      setDraggedItem(null);
    }
  }

  function handleCategoryDragStart(categoryId: string) {
    setDraggedCategory(categoryId);
  }

  async function handleCategoryDrop(targetCategoryId: string) {
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null);
      return;
    }

    const draggedIdx = categories.findIndex(c => c.id === draggedCategory);
    const targetIdx = categories.findIndex(c => c.id === targetCategoryId);

    if (draggedIdx === -1 || targetIdx === -1) return;

    const newCategories = [...categories];
    const [removed] = newCategories.splice(draggedIdx, 1);
    newCategories.splice(targetIdx, 0, removed);

    const updatedCategories = newCategories.map((cat, idx) => ({
      ...cat,
      sortOrder: idx,
    }));

    setCategories(updatedCategories);
    setDraggedCategory(null);
  }

  async function handleSendToCart() {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error('Please sign in to add items to cart');
        return;
      }

      if (items.length === 0) {
        toast.error('No items to send to cart');
        return;
      }

      toast.info('Finding matching Amazon products...');

      const itemsWithProducts: Array<{ name: string; quantity: string; unit: string; asin: string | null }> = [];
      const itemsToAdd: Array<{
        product: AmazonProduct;
        quantity: string;
        unit: string;
      }> = [];

      for (const item of items) {
        const products = await findProductsForIngredient(item.name, 1);
        if (products.length > 0) {
          itemsToAdd.push({
            product: products[0],
            quantity: item.quantity.toString(),
            unit: item.unit,
          });
          itemsWithProducts.push({
            name: item.name,
            quantity: item.quantity.toString(),
            unit: item.unit,
            asin: products[0].asin,
          });
        } else {
          itemsWithProducts.push({
            name: item.name,
            quantity: item.quantity.toString(),
            unit: item.unit,
            asin: null,
          });
        }
      }

      if (itemsToAdd.length > 0) {
        await bulkAddToCart(userData.user.id, itemsToAdd);
      }

      const result = createCheckoutResult(itemsWithProducts, 'amazon');
      setCheckoutResult(result);
      setShowResultsDialog(true);

      if (result.hasCartItems && !result.hasUnmappedItems) {
        toast.success(`Added ${result.mappedItems.length} items to cart!`);
        if (onNavigate) {
          setTimeout(() => onNavigate('cart'), 1000);
        }
      } else if (result.hasCartItems && result.hasUnmappedItems) {
        toast.info(`${result.mappedItems.length} items added to cart, ${result.unmappedItems.length} need manual search`);
      } else if (result.hasUnmappedItems) {
        toast.info(`${result.unmappedItems.length} items need manual search on Amazon`);
      }
    } catch (error) {
      console.error('Failed to send to cart:', error);
      toast.error('Failed to send items to cart');
    }
  }

  // Handle adding a single item to cart with Amazon product
  const handleAddItemToCart = (item: GroceryListItem) => {
    if (!userId) {
      toast.error('Please sign in to add items to cart');
      return;
    }
    setSelectedGroceryItem(item);
    setShowProductSelector(true);
  };

  const handleProductSelected = async (product: AmazonProduct) => {
    if (!userId || !selectedGroceryItem) return;

    try {
      await addProductToCart(
        userId,
        product,
        selectedGroceryItem.quantity.toString(),
        selectedGroceryItem.unit
      );
      toast.success(`Added ${product.product_name} to cart`);
    } catch (error) {
      console.error('Failed to add to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  const handleDeliveryCheckout = async () => {
    if (!userId) {
      toast.error('Please sign in to order delivery');
      return;
    }

    if (items.length === 0) {
      toast.error('No items in grocery list');
      return;
    }

    if (!deliveryAddress || !deliveryAddress.street) {
      toast.error('Please set your delivery address in settings first');
      return;
    }

    try {
      toast.info('Routing items to delivery services...');

      const { instacartItems, amazonItems, amazonFreshItems, amazonGroceryItems, wholeFoodsItems } = await routeGroceryItems(items, userId);

      setRoutedInstacartItems(instacartItems);
      setRoutedAmazonItems(amazonItems);
      setRoutedAmazonFreshItems(amazonFreshItems);
      setRoutedAmazonGroceryItems(amazonGroceryItems);
      setRoutedWholeFoodsItems(wholeFoodsItems);
      setShowDeliverySelector(true);
    } catch (error) {
      console.error('Error routing items:', error);
      toast.error('Failed to route items. Please try again.');
    }
  };

  // Swipe gesture handlers for mobile
  let touchStartX = 0;
  let touchEndX = 0;

  function handleTouchStart(e: React.TouchEvent, itemId: string) {
    touchStartX = e.targetTouches[0].clientX;
  }

  function handleTouchEnd(e: React.TouchEvent, itemId: string) {
    touchEndX = e.changedTouches[0].clientX;
    const swipeDistance = touchStartX - touchEndX;

    // Swipe left to delete (> 100px)
    if (swipeDistance > 100) {
      setSwipedItem(itemId);
    } else if (swipeDistance < -50) {
      setSwipedItem(null);
    }
  }

  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = items.filter(item => item.categoryId === category.id);
    return acc;
  }, {} as Record<string, GroceryListItem[]>);

  const checkedCount = items.filter(item => item.checked).length;
  const totalCount = items.length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-2 pb-24">
      <div className="mb-6">
      <div className="flex flex-col gap-4 mb-4">
  <div className="text-center">
    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Grocery List</h1>
    <p className="text-sm text-gray-500 mt-1">
      {checkedCount} of {totalCount} items checked
    </p>
  </div>
      {/* Mobile-optimized button layout */}
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              onClick={() => setShowAddItemDialog(true)}
              className="h-10 text-sm border-2 border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Item
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddRecipeDialog(true)}
              className="h-10 text-sm border-2 border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900"
            >
              <ChefHat className="w-4 h-4 mr-1" />
              Add Recipe
            </Button>
          </div>

          {(checkedCount > 0 || totalCount > 0) && (
            <div className="grid grid-cols-2 gap-2">
              {totalCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleSendToCart}
                  className="h-10 text-sm border-2 border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900"
                >
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Amazon Cart
                </Button>
              )}
              {totalCount > 0 && deliveryServicesAvailable && (
                <Button
                  variant="outline"
                  onClick={handleDeliveryCheckout}
                  className="h-10 text-sm border-2 border-green-300 bg-white hover:bg-green-50 hover:border-green-500 hover:text-green-900"
                >
                  <Truck className="w-4 h-4 mr-1" />
                  Order Delivery
                </Button>
              )}
              {totalCount > 0 && (
                <Button
                  variant="destructive"
                  onClick={handleClearAll}
                  className="h-10 text-sm"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear All
                </Button>
              )}
              {checkedCount > 0 && (
                <Button
                  variant="outline"
                  onClick={handleClearChecked}
                  className="h-10 text-sm border-2 border-gray-300 bg-white hover:bg-gray-100 hover:border-gray-500 hover:text-gray-900 col-span-2"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Clear Checked
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Meal planner date range - mobile optimized */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-4 border-orange-500">
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-700">Auto-populate from Meal Planner</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">From:</Label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-12"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-gray-600">To:</Label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full h-12"
                  />
                </div>
                <Button onClick={loadMealPlannerItems} className="h-12 sm:self-end">
                  Refresh
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalCount === 0 ? (
        <Card className="border-4 border-orange-500">
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              Your grocery list is empty. Add recipes to your meal plan to automatically generate a grocery list.
            </p>
            <Button onClick={() => onNavigate?.('meal-planner')} className="h-12">
              <Calendar className="w-4 h-4 mr-2" />
              Go to Meal Planner
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {categories.map(category => {
            const categoryItems = itemsByCategory[category.id] || [];
            if (categoryItems.length === 0) return null;

            return (
              <Card
                key={category.id}
                draggable
                onDragStart={() => handleCategoryDragStart(category.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleCategoryDrop(category.id)}
                className={`transition-all border-4 border-orange-500 ${
                  draggedCategory === category.id ? 'opacity-50' : ''
                }`}
              >
                <CardHeader className="pb-3 cursor-move">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-gray-400" />
                      <CardTitle className="text-lg">{category.name}</CardTitle>
                      <Badge variant="secondary">{categoryItems.length}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(category.id)}
                >
                  <div className="space-y-2">
                    {categoryItems.map(item => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={() => handleDragStart(item.id)}
                        onTouchStart={(e) => handleTouchStart(e, item.id)}
                        onTouchEnd={(e) => handleTouchEnd(e, item.id)}
                        className={`relative flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-all ${
                          draggedItem === item.id ? 'opacity-50' : ''
                        } ${item.checked ? 'opacity-60' : ''} ${
                          swipedItem === item.id ? 'bg-red-50' : ''
                        }`}
                      >
                        {/* Desktop drag handle */}
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move hidden md:block" />
                        
                        {/* Mobile: Tap to move category */}
                        <button
                          onClick={() => handleLongPress(item)}
                          className="md:hidden p-2 -ml-2"
                        >
                          <GripVertical className="w-5 h-5 text-gray-400" />
                        </button>

                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() => handleToggleItem(item.id)}
                          className="h-6 w-6"
                        />
                        {/* Ingredient Icon */}
                        <div className="shrink-0">
                          {getIngredientIcon(item.name, item.categoryId)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`font-medium text-base ${
                                item.checked ? 'line-through text-gray-500' : 'text-gray-900'
                              }`}
                            >
                              {item.name}
                            </span>
                            {item.sourceRecipeIds.length > 1 && (
                              <Badge variant="outline" className="text-xs">
                                {item.sourceRecipeIds.length} recipes
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">
                            {formatQuantity(item.quantity)} {item.unit}
                          </p>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAddItemToCart(item)}
                            className="shrink-0 h-10 w-10"
                            title="Add to Cart"
                          >
                            <ShoppingBag className="w-5 h-5 text-orange-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteItem(item.id)}
                            className="shrink-0 h-10 w-10"
                          >
                            <Trash2 className="w-5 h-5 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Move Item Dialog for Mobile */}
      <Dialog open={showMoveDialog} onOpenChange={setShowMoveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Category</DialogTitle>
            <DialogDescription>
              Select a new category for "{itemToMove?.name}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {categories.map(category => (
              <Button
                key={category.id}
                variant="outline"
                className="w-full h-14 justify-start text-left"
                onClick={() => {
                  if (itemToMove) {
                    handleMoveItem(itemToMove.id, category.id);
                  }
                  setShowMoveDialog(false);
                  setItemToMove(null);
                }}
              >
                <span className="text-base font-medium">{category.name}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Item Dialog - Mobile optimized */}
      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to your grocery list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="itemName">Item Name *</Label>
              <Input
                id="itemName"
                value={newItemName}
                onChange={e => setNewItemName(e.target.value)}
                placeholder="e.g., Milk, Eggs"
                className="h-12"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="itemQuantity">Quantity</Label>
                <Input
                  id="itemQuantity"
                  type="number"
                  value={newItemQuantity}
                  onChange={e => setNewItemQuantity(e.target.value)}
                  placeholder="1"
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemUnit">Unit</Label>
                <Input
                  id="itemUnit"
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value)}
                  placeholder="e.g., cups, lbs"
                  className="h-12"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category *</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddItemDialog(false)}
              className="h-12"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem} 
              disabled={!newItemName.trim() || !newItemCategory}
              className="h-12"
            >
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

   {/* Add Recipe Dialog - Mobile optimized */}
      <Dialog open={showAddRecipeDialog} onOpenChange={setShowAddRecipeDialog}>
        <DialogContent className="z-[300]">
          <DialogHeader>
            <DialogTitle>Add Recipe to Grocery List</DialogTitle>
            <DialogDescription>
              Select a recipe to add its ingredients to your grocery list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipeSelect">Recipe *</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent className="z-[200]">
                  {state.savedRecipes.map(recipe => (
                    <SelectItem key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddRecipeDialog(false)}
              className="h-12"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddRecipe} 
              disabled={!selectedRecipeId}
              className="h-12"
            >
              Add Ingredients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Selector Dialog */}
      {selectedGroceryItem && (
        <ProductSelectorDialog
          open={showProductSelector}
          onOpenChange={setShowProductSelector}
          ingredientName={selectedGroceryItem.name}
          quantity={selectedGroceryItem.quantity.toString()}
          unit={selectedGroceryItem.unit}
          onSelect={handleProductSelected}
        />
      )}

      {/* Delivery Service Selector */}
      {showDeliverySelector && userId && (
        <DeliveryServiceSelector
          instacartItems={routedInstacartItems}
          amazonItems={routedAmazonItems}
          amazonFreshItems={routedAmazonFreshItems}
          amazonGroceryItems={routedAmazonGroceryItems}
          wholeFoodsItems={routedWholeFoodsItems}
          userId={userId}
          deliveryAddress={deliveryAddress}
          onClose={() => {
            console.log('[GroceryList] DeliveryServiceSelector onClose called, isAppActive:', isAppActive);
            // Only close if app is active (not backgrounded)
            if (isAppActive || !Capacitor.isNativePlatform()) {
              setShowDeliverySelector(false);
            }
          }}
        />
      )}

      {/* Checkout Results Dialog */}
      <CheckoutResultsDialog
        open={showResultsDialog}
        onClose={() => {
          console.log('[GroceryList] CheckoutResultsDialog onClose called, isAppActive:', isAppActive);
          // Only close if app is active (not backgrounded)
          if (isAppActive || !Capacitor.isNativePlatform()) {
            setShowResultsDialog(false);
          }
        }}
        result={checkoutResult}
        serviceName="Amazon"
      />
    </div>
  );
}