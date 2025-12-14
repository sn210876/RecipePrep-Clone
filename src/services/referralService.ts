import { supabase } from '../lib/supabase';

export interface ReferralStats {
  total_referrals: number;
  completed_referrals: number;
  pending_referrals: number;
  unrewarded_referrals: number;
  rewards_claimed: number;
  eligible_for_payout: boolean;
  next_payout_at: number;
  total_earned: number;
}

export interface ReferralReward {
  id: string;
  user_id: string;
  referral_count: number;
  reward_amount: number;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  payout_method: string | null;
  payout_email: string | null;
  payout_details: any;
  requested_at: string;
  processed_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  failure_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referral_code: string;
  referred_user_id: string | null;
  referred_email: string | null;
  status: 'pending' | 'completed' | 'cancelled';
  completed_at: string | null;
  reward_granted: boolean;
  reward_granted_at: string | null;
  payout_id: string | null;
  created_at: string;
  updated_at: string;
}

export const referralService = {
  async getUserReferralCode(): Promise<string | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.error('Error fetching referral code:', error);
      return null;
    }

    if (data) {
      return data.code;
    }

    const { data: newCode, error: generateError } = await supabase
      .rpc('generate_referral_code', { p_user_id: user.id });

    if (generateError) {
      console.error('Error generating referral code:', generateError);
      return null;
    }

    return newCode;
  },

  async getUserReferralStats(): Promise<ReferralStats | null> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .rpc('get_user_referral_stats', { p_user_id: user.id });

    if (error) {
      console.error('Error fetching referral stats:', error);
      return null;
    }

    return data;
  },

  async checkPayoutEligibility(): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .rpc('check_referral_payout_eligibility', { p_user_id: user.id });

    if (error) {
      console.error('Error checking payout eligibility:', error);
      return false;
    }

    return data;
  },

  async requestPayout(
    payoutMethod: string,
    payoutEmail: string,
    payoutDetails?: any
  ): Promise<{ success: boolean; rewardId?: string; error?: string }> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: 'Not authenticated' };
    }

    const { data, error } = await supabase
      .rpc('request_referral_payout', {
        p_user_id: user.id,
        p_payout_method: payoutMethod,
        p_payout_email: payoutEmail,
        p_payout_details: payoutDetails || null
      });

    if (error) {
      console.error('Error requesting payout:', error);
      return { success: false, error: error.message };
    }

    return { success: true, rewardId: data };
  },

  async getPayoutHistory(): Promise<ReferralReward[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error fetching payout history:', error);
      return [];
    }

    return data || [];
  },

  async getReferralsList(): Promise<Referral[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching referrals list:', error);
      return [];
    }

    return data || [];
  },

  async getAllPendingPayouts(): Promise<ReferralReward[]> {
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .in('payout_status', ['pending', 'processing'])
      .order('requested_at', { ascending: true });

    if (error) {
      console.error('Error fetching pending payouts:', error);
      return [];
    }

    return data || [];
  },

  async adminProcessPayout(
    rewardId: string,
    newStatus: 'processing' | 'paid' | 'failed' | 'cancelled',
    adminNotes?: string,
    failureReason?: string
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase
      .rpc('admin_process_payout', {
        p_reward_id: rewardId,
        p_new_status: newStatus,
        p_admin_notes: adminNotes || null,
        p_failure_reason: failureReason || null
      });

    if (error) {
      console.error('Error processing payout:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  },

  getReferralLink(code: string): string {
    const baseUrl = window.location.origin;
    return `${baseUrl}/?ref=${code}`;
  }
};
