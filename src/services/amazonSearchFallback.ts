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

  const unmappedItems = allItems
    .filter(item => !item.asin)
    .map(item => ({
      ingredient: item.name,
      searchUrl: generateAmazonSearchUrl(item.name, serviceType),
      quantity: item.quantity,
      unit: item.unit,
    }));

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
