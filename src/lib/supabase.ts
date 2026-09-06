import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/**
 * Supabase client — the single source of truth for the whole app.
 *
 * Components must NOT import this directly; they go through Services instead
 * (CLAUDE.md: components depend on services, never on the Supabase client).
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Vite reads these at BUILD time, not at run time, so a hosted deployment
  // needs them set in the host's environment settings BEFORE the build — and
  // needs a fresh deploy afterwards. Adding them to an existing build does
  // nothing. `.env.local` is deliberately not committed, so a host that was
  // never configured produces exactly this error.
  throw new Error(
    'Supabase configuration is missing: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      'are not set in this build. Locally, put them in .env.local and restart the dev ' +
      'server. On a host such as Vercel, add them to the project environment variables ' +
      'and redeploy — these values are baked in when the site is built.',
  );
}

export type TypedSupabaseClient = SupabaseClient<Database>;

export const supabase: TypedSupabaseClient = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/** Private bucket for delivery note PDFs — files are only reachable via signed URLs. */
export const DELIVERY_NOTES_BUCKET = 'delivery-notes';
