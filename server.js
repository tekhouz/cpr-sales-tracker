'use strict';
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const mysql = require('mysql2/promise');
const path = require('path');
const fs = require('fs');

// ── INVENTORY CONSTANTS ───────────────────────────────────────────────────────
const DEVICE_MODELS = {
  'iPhone Parts': ['iPhone 6','iPhone 6 Plus','iPhone 6S','iPhone 6S Plus','iPhone SE (1st Gen)','iPhone 7','iPhone 7 Plus','iPhone 8','iPhone 8 Plus','iPhone X','iPhone XR','iPhone XS','iPhone XS Max','iPhone SE (2nd Gen)','iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max','iPhone 12','iPhone 12 Mini','iPhone 12 Pro','iPhone 12 Pro Max','iPhone SE (3rd Gen)','iPhone 13','iPhone 13 Mini','iPhone 13 Pro','iPhone 13 Pro Max','iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max','iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max','iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 16e','iPhone 17','iPhone 17 Plus','iPhone 17 Pro','iPhone 17 Pro Max'],
  'Samsung Phone Parts': ['Galaxy S8','Galaxy S9','Galaxy S10','Galaxy S10e','Galaxy S20','Galaxy S20+','Galaxy S20 Ultra','Galaxy S20 FE','Galaxy S21','Galaxy S21+','Galaxy S21 Ultra','Galaxy S21 FE','Galaxy S22','Galaxy S22+','Galaxy S22 Ultra','Galaxy S23','Galaxy S23+','Galaxy S23 Ultra','Galaxy S23 FE','Galaxy S24','Galaxy S24+','Galaxy S24 Ultra','Galaxy S24 FE','Galaxy S25','Galaxy S25+','Galaxy S25 Ultra','Galaxy S25 Edge','Galaxy A13','Galaxy A14','Galaxy A14 5G','Galaxy A15','Galaxy A15 5G','Galaxy A16','Galaxy A23','Galaxy A24','Galaxy A25','Galaxy A32','Galaxy A33','Galaxy A34','Galaxy A35','Galaxy A52','Galaxy A53','Galaxy A54','Galaxy A55','Galaxy Z Flip 4','Galaxy Z Flip 5','Galaxy Z Flip 6','Galaxy Z Fold 4','Galaxy Z Fold 5','Galaxy Z Fold 6'],
  'Motorola Phone Parts': ['Moto G7','Moto G7 Plus','Moto G8','Moto G9','Moto G10','Moto G20','Moto G30','Moto G31','Moto G32','Moto G42','Moto G51','Moto G52','Moto G53','Moto G54','Moto G62','Moto G72','Moto G73','Moto G82','Moto G84','Moto G85','Moto G Power (2022)','Moto G Power (2023)','Moto G Power (2024)','Moto G Stylus (2022)','Moto G Stylus (2023)','Moto G Stylus (2024)','Moto Edge 20','Moto Edge 30','Moto Edge 40','Moto Edge 50','Moto Razr (2022)','Moto Razr (2023)','Moto Razr (2024)','Moto Razr+ (2023)','Moto Razr+ (2024)'],
  'iPad Parts': ['iPad (5th Gen)','iPad (6th Gen)','iPad (7th Gen)','iPad (8th Gen)','iPad (9th Gen)','iPad (10th Gen)','iPad Mini (4th Gen)','iPad Mini (5th Gen)','iPad Mini (6th Gen)','iPad Mini (7th Gen)'],
  'iPad Pro Parts': ['iPad Pro 9.7"','iPad Pro 10.5"','iPad Pro 11" (1st Gen)','iPad Pro 11" (2nd Gen)','iPad Pro 11" (3rd Gen)','iPad Pro 11" (4th Gen)','iPad Pro 12.9" (3rd Gen)','iPad Pro 12.9" (4th Gen)','iPad Pro 12.9" (5th Gen)','iPad Pro 12.9" (6th Gen)'],
  'iPad Air Parts': ['iPad Air (3rd Gen)','iPad Air (4th Gen)','iPad Air (5th Gen)','iPad Air 11" (M2)','iPad Air 13" (M2)'],
  'Macbook Air Parts': ['MacBook Air 13" (M1 2020)','MacBook Air 13" (M2 2022)','MacBook Air 15" (M2 2023)','MacBook Air 13" (M3 2024)','MacBook Air 15" (M3 2024)','MacBook Air 11" (2015)','MacBook Air 13" (2017)','MacBook Air 13" (2018)','MacBook Air 13" (2019)'],
  'Macbook Pro Parts': ['MacBook Pro 13" (2017)','MacBook Pro 13" (2018)','MacBook Pro 13" (2019)','MacBook Pro 13" (2020)','MacBook Pro 13" (M1 2020)','MacBook Pro 13" (M2 2022)','MacBook Pro 14" (M1 Pro 2021)','MacBook Pro 14" (M2 Pro 2023)','MacBook Pro 14" (M3 2023)','MacBook Pro 14" (M3 Pro 2023)','MacBook Pro 14" (M4 2024)','MacBook Pro 16" (2019)','MacBook Pro 16" (M1 Pro 2021)','MacBook Pro 16" (M2 Pro 2023)','MacBook Pro 16" (M3 Pro 2023)','MacBook Pro 16" (M4 Pro 2024)'],
  'Apple Devices': [
    'iPhone 6','iPhone 6 Plus','iPhone 6S','iPhone 6S Plus','iPhone SE (1st Gen)',
    'iPhone 7','iPhone 7 Plus','iPhone 8','iPhone 8 Plus','iPhone X',
    'iPhone XR','iPhone XS','iPhone XS Max','iPhone SE (2nd Gen)',
    'iPhone 11','iPhone 11 Pro','iPhone 11 Pro Max',
    'iPhone 12','iPhone 12 Mini','iPhone 12 Pro','iPhone 12 Pro Max',
    'iPhone SE (3rd Gen)',
    'iPhone 13','iPhone 13 Mini','iPhone 13 Pro','iPhone 13 Pro Max',
    'iPhone 14','iPhone 14 Plus','iPhone 14 Pro','iPhone 14 Pro Max',
    'iPhone 15','iPhone 15 Plus','iPhone 15 Pro','iPhone 15 Pro Max',
    'iPhone 16','iPhone 16 Plus','iPhone 16 Pro','iPhone 16 Pro Max','iPhone 16e',
    'iPhone 17','iPhone 17 Plus','iPhone 17 Pro','iPhone 17 Pro Max',
    'iPad (5th Gen)','iPad (6th Gen)','iPad (7th Gen)','iPad (8th Gen)','iPad (9th Gen)','iPad (10th Gen)',
    'iPad Mini (4th Gen)','iPad Mini (5th Gen)','iPad Mini (6th Gen)','iPad Mini (7th Gen)',
    'iPad Pro 9.7"','iPad Pro 10.5"',
    'iPad Pro 11" (1st Gen)','iPad Pro 11" (2nd Gen)','iPad Pro 11" (3rd Gen)','iPad Pro 11" (4th Gen)',
    'iPad Pro 12.9" (3rd Gen)','iPad Pro 12.9" (4th Gen)','iPad Pro 12.9" (5th Gen)','iPad Pro 12.9" (6th Gen)',
    'iPad Air (3rd Gen)','iPad Air (4th Gen)','iPad Air (5th Gen)','iPad Air 11" (M2)','iPad Air 13" (M2)',
    'MacBook Air 11" (2015)','MacBook Air 13" (2017)','MacBook Air 13" (2018)','MacBook Air 13" (2019)',
    'MacBook Air 13" (M1 2020)','MacBook Air 13" (M2 2022)','MacBook Air 15" (M2 2023)',
    'MacBook Air 13" (M3 2024)','MacBook Air 15" (M3 2024)',
    'MacBook Pro 13" (2017)','MacBook Pro 13" (2018)','MacBook Pro 13" (2019)','MacBook Pro 13" (2020)',
    'MacBook Pro 13" (M1 2020)','MacBook Pro 13" (M2 2022)',
    'MacBook Pro 14" (M1 Pro 2021)','MacBook Pro 14" (M2 Pro 2023)','MacBook Pro 14" (M3 2023)',
    'MacBook Pro 14" (M3 Pro 2023)','MacBook Pro 14" (M4 2024)',
    'MacBook Pro 16" (2019)','MacBook Pro 16" (M1 Pro 2021)','MacBook Pro 16" (M2 Pro 2023)',
    'MacBook Pro 16" (M3 Pro 2023)','MacBook Pro 16" (M4 Pro 2024)',
    'Magic Mouse','Magic Mouse 3','Magic Keyboard','Magic Keyboard with Touch ID','Magic Keyboard with Touch ID & Numeric Keypad',
    'Magic Trackpad','Magic Trackpad 3',
    'iPad Smart Keyboard','iPad Magic Keyboard','iPad Magic Keyboard Folio',
    'AirPods (2nd Gen)','AirPods (3rd Gen)','AirPods Pro (1st Gen)','AirPods Pro (2nd Gen)','AirPods Max',
    'Apple Watch Series 7','Apple Watch Series 8','Apple Watch Series 9','Apple Watch Series 10',
    'Apple Watch Ultra','Apple Watch Ultra 2','Apple Watch SE',
    'MagSafe Charger','USB-C Cable','Lightning Cable','Apple TV 4K','HomePod','HomePod Mini'
  ],
  'Samsung Devices': ['Galaxy S24','Galaxy S24+','Galaxy S24 Ultra','Galaxy S24 FE','Galaxy S25','Galaxy S25+','Galaxy S25 Ultra','Galaxy A15','Galaxy A15 5G','Galaxy A16','Galaxy A25','Galaxy A35','Galaxy A55','Galaxy Z Flip 6','Galaxy Z Fold 6'],
  'Accessories': ['AirPods (2nd Gen)','AirPods (3rd Gen)','AirPods Pro (1st Gen)','AirPods Pro (2nd Gen)','AirPods Max','Apple Watch Series 7','Apple Watch Series 8','Apple Watch Series 9','Apple Watch Ultra','Apple Watch SE','MagSafe Charger','USB-C Cable','Lightning Cable','Screen Protector','Phone Case','iPad Case','Power Bank','Wireless Charger','Car Mount','Bluetooth Speaker'],
  'Playstation Device': ['PlayStation 4','PlayStation 4 Slim','PlayStation 4 Pro','PlayStation 5','PlayStation 5 Slim','PlayStation 5 Digital Edition','PlayStation VR','PlayStation VR2','DualShock 4 Controller','DualSense Controller','DualSense Edge Controller','PlayStation Vita','Other PlayStation Device'],
  'Dell': ['Dell XPS 13','Dell XPS 15','Dell XPS 17','Dell Inspiron 14','Dell Inspiron 15','Dell Inspiron 16','Dell Latitude 5420','Dell Latitude 5520','Dell Latitude 7420','Dell Latitude 7520','Dell Vostro 14','Dell Vostro 15','Dell Alienware m15','Dell Alienware m17','Dell Alienware x14','Dell Alienware x15','Dell Alienware x16','Other Dell Model'],
  'HP': ['HP Spectre x360 13','HP Spectre x360 14','HP Spectre x360 15','HP Envy 13','HP Envy 14','HP Envy 15','HP Pavilion 14','HP Pavilion 15','HP EliteBook 840','HP EliteBook 850','HP ProBook 440','HP ProBook 450','HP OMEN 15','HP OMEN 16','HP Victus 15','HP Victus 16','Other HP Model'],
  'Lenovo': ['ThinkPad X1 Carbon','ThinkPad X1 Extreme','ThinkPad T14','ThinkPad T14s','ThinkPad T15','ThinkPad E14','ThinkPad E15','ThinkPad L14','ThinkPad L15','IdeaPad 3','IdeaPad 5','IdeaPad Slim 5','IdeaPad Slim 7','Legion 5','Legion 5 Pro','Legion 7','Yoga 7','Yoga 9','Yoga Slim 7','Other Lenovo Model'],
  'Nintendo': ['Nintendo Switch','Nintendo Switch Lite','Nintendo Switch OLED','Nintendo 3DS','Nintendo 3DS XL','Nintendo 2DS','New Nintendo 3DS','New Nintendo 3DS XL','Joy-Con Controllers','Nintendo Switch Pro Controller','Nintendo DS','Nintendo DS Lite','Other Nintendo Device'],
  'Others': ['Other'],
  'Repair Service Only': []
};

