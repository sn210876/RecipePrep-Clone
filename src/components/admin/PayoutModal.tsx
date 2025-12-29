import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { referralService, Referral } from '@/services/referralService';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Loader2, ExternalLink, CheckCircle, XCircle, Clock, Ban } from 'lucide-react';

interface ReferralReward {
  id: string;
  user_id: string;
  referral_count: number;
  reward_amount: number;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  payout_method: string | null;
  payout_email: string | null;
  payout_details: any;
  requested_at: string;
  processed_at?: string;
  paid_at?: string;
  admin_notes?: string;
  failure_reason?: string;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  photo_url?: string;
  created_at: string;
}

interface PayoutWithUser extends ReferralReward {
  profile?: UserProfile;
}

interface PayoutModalProps {
  payout: PayoutWithUser | null;
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function PayoutModal({ payout, open, onClose, onSuccess }: PayoutModalProps) {
  const [adminNotes, setAdminNotes] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    action: 'processing' | 'paid' | 'failed' | 'cancelled';
    title: string;
    description: string;
  } | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [payoutHistory, setPayoutHistory] = useState<ReferralReward[]>([]);

  useEffect(() => {
    if (payout && open) {
      setAdminNotes(payout.admin_notes || '');
      setFailureReason(payout.failure_reason || '');
      loadReferrals();
      loadPayoutHistory();
    }
  }, [payout, open]);

  const loadReferrals = async () => {
    if (!payout) return;
    setLoadingReferrals(true);

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', payout.user_id)
      .eq('status', 'completed')
      .eq('reward_granted', true)
      .order('completed_at', { ascending: false })
      .limit(10);

    if (!error && data) {
      setReferrals(data);
    }
    setLoadingReferrals(false);
  };

  const loadPayoutHistory = async () => {
    if (!payout) return;

    const { data } = await supabase
      .from('referral_rewards')
      .select('*')
      .eq('user_id', payout.user_id)
      .neq('id', payout.id)
      .order('requested_at', { ascending: false })
      .limit(5);

    if (data) {
      setPayoutHistory(data);
    }
  };

  const handleProcessPayout = async (
    status: 'processing' | 'paid' | 'failed' | 'cancelled'
  ) => {
    if (!payout) return;

    setProcessing(true);
    const result = await referralService.adminProcessPayout(
      payout.id,
      status,
      adminNotes || undefined,
      status === 'failed' ? failureReason || undefined : undefined
    );

    setProcessing(false);

    if (result.success) {
      toast.success(`Payout ${status} successfully`);
      onSuccess();
      onClose();
    } else {
      toast.error(`Failed to process payout: ${result.error}`);
    }
  };

  const confirmProcessing = () => {
    setConfirmAction({
      action: 'processing',
      title: 'Mark as Processing',
      description: 'This will mark the payout as being processed. Continue?',
    });
  };

  const confirmPaid = () => {
    setConfirmAction({
      action: 'paid',
      title: 'Mark as Paid',
      description: 'This will mark the payout as completed and paid. Make sure payment has been sent. Continue?',
    });
  };

  const confirmFailed = () => {
    if (!failureReason.trim()) {
      toast.error('Please provide a failure reason');
      return;
    }
    setConfirmAction({
      action: 'failed',
      title: 'Mark as Failed',
      description: 'This will mark the payout as failed. The user will be notified. Continue?',
    });
  };

  const confirmCancel = () => {
    setConfirmAction({
      action: 'cancelled',
      title: 'Cancel Payout',
      description: 'This will cancel the payout request. This action cannot be undone. Continue?',
    });
  };

  const executeAction = async () => {
    if (!confirmAction) return;
    await handleProcessPayout(confirmAction.action);
    setConfirmAction(null);
  };

  if (!payout) return null;

