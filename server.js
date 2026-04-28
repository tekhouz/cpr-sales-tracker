'use strict';
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
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
    // iPhones — full range
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
    // iPads
    'iPad (5th Gen)','iPad (6th Gen)','iPad (7th Gen)','iPad (8th Gen)','iPad (9th Gen)','iPad (10th Gen)',
    'iPad Mini (4th Gen)','iPad Mini (5th Gen)','iPad Mini (6th Gen)','iPad Mini (7th Gen)',
    'iPad Pro 9.7"','iPad Pro 10.5"',
    'iPad Pro 11" (1st Gen)','iPad Pro 11" (2nd Gen)','iPad Pro 11" (3rd Gen)','iPad Pro 11" (4th Gen)',
    'iPad Pro 12.9" (3rd Gen)','iPad Pro 12.9" (4th Gen)','iPad Pro 12.9" (5th Gen)','iPad Pro 12.9" (6th Gen)',
    'iPad Air (3rd Gen)','iPad Air (4th Gen)','iPad Air (5th Gen)','iPad Air 11" (M2)','iPad Air 13" (M2)',
    // MacBooks
    'MacBook Air 11" (2015)','MacBook Air 13" (2017)','MacBook Air 13" (2018)','MacBook Air 13" (2019)',
    'MacBook Air 13" (M1 2020)','MacBook Air 13" (M2 2022)','MacBook Air 15" (M2 2023)',
    'MacBook Air 13" (M3 2024)','MacBook Air 15" (M3 2024)',
    'MacBook Pro 13" (2017)','MacBook Pro 13" (2018)','MacBook Pro 13" (2019)','MacBook Pro 13" (2020)',
    'MacBook Pro 13" (M1 2020)','MacBook Pro 13" (M2 2022)',
    'MacBook Pro 14" (M1 Pro 2021)','MacBook Pro 14" (M2 Pro 2023)','MacBook Pro 14" (M3 2023)',
    'MacBook Pro 14" (M3 Pro 2023)','MacBook Pro 14" (M4 2024)',
    'MacBook Pro 16" (2019)','MacBook Pro 16" (M1 Pro 2021)','MacBook Pro 16" (M2 Pro 2023)',
    'MacBook Pro 16" (M3 Pro 2023)','MacBook Pro 16" (M4 Pro 2024)',
    // Accessories
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
  'Repair Service Only': []   // labour / service — no inventory used, full revenue = profit
};

const PART_TYPES = {
  'BTRY': 'Battery',
  'SCRN': 'Screen / LCD',
  'DIGI': 'Digitizer',
  'CHPT': 'Charging Port',
  'SPKR': 'Speaker',
  'HOUS': 'Housing / Frame',
  'BEZL': 'Bezel',
  'BCASE': 'Back Case / Glass',
  'TCASE': 'TPU Case',
  'CMRA': 'Camera',
  'PROX': 'Proximity Sensor',
  'HMBT': 'Home Button',
  'FRID': 'Face ID Module',
  'VBRT': 'Vibrator Motor',
  'MCRP': 'Microphone',
  'FLSH': 'Flash',
  'OTHER': 'Other'
};

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cpr_sales.db');
const db = new Database(DB_PATH);

// Warn if using default secret (never safe in production)
if (!process.env.SESSION_SECRET) {
  console.warn('\n  ⚠️  SESSION_SECRET env var not set — using insecure default. Set it in Railway Variables!\n');
}

db.exec(`
  PRAGMA journal_mode=WAL;

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT,
    role TEXT DEFAULT 'staff',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    transaction_id TEXT UNIQUE,
    category TEXT NOT NULL,
    item_or_model TEXT,
    screen_type TEXT,
    imei_serial TEXT,
    quantity REAL DEFAULT 1,
    unit_price REAL DEFAULT 0,
    discount REAL DEFAULT 0,
    tax REAL DEFAULT 0,
    line_total REAL DEFAULT 0,
    net_total REAL DEFAULT 0,
    payment_method TEXT,
    customer_name TEXT,
    customer_phone TEXT,
    customer_email TEXT,
    repair_time TEXT,
    issue TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_txn_date     ON transactions(date);
  CREATE INDEX IF NOT EXISTS idx_txn_category ON transactions(category);
  CREATE INDEX IF NOT EXISTS idx_txn_payment  ON transactions(payment_method);

  CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT,
    last_name TEXT,
    email TEXT,
    phone TEXT,
    company_name TEXT,
    lead_type TEXT,
    lead_source TEXT,
    lead_status TEXT DEFAULT 'No',
    category TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_leads_status   ON leads(lead_status);
  CREATE INDEX IF NOT EXISTS idx_leads_type     ON leads(lead_type);
  CREATE INDEX IF NOT EXISTS idx_leads_source   ON leads(lead_source);
  CREATE INDEX IF NOT EXISTS idx_leads_category ON leads(category);

  CREATE TABLE IF NOT EXISTS cash_handover (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    to_whom TEXT NOT NULL,
    amount REAL NOT NULL,
    received_date TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Merge any orphaned WAL pages on startup, then keep auto-checkpoint at 500 pages
try { db.pragma('wal_checkpoint(TRUNCATE)'); } catch(e) {}
db.pragma('wal_autocheckpoint=500');
db.pragma('synchronous=NORMAL');  // faster writes, safe with WAL

// ── MIGRATIONS (safe to run multiple times) ──────────────────────────────────
try { db.exec('ALTER TABLE transactions ADD COLUMN repair_type TEXT'); } catch(e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN cost_price REAL DEFAULT 0'); } catch(e) {}
try { db.exec('ALTER TABLE transactions ADD COLUMN profit REAL DEFAULT 0'); } catch(e) {}

// FIFO batch table — one row per stock-in event, tracks quantity remaining
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_batches (
    id                INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id           INTEGER NOT NULL,
    cost_price        REAL    NOT NULL DEFAULT 0,
    quantity_purchased INTEGER NOT NULL DEFAULT 0,
    quantity_remaining INTEGER NOT NULL DEFAULT 0,
    notes             TEXT,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_batch_item ON inventory_batches(item_id, created_at);
`);

