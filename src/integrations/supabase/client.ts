// Cliente Supabase Oficial e Independente
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function isSupabaseConfigured(): boolean {
  const url = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
    process.env.VITE_SUPABASE_URL || 
    process.env.SUPABASE_URL || '';
  
  if (!url || url.includes('seu-projeto') || url.includes('placeholder')) {
    return false;
  }
  return true;
}

function createSupabaseClient() {
  const SUPABASE_URL = 
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 
    process.env.VITE_SUPABASE_URL || 
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co';

  const SUPABASE_PUBLISHABLE_KEY = 
    (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env?.VITE_SUPABASE_ANON_KEY)) || 
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
    process.env.VITE_SUPABASE_ANON_KEY || 
    process.env.SUPABASE_PUBLISHABLE_KEY || 
    process.env.SUPABASE_ANON_KEY || 'placeholder-key';

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    }
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
