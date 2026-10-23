import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migration = (name) => readFileSync(new URL(`../supabase/migrations/${name}`, import.meta.url), "utf8");
const admin = "00000000-0000-4000-8000-000000000001";
const staff = "00000000-0000-4000-8000-000000000002";
const disabled = "00000000-0000-4000-8000-000000000003";

test("local migration restores RLS and checks direct privileged RPC calls", async () => {
  // In-memory PostgreSQL only: no URLs, dotenv, credentials, or network clients.
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon;
      CREATE ROLE authenticated;
      CREATE ROLE service_role BYPASSRLS;
      CREATE SCHEMA auth;
      GRANT USAGE ON SCHEMA auth TO anon, authenticated;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
        SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
      $$;
      CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, created_at timestamptz DEFAULT now());
      INSERT INTO auth.users (id, email) VALUES
        ('${admin}', 'admin@fixture.invalid'), ('${staff}', 'staff@fixture.invalid'), ('${disabled}', 'disabled@fixture.invalid');
      CREATE TABLE public.ordens_servico (id uuid PRIMARY KEY);
    `);
    for (const name of [
      "20260803214000_80cc67ba-7da4-4a9e-8e9c-a067ac6ead92.sql",
      "20260814144500_secure_rls.sql",
      "20260814160000_merge_logic.sql",
      "20260814170000_add_import_tracking.sql",
      "20260814170001_admin_only_rls.sql",
      "20260814180000_migration_audit_tables.sql",
      "20260814180001_migration_rpcs.sql",
      "20260815230000_arquivamento_e_rbac.sql",
    ]) await db.exec(migration(name));
    await db.exec(`INSERT INTO public.perfis_usuarios (user_id, email, nome, perfil, ativo) VALUES
      ('${admin}', 'admin@fixture.invalid', 'Fixture Admin', 'Administrador', true),
      ('${staff}', 'staff@fixture.invalid', 'Fixture Staff', 'Atendimento', true),
      ('${disabled}', 'disabled@fixture.invalid', 'Fixture Disabled', 'Administrador', false);`);
    await db.exec(migration("20260925181000_allow_authenticated_manage.sql"));
    const asUser = async (id, sql, role = "authenticated") => {
      await db.exec(`SET ROLE ${role}; SET request.jwt.claim.sub = '${id}';`);
      try { return await db.query(sql); } finally { await db.exec("RESET ROLE; RESET request.jwt.claim.sub;"); }
    };
    assert.equal((await asUser(staff, "SELECT public.is_admin() AS allowed")).rows[0].allowed, true);
    const fix = migration("20261023150000_restore_admin_boundaries.sql");
    await db.exec(fix);
    assert.equal((await asUser(staff, "SELECT public.is_admin() AS allowed")).rows[0].allowed, false);
    assert.equal((await asUser(disabled, "SELECT public.is_admin() AS allowed")).rows[0].allowed, false);
    assert.equal((await asUser(admin, "SELECT public.is_admin() AS allowed")).rows[0].allowed, true);
    await db.exec("GRANT SELECT ON public.admin_users TO authenticated;");
    assert.equal((await asUser(staff, "SELECT * FROM public.admin_users")).rows.length, 0);
    const principal = "00000000-0000-4000-8000-000000000010";
    const secondary = "00000000-0000-4000-8000-000000000011";
    await db.exec(`INSERT INTO public.clientes (id, nome) VALUES ('${principal}', 'Fixture Principal'), ('${secondary}', 'Fixture Secondary');`);
    assert.equal((await asUser(staff, "SELECT * FROM public.clientes")).rows.length, 0);
    assert.equal((await asUser(staff, `UPDATE public.perfis_usuarios SET perfil = 'Administrador' WHERE user_id = '${staff}' RETURNING id`)).rows.length, 0);
    const merge = (identity, ids = "ARRAY[]::uuid[]") => `SELECT public.execute_merge_transaction('${principal}', ${ids}, '{}'::jsonb, '${identity}') AS id`;
    await assert.rejects(asUser(staff, merge(staff)), /Active administrators only/);
    await assert.rejects(asUser("", merge(admin), "anon"), /permission denied/);
    await assert.rejects(asUser(admin, merge(staff)), /Audit identity must match/);
    const result = await asUser(admin, merge(admin, `ARRAY['${secondary}']::uuid[]`));
    const auditId = result.rows[0].id;
    assert.equal((await db.query(`SELECT arquivado, arquivado_por FROM public.clientes WHERE id = '${secondary}'`)).rows[0].arquivado_por, admin);
    await assert.rejects(asUser(staff, `SELECT public.undo_merge_transaction('${auditId}', '${staff}')`), /Active administrators only/);
    await asUser(admin, `SELECT public.undo_merge_transaction('${auditId}', '${admin}')`);
    assert.equal((await db.query(`SELECT arquivado FROM public.clientes WHERE id = '${secondary}'`)).rows[0].arquivado, false);
    // Reapplying must fail before changing permissions if there is no active admin.
    await db.exec("UPDATE public.perfis_usuarios SET ativo = false WHERE perfil = 'Administrador';");
    await assert.rejects(db.exec(fix), /Provision an active administrator/);
    await db.exec("ROLLBACK;");
  } finally {
    await db.close();
  }
});
