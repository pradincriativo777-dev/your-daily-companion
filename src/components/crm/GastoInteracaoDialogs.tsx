import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CurrencyField,
  DateField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/crm/form-fields";
import {
  CATEGORIAS_GASTO,
  TIPOS_GASTO,
  TIPOS_INTERACAO,
  todayISO,
} from "@/lib/crm";
import {
  useClientes,
  useTecnicos,
  useUpsert,
  type Gasto,
  type Interacao,
} from "@/hooks/use-crm";
import { supabase } from "@/integrations/supabase/client";

export function GastoDialog({
  open,
  onOpenChange,
  gasto,
  clienteId,
  tecnicoId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  gasto?: Gasto | null;
  clienteId?: string;
  tecnicoId?: string;
}) {
  const [form, setForm] = useState<Partial<Gasto>>({});
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const upsert = useUpsert("gastos");

  useEffect(() => {
    if (open)
      setForm(
        gasto
          ? { ...gasto }
          : {
              categoria: "Materiais",
              tipo: "Operacional",
              data: todayISO(),
              valor: 0,
              descricao: "",
              cliente_id: clienteId ?? null,
              tecnico_id: tecnicoId ?? null,
            },
      );
  }, [open, gasto, clienteId, tecnicoId]);

  const set = (k: keyof Gasto, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{gasto ? "Editar Gasto" : "Novo Gasto"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Categoria"
            required
            value={form.categoria ?? null}
            onChange={(v) => set("categoria", v)}
            options={CATEGORIAS_GASTO}
          />
          <SelectField
            label="Tipo"
            required
            value={form.tipo ?? null}
            onChange={(v) => set("tipo", v)}
            options={TIPOS_GASTO}
          />
          <TextField
            label="Descrição"
            required
            value={form.descricao ?? ""}
            onChange={(v) => set("descricao", v)}
            className="sm:col-span-2"
          />
          <CurrencyField
            label="Valor"
            required
            value={form.valor ?? null}
            onChange={(v) => set("valor", v ?? 0)}
          />
          <DateField
            label="Data"
            required
            value={form.data ?? null}
            onChange={(v) => set("data", v)}
          />
          <SelectField
            label="Cliente"
            value={form.cliente_id ?? null}
            onChange={(v) => set("cliente_id", v)}
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
          />
          <SelectField
            label="Técnico"
            value={form.tecnico_id ?? null}
            onChange={(v) => set("tecnico_id", v)}
            options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))}
          />
          <TextareaField
            label="Observações"
            value={form.observacoes ?? ""}
            onChange={(v) => set("observacoes", v)}
            className="sm:col-span-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={upsert.isPending}
            onClick={() => {
              if (!form.descricao?.trim()) { toast.error("Informe a descrição"); return; }
              upsert.mutate(form as Record<string, unknown>, {
                onSuccess: () => onOpenChange(false),
              });
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function InteracaoDialog({
  open,
  onOpenChange,
  interacao,
  clienteId,
  userEmail,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  interacao?: Interacao | null;
  clienteId?: string;
  userEmail?: string;
}) {
  const [form, setForm] = useState<Partial<Interacao>>({});
  const { data: clientes = [] } = useClientes();
  const upsert = useUpsert("interacoes");
  const qc = useQueryClient();

  useEffect(() => {
    if (open)
      setForm(
        interacao
          ? { ...interacao }
          : {
              cliente_id: clienteId ?? "",
              data_interacao: todayISO(),
              tipo: "WhatsApp",
              descricao: "",
              usuario: userEmail ?? "",
            },
      );
  }, [open, interacao, clienteId, userEmail]);

  const set = (k: keyof Interacao, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {interacao ? "Editar Interação" : "Nova Interação"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label="Cliente"
            required
            value={form.cliente_id ?? null}
            onChange={(v) => set("cliente_id", v)}
            options={clientes.map((c) => ({ value: c.id, label: c.nome }))}
            className="sm:col-span-2"
          />
          <DateField
            label="Data da Interação"
            required
            value={form.data_interacao ?? null}
            onChange={(v) => set("data_interacao", v)}
          />
          <SelectField
            label="Tipo"
            required
            value={form.tipo ?? null}
            onChange={(v) => set("tipo", v)}
            options={TIPOS_INTERACAO}
          />
          <TextareaField
            label="Descrição"
            required
            value={form.descricao ?? ""}
            onChange={(v) => set("descricao", v)}
            className="sm:col-span-2"
          />
          <TextField
            label="Próximo Passo"
            value={form.proximo_passo ?? ""}
            onChange={(v) => set("proximo_passo", v)}
          />
          <DateField
            label="Data do Próximo Contato"
            value={form.data_proximo_contato ?? null}
            onChange={(v) => set("data_proximo_contato", v)}
          />
          <TextField
            label="Usuário"
            value={form.usuario ?? ""}
            onChange={(v) => set("usuario", v)}
            className="sm:col-span-2"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={upsert.isPending}
            onClick={() => {
              if (!form.cliente_id) { toast.error("Selecione o cliente"); return; }
              if (!form.descricao?.trim()) { toast.error("Informe a descrição"); return; }
              upsert.mutate(form as Record<string, unknown>, {
                onSuccess: async () => {
                  if (form.cliente_id && form.data_interacao) {
                    await supabase
                      .from("clientes")
                      .update({
                        ultimo_contato: form.data_interacao,
                      } as never)
                      .eq("id", form.cliente_id);
                    qc.invalidateQueries({ queryKey: ["clientes"] });
                  }
                  onOpenChange(false);
                },
              });
            }}
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
