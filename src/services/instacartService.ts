import { supabase } from '../lib/supabase';

export interface InstacartProduct {
  id: string;
  name: string;
  price: number;
  image_url: string;
  brand?: string;
  size?: string;
  unit?: string;
  availability: boolean;
  store_id?: string;
}

export interface InstacartCartItem {
  product_id: string;
  quantity: number;
  unit?: string;
}

export interface InstacartShoppingListItem {
  name: string;
  quantity: number;
  unit?: string;
}

export interface InstacartShoppingListResponse {
  products_link_url: string;
}

export interface InstacartCheckoutSession {
  session_id: string;
  checkout_url: string;
  expires_at: string;
}

export interface InstacartOrderStatus {
  order_id: string;
  status: 'pending' | 'confirmed' | 'shopping' | 'out_for_delivery' | 'delivered' | 'cancelled';
  estimated_delivery: string;
  tracking_url?: string;
}

export interface DeliveryAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
  apt?: string;
}

const INSTACART_API_ENDPOINT = 'https://connect.instacart.com/idp/v1/products/products_link';
const INSTACART_API_BASE = 'https://api.instacart.com/v2';

async function getInstacartConfig() {
  const { data, error } = await supabase
    .from('delivery_service_configs')
    .select('*')
    .eq('service_name', 'instacart')
    .single();

  if (error || !data) {
    throw new Error('Instacart configuration not found');
  }

  return data;
}

export async function isInstacartEnabled(): Promise<boolean> {
  try {
    const config = await getInstacartConfig();
    return config.is_active;
  } catch {
    return false;
  }
}

export async function searchInstacartProducts(
  query: string,
  zipCode?: string
): Promise<InstacartProduct[]> {
  try {
    const config = await getInstacartConfig();

    if (!config.api_key) {
      throw new Error('Instacart API key not configured');
    }

    const params = new URLSearchParams({
      query,
      ...(zipCode && { zip_code: zipCode }),
    });

    const response = await fetch(
      `${INSTACART_API_BASE}/catalog/search?${params}`,
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to search Instacart products');
    }

    const data = await response.json();
    return data.products || [];
  } catch (error) {
    console.error('Error searching Instacart products:', error);
    return [];
  }
}

function createInstacartStorefrontUrl(items: InstacartShoppingListItem[], affiliateTag: string): string {
  const baseUrl = 'https://www.instacart.com/store/search';
  const searchQuery = items.map(item => {
    const qty = item.quantity > 1 ? `${item.quantity} ` : '';
    const unit = item.unit ? ` ${item.unit}` : '';
    return `${qty}${item.name}${unit}`;
  }).join(', ');

  const params = new URLSearchParams({
    q: searchQuery,
    ref: affiliateTag || 'mealscrape'
  });

  return `${baseUrl}?${params.toString()}`;
}

export async function createInstacartShoppingList(
  items: InstacartShoppingListItem[],
  userId: string,
  deliveryAddress?: DeliveryAddress
): Promise<InstacartShoppingListResponse> {
  try {
    const config = await getInstacartConfig();
    const trackingId = `${userId}-${Date.now()}`;

    console.log('[Instacart] Creating shopping list with', items.length, 'items');

    if (!config.api_key || config.api_key.length < 20) {
      console.log('[Instacart] No valid API key, using storefront URL fallback');
      const storefrontUrl = createInstacartStorefrontUrl(items, config.affiliate_tag || 'mealscrape');

      await supabase.from('affiliate_conversions').insert({
        user_id: userId,
        service_name: 'instacart',
        conversion_type: 'cart_created',
        tracking_id: trackingId,
        status: 'pending',
        metadata: {
          products_link_url: storefrontUrl,
          item_count: items.length,
          method: 'storefront_fallback'
        },
      });

      if (deliveryAddress) {
        await saveDeliveryOrder(
          userId,
          'instacart',
          items,
          deliveryAddress,
          trackingId
        );
      }

      return {
        products_link_url: storefrontUrl
      };
    }

    const requestBody = {
      title: 'My Shopping List from MealScrape',
      line_items: items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        unit: item.unit || ''
      })),
      landing_page_configuration: {
        partner_linkback_url: 'https://mealscrapeapp.com'
      }
    };

    console.log('[Instacart] Using API with request body:', JSON.stringify(requestBody, null, 2));

    const response = await fetch(INSTACART_API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    console.log('[Instacart] Response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.error('[Instacart] API error:', response.status, errorText);
      console.log('[Instacart] Falling back to storefront URL');

      const storefrontUrl = createInstacartStorefrontUrl(items, config.affiliate_tag || 'mealscrape');

      await supabase.from('affiliate_conversions').insert({
        user_id: userId,
        service_name: 'instacart',
        conversion_type: 'cart_created',
        tracking_id: trackingId,
        status: 'pending',
        metadata: {
          products_link_url: storefrontUrl,
          item_count: items.length,
          method: 'storefront_fallback',
          api_error: errorText
        },
      });

      if (deliveryAddress) {
        await saveDeliveryOrder(
          userId,
          'instacart',
          items,
          deliveryAddress,
          trackingId
        );
      }

      return {
        products_link_url: storefrontUrl
      };
    }

    const data = await response.json();
    console.log('[Instacart] Response data:', data);

    if (!data.products_link_url) {
      throw new Error('No products link URL returned from Instacart');
    }

    await supabase.from('affiliate_conversions').insert({
      user_id: userId,
      service_name: 'instacart',
      conversion_type: 'cart_created',
      tracking_id: trackingId,
      status: 'pending',
      metadata: {
        products_link_url: data.products_link_url,
        item_count: items.length,
        method: 'api'
      },
    });

    if (deliveryAddress) {
      await saveDeliveryOrder(
        userId,
        'instacart',
        items,
        deliveryAddress,
        trackingId
      );
    }

    return {
      products_link_url: appendAffiliateTracking(data.products_link_url, trackingId)
    };
  } catch (error) {
    console.error('[Instacart] Error creating shopping list:', error);
    throw error;
  }
}

