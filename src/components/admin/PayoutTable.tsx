import { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { format } from 'date-fns';

interface ReferralReward {
  id: string;
  user_id: string;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  reward_amount: number;
  payout_method: string | null;
  payout_email: string | null;
  requested_at: string;
  processed_at: string | null;
  paid_at: string | null;
  admin_notes: string | null;
  failure_reason: string | null;
}

interface UserProfile {
  id: string;
  username: string;
  email: string;
  photo_url?: string;
}

interface PayoutWithUser extends ReferralReward {
  profile?: UserProfile;
}

interface PayoutTableProps {
  payouts: ReferralReward[];
  onViewDetails: (payout: PayoutWithUser) => void;
  filterStatus?: string;
}

export default function PayoutTable({ payouts, onViewDetails, filterStatus = 'all' }: PayoutTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(filterStatus);
  const [payoutsWithUsers, setPayoutsWithUsers] = useState<PayoutWithUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfiles();
  }, [payouts]);

  useEffect(() => {
    setStatusFilter(filterStatus);
  }, [filterStatus]);

  const loadUserProfiles = async () => {
    setLoading(true);
    const userIds = [...new Set(payouts.map(p => p.user_id))];

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, email, photo_url')
      .in('id', userIds);

    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);

    const enrichedPayouts = payouts.map(payout => ({
      ...payout,
      profile: profileMap.get(payout.user_id),
    }));

    setPayoutsWithUsers(enrichedPayouts);
    setLoading(false);
  };

  const filteredPayouts = payoutsWithUsers.filter(payout => {
    const matchesStatus = statusFilter === 'all' || payout.payout_status === statusFilter;

    const matchesSearch = !searchTerm ||
      payout.profile?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payout.payout_method?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesStatus && matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: any; label: string }> = {
      pending: { variant: 'secondary', label: 'Pending' },
      processing: { variant: 'default', label: 'Processing' },
      paid: { variant: 'default', label: 'Paid' },
      failed: { variant: 'destructive', label: 'Failed' },
      cancelled: { variant: 'outline', label: 'Cancelled' },
    };

    const config = variants[status] || variants.pending;
    return (
      <Badge variant={config.variant} className={
        status === 'paid' ? 'bg-green-600 hover:bg-green-700' :
        status === 'processing' ? 'bg-blue-600 hover:bg-blue-700' : ''
      }>
        {config.label}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by username, email, or payment method..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
            <SelectItem value="failed">Failed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payment Method</TableHead>
              <TableHead>Payment Details</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPayouts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No payout requests found
                </TableCell>
              </TableRow>
            ) : (
              filteredPayouts.map((payout) => (
                <TableRow key={payout.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={payout.profile?.photo_url} />
                        <AvatarFallback>
                          {payout.profile?.username?.substring(0, 2).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{payout.profile?.username || 'Unknown'}</div>
                        <div className="text-xs text-muted-foreground">{payout.profile?.email || 'No email'}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold">${payout.reward_amount.toFixed(2)}</TableCell>
                  <TableCell className="capitalize">{payout.payout_method || 'N/A'}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{payout.payout_email || 'N/A'}</TableCell>
                  <TableCell>{getStatusBadge(payout.payout_status)}</TableCell>
                  <TableCell>
                    {format(new Date(payout.requested_at), 'MMM d, yyyy')}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(payout)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="text-sm text-muted-foreground">
        Showing {filteredPayouts.length} of {payoutsWithUsers.length} payout requests
      </div>
    </div>
  );
}
