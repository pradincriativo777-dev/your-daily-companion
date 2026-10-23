-- Review and test on an isolated database before applying. Never auto-run on startup.
-- A real active administrator must already exist; bootstrap is a separate owner action.
BEGIN;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.perfis_usuarios WHERE perfil = 'Administrador' AND ativo AND user_id IS NOT NULL) THEN
    RAISE EXCEPTION 'Provision an active administrator profile before applying this migration';
  END IF;
  IF EXISTS (SELECT user_id FROM public.perfis_usuarios WHERE user_id IS NOT NULL GROUP BY user_id HAVING count(*) > 1) THEN
    RAISE EXCEPTION 'Resolve duplicate user profiles before applying this migration';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND perfil = 'Administrador' AND ativo = true
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- Preserve legacy rows for review, but do not use the broadened legacy list
-- as an authority or recursively query it from its own SELECT policy.
DROP POLICY IF EXISTS "Admins can view admins" ON public.admin_users;
CREATE POLICY "Admins can view admins" ON public.admin_users
  FOR SELECT TO authenticated USING (public.is_admin());

-- Restore the administrator-only policies that preceded the permissive migration.
-- Non-admin CRM access must be validated against the product's role matrix before release.
DROP POLICY IF EXISTS "auth manage clientes" ON public.clientes;
DROP POLICY IF EXISTS "admin manage clientes" ON public.clientes;
CREATE POLICY "admin manage clientes" ON public.clientes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "auth manage tecnicos" ON public.tecnicos;
DROP POLICY IF EXISTS "admin manage tecnicos" ON public.tecnicos;
CREATE POLICY "admin manage tecnicos" ON public.tecnicos
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "auth manage manutencoes" ON public.manutencoes;
DROP POLICY IF EXISTS "admin manage manutencoes" ON public.manutencoes;
CREATE POLICY "admin manage manutencoes" ON public.manutencoes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "auth manage gastos" ON public.gastos;
DROP POLICY IF EXISTS "admin manage gastos" ON public.gastos;
CREATE POLICY "admin manage gastos" ON public.gastos
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
DROP POLICY IF EXISTS "auth manage interacoes" ON public.interacoes;
DROP POLICY IF EXISTS "admin manage interacoes" ON public.interacoes;
CREATE POLICY "admin manage interacoes" ON public.interacoes
  FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth view perfis" ON public.perfis_usuarios;
CREATE POLICY "auth view perfis" ON public.perfis_usuarios FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- 3. Função de Mesclagem Transacional
CREATE OR REPLACE FUNCTION public.execute_merge_transaction(
  p_principal_id UUID,
  p_secondary_ids UUID[],
  p_final_data JSONB,
  p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit_id UUID;
  v_principal_record RECORD;
  v_secondary_record RECORD;
  v_old_principal_data JSONB;
  v_old_secondary_data JSONB := '[]'::jsonb;
  v_relacionamentos JSONB := '{}'::jsonb;

  v_gastos JSONB := '[]'::jsonb;
  v_interacoes JSONB := '[]'::jsonb;
  v_manutencoes JSONB := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Active administrators only.' USING ERRCODE = '42501';
  END IF;
  IF p_admin_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Audit identity must match the authenticated user.' USING ERRCODE = '42501';
  END IF;
  v_audit_id := gen_random_uuid();

  -- Bloqueio do Principal
  SELECT * INTO v_principal_record FROM public.clientes WHERE id = p_principal_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Registro principal não encontrado';
  END IF;
  v_old_principal_data := row_to_json(v_principal_record)::jsonb;

  -- Bloqueio e Arquivamento dos Secundários
  FOR v_secondary_record IN SELECT * FROM public.clientes WHERE id = ANY(p_secondary_ids) FOR UPDATE LOOP
    IF v_secondary_record.arquivado THEN
      RAISE EXCEPTION 'Registro secundário % já está arquivado', v_secondary_record.id;
    END IF;

    v_old_secondary_data := v_old_secondary_data || jsonb_build_array(row_to_json(v_secondary_record)::jsonb);

    -- Mapear os relacionamentos para restaurar no "Undo"
    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'old_cliente_id', cliente_id)), '[]'::jsonb)
    INTO v_gastos
    FROM (SELECT id, cliente_id FROM public.gastos WHERE cliente_id = v_secondary_record.id FOR UPDATE) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'old_cliente_id', cliente_id)), '[]'::jsonb)
    INTO v_interacoes
    FROM (SELECT id, cliente_id FROM public.interacoes WHERE cliente_id = v_secondary_record.id FOR UPDATE) t;

    SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'old_cliente_id', cliente_id)), '[]'::jsonb)
    INTO v_manutencoes
    FROM (SELECT id, cliente_id FROM public.manutencoes WHERE cliente_id = v_secondary_record.id FOR UPDATE) t;

    v_relacionamentos := jsonb_build_object(
      'gastos', COALESCE(v_relacionamentos->'gastos', '[]'::jsonb) || v_gastos,
      'interacoes', COALESCE(v_relacionamentos->'interacoes', '[]'::jsonb) || v_interacoes,
      'manutencoes', COALESCE(v_relacionamentos->'manutencoes', '[]'::jsonb) || v_manutencoes
    );

    -- Atualiza e Arquiva
    UPDATE public.clientes
    SET arquivado = true, merged_into_id = p_principal_id,
        motivo_arquivamento = 'Mesclagem de clientes', arquivado_por = auth.uid(), arquivado_em = now()
    WHERE id = v_secondary_record.id;
  END LOOP;

  -- Transfere Relacionamentos
  UPDATE public.gastos SET cliente_id = p_principal_id WHERE cliente_id = ANY(p_secondary_ids);
  UPDATE public.interacoes SET cliente_id = p_principal_id WHERE cliente_id = ANY(p_secondary_ids);
  UPDATE public.manutencoes SET cliente_id = p_principal_id WHERE cliente_id = ANY(p_secondary_ids);

  -- Atualiza o Principal
  UPDATE public.clientes
  SET
    nome = COALESCE(p_final_data->>'nome', nome),
    email = COALESCE(p_final_data->>'email', email),
    whatsapp = COALESCE(p_final_data->>'whatsapp', whatsapp),
    cpf_cnpj = COALESCE(p_final_data->>'cpf_cnpj', cpf_cnpj),
    endereco = COALESCE(p_final_data->>'endereco', endereco),
    cidade = COALESCE(p_final_data->>'cidade', cidade),
    observacoes = COALESCE(p_final_data->>'observacoes', observacoes),
    origem_lead = COALESCE(p_final_data->>'origem_lead', origem_lead),
    marca_equipamento = COALESCE(p_final_data->>'marca_equipamento', marca_equipamento)
  WHERE id = p_principal_id;

  -- Auditoria
  INSERT INTO public.merge_audits (
    id, created_at, admin_id, principal_id, archived_ids, campos_anteriores, campos_finais, relacionamentos_transferidos
  ) VALUES (
    v_audit_id, now(), p_admin_id, p_principal_id, p_secondary_ids,
    jsonb_build_object('principal', v_old_principal_data, 'secundarios', v_old_secondary_data),
    p_final_data,
    v_relacionamentos
  );

  RETURN v_audit_id;
