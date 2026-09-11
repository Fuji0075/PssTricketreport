const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { q } = req.query;
  let articles = db.prepare('SELECT * FROM kb_articles ORDER BY updated_at DESC').all();
  if (q && q.trim()) {
    const needle = q.trim().toLowerCase();
    articles = articles.filter((a) =>
      [a.title, a.problem, a.solution, a.tags].some((f) => (f || '').toLowerCase().includes(needle))
    );
  }
  res.json(articles);
});

router.get('/:id', (req, res) => {
  const article = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
  if (!article) return res.status(404).json({ error: 'Article not found' });
  res.json(article);
});

router.post('/', (req, res) => {
  const { title, problem = '', solution, tags = '' } = req.body;
  if (!title || !title.trim()) return res.status(400).json({ error: 'title is required' });
  if (!solution || !solution.trim()) return res.status(400).json({ error: 'solution is required' });
  const result = db
    .prepare('INSERT INTO kb_articles (title, problem, solution, tags) VALUES (?, ?, ?, ?)')
    .run(title.trim(), problem, solution.trim(), tags);
  const article = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(article);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Article not found' });
  const title = req.body.title ?? existing.title;
  const problem = req.body.problem ?? existing.problem;
  const solution = req.body.solution ?? existing.solution;
  const tags = req.body.tags ?? existing.tags;
  db.prepare(
    `UPDATE kb_articles SET title = ?, problem = ?, solution = ?, tags = ?, updated_at = datetime('now') WHERE id = ?`
  ).run(title, problem, solution, tags, req.params.id);
  const article = db.prepare('SELECT * FROM kb_articles WHERE id = ?').get(req.params.id);
  res.json(article);
});

router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM kb_articles WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Article not found' });
  res.status(204).end();
});

// --- Recommend: keyword-match KB articles against a ticket's title/description,
// optionally synthesized into a natural-language answer via the Claude API if
// ANTHROPIC_API_KEY is configured in the environment. ---

const STOPWORDS = new Set([
  'the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'and', 'or', 'with',
  'ที่', 'และ', 'ของ', 'ใน', 'ให้', 'ได้', 'เป็น', 'มี', 'ไม่', 'จะ', 'แล้ว', 'ครับ', 'ค่ะ', 'กับ', 'ไป', 'มา',
]);

// Word-boundary tokenizer: works for English (space-separated) but Thai is
// written with no spaces between words, so a whole Thai phrase collapses
// into one long "token" here — useless for exact-match comparison on its
// own. Kept as one signal among several below, not the only one.
function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .split(/[^a-z0-9ก-๙]+/)
    .filter((tok) => tok.length >= 2 && !STOPWORDS.has(tok));
}

// Character trigrams don't care about spaces at all, so they catch partial
// overlaps between unsegmented Thai phrases (e.g. "เครื่องปริ้นเสีย" vs
// "เครื่องพิมพ์เสีย" still share several 3-character chunks around "เสีย").
function charTrigrams(text) {
  const s = String(text || '').toLowerCase().replace(/\s+/g, '');
  const grams = new Set();
  if (s.length === 0) return grams;
  if (s.length < 3) {
    grams.add(s);
    return grams;
  }
  for (let i = 0; i <= s.length - 3; i++) grams.add(s.slice(i, i + 3));
  return grams;
}

function scoreArticle(ticketText, queryTokens, queryGrams, article) {
  const articleText = `${article.title} ${article.problem || ''}`;
  const tags = String(article.tags || '').split(',').map((t) => t.trim().toLowerCase()).filter(Boolean);
  const ticketLower = ticketText.toLowerCase();

  let score = 0;

  // Strong signal: an explicit tag appears literally in the ticket text —
  // substring search, so it works regardless of Thai word spacing.
  tags.forEach((tag) => {
    if (tag.length >= 2 && ticketLower.includes(tag)) score += 5;
  });

  // Medium signal: exact word overlap (mainly helps English/mixed terms).
  const articleTokens = new Set(tokenize(`${articleText} ${tags.join(' ')}`));
  queryTokens.forEach((tok) => {
    if (articleTokens.has(tok)) score += 2;
  });

  // Baseline signal: character-trigram overlap, robust to unsegmented Thai.
  const articleGrams = charTrigrams(`${articleText} ${tags.join(' ')}`);
  queryGrams.forEach((g) => {
    if (articleGrams.has(g)) score += 1;
  });

  return score;
}

async function callClaudeForRecommendation(ticketText, matches) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const kbContext = matches
    .map((m, i) => `[${i + 1}] ${m.title}\nอาการ: ${m.problem || '-'}\nวิธีแก้: ${m.solution}`)
    .join('\n\n');

  const prompt = matches.length
    ? `นี่คือปัญหา ticket ของทีมช่างซ่อมบำรุง:\n"${ticketText}"\n\nนี่คือ Knowledge Base ที่อาจเกี่ยวข้อง:\n${kbContext}\n\nช่วยแนะนำวิธีแก้ปัญหานี้แบบสั้นกระชับเป็นข้อๆ ภาษาไทย โดยอ้างอิงจาก Knowledge Base ข้างต้นถ้าเกี่ยวข้อง หรือให้คำแนะนำทั่วไปถ้าไม่มีข้อมูลที่ตรงพอ ตอบไม่เกิน 150 คำ`
    : `นี่คือปัญหา ticket ของทีมช่างซ่อมบำรุง:\n"${ticketText}"\n\nยังไม่มี Knowledge Base ที่เกี่ยวข้อง ช่วยแนะนำแนวทางตรวจสอบ/แก้ปัญหาเบื้องต้นแบบสั้นกระชับเป็นข้อๆ ภาษาไทย ตอบไม่เกิน 150 คำ`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 400,
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    const text = (data.content || []).map((c) => c.text || '').join('').trim();
    return text || null;
  } catch {
    return null;
  }
}

router.post('/recommend', async (req, res) => {
  const { title = '', description = '' } = req.body;
  const ticketText = `${title} ${description}`.trim();
  if (!ticketText) return res.status(400).json({ error: 'title or description is required' });

  const queryTokens = tokenize(ticketText);
  const queryGrams = charTrigrams(ticketText);
  const articles = db.prepare('SELECT * FROM kb_articles').all();
  const MIN_SCORE = 3; // a couple of coincidental trigram hits shouldn't count as a match
  const matches = articles
    .map((a) => ({ ...a, score: scoreArticle(ticketText, queryTokens, queryGrams, a) }))
    .filter((a) => a.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const aiAnswer = await callClaudeForRecommendation(ticketText, matches);

  res.json({
    matches,
    aiAnswer,
    aiAvailable: Boolean(process.env.ANTHROPIC_API_KEY),
  });
});

module.exports = router;