const PART_TYPES = {
  'BTRY':'Battery','SCRN':'Screen / LCD','DIGI':'Digitizer','CHPT':'Charging Port',
  'SPKR':'Speaker','HOUS':'Housing / Frame','BEZL':'Bezel','BCASE':'Back Case / Glass',
  'TCASE':'TPU Case','CMRA':'Camera','PROX':'Proximity Sensor','HMBT':'Home Button',
  'FRID':'Face ID Module','VBRT':'Vibrator Motor','MCRP':'Microphone','FLSH':'Flash','OTHER':'Other'
};

// ── MYSQL POOL ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 3000;

if (!process.env.MYSQLHOST) {
  console.warn('\n  ⚠️  MySQL env vars not set. Set MYSQLHOST, MYSQLPORT, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE in Railway Variables!\n');
}
if (!process.env.SESSION_SECRET) {
  console.warn('\n  ⚠️  SESSION_SECRET env var not set — using insecure default.\n');
}

const pool = mysql.createPool({
  host:     process.env.MYSQLHOST     || 'localhost',
  port:     parseInt(process.env.MYSQLPORT) || 3306,
  user:     process.env.MYSQLUSER     || 'root',
  password: process.env.MYSQLPASSWORD || '',
  database: process.env.MYSQLDATABASE || 'cpr_sales',
  waitForConnections: true,
  connectionLimit: 10,
  timezone: '+00:00',
  dateStrings: true,
});

// ── DB HELPERS ────────────────────────────────────────────────────────────────
async function dbGet(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows[0] || null;
}
async function dbAll(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}
async function dbRun(sql, params = []) {
  const [result] = await pool.query(sql, params);
  return result;
}
async function dbTx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
async function cGet(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows[0] || null;
}
async function cAll(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}
async function cRun(conn, sql, params = []) {
  const [result] = await conn.query(sql, params);
  return result;
}

// ── INIT DB ───────────────────────────────────────────────────────────────────
async function initDB() {
  const q = sql => pool.query(sql);

  await q(`CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    transaction_id VARCHAR(50) UNIQUE,
    category VARCHAR(100) NOT NULL,
    item_or_model TEXT,
    screen_type VARCHAR(100),
    imei_serial VARCHAR(100),
    quantity DOUBLE DEFAULT 1,
    unit_price DOUBLE DEFAULT 0,
    discount DOUBLE DEFAULT 0,
    tax DOUBLE DEFAULT 0,
    line_total DOUBLE DEFAULT 0,
    net_total DOUBLE DEFAULT 0,
    payment_method VARCHAR(100),
    customer_name VARCHAR(255),
    customer_phone VARCHAR(50),
    customer_email VARCHAR(255),
    repair_time VARCHAR(100),
    repair_type VARCHAR(100),
    issue TEXT,
    notes TEXT,
    cost_price DOUBLE DEFAULT 0,
    profit DOUBLE DEFAULT 0,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_txn_date (date),
    INDEX idx_txn_category (category),
    INDEX idx_txn_payment (payment_method)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    company_name VARCHAR(255),
    lead_type VARCHAR(100),
    lead_source VARCHAR(100),
    lead_status VARCHAR(50) DEFAULT 'No',
    category VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_leads_status (lead_status),
    INDEX idx_leads_type (lead_type),
    INDEX idx_leads_source (lead_source),
    INDEX idx_leads_category (category)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS cash_handover (
    id INT AUTO_INCREMENT PRIMARY KEY,
    date VARCHAR(10) NOT NULL,
    to_whom VARCHAR(255) NOT NULL,
    amount DOUBLE NOT NULL,
    received_date VARCHAR(10),
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100),
    email VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip VARCHAR(20),
    company_name VARCHAR(255),
    customer_type VARCHAR(50) DEFAULT 'Retail',
    preferred_contact VARCHAR(50),
    services_interested TEXT,
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_cust_phone (phone),
    INDEX idx_cust_email (email),
    INDEX idx_cust_type (customer_type)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS inventory_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    part_id VARCHAR(100) UNIQUE NOT NULL,
    asset_type VARCHAR(100),
    part_type VARCHAR(50),
    category VARCHAR(100),
    model VARCHAR(255),
    model_number VARCHAR(100),
    color VARCHAR(100),
    grade VARCHAR(50) DEFAULT 'OEM',
    status VARCHAR(50) DEFAULT 'Active',
    description TEXT,
    supplier VARCHAR(255),
    cost_price DOUBLE DEFAULT 0,
    sell_price DOUBLE DEFAULT 0,
    ram VARCHAR(50),
    storage VARCHAR(50),
    connectivity VARCHAR(100),
    serial_number VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_inv_status (status),
    INDEX idx_inv_asset (asset_type),
    INDEX idx_inv_part_type (part_type)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS inventory_stock (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT UNIQUE NOT NULL,
    quantity INT DEFAULT 0,
    min_quantity INT DEFAULT 1,
    location VARCHAR(255),
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS inventory_movements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    movement_type VARCHAR(20) NOT NULL,
    quantity INT NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(100),
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_mvt_item (item_id)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS inventory_batches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    item_id INT NOT NULL,
    cost_price DOUBLE NOT NULL DEFAULT 0,
    quantity_purchased INT NOT NULL DEFAULT 0,
    quantity_remaining INT NOT NULL DEFAULT 0,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE,
    INDEX idx_batch_item (item_id, created_at)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS purchase_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Draft',
    order_date VARCHAR(10),
    expected_date VARCHAR(10),
    received_date VARCHAR(10),
    total_amount DOUBLE DEFAULT 0,
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_po_status (status)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS po_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    po_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity_ordered INT NOT NULL,
    quantity_received INT DEFAULT 0,
    unit_cost DOUBLE DEFAULT 0,
    total_cost DOUBLE DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pr_number VARCHAR(50) UNIQUE NOT NULL,
    status VARCHAR(50) DEFAULT 'Pending',
    priority VARCHAR(50) DEFAULT 'Normal',
    needed_by_date VARCHAR(10),
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id),
    INDEX idx_pr_status (status)
  ) ENGINE=InnoDB`);

  await q(`CREATE TABLE IF NOT EXISTS pr_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    pr_id INT NOT NULL,
    item_id INT NOT NULL,
    quantity INT DEFAULT 1,
    estimated_cost DOUBLE DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
  ) ENGINE=InnoDB`);

  // parent_value is NOT NULL DEFAULT '' so UNIQUE index works without expression index
  await q(`CREATE TABLE IF NOT EXISTS lookup_options (
    id INT AUTO_INCREMENT PRIMARY KEY,
    group_name VARCHAR(100) NOT NULL,
    value VARCHAR(255) NOT NULL,
    label VARCHAR(255),
    parent_value VARCHAR(255) NOT NULL DEFAULT '',
    sort_order INT DEFAULT 0,
    is_active TINYINT DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY idx_lookup_unique (group_name, value, parent_value),
    INDEX idx_lookup_group (group_name, is_active)
  ) ENGINE=InnoDB`);

  console.log('  ✅ All tables ready');
  await seedUsers();
  await seedLookups();
}

