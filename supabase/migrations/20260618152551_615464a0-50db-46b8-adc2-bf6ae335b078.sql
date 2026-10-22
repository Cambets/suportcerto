
-- 1. user_roles table (separate from profiles, prevents recursion/privilege escalation)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2. has_role security definer function
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 3. Backfill from profiles.role (only existing admins)
INSERT INTO public.user_roles (user_id, role)
SELECT id, role FROM public.profiles WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

-- 4. Extend threads table with classification + lead fields
ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS contact_type text NOT NULL DEFAULT 'indefinido'
    CHECK (contact_type IN ('suporte','lead','indefinido')),
  ADD COLUMN IF NOT EXISTS classification_reason text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz,
  ADD COLUMN IF NOT EXISTS lead_company text,
  ADD COLUMN IF NOT EXISTS lead_cnpj text,
  ADD COLUMN IF NOT EXISTS lead_interest text,
  ADD COLUMN IF NOT EXISTS utm_source text,
  ADD COLUMN IF NOT EXISTS utm_medium text,
  ADD COLUMN IF NOT EXISTS utm_campaign text;

CREATE INDEX IF NOT EXISTS idx_threads_contact_type ON public.threads(contact_type);
CREATE INDEX IF NOT EXISTS idx_threads_updated_at_desc ON public.threads(updated_at DESC);

-- 5. Admin RLS policies for threads + messages
CREATE POLICY "Admins can view all threads"
  ON public.threads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all threads"
  ON public.threads FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view all messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
