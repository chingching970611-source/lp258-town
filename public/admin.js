/* LP 258 主持人后台 / Host backend */
(() => {
  'use strict';
  const t = I18N.t;
  I18N.apply();
  document.querySelectorAll('.lang-btn').forEach((b) => { b.onclick = () => I18N.setLang(I18N.lang === 'zh' ? 'en' : 'zh'); });

  const $ = (s) => document.querySelector(s);
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
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
    del: (k) => { try { sessionStorage.removeItem(k); } catch {} },
  };
  let token = ss.get('lp258_admin');
  let data = null;
  let tab = 'overview';

  const errText = (key, params) => { const s = t('err.' + key, params); return s === 'err.' + key ? key : s; };
  async function api(method, url, body) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let d = null;
    try { d = await r.json(); } catch {}
    if (r.status === 401 && url !== '/api/admin/login') { showLogin(); throw new Error(t('err.admin_relogin')); }
    if (!r.ok) throw new Error(d && d.error ? errText(d.error, d.params) : t('err.network', { code: r.status }));
    return d;
  }
  function toast(s, type = '') { const n = el('div', { class: 'toast ' + type }, s); $('#toasts').append(n); setTimeout(() => n.remove(), 3500); }
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString(I18N.locale(), { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const ago = (ts) => {
    if (!ts) return '—';
    const m = Math.round((Date.now() - ts) / 60000);
    return m < 1 ? t('ad.ago.now') : m < 60 ? t('ad.ago.min', { n: m }) : m < 1440 ? t('ad.ago.hour', { n: Math.round(m / 60) }) : t('ad.ago.day', { n: Math.round(m / 1440) });
  };
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
  const jobLabel = (type) => { const j = (t('jobs') || {})[type]; return j ? `${Room.ICON[type]} ${j.name}` : t('ad.noRoom'); };
  function openModal(node) { $('#modalCard').replaceChildren(node); $('#modal').classList.remove('hidden'); }
  function closeModal() { $('#modal').classList.add('hidden'); }
  $('#modal').addEventListener('pointerdown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  // ---------------------------------------------------------- auth
  function showLogin() {
    token = null; ss.del('lp258_admin');
    $('#appView').classList.add('hidden');
    $('#loginView').classList.remove('hidden');
    setTimeout(() => $('#pw').focus(), 50);
  }
  async function login() {
    $('#loginErr').textContent = '';
    try {
      const r = await api('POST', '/api/admin/login', { password: $('#pw').value });
      token = r.token; ss.set('lp258_admin', token);
      $('#pw').value = '';
      start();
    } catch (e) { $('#loginErr').textContent = e.message; }
  }
  $('#loginBtn').onclick = login;
  $('#pw').onkeydown = (e) => { if (e.key === 'Enter') login(); };
  $('#logoutBtn').onclick = showLogin;
  $('#refreshBtn').onclick = () => load().then(() => toast(t('ad.refreshed')));
  async function start() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    await load();
  }
  async function load() { data = await api('GET', '/api/admin/overview'); render(); }
  setInterval(() => {
    if (token && data && $('#modal').classList.contains('hidden') && ['overview', 'review', 'users'].includes(tab) && !document.hidden) load().catch(() => {});
  }, 10000);

  // ---------------------------------------------------------- schemas
  const COLS = {
    events: {
      icon: '📍',
      fields: [
        { k: 'title', l: 'ad.f.title', t: 'text' }, { k: 'date', l: 'ad.f.date', t: 'datetime' }, { k: 'endDate', l: 'ad.f.endDate', t: 'datetime' },
        { k: 'venue', l: 'ad.f.venue', t: 'text' }, { k: 'address', l: 'ad.f.address', t: 'text' }, { k: 'content', l: 'ad.f.content', t: 'textarea' },
        { k: 'record', l: 'ad.f.record', t: 'textarea' },
      ],
      cols: [['title', 'ad.h.event'], ['date', 'ad.h.time', (v) => fmt(v)], ['venue', 'ad.h.venue'], ['rsvpNames', 'ad.h.going', (v) => t('ad.goingN', { n: v.length })]],
    },
    quiz: {
      icon: '❓',
      fields: [{ k: 'question', l: 'ad.f.question', t: 'textarea' }, { k: 'options', l: 'ad.f.options', t: 'options' }, { k: 'points', l: 'ad.f.points', t: 'number', def: 10 }],
      cols: [['question', 'ad.h.question'], ['options', 'ad.h.answer', (v, it) => v[it.answer]], ['points', 'ad.h.points']],
    },
    riddles: {
      icon: '🧩',
      fields: [{ k: 'question', l: 'ad.f.riddleQ', t: 'textarea' }, { k: 'answer', l: 'ad.f.riddleA', t: 'text' }, { k: 'hint', l: 'ad.f.hint', t: 'text' }, { k: 'points', l: 'ad.f.points', t: 'number', def: 15 }],
      cols: [['question', 'ad.h.riddle'], ['answer', 'ad.h.riddleA'], ['points', 'ad.h.points']],
    },
    challenges: {
      icon: '🏅',
      fields: [{ k: 'title', l: 'ad.f.chTitle', t: 'text' }, { k: 'description', l: 'ad.f.chDesc', t: 'textarea' }, { k: 'points', l: 'ad.f.points', t: 'number', def: 30 }, { k: 'active', l: 'ad.f.active', t: 'bool', def: true }],
      cols: [['title', 'ad.h.challenge'], ['points', 'ad.h.points'], ['active', 'ad.h.status', (v) => (v !== false ? t('ad.open') : t('ad.closed'))]],
    },
  };
  const colName = (col) => t('ad.col.' + col);

  // ---------------------------------------------------------- render
  const TABS = ['overview', 'events', 'quiz', 'riddles', 'challenges', 'review', 'users', 'announce', 'settings'];
  function render() {
    const pending = data.submissions.filter((s) => s.status === 'pending').length;
    $('#tabs').replaceChildren(...TABS.map((id) => el('button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; render(); } }, t('ad.tab.' + id),
      id === 'review' && pending ? el('b', { class: 'badge' }, pending) : null)));
    const main = $('#main');
    main.replaceChildren();
    if (tab === 'overview') main.append(renderOverview());
    else if (COLS[tab]) main.append(renderCrud(tab));
    else if (tab === 'review') main.append(renderReview());
    else if (tab === 'users') main.append(renderUsers());
    else if (tab === 'announce') main.append(renderAnnounce());
    else if (tab === 'settings') main.append(renderSettings());
  }
  const go = (id) => { tab = id; render(); };

  function renderOverview() {
    const now = Date.now();
    const upcoming = data.events.filter((e) => Date.parse(e.date) > now).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const pending = data.submissions.filter((s) => s.status === 'pending').length;
    const online = data.users.filter((u) => u.online);
    return el('div', {},
      el('div', { class: 'stats' },
        el('div', { class: 'stat' }, el('b', {}, data.onlineCount), t('ad.stat.online')),
        el('div', { class: 'stat' }, el('b', {}, data.users.length), t('ad.stat.users')),
        el('div', { class: 'stat' }, el('b', {}, upcoming.length), t('ad.stat.upcoming')),
        el('div', { class: 'stat', style: pending ? 'background:#FFF3C4' : '' }, el('b', {}, pending), t('ad.stat.pending'))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.quick')), el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('ad.quickHint')),
        el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
          ['events', 'quiz', 'riddles', 'challenges'].map((c) => el('button', { class: 'btn small primary', onclick: () => editItem(c, null) }, t('ad.add', { what: colName(c) }))),
          el('button', { class: 'btn small blue', onclick: () => go('announce') }, t('ad.publish')),
          el('button', { class: 'btn small', onclick: () => go('users') }, t('ad.tab.users')))),
      data.live ? el('div', { class: 'card', style: 'background:#EFE6FF' }, t('ad.liveNow', { q: data.live.question, n: data.live.count })) : null,
      data.lastLive ? el('div', { class: 'card' }, t('ad.lastLive', { q: data.lastLive.question, c: data.lastLive.correctCount, t: data.lastLive.total }) + (data.lastLive.winners[0] ? t('ad.lastLiveFirst', { name: data.lastLive.winners[0] }) : '')) : null,
      el('div', { class: 'card' }, el('h3', {}, t('ad.onlineMembers')),
        online.length ? online.map((u) => el('span', { class: 'tag', style: 'margin:2px' }, u.nickname)) : el('span', { class: 'muted' }, t('ad.nobody'))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.nextEvent')),
        upcoming[0] ? el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
          el('div', { style: 'flex:1;min-width:200px' }, el('b', {}, upcoming[0].title), el('div', { class: 'muted' }, t('ad.nextEventLine', { date: fmt(upcoming[0].date), venue: upcoming[0].venue || '', n: upcoming[0].rsvpNames.length }))),
          el('button', { class: 'btn small blue', onclick: () => editItem('events', upcoming[0]) }, t('ad.edit')))
          : el('span', { class: 'muted' }, t('ad.noEvent'))));
  }

  function renderCrud(col) {
    const S = COLS[col];
    const list = data[col];
    const rows = list.map((it) => el('tr', {},
      S.cols.map(([k, , f]) => el('td', { class: 'pre' }, f ? f(it[k], it) : String(it[k] ?? ''))),
      el('td', { class: 'acts' },
        col === 'quiz' ? el('button', { class: 'btn small yellow', onclick: () => startLive(it) }, t('ad.liveBtn')) : null,
        col === 'events' && Date.parse(it.date) > Date.now() ? el('button', { class: 'btn small yellow', onclick: () => remind(it) }, t('ad.remindBtn')) : null,
        col === 'events' ? el('button', { class: 'btn small', onclick: () => showRsvp(it) }, '👥') : null,
        el('button', { class: 'btn small blue', onclick: () => editItem(col, it) }, t('ad.edit')),
        el('button', { class: 'btn small ghost', onclick: () => delItem(col, it) }, t('ad.delete')))));
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, `${S.icon} ${t('ad.tab.' + col).replace(/^\S+\s/, '')}（${list.length}）`), el('button', { class: 'btn primary', onclick: () => editItem(col, null) }, t('ad.add', { what: colName(col) }))),
      col === 'quiz' ? el('p', { class: 'muted' }, t('ad.quizHint')) : null,
      col === 'events' ? el('p', { class: 'muted' }, t('ad.eventHint')) : null,
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, S.cols.map(([, l]) => el('th', {}, t(l))), el('th', {}))), el('tbody', {}, rows)))
        : el('div', { class: 'empty' }, t('ad.noData')));
  }

  function editItem(col, it) {
    const S = COLS[col];
    const inputs = {};
    const form = el('div', { class: 'form' }, el('h2', { style: 'margin:0' }, t(it ? 'ad.editTitle' : 'ad.addTitle', { what: colName(col) })));
    for (const f of S.fields) {
      const v = it ? it[f.k] : f.def;
      let input;
      if (f.t === 'textarea') input = el('textarea', { class: 'inp', rows: 4, value: v || '' });
      else if (f.t === 'datetime') input = el('input', { class: 'inp', type: 'datetime-local', value: toLocalInput(v) });
      else if (f.t === 'number') input = el('input', { class: 'inp', type: 'number', min: 0, value: v ?? 0 });
      else if (f.t === 'bool') input = el('select', { class: 'inp' }, el('option', { value: 'true', selected: v !== false }, t('ad.open')), el('option', { value: 'false', selected: v === false }, t('ad.closed')));
      else if (f.t === 'options') {
        const opts = (it && it.options) || ['', '', '', ''];
        const ans = it ? it.answer : 0;
        input = el('div', {}, [0, 1, 2, 3].map((i) => el('div', { class: 'opt-row' },
          el('input', { type: 'radio', name: 'ans', value: i, checked: i === ans }),
          el('b', {}, 'ABCD'[i]),
          el('input', { class: 'inp', value: opts[i] || '', placeholder: i < 2 ? t('ad.f.optReq') : t('ad.f.optOpt') }))));
      } else input = el('input', { class: 'inp', value: v || '' });
      inputs[f.k] = { f, input };
      form.append(el('label', {}, t(f.l)), input);
    }
    const err = el('p', { class: 'err' });
    form.append(err, el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap' },
      it ? el('button', { class: 'btn ghost', style: 'margin-right:auto;color:var(--red)', onclick: () => delItem(col, it) }, t('ad.delete')) : null,
      el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')),
      el('button', { class: 'btn primary', onclick: async () => {
        const item = it ? { id: it.id } : {};
        for (const [k, { f, input }] of Object.entries(inputs)) {
          if (f.t === 'datetime') item[k] = input.value ? new Date(input.value).toISOString() : '';
          else if (f.t === 'number') item[k] = Number(input.value);
          else if (f.t === 'bool') item[k] = input.value === 'true';
          else if (f.t === 'options') {
            const texts = [...input.querySelectorAll('.inp')].map((x) => x.value.trim());
            const chosen = Number((input.querySelector('input[type=radio]:checked') || {}).value || 0);
            if (!texts[chosen]) { err.textContent = t('ad.f.ansBlank'); return; }
            const kept = texts.map((tx, i) => ({ tx, i })).filter((x) => x.tx);
            item.options = kept.map((x) => x.tx);
            item.answer = kept.findIndex((x) => x.i === chosen);
          } else item[k] = input.value;
        }
        try { await api('POST', '/api/admin/save', { col, item }); closeModal(); toast(t('ad.saved'), 'good'); load(); }
        catch (e) { err.textContent = e.message; }
      } }, t('ad.save'))));
    openModal(form);
  }
  async function delItem(col, it) {
    if (!confirm(t('ad.confirmDelete', { name: it.title || it.question }))) return;
    try { await api('POST', '/api/admin/delete', { col, id: it.id }); closeModal(); toast(t('ad.deleted')); load(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function startLive(q) {
    const secs = prompt(t('ad.livePrompt', { q: q.question }), '20');
    if (secs === null) return;
    try { await api('POST', '/api/admin/live/start', { quizId: q.id, seconds: Number(secs) }); toast(t('ad.liveSent'), 'good'); setTimeout(load, 500); }
    catch (e) { toast(e.message, 'bad'); }
  }
  async function remind(ev) {
    try { const r = await api('POST', '/api/admin/remind', { id: ev.id }); toast(t('ad.reminded', r), 'good'); }
    catch (e) { toast(e.message, 'bad'); }
  }
  function showRsvp(ev) {
    openModal(el('div', {}, el('h2', { style: 'margin-top:0' }, `👥 ${ev.title}`), el('p', { class: 'muted' }, t('ad.rsvpTitle', { n: ev.rsvpNames.length })),
      ev.rsvpNames.length ? ev.rsvpNames.map((n) => el('span', { class: 'tag', style: 'margin:3px' }, n)) : el('p', {}, t('ad.nobodyYet')),
      el('div', { style: 'text-align:right;margin-top:12px' }, el('button', { class: 'btn', onclick: closeModal }, t('close')))));
  }

  function renderReview() {
    const list = [...data.submissions].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
    const cls = { pending: 'p', approved: 'g', rejected: 'r' };
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.reviewTitle'))),
      el('p', { class: 'muted' }, t('ad.reviewHint')),
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['ad.h.member', 'ad.h.challenge', 'ad.h.content', 'ad.h.time', 'ad.h.status', ''].map((h) => el('th', {}, h ? t(h) : '')))),
        el('tbody', {}, list.map((s) => el('tr', {},
          el('td', {}, s.nickname), el('td', {}, s.challenge), el('td', { class: 'pre' }, s.text), el('td', {}, ago(s.createdAt)),
          el('td', {}, el('span', { class: 'tag ' + cls[s.status] }, t('ad.st.' + s.status))),
          el('td', { class: 'acts' },
            s.status !== 'approved' ? el('button', { class: 'btn small green', onclick: () => review(s, 'approved') }, t('ad.approve')) : null,
            s.status !== 'rejected' ? el('button', { class: 'btn small ghost', onclick: () => review(s, 'rejected') }, s.status === 'approved' ? t('ad.revoke') : t('ad.reject')) : null))))))
        : el('div', { class: 'empty' }, t('ad.noSubs')));
  }
  async function review(s, status) {
    try { await api('POST', '/api/admin/submission', { id: s.id, status }); toast(t('ad.updated'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
  }

  function renderUsers() {
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.usersTitle', { n: data.users.length }))),
      data.users.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['', 'ad.h.nick', 'ad.h.job', 'ad.h.status', 'ad.h.points', 'ad.h.lastSeen', ''].map((h) => el('th', {}, h ? t(h) : '')))),
        el('tbody', {}, data.users.map((u) => el('tr', { style: u.banned ? 'opacity:.5' : '' },
          el('td', {}, el('img', { class: 'mini-av', src: Avatar.thumb(u.avatar, 34), alt: '' })),
          el('td', {}, el('b', {}, u.nickname), u.status ? el('div', { class: 'muted' }, u.status) : null),
          el('td', {}, u.room ? jobLabel(u.room.type) : t('ad.noRoom')),
          el('td', {}, u.banned ? t('ad.banned') : u.online ? t('ad.online') : t('ad.offline')),
          el('td', {}, '⭐ ' + u.points),
          el('td', {}, u.online ? t('ad.now') : ago(u.lastSeen)),
          el('td', { class: 'acts' },
            el('button', { class: 'btn small blue', onclick: () => editUser(u) }, t('ad.edit')),
            el('button', { class: 'btn small ' + (u.banned ? 'green' : 'ghost'), onclick: () => {
              if (!u.banned && !confirm(t('ad.banConfirm', { name: u.nickname }))) return;
              setUser(u, { banned: !u.banned });
            } }, u.banned ? t('ad.unban') : t('ad.ban')),
            el('button', { class: 'btn small ghost', onclick: () => deleteUser(u) }, t('ad.delete'))))))))
        : el('div', { class: 'empty' }, t('ad.noUsers')));
  }
  function editUser(u) {
    const nick = el('input', { class: 'inp', value: u.nickname, maxLength: 16 });
    const status = el('input', { class: 'inp', value: u.status || '', maxLength: 40 });
    const pts = el('input', { class: 'inp', type: 'number', min: 0, value: u.points });
    const err = el('p', { class: 'err' });
    openModal(el('div', { class: 'form' },
      el('div', { style: 'display:flex;gap:10px;align-items:center' }, el('img', { class: 'mini-av', style: 'width:56px;height:56px', src: Avatar.thumb(u.avatar, 56), alt: '' }), el('h2', { style: 'margin:0' }, t('ad.editUser'))),
      el('label', {}, t('ad.h.nick')), nick,
      el('label', {}, t('ad.h.status')), status,
      el('label', {}, t('ad.h.points')), pts,
      err,
      el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap' },
        el('button', { class: 'btn ghost', style: 'margin-right:auto;color:var(--red)', onclick: () => deleteUser(u) }, t('ad.delete')),
        el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          try { await api('POST', '/api/admin/user', { id: u.id, nickname: nick.value, status: status.value, points: Number(pts.value) }); closeModal(); toast(t('ad.saved'), 'good'); load(); }
          catch (e) { err.textContent = e.message; }
        } }, t('ad.save')))));
  }
  async function setUser(u, patch) {
    try { await api('POST', '/api/admin/user', { id: u.id, ...patch }); toast(t('ad.updated'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function deleteUser(u) {
    if (!confirm(t('ad.userDeleteConfirm', { name: u.nickname }))) return;
    try { await api('POST', '/api/admin/user/delete', { id: u.id }); closeModal(); toast(t('ad.deleted')); load(); } catch (e) { toast(e.message, 'bad'); }
  }

  function renderAnnounce() {
    const ta = el('textarea', { class: 'inp', rows: 3, maxLength: 300, placeholder: t('ad.announcePh') });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.announceTitle'))),
      el('div', { class: 'card' }, el('p', { class: 'muted', style: 'margin-top:0' }, t('ad.announceHint')), ta,
        el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
          if (!ta.value.trim()) return;
          try { await api('POST', '/api/admin/announce', { text: ta.value }); toast(t('ad.published'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.publish'))),
      data.announcements.map((a) => el('div', { class: 'card', style: 'display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap' },
        el('div', { style: 'flex:1;min-width:200px' }, a.text, el('div', { class: 'muted' }, fmt(a.createdAt))),
        el('button', { class: 'btn small blue', onclick: () => editAnnounce(a) }, t('ad.edit')),
        el('button', { class: 'btn small ghost', onclick: async () => {
          if (!confirm(t('ad.confirmDelete', { name: a.text.slice(0, 30) }))) return;
          try { await api('POST', '/api/admin/announce/delete', { id: a.id }); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.delete')))));
  }
  function editAnnounce(a) {
    const ta = el('textarea', { class: 'inp', rows: 4, maxLength: 300, value: a.text });
    openModal(el('div', { class: 'form' }, el('h2', { style: 'margin:0 0 8px' }, t('ad.editAnnounce')), ta,
      el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:10px' },
        el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          try { await api('POST', '/api/admin/announce', { id: a.id, text: ta.value }); closeModal(); toast(t('ad.saved'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.save')))));
  }

  function renderSettings() {
    const p1 = el('input', { class: 'inp', type: 'password', placeholder: t('ad.pwNew'), autocomplete: 'new-password' });
    const p2 = el('input', { class: 'inp', type: 'password', placeholder: t('ad.pwAgain'), autocomplete: 'new-password', style: 'margin-top:6px' });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.settingsTitle'))),
      el('div', { class: 'card' }, el('h3', {}, t('me.lang')),
        el('div', { class: 'cz-opts' }, ['zh', 'en'].map((l) => el('button', { class: I18N.lang === l ? 'on' : '', onclick: () => { if (I18N.lang !== l) I18N.setLang(l); } }, t('lang.' + l))))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.pwTitle')),
        data.passwordFromEnv ? el('p', { class: 'muted' }, t('ad.pwFromEnv'))
          : el('div', {}, p1, p2, el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
            if (p1.value !== p2.value) return toast(t('ad.pwMismatch'), 'bad');
            try { await api('POST', '/api/admin/password', { password: p1.value }); p1.value = p2.value = ''; toast(t('ad.pwChanged'), 'good'); } catch (e) { toast(e.message, 'bad'); }
          } }, t('ad.pwChange')))));
  }

  if (token) start().catch(() => showLogin()); else showLogin();
})();
