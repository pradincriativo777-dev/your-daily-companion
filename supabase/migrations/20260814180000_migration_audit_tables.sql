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
