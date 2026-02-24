/**
 * Local development shim for @neondatabase/serverless.
 * Replaces the HTTP fetch call with direct PostgreSQL queries via the 'pg' library.
 * Load via: NODE_OPTIONS="--require ./neon-local-shim.js"
 */
const { neonConfig } = require('@neondatabase/serverless');
const { Client } = require('pg');

neonConfig.fetchFunction = async (url, options) => {
  const body = JSON.parse(options.body);
  const connStr = options.headers['Neon-Connection-String'];

  const client = new Client({ connectionString: connStr });
  await client.connect();

  try {
    if (body.queries) {
      const results = [];
      for (const q of body.queries) {
        const res = await client.query(q.query, q.params || []);
        results.push({
          fields: res.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
          rows: res.rows.map(row => res.fields.map(f => {
            const v = row[f.name];
            return v === null ? null : String(v);
          })),
        });
      }
      return new Response(JSON.stringify({ results }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    } else {
      const res = await client.query(body.query, body.params || []);
      const payload = {
        fields: res.fields.map(f => ({ name: f.name, dataTypeID: f.dataTypeID })),
        rows: res.rows.map(row => res.fields.map(f => {
          const v = row[f.name];
          return v === null ? null : String(v);
        })),
      };
      return new Response(JSON.stringify(payload), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }
  } finally {
    await client.end();
  }
};
