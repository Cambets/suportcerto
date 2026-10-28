-- =========================================================================
-- Script de Configuração Inicial do Supabase - SuportCerto / Parametrização
-- Execute este script no SQL Editor do seu Dashboard Supabase
-- =========================================================================

-- 1. Tabela de parametrizações do sistema
CREATE TABLE IF NOT EXISTS public.system_parameterizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'nfe',
  form_types TEXT[] NOT NULL DEFAULT ARRAY['nfe']::TEXT[],
  status TEXT NOT NULL DEFAULT 'pendente',
  step_current INTEGER NOT NULL DEFAULT 0,
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  public_token TEXT NOT NULL DEFAULT replace(gen_random_uuid()::text, '-', ''),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  completed_at TIMESTAMPTZ,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice rápido para busca por token público
CREATE UNIQUE INDEX IF NOT EXISTS system_parameterizations_public_token_idx 
  ON public.system_parameterizations(public_token);

-- Habilitar RLS e permissões
ALTER TABLE public.system_parameterizations ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.system_parameterizations TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Allow all access to system_parameterizations" ON public.system_parameterizations;
CREATE POLICY "Allow all access to system_parameterizations"
  ON public.system_parameterizations FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- 2. Tabela de permissões e papéis de usuário
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'suporte', 'franchisee', 'client')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.user_roles TO authenticated, anon, service_role;

DROP POLICY IF EXISTS "Allow all access to user_roles" ON public.user_roles;
CREATE POLICY "Allow all access to user_roles"
  ON public.user_roles FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Inserir permissão padrão para o admin
INSERT INTO public.user_roles (user_id, role)
VALUES ('admin-local-dev', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Bucket de storage para upload de certificados digitais (.pfx / .p12)
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificados', 'certificados', false)
ON CONFLICT (id) DO NOTHING;

-- Notificar recarregamento do cache de schemas do Supabase
NOTIFY pgrst, 'reload schema';
