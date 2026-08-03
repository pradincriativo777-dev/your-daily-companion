import { useEffect, useState } from "react";
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
  NumberField,
  SelectField,
  TextField,
  TextareaField,
} from "@/components/crm/form-fields";
import {
  MARCAS,
  ORIGENS_LEAD,
  STATUS_CLIENTE,
  TIPOS_CLIENTE,
  TIPOS_SISTEMA,
  TIPOS_TELHADO,
} from "@/lib/crm";
import { useTecnicos, useUpsert, type Cliente } from "@/hooks/use-crm";
import { toast } from "sonner";

type Form = Partial<Cliente>;

const empty: Form = {
  nome: "",
  tipo: "Pessoa Física",
  tipo_sistema: "Banho",
  status: "Orçamento",
  valor_orcamento: 0,
};

export function ClienteDialog({
  open,
  onOpenChange,
  cliente,
  defaultStatus,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cliente?: Cliente | null | undefined;
  defaultStatus?: string | undefined;
}) {
  const [form, setForm] = useState<Form>(empty);
  const { data: tecnicos = [] } = useTecnicos();
  const upsert = useUpsert("clientes");

  useEffect(() => {
    if (open) {
      setForm(
        cliente
          ? { ...cliente }
          : { ...empty, status: defaultStatus ?? "Orçamento" },
      );
    }
  }, [open, cliente, defaultStatus]);

  const set = (k: keyof Cliente, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const showBanho =
    form.tipo_sistema === "Banho" || form.tipo_sistema === "Ambos";
  const showPiscina =
    form.tipo_sistema === "Piscina" || form.tipo_sistema === "Ambos";

  const save = () => {
    if (!form.nome?.trim()) {
      toast.error("Informe o nome do cliente");
      return;
    }
    upsert.mutate(form as Record<string, unknown>, {
      onSuccess: () => onOpenChange(false),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {cliente ? "Editar Cliente" : "Novo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-3">
            <TextField
              label="Nome"
              required
              value={form.nome ?? ""}
              onChange={(v) => set("nome", v)}
              className="sm:col-span-2"
            />
            <SelectField
              label="Tipo"
              required
              value={form.tipo ?? null}
              onChange={(v) => set("tipo", v)}
              options={TIPOS_CLIENTE}
            />
            <TextField
              label="CPF / CNPJ"
              value={form.cpf_cnpj ?? ""}
              onChange={(v) => set("cpf_cnpj", v)}
            />
            <TextField
              label="WhatsApp"
              value={form.whatsapp ?? ""}
              onChange={(v) => set("whatsapp", v)}
            />
            <TextField
              label="E-mail"
              type="email"
              value={form.email ?? ""}
              onChange={(v) => set("email", v)}
            />
            <TextField
              label="Endereço"
              value={form.endereco ?? ""}
              onChange={(v) => set("endereco", v)}
              className="sm:col-span-2"
            />
            <TextField
              label="Cidade"
              value={form.cidade ?? ""}
              onChange={(v) => set("cidade", v)}
            />
            <SelectField
              label="Origem do Lead"
              value={form.origem_lead ?? null}
              onChange={(v) => set("origem_lead", v)}
              options={ORIGENS_LEAD}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <SelectField
              label="Tipo de Sistema"
              required
              value={form.tipo_sistema ?? null}
              onChange={(v) => set("tipo_sistema", v)}
              options={TIPOS_SISTEMA}
            />
            <SelectField
              label="Tipo de Telhado"
              value={form.tipo_telhado ?? null}
              onChange={(v) => set("tipo_telhado", v)}
              options={TIPOS_TELHADO}
            />
            <SelectField
              label="Marca do Equipamento"
              value={form.marca_equipamento ?? null}
              onChange={(v) => set("marca_equipamento", v)}
              options={MARCAS}
            />
            {showBanho && (
              <NumberField
                label="Qtd. de Pessoas"
                value={form.qtd_pessoas ?? null}
                onChange={(v) => set("qtd_pessoas", v)}
              />
            )}
            {showBanho && (
              <NumberField
                label="Qtd. de Banheiros"
                value={form.qtd_banheiros ?? null}
                onChange={(v) => set("qtd_banheiros", v)}
              />
            )}
            {showPiscina && (
              <NumberField
                label="Tamanho da Piscina (m²)"
                value={form.tamanho_piscina_m2 ?? null}
                onChange={(v) => set("tamanho_piscina_m2", v)}
              />
            )}
            <NumberField
              label="Qtd. de Coletores"
              value={form.qtd_coletores ?? null}
              onChange={(v) => set("qtd_coletores", v)}
            />
            <TextField
              label="Modelo do Reservatório"
              value={form.modelo_reservatorio ?? ""}
              onChange={(v) => set("modelo_reservatorio", v)}
            />
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            <DateField
              label="Data de Instalação"
              value={form.data_instalacao ?? null}
              onChange={(v) => set("data_instalacao", v)}
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
              options={STATUS_CLIENTE}
            />
            <CurrencyField
              label="Valor do Orçamento"
              value={form.valor_orcamento ?? null}
              onChange={(v) => set("valor_orcamento", v ?? 0)}
            />
            <CurrencyField
              label="Valor Pago"
              value={form.valor_pago ?? null}
              onChange={(v) => set("valor_pago", v)}
            />
            <DateField
              label="Último Contato"
              value={form.ultimo_contato ?? null}
              onChange={(v) => set("ultimo_contato", v)}
            />
          </section>

          <TextareaField
            label="Observações"
            value={form.observacoes ?? ""}
            onChange={(v) => set("observacoes", v)}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            onClick={save}
            disabled={upsert.isPending}
            className="bg-accent text-accent-foreground hover:bg-accent/90"
          >
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
