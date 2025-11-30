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
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2024-11-20.acacia",
    });

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const signature = req.headers.get("stripe-signature");
    const body = await req.text();

    if (!signature) {
      throw new Error("No signature provided");
    }

    const event = stripe.webhooks.constructEvent(
      body,
      signature,
      Deno.env.get("STRIPE_WEBHOOK_SECRET") || ""
    );

    console.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        const amount = parseInt(session.metadata?.amount || "0");

        if (!userId) {
          throw new Error("No user_id in session metadata");
        }

        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await supabaseAdmin
          .from("subscriptions")
          .update({
            stripe_subscription_id: subscription.id,
            stripe_price_id: subscription.items.data[0].price.id,
            stripe_customer_id: session.customer as string,
            status: "active",
            subscription_type: "regular",
            monthly_amount: amount,
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            billing_cycle_anchor: new Date(subscription.current_period_start * 1000).toISOString(),
            expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        await supabaseAdmin.from("payment_history").insert({
          user_id: userId,
          stripe_payment_intent_id: session.payment_intent as string,
          stripe_invoice_id: subscription.latest_invoice as string,
          stripe_subscription_id: subscription.id,
          amount: amount,
          currency: "usd",
          status: "succeeded",
          event_type: "checkout.session.completed",
        });

        console.log(`Subscription activated for user ${userId}`);
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (existingSub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
              expires_at: new Date(subscription.current_period_end * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          await supabaseAdmin.from("payment_history").insert({
            user_id: existingSub.user_id,
            stripe_payment_intent_id: invoice.payment_intent as string,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            amount: invoice.amount_paid,
            currency: invoice.currency,
            status: "succeeded",
            event_type: "invoice.payment_succeeded",
          });

          console.log(`Payment succeeded for subscription ${subscriptionId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (!subscriptionId) break;

        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscriptionId)
          .maybeSingle();

        if (existingSub) {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "pending_payment",
              updated_at: new Date().toISOString(),
            })
            .eq("stripe_subscription_id", subscriptionId);

          await supabaseAdmin.from("payment_history").insert({
            user_id: existingSub.user_id,
            stripe_invoice_id: invoice.id,
            stripe_subscription_id: subscriptionId,
            amount: invoice.amount_due,
            currency: invoice.currency,
            status: "failed",
            event_type: "invoice.payment_failed",
            failure_reason: invoice.last_finalization_error?.message || "Payment failed",
          });

          console.log(`Payment failed for subscription ${subscriptionId}`);
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;

        const { data: existingSub } = await supabaseAdmin
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", subscription.id)
          .maybeSingle();

        if (existingSub) {
          const updates: any = {
            next_billing_date: new Date(subscription.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          };

          if (subscription.status === "active") {
            updates.status = "active";
          } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
            updates.status = "cancelled";
            updates.cancelled_at = new Date().toISOString();
          }

          await supabaseAdmin
            .from("subscriptions")
            .update(updates)
            .eq("stripe_subscription_id", subscription.id);

          console.log(`Subscription updated: ${subscription.id}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await supabaseAdmin
          .from("subscriptions")
          .update({
            status: "cancelled",
            cancelled_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        console.log(`Subscription cancelled: ${subscription.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error: any) {
    console.error(`Webhook error: ${error.message}`);
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