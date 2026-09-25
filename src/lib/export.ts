import * as XLSX from "xlsx";
import type { Cliente } from "@/hooks/use-crm";
import { formatDate } from "./crm";

export function exportClientsToXlsx(clientes: Cliente[], filename: string) {
  const wb = XLSX.utils.book_new();

  // 1. Aba de Instruções
  const instrucoes = [
    ["SISTEMA JANSOL - GUIA DE IMPORTAÇÃO E EXPORTAÇÃO"],
    ["Este arquivo contém DADOS PESSOAIS (LGPD). Armazene-o com segurança e não o compartilhe indevidamente."],
    [""],
    ["REGRAS GERAIS:"],
    ["1. Não altere a coluna 'ID Técnico (Não Alterar)'."],
    ["2. Novas linhas deixadas sem o ID Técnico serão tratadas como 'Novos Clientes'."],
    ["3. O sistema recusará linhas vazias e formatará CPFs/Telefones automaticamente, mas tente mantê-los padronizados."],
    ["4. Nunca use fórmulas nas células. Cole-as como Valores (Ctrl+Shift+V) se copiar de outro lugar."]
  ];
  
  const wsInstrucoes = XLSX.utils.aoa_to_sheet(instrucoes);
  // Estilizar um pouco as colunas para caber o texto
  wsInstrucoes["!cols"] = [{ wch: 100 }];
  XLSX.utils.book_append_sheet(wb, wsInstrucoes, "Instruções");

  // 2. Aba de Clientes
  const data = clientes.map(c => ({
    "ID Técnico (Não Alterar)": c.id,
    "Nome": c.nome,
    "Tipo Pessoa": c.tipo || "Física",
    "CPF/CNPJ": c.cpf_cnpj ?? "",
    "WhatsApp": c.whatsapp ?? "",
    "E-mail": c.email ?? "",
    "Endereço": c.endereco ?? "",
    "Cidade": c.cidade ?? "",
    "Sistema": c.tipo_sistema ?? "",
    "Origem Lead": c.origem_lead ?? "",
    "Status": c.status ?? "Ativo",
    "Observações": c.observacoes ?? "",
  }));

  const wsClientes = XLSX.utils.json_to_sheet(data);
  
  // Proteger planilha de clientes
  // Bloquear a edição do ID Técnico, mas o XLSX no Excel gratuito pode não honrar perfeitamente sem senha
  wsClientes["!protect"] = {
    password: "", 
    selectLockedCells: true,
    selectUnlockedCells: true,
  };

  XLSX.utils.book_append_sheet(wb, wsClientes, "Clientes");

  // Gera o arquivo
  XLSX.writeFile(wb, filename);
}
