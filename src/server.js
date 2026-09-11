const express = require('express');
const path = require('path');
const ticketsRouter = require('./routes/tickets');
const summaryRouter = require('./routes/summary');
const anydeskRouter = require('./routes/anydesk');
const kbRouter = require('./routes/kb');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/tickets', ticketsRouter);
app.use('/api/summary', summaryRouter);
app.use('/api/anydesk', anydeskRouter);
app.use('/api/kb', kbRouter);

app.use((err, req, res, next) => {
  if (err) {
    return res.status(400).json({ error: err.message || 'Upload error' });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Ticket report server running at http://localhost:${PORT}`);
});
