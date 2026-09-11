// Best-effort weather snapshot for a ticket's branch, looked up from the
// location word that follows "โรบินสัน"/"Robinson" in the company field
// (e.g. "โรบินสัน ถลาง" -> "ถลาง"). Uses wttr.in, which needs no API key.

const KNOWN_PREFIXES = [/anydesk/gi, /robinson/gi, /โรบินสัน/g];

function extractLocationKeyword(company) {
  if (!company) return null;
  let text = String(company);
  KNOWN_PREFIXES.forEach((re) => { text = text.replace(re, ''); });
  text = text.trim().replace(/\s+/g, ' ');
  return text || null;
}

async function fetchWeatherSnapshot(location) {
  if (!location) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1`, {
      signal: controller.signal,
      headers: { 'User-Agent': 'curl' }, // wttr.in serves plain text to some UAs; force JSON-friendly response
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition && data.current_condition[0];
    if (!current) return null;
    const desc = current.weatherDesc && current.weatherDesc[0] && current.weatherDesc[0].value;
    const areaName = data.nearest_area && data.nearest_area[0] && data.nearest_area[0].areaName
      && data.nearest_area[0].areaName[0] && data.nearest_area[0].areaName[0].value;
    const parts = [`${current.temp_C}°C`];
    if (desc) parts.push(desc);
    if (areaName) parts.push(`(${areaName})`);
    return parts.join(' ');
  } catch {
    return null;
  }
}

async function weatherSnapshotForCompany(company) {
  const location = extractLocationKeyword(company);
  if (!location) return null;
  return fetchWeatherSnapshot(location);
}

module.exports = { extractLocationKeyword, fetchWeatherSnapshot, weatherSnapshotForCompany };
