// Database access with two interchangeable drivers:
//   data-api  Aurora Serverless v2 through the RDS Data API (production: Lambda, no VPC needed)
//   pg        Any Postgres through DATABASE_URL (local development and tests)
// SQL uses named parameters (:name). Casts like ::jsonb are left alone.
const PARAM = /(?<![:\w]):([A-Za-z_]\w*)/g;

export function toPositional(sql, params = {}) {
  const order = [];
  const text = sql.replace(PARAM, (_, name) => {
    if (!(name in params)) throw new Error(`Missing SQL parameter :${name}`);
    let i = order.indexOf(name);
    if (i === -1) { order.push(name); i = order.length - 1; }
    return `$${i + 1}`;
  });
  // Objects and arrays always travel as JSON text (pg would otherwise send arrays as Postgres array literals).
  return { text, values: order.map((n) => (params[n] !== null && typeof params[n] === 'object' ? JSON.stringify(params[n]) : params[n])) };
}

export function toDataApiParams(params = {}) {
  return Object.entries(params).map(([name, v]) => {
    if (v === null || v === undefined) return { name, value: { isNull: true } };
    if (typeof v === 'boolean') return { name, value: { booleanValue: v } };
    if (typeof v === 'number') return Number.isInteger(v) ? { name, value: { longValue: v } } : { name, value: { doubleValue: v } };
    if (typeof v === 'object') return { name, value: { stringValue: JSON.stringify(v) }, typeHint: 'JSON' };
    return { name, value: { stringValue: String(v) } };
  });
}

export async function createDb(env = process.env) {
  const driver = env.DB_DRIVER ?? (env.DATABASE_URL ? 'pg' : 'data-api');

  if (driver === 'pg') {
    const { default: pg } = await import('pg');
    const pool = new pg.Pool({ connectionString: env.DATABASE_URL, max: 2 });
    return {
      driver,
      async query(sql, params) {
        const { text, values } = toPositional(sql, params);
        const res = await pool.query(text, values);
        return res.rows;
      },
      end: () => pool.end(),
    };
  }

  const { RDSDataClient, ExecuteStatementCommand } = await import('@aws-sdk/client-rds-data');
  for (const k of ['DB_CLUSTER_ARN', 'DB_SECRET_ARN']) if (!env[k]) throw new Error(`${k} is required for the data-api driver`);
  const client = new RDSDataClient({});
  return {
    driver,
    async query(sql, params) {
      const out = await client.send(new ExecuteStatementCommand({
        resourceArn: env.DB_CLUSTER_ARN,
        secretArn: env.DB_SECRET_ARN,
        database: env.DB_NAME ?? 'cuida',
        sql,
        parameters: toDataApiParams(params),
        formatRecordsAs: 'JSON',
      }));
      return out.formattedRecords ? JSON.parse(out.formattedRecords) : [];
    },
    end: async () => {},
  };
}

// Split rows into JSON payloads under a byte budget, so each call stays well inside Data API request limits.
export function chunkByBytes(rows, maxBytes = 60000) {
  const chunks = [];
  let cur = [];
  let size = 2;
  for (const r of rows) {
    const s = Buffer.byteLength(JSON.stringify(r)) + 1;
    if (cur.length && size + s > maxBytes) { chunks.push(cur); cur = []; size = 2; }
    cur.push(r);
    size += s;
  }
  if (cur.length) chunks.push(cur);
  return chunks;
}
