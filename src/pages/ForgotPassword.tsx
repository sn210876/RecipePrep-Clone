import { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail } from 'lucide-react';

interface ForgotPasswordProps {
  onBack: () => void;
}

export function ForgotPassword({ onBack }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'https://sn210876-recipeprep-jzt5.bolt.host/reset-password'
      });

      if (resetError) throw resetError;

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
        {/* Background decorative blurs - adjusted for mobile */}
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
            <div className="text-center mb-6 sm:mb-8">
              {/* Icon - responsive sizing */}
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4">
                <Mail className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              </div>
              
              {/* Heading - responsive text */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                Check Your Email
              </h1>
              
              {/* Body text - responsive and word-break for long emails */}
              <p className="text-sm sm:text-base text-gray-600">
                We sent a password reset link to
              </p>
              <p className="text-sm sm:text-base text-orange-600 font-semibold mt-1 break-words px-2">
                {email}
              </p>
            </div>

            {/* Info box - mobile optimized */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 sm:p-4 mb-6">
              <div className="flex items-start gap-2 sm:gap-3">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-xs sm:text-sm text-orange-800 min-w-0">
                  <p className="font-medium mb-1 leading-snug">
                    Click the link in your email to reset your password.
                  </p>
                  <p className="text-orange-700 leading-snug">
                    The link will expire in 1 hour.
                  </p>
                </div>
              </div>
            </div>

            {/* Back button - touch friendly */}
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full h-12 sm:h-11 border-orange-300 text-orange-700 hover:bg-orange-50 active:scale-98 transition-transform text-base sm:text-sm"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
      {/* Background decorative blurs - adjusted for mobile */}
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
          {/* Back button - touch friendly */}
          <button
            onClick={onBack}
            className="flex items-center text-orange-600 hover:text-orange-700 mb-6 transition-colors active:scale-95 py-2 -ml-2 px-2 rounded-lg"
            type="button"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="text-sm sm:text-base">Back to Sign In</span>
          </button>

          <div className="text-center mb-6 sm:mb-8">
            {/* Icon - responsive sizing */}
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </div>
            
            {/* Heading - responsive text */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              Reset Password
            </h1>
            
            {/* Body text - responsive */}
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed px-2">
              Enter your email and we'll send you a reset link
            </p>
          </div>

          <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
            <div>
              <label 
                htmlFor="email" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Email Address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full h-12 text-base"
                disabled={loading}
                autoComplete="email"
                autoFocus
              />
            </div>

            {/* Error message - mobile optimized */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-3 sm:px-4 rounded-lg text-xs sm:text-sm leading-relaxed break-words">
                {error}
              </div>
            )}

            {/* Submit button - touch friendly */}
            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 sm:h-12 text-base shadow-lg active:scale-98 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          {/* Additional help text - mobile friendly */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <p className="text-xs text-center text-gray-500 leading-relaxed">
              Remember your password?{' '}
              <button
                onClick={onBack}
                className="text-orange-600 hover:text-orange-700 font-medium underline active:scale-95 transition-transform inline-block"
                type="button"
              >
                Sign in here
              </button>
            </p>
          </div>
        </div>

        {/* Bottom safe spacing for mobile gestures */}
        <div className="h-8 sm:h-4" />
      </div>
    </div>
  );
}