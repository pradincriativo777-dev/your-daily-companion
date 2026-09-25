-- Alteração na tabela public.manutencoes para suportar o fluxo de agendamento de visitas com o AUVO
ALTER TABLE public.manutencoes
  ADD COLUMN IF NOT EXISTS horario_inicio text,
  ADD COLUMN IF NOT EXISTS duracao_estimada_min integer DEFAULT 60,
  ADD COLUMN IF NOT EXISTS prioridade text DEFAULT 'Média',
  ADD COLUMN IF NOT EXISTS endereco_visita text,
  ADD COLUMN IF NOT EXISTS observacoes_internas text,
  ADD COLUMN IF NOT EXISTS auvo_task_id text,
  ADD COLUMN IF NOT EXISTS sync_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS sync_error text,
  ADD COLUMN IF NOT EXISTS idempotency_key uuid DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS synced_at timestamptz;

-- Índice único parcial para auvo_task_id (quando não nulo)
CREATE UNIQUE INDEX IF NOT EXISTS idx_manutencoes_auvo_task_id 
  ON public.manutencoes(auvo_task_id) 
  WHERE auvo_task_id IS NOT NULL;

-- Índice para a chave de idempotência
CREATE UNIQUE INDEX IF NOT EXISTS idx_manutencoes_idempotency_key 
  ON public.manutencoes(idempotency_key);

-- Tabela de auditoria para ações de agendamento e sincronização com o AUVO
CREATE TABLE IF NOT EXISTS public.agendamento_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manutencao_id uuid REFERENCES public.manutencoes(id) ON DELETE SET NULL,
  usuario_id uuid,
  acao text NOT NULL,
  sucesso boolean NOT NULL DEFAULT true,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.agendamento_auditoria TO authenticated;
GRANT ALL ON public.agendamento_auditoria TO service_role;
ALTER TABLE public.agendamento_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view agendamento_auditoria" ON public.agendamento_auditoria
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert agendamento_auditoria" ON public.agendamento_auditoria
  FOR INSERT TO authenticated WITH CHECK (true);
-- Migration: Central de Ordens de Serviço e Controle Financeiro Integrado
-- Date: 2026-08-15

-- 1. Sequência para geração de códigos legíveis (ex: OS-2026-0001)
CREATE SEQUENCE IF NOT EXISTS public.ordens_servico_codigo_seq START WITH 1 INCREMENT BY 1;

-- 2. Tabela de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE DEFAULT ('OS-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.ordens_servico_codigo_seq'::regclass)::text, 4, '0')),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  tipo_atendimento text NOT NULL DEFAULT 'Manutenção Preventiva',
  prioridade text NOT NULL DEFAULT 'Média',
  descricao_problema text NOT NULL,
  servico_solicitado text,
  endereco_visita text NOT NULL,
  data_prevista date NOT NULL DEFAULT CURRENT_DATE,
  horario_inicio text,
  duracao_estimada_min integer DEFAULT 60,
  origem_solicitacao text DEFAULT 'WhatsApp',
  observacoes_internas text,
  status text NOT NULL DEFAULT 'Rascunho',
  motivo_cancelamento text,
  auvo_task_id text,
  sync_status text NOT NULL DEFAULT 'pendente',
  idempotency_key uuid DEFAULT gen_random_uuid() UNIQUE,
  version integer NOT NULL DEFAULT 1,
  
  -- Valores Financeiros (Armazenados em decimal(12,2) para precisão exata)
  valor_orcado numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_aprovado numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_recebido numeric(12,2) NOT NULL DEFAULT 0.00,
  situacao_pagamento text NOT NULL DEFAULT 'Pendente',
  
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  usuario_criacao_id uuid
);

