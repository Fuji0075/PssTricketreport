const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const dataDir = path.join(__dirname, '..', '..', 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'tickets.db'));

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    resolved_at TEXT
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
    note TEXT
  );

  CREATE TABLE IF NOT EXISTS anydesk_devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    store_id INTEGER NOT NULL REFERENCES anydesk_stores(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    device_id TEXT NOT NULL
  );
`);

function seedAnydeskDirectory() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM anydesk_stores').get().c;
  if (count > 0) return;

  const seedPath = path.join(__dirname, '..', '..', 'data', 'anydesk-directory.json');
  if (!fs.existsSync(seedPath)) return;

  const stores = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const insertStore = db.prepare('INSERT INTO anydesk_stores (name, note) VALUES (?, ?)');
  const insertDevice = db.prepare(
    'INSERT INTO anydesk_devices (store_id, label, device_id) VALUES (?, ?, ?)'
  );

  const seedAll = db.transaction((items) => {
    items.forEach((store) => {
      const result = insertStore.run(store.name, store.note || null);
      (store.devices || []).forEach((d) => {
        insertDevice.run(result.lastInsertRowid, d.label, d.id);
      });
    });
  });
  seedAll(stores);
}

seedAnydeskDirectory();

module.exports = db;
