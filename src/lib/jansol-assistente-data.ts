export interface ArtigoAjuda {
  id: string;
  titulo: string;
  categoria: string;
  resumo: string;
  palavrasChave: string[];
  conteudo: string[];
  passos?: string[];
  rotasRelacionadas?: string[];
}

export const CATEGORIAS_AJUDA = [
  "Primeiros passos",
  "Clientes",
  "Agenda",
  "Ordens de Serviço",
  "Tarefas",
  "Qualidade dos Dados",
  "Relatórios",
  "Configurações",
] as const;

export const PERGUNTAS_FREQUENTES: ArtigoAjuda[] = [
  {
    id: "cadastrar-cliente",
    titulo: "Como cadastrar um cliente?",
    categoria: "Clientes",
    resumo: "Passo a passo para registrar um novo cliente na base do JANSOL OS.",
    palavrasChave: ["cadastrar", "cliente", "novo cliente", "adicionar", "lead"],
    rotasRelacionadas: ["/dashboard/clientes"],
    conteudo: [
      "No JANSOL OS, o cadastro de clientes pode ser feito de forma rápida pelo botão principal ou pela página de clientes.",
    ],
    passos: [
      "Clique no botão '+ Criar' no topo da página ou use o botão 'Novo Cliente' na tela de Clientes.",
      "Preencha o nome completo, CPF/CNPJ, telefone WhatsApp e cidade.",
      "Selecione o tipo de sistema solar (Banho, Piscina ou Ambos) e a marca dos equipamentos instalados.",
      "Defina o status inicial (Orçamento, Aprovado, Instalado, Em Manutenção ou Finalizado).",
      "Clique em 'Salvar Cliente' para confirmar o registro.",
    ],
  },
  {
    id: "criar-ordem-servico",
    titulo: "Como criar uma ordem de serviço?",
    categoria: "Ordens de Serviço",
    resumo: "Como abrir uma nova Ordem de Serviço (OS) vinculada a um cliente.",
    palavrasChave: ["ordem de serviço", "os", "serviço", "instalação", "chamado", "criar os"],
    rotasRelacionadas: ["/dashboard/ordens"],
    conteudo: [
      "As Ordens de Serviço (OS) gerenciam a execução técnica de instalações, vistorias e manutenções.",
    ],
    passos: [
      "Acesse a página 'Ordens de Serviço' ou clique em '+ Criar > Ordem de Serviço' no topo.",
      "Selecione o cliente cadastrado para quem o serviço será prestado.",
      "Escolha o técnico responsável e o tipo de serviço (Instalação, Preventiva, Corretiva ou Vistoria).",
      "Informe a data do atendimento e o valor orçado (se aplicável).",
      "Descreva o escopo do serviço e confirme o salvamento.",
    ],
  },
  {
    id: "agendar-visita",
    titulo: "Como agendar uma visita?",
    categoria: "Agenda",
    resumo: "Como agendar visitas técnicas e manutenções preventivas no calendário.",
    palavrasChave: ["agendar", "visita", "agenda", "calendário", "vistoria", "técnico"],
    rotasRelacionadas: ["/dashboard/agenda"],
    conteudo: [
      "A Agenda unifica visitas técnicas, orçamentos no local e manutenções preventivas programadas.",
    ],
    passos: [
      "Acesse a tela de 'Agenda' no menu lateral.",
      "Clique em 'Agendar Visita' ou selecione um dia direto no calendário.",
      "Associe a visita ao cliente correspondente e escolha o técnico designado.",
      "Defina a data, horário de início e observações técnicas importantes.",
      "Clique em 'Agendar' para salvar o compromisso na agenda.",
    ],
  },
  {
    id: "criar-tarefa",
    titulo: "Como criar uma tarefa?",
    categoria: "Tarefas",
    resumo: "Como organizar pendências operacionais e lembretes da equipe.",
    palavrasChave: ["tarefa", "pendência", "lembrete", "fazer", "checklist", "organizar"],
    rotasRelacionadas: ["/dashboard/tarefas"],
    conteudo: [
      "O módulo de Tarefas permite criar checklists operacionais para acompanhamento do dia a dia.",
    ],
    passos: [
      "Navegue até a seção 'Tarefas' no menu lateral.",
      "Clique no botão 'Nova Tarefa' no canto superior direito.",
      "Digite o título da tarefa, prazo limite e nível de prioridade (Alta, Média ou Baixa).",
      "Marque como concluída assim que a atividade for realizada.",
    ],
  },
  {
    id: "consultar-ficha-360",
    titulo: "Como consultar a ficha de um cliente?",
    categoria: "Clientes",
    resumo: "Como visualizar o histórico completo (Visão 360°) de um cliente.",
    palavrasChave: ["ficha", "360", "histórico", "cliente", "equipamentos", "linha do tempo", "garantias"],
    rotasRelacionadas: ["/dashboard/clientes"],
    conteudo: [
      "A Ficha 360° reúne em um só lugar todas as interações, ordens de serviço, equipamentos instalados, garantias e resumo financeiro do cliente.",
    ],
    passos: [
      "Acesse a lista de clientes e clique no nome do cliente desejado.",
      "Navegue entre as abas: Manutenções, Equipamentos, Gastos, Interações, Ordens de Serviço, Agenda, Garantias, Pendências e Linha do Tempo.",
      "Para arquivar ou restaurar o cliente, utilize os botões administrativos no topo da ficha.",
    ],
  },
  {
    id: "revisar-duplicidades",
    titulo: "Como identificar cadastros duplicados?",
    categoria: "Qualidade dos Dados",
    resumo: "Como usar a Central de Qualidade de Dados para auditar e unificar clientes.",
    palavrasChave: ["duplicados", "duplicidade", "qualidade", "auditar", "mesclar", "limpeza"],
    rotasRelacionadas: ["/dashboard/clientes/qualidade"],
    conteudo: [
      "A Central de Qualidade de Dados verifica automaticamente registros duplicados por CPF/CNPJ ou telefone idênticos.",
    ],
    passos: [
      "Menu Lateral > Clientes > Qualidade dos Dados (ou acesse /dashboard/clientes/qualidade).",
      "Examine a lista de duplicidades detectadas pelo sistema.",
      "Clique em 'Revisar & Mesclar' para escolher o cadastro principal e consolidar o histórico de atendimentos sem perda de dados.",
    ],
  },
];

