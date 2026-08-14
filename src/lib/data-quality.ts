import type { Cliente } from "@/hooks/use-crm";

// ==========================================
// 1. NORMALIZAÇÃO & VALIDAÇÃO DE CPF / CNPJ
// ==========================================

export function cleanDigits(value: string | null | undefined): string {
  if (!value) return "";
  return String(value).replace(/\D/g, "");
}

/**
 * Verifica se a string contém uma data ou formato de data inserido no campo
 */
export function isDateInString(value: string | null | undefined): boolean {
  if (!value) return false;
  const s = String(value).trim();
  // Formatos comuns: DD/MM/AAAA, AAAA-MM-DD, DD-MM-AAAA, DD.MM.AAAA
  if (/^\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}$/.test(s)) return true;
  if (/^\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}$/.test(s)) return true;
  if (/(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i.test(s)) {
    return true;
  }
  return false;
}

export function isValidCPF(cpf: string): boolean {
  const clean = cleanDigits(cpf);
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false; // Todos os dígitos iguais

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
}

export function isValidCNPJ(cnpj: string): boolean {
  const clean = cleanDigits(cnpj);
  if (clean.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(clean)) return false; // Todos os dígitos iguais

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights1[i]!;
  }
  let rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rev !== parseInt(clean.charAt(12), 10)) return false;

  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(clean.charAt(i), 10) * weights2[i]!;
  }
  rev = sum % 11 < 2 ? 0 : 11 - (sum % 11);
  if (rev !== parseInt(clean.charAt(13), 10)) return false;

  return true;
}

export type CpfCnpjStatus = {
  normalized: string;
  isValid: boolean;
  type: "cpf" | "cnpj" | "data" | "invalido" | "vazio";
  message: string;
};

export function analyzeCPFCNPJ(raw: string | null | undefined): CpfCnpjStatus {
  if (!raw || !String(raw).trim()) {
    return { normalized: "", isValid: true, type: "vazio", message: "Campo não preenchido" };
  }

  const str = String(raw).trim();

  if (isDateInString(str)) {
    return {
      normalized: str,
      isValid: false,
      type: "data",
      message: "Data inserida no campo de CPF/CNPJ",
    };
  }

  const digits = cleanDigits(str);

  if (digits.length === 11) {
    const valid = isValidCPF(digits);
    return {
      normalized: digits,
      isValid: valid,
      type: valid ? "cpf" : "invalido",
      message: valid ? "CPF válido" : "CPF com dígito verificador inválido",
    };
  }

  if (digits.length === 14) {
    const valid = isValidCNPJ(digits);
    return {
      normalized: digits,
      isValid: valid,
      type: valid ? "cnpj" : "invalido",
      message: valid ? "CNPJ válido" : "CNPJ com dígito verificador inválido",
    };
  }

  return {
    normalized: digits,
    isValid: false,
    type: "invalido",
    message: `Quantidade de dígitos inválida (${digits.length} dígitos, esperado 11 ou 14)`,
  };
}

// ==========================================
// 2. NORMALIZAÇÃO & VALIDAÇÃO DE TELEFONE
// ==========================================

const VALID_DDDS = new Set([
  "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "21", "22", "24", "27", "28",
  "31", "32", "33", "34", "35", "37", "38",
  "41", "42", "43", "44", "45", "46", "47", "48", "49",
  "51", "53", "54", "55",
  "61", "62", "63", "64", "65", "66", "67", "68", "69",
  "71", "73", "74", "75", "77", "79",
  "81", "82", "83", "84", "85", "86", "87", "88", "89",
  "91", "92", "93", "94", "95", "96", "97", "98", "99",
]);

export type PhoneStatus = {
  normalized: string;
  formatted: string;
  isValid: boolean;
  type: "celular" | "fixo" | "invalido" | "vazio";
  message: string;
};

