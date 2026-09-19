const express = require('express');
const db = require('../db');
const { todayThaiStr } = require('../lib/thaiTime');

const router = express.Router();

function todayStr() {
  return todayThaiStr();
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
      `SELECT *, CAST(julianday(datetime('now', '+7 hours')) - julianday(updated_at) AS INTEGER) AS days_stale
       FROM tickets
       WHERE status NOT IN ('done', 'on-hold') AND julianday(datetime('now', '+7 hours')) - julianday(updated_at) >= ?
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

// Ticket history over an arbitrary date range (not just "today"), optionally
// scoped to one company/branch — backs the "สรุปตามสาขา" report, which needs
// to look back further than a single day.
function getRangeSummaryData(fromDate, toDate, company) {
  let sql = `SELECT * FROM tickets WHERE date(created_at) BETWEEN date(?) AND date(?)`;
  const params = [fromDate, toDate];
  if (company) {
    sql += ' AND company = ?';
    params.push(company);
  }
  sql += ' ORDER BY company, created_at';
  const tickets = db.prepare(sql).all(...params);

  const ids = tickets.map((t) => t.id);
  const notes = ids.length
    ? db
        .prepare(
          `SELECT * FROM ticket_notes WHERE ticket_id IN (${ids.map(() => '?').join(',')}) ORDER BY created_at`
        )
        .all(...ids)
    : [];

  return { from: fromDate, to: toDate, company: company || null, tickets, notes };
}

router.get('/range', (req, res) => {
  const { from, to, company } = req.query;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from || '') || !/^\d{4}-\d{2}-\d{2}$/.test(to || '')) {
    return res.status(400).json({ error: 'from and to must be in YYYY-MM-DD format' });
  }
  res.json(getRangeSummaryData(from, to, company));
});

// Keyword-driven case analysis over all (or a date-ranged) ticket history:
// how many cases matched each keyword (e.g. "กระดาษติด", "ไม้กั้นไม่เปิด" —
// paper jam, barrier gate not opening), how many of those are fixed (status
// done) vs still unresolved, and which resolution note (the comment left in
// the ticket's Activity thread) recurs most often — since the same keyword
// issue is frequently solved the same way, this surfaces that pattern
// instead of making someone read every ticket's comments by hand.
function getKeywordAnalysis(keywords, fromDate, toDate) {
  let sql = 'SELECT * FROM tickets';
  const clauses = [];
  const params = [];
  if (fromDate) {
    clauses.push('date(created_at) >= date(?)');
    params.push(fromDate);
  }
  if (toDate) {
    clauses.push('date(created_at) <= date(?)');
    params.push(toDate);
  }
  if (clauses.length) sql += ' WHERE ' + clauses.join(' AND ');
  sql += ' ORDER BY created_at';
  const tickets = db.prepare(sql).all(...params);

  const ticketIds = tickets.map((t) => t.id);
  const allNotes = ticketIds.length
    ? db
        .prepare(
          `SELECT * FROM ticket_notes WHERE ticket_id IN (${ticketIds.map(() => '?').join(',')}) ORDER BY created_at`
        )
        .all(...ticketIds)
    : [];
  const notesByTicket = {};
  allNotes.forEach((n) => {
    (notesByTicket[n.ticket_id] = notesByTicket[n.ticket_id] || []).push(n.note);
  });

  const totalCases = tickets.length;
  const fixedCases = tickets.filter((t) => t.status === 'done').length;
  const unresolvedCases = totalCases - fixedCases;

  const keywordBreakdown = keywords.map((keyword) => {
    const needle = keyword.trim().toLowerCase();
    const matches = tickets.filter((t) => {
      const notesText = (notesByTicket[t.id] || []).join(' ');
      return `${t.title} ${t.description || ''} ${notesText}`.toLowerCase().includes(needle);
    });

    // The fix is sometimes written in the ticket's description field
    // instead of (or as well as) a comment, so both count as "solution" text.
    const solutionCounts = new Map();
    matches.forEach((t) => {
      const candidates = [...(notesByTicket[t.id] || []), t.description];
      candidates.forEach((text) => {
        const normalized = String(text || '').trim().replace(/\s+/g, ' ');
        if (!normalized) return;
        solutionCounts.set(normalized, (solutionCounts.get(normalized) || 0) + 1);
      });
    });
    const topSolutions = [...solutionCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([solution, count]) => ({ solution, count }));

    return {
      keyword,
      count: matches.length,
      fixedCount: matches.filter((t) => t.status === 'done').length,
      unresolvedCount: matches.filter((t) => t.status !== 'done').length,
      tickets: matches.map((t) => ({
        id: t.id, title: t.title, status: t.status, company: t.company, created_at: t.created_at,
        description: t.description || '',
        notes: notesByTicket[t.id] || [],
      })),
      topSolutions,
    };
  });

  return {
    from: fromDate || null,
    to: toDate || null,
    totalCases,
    fixedCases,
    unresolvedCases,
    keywordBreakdown,
  };
}

router.get('/keywords', (req, res) => {
  const keywords = String(req.query.keywords || '')
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean);
  if (keywords.length === 0) {
    return res.status(400).json({ error: 'keywords is required (comma-separated)' });
  }
  const { from, to } = req.query;
  if (from && !/^\d{4}-\d{2}-\d{2}$/.test(from)) {
    return res.status(400).json({ error: 'from must be in YYYY-MM-DD format' });
  }
  if (to && !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return res.status(400).json({ error: 'to must be in YYYY-MM-DD format' });
  }
  res.json(getKeywordAnalysis(keywords, from, to));
});

router.get('/pending', (req, res) => {
  const staleDays = Number(req.query.staleDays) || 2;
  const pending = db
    .prepare(
      `SELECT *, CAST(julianday(datetime('now', '+7 hours')) - julianday(updated_at) AS INTEGER) AS days_stale
       FROM tickets
       WHERE status NOT IN ('done', 'on-hold') AND julianday(datetime('now', '+7 hours')) - julianday(updated_at) >= ?
       ORDER BY updated_at ASC`
    )
    .all(staleDays);
  res.json({ staleDays, count: pending.length, tickets: pending });
});

module.exports = router;
module.exports.getDailySummaryData = getDailySummaryData;
module.exports.getRangeSummaryData = getRangeSummaryData;
module.exports.getKeywordAnalysis = getKeywordAnalysis;
module.exports.todayStr = todayStr;
