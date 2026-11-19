/* LP 258 小镇 — client */
(() => {
  'use strict';
  const t = I18N.t;
  I18N.apply();

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
  const errText = (key, params) => { const s = t('err.' + key, params); return s === 'err.' + key ? key : s; };
  async function api(method, url, body) {
    const headers = { 'Content-Type': 'application/json' };
    if (state.token) headers.Authorization = 'Bearer ' + state.token;
    let r;
    try { r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined }); }
    catch { const e = new Error(t('err.offline')); e.status = 0; throw e; }
    let data = null;
    try { data = await r.json(); } catch {}
    if (!r.ok) { const e = new Error(data && data.error ? errText(data.error, data.params) : t('err.network', { code: r.status })); e.status = r.status; throw e; }
    return data;
  }
  function toast(text, type = '', ms = 3500) {
    const n = el('div', { class: 'toast ' + type }, text);
    $('#toasts').append(n);
    setTimeout(() => n.remove(), ms);
  }
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const fmtDate = (iso, opts) => new Date(iso).toLocaleString(I18N.locale(), opts || { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const fmtTime = (ts) => new Date(ts).toLocaleTimeString(I18N.locale(), { hour: '2-digit', minute: '2-digit' });
  function relTime(ms) {
    if (ms < 0) return t('rel.started');
    const m = Math.round(ms / 60000);
    if (m < 60) return t('rel.min', { n: m });
    const h = Math.round(m / 60);
    if (h < 24) return t('rel.hour', { n: h });
    return t('rel.day', { n: Math.round(h / 24) });
  }
  const jobInfo = (type) => (t('jobs') || {})[type] || null;
  const jobLabel = (type) => { const j = jobInfo(type); return j ? `${Room.ICON[type]} ${j.name}` : ''; };
  function msgText(m) {
    if (!m.key) return m.text || '';
    const p = { ...(m.params || {}) };
    if (m.key === 'sys.room') p.job = jobLabel(p.job) || p.job;
    if (p.date) p.date = fmtDate(p.date);
    let s = t(m.key, p);
    if (m.key === 'sys.liveEnd' && p.first) s += t('sys.liveFirst', p);
    return s;
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
    Avatar.draw(ctx, av, w / 2, h * 0.95, { scale: h / 112 });
  }
  document.querySelectorAll('.lang-btn').forEach((b) => { b.onclick = () => I18N.setLang(I18N.lang === 'zh' ? 'en' : 'zh'); });

  // ============================================================ state
  const state = { token: store.get('lp258_token'), me: null, meId: null, players: new Map(), chat: [], content: null, announcements: [], dm: null, live: null, target: null, keys: {}, joy: null, settings: { season: 'auto' } };
  const isPhone = () => window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 700;
  const season = () => (state.settings && Season.ORDER.includes(state.settings.season) ? state.settings.season : Season.fromDate());
  const theme = () => Season.THEMES[season()];

  // ---------- music (starts on first tap, because browsers block autoplay)
  let musicOn = store.get('lp258_music') !== '0';
  function updateSeasonUi() {
    const sp = $('#seasonPill'); if (sp) sp.textContent = Season.ICON[season()] + ' ' + t('season.' + season());
    const mb = $('#musicBtn'); if (mb) { mb.textContent = musicOn ? '🎵' : '🔇'; mb.title = musicOn ? t('music.off') : t('music.on'); }
  }
  function syncMusic() { if (musicOn && !$('#town').classList.contains('hidden')) Season.Music.play(season()); else Season.Music.stop(); }
  const firstGesture = () => { window.removeEventListener('pointerdown', firstGesture, true); window.removeEventListener('keydown', firstGesture, true); syncMusic(); };
  window.addEventListener('pointerdown', firstGesture, true);
  window.addEventListener('keydown', firstGesture, true);
  const WORLD = { w: 1600, h: 1020 };
  const PLAZA = { x: 800, y: 500 };

  // ============================================================ customizer
  function buildCustomizer(container, av, onChange) {
    container.replaceChildren();
    const opts = t('opts');
    for (const [key, opt] of Object.entries(Avatar.OPTIONS)) {
      const row = el('div', { class: 'cz-opts' });
      const names = opt.colors ? null : opts[key + 'Names'];
      const items = opt.colors || names.slice(0, opt.count);
      items.forEach((v, i) => {
        const b = opt.colors
          ? el('button', { class: 'sw', title: `${opts[key]} ${i + 1}`, style: `background:${v}`, type: 'button' })
          : el('button', { type: 'button' }, v);
        if ((av[key] || 0) === i) b.classList.add('on');
        b.onclick = () => { av[key] = i; [...row.children].forEach((c, j) => c.classList.toggle('on', j === i)); onChange(); };
        row.append(b);
      });
      container.append(el('div', { class: 'cz-group' }, el('h4', {}, opts[key]), row));
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
    if (!nickname) { $('#joinErr').textContent = t('join.needNick'); return; }
    $('#joinBtn').disabled = true;
    try {
      const r = await api('POST', '/api/join', { nickname, avatar: joinAv });
      state.token = r.token;
      store.set('lp258_token', r.token);
      state.me = r.user;
      enterTown();
      toast(t('join.welcome'), 'good', 5000);
      setTimeout(openRoomWelcome, 900);
    } catch (e) { $('#joinErr').textContent = e.message; }
    $('#joinBtn').disabled = false;
  }
  $('#joinBtn').onclick = doJoin;
  $('#joinName').onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) doJoin(); };
  $('#codeBtn').onclick = async () => {
    const code = $('#codeInput').value.trim();
    if (!code) return;
    state.token = code;
    try {
      const r = await api('GET', '/api/me');
      store.set('lp258_token', code);
      state.me = r.user;
      enterTown();
    } catch (e) { state.token = null; $('#joinErr').textContent = e.status === 401 ? t('join.badCode') : e.message; }
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
    updateSeasonUi();
    connect();
    loadContent();
    resize();
    syncMusic();
    if (!loopStarted) { loopStarted = true; requestAnimationFrame(loop); }
    if (!store.get('lp258_tip')) { store.set('lp258_tip', '1'); setTimeout(() => toast(t('tip.move'), 'info', 6500), 800); }
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
      if (d.settings) { state.settings = d.settings; updateSeasonUi(); }
      renderTicker();
      updateOnline();
      if (currentPanel === 'chat') renderPanel();
      if (d.live && !d.live.answered) openLive(d.live);
    });
    on('join', (p) => { addPlayer(p); updateOnline(); logLine(el('div', { class: 'sys' }, t('log.joined', { name: p.nickname }))); });
    on('leave', (d) => { state.players.delete(d.id); updateOnline(); });
    on('move', (d) => { const p = state.players.get(d.id); if (p) { p.tx = d.x; p.ty = d.y; } });
    on('chat', addChat);
    on('emote', (d) => { const p = state.players.get(d.id); if (p) p.emote = { e: d.emoji, t: performance.now() }; });
    on('profile', (u) => {
      const p = state.players.get(u.id);
      if (p) Object.assign(p, { nickname: u.nickname, avatar: u.avatar, status: u.status, points: u.points, room: u.room });
      if (u.id === state.meId && state.me) { Object.assign(state.me, u); updateHud(); }
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
    on('announceUpdated', (a) => { const x = state.announcements.find((y) => y.id === a.id); if (x) x.text = a.text; renderTicker(); });
    on('announceRemoved', (d) => { state.announcements = state.announcements.filter((a) => a.id !== d.id); renderTicker(); });
    on('poke', (d) => { toast(t('toast.poke', { name: d.name }), 'info', 4500); logLine(el('div', { class: 'dm' }, '👋 ', t('log.poke', { name: d.name }))); });
    on('notice', (d) => { const s = msgText(d); toast(s, 'info', 8000); notify(s); logLine(el('div', { class: 'sys' }, s)); });
    on('live', (d) => openLive(d));
    on('settings', (d) => { const before = season(); state.settings = d; updateSeasonUi(); if (season() !== before) { toast(Season.ICON[season()] + ' ' + t('season.changed', { name: t('season.' + season()) }), 'info'); if (Season.Music.playing) Season.Music.play(season()); } });
    on('liveCount', (d) => { if (state.live) { state.live.count = d.count; const c = $('#liveCount'); if (c) c.textContent = t('live.count', { n: d.count }); } });
    on('liveResult', showLiveResult);
    on('kicked', (d) => { es.close(); logout(t('kicked.' + (d.key || 'banned'))); });
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
      if (currentPanel && !['chat', 'me'].includes(currentPanel) && !(currentPanel === 'games' && gameRunning)) renderPanel();
    } catch (e) { if (e.status === 401) logout(t('err.relogin')); }
  }
  function updateHud() { if (state.me) $('#myPoints').textContent = state.me.points || 0; }
  function updateOnline() {
    $('#onlineCount').textContent = t('top.online', { n: state.players.size });
    if (currentPanel === 'online') renderPanel();
  }

  let tickerIdx = 0;
  function renderTicker() {
    const list = state.announcements.slice(-5);
    const tx = $('#tickerText');
    if (!list.length) { tx.textContent = t('ticker.default'); return; }
    tickerIdx = list.length - 1;
    tx.textContent = list[tickerIdx].text;
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
    if (!m.system && !m.to) { const p = state.players.get(m.from); if (p) p.bubble = { text: m.text, t: performance.now() }; }
    if (currentPanel === 'chat') { const list = $('#msgList'); if (list && matchesChatFilter(m)) { list.append(msgEl(m)); scrollChat(); } }
    else if (m.system) logLine(el('div', { class: 'sys' }, msgText(m)));
    else if (m.to) logLine(el('div', { class: 'dm' }, '🔒 ', el('b', {}, m.from === state.meId ? `→ ${m.toName}` : m.name), ': ', m.text));
    else logLine(el('div', {}, el('b', {}, m.name), ': ', m.text));
    if (m.to && m.from !== state.meId && currentPanel !== 'chat') toast(t('toast.dm', { name: m.name, text: m.text.slice(0, 40) }), 'info');
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
    $('#chatInput').placeholder = p ? t('chat.dmPh', { name: p.nickname }) : t('chat.ph');
    if (p) $('#chatInput').focus();
  }
  $('#dmPill').onclick = () => setDm(null);
  const EMOTES = ['👋', '❤️', '😂', '👍', '🎉', '😮', '🔥', '🙏', '💃', '😴'];
  const pop = $('#emotePop');
  for (const e of EMOTES) pop.append(el('button', { onclick: () => { sendEmote(e); pop.classList.add('hidden'); } }, e));
  $('#emoteToggle').onclick = () => pop.classList.toggle('hidden');
  async function sendEmote(e) { try { await api('POST', '/api/emote', { emoji: e }); } catch (err) { toast(err.message, 'bad'); } }

  // ============================================================ world
  const cv = $('#world');
  const ctx = cv.getContext('2d');
  const view = { dpr: 1, w: 0, h: 0, scale: 1, camX: 0, camY: 0 };
  function resize() {
    view.dpr = Math.min(2, window.devicePixelRatio || 1);
    view.w = window.innerWidth; view.h = window.innerHeight;
    cv.width = Math.round(view.w * view.dpr); cv.height = Math.round(view.h * view.dpr);
    view.scale = isPhone() ? clamp(Math.min(view.w / 520, view.h / 760), 0.62, 1.0) : clamp(Math.min(view.w / 1000, view.h / 720), 0.58, 1.3);
    const joy = $('#joy'); if (joy) joy.classList.toggle('hidden', !window.matchMedia('(pointer: coarse)').matches);
  }
  window.addEventListener('resize', resize);

  const ZONES = [
    { id: 'hq', key: 'zone.hq', x: 110, y: 100, w: 440, h: 300, wall: '#6D8BFF', floor: '#F2D2A0', panel: 'hq' },
    { id: 'game', key: 'zone.game', x: 1050, y: 100, w: 440, h: 300, wall: '#A77BFF', floor: '#4A3F7A', panel: 'games' },
    { id: 'cafe', key: 'zone.cafe', x: 110, y: 620, w: 440, h: 300, wall: '#FF8FB8', floor: '#FFF0DA', panel: 'chat' },
    { id: 'rank', key: 'zone.rank', x: 1050, y: 620, w: 440, h: 300, wall: '#FFB347', floor: '#E8F6FF', panel: 'rank' },
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
  const FONT = '"Baloo 2", "Noto Sans SC", sans-serif';
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function txt(s, x, y, size, color, weight = 800, align = 'center') {
    ctx.font = `${weight} ${size}px ${FONT}`;
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
    R(ctx, x - 6, y - 26, 12, 30, 4); ctx.fillStyle = theme().trunk; ctx.fill();
    const th = theme(), cn = th.canopy;
    for (const [dx, dy, r, c] of [[-14, -38, 20, cn[0]], [14, -38, 20, cn[0]], [0, -56, 24, cn[1]], [-6, -62, 10, cn[2]]]) { circ(x + dx, y + dy, r); ctx.fillStyle = c; ctx.fill(); }
    if (th.snow) { ctx.fillStyle = '#FFFFFF'; for (const [dx, dy, rx] of [[-14, -54, 13], [14, -54, 13], [0, -76, 15]]) { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, rx, 6, 0, Math.PI, 0); ctx.fill(); } }
  }
  function drawBench(x, y) {
    R(ctx, x - 34, y - 20, 68, 10, 4); ctx.fillStyle = '#C98B52'; ctx.fill();
    R(ctx, x - 34, y - 8, 68, 10, 4); ctx.fillStyle = '#B57A45'; ctx.fill();
    ctx.fillStyle = '#6B5A55'; ctx.fillRect(x - 28, y + 2, 5, 9); ctx.fillRect(x + 23, y + 2, 5, 9);
  }
  function drawLamp(x, y, tm) {
    ctx.fillStyle = '#5B5670'; ctx.fillRect(x - 3, y - 70, 6, 70);
    circ(x, y - 76, 11); ctx.fillStyle = '#FFF3B0'; ctx.fill();
    circ(x, y - 76, 18 + Math.sin(tm / 400) * 2); ctx.fillStyle = 'rgba(255,240,160,.25)'; ctx.fill();
  }
  function drawPlant(x, y) {
    R(ctx, x - 12, y - 18, 24, 20, 5); ctx.fillStyle = '#E8875A'; ctx.fill();
    for (const [dx, dy, r] of [[-8, -26, 9], [8, -26, 9], [0, -36, 10]]) { circ(x + dx, y + dy, r); ctx.fillStyle = '#5DBB5A'; ctx.fill(); }
  }
  function drawRoom(z, tm) {
    const { x, y, w, h } = z;
    const wallH = 100;
    ctx.fillStyle = 'rgba(0,0,0,.13)'; R(ctx, x + 6, y + 12, w, h, 24); ctx.fill();
    R(ctx, x, y, w, h, 24); ctx.fillStyle = z.floor; ctx.fill();
    ctx.save(); R(ctx, x, y, w, h, 24); ctx.clip();
    if (z.id === 'hq') { ctx.strokeStyle = Avatar.shade(z.floor, -0.08); ctx.lineWidth = 2; for (let yy = y + wallH + 24; yy < y + h; yy += 24) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); } }
    else if (z.id === 'game') { for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,255,255,.06)'; ctx.fillRect(x + i * 40, y + wallH + j * 40, 40, 40); } }
    else if (z.id === 'cafe') { for (let i = 0; i < 12; i++) for (let j = 0; j < 6; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,170,120,.12)'; ctx.fillRect(x + i * 40, y + wallH + j * 40, 40, 40); } }
    else { ctx.strokeStyle = 'rgba(91,124,250,.12)'; ctx.lineWidth = 2; for (let i = x; i < x + w; i += 36) { ctx.beginPath(); ctx.moveTo(i, y + wallH); ctx.lineTo(i, y + h); ctx.stroke(); } }
    ctx.fillStyle = z.wall; ctx.fillRect(x, y, w, wallH);
    ctx.fillStyle = 'rgba(255,255,255,.12)';
    for (let i = 0; i < w; i += 28) for (let j = 14; j < wallH - 10; j += 28) { circ(x + i + ((j / 28) % 2) * 14, y + j, 3); ctx.fill(); }
    ctx.fillStyle = Avatar.shade(z.wall, -0.25); ctx.fillRect(x, y + wallH - 10, w, 10);
    ctx.fillStyle = Avatar.shade(z.floor, -0.3); ctx.fillRect(x, y + h - 10, w, 10);
    ctx.restore();
    const cx = x + w / 2, name = t(z.key);
    ctx.font = `800 21px ${FONT}`;
    const sw = ctx.measureText(name).width + 34;
    ctx.fillStyle = 'rgba(0,0,0,.15)'; R(ctx, cx - sw / 2, y - 14, sw, 40, 16); ctx.fill();
    R(ctx, cx - sw / 2, y - 18, sw, 40, 16); ctx.fillStyle = '#fff'; ctx.fill();
    if (theme().snow) { ctx.fillStyle = '#FFFFFF'; ctx.beginPath(); ctx.moveTo(x + 10, y + 4); for (let i = 0; i <= 10; i++) ctx.quadraticCurveTo(x + 10 + (i - 0.5) * (w - 20) / 10, y + (i % 2 ? 14 : 8), x + 10 + i * (w - 20) / 10, y + 4); ctx.lineTo(x + w - 10, y - 2); ctx.lineTo(x + 10, y - 2); ctx.fill(); }
    txt(name, cx, y + 2, 21, '#3A2E3F');
    FURNITURE[z.id](z, tm);
  }
  function nextEvent() {
    const ev = state.content && state.content.events;
    if (!ev) return null;
    return ev.find((e) => eventEnd(e) > Date.now()) || null;
  }
  const FURNITURE = {
    hq(z, tm) {
      const { x, y, w } = z;
      R(ctx, x + 22, y + 30, 120, 60, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      R(ctx, x + 27, y + 35, 110, 50, 6); ctx.fillStyle = '#E3B47C'; ctx.fill();
      [['#FFF3B0', 34, 40], ['#FFD1E0', 68, 46], ['#C8F0FF', 102, 38], ['#D9F5DC', 50, 62]].forEach(([c, dx, dy]) => {
        ctx.fillStyle = c; ctx.fillRect(x + dx, y + dy, 26, 20); circ(x + dx + 13, y + dy + 2, 2.5); ctx.fillStyle = '#FF5E5E'; ctx.fill();
      });
      const sx = x + w - 200, sy = y + 26;
      R(ctx, sx, sy, 180, 66, 10); ctx.fillStyle = '#26214A'; ctx.fill();
      R(ctx, sx + 4, sy + 4, 172, 58, 8); ctx.fillStyle = '#2F3A8F'; ctx.fill();
      const ne = nextEvent();
      txt(t('event.next'), sx + 90, sy + 15, 11, '#FFD43B', 800);
      ctx.font = `700 15px ${FONT}`;
      txt(fitText(ne ? ne.title : t('event.tbc'), 160), sx + 90, sy + 34, 15, '#fff', 700);
      txt(ne ? fmtDate(ne.date) : '—', sx + 90, sy + 52, 11, '#C8D2FF', 600);
      R(ctx, x + 170, y + 170, 150, 44, 8); ctx.fillStyle = '#B57A45'; ctx.fill();
      R(ctx, x + 170, y + 166, 150, 12, 6); ctx.fillStyle = '#D69A60'; ctx.fill();
      R(ctx, x + 225, y + 146, 40, 24, 4); ctx.fillStyle = '#DDE3F0'; ctx.fill();
      R(ctx, x + 229, y + 150, 32, 16, 3); ctx.fillStyle = `hsl(${(tm / 30) % 360},70%,70%)`; ctx.fill();
      R(ctx, x + 30, y + 214, 110, 52, 14); ctx.fillStyle = '#FF8FB8'; ctx.fill();
      R(ctx, x + 40, y + 222, 42, 26, 8); ctx.fillStyle = '#FFB3CF'; ctx.fill();
      R(ctx, x + 88, y + 222, 42, 26, 8); ctx.fill();
      drawPlant(x + w - 40, y + 262);
    },
    game(z, tm) {
      const { x, y, w } = z;
      for (let i = 0; i < 4; i++) {
        const ax = x + 30 + i * 100, ay = y + 40;
        R(ctx, ax, ay, 64, 104, 10); ctx.fillStyle = ['#FF5E8A', '#4CC9F0', '#FFD43B', '#7ED957'][i]; ctx.fill();
        R(ctx, ax + 8, ay + 10, 48, 38, 6); ctx.fillStyle = '#16122E'; ctx.fill();
        R(ctx, ax + 12, ay + 14, 40, 30, 4); ctx.fillStyle = `hsl(${(tm / 15 + i * 80) % 360},85%,62%)`; ctx.fill();
        txt(['★', '?', '◆', '♥'][i], ax + 32, ay + 30, 18, '#fff');
        R(ctx, ax + 6, ay + 58, 52, 16, 5); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fill();
        circ(ax + 20, ay + 66, 4); ctx.fillStyle = '#fff'; ctx.fill();
        circ(ax + 42, ay + 66, 4); ctx.fillStyle = '#FF5E5E'; ctx.fill();
      }
      R(ctx, x + w / 2 - 90, y + 200, 180, 50, 14); ctx.fillStyle = '#6B5BB0'; ctx.fill();
      R(ctx, x + w / 2 - 90, y + 196, 180, 14, 7); ctx.fillStyle = '#8E7FD6'; ctx.fill();
      ['#FF5E5E', '#4CC9F0', '#FFD43B', '#7ED957'].forEach((c, i) => { circ(x + w / 2 - 60 + i * 40, y + 214, 9 + (Math.sin(tm / 200 + i) > 0.7 ? 1.5 : 0)); ctx.fillStyle = c; ctx.fill(); });
      txt('QUIZ', x + w / 2, y + 236, 13, '#fff');
    },
    cafe(z, tm) {
      const { x, y } = z;
      R(ctx, x + 20, y + 30, 130, 60, 8); ctx.fillStyle = '#3D3D4E'; ctx.fill();
      txt(t('world.menu'), x + 85, y + 44, 13, '#FFE066');
      txt(t('world.menu1'), x + 85, y + 62, 11, '#fff', 600); txt(t('world.menu2'), x + 85, y + 78, 11, '#fff', 600);
      R(ctx, x + 180, y + 108, 240, 40, 10); ctx.fillStyle = '#C98B52'; ctx.fill();
      R(ctx, x + 180, y + 104, 240, 12, 6); ctx.fillStyle = '#E3B47C'; ctx.fill();
      R(ctx, x + 380, y + 78, 30, 32, 6); ctx.fillStyle = '#9AA3B5'; ctx.fill();
      for (let i = 0; i < 3; i++) { const k = (tm / 30 + i * 10) % 30; ctx.fillStyle = `rgba(255,255,255,${0.6 - k / 50})`; circ(x + 395 + Math.sin(tm / 300 + i) * 3, y + 70 - k, 3); ctx.fill(); }
      for (const [dx, dy] of [[90, 200], [230, 232], [360, 200]]) {
        for (const ox of [-30, 30]) { circ(x + dx + ox, y + dy + 6, 12); ctx.fillStyle = '#FFB3CF'; ctx.fill(); }
        circ(x + dx, y + dy + 4, 26); ctx.fillStyle = 'rgba(0,0,0,.1)'; ctx.fill();
        circ(x + dx, y + dy, 26); ctx.fillStyle = '#fff'; ctx.fill();
        txt('☕', x + dx, y + dy, 16, '#000', 400);
      }
      drawPlant(x + 30, y + 270);
    },
    rank(z) {
      const { x, y, w } = z;
      R(ctx, x + 24, y + 30, 100, 56, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      txt('🏆', x + 50, y + 54, 26, '#000', 400); txt('🥇', x + 96, y + 56, 22, '#000', 400);
      R(ctx, x + w - 124, y + 30, 100, 56, 8); ctx.fillStyle = '#C98B52'; ctx.fill();
      txt('⭐', x + w - 98, y + 56, 24, '#000', 400); txt('🎖️', x + w - 52, y + 56, 22, '#000', 400);
      const cx = x + w / 2, base = y + 262;
      const lb = (state.content && state.content.leaderboard) || [];
      for (const [bx, bh, c, idx] of [[cx - 80, 52, '#C8D2E6', 1], [cx, 76, '#FFD43B', 0], [cx + 80, 36, '#E8A87C', 2]]) {
        R(ctx, bx - 38, base - bh, 76, bh, 8); ctx.fillStyle = c; ctx.fill();
        R(ctx, bx - 38, base - bh, 76, 10, 5); ctx.fillStyle = 'rgba(255,255,255,.4)'; ctx.fill();
        txt(String(idx + 1), bx, base - bh / 2 + 4, 22, 'rgba(58,46,63,.6)');
        const who = lb[idx];
        if (who) {
          Avatar.draw(ctx, who.avatar, bx, base - bh + 2, { scale: 0.58 });
          ctx.font = `700 11px ${FONT}`;
          const nm = fitText(who.nickname, 72);
          R(ctx, bx - 38, base + 6, 76, 18, 9); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
          txt(nm, bx, base + 15, 11, '#3A2E3F', 700);
        }
      }
      if (!lb.length) txt(t('rank.first'), cx, base - 120, 15, '#B98800');
    },
  };
  function drawWorld(tm) {
    const th = theme();
    ctx.fillStyle = th.grass; ctx.fillRect(0, 0, WORLD.w, WORLD.h);
    ctx.strokeStyle = th.tuft; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const g of TUFTS) { ctx.beginPath(); ctx.moveTo(g.x - 4, g.y - 6); ctx.lineTo(g.x, g.y); ctx.lineTo(g.x + 4, g.y - 6); ctx.stroke(); }
    FLOWERS.forEach((f, i) => { circ(f.x, f.y, 3.5); ctx.fillStyle = th.flowers[i % th.flowers.length]; ctx.fill(); circ(f.x, f.y, 1.4); ctx.fillStyle = '#FFB000'; ctx.fill(); });
    for (const [lw, c] of [[78, th.path[0]], [64, th.path[1]]]) {
      ctx.strokeStyle = c; ctx.lineWidth = lw;
      for (const z of ZONES) { ctx.beginPath(); ctx.moveTo(PLAZA.x, PLAZA.y); ctx.lineTo(z.x + z.w / 2, z.y + z.h / 2); ctx.stroke(); }
    }
    circ(PLAZA.x, PLAZA.y, 180); ctx.fillStyle = th.path[0]; ctx.fill();
    circ(PLAZA.x, PLAZA.y, 170); ctx.fillStyle = th.path[1]; ctx.fill();
    ctx.strokeStyle = '#EAD7A6'; ctx.lineWidth = 3; circ(PLAZA.x, PLAZA.y, 120); ctx.stroke(); circ(PLAZA.x, PLAZA.y, 150); ctx.stroke();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; circ(PLAZA.x + Math.cos(a) * 135, PLAZA.y + Math.sin(a) * 135, 4); ctx.fillStyle = '#EAD7A6'; ctx.fill(); }
    for (const z of ZONES) drawRoom(z, tm);
    const fx = PLAZA.x, fy = PLAZA.y - 20;
    ctx.fillStyle = 'rgba(0,0,0,.12)'; ctx.beginPath(); ctx.ellipse(fx, fy + 8, 64, 22, 0, 0, Math.PI * 2); ctx.fill();
    circ(fx, fy, 60); ctx.fillStyle = '#C9D6E3'; ctx.fill();
    circ(fx, fy, 50); ctx.fillStyle = th.water; ctx.fill();
    for (let i = 0; i < 3; i++) { const r = 12 + ((tm / 30 + i * 13) % 38); ctx.strokeStyle = `rgba(255,255,255,${0.7 - r / 55})`; ctx.lineWidth = 2; circ(fx, fy, r); ctx.stroke(); }
    circ(fx, fy, 12); ctx.fillStyle = '#B0BFD0'; ctx.fill();
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2 + tm / 900; const k = ((tm / 400 + i / 6) % 1); circ(fx + Math.cos(a) * 26 * k, fy - 18 + Math.sin(a) * 10 * k + k * k * 20, 3); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill(); }
    R(ctx, PLAZA.x - 6, PLAZA.y + 118, 12, 40, 3); ctx.fillStyle = '#A56B3F'; ctx.fill();
    R(ctx, PLAZA.x - 85, PLAZA.y + 100, 170, 34, 12); ctx.fillStyle = '#FFF8EE'; ctx.fill();
    ctx.strokeStyle = '#C98B52'; ctx.lineWidth = 3; ctx.stroke();
    txt(t('plaza.sign'), PLAZA.x, PLAZA.y + 118, 16, '#3A2E3F');
    drawBench(PLAZA.x - 120, PLAZA.y + 90); drawBench(PLAZA.x + 120, PLAZA.y + 90);
    drawLamp(PLAZA.x - 160, PLAZA.y - 40, tm); drawLamp(PLAZA.x + 160, PLAZA.y - 40, tm);
    for (const [x, y] of TREES) drawTree(x, y);
  }
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
    ctx.font = `600 13px ${FONT}`;
    const lines = wrapLines(p.bubble.text, 160, 3);
    const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + 20;
    const h = lines.length * 17 + 12;
    const bx = p.x - w / 2, by = p.y - 112 - h;
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
    txt(p.emote.e, p.x + 28, p.y - 100 - age * 18, 30 + Math.sin(Math.min(age * 8, Math.PI)) * 8, '#000', 400);
    ctx.globalAlpha = 1;
  }
  function drawTag(p, isMe) {
    ctx.font = `700 12px ${FONT}`;
    const icon = p.room && Room.ICON[p.room.type] ? Room.ICON[p.room.type] + ' ' : '';
    const name = icon + fitText(p.nickname, 110);
    const w = ctx.measureText(name).width + 16;
    R(ctx, p.x - w / 2, p.y + 6, w, 19, 9.5);
    ctx.fillStyle = isMe ? '#FFD43B' : 'rgba(255,255,255,.92)'; ctx.fill();
    txt(name, p.x, p.y + 16, 12, '#3A2E3F', 700);
  }

  let lastT = performance.now(), lastSent = 0, dirty = false, currentZone = null;
  function loop(tm) {
    const dt = Math.min(0.05, (tm - lastT) / 1000);
    lastT = tm;
    update(dt, tm);
    render(tm, dt);
    requestAnimationFrame(loop);
  }
  function update(dt, tm) {
    const me = meP();
    if (me) {
      let dx = 0, dy = 0;
      const k = state.keys;
      if (state.joy) { dx += state.joy.x; dy += state.joy.y; }
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
        let step = 240 * dt;
        if (state.target) step = Math.min(step, Math.hypot(state.target.x - me.x, state.target.y - me.y));
        me.x = clamp(me.x + (dx / len) * step, 20, WORLD.w - 20);
        me.y = clamp(me.y + (dy / len) * step, 40, WORLD.h - 10);
        me.walking = true; me.phase += dt * 13; dirty = true;
      } else me.walking = false;
      if (dirty && tm - lastSent > 110) { lastSent = tm; dirty = false; api('POST', '/api/move', { x: me.x, y: me.y }).catch(() => {}); }
      const z = zoneAt(me.x, me.y);
      if (z !== currentZone) {
        currentZone = z;
        const b = $('#zoneBtn');
        if (z) { b.textContent = t('zone.enter', { name: t(z.key) }); b.classList.remove('hidden'); b.onclick = () => openPanel(z.panel); }
        else b.classList.add('hidden');
      }
    }
    for (const p of state.players.values()) {
      if (p.id === state.meId) continue;
      const dx = p.tx - p.x, dy = p.ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 500) { p.x = p.tx; p.y = p.ty; p.walking = false; }
      else if (d > 1.5) { const step = Math.min(d, Math.max(240, d * 4) * dt); p.x += (dx / d) * step; p.y += (dy / d) * step; p.walking = true; p.phase += dt * 13; }
      else p.walking = false;
    }
  }
  function render(tm, dt = 0.016) {
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
    drawWorld(tm);
    if (state.target) {
      const k = (tm / 600) % 1;
      ctx.strokeStyle = `rgba(255,122,156,${1 - k})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.ellipse(state.target.x, state.target.y, 8 + k * 14, (8 + k * 14) * 0.4, 0, 0, Math.PI * 2); ctx.stroke();
    }
    const list = [...state.players.values()].sort((a, b) => a.y - b.y);
    for (const p of list) { Avatar.draw(ctx, p.avatar, p.x, p.y, { walking: p.walking, phase: p.phase, idle: tm / 1000 + p.seed }); drawTag(p, p.id === state.meId); }
    for (const p of list) { drawEmote(p, tm); drawBubble(p, tm); }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    Season.drawWeather(ctx, season(), view.w, view.h, dt, tm);
  }

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
    const hit = [...state.players.values()].sort((a, b) => b.y - a.y).find((p) => Math.abs(wx - p.x) < 26 && wy > p.y - 92 && wy < p.y + 26);
    if (hit) { if (hit.id === state.meId) openPanel('me'); else openPlayerCard(hit); return; }
    state.target = { x: clamp(wx, 20, WORLD.w - 20), y: clamp(wy, 40, WORLD.h - 10) };
  });

  // ============================================================ panels
  let currentPanel = null;
  const tabs = { games: 'quiz', rank: 'points', chat: 'all', me: 'room' };
  function openPanel(name) {
    if (currentPanel === name) { closePanel(); return; }
    stopGame(); stopPanelAnim();
    currentPanel = name;
    $('#panel').classList.remove('hidden');
    $('#panelTitle').textContent = t('title.' + name);
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.panel === name));
    renderPanel();
  }
  function closePanel() {
    stopGame(); stopPanelAnim();
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
      el('button', { class: tabs[group] === id ? 'on' : '', onclick: () => { stopGame(); stopPanelAnim(); tabs[group] = id; renderPanel(); } }, label)));
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
  const loading = () => el('div', { class: 'empty' }, t('loading'));
  const avatarImg = (av, size = 44) => el('img', { src: Avatar.thumb(av, size), alt: '' });

  // ---------- animated room canvas (panel or modal)
  let panelAnim = 0, modalAnim = 0;
  function stopPanelAnim() { cancelAnimationFrame(panelAnim); panelAnim = 0; }
  function animateRoom(canvas, getRoom, getAvatar, slot) {
    if (slot === 'panel') stopPanelAnim(); else cancelAnimationFrame(modalAnim);
    const frame = (tm) => {
      if (!canvas.isConnected) return;
      const { ctx: g, w, h } = prepCanvas(canvas, 360, 240);
      Room.draw(g, w, h, getRoom(), getAvatar(), tm);
      const id = requestAnimationFrame(frame);
      if (slot === 'panel') panelAnim = id; else modalAnim = id;
    };
    const id = requestAnimationFrame(frame);
    if (slot === 'panel') panelAnim = id; else modalAnim = id;
  }

  // ---------- chat panel
  const matchesChatFilter = (m) => (tabs.chat === 'dm' ? !!m.to : true);
  function msgEl(m) {
    if (m.system) return el('div', { class: 'msg sys' }, el('div', { class: 'bub' }, msgText(m), el('small', {}, fmtTime(m.at))));
    const mine = m.from === state.meId;
    const p = state.players.get(m.from);
    const label = m.to ? (mine ? t('chat.dmTo', { name: m.toName }) : t('chat.dmFrom', { name: m.name })) : m.name;
    const node = el('div', { class: 'msg' + (mine ? ' mine' : '') + (m.to ? ' dm' : '') },
      p ? avatarImg(p.avatar, 34) : el('img', { alt: '', src: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==' }),
      el('div', { class: 'bub' }, el('small', {}, `${label} · ${fmtTime(m.at)}`), m.text));
    if (!mine && p) node.querySelector('img').onclick = () => openPlayerCard(p);
    return node;
  }
  function renderChatPanel() {
    const shown = state.chat.filter(matchesChatFilter);
    return el('div', { class: 'chat-panel' },
      tabBar('chat', [['all', t('chat.all')], ['dm', t('chat.dm')]]),
      shown.length ? el('div', { class: 'msgs', id: 'msgList' }, shown.map(msgEl)) : el('div', { class: 'empty', id: 'msgList' }, t('chat.empty')),
      el('p', { class: 'muted', style: 'text-align:center' }, t('chat.hint')));
  }
  function scrollChat() { const b = $('#panelBody'); requestAnimationFrame(() => { b.scrollTop = b.scrollHeight; }); }

  // ---------- online panel
  function renderOnline() {
    const list = [...state.players.values()].sort((a, b) => (a.id === state.meId ? -1 : b.id === state.meId ? 1 : a.nickname.localeCompare(b.nickname)));
    return el('div', {},
      el('p', { class: 'muted' }, t('online.count', { n: list.length })),
      list.map((p) => el('button', { class: 'person' + (p.id === state.meId ? ' me' : ''), onclick: () => (p.id === state.meId ? openPanel('me') : openPlayerCard(p)) },
        avatarImg(p.avatar),
        el('div', { class: 'pinfo' }, el('b', {}, p.nickname + (p.id === state.meId ? t('online.you') : '')),
          el('span', {}, [p.room ? jobLabel(p.room.type) : '', p.status || (p.room ? '' : t('online.status'))].filter(Boolean).join(' · '))),
        el('div', { class: 'pts' }, `⭐ ${p.points || 0}`))));
  }

  // ---------- player card
  function openPlayerCard(p) {
    const c = el('canvas', { width: 160, height: 180, style: 'width:160px;height:180px' });
    const card = el('div', { class: 'player-card' },
      c,
      el('h3', {}, p.nickname),
      p.room ? el('div', { style: 'margin-top:2px' }, el('span', { class: 'tag p' }, jobLabel(p.room.type))) : null,
      el('div', { class: 'muted', style: 'margin-top:4px' }, p.status || t('online.status')),
      el('div', { style: 'margin-top:6px' }, el('span', { class: 'tag y' }, t('card.points', { n: p.points || 0 }))),
      el('div', { class: 'acts' },
        el('button', { class: 'btn yellow', onclick: async () => { try { await api('POST', '/api/poke', { to: p.id }); toast(t('card.waved', { name: p.nickname }), 'good'); } catch (e) { toast(e.message, 'bad'); } } }, t('card.wave')),
        el('button', { class: 'btn blue', onclick: () => { closeModal(); setDm(p); } }, t('card.dm')),
        el('button', { class: 'btn green', onclick: () => openRoomView(p) }, t('card.room')),
        el('button', { class: 'btn', onclick: () => { closeModal(); state.target = { x: p.x + 40, y: p.y }; } }, t('card.walk'))),
      el('button', { class: 'btn ghost small', style: 'margin-top:12px', onclick: closeModal }, t('close')));
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
    cancelAnimationFrame(modalAnim);
    $('#modal').classList.add('hidden');
  }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });

  // ---------- rooms
  function openRoomView(p) {
    const live = () => state.players.get(p.id) || p;
    const canvas = el('canvas', { class: 'room-canvas' });
    const r = live().room;
    const j = r && jobInfo(r.type);
    openModal(el('div', { class: 'room-view' },
      el('h3', {}, t('room.title', { name: p.nickname })),
      canvas,
      j ? el('div', { class: 'room-job' }, el('b', {}, jobLabel(r.type)), el('span', { class: 'muted' }, ' · ' + t('room.personality', { trait: j.trait })), el('div', { class: 'muted' }, j.desc))
        : el('p', { class: 'muted', style: 'text-align:center' }, t('room.emptyOther', { name: p.nickname })),
      el('div', { style: 'text-align:center;margin-top:10px' }, el('button', { class: 'btn', onclick: closeModal }, t('close')))));
    animateRoom(canvas, () => live().room, () => live().avatar, 'modal');
  }
  function openRoomWelcome() {
    if (!state.me || state.me.room) return;
    openModal(el('div', { class: 'room-view', style: 'text-align:center' },
      el('div', { style: 'font-size:48px' }, '🏡'),
      el('h3', {}, t('room.welcomeTitle')),
      el('p', { class: 'muted' }, t('room.welcomeBody')),
      el('div', { class: 'acts', style: 'display:flex;gap:8px;justify-content:center' },
        el('button', { class: 'btn ghost', onclick: closeModal }, t('room.later')),
        el('button', { class: 'btn primary', onclick: () => openRoomQuiz() }, t('room.go')))));
  }
  function openRoomQuiz() {
    const qs = t('room.questions');
    const answers = [];
    const show = (i) => {
      if (i >= qs.length) return showResult(Room.score(answers));
      const q = qs[i];
      openModal(el('div', { class: 'room-view' },
        el('div', { class: 'quiz-progress' }, qs.map((_, k) => el('i', { class: k <= i ? 'on' : '' }))),
        el('div', { class: 'muted' }, `${i + 1} / ${qs.length}`),
        el('h3', {}, q.q),
        el('div', { class: 'quiz-answers' }, q.a.map((a, k) => el('button', { class: 'btn', onclick: () => { answers[i] = k; show(i + 1); } }, a))),
        i > 0 ? el('button', { class: 'btn ghost small', style: 'margin-top:10px', onclick: () => show(i - 1) }, t('room.back')) : null), 'quiz');
    };
    const showResult = (type) => {
      const room = { type, wall: (state.me.room && state.me.room.wall) || 0 };
      openModal(roomEditor(room, t('room.result'), true), 'quiz');
    };
    show(0);
  }
  function roomEditor(room, heading, isResult) {
    const canvas = el('canvas', { class: 'room-canvas' });
    const info = el('div', { class: 'room-job' });
    const drawInfo = () => {
      const j = jobInfo(room.type);
      info.replaceChildren(el('b', { style: 'font-size:18px' }, jobLabel(room.type)), el('span', { class: 'muted' }, ' · ' + t('room.personality', { trait: j.trait })), el('div', { class: 'muted' }, j.desc));
    };
    drawInfo();
    const jobs = el('div', { class: 'cz-opts' }, Room.TYPES.map((ty) => {
      const b = el('button', { type: 'button', class: room.type === ty ? 'on' : '' }, jobLabel(ty));
      b.onclick = () => { room.type = ty; [...jobs.children].forEach((x) => x.classList.toggle('on', x === b)); drawInfo(); };
      return b;
    }));
    const walls = el('div', { class: 'cz-opts' }, Room.WALLS.map((c, i) => {
      const b = el('button', { type: 'button', class: 'sw' + (room.wall === i ? ' on' : ''), style: `background:${c}` });
      b.onclick = () => { room.wall = i; [...walls.children].forEach((x) => x.classList.toggle('on', x === b)); };
      return b;
    }));
    const wrap = el('div', { class: 'room-view' },
      heading ? el('h3', {}, heading) : null,
      canvas, info,
      el('h4', { class: 'cz-h' }, t('room.pick')), jobs,
      el('h4', { class: 'cz-h' }, t('room.wall')), walls,
      el('div', { style: 'display:flex;gap:8px;margin-top:12px;flex-wrap:wrap' },
        el('button', { class: 'btn primary', onclick: async () => {
          try {
            const r = await api('POST', '/api/room', room);
            state.me = r.user;
            const me = meP(); if (me) me.room = r.user.room;
            toast(t('room.saved'), 'good');
            if (isResult) closeModal(); else renderPanel();
          } catch (e) { toast(e.message, 'bad'); }
        } }, t('room.save')),
        el('button', { class: 'btn ghost', onclick: () => openRoomQuiz() }, t('room.retake'))));
    animateRoom(canvas, () => room, () => state.me.avatar, isResult ? 'modal' : 'panel');
    return wrap;
  }

  // ---------- games
  function renderGames(c) {
    const wrap = el('div', {}, tabBar('games', [['quiz', t('games.quiz')], ['riddle', t('games.riddle')], ['mini', t('games.mini')], ['lp', t('games.lp')]]));
    const tb = tabs.games;
    if (tb === 'quiz') {
      wrap.append(el('p', { class: 'muted' }, t('quiz.intro', { done: c.quiz.filter((q) => q.result).length, total: c.quiz.length })));
      if (!c.quiz.length) wrap.append(el('div', { class: 'empty' }, t('quiz.none')));
      for (const q of c.quiz) wrap.append(quizCard(q));
    } else if (tb === 'riddle') {
      wrap.append(el('p', { class: 'muted' }, t('riddle.intro')));
      if (!c.riddles.length) wrap.append(el('div', { class: 'empty' }, t('riddle.none')));
      for (const r of c.riddles) wrap.append(riddleCard(r));
    } else if (tb === 'mini') wrap.append(renderMini(c));
    else wrap.append(renderLP(c));
    return wrap;
  }
  function quizCard(q) {
    const card = el('div', { class: 'card' });
    const draw = () => {
      card.replaceChildren(
        el('div', { class: 'card-top' }, el('h3', {}, q.question),
          q.result ? el('span', { class: 'tag ' + (q.result === 'correct' ? 'g' : 'r') }, q.result === 'correct' ? t('quiz.right') : t('quiz.wrong')) : el('span', { class: 'tag y' }, `+${q.points}`)),
        el('div', { class: 'opts' }, q.options.map((o, i) => {
          const b = el('button', { disabled: !!q.result }, `${'ABCD'[i]}. ${o}`);
          if (q.result && i === q.answer) b.classList.add('right');
          if (q.picked === i && q.result === 'wrong') b.classList.add('wrong');
          b.onclick = async () => {
            card.querySelectorAll('button').forEach((x) => { x.disabled = true; });
            try {
              const r = await api('POST', '/api/quiz/answer', { id: q.id, choice: i });
              q.result = r.correct ? 'correct' : 'wrong'; q.answer = r.answer; q.picked = i;
              toast(r.correct ? t('quiz.toastRight', { n: q.points }) : t('quiz.toastWrong'), r.correct ? 'good' : 'bad');
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
    const input = el('input', { class: 'inp', placeholder: t('riddle.ph'), maxLength: 50 });
    const hint = el('div', { class: 'muted hidden', style: 'margin-top:6px' }, '💡 ' + (r.hint || t('riddle.noHint')));
    const submit = async () => {
      if (!input.value.trim()) return;
      try {
        const res = await api('POST', '/api/riddle/answer', { id: r.id, guess: input.value });
        if (res.correct) { r.solved = true; toast(t('riddle.toastRight', { n: r.points }), 'good'); card.replaceWith(riddleCard(r)); }
        else { toast(t('riddle.toastWrong'), 'bad'); input.select(); }
      } catch (e) { toast(e.message, 'bad'); }
    };
    input.onkeydown = (e) => { if (e.key === 'Enter' && !e.isComposing) submit(); };
    card.append(
      el('div', { class: 'card-top' }, el('h3', {}, r.question), r.solved ? el('span', { class: 'tag g' }, t('riddle.solved')) : el('span', { class: 'tag y' }, `+${r.points}`)),
      r.solved ? null : el('div', { class: 'row' }, input, el('button', { class: 'btn primary', onclick: submit }, t('riddle.go')),
        el('button', { class: 'btn ghost', onclick: () => hint.classList.toggle('hidden') }, '💡')),
      r.solved ? null : hint);
    return card;
  }
  function renderLP(c) {
    const wrap = el('div', {}, el('p', { class: 'muted' }, t('lp.intro')));
    if (!c.challenges.length) wrap.append(el('div', { class: 'empty' }, t('lp.none')));
    for (const ch of c.challenges) {
      const subs = c.mySubmissions.filter((s) => s.challengeId === ch.id);
      const active = subs.find((s) => s.status !== 'rejected');
      const rejected = subs.some((s) => s.status === 'rejected');
      const ta = el('textarea', { class: 'inp', rows: 2, maxLength: 600, placeholder: t('lp.ph') });
      const status = active ? (active.status === 'approved' ? el('span', { class: 'tag g' }, t('lp.done')) : el('span', { class: 'tag p' }, t('lp.pending'))) : el('span', { class: 'tag y' }, `+${ch.points}`);
      wrap.append(el('div', { class: 'card' },
        el('div', { class: 'card-top' }, el('h3', {}, '🏅 ' + ch.title), status),
        el('div', { class: 'muted', style: 'white-space:pre-wrap' }, ch.description),
        active ? el('div', { class: 'record' }, t('lp.yours') + active.text)
          : el('div', { style: 'margin-top:8px' },
            rejected ? el('div', { class: 'tag r', style: 'margin-bottom:6px' }, t('lp.rejected')) : null,
            ta,
            el('button', { class: 'btn primary small', style: 'margin-top:6px', onclick: async () => {
              if (!ta.value.trim()) return toast(t('lp.need'), 'bad');
              try { await api('POST', '/api/challenge/submit', { id: ch.id, text: ta.value }); toast(t('lp.sent'), 'good'); loadContent(); }
              catch (e) { toast(e.message, 'bad'); }
            } }, t('lp.submit')))));
    }
    return wrap;
  }

  // ---------- mini game
  let gameRunning = false, gameStop = null;
  function stopGame() { if (gameStop) gameStop(); gameStop = null; gameRunning = false; }
  function renderMini(c) {
    const canvas = el('canvas', { id: 'gameCanvas' });
    const best = el('b', {}, c.myBest || 0);
    const btn = el('button', { class: 'btn primary big' }, t('mini.start'));
    const box = el('div', { class: 'game-box' },
      el('div', { class: 'muted', style: 'text-align:center' }, t('mini.intro')), canvas, el('div', {}, t('mini.best'), best, ' ⭐'), btn);
    requestAnimationFrame(() => drawGameIdle(canvas));
    btn.onclick = () => {
      btn.disabled = true;
      gameRunning = true;
      gameStop = starCatch(canvas, async (score) => {
        gameRunning = false; gameStop = null;
        btn.disabled = false; btn.textContent = t('mini.again');
        try {
          const r = await api('POST', '/api/minigame/score', { score });
          best.textContent = r.best; c.myBest = r.best;
          toast(r.newBest ? t('mini.newBest', { n: score }) : t('mini.result', { n: score, best: r.best }), r.newBest ? 'good' : 'info');
        } catch (e) { toast(e.message, 'bad'); }
      });
    };
    return box;
  }
  function drawGameIdle(canvas) {
    const { ctx: g, w, h } = prepCanvas(canvas, 340, 420);
    g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText(t('mini.title'), w / 2, h / 2 - 30);
    g.font = `600 15px ${FONT}`; g.fillStyle = '#C8D2FF';
    g.fillText(t('mini.how'), w / 2, h / 2 + 6);
    if (state.me) Avatar.draw(g, state.me.avatar, w / 2, h - 14, { scale: 0.85 });
  }
  function starCatch(canvas, onEnd) {
    const DUR = 30;
    let px = 170, score = 0, items = [], fx = [], running = true, spawn = 0, raf = 0;
    const t0 = performance.now();
    let last = t0;
    const keys = {};
    const move = (e) => { const r = canvas.getBoundingClientRect(); px = clamp(e.clientX - r.left, 20, r.width - 20); };
    const kd = (e) => { if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) { keys[e.key] = true; e.preventDefault(); } };
    const ku = (e) => { keys[e.key] = false; };
    canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerdown', move);
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    const cleanup = () => {
      running = false; cancelAnimationFrame(raf);
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerdown', move);
      window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku);
    };
    const frame = (tm) => {
      if (!running) return;
      const dt = Math.min(0.05, (tm - last) / 1000); last = tm;
      const el2 = (tm - t0) / 1000;
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
          fx.push({ x: it.x, y: it.y, s: (d > 0 ? '+' : '') + d, t: tm, c: d > 0 ? '#FFE066' : '#FF7A7A' });
          return false;
        }
        return it.y < h + 30;
      });
      for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + 0.3 * Math.sin(tm / 300 + i)})`; g.fillRect((i * 73) % w, (i * 131) % (h - 80), 2, 2); }
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '28px sans-serif';
      for (const it of items) g.fillText(it.k === 'star' ? '⭐' : it.k === 'gold' ? '🌟' : '💣', it.x, it.y);
      if (state.me) Avatar.draw(g, state.me.avatar, px, h - 8, { scale: 0.58, walking: keys.ArrowLeft || keys.ArrowRight, phase: tm / 80 });
      g.font = '34px sans-serif'; g.fillText('🧺', px, h - 66);
      fx = fx.filter((f) => tm - f.t < 700);
      for (const f of fx) { g.globalAlpha = 1 - (tm - f.t) / 700; g.font = `800 20px ${FONT}`; g.fillStyle = f.c; g.fillText(f.s, f.x, f.y - (tm - f.t) / 20); }
      g.globalAlpha = 1;
      g.font = `800 20px ${FONT}`; g.fillStyle = '#fff'; g.textAlign = 'left'; g.fillText(`⭐ ${score}`, 12, 22);
      g.textAlign = 'right'; g.fillText(`⏱ ${Math.max(0, Math.ceil(DUR - el2))}s`, w - 12, 22);
      if (el2 >= DUR) {
        cleanup();
        g.fillStyle = 'rgba(20,15,50,.6)'; g.fillRect(0, 0, w, h);
        g.textAlign = 'center'; g.fillStyle = '#fff'; g.font = `800 30px ${FONT}`;
        g.fillText(t('mini.timeUp'), w / 2, h / 2 - 20); g.fillText(`${score} ⭐`, w / 2, h / 2 + 20);
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
    const wrap = el('div', {}, tabBar('rank', [['points', t('rank.points')], ['mini', t('rank.mini')]]));
    const list = tabs.rank === 'points' ? c.leaderboard : c.minigame;
    if (!list.length) { wrap.append(el('div', { class: 'empty' }, t('rank.empty'))); return wrap; }
    list.forEach((u, i) => {
      const p = state.players.get(u.id);
      wrap.append(el('button', { class: 'person' + (u.id === state.meId ? ' me' : ''), onclick: () => { if (p && p.id !== state.meId) openPlayerCard(p); } },
        el('div', { class: 'rank-n' }, ['🥇', '🥈', '🥉'][i] || i + 1),
        avatarImg(u.avatar),
        el('div', { class: 'pinfo' }, el('b', {}, u.nickname), el('span', {}, p ? t('rank.online') : t('rank.offline'))),
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
      wrap.append(el('div', { class: 'card', style: 'background:#FFF3C4' }, el('b', {}, t('hq.news')),
        state.announcements.slice(-3).reverse().map((a) => el('div', { style: 'margin-top:4px' }, a.text, ' ', el('span', { class: 'muted' }, fmtDate(a.createdAt, { month: 'short', day: 'numeric' }))))));
    }
    wrap.append(el('div', { class: 'section-t' }, t('hq.upcoming', { n: upcoming.length })));
    if (!upcoming.length) wrap.append(el('div', { class: 'empty' }, t('hq.none')));
    for (const e of upcoming) wrap.append(eventCard(e, c, mine, false));
    if (past.length) {
      wrap.append(el('div', { class: 'section-t' }, t('hq.past', { n: past.length })));
      for (const e of past) wrap.append(eventCard(e, c, mine, true));
    }
    if ('Notification' in window && Notification.permission === 'default') wrap.append(el('button', { class: 'btn ghost small', onclick: askNotify }, t('hq.notify')));
    return wrap;
  }
  function eventCard(e, c, mine, isPast) {
    const d = new Date(e.date);
    const going = mine.has(e.id);
    const start = Date.parse(e.date);
    const hasAddr = e.address && !/^[（(]/.test(e.address);
    const L = I18N.locale();
    return el('div', { class: 'card event', style: isPast ? 'opacity:.92' : '' },
      el('div', { class: 'date-badge' },
        el('div', { class: 'm' }, d.toLocaleDateString(L, { month: 'short' })),
        el('div', { class: 'd' }, d.getDate()),
        el('div', { class: 'w' }, d.toLocaleDateString(L, { weekday: 'short' }))),
      el('div', { class: 'info' },
        el('h3', {}, e.title),
        !isPast ? el('div', { class: 'countdown' }, start > Date.now() ? '⏳ ' + relTime(start - Date.now()) : t('event.live')) : null,
        el('div', { class: 'meta' }, '🕒 ' + fmtDate(e.date) + (e.endDate ? ' – ' + fmtDate(e.endDate, { hour: '2-digit', minute: '2-digit' }) : '')),
        e.venue ? el('div', { class: 'meta' }, '📍 ' + e.venue) : null,
        e.address ? el('div', { class: 'meta' }, '🏠 ' + e.address) : null,
        e.content ? el('div', { class: 'content' }, e.content) : null,
        isPast && e.record ? el('div', { class: 'record' }, el('b', {}, t('event.record')), el('br'), e.record) : null,
        el('div', { class: 'meta' }, t('event.going', { n: c.rsvpCounts[e.id] || 0 })),
        !isPast ? el('div', { class: 'actions' },
          el('button', { class: 'btn small ' + (going ? 'green' : 'primary'), onclick: async () => {
            try {
              const r = await api('POST', '/api/event/rsvp', { id: e.id });
              toast(r.going ? t('event.toastOn') : t('event.toastOff'), r.going ? 'good' : '');
              if (r.going && 'Notification' in window && Notification.permission === 'default') askNotify();
              loadContent();
            } catch (err) { toast(err.message, 'bad'); }
          } }, going ? t('event.rsvpOn') : t('event.rsvp')),
          el('button', { class: 'btn small', onclick: () => downloadIcs(e) }, t('event.ics')),
          hasAddr ? el('a', { class: 'btn small', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.address), target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, t('event.map')) : null) : null));
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
    Notification.requestPermission().then((p) => { if (p === 'granted') toast(t('notify.on'), 'good'); if (currentPanel === 'hq') renderPanel(); });
  }
  function notify(text) {
    try { if ('Notification' in window && Notification.permission === 'granted' && document.hidden) new Notification(t('app.name'), { body: text }); } catch {}
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
      bar.textContent = t('remind.bar', { title: e.title, rel: relTime(Date.parse(e.date) - now), venue: e.venue || '' });
      bar.classList.remove('hidden');
      bar.onclick = () => { bar.classList.add('hidden'); openPanel('hq'); };
    } else bar.classList.add('hidden');
    for (const e of c.events) {
      if (!mine.has(e.id)) continue;
      const at = Date.parse(e.date) - 3600000 - now;
      if (at > 0 && at < 86400000) reminderTimers.push(setTimeout(() => { const s = t('remind.hour', { title: e.title }); toast(s, 'info', 9000); notify(s); }, at));
    }
    const week = c.events.filter((e) => Date.parse(e.date) > now && Date.parse(e.date) - now < 7 * 86400000).length;
    const badge = $('#hqBadge');
    badge.textContent = week;
    badge.classList.toggle('hidden', !week);
  }

  // ---------- me (room / look / account)
  function renderMe() {
    const me = state.me;
    const wrap = el('div', {}, tabBar('me', [['room', t('me.tabRoom')], ['look', t('me.tabLook')], ['account', t('me.tabAccount')]]));
    if (tabs.me === 'room') {
      if (!me.room) {
        const canvas = el('canvas', { class: 'room-canvas' });
        wrap.append(el('div', { class: 'room-view' }, canvas, el('p', { class: 'muted', style: 'text-align:center' }, t('room.empty')),
          el('button', { class: 'btn primary big', onclick: () => openRoomQuiz() }, t('room.quizStart'))));
        animateRoom(canvas, () => null, () => state.me.avatar, 'panel');
      } else wrap.append(roomEditor({ ...me.room }, null, false));
    } else if (tabs.me === 'look') {
      const av = { ...me.avatar };
      const c = el('canvas', { width: 120, height: 132, style: 'width:120px;height:132px' });
      const redraw = () => drawPreview(c, av, 120, 132);
      const nick = el('input', { class: 'inp', value: me.nickname, maxLength: 16 });
      const status = el('input', { class: 'inp', value: me.status || '', maxLength: 40, placeholder: t('me.statusPh') });
      const cz = el('div', { class: 'customizer', style: 'max-height:none' });
      buildCustomizer(cz, av, redraw);
      wrap.append(
        el('div', { class: 'card me-preview' }, c,
          el('div', { style: 'flex:1;min-width:0' }, el('label', { class: 'muted' }, t('me.nick')), nick,
            el('label', { class: 'muted', style: 'display:block;margin-top:6px' }, t('me.status')), status)),
        el('div', { class: 'card' }, cz),
        el('button', { class: 'btn primary big', onclick: async () => {
          try { const r = await api('POST', '/api/profile', { nickname: nick.value, status: status.value, avatar: av }); state.me = r.user; updateHud(); toast(t('me.saved'), 'good'); }
          catch (e) { toast(e.message, 'bad'); }
        } }, t('me.save')));
      requestAnimationFrame(redraw);
    } else {
      const code = el('div', { class: 'code-box', title: t('me.reveal') }, me.code);
      code.onclick = () => code.classList.toggle('show');
      wrap.append(
        installCard(),
        el('div', { class: 'card' }, el('h3', {}, t('music.title')),
          el('div', { class: 'cz-opts' }, [[true, t('music.onLabel')], [false, t('music.offLabel')]].map(([v, label]) => el('button', { class: musicOn === v ? 'on' : '', onclick: () => { musicOn = v; store.set('lp258_music', v ? '1' : '0'); updateSeasonUi(); syncMusic(); renderPanel(); } }, label))),
          el('p', { class: 'muted', style: 'margin:6px 0 0' }, Season.ICON[season()] + ' ' + t('season.info', { name: t('season.' + season()) }))),
        el('div', { class: 'card' }, el('h3', {}, t('me.lang')),
          el('div', { class: 'cz-opts' }, ['zh', 'en'].map((l) => el('button', { class: I18N.lang === l ? 'on' : '', onclick: () => { if (I18N.lang !== l) I18N.setLang(l); } }, t('lang.' + l))))),
        el('div', { class: 'card' },
          el('h3', {}, t('me.code')),
          el('p', { class: 'muted', style: 'margin:0 0 6px' }, t('me.codeHint')),
          code,
          el('button', { class: 'btn small', style: 'margin-top:8px', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(me.code).then(() => toast(t('me.copied'), 'good')); } }, t('me.copy'))),
        el('button', { class: 'btn ghost small', onclick: () => { if (confirm(t('me.logoutConfirm'))) logout(); } }, t('me.logout')));
    }
    return wrap;
  }

  // ---------- live quiz
  let liveTimer = null;
  function openLive(d) {
    state.live = { ...d };
    const L = state.live;
    const bar = el('div', {});
    const status = el('div', { class: 'muted', style: 'margin-top:8px;text-align:center' }, d.answered ? t('live.answered') : t('live.points', { n: d.points }));
    const opts = el('div', { class: 'opts' }, d.options.map((o, i) => {
      const b = el('button', { disabled: !!d.answered }, `${'ABCD'[i]}. ${o}`);
      b.onclick = async () => {
        opts.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        b.style.borderColor = 'var(--blue)';
        try { await api('POST', '/api/live/answer', { choice: i }); L.answered = true; L.picked = i; status.textContent = t('live.answered'); }
        catch (e) { toast(e.message, 'bad'); }
      };
      return b;
    }));
    openModal(el('div', { class: 'live-card' },
      el('div', { class: 'tag p' }, t('live.tag')), el('h3', {}, d.question),
      el('div', { class: 'live-timer' }, bar), opts, status,
      el('div', { class: 'muted', style: 'text-align:center;margin-top:4px', id: 'liveCount' }, t('live.count', { n: d.count || 0 }))), 'live');
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
    openModal(el('div', { class: 'live-card' },
      el('div', { class: 'tag p' }, t('live.result')), el('h3', {}, r.question),
      el('div', { class: 'opts' }, r.options.map((o, i) => el('button', { disabled: true, class: i === r.answer ? 'right' : i === picked ? 'wrong' : '' }, `${'ABCD'[i]}. ${o}`))),
      el('p', { style: 'text-align:center;font-weight:800' }, picked == null ? t('live.none') : picked === r.answer ? t('live.right') : t('live.wrong')),
      el('p', { class: 'muted', style: 'text-align:center' }, t('live.stats', { c: r.correctCount, t: r.total })),
      r.winners.length ? el('p', { style: 'text-align:center' }, '🏅 ' + r.winners.slice(0, 5).join(I18N.lang === 'zh' ? '、' : ', ')) : null,
      el('div', { style: 'text-align:center' }, el('button', { class: 'btn primary', onclick: closeModal }, t('ok')))), 'live');
  }

  // ============================================================ phone: joystick, music, install
  (function joystick() {
    const joy = $('#joy'), knob = joy && joy.querySelector('.knob');
    if (!joy) return;
    let id = null;
    const setFrom = (e) => {
      const r = joy.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, max = r.width / 2 - 18;
      let dx = e.clientX - cx, dy = e.clientY - cy;
      const d = Math.hypot(dx, dy);
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      state.joy = d < 8 ? null : { x: dx / max, y: dy / max };
      state.target = null;
    };
    const end = () => { id = null; state.joy = null; knob.style.transform = ''; };
    joy.addEventListener('pointerdown', (e) => { id = e.pointerId; try { joy.setPointerCapture(id); } catch {} setFrom(e); e.preventDefault(); });
    joy.addEventListener('pointermove', (e) => { if (e.pointerId === id) setFrom(e); });
    joy.addEventListener('pointerup', end); joy.addEventListener('pointercancel', end);
  })();
  $('#musicBtn').onclick = () => { musicOn = !musicOn; store.set('lp258_music', musicOn ? '1' : '0'); updateSeasonUi(); syncMusic(); toast(musicOn ? t('music.playing', { name: t('season.' + season()) }) : t('music.muted'), 'info', 2000); };
  $('#seasonPill').onclick = () => toast(Season.ICON[season()] + ' ' + t('season.info', { name: t('season.' + season()) }), 'info', 4000);

  let installPrompt = null;
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); installPrompt = e; });
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);
  function installCard() {
    let body;
    if (isStandalone()) body = el('p', { class: 'muted', style: 'margin:0' }, t('install.done'));
    else if (installPrompt) body = el('button', { class: 'btn primary', onclick: async () => { installPrompt.prompt(); const r = await installPrompt.userChoice; if (r.outcome === 'accepted') toast(t('install.thanks'), 'good'); installPrompt = null; renderPanel(); } }, t('install.btn'));
    else body = el('p', { class: 'muted', style: 'margin:0;white-space:pre-line' }, isIOS() ? t('install.ios') : t('install.other'));
    return el('div', { class: 'card' }, el('h3', {}, t('install.title')), body);
  }
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}));

  // ============================================================ boot
  (async function boot() {
    if (state.token) {
      try { const r = await api('GET', '/api/me'); state.me = r.user; enterTown(); return; }
      catch (e) {
        if (e.status === 401 || e.status === 403) { store.del('lp258_token'); state.token = null; if (e.status === 403) alert(e.message); }
        else toast(t('err.offline'), 'bad');
      }
    }
    showJoin();
  })();
})();
