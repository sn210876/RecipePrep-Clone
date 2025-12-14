import type { DeliveryService } from './deliveryRoutingService';

const AFFILIATE_TAG = 'mealscrape-20';

export interface SearchUrlResult {
  ingredient: string;
  searchUrl: string;
  quantity?: string;
  unit?: string;
}

export interface CheckoutResult {
  mappedItems: Array<{
    name: string;
    asin: string;
    quantity: string;
    unit?: string;
  }>;
  unmappedItems: SearchUrlResult[];
  cartUrl: string | null;
  hasCartItems: boolean;
  hasUnmappedItems: boolean;
}

export function generateAmazonSearchUrl(
  ingredient: string,
  serviceType?: DeliveryService
): string {
  const cleanIngredient = ingredient
    .replace(/\([^)]*\)/g, '')
    .replace(/\[[^\]]*\]/g, '')
    .trim();

  const searchTerm = encodeURIComponent(cleanIngredient);

  let baseUrl = 'https://www.amazon.com/s';
  let params = new URLSearchParams({
    k: cleanIngredient,
    tag: AFFILIATE_TAG,
  });

  if (serviceType === 'amazon_fresh') {
    params.set('i', 'amazonfresh');
  } else if (serviceType === 'amazon_grocery') {
    params.set('i', 'grocery');
  } else if (serviceType === 'whole_foods') {
    params.set('i', 'wholefoods');
  }

  return `${baseUrl}?${params.toString()}`;
}

export function generateBulkSearchUrls(
  ingredients: Array<{ name: string; quantity?: string; unit?: string }>,
  serviceType?: DeliveryService
): SearchUrlResult[] {
  return ingredients.map(item => ({
    ingredient: item.name,
    searchUrl: generateAmazonSearchUrl(item.name, serviceType),
    quantity: item.quantity,
    unit: item.unit,
  }));
}

export function buildAmazonCartUrl(
  items: Array<{ asin: string; quantity?: string | number }>
): string {
  const baseUrl = 'https://www.amazon.com/gp/aws/cart/add.html';
  const params = new URLSearchParams();

  items.forEach((item, index) => {
    const itemNum = index + 1;
    params.append(`ASIN.${itemNum}`, item.asin);
    const quantity = typeof item.quantity === 'string'
      ? parseInt(item.quantity) || 1
      : item.quantity || 1;
    params.append(`Quantity.${itemNum}`, quantity.toString());
  });

  params.append('tag', AFFILIATE_TAG);
  params.append('AssociateTag', AFFILIATE_TAG);

  return `${baseUrl}?${params.toString()}`;
}

export function createCheckoutResult(
  allItems: Array<{
    name: string;
    quantity?: string;
    unit?: string;
    asin?: string | null;
  }>,
  serviceType?: DeliveryService
): CheckoutResult {
  const mappedItems = allItems
    .filter(item => item.asin)
    .map(item => ({
      name: item.name,
      asin: item.asin!,
      quantity: item.quantity || '1',
      unit: item.unit,
    }));

  const unmappedItemsRaw = allItems.filter(item => !item.asin);

  const unmappedItemsMap = new Map<string, {
    ingredient: string;
    searchUrl: string;
    quantities: Array<{ quantity?: string; unit?: string }>;
  }>();

  unmappedItemsRaw.forEach(item => {
    const normalizedName = item.name.toLowerCase().trim();

    if (!unmappedItemsMap.has(normalizedName)) {
      unmappedItemsMap.set(normalizedName, {
        ingredient: item.name,
        searchUrl: generateAmazonSearchUrl(item.name, serviceType),
        quantities: []
      });
    }

    unmappedItemsMap.get(normalizedName)!.quantities.push({
      quantity: item.quantity,
      unit: item.unit
    });
  });

  const unmappedItems = Array.from(unmappedItemsMap.values()).map(item => {
    if (item.quantities.length === 1) {
      return {
        ingredient: item.ingredient,
        searchUrl: item.searchUrl,
        quantity: item.quantities[0].quantity,
        unit: item.quantities[0].unit,
      };
    }

    const totalQuantity = item.quantities.reduce((sum, q) => {
      const qty = parseFloat(q.quantity || '0');
      return sum + (isNaN(qty) ? 0 : qty);
    }, 0);

    const commonUnit = item.quantities[0].unit || '';

    return {
      ingredient: item.ingredient,
      searchUrl: item.searchUrl,
      quantity: totalQuantity > 0 ? totalQuantity.toString() : undefined,
      unit: commonUnit,
    };
  });

  const cartUrl = mappedItems.length > 0
    ? buildAmazonCartUrl(mappedItems)
    : null;

  return {
    mappedItems,
    unmappedItems,
    cartUrl,
    hasCartItems: mappedItems.length > 0,
    hasUnmappedItems: unmappedItems.length > 0,
  };
}
