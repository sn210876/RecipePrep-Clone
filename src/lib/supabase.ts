import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { CapacitorStorage } from './capacitorStorage';
import { errorHandler } from './errorHandler';

errorHandler.info('Supabase', '🔧 Initializing Supabase client...');

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  errorHandler.error('Supabase', '❌ Missing Supabase environment variables', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
  throw new Error('Missing Supabase environment variables');
}

errorHandler.info('Supabase', '✅ Supabase credentials found');

const isNativePlatform = Capacitor.isNativePlatform();
errorHandler.info('Supabase', `📱 Platform: ${isNativePlatform ? 'Native' : 'Web'}`);

let supabase;
let storageInstance: CapacitorStorage | undefined;

try {
  if (isNativePlatform) {
    storageInstance = new CapacitorStorage();
    errorHandler.info('Supabase', '📱 Using CapacitorStorage for native platform');
  }

  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: {
      schema: 'public',
    },
    global: {
      headers: {
        'cache-control': 'max-age=60',
      },
    },
    auth: {
      storage: storageInstance,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: !isNativePlatform,
      storageKey: 'mealscrape-auth',
      flowType: 'pkce',
      debug: false,
    },
    realtime: {
      params: {
        eventsPerSecond: 2,
      },
    },
  });
  errorHandler.info('Supabase', '✅ Supabase client created successfully');
  errorHandler.info('Supabase', `🔐 Auth config: flowType=pkce, detectSessionInUrl=${!isNativePlatform} (${isNativePlatform ? 'mobile uses deep linking' : 'web uses URL detection'})`);

  if (isNativePlatform) {
    let sessionRefreshInProgress = false;

    const refreshSessionIfNeeded = async () => {
      if (sessionRefreshInProgress) {
        errorHandler.info('Supabase', 'Session refresh already in progress, skipping');
        return;
      }

      try {
        sessionRefreshInProgress = true;
        const { data: { session }, error } = await supabase.auth.getSession();

        if (session && !error) {
          const expiresAt = session.expires_at || 0;
          const now = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = expiresAt - now;

          if (timeUntilExpiry < 600) {
            errorHandler.info('Supabase', `Session expires in ${timeUntilExpiry}s, refreshing...`);
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              errorHandler.error('Supabase', 'Session refresh failed', refreshError);
            } else {
              errorHandler.info('Supabase', 'Session refreshed successfully');
            }
          } else {
            errorHandler.info('Supabase', `Session valid for ${Math.floor(timeUntilExpiry / 60)}m`);
          }
        } else if (error) {
          errorHandler.error('Supabase', 'Session check error', error);
        }
      } catch (err) {
        errorHandler.error('Supabase', 'Session refresh exception', err);
      } finally {
        sessionRefreshInProgress = false;
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          errorHandler.info('Supabase', 'App visible - checking session');
          refreshSessionIfNeeded();
        }
      });
    }

    setInterval(refreshSessionIfNeeded, 5 * 60 * 1000);
  }
} catch (error) {
  errorHandler.error('Supabase', '❌ Failed to create Supabase client', error);
  throw error;
}

export { supabase, storageInstance };
export const isAdmin = async (): Promise<boolean> => {
  try {
    errorHandler.info('Supabase', '🔐 Checking admin status...');
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      errorHandler.error('Supabase', 'Failed to get user for admin check', userError);
      return false;
    }

    if (!user) {
      errorHandler.info('Supabase', 'No user found, not admin');
      return false;
    }

    const { data, error } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      errorHandler.error('Supabase', 'Failed to check admin status', error);
      return false;
    }

    const isAdminUser = !!data;
    errorHandler.info('Supabase', `Admin check result: ${isAdminUser}`);
    return isAdminUser;
  } catch (error) {
    errorHandler.error('Supabase', 'Exception in isAdmin check', error);
    return false;
  }
};