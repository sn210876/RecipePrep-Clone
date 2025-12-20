import { createClient } from '@supabase/supabase-js';
import { Capacitor } from '@capacitor/core';
import { CapacitorStorage } from './capacitorStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const isNativePlatform = Capacitor.isNativePlatform();

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'cache-control': 'max-age=60',
    },
  },
  auth: {
    storage: isNativePlatform ? new CapacitorStorage() : undefined,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'mealscrape-auth',
  },
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
});
export const isAdmin = async (): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle();
  return !!data;
};