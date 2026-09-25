-- Adiciona a coluna para rastreamento de origem e importações idempotentes
ALTER TABLE public.clientes ADD COLUMN origem_importacao text;

-- Adiciona um índice caso a busca por origem seja frequente
CREATE INDEX idx_clientes_origem_importacao ON public.clientes(origem_importacao);
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
-- Criação das tabelas de backup e auditoria para a migração

CREATE TABLE public.migration_audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL REFERENCES auth.users(id),
  operation_id text NOT NULL UNIQUE,
  status text NOT NULL CHECK (status IN ('PENDING', 'SUCCESS', 'ROLLED_BACK', 'UNDO_SUCCESS')),
  total_afetados integer NOT NULL DEFAULT 0,
  executed_at timestamptz NOT NULL DEFAULT now(),
  details jsonb
);

ALTER TABLE public.migration_audits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view migration_audits" ON public.migration_audits FOR SELECT TO authenticated USING (public.is_admin());

-- Tabela idêntica à clientes, mas sem os DEFAULTs e restrições que impeçam cópia exata
CREATE TABLE public.clientes_backup (
  backup_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  migration_id uuid NOT NULL REFERENCES public.migration_audits(id) ON DELETE CASCADE,
  -- Mesmas colunas da tabela clientes
  id uuid,
  created_at timestamptz,
  nome text,
  tipo text,
  cpf_cnpj text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  tipo_telhado text,
  tipo_sistema text,
  qtd_pessoas integer,
  tamanho_piscina_m2 integer,
  qtd_banheiros integer,
  marca_equipamento text,
  qtd_coletores integer,
  modelo_reservatorio text,
  data_instalacao date,
  tecnico_id uuid,
  valor_orcamento numeric(12,2),
  valor_pago numeric(12,2),
  status text,
  origem_lead text,
  ultimo_contato date,
  observacoes text,
  origem_importacao text
);

ALTER TABLE public.clientes_backup ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin view clientes_backup" ON public.clientes_backup FOR SELECT TO authenticated USING (public.is_admin());

-- Revoga acessos diretos de inserção (apenas RPC poderá inserir)
REVOKE INSERT, UPDATE, DELETE ON public.migration_audits FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.clientes_backup FROM authenticated, anon;
-- 1. Dry Run RPC
CREATE OR REPLACE FUNCTION public.execute_migration_dry_run() 
RETURNS jsonb AS $$
DECLARE
  v_count_source integer;
  v_count_current integer;
  v_valid integer := 0;
  v_invalid integer := 0;
  v_duplicated integer := 0;
  v_new integer := 0;
  v_updated integer := 0;
  v_conflicts integer := 0;
  rec record;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admins only.';
  END IF;

  -- A fonte atual são os registros existentes na tabela sem origem definida
  SELECT count(*) INTO v_count_source FROM public.clientes WHERE origem_importacao IS NULL;
  SELECT count(*) INTO v_count_current FROM public.clientes;

  FOR rec IN SELECT * FROM public.clientes WHERE origem_importacao IS NULL LOOP
    IF rec.nome IS NULL OR trim(rec.nome) = '' THEN
      v_invalid := v_invalid + 1;
    ELSE
      v_valid := v_valid + 1;
      -- Nesta refatoração, estamos apenas atualizando os próprios registros da base
      -- portanto, não há "novos", apenas "atualizados" (marcados com origem)
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'origem', 'Tabela publica.clientes (Supabase)',
    'quantidade_fonte', v_count_source,
    'quantidade_atual', v_count_current,
    'validos', v_valid,
    'invalidos', v_invalid,
    'duplicados', v_duplicated,
    'novos', v_new,
    'atualizados', v_updated,
    'conflitos', v_conflicts,
    'correcoes_necessarias', 'Nenhuma grave. ' || v_invalid || ' registros não possuem nome válido.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 2. Execute Real RPC
