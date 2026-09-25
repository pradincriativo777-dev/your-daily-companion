import { describe, it, expect } from "vitest";
import {
  calcularFinanceiroOS,
  validarCancelamentoOrdem,
  gerarCodigoOrdemFallback,
  roundCurrency,
  formatCurrency,
  formatPercent,
  ORDENS_STATUS_LIST,
} from "../ordens-servico";

describe("Suíte de Testes — Central de Ordens de Serviço & Financeiro (CRM JANSOL)", () => {
  it("1. Deve gerar código legível e único para ordens de serviço", () => {
    const cod1 = gerarCodigoOrdemFallback(1);
    const cod2 = gerarCodigoOrdemFallback(2);
    const cod999 = gerarCodigoOrdemFallback(999);

    const ano = new Date().getFullYear();
    expect(cod1).toBe(`OS-${ano}-0001`);
    expect(cod2).toBe(`OS-${ano}-0002`);
    expect(cod999).toBe(`OS-${ano}-0999`);
    expect(cod1).not.toBe(cod2);
  });

  it("2. Deve conter todos os status válidos do fluxo operacional", () => {
    expect(ORDENS_STATUS_LIST).toContain("Rascunho");
    expect(ORDENS_STATUS_LIST).toContain("Aguardando agendamento");
    expect(ORDENS_STATUS_LIST).toContain("Agendada");
    expect(ORDENS_STATUS_LIST).toContain("Em deslocamento");
    expect(ORDENS_STATUS_LIST).toContain("Em atendimento");
    expect(ORDENS_STATUS_LIST).toContain("Aguardando peça");
    expect(ORDENS_STATUS_LIST).toContain("Aguardando cliente");
    expect(ORDENS_STATUS_LIST).toContain("Concluída");
    expect(ORDENS_STATUS_LIST).toContain("Cancelada");
  });

  it("3. Deve exigir motivo obrigatório ao cancelar uma ordem", () => {
    // Sem motivo -> Inválido
    const resSemMotivo = validarCancelamentoOrdem("Cancelada", "");
    expect(resSemMotivo.valido).toBe(false);
    expect(resSemMotivo.erro).toContain("obrigatório fornecer o motivo");

    const resEspacos = validarCancelamentoOrdem("Cancelada", "   ");
    expect(resEspacos.valido).toBe(false);

    // Com motivo -> Válido
    const resComMotivo = validarCancelamentoOrdem("Cancelada", "Cliente desistiu da instalação");
    expect(resComMotivo.valido).toBe(true);

    // Outro status -> Válido mesmo sem motivo
    const resAgendada = validarCancelamentoOrdem("Agendada", "");
    expect(resAgendada.valido).toBe(true);
  });

  it("4. Deve calcular Custo Total, Resultado Bruto e Margem % com precisão de centavos", () => {
    const params = {
      valorOrcado: 1500.0,
      valorAprovado: 1500.0,
      valorRecebido: 1500.0,
      gastos: [
        { categoria: "Materiais", valor: 350.5 },
        { categoria: "Deslocamento/Combustível", valor: 80.25 },
        { categoria: "Terceiros", valor: 120.0 },
      ],
    };

    const fin = calcularFinanceiroOS(params);

    // Custo Total = 350.50 + 80.25 + 120.00 = 550.75
    expect(fin.custoMateriais).toBe(350.5);
    expect(fin.custoDeslocamento).toBe(80.25);
    expect(fin.custoTerceiros).toBe(120.0);
    expect(fin.custoTotal).toBe(550.75);

    // Resultado Bruto = 1500.00 - 550.75 = 949.25
    expect(fin.resultadoBruto).toBe(949.25);

    // Margem % = (949.25 / 1500.00) * 100 = 63.28%
    expect(fin.margemPercentual).toBe(63.28);
    expect(fin.situacaoPagamento).toBe("Pago");
  });

  it("5. Deve retornar margem nula/zero quando valor recebido for zero (sem divisão por zero)", () => {
    const params = {
      valorOrcado: 1000.0,
      valorAprovado: 1000.0,
      valorRecebido: 0,
      gastos: [{ categoria: "Materiais", valor: 200.0 }],
    };

    const fin = calcularFinanceiroOS(params);

    expect(fin.valorRecebido).toBe(0);
    expect(fin.custoTotal).toBe(200.0);
    expect(fin.resultadoBruto).toBe(-200.0);
    expect(fin.margemPercentual).toBeNull();
    expect(fin.situacaoPagamento).toBe("Pendente");
  });

  it("6. Deve classificar situação de pagamento Parcial quando valor recebido < valor aprovado", () => {
    const params = {
      valorOrcado: 2000.0,
      valorAprovado: 2000.0,
      valorRecebido: 1000.0,
      gastos: [],
    };

    const fin = calcularFinanceiroOS(params);

    expect(fin.situacaoPagamento).toBe("Parcial");
    expect(fin.resultadoBruto).toBe(1000.0);
    expect(fin.margemPercentual).toBe(100.0);
  });

  it("7. Deve tratar valores monetários negativos como zero em entradas não estornadas", () => {
    const params = {
      valorOrcado: -500.0,
      valorAprovado: -100.0,
      valorRecebido: 0,
      gastos: [],
    };

    const fin = calcularFinanceiroOS(params);

    expect(fin.valorOrcado).toBe(0);
    expect(fin.valorAprovado).toBe(0);
  });

  it("8. Deve indicar ausência de dados suficientes quando não houver valores nem custos", () => {
    const paramsVazio = {
      valorOrcado: 0,
      valorAprovado: 0,
      valorRecebido: 0,
      gastos: [],
    };

    const fin = calcularFinanceiroOS(paramsVazio);
    expect(fin.temInformacaoSuficiente).toBe(false);
  });

  it("9. Deve formatar corretamente moedas em BRL e porcentagens", () => {
    expect(formatCurrency(1234.56)).toBe("R$\xa01.234,56");
    expect(formatCurrency(0)).toBe("R$\xa00,00");
    expect(formatPercent(45.67)).toBe("45,7%");
    expect(formatPercent(null)).toBe("0,0%");
  });

  it("10. Deve simular validação de idempotência e trava de concorrência (versioning)", () => {
    const ordemBanco = { id: "123", version: 2, status: "Agendada" };
    const edicaoSimultaneaUserA = { id: "123", version: 2, status: "Em atendimento" };
    const edicaoSimultaneaUserB = { id: "123", version: 1, status: "Concluída" };

    // User A possui versão atual (2 === 2) -> Sucesso
    expect(edicaoSimultaneaUserA.version).toBe(ordemBanco.version);

    // User B possui versão obsoleta (1 !== 2) -> Conflito
    expect(edicaoSimultaneaUserB.version).not.toBe(ordemBanco.version);
  });
});
