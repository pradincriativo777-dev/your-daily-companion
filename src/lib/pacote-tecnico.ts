import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface EtapaExecucao {
  id: string;
  ordem: number;
  descricao: string;
  obrigatoria: boolean;
  observacao?: string | null;
}

export interface MaterialPrevisto {
  id: string;
  codigo?: string | null;
  descricao: string;
  quantidade: number;
  unidade: string;
  observacao?: string | null;
  situacaoSeparacao?: "Previsto" | "Separado" | "Levado" | "Utilizado" | "Devolvido";
}

export interface FerramentaEPIItem {
  id: string;
  item: string;
  quantidade: number;
  tipo: "Ferramenta" | "Equipamento" | "Medição" | "EPI" | "Proteção do Ambiente";
  observacao?: string | null;
}

export interface OrdemServicoCompletaPacote {
  id: string;
  codigo: string;
  cliente_id: string;
  cliente_nome?: string | null | undefined;
  cliente_telefone?: string | null | undefined;
  tecnico_id?: string | null | undefined;
  tecnico_nome?: string | null | undefined;
  tipo_atendimento: string;
  prioridade: string;
  descricao_problema: string;
  servico_solicitado?: string | null | undefined;
  endereco_visita: string;
  cidade?: string | null | undefined;
  data_prevista: string;
  horario_inicio?: string | null | undefined;
  duracao_estimada_min?: number | null | undefined;
  origem_solicitacao?: string | null | undefined;
  observacoes_internas?: string | null | undefined;
  status: string;
  version?: number;

  // DADOS FINANCEIROS INTERNOS RESTREITOS (NUNCA INCLUÍDOS NO DTO/PDF)
  valor_orcado?: number;
  valor_aprovado?: number;
  valor_recebido?: number;
  situacao_pagamento?: string;

  // Orientações para execução do técnico
  objetivo_atendimento?: string | null | undefined;
  escopo_tecnico?: string | null | undefined;
  itens_inclusos?: string | null | undefined;
  itens_nao_inclusos?: string | null | undefined;
  cuidados_seguranca?: string | null | undefined;
  contato_suporte_interno?: string | null | undefined;
  confirmacao_sem_materiais?: boolean;

  etapas?: EtapaExecucao[];
  materiais?: MaterialPrevisto[];
  ferramentas?: FerramentaEPIItem[];
}

export interface PacoteTecnicoDTO {
  codigoOS: string;
  versaoPacote: string;
  dataEmissao: string;
  clienteNome: string;
  clienteTelefone: string;
  enderecoObra: string;
  cidade: string;
  dataHorarioAgendado: string;
  duracaoEstimadaMin: number;
  tecnicoOuEquipe: string;
  prioridade: string;
  tipoAtendimento: string;
  objetivoAtendimento: string;
  escopoTecnico: string;
  itensInclusos: string;
  itensNaoInclusos: string;
  cuidadosSeguranca: string;
  contatoSuporteInterno: string;
  etapas: { ordem: number; descricao: string; obrigatoria: boolean; observacao?: string | null | undefined }[];
  materiais: { item: string; quantidade: number; unidade: string; observacao?: string | null | undefined }[];
  ferramentas: { item: string; quantidade: number; tipo: string; observacao?: string | null | undefined }[];
}

export interface ValidacaoPacoteResultado {
  valido: boolean;
  pendencias: string[];
}

/**
 * Transforma e sanitiza os dados da OS em um DTO restrito para a equipe técnica.
 * REMOVE 100% dos dados financeiros e administrativos restritos.
 */
