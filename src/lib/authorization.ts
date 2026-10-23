export interface CrmProfile {
  user_id: string | null;
  perfil: string;
  ativo: boolean;
}

export function assertActiveAdmin(profile: CrmProfile | null | undefined): void {
  if (!profile || !profile.user_id || profile.ativo !== true || profile.perfil !== "Administrador") {
    throw new Error("Acesso negado. Esta operação exige um administrador ativo.");
  }
}
