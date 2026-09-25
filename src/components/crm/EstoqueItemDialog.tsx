import { useState, useEffect } from "react";
import { EstoqueItem } from "@/hooks/use-crm";
import {
  CATEGORIAS_ESTOQUE_INICIAIS,
  UNIDADES_MEDIDA_LIST,
  validarSkuUnico,
} from "@/lib/estoque";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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

interface EstoqueItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itensExistentes: EstoqueItem[];
  itemParaEditar?: EstoqueItem | null;
  onSave: (dados: Partial<EstoqueItem>) => Promise<void>;
}

export function EstoqueItemDialog({
  open,
  onOpenChange,
  itensExistentes,
  itemParaEditar,
  onSave,
}: EstoqueItemDialogProps) {
  const [submitting, setSubmitting] = useState(false);

  const [sku, setSku] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("reservatórios");
  const [categoriaCustom, setCategoriaCustom] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [unidadeMedida, setUnidadeMedida] = useState("unidade");
  const [localizacaoFisica, setLocalizacaoFisica] = useState("");
  const [fornecedorPrincipal, setFornecedorPrincipal] = useState("");
  const [custoMedio, setCustoMedio] = useState(0);
  const [precoReferencia, setPrecoReferencia] = useState(0);
  const [estoqueMinimo, setEstoqueMinimo] = useState(0);
  const [estado, setEstado] = useState("Ativo");

  useEffect(() => {
    if (itemParaEditar) {
      setSku(itemParaEditar.sku || "");
      setNome(itemParaEditar.nome || "");

      const isInitialCat = CATEGORIAS_ESTOQUE_INICIAIS.some(
        (c) => c.value === itemParaEditar.categoria,
      );
      if (isInitialCat) {
        setCategoria(itemParaEditar.categoria);
        setCategoriaCustom("");
      } else {
        setCategoria("outro");
        setCategoriaCustom(itemParaEditar.categoria || "");
      }

      setMarca(itemParaEditar.marca || "");
      setModelo(itemParaEditar.modelo || "");
      setDescricao(itemParaEditar.descricao || "");
      setUnidadeMedida(itemParaEditar.unidade_medida || "unidade");
      setLocalizacaoFisica(itemParaEditar.localizacao_fisica || "");
      setFornecedorPrincipal(itemParaEditar.fornecedor_principal || "");
      setCustoMedio(itemParaEditar.custo_medio || 0);
      setPrecoReferencia(itemParaEditar.preco_referencia || 0);
      setEstoqueMinimo(itemParaEditar.estoque_minimo || 0);
      setEstado(itemParaEditar.estado || "Ativo");
    } else {
      setSku(`SKU-${Math.floor(10000 + Math.random() * 90000)}`);
      setNome("");
      setCategoria("reservatórios");
      setCategoriaCustom("");
      setMarca("");
      setModelo("");
      setDescricao("");
      setUnidadeMedida("unidade");
      setLocalizacaoFisica("Prateleira A");
      setFornecedorPrincipal("");
      setCustoMedio(0);
      setPrecoReferencia(0);
      setEstoqueMinimo(5);
      setEstado("Ativo");
    }
  }, [itemParaEditar, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

    if (!nome.trim() || !marca.trim() || !modelo.trim()) {
      toast.error("Nome, Marca e Modelo são campos obrigatórios.");
      return;
    }

    // Validação de SKU Único
    const valSku = validarSkuUnico(sku, itemParaEditar?.id, itensExistentes);
    if (valSku.duplicado) {
      toast.error(valSku.erro);
      return;
    }

    const catFinal = categoria === "outro" && categoriaCustom.trim() ? categoriaCustom.trim() : categoria;

    try {
      setSubmitting(true);
      await onSave({
        ...(itemParaEditar ? { id: itemParaEditar.id } : {}),
        sku: sku.trim().toUpperCase(),
        nome: nome.trim(),
        categoria: catFinal,
        marca: marca.trim(),
        modelo: modelo.trim(),
        descricao: descricao.trim() || null,
        unidade_medida: unidadeMedida,
        localizacao_fisica: localizacaoFisica.trim() || null,
        fornecedor_principal: fornecedorPrincipal.trim() || null,
        custo_medio: Number(custoMedio) || 0,
        preco_referencia: Number(precoReferencia) || 0,
        estoque_minimo: Number(estoqueMinimo) || 0,
        estado,
        version: itemParaEditar ? itemParaEditar.version : 1,
      });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao salvar item de estoque.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {itemParaEditar ? `Editar Item ${itemParaEditar.sku}` : "Novo Item de Estoque"}
          </DialogTitle>
          <DialogDescription>
            Cadastre as especificações técnicas, SKU e limites de estoque do produto.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* SKU e Nome */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="sku">Código SKU *</Label>
              <Input
                id="sku"
                placeholder="Ex: TUB-SOL-22"
                className="font-mono uppercase"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="nome">Nome do Item / Peça *</Label>
              <Input
                id="nome"
                placeholder="Ex: Tubulação de Cobre Flexível 22mm"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />
            </div>
          </div>

          {/* Categoria, Marca e Modelo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="categoria">Categoria *</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger id="categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_ESTOQUE_INICIAIS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="marca">Marca *</Label>
              <Input
                id="marca"
                placeholder="Ex: Eluma, Mastersol, Bosch..."
                value={marca}
                onChange={(e) => setMarca(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="modelo">Modelo / Especificação *</Label>
              <Input
                id="modelo"
                placeholder="Ex: 22mm Classe I, 500L Inox..."
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
              />
            </div>
          </div>

          {categoria === "outro" && (
            <div className="space-y-1.5">
              <Label htmlFor="categoriaCustom">Nome da Categoria Customizada *</Label>
              <Input
                id="categoriaCustom"
                placeholder="Ex: Sensores de vazão digitais"
                value={categoriaCustom}
                onChange={(e) => setCategoriaCustom(e.target.value)}
              />
            </div>
          )}

          {/* Unidade de Medida, Localização e Fornecedor */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="unidadeMedida">Unidade de Medida *</Label>
              <Select value={unidadeMedida} onValueChange={setUnidadeMedida}>
                <SelectTrigger id="unidadeMedida">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIDADES_MEDIDA_LIST.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="localizacao">Localização Física</Label>
              <Input
                id="localizacao"
                placeholder="Ex: Prateleira B3 / Prateleira 2"
                value={localizacaoFisica}
                onChange={(e) => setLocalizacaoFisica(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="fornecedor">Fornecedor Principal</Label>
              <Input
                id="fornecedor"
                placeholder="Ex: Distribuidora Solar BR"
                value={fornecedorPrincipal}
                onChange={(e) => setFornecedorPrincipal(e.target.value)}
              />
            </div>
          </div>

          {/* Preços e Limites */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="custoMedio">Custo Médio Inicial (R$)</Label>
              <Input
                id="custoMedio"
                type="number"
                step="0.01"
                min="0"
                value={custoMedio}
                onChange={(e) => setCustoMedio(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="precoReferencia">Preço de Referência (R$)</Label>
              <Input
                id="precoReferencia"
                type="number"
                step="0.01"
                min="0"
                value={precoReferencia}
                onChange={(e) => setPrecoReferencia(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="estoqueMinimo">Estoque Mínimo de Alerta</Label>
              <Input
                id="estoqueMinimo"
                type="number"
                step="0.001"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <Label htmlFor="descricao">Descrição Completa / Observações</Label>
            <Textarea
              id="descricao"
              placeholder="Detalhes de aplicação, normas técnicas, compatibilidades..."
              rows={2}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
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
              {submitting ? "Salvação..." : itemParaEditar ? "Atualizar Item" : "Cadastrar Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
