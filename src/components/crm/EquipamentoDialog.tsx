import { useState, useEffect } from "react";
import { Cliente, Equipamento, OrdemServico } from "@/hooks/use-crm";
import {
  CATEGORIAS_EQUIPAMENTO_INICIAIS,
  EQUIPAMENTO_ESTADOS_LIST,
  EquipamentoEstado,
  validarNumeroSerieDuplicado,
  validarPermissaoEstadoEquipamento,
} from "@/lib/equipamentos";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface EquipamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientes: Cliente[];
  ordensServico?: OrdemServico[];
  equipamentosExistentes: Equipamento[];
  equipamentoParaEditar?: Equipamento | null;
  clienteIdPreDefinido?: string;
  userRole?: string;
  onSave: (dados: Partial<Equipamento>) => Promise<void>;
}

export function EquipamentoDialog({
  open,
  onOpenChange,
  clientes,
  ordensServico = [],
  equipamentosExistentes,
  equipamentoParaEditar,
  clienteIdPreDefinido,
  userRole = "admin",
  onSave,
}: EquipamentoDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [clienteId, setClienteId] = useState(clienteIdPreDefinido || "");
  const [categoria, setCategoria] = useState("reservatório térmico");
  const [categoriaCustom, setCategoriaCustom] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [numeroSerie, setNumeroSerie] = useState("");
  const [quantidade, setQuantidade] = useState(1);
  const [dataInstalacao, setDataInstalacao] = useState("");
  const [empresaInstalacao, setEmpresaInstalacao] = useState("JANSOL Solar");
  const [localInstalacao, setLocalInstalacao] = useState("Telhado Principal");
  const [ordemServicoOrigemId, setOrdemServicoOrigemId] = useState("");
  const [estado, setEstado] = useState<EquipamentoEstado>("Ativo");
  const [observacoesTecnicas, setObservacoesTecnicas] = useState("");

  useEffect(() => {
    if (equipamentoParaEditar) {
      setClienteId(equipamentoParaEditar.cliente_id || clienteIdPreDefinido || "");
      const isInitialCat = CATEGORIAS_EQUIPAMENTO_INICIAIS.some(
        (c) => c.value === equipamentoParaEditar.categoria,
      );
      if (isInitialCat) {
        setCategoria(equipamentoParaEditar.categoria);
        setCategoriaCustom("");
      } else {
        setCategoria("outro");
        setCategoriaCustom(equipamentoParaEditar.categoria || "");
      }

      setMarca(equipamentoParaEditar.marca || "");
      setModelo(equipamentoParaEditar.modelo || "");
      setNumeroSerie(equipamentoParaEditar.numero_serie || "");
      setQuantidade(equipamentoParaEditar.quantidade || 1);
      setDataInstalacao(equipamentoParaEditar.data_instalacao || "");
      setEmpresaInstalacao(equipamentoParaEditar.empresa_responsavel_instalacao || "");
      setLocalInstalacao(equipamentoParaEditar.local_instalacao || "");
      setOrdemServicoOrigemId(equipamentoParaEditar.ordem_servico_origem_id || "");
      setEstado((equipamentoParaEditar.estado as EquipamentoEstado) || "Ativo");
      setObservacoesTecnicas(equipamentoParaEditar.observacoes_tecnicas || "");
    } else {
      setClienteId(clienteIdPreDefinido || "");
      setCategoria("reservatório térmico");
      setCategoriaCustom("");
      setMarca("");
      setModelo("");
      setNumeroSerie("");
      setQuantidade(1);
      setDataInstalacao("");
      setEmpresaInstalacao("JANSOL Solar");
      setLocalInstalacao("Telhado Principal");
      setOrdemServicoOrigemId("");
      setEstado("Ativo");
      setObservacoesTecnicas("");
    }
  }, [equipamentoParaEditar, clienteIdPreDefinido, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!clienteId) {
      toast.error("Por favor, selecione um cliente.");
      return;
    }
    if (!marca.trim() || !modelo.trim()) {
      toast.error("Marca e Modelo são campos obrigatórios.");
      return;
    }

    const valPermissao = validarPermissaoEstadoEquipamento(estado, userRole);
    if (!valPermissao.permitido) {
      toast.error(valPermissao.erro);
      return;
    }

    // Validação de Número de Série Duplicado
    const valSerial = validarNumeroSerieDuplicado(
      numeroSerie,
      equipamentoParaEditar?.id,
      equipamentosExistentes,
    );

    if (valSerial.duplicado) {
      toast.error(valSerial.erro);
      return;
    }

    const catFinal = categoria === "outro" && categoriaCustom.trim() ? categoriaCustom.trim() : categoria;

    try {
      setSubmitting(true);
      await onSave({
        ...(equipamentoParaEditar ? { id: equipamentoParaEditar.id } : {}),
        cliente_id: clienteId,
        categoria: catFinal,
        marca: marca.trim(),
        modelo: modelo.trim(),
        numero_serie: numeroSerie.trim() || null,
        quantidade: Number(quantidade) || 1,
        data_instalacao: dataInstalacao || null,
        empresa_responsavel_instalacao: empresaInstalacao.trim() || null,
        local_instalacao: localInstalacao.trim() || null,
        ordem_servico_origem_id: ordemServicoOrigemId || null,
        estado,
        observacoes_tecnicas: observacoesTecnicas.trim() || null,
        version: equipamentoParaEditar ? equipamentoParaEditar.version : 1,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar equipamento.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {equipamentoParaEditar ? `Editar ${equipamentoParaEditar.marca} ${equipamentoParaEditar.modelo}` : "Novo Equipamento Instalado"}
          </DialogTitle>
          <DialogDescription>
            Cadastre os dados técnicos do equipamento instalado no cliente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="cliente">Cliente *</Label>
              <Select
                value={clienteId}
                onValueChange={setClienteId}
                disabled={!!clienteIdPreDefinido}
              >
                <SelectTrigger id="cliente">
                  <SelectValue placeholder="Selecione o cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome} {c.cidade ? `(${c.cidade})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Categoria */}
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_EQUIPAMENTO_INICIAIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {categoria === "outro" && (
            <div className="space-y-1.5">
              <Label htmlFor="categoriaCustom">Nome da Categoria Customizada *</Label>
              <Input
                id="categoriaCustom"
                placeholder="Ex: Trocador de calor titanium"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
              />
            </div>
          )}

          {/* Marca e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                placeholder="Ex: Heliotek, Mastersol, Bosch..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo / Capacidade *</Label>
              <Input
                id="modelo"
                placeholder="Ex: MK 500L Inox 304, Placa 2.0m²..."
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>
          </div>

          {/* Número de Série e Quantidade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="numeroSerie">Número de Série (Opcional)</Label>
              <Input
                id="numeroSerie"
                placeholder="Ex: NS-2025-883910"
                value={numeroSerie}
                onChange={(e) => setNumeroSerie(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="quantidade">Quantidade</Label>
              <Input
                id="quantidade"
                type="number"
                min={1}
                value={quantidade}
                onChange={(e) => setQuantidade(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Data Instalação, Empresa e Local */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dataInstalacao">Data da Instalação</Label>
              <Input
                id="dataInstalacao"
                type="date"
                value={dataInstalacao}
                onChange={(e) => setDataInstalacao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="empresaInstalacao">Empresa Responsável</Label>
              <Input
                id="empresaInstalacao"
                placeholder="JANSOL Solar / Terceira"
                value={empresaInstalacao}
                onChange={(e) => setEmpresaInstalacao(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="localInstalacao">Local Onde Está Instalado</Label>
              <Input
                id="localInstalacao"
                placeholder="Ex: Telhado principal, Laje 2"
                value={localInstalacao}
                onChange={(e) => setLocalInstalacao(e.target.value)}
              />
            </div>
          </div>

          {/* Ordem de Serviço Origem e Estado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="osOrigem">Ordem de Serviço de Origem</Label>
              <Select value={ordemServicoOrigemId} onValueChange={setOrdemServicoOrigemId}>
                <SelectTrigger id="osOrigem">
                  <SelectValue placeholder="Selecione a OS (Opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">-- Nenhuma OS --</SelectItem>
                  {ordensServico.map((os) => (
                    <SelectItem key={os.id} value={os.id}>
                      {os.codigo} ({new Date(os.created_at).toLocaleDateString("pt-BR")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estado">Estado Atual</Label>
              <Select value={estado} onValueChange={(v) => setEstado(v as EquipamentoEstado)}>
                <SelectTrigger id="estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EQUIPAMENTO_ESTADOS_LIST.map((est) => (
                    <SelectItem key={est} value={est}>
                      {est}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Observações Técnicas */}
          <div className="space-y-1.5">
            <Label htmlFor="observacoesTecnicas">Observações Técnicas</Label>
            <Textarea
              id="observacoesTecnicas"
              placeholder="Notas de instalação, condições da tubulação, orientação solar..."
              rows={2}
              value={observacoesTecnicas}
              onChange={(e) => setObservacoesTecnicas(e.target.value)}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Salvação..." : equipamentoParaEditar ? "Atualizar Equipamento" : "Cadastrar Equipamento"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
