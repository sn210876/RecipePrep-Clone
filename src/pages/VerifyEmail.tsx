import { useState } from 'react';
import { Button } from '../components/ui/button';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';

export function VerifyEmail() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const handleResendVerification = async () => {
    if (!user?.email) return;

    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: resendError } = await supabase.auth.resend({
        type: 'signup',
        email: user.email,
      });

      if (resendError) throw resendError;

      setMessage('Verification email sent! Check your inbox.');
    } catch (err: any) {
      setError(err.message || 'Failed to resend verification email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-red-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4">
              <Mail className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h1>
            <p className="text-gray-600">
              Check your email and click the link to verify.
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-orange-800">
                <p className="font-medium mb-1">Email sent to:</p>
                <p className="font-mono text-orange-900">{user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>Check your inbox and spam folder</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>Click the verification link in the email</p>
            </div>
            <div className="flex items-start gap-3 text-sm text-gray-700">
              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p>Return to this page after verifying</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm mb-4">
              {message}
            </div>
          )}

          <div className="space-y-3">
            <Button
              onClick={handleResendVerification}
              disabled={loading}
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 text-base shadow-lg"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Resend Verification Email
                </span>
              )}
            </Button>

            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
            >
              I've Verified - Refresh Page
            </Button>
          </div>

          <div className="mt-6 text-center">
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="text-sm text-gray-600 hover:text-gray-700"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
