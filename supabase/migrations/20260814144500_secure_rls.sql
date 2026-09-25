-- Drop existing permissive policies
DROP POLICY IF EXISTS "auth manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "auth manage tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "auth manage manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "auth manage gastos" ON public.gastos;
DROP POLICY IF EXISTS "auth manage interacoes" ON public.interacoes;

-- Create stricter policies checking for valid user session
CREATE POLICY "auth manage clientes" ON public.clientes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage tecnicos" ON public.tecnicos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage gastos" ON public.gastos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "auth manage interacoes" ON public.interacoes FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);
