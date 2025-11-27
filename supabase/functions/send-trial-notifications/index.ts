import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const ADMIN_USER_ID = "d298f0c2-8748-4a0a-bb0c-9c8605595c58";
const GRACE_PERIOD_DAYS = 3;

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

    console.log("[send-trial-notifications] Starting notification check");
    console.log("[send-trial-notifications] Admin ID:", ADMIN_USER_ID);

    const now = new Date();
    const results = {
      emailsSent: 0,
      dmsSent: 0,
      errors: [] as string[],
    };

    // Get all early bird subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, trial_ends_at")
      .eq("subscription_type", "early_bird");

    if (subError) {
      console.error("[send-trial-notifications] Error fetching subscriptions:", subError);
      throw subError;
    }

    console.log(`[send-trial-notifications] Found ${subscriptions?.length || 0} subscriptions`);

    for (const sub of subscriptions || []) {
      const trialEndsAt = new Date(sub.trial_ends_at);
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`[send-trial-notifications] User ${sub.user_id}: ${daysRemaining} days remaining`);

      // Send notifications for:
      // - Days 7 through 1 before expiration
      // - Day 0 (expiration day)
      // - Days -1 through -3 (grace period - 3 DAYS)
      // - Day -4 and beyond (access blocked)

      const shouldNotify = (
        (daysRemaining >= 1 && daysRemaining <= 7) || // 7 days countdown
        (daysRemaining === 0) ||                      // Expiration day
        (daysRemaining >= -GRACE_PERIOD_DAYS && daysRemaining < 0) || // Grace period (3 days)
        (daysRemaining === -(GRACE_PERIOD_DAYS + 1))  // First day of blocked access
      );

      if (!shouldNotify) {
        console.log(`[send-trial-notifications] Skipping user ${sub.user_id} - no notification needed`);
        continue;
      }

      // Check if notification already sent today
      const { data: alreadySent } = await supabase.rpc(
        "was_notification_sent_today",
        {
          p_user_id: sub.user_id,
          p_type: "dm",
          p_category: getNotificationCategory(daysRemaining),
          p_days_until: daysRemaining,
        }
      );

      if (alreadySent) {
        console.log(`[send-trial-notifications] Notification already sent today for user ${sub.user_id}`);
        continue;
      }

      // Send DM
      const dmSuccess = await sendDM(
        supabase,
        ADMIN_USER_ID,
        sub.user_id,
        daysRemaining
      );

      if (dmSuccess) {
        results.dmsSent++;

        // Log the notification
        await supabase.rpc("log_notification", {
          p_user_id: sub.user_id,
          p_type: "dm",
          p_category: getNotificationCategory(daysRemaining),
          p_days_until: daysRemaining,
          p_message: getTrialExpirationMessage(daysRemaining),
          p_status: "sent",
        });

        console.log(`[send-trial-notifications] DM sent to user ${sub.user_id}`);
      } else {
        results.errors.push(`Failed to send DM to user ${sub.user_id}`);
      }
    }

    console.log("[send-trial-notifications] Completed:", results);

    return new Response(
      JSON.stringify({
        message: "Trial notifications sent",
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-trial-notifications] Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function sendDM(
  supabase: any,
  adminId: string,
  userId: string,
  daysRemaining: number
): Promise<boolean> {
  try {
    console.log(`[sendDM] Attempting to send DM from ${adminId} to ${userId}`);

    // Get or create conversation
    const { data: existingConvo } = await supabase
      .from("conversations")
      .select("id")
      .or(`and(user1_id.eq.${adminId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${adminId})`)
      .maybeSingle();

    let conversationId = existingConvo?.id;

    if (!conversationId) {
      console.log(`[sendDM] Creating new conversation between ${adminId} and ${userId}`);
      const { data: newConvo, error: convoError } = await supabase
        .from("conversations")
        .insert({
          user1_id: adminId,
          user2_id: userId,
          last_message_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (convoError) {
        console.error("[sendDM] Error creating conversation:", convoError);
        return false;
      }

      conversationId = newConvo.id;
      console.log(`[sendDM] Created conversation: ${conversationId}`);
    } else {
      console.log(`[sendDM] Using existing conversation: ${conversationId}`);
    }

    // Send message
    const message = getTrialExpirationMessage(daysRemaining);
    const { error: msgError } = await supabase
      .from("direct_messages")
      .insert({
        conversation_id: conversationId,
        sender_id: adminId,
        content: message,
        read: false,
      });

    if (msgError) {
      console.error("[sendDM] Error sending DM:", msgError);
      return false;
    }

    // Update conversation timestamp
    await supabase
      .from("conversations")
      .update({ last_message_at: new Date().toISOString() })
      .eq("id", conversationId);

    console.log(`[sendDM] Successfully sent DM to user ${userId}`);
    return true;
  } catch (error) {
    console.error("[sendDM] Error:", error);
    return false;
  }
}

function getNotificationCategory(daysRemaining: number): string {
  if (daysRemaining > 0) {
    return "trial_warning";
  } else if (daysRemaining === 0) {
    return "trial_expired";
  } else if (daysRemaining >= -GRACE_PERIOD_DAYS) {
    return "grace_period";
  } else {
    return "access_blocked";
  }
}

function getTrialExpirationMessage(daysRemaining: number): string {
  if (daysRemaining > 0) {
    return `🔔 Trial Reminder: You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial!\n\nSubscribe now to continue enjoying all features. Pay what you want - starting at just $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else if (daysRemaining === 0) {
    return `⏰ Your trial expires today!\n\nDon't lose access to your recipes and features. Subscribe now to continue - pay what you want, starting at $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else if (daysRemaining >= -GRACE_PERIOD_DAYS) {
    const daysInGrace = Math.abs(daysRemaining);
    const daysLeft = GRACE_PERIOD_DAYS - daysInGrace;
    return `⚠️ Trial Expired - Grace Period (${daysLeft} day${daysLeft !== 1 ? "s" : ""} left)\n\nYour trial has ended, but you still have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} of access.\n\nSubscribe now to avoid losing access to all features. Pay what you want - starting at $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else {
    return `🔒 Subscription Required\n\nYour trial and grace period have ended. Subscribe now to regain access to all features.\n\nPay what you want - starting at just $1/month.\n\nVisit the Subscription page to choose your plan.`;
  }
}
