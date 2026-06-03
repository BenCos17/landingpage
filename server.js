const express = require('express');
const session = require('express-session');
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = process.env.DATA_FILE || '/data/jarvis.json';

function readData() {
  try {
    if (fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch { }
  return {
    username: process.env.DEFAULT_USERNAME || 'admin',
    password: process.env.DEFAULT_PASSWORD || 'admin',
    links: [], notes: [],
    categories: [],
    settings: { columns: 4, compactMode: false },
    appearance: {}
  };
}

function writeData(d) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2));
}

if (!fs.existsSync(DATA_FILE)) writeData(readData());

function fetchUrl(url, depth = 0) {
  if (depth > 2) return Promise.reject(new Error('too many redirects'));
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, { timeout: 6000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Jarvis/1.0)' } }, res => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        return fetchUrl(new URL(res.headers.location, url).href, depth + 1).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => { chunks.push(c); if (Buffer.concat(chunks).length > 150 * 1024) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks), headers: res.headers }));
      res.on('error', reject);
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
  });
}

function extractMeta(html, baseUrl) {
  const base = new URL(baseUrl);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i);
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const title = (ogTitle?.[1] || titleTag?.[1] || '').trim().replace(/&amp;/g, '&').replace(/&#39;/g, "'").slice(0, 60);
  const candidates = [];
  const apple = html.match(/<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i) || html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i);
  if (apple) candidates.push(apple[1]);
  const iconRe = /<link[^>]+rel=["'][^"']*\bicon\b[^"']*["'][^>]+href=["']([^"']+)["'][^>]*>/gi;
  let m; while ((m = iconRe.exec(html)) !== null) candidates.push(m[1]);
  candidates.push('/favicon.ico');
  const seen = new Set(); const favicons = [];
  for (const c of candidates) { try { const abs = new URL(c, base).href; if (!seen.has(abs)) { seen.add(abs); favicons.push(abs); } } catch { } }
  return { title, favicons };
}

async function checkFavicon(url) {
  try { const r = await fetchUrl(url); if (r.status >= 200 && r.status < 400 && r.body.length > 0) return url; } catch { }
  return null;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({ secret: process.env.SESSION_SECRET || 'jarvis-secret-change-me', resave: false, saveUninitialized: false, cookie: { maxAge: 1000 * 60 * 60 * 8 } }));
app.use(express.static(path.join(__dirname, 'public')));

function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ error: 'unauthorized' });
}

// ── META ──
app.get('/api/fetch-meta', async (req, res) => {
  let { url } = req.query;
  if (!url) return res.status(400).json({ error: 'url required' });
  if (!/^https?:\/\//i.test(url)) url = 'http://' + url;
  try {
    const { body } = await fetchUrl(url);
    const { title, favicons } = extractMeta(body.toString('utf8'), url);
    let faviconUrl = null;
    for (const f of favicons) { const ok = await checkFavicon(f); if (ok) { faviconUrl = ok; break; } }
    res.json({ title, faviconUrl });
  } catch { res.json({ title: '', faviconUrl: null }); }
});

app.get('/api/proxy-favicon', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).end();
  try {
    const r = await fetchUrl(url);
    res.set('Content-Type', r.headers['content-type'] || 'image/x-icon');
    res.set('Cache-Control', 'public, max-age=86400');
    res.end(r.body);
  } catch { res.status(404).end(); }
});

// ── AUTH ──
app.post('/api/login', (req, res) => {
  const { username, password } = req.body; const d = readData();
  if (username === d.username && password === d.password) { req.session.authenticated = true; res.json({ ok: true }); }
  else res.status(401).json({ error: 'invalid credentials' });
});
app.post('/api/logout', (req, res) => { req.session.destroy(); res.json({ ok: true }); });
app.get('/api/me', (req, res) => res.json({ authenticated: !!req.session?.authenticated }));

// ── DATA ──
app.get('/api/data', (req, res) => {
  const d = readData();
  res.json({ links: d.links, notes: d.notes, categories: d.categories || [], settings: d.settings || {}, appearance: d.appearance || {} });
});

app.get('/api/export', requireAuth, (req, res) => {
  const d = readData();
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="jarvis-backup.json"');
  res.send(JSON.stringify(d, null, 2));
});

app.post('/api/import', requireAuth, (req, res) => {
  const payload = req.body?.data && typeof req.body.data === 'object' ? req.body.data : req.body;
  if (!payload || typeof payload !== 'object') return res.status(400).json({ error: 'backup data required' });

  const current = readData();
  const next = {
    username: typeof payload.username === 'string' && payload.username.trim() ? payload.username : current.username,
    password: typeof payload.password === 'string' && payload.password ? payload.password : current.password,
    links: Array.isArray(payload.links) ? payload.links : [],
    notes: Array.isArray(payload.notes) ? payload.notes : [],
    categories: Array.isArray(payload.categories) ? payload.categories : [],
    settings: payload.settings && typeof payload.settings === 'object' ? payload.settings : {},
    appearance: payload.appearance && typeof payload.appearance === 'object' ? payload.appearance : {},
  };

  writeData(next);
  res.json({ ok: true, data: next });
});

