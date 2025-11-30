import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Check, Sparkles } from 'lucide-react';
import { createCheckoutSession } from '../services/stripeService';
import { toast } from 'sonner';

interface PricingTiersProps {
  onSuccess?: () => void;
}

export function PricingTiers({ onSuccess }: PricingTiersProps) {
  const [customAmount, setCustomAmount] = useState('10');
  const [loading, setLoading] = useState(false);

  const handlePayment = async (amount: number) => {
    if (amount < 1) {
      toast.error('Minimum amount is $1.00');
      return;
    }

    setLoading(true);
    try {
      const { url } = await createCheckoutSession({ amount: amount * 100 });
      window.location.href = url;
    } catch (error: any) {
      toast.error(error.message || 'Failed to create checkout session');
      setLoading(false);
    }
  };

  const quickAmounts = [
    { amount: 1, label: 'Supporter' },
    { amount: 3, label: 'Friend' },
    { amount: 5, label: 'Fan' },
    { amount: 10, label: 'Recommended', featured: true },
    { amount: 15, label: 'Super Fan' },
    { amount: 20, label: 'Champion' },
  ];

  const features = [
    'Unlimited recipe storage',
    'YouTube recipe extraction',
    'Photo recipe scanning',
    'Meal planning & grocery lists',
    'Social feed & sharing',
    'Cook mode with voice controls',
    'No ads, ever',
    'Priority support',
  ];

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Choose Your Support Level</h2>
        <p className="text-gray-600">Pay what you want. Minimum $1/month. Recommended: $10/month</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {quickAmounts.map((tier) => (
          <Card
            key={tier.amount}
            className={`relative cursor-pointer transition-all hover:shadow-lg ${
              tier.featured ? 'ring-2 ring-orange-500 shadow-lg' : ''
            }`}
            onClick={() => handlePayment(tier.amount)}
          >
            {tier.featured && (
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Recommended
              </div>
            )}
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-3xl font-bold text-gray-900">
                ${tier.amount}
              </CardTitle>
              <CardDescription className="text-sm">{tier.label}</CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-xs text-gray-500">per month</p>
              <Button
                disabled={loading}
                className={`w-full mt-3 ${
                  tier.featured
                    ? 'bg-orange-500 hover:bg-orange-600'
                    : 'bg-gray-700 hover:bg-gray-800'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  handlePayment(tier.amount);
                }}
              >
                {loading ? 'Loading...' : 'Select'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-to-br from-orange-50 to-red-50">
        <CardHeader>
          <CardTitle className="text-center">Custom Amount</CardTitle>
          <CardDescription className="text-center">
            Choose any amount you like (minimum $1.00)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                $
              </span>
              <Input
                type="number"
                min="1"
                step="1"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="pl-7 text-lg"
                placeholder="10"
              />
            </div>
            <Button
              onClick={() => handlePayment(parseFloat(customAmount))}
              disabled={loading || parseFloat(customAmount) < 1}
              className="bg-orange-500 hover:bg-orange-600 px-8"
            >
              {loading ? 'Loading...' : 'Continue'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Check className="w-5 h-5 text-green-500" />
            What You Get
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {features.map((feature, idx) => (
              <li key={idx} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className="text-xs text-center text-gray-500">
        Secure payment processing by Stripe. Cancel anytime from your account settings.
        <br />
        No refunds, but you can cancel before your next billing cycle.
      </p>
    </div>
  );
}