export function analyzePhone(raw: string | null | undefined): PhoneStatus {
  if (!raw || !String(raw).trim()) {
    return { normalized: "", formatted: "", isValid: false, type: "vazio", message: "Telefone não informado" };
  }

  let digits = cleanDigits(raw);

  // Remove DDI brasileiro (+55) se presente
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    digits = digits.slice(2);
  }

  // Remove zero à esquerda do DDD caso exista (ex: 01999999999 -> 19999999999)
  if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) {
    digits = digits.slice(1);
  }

  if (digits.length < 10 || digits.length > 11) {
    return {
      normalized: digits,
      formatted: String(raw).trim(),
      isValid: false,
      type: "invalido",
      message: `Número com tamanho incorreto (${digits.length} dígitos, esperado 10 ou 11)`,
    };
  }

  // Verificar se todos os dígitos são repetidos (ex: 00000000000)
  if (/^(\d)\1+$/.test(digits)) {
    return {
      normalized: digits,
      formatted: String(raw).trim(),
      isValid: false,
      type: "invalido",
      message: "Número composto por dígitos idênticos repetidos",
    };
  }

  const ddd = digits.slice(0, 2);
  if (!VALID_DDDS.has(ddd)) {
    return {
      normalized: digits,
      formatted: String(raw).trim(),
      isValid: false,
      type: "invalido",
      message: `DDD inválido (${ddd})`,
    };
  }

  if (digits.length === 11) {
    const ninthDigit = digits.charAt(2);
    if (ninthDigit !== "9") {
      return {
        normalized: digits,
        formatted: String(raw).trim(),
        isValid: false,
        type: "invalido",
        message: "Celular com 11 dígitos deve iniciar com 9 após o DDD",
      };
    }
    const formatted = `(${ddd}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    return {
      normalized: digits,
      formatted,
      isValid: true,
      type: "celular",
      message: "Celular válido",
    };
  }

  // 10 dígitos (fixo)
  const firstDigit = digits.charAt(2);
  if (!["2", "3", "4", "5"].includes(firstDigit)) {
    // Pode ser celular antigo de 8 dígitos sem o 9
    return {
      normalized: digits,
      formatted: String(raw).trim(),
      isValid: false,
      type: "invalido",
      message: "Telefone fixo com início inválido ou celular legado sem o 9º dígito",
    };
  }

  const formatted = `(${ddd}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return {
    normalized: digits,
    formatted,
    isValid: true,
    type: "fixo",
    message: "Telefone fixo válido",
  };
}

// ==========================================
// 3. NORMALIZAÇÃO & VALIDAÇÃO DE EMAIL
// ==========================================

export type EmailStatus = {
  normalized: string;
  isValid: boolean;
  message: string;
};

export function analyzeEmail(raw: string | null | undefined): EmailStatus {
  if (!raw || !String(raw).trim()) {
    return { normalized: "", isValid: true, message: "E-mail não informado" };
  }

  const str = String(raw).trim().toLowerCase();

  // Expressão regular para e-mail padrão
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(str)) {
    return {
      normalized: str,
      isValid: false,
      message: "Formato de e-mail inválido ou com caracteres inválidos",
    };
  }

  return {
    normalized: str,
    isValid: true,
    message: "E-mail válido",
  };
}

// ==========================================
// 4. NORMALIZAÇÃO DE NOMES E TEXTOS
// ==========================================

export function normalizeText(text: string | null | undefined): string {
  if (!text) return "";
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ") // Remove pontuações
    .replace(/\s+/g, " ") // Colapsa múltiplos espaços
    .trim();
}

/**
 * Detecta caracteres quebrados ou mojibake (erros de codificação UTF-8 / ISO-8859-1)
 */
export function detectCorruptedText(text: string | null | undefined): { isCorrupted: boolean; sample: string } {
  if (!text) return { isCorrupted: false, sample: "" };
  const s = String(text);

  // Caractere de substituição unicode
  if (s.includes("\uFFFD")) {
    return { isCorrupted: true, sample: "Contém caractere de substituição " };
  }

  // Padrões clássicos de mojibake em português
  const mojibakePatterns = [
    /Ã[¡¢£¤¥¦§¨©ª«¬®¯°±²³´µ¶·¸¹º»¼½¾¿]/,
    /Ã[€ ‚ƒ„…†‡ˆ‰Š‹Œ Ž ‘’“”•–—˜™š›œ žŸ]/,
    /Ã[áéíóúãõâêôçÁÉÍÓÚÃÕÂÊÔÇ]/,
    /â[€™“”•–—˜™]/,
    /Â[°ºª§]/,
    /\?{2,}/, // Múltiplas interrogações seguidas como substituto
  ];

  for (const pattern of mojibakePatterns) {
    const match = s.match(pattern);
    if (match) {
      return { isCorrupted: true, sample: `Padrão corrompido '${match[0]}'` };
    }
  }

  return { isCorrupted: false, sample: "" };
}

/**
 * Verifica se um nome é suspeito (endereço, status, anotações ou caracteres inválidos)
 */
export type SuspiciousNameResult = {
  isSuspicious: boolean;
  reason: string;
};

