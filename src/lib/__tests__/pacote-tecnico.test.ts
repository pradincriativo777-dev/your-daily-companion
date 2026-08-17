import { describe, it, expect, beforeEach } from "vitest";
import {
  sanitizarDadosTecnico,
  validarPacoteTecnico,
  gerarMensagemAcompanhamentoTecnico,
  incrementarVersaoPacote,
  type OrdemServicoCompletaPacote,
} from "../pacote-tecnico";

describe("Pacote do Tecnico — Unit Tests", () => {
  const mockOsCompleta: OrdemServicoCompletaPacote = {
    id: "os-101",
    codigo: "OS-2026-089",
    cliente_id: "cli-555",
    cliente_nome: "Acme Solar Industrial",
    cliente_telefone: "19987654321",
    tecnico_id: "tec-12",
    tecnico_nome: "Carlos Eduardo (Técnico Solar)",
    tipo_atendimento: "Manutenção Preventiva",
    prioridade: "Alta",
    descricao_problema: "Verificação de vazamento no coletor e troca de fluido",
    servico_solicitado: "Manutenção completa do sistema solar",
    endereco_visita: "Av. Brasil, 1500 - Galpão 3, Campinas - SP",
    data_prevista: "2026-08-20",
    horario_inicio: "08:30",
    duracao_estimada_min: 120,
    origem_solicitacao: "WhatsApp",
    observacoes_internas: "CLIENTE VIP - Não mencionar atraso na peça do fornecedor",
    status: "Agendado",
    version: 1,
    // DADOS FINANCEIROS INTERNOS RESTREITOS QUE NUNCA PODEM IR PARA O TECNICO
    valor_orcado: 2500,
    valor_aprovado: 2500,
    valor_recebido: 1000,
    situacao_pagamento: "Parcialmente Pago",
    // ORIENTAÇÕES TÉCNICAS E MATERIAIS
    objetivo_atendimento: "Garantir estanqueidade e fluxo do fluido térmico",
    escopo_tecnico: "Limpeza das placas, verificação de pressão, substituição de válvulas e recarga de fluido.",
    itens_inclusos: "Fluidos, vedantes e inspeção com termocâmera",
    itens_nao_inclusos: "Substituição completa do reservatório solar",
    cuidados_seguranca: "Uso obrigatório de cinto de segurança de paraquedista no telhado e óculos de proteção.",
    contato_suporte_interno: "Plantão Engenharia JANSOL - (19) 3210-9876 / suporte@jansol.com.br",
    confirmacao_sem_materiais: false,
    etapas: [
      { id: "et-1", ordem: 1, descricao: "Verificar pressão do sistema antes de despressurizar", obrigatoria: true },
      { id: "et-2", ordem: 2, descricao: "Drenar fluido antigo e coletar em recipiente adequado", obrigatoria: true },
      { id: "et-3", ordem: 3, descricao: "Substituir anéis de vedação e recarregar fluido", obrigatoria: true },
    ],
    materiais: [
      { id: "mat-1", codigo: "MAT-001", descricao: "Fluido Térmico Solar JANSOL Pro", quantidade: 5, unidade: "Litros", observacao: "Manusear com cuidado" },
      { id: "mat-2", codigo: "MAT-044", descricao: "Anel O-Ring Alta Temperatura", quantidade: 4, unidade: "Unidades" },
    ],
    ferramentas: [
      { id: "fer-1", item: "Manômetro Digital de Pressão", quantidade: 1, tipo: "Ferramenta" },
      { id: "fer-2", item: "Cinto Paraquedista c/ Trava-quedas", quantidade: 2, tipo: "EPI" },
    ],
  };

  describe("Camada Sanitizada de Dados do Técnico (DTO)", () => {
    it("deve isolar e remover 100% dos dados financeiros e administrativos restritos", () => {
      const dto = sanitizarDadosTecnico(mockOsCompleta);

      // Verificação rigorosa: Propriedades financeiras não devem existir no DTO
      expect((dto as any).valor_orcado).toBeUndefined();
      expect((dto as any).valor_aprovado).toBeUndefined();
      expect((dto as any).valor_recebido).toBeUndefined();
      expect((dto as any).situacao_pagamento).toBeUndefined();
      expect((dto as any).observacoes_internas).toBeUndefined();

      // Verificação dos campos permitidos para o técnico
      expect(dto.codigoOS).toBe("OS-2026-089");
      expect(dto.clienteNome).toBe("Acme Solar Industrial");
      expect(dto.enderecoObra).toBe("Av. Brasil, 1500 - Galpão 3, Campinas - SP");
      expect(dto.tecnicoOuEquipe).toBe("Carlos Eduardo (Técnico Solar)");
      expect(dto.etapas.length).toBe(3);
      expect(dto.materiais.length).toBe(2);
      expect(dto.materiais[0]!.item).toBe("Fluido Térmico Solar JANSOL Pro");
      // Garantir que nenhum custo/preço foi anexado aos materiais
      expect((dto.materiais[0] as any).preco).toBeUndefined();
      expect((dto.materiais[0] as any).custo).toBeUndefined();
    });
  });

  describe("Validação Prévia da Ordem de Serviço", () => {
    it("deve aprovar a validação para uma OS completa", () => {
      const resultado = validarPacoteTecnico(mockOsCompleta);
      expect(resultado.valido).toBe(true);
      expect(resultado.pendencias.length).toBe(0);
    });

    it("deve apontar pendencias se faltarem campos obrigatorios", () => {
      const osIncompleta: OrdemServicoCompletaPacote = {
        ...mockOsCompleta,
        endereco_visita: "",
        tecnico_id: null,
        tecnico_nome: null,
        etapas: [],
        materiais: [],
        confirmacao_sem_materiais: false,
      };

      const resultado = validarPacoteTecnico(osIncompleta);
      expect(resultado.valido).toBe(false);
      expect(resultado.pendencias).toContain("Endereço ou identificação do local da obra");
      expect(resultado.pendencias).toContain("Técnico ou equipe responsável atribuída");
      expect(resultado.pendencias).toContain("Pelo menos uma etapa de execução cadastrada");
      expect(resultado.pendencias).toContain("Lista de materiais ou confirmação explícita de ausência de materiais");
    });
  });

  describe("Geração da Mensagem de Acompanhamento", () => {
    it("deve gerar a mensagem editável de acompanhamento com as variáveis preenchidas", () => {
      const msg = gerarMensagemAcompanhamentoTecnico(mockOsCompleta);
      expect(msg).toContain("Carlos Eduardo");
      expect(msg).toContain("OS-2026-089");
      expect(msg).toContain("Acme Solar Industrial");
      expect(msg).toContain("20/08/2026");
      expect(msg).toContain("08:30");
    });
  });

  describe("Incremento de Versões do Pacote", () => {
    it("deve calcular corretamente a próxima versão v1, v2, v3", () => {
      expect(incrementarVersaoPacote(0)).toBe("v1");
      expect(incrementarVersaoPacote(1)).toBe("v2");
      expect(incrementarVersaoPacote(2)).toBe("v3");
    });
  });
});
