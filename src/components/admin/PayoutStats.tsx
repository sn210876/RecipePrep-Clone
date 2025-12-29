import { DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface ReferralReward {
  id: string;
  user_id: string;
  payout_status: 'pending' | 'processing' | 'paid' | 'failed' | 'cancelled';
  reward_amount: number;
  requested_at: string;
  paid_at: string | null;
}

interface PayoutStatsProps {
  payouts: ReferralReward[];
}

export default function PayoutStats({ payouts }: PayoutStatsProps) {
  const pendingPayouts = payouts.filter(p => p.payout_status === 'pending');
  const processingPayouts = payouts.filter(p => p.payout_status === 'processing');
  const paidPayouts = payouts.filter(p => p.payout_status === 'paid');
  const failedPayouts = payouts.filter(p => p.payout_status === 'failed');

  const totalPendingAmount = pendingPayouts.reduce((sum, p) => sum + p.reward_amount, 0);
  const totalPaidAmount = paidPayouts.reduce((sum, p) => sum + p.reward_amount, 0);

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const paidThisMonth = paidPayouts.filter(p => {
    if (!p.paid_at) return false;
    const paidDate = new Date(p.paid_at);
    return paidDate.getMonth() === currentMonth && paidDate.getFullYear() === currentYear;
  });
  const totalPaidThisMonth = paidThisMonth.reduce((sum, p) => sum + p.reward_amount, 0);

  const stats = [
    {
      title: 'Pending Payouts',
      value: pendingPayouts.length,
      amount: `$${totalPendingAmount.toFixed(2)}`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      title: 'Processing',
      value: processingPayouts.length,
      amount: `$${processingPayouts.reduce((sum, p) => sum + p.reward_amount, 0).toFixed(2)}`,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Paid This Month',
      value: paidThisMonth.length,
      amount: `$${totalPaidThisMonth.toFixed(2)}`,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Failed',
      value: failedPayouts.length,
      amount: `$${failedPayouts.reduce((sum, p) => sum + p.reward_amount, 0).toFixed(2)}`,
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-100',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`p-2 rounded-full ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground mt-1">{stat.amount}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
