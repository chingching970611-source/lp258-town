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
  function dialog({ text, input = false, value = '', okText, danger = false }) {
    return new Promise((resolve) => {
      const inp = input ? el('input', { class: 'inp', value }) : null;
      const ov = el('div', { class: 'modal dlg' });
      const done = (v) => { ov.remove(); resolve(v); };
      const ok = el('button', { class: 'btn ' + (danger ? 'red' : 'primary'), onclick: () => done(input ? inp.value : true) }, okText || t('dlg.ok'));
      ov.append(el('div', { class: 'modal-card dlg-card' }, el('p', { class: 'dlg-text' }, text), inp,
        el('div', { class: 'dlg-acts' }, el('button', { class: 'btn ghost', onclick: () => done(input ? null : false) }, t('dlg.cancel')), ok)));
      ov.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Escape') done(input ? null : false); if (e.key === 'Enter' && !e.isComposing) done(input ? inp.value : true); });
      ov.addEventListener('pointerdown', (e) => { if (e.target === ov) done(input ? null : false); });
      document.body.append(ov);
      (inp || ok).focus();
    });
  }
  const askConfirm = (text, danger = false) => dialog({ text, danger, okText: danger ? t('dlg.delete') : t('dlg.ok') });
  const askText = (text, value = '') => dialog({ text, input: true, value });
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
  async function load() {
    data = await api('GET', '/api/admin/overview');
    const sn = data.settings && data.settings.season;
    Avatar.season = Season.ORDER.includes(sn) ? sn : Season.fromDate();
    render();
  }
  const fileUrl = (id) => `/api/file/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
  const money = (n) => (Number(n) % 1 ? Number(n).toFixed(2) : String(Number(n)));
  const cur = () => (data && data.settings && data.settings.currency) || 'RM';
  setInterval(() => {
    if (token && data && $('#modal').classList.contains('hidden') && ['overview', 'review', 'users'].includes(tab) && !document.hidden) load().catch(() => {});
  }, 10000);

  // ---------------------------------------------------------- schemas
  const COLS = {
    events: {
      icon: '📍',
      fields: [
        { k: 'title', l: 'ad.f.title', t: 'text' }, { k: 'titleEn', l: 'ad.f.title', t: 'text', en: true }, { k: 'tbc', l: 'ad.f.tbc', t: 'tbc', def: false }, { k: 'date', l: 'ad.f.date', t: 'datetime' }, { k: 'endDate', l: 'ad.f.endDate', t: 'datetime' },
        { k: 'fee', l: 'ad.f.fee', t: 'number', def: 0, step: '0.01' }, { k: 'capacity', l: 'ad.f.capacity', t: 'number', def: 0 },
        { k: 'payDeadline', l: 'ad.f.payDeadline', t: 'datetime' }, { k: 'payInfo', l: 'ad.f.payInfo', t: 'textarea', rows: 2 }, { k: 'qrFile', l: 'ad.f.qr', t: 'qr' },
        { k: 'venue', l: 'ad.f.venue', t: 'text' }, { k: 'address', l: 'ad.f.address', t: 'text' }, { k: 'content', l: 'ad.f.content', t: 'textarea' }, { k: 'contentEn', l: 'ad.f.content', t: 'textarea', en: true },
        { k: 'record', l: 'ad.f.record', t: 'textarea' }, { k: 'recordEn', l: 'ad.f.record', t: 'textarea', en: true },
      ],
      cols: [['title', 'ad.h.event'], ['date', 'ad.h.time', (v, it) => (it.tbc ? '✨ ' + t('ad.tbc') : fmt(v))], ['fee', 'ad.h.fee', (v) => (Number(v) > 0 ? cur() + ' ' + money(v) : t('ad.free'))],
        ['attendees', 'ad.h.attendees', (v, it) => attSummaryShort(it)], ['updatedAt', 'ad.h.updated', (v) => (v ? ago(v) : '—')]],
    },
    polls: {
      icon: '🗳️',
      fields: [{ k: 'question', l: 'ad.f.pollQ', t: 'textarea' }, { k: 'questionEn', l: 'ad.f.pollQ', t: 'textarea', en: true, rows: 2 }, { k: 'options', l: 'ad.f.pollOptions', t: 'pollopts' }, { k: 'closesAt', l: 'ad.f.closesAt', t: 'datetime' }],
      cols: [['question', 'ad.h.question'], ['counts', 'ad.h.votes', (v, it) => it.options.map((o, i) => `${o}: ${v[i]}`).join('\n')], ['closesAt', 'ad.f.closesAt', (v) => (v ? fmt(v) : '—')]],
    },
    quiz: {
      icon: '❓',
      fields: [{ k: 'question', l: 'ad.f.question', t: 'textarea' }, { k: 'questionEn', l: 'ad.f.question', t: 'textarea', en: true, rows: 2 }, { k: 'options', l: 'ad.f.options', t: 'options' }, { k: 'points', l: 'ad.f.points', t: 'number', def: 10 }],
      cols: [['question', 'ad.h.question'], ['options', 'ad.h.answer', (v, it) => v[it.answer]], ['points', 'ad.h.points']],
    },
    riddles: {
      icon: '🧩',
      fields: [{ k: 'question', l: 'ad.f.riddleQ', t: 'textarea' }, { k: 'questionEn', l: 'ad.f.riddleQ', t: 'textarea', en: true, rows: 2 }, { k: 'answer', l: 'ad.f.riddleA', t: 'text' }, { k: 'hint', l: 'ad.f.hint', t: 'text' }, { k: 'hintEn', l: 'ad.f.hint', t: 'text', en: true }, { k: 'points', l: 'ad.f.points', t: 'number', def: 15 }],
      cols: [['question', 'ad.h.riddle'], ['answer', 'ad.h.riddleA'], ['points', 'ad.h.points']],
    },
    challenges: {
      icon: '🏅',
      fields: [{ k: 'title', l: 'ad.f.chTitle', t: 'text' }, { k: 'titleEn', l: 'ad.f.chTitle', t: 'text', en: true }, { k: 'description', l: 'ad.f.chDesc', t: 'textarea' }, { k: 'descriptionEn', l: 'ad.f.chDesc', t: 'textarea', en: true, rows: 2 }, { k: 'points', l: 'ad.f.points', t: 'number', def: 30 }, { k: 'active', l: 'ad.f.active', t: 'bool', def: true }],
      cols: [['title', 'ad.h.challenge'], ['points', 'ad.h.points'], ['active', 'ad.h.status', (v) => (v !== false ? t('ad.open') : t('ad.closed'))]],
    },
  };
  const colName = (col) => t('ad.col.' + col);

  // ---------------------------------------------------------- render
  const TABS = ['overview', 'events', 'polls', 'quiz', 'riddles', 'challenges', 'review', 'users', 'announce', 'chat', 'trash', 'settings'];
  function attSummaryShort(ev) {
    const a = ev.attendees || [];
    if (!(Number(ev.fee) > 0)) return t('ad.att.free', { n: a.length }) + (ev.capacity ? ` / ${ev.capacity}` : '');
    const c = (st) => a.filter((x) => x.status === st).length;
    return t('ad.att.summary', { n: a.length, paid: c('paid'), sub: c('submitted'), unpaid: c('unpaid') }) + (ev.capacity ? ` / ${ev.capacity}` : '');
  }
  function render() {
    const pending = data.submissions.filter((s) => s.status === 'pending').length + (data.pendingPayments || 0);
    $('#tabs').replaceChildren(...TABS.map((id) => el('button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; render(); } }, t('ad.tab.' + id),
      id === 'review' && pending - (data.pendingPayments || 0) ? el('b', { class: 'badge' }, pending - (data.pendingPayments || 0)) : null,
      id === 'events' && data.pendingPayments ? el('b', { class: 'badge' }, data.pendingPayments) : null,
      id === 'users' && (data.pinRequests || []).length ? el('b', { class: 'badge' }, data.pinRequests.length) : null)));
    const main = $('#main');
    main.replaceChildren();
    if (tab === 'overview') main.append(renderOverview());
    else if (COLS[tab]) main.append(renderCrud(tab));
    else if (tab === 'review') main.append(renderReview());
    else if (tab === 'users') main.append(renderUsers());
    else if (tab === 'announce') main.append(renderAnnounce());
    else if (tab === 'settings') main.append(renderSettings());
    else if (tab === 'chat') main.append(renderChat());
    else if (tab === 'trash') main.append(renderTrash());
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
        el('div', { class: 'stat', style: 'cursor:pointer', onclick: () => go('users') }, el('b', {}, data.users.filter((u) => u.signedIn).length + ' / ' + data.users.length), t('ad.stat.signedIn')),
        el('div', { class: 'stat' }, el('b', {}, upcoming.length), t('ad.stat.upcoming')),
        el('div', { class: 'stat', style: pending ? 'background:#FFF3C4' : '' }, el('b', {}, pending), t('ad.stat.pending')),
        el('div', { class: 'stat', style: data.pendingPayments ? 'background:#EFE6FF;cursor:pointer' : '', onclick: () => go('events') }, el('b', {}, data.pendingPayments || 0), t('ad.stat.payments'))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.quick')), el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('ad.quickHint')),
        el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap' },
          ['events', 'polls', 'quiz', 'riddles', 'challenges'].map((c) => el('button', { class: 'btn small primary', onclick: () => editItem(c, null) }, t('ad.add', { what: colName(c) }))),
          el('button', { class: 'btn small blue', onclick: () => go('announce') }, t('ad.publish')),
          el('button', { class: 'btn small', onclick: () => go('users') }, t('ad.tab.users')))),
      data.live ? el('div', { class: 'card', style: 'background:#EFE6FF' }, t('ad.liveNow', { q: data.live.question, n: data.live.count })) : null,
      data.lastLive ? el('div', { class: 'card' }, t('ad.lastLive', { q: data.lastLive.question, c: data.lastLive.correctCount, t: data.lastLive.total }) + (data.lastLive.winners[0] ? t('ad.lastLiveFirst', { name: data.lastLive.winners[0] }) : '')) : null,
      el('div', { class: 'card' }, el('h3', {}, t('ad.onlineMembers')),
        online.length ? online.map((u) => el('span', { class: 'tag', style: 'margin:2px' }, u.nickname)) : el('span', { class: 'muted' }, t('ad.nobody'))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.nextEvent')),
        upcoming[0] ? el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap' },
          el('div', { style: 'flex:1;min-width:200px' }, el('b', {}, upcoming[0].title), el('div', { class: 'muted' }, t('ad.nextEventLine', { date: fmt(upcoming[0].date), venue: upcoming[0].venue || '', n: (upcoming[0].attendees || []).length }))),
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
        col === 'events' ? el('button', { class: 'btn small' + ((it.attendees || []).some((x) => x.status === 'submitted') ? ' yellow' : ''), onclick: () => showAttendees(it.id) }, '👥 ' + (it.attendees || []).length) : null,
        el('button', { class: 'btn small blue', onclick: () => editItem(col, it) }, t('ad.edit')),
        el('button', { class: 'btn small ghost', onclick: () => delItem(col, it) }, t('ad.delete')))));
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, `${S.icon} ${t('ad.tab.' + col).replace(/^\S+\s/, '')}（${list.length}）`), el('button', { class: 'btn primary', onclick: () => editItem(col, null) }, t('ad.add', { what: colName(col) }))),
      col === 'quiz' ? el('p', { class: 'muted' }, t('ad.quizHint')) : null,
      col === 'events' ? el('p', { class: 'muted' }, t('ad.eventHint')) : null,
      col === 'polls' ? el('p', { class: 'muted' }, t('ad.pollHint')) : null,
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
      if (f.t === 'textarea') input = el('textarea', { class: 'inp' + (f.en ? ' en-field' : ''), rows: f.rows || (f.en ? 2 : 4), value: v || '', placeholder: f.en ? t('ad.enPh') : '' });
      else if (f.t === 'qr') {
        const preview = el('img', { class: 'qr-preview' + (v ? '' : ' hidden'), src: v ? fileUrl(v) : '', alt: '' });
        const fileIn = el('input', { type: 'file', accept: 'image/*', class: 'hidden' });
        const removeBtn = el('button', { class: 'btn small ghost' + (v ? '' : ' hidden'), type: 'button' }, t('ad.f.qrRemove'));
        input = el('div', { class: 'qr-field' }, preview, el('div', { style: 'display:flex;gap:6px' }, el('button', { class: 'btn small', type: 'button', onclick: () => fileIn.click() }, t('ad.f.qrPick')), removeBtn), fileIn);
        input.state = { image: null, remove: false };
        fileIn.onchange = async () => {
          const fl = fileIn.files && fileIn.files[0]; if (!fl) return;
          input.state.image = await shrink(fl, 900, 0.9); input.state.remove = false;
          preview.src = input.state.image; preview.classList.remove('hidden'); removeBtn.classList.remove('hidden');
        };
        removeBtn.onclick = () => { input.state = { image: null, remove: true }; preview.classList.add('hidden'); removeBtn.classList.add('hidden'); };
      }
      else if (f.t === 'pollopts') {
        const opts = (it && it.options) || ['', '', '', ''], optsEn = (it && it.optionsEn) || [];
        input = el('div', {}, [0, 1, 2, 3, 4, 5].map((i) => el('div', { class: 'opt-row' }, el('b', {}, String(i + 1)),
          el('input', { class: 'inp opt-zh', value: opts[i] || '', placeholder: i < 2 ? t('ad.f.optReq') : t('ad.f.optOpt') }),
          el('input', { class: 'inp opt-en', value: optsEn[i] || '', placeholder: 'English' }))));
      }
      else if (f.t === 'datetime') input = el('input', { class: 'inp', type: 'datetime-local', value: toLocalInput(v) });
      else if (f.t === 'number') input = el('input', { class: 'inp', type: 'number', min: 0, step: f.step || '1', value: v ?? 0 });
      else if (f.t === 'bool') input = el('select', { class: 'inp' }, el('option', { value: 'true', selected: v !== false }, t('ad.open')), el('option', { value: 'false', selected: v === false }, t('ad.closed')));
      else if (f.t === 'tbc') input = el('select', { class: 'inp' }, el('option', { value: 'false', selected: !v }, t('ad.tbcNo')), el('option', { value: 'true', selected: !!v }, t('ad.tbcYes')));
      else if (f.t === 'options') {
        const opts = (it && it.options) || ['', '', '', ''], optsEn = (it && it.optionsEn) || [];
        const ans = it ? it.answer : 0;
        input = el('div', {}, [0, 1, 2, 3].map((i) => el('div', { class: 'opt-row' },
          el('input', { type: 'radio', name: 'ans', value: i, checked: i === ans }),
          el('b', {}, 'ABCD'[i]),
          el('input', { class: 'inp opt-zh', value: opts[i] || '', placeholder: i < 2 ? t('ad.f.optReq') : t('ad.f.optOpt') }),
          el('input', { class: 'inp opt-en', value: optsEn[i] || '', placeholder: 'English' }))));
      } else input = el('input', { class: 'inp' + (f.en ? ' en-field' : ''), value: v || '', placeholder: f.en ? t('ad.enPh') : '' });
      inputs[f.k] = { f, input };
      form.append(el('label', { class: f.en ? 'en-label' : '' }, f.en ? '🇬🇧 ' + t(f.l, { cur: cur() }).replace(/\s*\*\s*$/, '').replace(/ \*/, '') + ' · English' : t(f.l, { cur: cur() })), input);
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
          else if (f.t === 'bool' || f.t === 'tbc') item[k] = input.value === 'true';
          else if (f.t === 'qr') { if (input.state.image) item.qrImage = input.state.image; if (input.state.remove) item.removeQr = true; }
          else if (f.t === 'pollopts') {
            const zh = [...input.querySelectorAll('.opt-zh')].map((x) => x.value.trim()), en = [...input.querySelectorAll('.opt-en')].map((x) => x.value.trim());
            const keep = zh.map((tx, i) => i).filter((i) => zh[i]);
            item.options = keep.map((i) => zh[i]); item.optionsEn = keep.map((i) => en[i] || '');
          }
          else if (f.t === 'options') {
            const texts = [...input.querySelectorAll('.opt-zh')].map((x) => x.value.trim());
            const textsEn = [...input.querySelectorAll('.opt-en')].map((x) => x.value.trim());
            const chosen = Number((input.querySelector('input[type=radio]:checked') || {}).value || 0);
            if (!texts[chosen]) { err.textContent = t('ad.f.ansBlank'); return; }
            const kept = texts.map((tx, i) => ({ tx, i })).filter((x) => x.tx);
            item.options = kept.map((x) => x.tx);
            item.optionsEn = kept.map((x) => textsEn[x.i] || '');
            item.answer = kept.findIndex((x) => x.i === chosen);
          } else item[k] = input.value;
        }
        try { await api('POST', '/api/admin/save', { col, item }); closeModal(); toast(t('ad.saved'), 'good'); load(); }
        catch (e) { err.textContent = e.message; }
      } }, t('ad.save'))));
    openModal(form);
  }
  async function delItem(col, it) {
    if (!await askConfirm(t('ad.confirmDelete', { name: it.title || it.question }), true)) return;
    try { await api('POST', '/api/admin/delete', { col, id: it.id }); closeModal(); toast(t('ad.deleted')); load(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function startLive(q) {
    const secs = await askText(t('ad.livePrompt', { q: q.question }), '20');
    if (secs === null) return;
    try { await api('POST', '/api/admin/live/start', { quizId: q.id, seconds: Number(secs) }); toast(t('ad.liveSent'), 'good'); setTimeout(load, 500); }
    catch (e) { toast(e.message, 'bad'); }
  }
  async function remind(ev) {
    try { const r = await api('POST', '/api/admin/remind', { id: ev.id }); toast(t('ad.reminded', r), 'good'); }
    catch (e) { toast(e.message, 'bad'); }
  }
  function shrink(fileObj, maxSide, quality) {
    return new Promise((resolve, reject) => {
      const img = new Image(), url = URL.createObjectURL(fileObj);
      img.onload = () => {
        const k = Math.min(1, maxSide / Math.max(img.width, img.height));
        const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url); resolve(c.toDataURL('image/png')); // PNG keeps QR codes sharp
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(t('err.bad_image'))); };
      img.src = url;
    });
  }
  async function setAttendance(ev, a, status) {
    let note;
    if (status === 'unpaid') { note = await askText(t('ad.att.rejectPrompt'), ''); if (note === null) return; }
    if (status === 'remove' && !await askConfirm(t('ad.att.removeConfirm', { name: a.nickname }), true)) return;
    try { await api('POST', '/api/admin/attendance', { eventId: ev.id, userId: a.userId, status, note }); toast(t('ad.updated'), 'good'); await load(); showAttendees(ev.id); }
    catch (e) { toast(e.message, 'bad'); }
  }
  function showAttendees(eventId) {
    const ev = data.events.find((x) => x.id === eventId);
    if (!ev) return closeModal();
    const paidEv = Number(ev.fee) > 0;
    const list = ev.attendees || [];
    const order = { submitted: 0, unpaid: 1, paid: 2, going: 3 };
    const rows = [...list].sort((x, y) => order[x.status] - order[y.status]).map((a) => el('div', { class: 'att-row ' + a.status },
      el('div', { style: 'flex:1;min-width:160px' }, el('b', {}, a.nickname), ' ', el('span', { class: 'tag ' + ({ submitted: 'p', unpaid: 'r', paid: 'g', going: 'g' }[a.status]) }, t('ad.att.' + a.status)),
        el('div', { class: 'muted' }, [t('ad.att.joined', { date: fmt(new Date(a.joinedAt || Date.now()).toISOString()) }),
          a.submittedAt ? '📤 ' + fmt(new Date(a.submittedAt).toISOString()) : '', a.paidAt ? '✅ ' + fmt(new Date(a.paidAt).toISOString()) : '',
          paidEv && a.status === 'unpaid' ? t('ad.att.reminders', { n: a.reminders || 0 }) : '', a.note ? '“' + a.note + '”' : ''].filter(Boolean).join(' · '))),
      a.proofFile ? el('a', { href: fileUrl(a.proofFile), target: '_blank', rel: 'noopener' }, el('img', { class: 'proof-thumb', src: fileUrl(a.proofFile), alt: t('ad.att.viewProof'), title: t('ad.att.viewProof') })) : null,
      el('div', { class: 'acts', style: 'display:flex;gap:4px;flex-wrap:wrap' },
        paidEv && a.status === 'submitted' ? el('button', { class: 'btn small green', onclick: () => setAttendance(ev, a, 'paid') }, t('ad.att.confirm')) : null,
        paidEv && a.status === 'submitted' ? el('button', { class: 'btn small ghost', onclick: () => setAttendance(ev, a, 'unpaid') }, t('ad.att.reject')) : null,
        paidEv && a.status === 'unpaid' ? el('button', { class: 'btn small', onclick: () => setAttendance(ev, a, 'paid') }, t('ad.att.markPaid')) : null,
        el('button', { class: 'btn small ghost', onclick: () => setAttendance(ev, a, 'remove') }, t('ad.att.remove')))));
    openModal(el('div', { class: 'att-modal' },
      el('h2', { style: 'margin-top:0' }, t('ad.att.title', { title: ev.title })),
      el('p', { class: 'muted' }, attSummaryShort(ev) + (paidEv ? ' · ' + cur() + ' ' + money(ev.fee) : '')),
      rows.length ? rows : el('p', {}, t('ad.nobodyYet')),
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

  let userFilter = 'all';
  function pinRequestsCard() {
    const reqs = data.pinRequests || [];
    if (!reqs.length) return null;
    return el('div', { class: 'card', style: 'background:#FFF3C4' }, el('h3', {}, t('ad.pinReqTitle', { n: reqs.length })),
      el('p', { class: 'muted', style: 'margin:0 0 6px' }, t('ad.pinReqHint')),
      reqs.map((r) => el('div', { class: 'att-row' },
        el('div', { style: 'flex:1;min-width:180px' }, el('b', {}, r.nickname), r.exists ? null : el('span', { class: 'tag r', style: 'margin-left:6px' }, t('ad.pinReqUnknown')),
          el('div', { class: 'muted' }, [r.contact ? '📱 ' + r.contact : '', ago(r.at)].filter(Boolean).join(' · '))),
        r.exists ? el('button', { class: 'btn small primary', onclick: async () => {
          try { const res = await api('POST', '/api/admin/pinrequest', { id: r.id, action: 'reset' }); await load(); showPins([{ nickname: r.nickname, pin: res.pin }], t('ad.pinReqDoneTitle')); }
          catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.pinReqReset')) : null,
        el('button', { class: 'btn small ghost', onclick: async () => { try { await api('POST', '/api/admin/pinrequest', { id: r.id, action: 'dismiss' }); load(); } catch (e) { toast(e.message, 'bad'); } } }, t('ad.pinReqDismiss')))));
  }
  function showPins(rows, title) {
    const lines = rows.filter((r) => r.pin).map((r) => `${r.nickname}  PIN: ${r.pin}`);
    const shareText = t('ad.shareIntro', { url: location.origin }) + '\n' + lines.join('\n');
    openModal(el('div', {},
      el('h2', { style: 'margin-top:0' }, title),
      el('p', { class: 'muted' }, t('ad.pinsHint')),
      el('div', { class: 'tbl-wrap' }, el('table', {}, el('tbody', {}, rows.map((r) => el('tr', {},
        el('td', {}, el('b', {}, r.nickname)),
        el('td', {}, r.pin ? el('span', { class: 'pin-show' }, r.pin) : el('span', { class: 'tag r' }, t('err.' + r.error) !== 'err.' + r.error ? t('err.' + r.error) : r.error))))))),
      el('textarea', { class: 'inp', rows: Math.min(8, lines.length + 2), readOnly: true, value: shareText, style: 'margin-top:10px;font-size:13px' }),
      el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:10px' },
        el('button', { class: 'btn', onclick: () => { navigator.clipboard && navigator.clipboard.writeText(shareText).then(() => toast(t('ad.copied'), 'good')); } }, t('ad.copyAll')),
        el('button', { class: 'btn primary', onclick: closeModal }, t('close')))));
  }
  function addMembers() {
    const one = el('input', { class: 'inp', maxLength: 16, placeholder: t('ad.addOnePh') });
    const pin = el('input', { class: 'inp pin-input', inputmode: 'numeric', maxLength: 4, placeholder: t('ad.pinAuto') });
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); });
    const many = el('textarea', { class: 'inp', rows: 6, placeholder: t('ad.addManyPh') });
    const err = el('p', { class: 'err' });
    const submit = async (names, p) => {
      err.textContent = '';
      if (!names.length) { err.textContent = t('err.nick_required'); return; }
      if (p && !/^\d{4}$/.test(p)) { err.textContent = t('err.pin_format'); return; }
      try { const r = await api('POST', '/api/admin/user/create', { names, pin: p || undefined }); await load(); showPins(r.results, t('ad.addedTitle', { n: r.results.filter((x) => x.pin).length })); }
      catch (e) { err.textContent = e.message; }
    };
    openModal(el('div', { class: 'form' },
      el('h2', { style: 'margin:0' }, t('ad.addMembersTitle')),
      el('p', { class: 'muted' }, t('ad.addMembersHint')),
      el('label', {}, t('ad.addOne')), el('div', { style: 'display:flex;gap:8px' }, one, el('div', { style: 'width:130px;flex:none' }, pin)),
      el('button', { class: 'btn primary small', style: 'margin-top:6px', onclick: () => submit([one.value.trim()].filter(Boolean), pin.value) }, t('ad.addOneBtn')),
      el('label', { style: 'margin-top:16px' }, t('ad.addMany')), many,
      el('button', { class: 'btn blue small', style: 'margin-top:6px', onclick: () => submit(many.value.split(/[\n,，、]+/).map((x) => x.trim()).filter(Boolean)) }, t('ad.addManyBtn')),
      err,
      el('div', { style: 'text-align:right;margin-top:10px' }, el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')))));
  }
  function renderUsers() {
    const all = data.users;
    const weekAgo = Date.now() - 7 * 864e5;
    const counts = {
      all: all.length,
      signed: all.filter((u) => u.signedIn).length,
      never: all.filter((u) => !u.signedIn).length,
      active: all.filter((u) => u.online || (u.lastSeen && u.lastSeen > weekAgo)).length,
      nopin: all.filter((u) => !u.hasPin).length,
      dup: all.filter((u) => u.duplicate).length,
    };
    const pass = { all: () => true, signed: (u) => u.signedIn, never: (u) => !u.signedIn, active: (u) => u.online || (u.lastSeen && u.lastSeen > weekAgo), nopin: (u) => !u.hasPin, dup: (u) => u.duplicate };
    const list = all.filter(pass[userFilter] || pass.all).sort((a, b) => (userFilter === 'dup' ? a.nickname.localeCompare(b.nickname) : 0));
    const stat = (k, cls) => el('div', { class: 'stat' + (userFilter === k ? ' on' : ''), style: 'cursor:pointer', onclick: () => { userFilter = k; render(); } }, el('b', { class: cls || '' }, counts[k]), t('ad.uf.' + k));
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.usersTitle', { n: all.length })), el('button', { class: 'btn primary', onclick: addMembers }, t('ad.addMembersBtn'))),
      pinRequestsCard(),
      el('div', { class: 'stats user-stats' }, stat('all'), stat('signed'), stat('never'), stat('active'), counts.nopin ? stat('nopin') : null, counts.dup ? stat('dup') : null),
      userFilter === 'dup' ? el('p', { class: 'muted' }, t('ad.dupFilterHint')) : null,
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['', 'ad.h.nick', 'ad.h.signIn', 'ad.h.job', 'ad.h.points', 'ad.h.lastSeen', ''].map((h) => el('th', {}, h ? t(h) : '')))),
        el('tbody', {}, list.map((u) => el('tr', { style: u.banned ? 'opacity:.5' : '' },
          el('td', {}, el('img', { class: 'mini-av', src: Avatar.thumb(u.avatar, 34), alt: '' })),
          el('td', {}, el('b', {}, u.nickname), u.push ? el('span', { title: t('ad.pushOnHint') }, ' 🔔') : null, ' ', !u.hasPin ? el('span', { class: 'tag y', title: t('ad.noPinHint') }, t('ad.noPin')) : null, ' ', u.duplicate ? el('span', { class: 'tag r', title: t('ad.dupHint') }, t('ad.dup')) : null,
            u.status ? el('div', { class: 'muted' }, u.status) : null),
          el('td', {}, u.banned ? t('ad.banned') : !u.signedIn ? el('span', { class: 'tag' }, t('ad.neverSignedIn')) : u.online ? t('ad.online') : el('span', { class: 'tag g' }, t('ad.signedInOn', { date: fmt(new Date(u.firstLoginAt || u.createdAt).toISOString()).replace(/\s\S+$/, '') }))),
          el('td', {}, u.room ? jobLabel(u.room.type) : t('ad.noRoom')),
          el('td', {}, '⭐ ' + u.points),
          el('td', {}, u.online ? t('ad.now') : ago(u.lastSeen)),
          el('td', { class: 'acts' },
            el('button', { class: 'btn small blue', onclick: () => editUser(u) }, t('ad.edit')),
            el('button', { class: 'btn small ' + (u.banned ? 'green' : 'ghost'), onclick: async () => {
              if (!u.banned && !await askConfirm(t('ad.banConfirm', { name: u.nickname }), true)) return;
              setUser(u, { banned: !u.banned });
            } }, u.banned ? t('ad.unban') : t('ad.ban')),
            el('button', { class: 'btn small ghost', style: 'color:var(--red)', onclick: () => deleteUser(u) }, t('ad.delete'))))))))
        : el('div', { class: 'empty' }, t('ad.noUsers')));
  }
  function editUser(u) {
    const nick = el('input', { class: 'inp', value: u.nickname, maxLength: 16 });
    const status = el('input', { class: 'inp', value: u.status || '', maxLength: 40 });
    const pts = el('input', { class: 'inp', type: 'number', min: 0, value: u.points });
    const pin = el('input', { class: 'inp', type: 'text', inputmode: 'numeric', maxLength: 4, placeholder: u.hasPin ? t('ad.pinKeep') : t('ad.pinNone') });
    pin.addEventListener('input', () => { pin.value = pin.value.replace(/\D/g, '').slice(0, 4); });
    const others = data.users.filter((x) => x.id !== u.id);
    const mergeSel = el('select', { class: 'inp' }, el('option', { value: '' }, t('ad.mergePick')), others.map((x) => el('option', { value: x.id }, `${x.nickname} · ⭐ ${x.points}`)));
    const err = el('p', { class: 'err' });
    openModal(el('div', { class: 'form' },
      el('div', { style: 'display:flex;gap:10px;align-items:center' }, el('img', { class: 'mini-av', style: 'width:56px;height:56px', src: Avatar.thumb(u.avatar, 56), alt: '' }), el('h2', { style: 'margin:0' }, t('ad.editUser'))),
      el('label', {}, t('ad.h.nick')), nick,
      el('label', {}, t('ad.h.status')), status,
      el('label', {}, t('ad.h.points')), pts,
      el('label', {}, t('ad.pinReset')), pin,
      el('details', { class: 'merge-box' }, el('summary', {}, t('ad.mergeTitle')),
        el('p', { class: 'muted', style: 'margin:6px 0' }, t('ad.mergeHint', { name: u.nickname })), mergeSel,
        el('button', { class: 'btn small blue', style: 'margin-top:6px', onclick: async () => {
          const into = others.find((x) => x.id === mergeSel.value);
          if (!into) return;
          if (!await askConfirm(t('ad.mergeConfirm', { from: u.nickname, into: into.nickname }), true)) return;
          try { await api('POST', '/api/admin/user/merge', { fromId: u.id, intoId: into.id }); closeModal(); toast(t('ad.merged'), 'good'); load(); }
          catch (e) { err.textContent = e.message; }
        } }, t('ad.mergeBtn'))),
      err,
      el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap' },
        el('button', { class: 'btn ghost', style: 'margin-right:auto;color:var(--red)', onclick: () => deleteUser(u) }, t('ad.delete')),
        el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          if (pin.value && !/^\d{4}$/.test(pin.value)) { err.textContent = t('err.pin_format'); return; }
          try { await api('POST', '/api/admin/user', { id: u.id, nickname: nick.value, status: status.value, points: Number(pts.value), pin: pin.value || undefined }); closeModal(); toast(pin.value ? t('ad.pinResetDone', { name: nick.value, pin: pin.value }) : t('ad.saved'), 'good'); load(); }
          catch (e) { err.textContent = e.message; }
        } }, t('ad.save')))));
  }
  async function setUser(u, patch) {
    try { await api('POST', '/api/admin/user', { id: u.id, ...patch }); toast(t('ad.updated'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function deleteUser(u) {
    if (!await askConfirm(t('ad.userDeleteConfirm', { name: u.nickname }), true)) return;
    try { await api('POST', '/api/admin/user/delete', { id: u.id }); closeModal(); toast(t('ad.deleted')); load(); } catch (e) { toast(e.message, 'bad'); }
  }

  function renderAnnounce() {
    const ta = el('textarea', { class: 'inp', rows: 3, maxLength: 300, placeholder: t('ad.announcePh') });
    const taEn = el('textarea', { class: 'inp en-field', rows: 2, maxLength: 300, placeholder: '🇬🇧 ' + t('ad.enPh'), style: 'margin-top:6px' });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.announceTitle'))),
      el('div', { class: 'card' }, el('p', { class: 'muted', style: 'margin-top:0' }, t('ad.announceHint')),
        el('p', { class: 'muted', style: 'margin-top:0' }, '🔔 ', t('ad.pushInfo', { n: data.users.filter((u) => u.push).length, total: data.users.length }), ' ',
          el('button', { class: 'btn small', onclick: async () => { try { const r = await api('POST', '/api/admin/push/test'); toast(t('ad.pushTest', { n: r.sent }), r.sent ? 'good' : 'info', 4000); } catch (e) { toast(e.message, 'bad'); } } }, t('ad.pushTestBtn'))),
        ta, taEn,
        el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
          if (!ta.value.trim()) return;
          try { const r = await api('POST', '/api/admin/announce', { text: ta.value, textEn: taEn.value }); toast(t('ad.published') + (r.pushed ? ' · ' + t('ad.pushed', { n: r.pushed }) : ''), 'good', 4000); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.publish'))),
      data.announcements.map((a) => el('div', { class: 'card', style: 'display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap' },
        el('div', { style: 'flex:1;min-width:200px' }, a.text, a.textEn ? el('div', { class: 'muted' }, '🇬🇧 ' + a.textEn) : null, el('div', { class: 'muted' }, fmt(a.createdAt))),
        el('button', { class: 'btn small blue', onclick: () => editAnnounce(a) }, t('ad.edit')),
        el('button', { class: 'btn small ghost', onclick: async () => {
          if (!await askConfirm(t('ad.confirmDelete', { name: a.text.slice(0, 30) }), true)) return;
          try { await api('POST', '/api/admin/announce/delete', { id: a.id }); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.delete')))));
  }
  function editAnnounce(a) {
    const ta = el('textarea', { class: 'inp', rows: 4, maxLength: 300, value: a.text });
    const taEn = el('textarea', { class: 'inp en-field', rows: 3, maxLength: 300, value: a.textEn || '', placeholder: '🇬🇧 ' + t('ad.enPh'), style: 'margin-top:6px' });
    openModal(el('div', { class: 'form' }, el('h2', { style: 'margin:0 0 8px' }, t('ad.editAnnounce')), ta, taEn,
      el('div', { style: 'display:flex;gap:8px;justify-content:flex-end;margin-top:10px' },
        el('button', { class: 'btn ghost', onclick: closeModal }, t('ad.cancel')),
        el('button', { class: 'btn primary', onclick: async () => {
          try { await api('POST', '/api/admin/announce', { id: a.id, text: ta.value, textEn: taEn.value }); closeModal(); toast(t('ad.saved'), 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.save')))));
  }

  function renderChat() {
    const list = data.chat || [];
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.chatTitle'))),
      el('p', { class: 'muted' }, t('ad.chatHint')),
      list.length ? list.map((m) => el('div', { class: 'card', style: 'display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap' },
        el('div', { style: 'flex:1;min-width:200px' }, el('b', {}, m.name), ' ', el('span', { class: 'muted' }, fmt(new Date(m.at).toISOString())), el('div', { style: 'white-space:pre-wrap;margin-top:2px' }, m.text)),
        el('button', { class: 'btn small ghost', onclick: async () => {
          if (!await askConfirm(t('ad.chatDeleteConfirm', { text: m.text.slice(0, 60) }), true)) return;
          try { await api('POST', '/api/admin/chat/delete', { id: m.id }); toast(t('ad.deleted')); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, t('ad.delete')))) : el('div', { class: 'empty' }, t('ad.chatEmpty')));
  }
  let trashFilter = 'all';
  const trashName = (r) => { const it = r.item || {}; return it.title || it.question || it.nickname || (it.text ? it.text.slice(0, 60) : '') || '—'; };
  function renderTrash() {
    const all = data.trash || [];
    const cols = ['all', ...new Set(all.map((r) => r.col))];
    const list = trashFilter === 'all' ? all : all.filter((r) => r.col === trashFilter);
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.trashTitle', { n: all.length }))),
      el('p', { class: 'muted' }, t('ad.trashHint')),
      el('div', { class: 'cz-opts', style: 'margin-bottom:10px' }, cols.map((c) => el('button', { class: trashFilter === c ? 'on' : '', onclick: () => { trashFilter = c; render(); } }, c === 'all' ? t('ad.trash.all') : t('ad.trash.' + c)))),
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, el('th', {}, t('ad.h.status')), el('th', {}, t('ad.h.content')), el('th', {}, t('ad.h.time')), el('th', {}))),
        el('tbody', {}, list.map((r) => el('tr', {},
          el('td', {}, el('span', { class: 'tag' }, t('ad.trash.' + r.col))),
          el('td', { class: 'pre' }, trashName(r)),
          el('td', {}, t('ad.trash.deleted', { date: fmt(new Date(r.deletedAt).toISOString()) })),
          el('td', { class: 'acts' }, el('button', { class: 'btn small', onclick: () => viewRecord(r) }, t('ad.trash.view')))))))) : el('div', { class: 'empty' }, t('ad.trashEmpty')));
  }
  function viewRecord(r) {
    const it = r.item || {};
    const rows = [];
    const add = (label, value) => { if (value !== undefined && value !== null && value !== '') rows.push(el('div', { class: 'rec-row' }, el('b', {}, label), el('div', { class: 'pre' }, String(value)))); };
    if (r.col === 'events') {
      add(t('ad.h.event'), it.title); add(t('ad.h.time'), it.tbc ? t('ad.tbc') : fmt(it.date)); add(t('ad.f.venue'), it.venue); add(t('ad.f.address'), it.address);
      add(t('ad.h.fee'), Number(it.fee) > 0 ? cur() + ' ' + money(it.fee) : t('ad.free')); add(t('ad.f.content'), it.content); add(t('ad.f.record'), it.record);
    } else if (r.col === 'polls') {
      add(t('ad.h.question'), it.question);
      const counts = (it.options || []).map(() => 0); for (const v of Object.values(it.votes || {})) if (counts[v] !== undefined) counts[v]++;
      add(t('ad.h.votes'), (it.options || []).map((o, i) => o + ': ' + counts[i]).join('\n'));
    } else if (r.col === 'quiz') { add(t('ad.h.question'), it.question); add(t('ad.h.answer'), (it.options || [])[it.answer]); add(t('ad.h.points'), it.points); }
    else if (r.col === 'riddles') { add(t('ad.h.riddle'), it.question); add(t('ad.h.riddleA'), it.answer); add(t('ad.f.hint'), it.hint); }
    else if (r.col === 'challenges') { add(t('ad.h.challenge'), it.title); add(t('ad.f.chDesc'), it.description); add(t('ad.h.points'), it.points); }
    else if (r.col === 'users') { add(t('ad.h.nick'), it.nickname); add(t('ad.h.status'), it.status); add(t('ad.h.points'), it.points); add(t('ad.h.job'), it.room ? jobLabel(it.room.type) : ''); add(t('ad.h.lastSeen'), it.lastSeen ? fmt(new Date(it.lastSeen).toISOString()) : ''); }
    else if (r.col === 'announcements') add(t('ad.announceTitle'), it.text);
    else if (r.col === 'chat') { add(t('ad.h.member'), it.name); add(t('ad.h.time'), it.at ? fmt(new Date(it.at).toISOString()) : ''); add(t('ad.h.content'), it.text); }
    const att = (r.attendees || []).map((a) => el('div', { class: 'att-row ' + a.status },
      el('div', { style: 'flex:1' }, el('b', {}, a.nickname), ' ', el('span', { class: 'tag' }, t('ad.att.' + a.status)),
        a.paidAt ? el('div', { class: 'muted' }, '✅ ' + fmt(new Date(a.paidAt).toISOString())) : null),
      a.proofFile ? el('a', { href: fileUrl(a.proofFile), target: '_blank', rel: 'noopener' }, el('img', { class: 'proof-thumb', src: fileUrl(a.proofFile), alt: '' })) : null));
    openModal(el('div', { class: 'att-modal' },
      el('h2', { style: 'margin-top:0' }, t('ad.trash.' + r.col) + ' · ' + trashName(r)),
      el('div', { class: 'tag r', style: 'margin-bottom:10px' }, t('ad.trash.readonly')),
      el('p', { class: 'muted' }, t('ad.trash.deleted', { date: fmt(new Date(r.deletedAt).toISOString()) })),
      rows, att.length ? el('h3', {}, t('ad.h.attendees') + ' (' + att.length + ')') : null, att,
      el('div', { style: 'text-align:right;margin-top:12px' }, el('button', { class: 'btn', onclick: closeModal }, t('close')))));
  }

  function renderSettings() {
    const p1 = el('input', { class: 'inp', type: 'password', placeholder: t('ad.pwNew'), autocomplete: 'new-password' });
    const p2 = el('input', { class: 'inp', type: 'password', placeholder: t('ad.pwAgain'), autocomplete: 'new-password', style: 'margin-top:6px' });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, t('ad.settingsTitle'))),
      el('div', { class: 'card' }, el('h3', {}, t('me.lang')),
        el('div', { class: 'cz-opts' }, ['zh', 'en'].map((l) => el('button', { class: I18N.lang === l ? 'on' : '', onclick: () => { if (I18N.lang !== l) I18N.setLang(l); } }, t('lang.' + l))))),
      (() => {
        const ci = el('input', { class: 'inp', value: cur(), maxLength: 6, style: 'max-width:140px' });
        return el('div', { class: 'card' }, el('h3', {}, t('ad.currencyTitle')), el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('ad.currencyHint')),
          el('div', { style: 'display:flex;gap:8px;align-items:center;flex-wrap:wrap' }, ci,
            ['RM', 'HK$', 'SGD', 'USD'].map((c) => el('button', { class: 'btn small ghost', onclick: () => { ci.value = c; } }, c)),
            el('button', { class: 'btn primary small', onclick: async () => {
              try { const r = await api('POST', '/api/admin/settings', { currency: ci.value }); data.settings = r.settings; toast(t('ad.currencySaved'), 'good'); render(); } catch (e) { toast(e.message, 'bad'); }
            } }, t('ad.save'))));
      })(),
      el('div', { class: 'card' }, el('h3', {}, t('ad.seasonTitle')),
        el('p', { class: 'muted', style: 'margin:0 0 8px' }, t('ad.seasonHint')),
        el('div', { class: 'cz-opts' }, ['auto', 'spring', 'summer', 'autumn', 'winter'].map((sn) => el('button', {
          class: ((data.settings && data.settings.season) || 'auto') === sn ? 'on' : '',
          onclick: async () => {
            try { const r = await api('POST', '/api/admin/settings', { season: sn }); data.settings = r.settings; toast(t('ad.seasonSaved'), 'good'); render(); }
            catch (e) { toast(e.message, 'bad'); }
          },
        }, sn === 'auto' ? t('ad.seasonAuto') : Season.ICON[sn] + ' ' + t('season.' + sn))))),
      el('div', { class: 'card' }, el('h3', {}, t('ad.pwTitle')),
        data.passwordFromEnv ? el('p', { class: 'muted' }, t('ad.pwFromEnv'))
          : el('div', {}, p1, p2, el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
            if (p1.value !== p2.value) return toast(t('ad.pwMismatch'), 'bad');
            try { await api('POST', '/api/admin/password', { password: p1.value }); p1.value = p2.value = ''; toast(t('ad.pwChanged'), 'good'); } catch (e) { toast(e.message, 'bad'); }
          } }, t('ad.pwChange')))));
  }

  if (token) start().catch(() => showLogin()); else showLogin();
})();
