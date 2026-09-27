// Applies db/migrations/*.sql in order and records them in schema_migrations.
// Works with both drivers. The RDS Data API runs one statement per call, so files are split safely
// (quotes, dollar-quoted function bodies and comments are respected).
// Usage (VS Code terminal, WSL):
//   AWS:   DB_CLUSTER_ARN=... DB_SECRET_ARN=<master secret> WEB_SECRET_ARN=<web secret> npm run db:migrate
//   Local: DATABASE_URL=postgres://... WEB_DB_PASSWORD=dev npm run db:migrate
import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';
import { createDb } from './db.js';

export function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  let quote = null;   // "'" or '"'
  let dollar = null;  // e.g. "$$" or "$body$"
  while (i < sql.length) {
    const c = sql[i];
    if (dollar) {
      if (sql.startsWith(dollar, i)) { cur += dollar; i += dollar.length; dollar = null; continue; }
      cur += c; i++; continue;
    }
    if (quote) {
      cur += c; i++;
      if (c === quote) { if (sql[i] === quote) { cur += sql[i]; i++; } else quote = null; }
      continue;
    }
    if (c === '-' && sql[i + 1] === '-') { const e = sql.indexOf('\n', i); i = e === -1 ? sql.length : e; continue; }
    if (c === "'" || c === '"') { quote = c; cur += c; i++; continue; }
    if (c === '$') {
      const m = sql.slice(i).match(/^\$[A-Za-z_]*\$/);
      if (m) { dollar = m[0]; cur += dollar; i += dollar.length; continue; }
    }
    if (c === ';') { if (cur.trim()) out.push(cur.trim()); cur = ''; i++; continue; }
    cur += c; i++;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

async function webPassword(env) {
  if (env.WEB_DB_PASSWORD) return env.WEB_DB_PASSWORD;
  if (!env.WEB_SECRET_ARN) return null;
  const sm = new SecretsManagerClient({});
  const out = await sm.send(new GetSecretValueCommand({ SecretId: env.WEB_SECRET_ARN }));
  return JSON.parse(out.SecretString).password;
}

export async function migrate(env = process.env, dir = new URL('../../../db/migrations/', import.meta.url)) {
  const db = await createDb(env);
  try {
    await db.query('create table if not exists schema_migrations (name text primary key, checksum text not null, applied_at timestamptz not null default now())');
    const done = new Map((await db.query('select name, checksum from schema_migrations')).map((r) => [r.name, r.checksum]));
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const f of files) {
      const sql = readFileSync(new URL(f, dir), 'utf8');
      const sum = createHash('sha256').update(sql).digest('hex');
      if (done.has(f)) {
        if (done.get(f) !== sum) console.warn(`WARNING ${f} changed after it was applied; write a new migration instead.`);
        continue;
      }
      const statements = splitSql(sql);
      for (const s of statements) await db.query(s);
      await db.query('insert into schema_migrations (name, checksum) values (:name, :sum)', { name: f, sum });
      console.log(`applied ${f} (${statements.length} statements)`);
    }
    const pw = await webPassword(env);
    if (pw) {
      if (!/^[A-Za-z0-9_\-.!#%^*+=]{12,}$/.test(pw)) throw new Error('Web DB password must be 12+ characters without quotes or spaces');
      await db.query(`alter role cuida_web login password '${pw}'`);
      console.log('cuida_web can log in (password from secret)');
    } else {
      console.log('No WEB_SECRET_ARN / WEB_DB_PASSWORD: cuida_web stays NOLOGIN');
    }
  } finally {
    await db.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const seed = process.argv.includes('--seed');
  await migrate();
  if (seed) {
    const db = await createDb();
    const sql = readFileSync(new URL('../../../db/seed.sql', import.meta.url), 'utf8');
    for (const s of splitSql(sql)) await db.query(s);
    await db.end();
    console.log('seed applied');
  }
}