// ── FIFO HELPER ───────────────────────────────────────────────────────────────
// Returns { unitCost, totalCost } using oldest batches first.
// Deducts batch quantities in-place when deduct=true.
function fifoCost(itemId, qty, deduct = false) {
  const batches = db.prepare(
    `SELECT * FROM inventory_batches
     WHERE item_id = ? AND quantity_remaining > 0
     ORDER BY created_at ASC, id ASC`
  ).all(itemId);

  let remaining = qty;
  let totalCost = 0;

  for (const b of batches) {
    if (remaining <= 0) break;
    const used = Math.min(remaining, b.quantity_remaining);
    totalCost += used * b.cost_price;
    remaining -= used;
    if (deduct) {
      db.prepare('UPDATE inventory_batches SET quantity_remaining = quantity_remaining - ? WHERE id = ?')
        .run(used, b.id);
    }
  }

  // If batches didn't cover full qty, fall back to item's current cost_price
  if (remaining > 0) {
    const item = db.prepare('SELECT cost_price FROM inventory_items WHERE id = ?').get(itemId);
    totalCost += remaining * (item?.cost_price || 0);
  }

  const unitCost = qty > 0 ? totalCost / qty : 0;
  return { unitCost: Math.round(unitCost * 10000) / 10000, totalCost: Math.round(totalCost * 100) / 100 };
}

// Seed default users on first run
const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
if (userCount.c === 0) {
  db.prepare('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)').run(
    'admin', bcrypt.hashSync('cpr2026', 10), 'Administrator', 'admin'
  );
  db.prepare('INSERT INTO users (username,password_hash,full_name,role) VALUES (?,?,?,?)').run(
    'staff', bcrypt.hashSync('staff2026', 10), 'Staff User', 'staff'
  );
}

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
    secure: process.env.NODE_ENV === 'production'   // HTTPS-only cookies on Railway
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

// ── LOGIN RATE LIMITER (simple in-memory, no extra dependency) ────────────────
const loginBucket = new Map(); // ip → { count, resetAt }
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
// Clean up old buckets every 20 min
setInterval(() => {
  const now = Date.now();
  for (const [ip, e] of loginBucket) if (now > e.resetAt) loginBucket.delete(ip);
}, 20 * 60 * 1000);

// ── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', loginRateLimit, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.role = user.role;
  res.json({ id: user.id, username: user.username, fullName: user.full_name, role: user.role });
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy();
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, full_name as fullName, role FROM users WHERE id = ?').get(req.session.userId);
  res.json(user);
});

// ── TRANSACTIONS ─────────────────────────────────────────────────────────────

app.get('/api/transactions/next-id', requireAuth, (req, res) => {
  const last = db.prepare(
    `SELECT transaction_id FROM transactions WHERE transaction_id LIKE 'DC_%'
     ORDER BY CAST(SUBSTR(transaction_id,4) AS INTEGER) DESC LIMIT 1`
  ).get();
  if (!last) return res.json({ nextId: 'DC_001' });
  const num = parseInt(last.transaction_id.replace('DC_', ''), 10) + 1;
  res.json({ nextId: `DC_${String(num).padStart(3, '0')}` });
});

app.get('/api/transactions', requireAuth, (req, res) => {
  const { start_date, end_date, category, payment_method, search } = req.query;
  let q = 'SELECT * FROM transactions WHERE 1=1';
  const p = [];
  if (start_date)    { q += ' AND date >= ?';  p.push(start_date); }
  if (end_date)      { q += ' AND date <= ?';  p.push(end_date); }
  if (category)      { q += ' AND category = ?'; p.push(category); }
  if (payment_method){ q += ' AND payment_method = ?'; p.push(payment_method); }
  if (search) {
    q += ' AND (customer_name LIKE ? OR item_or_model LIKE ? OR transaction_id LIKE ? OR notes LIKE ?)';
    const s = `%${search}%`;
    p.push(s, s, s, s);
  }
  q += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(q).all(...p));
});

