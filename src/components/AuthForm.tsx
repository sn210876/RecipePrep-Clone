import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Mail, Lock, User, ChefHat, ArrowRight, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });

  const getRedirectUrl = () => {
    // CRITICAL: Must match exactly what's in Supabase Dashboard > Authentication > URL Configuration
    const origin = window.location.origin;
    console.log('🔗 Redirect URL will be:', origin);
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
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        console.log('✅ Sign in successful');
        // Auth state change will be handled by AuthContext
      } else {
        // Sign Up
        console.log('📝 Attempting sign up...');
        const { error } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.name,
            },
            emailRedirectTo: getRedirectUrl(),
          },
        });

        if (error) throw error;
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
    setLoading(true);
    setError('');

    try {
      const redirectUrl = getRedirectUrl();
      console.log('🔵 Calling signInWithOAuth with redirectTo:', redirectUrl);
      
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

      if (error) throw error;
      
      // If we get here without redirect, something went wrong
      console.log('⚠️ OAuth called but no redirect happened');
    } catch (err: any) {
      console.error('❌ Google OAuth error:', err);
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
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
    Discover recipes from top influencers
  </p>

  <p className="text-xs sm:text-sm text-slate-500 px-4">
    Save Online Recipes • Plan Meals • Shop Smart
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