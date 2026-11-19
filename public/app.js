/* LP 258 小鎮 — client */
(() => {
  'use strict';

  // ============================================================ utils
  const $ = (s, root = document) => root.querySelector(s);
  function el(tag, props, ...kids) {
    const e = document.createElement(tag);
    if (props) for (const [k, v] of Object.entries(props)) {
      if (v == null || v === false) continue;
      if (k === 'class') e.className = v;
      else if (k === 'style') e.style.cssText = v;
      else if (k.startsWith('on') && typeof v === 'function') e.addEventListener(k.slice(2), v);
      else if (k in e) { try { e[k] = v; } catch { e.setAttribute(k, v); } }
      else e.setAttribute(k, v);
    }
    for (const c of kids.flat(Infinity)) if (c != null && c !== false) e.append(c instanceof Node ? c : String(c));
    return e;
  }
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
    del(k) { try { localStorage.removeItem(k); } catch {} },
  };
  async function api(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    const r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let data = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) { const e = new Error((data && data.error) || '網絡錯誤 (' + r.status + ')'); e.status = r.status; throw e; }
    return data;
  }
  function toast(text, type = '', ms = 3500) {
    const t = el('div', { class: 'toast ' + type }, text);
    $('#toasts').append(t);
    setTimeout(() => t.remove(), ms);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtDate = (iso, opts) => new Date(iso).toLocaleString('zh-HK', opts || { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString('zh-HK', { hour: '2-digit', minute: '2-digit' });
  function relTime(ms) {
    if (ms < 0) return '已開始';
    const m = Math.round(ms / 60000);
    if (m < 60) return `${m} 分鐘後`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} 個鐘後`;
    return `${Math.round(h / 24)} 日後`;
  }
  function prepCanvas(c, fallbackW, fallbackH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = c.clientWidth || fallbackW, h = c.clientHeight || fallbackH;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    return { ctx, w, h };
  }
  function drawPreview(c, av, fw = 220, fh = 240) {
    const { ctx, w, h } = prepCanvas(c, fw, fh);
    Avatar.draw(ctx, av, w / 2, h * 0.93, { scale: h / 105 });
  }

  // ============================================================ state
  const state = {
    token: store.get('lp258_token'),
    me: null,
    meId: null,
    players: new Map(),
    chat: [],
    content: null,
    announcements: [],
    dm: null,
    live: null,
    target: null,
    keys: {},
  };
  const WORLD = { w: 1600, h: 1020 };
  const PLAZA = { x: 800, y: 500 };

  // ============================================================ customizer
  function buildCustomizer(container, av, onChange) {
    container.replaceChildren();
    for (const [key, opt] of Object.entries(Avatar.OPTIONS)) {
      const opts = el('div', { class: 'cz-opts' });
      (opt.colors || opt.names).forEach((v, i) => {
        const b = opt.colors
          ? el('button', { class: 'sw', title: `${opt.label} ${i + 1}`, style: `background:${v}`, type: 'button' })
          : el('button', { type: 'button' }, v);
        if ((av[key] || 0) === i) b.classList.add('on');
        b.onclick = () => {
          av[key] = i;
          [...opts.children].forEach((c, j) => c.classList.toggle('on', j === i));
          onChange();
        };
        opts.append(b);
      });
      container.append(el('div', { class: 'cz-group' }, el('h4', {}, opt.label), opts));
    }
  }

  // ============================================================ join
  const joinAv = Avatar.random();
  function showJoin() {
    $('#town').classList.add('hidden');
    $('#join').classList.remove('hidden');
    const redraw = () => drawPreview($('#joinPreview'), joinAv);
    buildCustomizer($('#joinCustomizer'), joinAv, redraw);
    requestAnimationFrame(redraw);
    setTimeout(() => $('#joinName').focus(), 50);
  }
  $('#joinRandom').onclick = () => { Object.assign(joinAv, Avatar.random()); showJoin(); };
  async function doJoin() {
    const nickname = $('#joinName').value.trim();
    $('#joinErr').textContent = '';
    if (!nickname) { $('#joinErr').textContent = '請輸入暱稱，等大家知道你係邊個 😊'; return; }
    $('#joinBtn').disabled = true;
    try {
      const r = await api('POST', '/api/join', { nickname, avatar: joinAv });
      state.token = r.token;
      store.set('lp258_token', r.token);
      state.me = r.user;
      enterTown();
      toast('歡迎嚟到 LP 258 小鎮！喺「我的」可以睇到你嘅登入碼', 'good', 5000);
    } catch (e) { $('#joinErr').textContent = e.message; }
    $('#joinBtn').disabled = false;
  }
  $('#joinBtn').onclick = doJoin;
  $('#joinName').onkeydown = (e) => { if (e.key === 'Enter') doJoin(); };
  $('#codeBtn').onclick = async () => {
    const code = $('#codeInput').value.trim();
    if (!code) return;
    state.token = code;
    try {
      const r = await api('GET', '/api/me');
      store.set('lp258_token', code);
      state.me = r.user;
      enterTown();
    } catch (e) { state.token = null; $('#joinErr').textContent = e.status === 401 ? '登入碼唔啱' : e.message; }
  };

  function logout(reason) {
    if (es) es.close();
    store.del('lp258_token');
    if (reason) alert(reason);
    location.reload();
  }

  // ============================================================ town / realtime
  let es = null;
  let loopStarted = false;
  function enterTown() {
    $('#join').classList.add('hidden');
    $('#town').classList.remove('hidden');
    updateHud();
    connect();
    loadContent();
    resize();
    if (!loopStarted) { loopStarted = true; requestAnimationFrame(loop); }
    if (!store.get('lp258_tip')) {
      store.set('lp258_tip', '1');
      setTimeout(() => toast('💡 點擊地面或用 WASD / 方向鍵行走，點擊其他朋友可以打招呼', 'info', 6500), 800);
    }
  }

  function addPlayer(p) {
    const old = state.players.get(p.id);
    const np = { ...p, tx: p.x, ty: p.y, phase: 0, walking: false, seed: Math.random() * 10 };
    if (old) { np.bubble = old.bubble; np.emote = old.emote; }
    state.players.set(p.id, np);
    return np;
  }
  const meP = () => state.players.get(state.meId);

  function connect() {
    if (es) es.close();
    es = new EventSource('/api/stream?token=' + encodeURIComponent(state.token));
    const on = (type, fn) => es.addEventListener(type, (e) => { try { fn(JSON.parse(e.data)); } catch (err) { console.error(type, err); } });
    on('init', (d) => {
      state.meId = d.me;
      const keep = meP();
      state.players.clear();
      for (const p of d.players) addPlayer(p);
      if (keep && meP()) { meP().x = keep.x; meP().y = keep.y; }
      state.chat = d.chat || [];
      state.announcements = d.announcements || [];
      renderTicker();
      updateOnline();
      if (currentPanel === 'chat') renderPanel();
      if (d.live && !d.live.answered) openLive(d.live);
    });
    on('join', (p) => { addPlayer(p); updateOnline(); logLine(el('div', { class: 'sys' }, `👋 ${p.nickname} 上綫咗`)); });
    on('leave', (d) => { state.players.delete(d.id); updateOnline(); });
    on('move', (d) => { const p = state.players.get(d.id); if (p) { p.tx = d.x; p.ty = d.y; } });
    on('chat', addChat);
    on('emote', (d) => { const p = state.players.get(d.id); if (p) p.emote = { e: d.emoji, t: performance.now() }; });
    on('profile', (u) => {
      const p = state.players.get(u.id);
      if (p) Object.assign(p, { nickname: u.nickname, avatar: u.avatar, status: u.status, points: u.points });
      if (u.id === state.meId) { Object.assign(state.me, u); updateHud(); }
      if (currentPanel === 'online') renderPanel();
    });
    on('points', (d) => {
      const p = state.players.get(d.id);
      if (p) p.points = d.points;
      if (d.id === state.meId && state.me) { state.me.points = d.points; updateHud(); }
    });
    on('leaderboard', (d) => {
      if (!state.content) return;
      state.content.leaderboard = d.leaderboard;
      state.content.minigame = d.minigame;
      if (currentPanel === 'rank') renderPanel();
    });
    on('content', () => { clearTimeout(contentTimer); contentTimer = setTimeout(loadContent, 300); });
    on('announce', (a) => { state.announcements.push(a); renderTicker(); toast('📢 ' + a.text, 'info', 6000); });
    on('announceRemoved', (d) => { state.announcements = state.announcements.filter((a) => a.id !== d.id); renderTicker(); });
    on('poke', (d) => {
      toast(`👋 ${d.name} 同你打招呼！`, 'info', 4500);
      logLine(el('div', { class: 'dm' }, `👋 `, el('b', {}, d.name), ' 同你打招呼'));
    });
    on('notice', (d) => { toast(d.text, 'info', 8000); notify(d.text); logLine(el('div', { class: 'sys' }, d.text)); });
    on('live', (d) => openLive(d));
    on('liveCount', (d) => { if (state.live) { state.live.count = d.count; const c = $('#liveCount'); if (c) c.textContent = d.count; } });
    on('liveResult', showLiveResult);
    on('kicked', (d) => { es.close(); logout(d.reason || '你已被登出'); });
    es.onerror = async () => {
      if (es.readyState !== EventSource.CLOSED) return;
      try { await api('GET', '/api/me'); setTimeout(connect, 1500); }
      catch (e) { if (e.status === 401 || e.status === 403) logout(e.message); else setTimeout(connect, 3000); }
    };
  }

  let contentTimer = null;
  async function loadContent() {
    try {
      state.content = await api('GET', '/api/content');
      checkReminders();
      if (currentPanel && currentPanel !== 'chat' && !(currentPanel === 'games' && gameRunning)) renderPanel();
    } catch (e) { if (e.status === 401) logout('請重新登入'); }
  }

  function updateHud() {
    if (!state.me) return;
    $('#myPoints').textContent = state.me.points || 0;
  }
  function updateOnline() {
    $('#onlineCount').textContent = state.players.size;
    if (currentPanel === 'online') renderPanel();
  }

  let tickerIdx = 0;
  function renderTicker() {
    const list = state.announcements.slice(-5);
    const t = $('#tickerText');
    if (!list.length) { t.textContent = '歡迎嚟到 LP 258 小鎮！'; return; }
    tickerIdx = list.length - 1;
    t.textContent = list[tickerIdx].text;
  }
  setInterval(() => {
    const list = state.announcements.slice(-5);
    if (list.length < 2) return;
    tickerIdx = (tickerIdx + 1) % list.length;
    $('#tickerText').textContent = list[tickerIdx].text;
  }, 7000);

  // ============================================================ chat
  function addChat(m) {
    state.chat.push(m);
    if (state.chat.length > 200) state.chat.shift();
    if (!m.system && !m.to) {
      const p = state.players.get(m.from);
      if (p) p.bubble = { text: m.text, t: performance.now() };
    }
    if (currentPanel === 'chat') { const list = $('#msgList'); if (list && matchesChatFilter(m)) { list.append(msgEl(m)); scrollChat(); } }
    else {
      if (m.system) logLine(el('div', { class: 'sys' }, m.text));
      else if (m.to) logLine(el('div', { class: 'dm' }, '🔒 ', el('b', {}, m.from === state.meId ? `→ ${m.toName}` : m.name), ': ', m.text));
      else logLine(el('div', {}, el('b', {}, m.name), ': ', m.text));
    }
    if (m.to && m.from !== state.meId && currentPanel !== 'chat') toast(`💌 ${m.name} 私訊你：${m.text.slice(0, 40)}`, 'info');
  }
  function logLine(node) {
    const log = $('#chatLog');
    log.append(node);
    while (log.children.length > 5) log.firstChild.remove();
    setTimeout(() => node.remove(), 9000);
  }
  async function sendChat() {
    const inp = $('#chatInput');
    const text = inp.value.trim();
    if (!text) return;
    inp.value = '';
    try { await api('POST', '/api/chat', { text, to: state.dm ? state.dm.id : undefined }); }
    catch (e) { toast(e.message, 'bad'); inp.value = text; }
  }
  $('#chatSend').onclick = sendChat;
  $('#chatInput').onkeydown = (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); sendChat(); }
    if (e.key === 'Escape') e.target.blur();
  };
  function setDm(p) {
    state.dm = p ? { id: p.id, nickname: p.nickname } : null;
    const pill = $('#dmPill');
    pill.classList.toggle('hidden', !p);
    pill.textContent = p ? `🔒 ${p.nickname} ✕` : '';
    $('#chatInput').placeholder = p ? `私訊 ${p.nickname}…` : '講啲嘢… (Enter 發送)';
    if (p) $('#chatInput').focus();
  }
  $('#dmPill').onclick = () => setDm(null);

  const EMOTES = ['👋', '❤️', '😂', '👍', '🎉', '😮', '🔥', '🙏', '💃', '😴'];
  const pop = $('#emotePop');
  for (const e of EMOTES) pop.append(el('button', { onclick: () => { sendEmote(e); pop.classList.add('hidden'); } }, e));
  $('#emoteToggle').onclick = () => pop.classList.toggle('hidden');
  async function sendEmote(e) {
    try { await api('POST', '/api/emote', { emoji: e }); } catch (err) { toast(err.message, 'bad'); }
  }

  // ============================================================ world
  const cv = $('#world');
  const ctx = cv.getContext('2d');
  const view = { dpr: 1, w: 0, h: 0, scale: 1, camX: 0, camY: 0 };
  function resize() {
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = window.innerWidth; view.h = window.innerHeight;
    cv.width = Math.round(view.w * view.dpr); cv.height = Math.round(view.h * view.dpr);
    view.scale = clamp(Math.min(view.w / 1000, view.h / 720), 0.58, 1.3);
  }
  window.addEventListener('resize', resize);

  const ZONES = [
    { id: 'hq', name: '📍 HQ 活動中心', x: 110, y: 100, w: 440, h: 300, wall: '#6D8BFF', floor: '#F2D2A0', panel: 'hq' },
    { id: 'game', name: '🎮 Game Zone', x: 1050, y: 100, w: 440, h: 300, wall: '#A77BFF', floor: '#4A3F7A', panel: 'games' },
    { id: 'cafe', name: '☕ 聊天 Café', x: 110, y: 620, w: 440, h: 300, wall: '#FF8FB8', floor: '#FFF0DA', panel: 'chat' },
    { id: 'rank', name: '🏆 積分榜', x: 1050, y: 620, w: 440, h: 300, wall: '#FFB347', floor: '#E8F6FF', panel: 'rank' },
  ];
  const zoneAt = (x, y) => ZONES.find((z) => x > z.x && x < z.x + z.w && y > z.y + 70 && y < z.y + z.h + 10);

  function seeded(s) { return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
  const rnd = seeded(258);
  const TUFTS = Array.from({ length: 260 }, () => ({ x: rnd() * WORLD.w, y: rnd() * WORLD.h }));
  const FLOWERS = Array.from({ length: 70 }, () => ({ x: rnd() * WORLD.w, y: rnd() * WORLD.h, c: ['#FF8FCB', '#FFE066', '#FFFFFF', '#B07CFF', '#FF7A7A'][Math.floor(rnd() * 5)] }))
    .filter((f) => !ZONES.some((z) => f.x > z.x - 20 && f.x < z.x + z.w + 20 && f.y > z.y - 20 && f.y < z.y + z.h + 20) && Math.hypot(f.x - PLAZA.x, f.y - PLAZA.y) > 190);
  const TREES = [[50, 70], [50, 330], [60, 560], [50, 800], [60, 990], [1550, 70], [1550, 330], [1540, 560], [1550, 800], [1540, 990],
    [640, 70], [960, 70], [800, 40], [220, 520], [430, 545], [1170, 520], [1380, 545], [650, 980], [950, 980], [800, 1000]];
  const R = Avatar.rr;
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function txt(s, x, y, size, color, weight = 800, align = 'center') {
    ctx.font = `${weight} ${size}px "Baloo 2", "Noto Sans TC", sans-serif`;
    ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillText(s, x, y);
  }
  function fitText(s, maxW) {
    if (ctx.measureText(s).width <= maxW) return s;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  function drawTree(x, y) {
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(x, y + 4, 30, 9, 0, 0, Math.PI * 2); ctx.fill();
    R(ctx, x - 6, y - 26, 12, 30, 4); ctx.fillStyle = '#A56B3F'; ctx.fill();
    for (const [dx, dy, r, c] of [[-14, -38, 20, '#5DBB5A'], [14, -38, 20, '#5DBB5A'], [0, -56, 24, '#6CCB63'], [-6, -62, 10, '#8BDD7F']]) { circ(x + dx, y + dy, r); ctx.fillStyle = c; ctx.fill(); }
  }
  function drawBench(x, y) {
    R(ctx, x - 34, y - 20, 68, 10, 4); ctx.fillStyle = '#C98B52'; ctx.fill();
    R(ctx, x - 34, y - 8, 68, 10, 4); ctx.fillStyle = '#B57A45'; ctx.fill();
    ctx.fillStyle = '#6B5A55'; ctx.fillRect(x - 28, y + 2, 5, 9); ctx.fillRect(x + 23, y + 2, 5, 9);
  }
  function drawLamp(x, y, t) {
    ctx.fillStyle = '#5B5670'; ctx.fillRect(x - 3, y - 70, 6, 70);
    circ(x, y - 76, 11); ctx.fillStyle = '#FFF3B0'; ctx.fill();
    circ(x, y - 76, 18 + Math.sin(t / 400) * 2); ctx.fillStyle = 'rgba(255,240,160,.25)'; ctx.fill();
  }

  function drawRoom(z, t) {
    const { x, y, w, h } = z;
    const wallH = 100;
    ctx.fillStyle = 'rgba(0,0,0,.13)'; R(ctx, x + 6, y + 12, w, h, 24); ctx.fill();
    R(ctx, x, y, w, h, 24); ctx.fillStyle = z.floor; ctx.fill();
    ctx.save(); R(ctx, x, y, w, h, 24); ctx.clip();
    // floor pattern
    if (z.id === 'hq') { ctx.strokeStyle = Avatar.shade(z.floor, -0.08); ctx.lineWidth = 2; for (let yy = y + wallH + 24; yy < y + h; yy += 24) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); } }
    else if (z.id === 'game') { for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + i * 40, y + wallH + j * 40, 40, 40); } }
    else if (z.id === 'cafe') { for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,170,120,.12)'; ctx.fillRect(x + i * 40, y + wallH + j * 40, 40, 40); } }
    else { ctx.strokeStyle = 'rgba(91,124,250,.12)'; ctx.lineWidth = 2; for (let i = x; i < x + w; i += 36) { ctx.beginPath(); ctx.moveTo(i, y + wallH); ctx.lineTo(i, y + h); ctx.stroke(); } }
    // wall
    ctx.fillStyle = z.wall; ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < w; i += 28) for (let j = 14; j < wallH - 10; j += 28) { circ(x + i + ((j / 28) % 2) * 14, y + j, 3); ctx.fill(); }
    ctx.fillStyle = Avatar.shade(z.wall, -0.25); ctx.fillRect(x, y + wallH - 10, w, 10);
    ctx.fillStyle = Avatar.shade(z.floor, -0.3); ctx.fillRect(x, y + h - 10, w, 10);
    ctx.restore();
    // sign
    const cx = x + w / 2;
    ctx.font = '800 21px "Baloo 2", "Noto Sans TC", sans-serif';
    const sw = ctx.measureText(z.name).width + 34;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; R(ctx, cx - sw / 2, y - 14, sw, 40, 16); ctx.fill();
    R(ctx, cx - sw / 2, y - 18, sw, 40, 16); ctx.fillStyle = '#fff'; ctx.fill();
    txt(z.name, cx, y + 2, 21, '#3A2E3F');
    FURNITURE[z.id](z, t);
  }

  function nextEvent() {
    const ev = state.content && state.content.events;
    if (!ev) return null;
    return ev.find((e) => Date.parse(e.endDate || e.date) + (e.endDate ? 0 : 3 * 3600000) > Date.now()) || null;
  }

  const FURNITURE = {
    hq(z, t) {
      const { x, y, w } = z;
      // cork board
      R(ctx, x + 22, y + 30, 120, 60, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      R(ctx, x + 27, y + 35, 110, 50, 6); ctx.fillStyle = '#E3B47C'; ctx.fill();
      [['#FFF3B0', 34, 40], ['#FFD1E0', 68, 46], ['#C8F0FF', 102, 38], ['#D9F5DC', 50, 62]].forEach(([c, dx, dy]) => {
        ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 26, 20); circ(x + dx + 13, y + dy + 2, 2.5); ctx.fillStyle = '#FF5E5E'; ctx.fill();
      });
      // event screen
      const sx = x + w - 200, sy = y + 26;
      R(ctx, sx, sy, 180, 66, 10); ctx.fillStyle = '#26214A'; ctx.fill();
      R(ctx, sx + 4, sy + 4, 172, 58, 8); ctx.fillStyle = '#2F3A8F'; ctx.fill();
      const ne = nextEvent();
      txt('NEXT EVENT', sx + 90, sy + 15, 11, '#FFD43B', 800);
      ctx.font = '700 15px "Noto Sans TC", sans-serif';
      txt(fitText(ne ? ne.title : '敬請期待', 160), sx + 90, sy + 34, 15, '#fff', 700);
      txt(ne ? fmtDate(ne.date) : '—', sx + 90, sy + 52, 11, '#C8D2FF', 600);
      // desk + laptop
      R(ctx, x + 170, y + 170, 150, 44, 8); ctx.fillStyle = '#B57A45'; ctx.fill();
      R(ctx, x + 170, y + 166, 150, 12, 6); ctx.fillStyle = '#D69A60'; ctx.fill();
      R(ctx, x + 225, y + 146, 40, 24, 4); ctx.fillStyle = '#DDE3F0'; ctx.fill();
      R(ctx, x + 229, y + 150, 32, 16, 3); ctx.fillStyle = `hsl(${(t / 30) % 360},70%,70%)`; ctx.fill();
      // sofa
      R(ctx, x + 30, y + 214, 110, 52, 14); ctx.fillStyle = '#FF8FB8'; ctx.fill();
      R(ctx, x + 40, y + 222, 42, 26, 8); ctx.fillStyle = '#FFB3CF'; ctx.fill();
      R(ctx, x + 88, y + 222, 42, 26, 8); ctx.fill();
      // plant
      drawPlant(x + w - 40, y + 262);
    },
    game(z, t) {
      const { x, y, w } = z;
      for (let i = 0; i < 4; i++) {
        const ax = x + 30 + i * 100, ay = y + 40;
        R(ctx, ax, ay, 64, 104, 10); ctx.fillStyle = ['#FF5E8A', '#4CC9F0', '#FFD43B', '#7ED957'][i]; ctx.fill();
        R(ctx, ax + 8, ay + 10, 48, 38, 6); ctx.fillStyle = '#16122E'; ctx.fill();
        R(ctx, ax + 12, ay + 14, 40, 30, 4); ctx.fillStyle = `hsl(${(t / 15 + i * 80) % 360},85%,62%)`; ctx.fill();
        txt(['★', '?', '◆', '♥'][i], ax + 32, ay + 30, 18, '#fff');
        R(ctx, ax + 6, ay + 58, 52, 16, 5); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
        circ(ax + 20, ay + 66, 4); ctx.fillStyle = '#fff'; ctx.fill();
        circ(ax + 42, ay + 66, 4); ctx.fillStyle = '#FF5E5E'; ctx.fill();
      }
      // quiz table with buzzers
      R(ctx, x + w / 2 - 90, y + 200, 180, 50, 14); ctx.fillStyle = '#6B5BB0'; ctx.fill();
      R(ctx, x + w / 2 - 90, y + 196, 180, 14, 7); ctx.fillStyle = '#8E7FD6'; ctx.fill();
      ['#FF5E5E', '#4CC9F0', '#FFD43B', '#7ED957'].forEach((c, i) => {
        circ(x + w / 2 - 60 + i * 40, y + 214, 9 + (Math.sin(t / 200 + i) > 0.7 ? 1.5 : 0)); ctx.fillStyle = c; ctx.fill();
      });
      txt('QUIZ', x + w / 2, y + 236, 13, '#fff');
    },
    cafe(z, t) {
      const { x, y, w } = z;
      R(ctx, x + 20, y + 30, 120, 60, 8); ctx.fillStyle = '#3D3D4E'; ctx.fill();
      txt('MENU', x + 80, y + 44, 13, '#FFE066');
      ctx.font = '600 11px "Noto Sans TC", sans-serif';
      txt('☕ 咖啡   🧋 奶茶', x + 80, y + 62, 11, '#fff', 600); txt('🍰 蛋糕   🍪 曲奇', x + 80, y + 78, 11, '#fff', 600);
      // counter
      R(ctx, x + 180, y + 108, 240, 40, 10); ctx.fillStyle = '#C98B52'; ctx.fill();
      R(ctx, x + 180, y + 104, 240, 12, 6); ctx.fillStyle = '#E3B47C'; ctx.fill();
      R(ctx, x + 380, y + 78, 30, 32, 6); ctx.fillStyle = '#9AA3B5'; ctx.fill();
      for (let i = 0; i < 3; i++) { const sy = y + 70 - ((t / 30 + i * 10) % 30); ctx.fillStyle = `rgba(255,255,255,${0.6 - ((t / 30 + i * 10) % 30) / 50})`; circ(x + 395 + Math.sin(t / 300 + i) * 3, sy, 3); ctx.fill(); }
      // tables
      for (const [dx, dy] of [[90, 200], [230, 232], [360, 200]]) {
        for (const [ox, oy] of [[-30, 0], [30, 0]]) { circ(x + dx + ox, y + dy + oy + 6, 12); ctx.fillStyle = '#FFB3CF'; ctx.fill(); }
        circ(x + dx, y + dy + 4, 26); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fill();
        circ(x + dx, y + dy, 26); ctx.fillStyle = '#fff'; ctx.fill();
        txt('☕', x + dx, y + dy, 16, '#000', 400);
      }
      drawPlant(x + 30, y + 270);
    },
    rank(z) {
      const { x, y, w } = z;
      // trophy shelf
      R(ctx, x + 24, y + 30, 100, 56, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      txt('🏆', x + 50, y + 54, 26, '#000', 400); txt('🥇', x + 96, y + 56, 22, '#000', 400);
      R(ctx, x + w - 124, y + 30, 100, 56, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      txt('⭐', x + w - 98, y + 56, 24, '#000', 400); txt('🎖️', x + w - 52, y + 56, 22, '#000', 400);
      // podium
      const cx = x + w / 2, base = y + 262;
      const lb = (state.content && state.content.leaderboard) || [];
      const blocks = [[cx - 80, 52, '#C8D2E6', 1], [cx, 76, '#FFD43B', 0], [cx + 80, 36, '#E8A87C', 2]];
      for (const [bx, bh, c, idx] of blocks) {
        R(ctx, bx - 38, base - bh, 76, bh, 8); ctx.fillStyle = c; ctx.fill();
        R(ctx, bx - 38, base - bh, 76, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
        txt(String(idx + 1), bx, base - bh / 2 + 4, 22, 'rgba(58,46,63,.6)');
        const who = lb[idx];
        if (who) {
          Avatar.draw(ctx, who.avatar, bx, base - bh + 2, { scale: 0.62 });
          ctx.font = '700 11px "Noto Sans TC", sans-serif';
          const nm = fitText(who.nickname, 72);
          R(ctx, bx - 38, base + 6, 76, 18, 9); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
          txt(nm, bx, base + 15, 11, '#3A2E3F', 700);
        }
      }
      if (!lb.length) txt('第一名等緊你！', cx, base - 120, 15, '#B98800');
    },
  };
  function drawPlant(x, y) {
    R(ctx, x - 12, y - 18, 24, 20, 5); ctx.fillStyle = '#E8875A'; ctx.fill();
    for (const [dx, dy, r] of [[-8, -26, 9], [8, -26, 9], [0, -36, 10]]) { circ(x + dx, y + dy, r); ctx.fillStyle = '#5DBB5A'; ctx.fill(); }
  }

  function drawWorld(t) {
    ctx.fillStyle = '#9BE08A'; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.strokeStyle = '#88D177'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const g of TUFTS) { ctx.beginPath(); ctx.moveTo(g.x - 4, g.y - 6); ctx.lineTo(g.x, g.y); ctx.lineTo(g.x + 4, g.y - 6); ctx.stroke(); }
    for (const f of FLOWERS) { circ(f.x, f.y, 3.5); ctx.fillStyle = f.c; ctx.fill(); circ(f.x, f.y, 1.4); ctx.fillStyle = '#FFB000'; ctx.fill(); }
    // paths
    for (const [lw, c] of [[78, '#E3CB92'], [64, '#F6E7BF']]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw;
      for (const z of ZONES) { ctx.beginPath(); ctx.moveTo(PLAZA.x, PLAZA.y); ctx.lineTo(z.x + z.w / 2, z.y + z.h / 2); ctx.stroke(); }
    }
    // plaza
    circ(PLAZA.x, PLAZA.y, 180); ctx.fillStyle = '#E3CB92'; ctx.fill();
    circ(PLAZA.x, PLAZA.y, 170); ctx.fillStyle = '#F6E7BF'; ctx.fill();
    ctx.strokeStyle = '#EAD7A6'; ctx.lineWidth = 3; circ(PLAZA.x, PLAZA.y, 120); ctx.stroke(); circ(PLAZA.x, PLAZA.y, 150); ctx.stroke();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; circ(PLAZA.x + Math.cos(a) * 135, PLAZA.y + Math.sin(a) * 135, 4); ctx.fillStyle = '#EAD7A6'; ctx.fill(); }
    for (const z of ZONES) drawRoom(z, t);
    // fountain
    const fx = PLAZA.x, fy = PLAZA.y - 20;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(fx, fy + 8, 64, 22, 0, 0, Math.PI * 2); ctx.fill();
    circ(fx, fy, 60); ctx.fillStyle = '#C9D6E3'; ctx.fill();
    circ(fx, fy, 50); ctx.fillStyle = '#7FD3F7'; ctx.fill();
    for (let i = 0; i < 3; i++) { const r = 12 + ((t / 30 + i * 13) % 38); ctx.strokeStyle = `rgba(255,255,255,${0.7 - r / 55})`; ctx.lineWidth = 2; circ(fx, fy, r); ctx.stroke(); }
    circ(fx, fy, 12); ctx.fillStyle = '#B0BFD0'; ctx.fill();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + t / 900; const k = ((t / 400 + i / 6) % 1); circ(fx + Math.cos(a) * 26 * k, fy - 18 + Math.sin(a) * 10 * k + k * k * 20, 3); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }
    // plaza sign
    R(ctx, PLAZA.x - 6, PLAZA.y + 118, 12, 40, 3); ctx.fillStyle = '#A56B3F'; ctx.fill();
    R(ctx, PLAZA.x - 80, PLAZA.y + 100, 160, 34, 12); ctx.fillStyle = '#FFF8EE'; ctx.fill();
    ctx.strokeStyle = '#C98B52'; ctx.lineWidth = 3; ctx.stroke();
    txt('🏡 LP 258 Plaza', PLAZA.x, PLAZA.y + 118, 16, '#3A2E3F');
    drawBench(PLAZA.x - 120, PLAZA.y + 90); drawBench(PLAZA.x + 120, PLAZA.y + 90);
    drawLamp(PLAZA.x - 160, PLAZA.y - 40, t); drawLamp(PLAZA.x + 160, PLAZA.y - 40, t);
    for (const [x, y] of TREES) drawTree(x, y);
  }

  // ---------- bubble & tags
  function wrapLines(text, maxW, maxLines) {
    const lines = [];
    let cur = '';
    for (const ch of text) {
      if (ctx.measureText(cur + ch).width > maxW && cur) { lines.push(cur); cur = ch; if (lines.length === maxLines) break; }
      else cur += ch;
    }
    if (lines.length < maxLines && cur) lines.push(cur);
    else if (lines.length === maxLines && cur) lines[maxLines - 1] = lines[maxLines - 1].slice(0, -1) + '…';
    return lines;
  }
  function drawBubble(p, now) {
    if (!p.bubble) return;
    const age = now - p.bubble.t;
    if (age > 6000) { p.bubble = null; return; }
    ctx.globalAlpha = age > 5400 ? (6000 - age) / 600 : 1;
    ctx.font = '600 13px "Noto Sans TC", sans-serif';
    const lines = wrapLines(p.bubble.text, 160, 3);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const h = lines.length * 17 + 12;
    const bx = p.x - w / 2, by = p.y - 100 - h;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; R(ctx, bx + 2, by + 3, w, h, 12); ctx.fill();
    R(ctx, bx, by, w, h, 12); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.moveTo(p.x - 6, by + h - 1); ctx.lineTo(p.x, by + h + 8); ctx.lineTo(p.x + 6, by + h - 1); ctx.fill();
    lines.forEach((l, i) => txt(l, p.x, by + 15 + i * 17, 13, '#3A2E3F', 600));
    ctx.globalAlpha = 1;
  }
  function drawEmote(p, now) {
    if (!p.emote) return;
    const age = (now - p.emote.t) / 1000;
    if (age > 2.4) { p.emote = null; return; }
    ctx.globalAlpha = Math.min(1, (2.4 - age) * 2);
    const s = 30 + Math.sin(Math.min(age * 8, Math.PI)) * 8;
    txt(p.emote.e, p.x + 26, p.y - 92 - age * 18, s, '#000', 400);
    ctx.globalAlpha = 1;
  }
  function drawTag(p, isMe) {
    ctx.font = '700 12px "Noto Sans TC", sans-serif';
    const name = fitText(p.nickname, 110);
    const w = ctx.measureText(name).width + 16;
    R(ctx, p.x - w / 2, p.y + 6, w, 19, 9.5);
    ctx.fillStyle = isMe ? '#FFD43B' : 'rgba(255,255,255,.92)'; ctx.fill();
    txt(name, p.x, p.y + 16, 12, '#3A2E3F', 700);
  }

  // ---------- loop
  let lastT = performance.now();
  let lastSent = 0, dirty = false;
  let currentZone = null;
  function loop(t) {
    const dt = Math.min(0.05, (t - lastT) / 1000);
    lastT = t;
    update(dt, t);
    render(t);
    requestAnimationFrame(loop);
  }
  function update(dt, t) {
    const me = meP();
    if (me) {
      let dx = 0, dy = 0;
      const k = state.keys;
      if (k.ArrowLeft || k.a) dx -= 1;
      if (k.ArrowRight || k.d) dx += 1;
      if (k.ArrowUp || k.w) dy -= 1;
      if (k.ArrowDown || k.s) dy += 1;
      if (dx || dy) state.target = null;
      else if (state.target) {
        const tx = state.target.x - me.x, ty = state.target.y - me.y;
        const d = Math.hypot(tx, ty);
        if (d < 4) state.target = null; else { dx = tx / d; dy = ty / d; }
      }
      const len = Math.hypot(dx, dy);
      if (len) {
        const sp = 240 * dt;
        let step = sp;
        if (state.target) step = Math.min(sp, Math.hypot(state.target.x - me.x, state.target.y - me.y));
        me.x = clamp(me.x + (dx / len) * step, 20, WORLD.w - 20);
        me.y = clamp(me.y + (dy / len) * step, 40, WORLD.h - 10);
        me.walking = true; me.phase += dt * 13; dirty = true;
      } else me.walking = false;
      if (dirty && t - lastSent > 110) {
        lastSent = t; dirty = false;
        api('POST', '/api/move', { x: me.x, y: me.y }).catch(() => {});
      }
      const z = zoneAt(me.x, me.y);
      if (z !== currentZone) {
        currentZone = z;
        const b = $('#zoneBtn');
        if (z) { b.textContent = `進入 ${z.name}`; b.classList.remove('hidden'); b.onclick = () => openPanel(z.panel); }
        else b.classList.add('hidden');
      }
    }
    for (const p of state.players.values()) {
      if (p.id === state.meId) continue;
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 500) { p.x = p.tx; p.y = p.ty; p.walking = false; }
      else if (d > 1.5) {
        const step = Math.min(d, Math.max(240, d * 4) * dt);
        p.x += (dx / d) * step; p.y += (dy / d) * step;
        p.walking = true; p.phase += dt * 13;
      } else p.walking = false;
    }
  }
  function render(t) {
    const me = meP();
    const s = view.scale, dpr = view.dpr;
    const vw = view.w / s, vh = view.h / s;
    if (me) {
      const tx = vw >= WORLD.w ? (WORLD.w - vw) / 2 : clamp(me.x - vw / 2, 0, WORLD.w - vw);
      const ty = vh >= WORLD.h ? (WORLD.h - vh) / 2 : clamp(me.y - vh / 2 - 20, 0, WORLD.h - vh);
      view.camX += (tx - view.camX) * 0.12; view.camY += (ty - view.camY) * 0.12;
      if (Math.abs(tx - view.camX) > 800) { view.camX = tx; view.camY = ty; }
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#7CC96A'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(dpr * s, 0, 0, dpr * s, -view.camX * dpr * s, -view.camY * dpr * s);
    drawWorld(t);
    if (state.target) {
      const k = (t / 600) % 1;
      ctx.strokeStyle = `rgba(255,122,156,${1 - k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(state.target.x, state.target.y, 8 + k * 14, (8 + k * 14) * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const list = [...state.players.values()].sort((a, b) => a.y - b.y);
    for (const p of list) {
      Avatar.draw(ctx, p.avatar, p.x, p.y, { walking: p.walking, phase: p.phase, idle: t / 1000 + p.seed });
      drawTag(p, p.id === state.meId);
    }
    for (const p of list) { drawEmote(p, t); drawBubble(p, t); }
  }

  // ---------- input
  const typing = () => { const a = document.activeElement; return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.isContentEditable); };
  const KEYMAP = { ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight', ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', a: 'a', d: 'd', w: 'w', s: 's', A: 'a', D: 'd', W: 'w', S: 's' };
  window.addEventListener('keydown', (e) => {
    if ($('#town').classList.contains('hidden')) return;
    if (e.key === 'Escape') { if (!$('#modal').classList.contains('hidden')) closeModal(); else closePanel(); return; }
    if (typing() || gameRunning) return;
    if (KEYMAP[e.key]) { state.keys[KEYMAP[e.key]] = true; e.preventDefault(); }
    else if (e.key === 'Enter') { $('#chatInput').focus(); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) state.keys[KEYMAP[e.key]] = false; });
  window.addEventListener('blur', () => { state.keys = {}; });
  cv.addEventListener('pointerdown', (e) => {
    pop.classList.add('hidden');
    if (typing()) document.activeElement.blur();
    const wx = view.camX + e.clientX / view.scale, wy = view.camY + e.clientY / view.scale;
    const hit = [...state.players.values()].sort((a, b) => b.y - a.y)
      .find((p) => Math.abs(wx - p.x) < 24 && wy > p.y - 82 && wy < p.y + 26);
    if (hit) { if (hit.id === state.meId) openPanel('me'); else openPlayerCard(hit); return; }
    state.target = { x: clamp(wx, 20, WORLD.w - 20), y: clamp(wy, 40, WORLD.h - 10) };
  });

  // ============================================================ panels
  let currentPanel = null;
  const tabs = { games: 'quiz', rank: 'points', chat: 'all' };
  const TITLES = { chat: '💬 聊天', online: '👥 在綫朋友', games: '🎮 Game Zone', rank: '🏆 積分榜', hq: '📍 HQ 活動中心', me: '👤 我的' };
  function openPanel(name) {
    if (currentPanel === name) { closePanel(); return; }
    stopGame();
    currentPanel = name;
    $('#panel').classList.remove('hidden');
    $('#panelTitle').textContent = TITLES[name];
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.panel === name));
    renderPanel();
  }
  function closePanel() {
    stopGame();
    currentPanel = null;
    $('#panel').classList.add('hidden');
    document.querySelectorAll('.nav button').forEach((b) => b.classList.remove('on'));
  }
  $('#panelClose').onclick = closePanel;
  document.querySelectorAll('.nav button').forEach((b) => { b.onclick = () => openPanel(b.dataset.panel); });
  $('#onlinePill').onclick = () => openPanel('online');
  $('#pointsPill').onclick = () => openPanel('rank');

  function tabBar(group, items) {
    return el('div', { class: 'tabs' }, items.map(([id, label]) =>
      el('button', { class: tabs[group] === id ? 'on' : '', onclick: () => { stopGame(); tabs[group] = id; renderPanel(); } }, label)));
  }
  function renderPanel() {
    const body = $('#panelBody');
    const scroll = body.scrollTop;
    body.replaceChildren();
    const c = state.content;
    switch (currentPanel) {
      case 'chat': body.append(renderChatPanel()); scrollChat(); return;
      case 'online': body.append(renderOnline()); break;
      case 'games': body.append(c ? renderGames(c) : loading()); break;
      case 'rank': body.append(c ? renderRank(c) : loading()); break;
      case 'hq': body.append(c ? renderHQ(c) : loading()); break;
      case 'me': body.append(renderMe()); return;
    }
    body.scrollTop = scroll;
  }
  const loading = () => el('div', { class: 'empty' }, '載入中…');
  const avatarImg = (av, size = 44) => el('img', { src: Avatar.thumb(av, size), alt: '' });

  // ---------- chat panel
  function matchesChatFilter(m) {
    if (tabs.chat === 'dm') return !!m.to;
    return true;
  }
  function msgEl(m) {
    if (m.system) return el('div', { class: 'msg sys' }, el('div', { class: 'bub' }, m.text, el('small', {}, fmtTime(m.at))));
    const mine = m.from === state.meId;
    const p = state.players.get(m.from);
    const label = m.to ? (mine ? `🔒 私訊 → ${m.toName}` : `🔒 ${m.name} 私訊你`) : m.name;
    const node = el('div', { class: 'msg' + (mine ? ' mine' : '') + (m.to ? ' dm' : '') },
      p ? avatarImg(p.avatar, 34) : el('img', { alt: '', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }),
      el('div', { class: 'bub' }, el('small', {}, `${label} · ${fmtTime(m.at)}`), m.text));
    if (!mine && p) node.querySelector('img').onclick = () => openPlayerCard(p);
    return node;
  }
  function renderChatPanel() {
    const list = el('div', { class: 'msgs', id: 'msgList' }, state.chat.filter(matchesChatFilter).map(msgEl));
    return el('div', { class: 'chat-panel' },
      tabBar('chat', [['all', '全部'], ['dm', '🔒 私訊']]),
      state.chat.length ? list : el('div', { class: 'empty', id: 'msgList' }, '仲未有訊息，打個招呼啦 👋'),
      el('p', { class: 'muted', style: 'text-align:center' }, '喺下面輸入框發送訊息；點擊朋友頭像可以私訊'));
  }
  function scrollChat() { const b = $('#panelBody'); requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; }); }

  // ---------- online panel
  function renderOnline() {
    const list = [...state.players.values()].sort((a, b) => (a.id === state.meId ? -1 : b.id === state.meId ? 1 : a.nickname.localeCompare(b.nickname)));
    return el('div', {},
      el('p', { class: 'muted' }, `而家有 ${list.length} 位朋友喺小鎮`),
      list.map((p) => el('button', { class: 'person' + (p.id === state.meId ? ' me' : ''), onclick: () => (p.id === state.meId ? openPanel('me') : openPlayerCard(p)) },
        avatarImg(p.avatar),
        el('div', { class: 'pinfo' }, el('b', {}, p.nickname + (p.id === state.meId ? '（你）' : '')), el('span', {}, p.status || '在綫中 🟢')),
        el('div', { class: 'pts' }, `⭐ ${p.points || 0}`))));
  }

  // ---------- player card
  function openPlayerCard(p) {
    const c = el('canvas', { width: 160, height: 180, style: 'width:160px;height:180px' });
    const card = el('div', { class: 'player-card' },
      c,
      el('h3', {}, p.nickname),
      el('div', { class: 'muted' }, p.status || '在綫中 🟢'),
      el('div', { style: 'margin-top:6px' }, el('span', { class: 'tag y' }, `⭐ ${p.points || 0} 分`)),
      el('div', { class: 'acts' },
        el('button', { class: 'btn yellow', onclick: async () => { try { await api('POST', '/api/poke', { to: p.id }); toast(`你同 ${p.nickname} 打咗招呼 👋`, 'good'); } catch (e) { toast(e.message, 'bad'); } } }, '👋 打招呼'),
        el('button', { class: 'btn blue', onclick: () => { closeModal(); setDm(p); } }, '💬 私訊'),
        el('button', { class: 'btn', onclick: () => { closeModal(); state.target = { x: p.x + 40, y: p.y }; } }, '🚶 行過去')),
      el('button', { class: 'btn ghost small', style: 'margin-top:12px', onclick: closeModal }, '關閉'));
    openModal(card);
    requestAnimationFrame(() => drawPreview(c, p.avatar, 160, 180));
  }

  // ---------- modal
  let modalKind = null;
  function openModal(node, kind = 'card') {
    modalKind = kind;
    $('#modalCard').replaceChildren(node);
    $('#modal').classList.remove('hidden');
  }
  function closeModal() {
    modalKind = null;
    clearInterval(liveTimer);
    $('#modal').classList.add('hidden');
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

  // ---------- games
  function renderGames(c) {
    const wrap = el('div', {}, tabBar('games', [['quiz', '❓ 問答'], ['riddle', '🧩 猜謎'], ['mini', '⭐ 小遊戲'], ['lp', '🏅 LP Challenge']]));
    const t = tabs.games;
    if (t === 'quiz') {
      const done = c.quiz.filter((q) => q.result).length;
      wrap.append(el('p', { class: 'muted' }, `每題只可以答一次，答啱有積分！已完成 ${done}/${c.quiz.length}`));
      if (!c.quiz.length) wrap.append(el('div', { class: 'empty' }, 'Host 未出題，遲啲再嚟 🙂'));
      for (const q of c.quiz) wrap.append(quizCard(q));
    } else if (t === 'riddle') {
      wrap.append(el('p', { class: 'muted' }, '估中謎底就有分！可以撳 💡 睇提示'));
      if (!c.riddles.length) wrap.append(el('div', { class: 'empty' }, '暫時冇謎題'));
      for (const r of c.riddles) wrap.append(riddleCard(r));
    } else if (t === 'mini') wrap.append(renderMini(c));
    else wrap.append(renderLP(c));
    return wrap;
  }
  function quizCard(q) {
    const card = el('div', { class: 'card' });
    const draw = () => {
      card.replaceChildren(
        el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, el('h3', {}, q.question),
          q.result ? el('span', { class: 'tag ' + (q.result === 'correct' ? 'g' : 'r') }, q.result === 'correct' ? '✅ 答啱' : '❌ 答錯') : el('span', { class: 'tag y' }, `+${q.points}`)),
        el('div', { class: 'opts' }, q.options.map((o, i) => {
          const b = el('button', { disabled: !!q.result }, `${'ABCD'[i]}. ${o}`);
          if (q.result && i === q.answer) b.classList.add('right');
          if (q.picked === i && q.result === 'wrong') b.classList.add('wrong');
          b.onclick = async () => {
            card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
            try {
              const r = await api('POST', '/api/quiz/answer', { id: q.id, choice: i });
              q.result = r.correct ? 'correct' : 'wrong'; q.answer = r.answer; q.picked = i;
              toast(r.correct ? `答啱！+${q.points} 分 🎉` : '答錯咗，下次加油 💪', r.correct ? 'good' : 'bad');
            } catch (e) { toast(e.message, 'bad'); }
            if (currentPanel === 'games') renderPanel(); else draw();
          };
          return b;
        })));
    };
    draw();
    return card;
  }
  function riddleCard(r) {
    const card = el('div', { class: 'card' });
    const input = el('input', { class: 'inp', placeholder: '你嘅答案…', maxLength: 50 });
    const hint = el('div', { class: 'muted hidden', style: 'margin-top:6px' }, '💡 ' + (r.hint || '冇提示喎'));
    const submit = async () => {
      if (!input.value.trim()) return;
      try {
        const res = await api('POST', '/api/riddle/answer', { id: r.id, guess: input.value });
        if (res.correct) { r.solved = true; toast(`估中咗！+${r.points} 分 🧩`, 'good'); card.replaceWith(riddleCard(r)); }
        else { toast('唔啱喎，再諗下 🤔', 'bad'); input.select(); }
      } catch (e) { toast(e.message, 'bad'); }
    };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) submit(); };
    card.append(
      el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, el('h3', {}, r.question),
        r.solved ? el('span', { class: 'tag g' }, '✅ 已解開') : el('span', { class: 'tag y' }, `+${r.points}`)),
      r.solved ? null : el('div', { class: 'row' }, input, el('button', { class: 'btn primary', onclick: submit }, '答'),
        el('button', { class: 'btn ghost', title: '提示', onclick: () => hint.classList.toggle('hidden') }, '💡')),
      r.solved ? null : hint);
    return card;
  }
  function renderLP(c) {
    const wrap = el('div', {}, el('p', { class: 'muted' }, '完成挑戰後提交證明（例如描述、相片連結），Host 審核後就會加分！'));
    if (!c.challenges.length) wrap.append(el('div', { class: 'empty' }, '暫時冇挑戰'));
    for (const ch of c.challenges) {
      const subs = c.mySubmissions.filter((s) => s.challengeId === ch.id);
      const active = subs.find((s) => s.status !== 'rejected');
      const rejected = subs.some((s) => s.status === 'rejected');
      const ta = el('textarea', { class: 'inp', rows: 2, maxLength: 600, placeholder: '講下你點完成，或貼上相片連結…' });
      const status = active
        ? (active.status === 'approved' ? el('span', { class: 'tag g' }, '✅ 已完成') : el('span', { class: 'tag p' }, '⏳ 審核中'))
        : el('span', { class: 'tag y' }, `+${ch.points}`);
      wrap.append(el('div', { class: 'card' },
        el('div', { style: 'display:flex;justify-content:space-between;gap:8px' }, el('h3', {}, '🏅 ' + ch.title), status),
        el('div', { class: 'muted', style: 'white-space:pre-wrap' }, ch.description),
        active ? el('div', { class: 'record' }, '你嘅提交：' + active.text)
          : el('div', { style: 'margin-top:8px' },
            rejected ? el('div', { class: 'tag r', style: 'margin-bottom:6px' }, '上次未通過，可以再提交') : null,
            ta,
            el('button', { class: 'btn primary small', style: 'margin-top:6px', onclick: async () => {
              if (!ta.value.trim()) return toast('請填寫提交內容', 'bad');
              try { await api('POST', '/api/challenge/submit', { id: ch.id, text: ta.value }); toast('已提交！等 Host 審核 ⏳', 'good'); loadContent(); }
              catch (e) { toast(e.message, 'bad'); }
            } }, '提交挑戰'))));
    }
    return wrap;
  }

  // ---------- mini game: 接星星
  let gameRunning = false, gameStop = null;
  function stopGame() { if (gameStop) gameStop(); gameStop = null; gameRunning = false; }
  function renderMini(c) {
    const canvas = el('canvas', { id: 'gameCanvas' });
    const best = el('b', {}, c.myBest || 0);
    const btn = el('button', { class: 'btn primary big' }, '▶️ 開始遊戲');
    const box = el('div', { class: 'game-box' },
      el('div', { class: 'muted', style: 'text-align:center' }, '30 秒內移動籃子接 ⭐（+1）同 🌟（+3），避開 💣（-3）！刷新個人紀錄 +5 積分'),
      canvas,
      el('div', {}, '你嘅最佳紀錄：', best, ' ⭐'),
      btn);
    requestAnimationFrame(() => drawGameIdle(canvas));
    btn.onclick = () => {
      btn.disabled = true;
      gameRunning = true;
      gameStop = starCatch(canvas, async (score) => {
        gameRunning = false; gameStop = null;
        btn.disabled = false; btn.textContent = '🔁 再玩一次';
        try {
          const r = await api('POST', '/api/minigame/score', { score });
          best.textContent = r.best;
          c.myBest = r.best;
          toast(r.newBest ? `新紀錄！${score} ⭐ 🎉` : `今次 ${score} ⭐，最佳紀錄 ${r.best}`, r.newBest ? 'good' : 'info');
        } catch (e) { toast(e.message, 'bad'); }
      });
    };
    return box;
  }
  function drawGameIdle(canvas) {
    const { ctx: g, w, h } = prepCanvas(canvas, 340, 420);
    g.font = '800 26px "Baloo 2", sans-serif'; g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText('⭐ 接星星 ⭐', w / 2, h / 2 - 30);
    g.font = '600 15px "Noto Sans TC", sans-serif'; g.fillStyle = '#C8D2FF';
    g.fillText('用滑鼠 / 手指 / 方向鍵移動', w / 2, h / 2 + 6);
    if (state.me) Avatar.draw(g, state.me.avatar, w / 2, h - 14, { scale: 0.9 });
  }
  function starCatch(canvas, onEnd) {
    const DUR = 30;
    let px = 170, score = 0, items = [], fx = [], running = true, spawn = 0, raf = 0;
    const t0 = performance.now();
    let last = t0;
    const keys = {};
    const W = () => canvas.clientWidth || 340, H = () => canvas.clientHeight || 420;
    const move = (e) => { const r = canvas.getBoundingClientRect(); px = clamp(e.clientX - r.left, 20, r.width - 20); };
    const kd = (e) => { if (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'a' || e.key === 'd') { keys[e.key] = true; e.preventDefault(); } };
    const ku = (e) => { keys[e.key] = false; };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerdown', move);
    window.addEventListener('keydown', kd);
    window.addEventListener('keyup', ku);
    const cleanup = () => {
      running = false; cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', move);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    };
    const frame = (t) => {
      if (!running) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      const el2 = (t - t0) / 1000;
      const { ctx: g, w, h } = prepCanvas(canvas, 340, 420);
      if (keys.ArrowLeft || keys.a) px -= 340 * dt;
      if (keys.ArrowRight || keys.d) px += 340 * dt;
      px = clamp(px, 20, w - 20);
      spawn -= dt;
      if (spawn <= 0) {
        spawn = Math.max(0.2, 0.6 - el2 * 0.013);
        const r = Math.random();
        items.push({ x: 20 + Math.random() * (w - 40), y: -20, vy: 130 + el2 * 7 + Math.random() * 70, k: r < 0.16 ? 'bomb' : r < 0.27 ? 'gold' : 'star' });
      }
      for (const it of items) it.y += it.vy * dt;
      items = items.filter((it) => {
        if (it.y > h - 78 && it.y < h - 40 && Math.abs(it.x - px) < 34) {
          const d = it.k === 'star' ? 1 : it.k === 'gold' ? 3 : -3;
          score = Math.max(0, score + d);
          fx.push({ x: it.x, y: it.y, s: (d > 0 ? '+' : '') + d, t, c: d > 0 ? '#FFE066' : '#FF7A7A' });
          return false;
        }
        return it.y < h + 30;
      });
      // draw
      for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(t / 300 + i)})`; g.fillRect((i * 73) % w, (i * 131) % (h - 80), 2, 2); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = '28px sans-serif';
      for (const it of items) g.fillText(it.k === 'star' ? '⭐' : it.k === 'gold' ? '🌟' : '💣', it.x, it.y);
      if (state.me) Avatar.draw(g, state.me.avatar, px, h - 8, { scale: 0.62, walking: keys.ArrowLeft || keys.ArrowRight, phase: t / 80 });
      g.font = '34px sans-serif'; g.fillText('🧺', px, h - 62);
      fx = fx.filter((f) => t - f.t < 700);
      for (const f of fx) { g.globalAlpha = 1 - (t - f.t) / 700; g.font = '800 20px "Baloo 2", sans-serif'; g.fillStyle = f.c; g.fillText(f.s, f.x, f.y - (t - f.t) / 20); }
      g.globalAlpha = 1;
      g.font = '800 20px "Baloo 2", sans-serif'; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(`⭐ ${score}`, 12, 22);
      g.textAlign = 'right'; g.fillText(`⏱ ${Math.max(0, Math.ceil(DUR - el2))}s`, w - 12, 22);
      if (el2 >= DUR) {
        cleanup();
        g.fillStyle = 'rgba(20,15,50,.6)'; g.fillRect(0, 0, w, h);
        g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = '800 30px "Baloo 2", sans-serif';
        g.fillText('時間到！', w / 2, h / 2 - 20); g.fillText(`${score} ⭐`, w / 2, h / 2 + 20);
        onEnd(score);
        return;
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return cleanup;
  }

  // ---------- rank
  function renderRank(c) {
    const wrap = el('div', {}, tabBar('rank', [['points', '⭐ 總積分'], ['mini', '🎮 接星星']]));
    const list = tabs.rank === 'points' ? c.leaderboard : c.minigame;
    if (!list.length) { wrap.append(el('div', { class: 'empty' }, '仲未有人上榜，快啲去 Game Zone 賺分！')); return wrap; }
    list.forEach((u, i) => {
      const p = state.players.get(u.id);
      wrap.append(el('button', { class: 'person' + (u.id === state.meId ? ' me' : ''), onclick: () => { if (p && p.id !== state.meId) openPlayerCard(p); } },
        el('div', { class: 'rank-n' }, ['🥇', '🥈', '🥉'][i] || i + 1),
        avatarImg(u.avatar),
        el('div', { class: 'pinfo' }, el('b', {}, u.nickname), el('span', {}, p ? '🟢 在綫' : '離綫')),
        el('div', { class: 'pts' }, tabs.rank === 'points' ? `⭐ ${u.points}` : `${u.score} ⭐`)));
    });
    return wrap;
  }

  // ---------- HQ events
  function eventEnd(e) { return Date.parse(e.endDate || '') || Date.parse(e.date) + 3 * 3600000; }
  function renderHQ(c) {
    const now = Date.now();
    const upcoming = c.events.filter((e) => eventEnd(e) > now);
    const past = c.events.filter((e) => eventEnd(e) <= now).reverse();
    const mine = new Set(c.myRsvps);
    const wrap = el('div', {});
    if (state.announcements.length) {
      wrap.append(el('div', { class: 'card', style: 'background:#FFF3C4' }, el('b', {}, '📢 最新公告'),
        state.announcements.slice(-3).reverse().map((a) => el('div', { style: 'margin-top:4px' }, a.text, ' ', el('span', { class: 'muted' }, fmtDate(a.createdAt, { month: 'short', day: 'numeric' }))))));
    }
    wrap.append(el('div', { class: 'section-t' }, `🗓️ 即將舉行（${upcoming.length}）`));
    if (!upcoming.length) wrap.append(el('div', { class: 'empty' }, '暫時未有新活動，留意 Host 公佈！'));
    for (const e of upcoming) wrap.append(eventCard(e, c, mine, false));
    if (past.length) {
      wrap.append(el('div', { class: 'section-t' }, `📸 活動記錄（${past.length}）`));
      for (const e of past) wrap.append(eventCard(e, c, mine, true));
    }
    if ('Notification' in window && Notification.permission === 'default') {
      wrap.append(el('button', { class: 'btn ghost small', onclick: askNotify }, '🔔 開啟瀏覽器通知（活動前提醒你）'));
    }
    return wrap;
  }
  function eventCard(e, c, mine, isPast) {
    const d = new Date(e.date);
    const going = mine.has(e.id);
    const start = Date.parse(e.date);
    const hasAddr = e.address && !e.address.startsWith('（');
    return el('div', { class: 'card event', style: isPast ? 'opacity:.92' : '' },
      el('div', { class: 'date-badge' },
        el('div', { class: 'm' }, d.toLocaleDateString('zh-HK', { month: 'short' })),
        el('div', { class: 'd' }, d.getDate()),
        el('div', { class: 'w' }, d.toLocaleDateString('zh-HK', { weekday: 'short' }))),
      el('div', { class: 'info' },
        el('h3', {}, e.title),
        !isPast ? el('div', { class: 'countdown' }, start > Date.now() ? '⏳ ' + relTime(start - Date.now()) : '🔴 進行中') : null,
        el('div', { class: 'meta' }, '🕒 ' + fmtDate(e.date) + (e.endDate ? ' – ' + fmtDate(e.endDate, { hour: '2-digit', minute: '2-digit' }) : '')),
        e.venue ? el('div', { class: 'meta' }, '📍 ' + e.venue) : null,
        e.address ? el('div', { class: 'meta' }, '🏠 ' + e.address) : null,
        e.content ? el('div', { class: 'content' }, e.content) : null,
        isPast && e.record ? el('div', { class: 'record' }, el('b', {}, '📝 活動記錄'), el('br'), e.record) : null,
        el('div', { class: 'meta' }, `👥 ${c.rsvpCounts[e.id] || 0} 人會出席`),
        !isPast ? el('div', { class: 'actions' },
          el('button', { class: 'btn small ' + (going ? 'green' : 'primary'), onclick: async () => {
            try {
              const r = await api('POST', '/api/event/rsvp', { id: e.id });
              toast(r.going ? '已設定提醒，活動前會通知你 🔔' : '已取消提醒', r.going ? 'good' : '');
              if (r.going && 'Notification' in window && Notification.permission === 'default') askNotify();
              loadContent();
            } catch (err) { toast(err.message, 'bad'); }
          } }, going ? '✅ 會出席・已提醒' : '🔔 我會去・提醒我'),
          el('button', { class: 'btn small', onclick: () => downloadIcs(e) }, '📅 加入日曆'),
          hasAddr ? el('a', { class: 'btn small', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.address), target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, '🗺️ 地圖') : null) : null));
  }
  function downloadIcs(e) {
    const f = (ts) => new Date(ts).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\r?\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
    const start = Date.parse(e.date), end = Date.parse(e.endDate || '') || start + 2 * 3600000;
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LP258//Town//ZH', 'BEGIN:VEVENT', `UID:${e.id}@lp258`, `DTSTAMP:${f(Date.now())}`,
      `DTSTART:${f(start)}`, `DTEND:${f(end)}`, `SUMMARY:${esc(e.title)}`, `LOCATION:${esc([e.venue, e.address].filter(Boolean).join(' '))}`,
      `DESCRIPTION:${esc(e.content)}`, 'BEGIN:VALARM', 'TRIGGER:-PT1H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(e.title)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = el('a', { href: URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), download: 'lp258-event.ics' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }

  // ---------- reminders
  let reminderTimers = [];
  function askNotify() {
    if (!('Notification' in window)) return;
    Notification.requestPermission().then((p) => { if (p === 'granted') toast('已開啟通知 🔔', 'good'); if (currentPanel === 'hq') renderPanel(); });
  }
  function notify(text) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification('LP 258 小鎮', { body: text }); } catch {}
  }
  function checkReminders() {
    const c = state.content;
    if (!c) return;
    const now = Date.now();
    const mine = new Set(c.myRsvps);
    reminderTimers.forEach(clearTimeout);
    reminderTimers = [];
    const soon = c.events.filter((e) => mine.has(e.id) && Date.parse(e.date) > now && Date.parse(e.date) - now < 86400000);
    const bar = $('#reminderBar');
    if (soon.length) {
      const e = soon[0];
      bar.textContent = `⏰ 提醒：「${e.title}」${relTime(Date.parse(e.date) - now)}開始 @ ${e.venue || ''}`;
      bar.classList.remove('hidden');
      bar.onclick = () => { bar.classList.add('hidden'); openPanel('hq'); };
    } else bar.classList.add('hidden');
    for (const e of c.events) {
      if (!mine.has(e.id)) continue;
      const at = Date.parse(e.date) - 3600000 - now;
      if (at > 0 && at < 86400000) reminderTimers.push(setTimeout(() => { const s = `⏰ 「${e.title}」一個鐘後開始！`; toast(s, 'info', 9000); notify(s); }, at));
    }
    const week = c.events.filter((e) => Date.parse(e.date) > now && Date.parse(e.date) - now < 7 * 86400000).length;
    const badge = $('#hqBadge');
    badge.textContent = week;
    badge.classList.toggle('hidden', !week);
  }

  // ---------- me
  function renderMe() {
    const me = state.me;
    const av = { ...me.avatar };
    const c = el('canvas', { width: 120, height: 132, style: 'width:120px;height:132px' });
    const redraw = () => drawPreview(c, av, 120, 132);
    const nick = el('input', { class: 'inp', value: me.nickname, maxLength: 16 });
    const status = el('input', { class: 'inp', value: me.status || '', maxLength: 40, placeholder: '例如：今晚有冇人玩 Quiz？' });
    const cz = el('div', { class: 'customizer', style: 'max-height:none' });
    buildCustomizer(cz, av, redraw);
    const code = el('div', { class: 'code-box', title: '點擊顯示' }, me.code);
    code.onclick = () => code.classList.toggle('show');
    const wrap = el('div', {},
      el('div', { class: 'card me-preview' }, c,
        el('div', { style: 'flex:1;min-width:0' },
          el('label', { class: 'muted' }, '暱稱'), nick,
          el('label', { class: 'muted', style: 'display:block;margin-top:6px' }, '狀態'), status)),
      el('div', { class: 'card' }, el('h3', {}, '🎨 換造型'), cz),
      el('button', { class: 'btn primary big', onclick: async () => {
        try {
          const r = await api('POST', '/api/profile', { nickname: nick.value, status: status.value, avatar: av });
          state.me = r.user; updateHud(); toast('已儲存 ✨', 'good');
        } catch (e) { toast(e.message, 'bad'); }
      } }, '💾 儲存'),
      el('div', { class: 'card', style: 'margin-top:12px' },
        el('h3', {}, '🔑 我的登入碼'),
        el('p', { class: 'muted', style: 'margin:0 0 6px' }, '喺其他裝置用呢個碼登入同一個帳號。請唔好分享畀人！'),
        code,
        el('button', { class: 'btn small', style: 'margin-top:8px', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(me.code).then(() => toast('已複製', 'good')); } }, '📋 複製')),
      el('button', { class: 'btn ghost small', onclick: () => { if (confirm('確定登出？請先記低你嘅登入碼，否則無法再登入呢個帳號。')) logout(); } }, '🚪 登出'));
    requestAnimationFrame(redraw);
    return wrap;
  }

  // ---------- live quiz
  let liveTimer = null;
  function openLive(d) {
    state.live = { ...d };
    const L = state.live;
    const bar = el('div', {});
    const opts = el('div', { class: 'opts' }, d.options.map((o, i) => {
      const b = el('button', { disabled: !!d.answered }, `${'ABCD'[i]}. ${o}`);
      b.onclick = async () => {
        opts.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        b.style.borderColor = 'var(--blue)';
        try { await api('POST', '/api/live/answer', { choice: i }); L.answered = true; L.picked = i; status.textContent = '✅ 已作答，等結果…'; }
        catch (e) { toast(e.message, 'bad'); }
      };
      return b;
    }));
    const status = el('div', { class: 'muted', style: 'margin-top:8px;text-align:center' }, d.answered ? '✅ 已作答，等結果…' : `答啱有 +${d.points} 分，最快答啱再 +5！`);
    openModal(el('div', { class: 'live-card' },
      el('div', { class: 'tag p' }, '⚡ Host 即時問答'),
      el('h3', {}, d.question),
      el('div', { class: 'live-timer' }, bar),
      opts, status,
      el('div', { class: 'muted', style: 'text-align:center;margin-top:4px' }, '已有 ', el('b', { id: 'liveCount' }, d.count || 0), ' 人作答')), 'live');
    const total = Math.max(1000, d.endsAt - Date.now());
    clearInterval(liveTimer);
    const tick = () => { const left = d.endsAt - Date.now(); bar.style.width = clamp((left / total) * 100, 0, 100) + '%'; if (left <= 0) clearInterval(liveTimer); };
    tick();
    liveTimer = setInterval(tick, 250);
  }
  function showLiveResult(r) {
    const picked = state.live && state.live.picked;
    state.live = null;
    clearInterval(liveTimer);
    const right = picked === r.answer;
    openModal(el('div', { class: 'live-card' },
      el('div', { class: 'tag p' }, '⚡ 即時問答結果'),
      el('h3', {}, r.question),
      el('div', { class: 'opts' }, r.options.map((o, i) => el('button', { disabled: true, class: i === r.answer ? 'right' : i === picked ? 'wrong' : '' }, `${'ABCD'[i]}. ${o}`))),
      el('p', { style: 'text-align:center;font-weight:800' }, picked == null ? '你今次冇作答' : right ? '🎉 答啱咗！' : '😅 答錯咗'),
      el('p', { class: 'muted', style: 'text-align:center' }, `${r.correctCount}/${r.total} 人答啱`),
      r.winners.length ? el('p', { style: 'text-align:center' }, '🏅 ' + r.winners.slice(0, 5).join('、')) : null,
      el('div', { style: 'text-align:center' }, el('button', { class: 'btn primary', onclick: closeModal }, '好')),
    ), 'live');
  }

  // ============================================================ boot
  (async function boot() {
    if (state.token) {
      try { const r = await api('GET', '/api/me'); state.me = r.user; enterTown(); return; }
      catch (e) { if (e.status === 401 || e.status === 403) { store.del('lp258_token'); state.token = null; if (e.status === 403) alert(e.message); } else { toast('連唔到伺服器，請稍後再試', 'bad'); } }
    }
    showJoin();
  })();
})();