export const OUTROS_ARTIGOS: ArtigoAjuda[] = [
  {
    id: "interpretar-dashboard",
    titulo: "Como interpretar o Dashboard?",
    categoria: "Primeiros passos",
    resumo: "Guia dos indicadores oficiais, faturamento real e central de atenção.",
    palavrasChave: ["dashboard", "faturamento", "conversão", "métricas", "atenção", "resumo"],
    rotasRelacionadas: ["/dashboard"],
    conteudo: [
      "O Dashboard Executivo apresenta a inteligência em tempo real da JANSOL OS.",
      "• Faturamento Real: Somatório acumulado dos pagamentos registrados dos clientes.",
      "• Taxa de Conversão: Fórmula oficial global (Clientes Aprovados ÷ Total de Clientes Cadastrados).",
      "• Precisa da Sua Atenção: Lista inteligente dos clientes em risco (sem contato há +30 dias) e manutenções preventivas com vencimento nos próximos 7 dias.",
    ],
  },
  {
    id: "relatorios-executivos",
    titulo: "Como utilizar os Relatórios Executivos?",
    categoria: "Relatórios",
    resumo: "Como filtrar gráficos de desempenho financeiro e origem de leads.",
    palavrasChave: ["relatórios", "gráficos", "funil", "exportar", "métricas", "vendas"],
    rotasRelacionadas: ["/dashboard/relatorios"],
    conteudo: [
      "A tela de Relatórios compartilha da exata mesma fonte de dados oficial do Dashboard.",
      "Use os filtros por período para analisar a distribuição de orçamentos por origem de lead e cidade.",
    ],
  },
  {
    id: "gestao-estoque",
    titulo: "Como gerenciar o Estoque de Peças?",
    categoria: "Configurações",
    resumo: "Como acompanhar placas solares, coletores, boilers e bombas em estoque.",
    palavrasChave: ["estoque", "peças", "material", "equipamentos", "coletor", "boiler"],
    rotasRelacionadas: ["/dashboard/estoque"],
    conteudo: [
      "O módulo de Estoque acompanha o saldo de equipamentos e componentes térmicos e fotovoltaicos disponíveis para instalação e manutenção.",
    ],
  },
  {
    id: "gestao-equipamentos-garantias",
    titulo: "Como acompanhar Garantias de Equipamentos?",
    categoria: "Clientes",
    resumo: "Como consultar vencimento de garantias de placas, inversores e coletores.",
    palavrasChave: ["garantia", "vencimento", "equipamento", "coletor", "inversor"],
    rotasRelacionadas: ["/dashboard/garantias", "/dashboard/equipamentos"],
    conteudo: [
      "Cadastre o número de série e a data de instalação de cada equipamento para receber alertas automáticos antes do término da garantia do fabricante.",
    ],
  },
];

export const TODOS_ARTIGOS: ArtigoAjuda[] = [...PERGUNTAS_FREQUENTES, ...OUTROS_ARTIGOS];

/**
 * Retorna o artigo contextual exato com base na rota atual do sistema.
 */
export function getArtigoPorRota(pathname: string): ArtigoAjuda {
  const cleanPath = pathname.replace(/\/$/, "");

  if (cleanPath === "/dashboard/clientes/qualidade") {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "revisar-duplicidades") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/clientes")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "cadastrar-cliente") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/agenda")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "agendar-visita") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/ordens")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "criar-ordem-servico") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/tarefas")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "criar-tarefa") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/relatorios")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "relatorios-executivos") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/estoque")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "gestao-estoque") ?? TODOS_ARTIGOS[0]!
    );
  }
  if (cleanPath.startsWith("/dashboard/garantias") || cleanPath.startsWith("/dashboard/equipamentos")) {
    return (
      TODOS_ARTIGOS.find((a) => a.id === "gestao-equipamentos-garantias") ?? TODOS_ARTIGOS[0]!
    );
  }

  // Fallback padrão para o Dashboard ou páginas gerais
  return (
    TODOS_ARTIGOS.find((a) => a.id === "interpretar-dashboard") ?? TODOS_ARTIGOS[0]!
  );
}
