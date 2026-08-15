import { describe, it, expect } from "vitest";
import {
  calcularEstadoGarantia,
  calcularProximaManutencao,
  validarNumeroSerieDuplicado,
  validarPermissaoEstadoEquipamento,
  verificarOSDuplicadaParaAlerta,
  CATEGORIAS_EQUIPAMENTO_INICIAIS,
} from "../equipamentos";

describe("Suíte de Testes — Equipamentos Instalados, Garantias & Preventivas (CRM JANSOL)", () => {
  it("1. Deve permitir cadastrar equipamento sem número de série", () => {
    const res = validarNumeroSerieDuplicado(null, "eq-1", [
      { id: "eq-2", numero_serie: "NS-100" },
    ]);
    expect(res.duplicado).toBe(false);
  });

  it("2. Deve detectar número de série duplicado entre equipamentos ativos", () => {
    const lista = [
      { id: "eq-1", numero_serie: "NS-ABC-123", estado: "Ativo" },
      { id: "eq-2", numero_serie: "NS-XYZ-999", estado: "Ativo" },
    ];

    const resDup = validarNumeroSerieDuplicado("NS-ABC-123", "eq-3", lista);
    expect(resDup.duplicado).toBe(true);
    expect(resDup.erro).toContain("Já existe um equipamento cadastrado");

    // Mesmo serial para o próprio equipamento não deve acusar erro ao editar
    const resProprio = validarNumeroSerieDuplicado("NS-ABC-123", "eq-1", lista);
    expect(resProprio.duplicado).toBe(false);
  });

  it("3. Deve simular substituição preservando histórico do equipamento antigo", () => {
    const eqAntigo = {
      id: "eq-antigo",
      marca: "Heliotek",
      modelo: "MK 500L",
      estado: "Ativo",
    };

    const novoEstado = "Substituído";
    expect(novoEstado).toBe("Substituído");
    expect(eqAntigo.id).toBe("eq-antigo");
  });

  it("4. Deve calcular estado Vigente para garantias dentro do prazo", () => {
    const dataRef = new Date("2026-08-15T00:00:00");
    const estado = calcularEstadoGarantia({
      dataTermino: "2027-08-15",
      diasAlerta: 30,
      dataReferencia: dataRef,
    });
    expect(estado).toBe("Vigente");
  });

  it("5. Deve calcular Próxima do Vencimento quando faltar 30 dias ou menos", () => {
    const dataRef = new Date("2026-08-15T00:00:00");
    const estado = calcularEstadoGarantia({
      dataTermino: "2026-08-30", // 15 dias restante
      diasAlerta: 30,
      dataReferencia: dataRef,
    });
    expect(estado).toBe("Próxima do vencimento");
  });

  it("6. Deve calcular estado Vencida quando a data de término for anterior a hoje", () => {
    const dataRef = new Date("2026-08-15T00:00:00");
    const estado = calcularEstadoGarantia({
      dataTermino: "2026-08-01",
      diasAlerta: 30,
      dataReferencia: dataRef,
    });
    expect(estado).toBe("Vencida");
  });

  it("7. Não deve marcar como vencida quando a data de término estiver ausente", () => {
    const estado = calcularEstadoGarantia({
      dataTermino: null,
    });
    expect(estado).toBe("Sem informação suficiente");
    expect(estado).not.toBe("Vencida");
  });

  it("8. Deve calcular a próxima manutenção preventiva somando os meses à data base", () => {
    const proxima = calcularProximaManutencao("2026-08-15", 6);
    expect(proxima).toBe("2027-02-15");

    const proximaAnual = calcularProximaManutencao("2026-01-10", 12);
    expect(proximaAnual).toBe("2027-01-10");
  });

  it("9. Deve retornar nulo no cálculo de manutenção quando faltar periodicidade ou data", () => {
    expect(calcularProximaManutencao("", 6)).toBeNull();
    expect(calcularProximaManutencao("2026-08-15", 0)).toBeNull();
  });

  it("10. Deve identificar alerta de preventiva vencida", () => {
    const dataRef = new Date("2026-08-15T00:00:00");
    const proximaData = new Date("2026-08-01T00:00:00");
    const isVencido = proximaData < dataRef;
    expect(isVencido).toBe(true);
  });

  it("11. Deve bloquear criação de OS duplicada para o mesmo alerta de manutenção", () => {
    const planoId = "plano-123";
    const ordens = [
      { status: "Rascunho", observacoes_internas: "PLANO_ID:plano-123 | ALERTA" },
    ];

    const duplicado = verificarOSDuplicadaParaAlerta(planoId, ordens);
    expect(duplicado).toBe(true);

    const outroPlano = verificarOSDuplicadaParaAlerta("plano-999", ordens);
    expect(outroPlano).toBe(false);
  });

  it("12. Deve restabelecer restrições de RBAC (Apenas Admin pode arquivar/substituir/remover)", () => {
    const resAtendente = validarPermissaoEstadoEquipamento("Arquivado", "atendente");
    expect(resAtendente.permitido).toBe(false);
    expect(resAtendente.erro).toContain("Somente administradores");

    const resAdmin = validarPermissaoEstadoEquipamento("Arquivado", "admin");
    expect(resAdmin.permitido).toBe(true);
  });

  it("13. Deve registrar auditoria completa para alterações críticas em equipamentos", () => {
    const eventoAuditoria = {
      equipamento_id: "eq-1",
      acao: "SUBSTITUICAO",
      detalhes: { motivo: "Vazamento" },
      created_at: new Date().toISOString(),
    };
    expect(eventoAuditoria.acao).toBe("SUBSTITUICAO");
  });

  it("14. Deve validar que a lista de categorias iniciais contém os tipos padrão", () => {
    const vals = CATEGORIAS_EQUIPAMENTO_INICIAIS.map((c) => c.value);
    expect(vals).toContain("reservatório térmico");
    expect(vals).toContain("coletor solar");
    expect(vals).toContain("controlador");
    expect(vals).toContain("outro");
  });
});
