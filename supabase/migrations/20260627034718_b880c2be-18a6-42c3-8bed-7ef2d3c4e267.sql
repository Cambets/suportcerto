
DROP POLICY IF EXISTS "Anon read by token" ON public.system_parameterizations;
DROP POLICY IF EXISTS "Anon update by token" ON public.system_parameterizations;
REVOKE SELECT, UPDATE ON public.system_parameterizations FROM anon;
