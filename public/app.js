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
    if (!r.ok) { const e = new Error(data && data.error ? errText(data.error, data.params) : t('err.network', { code: r.status })); e.status = r.status; e.key = data && data.error; throw e; }
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
    if (p.game) p.game = t('game.' + p.game);
    if (p.result) p.result = t('pk.res.' + p.result);
    if (p.date) p.date = fmtDate(p.date);
    if (p.fee !== undefined) p.cur = cur();
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
  Avatar.season = Season.fromDate();

  // ---------- music (starts on first tap, because browsers block autoplay)
  let musicOn = store.get('lp258_music') !== '0';
  function updateSeasonUi() {
    Avatar.season = season();
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
    setTimeout(() => $(joinMode === 'login' ? '#loginName' : '#joinName').focus(), 50);
  }
  let joinMode = 'new';
  function setJoinMode(m) {
    joinMode = m;
    $('#newForm').classList.toggle('hidden', m !== 'new');
    $('#loginForm').classList.toggle('hidden', m !== 'login');
    $('#tabNew').classList.toggle('on', m === 'new');
    $('#tabLogin').classList.toggle('on', m === 'login');
    $('#joinErr').textContent = '';
    setTimeout(() => $(m === 'login' ? '#loginName' : '#joinName').focus(), 30);
  }
  $('#tabNew').onclick = () => setJoinMode('new');
  $('#tabLogin').onclick = () => setJoinMode('login');
  const recQText = (q) => (typeof q === 'number' ? (t('rec.questions')[q] || '') : String(q || ''));
  function fillQuestionSelect(sel, custom) {
    sel.replaceChildren(...t('rec.questions').map((q, i) => el('option', { value: String(i) }, q)), el('option', { value: 'custom' }, t('rec.customOption')));
    sel.onchange = () => { custom.classList.toggle('hidden', sel.value !== 'custom'); if (sel.value === 'custom') custom.focus(); };
  }
  const readQuestion = (sel, custom) => (sel.value === 'custom' ? custom.value.trim() : Number(sel.value));
  fillQuestionSelect($('#joinRecQ'), $('#joinRecCustom'));
  const digitsOnly = (inp) => { inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(0, 4); }); };
  digitsOnly($('#joinPin')); digitsOnly($('#loginPin')); digitsOnly($('#recNewPin'));
  function signedIn(r) {
    state.token = r.token;
    store.set('lp258_token', r.token); // remembered on this phone/browser, so no need to sign in again
    state.me = r.user;
    enterTown();
  }
  $('#joinRandom').onclick = () => { Object.assign(joinAv, Avatar.random()); showJoin(); };
  async function doJoin() {
    const nickname = $('#joinName').value.trim();
    const pin = $('#joinPin').value.trim();
    $('#joinErr').textContent = '';
    if (!nickname) { $('#joinErr').textContent = t('join.needNick'); return; }
    if (!/^\d{4}$/.test(pin)) { $('#joinErr').textContent = t('err.pin_format'); $('#joinPin').focus(); return; }
    const recQ = readQuestion($('#joinRecQ'), $('#joinRecCustom'));
    const recA = $('#joinRecA').value.trim();
    if (recQ === '') { $('#joinErr').textContent = t('err.rec_q_required'); $('#joinRecCustom').focus(); return; }
    if (recA.length < 2) { $('#joinErr').textContent = t('err.rec_a_short'); $('#joinRecA').focus(); return; }
    $('#joinBtn').disabled = true;
    try {
      const r = await api('POST', '/api/join', { nickname, avatar: joinAv, pin, recQ, recA });
      signedIn(r);
      toast(t('join.welcome'), 'good', 5000);
      setTimeout(openRoomWelcome, 900);
    } catch (e) {
      if (e.key === 'nick_taken') { // probably their own account on a new phone
        setJoinMode('login');
        $('#loginName').value = nickname;
        $('#joinErr').textContent = t('join.nickTakenLogin');
        $('#loginPin').focus();
      } else $('#joinErr').textContent = e.message;
    }
    $('#joinBtn').disabled = false;
  }
  async function doLogin() {
    const nickname = $('#loginName').value.trim();
    const pin = $('#loginPin').value.trim();
    $('#joinErr').textContent = '';
    if (!nickname) { $('#joinErr').textContent = t('join.needNick'); return; }
    if (!/^\d{4}$/.test(pin)) { $('#joinErr').textContent = t('err.pin_format'); return; }
    $('#loginBtn').disabled = true;
    try {
      const r = await api('POST', '/api/login', { nickname, pin });
      signedIn(r);
      if (r.firstLogin) {
        toast(t('join.firstWelcome', { name: r.user.nickname }), 'good', 7000);
        setTimeout(() => { tabs.me = 'look'; openPanel('me'); }, 700);
      } else toast(t('join.welcomeBack', { name: r.user.nickname }), 'good');
    }
    catch (e) { $('#joinErr').textContent = e.message; $('#loginPin').select(); }
    $('#loginBtn').disabled = false;
  }
  $('#loginBtn').onclick = doLogin;
  const showHostBox = () => { $('#recoverBox').classList.add('hidden'); $('#hostBox').classList.remove('hidden'); $('#forgotContact').focus(); };
  $('#forgotBtn').onclick = async () => {
    const nickname = $('#loginName').value.trim();
    $('#joinErr').textContent = '';
    if (!nickname) { $('#joinErr').textContent = t('join.forgotNeedNick'); $('#loginName').focus(); return; }
    try {
      const r = await api('POST', '/api/pin/question', { nickname });
      $('#forgotForm').classList.remove('hidden');
      if (r.hasQuestion) {
        $('#hostBox').classList.add('hidden');
        $('#recoverBox').classList.remove('hidden');
        $('#recQText').textContent = '❓ ' + recQText(r.q);
        $('#recAnswer').value = ''; $('#recNewPin').value = '';
        $('#recAnswer').focus();
      } else { showHostBox(); $('#joinErr').textContent = t('rec.noQuestion'); }
    } catch (e) { $('#joinErr').textContent = e.message; }
  };
  $('#recAskHost').onclick = showHostBox;
  $('#recSubmit').onclick = async () => {
    const nickname = $('#loginName').value.trim(), answer = $('#recAnswer').value.trim(), pin = $('#recNewPin').value.trim();
    $('#joinErr').textContent = '';
    if (!answer) { $('#joinErr').textContent = t('err.rec_a_short'); $('#recAnswer').focus(); return; }
    if (!/^\d{4}$/.test(pin)) { $('#joinErr').textContent = t('err.pin_format'); $('#recNewPin').focus(); return; }
    try {
      const r = await api('POST', '/api/pin/recover', { nickname, answer, pin });
      signedIn(r);
      toast(t('rec.done', { name: r.user.nickname }), 'good', 6000);
    } catch (e) { $('#joinErr').textContent = e.message; $('#recAnswer').select(); }
  };
  $('#forgotSend').onclick = async () => {
    const nickname = $('#loginName').value.trim();
    $('#joinErr').textContent = '';
    if (!nickname) { $('#joinErr').textContent = t('join.forgotNeedNick'); $('#loginName').focus(); return; }
    try {
      await api('POST', '/api/pin/forgot', { nickname, contact: $('#forgotContact').value.trim() });
      $('#forgotForm').classList.add('hidden');
      toast(t('join.forgotSent'), 'good', 7000);
      $('#joinErr').textContent = '';
    } catch (e) { $('#joinErr').textContent = e.message; }
  };
  $('#loginPin').onkeydown = (e) => { if (e.key === 'Enter') doLogin(); };
  $('#joinPin').onkeydown = (e) => { if (e.key === 'Enter') doJoin(); };
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
    if (reason) { toast(reason, 'bad', 4000); setTimeout(() => location.reload(), 2500); } else location.reload();
  }
  function askConfirm(text) {
    return new Promise((resolve) => {
      const ov = el('div', { class: 'modal dlg' });
      const done = (v) => { ov.remove(); resolve(v); };
      ov.append(el('div', { class: 'modal-card dlg-card' }, el('p', { class: 'dlg-text' }, text),
        el('div', { class: 'dlg-acts' }, el('button', { class: 'btn ghost', onclick: () => done(false) }, t('dlg.cancel')), el('button', { class: 'btn primary', onclick: () => done(true) }, t('dlg.ok')))));
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) done(false); });
      document.body.append(ov);
    });
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
    if (state.me && !state.me.hasPin) setTimeout(() => openPinSetup(true), 1200);
    else if (state.me && !state.me.hasRecovery) setTimeout(() => openRecoverySetup(true), 1500);
    else setTimeout(pushBoot, 2500);
  }
  function openRecoverySetup(first) {
    const sel = el('select', { class: 'inp' });
    const custom = el('input', { class: 'inp hidden', maxLength: 60, placeholder: t('rec.customPh') });
    fillQuestionSelect(sel, custom);
    if (state.me.recoveryQ !== null && state.me.recoveryQ !== undefined) {
      if (typeof state.me.recoveryQ === 'number') sel.value = String(state.me.recoveryQ);
      else { sel.value = 'custom'; custom.value = state.me.recoveryQ; custom.classList.remove('hidden'); }
    }
    const ans = el('input', { class: 'inp', maxLength: 60, placeholder: t('rec.answerPh'), autocomplete: 'off' });
    const err = el('p', { class: 'err' });
    openModal(el('div', { class: 'room-view' },
      el('div', { style: 'font-size:42px;text-align:center' }, '🛟'),
      el('h3', { style: 'text-align:center' }, t('rec.setTitle')),
      el('p', { class: 'muted', style: 'text-align:center' }, t('rec.setBody')),
      el('label', { class: 'field' }, el('span', {}, t('rec.qLabel')), sel), custom,
      el('label', { class: 'field' }, el('span', {}, t('rec.aLabel')), ans),
      err,
      el('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap' },
        el('button', { class: 'btn ghost', onclick: closeModal }, first ? t('room.later') : t('dlg.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          const q = readQuestion(sel, custom);
          if (q === '') { err.textContent = t('err.rec_q_required'); return; }
          if (ans.value.trim().length < 2) { err.textContent = t('err.rec_a_short'); return; }
          try { const r = await api('POST', '/api/recovery', { q, a: ans.value }); state.me = r.user; closeModal(); toast(t('rec.saved'), 'good', 5000); if (currentPanel === 'me') renderPanel(); }
          catch (e) { err.textContent = e.message; }
        } }, t('rec.save')))));
  }
  function openPinSetup(first) {
    const p1 = el('input', { class: 'inp pin-input', type: 'password', inputmode: 'numeric', maxLength: 4, placeholder: '••••', autocomplete: 'new-password' });
    const p2 = el('input', { class: 'inp pin-input', type: 'password', inputmode: 'numeric', maxLength: 4, placeholder: '••••', autocomplete: 'new-password' });
    const old = null;
    [p1, p2, old].filter(Boolean).forEach(digitsOnly);
    const err = el('p', { class: 'err' });
    openModal(el('div', { class: 'room-view' },
      el('div', { style: 'font-size:42px;text-align:center' }, '🔢'),
      el('h3', { style: 'text-align:center' }, first ? t('pin.setTitle') : t('pin.changeTitle')),
      el('p', { class: 'muted', style: 'text-align:center' }, first ? t('pin.setBody', { name: state.me.nickname }) : t('pin.changeBody2')),
      old ? el('label', { class: 'field' }, el('span', {}, t('pin.current')), old) : null,
      el('label', { class: 'field' }, el('span', {}, t('pin.new')), p1),
      el('label', { class: 'field' }, el('span', {}, t('pin.again')), p2),
      err,
      el('div', { style: 'display:flex;gap:8px;justify-content:center;flex-wrap:wrap' },
        el('button', { class: 'btn ghost', onclick: closeModal }, first ? t('room.later') : t('dlg.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          if (!/^\d{4}$/.test(p1.value)) { err.textContent = t('err.pin_format'); return; }
          if (p1.value !== p2.value) { err.textContent = t('pin.mismatch'); return; }
          try {
            const r = await api('POST', '/api/pin', { pin: p1.value, oldPin: old ? old.value : undefined });
            state.me = r.user; closeModal(); toast(t('pin.saved'), 'good', 5000);
            if (currentPanel === 'me') renderPanel();
            if (!state.me.hasRecovery) setTimeout(() => openRecoverySetup(true), 400);
          } catch (e) { err.textContent = e.message; }
        } }, t('pin.save')))));
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
    on('moves', (list) => {
      const tm = performance.now();
      for (const [id, x, y] of list) {
        if (id === state.meId) continue;
        const p = state.players.get(id);
        if (!p) continue;
        const gap = clamp(tm - (p.lastUpd || tm - 120), 60, 400) / 1000;
        p.lastUpd = tm;
        p.speed = clamp(Math.hypot(x - p.x, y - p.y) / gap, 60, 900);
        p.tx = x; p.ty = y;
      }
    });
    on('chat', addChat);
    on('pkLiveInvite', onLiveInvite);
    on('pkLiveStart', onLiveStart);
    on('pkLiveScore', (d) => {
      const L = liveRoom;
      if (!L || L.room.id !== d.id) return;
      const up = d.score - L.opp;
      L.opp = d.score;
      if (up > 0) popLive(L.oppSide.pop, '+' + up);
      if (d.final) { L.oppFinal = true; L.oppSide.mark.classList.remove('hidden'); }
      liveShow(L);
    });
    on('pkLiveEmote', (d) => { if (liveRoom && liveRoom.room.id === d.id) popLive(liveRoom.oppSide.pop, d.e, true); });
    on('pkLiveCancel', (d) => {
      const msg = t('pk.lc.' + d.reason, { name: d.name });
      if (liveWait && liveWait.id === d.id) { liveWait.stop(); liveWait = null; closeModal(); toast(msg, 'info', 5000); }
      if (liveIncoming && liveIncoming.id === d.id) { liveIncoming.stop(); liveIncoming = null; closeModal(); toast(msg, 'info', 4000); }
    });
    on('pkLiveResult', (p) => {
      const L = liveRoom;
      liveRoom = null;
      stopGame();
      if (L && currentPanel === 'games') { tabs.games = 'pk'; renderPanel(); }
      loadContent();
      pkResultModal(p);
    });
    on('emote', (d) => { const p = state.players.get(d.id); if (p) p.emote = { e: d.emoji, t: performance.now() }; });
    on('profile', (u) => {
      const p = state.players.get(u.id);
      if (p) Object.assign(p, { nickname: u.nickname, avatar: u.avatar, status: u.status, points: u.points, room: u.room });
      if (u.id === state.meId && state.me) { Object.assign(state.me, u); updateHud(); }
      const c = state.content;
      if (c) {
        const lists = [c.leaderboard, c.pkBoard, c.members, ...Object.values(c.games || {}).map((g) => g && g.board)];
        for (const l of lists) for (const x of l || []) if (x.id === u.id) { x.avatar = u.avatar; x.nickname = u.nickname; }
      }
      if (currentPanel === 'online' || currentPanel === 'rank') renderPanel();
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
    on('content', () => queueContent());
    on('announce', (a) => { state.announcements.push(a); renderTicker(); toast('📢 ' + pickLang(a.text, a.textEn), 'info', 6000); });
    on('announceUpdated', (a) => { const x = state.announcements.find((y) => y.id === a.id); if (x) { x.text = a.text; x.textEn = a.textEn; } renderTicker(); });
    on('announceRemoved', (d) => { state.announcements = state.announcements.filter((a) => a.id !== d.id); renderTicker(); });
    on('poke', (d) => { toast(t('toast.poke', { name: d.name }), 'info', 4500); logLine(el('div', { class: 'dm' }, '👋 ', t('log.poke', { name: d.name }))); });
    on('notice', (d) => { const s = msgText(d); toast(s, 'info', 8000); notify(s); logLine(el('div', { class: 'sys' }, s)); });
    on('live', (d) => openLive(d));
    on('chatRemoved', (d) => { state.chat = state.chat.filter((m) => m.id !== d.id); if (currentPanel === 'chat') renderPanel(); });
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

  let contentTimer = null, contentStale = false, lastContentAt = 0;
  function queueContent() {
    if (gameRunning || liveRoom) { contentStale = true; return; } // after the round
    clearTimeout(contentTimer);
    contentTimer = setTimeout(loadContent, Math.max(300, 3000 - (Date.now() - lastContentAt)));
  }
  function flushContent() { if (contentStale) { contentStale = false; queueContent(); } }
  async function loadContent() {
    lastContentAt = Date.now();
    try {
      state.content = await api('GET', '/api/content');
      const pkIn = (state.content.pk && state.content.pk.incoming.length) || 0;
      const gb = document.querySelector('.nav button[data-panel=games]');
      if (gb) { let b = gb.querySelector('.badge'); if (!b) { b = el('b', { class: 'badge' }); gb.append(b); } b.textContent = pkIn; b.classList.toggle('hidden', !pkIn); }
      if (state.content.settings) { state.settings = state.content.settings; updateSeasonUi(); }
      checkReminders();
      if (currentPanel && !['chat', 'me'].includes(currentPanel) && !(currentPanel === 'games' && (gameRunning || liveRoom))) renderPanel();
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
    tx.textContent = pickLang(list[tickerIdx].text, list[tickerIdx].textEn);
  }
  setInterval(() => {
    const list = state.announcements.slice(-5);
    if (list.length < 2) return;
    tickerIdx = (tickerIdx + 1) % list.length;
    $('#tickerText').textContent = pickLang(list[tickerIdx].text, list[tickerIdx].textEn);
  }, 7000);

  // ============================================================ chat
  function addChat(m) {
    state.chat.push(m);
    if (state.chat.length > 200) state.chat.shift();
    if (!m.system && !m.to) { const p = state.players.get(m.from); if (p) p.bubble = { text: m.text || '📷', t: performance.now() }; }
    if (currentPanel === 'chat') { const list = $('#msgList'); if (list && matchesChatFilter(m)) { list.append(msgEl(m)); scrollChat(); } }
    else if (m.system) logLine(el('div', { class: 'sys' }, msgText(m)));
    else if (m.to) logLine(el('div', { class: 'dm' }, '🔒 ', el('b', {}, m.from === state.meId ? `→ ${m.toName}` : m.name), ': ', m.image ? '📷 ' : '', m.text));
    else logLine(el('div', {}, el('b', {}, m.name), ': ', m.image ? '📷 ' : '', m.text));
    if (m.to && m.from !== state.meId && currentPanel !== 'chat') toast(t('toast.dm', { name: m.name, text: (m.image ? '📷 ' : '') + (m.text || '').slice(0, 40) }), 'info');
  }
  function logLine(node) {
    const log = $('#chatLog');
    log.append(node);
    while (log.children.length > 5) log.firstChild.remove();
    setTimeout(() => node.remove(), 9000);
  }
  function openPhoto(src) {
    openModal(el('div', { style: 'text-align:center' }, el('img', { src, alt: '', style: 'max-width:100%;max-height:70vh;border-radius:14px' }),
      el('div', { style: 'margin-top:10px' }, el('button', { class: 'btn', onclick: closeModal }, t('close')))));
  }
  const photoInput = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
  document.body.append(photoInput);
  $('#photoBtn').onclick = () => photoInput.click();
  photoInput.onchange = async () => {
    const f = photoInput.files && photoInput.files[0];
    photoInput.value = '';
    if (!f) return;
    const inp = $('#chatInput');
    const text = inp.value.trim();
    $('#photoBtn').disabled = true;
    try {
      const image = await shrinkImage(f, 1280, 0.8);
      await api('POST', '/api/chat', { text, image, to: state.dm ? state.dm.id : undefined });
      inp.value = '';
      toast(t('chat.photoSent'), 'good', 2000);
    } catch (e) { toast(e.message, 'bad'); }
    $('#photoBtn').disabled = false;
  };
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
  const EMOJI = ['😀', '😂', '🥹', '😍', '🥰', '😘', '😎', '🤩', '🥳', '😴', '🤔', '😅', '😭', '😡', '🙈', '🙏', '👍', '👏', '💪', '🤝', '❤️', '💖', '🔥', '✨', '🎉', '🎂', '🍰', '☕', '🧋', '🍜', '🍉', '🌸', '🌈', '⭐', '🏆', '📸', '🎵', '🐶', '🐱', '🐼'];
  const insertEmoji = (e) => { const inp = $('#chatInput'); const at = inp.selectionStart ?? inp.value.length; inp.value = inp.value.slice(0, at) + e + inp.value.slice(inp.selectionEnd ?? at); inp.focus(); inp.selectionStart = inp.selectionEnd = at + e.length; };
  pop.append(el('div', { class: 'pop-title' }, t('chat.emojiTitle')), el('div', { class: 'pop-grid' }, EMOJI.map((e) => el('button', { type: 'button', onclick: () => insertEmoji(e) }, e))),
    el('div', { class: 'pop-title' }, t('chat.actionsTitle')), el('div', { class: 'pop-grid' }, EMOTES.map((e) => el('button', { type: 'button', onclick: () => { sendEmote(e); pop.classList.add('hidden'); } }, e))));
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
      txt(ne ? (ne.tbc ? t('event.dateTbc') : fmtDate(ne.date)) : '—', sx + 90, sy + 52, 11, '#C8D2FF', 600);
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
  let ground = null;
  function groundLayer(th) {
    const k = Math.min(2, Math.max(1, Math.round(view.dpr * view.scale * 4) / 4));
    const key = [k, th.grass, th.tuft, th.path.join(), th.flowers.join()].join('|');
    if (ground && ground.key === key) return ground.c;
    const c = document.createElement('canvas');
    c.width = Math.ceil(WORLD.w * k); c.height = Math.ceil(WORLD.h * k);
    const g = c.getContext('2d');
    g.scale(k, k);
    const ci = (x, y, r) => { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); };
    g.fillStyle = th.grass; g.fillRect(0, 0, WORLD.w, WORLD.h);
    g.strokeStyle = th.tuft; g.lineWidth = 2; g.lineCap = 'round';
    g.beginPath(); for (const tf of TUFTS) { g.moveTo(tf.x - 4, tf.y - 6); g.lineTo(tf.x, tf.y); g.lineTo(tf.x + 4, tf.y - 6); } g.stroke();
    FLOWERS.forEach((f, i) => { ci(f.x, f.y, 3.5); g.fillStyle = th.flowers[i % th.flowers.length]; g.fill(); ci(f.x, f.y, 1.4); g.fillStyle = '#FFB000'; g.fill(); });
    for (const [lw, col] of [[78, th.path[0]], [64, th.path[1]]]) {
      g.strokeStyle = col; g.lineWidth = lw;
      for (const z of ZONES) { g.beginPath(); g.moveTo(PLAZA.x, PLAZA.y); g.lineTo(z.x + z.w / 2, z.y + z.h / 2); g.stroke(); }
    }
    ci(PLAZA.x, PLAZA.y, 180); g.fillStyle = th.path[0]; g.fill();
    ci(PLAZA.x, PLAZA.y, 170); g.fillStyle = th.path[1]; g.fill();
    g.strokeStyle = '#EAD7A6'; g.lineWidth = 3; ci(PLAZA.x, PLAZA.y, 120); g.stroke(); ci(PLAZA.x, PLAZA.y, 150); g.stroke();
    for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2; ci(PLAZA.x + Math.cos(a) * 135, PLAZA.y + Math.sin(a) * 135, 4); g.fillStyle = '#EAD7A6'; g.fill(); }
    ground = { key, c };
    return c;
  }
  function drawWorld(tm) {
    const th = theme();
    ctx.drawImage(groundLayer(th), 0, 0, WORLD.w, WORLD.h);
    ctx.lineCap = 'round';
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

  let lastT = performance.now(), lastSent = 0, dirty = false, currentZone = null, moveBusy = false;
  function loop(tm) {
    const dt = Math.min(0.05, (tm - lastT) / 1000);
    lastT = tm;
    update(dt, tm);
    if (!(window.innerWidth <= 640 && $('#panel').classList.contains('game-full'))) render(tm, dt);
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
      // one position request at a time, so slow connections don't pile up requests
      if (dirty && !moveBusy && tm - lastSent > 120) { lastSent = tm; dirty = false; moveBusy = true; api('POST', '/api/move', { x: Math.round(me.x), y: Math.round(me.y) }).catch(() => {}).finally(() => { moveBusy = false; }); }
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
      else if (d > 1.5) { const step = Math.min(d, Math.max(p.speed || 240, d * 2.5) * dt); p.x += (dx / d) * step; p.y += (dy / d) * step; p.walking = true; p.phase += dt * 13; }
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
    const x0 = view.camX - 120, x1 = view.camX + vw + 120, y0 = view.camY - 60, y1 = view.camY + vh + 160;
    const list = [...state.players.values()].filter((p) => p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1).sort((a, b) => a.y - b.y);
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
    liveQuit();
    stopGame(); stopPanelAnim();
    currentPanel = name;
    $('#panel').classList.remove('hidden');
    $('#panelTitle').textContent = t('title.' + name);
    document.querySelectorAll('.nav button').forEach((b) => b.classList.toggle('on', b.dataset.panel === name));
    renderPanel();
  }
  function closePanel() {
    liveQuit();
    stopGame(); stopPanelAnim(); setGameFull(false);
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
  const setGameFull = (on) => $('#panel').classList.toggle('game-full', !!on);
  function renderPanel() {
    setGameFull(false);
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
      el('div', { class: 'bub' }, el('small', {}, `${label} · ${fmtTime(m.at)}`),
        m.image ? el('img', { class: 'chat-photo', src: fileUrl(m.image), alt: '📷', loading: 'lazy', onclick: () => openPhoto(fileUrl(m.image)) }) : null,
        m.text ? el('div', {}, m.text) : null));
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
        el('button', { class: 'btn red', onclick: () => { closeModal(); pkDraft.to = p.id; tabs.games = 'pk'; miniView = null; if (currentPanel === 'games') renderPanel(); else openPanel('games'); } }, t('card.pk')),
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

  // ---------- two-language content: your language first, the other one small underneath
  const pickLang = (zh, en) => (I18N.lang === 'en' && en ? en : zh || en || '');
  const otherLang = (zh, en) => (en && zh && en !== zh ? (I18N.lang === 'en' ? zh : en) : '');
  function bi(tag, zh, en, props) {
    const sub = otherLang(zh, en);
    return el(tag, props || {}, pickLang(zh, en), sub ? el('span', { class: 'bi-sub' }, sub) : null);
  }
  const optLabel = (opts, optsEn, i) => { const zh = opts[i], en = (optsEn || [])[i]; const sub = otherLang(zh, en); return [`${'ABCD'[i]}. ${pickLang(zh, en)}`, sub ? el('span', { class: 'bi-sub' }, sub) : null]; };

  // ---------- games
  function renderGames(c) {
    const pkCount = (c.pk && c.pk.incoming.length) || 0;
    const wrap = el('div', {}, tabBar('games', [['quiz', t('games.quiz')], ['riddle', t('games.riddle')], ['mini', t('games.mini')], ['pk', t('games.pk') + (pkCount ? ` (${pkCount})` : '')], ['lp', t('games.lp')]]));
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
    else if (tb === 'pk') wrap.append(renderPK(c));
    else wrap.append(renderLP(c));
    return wrap;
  }
  function quizCard(q) {
    const card = el('div', { class: 'card' });
    const draw = () => {
      card.replaceChildren(
        el('div', { class: 'card-top' }, bi('h3', q.question, q.questionEn),
          q.result ? el('span', { class: 'tag ' + (q.result === 'correct' ? 'g' : 'r') }, q.result === 'correct' ? t('quiz.right') : t('quiz.wrong')) : el('span', { class: 'tag y' }, `+${q.points}`)),
        el('div', { class: 'opts' }, q.options.map((o, i) => {
          const b = el('button', { disabled: !!q.result }, optLabel(q.options, q.optionsEn, i));
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
    const hint = el('div', { class: 'muted hidden', style: 'margin-top:6px' }, '💡 ', r.hint || r.hintEn ? bi('span', r.hint, r.hintEn) : t('riddle.noHint'));
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
      el('div', { class: 'card-top' }, bi('h3', r.question, r.questionEn), r.solved ? el('span', { class: 'tag g' }, t('riddle.solved')) : el('span', { class: 'tag y' }, `+${r.points}`)),
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
        el('div', { class: 'card-top' }, el('h3', {}, '🏅 ', bi('span', ch.title, ch.titleEn)), status),
        bi('div', ch.description, ch.descriptionEn, { class: 'muted', style: 'white-space:pre-wrap' }),
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

  // ---------- casual games
  let gameRunning = false, gameStop = null;
  function stopGame() { if (gameStop) gameStop(); gameStop = null; gameRunning = false; setTimeout(flushContent, 500); }
  const GAME_LIST = ['stars', 'memory', 'whack', 'caterpillar', 'slice'];
  const GAME_ICON = { stars: '⭐', memory: '🃏', whack: '🔨', caterpillar: '🐛', slice: '🍉', quiz: '❓' };
  const gameName = (g) => `${GAME_ICON[g] || ''} ${t('game.' + g)}`;
  const newSeed = () => Math.floor(Math.random() * 2147483646) + 1;
  // Plays one round in `box`; calls onEnd(score). Returns nothing; sets gameStop.
  function runGame(box, game, seed, onEnd, onScore) {
    stopGame();
    box.replaceChildren();
    gameRunning = true;
    const end = (score) => { gameRunning = false; gameStop = null; onEnd(score); setTimeout(flushContent, 1500); };
    if (game === 'stars') {
      const canvas = el('canvas', { id: 'gameCanvas' });
      box.append(canvas);
      requestAnimationFrame(() => { gameStop = starCatch(canvas, end, MiniGames.rng(seed), onScore); });
    } else gameStop = MiniGames[game](box, { seed, onEnd: end, t, onScore });
  }
  let miniView = null; // which game is open in the Mini games tab
  function renderMini(c) {
    const games = c.games || {};
    if (!miniView) {
      return el('div', {},
        el('p', { class: 'muted' }, t('mini.pick')),
        el('div', { class: 'game-grid' }, GAME_LIST.map((g) => el('button', { class: 'game-tile', onclick: () => { miniView = g; renderPanel(); } },
          el('div', { class: 'gt-icon' }, GAME_ICON[g]),
          el('b', {}, t('game.' + g)),
          el('div', { class: 'muted' }, t('game.' + g + '.how')),
          el('div', { class: 'tag y' }, t('mini.best') + ((games[g] && games[g].best) || 0))))));
    }
    const g = miniView;
    const box = el('div', { class: 'game-stage gs-' + g });
    setGameFull(true);
    const best = el('b', {}, (games[g] && games[g].best) || 0);
    const startBtn = el('button', { class: 'btn primary big' }, t('mini.start'));
    const wrap = el('div', { class: 'game-box' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;width:100%' },
        el('button', { class: 'btn ghost small', onclick: () => { stopGame(); miniView = null; renderPanel(); } }, t('mini.back')),
        el('b', {}, gameName(g)), el('span', { class: 'tag y' }, t('mini.best'), best)),
      el('div', { class: 'muted', style: 'text-align:center' }, t('game.' + g + '.how')),
      box, startBtn);
    if (g === 'stars') requestAnimationFrame(() => { const cv = el('canvas', { id: 'gameCanvas' }); box.append(cv); drawGameIdle(cv); });
    else box.append(el('div', { class: 'game-idle' }, GAME_ICON[g]));
    startBtn.onclick = () => {
      startBtn.disabled = true;
      runGame(box, g, newSeed(), async (score) => {
        startBtn.disabled = false; startBtn.textContent = t('mini.again');
        try {
          const r = await api('POST', '/api/game/score', { game: g, score });
          best.textContent = r.best;
          if (c.games && c.games[g]) c.games[g].best = r.best;
          toast(r.newBest ? t('mini.newBest', { n: score }) : t('mini.result', { n: score, best: r.best }), r.newBest ? 'good' : 'info');
        } catch (e) { toast(e.message, 'bad'); }
      });
    };
    return wrap;
  }
  function drawGameIdle(canvas) {
    const { ctx: g, w, h } = prepCanvas(canvas, 340, 420);
    g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.fillStyle = '#fff';
    g.fillText(t('mini.title'), w / 2, h / 2 - 30);
    g.font = `600 15px ${FONT}`; g.fillStyle = '#C8D2FF';
    g.fillText(t('mini.how'), w / 2, h / 2 + 6);
    if (state.me) Avatar.draw(g, state.me.avatar, w / 2, h - 14, { scale: 0.85 });
  }
  function starCatch(canvas, onEnd, rand = Math.random, onScore) {
    const DUR = 30;
    let lastRep = 0;
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
    // spawn schedule depends only on the seed, so both PK players get the same falling items
    let spawnIdx = 0;
    const frame = (tm) => {
      if (!running) return;
      const dt = Math.min(0.05, (tm - last) / 1000); last = tm;
      const el2 = (tm - t0) / 1000;
      const { ctx: g, w, h } = prepCanvas(canvas, 340, 420);
      if (keys.ArrowLeft || keys.a) px -= 340 * dt;
      if (keys.ArrowRight || keys.d) px += 340 * dt;
      px = clamp(px, 20, w - 20);
      spawn -= dt;
      while (spawn <= 0) {
        spawn += Math.max(0.2, 0.6 - el2 * 0.013);
        spawnIdx++;
        const r = rand();
        items.push({ x: 20 + rand() * (w - 40), y: -20, vy: 130 + el2 * 7 + rand() * 70, k: r < 0.16 ? 'bomb' : r < 0.27 ? 'gold' : 'star' });
      }
      for (const it of items) it.y += it.vy * dt;
      if (onScore && score !== lastRep) { lastRep = score; onScore(score); }
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

  // ---------- quiz duel (5 questions, 10 s each; the server checks the answers)
  function runQuizDuel(box, questions, onEnd, onAnswer) {
    stopGame();
    gameRunning = true;
    const answers = [];
    let i = 0, timer = 0, stopped = false;
    const bar = el('div', {});
    const show = () => {
      if (stopped) return;
      if (i >= questions.length) { gameRunning = false; gameStop = null; box.replaceChildren(el('div', { class: 'game-idle' }, '✅')); onEnd(answers); setTimeout(flushContent, 1500); return; }
      const q = questions[i], t0 = performance.now();
      let picked = false;
      const opts = el('div', { class: 'opts' }, q.options.map((o, k) => el('button', { onclick: () => {
        if (picked) return; picked = true; clearInterval(timer);
        answers[i] = { choice: k, ms: Math.round(performance.now() - t0) };
        if (onAnswer) onAnswer(answers.slice());
        i++; setTimeout(show, 250);
      } }, optLabel(q.options, q.optionsEn, k))));
      box.replaceChildren(el('div', { class: 'muted' }, `${i + 1} / ${questions.length}`), bi('h3', q.question, q.questionEn), el('div', { class: 'live-timer' }, bar), opts);
      timer = setInterval(() => {
        const left = 10000 - (performance.now() - t0);
        bar.style.width = clamp(left / 100, 0, 100) + '%';
        if (left <= 0 && !picked) { picked = true; clearInterval(timer); answers[i] = { choice: -1, ms: 10000 }; if (onAnswer) onAnswer(answers.slice()); i++; show(); }
      }, 100);
    };
    gameStop = () => { stopped = true; clearInterval(timer); gameRunning = false; };
    show();
  }

  // ---------- live PK (both play at the same time)
  let liveRoom = null, liveWait = null, liveIncoming = null;
  const LIVE_EMOTES = ['😆', '🔥', '😱', '👍', '💪', '😭'];
  function countdownModal(node, secs, onTimeout) {
    const sec = el('b', {}, String(secs));
    let left = secs;
    const iv = setInterval(() => { left--; sec.textContent = String(Math.max(0, left)); if (left <= 0) { clearInterval(iv); if (onTimeout) onTimeout(); } }, 1000);
    return { sec, stop: () => clearInterval(iv) };
  }
  async function liveInvite(to, game) {
    try {
      const { room } = await api('POST', '/api/pk/live/invite', { to, game });
      const cd = countdownModal(null, 30);
      liveWait = { id: room.id, stop: cd.stop };
      openModal(el('div', { class: 'pk-invite' },
        el('div', { class: 'pk-inv-bolt' }, '⚡'),
        el('img', { class: 'pk-inv-av', src: Avatar.thumb(room.toAvatar || {}, 72), alt: '' }),
        el('h3', {}, t('pk.inviting', { name: room.toName })),
        el('p', {}, gameName(room.game)),
        el('p', { class: 'muted' }, t('pk.inviteWait'), ' ', cd.sec, 's'),
        el('div', { class: 'dlg-acts' }, el('button', { class: 'btn ghost', onclick: () => { cd.stop(); liveWait = null; closeModal(); api('POST', '/api/pk/live/cancel', { id: room.id }).catch(() => {}); } }, t('pk.cancel')))));
    } catch (e) { toast(e.message, 'bad'); }
  }
  function onLiveInvite(room) {
    const decline = () => { cd.stop(); liveIncoming = null; closeModal(); api('POST', '/api/pk/live/cancel', { id: room.id }).catch(() => {}); };
    const cd = countdownModal(null, 30, () => { if (liveIncoming && liveIncoming.id === room.id) { liveIncoming = null; closeModal(); } });
    liveIncoming = { id: room.id, stop: cd.stop };
    notify(t('pk.liveInvite', { name: room.fromName }));
    openModal(el('div', { class: 'pk-invite' },
      el('div', { class: 'pk-inv-bolt' }, '⚡'),
      el('img', { class: 'pk-inv-av', src: Avatar.thumb(room.fromAvatar || {}, 72), alt: '' }),
      el('h3', {}, t('pk.liveInvite', { name: room.fromName })),
      el('p', {}, gameName(room.game)),
      el('p', { class: 'muted' }, cd.sec, 's'),
      el('div', { class: 'dlg-acts' },
        el('button', { class: 'btn ghost', onclick: decline }, t('pk.decline')),
        el('button', { class: 'btn primary', onclick: async () => { cd.stop(); liveIncoming = null; closeModal(); try { await api('POST', '/api/pk/live/accept', { id: room.id }); } catch (e) { toast(e.message, 'bad'); } } }, t('pk.accept')))));
  }
  function popLive(box, text, big) {
    const s = el('span', { class: 'pk-pop' + (big ? ' big' : '') }, text);
    box.append(s);
    setTimeout(() => s.remove(), 1300);
  }
  function liveSide(av, name, cls) {
    const sc = el('b', { class: 'pk-l-score' }, '0'), fill = el('i'), mark = el('span', { class: 'pk-l-done hidden' }, ' ✅'), pop = el('div', { class: 'pk-l-pops' });
    const node = el('div', { class: 'pk-l-side ' + cls },
      el('div', { class: 'pk-l-av' }, el('img', { src: Avatar.thumb(av || {}, 56), alt: '' }), pop),
      el('div', { class: 'pk-l-name' }, name, mark), sc, el('div', { class: 'pk-l-bar' }, fill));
    return { node, sc, fill, mark, pop };
  }
  function liveShow(L) {
    const max = Math.max(L.my, L.opp, 1);
    L.meSide.sc.textContent = L.my; L.oppSide.sc.textContent = L.opp;
    L.meSide.fill.style.width = (L.my / max) * 100 + '%'; L.oppSide.fill.style.width = (L.opp / max) * 100 + '%';
    L.meSide.node.classList.toggle('lead', L.my > L.opp); L.oppSide.node.classList.toggle('lead', L.opp > L.my);
  }
  function onLiveStart(room) {
    if (liveWait && liveWait.id === room.id) { liveWait.stop(); liveWait = null; closeModal(); }
    if (liveRoom) return;
    const meFrom = room.from === state.meId;
    if (currentPanel !== 'games') openPanel('games');
    stopGame();
    const L = liveRoom = { room, oppName: meFrom ? room.toName : room.fromName, my: 0, opp: 0, oppFinal: false, myFinal: false, sending: false, pending: null };
    L.meSide = liveSide(state.me.avatar, t('pk.you'), 'me');
    L.oppSide = liveSide(meFrom ? room.toAvatar : room.fromAvatar, L.oppName, 'opp');
    L.box = el('div', { class: 'game-stage gs-' + room.game });
    const cd = el('div', { class: 'pk-countdown' });
    setGameFull(true);
    $('#panelBody').replaceChildren(el('div', { class: 'game-box pk-live' },
      el('div', { class: 'pk-l-top' }, L.meSide.node, el('div', { class: 'pk-l-vs' }, 'VS', el('small', {}, gameName(room.game))), L.oppSide.node),
      el('div', { class: 'pk-l-stage' }, L.box, cd),
      el('div', { class: 'pk-l-emotes' }, LIVE_EMOTES.map((e) => el('button', { type: 'button', onclick: () => { popLive(L.meSide.pop, e, true); api('POST', '/api/pk/live/emote', { id: room.id, e }).catch(() => {}); } }, e)))));
    L.box.append(el('div', { class: 'game-idle' }, GAME_ICON[room.game]));
    const startIn = room.startAt - room.serverNow, t0 = performance.now();
    const tick = () => {
      if (liveRoom !== L) return;
      const left = startIn - (performance.now() - t0);
      if (left > 0) { cd.textContent = String(Math.ceil(left / 1000)); setTimeout(tick, 100); return; }
      cd.textContent = t('pk.go'); cd.classList.add('go');
      setTimeout(() => cd.classList.add('hidden'), 700);
      if (room.game === 'quiz') runQuizDuel(L.box, room.quiz || [], (answers) => liveSend(L, { answers }, true), (answers) => liveSend(L, { answers }, false));
      else runGame(L.box, room.game, room.seed, (score) => { if (L.myFinal) return; L.my = score; liveShow(L); liveSend(L, { score }, true); }, (score) => { if (L.myFinal) return; L.my = score; liveShow(L); liveSend(L, { score }, false); });
    };
    tick();
  }
  function liveSend(L, payload, final, retry = 1) {
    if (liveRoom !== L) return;
    if (final) { L.myFinal = true; L.pending = null; }
    else if (L.myFinal) return;
    else if (L.sending || Date.now() - (L.lastSend || 0) < 300) { // at most ~3 updates a second
      L.pending = payload;
      if (!L.sending && !L.flushT) L.flushT = setTimeout(() => { L.flushT = 0; if (L.pending && !L.myFinal) { const p = L.pending; L.pending = null; liveSend(L, p, false); } }, 300 - (Date.now() - (L.lastSend || 0)));
      return;
    }
    L.lastSend = Date.now();
    if (!final) L.sending = true;
    api('POST', '/api/pk/live/score', { id: L.room.id, ...payload, final })
      .then((r) => { if (r && L.room.game === 'quiz') { L.my = r.score; liveShow(L); } })
      .catch(() => { if (final && retry > 0) setTimeout(() => liveSend(L, payload, true, retry - 1), 1000); })
      .finally(() => {
        if (final) return;
        L.sending = false;
        if (L.pending && !L.myFinal) { const p = L.pending; L.pending = null; setTimeout(() => liveSend(L, p, false), 250); }
      });
    if (final && !L.oppFinal) L.box.append(el('div', { class: 'pk-l-wait' }, t('pk.waitOpp', { name: L.oppName })));
  }
  function liveQuit() {
    if (!liveRoom) return;
    const id = liveRoom.room.id;
    liveRoom = null;
    api('POST', '/api/pk/live/cancel', { id }).catch(() => {});
  }

  // ---------- PK
  let pkDraft = { to: '', game: 'stars' };
  function playPK(p, onDone) {
    const box = el('div', { class: 'game-stage gs-' + p.game });
    setGameFull(true);
    const body = $('#panelBody');
    body.replaceChildren(el('div', { class: 'game-box' },
      el('div', { style: 'display:flex;justify-content:space-between;align-items:center;width:100%' },
        el('b', {}, '⚔️ ' + gameName(p.game)),
        el('span', { class: 'muted' }, p.from === state.meId ? t('pk.vs', { name: p.toName }) : t('pk.vs', { name: p.fromName }))),
      box));
    const submit = async (payload) => {
      try { const r = await api('POST', '/api/pk/score', { id: p.id, ...payload }); onDone(r.pk); }
      catch (e) { toast(e.message, 'bad'); renderPanel(); }
    };
    if (p.game === 'quiz') runQuizDuel(box, p.quiz || [], (answers) => submit({ answers }));
    else runGame(box, p.game, p.seed, (score) => submit({ score }));
  }
  function pkResultModal(p) {
    const mineFrom = p.from === state.meId;
    const my = mineFrom ? p.fromScore : p.toScore, their = mineFrom ? p.toScore : p.fromScore;
    const res = p.winner === 'tie' ? 'tie' : p.winner === state.meId ? 'win' : 'lose';
    openModal(el('div', { class: 'room-view', style: 'text-align:center' },
      el('div', { style: 'font-size:52px' }, res === 'win' ? '🏆' : res === 'tie' ? '🤝' : '💪'),
      el('h3', {}, t('pk.res.' + res)),
      el('p', {}, gameName(p.game)),
      el('div', { class: 'pk-score' },
        el('div', {}, el('img', { src: Avatar.thumb(state.me.avatar, 56), alt: '' }), el('b', {}, my), el('div', { class: 'muted' }, t('pk.you'))),
        el('div', { class: 'pk-vs' }, 'VS'),
        el('div', {}, el('img', { src: Avatar.thumb((mineFrom ? p.toAvatar : p.fromAvatar) || {}, 56), alt: '' }), el('b', {}, their), el('div', { class: 'muted' }, mineFrom ? p.toName : p.fromName))),
      el('p', { class: 'muted' }, res === 'win' ? t('pk.winPts') : res === 'tie' ? t('pk.tiePts') : t('pk.losePts')),
      el('button', { class: 'btn primary', onclick: closeModal }, t('ok'))));
  }
  function renderPK(c) {
    const pk = c.pk || { incoming: [], outgoing: [], history: [], record: { w: 0, l: 0, t: 0 } };
    const members = [...(c.members || [])];
    const onlineIds = new Set(state.players.keys());
    for (const p of state.players.values()) if (p.id !== state.meId && !members.some((m) => m.id === p.id)) members.push({ id: p.id, nickname: p.nickname, avatar: p.avatar });
    const sorted = [...members].sort((a, b) => (onlineIds.has(b.id) - onlineIds.has(a.id)) || a.nickname.localeCompare(b.nickname));
    if (pkDraft.to && !members.some((m) => m.id === pkDraft.to)) pkDraft.to = '';
    const who = el('select', { class: 'inp' }, el('option', { value: '' }, t('pk.pickWho')), sorted.map((m) => el('option', { value: m.id, selected: m.id === pkDraft.to }, (onlineIds.has(m.id) ? '🟢 ' : '') + m.nickname)));
    const game = el('select', { class: 'inp' }, [...GAME_LIST, 'quiz'].map((g) => el('option', { value: g, selected: g === pkDraft.game }, gameName(g))));
    who.onchange = () => { pkDraft.to = who.value; };
    game.onchange = () => { pkDraft.game = game.value; };
    const liveBtn = el('button', { class: 'btn primary', onclick: () => {
      if (!who.value) return toast(t('pk.pickWho'), 'bad');
      if (!state.players.has(who.value)) return toast(t('err.pk_offline', { name: (members.find((m) => m.id === who.value) || {}).nickname || '' }), 'info', 6000);
      liveInvite(who.value, game.value);
    } }, t('pk.live'));
    const startBtn = el('button', { class: 'btn', onclick: async () => {
      if (!who.value) return toast(t('pk.pickWho'), 'bad');
      try {
        const r = await api('POST', '/api/pk/create', { to: who.value, game: game.value });
        playPK(r.pk, () => { toast(t('pk.sent', { name: r.pk.toName }), 'good', 5000); loadContent(); renderPanel(); });
      } catch (e) { toast(e.message, 'bad'); }
    } }, t('pk.start'));
    const row = (p, kind) => el('div', { class: 'pk-row ' + kind },
      el('img', { class: 'pk-av', src: Avatar.thumb((kind === 'in' ? p.fromAvatar : p.from === state.meId ? p.toAvatar : p.fromAvatar) || {}, 40), alt: '' }),
      el('div', { style: 'flex:1;min-width:0' },
        el('b', {}, kind === 'in' ? t('pk.challengedYou', { name: p.fromName }) : kind === 'out' ? t('pk.waiting', { name: p.toName }) : (p.from === state.meId ? p.toName : p.fromName)),
        el('div', { class: 'muted' }, gameName(p.game) + ' · ' + fmtDate(p.doneAt || p.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) +
          (kind === 'out' ? ' · ' + t('pk.yourScore', { n: p.fromScore }) : '') +
          (kind === 'hist' && p.status === 'done' ? ` · ${p.from === state.meId ? p.fromScore : p.toScore} : ${p.from === state.meId ? p.toScore : p.fromScore}` : ''))),
      kind === 'in' ? el('div', { style: 'display:flex;gap:4px' },
        el('button', { class: 'btn small primary', onclick: () => playPK(p, (done) => { loadContent(); renderPanel(); pkResultModal(done); }) }, t('pk.accept')),
        el('button', { class: 'btn small ghost', onclick: async () => { try { await api('POST', '/api/pk/decline', { id: p.id }); loadContent(); } catch (e) { toast(e.message, 'bad'); } } }, t('pk.decline'))) : null,
      kind === 'hist' ? el('span', { class: 'tag ' + (p.status !== 'done' ? '' : p.winner === 'tie' ? 'y' : p.winner === state.meId ? 'g' : 'r') },
        p.status === 'done' ? t('pk.res.' + (p.winner === 'tie' ? 'tie' : p.winner === state.meId ? 'win' : 'lose')) : t('pk.st.' + p.status)) : null);
    return el('div', {},
      el('div', { class: 'pk-record' },
        el('div', {}, el('b', {}, pk.record.w), t('pk.wins')), el('div', {}, el('b', {}, pk.record.l), t('pk.losses')), el('div', {}, el('b', {}, pk.record.t), t('pk.ties'))),
      pk.incoming.length ? el('div', { class: 'section-t' }, t('pk.incoming', { n: pk.incoming.length })) : null,
      pk.incoming.map((p) => row(p, 'in')),
      el('div', { class: 'card' }, el('h3', {}, t('pk.newTitle')),
        el('label', { class: 'field', style: 'margin:6px 0' }, el('span', {}, t('pk.opponent')), who),
        el('label', { class: 'field', style: 'margin:6px 0' }, el('span', {}, t('pk.game')), game),
        el('div', { class: 'pk-btns' }, liveBtn, startBtn),
        el('p', { class: 'muted', style: 'margin:8px 0 0;font-size:12px' }, '⚡ ', t('pk.liveHint')),
        el('p', { class: 'muted', style: 'margin:4px 0 0;font-size:12px' }, '📨 ', t('pk.newHint'))),
      pk.outgoing.length ? el('div', { class: 'section-t' }, t('pk.outgoing', { n: pk.outgoing.length })) : null,
      pk.outgoing.map((p) => row(p, 'out')),
      pk.history.length ? el('div', { class: 'section-t' }, t('pk.history')) : null,
      pk.history.map((p) => row(p, 'hist')));
  }

  // ---------- rank
  let rankGame = 'stars';
  function renderRank(c) {
    const wrap = el('div', {}, tabBar('rank', [['points', t('rank.points')], ['games', t('rank.games')], ['pk', t('rank.pk')]]));
    let list, value;
    if (tabs.rank === 'points') { list = c.leaderboard; value = (u) => `⭐ ${u.points}`; }
    else if (tabs.rank === 'pk') { list = c.pkBoard || []; value = (u) => t('rank.pkWins', { n: u.wins }); }
    else {
      wrap.append(el('div', { class: 'cz-opts', style: 'margin-bottom:8px' }, GAME_LIST.map((g) => el('button', { class: rankGame === g ? 'on' : '', onclick: () => { rankGame = g; renderPanel(); } }, gameName(g)))));
      list = (c.games && c.games[rankGame] && c.games[rankGame].board) || [];
      value = (u) => `${u.score}`;
    }
    if (!list.length) { wrap.append(el('div', { class: 'empty' }, t('rank.empty'))); return wrap; }
    list.forEach((u, i) => {
      const p = state.players.get(u.id);
      wrap.append(el('button', { class: 'person' + (u.id === state.meId ? ' me' : ''), onclick: () => { if (p && p.id !== state.meId) openPlayerCard(p); } },
        el('div', { class: 'rank-n' }, ['🥇', '🥈', '🥉'][i] || i + 1),
        avatarImg(u.avatar),
        el('div', { class: 'pinfo' }, el('b', {}, u.nickname), el('span', {}, p ? t('rank.online') : t('rank.offline'))),
        el('div', { class: 'pts' }, value(u))));
    });
    return wrap;
  }

  // ---------- HQ events, polls, payments
  function eventEnd(e) { if (e.tbc) return Infinity; return Date.parse(e.endDate || '') || Date.parse(e.date) + 3 * 3600000; }
  const fileUrl = (id) => `/api/file/${encodeURIComponent(id)}?t=${encodeURIComponent(state.token)}`;
  const money = (n) => (Number(n) % 1 ? Number(n).toFixed(2) : String(Number(n)));
  const payBy = (e) => e.payDeadline || (e.tbc ? '' : e.date);
  const cur = () => (state.settings && state.settings.currency) || 'RM';
  const payByText = (e) => (payBy(e) ? fmtDate(payBy(e)) : t('event.dateTbc'));
  function renderHQ(c) {
    const now = Date.now();
    const upcoming = c.events.filter((e) => eventEnd(e) > now);
    const past = c.events.filter((e) => eventEnd(e) <= now).reverse();
    const wrap = el('div', {});
    const owing = upcoming.filter((e) => e.mine && e.mine.status === 'unpaid');
    for (const e of owing) wrap.append(el('div', { class: 'card pay-alert' }, t('pay.banner', { title: e.title, date: payByText(e), fee: money(e.fee), cur: cur() })));
    if (state.announcements.length) {
      wrap.append(el('div', { class: 'card', style: 'background:#FFF3C4' }, el('b', {}, t('hq.news')),
        state.announcements.slice(-3).reverse().map((a) => el('div', { style: 'margin-top:4px' }, bi('span', a.text, a.textEn), ' ', el('span', { class: 'muted' }, fmtDate(a.editedAt || a.createdAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }))))));
    }
    if (c.polls && c.polls.length) {
      wrap.append(el('div', { class: 'section-t' }, t('poll.title')));
      for (const p of c.polls) wrap.append(pollCard(p));
    }
    const dated = upcoming.filter((e) => !e.tbc), soon = upcoming.filter((e) => e.tbc);
    wrap.append(el('div', { class: 'section-t' }, t('hq.upcoming', { n: dated.length })));
    if (!dated.length) wrap.append(el('div', { class: 'empty' }, t('hq.none')));
    for (const e of dated) wrap.append(eventCard(e, false));
    if (soon.length) {
      wrap.append(el('div', { class: 'section-t' }, t('hq.soon', { n: soon.length })));
      for (const e of soon) wrap.append(eventCard(e, false));
    }
    if (past.length) {
      wrap.append(el('div', { class: 'section-t' }, t('hq.past', { n: past.length })));
      for (const e of past) wrap.append(eventCard(e, true));
    }
    if ('Notification' in window && Notification.permission === 'default') wrap.append(el('button', { class: 'btn ghost small', onclick: askNotify }, t('hq.notify')));
    return wrap;
  }
  function pollCard(p) {
    const voted = p.myVote !== null && p.myVote !== undefined;
    const showResults = voted || p.closed;
    return el('div', { class: 'card poll' },
      el('div', { class: 'card-top' }, el('h3', {}, '🗳️ ', bi('span', p.question, p.questionEn)), el('span', { class: 'tag ' + (p.closed ? '' : 'p') }, p.closed ? t('poll.closed') : t('poll.votes', { n: p.total }))),
      p.closesAt && !p.closed ? el('div', { class: 'muted' }, t('poll.closes', { date: fmtDate(p.closesAt) })) : null,
      el('div', { class: 'poll-opts' }, p.options.map((o, i) => {
        const pct = p.total ? Math.round((p.counts[i] / p.total) * 100) : 0;
        const b = el('button', { class: 'poll-opt' + (p.myVote === i ? ' mine' : ''), disabled: p.closed },
          showResults ? el('i', { style: `width:${pct}%` }) : null,
          el('span', {}, (p.myVote === i ? '✅ ' : '') + pickLang(o, (p.optionsEn || [])[i]), otherLang(o, (p.optionsEn || [])[i]) ? el('span', { class: 'bi-sub' }, otherLang(o, (p.optionsEn || [])[i])) : null),
          showResults ? el('b', {}, `${pct}% · ${p.counts[i]}`) : null);
        b.onclick = async () => {
          try { await api('POST', '/api/poll/vote', { id: p.id, choice: i }); toast(t('poll.thanks'), 'good'); loadContent(); } catch (e) { toast(e.message, 'bad'); }
        };
        return b;
      })),
      el('div', { class: 'muted', style: 'margin-top:4px' }, p.closed ? '' : voted ? t('poll.voted') : t('poll.tapToVote')));
  }
  function eventCard(e, isPast) {
    const d = new Date(e.tbc ? Date.now() : e.date);
    const mine = e.mine;
    const start = Date.parse(e.date);
    const paid = Number(e.fee) > 0;
    const full = e.capacity && e.count >= e.capacity && !mine;
    const hasAddr = e.address && !/^[（(]/.test(e.address);
    const L = I18N.locale();
    const joinBtn = el('button', { class: 'btn small ' + (mine ? 'ghost' : 'primary'), disabled: !!full || (mine && (mine.status === 'submitted' || mine.status === 'paid')), onclick: async () => {
      try {
        const r = await api('POST', '/api/event/rsvp', { id: e.id });
        toast(r.going ? (paid ? t('event.joinedOk') : t('event.toastOn')) : (paid ? t('event.leftOk') : t('event.toastOff')), r.going ? 'good' : '');
        if (r.going && 'Notification' in window && Notification.permission === 'default') askNotify();
        loadContent();
      } catch (err) { toast(err.message, 'bad'); }
    } }, full ? t('event.full') : mine ? (paid ? t('event.leave') : t('event.rsvpOn')) : paid ? t('event.joinPaid', { fee: money(e.fee), cur: cur() }) : t('event.rsvp'));
    return el('div', { class: 'card event' + (mine ? ' joined' : '') + (e.tbc ? ' tbc' : ''), style: isPast ? 'opacity:.92' : '' },
      e.tbc ? el('div', { class: 'date-badge tbc' }, el('div', { class: 'm' }, '✨'), el('div', { class: 'd' }, 'TBC'), el('div', { class: 'w' }, 'Soon'))
        : el('div', { class: 'date-badge' },
          el('div', { class: 'm' }, d.toLocaleDateString(L, { month: 'short' })),
          el('div', { class: 'd' }, d.getDate()),
          el('div', { class: 'w' }, d.toLocaleDateString(L, { weekday: 'short' }))),
      el('div', { class: 'info' },
        bi('h3', e.title, e.titleEn),
        e.tbc ? el('div', { class: 'countdown' }, t('event.tbcLong'))
          : !isPast ? el('div', { class: 'countdown' }, start > Date.now() ? '⏳ ' + relTime(start - Date.now()) : t('event.live')) : null,
        e.tbc ? null : el('div', { class: 'meta' }, '🕒 ' + fmtDate(e.date) + (e.endDate ? ' – ' + fmtDate(e.endDate, { hour: '2-digit', minute: '2-digit' }) : '')),
        e.venue ? el('div', { class: 'meta' }, '📍 ' + e.venue) : null,
        e.address ? el('div', { class: 'meta' }, '🏠 ' + e.address) : null,
        el('div', { class: 'chips' },
          el('span', { class: 'tag ' + (paid ? 'y' : 'g') }, paid ? t('event.fee', { fee: money(e.fee), cur: cur() }) : t('event.free')),
          el('span', { class: 'tag' }, e.capacity ? t('event.quota', { n: e.count, cap: e.capacity }) : t('event.going', { n: e.count })),
          mine ? el('span', { class: 'tag ' + (mine.status === 'unpaid' ? 'r' : mine.status === 'submitted' ? 'p' : 'g') }, t('pay.status.' + mine.status)) : null),
        e.content ? bi('div', e.content, e.contentEn, { class: 'content' }) : null,
        isPast && e.record ? el('div', { class: 'record' }, el('b', {}, t('event.record')), el('br'), bi('span', e.record, e.recordEn)) : null,
        !isPast && paid && mine ? payBox(e) : null,
        !isPast ? el('div', { class: 'actions' }, joinBtn,
          e.tbc ? null : el('button', { class: 'btn small', onclick: () => downloadIcs(e) }, t('event.ics')),
          hasAddr ? el('a', { class: 'btn small', href: 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.address), target: '_blank', rel: 'noopener', style: 'text-decoration:none' }, t('event.map')) : null) : null,
        e.updatedAt ? el('div', { class: 'updated' }, t('event.updated', { date: fmtDate(e.updatedAt, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) })) : null));
  }
  function payBox(e) {
    const m = e.mine;
    const file = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
    const upBtn = el('button', { class: 'btn small ' + (m.status === 'unpaid' ? 'primary' : 'ghost'), onclick: () => file.click() }, m.status === 'unpaid' ? t('pay.upload') : t('pay.reupload'));
    file.onchange = async () => {
      const f = file.files && file.files[0];
      if (!f) return;
      upBtn.disabled = true; upBtn.textContent = t('pay.uploading');
      try {
        const image = await shrinkImage(f, 1200, 0.8);
        await api('POST', '/api/event/proof', { id: e.id, image });
        toast(t('pay.uploaded'), 'good');
        loadContent();
      } catch (err) { toast(err.message, 'bad'); upBtn.disabled = false; upBtn.textContent = t('pay.upload'); }
    };
    const status = m.status === 'paid' ? t('pay.paidAt', { date: fmtDate(m.paidAt || Date.now()) })
      : m.status === 'submitted' ? t('pay.status.submitted') + ' · ' + t('pay.submittedAt', { date: fmtDate(m.submittedAt) })
      : (m.note ? t('pay.rejected', { note: m.note }) : t('pay.deadline', { date: payByText(e) }));
    return el('div', { class: 'pay-box ' + m.status },
      el('b', {}, t('pay.title')),
      el('div', { class: 'pay-status' }, status),
      m.status !== 'paid' ? el('div', { class: 'pay-how' },
        e.qrFile ? el('figure', {}, el('img', { src: fileUrl(e.qrFile), alt: 'QR', class: 'qr', onclick: () => window.open(fileUrl(e.qrFile), '_blank') }), el('figcaption', { class: 'muted' }, t('pay.scan'))) : el('div', { class: 'muted' }, t('pay.noQr')),
        e.payInfo ? el('div', { class: 'pay-info' }, e.payInfo) : null) : null,
      m.proofFile ? el('a', { href: fileUrl(m.proofFile), target: '_blank', rel: 'noopener', class: 'muted small-link' }, '🧾 ' + t('pay.myProof')) : null,
      m.status !== 'paid' ? el('div', { class: 'actions' }, upBtn, file) : null);
  }
  function shrinkImage(fileObj, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(fileObj);
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('err.bad_image'))); };
      img.src = url;
    });
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
    reminderTimers.forEach(clearTimeout);
    reminderTimers = [];
    const joined = c.events.filter((e) => e.mine);
    const owing = joined.filter((e) => e.mine.status === 'unpaid' && eventEnd(e) > now);
    const soon = joined.filter((e) => !e.tbc && Date.parse(e.date) > now && Date.parse(e.date) - now < 86400000);
    const bar = $('#reminderBar');
    if (owing.length) {
      const e = owing[0];
      bar.textContent = t('pay.banner', { title: e.title, date: payByText(e), fee: money(e.fee), cur: cur() });
      bar.classList.remove('hidden');
      bar.classList.add('pay');
      bar.onclick = () => { openPanel('hq'); };
    } else if (soon.length) {
      const e = soon[0];
      bar.textContent = t('remind.bar', { title: e.title, rel: relTime(Date.parse(e.date) - now), venue: e.venue || '' });
      bar.classList.remove('hidden', 'pay');
      bar.onclick = () => { bar.classList.add('hidden'); openPanel('hq'); };
    } else bar.classList.add('hidden');
    for (const e of joined) {
      if (e.tbc) continue;
      const at = Date.parse(e.date) - 3600000 - now;
      if (at > 0 && at < 86400000) reminderTimers.push(setTimeout(() => { const s = t('remind.hour', { title: e.title }); toast(s, 'info', 9000); notify(s); }, at));
    }
    const week = c.events.filter((e) => !e.tbc && Date.parse(e.date) > now && Date.parse(e.date) - now < 7 * 86400000).length + owing.length;
    const badge = $('#hqBadge');
    badge.textContent = owing.length ? '💰' : week;
    badge.classList.toggle('hidden', !week);
  }
  // keep countdowns and "updated" dates current while the panel is open
  setInterval(() => { if (state.content) checkReminders(); if (currentPanel === 'hq' && !document.hidden) renderPanel(); }, 60000);

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
        el('div', { class: 'card' }, el('h3', {}, t('pin.cardTitle')),
          el('p', { class: 'muted', style: 'margin:0 0 8px' }, me.hasPin ? t('pin.cardHasPin', { name: me.nickname }) : t('pin.cardNoPin')),
          el('button', { class: 'btn small ' + (me.hasPin ? '' : 'primary'), onclick: () => openPinSetup(!me.hasPin) }, me.hasPin ? t('pin.changeBtn') : t('pin.setBtn')),
          el('div', { style: 'margin-top:12px;padding-top:10px;border-top:1px solid var(--line)' },
            el('b', {}, t('rec.cardTitle')),
            el('p', { class: 'muted', style: 'margin:4px 0 8px' }, me.hasRecovery ? t('rec.cardHas', { q: recQText(me.recoveryQ) }) : t('rec.cardNone')),
            el('button', { class: 'btn small ' + (me.hasRecovery ? '' : 'primary'), onclick: () => openRecoverySetup(!me.hasRecovery) }, me.hasRecovery ? t('rec.changeBtn') : t('rec.setBtn')))),
        installCard(),
        pushCard(),
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
        el('button', { class: 'btn ghost small', onclick: async () => { if (await askConfirm(t('me.logoutConfirm'))) { if (pushOn) await disablePush(true); store.del('lp258_pushOff'); logout(); } } }, t('me.logout')));
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
      const b = el('button', { disabled: !!d.answered }, optLabel(d.options, d.optionsEn, i));
      b.onclick = async () => {
        opts.querySelectorAll('button').forEach((x) => { x.disabled = true; });
        b.style.borderColor = 'var(--blue)';
        try { await api('POST', '/api/live/answer', { choice: i }); L.answered = true; L.picked = i; status.textContent = t('live.answered'); }
        catch (e) { toast(e.message, 'bad'); }
      };
      return b;
    }));
    openModal(el('div', { class: 'live-card' },
      el('div', { class: 'tag p' }, t('live.tag')), bi('h3', d.question, d.questionEn),
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
      el('div', { class: 'tag p' }, t('live.result')), bi('h3', r.question, r.questionEn),
      el('div', { class: 'opts' }, r.options.map((o, i) => el('button', { disabled: true, class: i === r.answer ? 'right' : i === picked ? 'wrong' : '' }, optLabel(r.options, r.optionsEn, i)))),
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

  // ---------- phone notifications (host announcements)
  let pushOn = false;
  const pushSupported = () => 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const keyBytes = (b) => { const s = atob(b.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((b.length + 3) % 4)); return Uint8Array.from(s, (c) => c.charCodeAt(0)); };
  function pushState() {
    if (!pushSupported()) return isIOS() && !isStandalone() ? 'ios' : 'none';
    if (Notification.permission === 'denied') return 'denied';
    return pushOn ? 'on' : 'off';
  }
  async function pushSubscribe() {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) { const { key } = await api('GET', '/api/push/key'); sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(key) }); }
    await api('POST', '/api/push/subscribe', { sub: sub.toJSON() });
    return true;
  }
  async function enablePush() {
    if (!pushSupported()) { toast(t(isIOS() && !isStandalone() ? 'push.st.ios' : 'push.st.none'), 'bad', 7000); return false; }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') { toast(t('push.st.denied'), 'bad', 7000); return false; }
    try { await pushSubscribe(); pushOn = true; store.del('lp258_pushOff'); toast(t('push.on'), 'good'); return true; }
    catch (e) { toast(t('push.fail'), 'bad'); return false; }
  }
  async function disablePush(quiet) {
    store.set('lp258_pushOff', '1');
    pushOn = false;
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await api('POST', '/api/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe(); }
    } catch {}
    if (!quiet) toast(t('push.off'), 'info');
  }
  // After sign-in: quietly keep this phone subscribed, or ask once in a while.
  async function pushBoot() {
    if (store.get('lp258_pushOff') === '1') return;
    const asked = Number(store.get('lp258_pushAsk') || 0);
    const askAgain = Date.now() - asked > 3 * 86400000;
    if (!pushSupported()) { if (isIOS() && !isStandalone() && askAgain) showPushAsk(true); return; }
    if (Notification.permission === 'granted') { try { await pushSubscribe(); pushOn = true; } catch {} return; }
    if (Notification.permission === 'default' && askAgain) showPushAsk(false);
  }
  function showPushAsk(iosFirst) {
    store.set('lp258_pushAsk', String(Date.now()));
    openModal(el('div', { class: 'push-ask' },
      el('div', { class: 'push-bell' }, '🔔'),
      el('h3', {}, t('push.askTitle')),
      el('p', { class: 'muted', style: 'white-space:pre-line' }, iosFirst ? t('push.st.ios') : t('push.askText')),
      el('div', { class: 'dlg-acts' },
        el('button', { class: 'btn ghost', onclick: closeModal }, t('push.later')),
        iosFirst ? null : el('button', { class: 'btn primary', onclick: async () => { closeModal(); await enablePush(); } }, t('push.turnOn')))));
  }
  function pushCard() {
    const st = pushState();
    let body;
    if (st === 'on') body = [el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('push.cardOn')), el('button', { class: 'btn small ghost', onclick: async () => { await disablePush(); renderPanel(); } }, t('push.turnOff'))];
    else if (st === 'off') body = [el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('push.cardOff')), el('button', { class: 'btn small primary', onclick: async () => { await enablePush(); renderPanel(); } }, t('push.turnOn'))];
    else body = el('p', { class: 'muted', style: 'margin:0;white-space:pre-line' }, t('push.st.' + st));
    return el('div', { class: 'card' }, el('h3', {}, t('push.title')), body);
  }

  // ============================================================ boot
  (async function boot() {
    if (state.token) {
      try { const r = await api('GET', '/api/me'); state.me = r.user; enterTown(); return; }
      catch (e) {
        if (e.status === 401 || e.status === 403) { store.del('lp258_token'); state.token = null; if (e.status === 403) toast(e.message, 'bad', 5000); }
        else toast(t('err.offline'), 'bad');
      }
    }
    showJoin();
  })();
})();
