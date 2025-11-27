import { supabase } from '../lib/supabase';

export interface SubscriptionStatus {
  hasAccess: boolean;
  subscriptionType: string | null;
  status: string | null;
  trialEndsAt: Date | null;
  expiresAt: Date | null;
  daysRemaining: number | null;
  isTrialExpired: boolean;
  isInGracePeriod: boolean;
  needsPayment: boolean;
}

const GRACE_PERIOD_DAYS = 7;

export async function checkSubscriptionAccess(userId: string): Promise<SubscriptionStatus> {
  try {
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error checking subscription:', error);
      return createDefaultAccess(false);
    }

    if (!subscription) {
      return createDefaultAccess(false);
    }

    const now = new Date();
    const trialEndsAt = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
    const expiresAt = subscription.expires_at ? new Date(subscription.expires_at) : null;

    // Lifetime subscriptions (family code or 50 referrals)
    if (subscription.subscription_type === 'family_code' ||
        subscription.subscription_type === 'referral_lifetime') {
      return {
        hasAccess: true,
        subscriptionType: subscription.subscription_type,
        status: subscription.status,
        trialEndsAt: null,
        expiresAt: null,
        daysRemaining: null,
        isTrialExpired: false,
        isInGracePeriod: false,
        needsPayment: false,
      };
    }

    // Early bird trial
    if (subscription.subscription_type === 'early_bird') {
      if (!trialEndsAt) {
        return createDefaultAccess(true);
      }

      const isTrialExpired = now > trialEndsAt;
      const daysRemaining = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (isTrialExpired) {
        const daysSinceExpired = Math.abs(daysRemaining);
        const isInGracePeriod = daysSinceExpired <= GRACE_PERIOD_DAYS;

        return {
          hasAccess: isInGracePeriod, // Allow access during grace period
          subscriptionType: subscription.subscription_type,
          status: subscription.status,
          trialEndsAt,
          expiresAt,
          daysRemaining,
          isTrialExpired: true,
          isInGracePeriod,
          needsPayment: true,
        };
      }

      return {
        hasAccess: true,
        subscriptionType: subscription.subscription_type,
        status: subscription.status,
        trialEndsAt,
        expiresAt,
        daysRemaining,
        isTrialExpired: false,
        isInGracePeriod: false,
        needsPayment: false,
      };
    }

    // Referral rewards
    if (subscription.referral_years_remaining > 0 && expiresAt && now < expiresAt) {
      const monthsRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24 * 30));
      return {
        hasAccess: true,
        subscriptionType: subscription.subscription_type,
        status: subscription.status,
        trialEndsAt: null,
        expiresAt,
        daysRemaining: monthsRemaining * 30,
        isTrialExpired: false,
        isInGracePeriod: false,
        needsPayment: false,
      };
    }

    // Regular paid subscription
    if (subscription.monthly_amount && subscription.status === 'active') {
      return {
        hasAccess: true,
        subscriptionType: subscription.subscription_type,
        status: subscription.status,
        trialEndsAt: null,
        expiresAt,
        daysRemaining: null,
        isTrialExpired: false,
        isInGracePeriod: false,
        needsPayment: false,
      };
    }

    // Default: no access
    return createDefaultAccess(false);
  } catch (error) {
    console.error('Error in checkSubscriptionAccess:', error);
    return createDefaultAccess(false);
  }
}

function createDefaultAccess(hasAccess: boolean): SubscriptionStatus {
  return {
    hasAccess,
    subscriptionType: null,
    status: null,
    trialEndsAt: null,
    expiresAt: null,
    daysRemaining: null,
    isTrialExpired: false,
    isInGracePeriod: false,
    needsPayment: !hasAccess,
  };
}

export async function shouldShowPaymentPrompt(userId: string): Promise<boolean> {
  const status = await checkSubscriptionAccess(userId);
  return status.needsPayment && !status.hasAccess;
}

export async function shouldShowTrialWarning(userId: string): Promise<{ show: boolean; daysRemaining: number | null }> {
  const status = await checkSubscriptionAccess(userId);

  const showWarning = !status.isTrialExpired &&
                      status.daysRemaining !== null &&
                      status.daysRemaining <= 14; // Show warning 2 weeks before expiration

  return {
    show: showWarning,
    daysRemaining: status.daysRemaining,
  };
}
