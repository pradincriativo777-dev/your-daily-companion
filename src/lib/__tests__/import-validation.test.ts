import { describe, expect, it } from "vitest";
import { auditIdSchema, batchImportSchema } from "../import-validation";

describe("batch import boundary", () => {
  it("rejects the old mismatched field instead of silently dropping new clients", () => {
    expect(() => batchImportSchema.parse({ novosClientes: [{ nome: "Fixture" }], atualizacoes: [] })).toThrow();
  });

  it("accepts the payload used by the corrected import screen", () => {
    expect(batchImportSchema.parse({ insercoes: [{ nome: "Fixture" }], atualizacoes: [] }).insercoes).toHaveLength(1);
  });

  it("rejects empty batches, oversized batches, and updates without a valid identity", () => {
    for (const data of [
      { insercoes: [], atualizacoes: [] },
      { insercoes: Array.from({ length: 1001 }, () => ({ nome: "Fixture" })), atualizacoes: [] },
      { insercoes: Array.from({ length: 600 }, () => ({ nome: "Fixture" })), atualizacoes: Array.from({ length: 401 }, () => ({ id: "00000000-0000-4000-8000-000000000001" })) },
      { insercoes: [], atualizacoes: [{ nome: "Fixture" }] },
      { insercoes: [], atualizacoes: [{ id: "invalid" }] },
    ]) expect(() => batchImportSchema.parse(data)).toThrow();
    expect(() => auditIdSchema.parse({ auditId: "invalid" })).toThrow();
  });
});