const ADDRESS_KEYWORDS = [
  "rua", "r.", "av ", "av.", "avenida", "alameda", "travessa", "rodovia",
  "estrada", "bairro", "condominio", "cond.", "apto", "apartamento",
  "bloco", "lote", "quadra", "qd.", "casa", "km ", "fazenda", "sitio", "chacara",
];

const SYSTEM_STATUS_KEYWORDS = [
  "status", "cliente", "teste", "orcamento", "orçamento", "sem nome",
  "sem cadastro", "desconhecido", "anonimo", "anônimo", "manutencao",
  "manutenção", "contato", "lead", "whatsapp", "visita", "pos-venda",
];

const OPERATIONAL_KEYWORDS = [
  "comprar", "trocar", "ligar", "urgente", "obs:", "cancelado",
  "reagendar", "devedor", "pagar", "recibo", "placa furada", "vazamento",
];

export function detectSuspiciousName(rawName: string | null | undefined): SuspiciousNameResult {
  if (!rawName || !String(rawName).trim()) {
    return { isSuspicious: true, reason: "Nome vazio ou não informado" };
  }

  const raw = String(rawName).trim();
  const normalized = normalizeText(raw);

  if (raw.length < 3) {
    return { isSuspicious: true, reason: "Nome muito curto (< 3 caracteres)" };
  }

  if (/^\d+$/.test(cleanDigits(raw)) && raw.replace(/\D/g, "").length >= 5) {
    return { isSuspicious: true, reason: "Nome composto apenas por números ou telefone" };
  }

  if (/^[^a-zA-Z0-9]+$/.test(raw)) {
    return { isSuspicious: true, reason: "Nome composto apenas por símbolos/pontuação" };
  }

  // Verificar se há telefone no meio do nome
  if (/\b\d{8,11}\b/.test(raw.replace(/\D/g, ""))) {
    if (raw.replace(/\D/g, "").length >= 8 && raw.replace(/\D/g, "").length <= 11 && raw.length < 15) {
      return { isSuspicious: true, reason: "Telefone preenchido no lugar do nome" };
    }
  }

  // Verificar palavras de endereço
  const words = normalized.split(" ");
  for (const keyword of ADDRESS_KEYWORDS) {
    if (normalized.startsWith(keyword + " ") || words.includes(keyword)) {
      return { isSuspicious: true, reason: `Contém termo de endereço ('${keyword}')` };
    }
  }

  // Verificar termos de sistema ou status
  for (const keyword of SYSTEM_STATUS_KEYWORDS) {
    if (normalized === keyword || normalized.startsWith(keyword + " ") || words.includes(keyword)) {
      return { isSuspicious: true, reason: `Contém termo de sistema/status ('${keyword}')` };
    }
  }

  // Verificar termos operacionais/anotações
  for (const keyword of OPERATIONAL_KEYWORDS) {
    if (normalized.includes(keyword)) {
      return { isSuspicious: true, reason: `Contém anotação operacional ('${keyword}')` };
    }
  }

  return { isSuspicious: false, reason: "" };
}

// ==========================================
// 5. SIMILARIDADE DE STRINGS (Levenshtein)
// ==========================================

export function calculateStringSimilarity(s1: string, s2: string): number {
  const str1 = normalizeText(s1);
  const str2 = normalizeText(s2);

  if (!str1 || !str2) return 0;
  if (str1 === str2) return 1;

  // Token / word matching (Jaccard-like bonus for shared words)
  const words1 = str1.split(" ").filter((w) => w.length > 1);
  const words2 = str2.split(" ").filter((w) => w.length > 1);

  if (words1.length > 0 && words2.length > 0) {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    let commonWords = 0;
    for (const w of set1) {
      if (set2.has(w)) commonWords++;
    }
    const tokenScore = (2 * commonWords) / (words1.length + words2.length);
    if (tokenScore >= 0.6) {
      return Math.max(tokenScore, 0.75);
    }
  }

  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  if (maxLen === 0) return 1;

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }

  const distance = matrix[len1]![len2]!;
  return 1 - distance / maxLen;
}

// ==========================================
// 6. ESTRUTURAS DE DUPLICIDADES E PROBLEMAS
// ==========================================

export type DuplicateConfidence = "alta" | "media" | "baixa";

export type DuplicateMatchReason =
  | "cpf_cnpj_igual"
  | "telefone_igual"
  | "email_igual"
  | "nome_e_cidade_iguais"
  | "nome_similar";

