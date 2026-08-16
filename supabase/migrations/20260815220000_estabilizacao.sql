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
