import {
  analyzeCPFCNPJ,
  analyzePhone,
  analyzeEmail,
  detectSuspiciousName,
  detectCorruptedText,
  calculateStringSimilarity,
  analyzeClientDatabase,
  isDateInString,
} from "../lib/data-quality";
import type { Cliente } from "../hooks/use-crm";

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${msg}`);
    process.exit(1);
  }
}

console.log("🚀 Running Data Quality Suite tests...\n");

// 1. Testes de CPF / CNPJ e Datas
console.log("1. Testando validação de CPF, CNPJ e Datas...");
// CPF Válido conhecido (gerado algoritmo)
const validCpf = "11144477735";
const cpfRes = analyzeCPFCNPJ(validCpf);
assert(cpfRes.isValid === true, "CPF válido deve ser reconhecido");
assert(cpfRes.type === "cpf", "Tipo deve ser cpf");

// CPF Inválido
const invCpf = "12345678900";
const invCpfRes = analyzeCPFCNPJ(invCpf);
assert(invCpfRes.isValid === false, "CPF com DV incorreto deve ser falso");

// Data no campo de CPF
const dateInCpf = "15/08/1985";
assert(isDateInString(dateInCpf) === true, "Deve identificar data DD/MM/AAAA");
const dateRes = analyzeCPFCNPJ(dateInCpf);
assert(dateRes.isValid === false, "Data no campo de CPF não deve ser válida");
assert(dateRes.type === "data", "Tipo deve ser data");

const dateIsoInCpf = "2024-05-20";
assert(isDateInString(dateIsoInCpf) === true, "Deve identificar data AAAA-MM-DD");

// CNPJ Válido conhecido
const validCnpj = "11222333000181";
const cnpjRes = analyzeCPFCNPJ(validCnpj);
assert(cnpjRes.isValid === true, "CNPJ válido deve ser reconhecido");
assert(cnpjRes.type === "cnpj", "Tipo deve ser cnpj");

// 2. Testes de Telefone
console.log("2. Testando normalização de Telefone...");
// Celular válido com DDD 19
const phone1 = "(19) 99876-5432";
const pRes1 = analyzePhone(phone1);
assert(pRes1.isValid === true, "Celular 11 dígitos com 9 deve ser válido");
assert(pRes1.normalized === "19998765432", "Deve normalizar número");

// Celular com +55
const phoneWithDDI = "+55 19 99876-5432";
const pResDDI = analyzePhone(phoneWithDDI);
assert(pResDDI.isValid === true, "Telefone com +55 deve remover DDI e ser válido");
assert(pResDDI.normalized === "19998765432", "Deve remover 55");

// Telefone com DDD inválido
const phoneInvDdd = "(00) 99876-5432";
const pResInvDdd = analyzePhone(phoneInvDdd);
assert(pResInvDdd.isValid === false, "DDD 00 deve ser inválido");

// Celular sem 9
const phoneNoNine = "19887654321";
const pResNoNine = analyzePhone(phoneNoNine);
assert(pResNoNine.isValid === false, "Celular 11 dígitos sem 9 no início deve ser inválido");

// Dígitos repetidos
const phoneRepeated = "11111111111";
const pResRepeated = analyzePhone(phoneRepeated);
assert(pResRepeated.isValid === false, "Dígitos repetidos devem ser inválidos");

// 3. Testes de Email
console.log("3. Testando normalização de Email...");
const validMail = "contato@jansol.com.br";
assert(analyzeEmail(validMail).isValid === true, "Email corporativo deve ser válido");
assert(analyzeEmail("email_invalido.com").isValid === false, "Email sem @ deve ser inválido");
assert(analyzeEmail("").isValid === true, "Email vazio é tratado sem erro");

// 4. Testes de Nomes Suspeitos
console.log("4. Testando detecção de nomes suspeitos...");
assert(detectSuspiciousName("Rua das Flores 123").isSuspicious === true, "Endereço no nome deve ser suspeito");
assert(detectSuspiciousName("Status: Pendente").isSuspicious === true, "Status no nome deve ser suspeito");
assert(detectSuspiciousName("19998765432").isSuspicious === true, "Telefone no nome deve ser suspeito");
assert(detectSuspiciousName("Comprar placa 500w").isSuspicious === true, "Anotação no nome deve ser suspeita");
assert(detectSuspiciousName("Carlos Eduardo Silva").isSuspicious === false, "Nome normal não deve ser suspeito");

// 5. Testes de Caracteres Corrompidos (Mojibake)
console.log("5. Testando detecção de caracteres corrompidos...");
assert(detectCorruptedText("JoÃ£o da Silva").isCorrupted === true, "JoÃ£o deve ser detectado como corrompido");
assert(detectCorruptedText("Instalação Solar").isCorrupted === false, "Texto com acento correto é válido");
assert(detectCorruptedText("Cliente com caracter \uFFFD").isCorrupted === true, "Caractere replacement deve ser detectado");

// 6. Teste de Similaridade de Nomes
console.log("6. Testando similaridade de strings...");
const sim1 = calculateStringSimilarity("Carlos Eduardo Silva", "Carlos E. Silva");
assert(sim1 > 0.7, "Nomes parecidos devem ter similaridade > 0.7");
const simExact = calculateStringSimilarity("Ana Paula Santos", "Ana Paula Santos");
assert(simExact === 1.0, "Nomes idênticos devem ter similaridade 1.0");

// 7. Teste de Integridade do Motor de Análise
console.log("7. Testando motor completo de análise e garantia de NÃO MUTABILIDADE...");

const mockClients: Cliente[] = [
  {
    id: "1",
    created_at: "2026-01-01T10:00:00Z",
    nome: "Marcos Vinicius Pereira",
    tipo: "Pessoa Física",
    cpf_cnpj: "11144477735",
    whatsapp: "19998765432",
    email: "marcos@teste.com",
    endereco: "Rua A, 10",
    cidade: "Campinas",
    tipo_telhado: "Cerâmico",
    tipo_sistema: "Banho",
    qtd_pessoas: 4,
    tamanho_piscina_m2: null,
    qtd_banheiros: 2,
    marca_equipamento: "Termomax",
    qtd_coletores: 2,
    modelo_reservatorio: "400L",
    data_instalacao: "2026-01-10",
    tecnico_id: null,
    valor_orcamento: 5000,
    valor_pago: 5000,
    status: "Instalado",
    origem_lead: "Google",
    ultimo_contato: "2026-01-10",
    observacoes: null,
  },
  {
    id: "2",
    created_at: "2026-01-02T11:00:00Z",
    nome: "Marcos Vinicius Pereira", // Duplicata por CPF e Telefone
    tipo: "Pessoa Física",
    cpf_cnpj: "11144477735",
    whatsapp: "19998765432",
    email: "marcos@teste.com",
    endereco: "Rua A, 10",
    cidade: "Campinas",
    tipo_telhado: "Cerâmico",
    tipo_sistema: "Banho",
    qtd_pessoas: 4,
    tamanho_piscina_m2: null,
    qtd_banheiros: 2,
    marca_equipamento: "Termomax",
    qtd_coletores: 2,
    modelo_reservatorio: "400L",
    data_instalacao: "2026-01-10",
    tecnico_id: null,
    valor_orcamento: 5000,
    valor_pago: 5000,
    status: "Instalado",
    origem_lead: "Google",
    ultimo_contato: "2026-01-10",
    observacoes: null,
  },
  {
    id: "3",
    created_at: "2026-01-03T12:00:00Z",
    nome: "Rua das Palmeiras 400", // Nome suspeito
    tipo: "Pessoa Física",
    cpf_cnpj: "15/02/1980", // Data no CPF
    whatsapp: "0000000000", // Telefone inválido
    email: "invalido",
    endereco: null,
    cidade: null, // Sem cidade
    tipo_telhado: null,
    tipo_sistema: "Banho",
    qtd_pessoas: null,
    tamanho_piscina_m2: null,
    qtd_banheiros: null,
    marca_equipamento: null,
    qtd_coletores: null,
    modelo_reservatorio: null,
    data_instalacao: null,
    tecnico_id: null,
    valor_orcamento: null,
    valor_pago: null,
    status: "Orçamento",
    origem_lead: null, // Sem origem
    ultimo_contato: null,
    observacoes: "Texto com erro Ã¡Ã© de codificaÃ§Ã£o",
  },
];

// Snapshot prévio para garantir que nenhum objeto foi alterado
const snapshotBefore = JSON.stringify(mockClients);

const result = analyzeClientDatabase(mockClients);

// Verifica não-mutabilidade
const snapshotAfter = JSON.stringify(mockClients);
assert(snapshotBefore === snapshotAfter, "A análise NUNCA deve modificar o array ou objetos de clientes!");

// Verificações dos resultados
assert(result.totalClientes === 3, "Total de clientes analisados deve ser 3");
assert(result.summary.duplicidadesExatas >= 2, "Clientes 1 e 2 devem ser identificados como duplicidades exatas");
assert(result.summary.cpfCnpjComData >= 1, "Cliente 3 tem data no CPF");
assert(result.summary.telefonesInvalidos >= 1, "Cliente 3 tem telefone inválido");
assert(result.summary.nomesSuspeitos >= 1, "Cliente 3 tem nome suspeito");
assert(result.summary.textosCorrompidos >= 1, "Cliente 3 tem texto corrompido");
assert(result.summary.semCidade >= 1, "Cliente 3 não tem cidade");
assert(result.summary.semOrigem >= 1, "Cliente 3 não tem origem");

console.log("\n✅ TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!");
