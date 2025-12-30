import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, ChefHat, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Capacitor } from '@capacitor/core';
import { Browser } from '@capacitor/browser';
import { App as CapApp } from '@capacitor/app';
import { withTimeout, AuthTimeoutError } from '../lib/authTimeout';
import { useAuth } from '../context/AuthContext';

export default function AuthForm() {
  const { refreshSession } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [oauthInProgress, setOauthInProgress] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  useEffect(() => {
    const checkOAuthCallback = async () => {
      console.log('🔍 Checking for OAuth callback on mount...');

      // On mobile, OAuth is handled by the appUrlOpen listener, not this function
      if (Capacitor.isNativePlatform()) {
        console.log('📱 Mobile platform - skipping checkOAuthCallback (handled by deep link listener)');
        // Still clean up any stale OAuth flags
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('✅ Valid session exists, cleaning up OAuth flags');
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_start_time');
          localStorage.removeItem('oauth_error');
        }
        return;
      }

      // First, check if there's already a valid session - if so, clean up OAuth flags
      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (existingSession) {
        console.log('✅ Valid session already exists, cleaning up OAuth flags');
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_start_time');
        localStorage.removeItem('oauth_error');
        return;
      }

      const hash = window.location.hash;
      const searchParams = new URLSearchParams(window.location.search);
      const oauthInProgress = localStorage.getItem('oauth_in_progress');
      const oauthError = localStorage.getItem('oauth_error');
      const oauthStartTime = localStorage.getItem('oauth_start_time');

      const hasTokenInHash = hash && hash.includes('access_token');
      const hasTokenInQuery = searchParams.has('access_token');
      const hasError = searchParams.has('error');
      const errorDescription = searchParams.get('error_description');

      console.log('🔍 OAuth check:', {
        hasTokenInHash,
        hasTokenInQuery,
        hasError,
        errorDescription,
        oauthInProgress,
        oauthError,
        oauthStartTime,
        hash: hash.substring(0, 50),
        searchParams: searchParams.toString().substring(0, 50)
      });

      if (hasError) {
        console.error('❌ OAuth error in URL:', {
          error: searchParams.get('error'),
          description: errorDescription
        });
        let errorMsg = 'Google sign in failed';
        if (errorDescription?.includes('redirect_uri_mismatch')) {
          errorMsg = 'OAuth configuration error. Please check that redirect URLs match in Google Console and Supabase Dashboard.';
        } else if (errorDescription) {
          errorMsg = `Sign in failed: ${errorDescription}`;
        }
        setError(errorMsg);
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_start_time');
        setLoading(false);
        setOauthInProgress(false);
        return;
      }

      if (oauthStartTime) {
        const timeElapsed = Date.now() - parseInt(oauthStartTime);
        console.log(`⏱️ Time since OAuth started: ${timeElapsed}ms`);

        if (timeElapsed > 300000) {
          console.log('⏱️ OAuth timeout (>5 minutes), cleaning up stale state');
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_start_time');
          localStorage.removeItem('oauth_error');
          return;
        }
      }

      if (oauthError) {
        console.log('❌ OAuth error detected:', oauthError);
        setError(`Sign in failed: ${oauthError}`);
        localStorage.removeItem('oauth_error');
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_start_time');
        setLoading(false);
        setOauthInProgress(false);
        return;
      }

      if (oauthInProgress) {
        console.log(`✅ Returning from ${oauthInProgress} OAuth!`);
        setLoading(true);
        setOauthInProgress(true);
        setMessage('Completing sign in...');

        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_start_time');

        const attemptSessionRefresh = async (maxAttempts = 6) => {
          for (let i = 1; i <= maxAttempts; i++) {
            console.log(`🔄 Session refresh attempt ${i}/${maxAttempts}...`);
            const session = await refreshSession();

            if (session) {
              console.log('✅ OAuth session established successfully!');
              setLoading(false);
              setOauthInProgress(false);
              setError('');
              localStorage.removeItem('oauth_error');
              return true;
            }

            if (i < maxAttempts) {
              const delay = Math.min(i * 1500, 5000);
              console.log(`❌ No session yet, waiting ${delay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
          }

          console.log('❌ Still no session after all attempts');
          console.error('⚠️ No tokens found in URL after OAuth redirect!');
          console.error('⚠️ This usually means redirect URLs are not configured correctly.');
          console.error('⚠️ Check GOOGLE_OAUTH_SETUP.md for configuration instructions.');

          const errorMsg = localStorage.getItem('oauth_error');
          setError(errorMsg || 'OAuth redirect succeeded but no authentication tokens received. Please verify your redirect URLs are configured correctly in both Google Console and Supabase Dashboard. See GOOGLE_OAUTH_SETUP.md for details.');
          setLoading(false);
          setOauthInProgress(false);
          localStorage.removeItem('oauth_error');
          return false;
        };

        setTimeout(() => attemptSessionRefresh(), 1500);
      } else if (hasTokenInHash || hasTokenInQuery) {
        console.log('✅ OAuth tokens detected in URL but no flag - handling anyway');
        setLoading(true);
        setOauthInProgress(true);
        setMessage('Processing sign in...');

        setTimeout(async () => {
          console.log('🔄 Forcing session refresh after OAuth...');
          const session = await refreshSession();

          if (session) {
            console.log('✅ OAuth session established successfully!');
            setLoading(false);
            setOauthInProgress(false);
          } else {
            console.log('❌ No session found after OAuth');
            setError('Sign in completed but session not found. Please try again.');
            setLoading(false);
            setOauthInProgress(false);
          }
        }, 1500);
      } else {
        console.log('ℹ️ No OAuth activity detected');
      }
    };

    const handleOAuthComplete = async (event: any) => {
      console.log('📢 Received oauth-callback-complete event:', event.detail);

      if (event.detail.success) {
        console.log('✅ OAuth callback successful, refreshing session...');
        setMessage('Completing sign in...');
        setLoading(true);
        setOauthInProgress(true);

        setTimeout(async () => {
          const session = await refreshSession();
          if (session) {
            console.log('✅ Session confirmed after OAuth!');
            setLoading(false);
            setOauthInProgress(false);
            setError('');
          } else {
            console.log('⚠️ No session found, will retry...');
          }
        }, 1000);
      } else {
        console.log('❌ OAuth callback failed');
        setError('Sign in failed. Please try again.');
        setLoading(false);
        setOauthInProgress(false);
      }
    };

    window.addEventListener('oauth-callback-complete', handleOAuthComplete);

    // Setup deep link listener for mobile OAuth callback
    let appUrlListener: any;
    if (Capacitor.isNativePlatform()) {
      console.log('📱 Setting up App URL listener for OAuth callbacks');

      appUrlListener = CapApp.addListener('appUrlOpen', async (event: any) => {
        console.log('🔗 App URL opened:', event.url);

        // Clean up OAuth flags immediately to prevent checkOAuthCallback from running
        localStorage.removeItem('oauth_in_progress');
        localStorage.removeItem('oauth_start_time');

        // Close the in-app browser
        try {
          await Browser.close();
          console.log('✅ In-app browser closed');
        } catch (e) {
          console.log('ℹ️ Browser was already closed or error closing:', e);
        }

        const url = new URL(event.url);
        const hash = url.hash;
        const searchParams = url.searchParams;

        console.log('🔍 Processing OAuth callback URL:', {
          hash: hash.substring(0, 50),
          searchParams: searchParams.toString().substring(0, 50)
        });

        // Check if this is an OAuth callback with tokens
        if (hash && hash.includes('access_token')) {
          console.log('✅ OAuth tokens found in URL hash');
          setLoading(true);
          setOauthInProgress(true);
          setMessage('Completing sign in...');

          try {
            const hashParams = new URLSearchParams(hash.substring(1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (!accessToken) {
              throw new Error('No access token found in callback');
            }

            console.log('🔑 Setting session with tokens...');

            // Set the session with the tokens
            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });

            if (sessionError) {
              throw sessionError;
            }

            console.log('✅ Session set successfully from OAuth callback');

            // Give Supabase a moment to persist the session
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Verify the session was saved
            const { data: { session: verifySession } } = await supabase.auth.getSession();
            if (!verifySession) {
              throw new Error('Session not persisted after setting tokens');
            }

            console.log('✅ Session verified and persisted!');

            // Update the context
            await refreshSession();

            // Clean up all OAuth-related data
            localStorage.removeItem('oauth_error');

            setLoading(false);
            setOauthInProgress(false);
            setError('');

            console.log('✅ OAuth flow completed successfully!');
          } catch (err: any) {
            console.error('❌ Error processing OAuth callback:', err);
            setError(err.message || 'Failed to complete sign in');
            setLoading(false);
            setOauthInProgress(false);
          }
        } else if (searchParams.has('error')) {
          console.error('❌ OAuth error in callback:', searchParams.get('error'));
          setError(`Sign in failed: ${searchParams.get('error_description') || searchParams.get('error')}`);
          setLoading(false);
          setOauthInProgress(false);
          localStorage.removeItem('oauth_error');
        }
      });
    }

    checkOAuthCallback();

    return () => {
      window.removeEventListener('oauth-callback-complete', handleOAuthComplete);
      if (appUrlListener) {
        appUrlListener.remove();
      }
    };
  }, [refreshSession]);

 const getRedirectUrl = () => {
  if (Capacitor.isNativePlatform()) {
    // Use HTTPS URL - Android App Links will intercept and open the app
    const redirectUrl = 'https://mealscrape.com/auth/callback';
    console.log('🔗 Mobile redirect URL (App Links):', redirectUrl);
    return redirectUrl;
  }

  const origin = window.location.origin;
  console.log('🔗 Web redirect URL:', origin);
  return origin;
};

  const handleSubmit = async () => {
    setError('');
    setMessage('');

    // Validation
    if (!formData.email || !formData.password) {
      setError('Please fill in all required fields');
      return;
    }

    if (!isLogin) {
      if (!formData.name) {
        setError('Please enter your name');
        return;
      }
      if (formData.password !== formData.confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        // Sign In
        console.log('🔐 Attempting email/password sign in...');

        try {
          const signInResult = await withTimeout(
            supabase.auth.signInWithPassword({
              email: formData.email,
              password: formData.password,
            }),
            { timeoutMs: 15000, operationName: 'Sign In' }
          );

          const { data, error } = signInResult as any;

          if (error) {
            console.error('❌ Sign in error:', error);

            if (error.message.includes('Invalid login credentials')) {
              throw new Error('Invalid email or password. If you signed up with Google, please use the "Sign in with Google" button instead.');
            } else if (error.message.includes('Email not confirmed')) {
              throw new Error('Please verify your email address before signing in. Check your inbox for the verification link.');
            } else if (error.message.includes('User not found')) {
              throw new Error('No account found with this email address. Please sign up first or try signing in with Google.');
            } else {
              throw error;
            }
          }

          if (!data.user?.email_confirmed_at) {
            console.warn('⚠️ Email not verified');
            setError('Please verify your email address before signing in. Check your inbox for the verification link.');
            setLoading(false);
            return;
          }

          console.log('✅ Sign in successful - forcing session refresh...');

          setTimeout(async () => {
            console.log('🔄 Force checking session after login...');
            await refreshSession();
          }, 500);

        } catch (authError) {
          if (authError instanceof AuthTimeoutError) {
            console.error('⏱️ Sign in timed out, attempting session refresh...');
            setError('Sign in is taking longer than expected. Checking your session...');

            setTimeout(async () => {
              const session = await refreshSession();
              if (session) {
                console.log('✅ Session found after timeout!');
                setError('');
              } else {
                console.log('❌ No session found after timeout');
                setError('Sign in timed out. Please try again or contact support if the issue persists.');
                setLoading(false);
              }
            }, 1000);
            return;
          }
          throw authError;
        }

        console.log('✅ Sign in completed');
      } else {
        // Sign Up
        console.log('📝 Attempting sign up...');

        // Check for referral code in URL
        const urlParams = new URLSearchParams(window.location.search);
        const referralCode = urlParams.get('ref');

        const { data, error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
              referral_code: referralCode || null,
            },
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (error) throw error;

        // Track referral after signup if code exists
        if (referralCode && data.user) {
          console.log('🎯 Tracking referral signup with code:', referralCode, 'for user:', data.user.id);
          try {
            const { data: trackResult, error: trackError } = await supabase.rpc('track_referral_signup', {
              p_user_id: data.user.id,
              p_referral_code: referralCode
            });
            if (trackError) {
              console.error('⚠️ Referral tracking error:', trackError);
            } else {
              console.log('✅ Referral tracked successfully, result:', trackResult);
            }
          } catch (refError) {
            console.error('⚠️ Referral tracking exception:', refError);
          }
        } else {
          console.log('ℹ️ No referral code in URL or no user');
        }

        console.log('✅ Sign up successful - check email');
        setMessage('Check your email for the verification link!');
      }
    } catch (err: any) {
      console.error('❌ Auth error:', err);
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    console.log('🔵 Google login initiated');
    console.log('🔵 Platform:', Capacitor.isNativePlatform() ? 'Mobile' : 'Web');
    console.log('🔵 Current URL:', window.location.href);

    localStorage.removeItem('oauth_error');

    setLoading(true);
    setOauthInProgress(true);
    setError('');
    setMessage('Opening Google sign in...');

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const referralCode = urlParams.get('ref');
      if (referralCode) {
        console.log('🎯 Storing referral code in localStorage:', referralCode);
        localStorage.setItem('pending_referral_code', referralCode);
      }

      localStorage.setItem('oauth_in_progress', 'google');
      localStorage.setItem('oauth_start_time', Date.now().toString());
      console.log('💾 Saved OAuth state to localStorage');

      const redirectUrl = getRedirectUrl();
      console.log('🔵 Redirect URL that will be sent to Google:', redirectUrl);
      console.log('🔵 ⚠️ This URL must be configured in:');
      console.log('🔵    1. Google Cloud Console > Credentials > Authorized redirect URIs');
      console.log('🔵       Add: https://mealscrape.com/auth/callback');
      console.log('🔵    2. Supabase Dashboard > Authentication > URL Configuration > Redirect URLs');
      console.log('🔵       Add: https://mealscrape.com/auth/callback');
      if (Capacitor.isNativePlatform()) {
        console.log('🔵    3. Android App Links must be verified');
        console.log('🔵       File: https://mealscrape.com/.well-known/assetlinks.json');
        console.log('🔵       App should intercept mealscrape.com URLs and open in-app');
      }

      // For mobile, use in-app browser
      if (Capacitor.isNativePlatform()) {
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
            skipBrowserRedirect: true, // Don't auto-redirect, we'll handle it
          },
        });

        console.log('🔵 OAuth URL response:', { data, error });

        if (error) {
          console.error('❌ OAuth error:', error);
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_start_time');
          throw error;
        }

        if (data?.url) {
          console.log('🔵 Opening OAuth in Chrome Custom Tabs:', data.url);

          // Open in Chrome Custom Tabs (in-app browser on Android)
          await Browser.open({
            url: data.url,
            presentationStyle: 'popover',
            toolbarColor: '#FF6B35',
          });

          console.log('🔵 Chrome Custom Tabs opened, waiting for App Links to intercept callback...');
        }
      } else {
        // For web, use default redirect behavior
        const { data, error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl,
            queryParams: {
              access_type: 'offline',
              prompt: 'consent',
            },
          },
        });

        console.log('🔵 OAuth response:', { data, error });

        if (error) {
          console.error('❌ OAuth error:', error);
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_start_time');
          throw error;
        }

        console.log('🔵 OAuth redirect initiated successfully!');
      }

    } catch (err: any) {
      console.error('❌ Google OAuth error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
      setOauthInProgress(false);
      localStorage.removeItem('oauth_in_progress');
      localStorage.removeItem('oauth_start_time');
    }
  };

  const handleAppleLogin = async () => {
    console.log('🍎 Apple login initiated');
    setLoading(true);
    setError('');

    try {
      const redirectUrl = getRedirectUrl();
      console.log('🍎 Calling signInWithOAuth with redirectTo:', redirectUrl);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: redirectUrl,
        },
      });

      console.log('🍎 OAuth response:', { data, error });

      if (error) throw error;
      
      console.log('⚠️ OAuth called but no redirect happened');
    } catch (err: any) {
      console.error('❌ Apple OAuth error:', err);
      setError(err.message || 'Failed to sign in with Apple');
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    setError('');
    setMessage('');
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      name: ''
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div 
      className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-3 sm:p-4"
      style={{
        paddingTop: 'max(0.75rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
       {/* Logo/Brand Section - Professional & Clean */}
<div className="text-center mb-4 sm:mb-6 md:mb-8">
  <div className="flex justify-center mb-3 sm:mb-4">
    <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-xl p-1.5 sm:p-2 overflow-hidden">
      <img
        src="/Woodenspoon.png"
        alt="Meal Scrape"
        className="w-full h-full object-contain drop-shadow-md"
      />
    </div>
  </div>

  <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 mb-2 sm:mb-3 px-2">
    Meal Scrape
  </h1>

  <p className="text-sm sm:text-base md:text-lg text-slate-600 mb-1.5 max-w-sm mx-auto px-4">
   The Only Recipe Book You'll Ever Need
  </p>

  <p className="text-xs sm:text-sm text-slate-500 px-4">
   Meal Calendar • Shopping List • Social Community 
  </p>
</div>

        {/* Auth Card */}
        <Card className="border-slate-200 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100 p-3 sm:p-4 md:p-6">
            <CardTitle className="text-lg sm:text-xl md:text-2xl text-slate-900 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 text-center">
              {isLogin 
                ? 'Sign in to access your recipes' 
                : 'Join to start saving and organizing recipes'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3 sm:space-y-4">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 py-2 sm:py-3">
                  <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {message && (
                <Alert className="bg-green-50 border-green-200 py-2 sm:py-3">
                  <AlertDescription className="text-xs sm:text-sm text-green-700">
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Name Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="name" className="text-xs sm:text-sm font-medium text-slate-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-8 sm:pl-10 md:pl-11 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="email" className="text-xs sm:text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-8 sm:pl-10 md:pl-11 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1.5 sm:space-y-2">
                <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLogin ? "Enter password" : "Min. 6 characters"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-8 sm:pl-10 md:pl-11 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base"
                    disabled={loading}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>
              </div>

              {/* Confirm Password (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-1.5 sm:space-y-2">
                  <Label htmlFor="confirmPassword" className="text-xs sm:text-sm font-medium text-slate-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-2.5 sm:left-3 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-8 sm:pl-10 md:pl-11 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base"
                      disabled={loading}
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base font-semibold shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 ml-1.5 sm:ml-2" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-3 sm:my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* Google Login Button */}
              <Button
                variant="outline"
                className="w-full h-9 sm:h-10 md:h-12 text-xs sm:text-sm md:text-base border-slate-300 hover:bg-slate-50"
                onClick={handleGoogleLogin}
                disabled={loading}
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 mr-1.5 sm:mr-2" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </Button>
            </div>
          </CardContent>

          {/* Toggle Mode Footer */}
          <div className="bg-slate-50 px-3 py-3 sm:px-4 sm:py-4 border-t border-slate-200">
            <p className="text-xs sm:text-sm text-center text-slate-600">
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button
                onClick={toggleMode}
                disabled={loading}
                className="font-semibold text-orange-600 hover:text-orange-700 disabled:opacity-50"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </Card>

        {/* Terms & Privacy (Sign Up Only) */}
        {!isLogin && (
          <p className="text-[9px] sm:text-[10px] md:text-xs text-center text-slate-500 mt-3 sm:mt-4 px-3 sm:px-4">
            By creating an account, you agree to our{' '}
            <button className="underline hover:text-slate-700">Terms of Service</button>
            {' '}and{' '}
            <button className="underline hover:text-slate-700">Privacy Policy</button>
          </p>
        )}
      </div>
    </div>
  );
}