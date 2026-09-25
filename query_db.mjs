import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_PUBLISHABLE_KEY);

async function run() {
  console.log("=== MERGE AUDITS ===");
  let { data: mergeData, error: mergeErr } = await supabase.from('merge_audits').select('*');
  if (mergeErr) {
    console.error("Error reading merge_audits:", mergeErr);
  } else {
    // mask sensitive data
    const masked = mergeData.map(d => ({
       id: d.id,
       status: d.status,
       operation_id: d.operation_id,
       reverted_at: d.reverted_at,
       created_at: d.created_at,
       archived_ids_length: d.archived_ids?.length,
       has_backups: !!d.campos_anteriores,
       has_relacionamentos: !!d.relacionamentos_transferidos,
    }));
    console.dir(masked, { depth: null });
  }

  console.log("=== MIGRATION AUDITS ===");
  let { data: migData, error: migErr } = await supabase.from('migration_audits').select('*').limit(2);
  if (migErr) {
    console.error("Error reading migration_audits:", migErr);
  } else {
    const masked = migData.map(d => ({
       id: d.id,
       status: d.status,
       operation_id: d.operation_id,
       created_at: d.created_at,
       total_afetados: d.total_afetados
    }));
    console.dir(masked, { depth: null });
  }
}
run();
