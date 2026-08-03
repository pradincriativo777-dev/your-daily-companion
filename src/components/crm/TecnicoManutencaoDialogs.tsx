import { useEffect, useState } from "react";
import { toast } from "sonner";
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
  ESPECIALIDADES,
  STATUS_MANUTENCAO,
  STATUS_TECNICO,
  TIPOS_MANUTENCAO,
  todayISO,
} from "@/lib/crm";
import {
  useClientes,
  useTecnicos,
  useUpsert,
  type Manutencao,
  type Tecnico,
} from "@/hooks/use-crm";

export function TecnicoDialog({
  open,
  onOpenChange,
  tecnico,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  tecnico?: Tecnico | null | undefined;
}) {
  const [form, setForm] = useState<Partial<Tecnico>>({});
  const upsert = useUpsert("tecnicos");

  useEffect(() => {
    if (open)
      setForm(
        tecnico
          ? { ...tecnico }
          : { nome: "", especialidade: "Ambos", status: "Ativo" },
      );
  }, [open, tecnico]);

  const set = (k: keyof Tecnico, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {tecnico ? "Editar Técnico" : "Novo Técnico"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            label="Nome"
            required
            value={form.nome ?? ""}
            onChange={(v) => set("nome", v)}
            className="sm:col-span-2"
          />
          <TextField
            label="Telefone"
            value={form.telefone ?? ""}
            onChange={(v) => set("telefone", v)}
          />
          <SelectField
            label="Especialidade"
            required
            value={form.especialidade ?? null}
            onChange={(v) => set("especialidade", v)}
            options={ESPECIALIDADES}
          />
          <SelectField
            label="Status"
            required
            value={form.status ?? null}
            onChange={(v) => set("status", v)}
            options={STATUS_TECNICO}
          />
          <CurrencyField
            label="Custo Mensal"
            value={form.custo_mensal ?? null}
            onChange={(v) => set("custo_mensal", v)}
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
              if (!form.nome?.trim()) { toast.error("Informe o nome"); return; }
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

export function ManutencaoDialog({
  open,
  onOpenChange,
  manutencao,
  clienteId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  manutencao?: Manutencao | null | undefined;
  clienteId?: string | undefined;
}) {
  const [form, setForm] = useState<Partial<Manutencao>>({});
  const { data: clientes = [] } = useClientes();
  const { data: tecnicos = [] } = useTecnicos();
  const upsert = useUpsert("manutencoes");

  useEffect(() => {
    if (open)
      setForm(
        manutencao
          ? { ...manutencao }
          : {
              cliente_id: clienteId ?? "",
              data_manutencao: todayISO(),
              tipo: "Preventiva",
              status: "Agendada",
              custo: 0,
            },
      );
  }, [open, manutencao, clienteId]);

  const set = (k: keyof Manutencao, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {manutencao ? "Editar Manutenção" : "Nova Manutenção"}
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
            label="Data da Manutenção"
            required
            value={form.data_manutencao ?? null}
            onChange={(v) => set("data_manutencao", v)}
          />
          <SelectField
            label="Tipo"
            required
            value={form.tipo ?? null}
            onChange={(v) => set("tipo", v)}
            options={TIPOS_MANUTENCAO}
          />
          <SelectField
            label="Técnico"
            value={form.tecnico_id ?? null}
            onChange={(v) => set("tecnico_id", v)}
            options={tecnicos.map((t) => ({ value: t.id, label: t.nome }))}
          />
          <SelectField
            label="Status"
            required
            value={form.status ?? null}
            onChange={(v) => set("status", v)}
            options={STATUS_MANUTENCAO}
          />
          <DateField
            label="Próxima Manutenção"
            value={form.proxima_manutencao ?? null}
            onChange={(v) => set("proxima_manutencao", v)}
          />
          <CurrencyField
            label="Custo"
            value={form.custo ?? null}
            onChange={(v) => set("custo", v ?? 0)}
          />
          <TextareaField
            label="Descrição"
            value={form.descricao ?? ""}
            onChange={(v) => set("descricao", v)}
            className="sm:col-span-2"
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
              if (!form.cliente_id) { toast.error("Selecione o cliente"); return; }
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
