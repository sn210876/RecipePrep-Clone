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
    // Use current origin for redirect (works for both bolt domain and custom domain)
    return window.location.origin;
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
        const { error } = await supabase.auth.signInWithPassword({
          email: formData.email,
          password: formData.password,
        });

        if (error) throw error;
        // Auth state change will be handled by AuthContext
      } else {
        // Sign Up
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
        setMessage('Check your email for the verification link!');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: getRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
      setLoading(false);
    }
  };

  const handleAppleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'apple',
        options: {
          redirectTo: getRedirectUrl(),
        },
      });

      if (error) throw error;
    } catch (err: any) {
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
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Brand Section */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-orange-500 to-red-600 shadow-lg mb-3 sm:mb-4">
            <ChefHat className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-1 sm:mb-2">
            Meal Scrape
          </h1>
          <p className="text-sm sm:text-base text-slate-600">
            Your AI-powered recipe companion
          </p>
        </div>

        {/* Auth Card */}
        <Card className="border-slate-200 shadow-xl overflow-hidden">
          <CardHeader className="bg-gradient-to-br from-orange-50 to-red-50 border-b border-orange-100 p-4 sm:p-6">
            <CardTitle className="text-xl sm:text-2xl text-slate-900 text-center">
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm text-slate-600 text-center">
              {isLogin 
                ? 'Sign in to access your recipes' 
                : 'Join to start saving and organizing recipes'}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-4 sm:p-6">
            <div className="space-y-4 sm:space-y-5">
              {/* Error Alert */}
              {error && (
                <Alert variant="destructive" className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs sm:text-sm">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              {/* Success Message */}
              {message && (
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-xs sm:text-sm text-green-700">
                    {message}
                  </AlertDescription>
                </Alert>
              )}

              {/* Name Field (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm sm:text-base font-medium text-slate-700">
                    Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <Input
                      id="name"
                      type="text"
                      placeholder="John Doe"
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
                      disabled={loading}
                    />
                  </div>
                </div>
              )}

              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm sm:text-base font-medium text-slate-700">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm sm:text-base font-medium text-slate-700">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                  <Input
                    id="password"
                    type="password"
                    placeholder={isLogin ? "Enter password" : "Min. 6 characters"}
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    onKeyPress={handleKeyPress}
                    className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
                    disabled={loading}
                    autoComplete={isLogin ? "current-password" : "new-password"}
                  />
                </div>
              </div>

              {/* Confirm Password (Sign Up Only) */}
              {!isLogin && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm sm:text-base font-medium text-slate-700">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Re-enter password"
                      value={formData.confirmPassword}
                      onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                      onKeyPress={handleKeyPress}
                      className="pl-10 sm:pl-11 h-11 sm:h-12 text-sm sm:text-base"
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
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 h-11 sm:h-12 text-sm sm:text-base font-semibold shadow-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                    {isLogin ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  <>
                    {isLogin ? 'Sign In' : 'Create Account'}
                    <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                  </>
                )}
              </Button>

              {/* Divider */}
              <div className="relative my-4 sm:my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-200"></div>
                </div>
                <div className="relative flex justify-center text-xs sm:text-sm">
                  <span className="px-2 bg-white text-slate-500">OR</span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="space-y-2 sm:space-y-3">
                <Button
                  variant="outline"
                  className="w-full h-11 sm:h-12 text-sm sm:text-base border-slate-300 hover:bg-slate-50"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </Button>

                <Button
                  variant="outline"
                  className="w-full h-11 sm:h-12 text-sm sm:text-base border-slate-300 hover:bg-slate-50"
                  onClick={handleAppleLogin}
                  disabled={loading}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                  </svg>
                  Continue with Apple
                </Button>
              </div>
            </div>
          </CardContent>

          {/* Toggle Mode Footer */}
          <div className="bg-slate-50 px-4 py-4 sm:px-6 sm:py-5 border-t border-slate-200">
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
          <p className="text-[10px] sm:text-xs text-center text-slate-500 mt-4 sm:mt-6 px-4">
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