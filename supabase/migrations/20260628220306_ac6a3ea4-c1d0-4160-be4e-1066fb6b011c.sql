ALTER TABLE public.system_parameterizations
ADD COLUMN IF NOT EXISTS form_type TEXT NOT NULL DEFAULT 'nfe';

ALTER TABLE public.system_parameterizations
DROP CONSTRAINT IF EXISTS system_parameterizations_form_type_check;

ALTER TABLE public.system_parameterizations
ADD CONSTRAINT system_parameterizations_form_type_check
CHECK (form_type IN ('nfe', 'mdfe'));