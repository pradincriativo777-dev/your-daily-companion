-- Adiciona a coluna para rastreamento de origem e importações idempotentes
ALTER TABLE public.clientes ADD COLUMN origem_importacao text;

-- Adiciona um índice caso a busca por origem seja frequente
CREATE INDEX idx_clientes_origem_importacao ON public.clientes(origem_importacao);
