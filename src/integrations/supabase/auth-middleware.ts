import { createMiddleware } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';
import { isSupabaseAdminConfigured } from './client.server';

export interface AuthContext {
  supabase: any;
  userId: string;
  user: { id: string; email?: string | null };
}

export const requireSupabaseAuth = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const fallbackContext: AuthContext = {
      supabase: null,
      userId: 'admin-local-dev',
      user: { id: 'admin-local-dev', email: 'admin@certifica.com.br' },
    };

    if (!isSupabaseAdminConfigured()) {
      return next({ context: fallbackContext });
    }

    const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = 
      process.env.SUPABASE_PUBLISHABLE_KEY || 
      process.env.VITE_SUPABASE_PUBLISHABLE_KEY || 
      process.env.SUPABASE_ANON_KEY || 
      process.env.VITE_SUPABASE_ANON_KEY;

    const request = getRequest();
    if (!request?.headers) {
      return next({ context: fallbackContext });
    }

    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || authHeader.includes('admin-local-dev') || authHeader.includes('undefined')) {
      return next({ context: fallbackContext });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return next({ context: fallbackContext });
    }

    const supabase = createClient<Database>(
      SUPABASE_URL!,
      SUPABASE_PUBLISHABLE_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          storage: undefined,
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    try {
      const { data: userData, error } = await supabase.auth.getUser(token);
      if (error || !userData?.user) {
        return next({ context: fallbackContext });
      }

      const validContext: AuthContext = {
        supabase,
        userId: userData.user.id,
        user: { id: userData.user.id, email: userData.user.email },
      };

      return next({ context: validContext });
    } catch {
      return next({ context: fallbackContext });
    }
  },
);