export type DuplicateGroup = {
  id: string;
  confidence: DuplicateConfidence;
  matchReason: DuplicateMatchReason;
  matchDescription: string;
  matchedValue: string;
  clients: Cliente[];
};

export type IssueType =
  | "telefone_invalido"
  | "telefone_ausente"
  | "cpf_cnpj_invalido"
  | "cpf_cnpj_data"
  | "nome_suspeito"
  | "texto_corrompido"
  | "muitos_campos_vazios"
  | "sem_cidade"
  | "sem_origem"
  | "duplicidade";

export type ClientQualityIssue = {
  clientId: string;
  client: Cliente;
  issueType: IssueType;
  category: "Critico" | "Alerta" | "Informativo";
  title: string;
  description: string;
  affectedField: string;
  currentValue: string;
};

export type DataQualityAnalysisResult = {
  totalClientes: number;
  healthScore: number;
  summary: {
    duplicidadesExatas: number;
    possiveisDuplicidades: number;
    sugestoesNomesParecidos: number;
    telefonesInvalidos: number;
    telefonesAusentes: number;
    cpfCnpjInvalidos: number;
    cpfCnpjComData: number;
    nomesSuspeitos: number;
    textosCorrompidos: number;
    muitosCamposVazios: number;
    semCidade: number;
    semOrigem: number;
  };
  duplicateGroups: DuplicateGroup[];
  clientIssues: ClientQualityIssue[];
  analyzedAt: string;
};

// ==========================================
// 7. MOTOR PRINCIPAL DE ANÁLISE (SOMENTE LEITURA)
// ==========================================