  const canMarkProcessing = payout.payout_status === 'pending';
  const canMarkPaid = payout.payout_status === 'pending' || payout.payout_status === 'processing';
  const canMarkFailed = payout.payout_status === 'pending' || payout.payout_status === 'processing';
  const canCancel = payout.payout_status === 'pending';

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payout Request Details</DialogTitle>
            <DialogDescription>
              Review and process this payout request
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={payout.profile?.photo_url} />
                <AvatarFallback className="text-lg">
                  {payout.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{payout.profile?.username || 'Unknown User'}</h3>
                <p className="text-sm text-muted-foreground">{payout.profile?.email || 'No email'}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Member since {payout.profile?.created_at ? format(new Date(payout.profile.created_at), 'MMM d, yyyy') : 'Unknown'}
                </p>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto mt-1"
                  onClick={() => window.open(`/profile/${payout.user_id}`, '_blank')}
                >
                  View Profile <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              </div>
              <Badge variant={
                payout.payout_status === 'paid' ? 'default' :
                payout.payout_status === 'processing' ? 'default' :
                payout.payout_status === 'failed' ? 'destructive' :
                'secondary'
              } className={
                payout.payout_status === 'paid' ? 'bg-green-600' :
                payout.payout_status === 'processing' ? 'bg-blue-600' : ''
              }>
                {payout.payout_status}
              </Badge>
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Amount</Label>
                <p className="text-2xl font-bold">${payout.reward_amount.toFixed(2)}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Referral Count</Label>
                <p className="text-2xl font-bold">{payout.referral_count}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Method</Label>
                <p className="font-medium capitalize">{payout.payout_method || 'Not specified'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Payment Details</Label>
                <p className="font-medium">{payout.payout_email || 'Not provided'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Requested At</Label>
                <p className="text-sm">{format(new Date(payout.requested_at), 'PPpp')}</p>
              </div>
              {payout.processed_at && (
                <div>
                  <Label className="text-muted-foreground">Processed At</Label>
                  <p className="text-sm">{format(new Date(payout.processed_at), 'PPpp')}</p>
                </div>
              )}
              {payout.paid_at && (
                <div>
                  <Label className="text-muted-foreground">Paid At</Label>
                  <p className="text-sm">{format(new Date(payout.paid_at), 'PPpp')}</p>
                </div>
              )}
            </div>

            {payoutHistory.length > 0 && (
              <>
                <Separator />
                <div>
                  <Label className="text-muted-foreground mb-2 block">Previous Payouts</Label>
                  <div className="space-y-2">
                    {payoutHistory.map((prev) => (
                      <div key={prev.id} className="flex items-center justify-between text-sm p-2 bg-muted rounded">
                        <span>${prev.reward_amount.toFixed(2)}</span>
                        <Badge variant="outline">{prev.payout_status}</Badge>
                        <span className="text-muted-foreground">
                          {format(new Date(prev.requested_at), 'MMM d, yyyy')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />

            <div>
              <Label htmlFor="admin-notes">Admin Notes</Label>
              <Textarea
                id="admin-notes"
                placeholder="Add notes about this payout (optional)"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                rows={3}
                className="mt-2"
              />
            </div>

            {(canMarkFailed || payout.payout_status === 'failed') && (
              <div>
                <Label htmlFor="failure-reason">Failure Reason</Label>
                <Textarea
                  id="failure-reason"
                  placeholder="Required if marking as failed"
                  value={failureReason}
                  onChange={(e) => setFailureReason(e.target.value)}
                  rows={2}
                  className="mt-2"
                />
              </div>
            )}

            <Separator />

            <div className="flex flex-wrap gap-2">
              {canMarkProcessing && (
                <Button
                  onClick={confirmProcessing}
                  disabled={processing}
                  variant="outline"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Clock className="h-4 w-4 mr-2" />}
                  Mark as Processing
                </Button>
              )}

              {canMarkPaid && (
                <Button
                  onClick={confirmPaid}
                  disabled={processing}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Mark as Paid
                </Button>
              )}

              {canMarkFailed && (
                <Button
                  onClick={confirmFailed}
                  disabled={processing}
                  variant="destructive"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                  Mark as Failed
                </Button>
              )}

              {canCancel && (
                <Button
                  onClick={confirmCancel}
                  disabled={processing}
                  variant="outline"
                >
                  {processing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Ban className="h-4 w-4 mr-2" />}
                  Cancel Payout
                </Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={executeAction}>
              Continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
