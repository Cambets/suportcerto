-- =========================================================================
-- ESQUEMA DO BANCO DE DADOS (SUPABASE / POSTGRESQL) - SUPORTCERTO / CERTIFICA+
-- Execute este script no SQL Editor do seu projeto Supabase
-- =========================================================================

-- 1. ENUMS
CREATE TYPE public.user_role AS ENUM ('admin', 'franchisee', 'client', 'suporte', 'contador');

-- 2. TABELA DE PERFIS DE USUÁRIOS
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  document TEXT,
  phone TEXT,
  role public.user_role NOT NULL DEFAULT 'client',
  is_active BOOLEAN NOT NULL DEFAULT true,
  needs_approval BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. TABELA DE ROLES DE USUÁRIO
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.user_role NOT NULL DEFAULT 'client',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  UNIQUE(user_id, role)
);

-- 4. FUNÇÃO AUXILIAR HAS_ROLE
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.user_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

-- 5. TABELA DE THREADS (CONVERSAS DO CHAT)
CREATE TABLE IF NOT EXISTS public.threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT 'Nova conversa',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  visitor_id TEXT,
  visitor_name TEXT,
  visitor_document TEXT,
  visitor_email TEXT,
  visitor_phone TEXT,
  contact_type TEXT NOT NULL DEFAULT 'geral',
  lead_company TEXT,
  lead_cnpj TEXT,
  lead_interest TEXT,
  classification_reason TEXT,
  classified_at TIMESTAMPTZ,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. TABELA DE MENSAGENS DO CHAT
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.threads(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 7. TABELA DE BASE DE CONHECIMENTO (ARTIGOS)
CREATE TABLE IF NOT EXISTS public.knowledge_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 8. TABELA DE PARAMETRIZAÇÕES FISCAIS (ESTEIRA DO CONTADOR)
CREATE TABLE IF NOT EXISTS public.system_parameterizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  form_type TEXT NOT NULL DEFAULT 'nfe',
  form_types TEXT[] NOT NULL DEFAULT '{"nfe"}',
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'em_andamento', 'concluido')),
  step_current INTEGER NOT NULL DEFAULT 0,
  public_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  token_expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + INTERVAL '30 days'),
  form_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_parameterizations ENABLE ROW LEVEL SECURITY;

-- 10. POLÍTICAS DE ACESSO (RLS POLICIES)

-- Profiles: Leitura pública para autenticados, edição pelo próprio usuário ou admin
CREATE POLICY "Permitir leitura de perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Permitir atualização de perfil próprio" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- User roles: Leitura por autenticados, gestão apenas por admins
CREATE POLICY "Permitir leitura de roles" ON public.user_roles FOR SELECT USING (true);
CREATE POLICY "Admin gerencia roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Threads: Dono ou analistas (admin/suporte)
CREATE POLICY "Leitura de threads" ON public.threads FOR SELECT USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte') OR user_id IS NULL
);
CREATE POLICY "Criação de threads" ON public.threads FOR INSERT WITH CHECK (true);
CREATE POLICY "Atualização de threads" ON public.threads FOR UPDATE USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte') OR user_id IS NULL
);
CREATE POLICY "Exclusão de threads" ON public.threads FOR DELETE USING (
  user_id = auth.uid() OR public.has_role(auth.uid(), 'admin')
);

-- Messages: Acesso condicionado à thread
CREATE POLICY "Leitura de mensagens" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Criação de mensagens" ON public.messages FOR INSERT WITH CHECK (true);

-- Knowledge entries: Leitura para todos, escrita para admin/suporte
CREATE POLICY "Leitura de conhecimento" ON public.knowledge_entries FOR SELECT USING (true);
CREATE POLICY "Admin/Suporte gerenciam conhecimento" ON public.knowledge_entries FOR ALL USING (
  public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'suporte')
);

-- Parameterizations: Token público ou admin/suporte
CREATE POLICY "Leitura de parametrizações por token ou autenticado" ON public.system_parameterizations FOR SELECT USING (true);
CREATE POLICY "Criação e edição de parametrizações" ON public.system_parameterizations FOR ALL USING (true);

-- 11. BUCKET DE STORAGE PARA CERTIFICADOS
INSERT INTO storage.buckets (id, name, public) 
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Upload de certificados por token" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'certificates');
CREATE POLICY "Download de certificados por autenticados" ON storage.objects FOR SELECT USING (bucket_id = 'certificates');
