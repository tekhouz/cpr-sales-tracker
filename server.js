'use strict';
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');
const Database = require('better-sqlite3');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'cpr_sales.db');
const db = new Database(DB_PATH);

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

// Add repair_type column if migrating from older db
try { db.exec('ALTER TABLE transactions ADD COLUMN repair_type TEXT'); } catch(e) {}

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
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

const requireAuth = (req, res, next) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// ── AUTH ────────────────────────────────────────────────────────────────────

app.post('/api/auth/login', (req, res) => {
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
    const defaults = {
      transaction_id: null, screen_type: null, repair_type: null, imei_serial: null,
      discount: 0, tax: 0, repair_time: null, issue: null, notes: null,
      customer_name: null, customer_phone: null, customer_email: null
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
    `).run({ ...defaults, ...t, created_by: req.session.userId });
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
    `SELECT COUNT(*) as count, COALESCE(SUM(net_total),0) as revenue
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
           COALESCE(SUM(net_total),0)  as total_net
    FROM transactions WHERE date >= ? AND date <= ?
  `).get(startDate, endDate);

  const byCategory = db.prepare(`
    SELECT category, COUNT(*) as count,
           COALESCE(SUM(line_total),0) as line_total,
           COALESCE(SUM(net_total),0)  as net_total
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
           COALESCE(SUM(net_total),0)  as net_total
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

app.listen(PORT, () => {
  console.log(`\n  CPR Sales Tracker → http://localhost:${PORT}`);
  console.log('  Admin login : admin  / cpr2026');
  console.log('  Staff login : staff  / staff2026\n');
});
