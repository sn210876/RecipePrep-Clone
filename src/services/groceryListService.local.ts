import { Recipe } from '../types/recipe';
import {
  parseQuantity,
  normalizeUnit,
  canConvertUnits,
  convertToBaseUnit,
  getUnitInfo,
  getBestDisplayUnit,
} from '../lib/unitConversion';

export interface GroceryListCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface GroceryListItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  categoryId: string;
  checked: boolean;
  sourceRecipeIds: string[];
}

const DEFAULT_CATEGORIES = [
  { name: 'Produce', sortOrder: 0 },
  { name: 'Meat & Seafood', sortOrder: 1 },
  { name: 'Dairy & Eggs', sortOrder: 2 },
  { name: 'Bakery', sortOrder: 3 },
  { name: 'Pantry', sortOrder: 4 },
  { name: 'Frozen', sortOrder: 5 },
  { name: 'Beverages', sortOrder: 6 },
  { name: 'Other', sortOrder: 7 },
];

const INGREDIENT_CATEGORY_MAP: Record<string, string> = {
  'tomato': 'Produce',
  'tomatoes': 'Produce',
  'onion': 'Produce',
  'onions': 'Produce',
  'garlic': 'Produce',
  'carrot': 'Produce',
  'carrots': 'Produce',
  'potato': 'Produce',
  'potatoes': 'Produce',
  'lettuce': 'Produce',
  'spinach': 'Produce',
  'broccoli': 'Produce',
  'bell pepper': 'Produce',
  'peppers': 'Produce',
  'mushroom': 'Produce',
  'mushrooms': 'Produce',
  'cucumber': 'Produce',
  'zucchini': 'Produce',
  'apple': 'Produce',
  'apples': 'Produce',
  'banana': 'Produce',
  'bananas': 'Produce',
  'lemon': 'Produce',
  'lemons': 'Produce',
  'lime': 'Produce',
  'limes': 'Produce',
  'avocado': 'Produce',
  'cilantro': 'Produce',
  'parsley': 'Produce',
  'basil': 'Produce',

  'chicken': 'Meat & Seafood',
  'beef': 'Meat & Seafood',
  'pork': 'Meat & Seafood',
  'turkey': 'Meat & Seafood',
  'salmon': 'Meat & Seafood',
  'shrimp': 'Meat & Seafood',
  'fish': 'Meat & Seafood',
  'bacon': 'Meat & Seafood',
  'sausage': 'Meat & Seafood',
  'ground beef': 'Meat & Seafood',

  'milk': 'Dairy & Eggs',
  'cheese': 'Dairy & Eggs',
  'butter': 'Dairy & Eggs',
  'eggs': 'Dairy & Eggs',
  'egg': 'Dairy & Eggs',
  'yogurt': 'Dairy & Eggs',
  'cream': 'Dairy & Eggs',
  'sour cream': 'Dairy & Eggs',
  'cheddar': 'Dairy & Eggs',
  'mozzarella': 'Dairy & Eggs',
  'parmesan': 'Dairy & Eggs',

  'bread': 'Bakery',
  'tortilla': 'Bakery',
  'tortillas': 'Bakery',
  'buns': 'Bakery',
  'rolls': 'Bakery',
  'bagels': 'Bakery',
  'croissant': 'Bakery',

  'rice': 'Pantry',
  'pasta': 'Pantry',
  'flour': 'Pantry',
  'sugar': 'Pantry',
  'salt': 'Pantry',
  'pepper': 'Pantry',
  'oil': 'Pantry',
  'olive oil': 'Pantry',
  'vegetable oil': 'Pantry',
  'vinegar': 'Pantry',
  'soy sauce': 'Pantry',
  'beans': 'Pantry',
  'chickpeas': 'Pantry',
  'lentils': 'Pantry',
  'tomato sauce': 'Pantry',
  'tomato paste': 'Pantry',
  'broth': 'Pantry',
  'stock': 'Pantry',
  'honey': 'Pantry',
  'peanut butter': 'Pantry',
  'canned tomatoes': 'Pantry',

  'ice cream': 'Frozen',
  'frozen vegetables': 'Frozen',
  'frozen peas': 'Frozen',
  'frozen corn': 'Frozen',

  'water': 'Beverages',
  'juice': 'Beverages',
  'coffee': 'Beverages',
  'tea': 'Beverages',
  'soda': 'Beverages',
};

function normalizeIngredientName(name: string): string {
  return name.toLowerCase().trim()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '');
}

function getCategoryForIngredient(ingredientName: string, categories: ShoppingListCategory[]): string {
  const normalized = normalizeIngredientName(ingredientName);

  for (const [key, categoryName] of Object.entries(INGREDIENT_CATEGORY_MAP)) {
    if (normalized.includes(key)) {
      const category = categories.find(c => c.name === categoryName);
      if (category) return category.id;
    }
  }

  const otherCategory = categories.find(c => c.name === 'Other');
  return otherCategory?.id || categories[0]?.id || '';
}

export function getDefaultCategories(): ShoppingListCategory[] {
  return DEFAULT_CATEGORIES.map((cat, idx) => ({
    id: `cat-${idx}`,
    name: cat.name,
    sortOrder: cat.sortOrder,
  }));
}

export function consolidateShoppingListItems(
  mealPlans: Array<{ recipeId: string; servings: number }>,
  recipes: Recipe[]
): ShoppingListItem[] {
  const categories = getDefaultCategories();
  const itemMap = new Map<string, ShoppingListItem>();

  for (const mealPlan of mealPlans) {
    const recipe = recipes.find(r => r.id === mealPlan.recipeId);
    if (!recipe) continue;

    const servingMultiplier = mealPlan.servings / recipe.servings;

    for (const ingredient of recipe.ingredients) {
      const quantity = parseQuantity(ingredient.quantity) * servingMultiplier;
      const normalizedName = normalizeIngredientName(ingredient.name);
      const key = `${normalizedName}-${normalizeUnit(ingredient.unit)}`;

      const existingItem = itemMap.get(key);

      if (existingItem) {
        if (canConvertUnits(existingItem.unit, ingredient.unit)) {
          const baseQuantity = convertToBaseUnit(existingItem.quantity, existingItem.unit) || 0;
          const addedBaseQuantity = convertToBaseUnit(quantity, ingredient.unit) || 0;
          const totalBaseQuantity = baseQuantity + addedBaseQuantity;

          const unitInfo = getUnitInfo(existingItem.unit);
          if (unitInfo) {
            const bestDisplay = getBestDisplayUnit(totalBaseQuantity, unitInfo.type);
            existingItem.quantity = bestDisplay.quantity;
            existingItem.unit = bestDisplay.unit;
          }
        } else {
          existingItem.quantity += quantity;
        }

        if (!existingItem.sourceRecipeIds.includes(recipe.id)) {
          existingItem.sourceRecipeIds.push(recipe.id);
        }
      } else {
        const categoryId = getCategoryForIngredient(ingredient.name, categories);
        const newItem: ShoppingListItem = {
          id: `item-${Date.now()}-${Math.random()}`,
          name: ingredient.name,
          quantity,
          unit: ingredient.unit,
          categoryId,
          checked: false,
          sourceRecipeIds: [recipe.id],
        };
        itemMap.set(key, newItem);
      }
    }
  }

  return Array.from(itemMap.values());
}
