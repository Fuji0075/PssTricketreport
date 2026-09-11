const path = require('path');
const fs = require('fs');
const { DatabaseSync } = require('node:sqlite');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new DatabaseSync(path.join(dataDir, 'tickets.db'));

db.exec('PRAGMA journal_mode = WAL');

// better-sqlite3-style helper: db.transaction(fn) returns a function that
// runs fn inside BEGIN/COMMIT, rolling back on error.
db.transaction = (fn) => (...args) => {
  db.exec('BEGIN');
  try {
    const result = fn(...args);
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
};

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    company TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT,
    weather_snapshot TEXT
  );

  CREATE TABLE IF NOT EXISTS ticket_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS ticket_attachments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS anydesk_stores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    note TEXT,
    program TEXT NOT NULL DEFAULT 'AnyDesk'
  );

  CREATE TABLE IF NOT EXISTS anydesk_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES anydesk_stores(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    device_id TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS kb_articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    problem TEXT,
    solution TEXT NOT NULL,
    tags TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// Migration for databases created before the `program` column existed.
const anydeskColumns = db.prepare('PRAGMA table_info(anydesk_stores)').all();
if (!anydeskColumns.some((c) => c.name === 'program')) {
  db.exec("ALTER TABLE anydesk_stores ADD COLUMN program TEXT NOT NULL DEFAULT 'AnyDesk'");
}

// Migration for databases created before the `company` column existed.
const ticketColumns = db.prepare('PRAGMA table_info(tickets)').all();
if (!ticketColumns.some((c) => c.name === 'company')) {
  db.exec('ALTER TABLE tickets ADD COLUMN company TEXT');
}
if (!ticketColumns.some((c) => c.name === 'weather_snapshot')) {
  db.exec('ALTER TABLE tickets ADD COLUMN weather_snapshot TEXT');
}

function seedAnydeskDirectory() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM anydesk_stores').get().c;
  if (count > 0) return;

  const seedPath = path.join(__dirname, '..', '..', 'data', 'anydesk-directory.json');
  if (!fs.existsSync(seedPath)) return;

  const stores = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const insertStore = db.prepare('INSERT INTO anydesk_stores (name, note, program) VALUES (?, ?, ?)');
  const insertDevice = db.prepare(
    'INSERT INTO anydesk_devices (store_id, label, device_id) VALUES (?, ?, ?)'
  );

  const seedAll = db.transaction((items) => {
    items.forEach((store) => {
      const result = insertStore.run(store.name, store.note || null, store.program || 'AnyDesk');
      (store.devices || []).forEach((d) => {
        insertDevice.run(result.lastInsertRowid, d.label, d.id);
      });
    });
  });
  seedAll(stores);
}

seedAnydeskDirectory();

module.exports = db;
