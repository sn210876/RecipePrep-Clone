import { useEffect, useState } from 'react';
import { ExternalLink, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';

export function CheckoutRedirectPage() {
  const [targetUrl, setTargetUrl] = useState<string>('');
  const [redirectType, setRedirectType] = useState<'checkout' | 'search'>('checkout');
  const [countdown, setCountdown] = useState(3);
  const [manualMode, setManualMode] = useState(false);

  useEffect(() => {
    // Listen for messages from the parent window
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'checkout' || event.data.type === 'search') {
        setTargetUrl(event.data.url);
        setRedirectType(event.data.type);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  useEffect(() => {
    if (!targetUrl || manualMode) return;

    // Countdown timer
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }

    // Redirect after countdown
    if (countdown === 0) {
      window.location.href = targetUrl;
    }
  }, [countdown, targetUrl, manualMode]);

  const handleManualRedirect = () => {
    window.location.href = targetUrl;
  };

  const handleCancel = () => {
    window.close();
  };

  if (!targetUrl) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading...
            </CardTitle>
            <CardDescription>
              Preparing your checkout experience
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <ExternalLink className="w-6 h-6 text-blue-600" />
            {redirectType === 'checkout' ? 'Redirecting to Checkout' : 'Redirecting to Search'}
          </CardTitle>
          <CardDescription>
            {redirectType === 'checkout' 
              ? "You're being redirected to complete your purchase"
              : "You're being redirected to search for products"}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {!manualMode && (
            <div className="text-center py-8">
              <div className="relative inline-flex items-center justify-center w-24 h-24 mb-4">
                <div className="absolute inset-0 rounded-full border-4 border-blue-100"></div>
                <div 
                  className="absolute inset-0 rounded-full border-4 border-blue-600 border-t-transparent animate-spin"
                  style={{ animationDuration: '1s' }}
                ></div>
                <span className="text-3xl font-bold text-blue-600">{countdown}</span>
              </div>
              <p className="text-lg text-gray-700 mb-2">
                Redirecting in {countdown} second{countdown !== 1 ? 's' : ''}...
              </p>
              <p className="text-sm text-gray-500">
                You'll be taken to the external site shortly
              </p>
            </div>
          )}

          {manualMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <p className="text-gray-700 mb-4">
                Auto-redirect paused. Click the button below when you're ready.
              </p>
              <Button 
                onClick={handleManualRedirect}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <ExternalLink className="w-5 h-5 mr-2" />
                Continue to {redirectType === 'checkout' ? 'Checkout' : 'Search'}
              </Button>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h4 className="font-medium text-yellow-900 mb-1">Leaving Our App</h4>
                <p className="text-sm text-yellow-700">
                  You're being redirected to an external website. We use affiliate links to support the app.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setManualMode(!manualMode)}
              className="flex-1"
            >
              {manualMode ? 'Resume Auto-Redirect' : 'Wait, Let Me Review'}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Cancel & Go Back
            </Button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              Target: <span className="font-mono text-gray-700">{new URL(targetUrl).hostname}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}