export async function createInstacartCart(
  items: InstacartCartItem[],
  userId: string,
  deliveryAddress: DeliveryAddress
): Promise<InstacartCheckoutSession> {
  try {
    const config = await getInstacartConfig();

    if (!config.api_key) {
      throw new Error('Instacart API key not configured');
    }

    const affiliateTag = config.affiliate_tag || 'mealscrape';
    const trackingId = `${userId}-${Date.now()}`;

    const response = await fetch(`${INSTACART_API_BASE}/checkout/sessions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items,
        delivery_address: deliveryAddress,
        partner_metadata: {
          affiliate_tag: affiliateTag,
          tracking_id: trackingId,
          source: 'mealscrape_app',
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create Instacart checkout session');
    }

    const data = await response.json();

    await supabase.from('affiliate_conversions').insert({
      user_id: userId,
      service_name: 'instacart',
      conversion_type: 'cart_created',
      tracking_id: trackingId,
      status: 'pending',
      metadata: { session_id: data.session_id },
    });

    return {
      session_id: data.session_id,
      checkout_url: appendAffiliateTracking(data.checkout_url, trackingId),
      expires_at: data.expires_at,
    };
  } catch (error) {
    console.error('Error creating Instacart cart:', error);
    throw error;
  }
}

function appendAffiliateTracking(url: string, trackingId: string): string {
  try {
    const urlObj = new URL(url);
    urlObj.searchParams.set('utm_source', 'mealscrape');
    urlObj.searchParams.set('utm_medium', 'affiliate');
    urlObj.searchParams.set('tracking_id', trackingId);
    return urlObj.toString();
  } catch {
    return url;
  }
}

export async function getInstacartOrderStatus(
  orderId: string
): Promise<InstacartOrderStatus> {
  try {
    const config = await getInstacartConfig();

    if (!config.api_key) {
      throw new Error('Instacart API key not configured');
    }

    const response = await fetch(
      `${INSTACART_API_BASE}/orders/${orderId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.api_key}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error('Failed to fetch order status');
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching order status:', error);
    throw error;
  }
}

export async function handleInstacartWebhook(
  event: string,
  data: any
): Promise<void> {
  try {
    if (event === 'order.completed') {
      const { order_id, user_id, total, tracking_id } = data;

      await supabase.from('affiliate_conversions').insert({
        user_id,
        service_name: 'instacart',
        order_id,
        conversion_type: 'order',
        order_total: total,
        tracking_id,
        status: 'confirmed',
        conversion_date: new Date().toISOString(),
      });

      await supabase
        .from('delivery_orders')
        .update({
          order_status: 'delivered',
          updated_at: new Date().toISOString(),
        })
        .eq('external_order_id', order_id);
    }
  } catch (error) {
    console.error('Error handling Instacart webhook:', error);
    throw error;
  }
}

export async function saveDeliveryOrder(
  userId: string,
  serviceName: string,
  cartSnapshot: any[],
  deliveryAddress: DeliveryAddress,
  externalOrderId?: string
): Promise<string> {
  const { data, error } = await supabase
    .from('delivery_orders')
    .insert({
      user_id: userId,
      service_name: serviceName,
      external_order_id: externalOrderId,
      cart_snapshot: cartSnapshot,
      order_status: 'pending',
      delivery_address: deliveryAddress,
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error saving delivery order:', error);
    throw error;
  }

  return data.id;
}

export async function getUserDeliveryOrders(userId: string) {
  const { data, error } = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching delivery orders:', error);
    throw error;
  }

  return data || [];
}

export async function getAffiliateConversions(userId?: string) {
  let query = supabase
    .from('affiliate_conversions')
    .select('*')
    .order('created_at', { ascending: false });

  if (userId) {
    query = query.eq('user_id', userId);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching affiliate conversions:', error);
    throw error;
  }

  return data || [];
}
