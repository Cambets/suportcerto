
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'suporte';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'contador';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
