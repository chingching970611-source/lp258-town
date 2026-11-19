'use strict';
/*
 * LP 258 小镇 — zero-dependency Node server.
 * - Static files from /public
 * - Real-time updates via Server-Sent Events (/api/stream)
 * - JSON file storage (DATA_DIR/db.json), optional GitHub Gist backup for free hosting
 * - Host/admin backend at /admin (password protected)
 *
 * Messages sent to clients use translation keys ({ key, params }) so each
 * person sees them in the language they picked (简体中文 / English).
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
const TZ_OFFSET_H = Number.isFinite(Number(process.env.TZ_OFFSET_HOURS)) && process.env.TZ_OFFSET_HOURS !== undefined ? Number(process.env.TZ_OFFSET_HOURS) : 8;
const WORLD = { w: 1600, h: 1020 };
const SPAWN = { x: 800, y: 585 };
const DB_VERSION = 3;
const FILES_FILE = path.join(DATA_DIR, 'files.json');

const uid = (n = 8) => crypto.randomBytes(n).toString('hex');
const now = () => Date.now();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const str = (v, max) => String(v ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, max);
const line = (v, max) => str(v, max).replace(/[\r\n\t]+/g, ' ');

// A wall-clock time in the community's time zone (default UTC+8), `days` from today.
function localAt(days, h, m = 0) {
  const shifted = new Date(now() + TZ_OFFSET_H * 3600000 + days * 86400000);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate(), h - TZ_OFFSET_H, m)).toISOString();
}

// ---------------------------------------------------------------- database
function seedDb() {
  return {
    meta: { v: DB_VERSION },
    settings: { season: 'auto', currency: 'RM' },
    users: {},
    events: [
      { id: uid(4), title: '冬日聚会 Winter Meetup', venue: 'LP 258 HQ', address: '（请在后台更新地址）', date: localAt(3, 19, 30), endDate: localAt(3, 22, 30),
        content: '一起吃东西、玩游戏、认识新朋友！现场有 Quiz 环节，答对有积分奖励 🎁', record: '', createdAt: now() },
      { id: uid(4), title: '周末徒步 Hiking Day', venue: '集合点：地铁站 A 出口', address: '（请在后台更新地址）', date: localAt(10, 9), endDate: localAt(10, 14),
        content: '轻松路线，适合新手。记得带水和帽子 🧢', record: '', createdAt: now() },
      { id: uid(4), title: '开幕派对 Opening Party', venue: 'LP 258 HQ', address: '（请在后台更新地址）', date: localAt(-14, 20), endDate: localAt(-14, 23),
        content: '小镇正式开幕！', record: '当晚有 40 位朋友出席，玩了 3 轮 Quiz，冠军是 Team Rainbow 🌈 谢谢大家支持！', createdAt: now() },
    ],
    attendance: {},
    polls: [],
    trash: [],
    quiz: [
      { id: uid(4), question: '地球上最大的海洋是？', options: ['大西洋', '太平洋', '印度洋', '北冰洋'], answer: 1, points: 10 },
      { id: uid(4), question: '一年有多少个星期？', options: ['48', '50', '52', '54'], answer: 2, points: 10 },
      { id: uid(4), question: '彩虹一般有几种颜色？', options: ['5', '6', '7', '8'], answer: 2, points: 10 },
      { id: uid(4), question: '哪种动物被称为「沙漠之舟」？', options: ['马', '骆驼', '大象', '驴'], answer: 1, points: 10 },
      { id: uid(4), question: '「你好」的日文是？', options: ['こんにちは', 'ありがとう', 'さようなら', 'すみません'], answer: 0, points: 10 },
      { id: uid(4), question: '水在海平面的沸点是？', options: ['90°C', '100°C', '110°C', '120°C'], answer: 1, points: 10 },
    ],
    riddles: [
      { id: uid(4), question: '什么东西越洗越脏？', answer: '水', hint: '你每天都会用到', points: 15 },
      { id: uid(4), question: '什么门永远关不上？', answer: '球门|龙门', hint: '踢足球时会看到', points: 15 },
      { id: uid(4), question: '有头无颈，有眼无眉，无脚能走，有翅难飞（打一动物）', answer: '鱼|魚', hint: '住在水里', points: 15 },
      { id: uid(4), question: '千里相逢（打一字）', answer: '重', hint: '千 + 里', points: 20 },
      { id: uid(4), question: '一口咬掉牛尾巴（打一字）', answer: '告', hint: '「牛」字没了尾巴，加个「口」', points: 20 },
    ],
    challenges: [
      { id: uid(4), title: '带一位新朋友来活动', description: '带一位第一次来的朋友参加任何活动，提交他/她的昵称。', points: 50, active: true },
      { id: uid(4), title: '分享活动照片', description: '在活动拍一张大合照，提交照片链接。', points: 30, active: true },
      { id: uid(4), title: '连续参加 3 次活动', description: '连续出席 3 次活动，提交活动名称。', points: 80, active: true },
    ],
    submissions: [],
    solved: {},
    minigame: {},
    chat: [],
    announcements: [{ id: uid(4), text: '欢迎来到 LP 258 小镇！选好你的造型，和大家打个招呼吧 👋', createdAt: now() }],
    admin: null,
  };
}

// One-time upgrade of data created by version 1 (Cantonese sample content, UTC event times).
const V1_SEED = {
  events: {
    '冬日聚會 Winter Meetup': { i: 0, h: 19, m: 30, eh: 22, em: 30 },
    '週末行山 Hiking Day': { i: 1, h: 9, m: 0, eh: 14, em: 0 },
    '開幕派對 Opening Party': { i: 2, h: 20, m: 0, eh: 23, em: 0 },
  },
  quiz: ['地球上最大嘅海洋係？', '一年有幾多個星期？', '彩虹一般有幾多種顏色？', '邊種動物被稱為「沙漠之舟」？', '「你好」嘅日文係？', '水喺海平面嘅沸點係？'],
  riddles: ['咩嘢越洗越污糟？', '咩門永遠都關唔埋？', '有頭無頸，有眼無眉，無腳能走，有翼難飛（打一動物）', '千里相逢（打一字）', '一口咬掉牛尾巴（打一字）'],
  challenges: ['帶一位新朋友嚟活動', '分享活動相片', '連續參加 3 次活動'],
  announcement: '歡迎嚟到 LP 258 小鎮！揀好你嘅造型，同大家打個招呼啦 👋',
  address: '（請喺後台更新地址）',
};
function migrate(d) {
  d.meta = d.meta || { v: 1 };
  if (d.meta.v >= DB_VERSION) return false;
  if (d.meta.v < 2) migrateV1(d);
  if (d.meta.v < 3) {
    d.attendance = d.attendance || {};
    for (const [eid, ids] of Object.entries(d.rsvps || {})) {
      const a = d.attendance[eid] || (d.attendance[eid] = {});
      for (const id of ids) if (!a[id]) a[id] = { status: 'going', joinedAt: Date.now() };
    }
    delete d.rsvps;
    d.polls = d.polls || [];
    d.meta.v = 3;
  }
  console.log('🔧 Upgraded data to version', DB_VERSION);
  return true;
}
function migrateV1(d) {
  const seed = seedDb();
  const fixTime = (iso, h, m) => {
    const t = new Date(iso);
    if (!t.getTime()) return iso;
    return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), h - TZ_OFFSET_H, m)).toISOString();
  };
  for (const e of d.events || []) {
    const map = V1_SEED.events[e.title];
    if (map) {
      const s = seed.events[map.i];
      e.date = fixTime(e.date, map.h, map.m);
      if (e.endDate) e.endDate = fixTime(e.endDate, map.eh, map.em);
      delete e.remindedAt;
      Object.assign(e, { title: s.title, venue: s.venue, content: s.content, record: e.record ? s.record : e.record });
    }
    if (e.address === V1_SEED.address) e.address = seed.events[0].address;
  }
  for (const [col, list] of [['quiz', V1_SEED.quiz], ['riddles', V1_SEED.riddles]]) {
    for (const item of d[col] || []) {
      const i = list.indexOf(item.question);
      if (i >= 0) { const { id, ...rest } = seed[col][i]; Object.assign(item, rest); }
    }
  }
  for (const c of d.challenges || []) {
    const i = V1_SEED.challenges.indexOf(c.title);
    if (i >= 0) Object.assign(c, { title: seed.challenges[i].title, description: seed.challenges[i].description });
  }
  for (const a of d.announcements || []) if (a.text === V1_SEED.announcement) a.text = seed.announcements[0].text;
  // v1 hairstyle #8 was "bald"; in v2 bald moved to #10 (#8 is now a braid).
  for (const u of Object.values(d.users || {})) if (u.avatar && u.avatar.hair === 8) u.avatar.hair = 10;
  d.meta.v = 2;
}

// Deleted things are kept as read-only records (the host can look back, but not edit them).
function archive(d, col, item, extra) {
  d.trash = d.trash || [];
  d.trash.push({ id: Math.random().toString(16).slice(2, 10), col, item, deletedAt: Date.now(), ...extra });
  if (d.trash.length > 500) d.trash.splice(0, d.trash.length - 500);
}
function loadDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const base = seedDb();
  if (!fs.existsSync(DB_FILE)) return base;
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    if (!d.meta) d.meta = { v: 1 };
    for (const k of Object.keys(base)) if (d[k] === undefined) d[k] = base[k];
    if (!d.settings.currency) d.settings.currency = 'RM';
    migrate(d);
    return d;
  } catch (e) {
    console.error('⚠️  Could not read db.json, starting fresh (old file kept as db.broken.json):', e.message);
    try { fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'db.broken.json')); } catch {}
    return base;
  }
}

const db = loadDb();
// Uploaded images (payment QR codes, payment screenshots) live apart from the main data so it stays small.
let files = {};
try { if (fs.existsSync(FILES_FILE)) files = JSON.parse(fs.readFileSync(FILES_FILE, 'utf8')); } catch { files = {}; }
let filesDirty = false;
function saveFiles() {
  fs.writeFileSync(FILES_FILE + '.tmp', JSON.stringify(files));
  fs.renameSync(FILES_FILE + '.tmp', FILES_FILE);
  filesDirty = true;
  gistSchedule();
}
function storeImage(dataUrl, kind, owner) {
  const m = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!m) throw httpErr(400, 'bad_image');
  if (m[2].length > 1600000) throw httpErr(413, 'image_too_large');
  const id = uid(8);
  files[id] = { type: m[1], data: m[2], kind, owner: owner || null, at: now() };
  saveFiles();
  return id;
}
function dropFile(id) { if (id && files[id]) { delete files[id]; saveFiles(); } }
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
const GIST_ID = (process.env.GIST_ID || '').trim();
const GH_TOKEN = (process.env.GITHUB_TOKEN || '').trim();
const GIST_FILE = 'lp258-db.json';
const GIST_FILES_FILE = 'lp258-files.json';
const useGist = !!(GIST_ID && GH_TOKEN);
let gistTimer = null, gistBusy = false, gistDirty = false;
const ghHeaders = () => ({ Authorization: `Bearer ${GH_TOKEN}`, Accept: 'application/vnd.github+json', 'User-Agent': 'lp258-town', 'Content-Type': 'application/json' });
async function gistLoad() {
  const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { headers: ghHeaders() });
  if (!r.ok) throw new Error(`Gist load failed: HTTP ${r.status}`);
  const g = await r.json();
  const read = async (f) => (f ? ((f.truncated ? await (await fetch(f.raw_url, { headers: ghHeaders() })).text() : f.content) || '').trim() : '');
  const ff = await read(g.files && g.files[GIST_FILES_FILE]);
  if (ff && ff !== '{}') { try { files = JSON.parse(ff); fs.writeFileSync(FILES_FILE, ff); } catch {} }
  const trimmed = await read(g.files && g.files[GIST_FILE]);
  return trimmed && trimmed !== '{}' ? JSON.parse(trimmed) : null;
}
async function gistSave() {
  if (!useGist) return;
  if (gistBusy) { gistDirty = true; return; }
  gistBusy = true; gistDirty = false;
  try {
    const out = { [GIST_FILE]: { content: JSON.stringify(db) } };
    const withFiles = filesDirty;
    if (withFiles) { out[GIST_FILES_FILE] = { content: JSON.stringify(files) || '{}' }; filesDirty = false; }
    const r = await fetch(`https://api.github.com/gists/${GIST_ID}`, { method: 'PATCH', headers: ghHeaders(), body: JSON.stringify({ files: out }) });
    if (!r.ok) { console.error('Gist save failed: HTTP', r.status); gistDirty = true; if (withFiles) filesDirty = true; }
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
    console.log('   Change it in the admin backend → Settings, or set the ADMIN_PASSWORD environment variable.\n');
  }
}
function checkAdminPw(pw) {
  if (process.env.ADMIN_PASSWORD) return sameStr(pw, process.env.ADMIN_PASSWORD);
  return !!db.admin && sameStr(hashPw(pw, db.admin.salt), db.admin.hash);
}
const adminSessions = new Map();
const loginAttempts = new Map();

// ---------------------------------------------------------------- presence
const online = new Map(); // userId -> { x, y, conns:Set<res>, leaveTimer, lastMove }
const AV_OPTS = { skin: 6, hair: 11, hairColor: 9, outfit: 5, outfitColor: 10, face: 9, acc: 9, seasonal: 2 };
const ROOM_TYPES = ['farmer', 'chef', 'artist', 'coder', 'musician', 'explorer', 'florist', 'bookworm',
  'photographer', 'creator', 'lawyer', 'marketing', 'sales', 'admin', 'founder', 'student'];
const ROOM_WALLS = 6;
function cleanAvatar(a) {
  const o = {};
  for (const k of Object.keys(AV_OPTS)) {
    const n = Math.floor(Number(a && a[k]));
    o[k] = Number.isFinite(n) && n >= 0 && n < AV_OPTS[k] ? n : 0;
  }
  return o;
}
const publicUser = (u) => ({ id: u.id, nickname: u.nickname, avatar: u.avatar, status: u.status || '', points: u.points, room: u.room || null });
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
function kick(userId, key) {
  const o = online.get(userId);
  if (!o) return;
  sendTo(userId, 'kicked', { key });
  for (const r of o.conns) { try { r.end(); } catch {} }
  clearTimeout(o.leaveTimer);
  online.delete(userId);
  broadcast('leave', { id: userId });
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
function systemMsg(key, params) {
  const msg = { id: uid(4), system: true, key, params, at: now() };
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
function boardsChanged() {
  clearTimeout(lbTimer);
  lbTimer = setTimeout(() => broadcast('leaderboard', { leaderboard: leaderboard(), minigame: minigameBoard() }), 300);
}
function award(u, pts, key, params) {
  pts = Math.round(pts);
  if (!pts) return;
  u.points = Math.max(0, (u.points || 0) + pts);
  save();
  broadcast('points', { id: u.id, points: u.points });
  if (key) systemMsg(key, { name: u.nickname, pts, ...params });
  boardsChanged();
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
  systemMsg('sys.liveEnd', { answer: L.options[L.answer], count: correct.length, first: winners[0] || '' });
}

// ---------------------------------------------------------------- event reminders (server push)
setInterval(() => {
  const t = now();
  for (const e of db.events) {
    if (e.tbc) continue;
    const start = Date.parse(e.date);
    if (!start || e.remindedAt || start < t || start - t > 3600000) continue;
    e.remindedAt = t;
    save();
    for (const id of Object.keys(att(e.id))) sendTo(id, 'notice', { key: 'notice.soon', params: { title: e.title, venue: e.venue || '' }, eventId: e.id });
  }
}, 60000);

// Attendance: free events → 'going'; paid events → 'unpaid' → 'submitted' (screenshot uploaded) → 'paid' (host confirmed).
const att = (eid) => db.attendance[eid] || (db.attendance[eid] = {});
const isPaidEvent = (e) => Number(e.fee) > 0;
const payDeadline = (e) => Date.parse(e.payDeadline || '') || (e.tbc ? 0 : Date.parse(e.date));
const REMINDER_ROUNDS = [7, 3, 1]; // payment reminders: days before the payment deadline
function paymentReminders() {
  const t = now();
  for (const e of db.events) {
    if (!isPaidEvent(e)) continue;
    const dl = payDeadline(e);
    if (!dl || dl < t - 86400000) continue;
    for (const [memberId, rec] of Object.entries(att(e.id))) {
      if (!rec || rec.status !== 'unpaid') continue; // stops as soon as they upload / are marked paid
      const due = REMINDER_ROUNDS.filter((d) => t >= dl - d * 86400000).length;
      if ((rec.reminders || 0) >= due || !online.has(memberId)) continue; // offline members see the payment banner when they open the town
      rec.reminders = due;
      save();
      sendTo(memberId, 'notice', { key: 'notice.payDue', params: { title: e.title, fee: e.fee, date: new Date(dl).toISOString(), n: due, total: REMINDER_ROUNDS.length }, eventId: e.id });
    }
  }
}
setInterval(paymentReminders, Number(process.env.REMINDER_INTERVAL_MS) || 5 * 60000);

// ---------------------------------------------------------------- content schemas (admin CRUD)
const SCHEMAS = {
  events: { title: ['line', 80, true], tbc: ['bool'], venue: ['line', 100], address: ['line', 200], date: ['date'], endDate: ['date'], content: ['str', 3000], record: ['str', 5000],
    fee: ['money'], payInfo: ['str', 600], payDeadline: ['date'], capacity: ['int', 0, 100000] },
  polls: { question: ['str', 300, true], options: ['options', 6], closesAt: ['date'] },
  quiz: { question: ['str', 300, true], options: ['options'], answer: ['int', 0, 3], points: ['int', 0, 1000] },
  riddles: { question: ['str', 300, true], answer: ['line', 200, true], hint: ['line', 200], points: ['int', 0, 1000] },
  challenges: { title: ['line', 100, true], description: ['str', 1500], points: ['int', 0, 10000], active: ['bool'] },
};
function cleanItem(col, input) {
  const out = {};
  for (const [k, spec] of Object.entries(SCHEMAS[col])) {
    const [type] = spec;
    const v = input[k];
    if (type === 'str' || type === 'line') {
      out[k] = type === 'str' ? str(v, spec[1]) : line(v, spec[1]);
      if (spec[2] && !out[k]) throw httpErr(400, 'field_required', { field: k });
    } else if (type === 'int') {
      const n = Math.round(Number(v));
      out[k] = Number.isFinite(n) ? clamp(n, spec[1], spec[2]) : spec[1];
    } else if (type === 'bool') {
      out[k] = v === true || v === 'true' || v === 1 || v === 'on';
    } else if (type === 'date') {
      const t = v ? Date.parse(v) : NaN;
      if (spec[1] && !t) throw httpErr(400, 'invalid_date');
      out[k] = t ? new Date(t).toISOString() : '';
    } else if (type === 'money') {
      const n = Math.round(Number(v) * 100) / 100;
      out[k] = Number.isFinite(n) && n > 0 ? Math.min(n, 1e6) : 0;
    } else if (type === 'options') {
      const arr = (Array.isArray(v) ? v : []).map((x) => line(x, 120)).filter(Boolean).slice(0, spec[1] || 4);
      if (arr.length < 2) throw httpErr(400, 'min_options');
      out[k] = arr;
    }
  }
  if (col === 'quiz' && out.answer >= out.options.length) throw httpErr(400, 'answer_not_in_options');
  if (col === 'events' && !out.tbc && !out.date) throw httpErr(400, 'invalid_date');
  return out;
}

// ---------------------------------------------------------------- http helpers
function httpErr(code, key, params) { const e = new Error(key); e.code = code; e.key = key; e.params = params; return e; }
function json(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj ?? {}));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > 2.5 * 1024 * 1024) { reject(httpErr(413, 'too_large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) || {}); } catch { reject(httpErr(400, 'bad_request')); }
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
  if (!u) throw httpErr(401, 'relogin');
  if (u.banned) throw httpErr(403, 'banned');
  return u;
}
function needAdmin(req) {
  const t = bearer(req);
  const exp = t && adminSessions.get(t);
  if (!exp || exp < now()) { adminSessions.delete(t); throw httpErr(401, 'admin_relogin'); }
  return true;
}
function rate(o, key, ms) {
  const t = now();
  if (o[key] && t - o[key] < ms) throw httpErr(429, 'too_fast');
  o[key] = t;
}
const userRate = new Map();
const rateBag = (id) => { if (!userRate.has(id)) userRate.set(id, {}); return userRate.get(id); };

// ---------------------------------------------------------------- routes
const routes = {};
const route = (sig, fn) => { routes[sig] = fn; };

route('POST /api/join', async (req, res, body) => {
  const nickname = line(body.nickname, 16);
  if (!nickname) throw httpErr(400, 'nick_required');
  const u = { id: uid(6), token: uid(16), nickname, avatar: cleanAvatar(body.avatar), status: '', points: 0, room: null, createdAt: now(), lastSeen: now(), banned: false };
  db.users[u.id] = u;
  tokens.set(u.token, u.id);
  save();
  json(res, 200, { token: u.token, user: selfUser(u) });
});

route('GET /api/me', async (req, res) => json(res, 200, { user: selfUser(needUser(req)) }));

route('POST /api/move', async (req, res, body) => {
  const u = needUser(req);
  const o = online.get(u.id);
  if (!o) throw httpErr(409, 'not_connected');
  const x = Number(body.x), y = Number(body.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) throw httpErr(400, 'bad_request');
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
  if (!text) throw httpErr(400, 'empty_msg');
  rate(rateBag(u.id), 'chat', 500);
  const msg = { id: uid(4), from: u.id, name: u.nickname, text, at: now() };
  if (body.to) {
    const t = db.users[body.to];
    if (!t || t.banned) throw httpErr(404, 'friend_not_found');
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
  if (!EMOTES.includes(body.emoji)) throw httpErr(400, 'bad_request');
  rate(rateBag(u.id), 'emote', 400);
  broadcast('emote', { id: u.id, emoji: body.emoji });
  json(res, 200, { ok: true });
});

route('POST /api/poke', async (req, res, body) => {
  const u = needUser(req);
  const t = db.users[body.to];
  if (!t) throw httpErr(404, 'friend_not_found');
  rate(rateBag(u.id), 'poke', 2000);
  sendTo(t.id, 'poke', { from: u.id, name: u.nickname });
  broadcast('emote', { id: u.id, emoji: '👋' });
  json(res, 200, { ok: true });
});

route('POST /api/profile', async (req, res, body) => {
  const u = needUser(req);
  if (body.nickname !== undefined) { const n = line(body.nickname, 16); if (!n) throw httpErr(400, 'nick_required'); u.nickname = n; }
  if (body.status !== undefined) u.status = line(body.status, 40);
  if (body.avatar !== undefined) u.avatar = cleanAvatar(body.avatar);
  save();
  broadcast('profile', publicUser(u));
  json(res, 200, { user: selfUser(u) });
});

route('POST /api/room', async (req, res, body) => {
  const u = needUser(req);
  if (!ROOM_TYPES.includes(body.type)) throw httpErr(400, 'bad_request');
  const wall = Math.floor(Number(body.wall));
  const first = !u.room;
  const changed = !u.room || u.room.type !== body.type;
  u.room = { type: body.type, wall: wall >= 0 && wall < ROOM_WALLS ? wall : 0, at: now() };
  save();
  broadcast('profile', publicUser(u));
  if (first || changed) systemMsg('sys.room', { name: u.nickname, job: body.type });
  json(res, 200, { user: selfUser(u) });
});

route('GET /api/content', async (req, res) => {
  const u = needUser(req);
  const s = solvedOf(u.id);
  const pollOut = (p) => {
    const counts = p.options.map(() => 0);
    for (const v of Object.values(p.votes || {})) if (counts[v] !== undefined) counts[v]++;
    return { id: p.id, question: p.question, options: p.options, closesAt: p.closesAt || '', counts, total: counts.reduce((a, b) => a + b, 0),
      myVote: p.votes && p.votes[u.id] !== undefined ? p.votes[u.id] : null, closed: !!(p.closesAt && Date.parse(p.closesAt) < now()), createdAt: p.createdAt, updatedAt: p.updatedAt };
  };
  json(res, 200, {
    events: [...db.events].sort((a, b) => (a.tbc ? 9e15 : Date.parse(a.date) || 0) - (b.tbc ? 9e15 : Date.parse(b.date) || 0))
      .map(({ id, title, tbc, venue, address, date, endDate, content, record, fee, payInfo, payDeadline: pd, capacity, qrFile, updatedAt, createdAt }) => {
        const mine = att(id)[u.id];
        return { id, title, tbc: !!tbc, venue, address, date: date || '', endDate, content, record, fee: fee || 0, payInfo: payInfo || '', payDeadline: pd || '', capacity: capacity || 0,
          qrFile: qrFile || null, updatedAt: updatedAt || createdAt || null, count: Object.keys(att(id)).length,
          mine: mine ? { status: mine.status, proofFile: mine.proofFile || null, submittedAt: mine.submittedAt || null, paidAt: mine.paidAt || null, note: mine.note || '' } : null };
      }),
    polls: [...db.polls].reverse().map(pollOut),
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
    settings: db.settings,
    lastLive: lastLiveResult,
  });
});

route('POST /api/quiz/answer', async (req, res, body) => {
  const u = needUser(req);
  const q = db.quiz.find((x) => x.id === body.id);
  if (!q) throw httpErr(404, 'not_found');
  const s = solvedOf(u.id);
  if (s.quiz[q.id]) throw httpErr(409, 'quiz_answered');
  const ok = Number(body.choice) === q.answer;
  s.quiz[q.id] = ok ? 'correct' : 'wrong';
  save();
  if (ok) award(u, q.points, 'sys.quiz');
  json(res, 200, { correct: ok, answer: q.answer, points: u.points });
});

route('POST /api/riddle/answer', async (req, res, body) => {
  const u = needUser(req);
  const r = db.riddles.find((x) => x.id === body.id);
  if (!r) throw httpErr(404, 'not_found');
  const s = solvedOf(u.id);
  if (s.riddles.includes(r.id)) throw httpErr(409, 'riddle_solved');
  rate(rateBag(u.id), 'riddle', 800);
  const guess = normAnswer(body.guess);
  const ok = !!guess && r.answer.split('|').map(normAnswer).filter(Boolean).includes(guess);
  if (ok) { s.riddles.push(r.id); save(); award(u, r.points, 'sys.riddle'); }
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
    if (score >= 10) award(u, 5, 'sys.mini', { score });
    else boardsChanged();
  }
  json(res, 200, { best: Math.max(prev, score), newBest });
});

route('POST /api/challenge/submit', async (req, res, body) => {
  const u = needUser(req);
  const c = db.challenges.find((x) => x.id === body.id && x.active !== false);
  if (!c) throw httpErr(404, 'not_found');
  const text = str(body.text, 600);
  if (!text) throw httpErr(400, 'submit_text_required');
  if (db.submissions.some((x) => x.challengeId === c.id && x.userId === u.id && x.status !== 'rejected')) throw httpErr(409, 'challenge_submitted');
  db.submissions.push({ id: uid(4), challengeId: c.id, userId: u.id, text, status: 'pending', createdAt: now() });
  save();
  json(res, 200, { ok: true });
});

route('POST /api/event/rsvp', async (req, res, body) => {
  const u = needUser(req);
  const e = db.events.find((x) => x.id === body.id);
  if (!e) throw httpErr(404, 'not_found');
  const a = att(e.id);
  const rec = a[u.id];
  if (rec) {
    if (rec.status === 'submitted' || rec.status === 'paid') throw httpErr(409, 'paid_cannot_leave');
    delete a[u.id];
  } else {
    if (e.capacity && Object.keys(a).length >= e.capacity) throw httpErr(409, 'event_full');
    a[u.id] = { status: isPaidEvent(e) ? 'unpaid' : 'going', joinedAt: now(), reminders: 0 };
  }
  save();
  json(res, 200, { going: !rec, count: Object.keys(a).length });
});

route('POST /api/event/proof', async (req, res, body) => {
  const u = needUser(req);
  const e = db.events.find((x) => x.id === body.id);
  if (!e || !isPaidEvent(e)) throw httpErr(404, 'not_found');
  const rec = att(e.id)[u.id];
  if (!rec) throw httpErr(409, 'join_first');
  if (rec.status === 'paid') throw httpErr(409, 'already_paid');
  const fid = storeImage(body.image, 'proof', u.id);
  dropFile(rec.proofFile);
  Object.assign(rec, { status: 'submitted', proofFile: fid, submittedAt: now(), note: '' });
  save();
  json(res, 200, { ok: true });
});

route('POST /api/poll/vote', async (req, res, body) => {
  const u = needUser(req);
  const p = db.polls.find((x) => x.id === body.id);
  if (!p) throw httpErr(404, 'not_found');
  if (p.closesAt && Date.parse(p.closesAt) < now()) throw httpErr(409, 'poll_closed');
  const c = Math.floor(Number(body.choice));
  if (!(c >= 0 && c < p.options.length)) throw httpErr(400, 'bad_request');
  p.votes = p.votes || {};
  p.votes[u.id] = c;
  save();
  broadcast('content', { col: 'polls' });
  json(res, 200, { ok: true });
});

route('POST /api/live/answer', async (req, res, body) => {
  const u = needUser(req);
  if (!live || now() > live.endsAt) throw httpErr(409, 'live_over');
  if (live.answers.has(u.id)) throw httpErr(409, 'live_answered');
  const choice = Math.floor(Number(body.choice));
  if (!(choice >= 0 && choice < live.options.length)) throw httpErr(400, 'bad_request');
  live.answers.set(u.id, { choice, at: now() });
  broadcast('liveCount', { count: live.answers.size });
  json(res, 200, { ok: true });
});

// ---- admin
route('POST /api/admin/login', async (req, res, body) => {
  const ip = req.socket.remoteAddress || '?';
  const list = (loginAttempts.get(ip) || []).filter((t) => now() - t < 60000);
  if (list.length >= 6) throw httpErr(429, 'too_many_attempts');
  list.push(now());
  loginAttempts.set(ip, list);
  if (!checkAdminPw(body.password || '')) throw httpErr(401, 'wrong_password');
  const t = uid(24);
  adminSessions.set(t, now() + 12 * 3600000);
  json(res, 200, { token: t });
});

route('GET /api/admin/overview', async (req, res) => {
  needAdmin(req);
  const users = Object.values(db.users).map((u) => ({
    id: u.id, nickname: u.nickname, avatar: u.avatar, status: u.status || '', points: u.points, banned: !!u.banned, room: u.room || null,
    createdAt: u.createdAt, lastSeen: online.has(u.id) ? now() : u.lastSeen, online: online.has(u.id),
  })).sort((a, b) => b.points - a.points);
  const name = (id) => (db.users[id] ? db.users[id].nickname : '—');
  json(res, 200, {
    users,
    onlineCount: online.size,
    events: [...db.events].sort((a, b) => (b.tbc ? 9e15 : Date.parse(b.date) || 0) - (a.tbc ? 9e15 : Date.parse(a.date) || 0)).map((e) => ({ ...e,
      attendees: Object.entries(att(e.id)).map(([id, r]) => ({ userId: id, nickname: name(id), ...r })).sort((x, y) => (x.joinedAt || 0) - (y.joinedAt || 0)) })),
    polls: [...db.polls].reverse().map((p) => { const counts = p.options.map(() => 0); for (const v of Object.values(p.votes || {})) if (counts[v] !== undefined) counts[v]++; return { id: p.id, question: p.question, options: p.options, closesAt: p.closesAt || '', counts, createdAt: p.createdAt, updatedAt: p.updatedAt }; }),
    pendingPayments: db.events.reduce((n, e) => n + Object.values(att(e.id)).filter((r) => r.status === 'submitted').length, 0),
    quiz: db.quiz, riddles: db.riddles, challenges: db.challenges,
    submissions: [...db.submissions].reverse().map((s) => ({ ...s, nickname: name(s.userId), challenge: (db.challenges.find((c) => c.id === s.challengeId) || {}).title || '—' })),
    announcements: [...db.announcements].reverse(),
    chat: db.chat.filter((m) => !m.to && !m.system).slice(-150).reverse(),
    trash: [...(db.trash || [])].reverse().map((t) => {
      if (t.col !== 'events' || !t.attendance) return t;
      return { ...t, attendees: Object.entries(t.attendance).map(([id, r]) => ({ userId: id, nickname: (db.users[id] && db.users[id].nickname) || (t.names && t.names[id]) || '—', ...r })) };
    }),
    live: live ? { question: live.question, endsAt: live.endsAt, count: live.answers.size } : null,
    lastLive: lastLiveResult,
    passwordFromEnv: !!process.env.ADMIN_PASSWORD,
    settings: db.settings,
  });
});

route('POST /api/admin/save', async (req, res, body) => {
  needAdmin(req);
  const col = body.col;
  if (!SCHEMAS[col]) throw httpErr(400, 'bad_request');
  const item = cleanItem(col, body.item || {});
  const list = db[col];
  const existing = body.item && body.item.id ? list.find((x) => x.id === body.item.id) : null;
  if (col === 'events') {
    if (body.item.qrImage) { item.qrFile = storeImage(body.item.qrImage, 'qr', null); if (existing) dropFile(existing.qrFile); }
    else if (body.item.removeQr && existing) { dropFile(existing.qrFile); item.qrFile = null; }
  }
  item.updatedAt = now();
  if (existing) {
    if (col === 'events' && existing.date !== item.date) delete existing.remindedAt;
    if (col === 'events' && existing.payDeadline !== item.payDeadline) for (const r of Object.values(att(existing.id))) r.reminders = 0;
    if (col === 'polls' && existing.votes) for (const [k, v] of Object.entries(existing.votes)) if (v >= item.options.length) delete existing.votes[k];
    Object.assign(existing, item);
  } else {
    const created = { id: uid(4), ...item, createdAt: now() };
    if (col === 'polls') created.votes = {};
    list.push(created);
    if (col === 'events') broadcast('notice', { key: 'notice.newEvent', params: { title: created.title, date: created.date } });
    if (col === 'polls') broadcast('notice', { key: 'notice.newPoll', params: { title: created.question } });
  }
  save();
  broadcast('content', { col });
  json(res, 200, { ok: true });
});

route('POST /api/admin/delete', async (req, res, body) => {
  needAdmin(req);
  const col = body.col;
  if (!SCHEMAS[col]) throw httpErr(400, 'bad_request');
  const i = db[col].findIndex((x) => x.id === body.id);
  if (i < 0) throw httpErr(404, 'not_found');
  const [removed] = db[col].splice(i, 1);
  if (col === 'events') {
    const attendance = att(body.id);
    const names = Object.fromEntries(Object.keys(attendance).map((id) => [id, db.users[id] ? db.users[id].nickname : '—']));
    archive(db, col, removed, { attendance, names });
    delete db.attendance[body.id];
  } else archive(db, col, removed);
  save();
  broadcast('content', { col });
  json(res, 200, { ok: true });
});

route('POST /api/admin/submission', async (req, res, body) => {
  needAdmin(req);
  const s = db.submissions.find((x) => x.id === body.id);
  if (!s) throw httpErr(404, 'not_found');
  if (!['approved', 'rejected', 'pending'].includes(body.status)) throw httpErr(400, 'bad_request');
  const was = s.status;
  s.status = body.status;
  s.reviewedAt = now();
  const u = db.users[s.userId];
  const c = db.challenges.find((x) => x.id === s.challengeId);
  if (u && c) {
    if (was !== 'approved' && s.status === 'approved') award(u, c.points, 'sys.challenge', { title: c.title });
    if (was === 'approved' && s.status !== 'approved') award(u, -c.points, null);
    if (s.status !== 'pending') sendTo(u.id, 'notice', s.status === 'approved' ? { key: 'notice.ok', params: { title: c.title, pts: c.points } } : { key: 'notice.no', params: { title: c.title } });
    sendTo(u.id, 'content', { col: 'submissions' });
  }
  save();
  json(res, 200, { ok: true });
});

route('POST /api/admin/user', async (req, res, body) => {
  needAdmin(req);
  const u = db.users[body.id];
  if (!u) throw httpErr(404, 'not_found');
  if (body.nickname !== undefined) { const n = line(body.nickname, 16); if (!n) throw httpErr(400, 'nick_required'); u.nickname = n; }
  if (body.status !== undefined) u.status = line(body.status, 40);
  if (body.points !== undefined) award(u, Math.max(0, Math.round(Number(body.points) || 0)) - u.points, null);
  if (body.banned !== undefined) {
    u.banned = !!body.banned;
    if (u.banned) kick(u.id, 'banned');
  }
  save();
  if (!u.banned) broadcast('profile', publicUser(u));
  boardsChanged();
  json(res, 200, { ok: true });
});

route('POST /api/admin/attendance', async (req, res, body) => {
  needAdmin(req);
  const e = db.events.find((x) => x.id === body.eventId);
  if (!e) throw httpErr(404, 'not_found');
  const a = att(e.id);
  const rec = a[body.userId];
  if (body.status === 'remove') { if (rec) { dropFile(rec.proofFile); delete a[body.userId]; } }
  else {
    if (!rec) throw httpErr(404, 'not_found');
    if (body.status === 'paid') {
      Object.assign(rec, { status: 'paid', paidAt: now(), note: '' });
      sendTo(body.userId, 'notice', { key: 'notice.paidOk', params: { title: e.title }, eventId: e.id });
    } else if (body.status === 'unpaid') {
      Object.assign(rec, { status: 'unpaid', paidAt: null, note: line(body.note, 120), reminders: 0 });
      sendTo(body.userId, 'notice', { key: 'notice.paidNo', params: { title: e.title }, eventId: e.id });
    } else throw httpErr(400, 'bad_request');
  }
  save();
  sendTo(body.userId, 'content', { col: 'events' });
  json(res, 200, { ok: true });
});

route('POST /api/admin/user/delete', async (req, res, body) => {
  needAdmin(req);
  const u = db.users[body.id];
  if (!u) throw httpErr(404, 'not_found');
  kick(u.id, 'deleted');
  tokens.delete(u.token);
  archive(db, 'users', { id: u.id, nickname: u.nickname, status: u.status || '', points: u.points, avatar: u.avatar, room: u.room || null, createdAt: u.createdAt, lastSeen: u.lastSeen });
  delete db.users[u.id];
  delete db.solved[u.id];
  delete db.minigame[u.id];
  for (const a of Object.values(db.attendance)) if (a[u.id]) delete a[u.id];
  for (const p of db.polls) if (p.votes) delete p.votes[u.id];
  db.submissions = db.submissions.filter((s) => s.userId !== u.id);
  save();
  boardsChanged();
  json(res, 200, { ok: true });
});

route('POST /api/admin/announce', async (req, res, body) => {
  needAdmin(req);
  const text = str(body.text, 300);
  if (!text) throw httpErr(400, 'field_required', { field: 'text' });
  const existing = body.id ? db.announcements.find((a) => a.id === body.id) : null;
  if (existing) {
    existing.text = text;
    existing.editedAt = now();
    broadcast('announceUpdated', existing);
  } else {
    const a = { id: uid(4), text, createdAt: now() };
    db.announcements.push(a);
    if (db.announcements.length > 50) db.announcements.shift();
    broadcast('announce', a);
  }
  save();
  json(res, 200, { ok: true });
});

route('POST /api/admin/announce/delete', async (req, res, body) => {
  needAdmin(req);
  const gone = db.announcements.find((a) => a.id === body.id);
  if (gone) archive(db, 'announcements', gone);
  db.announcements = db.announcements.filter((a) => a.id !== body.id);
  save();
  broadcast('announceRemoved', { id: body.id });
  json(res, 200, { ok: true });
});

route('POST /api/admin/chat/delete', async (req, res, body) => {
  needAdmin(req);
  const m = db.chat.find((x) => x.id === body.id);
  if (!m) throw httpErr(404, 'not_found');
  archive(db, 'chat', m);
  db.chat = db.chat.filter((x) => x.id !== body.id);
  save();
  broadcast('chatRemoved', { id: body.id });
  json(res, 200, { ok: true });
});

route('POST /api/admin/remind', async (req, res, body) => {
  needAdmin(req);
  const e = db.events.find((x) => x.id === body.id);
  if (!e) throw httpErr(404, 'not_found');
  const ids = Object.keys(att(e.id));
  let reached = 0;
  for (const id of ids) if (online.has(id)) { reached++; sendTo(id, 'notice', { key: 'notice.remind', params: { title: e.title, date: e.date, venue: e.venue || '' }, eventId: e.id }); }
  json(res, 200, { rsvp: ids.length, reached });
});

route('POST /api/admin/live/start', async (req, res, body) => {
  needAdmin(req);
  if (live) throw httpErr(409, 'live_running');
  const q = db.quiz.find((x) => x.id === body.quizId);
  if (!q) throw httpErr(404, 'not_found');
  const secs = clamp(Math.round(Number(body.seconds) || 20), 10, 120);
  live = { id: uid(4), quizId: q.id, question: q.question, options: q.options, answer: q.answer, points: q.points, endsAt: now() + secs * 1000, answers: new Map() };
  setTimeout(endLive, secs * 1000 + 300);
  broadcast('live', liveForClient(null));
  systemMsg('sys.liveStart', {});
  json(res, 200, { ok: true });
});

const SEASONS = ['auto', 'spring', 'summer', 'autumn', 'winter'];
route('POST /api/admin/settings', async (req, res, body) => {
  needAdmin(req);
  if (body.season !== undefined) {
    if (!SEASONS.includes(body.season)) throw httpErr(400, 'bad_request');
    db.settings.season = body.season;
  }
  if (body.currency !== undefined) {
    const c = line(body.currency, 6);
    if (!c) throw httpErr(400, 'field_required', { field: 'currency' });
    db.settings.currency = c;
    broadcast('content', { col: 'events' });
  }
  save();
  broadcast('settings', db.settings);
  json(res, 200, { settings: db.settings });
});

route('POST /api/admin/password', async (req, res, body) => {
  needAdmin(req);
  if (process.env.ADMIN_PASSWORD) throw httpErr(400, 'pw_env');
  const pw = String(body.password || '');
  if (pw.length < 8) throw httpErr(400, 'pw_short');
  const salt = uid(8);
  db.admin = { salt, hash: hashPw(pw, salt) };
  saveNow();
  try { fs.unlinkSync(PW_FILE); } catch {}
  json(res, 200, { ok: true });
});

// ---- realtime stream
function handleStream(req, res, url) {
  const u = userFromToken(url.searchParams.get('token'));
  if (!u) return json(res, 401, { error: 'relogin' });
  if (u.banned) return json(res, 403, { error: 'banned' });
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
    settings: db.settings,
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
  try { fp = path.normalize(path.join(PUBLIC_DIR, decodeURIComponent(pathname))); } catch { return json(res, 400, { error: 'bad_request' }); }
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
    if (url.pathname.startsWith('/api/file/') && req.method === 'GET') {
      const f = files[url.pathname.slice(10)];
      const tok = url.searchParams.get('t') || '';
      const isAdmin = (adminSessions.get(tok) || 0) > now();
      const member = userFromToken(tok);
      if (!f || !(isAdmin || (member && !member.banned && (f.kind === 'qr' || f.owner === member.id)))) return json(res, 404, { error: 'not_found' });
      res.writeHead(200, { 'Content-Type': f.type, 'Cache-Control': 'private, max-age=86400' });
      return res.end(Buffer.from(f.data, 'base64'));
    }
    const fn = routes[`${req.method} ${url.pathname}`];
    if (fn) {
      const body = req.method === 'POST' ? await readBody(req) : {};
      return await fn(req, res, body);
    }
    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' });
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res, 405, { error: 'bad_request' });
    serveStatic(req, res, url.pathname);
  } catch (e) {
    const known = typeof e.code === 'number';
    if (!known) console.error(e);
    if (!res.headersSent) json(res, known ? e.code : 500, { error: known ? e.key : 'server_error', params: known ? e.params : undefined });
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
        if (!remote.meta) db.meta = { v: 1 };
        db.settings = { ...base.settings, ...(remote.settings || {}) };
        if (!db.trash) db.trash = [];
        migrate(db);
        rebuildTokens();
        console.log(`☁️  Loaded data from GitHub Gist (${Object.keys(db.users).length} members)`);
      } else console.log('☁️  Gist is empty — starting with sample content');
    } catch (e) {
      console.error('❌ Could not load data from GitHub Gist:', e.message);
      console.error('   Check GIST_ID and GITHUB_TOKEN (needs the "gist" scope).');
      setTimeout(() => process.exit(1), 200);
      return;
    }
  } else if (process.env.RENDER) {
    console.warn('⚠️  GIST_ID / GITHUB_TOKEN not set — data will be lost when this server restarts.');
  }
  setupAdmin();
  saveNow();
  server.listen(PORT, () => {
    console.log(`🏡 LP 258 Town running at http://localhost:${PORT}`);
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
