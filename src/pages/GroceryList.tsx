import { useState, useEffect } from 'react';
import { Plus, Trash2, GripVertical, Loader2, Calendar, ChefHat } from 'lucide-react';
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

  const items = state.groceryList;

  useEffect(() => {
    loadMealPlannerItems();
  }, [startDate, endDate]);

  function loadMealPlannerItems() {
    console.log('[GroceryList] Loading meal planner items');
    console.log('[ShoppingList] Date range:', startDate, 'to', endDate);
    console.log('[ShoppingList] Total meals in plan:', state.mealPlan.length);
    console.log('[ShoppingList] Meal plan data:', state.mealPlan);

    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const mealsInRange = state.mealPlan.filter(meal => {
      const mealDate = new Date(meal.date);
      mealDate.setHours(0, 0, 0, 0);
      const inRange = mealDate >= start && mealDate <= end;
      console.log('[ShoppingList] Meal date:', meal.date, 'in range:', inRange);
      return inRange;
    });

    console.log('[ShoppingList] Meals in range:', mealsInRange.length);

    const ingredientsToAdd: { [key: string]: ShoppingListItem } = {};

    mealsInRange.forEach(meal => {
      const recipe = state.savedRecipes.find(r => r.id === meal.recipeId);
      console.log('[ShoppingList] Looking for recipe:', meal.recipeId, 'found:', !!recipe);
      if (recipe) {
        console.log('[ShoppingList] Recipe:', recipe.title, 'ingredients:', recipe.ingredients.length);
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

    console.log('[ShoppingList] Total ingredients to add:', Object.keys(ingredientsToAdd).length);

    const existingItemKeys = new Set(items.map(item => `${item.name.toLowerCase()}-${item.unit}`));
    const newItems = Object.values(ingredientsToAdd).filter(
      item => !existingItemKeys.has(`${item.name.toLowerCase()}-${item.unit}`)
    );

    console.log('[ShoppingList] New items after filtering:', newItems.length);

    if (newItems.length > 0) {
      dispatch({
        type: 'UPDATE_SHOPPING_LIST',
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
      type: 'TOGGLE_SHOPPING_ITEM',
      payload: itemId
    });
  }

  function handleDeleteItem(itemId: string) {
    dispatch({
      type: 'REMOVE_SHOPPING_ITEM',
      payload: itemId
    });
  }

  function handleClearChecked() {
    const uncheckedItems = items.filter(item => !item.checked);
    dispatch({
      type: 'UPDATE_SHOPPING_LIST',
      payload: uncheckedItems
    });
  }

  function handleClearAll() {
    if (!window.confirm('Are you sure you want to clear all items from your shopping list?')) return;
    dispatch({
      type: 'UPDATE_SHOPPING_LIST',
      payload: []
    });
  }

  function handleAddItem() {
    if (!newItemName.trim() || !newItemCategory) return;

    const newItem: ShoppingListItem = {
      id: `item-${Date.now()}-${Math.random()}`,
      name: newItemName.trim(),
      quantity: parseFloat(newItemQuantity) || 1,
      unit: newItemUnit || '',
      categoryId: newItemCategory,
      checked: false,
      sourceRecipeIds: [],
    };

    dispatch({
      type: 'ADD_SHOPPING_ITEM',
      payload: newItem
    });

    setShowAddItemDialog(false);
    setNewItemName('');
    setNewItemQuantity('');
    setNewItemUnit('');
    setNewItemCategory('');
  }

  function handleAddRecipe() {
    if (!selectedRecipeId) {
      console.log('[ShoppingList] No recipe selected');
      return;
    }

    console.log('[ShoppingList] Looking for recipe:', selectedRecipeId);
    console.log('[ShoppingList] Available recipes:', state.savedRecipes.length);

    const recipe = state.savedRecipes.find(r => r.id === selectedRecipeId);
    if (!recipe) {
      console.log('[ShoppingList] Recipe not found');
      toast.error('Recipe not found');
      return;
    }

    console.log('[ShoppingList] Found recipe:', recipe.title, 'ingredients:', recipe.ingredients.length);

    const newItems: ShoppingListItem[] = recipe.ingredients.map((ing, idx) => {
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

    console.log('[ShoppingList] Adding items:', newItems.length);

    dispatch({
      type: 'UPDATE_SHOPPING_LIST',
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
      type: 'UPDATE_SHOPPING_LIST',
      payload: updatedItems
    });
  }

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

  const itemsByCategory = categories.reduce((acc, category) => {
    acc[category.id] = items.filter(item => item.categoryId === category.id);
    return acc;
  }, {} as Record<string, ShoppingListItem[]>);

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
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Shopping List</h1>
            <p className="text-sm text-gray-500 mt-1">
              {checkedCount} of {totalCount} items checked
            </p>
          </div>
          <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowAddRecipeDialog(true)}
          >
            <ChefHat className="w-4 h-4 mr-2" />
            Add Recipe
          </Button>
          <Button
            variant="outline"
            onClick={() => setShowAddItemDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          {checkedCount > 0 && (
            <Button variant="outline" onClick={handleClearChecked}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear Checked
            </Button>
          )}
          {totalCount > 0 && (
            <Button variant="destructive" onClick={handleClearAll}>
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
        </div>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">Auto-populate from Meal Planner</p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">From:</Label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-sm text-gray-600">To:</Label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-40"
                    />
                  </div>
                  <Button onClick={loadMealPlannerItems} size="sm">
                    Refresh List
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {totalCount === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-gray-500 mb-4">
              Your shopping list is empty. Add recipes to your meal plan to automatically generate a shopping list.
            </p>
            <Button onClick={() => onNavigate?.('meal-planner')}>
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
                        className={`flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors ${
                          draggedItem === item.id ? 'opacity-50' : ''
                        } ${item.checked ? 'opacity-60' : ''}`}
                      >
                        <GripVertical className="w-4 h-4 text-gray-400 cursor-move" />
                        <Checkbox
                          checked={item.checked}
                          onCheckedChange={() =>
                            handleToggleItem(item.id)
                          }
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`font-medium ${
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
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                        >
                          <Trash2 className="w-4 h-4 text-gray-400" />
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

      <Dialog open={showAddItemDialog} onOpenChange={setShowAddItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Item</DialogTitle>
            <DialogDescription>
              Add a new item to your shopping list.
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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="itemUnit">Unit</Label>
                <Input
                  id="itemUnit"
                  value={newItemUnit}
                  onChange={e => setNewItemUnit(e.target.value)}
                  placeholder="e.g., cups, lbs"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="itemCategory">Category *</Label>
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger>
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
            >
              Cancel
            </Button>
            <Button onClick={handleAddItem} disabled={!newItemName.trim() || !newItemCategory}>
              Add Item
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddRecipeDialog} onOpenChange={setShowAddRecipeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Recipe to Shopping List</DialogTitle>
            <DialogDescription>
              Select a recipe to add its ingredients to your shopping list.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipeSelect">Recipe *</Label>
              <Select value={selectedRecipeId} onValueChange={setSelectedRecipeId}>
                <SelectTrigger>
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
            >
              Cancel
            </Button>
            <Button onClick={handleAddRecipe} disabled={!selectedRecipeId}>
              Add Ingredients
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
