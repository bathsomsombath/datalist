'use strict';
/*
 * Data layer for the Workshop Controller.
 * Uses Node's built-in SQLite (node:sqlite, Node >= 22.5).
 * Exposes a small repository API so the HTTP layer stays thin.
 */
const path = require('node:path');
const fs = require('node:fs');
const { DatabaseSync } = require('node:sqlite');

const DATA_DIR = path.join(__dirname, 'data');
const DB_PATH = process.env.WORKSHOP_DB || path.join(DATA_DIR, 'workshop.db');

fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');

const VALID_STATUS = ['booked', 'progress', 'parts', 'ready', 'done', 'invoiced'];
const OPEN_STATUS = ['booked', 'progress', 'parts', 'ready'];
const VALID_PRIORITY = ['low', 'normal', 'high', 'urgent'];

/* ---------- schema ---------- */
function init() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS customers (
      id      INTEGER PRIMARY KEY AUTOINCREMENT,
      name    TEXT NOT NULL,
      phone   TEXT DEFAULT '',
      email   TEXT DEFAULT '',
      notes   TEXT DEFAULT '',
      created TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      year        TEXT DEFAULT '',
      make        TEXT DEFAULT '',
      model       TEXT DEFAULT '',
      plate       TEXT DEFAULT '',
      colour      TEXT DEFAULT '',
      vin         TEXT DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS jobs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      vehicle_id  INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
      title       TEXT NOT NULL,
      status      TEXT NOT NULL DEFAULT 'booked',
      tech        TEXT DEFAULT '',
      priority    TEXT NOT NULL DEFAULT 'normal',
      odo         INTEGER,
      date_in     TEXT DEFAULT '',
      due_date    TEXT DEFAULT '',
      notes       TEXT DEFAULT '',
      created     TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS job_lines (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      kind   TEXT NOT NULL,            -- 'part' | 'labour'
      descr  TEXT DEFAULT '',
      qty    REAL DEFAULT 0,
      price  REAL DEFAULT 0,
      sort   INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS techs (
      id   INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_vehicles_customer ON vehicles(customer_id);
    CREATE INDEX IF NOT EXISTS idx_jobs_customer ON jobs(customer_id);
    CREATE INDEX IF NOT EXISTS idx_lines_job ON job_lines(job_id);
  `);
  // default settings
  const defaults = { rate: '90', currency: '$', tax: '0' };
  const ins = db.prepare('INSERT OR IGNORE INTO settings(key, value) VALUES (?, ?)');
  for (const [k, v] of Object.entries(defaults)) ins.run(k, v);
}

/* ---------- helpers ---------- */
function tx(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; }
  catch (e) { db.exec('ROLLBACK'); throw e; }
}

function lineTotal(l) { return (Number(l.qty) || 0) * (Number(l.price) || 0); }

function jobWithLines(row) {
  if (!row) return null;
  const lines = db.prepare('SELECT kind, descr AS desc, qty, price FROM job_lines WHERE job_id = ? ORDER BY sort, id').all(row.id);
  const parts = lines.filter(l => l.kind === 'part').map(({ kind, ...r }) => r);
  const labour = lines.filter(l => l.kind === 'labour').map(({ kind, ...r }) => r);
  return {
    id: row.id,
    customerId: row.customer_id,
    vehicleId: row.vehicle_id,
    title: row.title,
    status: row.status,
    tech: row.tech || '',
    priority: row.priority,
    odo: row.odo,
    dateIn: row.date_in || '',
    dueDate: row.due_date || '',
    notes: row.notes || '',
    parts,
    labour,
  };
}

function saveLines(jobId, kind, arr) {
  if (!Array.isArray(arr)) return;
  const ins = db.prepare('INSERT INTO job_lines(job_id, kind, descr, qty, price, sort) VALUES (?, ?, ?, ?, ?, ?)');
  arr.forEach((l, i) => {
    const desc = String(l.desc || '').trim();
    const qty = Number(l.qty) || 0;
    const price = Number(l.price) || 0;
    if (!desc && !qty && !price) return; // skip empty rows
    ins.run(jobId, kind, desc, qty, price, i);
  });
}

/* ---------- read ---------- */
function getCustomers() {
  return db.prepare('SELECT id, name, phone, email, notes FROM customers ORDER BY name COLLATE NOCASE').all();
}
function getVehicles() {
  return db.prepare('SELECT id, customer_id AS customerId, year, make, model, plate, colour, vin FROM vehicles').all();
}
function getJobs() {
  const rows = db.prepare('SELECT * FROM jobs ORDER BY id DESC').all();
  return rows.map(jobWithLines);
}
function getJob(id) {
  return jobWithLines(db.prepare('SELECT * FROM jobs WHERE id = ?').get(id));
}
function getTechs() {
  return db.prepare('SELECT name FROM techs ORDER BY name COLLATE NOCASE').all().map(r => r.name);
}
function getSettings() {
  const rows = db.prepare('SELECT key, value FROM settings').all();
  const s = {};
  for (const { key, value } of rows) s[key] = value;
  return { rate: Number(s.rate) || 0, currency: s.currency || '$', tax: Number(s.tax) || 0 };
}
function getState() {
  return { customers: getCustomers(), vehicles: getVehicles(), jobs: getJobs(), techs: getTechs(), settings: getSettings() };
}

/* ---------- customers ---------- */
function createCustomer(d) {
  const r = db.prepare('INSERT INTO customers(name, phone, email, notes) VALUES (?, ?, ?, ?)')
    .run(String(d.name || '').trim(), d.phone || '', d.email || '', d.notes || '');
  return db.prepare('SELECT id, name, phone, email, notes FROM customers WHERE id = ?').get(r.lastInsertRowid);
}
function updateCustomer(id, d) {
  db.prepare('UPDATE customers SET name = ?, phone = ?, email = ?, notes = ? WHERE id = ?')
    .run(String(d.name || '').trim(), d.phone || '', d.email || '', d.notes || '', id);
  return db.prepare('SELECT id, name, phone, email, notes FROM customers WHERE id = ?').get(id);
}
function deleteCustomer(id) {
  // cascades to vehicles and jobs (and job_lines) via FK
  return db.prepare('DELETE FROM customers WHERE id = ?').run(id).changes > 0;
}

/* ---------- vehicles ---------- */
function createVehicle(d) {
  const r = db.prepare('INSERT INTO vehicles(customer_id, year, make, model, plate, colour, vin) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(d.customerId, d.year || '', d.make || '', d.model || '', (d.plate || '').toUpperCase(), d.colour || '', (d.vin || '').toUpperCase());
  return db.prepare('SELECT id, customer_id AS customerId, year, make, model, plate, colour, vin FROM vehicles WHERE id = ?').get(r.lastInsertRowid);
}
function updateVehicle(id, d) {
  db.prepare('UPDATE vehicles SET customer_id = ?, year = ?, make = ?, model = ?, plate = ?, colour = ?, vin = ? WHERE id = ?')
    .run(d.customerId, d.year || '', d.make || '', d.model || '', (d.plate || '').toUpperCase(), d.colour || '', (d.vin || '').toUpperCase(), id);
  return db.prepare('SELECT id, customer_id AS customerId, year, make, model, plate, colour, vin FROM vehicles WHERE id = ?').get(id);
}
function deleteVehicle(id) {
  return db.prepare('DELETE FROM vehicles WHERE id = ?').run(id).changes > 0;
}

/* ---------- jobs ---------- */
function writeJobRow(id, d) {
  const status = VALID_STATUS.includes(d.status) ? d.status : 'booked';
  const priority = VALID_PRIORITY.includes(d.priority) ? d.priority : 'normal';
  const odo = d.odo === '' || d.odo == null ? null : Number(d.odo);
  const vehicleId = d.vehicleId ? Number(d.vehicleId) : null;
  if (id == null) {
    const r = db.prepare(`INSERT INTO jobs(customer_id, vehicle_id, title, status, tech, priority, odo, date_in, due_date, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(d.customerId, vehicleId, String(d.title || '').trim(), status, d.tech || '', priority, odo, d.dateIn || '', d.dueDate || '', d.notes || '');
    return Number(r.lastInsertRowid);
  }
  db.prepare(`UPDATE jobs SET customer_id = ?, vehicle_id = ?, title = ?, status = ?, tech = ?, priority = ?, odo = ?, date_in = ?, due_date = ?, notes = ? WHERE id = ?`)
    .run(d.customerId, vehicleId, String(d.title || '').trim(), status, d.tech || '', priority, odo, d.dateIn || '', d.dueDate || '', d.notes || '', id);
  return id;
}
function createJob(d) {
  return tx(() => {
    const id = writeJobRow(null, d);
    saveLines(id, 'part', d.parts);
    saveLines(id, 'labour', d.labour);
    return getJob(id);
  });
}
function updateJob(id, d) {
  return tx(() => {
    writeJobRow(id, d);
    db.prepare('DELETE FROM job_lines WHERE job_id = ?').run(id);
    saveLines(id, 'part', d.parts);
    saveLines(id, 'labour', d.labour);
    return getJob(id);
  });
}
function setJobStatus(id, status) {
  if (!VALID_STATUS.includes(status)) return null;
  db.prepare('UPDATE jobs SET status = ? WHERE id = ?').run(status, id);
  return getJob(id);
}
function deleteJob(id) {
  return db.prepare('DELETE FROM jobs WHERE id = ?').run(id).changes > 0;
}

/* ---------- techs ---------- */
function addTech(name) {
  name = String(name || '').trim();
  if (!name) return getTechs();
  db.prepare('INSERT OR IGNORE INTO techs(name) VALUES (?)').run(name);
  return getTechs();
}
function deleteTech(name) {
  db.prepare('DELETE FROM techs WHERE name = ?').run(name);
  return getTechs();
}

/* ---------- settings ---------- */
function updateSettings(d) {
  const set = db.prepare('INSERT INTO settings(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value');
  if (d.rate != null) set.run('rate', String(Number(d.rate) || 0));
  if (d.currency != null) set.run('currency', String(d.currency) || '$');
  if (d.tax != null) set.run('tax', String(Number(d.tax) || 0));
  return getSettings();
}

module.exports = {
  db, init, tx, lineTotal,
  VALID_STATUS, OPEN_STATUS, VALID_PRIORITY,
  getState, getCustomers, getVehicles, getJobs, getJob, getTechs, getSettings,
  createCustomer, updateCustomer, deleteCustomer,
  createVehicle, updateVehicle, deleteVehicle,
  createJob, updateJob, setJobStatus, deleteJob,
  addTech, deleteTech, updateSettings,
};