// ── SEED USERS ────────────────────────────────────────────────────────────────
async function seedUsers() {
  const count = await dbGet('SELECT COUNT(*) as c FROM users');
  if (count.c > 0) return;
  await dbRun('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)',
    ['admin', bcrypt.hashSync('cpr2026', 10), 'Administrator', 'admin']);
  await dbRun('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)',
    ['staff', bcrypt.hashSync('staff2026', 10), 'Staff User', 'staff']);
  console.log('  ✅ Default users seeded');
}

// ── SEED LOOKUPS ──────────────────────────────────────────────────────────────
async function seedLookups() {
  const count = await dbGet('SELECT COUNT(*) as c FROM lookup_options');
  if (count.c > 0) return;

  const ins = (gName, val, label, parent, sort) =>
    pool.query(
      'INSERT IGNORE INTO lookup_options (group_name,value,label,parent_value,sort_order) VALUES (?,?,?,?,?)',
      [gName, val, label || null, parent || '', sort]
    );

  const groups = [
    ['category',       ['Repair','Accessories','Device Sale','Cases','Privacy Glass','Pre Order','Other']],
    ['payment_method', ['Cash','Square Mobile - Cash','Square Mobile','Square Console','RepairQ','Bank Zelle','PayPal','Other']],
    ['color',          ['Black','White','Silver','Space Gray','Gold','Rose Gold','Midnight','Starlight','Blue','Sky Blue','Storm Blue','Ultramarine','Purple','Lavender','Pink','Red (PRODUCT Red)','Yellow','Orange','Green','Teal','Coral','Moonbeam','Space Black','Natural Titanium','Blue Titanium','White Titanium','Black Titanium','Desert Titanium','Other']],
    ['screen_type',    ['LCD','OEM','Soft OLED','Hard OLED','Back Glass','Refurb Screen','iPad Digitizer','Other']],
    ['ram',            ['2GB','3GB','4GB','6GB','8GB','12GB','16GB','24GB','32GB','64GB','128GB']],
    ['storage',        ['16GB','32GB','64GB','128GB','256GB','512GB','1TB','2TB','4TB']],
    ['lead_source',    ['Walk-in','Phone Call','Website','Google Search','Yelp','Facebook','Instagram','Referral','T-Mobile Referral','AT&T Referral','Xfinity Referral','Other']],
  ];
  for (const [gName, items] of groups) {
    for (let i = 0; i < items.length; i++) await ins(gName, items[i], null, '', i);
  }

  const grades = [
    {value:'New',label:'New'},{value:'Open Box',label:'Open Box'},
    {value:'New Third Party',label:'New Third Party'},{value:'New OEM',label:'New OEM'},
    {value:'A',label:'A — Excellent'},{value:'B+',label:'B+ — Very Good'},
    {value:'B',label:'B — Good'},{value:'C',label:'C — Fair'},{value:'D',label:'D — Non Working'},
  ];
  for (let i = 0; i < grades.length; i++) await ins('grade', grades[i].value, grades[i].label, '', i);

  // Asset types
  const assetTypes = Object.keys(DEVICE_MODELS);
  for (let i = 0; i < assetTypes.length; i++) await ins('asset_type', assetTypes[i], null, '', i);

  // Models with parent = asset_type
  for (const [at, models] of Object.entries(DEVICE_MODELS)) {
    for (let i = 0; i < models.length; i++) await ins('model', models[i], null, at, i);
  }

  // Part types
  const ptEntries = Object.entries(PART_TYPES);
  for (let i = 0; i < ptEntries.length; i++) {
    const [code, label] = ptEntries[i];
    await ins('part_type', code, label, '', i);
  }

  console.log('  ✅ Lookup options seeded');
}

// ── FIFO HELPER ───────────────────────────────────────────────────────────────
async function fifoCost(itemId, qty, deduct = false, conn = null) {
  const exec = conn || pool;
  const [batches] = await exec.query(
    `SELECT * FROM inventory_batches WHERE item_id = ? AND quantity_remaining > 0 ORDER BY created_at ASC, id ASC`,
    [itemId]
  );

  let remaining = qty;
  let totalCost = 0;

  for (const b of batches) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, b.quantity_remaining);
    totalCost += used * b.cost_price;
    remaining -= used;
    if (deduct) {
      await exec.query(
        'UPDATE inventory_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?',
        [used, b.id]
      );
    }
  }

  if (remaining > 0) {
    const [items] = await exec.query('SELECT cost_price FROM inventory_items WHERE id = ?', [itemId]);
    totalCost += remaining * (items[0]?.cost_price || 0);
  }

  const unitCost = qty > 0 ? totalCost / qty : 0;
  return { unitCost: Math.round(unitCost * 10000) / 10000, totalCost: Math.round(totalCost * 100) / 100 };
}

// ── EXPRESS SETUP ─────────────────────────────────────────────────────────────
app.set('trust proxy', 1);
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: process.env.SESSION_SECRET || 'cpr-tracker-secret-key-2026',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};
const requireAdmin = (req, res, next) => {
  if (req.session.role !== 'admin') return res.status(403).json({ error: 'Admin only' });
  next();
};

// ── LOGIN RATE LIMITER ────────────────────────────────────────────────────────
const loginBucket = new Map();
function loginRateLimit(req, res, next) {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const entry = loginBucket.get(ip) || { count: 0, resetAt: now + 15 * 60 * 1000 };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + 15 * 60 * 1000; }
  entry.count++;
  loginBucket.set(ip, entry);
  if (entry.count > 10) {
    const wait = Math.ceil((entry.resetAt - now) / 1000 / 60);
    return res.status(429).json({ error: `Too many login attempts. Try again in ${wait} min.` });
  }
  next();
}
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of loginBucket) if (now > e.resetAt) loginBucket.delete(ip);
}, 20 * 60 * 1000);

// ── AUTH ──────────────────────────────────────────────────────────────────────
app.post('/api/auth/login', loginRateLimit, async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await dbGet('SELECT * FROM users WHERE username = ?', [username]);
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }
    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.role = user.role;
    res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, username, full_name as fullName, role FROM users WHERE id = ?', [req.session.userId]);
    res.json(user);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── TRANSACTIONS ──────────────────────────────────────────────────────────────
