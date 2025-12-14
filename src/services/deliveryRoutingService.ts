import { supabase } from '../lib/supabase';
import type { GroceryListItem } from '../types/recipe';

export type DeliveryService = 'instacart' | 'amazon' | 'manual';

export interface RoutedItem extends GroceryListItem {
  recommendedService: DeliveryService;
  category: string;
  freshnessPriority: number;
  confidenceScore: number;
  reasoning?: string;
}

export interface UserDeliveryPreferences {
  id?: string;
  userId: string;
  defaultService: DeliveryService | 'auto';
  deliveryAddress: any;
  deliveryInstructions?: string;
  preferredDeliveryWindow?: string;
  autoRouteFreshItems: boolean;
  autoRoutePantryItems: boolean;
  enableCostOptimization: boolean;
}

const FRESH_KEYWORDS = [
  'fresh', 'organic', 'produce', 'vegetable', 'fruit', 'greens',
  'lettuce', 'tomato', 'cucumber', 'carrot', 'onion', 'garlic',
  'bell pepper', 'mushroom', 'spinach', 'kale', 'broccoli', 'cauliflower'
];

const MEAT_KEYWORDS = [
  'chicken', 'beef', 'pork', 'turkey', 'lamb', 'fish', 'salmon',
  'shrimp', 'meat', 'steak', 'ground', 'breast', 'thigh', 'tenderloin'
];

const DAIRY_KEYWORDS = [
  'milk', 'cheese', 'yogurt', 'butter', 'cream', 'sour cream',
  'cottage cheese', 'mozzarella', 'cheddar', 'parmesan', 'eggs'
];

const PANTRY_KEYWORDS = [
  'rice', 'pasta', 'flour', 'sugar', 'salt', 'pepper', 'oil',
  'vinegar', 'sauce', 'canned', 'dried', 'spice', 'seasoning',
  'baking powder', 'baking soda', 'vanilla extract'
];

const FROZEN_KEYWORDS = [
  'frozen', 'ice cream', 'popsicle', 'frozen peas', 'frozen corn',
  'frozen berries', 'frozen vegetables'
];

function categorizeIngredient(ingredientName: string): {
  category: string;
  freshnessPriority: number;
  recommendedService: DeliveryService;
} {
  const nameLower = ingredientName.toLowerCase();

  if (FRESH_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
    return {
      category: 'fresh_produce',
      freshnessPriority: 10,
      recommendedService: 'instacart',
    };
  }

  if (MEAT_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
    return {
      category: 'meat',
      freshnessPriority: 10,
      recommendedService: 'instacart',
    };
  }

  if (DAIRY_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
    return {
      category: 'dairy',
      freshnessPriority: 9,
      recommendedService: 'instacart',
    };
  }

  if (FROZEN_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
    return {
      category: 'frozen',
      freshnessPriority: 6,
      recommendedService: 'instacart',
    };
  }

  if (PANTRY_KEYWORDS.some(keyword => nameLower.includes(keyword))) {
    return {
      category: 'pantry',
      freshnessPriority: 2,
      recommendedService: 'amazon',
    };
  }

  return {
    category: 'other',
    freshnessPriority: 5,
    recommendedService: 'amazon',
  };
}

export async function getIngredientRoutingRule(ingredientName: string) {
  const { data, error } = await supabase
    .from('ingredient_delivery_routing')
    .select('*')
    .eq('ingredient_name', ingredientName.toLowerCase().trim())
    .maybeSingle();

  if (error) {
    console.error('Error fetching routing rule:', error);
    return null;
  }

  return data;
}

