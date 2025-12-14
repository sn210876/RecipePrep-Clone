import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PayoutStats from '@/components/admin/PayoutStats';
import PayoutTable from '@/components/admin/PayoutTable';
import PayoutModal from '@/components/admin/PayoutModal';
import { referralService, ReferralReward } from '@/services/referralService';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { RefreshCw, Shield } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

export default function AdminPayouts() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [payouts, setPayouts] = useState<ReferralReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState<PayoutWithUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');

  useEffect(() => {
    if (!isAdmin) {
      toast.error('Access denied: Admin privileges required');
      navigate('/');
      return;
    }
    loadPayouts();
    subscribeToPayouts();
  }, [isAdmin, navigate]);

  const loadPayouts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('referral_rewards')
      .select('*')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('Error loading payouts:', error);
      toast.error('Failed to load payouts');
    } else {
      setPayouts(data || []);
    }
    setLoading(false);
  };

  const subscribeToPayouts = () => {
    const channel = supabase
      .channel('admin-payouts')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'referral_rewards',
        },
        (payload) => {
          console.log('Payout changed:', payload);
          if (payload.eventType === 'INSERT') {
            toast.info('New payout request received');
          }
          loadPayouts();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  };

  const handleViewDetails = (payout: PayoutWithUser) => {
    setSelectedPayout(payout);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedPayout(null);
  };

  const handlePayoutSuccess = () => {
    loadPayouts();
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Shield className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">You need admin privileges to view this page.</p>
        </div>
      </div>
    );
  }

  const pendingPayouts = payouts.filter(p => p.payout_status === 'pending');
  const processingPayouts = payouts.filter(p => p.payout_status === 'processing');
  const paidPayouts = payouts.filter(p => p.payout_status === 'paid');
  const failedPayouts = payouts.filter(p => p.payout_status === 'failed');

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Admin Payout Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and process referral payout requests
          </p>
        </div>
        <Button
          onClick={loadPayouts}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <PayoutStats payouts={payouts} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">
            Pending ({pendingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="processing">
            Processing ({processingPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="paid">
            Paid ({paidPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="failed">
            Failed ({failedPayouts.length})
          </TabsTrigger>
          <TabsTrigger value="all">
            All ({payouts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <PayoutTable
              payouts={pendingPayouts}
              onViewDetails={handleViewDetails}
              filterStatus="pending"
            />
          )}
        </TabsContent>

        <TabsContent value="processing">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <PayoutTable
              payouts={processingPayouts}
              onViewDetails={handleViewDetails}
              filterStatus="processing"
            />
          )}
        </TabsContent>

        <TabsContent value="paid">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <PayoutTable
              payouts={paidPayouts}
              onViewDetails={handleViewDetails}
              filterStatus="paid"
            />
          )}
        </TabsContent>

        <TabsContent value="failed">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <PayoutTable
              payouts={failedPayouts}
              onViewDetails={handleViewDetails}
              filterStatus="failed"
            />
          )}
        </TabsContent>

        <TabsContent value="all">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : (
            <PayoutTable
              payouts={payouts}
              onViewDetails={handleViewDetails}
              filterStatus="all"
            />
          )}
        </TabsContent>
      </Tabs>

      <PayoutModal
        payout={selectedPayout}
        open={modalOpen}
        onClose={handleModalClose}
        onSuccess={handlePayoutSuccess}
      />
    </div>
  );
}
