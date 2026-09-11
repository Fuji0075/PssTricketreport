const express = require('express');
const path = require('path');
const ticketsRouter = require('./routes/tickets');
const summaryRouter = require('./routes/summary');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.use('/api/tickets', ticketsRouter);
app.use('/api/summary', summaryRouter);

app.listen(PORT, () => {
  console.log(`Ticket report server running at http://localhost:${PORT}`);
});
