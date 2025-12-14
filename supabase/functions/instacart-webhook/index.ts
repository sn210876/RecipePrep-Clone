import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js@2.58.0';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface InstacartWebhookEvent {
  event_type: 'order.completed' | 'order.cancelled' | 'user.signup';
  order_id?: string;
  user_id?: string;
  tracking_id?: string;
  order_total?: number;
  commission_amount?: number;
  commission_rate?: number;
  timestamp: string;
  metadata?: any;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        {
          status: 405,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const webhookEvent: InstacartWebhookEvent = await req.json();

    console.log('Received Instacart webhook:', webhookEvent);

    switch (webhookEvent.event_type) {
      case 'order.completed':
        await handleOrderCompleted(supabase, webhookEvent);
        break;

      case 'order.cancelled':
        await handleOrderCancelled(supabase, webhookEvent);
        break;

      case 'user.signup':
        await handleUserSignup(supabase, webhookEvent);
        break;

      default:
        console.log('Unknown event type:', webhookEvent.event_type);
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Error processing webhook:', error);

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

async function handleOrderCompleted(supabase: any, event: InstacartWebhookEvent) {
  const { order_id, user_id, tracking_id, order_total, commission_amount, commission_rate } = event;

  const { error: conversionError } = await supabase
    .from('affiliate_conversions')
    .insert({
      user_id: user_id || null,
      service_name: 'instacart',
      order_id,
      conversion_type: 'order',
      order_total: order_total || 0,
      commission_amount: commission_amount || 0,
      commission_rate: commission_rate || 0,
      tracking_id,
      status: 'confirmed',
      conversion_date: new Date().toISOString(),
      metadata: event.metadata || {},
    });

  if (conversionError) {
    console.error('Error inserting conversion:', conversionError);
    throw conversionError;
  }

  if (order_id) {
    const { error: orderError } = await supabase
      .from('delivery_orders')
      .update({
        order_status: 'delivered',
        updated_at: new Date().toISOString(),
      })
      .eq('external_order_id', order_id);

    if (orderError) {
      console.error('Error updating order status:', orderError);
    }
  }

  console.log('Order completed processed:', order_id);
}

async function handleOrderCancelled(supabase: any, event: InstacartWebhookEvent) {
  const { order_id } = event;

  if (!order_id) return;

  const { error } = await supabase
    .from('delivery_orders')
    .update({
      order_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('external_order_id', order_id);

  if (error) {
    console.error('Error updating cancelled order:', error);
    throw error;
  }

  console.log('Order cancelled processed:', order_id);
}

async function handleUserSignup(supabase: any, event: InstacartWebhookEvent) {
  const { user_id, tracking_id } = event;

  const { error } = await supabase
    .from('affiliate_conversions')
    .insert({
      user_id: user_id || null,
      service_name: 'instacart',
      conversion_type: 'signup',
      tracking_id,
      status: 'confirmed',
      conversion_date: new Date().toISOString(),
      metadata: event.metadata || {},
    });

  if (error) {
    console.error('Error inserting signup conversion:', error);
    throw error;
  }

  console.log('User signup processed:', user_id);
}
