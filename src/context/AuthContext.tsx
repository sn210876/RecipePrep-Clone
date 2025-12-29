import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isAdmin as checkIsAdmin } from '../lib/supabase';
import { withTimeout, forceSessionCheck, AuthTimeoutError } from '../lib/authTimeout';
import { App as CapApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isEmailVerified: boolean;
  showVerifying: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifying, setShowVerifying] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const isEmailVerified = user ? !!user.email_confirmed_at : false;

  // 🔍 DEBUG: Monitor auth state changes
  useEffect(() => {
    console.log('🔍 Auth State:', {
      hasUser: !!user,
      userEmail: user?.email,
      isEmailVerified,
      hasSession: !!session,
      loading,
      showVerifying,
      currentUrl: window.location.href,
      hash: window.location.hash
    });
  }, [user, session, loading, isEmailVerified, showVerifying]);

  useEffect(() => {
    const initAuth = async () => {
      console.log('🚀 Initializing auth...');

      try {
        // Clean up stale OAuth flags if session already exists
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('✅ Existing session found on init, cleaning OAuth flags');
          localStorage.removeItem('oauth_in_progress');
          localStorage.removeItem('oauth_start_time');
          localStorage.removeItem('oauth_error');
        }

        const hash = window.location.hash;
        console.log('🔗 URL hash:', hash);

        if (hash && hash.includes('access_token')) {
          console.log('✅ Found access_token in URL');
          const params = new URLSearchParams(hash.substring(1));
          const accessToken = params.get('access_token');
          const type = params.get('type');
          const refreshToken = params.get('refresh_token');

          console.log('📋 Token params:', {
            hasAccessToken: !!accessToken,
            type,
            hasRefreshToken: !!refreshToken
          });

          if (accessToken && type === 'signup') {
            try {
              console.log('📧 Processing signup verification...');
              const { data, error } = await supabase.auth.getUser(accessToken);

              if (error) {
                console.error('❌ getUser error:', error);
              }

              if (!error && data.user) {
                console.log('✅ User verified:', data.user.email);
                setShowVerifying(true);
                setUser(data.user);
                window.history.replaceState({}, document.title, window.location.pathname);
              }
            } catch (err) {
              console.error('❌ Token verification error:', err);
            }
          } else if (accessToken) {
            // Handle OAuth or password reset tokens
            console.log('🔄 Processing OAuth/password reset token...');
            try {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || ''
            });
            
            if (error) {
              console.error('❌ setSession error:', error);
            } else {
              console.log('✅ Session set successfully');
            }
          } catch (err) {
            console.error('❌ Session error:', err);
          }
        }
      }

        console.log('🔍 Getting current session...');
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('❌ Session error:', sessionError);
        }

        console.log('📦 Session retrieved:', {
          hasSession: !!session,
          userEmail: session?.user?.email
        });

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          console.log('👤 Checking admin status...');
          try {
            const adminStatus = await checkIsAdmin();
            console.log('🔐 Admin status:', adminStatus);
            setIsAdmin(adminStatus);
          } catch (adminError) {
            console.error('❌ Admin check error:', adminError);
            setIsAdmin(false);
          }
        }

        setLoading(false);
        console.log('✅ Auth initialization complete');
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        setLoading(false);
      }
    };

    // Set a timeout fallback in case initAuth hangs
    const timeoutId = setTimeout(() => {
      console.warn('⚠️ Auth initialization timeout - forcing loading to false');
      setLoading(false);
    }, 10000);

    initAuth().finally(() => {
      clearTimeout(timeoutId);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth state change event:', event, {
        hasSession: !!session,
        userEmail: session?.user?.email
      });

      (async () => {
        setLoading(false);

        const isVerificationEvent =
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED';

        if (isVerificationEvent && session?.user?.email_confirmed_at) {
          const wasUnverified = !user?.email_confirmed_at;
          if (wasUnverified) {
            console.log('✉️ Email verified, showing verification screen');
            setShowVerifying(true);
          }
        }

        // Track referral for OAuth signups
        if (event === 'SIGNED_IN' && session?.user) {
          const pendingReferralCode = localStorage.getItem('pending_referral_code');
          if (pendingReferralCode) {
            console.log('🎯 Found pending referral code, tracking signup:', pendingReferralCode);
            try {
              const { data: trackResult, error: trackError } = await supabase.rpc('track_referral_signup', {
                p_user_id: session.user.id,
                p_referral_code: pendingReferralCode
              });
              if (trackError) {
                console.error('⚠️ Referral tracking error:', trackError);
              } else {
                console.log('✅ Referral tracked successfully for OAuth signup, result:', trackResult);
              }
            } catch (refError) {
              console.error('⚠️ Referral tracking exception:', refError);
            } finally {
              // Clear the pending referral code
              localStorage.removeItem('pending_referral_code');
              console.log('🧹 Cleared pending referral code from localStorage');
            }
          }
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          checkIsAdmin().then((isAdmin) => {
            console.log('🔐 Admin check result:', isAdmin);
            setIsAdmin(isAdmin);
          });
        } else {
          setIsAdmin(false);
        }
      })();
    });

    // Listen for app resume on mobile to refresh session
    let appResumeListener: any;
    if (Capacitor.isNativePlatform()) {
      appResumeListener = CapApp.addListener('appStateChange', async ({ isActive }) => {
        if (isActive) {
          console.log('📱 App resumed - checking session in AuthContext');
          setLoading(true);
          try {
            // Wait a bit for storage to be ready
            await new Promise(resolve => setTimeout(resolve, 500));

            const { data: { session }, error } = await supabase.auth.getSession();
            if (session && !error) {
              console.log('✅ Session exists, updating state');
              setSession(session);
              setUser(session.user);

              // Check admin status
              const adminStatus = await checkIsAdmin();
              setIsAdmin(adminStatus);
            } else if (error) {
              console.error('❌ Session error on resume:', error);
            } else {
              console.log('⚠️ No session on resume - user needs to log in');
              setSession(null);
              setUser(null);
            }
          } catch (err) {
            console.error('❌ Exception on resume:', err);
          } finally {
            setLoading(false);
          }
        }
      });
    }

    return () => {
      console.log('🧹 Cleaning up auth subscription');
      subscription.unsubscribe();
      if (appResumeListener) {
        appResumeListener.remove();
      }
    };
  }, []);

  const signOut = async () => {
    console.log('👋 Signing out...');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    console.log('✅ Sign out complete');
  };

  const refreshSession = async (): Promise<Session | null> => {
    try {
      console.log('🔄 Manually refreshing session...');

      const session = await forceSessionCheck(
        () => supabase.auth.getSession(),
        3,
        1000
      );

      if (session) {
        console.log('✅ Session refreshed successfully');
        setSession(session);
        setUser(session.user);

        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);

        return session;
      } else {
        console.log('❌ No session found after refresh');
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to refresh session:', error);
      return null;
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isEmailVerified, showVerifying, isAdmin, signOut, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}