import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  normalizarTelefoneAuvoChat,
  getAtendimentoPendente,
  salvarAtendimentoPendente,
  limparAtendimentoPendente,
  type AuvoChatAtendimentoState,
} from "../auvo-chat-assistant";

// Mock de sessionStorage para ambiente de teste node
const storageMap = new Map<string, string>();
const mockSessionStorage = {
  getItem: (key: string) => storageMap.get(key) ?? null,
  setItem: (key: string, val: string) => storageMap.set(key, val),
  removeItem: (key: string) => storageMap.delete(key),
  clear: () => storageMap.clear(),
};

describe("Auvo Chat Assistant Unit Tests", () => {
  beforeEach(() => {
    storageMap.clear();
    vi.stubGlobal("sessionStorage", mockSessionStorage);
    vi.restoreAllMocks();
  });

  describe("normalizarTelefoneAuvoChat", () => {
    it("deve retornar null para valores vazios ou invalidos", () => {
      expect(normalizarTelefoneAuvoChat(null)).toBeNull();
      expect(normalizarTelefoneAuvoChat(undefined)).toBeNull();
      expect(normalizarTelefoneAuvoChat("")).toBeNull();
      expect(normalizarTelefoneAuvoChat("12345")).toBeNull(); // Telefone muito curto
    });

    it("deve normalizar telefones brasileiros sem DDI adicionando 55", () => {
      expect(normalizarTelefoneAuvoChat("(11) 98765-4321")).toBe("5511987654321");
      expect(normalizarTelefoneAuvoChat("11987654321")).toBe("5511987654321");
      expect(normalizarTelefoneAuvoChat("19 3210-9876")).toBe("551932109876");
    });

    it("deve preservar telefones brasileiros que ja possuem DDI 55", () => {
      expect(normalizarTelefoneAuvoChat("5511987654321")).toBe("5511987654321");
      expect(normalizarTelefoneAuvoChat("+55 (11) 98765-4321")).toBe("5511987654321");
      expect(normalizarTelefoneAuvoChat("55 19 3210-9876")).toBe("551932109876");
    });

    it("deve preservar digitos para numeros internacionais validos", () => {
      expect(normalizarTelefoneAuvoChat("+1 (415) 555-2671")).toBe("14155552671");
    });
  });

  describe("Gerenciamento do Estado Temporario no sessionStorage", () => {
    it("deve salvar e recuperar o atendimento pendente dentro da validade", () => {
      const mockState: AuvoChatAtendimentoState = {
        clienteId: "cli-123",
        clienteNome: "Solar Engenharia LTDA",
        telefoneNormalizado: "5511987654321",
        iniciadoEm: new Date().toISOString(),
        origemRota: "/dashboard/clientes/cli-123",
        usuarioEmail: "tecnico@jansol.com.br",
      };

      salvarAtendimentoPendente(mockState);

      const pendente = getAtendimentoPendente();
      expect(pendente).not.toBeNull();
      expect(pendente?.clienteId).toBe("cli-123");
      expect(pendente?.telefoneNormalizado).toBe("5511987654321");
    });

    it("deve ignorar e limpar atendimentos expirados ha mais de 8 horas", () => {
      const tempoAntigo = new Date(Date.now() - 9 * 3600 * 1000).toISOString(); // 9h atras

      const mockState: AuvoChatAtendimentoState = {
        clienteId: "cli-456",
        clienteNome: "Cliente Antigo",
        telefoneNormalizado: "5511987654321",
        iniciadoEm: tempoAntigo,
        origemRota: "/dashboard/clientes",
      };

      salvarAtendimentoPendente(mockState);

      const pendente = getAtendimentoPendente();
      expect(pendente).toBeNull();
    });

    it("deve limpar o atendimento pendente ao solicitar cancelamento ou finalizacao", () => {
      const mockState: AuvoChatAtendimentoState = {
        clienteId: "cli-789",
        clienteNome: "Cliente Teste",
        telefoneNormalizado: "5511987654321",
        iniciadoEm: new Date().toISOString(),
        origemRota: "/dashboard",
      };

      salvarAtendimentoPendente(mockState);
      expect(getAtendimentoPendente()).not.toBeNull();

      limparAtendimentoPendente();
      expect(getAtendimentoPendente()).toBeNull();
    });
  });
});