-- Índices de consulta rápida
CREATE INDEX IF NOT EXISTS idx_ordens_servico_cliente ON public.ordens_servico(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_tecnico ON public.ordens_servico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_status ON public.ordens_servico(status);
CREATE INDEX IF NOT EXISTS idx_ordens_servico_data_prevista ON public.ordens_servico(data_prevista);

-- 3. Adicionar campo ordem_servico_id às tabelas associadas
ALTER TABLE public.gastos 
  ADD COLUMN IF NOT EXISTS ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL;

ALTER TABLE public.manutencoes 
  ADD COLUMN IF NOT EXISTS ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL;

ALTER TABLE public.interacoes 
  ADD COLUMN IF NOT EXISTS ordem_servico_id uuid REFERENCES public.ordens_servico(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_gastos_ordem ON public.gastos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_manutencoes_ordem ON public.manutencoes(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_interacoes_ordem ON public.interacoes(ordem_servico_id);

-- 4. Tabela de Auditoria de Ordens de Serviço
CREATE TABLE IF NOT EXISTS public.ordens_servico_auditoria (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_id uuid NOT NULL REFERENCES public.ordens_servico(id) ON DELETE CASCADE,
  usuario_id uuid,
  acao text NOT NULL,
  status_anterior text,
  status_novo text,
  motivo_cancelamento text,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ordens_servico_auditoria_ordem ON public.ordens_servico_auditoria(ordem_id);

-- 5. RLS e Permissões
GRANT SELECT, INSERT, UPDATE ON public.ordens_servico TO authenticated;
GRANT ALL ON public.ordens_servico TO service_role;
ALTER TABLE public.ordens_servico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth manage ordens_servico" ON public.ordens_servico 
  FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

GRANT SELECT, INSERT ON public.ordens_servico_auditoria TO authenticated;
GRANT ALL ON public.ordens_servico_auditoria TO service_role;
ALTER TABLE public.ordens_servico_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "auth view ordens_servico_auditoria" ON public.ordens_servico_auditoria 
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth insert ordens_servico_auditoria" ON public.ordens_servico_auditoria 
  FOR INSERT TO authenticated WITH CHECK (true);
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
-- ==========================================
-- MÓDULO ESTOQUE E PEÇAS - CRM JANSOL
-- ==========================================

-- 1. TABELA DE ITENS DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.estoque_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL,
    marca TEXT NOT NULL,
    modelo TEXT NOT NULL,
    descricao TEXT,
    unidade_medida TEXT NOT NULL DEFAULT 'unidade',
    localizacao_fisica TEXT,
    fornecedor_principal TEXT,
    custo_medio NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    preco_referencia NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    estado TEXT NOT NULL DEFAULT 'Ativo',
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. TABELA IMUTÁVEL DE MOVIMENTAÇÕES (LIVRO RAZÃO)
CREATE TABLE IF NOT EXISTS public.estoque_movimentacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE RESTRICT,
    codigo_operacao TEXT NOT NULL UNIQUE,
    tipo TEXT NOT NULL, -- 'entrada', 'reserva', 'consumo', 'devolucao', 'ajuste_inventario', 'perda_avaria', 'devolucao_fornecedor', 'estorno'
    quantidade NUMERIC(12,3) NOT NULL,
    custo_unitario NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
    equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE SET NULL,
    movimentacao_origem_id UUID REFERENCES public.estoque_movimentacoes(id) ON DELETE SET NULL,
    motivo TEXT,
    documento_comprovante_url TEXT,
    idempotency_key UUID DEFAULT gen_random_uuid() UNIQUE,
    usuario_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. TABELA DE INVENTÁRIOS FÍSICOS
CREATE TABLE IF NOT EXISTS public.estoque_inventarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL UNIQUE,
    status TEXT NOT NULL DEFAULT 'Em contagem', -- 'Em contagem', 'Concluído', 'Cancelado'
    observacoes TEXT,
    usuario_criacao_id UUID,
    usuario_conclusao_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. ITENS DO INVENTÁRIO (CONCILIAÇÃO)
CREATE TABLE IF NOT EXISTS public.estoque_inventario_itens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inventario_id UUID NOT NULL REFERENCES public.estoque_inventarios(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.estoque_itens(id) ON DELETE RESTRICT,
    quantidade_esperada NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    quantidade_contada NUMERIC(12,3) NOT NULL DEFAULT 0.000,
    divergencia NUMERIC(12,3) GENERATED ALWAYS AS (quantidade_contada - quantidade_esperada) STORED,
    observacoes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. AUDITORIA DO ESTOQUE
CREATE TABLE IF NOT EXISTS public.estoque_auditoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES public.estoque_itens(id) ON DELETE CASCADE,
    movimentacao_id UUID REFERENCES public.estoque_movimentacoes(id) ON DELETE SET NULL,
    inventario_id UUID REFERENCES public.estoque_inventarios(id) ON DELETE SET NULL,
    usuario_id UUID,
    acao TEXT NOT NULL,
    saldo_anterior NUMERIC(12,3),
    saldo_novo NUMERIC(12,3),
    detalhes JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ÍNDICES PARA ALTA PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_estoque_itens_sku ON public.estoque_itens(sku);
CREATE INDEX IF NOT EXISTS idx_estoque_itens_categoria ON public.estoque_itens(categoria);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_item ON public.estoque_movimentacoes(item_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_os ON public.estoque_movimentacoes(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_estoque_mov_tipo ON public.estoque_movimentacoes(tipo);
CREATE INDEX IF NOT EXISTS idx_estoque_inv_itens ON public.estoque_inventario_itens(inventario_id);

-- RLS E POLÍTICAS DE SEGURANÇA
ALTER TABLE public.estoque_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_inventarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_inventario_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estoque_auditoria ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total autenticado estoque_itens" ON public.estoque_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado estoque_movimentacoes" ON public.estoque_movimentacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado estoque_inventarios" ON public.estoque_inventarios FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado estoque_inventario_itens" ON public.estoque_inventario_itens FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total autenticado estoque_auditoria" ON public.estoque_auditoria FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- ==========================================
-- SPRINT DE ESTABILIZAÇÃO FUNCIONAL - CRM JANSOL
-- ==========================================

-- 1. ADICIONAR COLUNA IS_TEST PARA DESCONSIDERAR REGISTROS DE TESTE NAS MÉTRICAS OFICIAIS
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- ÍNDICE PARA OTIMIZAR FILTRAGEM DE CLIENTES EM CONSULTAS E DASHBOARDS
CREATE INDEX IF NOT EXISTS idx_clientes_is_test ON public.clientes(is_test);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON public.clientes(created_at);

-- 2. CRIAÇÃO DE VIEW DE AUDITORIA DE LEITURA DOS CLIENTES EXTRAS
CREATE OR REPLACE VIEW public.vw_clientes_auditoria_origem AS
SELECT 
    c.id,
    c.nome,
    c.status,
    c.cidade,
    c.created_at,
    c.origem_importacao,
    c.is_test,
    CASE 
        WHEN c.origem_importacao = 'MIGRACAO-INICIAL-817' THEN 'Lote Principal Migrado (817)'
        ELSE 'Registro Adicional / Criado via UI'
    END AS lote_classificacao
FROM public.clientes c;

-- CONCEDER PERMISSÕES DE LEITURA
GRANT SELECT ON public.vw_clientes_auditoria_origem TO authenticated;
-- ==========================================
-- SPRINT DE ESTABILIZAÇÃO COMPLETA - CRM JANSOL
-- MIGRAÇÃO DE SEGURANÇA, ARQUIVAMENTO AUDITADO, RBAC, TAREFAS & CONFIGURAÇÕES REAIS
-- ==========================================

-- 1. ARQUIVAMENTO SEGURO EM PUBLIC.CLIENTES COM CONSTRAINT CONDICIONAL
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arquivado BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS motivo_arquivamento TEXT;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arquivado_em TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS arquivado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_clientes_arquivado ON public.clientes(arquivado);

-- CORRECAO DE CLIENTES PARA NAO DAR ERRO DE CONSTRAINT
UPDATE public.clientes 
SET arquivado = false 
WHERE arquivado = true 
  AND (motivo_arquivamento IS NULL OR arquivado_por IS NULL OR arquivado_em IS NULL);

-- Constraint condicional: obriga motivo, usuario e data somente quando arquivado = true
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_clientes_arquivamento') THEN
    ALTER TABLE public.clientes ADD CONSTRAINT chk_clientes_arquivamento CHECK (
      arquivado = false OR (motivo_arquivamento IS NOT NULL AND arquivado_por IS NOT NULL AND arquivado_em IS NOT NULL)
    );
  END IF;
END $$;

-- HISTÓRICO DEDICADO DE ARQUIVAMENTO E RESTAURAÇÃO
CREATE TABLE IF NOT EXISTS public.historico_arquivamento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE CASCADE,
  acao TEXT NOT NULL, -- 'ARQUIVAR' | 'RESTAURAR'
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  motivo TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. TABELA DE PERFIS DE USUÁRIOS E RBAC
CREATE TABLE IF NOT EXISTS public.perfis_usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  nome TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'Atendimento', -- 'Administrador', 'Gestor', 'Atendimento', 'Técnico', 'Financeiro', 'Estoque'
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_perfis_user_id ON public.perfis_usuarios(user_id);

-- GARANTIA ANTI-BLOQUEIO DO ADMINISTRADOR: Se não houver nenhum admin cadastrado, permite fallback seguro
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.perfis_usuarios
    WHERE user_id = auth.uid() AND perfil = 'Administrador' AND ativo = true
  ) OR NOT EXISTS (
    SELECT 1 FROM public.perfis_usuarios WHERE perfil = 'Administrador'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. AUDITORIA DE ACESSOS E ALTERAÇÕES DE PERFIL
CREATE TABLE IF NOT EXISTS public.auditoria_acessos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  usuario_email TEXT NOT NULL,
  acao TEXT NOT NULL,
  modulo TEXT NOT NULL,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. TAREFAS E HISTÓRICO REAL DE TAREFAS
CREATE TABLE IF NOT EXISTS public.tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo TEXT NOT NULL,
  descricao TEXT,
  responsavel_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  prioridade TEXT NOT NULL DEFAULT 'Média',
  prazo DATE,
  status TEXT NOT NULL DEFAULT 'Pendente',
  cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
  ordem_servico_id UUID REFERENCES public.ordens_servico(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.historico_tarefas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tarefa_id UUID REFERENCES public.tarefas(id) ON DELETE CASCADE,
  acao TEXT NOT NULL, -- 'CRIACAO', 'MUDANCA_RESPONSAVEL', 'MUDANCA_PRIORIDADE', 'CONCLUSAO', 'REABERTURA'
  usuario_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  detalhes JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. CONFIGURAÇÕES PERSISTENTES DO SISTEMA
CREATE TABLE IF NOT EXISTS public.configuracoes_sistema (
  chave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Seed de configurações padrão reais
INSERT INTO public.configuracoes_sistema (chave, valor)
VALUES 
  ('dias_alerta_manutencao', '7'::jsonb),
  ('limite_kanban_coluna', '50'::jsonb),
  ('bloqueio_auvo_modo_offline', 'true'::jsonb)
ON CONFLICT (chave) DO NOTHING;

-- 6. HABILITAR RLS COM SEGURANÇA
ALTER TABLE public.perfis_usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria_acessos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_arquivamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_tarefas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes_sistema ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS RLS ESTREITAS E SEGURA
DROP POLICY IF EXISTS "auth view perfis" ON public.perfis_usuarios;
CREATE POLICY "auth view perfis" ON public.perfis_usuarios FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage perfis" ON public.perfis_usuarios;
CREATE POLICY "admin manage perfis" ON public.perfis_usuarios FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "auth manage tarefas" ON public.tarefas;
CREATE POLICY "auth manage tarefas" ON public.tarefas FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "auth view configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "auth view configuracoes" ON public.configuracoes_sistema FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "admin manage configuracoes" ON public.configuracoes_sistema;
CREATE POLICY "admin manage configuracoes" ON public.configuracoes_sistema FOR ALL TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- PERMISSÕES DE TABELA
GRANT SELECT, INSERT, UPDATE ON public.perfis_usuarios TO authenticated;
GRANT SELECT, INSERT ON public.auditoria_acessos TO authenticated;
GRANT SELECT, INSERT ON public.historico_arquivamento TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tarefas TO authenticated;
GRANT SELECT, INSERT ON public.historico_tarefas TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.configuracoes_sistema TO authenticated;

GRANT ALL ON public.perfis_usuarios TO service_role;
GRANT ALL ON public.auditoria_acessos TO service_role;
GRANT ALL ON public.historico_arquivamento TO service_role;
GRANT ALL ON public.tarefas TO service_role;
GRANT ALL ON public.historico_tarefas TO service_role;
GRANT ALL ON public.configuracoes_sistema TO service_role;
