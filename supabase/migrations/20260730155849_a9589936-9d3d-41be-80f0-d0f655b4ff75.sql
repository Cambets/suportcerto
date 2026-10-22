ALTER TABLE public.system_parameterizations
  ADD COLUMN IF NOT EXISTS token_expires_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

UPDATE public.system_parameterizations
SET completed_at = COALESCE(completed_at, updated_at)
WHERE status = 'concluido';