app.post('/api/transactions', requireAuth, (req, res) => {
  try {
    const t = req.body;
    // Only pass columns that exist in the transactions table — extra fields
    // (inventory_item_id etc.) cause better-sqlite3 to throw a TypeError
    const insertData = {
      date:             t.date,
      transaction_id:   t.transaction_id   || null,
      category:         t.category,
      item_or_model:    t.item_or_model    || null,
      screen_type:      t.screen_type      || null,
      repair_type:      t.repair_type      || null,
      imei_serial:      t.imei_serial      || null,
      quantity:         t.quantity         ?? 1,
      unit_price:       t.unit_price       ?? 0,
      discount:         t.discount         ?? 0,
      tax:              t.tax              ?? 0,
      line_total:       t.line_total       ?? 0,
      net_total:        t.net_total        ?? 0,
      payment_method:   t.payment_method   || null,
      customer_name:    t.customer_name    || null,
      customer_phone:   t.customer_phone   || null,
      customer_email:   t.customer_email   || null,
      repair_time:      t.repair_time      || null,
      issue:            t.issue            || null,
      notes:            t.notes            || null,
      created_by:       req.session.userId
    };
    const r = db.prepare(`
      INSERT INTO transactions
        (date,transaction_id,category,item_or_model,screen_type,repair_type,imei_serial,
         quantity,unit_price,discount,tax,line_total,net_total,
         payment_method,customer_name,customer_phone,customer_email,
         repair_time,issue,notes,created_by)
      VALUES
        (@date,@transaction_id,@category,@item_or_model,@screen_type,@repair_type,@imei_serial,
         @quantity,@unit_price,@discount,@tax,@line_total,@net_total,
         @payment_method,@customer_name,@customer_phone,@customer_email,
         @repair_time,@issue,@notes,@created_by)
    `).run(insertData);
    const saved = db.prepare('SELECT * FROM transactions WHERE id=?').get(r.lastInsertRowid);

    // Auto-upsert customer from transaction customer info
    const rawName  = (t.customer_name  || '').trim();
    const rawPhone = (t.customer_phone || '').trim();
    const rawEmail = (t.customer_email || '').trim();
    const JUNK     = ['', '-', 'no', 'n/a', 'na', 'unknown'];
    const validName  = rawName  && !JUNK.includes(rawName.toLowerCase());
    const validPhone = rawPhone && !JUNK.includes(rawPhone.toLowerCase());
    const validEmail = rawEmail && !JUNK.includes(rawEmail.toLowerCase()) && rawEmail.includes('@');

    if (validName && (validPhone || validEmail)) {
      // Look for existing customer by phone or email
      let existing = null;
      if (validPhone) existing = db.prepare('SELECT id FROM customers WHERE phone = ?').get(rawPhone);
      if (!existing && validEmail) existing = db.prepare('SELECT id FROM customers WHERE email = ?').get(rawEmail);

      if (!existing) {
        const parts     = rawName.split(/\s+/);
        const firstName = parts[0];
        const lastName  = parts.slice(1).join(' ') || null;
        db.prepare(`
          INSERT INTO customers (first_name, last_name, phone, email, created_by)
          VALUES (?, ?, ?, ?, ?)
        `).run(firstName, lastName, validPhone ? rawPhone : null, validEmail ? rawEmail : null, req.session.userId);
      } else {
        // Fill in any missing phone/email on the existing record
        if (validPhone) db.prepare('UPDATE customers SET phone=? WHERE id=? AND (phone IS NULL OR phone="")').run(rawPhone, existing.id);
        if (validEmail) db.prepare('UPDATE customers SET email=? WHERE id=? AND (email IS NULL OR email="")').run(rawEmail, existing.id);
      }
    }

    // Repair Service Only — no parts, cost = 0, profit = full line total
    if (t.repair_service_only) {
      const profit = Math.round((insertData.line_total || 0) * 100) / 100;
      db.prepare('UPDATE transactions SET cost_price=0, profit=? WHERE id=?').run(profit, saved.id);
    }

    // Decrement inventory + calculate FIFO cost — main linked item (ALL categories)
    if (!t.repair_service_only && t.inventory_item_id) {
      const saleQty = parseFloat(t.quantity) || 1;
      const itemId  = parseInt(t.inventory_item_id);
      const txnRef  = saved.transaction_id || String(saved.id);

      // FIFO cost — deduct batch quantities
      const { totalCost } = fifoCost(itemId, saleQty, true);
      // Allow manual override cost_price from the form, else use FIFO
      const costPrice = parseFloat(t.cost_price) > 0 ? parseFloat(t.cost_price) : totalCost;
      const profit    = Math.round(((insertData.line_total || 0) - costPrice) * 100) / 100;

      // Update transaction with cost & profit
      db.prepare('UPDATE transactions SET cost_price=?, profit=? WHERE id=?')
        .run(costPrice, profit, saved.id);

      // UPSERT stock row
      const stockRow = db.prepare('SELECT id FROM inventory_stock WHERE item_id=?').get(itemId);
      if (stockRow) {
        db.prepare('UPDATE inventory_stock SET quantity=quantity-?, last_updated=CURRENT_TIMESTAMP WHERE item_id=?')
          .run(saleQty, itemId);
      } else {
        db.prepare('INSERT INTO inventory_stock (item_id, quantity, min_quantity) VALUES (?, ?, 1)')
          .run(itemId, -saleQty);
      }
      db.prepare(`
        INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
        VALUES (?, 'OUT', ?, 'SALE', ?, ?, ?)
      `).run(itemId, saleQty, txnRef, `${t.category} — TXN ${txnRef}`, req.session.userId);
    }


    res.status(201).json(saved);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Transaction ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/transactions/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.put('/api/transactions/:id', requireAuth, (req, res) => {
  const t = req.body;
  db.prepare(`
    UPDATE transactions SET
      date=@date,transaction_id=@transaction_id,category=@category,
      item_or_model=@item_or_model,screen_type=@screen_type,imei_serial=@imei_serial,
      quantity=@quantity,unit_price=@unit_price,discount=@discount,tax=@tax,
      line_total=@line_total,net_total=@net_total,payment_method=@payment_method,
      customer_name=@customer_name,customer_phone=@customer_phone,
      customer_email=@customer_email,repair_type=@repair_type,repair_time=@repair_time,issue=@issue,notes=@notes
    WHERE id=@id
  `).run({ ...t, id: req.params.id });
  res.json(db.prepare('SELECT * FROM transactions WHERE id=?').get(req.params.id));
});

app.delete('/api/transactions/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM transactions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── SUMMARY / REPORTS ────────────────────────────────────────────────────────

app.get('/api/summary/kpi', requireAuth, (req, res) => {
  const today = localDate();
  const weekStart = getWeekStart(today);
  const monthStart = today.slice(0, 8) + '01';

  const q = (start, end) => db.prepare(
    `SELECT COUNT(*) as count, COALESCE(SUM(net_total),0) as revenue,
            COALESCE(SUM(profit),0) as profit
     FROM transactions WHERE date >= ? AND date <= ?`
  ).get(start, end);

  const cashReceived = db.prepare(
    `SELECT COALESCE(SUM(net_total),0) as total FROM transactions
     WHERE payment_method IN ('Cash','Square Mobile - Cash')`
  ).get();
  const cashHandedOver = db.prepare(
    `SELECT COALESCE(SUM(amount),0) as total FROM cash_handover`
  ).get();

  res.json({
    today:      q(today, today),
    week:       q(weekStart, today),
    month:      q(monthStart, today),
    cashInHand: cashReceived.total - cashHandedOver.total
  });
});

app.get('/api/summary', requireAuth, (req, res) => {
  const { type, date, start_date, end_date } = req.query;
  const target = date || localDate();
  let startDate, endDate;

  if (type === 'daily')        { startDate = endDate = target; }
  else if (type === 'weekly')  { startDate = getWeekStart(target); endDate = getWeekEnd(target); }
  else if (type === 'monthly') { startDate = target.slice(0,8)+'01'; endDate = getMonthEnd(target); }
  else                         { startDate = start_date || target; endDate = end_date || target; }

  const totals = db.prepare(`
    SELECT COUNT(*) as transaction_count,
           COALESCE(SUM(quantity),0)   as total_quantity,
           COALESCE(SUM(line_total),0) as total_line,
           COALESCE(SUM(tax),0)        as total_tax,
           COALESCE(SUM(net_total),0)  as total_net,
           COALESCE(SUM(cost_price),0) as total_cost,
           COALESCE(SUM(profit),0)     as total_profit
    FROM transactions WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count,
           COALESCE(SUM(line_total),0) as line_total,
           COALESCE(SUM(net_total),0)  as net_total,
           COALESCE(SUM(cost_price),0) as total_cost,
           COALESCE(SUM(profit),0)     as total_profit
    FROM transactions WHERE date >= ? AND date <= ?
    GROUP BY category ORDER BY net_total DESC
  `).all(startDate, endDate);

  const byPayment = db.prepare(`
    SELECT payment_method, COUNT(*) as count,
           COALESCE(SUM(net_total),0) as net_total
    FROM transactions WHERE date >= ? AND date <= ?
    GROUP BY payment_method ORDER BY net_total DESC
  `).all(startDate, endDate);

  const byDate = db.prepare(`
    SELECT date, COUNT(*) as count,
           COALESCE(SUM(line_total),0) as line_total,
           COALESCE(SUM(net_total),0)  as net_total,
           COALESCE(SUM(cost_price),0) as total_cost,
           COALESCE(SUM(profit),0)     as total_profit
    FROM transactions WHERE date >= ? AND date <= ?
    GROUP BY date ORDER BY date
  `).all(startDate, endDate);

  const cashInPeriod = db.prepare(`
    SELECT COALESCE(SUM(net_total),0) as total FROM transactions
    WHERE payment_method IN ('Cash','Square Mobile - Cash')
    AND date >= ? AND date <= ?
  `).get(startDate, endDate);

  res.json({ period: { type, startDate, endDate }, totals, byCategory, byPayment, byDate, cashInPeriod: cashInPeriod.total });
});

// ── CASH ─────────────────────────────────────────────────────────────────────

app.get('/api/cash/balance', requireAuth, (req, res) => {
  const received   = db.prepare(`SELECT COALESCE(SUM(net_total),0) as t FROM transactions WHERE payment_method IN ('Cash','Square Mobile - Cash')`).get();
  const handedOver = db.prepare(`SELECT COALESCE(SUM(amount),0) as t FROM cash_handover`).get();
  res.json({ totalReceived: received.t, totalHandedOver: handedOver.t, balance: received.t - handedOver.t });
});

app.get('/api/cash/transactions', requireAuth, (req, res) => {
  const { start_date, end_date } = req.query;
  let q = `SELECT * FROM transactions WHERE payment_method IN ('Cash','Square Mobile - Cash')`;
  const p = [];
  if (start_date) { q += ' AND date >= ?'; p.push(start_date); }
  if (end_date)   { q += ' AND date <= ?'; p.push(end_date); }
  q += ' ORDER BY date DESC, id DESC';
  res.json(db.prepare(q).all(...p));
});

app.get('/api/cash/handovers', requireAuth, (req, res) => {
  res.json(db.prepare('SELECT * FROM cash_handover ORDER BY date DESC').all());
});

app.post('/api/cash/handovers', requireAuth, (req, res) => {
  const { date, to_whom, amount, received_date, notes } = req.body;
  const r = db.prepare(
    `INSERT INTO cash_handover (date,to_whom,amount,received_date,notes,created_by)
     VALUES (?,?,?,?,?,?)`
  ).run(date, to_whom, parseFloat(amount), received_date || null, notes || null, req.session.userId);
  res.status(201).json(db.prepare('SELECT * FROM cash_handover WHERE id=?').get(r.lastInsertRowid));
});

app.delete('/api/cash/handovers/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM cash_handover WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── CUSTOMERS ────────────────────────────────────────────────────────────────

// One-time schema additions
db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name TEXT NOT NULL,
    last_name  TEXT,
    email      TEXT,
    phone      TEXT,
    address    TEXT,
    city       TEXT,
    state      TEXT,
    zip        TEXT,
    company_name   TEXT,
    customer_type  TEXT DEFAULT 'Retail',
    preferred_contact TEXT,
    services_interested TEXT,
    notes      TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_cust_phone ON customers(phone);
  CREATE INDEX IF NOT EXISTS idx_cust_email ON customers(email);
  CREATE INDEX IF NOT EXISTS idx_cust_type  ON customers(customer_type);
`);

// ── INVENTORY TABLES ─────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    part_id TEXT UNIQUE NOT NULL,
    asset_type TEXT,
    part_type TEXT,
    category TEXT,
    model TEXT,
    model_number TEXT,
    color TEXT,
    grade TEXT DEFAULT 'OEM',
    status TEXT DEFAULT 'Active',
    description TEXT,
    supplier TEXT,
    cost_price REAL DEFAULT 0,
    sell_price REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS inventory_stock (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER UNIQUE NOT NULL,
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 1,
    location TEXT,
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS inventory_movements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    reference_type TEXT,
    reference_id TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_number TEXT UNIQUE NOT NULL,
    supplier TEXT,
    status TEXT DEFAULT 'Draft',
    order_date TEXT,
    expected_date TEXT,
    received_date TEXT,
    total_amount REAL DEFAULT 0,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS po_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    po_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity_ordered INTEGER NOT NULL,
    quantity_received INTEGER DEFAULT 0,
    unit_cost REAL DEFAULT 0,
    total_cost REAL DEFAULT 0,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
  );

  CREATE TABLE IF NOT EXISTS purchase_requisitions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_number TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'Pending',
    priority TEXT DEFAULT 'Normal',
    needed_by_date TEXT,
    notes TEXT,
    created_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS pr_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pr_id INTEGER NOT NULL,
    item_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    estimated_cost REAL DEFAULT 0,
    notes TEXT,
    FOREIGN KEY (pr_id) REFERENCES purchase_requisitions(id) ON DELETE CASCADE,
    FOREIGN KEY (item_id) REFERENCES inventory_items(id)
  );

  CREATE INDEX IF NOT EXISTS idx_inv_status    ON inventory_items(status);
  CREATE INDEX IF NOT EXISTS idx_inv_asset     ON inventory_items(asset_type);
  CREATE INDEX IF NOT EXISTS idx_inv_part_type ON inventory_items(part_type);
  CREATE INDEX IF NOT EXISTS idx_mvt_item      ON inventory_movements(item_id);
  CREATE INDEX IF NOT EXISTS idx_po_status     ON purchase_orders(status);
  CREATE INDEX IF NOT EXISTS idx_pr_status     ON purchase_requisitions(status);
`);

app.get('/api/customers/summary', requireAuth, (req, res) => {
  const ms = localDate().slice(0,8) + '01';
  const total        = db.prepare('SELECT COUNT(*) as c FROM customers').get().c;
  const newMonth     = db.prepare("SELECT COUNT(*) as c FROM customers WHERE DATE(created_at) >= ?").get(ms).c;
  const withTxns     = db.prepare(`
    SELECT COUNT(DISTINCT c.id) as c FROM customers c
    INNER JOIN transactions t ON (
      (c.phone  != '' AND c.phone  IS NOT NULL AND t.customer_phone = c.phone) OR
      (c.email  != '' AND c.email  IS NOT NULL AND t.customer_email = c.email)
    )`).get().c;
  const revenue      = db.prepare(`
    SELECT COALESCE(SUM(t.net_total),0) as v FROM customers c
    INNER JOIN transactions t ON (
      (c.phone != '' AND c.phone IS NOT NULL AND t.customer_phone = c.phone) OR
      (c.email != '' AND c.email IS NOT NULL AND t.customer_email = c.email)
    )`).get().v;
  res.json({ total, newMonth, withTxns, revenue });
});

app.get('/api/customers', requireAuth, (req, res) => {
  const { search, customer_type, city } = req.query;
  let q = `
    SELECT c.*,
      COUNT(DISTINCT t.id)          AS total_visits,
      COALESCE(SUM(t.net_total), 0) AS total_spent,
      MAX(t.date)                   AS last_visit,
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
  res.json(db.prepare(q).all(...p));
});

app.post('/api/customers', requireAuth, (req, res) => {
  const d = req.body;
  const r = db.prepare(`
    INSERT INTO customers
      (first_name,last_name,email,phone,address,city,state,zip,
       company_name,customer_type,preferred_contact,services_interested,notes,created_by)
    VALUES
      (@first_name,@last_name,@email,@phone,@address,@city,@state,@zip,
       @company_name,@customer_type,@preferred_contact,@services_interested,@notes,@created_by)
  `).run({
    first_name: d.first_name||null, last_name: d.last_name||null,
    email: d.email||null, phone: d.phone||null,
    address: d.address||null, city: d.city||null, state: d.state||null, zip: d.zip||null,
    company_name: d.company_name||null, customer_type: d.customer_type||'Retail',
    preferred_contact: d.preferred_contact||null,
    services_interested: d.services_interested||null,
    notes: d.notes||null, created_by: req.session.userId
  });
  res.status(201).json(db.prepare('SELECT * FROM customers WHERE id=?').get(r.lastInsertRowid));
});

app.get('/api/customers/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.put('/api/customers/:id', requireAuth, (req, res) => {
  const d = req.body;
  db.prepare(`
    UPDATE customers SET
      first_name=@first_name, last_name=@last_name, email=@email, phone=@phone,
      address=@address, city=@city, state=@state, zip=@zip,
      company_name=@company_name, customer_type=@customer_type,
      preferred_contact=@preferred_contact, services_interested=@services_interested,
      notes=@notes, updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({
    first_name: d.first_name||null, last_name: d.last_name||null,
    email: d.email||null, phone: d.phone||null,
    address: d.address||null, city: d.city||null, state: d.state||null, zip: d.zip||null,
    company_name: d.company_name||null, customer_type: d.customer_type||'Retail',
    preferred_contact: d.preferred_contact||null,
    services_interested: d.services_interested||null,
    notes: d.notes||null, id: req.params.id
  });
  res.json(db.prepare('SELECT * FROM customers WHERE id=?').get(req.params.id));
});

app.delete('/api/customers/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM customers WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/customers/:id/history', requireAuth, (req, res) => {
  const c = db.prepare('SELECT phone, email FROM customers WHERE id=?').get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Not found' });
  const rows = db.prepare(`
    SELECT * FROM transactions
    WHERE (? != '' AND ? IS NOT NULL AND customer_phone = ?)
       OR (? != '' AND ? IS NOT NULL AND customer_email = ?)
    ORDER BY date DESC
  `).all(c.phone||'', c.phone, c.phone||'', c.email||'', c.email, c.email||'');
  res.json(rows);
});

// ── LEADS ─────────────────────────────────────────────────────────────────────

app.get('/api/leads/summary', requireAuth, (req, res) => {
  const total     = db.prepare('SELECT COUNT(*) as c FROM leads').get().c;
  const converted = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status='Yes'").get().c;
  const notYet    = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status='No'").get().c;
  const hold      = db.prepare("SELECT COUNT(*) as c FROM leads WHERE lead_status='Hold'").get().c;
  res.json({ total, converted, notYet, hold });
});

app.get('/api/leads', requireAuth, (req, res) => {
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
  res.json(db.prepare(q).all(...p));
});

app.post('/api/leads', requireAuth, (req, res) => {
  const l = req.body;
  const r = db.prepare(`
    INSERT INTO leads (first_name,last_name,email,phone,company_name,lead_type,lead_source,lead_status,category,notes,created_by)
    VALUES (@first_name,@last_name,@email,@phone,@company_name,@lead_type,@lead_source,@lead_status,@category,@notes,@created_by)
  `).run({ ...l, created_by: req.session.userId });
  res.status(201).json(db.prepare('SELECT * FROM leads WHERE id=?').get(r.lastInsertRowid));
});

app.get('/api/leads/:id', requireAuth, (req, res) => {
  const row = db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  res.json(row);
});

app.put('/api/leads/:id', requireAuth, (req, res) => {
  const l = req.body;
  db.prepare(`
    UPDATE leads SET
      first_name=@first_name, last_name=@last_name, email=@email, phone=@phone,
      company_name=@company_name, lead_type=@lead_type, lead_source=@lead_source,
      lead_status=@lead_status, category=@category, notes=@notes,
      updated_at=CURRENT_TIMESTAMP
    WHERE id=@id
  `).run({ ...l, id: req.params.id });
  res.json(db.prepare('SELECT * FROM leads WHERE id=?').get(req.params.id));
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM leads WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── INVENTORY ────────────────────────────────────────────────────────────────

// GET /api/inventory/items/meta — asset types, part types, models for dropdowns
app.get('/api/inventory/items/meta', requireAuth, (req, res) => {
  const assetTypes = Object.keys(DEVICE_MODELS);
  const partTypes = Object.entries(PART_TYPES).map(([code, label]) => ({ code, label }));
  res.json({ assetTypes, partTypes, deviceModels: DEVICE_MODELS });
});

// GET /api/inventory/fifo-cost?item_id=X&quantity=Y
app.get('/api/inventory/fifo-cost', requireAuth, (req, res) => {
  const itemId = parseInt(req.query.item_id);
  const qty    = parseFloat(req.query.quantity) || 1;
  if (!itemId) return res.json({ unitCost: 0, totalCost: 0 });
  res.json(fifoCost(itemId, qty, false)); // preview only, no deduction
});

// GET /api/inventory/lookup — find best matching item by asset_type + model + optional color/grade/part_type
app.get('/api/inventory/lookup', requireAuth, (req, res) => {
  const { asset_type, model, color, grade, part_type } = req.query;
  if (!model) return res.json(null);

  // Hard filters: asset_type + model + part_type (distinct item types)
  // Soft preference: color & grade only in ORDER BY — never block a match
  let q = `
    SELECT i.*, s.quantity, s.min_quantity, s.location
    FROM inventory_items i
    LEFT JOIN inventory_stock s ON s.item_id = i.id
    WHERE i.status = 'Active'
  `;
  const params = [];
  if (asset_type) { q += ' AND i.asset_type = ?'; params.push(asset_type); }
  q += ' AND i.model = ?'; params.push(model);
  if (part_type)  { q += ' AND i.part_type = ?';  params.push(part_type); }

  // Prefer rows whose color/grade exactly match what was selected
  q += ` ORDER BY
    (CASE WHEN ? != '' AND i.color = ? THEN 2 ELSE 0 END) +
    (CASE WHEN ? != '' AND i.grade = ? THEN 2 ELSE 0 END)
    DESC LIMIT 1`;
  params.push(color||'', color||'', grade||'', grade||'');

  const item = db.prepare(q).get(...params);
  res.json(item || null);
});

// GET /api/inventory/stock/check?model=X&part_type=Y
app.get('/api/inventory/stock/check', requireAuth, (req, res) => {
  const { model, part_type } = req.query;
  let q = `
    SELECT i.*, s.quantity, s.min_quantity, s.location
    FROM inventory_items i
    JOIN inventory_stock s ON s.item_id = i.id
    WHERE i.status = 'Active'
  `;
  const p = [];
  if (model)     { q += ' AND i.model = ?';     p.push(model); }
  if (part_type) { q += ' AND i.part_type = ?'; p.push(part_type); }
  res.json(db.prepare(q).all(...p));
});

// GET /api/inventory/items
app.get('/api/inventory/items', requireAuth, (req, res) => {
  const { asset_type, part_type, model, status, search } = req.query;
  let q = `
    SELECT i.*, s.quantity, s.min_quantity, s.location, s.last_updated,
           COALESCE(m.qty_used, 0) AS qty_used,
           (COALESCE(s.quantity, 0) + COALESCE(m.qty_used, 0)) AS total_qoh
    FROM inventory_items i
    LEFT JOIN inventory_stock s ON s.item_id = i.id
    LEFT JOIN (
      SELECT item_id, SUM(quantity) AS qty_used
      FROM inventory_movements
      WHERE movement_type = 'OUT'
      GROUP BY item_id
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
  res.json(db.prepare(q).all(...p));
});

// POST /api/inventory/items
app.post('/api/inventory/items', requireAuth, (req, res) => {
  try {
    const d = req.body;
    const r = db.prepare(`
      INSERT INTO inventory_items
        (part_id, asset_type, part_type, category, model, model_number, color, grade, status, description, supplier, cost_price, sell_price)
      VALUES
        (@part_id, @asset_type, @part_type, @category, @model, @model_number, @color, @grade, @status, @description, @supplier, @cost_price, @sell_price)
    `).run({
      part_id: d.part_id, asset_type: d.asset_type||null, part_type: d.part_type||null,
      category: d.category||null, model: d.model||null, model_number: d.model_number||null,
      color: d.color||null, grade: d.grade||null, status: d.status||'Active',
      description: d.description||null, supplier: d.supplier||null,
      cost_price: parseFloat(d.cost_price)||0, sell_price: parseFloat(d.sell_price)||0
    });
    // Auto-create stock row
    db.prepare(`INSERT INTO inventory_stock (item_id, quantity, min_quantity, location) VALUES (?, 0, ?, ?)`)
      .run(r.lastInsertRowid, parseInt(d.min_quantity)||1, d.location||null);
    const item = db.prepare(`
      SELECT i.*, s.quantity, s.min_quantity, s.location FROM inventory_items i
      LEFT JOIN inventory_stock s ON s.item_id = i.id WHERE i.id = ?
    `).get(r.lastInsertRowid);
    res.status(201).json(item);
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Part ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/inventory/items/:id
app.put('/api/inventory/items/:id', requireAuth, (req, res) => {
  const d = req.body;
  db.prepare(`
    UPDATE inventory_items SET
      part_id=@part_id, asset_type=@asset_type, part_type=@part_type, category=@category,
      model=@model, model_number=@model_number, color=@color, grade=@grade, status=@status,
      description=@description, supplier=@supplier, cost_price=@cost_price, sell_price=@sell_price
    WHERE id=@id
  `).run({
    part_id: d.part_id, asset_type: d.asset_type||null, part_type: d.part_type||null,
    category: d.category||null, model: d.model||null, model_number: d.model_number||null,
    color: d.color||null, grade: d.grade||null, status: d.status||'Active',
    description: d.description||null, supplier: d.supplier||null,
    cost_price: parseFloat(d.cost_price)||0, sell_price: parseFloat(d.sell_price)||0,
    id: req.params.id
  });
  // Update stock meta
  db.prepare(`UPDATE inventory_stock SET min_quantity=?, location=?, last_updated=CURRENT_TIMESTAMP WHERE item_id=?`)
    .run(parseInt(d.min_quantity)||1, d.location||null, req.params.id);
  const item = db.prepare(`
    SELECT i.*, s.quantity, s.min_quantity, s.location FROM inventory_items i
    LEFT JOIN inventory_stock s ON s.item_id = i.id WHERE i.id = ?
  `).get(req.params.id);
  res.json(item);
});

// DELETE /api/inventory/items/:id
app.delete('/api/inventory/items/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM inventory_items WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// POST /api/inventory/stock/:itemId/adjust
app.post('/api/inventory/stock/:itemId/adjust', requireAuth, (req, res) => {
  const { quantity, movement_type, notes, cost_price } = req.body;
  const qty    = parseInt(quantity) || 0;
  const itemId = parseInt(req.params.itemId);
  const stock  = db.prepare('SELECT * FROM inventory_stock WHERE item_id=?').get(itemId);
  if (!stock) return res.status(404).json({ error: 'Item not found' });

  let newQty;
  if (movement_type === 'IN')       newQty = stock.quantity + qty;
  else if (movement_type === 'OUT') newQty = stock.quantity - qty; // allow negative
  else                              newQty = qty; // ADJUSTMENT = set absolute value

  db.prepare('UPDATE inventory_stock SET quantity=?, last_updated=CURRENT_TIMESTAMP WHERE item_id=?')
    .run(newQty, itemId);
  db.prepare(`
    INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_type, notes, created_by)
    VALUES (?, ?, ?, 'ADJUSTMENT', ?, ?)
  `).run(itemId, movement_type, qty, notes||null, req.session.userId);

  // Create a FIFO batch when stock is added in
  if (movement_type === 'IN' && qty > 0) {
    const unitCost = parseFloat(cost_price) ||
      db.prepare('SELECT cost_price FROM inventory_items WHERE id=?').get(itemId)?.cost_price || 0;
    db.prepare(`
      INSERT INTO inventory_batches (item_id, cost_price, quantity_purchased, quantity_remaining, notes)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemId, unitCost, qty, qty, notes || 'Manual stock-in');
  }

  res.json({ ok: true, newQuantity: newQty });
});

// ── PURCHASE ORDERS ───────────────────────────────────────────────────────────

// GET /api/inventory/po
app.get('/api/inventory/po', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT p.*, u.full_name as created_by_name,
           COUNT(pi.id) as item_count
    FROM purchase_orders p
    LEFT JOIN users u ON u.id = p.created_by
    LEFT JOIN po_items pi ON pi.po_id = p.id
    GROUP BY p.id ORDER BY p.created_at DESC
  `).all();
  res.json(rows);
});

// POST /api/inventory/po
app.post('/api/inventory/po', requireAuth, (req, res) => {
  try {
    const { supplier, order_date, expected_date, notes, items } = req.body;
    // Generate PO number
    const last = db.prepare(`SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`).get();
    let nextNum = 1;
    if (last) {
      const m = last.po_number.match(/PO_(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const po_number = `PO_${String(nextNum).padStart(3,'0')}`;
    const total_amount = (items||[]).reduce((s,i) => s + (parseFloat(i.unit_cost)||0) * (parseInt(i.quantity_ordered)||0), 0);

    const r = db.prepare(`
      INSERT INTO purchase_orders (po_number, supplier, order_date, expected_date, total_amount, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(po_number, supplier||null, order_date||null, expected_date||null, total_amount, notes||null, req.session.userId);

    const poId = r.lastInsertRowid;
    const insertItem = db.prepare(`
      INSERT INTO po_items (po_id, item_id, quantity_ordered, unit_cost, total_cost)
      VALUES (?, ?, ?, ?, ?)
    `);
    for (const item of (items||[])) {
      const qty = parseInt(item.quantity_ordered)||0;
      const cost = parseFloat(item.unit_cost)||0;
      insertItem.run(poId, item.item_id, qty, cost, qty*cost);
    }
    res.status(201).json(db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(poId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/po/:id
app.get('/api/inventory/po/:id', requireAuth, (req, res) => {
  const po = db.prepare(`
    SELECT p.*, u.full_name as created_by_name
    FROM purchase_orders p LEFT JOIN users u ON u.id = p.created_by
    WHERE p.id = ?
  `).get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  po.items = db.prepare(`
    SELECT pi.*, i.part_id, i.model, i.part_type, i.asset_type, i.color, i.grade
    FROM po_items pi JOIN inventory_items i ON i.id = pi.item_id
    WHERE pi.po_id = ?
  `).all(req.params.id);
  res.json(po);
});

// PUT /api/inventory/po/:id
app.put('/api/inventory/po/:id', requireAuth, (req, res) => {
  const { supplier, order_date, expected_date, received_date, status, notes } = req.body;
  db.prepare(`
    UPDATE purchase_orders SET supplier=?, order_date=?, expected_date=?, received_date=?, status=?, notes=?
    WHERE id=?
  `).run(supplier||null, order_date||null, expected_date||null, received_date||null, status||'Draft', notes||null, req.params.id);
  res.json(db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(req.params.id));
});

// POST /api/inventory/po/:id/receive
app.post('/api/inventory/po/:id/receive', requireAuth, (req, res) => {
  const poId = req.params.id;
  const po = db.prepare('SELECT * FROM purchase_orders WHERE id=?').get(poId);
  if (!po) return res.status(404).json({ error: 'Not found' });

  const poItems = db.prepare('SELECT * FROM po_items WHERE po_id=?').all(poId);
  const receiveAll = db.transaction(() => {
    for (const item of poItems) {
      const qty = item.quantity_ordered - item.quantity_received;
      if (qty <= 0) continue;
      db.prepare('UPDATE po_items SET quantity_received=quantity_ordered WHERE id=?').run(item.id);
      db.prepare('UPDATE inventory_stock SET quantity=quantity+?, last_updated=CURRENT_TIMESTAMP WHERE item_id=?')
        .run(qty, item.item_id);
      db.prepare(`
        INSERT INTO inventory_movements (item_id, movement_type, quantity, reference_type, reference_id, notes, created_by)
        VALUES (?, 'IN', ?, 'PO', ?, ?, ?)
      `).run(item.item_id, qty, po.po_number, `Received from PO ${po.po_number}`, req.session.userId);
      // FIFO batch — use PO line-item unit price as cost
      const unitCost = item.unit_price ||
        db.prepare('SELECT cost_price FROM inventory_items WHERE id=?').get(item.item_id)?.cost_price || 0;
      db.prepare(`
        INSERT INTO inventory_batches (item_id, cost_price, quantity_purchased, quantity_remaining, notes)
        VALUES (?, ?, ?, ?, ?)
      `).run(item.item_id, unitCost, qty, qty, `PO ${po.po_number}`);
    }
    db.prepare(`UPDATE purchase_orders SET status='Received', received_date=? WHERE id=?`)
      .run(localDate(), poId);
  });
  receiveAll();
  res.json({ ok: true });
});

// DELETE /api/inventory/po/:id
app.delete('/api/inventory/po/:id', requireAuth, (req, res) => {
  const po = db.prepare('SELECT status FROM purchase_orders WHERE id=?').get(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  if (po.status !== 'Draft') return res.status(400).json({ error: 'Only Draft POs can be deleted' });
  db.prepare('DELETE FROM purchase_orders WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── PURCHASE REQUISITIONS ─────────────────────────────────────────────────────

// GET /api/inventory/pr
app.get('/api/inventory/pr', requireAuth, (req, res) => {
  const rows = db.prepare(`
    SELECT r.*, u.full_name as created_by_name,
           COUNT(ri.id) as item_count
    FROM purchase_requisitions r
    LEFT JOIN users u ON u.id = r.created_by
    LEFT JOIN pr_items ri ON ri.pr_id = r.id
    GROUP BY r.id ORDER BY r.created_at DESC
  `).all();
  res.json(rows);
});

// POST /api/inventory/pr
app.post('/api/inventory/pr', requireAuth, (req, res) => {
  try {
    const { priority, needed_by_date, notes, items } = req.body;
    const last = db.prepare(`SELECT pr_number FROM purchase_requisitions ORDER BY id DESC LIMIT 1`).get();
    let nextNum = 1;
    if (last) {
      const m = last.pr_number.match(/PR_(\d+)/);
      if (m) nextNum = parseInt(m[1]) + 1;
    }
    const pr_number = `PR_${String(nextNum).padStart(3,'0')}`;

    const r = db.prepare(`
      INSERT INTO purchase_requisitions (pr_number, priority, needed_by_date, notes, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(pr_number, priority||'Normal', needed_by_date||null, notes||null, req.session.userId);

    const prId = r.lastInsertRowid;
    const insertItem = db.prepare(`INSERT INTO pr_items (pr_id, item_id, quantity, estimated_cost, notes) VALUES (?, ?, ?, ?, ?)`);
    for (const item of (items||[])) {
      insertItem.run(prId, item.item_id, parseInt(item.quantity)||1, parseFloat(item.estimated_cost)||0, item.notes||null);
    }
    res.status(201).json(db.prepare('SELECT * FROM purchase_requisitions WHERE id=?').get(prId));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/inventory/pr/:id
app.get('/api/inventory/pr/:id', requireAuth, (req, res) => {
  const pr = db.prepare(`
    SELECT r.*, u.full_name as created_by_name
    FROM purchase_requisitions r LEFT JOIN users u ON u.id = r.created_by
    WHERE r.id = ?
  `).get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });
  pr.items = db.prepare(`
    SELECT ri.*, i.part_id, i.model, i.part_type, i.asset_type, i.color, i.grade
    FROM pr_items ri JOIN inventory_items i ON i.id = ri.item_id
    WHERE ri.pr_id = ?
  `).all(req.params.id);
  res.json(pr);
});

// PUT /api/inventory/pr/:id/status
app.put('/api/inventory/pr/:id/status', requireAuth, (req, res) => {
  const { status } = req.body;
  const pr = db.prepare('SELECT * FROM purchase_requisitions WHERE id=?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });

  if (status === 'Converted') {
    // Convert to PO
    const prItems = db.prepare('SELECT * FROM pr_items WHERE pr_id=?').all(req.params.id);
    const last = db.prepare(`SELECT po_number FROM purchase_orders ORDER BY id DESC LIMIT 1`).get();
    let nextNum = 1;
    if (last) { const m = last.po_number.match(/PO_(\d+)/); if (m) nextNum = parseInt(m[1]) + 1; }
    const po_number = `PO_${String(nextNum).padStart(3,'0')}`;

    const poR = db.prepare(`
      INSERT INTO purchase_orders (po_number, notes, created_by)
      VALUES (?, ?, ?)
    `).run(po_number, `Converted from ${pr.pr_number}`, req.session.userId);
    const poId = poR.lastInsertRowid;

    const insertPoItem = db.prepare(`INSERT INTO po_items (po_id, item_id, quantity_ordered, unit_cost, total_cost) VALUES (?, ?, ?, ?, ?)`);
    for (const item of prItems) {
      insertPoItem.run(poId, item.item_id, item.quantity, item.estimated_cost, item.quantity * item.estimated_cost);
    }
    db.prepare(`UPDATE purchase_orders SET total_amount=(SELECT SUM(total_cost) FROM po_items WHERE po_id=?) WHERE id=?`).run(poId, poId);
  }

  db.prepare('UPDATE purchase_requisitions SET status=? WHERE id=?').run(status, req.params.id);
  res.json(db.prepare('SELECT * FROM purchase_requisitions WHERE id=?').get(req.params.id));
});

// DELETE /api/inventory/pr/:id
app.delete('/api/inventory/pr/:id', requireAuth, (req, res) => {
  const pr = db.prepare('SELECT status FROM purchase_requisitions WHERE id=?').get(req.params.id);
  if (!pr) return res.status(404).json({ error: 'Not found' });
  if (pr.status !== 'Pending') return res.status(400).json({ error: 'Only Pending PRs can be deleted' });
  db.prepare('DELETE FROM purchase_requisitions WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

// ── HELPERS ──────────────────────────────────────────────────────────────────

function localDate() {
  const d = new Date();
  return d.getFullYear() + '-' +
    String(d.getMonth()+1).padStart(2,'0') + '-' +
    String(d.getDate()).padStart(2,'0');
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

// ── HEALTH CHECK ─────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  try {
    db.prepare('SELECT 1').get();
    res.json({ status: 'ok', ts: new Date().toISOString() });
  } catch(e) {
    res.status(503).json({ status: 'error', error: e.message });
  }
});

// ── ADMIN ROUTES ──────────────────────────────────────────────────────────────

// GET /api/admin/backup  — download a clean SQLite snapshot
app.get('/api/admin/backup', requireAuth, requireAdmin, (req, res) => {
  try {
    // Checkpoint WAL so the .db file is self-contained and up-to-date
    db.pragma('wal_checkpoint(TRUNCATE)');
    const fname = `cpr_backup_${new Date().toISOString().slice(0,10)}.db`;
    res.setHeader('Content-Disposition', `attachment; filename="${fname}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    const stream = fs.createReadStream(DB_PATH);
    stream.on('error', err => res.status(500).end(err.message));
    stream.pipe(res);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/reset  — wipe all business data, preserve user accounts
app.post('/api/admin/reset', requireAuth, requireAdmin, (req, res) => {
  const { confirm } = req.body || {};
  if (confirm !== 'RESET ALL DATA') {
    return res.status(400).json({ error: 'Send { "confirm": "RESET ALL DATA" } to proceed' });
  }
  try {
    db.exec(`
      DELETE FROM transactions;
      DELETE FROM leads;
      DELETE FROM cash_handover;
      DELETE FROM inventory_movements;
      DELETE FROM inventory_batches;
      DELETE FROM inventory_stock;
      DELETE FROM inventory_items;
      DELETE FROM po_items;
      DELETE FROM purchase_orders;
      DELETE FROM pr_items;
      DELETE FROM purchase_requisitions;
    `);
    // Reset auto-increment sequences
    try {
      db.exec(`
        DELETE FROM sqlite_sequence WHERE name IN (
          'transactions','leads','cash_handover',
          'inventory_items','inventory_stock','inventory_movements','inventory_batches',
          'purchase_orders','po_items','purchase_requisitions','pr_items'
        );
      `);
    } catch(e) { /* sqlite_sequence may not exist if table was never used */ }
    db.pragma('wal_checkpoint(TRUNCATE)');
    res.json({ ok: true, message: 'All business data wiped. User accounts preserved.' });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/admin/change-password  — admin changes any user's password
app.post('/api/admin/change-password', requireAuth, requireAdmin, (req, res) => {
  const { userId, newPassword } = req.body || {};
  if (!userId || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'userId and newPassword (min 6 chars) required' });
  }
  const user = db.prepare('SELECT id FROM users WHERE id=?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const hash = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, userId);
  res.json({ ok: true });
});

// POST /api/auth/change-password  — any logged-in user changes their own password
app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'currentPassword and newPassword (min 6 chars) required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE id=?').get(req.session.userId);
  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(bcrypt.hashSync(newPassword, 10), user.id);
  res.json({ ok: true });
});

// GET /api/admin/users  — list all users (admin only)
app.get('/api/admin/users', requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare('SELECT id, username, full_name, role, created_at FROM users ORDER BY id').all();
  res.json(users);
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Express Error]', err.stack || err.message);
  res.status(500).json({ error: 'Internal server error' });
});

process.on('uncaughtException', err => {
  console.error('[Uncaught Exception]', err.stack || err.message);
  // Give logger time to flush, then exit so Railway restarts the container
  setTimeout(() => process.exit(1), 500);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]', reason);
});

// Graceful shutdown — checkpoint WAL before exit
process.on('SIGTERM', () => {
  console.log('SIGTERM received — checkpointing WAL and shutting down');
  try { db.pragma('wal_checkpoint(TRUNCATE)'); db.close(); } catch(e) {}
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`\n  CPR Sales Tracker running on port ${PORT}`);
  if (process.env.NODE_ENV !== 'production') {
    console.log('  Default logins: admin / cpr2026  |  staff / staff2026');
    console.log('  ⚠️  Change these passwords before going live!\n');
  }
});
