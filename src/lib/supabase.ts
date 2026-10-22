import { createClient } from '@supabase/supabase-js';

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  rawSupabaseUrl !== 'https://your-project.supabase.co' &&
  !rawSupabaseUrl.includes('placeholder')
);

// Fallback dummy URL and Key so createClient doesn't throw if env vars are missing during setup/testing
const supabaseUrl = isSupabaseConfigured ? rawSupabaseUrl : 'https://placeholder.supabase.co';
const supabaseAnonKey = isSupabaseConfigured ? rawSupabaseAnonKey : 'placeholder-anon-key';

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    '[CafeOS Security] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing from environment. Supabase cloud integration is disabled.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});