END;
$$;


-- 4. Função de Desfazer Mesclagem (Undo)
CREATE OR REPLACE FUNCTION public.undo_merge_transaction(
  p_audit_id UUID,
  p_admin_id UUID
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_audit RECORD;
  v_old_principal JSONB;
  v_old_secondary JSONB;
  v_sec_record JSONB;
  v_rel JSONB;
  v_item JSONB;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Active administrators only.' USING ERRCODE = '42501';
  END IF;
  IF p_admin_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Audit identity must match the authenticated user.' USING ERRCODE = '42501';
  END IF;
  -- Bloquear o registro de auditoria
  SELECT * INTO v_audit FROM public.merge_audits WHERE id = p_audit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auditoria não encontrada';
  END IF;

  v_old_principal := v_audit.campos_anteriores->'principal';
  v_old_secondary := v_audit.campos_anteriores->'secundarios';
  v_rel := v_audit.relacionamentos_transferidos;

  -- 1. Restaurar Principal
  UPDATE public.clientes
  SET
    nome = v_old_principal->>'nome',
    email = v_old_principal->>'email',
    whatsapp = v_old_principal->>'whatsapp',
    cpf_cnpj = v_old_principal->>'cpf_cnpj',
    endereco = v_old_principal->>'endereco',
    cidade = v_old_principal->>'cidade',
    observacoes = v_old_principal->>'observacoes',
    origem_lead = v_old_principal->>'origem_lead',
    marca_equipamento = v_old_principal->>'marca_equipamento'
  WHERE id = (v_old_principal->>'id')::UUID;

  -- 2. Restaurar Secundários (desarquivar)
  FOR v_item IN SELECT * FROM jsonb_array_elements(v_old_secondary) LOOP
    UPDATE public.clientes
    SET
      arquivado = false,
      merged_into_id = NULL, motivo_arquivamento = NULL, arquivado_por = NULL, arquivado_em = NULL
    WHERE id = (v_item->>'id')::UUID;
  END LOOP;

  -- 3. Restaurar Relacionamentos (Gastos)
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_rel->'gastos', '[]'::jsonb)) LOOP
    UPDATE public.gastos SET cliente_id = (v_item->>'old_cliente_id')::UUID WHERE id = (v_item->>'id')::UUID;
  END LOOP;

  -- Restaurar Relacionamentos (Interacoes)
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_rel->'interacoes', '[]'::jsonb)) LOOP
    UPDATE public.interacoes SET cliente_id = (v_item->>'old_cliente_id')::UUID WHERE id = (v_item->>'id')::UUID;
  END LOOP;

  -- Restaurar Relacionamentos (Manutencoes)
  FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(v_rel->'manutencoes', '[]'::jsonb)) LOOP
    UPDATE public.manutencoes SET cliente_id = (v_item->>'old_cliente_id')::UUID WHERE id = (v_item->>'id')::UUID;
  END LOOP;

  -- 4. Excluir auditoria
  DELETE FROM public.merge_audits WHERE id = p_audit_id;

  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.execute_merge_transaction(uuid, uuid[], jsonb, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_merge_transaction(uuid, uuid[], jsonb, uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.undo_merge_transaction(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_merge_transaction(uuid, uuid) TO authenticated;
ALTER FUNCTION public.execute_migration_dry_run() SET search_path = '';
ALTER FUNCTION public.execute_migration_real(text) SET search_path = '';
ALTER FUNCTION public.undo_migration_real(text) SET search_path = '';
REVOKE ALL ON FUNCTION public.execute_migration_dry_run() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.execute_migration_real(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_migration_real(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.execute_migration_dry_run() TO authenticated;
GRANT EXECUTE ON FUNCTION public.execute_migration_real(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_migration_real(text) TO authenticated;
COMMIT;
