import { ReactNode } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Crown, Lock } from 'lucide-react';

interface SubscriptionGateProps {
  children: ReactNode;
  onNavigate: (page: string) => void;
  featureName?: string;
}

export function SubscriptionGate({ children, onNavigate, featureName = 'this feature' }: SubscriptionGateProps) {
  const { subscriptionStatus, loading } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Block access if subscription is expired and grace period is over
  if (subscriptionStatus && !subscriptionStatus.hasAccess && subscriptionStatus.needsPayment) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="border-2 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-10 h-10 text-red-600" />
            </div>
            <CardTitle className="text-2xl text-red-900">Subscription Required</CardTitle>
            <CardDescription className="text-red-700 text-base">
              Your free trial has ended. Subscribe to continue using {featureName}.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-white rounded-lg p-6 space-y-3">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Crown className="w-5 h-5 text-orange-500" />
                What you get with a subscription:
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Full access to all recipes and features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Social feed and community features</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Meal planner and grocery lists</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Save and organize unlimited recipes</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-500 mt-1">✓</span>
                  <span>Pay what you want - starting at just $1/month</span>
                </li>
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => onNavigate('subscription')}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
                size="lg"
              >
                <Crown className="w-5 h-5 mr-2" />
                Choose Your Plan
              </Button>
              <Button
                onClick={() => onNavigate('discover-recipes')}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                Browse Public Recipes
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Allow access
  return <>{children}</>;
}
