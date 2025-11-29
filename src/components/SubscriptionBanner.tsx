import { AlertCircle, Crown, Clock } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { useSubscription } from '../context/SubscriptionContext';

interface SubscriptionBannerProps {
  onNavigate: (page: string) => void;
}

export function SubscriptionBanner({ onNavigate }: SubscriptionBannerProps) {
  const { subscriptionStatus, loading } = useSubscription();

  if (loading || !subscriptionStatus) return null;

  // Show warning if trial is expiring soon (within 14 days)
  if (subscriptionStatus.daysRemaining !== null &&
      subscriptionStatus.daysRemaining > 0 &&
      subscriptionStatus.daysRemaining <= 14 &&
      !subscriptionStatus.isTrialExpired) {
    return (
      <Alert className="border-amber-300 bg-amber-50 mx-4 my-3">
        <Clock className="h-4 w-4 text-amber-600" />
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium text-amber-900">
              Trial ending soon!
            </span>
            <span className="text-amber-700 ml-2">
              {subscriptionStatus.daysRemaining} day{subscriptionStatus.daysRemaining !== 1 ? 's' : ''} remaining.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onNavigate('subscription')}
            className="border-amber-600 text-amber-700 hover:bg-amber-100 whitespace-nowrap shrink-0"
          >
            View Options
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show urgent warning if trial expired but in grace period
  if (subscriptionStatus.isTrialExpired && subscriptionStatus.isInGracePeriod) {
    const daysLeftInGrace = 7 + (subscriptionStatus.daysRemaining || 0);
    return (
      <Alert className="border-red-300 bg-red-50 mx-4 my-3">
        <AlertCircle className="h-4 w-4 text-red-600" />
        <AlertDescription className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="text-sm">
            <span className="font-medium text-red-900">
              Trial expired!
            </span>
            <span className="text-red-700 ml-2">
              {daysLeftInGrace} day{daysLeftInGrace !== 1 ? 's' : ''} left in grace period.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate('subscription')}
            className="bg-red-600 hover:bg-red-700 text-white whitespace-nowrap shrink-0"
          >
            Choose Plan
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  // Show blocked message if no access
  if (!subscriptionStatus.hasAccess && subscriptionStatus.needsPayment) {
    return (
      <Alert className="border-red-400 bg-red-100 mb-4">
        <Crown className="h-4 w-4 text-red-700" />
        <AlertDescription className="flex items-center justify-between">
          <div>
            <span className="font-medium text-red-900">
              Subscription Required
            </span>
            <span className="text-red-800 ml-2">
              Your trial has ended. Please choose a plan to continue using the app.
            </span>
          </div>
          <Button
            size="sm"
            onClick={() => onNavigate('subscription')}
            className="bg-red-700 hover:bg-red-800 text-white"
          >
            Choose Plan Now
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