CREATE OR REPLACE FUNCTION public.execute_migration_real(p_operation_id text) 
RETURNS jsonb AS $$
DECLARE
  v_mig_id uuid;
  v_count integer := 0;
  v_locked boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admins only.';
  END IF;

  -- Impede execução simultânea
  SELECT pg_try_advisory_xact_lock(hashtext('migration_lock')) INTO v_locked;
  IF NOT v_locked THEN
    RAISE EXCEPTION 'Outra migração está em andamento. Tente novamente em instantes.';
  END IF;

  -- Verifica se a migração já ocorreu
  IF EXISTS (SELECT 1 FROM public.migration_audits WHERE operation_id = p_operation_id AND status = 'SUCCESS') THEN
    RAISE EXCEPTION 'Esta migração (%) já foi executada com sucesso anteriormente.', p_operation_id;
  END IF;

  -- Cria o log de auditoria PENDING
  INSERT INTO public.migration_audits (admin_id, operation_id, status)
  VALUES (auth.uid(), p_operation_id, 'PENDING')
  RETURNING id INTO v_mig_id;

  -- Backup persistente
  INSERT INTO public.clientes_backup (
    migration_id, id, created_at, nome, tipo, cpf_cnpj, whatsapp, email, endereco, 
    cidade, tipo_telhado, tipo_sistema, qtd_pessoas, tamanho_piscina_m2, qtd_banheiros, 
    marca_equipamento, qtd_coletores, modelo_reservatorio, data_instalacao, tecnico_id, 
    valor_orcamento, valor_pago, status, origem_lead, ultimo_contato, observacoes, origem_importacao
  )
  SELECT 
    v_mig_id, id, created_at, nome, tipo, cpf_cnpj, whatsapp, email, endereco, 
    cidade, tipo_telhado, tipo_sistema, qtd_pessoas, tamanho_piscina_m2, qtd_banheiros, 
    marca_equipamento, qtd_coletores, modelo_reservatorio, data_instalacao, tecnico_id, 
    valor_orcamento, valor_pago, status, origem_lead, ultimo_contato, observacoes, origem_importacao
  FROM public.clientes;

  -- Ação: Atualizar todos que não têm origem
  WITH atualizados AS (
    UPDATE public.clientes
    SET origem_importacao = p_operation_id
    WHERE origem_importacao IS NULL AND nome IS NOT NULL AND trim(nome) != ''
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM atualizados;

  -- Marca log como sucesso
  UPDATE public.migration_audits 
  SET status = 'SUCCESS', total_afetados = v_count 
  WHERE id = v_mig_id;

  RETURN jsonb_build_object(
    'success', true,
    'operation_id', p_operation_id,
    'total_atualizados', v_count,
    'migration_id', v_mig_id
  );
EXCEPTION WHEN OTHERS THEN
  -- Em caso de qualquer erro, o PostgreSQL automaticamente faz rollback 
  -- de todo o bloco BEGIN..END (exceto exceções tratadas de forma não propulsora)
  -- Como o erro escapa aqui, o rollback da transação (incluindo o audit) será feito pelo servidor,
  -- mas nós podemos capturá-lo e levantar novamente. O rollback de todo o DML acima ocorre automaticamente.
  RAISE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Undo Migration RPC
CREATE OR REPLACE FUNCTION public.undo_migration_real(p_operation_id text) 
RETURNS jsonb AS $$
DECLARE
  v_mig_id uuid;
  v_count integer;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied. Admins only.';
  END IF;

  SELECT id INTO v_mig_id FROM public.migration_audits WHERE operation_id = p_operation_id AND status = 'SUCCESS';
  IF v_mig_id IS NULL THEN
    RAISE EXCEPTION 'Migração não encontrada ou não foi concluída com sucesso.';
  END IF;

  -- Restaurar estado da tabela baseando-se no backup (Restaurando a origem nula)
  WITH desfeitos AS (
    UPDATE public.clientes c
    SET origem_importacao = cb.origem_importacao
    FROM public.clientes_backup cb
    WHERE c.id = cb.id AND cb.migration_id = v_mig_id
    RETURNING c.id
  )
  SELECT count(*) INTO v_count FROM desfeitos;

  UPDATE public.migration_audits SET status = 'UNDO_SUCCESS' WHERE id = v_mig_id;

  RETURN jsonb_build_object('success', true, 'total_desfeitos', v_count);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
