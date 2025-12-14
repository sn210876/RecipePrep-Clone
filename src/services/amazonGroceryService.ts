import { supabase } from '../lib/supabase';
import type { DeliveryService } from './deliveryRoutingService';

const AFFILIATE_TAG = 'mealscrape-20';
const UTM_SOURCE = 'mealscrape';
const UTM_MEDIUM = 'app';

export interface AmazonServiceConfig {
  id: string;
  serviceType: DeliveryService;
  displayName: string;
  description: string;
  baseUrl: string;
  iconName: string;
  colorClass: string;
  commissionRate: number;
  isActive: boolean;
  sortOrder: number;
}

export interface AmazonServiceAvailability {
  zipCode: string;
  serviceType: DeliveryService;
  isAvailable: boolean;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  estimatedDeliveryTime?: string;
}

export async function getAmazonServiceConfigs(): Promise<AmazonServiceConfig[]> {
  const { data, error } = await supabase
    .from('amazon_service_configs')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    console.error('Error fetching Amazon service configs:', error);
    return [];
  }

  return (data || []).map((config) => ({
    id: config.id,
    serviceType: config.service_type as DeliveryService,
    displayName: config.display_name,
    description: config.description,
    baseUrl: config.base_url,
    iconName: config.icon_name,
    colorClass: config.color_class,
    commissionRate: Number(config.commission_rate),
    isActive: config.is_active,
    sortOrder: config.sort_order,
  }));
}

export async function getAmazonServiceConfig(
  serviceType: DeliveryService
): Promise<AmazonServiceConfig | null> {
  const { data, error } = await supabase
    .from('amazon_service_configs')
    .select('*')
    .eq('service_type', serviceType)
    .eq('is_active', true)
    .maybeSingle();

  if (error || !data) {
    console.error('Error fetching Amazon service config:', error);
    return null;
  }

  return {
    id: data.id,
    serviceType: data.service_type as DeliveryService,
    displayName: data.display_name,
    description: data.description,
    baseUrl: data.base_url,
    iconName: data.icon_name,
    colorClass: data.color_class,
    commissionRate: Number(data.commission_rate),
    isActive: data.is_active,
    sortOrder: data.sort_order,
  };
}

export function buildAmazonDeepLink(
  serviceType: DeliveryService,
  baseUrl?: string,
  additionalParams?: Record<string, string>
): string {
  const configs: Record<DeliveryService, string> = {
    amazon_fresh: 'https://www.amazon.com/alm/storefront?almBrandId=QW1hem9uIEZyZXNo',
    amazon_grocery: 'https://www.amazon.com/Amazon-Grocery/b?node=16318821',
    whole_foods: 'https://www.amazon.com/fmc/m/20220601?almBrandId=VUZHIHdob2xlZm9vZHM%3D',
    amazon: 'https://www.amazon.com',
    instacart: '',
    manual: '',
  };

  const url = baseUrl || configs[serviceType] || configs.amazon;

  if (!url) {
    return '';
  }

  try {
    const urlObj = new URL(url);

    urlObj.searchParams.set('tag', AFFILIATE_TAG);
    urlObj.searchParams.set('utm_source', UTM_SOURCE);
    urlObj.searchParams.set('utm_medium', UTM_MEDIUM);
    urlObj.searchParams.set('utm_campaign', serviceType);

    if (additionalParams) {
      Object.entries(additionalParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, value);
      });
    }

    return urlObj.toString();
  } catch {
    return `${url}?tag=${AFFILIATE_TAG}&utm_source=${UTM_SOURCE}&utm_medium=${UTM_MEDIUM}`;
  }
}

export async function trackAmazonServiceClick(
  userId: string,
  serviceType: DeliveryService,
  itemCount: number,
  estimatedValue?: number,
  recipeId?: string
): Promise<void> {
  const { error } = await supabase.from('amazon_service_clicks').insert({
    user_id: userId,
    service_type: serviceType,
    item_count: itemCount,
    estimated_value: estimatedValue || null,
    recipe_id: recipeId || null,
    clicked_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Error tracking Amazon service click:', error);
  }
}

export async function checkServiceAvailability(
  zipCode: string,
  serviceType: DeliveryService
): Promise<AmazonServiceAvailability | null> {
  const { data, error } = await supabase
    .from('amazon_service_availability')
    .select('*')
    .eq('zip_code', zipCode)
    .eq('service_type', serviceType)
    .maybeSingle();

  if (error) {
    console.error('Error checking service availability:', error);
    return null;
  }

  if (!data) {
    return null;
  }

  return {
    zipCode: data.zip_code,
    serviceType: data.service_type as DeliveryService,
    isAvailable: data.is_available,
    deliveryAvailable: data.delivery_available,
    pickupAvailable: data.pickup_available,
    estimatedDeliveryTime: data.estimated_delivery_time,
  };
}

export async function updateServiceAvailability(
  zipCode: string,
  serviceType: DeliveryService,
  availability: Partial<AmazonServiceAvailability>
): Promise<void> {
  const { error } = await supabase.from('amazon_service_availability').upsert({
    zip_code: zipCode,
    service_type: serviceType,
    is_available: availability.isAvailable ?? false,
    delivery_available: availability.deliveryAvailable ?? false,
    pickup_available: availability.pickupAvailable ?? false,
    estimated_delivery_time: availability.estimatedDeliveryTime || null,
    last_checked: new Date().toISOString(),
  });

  if (error) {
    console.error('Error updating service availability:', error);
    throw error;
  }
}

export function getServiceIcon(serviceType: DeliveryService): string {
  const icons: Record<DeliveryService, string> = {
    amazon_fresh: 'Leaf',
    amazon_grocery: 'Package',
    whole_foods: 'ShoppingBag',
    amazon: 'Package',
    instacart: 'ShoppingBag',
    manual: 'Settings',
  };

  return icons[serviceType] || 'Package';
}

export function getServiceColor(serviceType: DeliveryService): string {
  const colors: Record<DeliveryService, string> = {
    amazon_fresh: 'text-green-600',
    amazon_grocery: 'text-orange-600',
    whole_foods: 'text-emerald-600',
    amazon: 'text-orange-600',
    instacart: 'text-green-600',
    manual: 'text-gray-600',
  };

  return colors[serviceType] || 'text-gray-600';
}

export function getServiceBackgroundColor(serviceType: DeliveryService): string {
  const colors: Record<DeliveryService, string> = {
    amazon_fresh: 'bg-green-50',
    amazon_grocery: 'bg-orange-50',
    whole_foods: 'bg-emerald-50',
    amazon: 'bg-orange-50',
    instacart: 'bg-green-50',
    manual: 'bg-gray-50',
  };

  return colors[serviceType] || 'bg-gray-50';
}
