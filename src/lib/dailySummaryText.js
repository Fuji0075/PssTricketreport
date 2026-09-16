// Ported from public/app.js's buildDailySummaryText — kept in sync manually
// since the frontend and backend don't share a build step. Produces the
// same copy-ready plain text shown in the Daily Summary tab, used here so
// the Discord scheduler/relay can send identical text server-side.

const THAI_MONTHS_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];

function buildDailySummaryText(data) {
  const d = new Date(`${data.date}T00:00:00`);
  const beYear = (d.getFullYear() + 543) % 100;
  const header = `วันที่ ${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]} ${beYear}`;

  const notesByTicket = {};
  (data.notes || []).forEach((n) => {
    (notesByTicket[n.ticket_id] = notesByTicket[n.ticket_id] || []).push(n.note);
  });

  const tickets = [...(data.touchedTickets || [])].sort((a, b) => a.id - b.id);

  const lines = [header, ''];
  tickets.forEach((t, i) => {
    lines.push(`${i + 1}. ${t.title}`);
    const noteLines = notesByTicket[t.id];
    if (noteLines && noteLines.length) {
      noteLines.forEach((n) => lines.push(`- ${n}`));
    } else if (t.description) {
      lines.push(`- ${t.description}`);
    }
    lines.push('');
  });

  if (tickets.length === 0) lines.push('(ไม่มี ticket ที่มีความเคลื่อนไหววันนี้)');

  return lines.join('\n').trim();
}

module.exports = { buildDailySummaryText };
