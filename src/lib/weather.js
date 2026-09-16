// Best-effort weather snapshot for a ticket's branch at a given date/time.
// Normally derived from the location word that follows
// "โรบินสัน"/"Robinson" in the company field (e.g. "โรบินสัน ถลาง" ->
// "ถลาง"), but that guess is wrong whenever the branch name is a road or
// area rather than an official place (e.g. "ราชพฤกษ์" is a road, so
// Open-Meteo's geocoder can't find it at all) — anydesk_stores.weather_location
// lets a specific branch override the search term used, edited from the
// AnyDesk directory UI. Uses Open-Meteo, which needs no API key and covers
// both forecast (today/future) and historical (past) dates via two
// separate endpoints.

const db = require('../db');
const { nowThaiString, todayThaiStr } = require('./thaiTime');

const KNOWN_PREFIXES = [/anydesk/gi, /robinson/gi, /โรบินสัน/g];

function extractLocationKeyword(company) {
  if (!company) return null;
  let text = String(company);
  KNOWN_PREFIXES.forEach((re) => { text = text.replace(re, ''); });
  text = text.trim().replace(/\s+/g, ' ');
  return text || null;
}

function resolveWeatherLocation(company) {
  if (!company) return null;
  const store = db.prepare('SELECT weather_location FROM anydesk_stores WHERE name = ?').get(company);
  if (store && store.weather_location) return store.weather_location;
  return extractLocationKeyword(company);
}

// WMO weather codes, as used by Open-Meteo's `weathercode` field.
const WEATHER_CODE_TEXT = {
  0: 'ท้องฟ้าแจ่มใส', 1: 'มีเมฆบางส่วน', 2: 'มีเมฆบางส่วน', 3: 'เมฆมาก',
  45: 'หมอก', 48: 'หมอกน้ำแข็ง',
  51: 'ฝนปรอยเบา', 53: 'ฝนปรอย', 55: 'ฝนปรอยหนัก',
  56: 'ฝนปรอยเยือกแข็งเบา', 57: 'ฝนปรอยเยือกแข็งหนัก',
  61: 'ฝนตกเบา', 63: 'ฝนตกปานกลาง', 65: 'ฝนตกหนัก',
  66: 'ฝนเยือกแข็งเบา', 67: 'ฝนเยือกแข็งหนัก',
  71: 'หิมะตกเบา', 73: 'หิมะตกปานกลาง', 75: 'หิมะตกหนัก', 77: 'เกล็ดหิมะ',
  80: 'ฝนซู่เบา', 81: 'ฝนซู่ปานกลาง', 82: 'ฝนซู่หนักมาก',
  85: 'หิมะซู่เบา', 86: 'หิมะซู่หนัก',
  95: 'พายุฝนฟ้าคะนอง', 96: 'พายุฝนฟ้าคะนองมีลูกเห็บเบา', 99: 'พายุฝนฟ้าคะนองมีลูกเห็บหนัก',
};

function weatherCodeToText(code) {
  return WEATHER_CODE_TEXT[code] || null;
}

async function fetchJson(url, timeoutMs = 4000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

async function geocodeLocation(location) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=th&format=json`;
  const data = await fetchJson(url);
  const result = data && data.results && data.results[0];
  if (!result) return null;
  return { lat: result.latitude, lon: result.longitude, name: result.name };
}

// Accepts a JS Date, or a "YYYY-MM-DD HH:MM:SS" / "YYYY-MM-DDTHH:MM" string
// (the same shapes created_at is stored/edited in throughout this app) and
// splits it into a plain date and hour with no timezone conversion, since
// the rest of the app already treats these as naive local wall-clock values.
function splitDateAndHour(when) {
  if (when instanceof Date) {
    const y = when.getFullYear();
    const m = String(when.getMonth() + 1).padStart(2, '0');
    const d = String(when.getDate()).padStart(2, '0');
    return { dateStr: `${y}-${m}-${d}`, hour: when.getHours() };
  }
  const str = String(when || '').trim();
  const dateStr = str.slice(0, 10);
  const hour = Number(str.slice(11, 13));
  return { dateStr, hour: Number.isFinite(hour) ? hour : 12 };
}

async function fetchWeatherAt(location, when) {
  if (!location) return null;
  const geo = await geocodeLocation(location);
  if (!geo) return null;

  const { dateStr, hour } = splitDateAndHour(when || nowThaiString());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;

  const isPast = dateStr < todayThaiStr();
  const base = isPast
    ? 'https://archive-api.open-meteo.com/v1/archive'
    : 'https://api.open-meteo.com/v1/forecast';
  const url = `${base}?latitude=${geo.lat}&longitude=${geo.lon}&start_date=${dateStr}&end_date=${dateStr}` +
    `&hourly=temperature_2m,weathercode&timezone=Asia%2FBangkok`;

  const data = await fetchJson(url);
  const times = data && data.hourly && data.hourly.time;
  const temps = data && data.hourly && data.hourly.temperature_2m;
  const codes = data && data.hourly && data.hourly.weathercode;
  if (!times || !times.length) return null;

  let idx = times.findIndex((t) => Number(t.slice(11, 13)) === hour);
  if (idx === -1) idx = Math.min(hour, times.length - 1);
  const temp = temps[idx];
  const code = codes[idx];
  if (temp === undefined || temp === null) return null;

  const desc = weatherCodeToText(code);
  const parts = [`${temp}°C`];
  if (desc) parts.push(desc);
  parts.push(`(${geo.name})`);
  return parts.join(' ');
}

async function weatherSnapshotForCompany(company, when) {
  const location = resolveWeatherLocation(company);
  if (!location) return null;
  return fetchWeatherAt(location, when);
}

module.exports = { extractLocationKeyword, fetchWeatherAt, weatherSnapshotForCompany };
