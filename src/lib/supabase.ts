import { createClient } from '@supabase/supabase-js';

// Load env variables (Vite)
const supabaseUrl: string = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey: string = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate env
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Check if user is admin
export const isAdmin = async (): Promise<boolean> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return false;

  const { data, error } = await supabase
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle(); // safer than .single()

  if (error) {
    console.warn('Admin check error:', error);
    return false;
  }

  return Boolean(data);
};
