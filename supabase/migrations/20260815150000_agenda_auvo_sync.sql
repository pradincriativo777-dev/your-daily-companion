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
