ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS needs_approval boolean DEFAULT false;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
