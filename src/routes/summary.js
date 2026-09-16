const express = require('express');
const db = require('../db');

const router = express.Router();

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// Extracted so the Discord daily-summary scheduler can reuse the exact same
// data the /daily route returns, without making an HTTP request to itself.
function getDailySummaryData(date, staleDays = 2) {
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

  const pending = db
    .prepare(
      `SELECT *, CAST(julianday('now') - julianday(updated_at) AS INTEGER) AS days_stale
       FROM tickets
       WHERE status NOT IN ('done', 'on-hold') AND julianday('now') - julianday(updated_at) >= ?
       ORDER BY updated_at ASC`
    )
    .all(staleDays);

  return {
    date,
    createdCount: created.length,
    resolvedCount: resolved.length,
    notesCount: notesToday.length,
    created,
    resolved,
    notes: notesToday,
    touchedTickets: touched,
    overallStatusCounts: statusCounts,
    pendingTickets: pending,
  };
}

router.get('/daily', (req, res) => {
  const date = req.query.date || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }
  const staleDays = Number(req.query.staleDays) || 2;
  res.json(getDailySummaryData(date, staleDays));
});

router.get('/pending', (req, res) => {
  const staleDays = Number(req.query.staleDays) || 2;
  const pending = db
    .prepare(
      `SELECT *, CAST(julianday('now') - julianday(updated_at) AS INTEGER) AS days_stale
       FROM tickets
       WHERE status NOT IN ('done', 'on-hold') AND julianday('now') - julianday(updated_at) >= ?
       ORDER BY updated_at ASC`
    )
    .all(staleDays);
  res.json({ staleDays, count: pending.length, tickets: pending });
});

module.exports = router;
module.exports.getDailySummaryData = getDailySummaryData;
module.exports.todayStr = todayStr;
