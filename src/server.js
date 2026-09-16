const express = require('express');
const path = require('path');
const db = require('./db');
const ticketsRouter = require('./routes/tickets');
const summaryRouter = require('./routes/summary');
const anydeskRouter = require('./routes/anydesk');
const kbRouter = require('./routes/kb');
const lineRouter = require('./routes/line');
const discordRouter = require('./routes/discord');
const { isDailySummaryConfigured, sendDailySummaryMessage } = require('./lib/discord');
const { buildDailySummaryText } = require('./lib/dailySummaryText');
const { getDailySummaryData, todayStr } = require('./routes/summary');
const { nowThaiHourMinute } = require('./lib/thaiTime');

const app = express();
const PORT = process.env.PORT || 3000;

// `verify` stashes the raw request body so the LINE webhook can check its
// HMAC signature; harmless for every other route, which only reads req.body.
app.use(express.json({ verify: (req, _res, buf) => { req.rawBody = buf; } }));
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/tickets', ticketsRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/anydesk', anydeskRouter);
app.use('/api/kb', kbRouter);
app.use('/api/discord', discordRouter);
app.use('/webhook', lineRouter);

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Ticket report server running at http://localhost:${PORT}`);
});

// Automatic daily-summary send to Discord, once per day at
// DISCORD_DAILY_SUMMARY_TIME (default "18:00", 24h "HH:MM"). Checked every
// minute; the last-sent date is persisted in app_state so a restart around
// the target time never double-sends or silently skips the day.
const DAILY_SUMMARY_TIME = process.env.DISCORD_DAILY_SUMMARY_TIME || '18:00';
const LAST_SENT_KEY = 'discord_last_daily_summary_date';

async function checkAndSendScheduledSummary() {
  if (!isDailySummaryConfigured()) return;
  const [targetHour, targetMinute] = DAILY_SUMMARY_TIME.split(':').map(Number);
  if (!Number.isFinite(targetHour) || !Number.isFinite(targetMinute)) return;

  const { hour, minute } = nowThaiHourMinute();
  const today = todayStr();
  if (db.getAppState(LAST_SENT_KEY) === today) return;
  if (hour < targetHour) return;
  if (hour === targetHour && minute < targetMinute) return;

  const data = getDailySummaryData(today);
  const text = buildDailySummaryText(data);
  const ok = await sendDailySummaryMessage(`📋 สรุปงานประจำวัน\n\n${text}`);
  if (ok) db.setAppState(LAST_SENT_KEY, today);
}

setInterval(() => {
  checkAndSendScheduledSummary().catch((err) => console.error('Scheduled Discord summary failed', err));
}, 60 * 1000);
checkAndSendScheduledSummary().catch((err) => console.error('Scheduled Discord summary failed', err));
