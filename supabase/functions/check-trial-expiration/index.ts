import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const now = new Date().toISOString();

    // Find all subscriptions with expired trials that are still marked as active
    const { data: expiredTrials, error: queryError } = await supabase
      .from("subscriptions")
      .select("id, user_id, subscription_type, trial_ends_at")
      .eq("subscription_type", "early_bird")
      .eq("status", "active")
      .lt("trial_ends_at", now);

    if (queryError) {
      console.error("Error querying expired trials:", queryError);
      throw queryError;
    }

    if (!expiredTrials || expiredTrials.length === 0) {
      return new Response(
        JSON.stringify({
          message: "No expired trials found",
          processed: 0,
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Update all expired trials to 'expired' status
    const { data: updated, error: updateError } = await supabase
      .from("subscriptions")
      .update({ status: "expired", updated_at: now })
      .in(
        "id",
        expiredTrials.map((t) => t.id)
      )
      .select();

    if (updateError) {
      console.error("Error updating expired trials:", updateError);
      throw updateError;
    }

    console.log(`Processed ${expiredTrials.length} expired trials`);

    // TODO: Send email notifications to users with expired trials
    // This would integrate with an email service like SendGrid or Resend

    return new Response(
      JSON.stringify({
        message: "Trial expiration check completed",
        processed: expiredTrials.length,
        userIds: expiredTrials.map((t) => t.user_id),
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Error in check-trial-expiration:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
