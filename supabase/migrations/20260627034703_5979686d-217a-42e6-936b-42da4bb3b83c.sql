
CREATE TABLE public.system_parameterizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente',
  step_current INTEGER NOT NULL DEFAULT 0,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX system_parameterizations_public_token_idx ON public.system_parameterizations(public_token);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.system_parameterizations TO authenticated;
GRANT SELECT, UPDATE ON public.system_parameterizations TO anon;
GRANT ALL ON public.system_parameterizations TO service_role;

ALTER TABLE public.system_parameterizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage all parameterizations"
ON public.system_parameterizations FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anon read by token"
ON public.system_parameterizations FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anon update by token"
ON public.system_parameterizations FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);

CREATE TRIGGER trg_system_parameterizations_updated_at
BEFORE UPDATE ON public.system_parameterizations
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