app.get('/api/transactions/next-id', requireAuth, async (req, res) => {
  try {
    const last = await dbGet(
      `SELECT transaction_id FROM transactions WHERE transaction_id LIKE 'DC_%'
       ORDER BY CAST(SUBSTRING(transaction_id,4) AS UNSIGNED) DESC LIMIT 1`
    );
    if (!last) return res.json({ nextId: 'DC_001' });
    const num = parseInt(last.transaction_id.replace('DC_', ''), 10) + 1;
    res.json({ nextId: `DC_${String(num).padStart(3, '0')}` });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/transactions', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date, category, payment_method, search } = req.query;
    let q = 'SELECT * FROM transactions WHERE 1=1';
    const p = [];
    if (start_date)     { q += ' AND date >= ?';  p.push(start_date); }
    if (end_date)       { q += ' AND date <= ?';  p.push(end_date); }
    if (category)       { q += ' AND category = ?'; p.push(category); }
    if (payment_method) { q += ' AND payment_method = ?'; p.push(payment_method); }
    if (search) {
      q += ' AND (customer_name LIKE ? OR item_or_model LIKE ? OR transaction_id LIKE ? OR notes LIKE ?)';
      const s = `%${search}%`;
      p.push(s, s, s, s);
    }
    q += ' ORDER BY date DESC, id DESC';
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/transactions', requireAuth, async (req, res) => {
  try {
    const t = req.body;
    const r = await dbRun(
      `INSERT INTO transactions
        (date,transaction_id,category,item_or_model,screen_type,repair_type,imei_serial,
         quantity,unit_price,discount,tax,line_total,net_total,
         payment_method,customer_name,customer_phone,customer_email,
         repair_time,issue,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        t.date, t.transaction_id||null, t.category, t.item_or_model||null,
        t.screen_type||null, t.repair_type||null, t.imei_serial||null,
        t.quantity??1, t.unit_price??0, t.discount??0, t.tax??0,
        t.line_total??0, t.net_total??0,
        t.payment_method||null, t.customer_name||null, t.customer_phone||null, t.customer_email||null,
        t.repair_time||null, t.issue||null, t.notes||null, req.session.userId
      ]
    );
    const savedId = r.insertId;
    let saved = await dbGet('SELECT * FROM transactions WHERE id=?', [savedId]);

    // Auto-upsert customer
    const rawName  = (t.customer_name  || '').trim();
    const rawPhone = (t.customer_phone || '').trim();
    const rawEmail = (t.customer_email || '').trim();
    const JUNK = ['', '-', 'no', 'n/a', 'na', 'unknown'];
    const validName  = rawName  && !JUNK.includes(rawName.toLowerCase());
    const validPhone = rawPhone && !JUNK.includes(rawPhone.toLowerCase());
    const validEmail = rawEmail && !JUNK.includes(rawEmail.toLowerCase()) && rawEmail.includes('@');

    if (validName && (validPhone || validEmail)) {
      let existing = null;
      if (validPhone) existing = await dbGet('SELECT id FROM customers WHERE phone = ?', [rawPhone]);
      if (!existing && validEmail) existing = await dbGet('SELECT id FROM customers WHERE email = ?', [rawEmail]);
      if (!existing) {
        const parts = rawName.split(/\s+/);
        await dbRun(
          'INSERT INTO customers (first_name,last_name,phone,email,created_by) VALUES (?,?,?,?,?)',
          [parts[0], parts.slice(1).join(' ')||null, validPhone?rawPhone:null, validEmail?rawEmail:null, req.session.userId]
        );
      } else {
        if (validPhone) await dbRun('UPDATE customers SET phone=? WHERE id=? AND (phone IS NULL OR phone="")', [rawPhone, existing.id]);
        if (validEmail) await dbRun('UPDATE customers SET email=? WHERE id=? AND (email IS NULL OR email="")', [rawEmail, existing.id]);
      }
    }

    // Repair service only
    if (t.repair_service_only) {
      const profit = Math.round((t.line_total||0) * 100) / 100;
      await dbRun('UPDATE transactions SET cost_price=0, profit=? WHERE id=?', [profit, savedId]);
    }

    // Decrement inventory + FIFO cost
    if (!t.repair_service_only && t.inventory_item_id) {
      const saleQty = parseFloat(t.quantity) || 1;
      const itemId  = parseInt(t.inventory_item_id);
      const txnRef  = saved.transaction_id || String(saved.id);

      const { totalCost } = await fifoCost(itemId, saleQty, true);
      const costPrice = parseFloat(t.cost_price) > 0 ? parseFloat(t.cost_price) : totalCost;
      const profit    = Math.round(((t.line_total||0) - costPrice) * 100) / 100;

      await dbRun('UPDATE transactions SET cost_price=?, profit=? WHERE id=?', [costPrice, profit, savedId]);

      const stockRow = await dbGet('SELECT id FROM inventory_stock WHERE item_id=?', [itemId]);
      if (stockRow) {
        await dbRun('UPDATE inventory_stock SET quantity=quantity-?, last_updated=NOW() WHERE item_id=?', [saleQty, itemId]);
      } else {
        await dbRun('INSERT INTO inventory_stock (item_id,quantity,min_quantity) VALUES (?,?,1)', [itemId, -saleQty]);
      }
      await dbRun(
        `INSERT INTO inventory_movements (item_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
         VALUES (?,'OUT',?,'SALE',?,?,?)`,
        [itemId, saleQty, txnRef, `${t.category} — TXN ${txnRef}`, req.session.userId]
      );
    }

    saved = await dbGet('SELECT * FROM transactions WHERE id=?', [savedId]);
    res.status(201).json(saved);
  } catch (err) {
    if (err.message.includes('Duplicate') || err.message.includes('UNIQUE')) {
      return res.status(400).json({ error: 'Transaction ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM transactions WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    const t = req.body;
    await dbRun(
      `UPDATE transactions SET
        date=?,transaction_id=?,category=?,item_or_model=?,screen_type=?,imei_serial=?,
        quantity=?,unit_price=?,discount=?,tax=?,line_total=?,net_total=?,payment_method=?,
        customer_name=?,customer_phone=?,customer_email=?,repair_type=?,repair_time=?,issue=?,notes=?
       WHERE id=?`,
      [t.date,t.transaction_id,t.category,t.item_or_model,t.screen_type,t.imei_serial,
       t.quantity,t.unit_price,t.discount,t.tax,t.line_total,t.net_total,t.payment_method,
       t.customer_name,t.customer_phone,t.customer_email,t.repair_type,t.repair_time,t.issue,t.notes,
       req.params.id]
    );
    res.json(await dbGet('SELECT * FROM transactions WHERE id=?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/transactions/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM transactions WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SUMMARY / REPORTS ─────────────────────────────────────────────────────────
app.get('/api/summary/kpi', requireAuth, async (req, res) => {
  try {
    const today      = localDate();
    const weekStart  = getWeekStart(today);
    const monthStart = today.slice(0, 8) + '01';

    const q = (start, end) => dbGet(
      `SELECT COUNT(*) as count, COALESCE(SUM(net_total),0) as revenue, COALESCE(SUM(profit),0) as profit
       FROM transactions WHERE date >= ? AND date <= ?`, [start, end]
    );

    const [todayR, weekR, monthR, cashReceived, cashHandedOver] = await Promise.all([
      q(today, today),
      q(weekStart, today),
      q(monthStart, today),
      dbGet(`SELECT COALESCE(SUM(net_total),0) as total FROM transactions WHERE payment_method IN ('Cash','Square Mobile - Cash')`),
      dbGet(`SELECT COALESCE(SUM(amount),0) as total FROM cash_handover`),
    ]);

    res.json({
      today: todayR, week: weekR, month: monthR,
      cashInHand: cashReceived.total - cashHandedOver.total
    });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/summary', requireAuth, async (req, res) => {
  try {
    const { type, date, start_date, end_date } = req.query;
    const target = date || localDate();
    let startDate, endDate;

    if (type === 'daily')        { startDate = endDate = target; }
    else if (type === 'weekly')  { startDate = getWeekStart(target); endDate = getWeekEnd(target); }
    else if (type === 'monthly') { startDate = target.slice(0,8)+'01'; endDate = getMonthEnd(target); }
    else                         { startDate = start_date || target; endDate = end_date || target; }

    const [totals, byCategory, byPayment, byDate, cashInPeriod] = await Promise.all([
      dbGet(`SELECT COUNT(*) as transaction_count,COALESCE(SUM(quantity),0) as total_quantity,
             COALESCE(SUM(line_total),0) as total_line,COALESCE(SUM(tax),0) as total_tax,
             COALESCE(SUM(net_total),0) as total_net,COALESCE(SUM(cost_price),0) as total_cost,
             COALESCE(SUM(profit),0) as total_profit FROM transactions WHERE date >= ? AND date <= ?`,
        [startDate, endDate]),
      dbAll(`SELECT category,COUNT(*) as count,COALESCE(SUM(line_total),0) as line_total,
             COALESCE(SUM(net_total),0) as net_total,COALESCE(SUM(cost_price),0) as total_cost,
             COALESCE(SUM(profit),0) as total_profit FROM transactions WHERE date >= ? AND date <= ?
             GROUP BY category ORDER BY net_total DESC`, [startDate, endDate]),
      dbAll(`SELECT payment_method,COUNT(*) as count,COALESCE(SUM(net_total),0) as net_total
             FROM transactions WHERE date >= ? AND date <= ?
             GROUP BY payment_method ORDER BY net_total DESC`, [startDate, endDate]),
      dbAll(`SELECT date,COUNT(*) as count,COALESCE(SUM(line_total),0) as line_total,
             COALESCE(SUM(net_total),0) as net_total,COALESCE(SUM(cost_price),0) as total_cost,
             COALESCE(SUM(profit),0) as total_profit FROM transactions WHERE date >= ? AND date <= ?
             GROUP BY date ORDER BY date`, [startDate, endDate]),
      dbGet(`SELECT COALESCE(SUM(net_total),0) as total FROM transactions
             WHERE payment_method IN ('Cash','Square Mobile - Cash') AND date >= ? AND date <= ?`,
        [startDate, endDate]),
    ]);

    res.json({ period: { type, startDate, endDate }, totals, byCategory, byPayment, byDate, cashInPeriod: cashInPeriod.total });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CASH ──────────────────────────────────────────────────────────────────────
app.get('/api/cash/balance', requireAuth, async (req, res) => {
  try {
    const [received, handedOver] = await Promise.all([
      dbGet(`SELECT COALESCE(SUM(net_total),0) as t FROM transactions WHERE payment_method IN ('Cash','Square Mobile - Cash')`),
      dbGet(`SELECT COALESCE(SUM(amount),0) as t FROM cash_handover`),
    ]);
    res.json({ totalReceived: received.t, totalHandedOver: handedOver.t, balance: received.t - handedOver.t });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cash/transactions', requireAuth, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    let q = `SELECT * FROM transactions WHERE payment_method IN ('Cash','Square Mobile - Cash')`;
    const p = [];
    if (start_date) { q += ' AND date >= ?'; p.push(start_date); }
    if (end_date)   { q += ' AND date <= ?'; p.push(end_date); }
    q += ' ORDER BY date DESC, id DESC';
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/cash/handovers', requireAuth, async (req, res) => {
  try { res.json(await dbAll('SELECT * FROM cash_handover ORDER BY date DESC')); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/cash/handovers', requireAuth, async (req, res) => {
  try {
    const { date, to_whom, amount, received_date, notes } = req.body;
    const r = await dbRun(
      'INSERT INTO cash_handover (date,to_whom,amount,received_date,notes,created_by) VALUES (?,?,?,?,?,?)',
      [date, to_whom, parseFloat(amount), received_date||null, notes||null, req.session.userId]
    );
    res.status(201).json(await dbGet('SELECT * FROM cash_handover WHERE id=?', [r.insertId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/cash/handovers/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM cash_handover WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── CUSTOMERS ─────────────────────────────────────────────────────────────────
app.get('/api/customers/summary', requireAuth, async (req, res) => {
  try {
    const ms = localDate().slice(0,8) + '01';
    const joinCond = `(c.phone != '' AND c.phone IS NOT NULL AND t.customer_phone = c.phone)
                   OR (c.email != '' AND c.email IS NOT NULL AND t.customer_email = c.email)`;
    const [total, newMonth, withTxns, revenue] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM customers'),
      dbGet('SELECT COUNT(*) as c FROM customers WHERE DATE(created_at) >= ?', [ms]),
      dbGet(`SELECT COUNT(DISTINCT c.id) as c FROM customers c INNER JOIN transactions t ON (${joinCond})`),
      dbGet(`SELECT COALESCE(SUM(t.net_total),0) as v FROM customers c INNER JOIN transactions t ON (${joinCond})`),
    ]);
    res.json({ total: total.c, newMonth: newMonth.c, withTxns: withTxns.c, revenue: revenue.v });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers', requireAuth, async (req, res) => {
  try {
    const { search, customer_type, city } = req.query;
    let q = `
      SELECT c.*,
        COUNT(DISTINCT t.id) AS total_visits,
        COALESCE(SUM(t.net_total),0) AS total_spent,
        MAX(t.date) AS last_visit,
        GROUP_CONCAT(DISTINCT t.category) AS categories_used
      FROM customers c
      LEFT JOIN transactions t ON (
        (c.phone != '' AND c.phone IS NOT NULL AND t.customer_phone = c.phone) OR
        (c.email != '' AND c.email IS NOT NULL AND t.customer_email = c.email)
      )
      WHERE 1=1
    `;
    const p = [];
    if (search) {
      q += ' AND (c.first_name LIKE ? OR c.last_name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company_name LIKE ? OR c.city LIKE ?)';
      const s = `%${search}%`;
      p.push(s, s, s, s, s, s);
    }
    if (customer_type) { q += ' AND c.customer_type = ?'; p.push(customer_type); }
    if (city)          { q += ' AND c.city LIKE ?';       p.push(`%${city}%`); }
    q += ' GROUP BY c.id ORDER BY last_visit DESC, c.created_at DESC';
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/customers', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const r = await dbRun(
      `INSERT INTO customers (first_name,last_name,email,phone,address,city,state,zip,
        company_name,customer_type,preferred_contact,services_interested,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.first_name||null,d.last_name||null,d.email||null,d.phone||null,
       d.address||null,d.city||null,d.state||null,d.zip||null,
       d.company_name||null,d.customer_type||'Retail',
       d.preferred_contact||null,d.services_interested||null,d.notes||null,req.session.userId]
    );
    res.status(201).json(await dbGet('SELECT * FROM customers WHERE id=?', [r.insertId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM customers WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    await dbRun(
      `UPDATE customers SET first_name=?,last_name=?,email=?,phone=?,address=?,city=?,state=?,zip=?,
        company_name=?,customer_type=?,preferred_contact=?,services_interested=?,notes=?,updated_at=NOW()
       WHERE id=?`,
      [d.first_name||null,d.last_name||null,d.email||null,d.phone||null,
       d.address||null,d.city||null,d.state||null,d.zip||null,
       d.company_name||null,d.customer_type||'Retail',
       d.preferred_contact||null,d.services_interested||null,d.notes||null,req.params.id]
    );
    res.json(await dbGet('SELECT * FROM customers WHERE id=?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/customers/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM customers WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/customers/:id/history', requireAuth, async (req, res) => {
  try {
    const c = await dbGet('SELECT phone, email FROM customers WHERE id=?', [req.params.id]);
    if (!c) return res.status(404).json({ error: 'Not found' });
    const rows = await dbAll(
      `SELECT * FROM transactions
       WHERE (? != '' AND ? IS NOT NULL AND customer_phone = ?)
          OR (? != '' AND ? IS NOT NULL AND customer_email = ?)
       ORDER BY date DESC`,
      [c.phone||'',c.phone,c.phone||'',c.email||'',c.email,c.email||'']
    );
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── LEADS ─────────────────────────────────────────────────────────────────────
app.get('/api/leads/summary', requireAuth, async (req, res) => {
  try {
    const [total, converted, notYet, hold] = await Promise.all([
      dbGet('SELECT COUNT(*) as c FROM leads'),
      dbGet("SELECT COUNT(*) as c FROM leads WHERE lead_status='Yes'"),
      dbGet("SELECT COUNT(*) as c FROM leads WHERE lead_status='No'"),
      dbGet("SELECT COUNT(*) as c FROM leads WHERE lead_status='Hold'"),
    ]);
    res.json({ total: total.c, converted: converted.c, notYet: notYet.c, hold: hold.c });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leads', requireAuth, async (req, res) => {
  try {
    const { search, lead_type, lead_source, lead_status, category } = req.query;
    let q = 'SELECT * FROM leads WHERE 1=1';
    const p = [];
    if (lead_type)   { q += ' AND lead_type = ?';   p.push(lead_type); }
    if (lead_source) { q += ' AND lead_source = ?';  p.push(lead_source); }
    if (lead_status) { q += ' AND lead_status = ?';  p.push(lead_status); }
    if (category)    { q += ' AND category = ?';     p.push(category); }
    if (search) {
      q += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ? OR company_name LIKE ?)';
      const s = `%${search}%`;
      p.push(s, s, s, s, s);
    }
    q += ' ORDER BY created_at DESC';
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/leads', requireAuth, async (req, res) => {
  try {
    const l = req.body;
    const r = await dbRun(
      `INSERT INTO leads (first_name,last_name,email,phone,company_name,lead_type,lead_source,lead_status,category,notes,created_by)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [l.first_name||null,l.last_name||null,l.email||null,l.phone||null,l.company_name||null,
       l.lead_type||null,l.lead_source||null,l.lead_status||'No',l.category||null,l.notes||null,req.session.userId]
    );
    res.status(201).json(await dbGet('SELECT * FROM leads WHERE id=?', [r.insertId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    const row = await dbGet('SELECT * FROM leads WHERE id=?', [req.params.id]);
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    const l = req.body;
    await dbRun(
      `UPDATE leads SET first_name=?,last_name=?,email=?,phone=?,company_name=?,lead_type=?,
        lead_source=?,lead_status=?,category=?,notes=?,updated_at=NOW() WHERE id=?`,
      [l.first_name||null,l.last_name||null,l.email||null,l.phone||null,l.company_name||null,
       l.lead_type||null,l.lead_source||null,l.lead_status||'No',l.category||null,l.notes||null,req.params.id]
    );
    res.json(await dbGet('SELECT * FROM leads WHERE id=?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/leads/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM leads WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── INVENTORY ─────────────────────────────────────────────────────────────────
app.get('/api/inventory/items/meta', requireAuth, async (req, res) => {
  try {
    const [assetRows, modelRows, partRows] = await Promise.all([
      dbAll(`SELECT value FROM lookup_options WHERE group_name='asset_type' AND is_active=1 ORDER BY sort_order,value`),
      dbAll(`SELECT value,parent_value FROM lookup_options WHERE group_name='model' AND is_active=1 ORDER BY sort_order,value`),
      dbAll(`SELECT value as code, COALESCE(label,value) as label FROM lookup_options WHERE group_name='part_type' AND is_active=1 ORDER BY sort_order,value`),
    ]);
    const assetTypes = assetRows.map(r => r.value);
    const deviceModels = {};
    for (const at of assetTypes) {
      deviceModels[at] = modelRows.filter(m => m.parent_value === at).map(m => m.value);
    }
    if (!deviceModels['Repair Service Only']) deviceModels['Repair Service Only'] = [];
    res.json({ assetTypes, partTypes: partRows, deviceModels });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/fifo-cost', requireAuth, async (req, res) => {
  try {
    const itemId = parseInt(req.query.item_id);
    const qty    = parseFloat(req.query.quantity) || 1;
    if (!itemId) return res.json({ unitCost: 0, totalCost: 0 });
    res.json(await fifoCost(itemId, qty, false));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/lookup', requireAuth, async (req, res) => {
  try {
    const { asset_type, model, color, grade, part_type } = req.query;
    if (!model) return res.json(null);
    let q = `SELECT i.*, s.quantity, s.min_quantity, s.location
             FROM inventory_items i LEFT JOIN inventory_stock s ON s.item_id = i.id
             WHERE i.status = 'Active'`;
    const params = [];
    if (asset_type) { q += ' AND i.asset_type = ?'; params.push(asset_type); }
    q += ' AND i.model = ?'; params.push(model);
    if (part_type)  { q += ' AND i.part_type = ?';  params.push(part_type); }
    q += ` ORDER BY
      (CASE WHEN ? != '' AND i.color = ? THEN 2 ELSE 0 END) +
      (CASE WHEN ? != '' AND i.grade = ? THEN 2 ELSE 0 END) DESC LIMIT 1`;
    params.push(color||'',color||'',grade||'',grade||'');
    res.json(await dbGet(q, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/stock/check', requireAuth, async (req, res) => {
  try {
    const { model, part_type } = req.query;
    let q = `SELECT i.*, s.quantity, s.min_quantity, s.location
             FROM inventory_items i JOIN inventory_stock s ON s.item_id = i.id
             WHERE i.status = 'Active'`;
    const p = [];
    if (model)     { q += ' AND i.model = ?';     p.push(model); }
    if (part_type) { q += ' AND i.part_type = ?'; p.push(part_type); }
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/items', requireAuth, async (req, res) => {
  try {
    const { asset_type, part_type, model, status, search } = req.query;
    let q = `
      SELECT i.*, s.quantity, s.min_quantity, s.location, s.last_updated,
             COALESCE(m.qty_used,0) AS qty_used,
             (COALESCE(s.quantity,0) + COALESCE(m.qty_used,0)) AS total_qoh
      FROM inventory_items i
      LEFT JOIN inventory_stock s ON s.item_id = i.id
      LEFT JOIN (
        SELECT item_id, SUM(quantity) AS qty_used FROM inventory_movements
        WHERE movement_type='OUT' GROUP BY item_id
      ) m ON m.item_id = i.id
      WHERE 1=1
    `;
    const p = [];
    if (asset_type) { q += ' AND i.asset_type = ?'; p.push(asset_type); }
    if (part_type)  { q += ' AND i.part_type = ?';  p.push(part_type); }
    if (model)      { q += ' AND i.model = ?';       p.push(model); }
    if (status)     { q += ' AND i.status = ?';      p.push(status); }
    if (search) {
      q += ' AND (i.part_id LIKE ? OR i.model LIKE ? OR i.description LIKE ? OR i.supplier LIKE ?)';
      const s = `%${search}%`;
      p.push(s, s, s, s);
    }
    q += ' ORDER BY i.asset_type, i.model, i.part_type';
    res.json(await dbAll(q, p));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/items', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    const r = await dbRun(
      `INSERT INTO inventory_items
        (part_id,asset_type,part_type,category,model,model_number,color,grade,status,
         description,supplier,cost_price,sell_price,ram,storage,connectivity,serial_number)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [d.part_id,d.asset_type||null,d.part_type||null,d.category||null,d.model||null,d.model_number||null,
       d.color||null,d.grade||null,d.status||'Active',d.description||null,d.supplier||null,
       parseFloat(d.cost_price)||0,parseFloat(d.sell_price)||0,
       d.ram||null,d.storage||null,d.connectivity||null,d.serial_number||null]
    );
    await dbRun('INSERT INTO inventory_stock (item_id,quantity,min_quantity,location) VALUES (?,0,?,?)',
      [r.insertId, parseInt(d.min_quantity)||1, d.location||null]);
    const item = await dbGet(
      'SELECT i.*, s.quantity, s.min_quantity, s.location FROM inventory_items i LEFT JOIN inventory_stock s ON s.item_id=i.id WHERE i.id=?',
      [r.insertId]
    );
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('Duplicate') || err.message.includes('UNIQUE'))
      return res.status(400).json({ error: 'Part ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/inventory/items/:id', requireAuth, async (req, res) => {
  try {
    const d = req.body;
    await dbRun(
      `UPDATE inventory_items SET part_id=?,asset_type=?,part_type=?,category=?,model=?,model_number=?,
        color=?,grade=?,status=?,description=?,supplier=?,cost_price=?,sell_price=?,
        ram=?,storage=?,connectivity=?,serial_number=? WHERE id=?`,
      [d.part_id,d.asset_type||null,d.part_type||null,d.category||null,d.model||null,d.model_number||null,
       d.color||null,d.grade||null,d.status||'Active',d.description||null,d.supplier||null,
       parseFloat(d.cost_price)||0,parseFloat(d.sell_price)||0,
       d.ram||null,d.storage||null,d.connectivity||null,d.serial_number||null,req.params.id]
    );
    await dbRun('UPDATE inventory_stock SET min_quantity=?,location=?,last_updated=NOW() WHERE item_id=?',
      [parseInt(d.min_quantity)||1, d.location||null, req.params.id]);
    res.json(await dbGet(
      'SELECT i.*, s.quantity, s.min_quantity, s.location FROM inventory_items i LEFT JOIN inventory_stock s ON s.item_id=i.id WHERE i.id=?',
      [req.params.id]
    ));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/items/:id', requireAuth, async (req, res) => {
  try {
    await dbRun('DELETE FROM inventory_items WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/stock/:itemId/adjust', requireAuth, async (req, res) => {
  try {
    const { quantity, movement_type, notes, cost_price } = req.body;
    const qty    = parseInt(quantity) || 0;
    const itemId = parseInt(req.params.itemId);
    const stock  = await dbGet('SELECT * FROM inventory_stock WHERE item_id=?', [itemId]);
    if (!stock) return res.status(404).json({ error: 'Item not found' });

    let newQty;
    if (movement_type === 'IN')       newQty = stock.quantity + qty;
    else if (movement_type === 'OUT') newQty = stock.quantity - qty;
    else                              newQty = qty;

    await dbRun('UPDATE inventory_stock SET quantity=?,last_updated=NOW() WHERE item_id=?', [newQty, itemId]);
    await dbRun(
      `INSERT INTO inventory_movements (item_id,movement_type,quantity,reference_type,notes,created_by)
       VALUES (?,?,?,'ADJUSTMENT',?,?)`,
      [itemId, movement_type, qty, notes||null, req.session.userId]
    );

    if (movement_type === 'IN' && qty > 0) {
      const item = await dbGet('SELECT cost_price FROM inventory_items WHERE id=?', [itemId]);
      const unitCost = parseFloat(cost_price) || item?.cost_price || 0;
      await dbRun(
        'INSERT INTO inventory_batches (item_id,cost_price,quantity_purchased,quantity_remaining,notes) VALUES (?,?,?,?,?)',
        [itemId, unitCost, qty, qty, notes||'Manual stock-in']
      );
    }

    res.json({ ok: true, newQuantity: newQty });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────
app.get('/api/inventory/po', requireAuth, async (req, res) => {
  try {
    res.json(await dbAll(
      `SELECT p.*, ANY_VALUE(u.full_name) as created_by_name, COUNT(pi.id) as item_count
       FROM purchase_orders p
       LEFT JOIN users u ON u.id = p.created_by
       LEFT JOIN po_items pi ON pi.po_id = p.id
       GROUP BY p.id ORDER BY p.created_at DESC`
    ));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/po', requireAuth, async (req, res) => {
  try {
    const { supplier, order_date, expected_date, notes, items } = req.body;
    const last = await dbGet('SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (last) { const m = last.po_number.match(/PO_(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
    const po_number    = `PO_${String(nextNum).padStart(3,'0')}`;
    const total_amount = (items||[]).reduce((s,i) => s + (parseFloat(i.unit_cost)||0)*(parseInt(i.quantity_ordered)||0), 0);

    const r = await dbRun(
      'INSERT INTO purchase_orders (po_number,supplier,order_date,expected_date,total_amount,notes,created_by) VALUES (?,?,?,?,?,?,?)',
      [po_number,supplier||null,order_date||null,expected_date||null,total_amount,notes||null,req.session.userId]
    );
    const poId = r.insertId;
    for (const item of (items||[])) {
      const qty = parseInt(item.quantity_ordered)||0;
      const cost = parseFloat(item.unit_cost)||0;
      await dbRun('INSERT INTO po_items (po_id,item_id,quantity_ordered,unit_cost,total_cost) VALUES (?,?,?,?,?)',
        [poId, item.item_id, qty, cost, qty*cost]);
    }
    res.status(201).json(await dbGet('SELECT * FROM purchase_orders WHERE id=?', [poId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/po/:id', requireAuth, async (req, res) => {
  try {
    const po = await dbGet(
      'SELECT p.*, ANY_VALUE(u.full_name) as created_by_name FROM purchase_orders p LEFT JOIN users u ON u.id=p.created_by WHERE p.id=? GROUP BY p.id',
      [req.params.id]
    );
    if (!po) return res.status(404).json({ error: 'Not found' });
    po.items = await dbAll(
      'SELECT pi.*, i.part_id, i.model, i.part_type, i.asset_type, i.color, i.grade FROM po_items pi JOIN inventory_items i ON i.id=pi.item_id WHERE pi.po_id=?',
      [req.params.id]
    );
    res.json(po);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventory/po/:id', requireAuth, async (req, res) => {
  try {
    const { supplier, order_date, expected_date, received_date, status, notes } = req.body;
    await dbRun(
      'UPDATE purchase_orders SET supplier=?,order_date=?,expected_date=?,received_date=?,status=?,notes=? WHERE id=?',
      [supplier||null,order_date||null,expected_date||null,received_date||null,status||'Draft',notes||null,req.params.id]
    );
    res.json(await dbGet('SELECT * FROM purchase_orders WHERE id=?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/po/:id/receive', requireAuth, async (req, res) => {
  try {
    const poId = req.params.id;
    const po = await dbGet('SELECT * FROM purchase_orders WHERE id=?', [poId]);
    if (!po) return res.status(404).json({ error: 'Not found' });

    const poItems = await dbAll('SELECT * FROM po_items WHERE po_id=?', [poId]);
    await dbTx(async conn => {
      for (const item of poItems) {
        const qty = item.quantity_ordered - item.quantity_received;
        if (qty <= 0) continue;
        await cRun(conn, 'UPDATE po_items SET quantity_received=quantity_ordered WHERE id=?', [item.id]);
        await cRun(conn, 'UPDATE inventory_stock SET quantity=quantity+?,last_updated=NOW() WHERE item_id=?', [qty, item.item_id]);
        await cRun(conn,
          `INSERT INTO inventory_movements (item_id,movement_type,quantity,reference_type,reference_id,notes,created_by)
           VALUES (?,'IN',?,'PO',?,?,?)`,
          [item.item_id, qty, po.po_number, `Received from PO ${po.po_number}`, req.session.userId]
        );
        const invItem = await cGet(conn, 'SELECT cost_price FROM inventory_items WHERE id=?', [item.item_id]);
        const unitCost = item.unit_cost || invItem?.cost_price || 0;
        await cRun(conn,
          'INSERT INTO inventory_batches (item_id,cost_price,quantity_purchased,quantity_remaining,notes) VALUES (?,?,?,?,?)',
          [item.item_id, unitCost, qty, qty, `PO ${po.po_number}`]
        );
      }
      await cRun(conn, `UPDATE purchase_orders SET status='Received',received_date=? WHERE id=?`, [localDate(), poId]);
    });
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/po/:id', requireAuth, async (req, res) => {
  try {
    const po = await dbGet('SELECT status FROM purchase_orders WHERE id=?', [req.params.id]);
    if (!po) return res.status(404).json({ error: 'Not found' });
    if (po.status !== 'Draft') return res.status(400).json({ error: 'Only Draft POs can be deleted' });
    await dbRun('DELETE FROM purchase_orders WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── PURCHASE REQUISITIONS ─────────────────────────────────────────────────────
app.get('/api/inventory/pr', requireAuth, async (req, res) => {
  try {
    res.json(await dbAll(
      `SELECT r.*, ANY_VALUE(u.full_name) as created_by_name, COUNT(ri.id) as item_count
       FROM purchase_requisitions r
       LEFT JOIN users u ON u.id = r.created_by
       LEFT JOIN pr_items ri ON ri.pr_id = r.id
       GROUP BY r.id ORDER BY r.created_at DESC`
    ));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventory/pr', requireAuth, async (req, res) => {
  try {
    const { priority, needed_by_date, notes, items } = req.body;
    const last = await dbGet('SELECT pr_number FROM purchase_requisitions ORDER BY id DESC LIMIT 1');
    let nextNum = 1;
    if (last) { const m = last.pr_number.match(/PR_(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
    const pr_number = `PR_${String(nextNum).padStart(3,'0')}`;

    const r = await dbRun(
      'INSERT INTO purchase_requisitions (pr_number,priority,needed_by_date,notes,created_by) VALUES (?,?,?,?,?)',
      [pr_number, priority||'Normal', needed_by_date||null, notes||null, req.session.userId]
    );
    const prId = r.insertId;
    for (const item of (items||[])) {
      await dbRun('INSERT INTO pr_items (pr_id,item_id,quantity,estimated_cost,notes) VALUES (?,?,?,?,?)',
        [prId, item.item_id, parseInt(item.quantity)||1, parseFloat(item.estimated_cost)||0, item.notes||null]);
    }
    res.status(201).json(await dbGet('SELECT * FROM purchase_requisitions WHERE id=?', [prId]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/inventory/pr/:id', requireAuth, async (req, res) => {
  try {
    const pr = await dbGet(
      'SELECT r.*, ANY_VALUE(u.full_name) as created_by_name FROM purchase_requisitions r LEFT JOIN users u ON u.id=r.created_by WHERE r.id=? GROUP BY r.id',
      [req.params.id]
    );
    if (!pr) return res.status(404).json({ error: 'Not found' });
    pr.items = await dbAll(
      `SELECT ri.*, i.part_id, i.model, i.part_type, i.asset_type, i.color, i.grade
       FROM pr_items ri JOIN inventory_items i ON i.id=ri.item_id WHERE ri.pr_id=?`,
      [req.params.id]
    );
    res.json(pr);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventory/pr/:id/status', requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const pr = await dbGet('SELECT * FROM purchase_requisitions WHERE id=?', [req.params.id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });

    if (status === 'Converted') {
      const prItems = await dbAll('SELECT * FROM pr_items WHERE pr_id=?', [req.params.id]);
      const last = await dbGet('SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1');
      let nextNum = 1;
      if (last) { const m = last.po_number.match(/PO_(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
      const po_number = `PO_${String(nextNum).padStart(3,'0')}`;

      const poR = await dbRun(
        'INSERT INTO purchase_orders (po_number,notes,created_by) VALUES (?,?,?)',
        [po_number, `Converted from ${pr.pr_number}`, req.session.userId]
      );
      const poId = poR.insertId;
      for (const item of prItems) {
        await dbRun('INSERT INTO po_items (po_id,item_id,quantity_ordered,unit_cost,total_cost) VALUES (?,?,?,?,?)',
          [poId, item.item_id, item.quantity, item.estimated_cost, item.quantity * item.estimated_cost]);
      }
      await dbRun('UPDATE purchase_orders SET total_amount=(SELECT SUM(total_cost) FROM po_items WHERE po_id=?) WHERE id=?', [poId, poId]);
    }

    await dbRun('UPDATE purchase_requisitions SET status=? WHERE id=?', [status, req.params.id]);
    res.json(await dbGet('SELECT * FROM purchase_requisitions WHERE id=?', [req.params.id]));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventory/pr/:id', requireAuth, async (req, res) => {
  try {
    const pr = await dbGet('SELECT status FROM purchase_requisitions WHERE id=?', [req.params.id]);
    if (!pr) return res.status(404).json({ error: 'Not found' });
    if (pr.status !== 'Pending') return res.status(400).json({ error: 'Only Pending PRs can be deleted' });
    await dbRun('DELETE FROM purchase_requisitions WHERE id=?', [req.params.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── SETTINGS / LOOKUP OPTIONS ─────────────────────────────────────────────────
app.get('/api/settings/options', requireAuth, async (req, res) => {
  try {
    const { group, all } = req.query;
    const conditions = [];
    const params = [];
    if (!all) { conditions.push('is_active=1'); }
    if (group) { conditions.push('group_name=?'); params.push(group); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    res.json(await dbAll(`SELECT * FROM lookup_options ${where} ORDER BY group_name, sort_order, value`, params));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/settings/groups', requireAuth, async (req, res) => {
  try {
    res.json(await dbAll('SELECT group_name, COUNT(*) as total, SUM(is_active) as active FROM lookup_options GROUP BY group_name ORDER BY group_name'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/settings/options', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { group_name, value, label, parent_value } = req.body || {};
    if (!group_name || !value?.trim()) return res.status(400).json({ error: 'group_name and value are required' });
    const pv = parent_value || '';
    const maxRow = await dbGet('SELECT MAX(sort_order) as m FROM lookup_options WHERE group_name=? AND parent_value=?', [group_name, pv]);
    const sort_order = (maxRow?.m ?? -1) + 1;
    const r = await dbRun(
      'INSERT INTO lookup_options (group_name,value,label,parent_value,sort_order) VALUES (?,?,?,?,?)',
      [group_name, value.trim(), label?.trim()||null, pv, sort_order]
    );
    res.status(201).json(await dbGet('SELECT * FROM lookup_options WHERE id=?', [r.insertId]));
  } catch (err) {
    res.status(400).json({ error: (err.message.includes('Duplicate')||err.message.includes('UNIQUE')) ? 'This option already exists in the group' : err.message });
  }
});

app.put('/api/settings/options/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const opt = await dbGet('SELECT * FROM lookup_options WHERE id=?', [req.params.id]);
    if (!opt) return res.status(404).json({ error: 'Not found' });
    const { value, label, sort_order, is_active } = req.body || {};
    await dbRun(
      `UPDATE lookup_options SET value=COALESCE(?,value), label=?, sort_order=COALESCE(?,sort_order), is_active=COALESCE(?,is_active) WHERE id=?`,
      [value?.trim()||null, label!==undefined?(label?.trim()||null):opt.label, sort_order??null, is_active??null, opt.id]
    );
    res.json(await dbGet('SELECT * FROM lookup_options WHERE id=?', [opt.id]));
  } catch (err) {
    res.status(400).json({ error: (err.message.includes('Duplicate')||err.message.includes('UNIQUE')) ? 'That value already exists' : err.message });
  }
});

app.delete('/api/settings/options/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const opt = await dbGet('SELECT * FROM lookup_options WHERE id=?', [req.params.id]);
    if (!opt) return res.status(404).json({ error: 'Not found' });
    await dbRun('DELETE FROM lookup_options WHERE id=?', [opt.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── HELPERS ───────────────────────────────────────────────────────────────────
function localDate() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
}
function getWeekStart(ds) {
  const d = new Date(ds + 'T00:00:00');
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d.toISOString().split('T')[0];
}
function getWeekEnd(ds) {
  const d = new Date(getWeekStart(ds) + 'T00:00:00');
  d.setDate(d.getDate() + 6);
  return d.toISOString().split('T')[0];
}
function getMonthEnd(ds) {
  const d = new Date(ds.slice(0,8) + '01T00:00:00');
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'mysql', ts: new Date().toISOString() });
  } catch (e) {
    res.status(503).json({ status: 'error', error: e.message });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────
app.get('/api/admin/backup', requireAuth, requireAdmin, async (req, res) => {
  try {
    const tables = ['users','transactions','leads','cash_handover','customers',
      'inventory_items','inventory_stock','inventory_movements','inventory_batches',
      'purchase_orders','po_items','purchase_requisitions','pr_items','lookup_options'];
    const backup = { exported_at: new Date().toISOString(), tables: {} };
    for (const table of tables) {
      backup.tables[table] = await dbAll(`SELECT * FROM ${table}`);
    }
    const fname = `cpr_backup_${new Date().toISOString().slice(0,10)}.json`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(backup);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/reset', requireAuth, requireAdmin, async (req, res) => {
  const { confirm } = req.body || {};
  if (confirm !== 'RESET ALL DATA') {
    return res.status(400).json({ error: 'Send { "confirm": "RESET ALL DATA" } to proceed' });
  }
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS=0');
    for (const table of ['inventory_movements','inventory_batches','inventory_stock',
      'po_items','pr_items','inventory_items','purchase_orders','purchase_requisitions',
      'transactions','leads','cash_handover']) {
      await pool.query(`DELETE FROM ${table}`);
      await pool.query(`ALTER TABLE ${table} AUTO_INCREMENT=1`);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS=1');
    res.json({ ok: true, message: 'All business data wiped. User accounts preserved.' });
  } catch (e) {
    await pool.query('SET FOREIGN_KEY_CHECKS=1').catch(() => {});
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/admin/change-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { userId, newPassword } = req.body || {};
    if (!userId || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'userId and newPassword (min 6 chars) required' });
    }
    const user = await dbGet('SELECT id FROM users WHERE id=?', [userId]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    await dbRun('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(newPassword, 10), userId]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'currentPassword and newPassword (min 6 chars) required' });
    }
    const user = await dbGet('SELECT * FROM users WHERE id=?', [req.session.userId]);
    if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    await dbRun('UPDATE users SET password_hash=? WHERE id=?', [bcrypt.hashSync(newPassword, 10), user.id]);
    res.json({ ok: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    res.json(await dbAll('SELECT id, username, full_name, role, created_at FROM users ORDER BY id'));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Express Error]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', err => {
  console.error('[Uncaught Exception]', err.stack || err.message);
  setTimeout(() => process.exit(1), 500);
});
process.on('unhandledRejection', reason => {
  console.error('[Unhandled Rejection]', reason);
});

// ── START ─────────────────────────────────────────────────────────────────────
initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`\n  CPR Sales Tracker (MySQL) running on port ${PORT}`);
      if (process.env.NODE_ENV !== 'production') {
        console.log('  Default logins: admin / cpr2026  |  staff / staff2026');
        console.log('  ⚠️  Change these passwords before going live!\n');
      }
    });
  })
  .catch(err => {
    console.error('Failed to initialise database:', err.message);
    process.exit(1);
  });
