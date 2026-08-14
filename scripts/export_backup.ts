import fs from 'fs';
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("ERRO: Variáveis do Supabase ausentes no .env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log("Iniciando backup dos clientes...");
  
  // Como são ~817 clientes, a API padrão (limite 1000) trará todos. 
  // Em bases maiores, seria necessário paginar.
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error("Erro ao fazer backup:", error);
    process.exit(1);
  }

  const filename = `backup_clientes_${Date.now()}.json`;
  fs.writeFileSync(filename, JSON.stringify(data, null, 2));

  console.log(`Backup concluído com sucesso! ${data.length} clientes exportados para ${filename}`);
  console.log(`\nPara limpar a base e reimportar com o script, execute:`);
  console.log(`1. Vá no Supabase Studio e faça TRUNCATE TABLE clientes CASCADE;`);
  console.log(`2. npx tsx scripts/import_clientes.ts ${filename} --dry-run`);
  console.log(`3. npx tsx scripts/import_clientes.ts ${filename}`);
}

run();