export function sanitizarDadosTecnico(
  os: OrdemServicoCompletaPacote,
  versaoNum = 1
): PacoteTecnicoDTO {
  const versaoPacote = `v${versaoNum}`;
  const dataEmissao = format(new Date(), "dd/MM/yyyy HH:mm", { locale: ptBR });

  let dataHorarioAgendado = os.data_prevista
    ? format(new Date(os.data_prevista + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR })
    : "A definir";
  if (os.horario_inicio) {
    dataHorarioAgendado += ` às ${os.horario_inicio}`;
  }

  // Mapeamento sanitizado restrito
  return {
    codigoOS: os.codigo || "OS-000",
    versaoPacote,
    dataEmissao,
    clienteNome: os.cliente_nome || "Cliente JANSOL",
    clienteTelefone: os.cliente_telefone || "Não informado",
    enderecoObra: os.endereco_visita || "Endereço não cadastrado",
    cidade: os.cidade || "Campinas e Região",
    dataHorarioAgendado,
    duracaoEstimadaMin: os.duracao_estimada_min || 60,
    tecnicoOuEquipe: os.tecnico_nome || "Equipe Técnica JANSOL",
    prioridade: os.prioridade || "Média",
    tipoAtendimento: os.tipo_atendimento || "Manutenção Preventiva",
    objetivoAtendimento:
      os.objetivo_atendimento || os.servico_solicitado || "Atendimento técnico no sistema solar.",
    escopoTecnico:
      os.escopo_tecnico || os.descricao_problema || "Execução dos serviços técnicos acordados.",
    itensInclusos: os.itens_inclusos || "Serviços técnicos e materiais listados no pacote.",
    itensNaoInclusos: os.itens_nao_inclusos || "Modificações estruturais não autorizadas previamente.",
    cuidadosSeguranca:
      os.cuidados_seguranca ||
      "Uso obrigatório de EPIs adequados (capacete, luvas, calçado de segurança e cinto em altura).",
    contatoSuporteInterno:
      os.contato_suporte_interno ||
      "Plantão de Engenharia & Operações JANSOL: (19) 3210-9876 / suporte@jansol.com.br",
    etapas: (os.etapas || []).map((e) => ({
      ordem: e.ordem,
      descricao: e.descricao,
      obrigatoria: e.obrigatoria,
      observacao: e.observacao || undefined,
    })),
    materiais: (os.materiais || []).map((m) => ({
      item: m.descricao,
      quantidade: m.quantidade,
      unidade: m.unidade || "Unidades",
      observacao: m.observacao || undefined,
    })),
    ferramentas: (os.ferramentas || []).map((f) => ({
      item: f.item,
      quantidade: f.quantidade,
      tipo: f.tipo,
      observacao: f.observacao || undefined,
    })),
  };
}

/**
 * Valida a OS antes da geração do pacote do técnico.
 */
export function validarPacoteTecnico(
  os: OrdemServicoCompletaPacote
): ValidacaoPacoteResultado {
  const pendencias: string[] = [];

  if (!os.cliente_id && !os.cliente_nome) {
    pendencias.push("Cliente não selecionado na OS");
  }

  if (!os.endereco_visita || !os.endereco_visita.trim()) {
    pendencias.push("Endereço ou identificação do local da obra");
  }

  if (!os.data_prevista) {
    pendencias.push("Data prevista de agendamento");
  }

  if (!os.tecnico_id && !os.tecnico_nome) {
    pendencias.push("Técnico ou equipe responsável atribuída");
  }

  if (!os.objetivo_atendimento && !os.servico_solicitado && !os.descricao_problema) {
    pendencias.push("Objetivo do atendimento ou descrição do serviço");
  }

  if (!os.etapas || os.etapas.length === 0) {
    pendencias.push("Pelo menos uma etapa de execução cadastrada");
  }

  const possuiMateriais = os.materiais && os.materiais.length > 0;
  if (!possuiMateriais && !os.confirmacao_sem_materiais) {
    pendencias.push(
      "Lista de materiais ou confirmação explícita de ausência de materiais"
    );
  }

  return {
    valido: pendencias.length === 0,
    pendencias,
  };
}

/**
 * Gera a mensagem editável de acompanhamento para envio ao técnico via WhatsApp / Auvo Chat.
 */
export function gerarMensagemAcompanhamentoTecnico(
  os: OrdemServicoCompletaPacote,
  versaoNum = 1
): string {
  const nomeTecnico = os.tecnico_nome || "Técnico";
  const codigo = os.codigo || "OS";
  const nomeCliente = os.cliente_nome || "Cliente";

  let dataStr = os.data_prevista;
  try {
    if (os.data_prevista) {
      dataStr = format(new Date(os.data_prevista + "T00:00:00"), "dd/MM/yyyy", { locale: ptBR });
    }
  } catch {
    // Keep raw
  }

  const horaStr = os.horario_inicio || "08:00";
  const versaoStr = `v${versaoNum}`;

  return `Olá, ${nomeTecnico}. Segue o Pacote do Técnico referente à ${codigo} (${versaoStr}), serviço para o cliente ${nomeCliente}, agendado para ${dataStr} às ${horaStr}. Confira o escopo, os materiais, as ferramentas e as orientações antes de sair. Em caso de divergência ou falta de material, avise a equipe antes do deslocamento.`;
}

