// Centralizes "now" in Thailand's timezone (Asia/Bangkok, UTC+7, no DST) so
// every timestamp the app writes is consistent regardless of the server's
// own OS timezone (this app is often deployed on UTC hosts). Produces the
// same naive "YYYY-MM-DD HH:MM:SS" local-wall-clock format already used
// throughout the app for manually-entered dates and weather lookups.

const TIME_ZONE = 'Asia/Bangkok';

function nowThaiString() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIME_ZONE,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('year')}-${get('month')}-${get('day')} ${get('hour')}:${get('minute')}:${get('second')}`;
}

function todayThaiStr() {
  return nowThaiString().slice(0, 10);
}

// Current Thai local {hour, minute}, for comparing against an "HH:MM" schedule.
function nowThaiHourMinute() {
  const [, time] = nowThaiString().split(' ');
  const [hour, minute] = time.split(':').map(Number);
  return { hour, minute };
}

module.exports = { nowThaiString, todayThaiStr, nowThaiHourMinute };
