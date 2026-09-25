-- ==============================================================================
-- PERMISSÃO DE GESTÃO PARA USUÁRIOS AUTENTICADOS (JANSOL OS)
-- ==============================================================================

-- 1. Garante que qualquer membro autenticado da equipe tenha acesso administrativo às operações do CRM
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
BEGIN
  RETURN (auth.uid() IS NOT NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Atualiza e unifica as policies de RLS para usuários autenticados
DROP POLICY IF EXISTS "admin manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth manage clientes" ON public.clientes;
CREATE POLICY "auth manage clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin manage tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "auth manage tecnicos" ON public.tecnicos;
CREATE POLICY "auth manage tecnicos" ON public.tecnicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin manage manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "auth manage manutencoes" ON public.manutencoes;
CREATE POLICY "auth manage manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin manage gastos" ON public.gastos;
DROP POLICY IF EXISTS "auth manage gastos" ON public.gastos;
CREATE POLICY "auth manage gastos" ON public.gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "admin manage interacoes" ON public.interacoes;
DROP POLICY IF EXISTS "auth manage interacoes" ON public.interacoes;
CREATE POLICY "auth manage interacoes" ON public.interacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Insere o usuário atual na tabela admin_users se ainda não estiver
INSERT INTO public.admin_users (id, email)
SELECT id, email FROM auth.users
ON CONFLICT (id) DO NOTHING;
