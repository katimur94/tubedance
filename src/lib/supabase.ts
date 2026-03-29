import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.warn('Supabase URL or Key is missing. Check your .env setup.');
}

// Custom fetch with timeout — respects existing signals, adds 10s fallback
const fetchWithTimeout: typeof fetch = (input, init) => {
  // If caller already has a signal, don't override it
  if (init?.signal) return fetch(input, init);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  return fetch(input, { ...init, signal: controller.signal })
    .finally(() => clearTimeout(timeout));
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  global: { fetch: fetchWithTimeout },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

// Proactively refresh stale sessions on startup
supabase.auth.getSession().then(async ({ data: { session } }) => {
  if (session) {
    // Check if the access token is expired or about to expire
    const expiresAt = session.expires_at;
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt && expiresAt - now < 60) {
      console.info('[Supabase] Session expired or expiring, refreshing...');
      const { error } = await supabase.auth.refreshSession();
      if (error) {
        console.warn('[Supabase] Session refresh failed, signing out:', error.message);
        await supabase.auth.signOut();
      }
    }
  }
});
