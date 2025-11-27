import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      console.log("[send-trial-email] RESEND_API_KEY not configured, skipping email notifications");
      return new Response(
        JSON.stringify({
          message: "Email service not configured",
          sent: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const now = new Date();
    let emailsSent = 0;
    const errors: string[] = [];

    // Get all active early bird subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("subscriptions")
      .select("user_id, trial_ends_at")
      .eq("subscription_type", "early_bird");

    if (subError) {
      throw subError;
    }

    for (const sub of subscriptions || []) {
      const trialEndsAt = new Date(sub.trial_ends_at);
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      const shouldNotify = (
        (daysRemaining >= 1 && daysRemaining <= 7) ||
        (daysRemaining === 0) ||
        (daysRemaining >= -GRACE_PERIOD_DAYS && daysRemaining < 0) ||
        (daysRemaining === -(GRACE_PERIOD_DAYS + 1))
      );

      if (!shouldNotify) continue;

      // Check if email already sent today
      const { data: alreadySent } = await supabase.rpc(
        "was_notification_sent_today",
        {
          p_user_id: sub.user_id,
          p_type: "email",
          p_category: getNotificationCategory(daysRemaining),
          p_days_until: daysRemaining,
        }
      );

      if (alreadySent) continue;

      // Get user email
      const { data: userData } = await supabase.auth.admin.getUserById(sub.user_id);
      if (!userData?.user?.email) continue;

      const userEmail = userData.user.email;

      // Send email via Resend
      const emailSent = await sendEmailViaResend(
        resendApiKey,
        userEmail,
        daysRemaining
      );

      if (emailSent) {
        emailsSent++;

        // Log the notification
        await supabase.rpc("log_notification", {
          p_user_id: sub.user_id,
          p_type: "email",
          p_category: getNotificationCategory(daysRemaining),
          p_days_until: daysRemaining,
          p_message: getEmailSubject(daysRemaining),
          p_status: "sent",
        });
      } else {
        errors.push(`Failed to send email to ${userEmail}`);
      }
    }

    return new Response(
      JSON.stringify({
        message: "Email notifications processed",
        sent: emailsSent,
        errors,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[send-trial-email] Error:", error);
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

async function sendEmailViaResend(
  apiKey: string,
  toEmail: string,
  daysRemaining: number
): Promise<boolean> {
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        from: "MealScrape <notifications@mealscrape.com>",
        to: [toEmail],
        subject: getEmailSubject(daysRemaining),
        html: getEmailHTML(daysRemaining),
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("Resend API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}

function getNotificationCategory(daysRemaining: number): string {
  if (daysRemaining > 0) return "trial_warning";
  if (daysRemaining === 0) return "trial_expired";
  if (daysRemaining >= -GRACE_PERIOD_DAYS) return "grace_period";
  return "access_blocked";
}

function getEmailSubject(daysRemaining: number): string {
  if (daysRemaining > 0) {
    return `🔔 ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your MealScrape trial`;
  } else if (daysRemaining === 0) {
    return "⏰ Your MealScrape trial expires today!";
  } else if (daysRemaining >= -GRACE_PERIOD_DAYS) {
    const daysLeft = GRACE_PERIOD_DAYS + daysRemaining;
    return `⚠️ Grace Period: ${daysLeft} day${daysLeft !== 1 ? "s" : ""} left to subscribe`;
  } else {
    return "🔒 Subscription Required - Restore Your Access";
  }
}

function getEmailHTML(daysRemaining: number): string {
  const baseStyle = `
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    color: #333;
    line-height: 1.6;
  `;

  let content = "";

  if (daysRemaining > 0) {
    content = `
      <h1 style="color: #ea580c;">🔔 Trial Reminder</h1>
      <p style="font-size: 18px; font-weight: bold;">You have ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left in your free trial!</p>
      <p>Don't miss out on all the amazing features MealScrape has to offer.</p>
    `;
  } else if (daysRemaining === 0) {
    content = `
      <h1 style="color: #dc2626;">⏰ Your trial expires today!</h1>
      <p style="font-size: 18px; font-weight: bold;">This is your last day of free access.</p>
      <p>Subscribe now to keep all your recipes and continue using all features.</p>
    `;
  } else if (daysRemaining >= -GRACE_PERIOD_DAYS) {
    const daysLeft = GRACE_PERIOD_DAYS + daysRemaining;
    content = `
      <h1 style="color: #dc2626;">⚠️ Trial Expired - Grace Period</h1>
      <p style="font-size: 18px; font-weight: bold; color: #dc2626;">You have ${daysLeft} day${daysLeft !== 1 ? "s" : ""} of grace period left!</p>
      <p>Your trial has ended, but you still have limited time to subscribe before losing access.</p>
    `;
  } else {
    content = `
      <h1 style="color: #991b1b;">🔒 Subscription Required</h1>
      <p style="font-size: 18px; font-weight: bold; color: #991b1b;">Your access has been suspended.</p>
      <p>Subscribe now to restore access to all your recipes and features.</p>
    `;
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="${baseStyle} background-color: #f9fafb; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
        ${content}
        
        <div style="margin: 30px 0;">
          <h3 style="color: #ea580c;">✨ What you get with a subscription:</h3>
          <ul style="list-style: none; padding: 0;">
            <li style="margin: 10px 0;">✅ Full access to all recipes and features</li>
            <li style="margin: 10px 0;">✅ Social feed and community features</li>
            <li style="margin: 10px 0;">✅ Meal planner and grocery lists</li>
            <li style="margin: 10px 0;">✅ Save and organize unlimited recipes</li>
            <li style="margin: 10px 0;">💸 <strong>Pay what you want - starting at just $1/month</strong></li>
          </ul>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="https://mealscrape.com/subscription" 
             style="display: inline-block; background: #ea580c; color: white; padding: 15px 40px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
            Choose Your Plan
          </a>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 14px;">
          <p>MealScrape - Your Personal Recipe Companion</p>
          <p>Questions? Reply to this email or visit our support page.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
