import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@17.4.0";
import { createClient } from "npm:@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    console.log('[create-checkout-session] Starting...');

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2024-11-20.acacia",
    });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error("Not authenticated");
    }

    console.log('[create-checkout-session] User authenticated:', user.id);

    const { amount } = await req.json();

    if (!amount || amount < 100) {
      throw new Error("Amount must be at least $1.00 (100 cents)");
    }

    console.log('[create-checkout-session] Amount:', amount);

    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    console.log('[create-checkout-session] Profile email:', profile?.email);

    const { data: subscription } = await supabaseClient
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log('[create-checkout-session] Existing customer ID:', subscription?.stripe_customer_id);

    let customerId = subscription?.stripe_customer_id;

    if (!customerId) {
      console.log('[create-checkout-session] Creating new Stripe customer...');
      const customer = await stripe.customers.create({
        email: profile?.email || user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;
      console.log('[create-checkout-session] Created customer:', customerId);

      await supabaseClient
        .from("subscriptions")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    const price = await stripe.prices.create({
      currency: "usd",
      unit_amount: amount,
      recurring: { interval: "month" },
      product_data: {
        name: "MealScrape Monthly Subscription",
        description: `Pay what you want - $${(amount / 100).toFixed(2)}/month`,
      },
    });

    console.log('[create-checkout-session] Creating checkout session...');
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      line_items: [
        {
          price: price.id,
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${req.headers.get("origin")}/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.headers.get("origin")}/subscription`,
      metadata: {
        user_id: user.id,
        amount: amount.toString(),
      },
    });

    console.log('[create-checkout-session] Session created:', session.id);

    return new Response(
      JSON.stringify({ url: session.url }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error('[create-checkout-session] Error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});