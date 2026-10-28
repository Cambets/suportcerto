// Cliente Supabase Server-side (Service Role / Admin)
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function isSupabaseAdminConfigured(): boolean {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  if (!url || url.includes('seu-projeto') || url.includes('placeholder')) {
    return false;
  }
  return true;
}

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
  const SUPABASE_SERVICE_ROLE_KEY = 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_PUBLISHABLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

  return createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    }
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
