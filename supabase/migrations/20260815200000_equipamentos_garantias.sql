-- Migration: Cadastro de Equipamentos Instalados, Garantias e Manutenção Preventiva
-- Date: 2026-08-15

-- 1. Tabela de Equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  categoria text NOT NULL DEFAULT 'outro',
  marca text NOT NULL,
  modelo text NOT NULL,
  numero_serie text,
  quantidade integer NOT NULL DEFAULT 1,
  data_instalacao date,
  empresa_responsavel_instalacao text,
  local_instalacao text,
  ordem_servico_origem_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  estado text NOT NULL DEFAULT 'Ativo',
  equipamento_substituido_id uuid REFERENCES public.equipamentos(id) ON DELETE SET NULL,
  observacoes_tecnicas text,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid
);

CREATE INDEX IF NOT EXISTS idx_equipamentos_cliente ON public.equipamentos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_equipamentos_categoria ON public.equipamentos(categoria);
CREATE INDEX IF NOT EXISTS idx_equipamentos_estado ON public.equipamentos(estado);
CREATE INDEX IF NOT EXISTS idx_equipamentos_num_serie ON public.equipamentos(numero_serie) WHERE numero_serie IS NOT NULL;

-- 2. Tabela de Junção Ordem de Serviço vs Equipamentos Atendidos
CREATE TABLE IF NOT EXISTS public.ordens_servico_equipamentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  observacoes_atendimento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(ordem_servico_id, equipamento_id)
);

CREATE INDEX IF NOT EXISTS idx_os_equipamentos_os ON public.ordens_servico_equipamentos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_equipamentos_eq ON public.ordens_servico_equipamentos(equipamento_id);

-- 3. Tabela de Garantias do Equipamento
CREATE TABLE IF NOT EXISTS public.equipamentos_garantias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  tipo text NOT NULL DEFAULT 'Garantia do Fabricante',
  data_inicio date,
  data_termino date,
  responsavel text,
  descricao_cobertura text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_garantias_equipamento ON public.equipamentos_garantias(equipamento_id);

-- 4. Tabela de Planos de Manutenção Preventiva
CREATE TABLE IF NOT EXISTS public.equipamentos_planos_preventivos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  tipo_manutencao text NOT NULL,
  periodicidade_meses integer NOT NULL DEFAULT 6,
  data_ultima_manutencao date,
  proxima_manutencao date,
  responsavel text,
  instrucoes text,
  status text NOT NULL DEFAULT 'Ativo',
  motivo_pausa_arquivamento text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_planos_preventivos_equipamento ON public.equipamentos_planos_preventivos(equipamento_id);
CREATE INDEX IF NOT EXISTS idx_planos_preventivos_proxima ON public.equipamentos_planos_preventivos(proxima_manutencao);

-- 5. Histórico de Execuções de Preventivas
CREATE TABLE IF NOT EXISTS public.equipamentos_historico_preventivas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id uuid NOT NULL REFERENCES public.equipamentos_planos_preventivos(id) ON DELETE CASCADE,
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  data_execucao date NOT NULL DEFAULT CURRENT_DATE,
  ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 6. Tabela de Anexos Privados do Equipamento
CREATE TABLE IF NOT EXISTS public.equipamentos_anexos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid NOT NULL REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  garantia_id uuid REFERENCES public.equipamentos_garantias(id) ON DELETE SET NULL,
  tipo text NOT NULL DEFAULT 'Foto Equipamento',
  nome_arquivo text NOT NULL,
  file_path text NOT NULL,
  file_size_bytes integer NOT NULL,
  mime_type text NOT NULL,
  usuario_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anexos_equipamento ON public.equipamentos_anexos(equipamento_id);

-- 7. Tabela de Auditoria de Equipamentos
CREATE TABLE IF NOT EXISTS public.equipamentos_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  equipamento_id uuid REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  usuario_id uuid,
  acao text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditoria_equipamento ON public.equipamentos_auditoria(equipamento_id);

-- 8. Bucket Privado do Storage
INSERT INTO storage.buckets (id, name, public) 
VALUES ('equipamentos-anexos', 'equipamentos-anexos', false)
ON CONFLICT (id) DO NOTHING;

-- 9. RLS e Permissões
GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos TO authenticated;
GRANT ALL ON public.equipamentos TO service_role;
ALTER TABLE public.equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos" ON public.equipamentos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.ordens_servico_equipamentos TO authenticated;
GRANT ALL ON public.ordens_servico_equipamentos TO service_role;
ALTER TABLE public.ordens_servico_equipamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage ordens_servico_equipamentos" ON public.ordens_servico_equipamentos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_garantias TO authenticated;
GRANT ALL ON public.equipamentos_garantias TO service_role;
ALTER TABLE public.equipamentos_garantias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos_garantias" ON public.equipamentos_garantias FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_planos_preventivos TO authenticated;
GRANT ALL ON public.equipamentos_planos_preventivos TO service_role;
ALTER TABLE public.equipamentos_planos_preventivos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos_planos_preventivos" ON public.equipamentos_planos_preventivos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_historico_preventivas TO authenticated;
GRANT ALL ON public.equipamentos_historico_preventivas TO service_role;
ALTER TABLE public.equipamentos_historico_preventivas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos_historico_preventivas" ON public.equipamentos_historico_preventivas FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.equipamentos_anexos TO authenticated;
GRANT ALL ON public.equipamentos_anexos TO service_role;
ALTER TABLE public.equipamentos_anexos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos_anexos" ON public.equipamentos_anexos FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.equipamentos_auditoria TO authenticated;
GRANT ALL ON public.equipamentos_auditoria TO service_role;
ALTER TABLE public.equipamentos_auditoria ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage equipamentos_auditoria" ON public.equipamentos_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Storage RLS Policies
CREATE POLICY "auth manage bucket equipamentos-anexos" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'equipamentos-anexos')
  WITH CHECK (bucket_id = 'equipamentos-anexos');
