/**
 * Copy all data from Railway PostgreSQL to Neon (or any target).
 * Usage: SOURCE_DATABASE_URL="postgres://..." TARGET_DATABASE_URL="postgres://..." node scripts/migrate-railway-to-neon.js
 * Run from backend/: node scripts/migrate-railway-to-neon.js
 */
const { Client } = require('pg');

const SOURCE_URL = process.env.SOURCE_DATABASE_URL;
const TARGET_URL = process.env.TARGET_DATABASE_URL;

if (!SOURCE_URL || !TARGET_URL) {
  console.error('Set SOURCE_DATABASE_URL and TARGET_DATABASE_URL');
  process.exit(1);
}

// Tables in dependency order. Source table name may differ (e.g. restaurants -> organizations).
const TABLE_CONFIG = [
  { source: 'organizations', target: 'organizations', altSource: 'restaurants' },
  { source: 'users', target: 'users', columnMap: { restaurant_id: 'organization_id' } },
  { source: 'tasks', target: 'tasks', columnMap: { restaurant_id: 'organization_id' }, skipColumns: ['push_reminder_sent_at'] },
  { source: 'statuses', target: 'statuses', columnMap: { restaurant_id: 'organization_id' } },
  { source: 'tags', target: 'tags', columnMap: { restaurant_id: 'organization_id' } },
  { source: 'task_assignments', target: 'task_assignments' },
  { source: 'task_checklists', target: 'task_checklists' },
  { source: 'comments', target: 'comments' },
  { source: 'photos', target: 'photos' },
  { source: 'task_tags', target: 'task_tags' },
  { source: 'task_status_history', target: 'task_status_history' },
  { source: 'push_subscriptions', target: 'push_subscriptions' },
];

async function getTableExists(client, table) {
  const r = await client.query(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );
  return r.rows.length > 0;
}

async function getColumns(client, table) {
  const r = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 ORDER BY ordinal_position`,
    [table]
  );
  return r.rows.map((x) => x.column_name);
}

async function copyTable(sourceClient, targetClient, config) {
  let sourceTable = config.source;
  const targetTable = config.target;
  const columnMap = config.columnMap || {};
  const skipColumns = new Set(config.skipColumns || []);

  const hasAlt = config.altSource && (await getTableExists(sourceClient, config.altSource));
  if (hasAlt) sourceTable = config.altSource;

  if (!(await getTableExists(sourceClient, sourceTable))) {
    console.log(`  Skip ${sourceTable} (not in source)`);
    return 0;
  }
  if (!(await getTableExists(targetClient, targetTable))) {
    console.log(`  Skip ${targetTable} (not in target)`);
    return 0;
  }

  const sourceCols = await getColumns(sourceClient, sourceTable);
  const targetCols = await getColumns(targetClient, targetTable);

  const selectCols = sourceCols.filter((c) => !skipColumns.has(c));
  const selectColsForInsert = selectCols.filter((c) => targetCols.includes(columnMap[c] || c));
  const insertCols = selectColsForInsert.map((c) => columnMap[c] || c);

  if (insertCols.length === 0) {
    console.log(`  Skip ${sourceTable} -> ${targetTable} (no matching columns)`);
    return 0;
  }

  const rows = await sourceClient.query(`SELECT ${selectCols.map((c) => `"${c}"`).join(', ')} FROM ${sourceTable}`);
  if (rows.rows.length === 0) {
    console.log(`  ${sourceTable} -> ${targetTable}: 0 rows`);
    return 0;
  }

  const placeholders = insertCols.map((_, i) => `$${i + 1}`).join(', ');
  const insertSql = `INSERT INTO ${targetTable} (${insertCols.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders}) ON CONFLICT DO NOTHING`;
  let inserted = 0;
  for (const row of rows.rows) {
    const values = selectColsForInsert.map((col) => row[col]);
    try {
      await targetClient.query(insertSql, values);
      inserted++;
    } catch (e) {
      console.warn(`  Row insert failed:`, e.message);
    }
  }
  console.log(`  ${sourceTable} -> ${targetTable}: ${inserted} rows`);
  return inserted;
}

async function resetSequences(targetClient) {
  const tables = ['organizations', 'users', 'tasks', 'statuses', 'tags', 'task_assignments', 'task_checklists', 'comments', 'photos', 'task_tags', 'task_status_history', 'push_subscriptions'];
  for (const table of tables) {
    const r = await targetClient.query(`SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1 AND column_default LIKE 'nextval%'`, [table]);
    if (r.rows.length === 0) continue;
    const idCol = r.rows[0].column_name;
    try {
      await targetClient.query(`SELECT setval(pg_get_serial_sequence($1, $2), COALESCE((SELECT MAX("${idCol}") FROM ${table}), 1))`, [table, idCol]);
      console.log(`  Reset sequence for ${table}.${idCol}`);
    } catch (e) {
      console.warn(`  Sequence reset ${table}:`, e.message);
    }
  }
}

async function main() {
  const sourceClient = new Client({ connectionString: SOURCE_URL });
  const targetClient = new Client({ connectionString: TARGET_URL });
  try {
    await sourceClient.connect();
    await targetClient.connect();
    console.log('Connected to source and target.\nCopying tables...');
    for (const config of TABLE_CONFIG) {
      await copyTable(sourceClient, targetClient, config);
    }
    console.log('\nResetting sequences...');
    await resetSequences(targetClient);
    console.log('\nDone.');
  } finally {
    await sourceClient.end();
    await targetClient.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
