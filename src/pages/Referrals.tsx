import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { useToast } from '../hooks/use-toast';
import { referralService, ReferralStats, ReferralReward } from '../services/referralService';
import { Copy, DollarSign, Users, Gift, CheckCircle2, Clock, XCircle, Loader2, Share2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';

export default function Referrals() {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState<string>('');
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [payoutHistory, setPayoutHistory] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [payoutDialogOpen, setPayoutDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [payoutMethod, setPayoutMethod] = useState('paypal');
  const [payoutEmail, setPayoutEmail] = useState('');

  useEffect(() => {
    loadReferralData();
  }, []);

  const loadReferralData = async () => {
    setLoading(true);
    try {
      const [code, statsData, history] = await Promise.all([
        referralService.getUserReferralCode(),
        referralService.getUserReferralStats(),
        referralService.getPayoutHistory()
      ]);

      if (code) setReferralCode(code);
      if (statsData) setStats(statsData);
      setPayoutHistory(history);
    } catch (error) {
      console.error('Error loading referral data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load referral data',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = () => {
    if (!referralCode) return;
    const link = referralService.getReferralLink(referralCode);
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copied!',
      description: 'Referral link copied to clipboard'
    });
  };

  const shareReferralLink = async () => {
    if (!referralCode) return;
    const link = referralService.getReferralLink(referralCode);

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join MealScrape!',
          text: 'Check out this amazing recipe app! Use my referral link:',
          url: link
        });
      } catch (error) {
        console.log('Share cancelled or failed');
      }
    } else {
      copyReferralLink();
    }
  };

  const handleRequestPayout = async () => {
    if (!payoutEmail.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your payout email',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    try {
      const result = await referralService.requestPayout(payoutMethod, payoutEmail);

      if (result.success) {
        toast({
          title: 'Payout Requested!',
          description: 'Your payout request has been submitted and will be processed soon.'
        });
        setPayoutDialogOpen(false);
        setPayoutEmail('');
        loadReferralData();
      } else {
        toast({
          title: 'Error',
          description: result.error || 'Failed to request payout',
          variant: 'destructive'
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to request payout',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; icon: any; label: string }> = {
      pending: { variant: 'secondary', icon: Clock, label: 'Pending' },
      processing: { variant: 'default', icon: Loader2, label: 'Processing' },
      paid: { variant: 'default', icon: CheckCircle2, label: 'Paid' },
      failed: { variant: 'destructive', icon: XCircle, label: 'Failed' },
      cancelled: { variant: 'outline', icon: XCircle, label: 'Cancelled' }
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4 max-w-6xl">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Referral Rewards</h1>
        <p className="text-muted-foreground mt-2">
          Earn $5 for every 10 friends who join using your referral link!
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completed_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.pending_referrals || 0} pending
            </p>
          </CardContent>
        </Card>

        <Card className="border-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unrewarded</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.unrewarded_referrals || 0}</div>
            <p className="text-xs text-muted-foreground">
              Next payout at {stats?.next_payout_at || 10}
            </p>
          </CardContent>
        </Card>

        <Card className="border-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earned</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats?.total_earned?.toFixed(2) || '0.00'}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.rewards_claimed || 0} payouts claimed
            </p>
          </CardContent>
        </Card>

        <Card className="border-4 border-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Reward</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.eligible_for_payout ? '$5.00' : '$0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.eligible_for_payout ? 'Ready!' : 'Keep referring'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-4 border-orange-500">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
          <CardDescription>
            Share this link with friends. You earn $5 for every 10 people who sign up!
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              readOnly
              value={referralCode ? referralService.getReferralLink(referralCode) : 'Loading...'}
              className="font-mono"
            />
            <Button onClick={copyReferralLink} variant="outline" size="icon">
              <Copy className="h-4 w-4" />
            </Button>
            <Button onClick={shareReferralLink} variant="outline" size="icon">
              <Share2 className="h-4 w-4" />
            </Button>
          </div>

          <Dialog open={payoutDialogOpen} onOpenChange={setPayoutDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className="w-full"
                disabled={!stats?.eligible_for_payout}
              >
                <DollarSign className="h-4 w-4 mr-2" />
                Request $5 Payout
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Payout</DialogTitle>
                <DialogDescription>
                  Enter your payment details to receive your $5 reward
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="payout-method">Payment Method</Label>
                  <Select value={payoutMethod} onValueChange={setPayoutMethod}>
                    <SelectTrigger id="payout-method">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paypal">PayPal</SelectItem>
                      <SelectItem value="venmo">Venmo</SelectItem>
                      <SelectItem value="cashapp">Cash App</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="payout-email">Email / Username</Label>
                  <Input
                    id="payout-email"
                    type="text"
                    placeholder="your@email.com or @username"
                    value={payoutEmail}
                    onChange={(e) => setPayoutEmail(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter your {payoutMethod === 'paypal' ? 'PayPal email' : payoutMethod === 'venmo' ? 'Venmo username' : payoutMethod === 'cashapp' ? 'Cash App tag' : 'payment details'}
                  </p>
                </div>

                <Button
                  className="w-full"
                  onClick={handleRequestPayout}
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit Request</>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      <Card className="border-4 border-orange-500">
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Track all your referral payout requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {payoutHistory.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No payout history yet. Start referring friends to earn rewards!
            </div>
          ) : (
            <div className="space-y-4">
              {payoutHistory.map((payout) => (
                <div
                  key={payout.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">
                        ${payout.reward_amount.toFixed(2)}
                      </span>
                      {getStatusBadge(payout.payout_status)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {payout.payout_method && (
                        <span className="capitalize">{payout.payout_method}</span>
                      )}
                      {payout.payout_email && (
                        <span> • {payout.payout_email}</span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Requested: {new Date(payout.requested_at).toLocaleDateString()}
                      {payout.paid_at && (
                        <> • Paid: {new Date(payout.paid_at).toLocaleDateString()}</>
                      )}
                    </div>
                    {payout.failure_reason && (
                      <div className="text-xs text-destructive">
                        {payout.failure_reason}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {payout.referral_count} referrals
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