export function analyzeClientDatabase(clientes: Cliente[]): DataQualityAnalysisResult {
  const duplicateGroups: DuplicateGroup[] = [];
  const clientIssues: ClientQualityIssue[] = [];

  // Mapeamentos para detecção de duplicidades
  const byCpf = new Map<string, Cliente[]>();
  const byPhone = new Map<string, Cliente[]>();
  const byEmail = new Map<string, Cliente[]>();
  const byNameAndCity = new Map<string, Cliente[]>();

  const clientsInExactDuplicates = new Set<string>();
  const clientsInPossibleDuplicates = new Set<string>();
  const clientsInSimilarNameSuggestions = new Set<string>();

  let telefonesInvalidosCount = 0;
  let telefonesAusentesCount = 0;
  let cpfCnpjInvalidosCount = 0;
  let cpfCnpjComDataCount = 0;
  let nomesSuspeitosCount = 0;
  let textosCorrompidosCount = 0;
  let muitosCamposVaziosCount = 0;
  let semCidadeCount = 0;
  let semOrigemCount = 0;

  // 1. Passada individual por cada cliente
  for (const c of clientes) {
    let emptyFieldsCount = 0;

    // --- CPF / CNPJ ---
    if (!c.cpf_cnpj) {
      emptyFieldsCount++;
    } else {
      const cpfStatus = analyzeCPFCNPJ(c.cpf_cnpj);
      if (!cpfStatus.isValid) {
        if (cpfStatus.type === "data") {
          cpfCnpjComDataCount++;
          clientIssues.push({
            clientId: c.id,
            client: c,
            issueType: "cpf_cnpj_data",
            category: "Critico",
            title: "Data no campo de CPF/CNPJ",
            description: cpfStatus.message,
            affectedField: "cpf_cnpj",
            currentValue: c.cpf_cnpj,
          });
        } else {
          cpfCnpjInvalidosCount++;
          clientIssues.push({
            clientId: c.id,
            client: c,
            issueType: "cpf_cnpj_invalido",
            category: "Critico",
            title: "CPF/CNPJ inválido",
            description: cpfStatus.message,
            affectedField: "cpf_cnpj",
            currentValue: c.cpf_cnpj,
          });
        }
      } else if (cpfStatus.normalized) {
        // Agrupar para duplicidades de alta confiança
        const list = byCpf.get(cpfStatus.normalized) ?? [];
        list.push(c);
        byCpf.set(cpfStatus.normalized, list);
      }
    }

    // --- TELEFONE / WHATSAPP ---
    if (!c.whatsapp) {
      emptyFieldsCount++;
      telefonesAusentesCount++;
      clientIssues.push({
        clientId: c.id,
        client: c,
        issueType: "telefone_ausente",
        category: "Alerta",
        title: "Telefone não informado",
        description: "O cliente não possui WhatsApp ou telefone de contato registrado.",
        affectedField: "whatsapp",
        currentValue: "—",
      });
    } else {
      const phoneStatus = analyzePhone(c.whatsapp);
      if (!phoneStatus.isValid) {
        telefonesInvalidosCount++;
        clientIssues.push({
          clientId: c.id,
          client: c,
          issueType: "telefone_invalido",
          category: "Alerta",
          title: "Telefone fora do padrão",
          description: phoneStatus.message,
          affectedField: "whatsapp",
          currentValue: c.whatsapp,
        });
      } else if (phoneStatus.normalized) {
        const list = byPhone.get(phoneStatus.normalized) ?? [];
        list.push(c);
        byPhone.set(phoneStatus.normalized, list);
      }
    }

    // --- EMAIL ---
    if (!c.email) {
      emptyFieldsCount++;
    } else {
      const emailStatus = analyzeEmail(c.email);
      if (!emailStatus.isValid) {
        clientIssues.push({
          clientId: c.id,
          client: c,
          issueType: "telefone_invalido", // agrupa em contato
          category: "Alerta",
          title: "E-mail inválido",
          description: emailStatus.message,
          affectedField: "email",
          currentValue: c.email,
        });
      } else if (emailStatus.normalized) {
        const list = byEmail.get(emailStatus.normalized) ?? [];
        list.push(c);
        byEmail.set(emailStatus.normalized, list);
      }
    }

    // --- NOME SUSPEITO ---
    const nameCheck = detectSuspiciousName(c.nome);
    if (nameCheck.isSuspicious) {
      nomesSuspeitosCount++;
      clientIssues.push({
        clientId: c.id,
        client: c,
        issueType: "nome_suspeito",
        category: "Critico",
        title: "Nome suspeito ou inconsistente",
        description: nameCheck.reason,
        affectedField: "nome",
        currentValue: c.nome,
      });
    }

    // --- TEXTOS CORROMPIDOS (MOJIBAKE) ---
    const fieldsToCheck = [
      { field: "nome", val: c.nome },
      { field: "endereco", val: c.endereco },
      { field: "cidade", val: c.cidade },
      { field: "observacoes", val: c.observacoes },
    ];
    let hasCorrupted = false;
    for (const f of fieldsToCheck) {
      const check = detectCorruptedText(f.val);
      if (check.isCorrupted) {
        hasCorrupted = true;
        clientIssues.push({
          clientId: c.id,
          client: c,
          issueType: "texto_corrompido",
          category: "Alerta",
          title: `Texto corrompido no campo ${f.field}`,
          description: check.sample,
          affectedField: f.field,
          currentValue: String(f.val),
        });
      }
    }
    if (hasCorrupted) textosCorrompidosCount++;

    // --- CIDADE ---
    if (!c.cidade || !c.cidade.trim()) {
      emptyFieldsCount++;
      semCidadeCount++;
      clientIssues.push({
        clientId: c.id,
        client: c,
        issueType: "sem_cidade",
        category: "Alerta",
        title: "Registro sem cidade",
        description: "A cidade não está informada, dificultando o roteamento e logística técnica.",
        affectedField: "cidade",
        currentValue: "—",
      });
    }

    // --- ORIGEM DO LEAD ---
    if (!c.origem_lead || !c.origem_lead.trim() || c.origem_lead === "Outro") {
      emptyFieldsCount++;
      semOrigemCount++;
      clientIssues.push({
        clientId: c.id,
        client: c,
        issueType: "sem_origem",
        category: "Informativo",
        title: "Origem do lead não identificada",
        description: "Origem em branco ou genérica ('Outro').",
        affectedField: "origem_lead",
        currentValue: c.origem_lead ?? "—",
      });
    }

    // Outros campos opcionais para cálculo de preenchimento
    if (!c.endereco) emptyFieldsCount++;
    if (!c.marca_equipamento) emptyFieldsCount++;
    if (!c.data_instalacao && c.status === "Instalado") emptyFieldsCount++;
    if (!c.valor_orcamento) emptyFieldsCount++;

    // Se mais de 5 campos chave estiverem vazios
    if (emptyFieldsCount >= 5) {
      muitosCamposVaziosCount++;
      clientIssues.push({
        clientId: c.id,
        client: c,
        issueType: "muitos_campos_vazios",
        category: "Alerta",
        title: "Cadastro com múltiplos campos em branco",
        description: `${emptyFieldsCount} campos principais não preenchidos.`,
        affectedField: "multiplos",
        currentValue: `${emptyFieldsCount} vazios`,
      });
    }

    // Agrupar por Nome Normalizado + Cidade
    const normName = normalizeText(c.nome);
    const normCity = normalizeText(c.cidade);
    if (normName.length >= 4) {
      const key = `${normName}:::${normCity}`;
      const list = byNameAndCity.get(key) ?? [];
      list.push(c);
      byNameAndCity.set(key, list);
    }
  }

  // 2. DETECÇÃO DE DUPLICIDADES DE ALTA CONFIANÇA
  let dupGroupId = 1;

  // Por CPF/CNPJ
  for (const [cpf, group] of byCpf.entries()) {
    if (group.length > 1) {
      duplicateGroups.push({
        id: `dup-cpf-${dupGroupId++}`,
        confidence: "alta",
        matchReason: "cpf_cnpj_igual",
        matchDescription: "CPF/CNPJ normalizado idêntico",
        matchedValue: cpf,
        clients: group,
      });
      group.forEach((cl) => clientsInExactDuplicates.add(cl.id));
    }
  }

  // Por Telefone
  for (const [phone, group] of byPhone.entries()) {
    if (group.length > 1) {
      // Verificar se já não estão todos agrupados pelo mesmo CPF
      const alreadyGroupedTogether = duplicateGroups.some(
        (dg) =>
          dg.matchReason === "cpf_cnpj_igual" &&
          group.every((g) => dg.clients.some((dc) => dc.id === g.id)),
      );
      if (!alreadyGroupedTogether) {
        duplicateGroups.push({
          id: `dup-phone-${dupGroupId++}`,
          confidence: "alta",
          matchReason: "telefone_igual",
          matchDescription: "Telefone/WhatsApp normalizado idêntico",
          matchedValue: phone,
          clients: group,
        });
        group.forEach((cl) => clientsInExactDuplicates.add(cl.id));
      }
    }
  }

  // Por Email
  for (const [email, group] of byEmail.entries()) {
    if (group.length > 1) {
      const alreadyGroupedTogether = duplicateGroups.some(
        (dg) =>
          (dg.matchReason === "cpf_cnpj_igual" || dg.matchReason === "telefone_igual") &&
          group.every((g) => dg.clients.some((dc) => dc.id === g.id)),
      );
      if (!alreadyGroupedTogether) {
        duplicateGroups.push({
          id: `dup-email-${dupGroupId++}`,
          confidence: "alta",
          matchReason: "email_igual",
          matchDescription: "E-mail normalizado idêntico",
          matchedValue: email,
          clients: group,
        });
        group.forEach((cl) => clientsInExactDuplicates.add(cl.id));
      }
    }
  }

  // 3. DETECÇÃO DE POSSÍVEIS DUPLICIDADES (MÉDIA CONFIANÇA - NOME + CIDADE)
  for (const [, group] of byNameAndCity.entries()) {
    if (group.length > 1) {
      // Se não foram classificados em duplicidade exata juntos
      const alreadyGroupedTogether = duplicateGroups.some(
        (dg) =>
          dg.confidence === "alta" &&
          group.every((g) => dg.clients.some((dc) => dc.id === g.id)),
      );
      if (!alreadyGroupedTogether) {
        duplicateGroups.push({
          id: `dup-namecity-${dupGroupId++}`,
          confidence: "media",
          matchReason: "nome_e_cidade_iguais",
          matchDescription: "Nome e cidade idênticos",
          matchedValue: `${group[0]!.nome} (${group[0]!.cidade ?? "sem cidade"})`,
          clients: group,
        });
        group.forEach((cl) => clientsInPossibleDuplicates.add(cl.id));
      }
    }
  }

  // 4. SUGESTÃO DE NOMES PARECIDOS (BAIXA CONFIANÇA - SOMENTE SUGESTÃO)
  // Compara clientes com similaridade alta (> 0.88) que não foram agrupados acima
  const sampleLimit = Math.min(clientes.length, 500); // otimização de performance
  for (let i = 0; i < sampleLimit; i++) {
    const c1 = clientes[i]!;
    if (clientsInExactDuplicates.has(c1.id) || clientsInPossibleDuplicates.has(c1.id)) continue;
    const n1 = normalizeText(c1.nome);
    if (n1.length < 5 || n1.split(" ").length < 2) continue;

    for (let j = i + 1; j < sampleLimit; j++) {
      const c2 = clientes[j]!;
      if (c1.id === c2.id) continue;
      if (clientsInExactDuplicates.has(c2.id) || clientsInPossibleDuplicates.has(c2.id)) continue;

      const n2 = normalizeText(c2.nome);
      if (n2.length < 5 || n2.split(" ").length < 2) continue;

      const similarity = calculateStringSimilarity(n1, n2);
      if (similarity >= 0.88 && similarity < 1.0) {
        duplicateGroups.push({
          id: `dup-sim-${dupGroupId++}`,
          confidence: "baixa",
          matchReason: "nome_similar",
          matchDescription: `Nomes parecidos (${Math.round(similarity * 100)}% de similaridade) - Apenas sugestão`,
          matchedValue: `${c1.nome} ↔ ${c2.nome}`,
          clients: [c1, c2],
        });
        clientsInSimilarNameSuggestions.add(c1.id);
        clientsInSimilarNameSuggestions.add(c2.id);
      }
    }
  }

  // 5. CÁLCULO DO SCORE DE QUALIDADE GERAL DA BASE (0 A 100%)
  const total = clientes.length || 1;
  const criticalPenalties =
    clientsInExactDuplicates.size * 1.5 +
    cpfCnpjInvalidosCount * 1.0 +
    cpfCnpjComDataCount * 1.5 +
    nomesSuspeitosCount * 1.0 +
    textosCorrompidosCount * 0.8;

  const warningPenalties =
    telefonesInvalidosCount * 0.5 +
    telefonesAusentesCount * 0.3 +
    semCidadeCount * 0.4 +
    muitosCamposVaziosCount * 0.3;

  const totalPenaltyScore = ((criticalPenalties + warningPenalties) / total) * 100;
  const healthScore = Math.max(10, Math.min(100, Math.round(100 - totalPenaltyScore)));

  return {
    totalClientes: clientes.length,
    healthScore,
    summary: {
      duplicidadesExatas: clientsInExactDuplicates.size,
      possiveisDuplicidades: clientsInPossibleDuplicates.size,
      sugestoesNomesParecidos: clientsInSimilarNameSuggestions.size,
      telefonesInvalidos: telefonesInvalidosCount,
      telefonesAusentes: telefonesAusentesCount,
      cpfCnpjInvalidos: cpfCnpjInvalidosCount,
      cpfCnpjComData: cpfCnpjComDataCount,
      nomesSuspeitos: nomesSuspeitosCount,
      textosCorrompidos: textosCorrompidosCount,
      muitosCamposVazios: muitosCamposVaziosCount,
      semCidade: semCidadeCount,
      semOrigem: semOrigemCount,
    },
    duplicateGroups,
    clientIssues,
    analyzedAt: new Date().toISOString(),
  };
}

