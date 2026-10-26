import { createMiddleware } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export const publicSupabase = createMiddleware({ type: 'function' }).server(
  async ({ next }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || 'placeholder';

    const supabase = createClient<Database>(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY
    );

    return next({
      context: {
        supabase,
      },
    });
  },
);
