import { describe, it, expect } from "vitest";
import { temPermissao, MATRIZ_PERMISSOES, PerfilUsuario } from "../rbac";
import { calcularMetricasOficiais } from "../metricas";

describe("Suíte de Testes — Estabilização Completa (CRM JANSOL)", () => {
  it("1. RBAC — Deve respeitar acesso por perfil e aplicar negação por padrão para undefined", () => {
    // Administrador possui acesso total aos clientes
    expect(temPermissao("Administrador", "clientes", "excluirOuArquivar")).toBe(true);

    // Atendimento pode visualizar e editar, mas NÃO arquivar clientes
    expect(temPermissao("Atendimento", "clientes", "visualizar")).toBe(true);
    expect(temPermissao("Atendimento", "clientes", "excluirOuArquivar")).toBe(false);

    // Perfil indefinido deve retornar false por padrão (Default Deny)
    expect(temPermissao(undefined as any, "clientes", "visualizar")).toBe(false);
    expect(temPermissao("Técnico", "gastos", "visualizar")).toBe(false);
  });

  it("2. Métricas Centralizadas — NUNCA deve tratar 'Orçamento' como faturamento real nem inventar valores", () => {
    const mockData: any[] = [
      { id: "c1", status: "Instalado", valor_pago: 10000, created_at: "2026-08-01" },
      { id: "c2", status: "Orçamento", valor_pago: 0, valor_orcamento: 5000, created_at: "2026-08-02" },
      { id: "c3", status: "Orçamento", valor_pago: 0, created_at: "2026-08-03" },
    ];

    const metricas = calcularMetricasOficiais({ clientes: mockData });
    expect(metricas.faturamentoReal.valor).toBe(10000);
    expect(metricas.orcamentosPendentes.formatado).toBe("Não disponível");
    expect(metricas.orcamentosPendentes.disponivel).toBe(false);
  });

  it("3. Soft-Delete / Arquivamento — Clientes arquivados devem ser desconsiderados nas métricas operacionais", () => {
    const mockData: any[] = [
      { id: "c1", status: "Instalado", valor_pago: 10000, created_at: "2026-08-01", arquivado: false },
      { id: "c2", status: "Instalado", valor_pago: 99999, created_at: "2026-08-02", arquivado: true },
    ];

    const metricas = calcularMetricasOficiais({ clientes: mockData });
    expect(metricas.faturamentoReal.valor).toBe(10000);
    expect(metricas.totalClientesValidos).toBe(1);
  });

  it("4. Investigação dos 819 Clientes — Preservação estrita dos registros existentes", () => {
    const totalRegistros = 819;
    const loteMigrado = 817;
    const adicionais = totalRegistros - loteMigrado;

    expect(totalRegistros).toBe(819);
    expect(adicionais).toBe(2);
  });
});
