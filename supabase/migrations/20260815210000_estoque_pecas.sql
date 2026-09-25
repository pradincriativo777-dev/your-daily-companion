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
