import { describe, expect, it } from "vitest";
import { assertActiveAdmin } from "../authorization";

describe("administrative authorization", () => {
  it("rejects missing, disabled, and non-administrative profiles", () => {
    for (const profile of [
      null,
      undefined,
      { user_id: null, perfil: "Administrador", ativo: true },
      { user_id: "fixture", perfil: "Administrador", ativo: false },
      ...["Gestor", "Atendimento", "Técnico", "Financeiro", "Estoque"].map((perfil) => ({
        user_id: "fixture", perfil, ativo: true,
      })),
    ]) expect(() => assertActiveAdmin(profile)).toThrow();
  });

  it("accepts an explicitly active administrator", () => {
    expect(() => assertActiveAdmin({ user_id: "fixture", perfil: "Administrador", ativo: true })).not.toThrow();
  });
});
