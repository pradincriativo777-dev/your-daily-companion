-- 1. Cria a tabela de administradores
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY, -- Referencia auth.users(id)
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Habilita RLS na tabela de admins
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Permite leitura se o próprio usuário for admin
CREATE POLICY "Admins can view admins" ON public.admin_users 
  FOR SELECT TO authenticated 
  USING (id = auth.uid() OR EXISTS (SELECT 1 FROM public.admin_users a WHERE a.id = auth.uid()));

-- 2. Cria função utilitária para checar se o usuário atual é admin (SECURITY DEFINER para acessar outras tabelas caso necessário no futuro)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.admin_users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2.5 Insere automaticamente o dono (primeiro usuário registrado) como Administrador Oficial
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users ORDER BY created_at ASC LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 3. Remove políticas permissivas antigas
DROP POLICY IF EXISTS "auth manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth manage tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "auth manage manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "auth manage gastos" ON public.gastos;
DROP POLICY IF EXISTS "auth manage interacoes" ON public.interacoes;

-- 4. Aplica novas políticas estritas (Somente Admin)
CREATE POLICY "admin manage clientes" ON public.clientes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin manage tecnicos" ON public.tecnicos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin manage manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin manage gastos" ON public.gastos FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY "admin manage interacoes" ON public.interacoes FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
