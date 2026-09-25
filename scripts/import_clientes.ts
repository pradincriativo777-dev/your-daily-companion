import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

// Carrega variáveis do .env local (caso exista)
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("ERRO: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

interface ClienteRaw {
  nome: string;
  cpf_cnpj?: string;
  whatsapp?: string;
  cidade?: string;
  // adicione outros campos conforme a fonte
}

async function run() {
  const isDryRun = process.argv.includes('--dry-run');
  const sourceFile = process.argv[2];

  if (!sourceFile || sourceFile === '--dry-run') {
    console.error("Uso: npx tsx scripts/import_clientes.ts <caminho_do_json> [--dry-run]");
    process.exit(1);
  }

  console.log(`\nIniciando migração segura... Modo Dry-Run: ${isDryRun ? 'ATIVADO' : 'DESATIVADO'}`);

  let rawData: ClienteRaw[] = [];
  try {
    const fileContent = fs.readFileSync(sourceFile, 'utf-8');
    rawData = JSON.parse(fileContent);
  } catch (error) {
    console.error(`Erro ao ler arquivo ${sourceFile}:`, error);
    process.exit(1);
  }

  console.log(`Total de registros encontrados: ${rawData.length}`);

  let validos = 0;
  let invalidos = 0;
  let duplicadosOuConflitos = 0;

  const importId = `IMPORT-${Date.now()}`;
  const registrosParaInserir = [];

  for (const row of rawData) {
    if (!row.nome || row.nome.trim() === '') {
      invalidos++;
      continue;
    }

    // Normalização básica de CPF/CNPJ (remover pontuação)
    const cpfCnpjLimpo = row.cpf_cnpj ? row.cpf_cnpj.replace(/\D/g, '') : null;

    registrosParaInserir.push({
      nome: row.nome.trim(),
      cpf_cnpj: cpfCnpjLimpo,
      whatsapp: row.whatsapp ? row.whatsapp.replace(/\D/g, '') : null,
      cidade: row.cidade,
      origem_importacao: importId
    });
    
    validos++;
  }

  console.log(`- Válidos para processamento: ${validos}`);
  console.log(`- Inválidos ignorados: ${invalidos}`);

  if (isDryRun) {
    console.log("\n[DRY-RUN] Simulação concluída. Nenhum dado foi inserido no banco.");
    return;
  }

  // Executar inserção em lote (Idempotente com base no CPF/CNPJ se houver constraint)
  console.log(`\nExecutando inserção real de ${registrosParaInserir.length} clientes...`);
  
  // Como Supabase REST API não tem rollback automático nativo para múltiplos lotes, 
  // recomendamos criar uma stored procedure se quiser transação atômica completa.
  // Aqui fazemos um lote único.
  
  const { data, error } = await supabase
    .from('clientes')
    .insert(registrosParaInserir)
    .select('id');

  if (error) {
    console.error("ERRO GRAVE NA MIGRAÇÃO. Rollback ou correção manual necessária.", error);
    process.exit(1);
  }

  console.log(`\nMigração concluída com sucesso! ${data?.length} clientes inseridos.`);
  console.log(`ID da Origem desta importação: ${importId}`);
}

run();
