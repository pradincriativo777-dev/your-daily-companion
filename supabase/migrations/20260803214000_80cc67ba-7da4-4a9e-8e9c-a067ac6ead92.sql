CREATE TABLE public.tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  telefone text,
  especialidade text NOT NULL DEFAULT 'Ambos',
  status text NOT NULL DEFAULT 'Ativo',
  custo_mensal numeric(12,2)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tecnicos TO authenticated;
GRANT ALL ON public.tecnicos TO service_role;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage tecnicos" ON public.tecnicos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Pessoa Física',
  cpf_cnpj text,
  whatsapp text,
  email text,
  endereco text,
  cidade text,
  tipo_telhado text,
  tipo_sistema text NOT NULL DEFAULT 'Banho',
  qtd_pessoas integer,
  tamanho_piscina_m2 integer,
  qtd_banheiros integer,
  marca_equipamento text,
  qtd_coletores integer,
  modelo_reservatorio text,
  data_instalacao date,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  valor_orcamento numeric(12,2) NOT NULL DEFAULT 0,
  valor_pago numeric(12,2),
  status text NOT NULL DEFAULT 'Orçamento',
  origem_lead text,
  ultimo_contato date,
  observacoes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.clientes TO authenticated;
GRANT ALL ON public.clientes TO service_role;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage clientes" ON public.clientes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.manutencoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_manutencao date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'Preventiva',
  descricao text,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Agendada',
  proxima_manutencao date,
  custo numeric(12,2) NOT NULL DEFAULT 0,
  observacoes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.manutencoes TO authenticated;
GRANT ALL ON public.manutencoes TO service_role;
ALTER TABLE public.manutencoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage manutencoes" ON public.manutencoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.gastos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_id uuid REFERENCES public.clientes(id) ON DELETE SET NULL,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE SET NULL,
  categoria text NOT NULL DEFAULT 'Materiais',
  descricao text NOT NULL,
  valor numeric(12,2) NOT NULL DEFAULT 0,
  data date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'Operacional',
  observacoes text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.gastos TO authenticated;
GRANT ALL ON public.gastos TO service_role;
ALTER TABLE public.gastos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage gastos" ON public.gastos FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE TABLE public.interacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  data_interacao date NOT NULL DEFAULT CURRENT_DATE,
  tipo text NOT NULL DEFAULT 'WhatsApp',
  descricao text NOT NULL,
  proximo_passo text,
  data_proximo_contato date,
  usuario text
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.interacoes TO authenticated;
GRANT ALL ON public.interacoes TO service_role;
ALTER TABLE public.interacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth manage interacoes" ON public.interacoes FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE INDEX idx_manutencoes_cliente ON public.manutencoes(cliente_id);
CREATE INDEX idx_gastos_cliente ON public.gastos(cliente_id);
CREATE INDEX idx_interacoes_cliente ON public.interacoes(cliente_id);