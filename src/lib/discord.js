// Best-effort Discord notifications via an incoming webhook URL
// (Server Settings > Integrations > Webhooks in Discord — no bot/OAuth
// needed). Every call is wrapped so a missing config or network failure
// never throws into the caller; callers fire this without awaiting when it
// shouldn't add latency (e.g. ticket creation).

const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function isConfigured() {
  return Boolean(WEBHOOK_URL);
}

// Discord caps message content at 2000 chars; split on line boundaries so a
// long daily summary doesn't get cut mid-line.
function chunkMessage(content, maxLen = 1900) {
  const lines = String(content).split('\n');
  const chunks = [];
  let current = '';
  lines.forEach((line) => {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxLen && current) {
      chunks.push(current);
      current = line;
    } else {
      current = candidate;
    }
  });
  if (current) chunks.push(current);
  return chunks.length ? chunks : [''];
}

async function sendDiscordMessage(content) {
  if (!WEBHOOK_URL) return false;
  try {
    const chunks = chunkMessage(content);
    for (const chunk of chunks) {
      const res = await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: chunk }),
      });
      if (!res.ok) {
        console.error('Discord webhook error', res.status, await res.text().catch(() => ''));
        return false;
      }
    }
    return true;
  } catch (err) {
    console.error('Discord webhook request failed', err.message);
    return false;
  }
}

function buildNewTicketMessage(ticket) {
  const lines = [
    `🆕 Ticket ใหม่ #${ticket.id}: ${ticket.title}`,
  ];
  if (ticket.company) lines.push(`🏢 ${ticket.company}`);
  if (ticket.assignee) lines.push(`👤 ผู้รับผิดชอบ: ${ticket.assignee}`);
  lines.push(`สถานะ: ${ticket.status} | ความสำคัญ: ${ticket.priority}`);
  if (ticket.weather_snapshot) lines.push(`🌤️ ${ticket.weather_snapshot}`);
  if (ticket.description) lines.push(`รายละเอียด: ${ticket.description}`);
  return lines.join('\n');
}

module.exports = { isConfigured, sendDiscordMessage, buildNewTicketMessage };
