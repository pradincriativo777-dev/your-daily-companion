import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type Cliente = {
  id: string;
  created_at: string;
  nome: string;
  tipo: string;
  cpf_cnpj: string | null;
  whatsapp: string | null;
  email: string | null;
  endereco: string | null;
  cidade: string | null;
  tipo_telhado: string | null;
  tipo_sistema: string;
  qtd_pessoas: number | null;
  tamanho_piscina_m2: number | null;
  qtd_banheiros: number | null;
  marca_equipamento: string | null;
  qtd_coletores: number | null;
  modelo_reservatorio: string | null;
  data_instalacao: string | null;
  tecnico_id: string | null;
  valor_orcamento: number | null;
  valor_pago: number | null;
  status: string;
  origem_lead: string | null;
  ultimo_contato: string | null;
  observacoes: string | null;
};

export type Tecnico = {
  id: string;
  created_at: string;
  nome: string;
  telefone: string | null;
  especialidade: string;
  status: string;
  custo_mensal: number | null;
};

export type Manutencao = {
  id: string;
  created_at: string;
  cliente_id: string;
  data_manutencao: string;
  tipo: string;
  descricao: string | null;
  tecnico_id: string | null;
  status: string;
  proxima_manutencao: string | null;
  custo: number | null;
  observacoes: string | null;
  horario_inicio?: string | null;
  duracao_estimada_min?: number | null;
  prioridade?: string | null;
  endereco_visita?: string | null;
  observacoes_internas?: string | null;
  ordem_servico_id?: string | null;
  auvo_task_id?: string | null;
  sync_status?: "sincronizado" | "pendente" | "erro_sincronizacao" | string;
  sync_error?: string | null;
  idempotency_key?: string;
  synced_at?: string | null;
};

export type Gasto = {
  id: string;
  created_at: string;
  cliente_id: string | null;
  tecnico_id: string | null;
  ordem_servico_id?: string | null;
  categoria: string;
  descricao: string;
  valor: number | null;
  data: string;
  tipo: string;
  observacoes: string | null;
};

export type Interacao = {
  id: string;
  created_at: string;
  cliente_id: string;
  ordem_servico_id?: string | null;
  data_interacao: string;
  tipo: string;
  descricao: string;
  proximo_passo: string | null;
  data_proximo_contato: string | null;
  usuario: string | null;
};

export type OrdemServico = {
  id: string;
  codigo: string;
  cliente_id: string;
  tecnico_id: string | null;
  tipo_atendimento: string;
  prioridade: string;
  descricao_problema: string;
  servico_solicitado: string | null;
  endereco_visita: string;
  data_prevista: string;
  horario_inicio: string | null;
  duracao_estimada_min: number | null;
  origem_solicitacao: string | null;
  observacoes_internas: string | null;
  status: string;
  motivo_cancelamento: string | null;
  auvo_task_id: string | null;
  sync_status: string;
  idempotency_key: string;
  version: number;
  valor_orcado: number;
  valor_aprovado: number;
  valor_recebido: number;
  situacao_pagamento: string;
  created_at: string;
  updated_at: string;
  usuario_criacao_id: string | null;
};

export type OrdemServicoAuditoria = {
  id: string;
  ordem_id: string;
  usuario_id: string | null;
  acao: string;
  status_anterior: string | null;
  status_novo: string | null;
  motivo_cancelamento: string | null;
  detalhes: Record<string, any> | null;
  created_at: string;
};

type TableName = "clientes" | "tecnicos" | "manutencoes" | "gastos" | "interacoes" | "ordens_servico";

function useList<T>(table: TableName, order: string, ascending = false) {
  return useQuery({
    queryKey: [table],
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table as any)
        .select("*")
        .order(order, { ascending });
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });
}

export const useClientes = () => useList<Cliente>("clientes", "created_at");
export const useTecnicos = () => useList<Tecnico>("tecnicos", "nome", true);
export const useManutencoes = () =>
  useList<Manutencao>("manutencoes", "data_manutencao");
export const useGastos = () => useList<Gasto>("gastos", "data");
export const useInteracoes = () =>
  useList<Interacao>("interacoes", "data_interacao");
export const useOrdensServico = () =>
  useList<OrdemServico>("ordens_servico", "created_at");

const labels: Record<TableName, string> = {
  clientes: "Cliente",
  tecnicos: "Técnico",
  manutencoes: "Manutenção",
  gastos: "Gasto",
  interacoes: "Interação",
  ordens_servico: "Ordem de Serviço",
};

export function useUpsert(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (values: Record<string, unknown>) => {
      const { id, ...rest } = values as { id?: string };
      if (id) {
        const { error } = await (supabase.from as any)(table)
          .update(rest as never)
          .eq("id", id);
        if (error) throw error;
        return { id };
      }
      const { data, error } = await (supabase.from as any)(table)
        .insert(rest as never)
        .select("id")
        .single();
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries();
      toast.success(
        `${labels[table]} ${(vars as { id?: string }).id ? "atualizado(a)" : "cadastrado(a)"} com sucesso`,
      );
    },
    onError: (e: Error) => toast.error(`Erro ao salvar: ${e.message}`),
  });
}

export function useRemove(table: TableName) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries();
      toast.success(`${labels[table]} excluído(a) com sucesso`);
    },
    onError: (e: Error) => toast.error(`Erro ao excluir: ${e.message}`),
  });
}

export function useUpdateStatusCliente() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("clientes")
        .update({ status } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["clientes"] });
      toast.success("Status atualizado");
    },
    onError: (e: Error) => toast.error(`Erro: ${e.message}`),
  });
}
