import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isEmailVerified: boolean;
  showVerifying: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVerifying, setShowVerifying] = useState(false);

  const isEmailVerified = user ? !!user.email_confirmed_at : false;
  const isAdmin = user?.email === 'snguyen7@msn..com';

  useEffect(() => {
    const initAuth = async () => {
      const hash = window.location.hash;

      if (hash && hash.includes('access_token')) {
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const type = params.get('type');

        if (accessToken && type === 'signup') {
          try {
            const { data, error } = await supabase.auth.getUser(accessToken);

            if (!error && data.user) {
              setShowVerifying(true);
              setUser(data.user);

              window.history.replaceState({}, document.title, window.location.pathname);
            }
          } catch (err) {
            console.error('Token verification error:', err);
          }
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      (async () => {
        const isVerificationEvent =
          event === 'SIGNED_IN' ||
          event === 'USER_UPDATED' ||
          event === 'TOKEN_REFRESHED';

        if (isVerificationEvent && session?.user?.email_confirmed_at) {
          const wasUnverified = !user?.email_confirmed_at;
          if (wasUnverified || event === 'SIGNED_IN') {
            setShowVerifying(true);
          }
        }

        setSession(session);
        setUser(session?.user ?? null);
      })();
    });

    return () => subscription.unsubscribe();
  }, [user?.email_confirmed_at]);

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, isEmailVerified, showVerifying, isAdmin, signOut }}>
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
