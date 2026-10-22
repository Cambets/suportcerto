INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.user_role FROM auth.users WHERE email = 'marcuscambeta@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;