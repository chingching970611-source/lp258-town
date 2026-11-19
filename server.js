'use strict';
/*
 * LP 258 小鎮 — zero-dependency Node server.
 * - Static files from /public
 * - Real-time updates via Server-Sent Events (/api/stream)
 * - JSON file storage in /data/db.json
 * - Host/admin backend at /admin (password protected)
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PW_FILE = path.join(DATA_DIR, 'admin-password.txt');
const WORLD = { w: 1600, h: 1020 };
const SPAWN = { x: 800, y: 585 };

const uid = (n = 8) => crypto.randomBytes(n).toString('hex');
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const str = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const line = (v, max) => str(v, max).replace(/[\r\n\t]+/g, ' ');

// ---------------------------------------------------------------- database
function seedDb() {
  const day = 86400000;
  const at = (d, h, m = 0) => { const t = new Date(now() + d * day); t.setHours(h, m, 0, 0); return t.toISOString(); };
  return {
    users: {},
    events: [
      { id: uid(4), title: '冬日聚會 Winter Meetup', venue: 'LP 258 HQ', address: '（請喺後台更新地址）', date: at(3, 19, 30), endDate: at(3, 22, 30),
        content: '一齊嚟食嘢、玩遊戲、識新朋友！現場有 Quiz 環節，答中有積分獎勵 🎁', record: '', createdAt: now() },
      { id: uid(4), title: '週末行山 Hiking Day', venue: '集合點：港鐵站 A 出口', address: '（請喺後台更新地址）', date: at(10, 9), endDate: at(10, 14),
        content: '輕鬆路線，適合初學者。記得帶水同帽 🧢', record: '', createdAt: now() },
      { id: uid(4), title: '開幕派對 Opening Party', venue: 'LP 258 HQ', address: '（請喺後台更新地址）', date: at(-14, 20), endDate: at(-14, 23),
        content: '小鎮正式開幕！', record: '當晚有 40 位朋友出席，玩咗 3 輪 Quiz，冠軍係 Team Rainbow 🌈 多謝大家支持！', createdAt: now() },
    ],
    rsvps: {},
    quiz: [
      { id: uid(4), question: '地球上最大嘅海洋係？', options: ['大西洋', '太平洋', '印度洋', '北冰洋'], answer: 1, points: 10 },
      { id: uid(4), question: '一年有幾多個星期？', options: ['48', '50', '52', '54'], answer: 2, points: 10 },
      { id: uid(4), question: '彩虹一般有幾多種顏色？', options: ['5', '6', '7', '8'], answer: 2, points: 10 },
      { id: uid(4), question: '邊種動物被稱為「沙漠之舟」？', options: ['馬', '駱駝', '大象', '驢'], answer: 1, points: 10 },
      { id: uid(4), question: '「你好」嘅日文係？', options: ['こんにちは', 'ありがとう', 'さようなら', 'すみません'], answer: 0, points: 10 },
      { id: uid(4), question: '水喺海平面嘅沸點係？', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1, points: 10 },
    ],
    riddles: [
      { id: uid(4), question: '咩嘢越洗越污糟？', answer: '水', hint: '你每日都會用到', points: 15 },
      { id: uid(4), question: '咩門永遠都關唔埋？', answer: '球門|龍門', hint: '踢波會見到', points: 15 },
      { id: uid(4), question: '有頭無頸，有眼無眉，無腳能走，有翼難飛（打一動物）', answer: '魚', hint: '住喺水入面', points: 15 },
      { id: uid(4), question: '千里相逢（打一字）', answer: '重', hint: '千 + 里', points: 20 },
      { id: uid(4), question: '一口咬掉牛尾巴（打一字）', answer: '告', hint: '「牛」字冇咗尾，加個「口」', points: 20 },
    ],
    challenges: [
      { id: uid(4), title: '帶一位新朋友嚟活動', description: '帶一位第一次嚟嘅朋友參加任何活動，提交佢嘅暱稱。', points: 50, active: true },
      { id: uid(4), title: '分享活動相片', description: '喺活動影一張大合照，提交相片連結。', points: 30, active: true },
      { id: uid(4), title: '連續參加 3 次活動', description: '連續出席 3 次活動，提交活動名稱。', points: 80, active: true },
    ],
    submissions: [],
    solved: {},
    minigame: {},
    chat: [],
    announcements: [{ id: uid(4), text: '歡迎嚟到 LP 258 小鎮！揀好你嘅造型，同大家打個招呼啦 👋', createdAt: now() }],
    admin: null,
  };
}

function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const base = seedDb();
  if (!fs.existsSync(DB_FILE)) return base;
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
    return d;
  } catch (e) {
    console.error('⚠️  Could not read data/db.json, starting fresh (old file kept as db.broken.json):', e.message);
    try { fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'db.broken.json')); } catch {}
    return base;
  }
}

const db = loadDb();
const tokens = new Map();
const rebuildTokens = () => { tokens.clear(); for (const u of Object.values(db.users)) tokens.set(u.token, u.id); };
rebuildTokens();
let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 400);
}
function saveNow() {
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db));
  fs.renameSync(tmp, DB_FILE);
  gistSchedule();
}

// ---------------------------------------------------------------- optional cloud backup (free hosting)
// On free hosts the disk is wiped on restart. If GIST_ID + GITHUB_TOKEN are set, the database is
// loaded from (and saved to) a secret GitHub Gist so nothing is lost.
const GIST_ID = process.env.GIST_ID || '';
const GH_TOKEN = process.env.GITHUB_TOKEN || '';
const GIST_FILE = 'lp258-db.json';
const useGist = !!(GIST_ID && GH_TOKEN);
let gistTimer = null, gistBusy = false, gistDirty = false;
const ghHeaders = () => ({ Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lp258-town', 'Content-Type': 'application/json' });
async function gistLoad() {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`Gist load failed: HTTP ${r.status}`);
  const g = await r.json();
  const f = g.files && g.files[GIST_FILE];
  if (!f) return null;
  const text = f.truncated ? await (await fetch(f.raw_url, { headers: ghHeaders() })).text() : f.content;
  const trimmed = (text || '').trim();
  return trimmed && trimmed !== '{}' ? JSON.parse(trimmed) : null;
}
async function gistSave() {
  if (!useGist) return;
  if (gistBusy) { gistDirty = true; return; }
  gistBusy = true; gistDirty = false;
  try {
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify({ files: { [GIST_FILE]: { content: JSON.stringify(db) } } }) });
    if (!r.ok) { console.error('Gist save failed: HTTP', r.status); gistDirty = true; }
  } catch (e) { console.error('Gist save failed:', e.message); gistDirty = true; }
  gistBusy = false;
  if (gistDirty) gistSchedule();
}
function gistSchedule() {
  if (!useGist || gistTimer) return;
  gistTimer = setTimeout(() => { gistTimer = null; gistSave(); }, 8000);
}

// ---------------------------------------------------------------- admin auth
const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
const sameStr = (a, b) => {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
};
function setupAdmin() {
  if (process.env.ADMIN_PASSWORD) return;
  if (!db.admin) {
    const pw = uid(6);
    const salt = uid(8);
    db.admin = { salt, hash: hashPw(pw, salt) };
    saveNow();
    fs.writeFileSync(PW_FILE, pw + '\n');
    console.log(`\n🔑 First run: generated a host/admin password. It is saved in ${PW_FILE}`);
    console.log('   Change it in the admin backend → 設定, or set the ADMIN_PASSWORD environment variable.\n');
  }
}
function checkAdminPw(pw) {
  if (process.env.ADMIN_PASSWORD) return sameStr(pw, process.env.ADMIN_PASSWORD);
  return !!db.admin && sameStr(hashPw(pw, db.admin.salt), db.admin.hash);
}
const adminSessions = new Map(); // token -> expiry
const loginAttempts = new Map(); // ip -> [timestamps]

// ---------------------------------------------------------------- presence
const online = new Map(); // userId -> { x, y, conns:Set<res>, leaveTimer, lastMove, lastChat, lastPoke }
const AV_OPTS = { skin: 6, hair: 9, hairColor: 9, outfit: 5, outfitColor: 10, face: 9, acc: 7 };
function cleanAvatar(a) {
  const o = {};
  for (const k of Object.keys(AV_OPTS)) {
    const n = Math.floor(Number(a && a[k]));
    o[k] = Number.isFinite(n) && n >= 0 && n < AV_OPTS[k] ? n : 0;
  }
  return o;
}
const publicUser = (u) => ({ id: u.id, nickname: u.nickname, avatar: u.avatar, status: u.status || '', points: u.points });
const selfUser = (u) => ({ ...publicUser(u), code: u.token });
function presence(u) {
  const o = online.get(u.id);
  return { ...publicUser(u), x: o ? o.x : SPAWN.x, y: o ? o.y : SPAWN.y };
}
function send(res, type, data) {
  try { res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`); } catch {}
}
function broadcast(type, data, exceptId) {
  for (const [id, o] of online) {
    if (id === exceptId) continue;
    for (const r of o.conns) send(r, type, data);
  }
}
function sendTo(userId, type, data) {
  const o = online.get(userId);
  if (o) for (const r of o.conns) send(r, type, data);
}
setInterval(() => {
  for (const o of online.values()) for (const r of o.conns) { try { r.write(': ping\n\n'); } catch {} }
}, 20000);

function pushChat(msg) {
  db.chat.push(msg);
  if (db.chat.length > 300) db.chat.splice(0, db.chat.length - 300);
  save();
}
const visibleChat = (userId) => db.chat.filter((m) => !m.to || m.to === userId || m.from === userId).slice(-80);
function systemMsg(text) {
  const msg = { id: uid(4), system: true, text, at: now() };
  pushChat(msg);
  broadcast('chat', msg);
}

let lbTimer = null;
function leaderboard() {
  return Object.values(db.users)
    .filter((u) => !u.banned && u.points > 0)
    .sort((a, b) => b.points - a.points)
    .slice(0, 30)
    .map((u) => ({ id: u.id, nickname: u.nickname, avatar: u.avatar, points: u.points }));
}
function minigameBoard() {
  return Object.entries(db.minigame)
    .map(([id, score]) => ({ u: db.users[id], score }))
    .filter((x) => x.u && !x.u.banned)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((x) => ({ id: x.u.id, nickname: x.u.nickname, avatar: x.u.avatar, score: x.score }));
}
function award(u, pts, reason) {
  pts = Math.round(pts);
  if (!pts) return;
  u.points = Math.max(0, (u.points || 0) + pts);
  save();
  broadcast('points', { id: u.id, points: u.points });
  if (reason) systemMsg(`🎉 ${u.nickname} ${reason} ${pts > 0 ? '+' : ''}${pts} 分`);
  clearTimeout(lbTimer);
  lbTimer = setTimeout(() => broadcast('leaderboard', { leaderboard: leaderboard(), minigame: minigameBoard() }), 300);
}
function solvedOf(id) {
  if (!db.solved[id]) db.solved[id] = { quiz: {}, riddles: [] };
  return db.solved[id];
}
const normAnswer = (s) => String(s || '').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');

// ---------------------------------------------------------------- live quiz (host-run)
let live = null;
let lastLiveResult = null;
function liveForClient(userId) {
  if (!live) return null;
  return { id: live.id, question: live.question, options: live.options, endsAt: live.endsAt, points: live.points,
    answered: live.answers.has(userId), count: live.answers.size };
}
function endLive() {
  if (!live) return;
  const L = live;
  live = null;
  const correct = [...L.answers.entries()].filter(([, a]) => a.choice === L.answer).sort((a, b) => a[1].at - b[1].at);
  const winners = [];
  correct.forEach(([id], i) => {
    const u = db.users[id];
    if (!u) return;
    award(u, L.points + (i === 0 ? 5 : 0), null);
    winners.push(u.nickname);
  });
  lastLiveResult = { id: L.id, question: L.question, options: L.options, answer: L.answer, winners: winners.slice(0, 10),
    correctCount: correct.length, total: L.answers.size, at: now() };
  broadcast('liveResult', lastLiveResult);
  systemMsg(`⚡ 即時問答完結！答案係「${L.options[L.answer]}」，${correct.length} 人答中${winners[0] ? `，最快係 ${winners[0]} 🏅` : ''}`);
}

// ---------------------------------------------------------------- event reminders (server push)
setInterval(() => {
  const t = now();
  for (const e of db.events) {
    const start = Date.parse(e.date);
    if (!start || e.remindedAt || start < t || start - t > 3600000) continue;
    e.remindedAt = t;
    save();
    for (const id of db.rsvps[e.id] || []) sendTo(id, 'notice', { text: `⏰ 活動提醒：「${e.title}」一個鐘內開始 @ ${e.venue || ''}`, eventId: e.id });
  }
}, 60000);

// ---------------------------------------------------------------- content schemas (admin CRUD)
const SCHEMAS = {
  events: { title: ['line', 80, true], venue: ['line', 100], address: ['line', 200], date: ['date', true], endDate: ['date'], content: ['str', 3000], record: ['str', 5000] },
  quiz: { question: ['str', 300, true], options: ['options'], answer: ['int', 0, 3], points: ['int', 0, 1000] },
  riddles: { question: ['str', 300, true], answer: ['line', 200, true], hint: ['line', 200], points: ['int', 0, 1000] },
  challenges: { title: ['line', 100, true], description: ['str', 1500], points: ['int', 0, 10000], active: ['bool'] },
};
function cleanItem(col, input) {
  const schema = SCHEMAS[col];
  const out = {};
  for (const [k, spec] of Object.entries(schema)) {
    const [type] = spec;
    const v = input[k];
    if (type === 'str' || type === 'line') {
      out[k] = type === 'str' ? str(v, spec[1]) : line(v, spec[1]);
      if (spec[2] && !out[k]) throw httpErr(400, `請填寫 ${k}`);
    } else if (type === 'int') {
      const n = Math.round(Number(v));
      out[k] = Number.isFinite(n) ? clamp(n, spec[1], spec[2]) : spec[1];
    } else if (type === 'bool') {
      out[k] = v === true || v === 'true' || v === 1 || v === 'on';
    } else if (type === 'date') {
      const t = v ? Date.parse(v) : NaN;
      if (spec[1] && !t) throw httpErr(400, '請填寫有效日期');
      out[k] = t ? new Date(t).toISOString() : '';
    } else if (type === 'options') {
      const arr = (Array.isArray(v) ? v : []).map((x) => line(x, 120)).filter(Boolean).slice(0, 4);
      if (arr.length < 2) throw httpErr(400, '最少要有 2 個選項');
      out[k] = arr;
    }
  }
  if (col === 'quiz' && out.answer >= out.options.length) throw httpErr(400, '正確答案唔喺選項入面');
  return out;
}

// ---------------------------------------------------------------- http helpers
function httpErr(code, msg) { const e = new Error(msg); e.code = code; return e; }
function json(res, code, obj) {
  const body = JSON.stringify(obj ?? {});
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 64 * 1024) { reject(httpErr(413, 'Body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) || {}); } catch { reject(httpErr(400, 'Invalid JSON')); }
    });
    req.on('error', reject);
  });
}
const bearer = (req) => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? h.slice(7) : ''; };
function userFromToken(t) {
  const id = t && tokens.get(t);
  return id ? db.users[id] : null;
}
function needUser(req) {
  const u = userFromToken(bearer(req));
  if (!u) throw httpErr(401, '請重新登入');
  if (u.banned) throw httpErr(403, '你已被管理員停用');
  return u;
}
function needAdmin(req) {
  const t = bearer(req);
  const exp = t && adminSessions.get(t);
  if (!exp || exp < now()) { adminSessions.delete(t); throw httpErr(401, '請重新登入後台'); }
  return true;
}
function rate(o, key, ms) {
  const t = now();
  if (o[key] && t - o[key] < ms) throw httpErr(429, '慢慢嚟，太快喇');
  o[key] = t;
}
const userRate = new Map();
const rateBag = (id) => { if (!userRate.has(id)) userRate.set(id, {}); return userRate.get(id); };

// ---------------------------------------------------------------- routes
const routes = {};
const route = (sig, fn) => { routes[sig] = fn; };

route('POST /api/join', async (req, res, body) => {
  const nickname = line(body.nickname, 16);
  if (!nickname) throw httpErr(400, '請輸入暱稱');
  const u = { id: uid(6), token: uid(16), nickname, avatar: cleanAvatar(body.avatar), status: '', points: 0, createdAt: now(), lastSeen: now(), banned: false };
  db.users[u.id] = u;
  tokens.set(u.token, u.id);
  save();
  json(res, 200, { token: u.token, user: selfUser(u) });
});

route('GET /api/me', async (req, res) => json(res, 200, { user: selfUser(needUser(req)) }));

route('POST /api/move', async (req, res, body) => {
  const u = needUser(req);
  const o = online.get(u.id);
  if (!o) throw httpErr(409, 'not connected');
  const x = Number(body.x), y = Number(body.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw httpErr(400, 'bad position');
  if (o.lastMove && now() - o.lastMove < 40) return json(res, 200, { ok: true });
  o.lastMove = now();
  o.x = clamp(Math.round(x), 20, WORLD.w - 20);
  o.y = clamp(Math.round(y), 40, WORLD.h - 10);
  broadcast('move', { id: u.id, x: o.x, y: o.y }, u.id);
  json(res, 200, { ok: true });
});

route('POST /api/chat', async (req, res, body) => {
  const u = needUser(req);
  const text = str(body.text, 300);
  if (!text) throw httpErr(400, '空白訊息');
  rate(rateBag(u.id), 'chat', 500);
  const msg = { id: uid(4), from: u.id, name: u.nickname, text, at: now() };
  if (body.to) {
    const t = db.users[body.to];
    if (!t || t.banned) throw httpErr(404, '搵唔到呢位朋友');
    msg.to = t.id;
    msg.toName = t.nickname;
    sendTo(t.id, 'chat', msg);
    if (t.id !== u.id) sendTo(u.id, 'chat', msg);
  } else {
    broadcast('chat', msg);
  }
  pushChat(msg);
  json(res, 200, { ok: true });
});

const EMOTES = ['👋', '❤️', '😂', '👍', '🎉', '😮', '🔥', '🙏', '💃', '😴'];
route('POST /api/emote', async (req, res, body) => {
  const u = needUser(req);
  if (!EMOTES.includes(body.emoji)) throw httpErr(400, 'bad emote');
  rate(rateBag(u.id), 'emote', 400);
  broadcast('emote', { id: u.id, emoji: body.emoji });
  json(res, 200, { ok: true });
});

route('POST /api/poke', async (req, res, body) => {
  const u = needUser(req);
  const t = db.users[body.to];
  if (!t) throw httpErr(404, '搵唔到呢位朋友');
  rate(rateBag(u.id), 'poke', 2000);
  sendTo(t.id, 'poke', { from: u.id, name: u.nickname });
  broadcast('emote', { id: u.id, emoji: '👋' });
  json(res, 200, { ok: true });
});

route('POST /api/profile', async (req, res, body) => {
  const u = needUser(req);
  if (body.nickname !== undefined) { const n = line(body.nickname, 16); if (!n) throw httpErr(400, '暱稱唔可以空白'); u.nickname = n; }
  if (body.status !== undefined) u.status = line(body.status, 40);
  if (body.avatar !== undefined) u.avatar = cleanAvatar(body.avatar);
  save();
  broadcast('profile', publicUser(u));
  json(res, 200, { user: selfUser(u) });
});

route('GET /api/content', async (req, res) => {
  const u = needUser(req);
  const s = solvedOf(u.id);
  const rsvpCounts = {};
  for (const e of db.events) rsvpCounts[e.id] = (db.rsvps[e.id] || []).length;
  json(res, 200, {
    events: [...db.events].sort((a, b) => Date.parse(a.date) - Date.parse(b.date))
      .map(({ id, title, venue, address, date, endDate, content, record }) => ({ id, title, venue, address, date, endDate, content, record })),
    myRsvps: db.events.filter((e) => (db.rsvps[e.id] || []).includes(u.id)).map((e) => e.id),
    rsvpCounts,
    quiz: db.quiz.map((q) => {
      const st = s.quiz[q.id];
      return { id: q.id, question: q.question, options: q.options, points: q.points, result: st || null, answer: st ? q.answer : undefined };
    }),
    riddles: db.riddles.map((r) => ({ id: r.id, question: r.question, hint: r.hint, points: r.points, solved: s.riddles.includes(r.id) })),
    challenges: db.challenges.filter((c) => c.active !== false).map(({ id, title, description, points }) => ({ id, title, description, points })),
    mySubmissions: db.submissions.filter((x) => x.userId === u.id).map(({ id, challengeId, text, status, createdAt }) => ({ id, challengeId, text, status, createdAt })),
    leaderboard: leaderboard(),
    minigame: minigameBoard(),
    myBest: db.minigame[u.id] || 0,
    lastLive: lastLiveResult,
  });
});

route('POST /api/quiz/answer', async (req, res, body) => {
  const u = needUser(req);
  const q = db.quiz.find((x) => x.id === body.id);
  if (!q) throw httpErr(404, '題目唔存在');
  const s = solvedOf(u.id);
  if (s.quiz[q.id]) throw httpErr(409, '你已經答過呢題');
  const ok = Number(body.choice) === q.answer;
  s.quiz[q.id] = ok ? 'correct' : 'wrong';
  save();
  if (ok) award(u, q.points, '答啱咗一題問答');
  json(res, 200, { correct: ok, answer: q.answer, points: u.points });
});

route('POST /api/riddle/answer', async (req, res, body) => {
  const u = needUser(req);
  const r = db.riddles.find((x) => x.id === body.id);
  if (!r) throw httpErr(404, '謎題唔存在');
  const s = solvedOf(u.id);
  if (s.riddles.includes(r.id)) throw httpErr(409, '你已經解咗呢題');
  rate(rateBag(u.id), 'riddle', 800);
  const guess = normAnswer(body.guess);
  const ok = !!guess && r.answer.split('|').map(normAnswer).filter(Boolean).includes(guess);
  if (ok) { s.riddles.push(r.id); save(); award(u, r.points, '解開咗一條謎語 🧩'); }
  json(res, 200, { correct: ok, points: u.points });
});

route('POST /api/minigame/score', async (req, res, body) => {
  const u = needUser(req);
  rate(rateBag(u.id), 'mini', 5000);
  const score = clamp(Math.floor(Number(body.score) || 0), 0, 400);
  const prev = db.minigame[u.id] || 0;
  let newBest = false;
  if (score > prev) {
    db.minigame[u.id] = score;
    newBest = true;
    save();
    if (score >= 10) award(u, 5, `喺「接星星」刷新個人紀錄 ${score} ⭐`);
    else broadcast('leaderboard', { leaderboard: leaderboard(), minigame: minigameBoard() });
  }
  json(res, 200, { best: Math.max(prev, score), newBest });
});

route('POST /api/challenge/submit', async (req, res, body) => {
  const u = needUser(req);
  const c = db.challenges.find((x) => x.id === body.id && x.active !== false);
  if (!c) throw httpErr(404, '挑戰唔存在');
  const text = str(body.text, 600);
  if (!text) throw httpErr(400, '請填寫提交內容');
  if (db.submissions.some((x) => x.challengeId === c.id && x.userId === u.id && x.status !== 'rejected')) throw httpErr(409, '你已經提交咗呢個挑戰');
  db.submissions.push({ id: uid(4), challengeId: c.id, userId: u.id, text, status: 'pending', createdAt: now() });
  save();
  json(res, 200, { ok: true });
});

route('POST /api/event/rsvp', async (req, res, body) => {
  const u = needUser(req);
  const e = db.events.find((x) => x.id === body.id);
  if (!e) throw httpErr(404, '活動唔存在');
  const list = db.rsvps[e.id] || (db.rsvps[e.id] = []);
  const i = list.indexOf(u.id);
  if (i >= 0) list.splice(i, 1); else list.push(u.id);
  save();
  json(res, 200, { going: i < 0, count: list.length });
});

route('POST /api/live/answer', async (req, res, body) => {
  const u = needUser(req);
  if (!live || now() > live.endsAt) throw httpErr(409, '問答已經完結');
  if (live.answers.has(u.id)) throw httpErr(409, '你已經作答');
  const choice = Math.floor(Number(body.choice));
  if (!(choice >= 0 && choice < live.options.length)) throw httpErr(400, 'bad choice');
  live.answers.set(u.id, { choice, at: now() });
  broadcast('liveCount', { count: live.answers.size });
  json(res, 200, { ok: true });
});

// ---- admin
route('POST /api/admin/login', async (req, res, body) => {
  const ip = req.socket.remoteAddress || '?';
  const list = (loginAttempts.get(ip) || []).filter((t) => now() - t < 60000);
  if (list.length >= 6) throw httpErr(429, '嘗試太多次，請一分鐘後再試');
  list.push(now());
  loginAttempts.set(ip, list);
  if (!checkAdminPw(body.password || '')) throw httpErr(401, '密碼錯誤');
  const t = uid(24);
  adminSessions.set(t, now() + 12 * 3600000);
  json(res, 200, { token: t });
});

route('GET /api/admin/overview', async (req, res) => {
  needAdmin(req);
  const users = Object.values(db.users).map((u) => ({
    id: u.id, nickname: u.nickname, avatar: u.avatar, status: u.status || '', points: u.points, banned: !!u.banned,
    createdAt: u.createdAt, lastSeen: online.has(u.id) ? now() : u.lastSeen, online: online.has(u.id),
  })).sort((a, b) => b.points - a.points);
  const name = (id) => (db.users[id] ? db.users[id].nickname : '（已刪除）');
  json(res, 200, {
    users,
    onlineCount: online.size,
    events: [...db.events].sort((a, b) => Date.parse(b.date) - Date.parse(a.date))
      .map((e) => ({ ...e, rsvpNames: (db.rsvps[e.id] || []).map(name) })),
    quiz: db.quiz, riddles: db.riddles, challenges: db.challenges,
    submissions: [...db.submissions].reverse().map((s) => ({
      ...s, nickname: name(s.userId), challenge: (db.challenges.find((c) => c.id === s.challengeId) || {}).title || '（已刪除）',
    })),
    announcements: [...db.announcements].reverse(),
    live: live ? { question: live.question, endsAt: live.endsAt, count: live.answers.size } : null,
    lastLive: lastLiveResult,
    passwordFromEnv: !!process.env.ADMIN_PASSWORD,
  });
});

route('POST /api/admin/save', async (req, res, body) => {
  needAdmin(req);
  const col = body.col;
  if (!SCHEMAS[col]) throw httpErr(400, 'bad collection');
  const item = cleanItem(col, body.item || {});
  const list = db[col];
  const existing = body.item && body.item.id ? list.find((x) => x.id === body.item.id) : null;
  if (existing) {
    if (col === 'events' && existing.date !== item.date) delete existing.remindedAt;
    Object.assign(existing, item);
  } else list.push({ id: uid(4), ...item, createdAt: now() });
  save();
  broadcast('content', { col });
  json(res, 200, { ok: true });
});

route('POST /api/admin/delete', async (req, res, body) => {
  needAdmin(req);
  const col = body.col;
  if (!SCHEMAS[col]) throw httpErr(400, 'bad collection');
  const i = db[col].findIndex((x) => x.id === body.id);
  if (i < 0) throw httpErr(404, 'not found');
  db[col].splice(i, 1);
  if (col === 'events') delete db.rsvps[body.id];
  save();
  broadcast('content', { col });
  json(res, 200, { ok: true });
});

route('POST /api/admin/submission', async (req, res, body) => {
  needAdmin(req);
  const s = db.submissions.find((x) => x.id === body.id);
  if (!s) throw httpErr(404, 'not found');
  if (!['approved', 'rejected', 'pending'].includes(body.status)) throw httpErr(400, 'bad status');
  const was = s.status;
  s.status = body.status;
  s.reviewedAt = now();
  const u = db.users[s.userId];
  const c = db.challenges.find((x) => x.id === s.challengeId);
  if (u && c) {
    if (was !== 'approved' && s.status === 'approved') award(u, c.points, `完成咗 LP Challenge「${c.title}」🏅`);
    if (was === 'approved' && s.status !== 'approved') award(u, -c.points, null);
    if (s.status !== 'pending') sendTo(u.id, 'notice', { text: s.status === 'approved' ? `✅ 你嘅挑戰「${c.title}」已通過！+${c.points} 分` : `❌ 你嘅挑戰「${c.title}」未獲通過，可以再提交一次` });
    sendTo(u.id, 'content', { col: 'submissions' });
  }
  save();
  json(res, 200, { ok: true });
});

route('POST /api/admin/user', async (req, res, body) => {
  needAdmin(req);
  const u = db.users[body.id];
  if (!u) throw httpErr(404, 'not found');
  if (body.points !== undefined) {
    const p = Math.max(0, Math.round(Number(body.points) || 0));
    award(u, p - u.points, null);
  }
  if (body.banned !== undefined) {
    u.banned = !!body.banned;
    if (u.banned) {
      sendTo(u.id, 'kicked', { reason: '你已被管理員停用' });
      const o = online.get(u.id);
      if (o) { for (const r of o.conns) { try { r.end(); } catch {} } clearTimeout(o.leaveTimer); online.delete(u.id); broadcast('leave', { id: u.id }); }
    }
  }
  save();
  json(res, 200, { ok: true });
});

route('POST /api/admin/announce', async (req, res, body) => {
  needAdmin(req);
  const text = str(body.text, 300);
  if (!text) throw httpErr(400, '請輸入公告內容');
  const a = { id: uid(4), text, createdAt: now() };
  db.announcements.push(a);
  if (db.announcements.length > 50) db.announcements.shift();
  save();
  broadcast('announce', a);
  json(res, 200, { ok: true });
});

route('POST /api/admin/announce/delete', async (req, res, body) => {
  needAdmin(req);
  db.announcements = db.announcements.filter((a) => a.id !== body.id);
  save();
  broadcast('announceRemoved', { id: body.id });
  json(res, 200, { ok: true });
});

route('POST /api/admin/remind', async (req, res, body) => {
  needAdmin(req);
  const e = db.events.find((x) => x.id === body.id);
  if (!e) throw httpErr(404, 'not found');
  const ids = db.rsvps[e.id] || [];
  let reached = 0;
  for (const id of ids) if (online.has(id)) { reached++; sendTo(id, 'notice', { text: `📣 HQ 提醒：「${e.title}」— ${new Date(e.date).toLocaleString('zh-HK', { dateStyle: 'medium', timeStyle: 'short' })} @ ${e.venue || ''}`, eventId: e.id }); }
  json(res, 200, { rsvp: ids.length, reached });
});

route('POST /api/admin/live/start', async (req, res, body) => {
  needAdmin(req);
  if (live) throw httpErr(409, '已經有一場即時問答進行緊');
  const q = db.quiz.find((x) => x.id === body.quizId);
  if (!q) throw httpErr(404, '題目唔存在');
  const secs = clamp(Math.round(Number(body.seconds) || 20), 10, 120);
  live = { id: uid(4), quizId: q.id, question: q.question, options: q.options, answer: q.answer, points: q.points, endsAt: now() + secs * 1000, answers: new Map() };
  setTimeout(endLive, secs * 1000 + 300);
  broadcast('live', liveForClient(null));
  systemMsg('⚡ Host 開始咗一場即時問答！快啲作答！');
  json(res, 200, { ok: true });
});

route('POST /api/admin/password', async (req, res, body) => {
  needAdmin(req);
  if (process.env.ADMIN_PASSWORD) throw httpErr(400, '密碼由 ADMIN_PASSWORD 環境變數設定，請喺嗰度修改');
  const pw = String(body.password || '');
  if (pw.length < 8) throw httpErr(400, '密碼最少 8 個字元');
  const salt = uid(8);
  db.admin = { salt, hash: hashPw(pw, salt) };
  saveNow();
  try { fs.unlinkSync(PW_FILE); } catch {}
  json(res, 200, { ok: true });
});

// ---- realtime stream
function handleStream(req, res, url) {
  const u = userFromToken(url.searchParams.get('token'));
  if (!u) return json(res, 401, { error: '請重新登入' });
  if (u.banned) return json(res, 403, { error: '你已被管理員停用' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
  res.write('retry: 3000\n\n');
  let o = online.get(u.id);
  const isNew = !o;
  if (!o) {
    o = { x: SPAWN.x + Math.round((Math.random() - 0.5) * 220), y: SPAWN.y + Math.round((Math.random() - 0.5) * 40), conns: new Set() };
    online.set(u.id, o);
  }
  clearTimeout(o.leaveTimer);
  o.conns.add(res);
  u.lastSeen = now();
  send(res, 'init', {
    me: u.id,
    players: [...online.keys()].filter((id) => db.users[id]).map((id) => presence(db.users[id])),
    chat: visibleChat(u.id),
    announcements: db.announcements.slice(-5),
    live: liveForClient(u.id),
  });
  if (isNew) broadcast('join', presence(u), u.id);
  req.on('close', () => {
    o.conns.delete(res);
    if (!o.conns.size) {
      o.leaveTimer = setTimeout(() => {
        if (o.conns.size || online.get(u.id) !== o) return;
        online.delete(u.id);
        u.lastSeen = now();
        save();
        broadcast('leave', { id: u.id });
      }, 5000);
    }
  });
}

// ---------------------------------------------------------------- static files
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json' };
function serveStatic(req, res, pathname) {
  if (pathname === '/') pathname = '/index.html';
  if (pathname === '/admin' || pathname === '/admin/') pathname = '/admin.html';
  let fp;
  try { fp = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname))); } catch { return json(res, 400, { error: 'bad path' }); }
  if (!fp.startsWith(PUBLIC_DIR + path.sep)) return json(res, 403, { error: 'forbidden' });
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
}

// ---------------------------------------------------------------- server
const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'same-origin');
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname === '/healthz') return json(res, 200, { ok: true, online: online.size });
    if (url.pathname === '/api/stream' && req.method === 'GET') return handleStream(req, res, url);
    const fn = routes[`${req.method} ${url.pathname}`];
    if (fn) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      return await fn(req, res, body);
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'Not found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'Method not allowed' });
    serveStatic(req, res, url.pathname);
  } catch (e) {
    if (!e.code || typeof e.code !== 'number') console.error(e);
    if (!res.headersSent) json(res, typeof e.code === 'number' ? e.code : 500, { error: typeof e.code === 'number' ? e.message : '伺服器錯誤' });
  }
});

(async function start() {
  if (useGist) {
    try {
      const remote = await gistLoad();
      if (remote) {
        const base = seedDb();
        for (const k of Object.keys(db)) delete db[k];
        Object.assign(db, base, remote);
        rebuildTokens();
        console.log(`☁️  Loaded data from GitHub Gist (${Object.keys(db.users).length} members)`);
      } else console.log('☁️  Gist is empty — starting with sample content');
    } catch (e) {
      // Refuse to start rather than overwrite the backup with empty data.
      console.error('❌ Could not load data from GitHub Gist:', e.message);
      console.error('   Check GIST_ID and GITHUB_TOKEN (needs the "gist" scope).');
      process.exitCode = 1;
      return;
    }
  } else if (process.env.RENDER) {
    console.warn('⚠️  GIST_ID / GITHUB_TOKEN not set — data will be lost when this server restarts.');
  }
  setupAdmin();
  saveNow();
  server.listen(PORT, () => {
    console.log(`🏡 LP 258 小鎮 running at http://localhost:${PORT}`);
    console.log(`🛠️  Host/admin backend at http://localhost:${PORT}/admin`);
  });
})();

let shuttingDown = false;
async function shutdown() {
  if (shuttingDown) return;
  shuttingDown = true;
  try { saveNow(); } catch {}
  if (useGist) {
    clearTimeout(gistTimer); gistTimer = null;
    const deadline = Date.now() + 15000;
    while (gistBusy && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200));
    await gistSave();
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