// ── CATEGORIES ──
app.get('/api/categories', (req, res) => res.json(readData().categories || []));

app.post('/api/categories', requireAuth, (req, res) => {
  const { name, icon, collapsed } = req.body;
  if (!name) return res.status(400).json({ error: 'name required' });
  const d = readData();
  if (!d.categories) d.categories = [];
  const id = 'cat_' + Date.now();
  d.categories.push({ id, name, icon: icon || '📁', collapsed: !!collapsed });
  writeData(d); res.json({ ok: true, categories: d.categories });
});

app.put('/api/categories/:id', requireAuth, (req, res) => {
  const d = readData();
  if (!d.categories) d.categories = [];
  const idx = d.categories.findIndex(c => c.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  d.categories[idx] = { ...d.categories[idx], ...req.body };
  writeData(d); res.json({ ok: true, categories: d.categories });
});

app.delete('/api/categories/:id', requireAuth, (req, res) => {
  const d = readData();
  if (!d.categories) d.categories = [];
  d.categories = d.categories.filter(c => c.id !== req.params.id);
  // unassign links from deleted category
  d.links = d.links.map(l => l.category === req.params.id ? { ...l, category: null } : l);
  writeData(d); res.json({ ok: true, categories: d.categories, links: d.links });
});

app.post('/api/categories/reorder', requireAuth, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  const d = readData();
  if (!d.categories) d.categories = [];
  d.categories = order.map(id => d.categories.find(c => c.id === id)).filter(Boolean);
  writeData(d); res.json({ ok: true, categories: d.categories });
});

// ── LINKS ──
app.post('/api/links', requireAuth, (req, res) => {
  const { name, url, icon, desc, faviconUrl, color, category } = req.body;
  if (!name || !url) return res.status(400).json({ error: 'name and url required' });
  const d = readData();
  d.links.push({ name, url: /^https?:\/\//i.test(url) ? url : 'http://' + url, icon: icon || '', desc: desc || '', faviconUrl: faviconUrl || null, color: color || null, category: category || null });
  writeData(d); res.json({ ok: true, links: d.links });
});

app.put('/api/links/:index', requireAuth, (req, res) => {
  const d = readData(); const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= d.links.length) return res.status(400).json({ error: 'invalid index' });
  d.links[i] = { ...d.links[i], ...req.body };
  writeData(d); res.json({ ok: true, links: d.links });
});

app.delete('/api/links/:index', requireAuth, (req, res) => {
  const d = readData(); const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= d.links.length) return res.status(400).json({ error: 'invalid index' });
  d.links.splice(i, 1); writeData(d); res.json({ ok: true, links: d.links });
});

app.post('/api/links/reorder', requireAuth, (req, res) => {
  const { order } = req.body;
  if (!Array.isArray(order)) return res.status(400).json({ error: 'order array required' });
  const d = readData();
  d.links = order.map(i => d.links[i]).filter(Boolean);
  writeData(d); res.json({ ok: true, links: d.links });
});

// ── NOTES ──
app.post('/api/notes', requireAuth, (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  const d = readData();
  d.notes.unshift({ content, date: new Date().toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' }) });
  writeData(d); res.json({ ok: true, notes: d.notes });
});

app.put('/api/notes/:index', requireAuth, (req, res) => {
  const d = readData(); const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= d.notes.length) return res.status(400).json({ error: 'invalid index' });
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'content required' });
  d.notes[i] = { ...d.notes[i], content };
  writeData(d); res.json({ ok: true, notes: d.notes });
});

app.delete('/api/notes/:index', requireAuth, (req, res) => {
  const d = readData(); const i = parseInt(req.params.index);
  if (isNaN(i) || i < 0 || i >= d.notes.length) return res.status(400).json({ error: 'invalid index' });
  d.notes.splice(i, 1); writeData(d); res.json({ ok: true, notes: d.notes });
});

// ── CREDENTIALS ──
app.post('/api/credentials', requireAuth, (req, res) => {
  const { username, newPassword, confirmPassword } = req.body;
  if (!username) return res.status(400).json({ error: 'username required' });
  if (newPassword && newPassword !== confirmPassword) return res.status(400).json({ error: 'passwords do not match' });
  const d = readData(); d.username = username;
  if (newPassword) d.password = newPassword;
  writeData(d); res.json({ ok: true });
});

// ── SETTINGS ──
app.post('/api/settings', requireAuth, (req, res) => {
  const d = readData();
  d.settings = { ...d.settings, ...req.body };
  writeData(d); res.json({ ok: true, settings: d.settings });
});

// ── APPEARANCE ──
app.post('/api/appearance', requireAuth, (req, res) => {
  const d = readData();
  d.appearance = { ...d.appearance, ...req.body };
  writeData(d); res.json({ ok: true, appearance: d.appearance });
});

app.listen(PORT, () => console.log(`jarvis running on port ${PORT}`));
