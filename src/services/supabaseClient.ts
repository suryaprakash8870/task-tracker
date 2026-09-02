import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const demoModeFlag = import.meta.env.VITE_DEMO_MODE === 'true';

export const isSupabaseConfigured = (): boolean => {
  return (
    typeof supabaseUrl === 'string' &&
    supabaseUrl.trim().length > 0 &&
    !supabaseUrl.includes('your-project-id') &&
    typeof supabaseAnonKey === 'string' &&
    supabaseAnonKey.trim().length > 0 &&
    !supabaseAnonKey.includes('your-anon-public-key')
  );
};

export const isDemoModeEnabled = (): boolean => {
  return demoModeFlag;
};

// Singleton Supabase Client
let clientInstance: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (!clientInstance) {
    if (!isSupabaseConfigured()) {
      // Create a dummy client to avoid crashes if called before configuration
      clientInstance = createClient(
        supabaseUrl || 'https://placeholder.supabase.co',
        supabaseAnonKey || 'placeholder-anon-key',
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
          }
        }
      );
    } else {
      clientInstance = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        },
        realtime: {
          params: {
            eventsPerSecond: 10
          }
        }
      });
    }
  }
  return clientInstance;
};

export const supabase = getSupabase();