export async function routeGroceryItems(
  items: GroceryListItem[],
  userId: string
): Promise<{
  instacartItems: RoutedItem[];
  amazonItems: RoutedItem[];
  manualItems: RoutedItem[];
}> {
  const preferences = await getUserDeliveryPreferences(userId);

  const routedItems: RoutedItem[] = await Promise.all(
    items.map(async (item) => {
      const dbRule = await getIngredientRoutingRule(item.name);

      if (dbRule) {
        return {
          ...item,
          recommendedService: dbRule.recommended_service as DeliveryService,
          category: dbRule.category,
          freshnessPriority: dbRule.freshness_priority,
          confidenceScore: Number(dbRule.confidence_score),
          reasoning: 'Database rule match',
        };
      }

      const autoCategory = categorizeIngredient(item.name);
      let service = autoCategory.recommendedService;

      if (preferences?.defaultService !== 'auto') {
        service = preferences.defaultService as DeliveryService;
      }

      if (!preferences?.autoRouteFreshItems && autoCategory.freshnessPriority >= 8) {
        service = 'manual';
      }

      if (!preferences?.autoRoutePantryItems && autoCategory.freshnessPriority <= 3) {
        service = 'manual';
      }

      return {
        ...item,
        recommendedService: service,
        category: autoCategory.category,
        freshnessPriority: autoCategory.freshnessPriority,
        confidenceScore: 0.7,
        reasoning: 'Auto-categorized',
      };
    })
  );

  return {
    instacartItems: routedItems.filter(item => item.recommendedService === 'instacart'),
    amazonItems: routedItems.filter(item => item.recommendedService === 'amazon'),
    manualItems: routedItems.filter(item => item.recommendedService === 'manual'),
  };
}

export async function getUserDeliveryPreferences(
  userId: string
): Promise<UserDeliveryPreferences | null> {
  const { data, error } = await supabase
    .from('user_delivery_preferences')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching delivery preferences:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    defaultService: data.default_service,
    deliveryAddress: data.delivery_address,
    deliveryInstructions: data.delivery_instructions,
    preferredDeliveryWindow: data.preferred_delivery_window,
    autoRouteFreshItems: data.auto_route_fresh_items,
    autoRoutePantryItems: data.auto_route_pantry_items,
    enableCostOptimization: data.enable_cost_optimization,
  };
}

export async function saveUserDeliveryPreferences(
  preferences: UserDeliveryPreferences
): Promise<void> {
  const { error } = await supabase
    .from('user_delivery_preferences')
    .upsert({
      user_id: preferences.userId,
      default_service: preferences.defaultService,
      delivery_address: preferences.deliveryAddress,
      delivery_instructions: preferences.deliveryInstructions || '',
      preferred_delivery_window: preferences.preferredDeliveryWindow || '',
      auto_route_fresh_items: preferences.autoRouteFreshItems,
      auto_route_pantry_items: preferences.autoRoutePantryItems,
      enable_cost_optimization: preferences.enableCostOptimization,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error saving delivery preferences:', error);
    throw error;
  }
}

export async function addIngredientRoutingRule(
  ingredientName: string,
  category: string,
  recommendedService: DeliveryService,
  freshnessPriority: number,
  confidenceScore: number
): Promise<void> {
  const { error } = await supabase
    .from('ingredient_delivery_routing')
    .upsert({
      ingredient_name: ingredientName.toLowerCase().trim(),
      category,
      recommended_service: recommendedService,
      freshness_priority: freshnessPriority,
      confidence_score: confidenceScore,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    console.error('Error adding routing rule:', error);
    throw error;
  }
}

export function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    fresh_produce: '🥬',
    meat: '🥩',
    dairy: '🥛',
    pantry: '🏺',
    frozen: '❄️',
    other: '📦',
  };

  return icons[category] || '📦';
}

export function getServiceBadgeColor(service: DeliveryService): string {
  const colors: Record<DeliveryService, string> = {
    instacart: 'bg-green-100 text-green-800',
    amazon: 'bg-orange-100 text-orange-800',
    manual: 'bg-gray-100 text-gray-800',
  };

  return colors[service];
}

export function getServiceDisplayName(service: DeliveryService): string {
  const names: Record<DeliveryService, string> = {
    instacart: 'Instacart',
    amazon: 'Amazon',
    manual: 'Choose Service',
  };

  return names[service];
}
