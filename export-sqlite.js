'use strict';
const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cpr_sales.db');
const OUT_PATH = path.join(__dirname, 'backup.json');

const db = new Database(DB_PATH, { readonly: true });

const tables = [
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

const backup = { exported_at: new Date().toISOString(), tables: {} };

for (const table of tables) {
  try {
    const rows = db.prepare(`SELECT * FROM ${table}`).all();
    backup.tables[table] = rows;
    console.log(`  ✓ ${table}: ${rows.length} rows`);
  } catch (e) {
    // Table may not exist yet (migration-added tables)
    backup.tables[table] = [];
    console.log(`  ⚠  ${table}: skipped (${e.message})`);
  }
}

db.close();

fs.writeFileSync(OUT_PATH, JSON.stringify(backup, null, 2), 'utf8');

const sizeMB = (fs.statSync(OUT_PATH).size / 1024 / 1024).toFixed(2);
console.log(`\n✅  backup.json written — ${sizeMB} MB`);
console.log(`   Location: ${OUT_PATH}`);
console.log(`   Exported at: ${backup.exported_at}`);
