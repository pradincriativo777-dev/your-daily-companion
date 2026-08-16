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
