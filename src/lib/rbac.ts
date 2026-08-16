export type PerfilUsuario =
  | "Administrador"
  | "Gestor"
  | "Atendimento"
  | "Técnico"
  | "Financeiro"
  | "Estoque";

export interface PermissaoModulo {
  visualizar: boolean;
  criar: boolean;
  editar: boolean;
  excluirOuArquivar: boolean;
}

export const PERFIS_SISTEMA: PerfilUsuario[] = [
  "Administrador",
  "Gestor",
  "Atendimento",
  "Técnico",
  "Financeiro",
  "Estoque",
];

// Matriz Padrão de Permissões por Perfil
export const MATRIZ_PERMISSOES: Record<
  PerfilUsuario,
  Record<string, PermissaoModulo>
> = {
  Administrador: {
    dashboard: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    clientes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    ordens: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    estoque: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    equipamentos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    manutencoes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    gastos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    usuarios: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    permissoes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    configuracoes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
  },

  Gestor: {
    dashboard: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    clientes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    ordens: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    estoque: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    equipamentos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    manutencoes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    gastos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    usuarios: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    permissoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    configuracoes: { visualizar: true, criar: false, editar: true, excluirOuArquivar: false },
  },

  Atendimento: {
    dashboard: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    clientes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    ordens: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    estoque: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    equipamentos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    manutencoes: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    gastos: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    usuarios: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    permissoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
  },

  Técnico: {
    dashboard: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    clientes: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    ordens: { visualizar: true, criar: false, editar: true, excluirOuArquivar: false },
    estoque: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    equipamentos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    manutencoes: { visualizar: true, criar: false, editar: true, excluirOuArquivar: false },
    gastos: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    usuarios: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    permissoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
  },

  Financeiro: {
    dashboard: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    clientes: { visualizar: true, criar: false, editar: true, excluirOuArquivar: false },
    ordens: { visualizar: true, criar: false, editar: true, excluirOuArquivar: false },
    estoque: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    equipamentos: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    manutencoes: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    gastos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    usuarios: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    permissoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
  },

  Estoque: {
    dashboard: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    clientes: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    ordens: { visualizar: true, criar: false, editar: false, excluirOuArquivar: false },
    estoque: { visualizar: true, criar: true, editar: true, excluirOuArquivar: true },
    equipamentos: { visualizar: true, criar: true, editar: true, excluirOuArquivar: false },
    manutencoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    gastos: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    usuarios: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    permissoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
    configuracoes: { visualizar: false, criar: false, editar: false, excluirOuArquivar: false },
  },
};

export function temPermissao(
  perfil: PerfilUsuario | undefined,
  modulo: string,
  acao: keyof PermissaoModulo,
): boolean {
  if (!perfil) return false;
  const perfilPerms = MATRIZ_PERMISSOES[perfil];
  if (!perfilPerms) return false;
  const modPerms = perfilPerms[modulo];
  if (!modPerms) return false;
  return modPerms[acao] === true;
}
