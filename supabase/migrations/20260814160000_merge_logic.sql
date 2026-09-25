-- Migration para suportar a mesclagem e histórico de clientes

-- 1. Alterar tabela clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arquivado BOOLEAN DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS merged_into_id UUID REFERENCES public.clientes(id);

-- 2. Tabela de Auditoria
CREATE TABLE IF NOT EXISTS public.merge_audits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  admin_id UUID NOT NULL, 
  principal_id UUID NOT NULL REFERENCES public.clientes(id),
  archived_ids UUID[] NOT NULL,
  campos_anteriores JSONB NOT NULL,
  campos_finais JSONB NOT NULL,
  relacionamentos_transferidos JSONB NOT NULL
);

-- RLS para merge_audits
ALTER TABLE public.merge_audits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas admins podem ler auditoria de mesclagem" 
  ON public.merge_audits FOR SELECT 
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Apenas admins podem inserir auditoria de mesclagem" 
  ON public.merge_audits FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3. Função de Mesclagem Transacional
CREATE OR REPLACE FUNCTION public.execute_merge_transaction(
  p_principal_id UUID,
  p_secondary_ids UUID[],
  p_final_data JSONB,
  p_admin_id UUID
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
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
    SET arquivado = true, merged_into_id = p_principal_id 
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
AS $$
DECLARE
  v_audit RECORD;
  v_old_principal JSONB;
  v_old_secondary JSONB;
  v_sec_record JSONB;
  v_rel JSONB;
  v_item JSONB;
BEGIN
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
      merged_into_id = NULL
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
