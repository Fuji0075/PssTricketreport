const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../db');
const { weatherSnapshotForCompany } = require('../lib/weather');
const { sendNewTicketMessage, buildNewTicketMessage } = require('../lib/discord');
const { nowThaiString } = require('../lib/thaiTime');
const { formatTicketTitle } = require('../lib/ticketTitle');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const uploadsDir = path.join(__dirname, '..', '..', 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const imageUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Only image files are allowed'));
    }
    cb(null, true);
  },
  limits: { fileSize: 8 * 1024 * 1024 },
});

const VALID_STATUS = ['open', 'in-progress', 'on-hold', 'done'];
const VALID_PRIORITY = ['low', 'medium', 'high', 'urgent'];

function serializeTicket(row) {
  return row;
}

router.get('/', (req, res) => {
  const { status, assignee } = req.query;
  let sql = 'SELECT * FROM tickets';
  const clauses = [];
  const params = [];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (assignee) {
    clauses.push('assignee = ?');
    params.push(assignee);
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY updated_at DESC';
  const rows = db.prepare(sql).all(...params);
  const attachmentsStmt = db.prepare(
    'SELECT id, filename, original_name FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at DESC'
  );
  const withAttachments = rows.map((t) => ({ ...serializeTicket(t), attachments: attachmentsStmt.all(t.id) }));
  res.json(withAttachments);
});

router.get('/meta/companies', (req, res) => {
  const rows = db
    .prepare(`SELECT DISTINCT company FROM tickets WHERE company IS NOT NULL AND TRIM(company) != '' ORDER BY company`)
    .all();
  res.json(rows.map((r) => r.company));
});

router.get('/:id', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const notes = db
    .prepare('SELECT * FROM ticket_notes WHERE ticket_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  const attachments = db
    .prepare('SELECT * FROM ticket_attachments WHERE ticket_id = ? ORDER BY created_at DESC')
    .all(req.params.id);
  res.json({ ...ticket, notes, attachments });
});

router.post('/', async (req, res) => {
  const { title, description = '', assignee = '', company = '', status = 'open', priority = 'medium' } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUS.join(', ')}` });
  }
  if (!VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITY.join(', ')}` });
  }

  // Optional: backdate/forward-date the ticket (e.g. logging a past
  // incident), which also anchors which date the weather lookup uses.
  let createdAt = null;
  if (req.body.created_at) {
    createdAt = normalizeDateTimeLocal(req.body.created_at);
    if (!createdAt) {
      return res.status(400).json({ error: 'created_at must be a valid date/time' });
    }
  }

  const effectiveCreatedAt = createdAt || nowThaiString();
  const resolvedAt = status === 'done' ? nowThaiString() : null;
  const formattedTitle = formatTicketTitle(company, title);
  const result = db.prepare(
    `INSERT INTO tickets (title, description, assignee, company, status, priority, resolved_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(formattedTitle, description, assignee, company, status, priority, resolvedAt, effectiveCreatedAt, effectiveCreatedAt);

  // Best-effort weather snapshot for the branch at the ticket's date (the
  // chosen created_at, or now); a slow/failed lookup never blocks ticket
  // creation for long (weatherSnapshotForCompany times out on its own).
  const weatherSnapshot = await weatherSnapshotForCompany(company, effectiveCreatedAt);
  if (weatherSnapshot) {
    db.prepare('UPDATE tickets SET weather_snapshot = ? WHERE id = ?').run(weatherSnapshot, result.lastInsertRowid);
  }

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(ticket);

  // Fire-and-forget: never let a slow/failed Discord webhook delay the response.
  sendNewTicketMessage(buildNewTicketMessage(ticket)).catch(() => {});
});

function normalizeDateTimeLocal(value) {
  // Accepts "YYYY-MM-DDTHH:MM" (from <input type="datetime-local">) or
  // "YYYY-MM-DD HH:MM:SS" and returns SQLite's "YYYY-MM-DD HH:MM:SS" form.
  const match = String(value).trim().match(
    /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(:\d{2})?$/
  );
  if (!match) return null;
  return `${match[1]} ${match[2]}${match[3] || ':00'}`;
}

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Ticket not found' });

  const title = req.body.title ?? existing.title;
  const description = req.body.description ?? existing.description;
  const assignee = req.body.assignee ?? existing.assignee;
  const company = req.body.company ?? existing.company;
  const status = req.body.status ?? existing.status;
  const priority = req.body.priority ?? existing.priority;

  if (!VALID_STATUS.includes(status)) {
    return res.status(400).json({ error: `status must be one of ${VALID_STATUS.join(', ')}` });
  }
  if (!VALID_PRIORITY.includes(priority)) {
    return res.status(400).json({ error: `priority must be one of ${VALID_PRIORITY.join(', ')}` });
  }

  let createdAt = existing.created_at;
  if (req.body.created_at !== undefined) {
    const normalized = normalizeDateTimeLocal(req.body.created_at);
    if (!normalized) {
      return res.status(400).json({ error: 'created_at must be a valid date/time' });
    }
    createdAt = normalized;
  }

  let resolvedAt = existing.resolved_at;
  if (status === 'done' && existing.status !== 'done') {
    resolvedAt = nowThaiString();
  } else if (status !== 'done') {
    resolvedAt = null;
  }

  db.prepare(
    `UPDATE tickets SET title = ?, description = ?, assignee = ?, company = ?, status = ?, priority = ?,
     created_at = ?, resolved_at = ?, updated_at = ? WHERE id = ?`
  ).run(title, description, assignee, company, status, priority, createdAt, resolvedAt, nowThaiString(), req.params.id);

  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  res.json(ticket);
});

router.delete('/:id', (req, res) => {
  const attachments = db
    .prepare('SELECT filename FROM ticket_attachments WHERE ticket_id = ?')
    .all(req.params.id);
  const result = db.prepare('DELETE FROM tickets WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Ticket not found' });
  attachments.forEach((a) => {
    const filePath = path.join(uploadsDir, a.filename);
    fs.unlink(filePath, () => {});
  });
  res.status(204).end();
});

router.post('/:id/attachments', imageUpload.single('image'), (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (!req.file) return res.status(400).json({ error: 'image file is required (field name: image)' });
  const result = db
    .prepare(
      'INSERT INTO ticket_attachments (ticket_id, filename, original_name, mime_type) VALUES (?, ?, ?, ?)'
    )
    .run(req.params.id, req.file.filename, req.file.originalname, req.file.mimetype);
  db.prepare(`UPDATE tickets SET updated_at = ? WHERE id = ?`).run(nowThaiString(), req.params.id);
  const attachment = db.prepare('SELECT * FROM ticket_attachments WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(attachment);
});

router.delete('/:id/attachments/:attachmentId', (req, res) => {
  const attachment = db
    .prepare('SELECT * FROM ticket_attachments WHERE id = ? AND ticket_id = ?')
    .get(req.params.attachmentId, req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
  db.prepare('DELETE FROM ticket_attachments WHERE id = ?').run(req.params.attachmentId);
  fs.unlink(path.join(uploadsDir, attachment.filename), () => {});
  res.status(204).end();
});

router.post('/:id/notes', (req, res) => {
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { note } = req.body;
  if (!note || !note.trim()) return res.status(400).json({ error: 'note is required' });
  const result = db
    .prepare('INSERT INTO ticket_notes (ticket_id, note, created_at) VALUES (?, ?, ?)')
    .run(req.params.id, note.trim(), nowThaiString());
  db.prepare(`UPDATE tickets SET updated_at = ? WHERE id = ?`).run(nowThaiString(), req.params.id);
  const created = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

router.put('/:id/notes/:noteId', (req, res) => {
  const existing = db
    .prepare('SELECT * FROM ticket_notes WHERE id = ? AND ticket_id = ?')
    .get(req.params.noteId, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });
  const { note } = req.body;
  if (!note || !note.trim()) return res.status(400).json({ error: 'note is required' });
  db.prepare('UPDATE ticket_notes SET note = ? WHERE id = ?').run(note.trim(), req.params.noteId);
  const updated = db.prepare('SELECT * FROM ticket_notes WHERE id = ?').get(req.params.noteId);
  res.json(updated);
});

router.delete('/:id/notes/:noteId', (req, res) => {
  const result = db
    .prepare('DELETE FROM ticket_notes WHERE id = ? AND ticket_id = ?')
    .run(req.params.noteId, req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Note not found' });
  res.status(204).end();
});

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((c) => c.trim());
    const row = {};
    headers.forEach((h, i) => {
      row[h] = cells[i] ?? '';
    });
    return row;
  });
}

router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file is required (field name: file)' });
  const text = req.file.buffer.toString('utf-8');
  const rows = parseCsv(text);

  const insert = db.prepare(
    `INSERT INTO tickets (title, description, assignee, company, status, priority, resolved_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  let imported = 0;
  const errors = [];
  const insertMany = db.transaction((items) => {
    items.forEach((row, idx) => {
      const title = row.title;
      if (!title) {
        errors.push({ line: idx + 2, error: 'missing title' });
        return;
      }
      const status = VALID_STATUS.includes(row.status) ? row.status : 'open';
      const priority = VALID_PRIORITY.includes(row.priority) ? row.priority : 'medium';
      const now = nowThaiString();
      const resolvedAt = status === 'done' ? now : null;
      insert.run(title, row.description || '', row.assignee || '', row.company || '', status, priority, resolvedAt, now, now);
      imported += 1;
    });
  });
  insertMany(rows);

  res.json({ imported, errors });
});

module.exports = router;
