import { describe, it, expect } from "vitest";
import {
  calcularSaldosEstoque,
  calcularCustoMedioPonderado,
  validarSaldoDisponivel,
  validarSkuUnico,
  gerarCodigoOperacao,
  MovimentacaoSimples,
} from "../estoque";

describe("Suíte de Testes — Módulo Estoque e Peças (CRM JANSOL)", () => {
  it("1. Deve calcular corretamente o saldo físico após entrada de item", () => {
    const movs: MovimentacaoSimples[] = [
      { tipo: "entrada", quantidade: 100, custo_unitario: 15.0 },
    ];
    const saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(100);
    expect(saldos.saldoReservado).toBe(0);
    expect(saldos.saldoDisponivel).toBe(100);
  });

  it("2. Deve calcular o custo médio ponderado corretamente nas entradas de mercadoria", () => {
    // Entrada 1: 100m a R$ 15,00
    // Entrada 2: 50m a R$ 18,00
    // Custo médio esperado: ((100 * 15) + (50 * 18)) / 150 = (1500 + 900) / 150 = 2400 / 150 = R$ 16,00
    const novoCusto = calcularCustoMedioPonderado({
      saldoAtual: 100,
      custoMedioAtual: 15.0,
      qtdEntrada: 50,
      custoEntrada: 18.0,
    });
    expect(novoCusto).toBe(16.0);
  });

  it("3. Deve deduzir o estoque ao registrar consumo em Ordem de Serviço", () => {
    const movs: MovimentacaoSimples[] = [
      { tipo: "entrada", quantidade: 50 },
      { tipo: "consumo", quantidade: 10 },
    ];
    const saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(40);
    expect(saldos.saldoDisponivel).toBe(40);
  });

  it("4. Deve gerenciar reserva e devolução de sobra para a Ordem de Serviço", () => {
    const movs: MovimentacaoSimples[] = [
      { tipo: "entrada", quantidade: 100 },
      { tipo: "reserva", quantidade: 20 },
    ];
    let saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(100);
    expect(saldos.saldoReservado).toBe(20);
    expect(saldos.saldoDisponivel).toBe(80);

    // Devolução de reserva
    movs.push({ tipo: "devolucao", quantidade: 5 });
    saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(105);
  });

  it("5. Deve registrar estorno de movimentação adicionando saldo compensatório", () => {
    const movs: MovimentacaoSimples[] = [
      { tipo: "entrada", quantidade: 30 },
      { tipo: "consumo", quantidade: 5 },
      { tipo: "estorno", quantidade: 5 },
    ];
    const saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(30);
  });

  it("6. Deve proibir saldo negativo para atendente ou técnico sem permissão", () => {
    const val = validarSaldoDisponivel({
      saldoDisponivel: 5,
      qtdSolicitada: 10,
      userRole: "tecnico",
    });
    expect(val.permitido).toBe(false);
    expect(val.erro).toContain("Saldo insuficiente");
  });

  it("7. Deve autorizar saldo negativo se houver autorização administrativa explícita", () => {
    const val = validarSaldoDisponivel({
      saldoDisponivel: 5,
      qtdSolicitada: 10,
      permiteSaldoNegativoAdmin: true,
      userRole: "admin",
    });
    expect(val.permitido).toBe(true);
  });

  it("8. Deve validar unicidade de SKU (case-insensitive)", () => {
    const lista = [{ id: "1", sku: "TUB-SOL-22" }];
    const resDup = validarSkuUnico("tub-sol-22", "2", lista);
    expect(resDup.duplicado).toBe(true);
    expect(resDup.erro).toContain("já pertence a outro item");

    const resValido = validarSkuUnico("TUB-SOL-28", "2", lista);
    expect(resValido.duplicado).toBe(false);
  });

  it("9. Deve trabalhar com unidades fracionárias (ex: 2.55 metros de tubulação)", () => {
    const movs: MovimentacaoSimples[] = [
      { tipo: "entrada", quantidade: 10.5 },
      { tipo: "consumo", quantidade: 2.25 },
    ];
    const saldos = calcularSaldosEstoque(movs);
    expect(saldos.saldoFisico).toBe(8.25);
  });

  it("10. Deve gerar código amigável e único para cada operação no livro razão", () => {
    const cod1 = gerarCodigoOperacao();
    const cod2 = gerarCodigoOperacao();
    expect(cod1).toMatch(/^MOV-\d{4}-\d{4}$/);
    expect(cod1).not.toBe(cod2);
  });
});
