// Server-only database access. Two drivers, same SQL:
//   data-api  Aurora Serverless v2 via the RDS Data API. Credentials come from the Amplify SSR compute role;
//             DB_SECRET_ARN is the least-privilege cuida_web login (read-only, no raw provider table).
//   pg        DATABASE_URL, for local development.
// Every query returns rows as JSON text (to_jsonb(...)::text) so both drivers hand back identical objects,
// including arrays, which the Data API does not return natively.
import 'server-only';

type Params = Record<string, string | number | boolean | null | undefined>;
type Db = { json<T>(sql: string, params?: Params): Promise<T[]> };

const PARAM = /(?<![:\w]):([A-Za-z_]\w*)/g;

export function toPositional(sql: string, params: Params = {}) {
  const order: string[] = [];
  const text = sql.replace(PARAM, (_m, name: string) => {
    if (!(name in params)) throw new Error(`Missing SQL parameter :${name}`);
    let i = order.indexOf(name);
    if (i === -1) { order.push(name); i = order.length - 1; }
    return `$${i + 1}`;
  });
  return { text, values: order.map((n) => params[n] ?? null) };
}

let dbPromise: Promise<Db | null> | null = null;

async function init(): Promise<Db | null> {
  const env = process.env;
  const driver = env.DB_DRIVER ?? (env.DATABASE_URL ? 'pg' : env.DB_CLUSTER_ARN ? 'data-api' : null);
  if (!driver) return null;

  if (driver === 'pg') {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 3 });
    return {
      async json<T>(sql: string, params?: Params) {
        const { text, values } = toPositional(sql, params);
        const res = await pool.query(text, values);
        return res.rows.map((r: { j: string | object }) => (typeof r.j === 'string' ? JSON.parse(r.j) : r.j)) as T[];
      },
    };
  }

  const { RDSDataClient, ExecuteStatementCommand } = await import('@aws-sdk/client-rds-data');
  const client = new RDSDataClient({});
  return {
    async json<T>(sql: string, params: Params = {}) {
      const out = await client.send(new ExecuteStatementCommand({
        resourceArn: env.DB_CLUSTER_ARN,
        secretArn: env.DB_SECRET_ARN,
        database: env.DB_NAME ?? 'cuida',
        sql,
        parameters: Object.entries(params).map(([name, v]) =>
          v === null || v === undefined ? { name, value: { isNull: true } }
          : typeof v === 'boolean' ? { name, value: { booleanValue: v } }
          : typeof v === 'number' ? (Number.isInteger(v) ? { name, value: { longValue: v } } : { name, value: { doubleValue: v } })
          : { name, value: { stringValue: String(v) } }),
      }));
      return (out.records ?? []).map((rec) => JSON.parse(rec[0]?.stringValue ?? 'null')) as T[];
    },
  };
}

/** Returns null when no database is configured (the UI shows a setup message). */
export function getDb(): Promise<Db | null> {
  dbPromise ??= init();
  return dbPromise;
}