// ==========================================
// 8. ASSISTENTE DE MESCLAGEM (FASE 2)
// ==========================================

export type ClientScore = {
  clientId: string;
  totalScore: number;
  breakdown: {
    completeness: number;
    validity: number;
    history: number;
  };
};

export type MergePreviewField = {
  field: string;
  label: string;
  principalValue: any;
  secondaryValues: { clientId: string; value: any }[];
  action: "manter_principal" | "adicionar_secundario" | "conflito";
  suggestedResolution?: any;
};

export type MergePreview = {
  principalClient: Cliente;
  secondaryClients: Cliente[];
  scores: ClientScore[];
  impactAnalysis: MergePreviewField[];
  mergeStatus: "Recomendada" | "Revisão manual" | "Não mesclar";
  blockingIssues: string[];
};

export function calculateClientScore(client: Cliente): ClientScore {
  let completeness = 0;
  let validity = 0;
  let history = 0;

  // 1. Completeness
  const fieldsToCheck = [
    client.nome, client.whatsapp, client.email, client.cpf_cnpj,
    client.cidade, client.endereco, client.marca_equipamento,
    client.observacoes, client.origem_lead
  ];
  for (const f of fieldsToCheck) {
    if (f && String(f).trim().length > 0) completeness += 10;
  }

  // 2. Validity
  if (client.cpf_cnpj) {
    const status = analyzeCPFCNPJ(client.cpf_cnpj);
    if (status.isValid) validity += 50;
  }
  if (client.whatsapp) {
    const phoneStatus = analyzePhone(client.whatsapp);
    if (phoneStatus.isValid) validity += 30;
  }
  if (client.email) {
    const emailStatus = analyzeEmail(client.email);
    if (emailStatus.isValid) validity += 20;
  }

  // 3. History
  if (client.data_instalacao) history += 20;
  if (client.status === "Instalado" || client.status === "Manutenção") history += 20;

  return {
    clientId: client.id,
    totalScore: completeness + validity + history,
    breakdown: { completeness, validity, history },
  };
}

