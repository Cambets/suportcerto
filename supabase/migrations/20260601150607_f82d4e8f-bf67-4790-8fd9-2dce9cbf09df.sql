
ALTER TABLE public.threads ALTER COLUMN visitor_id TYPE text USING visitor_id::text;
CREATE INDEX IF NOT EXISTS threads_visitor_updated_idx ON public.threads (visitor_id, updated_at DESC);
