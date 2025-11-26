// Key mobile optimizations for GroceryList.tsx

// 1. Replace drag-and-drop with long-press/tap for mobile
// 2. Make buttons touch-friendly (bigger tap targets)
// 3. Improve layout for small screens
// 4. Add swipe-to-delete gesture

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Calendar, ChefHat, ShoppingCart, GripVertical, X, Apple, Beef, Milk, Wheat, Carrot, Fish, Egg, Cookie } from 'lucide-react';
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

  const items = state.groceryList;

  // Helper function to get ingredient icon
  function getIngredientIcon(name: string, categoryId: string) {
    const nameLower = name.toLowerCase();

    // Fruits and vegetables
    if (nameLower.includes('apple') || nameLower.includes('fruit')) return <Apple className="w-5 h-5 text-red-500" />;
    if (nameLower.includes('carrot') || nameLower.includes('vegetable') || nameLower.includes('lettuce') || nameLower.includes('tomato') || nameLower.includes('onion')) return <Carrot className="w-5 h-5 text-orange-500" />;

    // Meat and protein
    if (nameLower.includes('beef') || nameLower.includes('steak') || nameLower.includes('meat')) return <Beef className="w-5 h-5 text-red-700" />;
    if (nameLower.includes('chicken') || nameLower.includes('pork')) return <span className="text-lg">🍗</span>;
    if (nameLower.includes('fish') || nameLower.includes('salmon') || nameLower.includes('tuna')) return <Fish className="w-5 h-5 text-blue-500" />;
    if (nameLower.includes('egg')) return <Egg className="w-5 h-5 text-yellow-600" />;

    // Dairy
    if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt') || nameLower.includes('cream') || nameLower.includes('butter')) return <Milk className="w-5 h-5 text-blue-400" />;

    // Grains and bakery
    if (nameLower.includes('bread') || nameLower.includes('pasta') || nameLower.includes('rice') || nameLower.includes('flour') || nameLower.includes('cereal')) return <Wheat className="w-5 h-5 text-amber-600" />;
    if (nameLower.includes('cookie') || nameLower.includes('cake') || nameLower.includes('dessert')) return <Cookie className="w-5 h-5 text-amber-700" />;

    // Category-based fallback emojis
    if (categoryId === 'produce') return <span className="text-lg">🥬</span>;
    if (categoryId === 'meat') return <span className="text-lg">🥩</span>;
    if (categoryId === 'dairy') return <span className="text-lg">🥛</span>;
    if (categoryId === 'pantry') return <span className="text-lg">🥫</span>;
    if (categoryId === 'frozen') return <span className="text-lg">🧊</span>;
    if (categoryId === 'bakery') return <span className="text-lg">🥖</span>;
    if (categoryId === 'snacks') return <span className="text-lg">🍿</span>;
    if (categoryId === 'beverages') return <span className="text-lg">🥤</span>;

    // Default
    return <span className="text-lg">📦</span>;
  }

  useEffect(() => {
    loadMealPlannerItems();
  }, [startDate, endDate]);

  function loadMealPlannerItems() {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const mealsInRange = state.mealPlan.filter(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      return mealDate >= start && mealDate <= end;
    });

    const ingredientsToAdd: { [key: string]: GroceryListItem } = {};

    mealsInRange.forEach(meal => {
      const recipe = state.savedRecipes.find(r => r.id === meal.recipeId);
      if (recipe) {
        recipe.ingredients.forEach(ing => {
          const key = `${ing.name.toLowerCase()}-${ing.unit}`;
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

    const existingItemKeys = new Set(items.map(item => `${item.name.toLowerCase()}-${item.unit}`));
    const newItems = Object.values(ingredientsToAdd).filter(
      item => !existingItemKeys.has(`${item.name.toLowerCase()}-${item.unit}`)
    );

    if (newItems.length > 0) {
      dispatch({
        type: 'UPDATE_GROCERY_LIST',
        payload: [...items, ...newItems]
      });
    }
  }

  function getCategoryForIngredient(name: string): string {
    const nameLower = name.toLowerCase();
    if (nameLower.includes('milk') || nameLower.includes('cheese') || nameLower.includes('yogurt') || nameLower.includes('butter') || nameLower.includes('cream')) return 'dairy';
    if (nameLower.includes('chicken') || nameLower.includes('beef') || nameLower.includes('pork') || nameLower.includes('fish') || nameLower.includes('meat')) return 'meat';
    if (nameLower.includes('apple') || nameLower.includes('banana') || nameLower.includes('orange') || nameLower.includes('berry') || nameLower.includes('fruit')) return 'produce';
    if (nameLower.includes('lettuce') || nameLower.includes('tomato') || nameLower.includes('carrot') || nameLower.includes('onion') || nameLower.includes('vegetable')) return 'produce';
    if (nameLower.includes('bread') || nameLower.includes('pasta') || nameLower.includes('rice') || nameLower.includes('cereal')) return 'pantry';
    return 'other';
  }

  function handleToggleItem(itemId: string) {
    dispatch({
      type: 'TOGGLE_GROCERY_ITEM',
      payload: itemId
    });
  }

  function handleDeleteItem(itemId: string) {
    dispatch({
      type: 'REMOVE_GROCERY_ITEM',
      payload: itemId
    });
    setSwipedItem(null);
  }

  function handleClearChecked() {
    const uncheckedItems = items.filter(item => !item.checked);
    dispatch({
      type: 'UPDATE_GROCERY_LIST',
      payload: uncheckedItems
    });
  }

  function handleClearAll() {
    if (!window.confirm('Are you sure you want to clear all items from your grocery list?')) return;
    dispatch({
      type: 'UPDATE_GROCERY_LIST',
      payload: []
    });
  }

  function handleAddItem() {
    if (!newItemName.trim() || !newItemCategory) return;

    const newItem: GroceryListItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: newItemName.trim(),
      quantity: parseFloat(newItemQuantity) || 1,
      unit: newItemUnit || '',
      categoryId: newItemCategory,
      checked: false,
      sourceRecipeIds: [],
    };

    dispatch({
      type: 'ADD_GROCERY_ITEM',
      payload: newItem
    });

    setShowAddItemDialog(false);
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemUnit('');
    setNewItemCategory('');
  }

  function handleAddRecipe() {
    if (!selectedRecipeId) return;

    const recipe = state.savedRecipes.find(r => r.id === selectedRecipeId);
    if (!recipe) {
      toast.error('Recipe not found');
      return;
    }

    const newItems: GroceryListItem[] = recipe.ingredients.map((ing, idx) => {
      const categoryId = getCategoryForIngredient(ing.name);
      return {
        id: `item-${Date.now()}-${idx}`,
        name: ing.name,
        quantity: parseFloat(ing.quantity) || 1,
        unit: ing.unit || '',
        categoryId,
        checked: false,
        sourceRecipeIds: [recipe.id],
      };
    });

    dispatch({
      type: 'UPDATE_GROCERY_LIST',
      payload: [...items, ...newItems]
    });

    toast.success(`Added ${newItems.length} ingredients from ${recipe.title}`);
    setShowAddRecipeDialog(false);
    setSelectedRecipeId('');
  }

  function handleMoveItem(itemId: string, newCategoryId: string) {
    const updatedItems = items.map(item =>
      item.id === itemId ? { ...item, categoryId: newCategoryId } : item
    );
    dispatch({
      type: 'UPDATE_GROCERY_LIST',
      payload: updatedItems
    });
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

      const cartItems = items.map(item => ({
        user_id: userData.user.id,
        product_name: item.name,
        quantity: `${item.quantity} ${item.unit}`.trim(),
        price: '0.00',
        image_url: null,
        affiliate_link: null,
      }));

      const { error } = await supabase
        .from('cart_items')
        .insert(cartItems);

      if (error) throw error;

      toast.success(`Added ${items.length} items to cart!`);

      if (onNavigate) {
        setTimeout(() => onNavigate('cart'), 1000);
      }
    } catch (error) {
      console.error('Failed to send to cart:', error);
      toast.error('Failed to send items to cart');
    }
  }

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
    <div className="max-w-4xl mx-auto p-4 pb-24">
      <div className="mb-6">
        <div className="flex flex-col gap-4 mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Grocery List</h1>
            <p className="text-sm text-gray-500 mt-1">
              {checkedCount} of {totalCount} items checked
            </p>
          </div>
          
          {/* Mobile-optimized button layout */}
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => setShowAddItemDialog(true)}
              className="flex-1 min-w-[140px] h-12"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowAddRecipeDialog(true)}
              className="flex-1 min-w-[140px] h-12"
            >
              <ChefHat className="w-4 h-4 mr-2" />
              Add Recipe
            </Button>
          </div>

          {(checkedCount > 0 || totalCount > 0) && (
            <div className="flex flex-wrap gap-2">
              {checkedCount > 0 && (
                <Button 
                  variant="outline" 
                  onClick={handleClearChecked}
                  className="flex-1 h-12"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear Checked
                </Button>
              )}
              {totalCount > 0 && (
                <>
                  <Button 
                    variant="destructive" 
                    onClick={handleClearAll}
                    className="flex-1 h-12"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    onClick={handleSendToCart}
                    className="w-full h-12 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600"
                  >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Send to Cart
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Meal planner date range - mobile optimized */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
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
        <Card>
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
                className={`transition-all ${
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

                        {/* Delete button - always visible on mobile */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="shrink-0 h-10 w-10"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </Button>
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
        <DialogContent>
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
                <SelectContent>
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
    </div>
  );
}