import { describe, it, expect } from "vitest";
import {
  calcularProximaAcaoCliente,
  calcularProximaAcaoOrdem,
  calcularProximaAcaoTarefa,
} from "../proxima-acao-engine";

describe("Motor Determinístico de Próxima Ação Recomendada", () => {
  describe("Cliente", () => {
    it("deve recomendar 'Cadastrar Telefone' se não houver número", () => {
      const res = calcularProximaAcaoCliente({
        id: "cli-1",
        nome: "João Silva",
        telefone: null,
        whatsapp: null,
      });
      expect(res.actionKey).toBe("editar_cadastro");
      expect(res.label).toBe("Cadastrar Telefone");
      expect(res.tipo).toBe("warning");
    });

    it("deve recomendar 'Registrar Novo Contato' se sem contato há mais de 30 dias", () => {
      const res = calcularProximaAcaoCliente({
        id: "cli-2",
        nome: "Maria Oliveira",
        telefone: "19999999999",
        ultimo_contato: "2026-01-01",
      });
      expect(res.actionKey).toBe("registrar_contato");
      expect(res.tipo).toBe("warning");
    });

    it("deve recomendar 'Criar Ordem de Serviço' por padrão", () => {
      const res = calcularProximaAcaoCliente({
        id: "cli-3",
        nome: "Empresa Solar",
        telefone: "19999999999",
        ultimo_contato: new Date().toISOString(),
      });
      expect(res.actionKey).toBe("criar_os");
      expect(res.tipo).toBe("primary");
    });
  });

  describe("Ordem de Serviço", () => {
    it("deve recomendar 'Definir Técnico Responsável' se sem técnico", () => {
      const res = calcularProximaAcaoOrdem({
        id: "os-1",
        codigo: "OS-001",
        status: "Agendado",
        tecnico_id: null,
        endereco_visita: "Rua A",
      });
      expect(res.actionKey).toBe("definir_tecnico");
      expect(res.tipo).toBe("warning");
    });

    it("deve recomendar 'Gerar Pacote do Técnico' para OS pronta", () => {
      const res = calcularProximaAcaoOrdem({
        id: "os-2",
        codigo: "OS-002",
        status: "Agendado",
        tecnico_id: "tec-1",
        tecnico_nome: "Carlos",
        endereco_visita: "Rua B",
        confirmacao_sem_materiais: true,
      });
      expect(res.actionKey).toBe("gerar_pacote_tecnico");
      expect(res.tipo).toBe("primary");
    });
  });

  describe("Tarefa", () => {
    it("deve recomendar 'Marcar como Concluída' para tarefa pendente", () => {
      const res = calcularProximaAcaoTarefa({
        id: "tar-1",
        titulo: "Enviar orçamento",
        status: "Pendente",
      });
      expect(res.actionKey).toBe("concluir_tarefa");
      expect(res.tipo).toBe("success");
    });
  });
});
