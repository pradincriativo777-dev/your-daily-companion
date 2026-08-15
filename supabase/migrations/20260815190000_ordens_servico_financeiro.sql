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
