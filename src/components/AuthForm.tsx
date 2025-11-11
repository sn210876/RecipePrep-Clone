import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { supabase } from '../lib/supabase';

interface AuthFormProps {
  onAuthSuccess: () => void;
}

export function AuthForm({ onAuthSuccess }: AuthFormProps) {
  const [isLogin, setIsLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        await supabase.from('user_tracking').insert({
          user_id: data.user.id,
          email: data.user.email,
        });

        setMessage('Account created successfully! Logging you in...');
        setTimeout(() => {
          onAuthSuccess();
        }, 1000);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sign up');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      setMessage('Logged in successfully!');
      setTimeout(() => {
        onAuthSuccess();
      }, 500);
    } catch (err: any) {
      setError(err.message || 'Failed to log in');
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const { error: magicLinkError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (magicLinkError) throw magicLinkError;

      setMessage('Magic link sent! Check your email.');
    } catch (err: any) {
      setError(err.message || 'Failed to send magic link');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-orange-25 to-amber-50 overflow-hidden flex items-center justify-center px-4">
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-orange-200/30 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-amber-200/30 to-transparent rounded-full blur-3xl" />

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-orange-100">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg mb-4">
              <img
                src="/Phoenix_10_simple_logo_icon_ceramic_bowl_with_wooden_spoon_ing_0.jpg"
                alt="Recipe Prep Logo"
                className="w-16 h-16 object-contain"
              />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {isLogin ? 'Welcome Back' : 'Join Recipe Prep'}
            </h1>
            {!isLogin && (
              <p className="text-sm text-orange-600 font-semibold">
                First 1000 users get 1 year access
              </p>
            )}
          </div>

          <form onSubmit={isLogin ? handleLogin : handleSignUp} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full"
                disabled={loading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                className="w-full"
                disabled={loading}
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {message && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
                {message}
              </div>
            )}

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold h-12 text-base shadow-lg"
              disabled={loading}
            >
              {loading ? 'Please wait...' : isLogin ? 'Log In' : 'Sign Up Free'}
            </Button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">or</span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleMagicLink}
              variant="outline"
              className="w-full border-orange-300 text-orange-700 hover:bg-orange-50"
              disabled={loading || !email}
            >
              Send Magic Link
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setMessage(null);
              }}
              className="text-sm text-orange-600 hover:text-orange-700 font-medium"
            >
              {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Log In'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
