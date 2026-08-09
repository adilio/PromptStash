/**
 * Phase 0 of docs/FIREBASE-MIGRATION-PLAN.md — snapshot every Supabase table to
 * .snapshot/*.json so the migration stops depending on the project staying
 * awake. The project is under a pause warning and its keep-alive reported green
 * daily for over a week while provably doing nothing.
 *
 *   node scripts/export-supabase.ts
 *
 * Reads VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from .env.local. The
 * service-role key bypasses RLS, which is the point: an anon-key export would
 * silently return only the rows the anonymous role can see, and a partial
 * snapshot that looks complete is worse than none.
 *
 * Writes nothing outside .snapshot/ and never mutates Supabase.
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const OUT_DIR = '.snapshot';
const PAGE = 1000;

/**
 * Every table in the schema, including ones the Firestore model drops. `shares`
 * is not being ported and `prompt_tags` / `bundle_items` /
 * `workflow_pattern_steps` / `memberships` are folded into their parents, but a
 * snapshot exists to be complete — the transform belongs in the importer, where
 * it can be re-run against the same input.
 */
const TABLES = [
  'teams',
  'memberships',
  'folders',
  'prompts',
  'prompt_versions',
  'tags',
  'prompt_tags',
  'shares',
  'invites',
  'api_keys',
  'model_integrations',
  'bundles',
  'bundle_items',
  'prompt_runs',
  'workflow_patterns',
  'workflow_pattern_steps',
] as const;

async function loadEnv(): Promise<Record<string, string>> {
  const env: Record<string, string> = {};
  // .env.local, not .env — this repo has no .env, and .env.local is where the
  // Supabase URL and keys already live. Both are gitignored.
  const raw = await readFile('.env.local', 'utf8').catch(() => {
    throw new Error('.env.local not found. It must hold SUPABASE_SERVICE_ROLE_KEY.');
  });
  for (const line of raw.split('\n')) {
    const match = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '');
  }
  return { ...env, ...(process.env as Record<string, string>) };
}

async function fetchAll(url: string, key: string, table: string): Promise<unknown[]> {
  const rows: unknown[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const endpoint = `${url}/rest/v1/${table}?select=*&limit=${PAGE}&offset=${offset}`;
    const res = await fetch(endpoint, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      throw new Error(`${table}: ${res.status} ${res.statusText} — ${await res.text()}`);
    }
    const page = (await res.json()) as unknown[];
    rows.push(...page);
    // A short page means the end. Looping until empty would cost one extra
    // request per table on an exact multiple of PAGE, which is harmless but
    // this is the cheaper stop condition.
    if (page.length < PAGE) return rows;
  }
}

/**
 * auth.users lives outside the REST schema, so it comes from the GoTrue admin
 * endpoint instead. What matters here is the id: every owner_id, created_by and
 * edited_by in the snapshot references it, and preserving those UUIDs as
 * Firebase localIds is what lets Phase 6 import with zero id rewriting.
 */
async function fetchAuthUsers(url: string, key: string): Promise<Record<string, unknown>[]> {
  const users: Record<string, unknown>[] = [];
  for (let page = 1; ; page += 1) {
    const res = await fetch(`${url}/auth/v1/admin/users?page=${page}&per_page=200`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
    });
    if (!res.ok) {
      throw new Error(`auth.users: ${res.status} ${res.statusText} — ${await res.text()}`);
    }
    const body = (await res.json()) as { users?: Record<string, unknown>[] };
    const batch = body.users ?? [];
    users.push(...batch);
    if (batch.length < 200) return users;
  }
}

async function main(): Promise<void> {
  const env = await loadEnv();
  const url = (env.VITE_SUPABASE_URL ?? '').replace(/\/$/, '');
  const key = env.SUPABASE_SERVICE_ROLE_KEY ?? '';

  if (!url) throw new Error('VITE_SUPABASE_URL is not set in .env.local');
  if (!key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY is not set in .env.local.\n' +
        'Supabase dashboard > Project Settings > API > service_role.\n' +
        'Append it with >> so the existing keys survive:\n' +
        "  echo 'SUPABASE_SERVICE_ROLE_KEY=…' >> .env.local"
    );
  }

  await mkdir(OUT_DIR, { recursive: true });
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows = await fetchAll(url, key, table);
    await writeFile(join(OUT_DIR, `${table}.json`), JSON.stringify(rows, null, 2));
    counts[table] = rows.length;
    console.log(`  ${String(rows.length).padStart(6)}  ${table}`);
  }

  const users = await fetchAuthUsers(url, key);
  await writeFile(join(OUT_DIR, 'auth_users.json'), JSON.stringify(users, null, 2));
  counts['auth.users'] = users.length;
  console.log(`  ${String(users.length).padStart(6)}  auth.users`);

  await writeFile(join(OUT_DIR, '_counts.json'), JSON.stringify(counts, null, 2));

  // The plan says this endpoint yields "auth.users via the Admin API for the
  // bcrypt hashes". It does not: GoTrue redacts encrypted_password from every
  // admin response, and the column is reachable only over SQL. Rather than
  // assert that, check the payload and say what is actually there — if a future
  // GoTrue does return hashes, this stops printing the warning by itself.
  const hasHashes = users.some((u) =>
    Object.keys(u).some((k) => /password|encrypted/i.test(k))
  );
  if (users.length > 0 && !hasHashes) {
    console.log(
      [
        '',
        'No password hashes in the admin payload — expected, and it affects Phase 6.',
        '`firebase auth:import --hash-algo=BCRYPT` needs them, and they are only',
        'reachable over SQL. Either run this in the Supabase SQL editor and save the',
        'result as .snapshot/auth_passwords.json:',
        '',
        '  select json_agg(json_build_object(',
        "    'id', id, 'email', email, 'encrypted_password', encrypted_password))",
        '  from auth.users where encrypted_password is not null;',
        '',
        'or skip it: import the users without passwords and have them reset once',
        'after cutover. UUIDs are preserved either way, which is what the foreign',
        'keys actually depend on. Google sign-in is unaffected.',
      ].join('\n')
    );
  }

  console.log(`\nWrote ${Object.keys(counts).length} files to ${OUT_DIR}/`);
  console.log('Compare these against the Phase 0 row counts in the plan.');
}

main().catch((error: unknown) => {
  console.error(`\nExport failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
