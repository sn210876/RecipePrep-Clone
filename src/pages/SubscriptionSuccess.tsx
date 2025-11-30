import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { useSubscription } from '../context/SubscriptionContext';

export default function SubscriptionSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { subscriptionStatus, refreshSubscription } = useSubscription();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      const sessionId = searchParams.get('session_id');

      if (!sessionId) {
        navigate('/subscription');
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 2000));

      await refreshSubscription();
      setChecking(false);
    };

    checkStatus();
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center space-y-4">
            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mx-auto" />
            <p className="text-lg text-gray-600">Confirming your subscription...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-gray-900">
            Welcome to MealScrape Premium!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-2">
            <p className="text-gray-600">
              Your subscription is now active. Thank you for supporting MealScrape!
            </p>
            {subscriptionStatus?.subscription && (
              <p className="text-sm text-gray-500">
                {subscriptionStatus.subscription.monthly_amount && (
                  <>
                    ${(subscriptionStatus.subscription.monthly_amount / 100).toFixed(2)}/month
                    {subscriptionStatus.subscription.next_billing_date && (
                      <>
                        {' '}• Next billing:{' '}
                        {new Date(subscriptionStatus.subscription.next_billing_date).toLocaleDateString()}
                      </>
                    )}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2">What's Next?</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Extract recipes from any YouTube video</li>
              <li>• Scan recipes from photos instantly</li>
              <li>• Create unlimited meal plans</li>
              <li>• Share recipes with friends</li>
              <li>• Use cook mode with voice controls</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Button
              onClick={() => navigate('/discover')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Start Using MealScrape
            </Button>
            <Button
              onClick={() => navigate('/subscription')}
              variant="outline"
              className="w-full"
            >
              View Subscription Details
            </Button>
          </div>

          <p className="text-xs text-center text-gray-500">
            Need help? Contact us or visit your subscription settings to manage your plan.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
