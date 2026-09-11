const express = require('express');
const path = require('path');
const ticketsRouter = require('./routes/tickets');
const summaryRouter = require('./routes/summary');
const anydeskRouter = require('./routes/anydesk');
const kbRouter = require('./routes/kb');
const lineRouter = require('./routes/line');

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
