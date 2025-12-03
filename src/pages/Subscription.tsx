import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import {
  Crown,
  Users,
  Gift,
  Copy,
  Check,
  Sparkles,
  Star,
  ArrowLeft,
  Share2,
  Settings
} from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { PricingTiers } from '../components/PricingTiers';
import { createCustomerPortalSession } from '../services/stripeService';

interface SubscriptionPageProps {
  onNavigate: (page: string) => void;
}

interface SubscriptionData {
  subscription_type: string;
  status: string;
  monthly_amount: number | null;
  expires_at: string | null;
  trial_ends_at: string | null;
  family_code_used: string | null;
  referral_years_remaining: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  next_billing_date: string | null;
}

interface ReferralData {
  code: string;
  successful_signups: number;
  years_earned: number;
}

export function Subscription({ onNavigate }: SubscriptionPageProps) {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [referralCode, setReferralCode] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [familyCode, setFamilyCode] = useState('');
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const loadSubscriptionData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load subscription
      const { data: subData } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      setSubscription(subData);

      // Load or create referral code
      let { data: refData } = await supabase
        .from('referral_codes')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!refData) {
        // Generate referral code
        const { data: newCode, error } = await supabase.rpc('generate_referral_code', {
          p_user_id: user.id
        });

        if (!error && newCode) {
          // Reload from database to get all fields
          const { data: freshData } = await supabase
            .from('referral_codes')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle();

          refData = freshData;
        }
      }

      setReferralCode(refData);
    } catch (error) {
      console.error('Failed to load subscription:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeemFamilyCode = async () => {
    if (!familyCode.trim()) {
      toast.error('Please enter a family code');
      return;
    }

    setRedeeming(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      const { data, error } = await supabase.rpc('use_family_code', {
        p_user_id: user.id,
        p_code: familyCode.trim()
      });

      if (error) throw error;

      toast.success('🎉 Family code redeemed! You now have lifetime free access!');
      setFamilyCode('');
      loadSubscriptionData();
    } catch (error: any) {
      toast.error(error.message || 'Invalid or already used code');
    } finally {
      setRedeeming(false);
    }
  };

  const copyReferralCode = () => {
    if (!referralCode) return;

    const referralUrl = `${window.location.origin}?ref=${referralCode.code}`;
    navigator.clipboard.writeText(referralUrl);
    setCopied(true);
    toast.success('Referral link copied!');
    setTimeout(() => setCopied(false), 2000);
  };

  const shareReferral = async () => {
    if (!referralCode) return;

    const referralUrl = `${window.location.origin}?ref=${referralCode.code}`;
    const text = `Join me on Meal Scrape! Use my referral code to get started: ${referralUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ text, url: referralUrl });
      } catch (error) {
        copyReferralCode();
      }
    } else {
      copyReferralCode();
    }
  };

  const getSubscriptionStatus = () => {
    if (!subscription) return { title: 'No Subscription', color: 'gray' };

    if (subscription.subscription_type === 'referral_lifetime') {
      return { title: '👑 Lifetime Free (50 Referrals!)', color: 'green', icon: Crown };
    }

    if (subscription.subscription_type === 'family_code') {
      return { title: '🔥 Lifetime Free', color: 'green', icon: Crown };
    }

    if (subscription.subscription_type === 'early_bird') {
      const trialEnd = subscription.trial_ends_at ? new Date(subscription.trial_ends_at) : null;
      const isTrialActive = trialEnd && trialEnd > new Date();

      if (isTrialActive) {
        const daysLeft = Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        return { title: `🎁 Early Bird Trial (${daysLeft} days left)`, color: 'blue', icon: Sparkles };
      } else {
        return { title: '⚠️ Trial Expired - Choose Plan', color: 'red', icon: null };
      }
    }

    if (subscription.referral_years_remaining > 0) {
      const expiry = subscription.expires_at ? new Date(subscription.expires_at) : null;
      const monthsLeft = expiry ? Math.ceil((expiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24 * 30)) : 0;
      return { title: `⭐ Free (Referral Reward - ${monthsLeft} months left)`, color: 'green', icon: Gift };
    }

    if (subscription.status === 'active' && subscription.monthly_amount) {
      return { title: `✅ Active - $${(subscription.monthly_amount / 100).toFixed(2)}/month`, color: 'green', icon: Check };
    }

    return { title: '⚠️ No Active Plan', color: 'orange', icon: null };
  };

  const status = getSubscriptionStatus();
  const pendingReferrals = referralCode ? referralCode.successful_signups % 3 : 0;
  const nextRewardIn = 3 - pendingReferrals;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading subscription...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onNavigate('settings')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Subscription</h1>
            <p className="text-sm text-gray-600">Manage your plan and referrals</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Current Status */}
        <Card className="border-2" style={{ borderColor: status.color === 'green' ? '#22c55e' : status.color === 'blue' ? '#3b82f6' : status.color === 'red' ? '#ef4444' : '#f59e0b' }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {status.icon && <status.icon className="w-6 h-6" />}
              Current Plan
            </CardTitle>
            <CardDescription>Your subscription status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900 mb-2">{status.title}</div>

            {subscription?.subscription_type === 'family_code' && (
              <p className="text-sm text-gray-600">
                You have lifetime free access! Code used: <code className="bg-gray-100 px-2 py-1 rounded">{subscription.family_code_used}</code>
              </p>
            )}

            {subscription?.subscription_type === 'early_bird' && subscription.trial_ends_at && new Date(subscription.trial_ends_at) < new Date() && (
              <div className="mt-4">
                <Button onClick={() => setShowPaymentDialog(true)} className="bg-orange-500 hover:bg-orange-600">
                  Choose Your Amount
                </Button>
              </div>
            )}

            {subscription?.status === 'active' && subscription.monthly_amount && subscription.stripe_customer_id && (
              <div className="mt-4 space-y-2">
                {subscription.next_billing_date && (
                  <p className="text-sm text-gray-600">
                    Next billing: {new Date(subscription.next_billing_date).toLocaleDateString()}
                  </p>
                )}
                <Button
                  onClick={async () => {
                    setOpeningPortal(true);
                    try {
                      const { url } = await createCustomerPortalSession();
                      window.location.href = url;
                    } catch (error: any) {
                      toast.error(error.message || 'Failed to open portal');
                      setOpeningPortal(false);
                    }
                  }}
                  disabled={openingPortal}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  {openingPortal ? 'Opening...' : 'Manage Subscription'}
                </Button>
              </div>
            )}

            {subscription?.subscription_type === 'family_code' && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-2">
                  You have lifetime free access! Want to support us anyway?
                </p>
                <Button onClick={() => setShowPaymentDialog(true)} variant="outline">
                  Make a Donation
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Referral System */}
        <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-6 h-6 text-purple-600" />
              Earn Free Access
            </CardTitle>
            <CardDescription>3 referrals = 2 months free • 50 referrals = Lifetime!</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress */}
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Current Progress</span>
                <span className="text-purple-600 font-bold">{pendingReferrals}/3 referrals</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-purple-500 to-pink-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(pendingReferrals / 3) * 100}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {nextRewardIn === 0 ? '🎉 You earned 2 months free!' : `${nextRewardIn} more referral${nextRewardIn > 1 ? 's' : ''} to earn 2 months free!`}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">{referralCode?.successful_signups || 0}</div>
                <div className="text-sm text-gray-600">Total Referrals</div>
              </div>
              <div className="bg-white rounded-lg p-4 text-center">
                <div className="text-3xl font-bold text-pink-600">{(referralCode?.years_earned || 0) * 2}</div>
                <div className="text-sm text-gray-600">Months Earned</div>
              </div>
            </div>

            {/* Referral Code */}
            {referralCode && (
              <div>
                <Label className="text-sm font-medium mb-2 block">Your Referral Link</Label>
                <div className="flex gap-2">
                  <Input
                    value={`${window.location.origin}?ref=${referralCode.code}`}
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button
                    onClick={copyReferralCode}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    onClick={shareReferral}
                    className="flex-shrink-0 bg-purple-600 hover:bg-purple-700"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-purple-100 border-2 border-purple-300 rounded-lg p-4">
              <p className="text-sm font-medium text-purple-900">💡 How it works:</p>
              <ul className="text-sm text-purple-800 mt-2 space-y-1">
                <li>✅ Share your link with friends</li>
                <li>✅ They sign up using your link</li>
                <li>✅ Every 3 signups = 2 months free!</li>
                <li>🏆 50 total signups = Lifetime FREE!</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Family Code Redemption */}
        <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="w-6 h-6 text-amber-600" />
              Have a Family Code?
            </CardTitle>
            <CardDescription>Redeem for lifetime free access</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="family-code" className="text-sm font-medium mb-2 block">
                Enter Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="family-code"
                  placeholder="FAMILY-XXXXXXXXXX"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  className="font-mono"
                  disabled={redeeming}
                />
                <Button
                  onClick={handleRedeemFamilyCode}
                  disabled={redeeming || !familyCode.trim()}
                  className="bg-amber-600 hover:bg-amber-700 flex-shrink-0"
                >
                  {redeeming ? 'Redeeming...' : 'Redeem'}
                </Button>
              </div>
            </div>

            <div className="bg-amber-100 border-2 border-amber-300 rounded-lg p-4">
              <p className="text-sm font-medium text-amber-900">🎁 Family codes grant:</p>
              <ul className="text-sm text-amber-800 mt-2 space-y-1">
                <li>✨ <strong>Lifetime free access</strong></li>
                <li>✨ Never pay anything, ever</li>
                <li>✨ Can still earn referral rewards</li>
                <li>✨ One-time use per code</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="w-6 h-6 text-yellow-500" />
              Our Model
            </CardTitle>
            <CardDescription>Pay what you want, when you want</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              {/* Early Bird */}
              <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
                <div className="text-lg font-bold text-blue-900 mb-2">🎁 Early Bird</div>
                <div className="text-3xl font-bold text-blue-600 mb-2">FREE</div>
                <div className="text-sm text-blue-700 mb-4">6 months trial</div>
                <ul className="text-sm space-y-2 text-blue-800">
                  <li>✓ Full access for 6 months</li>
                  <li>✓ Social Feed, commenting, Blog will remain free</li>
                  <li>✓ Then $1+/month</li>
                </ul>
              </div>

              {/* Regular */}
             <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50">
  <div className="text-lg font-bold text-slate-900 mb-2">🎁 Early Bird</div>
  <div className="text-3xl font-bold text-green-600 mb-2">FREE</div>
  <div className="text-sm text-slate-700 mb-4">6 months trial</div>
  <ul className="text-sm space-y-2 text-slate-800">
    <li className="flex items-start gap-2">
      <span className="shrink-0 text-green-600">✓</span>
      <span>Full access for 6 months</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="shrink-0 text-green-600">✓</span>
      <span>Social Feed, commenting, Blog will remain free</span>
    </li>
    <li className="flex items-start gap-2">
      <span className="shrink-0 text-green-600">✓</span>
      <span>Then $1+/month</span>
    </li>
  </ul>
</div>

         
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Support MealScrape</DialogTitle>
            <DialogDescription>
              {subscription?.subscription_type === 'family_code'
                ? 'You already have lifetime access, but we appreciate your support!'
                : 'Choose your monthly subscription amount'}
            </DialogDescription>
          </DialogHeader>

          <PricingTiers onSuccess={() => setShowPaymentDialog(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}


