import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { supabase } from '../lib/supabase';
import { CheckCircle2 } from 'lucide-react';

export function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [hasToken, setHasToken] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initPasswordReset = async () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken && refreshToken) {
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
              setError('Session expired. Please request a new reset link.');
            } else {
              await new Promise(resolve => setTimeout(resolve, 500));
              setHasToken(true);
            }
          } else {
            setError('Invalid reset link. Please request a new one.');
          }
        } else {
          setError('Invalid or expired reset link. Please request a new one.');
        }
      } catch (err) {
        console.error('Error setting session:', err);
        setError('Failed to verify reset link. Please try again.');
      } finally {
        setIsInitializing(false);
      }
    };

    initPasswordReset();
  }, []);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password,
      });
      if (updateError) throw updateError;
      setSuccess(true);
      setTimeout(() => {
        window.location.href = '/#settings';
        window.location.reload();
      }, 2000);
    } catch (err: any) {
      console.error('Password reset failed:', err);
      setError(err.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Success Screen - Mobile Optimized
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
        {/* Background decorative blurs - responsive */}
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
            <div className="text-center">
              {/* Icon - responsive sizing */}
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
                <CheckCircle2 className="w-10 h-10 sm:w-12 sm:h-12 text-white" />
              </div>
              
              {/* Heading - responsive text */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                Password Reset!
              </h1>
              
              {/* Description */}
              <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed px-2">
                Your password has been successfully updated.
              </p>
              
              {/* Loading animation */}
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-red-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-orange-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
              
              {/* Redirect message */}
              <p className="text-xs sm:text-sm text-gray-500 mt-6">
                Redirecting to login...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ⏳ Loading Screen - Mobile Optimized
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
            <div className="text-center">
              {/* Spinner icon - responsive */}
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
              
              {/* Heading */}
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
                Verifying Reset Link...
              </h1>
              
              {/* Description */}
              <p className="text-sm sm:text-base text-gray-600">Please wait</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ❌ Invalid Link Screen - Mobile Optimized
  if (!hasToken) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
        <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />
        
        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
            <div className="text-center">
              {/* Warning icon - responsive */}
              <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-6">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              
              {/* Heading - responsive */}
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
                Invalid Reset Link
              </h1>
              
              {/* Error message - word break for mobile */}
              <p className="text-sm sm:text-base text-gray-600 mb-6 leading-relaxed px-2 break-words">
                {error || 'This password reset link is invalid or has expired.'}
              </p>
              
              {/* Back button - touch friendly */}
              <Button
                onClick={() => (window.location.href = '/')}
                className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 text-base shadow-lg active:scale-98 transition-transform"
              >
                Back to Sign In
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ Password Form - Mobile Optimized
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-amber-50 flex items-center justify-center px-4 pt-safe pb-safe">
      <div className="absolute top-0 right-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-bl from-red-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-64 h-64 sm:w-96 sm:h-96 bg-gradient-to-tr from-orange-200/30 to-transparent rounded-full blur-3xl" />
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-6 sm:p-8 border border-red-100">
          {/* Header section */}
          <div className="text-center mb-6 sm:mb-8">
            {/* Icon - responsive sizing */}
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-lg mb-4">
              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
                />
              </svg>
            </div>
            
            {/* Heading - responsive text */}
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 leading-tight">
              Create New Password
            </h1>
            
            {/* Description */}
            <p className="text-sm sm:text-base text-gray-600 leading-relaxed">
              Enter your new password below
            </p>
          </div>

          {/* Form - mobile optimized */}
          <form onSubmit={handleResetPassword} className="space-y-4 sm:space-y-5">
            {/* New Password field */}
            <div>
              <label 
                htmlFor="password" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                New Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-12 text-base"
                disabled={loading}
                autoComplete="new-password"
                autoFocus
              />
              <p className="text-xs text-gray-500 mt-1.5">
                Must be at least 6 characters
              </p>
            </div>

            {/* Confirm Password field */}
            <div>
              <label 
                htmlFor="confirmPassword" 
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Confirm Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full h-12 text-base"
                disabled={loading}
                autoComplete="new-password"
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
              className="w-full bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-semibold h-12 text-base shadow-lg active:scale-98 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Updating...
                </span>
              ) : (
                'Reset Password'
              )}
            </Button>
          </form>

          {/* Security note - mobile friendly */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex items-start gap-2 text-xs text-gray-500">
              <svg className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              <p className="leading-relaxed">
                Your password will be encrypted and stored securely.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom safe spacing */}
        <div className="h-8 sm:h-4" />
      </div>
    </div>
  );
}