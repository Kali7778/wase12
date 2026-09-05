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
  throw new Error(
    'Supabase configuration is missing. Set VITE_SUPABASE_URL and ' +
      'VITE_SUPABASE_ANON_KEY in .env.local, then restart the dev server.',
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