/**
 * Incrementa a versão formatada (ex: 0 -> "v1", 1 -> "v2").
 */
export function incrementarVersaoPacote(versaoAtualNum = 0): string {
  return `v${versaoAtualNum + 1}`;
}

/**
 * Gera o documento PDF profissional do Pacote do Técnico A4 com identidade visual JANSOL.
 */
export function gerarPdfPacoteTecnico(
  os: OrdemServicoCompletaPacote,
  versaoNum = 1
): jsPDF {
  const dto = sanitizarDadosTecnico(os, versaoNum);
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const primaryColor = "#100D3F"; // Navy JANSOL
  const goldColor = "#E2B321";    // Dourado Solar JANSOL
  const darkTextColor = "#1F2937";
  const lightBgColor = "#F9FAFB";

  let currentY = 15;

  // --- CABEÇALHO DO DOCUMENTO ---
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, 210, 24, "F");

  // Detalhe Dourado
  doc.setFillColor(goldColor);
  doc.rect(0, 24, 210, 1.5, "F");

  doc.setTextColor("#FFFFFF");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("JANSOL OS", 14, 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("ORDEM DE SERVIÇO — EXECUÇÃO TÉCNICA", 14, 18);

  // Lado direito do cabeçalho
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text(`${dto.codigoOS} (${dto.versaoPacote})`, 196, 12, { align: "right" });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.text(`Emissão: ${dto.dataEmissao}`, 196, 18, { align: "right" });

  currentY = 32;

  // Tarja de Advertência Restrita
  doc.setFillColor("#FEF3C7");
  doc.setDrawColor("#F59E0B");
  doc.rect(14, currentY, 182, 7, "FD");
  doc.setTextColor("#92400E");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(
    "DOCUMENTO DESTINADO À EQUIPE TÉCNICA — USO EXCLUSIVO EM CAMPO",
    105,
    currentY + 4.5,
    { align: "center" }
  );

  currentY += 12;

  // --- 1. DADOS DA OBRA & CLIENTE ---
  doc.setTextColor(primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("1. IDENTIFICAÇÃO DA OBRA E DO CLIENTE", 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "plain",
    styles: { fontSize: 8.5, textColor: darkTextColor, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 35, textColor: primaryColor },
      1: { cellWidth: 60 },
      2: { fontStyle: "bold", cellWidth: 35, textColor: primaryColor },
      3: { cellWidth: 52 },
    },
    body: [
      ["Cliente:", dto.clienteNome, "Contato no Local:", dto.clienteTelefone],
      ["Endereço da Obra:", dto.enderecoObra, "Cidade / Região:", dto.cidade],
      ["Data e Horário:", dto.dataHorarioAgendado, "Duração Estimada:", `${dto.duracaoEstimadaMin} minutos`],
      ["Técnico / Equipe:", dto.tecnicoOuEquipe, "Prioridade / Tipo:", `${dto.prioridade} · ${dto.tipoAtendimento}`],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- 2. ORIENTAÇÕES & ESCOPO TÉCNICO ---
  doc.setTextColor(primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("2. ESCOPO E ORIENTAÇÕES PARA EXECUÇÃO", 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "grid",
    headStyles: { fillColor: lightBgColor, textColor: primaryColor, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: darkTextColor, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 40, fontStyle: "bold" }, 1: { cellWidth: 142 } },
    body: [
      ["Objetivo do Atendimento", dto.objetivoAtendimento],
      ["Descrição do Escopo", dto.escopoTecnico],
      ["Itens Inclusos", dto.itensInclusos],
      ["Itens NÃO Inclusos", dto.itensNaoInclusos],
      ["Cuidados & Segurança", dto.cuidadosSeguranca],
      ["Contato para Dúvidas", dto.contatoSuporteInterno],
    ],
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- 3. ETAPAS DE EXECUÇÃO (CHECKBOXES VAZIOS ☐) ---
  doc.setTextColor(primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("3. ETAPAS DE EXECUÇÃO TÉCNICA EM CAMPO", 14, currentY);

  currentY += 3;

  const etapasBody = dto.etapas.length > 0
    ? dto.etapas.map((e) => [
        "☐",
        `${e.ordem}ª Etapa: ${e.descricao}${e.observacao ? ` (${e.observacao})` : ""}`,
        e.obrigatoria ? "Obrigatória" : "Opcional",
      ])
    : [["☐", "Executar atendimento conforme escopo técnico padrão.", "Obrigatória"]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "striped",
    head: [["Check", "Descrição da Etapa", "Obrigatória"]],
    headStyles: { fillColor: primaryColor, textColor: "#FFFFFF", fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 15, halign: "center", fontStyle: "bold" },
      1: { cellWidth: 142 },
      2: { cellWidth: 25, halign: "center" },
    },
    body: etapasBody,
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- 4. MATERIAIS PREVISTOS (SEM PREÇOS OU CUSTOS) ---
  doc.setTextColor(primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("4. MATERIAIS PREVISTOS PARA A OBRA (SEM CUSTOS)", 14, currentY);

  currentY += 3;

  const materiaisBody = dto.materiais.length > 0
    ? dto.materiais.map((m, idx) => [
        `${idx + 1}`,
        m.item,
        `${m.quantidade} ${m.unidade}`,
        m.observacao || "Garantir transporte seguro",
      ])
    : [["—", "Serviço sem previsão de consumo de materiais.", "—", "Confirmação efetuada no escritório"]];

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["#", "Descrição do Material", "Quantidade / Unidade", "Observação Operacional"]],
    headStyles: { fillColor: primaryColor, textColor: "#FFFFFF", fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8.5, textColor: darkTextColor },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 90 },
      2: { cellWidth: 40, halign: "center" },
      3: { cellWidth: 42 },
    },
    body: materiaisBody,
  });

  currentY = (doc as any).lastAutoTable.finalY + 6;

  // --- 5. FERRAMENTAS & EPIS ---
  if (dto.ferramentas.length > 0) {
    doc.setTextColor(primaryColor);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("5. FERRAMENTAS, EQUIPAMENTOS E EPIS OBRIGATÓRIOS", 14, currentY);

    currentY += 3;

    const ferramentasBody = dto.ferramentas.map((f, idx) => [
      `${idx + 1}`,
      f.item,
      f.tipo,
      `${f.quantidade} unid.`,
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 14, right: 14 },
      theme: "plain",
      head: [["#", "Item / Ferramenta / EPI", "Categoria", "Quantidade"]],
      headStyles: { fillColor: lightBgColor, textColor: primaryColor, fontStyle: "bold", fontSize: 8 },
      bodyStyles: { fontSize: 8, textColor: darkTextColor },
      columnStyles: {
        0: { cellWidth: 10, halign: "center" },
        1: { cellWidth: 110 },
        2: { cellWidth: 35 },
        3: { cellWidth: 27, halign: "center" },
      },
      body: ferramentasBody,
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;
  }

  // --- 6. CHECKLISTS DE CONFERÊNCIA ---
  doc.setTextColor(primaryColor);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("6. CHECKLIST DE CONFERÊNCIA E CONCLUSÃO DE OBRA", 14, currentY);

  currentY += 3;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 14, right: 14 },
    theme: "grid",
    head: [["Checklist Antes do Deslocamento", "Checklist de Conclusão na Obra"]],
    headStyles: { fillColor: lightBgColor, textColor: primaryColor, fontStyle: "bold", fontSize: 8.5 },
    bodyStyles: { fontSize: 8, textColor: darkTextColor, cellPadding: 3 },
    body: [
      [
        "☐ Conferir materiais previstos na lista\n☐ Conferir ferramentas e EPIs necessários\n☐ Verificar endereço e telefone do contato\n☐ Revisar orientações e cuidados de segurança\n☐ Comunicar falta ou divergência antes de sair",
        "☐ Testar funcionamento completo do sistema\n☐ Verificar ausência de vazamentos\n☐ Limpar a área e recolher sobras de material\n☐ Tirar fotos do serviço concluído\n☐ Orientar o cliente e coletar assinatura",
      ],
    ],
  });

  // --- RODAPÉ EM TODAS AS PÁGINAS ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Linha divisória
    doc.setDrawColor("#E5E7EB");
    doc.line(14, 282, 196, 282);

    doc.setFontSize(7.5);
    doc.setTextColor("#6B7280");
    doc.setFont("helvetica", "normal");

    doc.text(
      `JANSOL OS · OS ${dto.codigoOS} (${dto.versaoPacote}) · Emissão: ${dto.dataEmissao}`,
      14,
      286
    );

    doc.text(
      "Em caso de divergência, falta de material ou necessidade de alterar o escopo, contate a JANSOL antes de prosseguir.",
      14,
      290
    );

    doc.text(`Página ${i} de ${pageCount}`, 196, 286, { align: "right" });
  }

  return doc;
}
