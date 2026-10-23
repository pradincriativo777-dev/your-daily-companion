import { z } from "zod";

const row = z.record(z.unknown());
export const batchImportSchema = z.object({
  insercoes: z.array(row).max(1000),
  atualizacoes: z.array(z.object({ id: z.string().uuid() }).catchall(z.unknown())).max(1000),
}).refine((data) => data.insercoes.length + data.atualizacoes.length > 0 && data.insercoes.length + data.atualizacoes.length <= 1000, {
  message: "O lote deve conter entre 1 e 1.000 registros.",
});

export const auditIdSchema = z.object({ auditId: z.string().uuid() });
