const express = require('express');
const db = require('../db');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/daily', (req, res) => {
  const date = req.query.date || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }

  const created = db
    .prepare(`SELECT * FROM tickets WHERE date(created_at) = date(?) ORDER BY created_at`)
    .all(date);

  const resolved = db
    .prepare(`SELECT * FROM tickets WHERE date(resolved_at) = date(?) ORDER BY resolved_at`)
    .all(date);

  const notesToday = db
    .prepare(
      `SELECT n.*, t.title AS ticket_title, t.status AS ticket_status
       FROM ticket_notes n
       JOIN tickets t ON t.id = n.ticket_id
       WHERE date(n.created_at) = date(?)
       ORDER BY n.created_at`
    )
    .all(date);

  const touchedIds = new Set([
    ...created.map((t) => t.id),
    ...resolved.map((t) => t.id),
    ...notesToday.map((n) => n.ticket_id),
  ]);

  const touched = touchedIds.size
    ? db
        .prepare(
          `SELECT * FROM tickets WHERE id IN (${[...touchedIds].map(() => '?').join(',')})`
        )
        .all(...touchedIds)
    : [];

  const statusCounts = db
    .prepare(`SELECT status, COUNT(*) AS count FROM tickets GROUP BY status`)
    .all();

  res.json({
    date,
    createdCount: created.length,
    resolvedCount: resolved.length,
    notesCount: notesToday.length,
    created,
    resolved,
    notes: notesToday,
    touchedTickets: touched,
    overallStatusCounts: statusCounts,
  });
});

module.exports = router;
