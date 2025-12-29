import { supabase } from '../lib/supabase';

const ADMIN_EMAIL = 'mealscrapeapp@gmail.com';

export async function getAdminUserId(): Promise<string | null> {
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', ADMIN_EMAIL)
      .maybeSingle();

    if (error || !profile) {
      console.error('[NotificationService] Admin user not found:', error);
      return null;
    }

    return profile.id;
  } catch (error) {
    console.error('[NotificationService] Error fetching admin user:', error);
    return null;
  }
}

export async function sendTrialExpirationDM(
  userId: string,
  daysRemaining: number
): Promise<boolean> {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) {
      console.error('[NotificationService] Cannot send DM: Admin user not found');
      return false;
    }

    const message = getTrialExpirationMessage(daysRemaining);

    const conversationId = await getOrCreateConversation(adminId, userId);
    if (!conversationId) {
      console.error('[NotificationService] Failed to create conversation');
      return false;
    }

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: adminId,
        content: message,
        read: false,
      });

    if (error) {
      console.error('[NotificationService] Error sending DM:', error);
      return false;
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log(`[NotificationService] Trial notification DM sent to user ${userId} (${daysRemaining} days)`);
    return true;
  } catch (error) {
    console.error('[NotificationService] Error in sendTrialExpirationDM:', error);
    return false;
  }
}

async function getOrCreateConversation(
  adminId: string,
  userId: string
): Promise<string | null> {
  try {
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .or(`and(user1_id.eq.${adminId},user2_id.eq.${userId}),and(user1_id.eq.${userId},user2_id.eq.${adminId})`)
      .maybeSingle();

    if (existing) {
      return existing.id;
    }

    const { data: newConvo, error } = await supabase
      .from('conversations')
      .insert({
        user1_id: adminId,
        user2_id: userId,
        last_message_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('[NotificationService] Error creating conversation:', error);
      return null;
    }

    return newConvo.id;
  } catch (error) {
    console.error('[NotificationService] Error in getOrCreateConversation:', error);
    return null;
  }
}

function getTrialExpirationMessage(daysRemaining: number): string {
  if (daysRemaining > 0) {
    return `🔔 Trial Reminder: You have ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''} left in your free trial!\n\nSubscribe now to continue enjoying all features. Pay what you want - starting at just $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else if (daysRemaining === 0) {
    return `⏰ Your trial expires today!\n\nDon't lose access to your recipes and features. Subscribe now to continue - pay what you want, starting at $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else if (daysRemaining >= -7) {
    const daysInGrace = Math.abs(daysRemaining);
    return `⚠️ Trial Expired - Grace Period (${7 - daysInGrace} days left)\n\nYour trial has ended, but you still have ${7 - daysInGrace} day${(7 - daysInGrace) !== 1 ? 's' : ''} of access.\n\nSubscribe now to avoid losing access to all features. Pay what you want - starting at $1/month.\n\nVisit the Subscription page to choose your plan.`;
  } else {
    return `🔒 Subscription Required\n\nYour trial and grace period have ended. Subscribe now to regain access to all features.\n\nPay what you want - starting at just $1/month.\n\nVisit the Subscription page to choose your plan.`;
  }
}

export async function sendPaymentConfirmationDM(userId: string): Promise<boolean> {
  try {
    const adminId = await getAdminUserId();
    if (!adminId) return false;

    const message = `✅ Payment Confirmed!\n\nThank you for subscribing! You are now subscribed for another month.\n\nEnjoy unlimited access to all features, recipes, and community.\n\n❤️ Thank you for supporting MealScrape!`;

    const conversationId = await getOrCreateConversation(adminId, userId);
    if (!conversationId) return false;

    const { error } = await supabase
      .from('direct_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: adminId,
        content: message,
        read: false,
      });

    if (error) {
      console.error('[NotificationService] Error sending payment confirmation DM:', error);
      return false;
    }

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    console.log(`[NotificationService] Payment confirmation DM sent to user ${userId}`);
    return true;
  } catch (error) {
    console.error('[NotificationService] Error in sendPaymentConfirmationDM:', error);
    return false;
  }
}
