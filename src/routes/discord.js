const express = require('express');
const { isConfigured, sendDiscordMessage } = require('../lib/discord');
const { buildDailySummaryText } = require('../lib/dailySummaryText');
const { getDailySummaryData, todayStr } = require('./summary');

const router = express.Router();

// Lets the frontend show/hide the "ส่งไป Discord" button without exposing
// the webhook URL itself.
router.get('/status', (req, res) => {
  res.json({ configured: isConfigured() });
});

// Relay endpoint for the manual "send now" button — keeps DISCORD_WEBHOOK_URL
// server-side only. Rebuilds the summary text from the given date so it's
// always in sync with what's on screen (the same computation as GET
// /api/summary/daily + the frontend's buildDailySummaryText).
router.post('/send', async (req, res) => {
  if (!isConfigured()) {
    return res.status(400).json({ error: 'DISCORD_WEBHOOK_URL is not configured' });
  }
  const date = req.body.date || todayStr();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must be in YYYY-MM-DD format' });
  }
  const data = getDailySummaryData(date);
  const text = buildDailySummaryText(data);
  const ok = await sendDiscordMessage(`📋 สรุปงานประจำวัน\n\n${text}`);
  if (!ok) return res.status(502).json({ error: 'Failed to send message to Discord' });
  res.json({ sent: true });
});

module.exports = router;