export function suggestPrincipalClient(clients: Cliente[]): MergePreview {
  if (clients.length === 0) throw new Error("Não há clientes para mesclar");

  const scores = clients.map(calculateClientScore);
  
  const sortedClients = [...clients].sort((a, b) => {
    const scoreA = scores.find((s) => s.clientId === a.id)?.totalScore ?? 0;
    const scoreB = scores.find((s) => s.clientId === b.id)?.totalScore ?? 0;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });

  const principal = sortedClients[0]!;
  const secondaries = sortedClients.slice(1);

  const impactAnalysis: MergePreviewField[] = [];
  const fieldsMap = [
    { key: "nome", label: "Nome" },
    { key: "whatsapp", label: "WhatsApp" },
    { key: "email", label: "E-mail" },
    { key: "cpf_cnpj", label: "CPF / CNPJ" },
    { key: "endereco", label: "Endereço" },
    { key: "cidade", label: "Cidade" },
    { key: "observacoes", label: "Observações" },
    { key: "origem_lead", label: "Origem" },
    { key: "marca_equipamento", label: "Equipamento" },
  ];

  let hasConflict = false;

  for (const field of fieldsMap) {
    const pValue = (principal as any)[field.key];
    const sValues = secondaries
      .map((sc) => ({ clientId: sc.id, value: (sc as any)[field.key] }))
      .filter((sv) => sv.value && String(sv.value).trim().length > 0 && String(sv.value).trim() !== String(pValue).trim());

    if (sValues.length === 0) {
      impactAnalysis.push({
        field: field.key,
        label: field.label,
        principalValue: pValue,
        secondaryValues: [],
        action: "manter_principal",
      });
    } else if (!pValue || String(pValue).trim().length === 0) {
      impactAnalysis.push({
        field: field.key,
        label: field.label,
        principalValue: pValue,
        secondaryValues: sValues,
        action: "adicionar_secundario",
        suggestedResolution: sValues[0]?.value,
      });
    } else {
      hasConflict = true;
      impactAnalysis.push({
        field: field.key,
        label: field.label,
        principalValue: pValue,
        secondaryValues: sValues,
        action: "conflito",
      });
    }
  }

  // --- Validação de Regras de Negócio (Bloqueios e Classificação) ---
  const blockingIssues: string[] = [];
  let mergeStatus: "Recomendada" | "Revisão manual" | "Não mesclar" = "Recomendada";

  // Regra 1: CPF/CNPJ válidos e diferentes
  const validCpfs = new Set<string>();
  for (const c of clients) {
    if (c.cpf_cnpj) {
      const status = analyzeCPFCNPJ(c.cpf_cnpj);
      if (status.isValid && status.normalized) {
        validCpfs.add(status.normalized);
      }
    }
  }
  if (validCpfs.size > 1) {
    blockingIssues.push("Registros possuem CPFs/CNPJs válidos e diferentes.");
  }

  // Regra 2: Pessoas diferentes com o mesmo telefone
  // Se eles têm um telefone em comum válido, mas nomes muito diferentes (< 0.4 similaridade)
  for (let i = 0; i < clients.length; i++) {
    for (let j = i + 1; j < clients.length; j++) {
      const c1 = clients[i]!;
      const c2 = clients[j]!;
      if (c1.whatsapp && c2.whatsapp) {
        const t1 = analyzePhone(c1.whatsapp);
        const t2 = analyzePhone(c2.whatsapp);
        if (t1.isValid && t2.isValid && t1.normalized === t2.normalized) {
          const sim = calculateStringSimilarity(c1.nome, c2.nome);
          if (sim < 0.4) {
            blockingIssues.push(`Nomes muito diferentes (${c1.nome} vs ${c2.nome}) compartilhando o mesmo telefone.`);
            break;
          }
        }
      }
    }
    if (blockingIssues.length > 0) break; // Para não floodar
  }

  if (blockingIssues.length > 0) {
    mergeStatus = "Não mesclar";
  } else if (hasConflict) {
    mergeStatus = "Revisão manual";
  } else {
    mergeStatus = "Recomendada";
  }

  return {
    principalClient: principal,
    secondaryClients: secondaries,
    scores,
    impactAnalysis,
    mergeStatus,
    blockingIssues
  };
}
