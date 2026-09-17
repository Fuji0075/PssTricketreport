const express = require('express');
const crypto = require('crypto');
const db = require('../db');
const { weatherSnapshotForCompany } = require('../lib/weather');
const { sendNewTicketMessage, buildNewTicketMessage } = require('../lib/discord');
const { nowThaiString } = require('../lib/thaiTime');
const { formatTicketTitle } = require('../lib/ticketTitle');

const router = express.Router();

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET;
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

function verifySignature(rawBody, signature) {
  if (!CHANNEL_SECRET || !signature || !rawBody) return false;
  const expected = crypto.createHmac('sha256', CHANNEL_SECRET).update(rawBody).digest('base64');
  // Both sides are short, fixed-format base64 signatures — constant-time
  // comparison avoids leaking the correct value one byte at a time.
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function lineApi(path, body) {
  try {
    const res = await fetch(`https://api.line.me${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error('LINE API error', path, res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    console.error('LINE API request failed', path, err.message);
  }
}

async function replyText(replyToken, text) {
  await lineApi('/v2/bot/message/reply', { replyToken, messages: [{ type: 'text', text }] });
}

async function fetchGroupName(groupId) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/summary`, {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.groupName || null;
  } catch {
    return null;
  }
}

async function fetchGroupMemberName(groupId, userId) {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/group/${groupId}/member/${userId}`, {
      headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.displayName || null;
  } catch {
    return null;
  }
}

// Extracts the text after a mention of the bot itself, or null if the bot
// wasn't mentioned in this message at all.
function extractTicketText(message) {
  const text = message.text || '';
  const mentionees = (message.mention && message.mention.mentionees) || [];
  const selfMention = mentionees.find((m) => m.isSelf);
  if (!selfMention) return null;
  const before = text.slice(0, selfMention.index);
  const after = text.slice(selfMention.index + selfMention.length);
  return (before + after).replace(/\s+/g, ' ').trim();
}

async function createTicketFromLine({ title, description, company, reporterNote }) {
  const now = nowThaiString();
  const formattedTitle = formatTicketTitle(company, title);
  const result = db
    .prepare(
      `INSERT INTO tickets (title, description, assignee, company, status, priority, created_at, updated_at)
       VALUES (?, ?, '', ?, 'open', 'medium', ?, ?)`
    )
    .run(formattedTitle, description, company || '', now, now);
  const ticketId = result.lastInsertRowid;
  if (reporterNote) {
    db.prepare('INSERT INTO ticket_notes (ticket_id, note, created_at) VALUES (?, ?, ?)').run(ticketId, reporterNote, now);
  }
  const weatherSnapshot = await weatherSnapshotForCompany(company, now);
  if (weatherSnapshot) {
    db.prepare('UPDATE tickets SET weather_snapshot = ? WHERE id = ?').run(weatherSnapshot, ticketId);
  }
  const ticket = db.prepare('SELECT * FROM tickets WHERE id = ?').get(ticketId);
  sendNewTicketMessage(buildNewTicketMessage(ticket)).catch(() => {});
  return ticket;
}

router.post('/line', async (req, res) => {
  if (!CHANNEL_SECRET || !CHANNEL_ACCESS_TOKEN) {
    console.warn('LINE webhook called but LINE_CHANNEL_SECRET / LINE_CHANNEL_ACCESS_TOKEN is not set');
    return res.status(200).end();
  }

  const signature = req.header('x-line-signature');
  if (!verifySignature(req.rawBody, signature)) {
    return res.status(401).end();
  }

  // Acknowledge immediately; LINE expects a fast response and retries on timeout.
  res.status(200).end();

  const events = req.body.events || [];
  for (const event of events) {
    try {
      if (event.type !== 'message' || event.message.type !== 'text') continue;
      if (event.source.type !== 'group' && event.source.type !== 'room') continue;

      const ticketText = extractTicketText(event.message);
      if (ticketText === null) continue; // bot wasn't mentioned — ignore normal chat

      if (!ticketText) {
        await replyText(event.replyToken, 'พิมพ์รายละเอียดปัญหาต่อท้ายการแท็กด้วยนะครับ เช่น "@บอท เครื่องพิมพ์เสีย ไฟไม่ติด"');
        continue;
      }

      const groupId = event.source.groupId || event.source.roomId;
      const [groupName, reporterName] = await Promise.all([
        groupId ? fetchGroupName(groupId) : null,
        event.source.userId ? fetchGroupMemberName(groupId, event.source.userId) : null,
      ]);

      const title = ticketText.length > 80 ? `${ticketText.slice(0, 80)}…` : ticketText;
      const reporterNote = `แจ้งจาก LINE กลุ่ม${groupName ? ` "${groupName}"` : ''}${reporterName ? ` โดย ${reporterName}` : ''}: ${ticketText}`;

      const ticket = await createTicketFromLine({
        title,
        description: ticketText,
        company: groupName,
        reporterNote,
      });

      await replyText(event.replyToken, `รับเรื่องแล้วครับ ✅ Ticket #${ticket.id}: ${ticket.title}`);
    } catch (err) {
      console.error('Failed to process LINE event', err);
    }
  }
});

module.exports = router;
