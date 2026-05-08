'use strict';
/**
 * import-mysql.js
 * Reads backup-production.json and inserts all rows into MySQL.
 * Run AFTER the new server.js has started (so all tables exist).
 *
 * Usage:
 *   MYSQLHOST=... MYSQLUSER=... MYSQLPASSWORD=... MYSQLDATABASE=... node import-mysql.js
 */
const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

const BACKUP_FILE = path.join(__dirname, 'backup-production.json');

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'localhost',
  port:     parseInt(process.env.MYSQLPORT) || 3306,
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'cpr_sales',
  waitForConnections: true,
  connectionLimit: 5,
  dateStrings: true,
});

// Tables in dependency order (parents before children)
const TABLE_ORDER = [
  'users',
  'transactions',
  'leads',
  'cash_handover',
  'customers',
  'inventory_items',
  'inventory_stock',
  'inventory_movements',
  'inventory_batches',
  'purchase_orders',
  'po_items',
  'purchase_requisitions',
  'pr_items',
  'lookup_options',
];

async function importTable(conn, tableName, rows) {
  if (!rows || rows.length === 0) {
    console.log(`  ⏭  ${tableName}: 0 rows — skipped`);
    return;
  }

  // Fix lookup_options: parent_value NULL → ''
  if (tableName === 'lookup_options') {
    rows = rows.map(r => ({ ...r, parent_value: r.parent_value ?? '' }));
  }

  const cols = Object.keys(rows[0]);
  const placeholders = cols.map(() => '?').join(',');
  const sql = `INSERT IGNORE INTO \`${tableName}\` (\`${cols.join('`,`')}\`) VALUES (${placeholders})`;

  let inserted = 0;
  for (const row of rows) {
    const values = cols.map(c => {
      const v = row[c];
      // Convert boolean-like values
      if (v === true) return 1;
      if (v === false) return 0;
      return v ?? null;
    });
    const [result] = await conn.query(sql, values);
    inserted += result.affectedRows;
  }

  console.log(`  ✓ ${tableName}: ${inserted}/${rows.length} rows imported`);
}

async function run() {
  if (!fs.existsSync(BACKUP_FILE)) {
    console.error(`❌  ${BACKUP_FILE} not found. Run export-sqlite.js first.`);
    process.exit(1);
  }

  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, 'utf8'));
  console.log(`\n📦  Importing from backup exported at: ${backup.exported_at}`);
  console.log(`    Source: ${backup.source || 'local'}\n`);

  const conn = await pool.getConnection();
  try {
    await conn.query('SET FOREIGN_KEY_CHECKS=0');

    for (const table of TABLE_ORDER) {
      const rows = backup.tables[table];
      if (rows === undefined) {
        console.log(`  ⚠  ${table}: not found in backup — skipped`);
        continue;
      }
      await importTable(conn, table, rows);
    }

    await conn.query('SET FOREIGN_KEY_CHECKS=1');
    console.log('\n✅  Import complete!');
  } catch (err) {
    await conn.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
    console.error('\n❌  Import failed:', err.message);
    process.exit(1);
  } finally {
    conn.release();
    await pool.end();
  }
}

run();
