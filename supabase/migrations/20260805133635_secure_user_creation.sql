-- Migração para permitir que o admin crie e gerencie usuários diretamente
GRANT ALL ON public.user_roles TO service_role;
GRANT ALL ON public.profiles TO service_role;

-- Políticas de RLS para Admin na tabela profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update all profiles"
ON public.profiles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
