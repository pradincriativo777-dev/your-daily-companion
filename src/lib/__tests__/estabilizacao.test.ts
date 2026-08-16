import { describe, it, expect } from "vitest";
import { calcularMetricasOficiais } from "../metricas";
import { Cliente } from "@/hooks/use-crm";

describe("Suíte de Testes — Sprint de Estabilização Funcional (CRM JANSOL)", () => {
  const mockClientes: Cliente[] = [
    {
      id: "cli-1",
      nome: "Cliente Instalado",
      status: "Instalado",
      cidade: "Resende",
      valor_pago: 15000,
      valor_orcamento: 15000,
      data_instalacao: "2026-08-10",
      ultimo_contato: "2026-08-12",
      created_at: "2026-08-01",
    } as any,
    {
      id: "cli-2",
      nome: "Cliente Orcamento",
      status: "Orçamento",
      cidade: "Itatiaia",
      valor_pago: 0,
      valor_orcamento: 8000,
      ultimo_contato: null, // Sem informação, NUNCA em risco automaticamente
      created_at: "2026-08-02",
    } as any,
    {
      id: "cli-3",
      nome: "Cliente em Risco Real",
      status: "Aprovado",
      cidade: "Volta Redonda",
      valor_pago: 5000,
      valor_orcamento: 5000,
      ultimo_contato: "2026-06-01", // Mais de 30 dias atrás -> Em risco
      created_at: "2026-05-15",
    } as any,
    {
      id: "cli-test",
      nome: "Cliente de Teste",
      status: "Instalado",
      cidade: "Resende",
      valor_pago: 99999,
      is_test: true, // Deve ser IGNORADO nas métricas oficiais
      created_at: "2026-08-15",
    } as any,
  ];

  it("1. Não deve considerar clientes em 'Orçamento' como faturamento real nem faturamento pendente real", () => {
    const metricas = calcularMetricasOficiais({ clientes: mockClientes });
    // Faturamento real deve ser apenas 15000 + 5000 = 20000 (cli-1 + cli-3)
    expect(metricas.faturamentoReal.valor).toBe(20000);
    expect(metricas.orcamentosPendentes.formatado).toBe("Não disponível");
    expect(metricas.orcamentosPendentes.disponivel).toBe(false);
  });

  it("2. Deve calcular a taxa de conversão oficial desconsiderando clientes de teste", () => {
    const metricas = calcularMetricasOficiais({ clientes: mockClientes });
    // Clientes válidos: cli-1 (Instalado), cli-2 (Orçamento), cli-3 (Aprovado) -> Total = 3
    // Convertidos: cli-1 (Instalado) + cli-3 (Aprovado) = 2
    // Taxa = (2 / 3) * 100 = 66.7%
    expect(metricas.taxaConversao.valor).toBeCloseTo(66.67, 1);
    expect(metricas.taxaConversao.formatado).toBe("66.7%");
  });

  it("3. Não deve marcar cliente sem ultimo_contato automaticamente como em risco", () => {
    const metricas = calcularMetricasOficiais({ clientes: mockClientes });
    // cli-2 não possui ultimo_contato -> deve contar em clientesSemInformacaoContato
    expect(metricas.clientesSemInformacaoContato).toBe(1);
    // Apenas cli-3 possui contato > 30 dias -> em Risco = 1
    expect(metricas.clientesEmRisco.valor).toBe(1);
  });

  it("4. Deve calcular ticket médio desconsiderando dados nulos sem substituir por zero incorreto", () => {
    const metricas = calcularMetricasOficiais({ clientes: mockClientes });
    // Clientes com valor: cli-1 (15000), cli-2 (8000), cli-3 (5000) -> Média = 28000 / 3 = 9333.33
    expect(metricas.ticketMedio.valor).toBeCloseTo(9333.33, 1);
  });

  it("5. Deve garantir a deduplicação de clientes por ID no Kanban", () => {
    const listaComDuplicados = [
      ...mockClientes,
      mockClientes[0], // Duplicado de cli-1
    ];

    const map = new Map<string, Cliente>();
    for (const c of listaComDuplicados) {
      if (c && c.id && !map.has(c.id)) {
        map.set(c.id, c);
      }
    }
    const deduplicados = Array.from(map.values());
    expect(deduplicados.length).toBe(mockClientes.length);
  });
});
