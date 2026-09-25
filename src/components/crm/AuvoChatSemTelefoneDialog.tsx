import { AlertCircle, User } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface AuvoChatSemTelefoneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteNome?: string | null | undefined;
  onEditarCadastro?: () => void;
}

export function AuvoChatSemTelefoneDialog({
  open,
  onOpenChange,
  clienteNome,
  onEditarCadastro,
}: AuvoChatSemTelefoneDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-[#F8F6F1] text-[#24231F] border-[#E2DDD0] p-6 shadow-2xl rounded-2xl">
        <DialogHeader className="space-y-2 text-left">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF5F5] text-[#C53030] border border-[#FEB2B2]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <DialogTitle className="text-base font-bold text-[#24231F]">
              Este cliente não possui telefone cadastrado
            </DialogTitle>
            <DialogDescription className="text-xs text-[#706D65] mt-1 leading-relaxed">
              Para utilizar o fluxo assistido do Auvo Chat com{" "}
              <strong>{clienteNome || "este cliente"}</strong>, é necessário cadastrar um número de telefone ou WhatsApp válido.
            </DialogDescription>
          </div>
        </DialogHeader>

        <DialogFooter className="pt-4 gap-2 flex-col sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-[#E2DDD0] text-xs text-[#706D65]"
          >
            Fechar
          </Button>

          {onEditarCadastro && (
            <Button
              type="button"
              onClick={() => {
                onOpenChange(false);
                onEditarCadastro();
              }}
              className="bg-[#1D1C19] text-[#F8F6F1] hover:bg-[#292722] text-xs font-bold px-4"
            >
              Editar Cadastro do Cliente
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
