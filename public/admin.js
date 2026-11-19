/* LP 258 Host 後台 */
(() => {
  'use strict';
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

  async function api(method, url, body) {
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
    let d = null;
    try { d = await r.json(); } catch {}
    if (r.status === 401 && url !== '/api/admin/login') { showLogin(); throw new Error('請重新登入'); }
    if (!r.ok) throw new Error((d && d.error) || 'Error ' + r.status);
    return d;
  }
  function toast(t, type = '') { const n = el('div', { class: 'toast ' + type }, t); $('#toasts').append(n); setTimeout(() => n.remove(), 3500); }
  const fmt = (iso) => (iso ? new Date(iso).toLocaleString('zh-HK', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }) : '—');
  const ago = (ts) => { if (!ts) return '—'; const m = Math.round((Date.now() - ts) / 60000); return m < 1 ? '啱啱' : m < 60 ? `${m} 分鐘前` : m < 1440 ? `${Math.round(m / 60)} 個鐘前` : `${Math.round(m / 1440)} 日前`; };
  const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); return new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
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
  $('#refreshBtn').onclick = () => load().then(() => toast('已更新'));

  async function start() {
    $('#loginView').classList.add('hidden');
    $('#appView').classList.remove('hidden');
    await load();
  }
  async function load() {
    data = await api('GET', '/api/admin/overview');
    render();
  }
  setInterval(() => {
    if (token && data && $('#modal').classList.contains('hidden') && ['overview', 'review', 'users'].includes(tab) && !document.hidden) load().catch(() => {});
  }, 10000);

  // ---------------------------------------------------------- schemas
  const COLS = {
    events: {
      title: '活動', icon: '📍',
      fields: [
        { k: 'title', l: '活動名稱 *', t: 'text' },
        { k: 'date', l: '開始時間 *', t: 'datetime' },
        { k: 'endDate', l: '結束時間', t: 'datetime' },
        { k: 'venue', l: '場地 Venue', t: 'text' },
        { k: 'address', l: '地點 / 地址', t: 'text' },
        { k: 'content', l: '活動內容', t: 'textarea' },
        { k: 'record', l: '活動記錄（活動後填寫，會顯示喺「活動記錄」）', t: 'textarea' },
      ],
      cols: [['title', '活動'], ['date', '時間', (v) => fmt(v)], ['venue', '場地'], ['rsvpNames', '出席', (v) => `${v.length} 人`]],
    },
    quiz: {
      title: '問答題', icon: '❓',
      fields: [{ k: 'question', l: '題目 *', t: 'textarea' }, { k: 'options', l: '選項（揀正確答案）', t: 'options' }, { k: 'points', l: '積分', t: 'number', def: 10 }],
      cols: [['question', '題目'], ['options', '答案', (v, it) => v[it.answer]], ['points', '分']],
    },
    riddles: {
      title: '謎題', icon: '🧩',
      fields: [{ k: 'question', l: '謎面 *', t: 'textarea' }, { k: 'answer', l: '謎底 *（多個可接受答案用 | 分隔，例如：球門|龍門）', t: 'text' }, { k: 'hint', l: '提示', t: 'text' }, { k: 'points', l: '積分', t: 'number', def: 15 }],
      cols: [['question', '謎面'], ['answer', '謎底'], ['points', '分']],
    },
    challenges: {
      title: 'LP Challenge', icon: '🏅',
      fields: [{ k: 'title', l: '挑戰名稱 *', t: 'text' }, { k: 'description', l: '說明', t: 'textarea' }, { k: 'points', l: '積分', t: 'number', def: 30 }, { k: 'active', l: '開放中', t: 'bool', def: true }],
      cols: [['title', '挑戰'], ['points', '分'], ['active', '狀態', (v) => (v !== false ? '🟢 開放' : '⚪ 已關閉')]],
    },
  };

  // ---------------------------------------------------------- render
  const TABS = [['overview', '📊 概覽'], ['events', '📍 活動'], ['quiz', '❓ 問答'], ['riddles', '🧩 猜謎'], ['challenges', '🏅 LP Challenge'], ['review', '✅ 審核'], ['users', '👥 成員'], ['announce', '📢 公告'], ['settings', '⚙️ 設定']];
  function render() {
    const pending = data.submissions.filter((s) => s.status === 'pending').length;
    $('#tabs').replaceChildren(...TABS.map(([id, label]) => el('button', { class: tab === id ? 'on' : '', onclick: () => { tab = id; render(); } }, label,
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

  function renderOverview() {
    const now = Date.now();
    const upcoming = data.events.filter((e) => Date.parse(e.date) > now).sort((a, b) => Date.parse(a.date) - Date.parse(b.date));
    const pending = data.submissions.filter((s) => s.status === 'pending').length;
    const online = data.users.filter((u) => u.online);
    return el('div', {},
      el('div', { class: 'stats' },
        el('div', { class: 'stat' }, el('b', {}, data.onlineCount), '🟢 而家在綫'),
        el('div', { class: 'stat' }, el('b', {}, data.users.length), '👥 成員總數'),
        el('div', { class: 'stat' }, el('b', {}, upcoming.length), '🗓️ 即將舉行活動'),
        el('div', { class: 'stat', style: pending ? 'background:#FFF3C4' : '' }, el('b', {}, pending), '⏳ 待審核挑戰')),
      data.live ? el('div', { class: 'card', style: 'background:#EFE6FF' }, `⚡ 即時問答進行中：「${data.live.question}」— ${data.live.count} 人已作答`) : null,
      data.lastLive ? el('div', { class: 'card' }, el('b', {}, '上一場即時問答：'), `「${data.lastLive.question}」${data.lastLive.correctCount}/${data.lastLive.total} 人答啱`,
        data.lastLive.winners.length ? `，最快：${data.lastLive.winners[0]}` : '') : null,
      el('div', { class: 'card' }, el('h3', {}, '🟢 在綫成員'),
        online.length ? online.map((u) => el('span', { class: 'tag', style: 'margin:2px' }, u.nickname)) : el('span', { class: 'muted' }, '暫時冇人在綫')),
      el('div', { class: 'card' }, el('h3', {}, '🗓️ 下一個活動'),
        upcoming[0] ? el('div', {}, el('b', {}, upcoming[0].title), el('div', { class: 'muted' }, `${fmt(upcoming[0].date)} @ ${upcoming[0].venue || ''} · ${upcoming[0].rsvpNames.length} 人會出席`))
          : el('span', { class: 'muted' }, '未有活動 — 去「📍 活動」新增')));
  }

  function renderCrud(col) {
    const S = COLS[col];
    const list = data[col];
    const rows = list.map((it) => el('tr', {},
      S.cols.map(([k, , f]) => el('td', { class: 'pre' }, f ? f(it[k], it) : String(it[k] ?? ''))),
      el('td', { class: 'acts' },
        col === 'quiz' ? el('button', { class: 'btn small yellow', onclick: () => startLive(it) }, '⚡ 即時問答') : null,
        col === 'events' && Date.parse(it.date) > Date.now() ? el('button', { class: 'btn small yellow', onclick: () => remind(it) }, '📣 提醒') : null,
        col === 'events' ? el('button', { class: 'btn small', onclick: () => showRsvp(it) }, '👥') : null,
        el('button', { class: 'btn small blue', onclick: () => editItem(col, it) }, '編輯'),
        el('button', { class: 'btn small ghost', onclick: () => delItem(col, it) }, '刪除'))));
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, `${S.icon} ${S.title}（${list.length}）`), el('button', { class: 'btn primary', onclick: () => editItem(col, null) }, `＋ 新增${S.title}`)),
      col === 'quiz' ? el('p', { class: 'muted' }, '「⚡ 即時問答」會即刻推送題目畀所有在綫成員，限時作答，答啱加分，最快答啱再 +5。') : null,
      col === 'events' ? el('p', { class: 'muted' }, '活動完結後，可以「編輯」並填寫「活動記錄」。設定咗提醒嘅成員會喺活動前 1 個鐘自動收到通知；「📣 提醒」可以即刻推送。') : null,
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {}, el('thead', {}, el('tr', {}, S.cols.map(([, l]) => el('th', {}, l)), el('th', {}))), el('tbody', {}, rows)))
        : el('div', { class: 'empty' }, '未有資料'));
  }

  function editItem(col, it) {
    const S = COLS[col];
    const inputs = {};
    const form = el('div', { class: 'form' }, el('h2', { style: 'margin:0' }, `${it ? '編輯' : '新增'}${S.title}`));
    for (const f of S.fields) {
      const v = it ? it[f.k] : f.def;
      let input;
      if (f.t === 'textarea') input = el('textarea', { class: 'inp', rows: 4, value: v || '' });
      else if (f.t === 'datetime') input = el('input', { class: 'inp', type: 'datetime-local', value: toLocalInput(v) });
      else if (f.t === 'number') input = el('input', { class: 'inp', type: 'number', min: 0, value: v ?? 0 });
      else if (f.t === 'bool') input = el('select', { class: 'inp' }, el('option', { value: 'true', selected: v !== false }, '🟢 開放'), el('option', { value: 'false', selected: v === false }, '⚪ 關閉'));
      else if (f.t === 'options') {
        const opts = (it && it.options) || ['', '', '', ''];
        const ans = it ? it.answer : 0;
        input = el('div', {}, [0, 1, 2, 3].map((i) => el('div', { class: 'opt-row' },
          el('input', { type: 'radio', name: 'ans', value: i, checked: i === ans, title: '正確答案' }),
          el('b', {}, 'ABCD'[i]),
          el('input', { class: 'inp', value: opts[i] || '', placeholder: i < 2 ? '選項（必填）' : '選項（可留空）' }))));
      } else input = el('input', { class: 'inp', value: v || '' });
      inputs[f.k] = { f, input };
      form.append(el('label', {}, f.l), input);
    }
    const err = el('p', { class: 'err' });
    form.append(err, el('div', { style: 'display:flex;gap:8px;justify-content:flex-end' },
      el('button', { class: 'btn ghost', onclick: closeModal }, '取消'),
      el('button', { class: 'btn primary', onclick: async () => {
        const item = it ? { id: it.id } : {};
        for (const [k, { f, input }] of Object.entries(inputs)) {
          if (f.t === 'datetime') item[k] = input.value ? new Date(input.value).toISOString() : '';
          else if (f.t === 'number') item[k] = Number(input.value);
          else if (f.t === 'bool') item[k] = input.value === 'true';
          else if (f.t === 'options') {
            const texts = [...input.querySelectorAll('.inp')].map((x) => x.value.trim());
            const chosen = Number((input.querySelector('input[type=radio]:checked') || {}).value || 0);
            if (!texts[chosen]) { err.textContent = '正確答案嗰格唔可以空白'; return; }
            const kept = texts.map((t, i) => ({ t, i })).filter((x) => x.t);
            item.options = kept.map((x) => x.t);
            item.answer = kept.findIndex((x) => x.i === chosen);
          } else item[k] = input.value;
        }
        try { await api('POST', '/api/admin/save', { col, item }); closeModal(); toast('已儲存 ✅', 'good'); load(); }
        catch (e) { err.textContent = e.message; }
      } }, '儲存')));
    openModal(form);
  }
  async function delItem(col, it) {
    if (!confirm(`確定刪除「${it.title || it.question}」？刪除後無法復原。`)) return;
    try { await api('POST', '/api/admin/delete', { col, id: it.id }); toast('已刪除'); load(); } catch (e) { toast(e.message, 'bad'); }
  }
  async function startLive(q) {
    const secs = prompt(`推送即時問答：「${q.question}」\n作答時間（秒，10–120）：`, '20');
    if (secs === null) return;
    try { await api('POST', '/api/admin/live/start', { quizId: q.id, seconds: Number(secs) }); toast('⚡ 已推送畀所有在綫成員', 'good'); setTimeout(load, 500); }
    catch (e) { toast(e.message, 'bad'); }
  }
  async function remind(ev) {
    try { const r = await api('POST', '/api/admin/remind', { id: ev.id }); toast(`已提醒 ${r.reached} 位在綫成員（共 ${r.rsvp} 人設定提醒）`, 'good'); }
    catch (e) { toast(e.message, 'bad'); }
  }
  function showRsvp(ev) {
    openModal(el('div', {}, el('h2', { style: 'margin-top:0' }, `👥 ${ev.title}`), el('p', { class: 'muted' }, `${ev.rsvpNames.length} 人會出席 / 設定咗提醒`),
      ev.rsvpNames.length ? ev.rsvpNames.map((n) => el('span', { class: 'tag', style: 'margin:3px' }, n)) : el('p', {}, '暫時未有人'),
      el('div', { style: 'text-align:right;margin-top:12px' }, el('button', { class: 'btn', onclick: closeModal }, '關閉'))));
  }

  function renderReview() {
    const list = [...data.submissions].sort((a, b) => (a.status === 'pending' ? -1 : 0) - (b.status === 'pending' ? -1 : 0));
    const label = { pending: el('span', { class: 'tag p' }, '⏳ 待審核'), approved: el('span', { class: 'tag g' }, '✅ 已通過'), rejected: el('span', { class: 'tag r' }, '❌ 未通過') };
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, '✅ LP Challenge 審核')),
      el('p', { class: 'muted' }, '通過後會自動幫成員加分；撤回通過會扣返分數。'),
      list.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['成員', '挑戰', '提交內容', '時間', '狀態', ''].map((h) => el('th', {}, h)))),
        el('tbody', {}, list.map((s) => el('tr', {},
          el('td', {}, s.nickname), el('td', {}, s.challenge), el('td', { class: 'pre' }, s.text), el('td', {}, ago(s.createdAt)), el('td', {}, label[s.status].cloneNode(true)),
          el('td', { class: 'acts' },
            s.status !== 'approved' ? el('button', { class: 'btn small green', onclick: () => review(s, 'approved') }, '通過') : null,
            s.status !== 'rejected' ? el('button', { class: 'btn small ghost', onclick: () => review(s, 'rejected') }, s.status === 'approved' ? '撤回' : '拒絕') : null))))))
        : el('div', { class: 'empty' }, '暫時冇提交'));
  }
  async function review(s, status) {
    try { await api('POST', '/api/admin/submission', { id: s.id, status }); toast('已更新', 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
  }

  function renderUsers() {
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, `👥 成員（${data.users.length}）`)),
      data.users.length ? el('div', { class: 'tbl-wrap' }, el('table', {},
        el('thead', {}, el('tr', {}, ['', '暱稱', '狀態', '積分', '最後上綫', ''].map((h) => el('th', {}, h)))),
        el('tbody', {}, data.users.map((u) => {
          const pts = el('input', { class: 'inp', type: 'number', min: 0, value: u.points, style: 'width:90px;padding:5px 8px' });
          return el('tr', { style: u.banned ? 'opacity:.5' : '' },
            el('td', {}, el('img', { class: 'mini-av', src: Avatar.thumb(u.avatar, 34), alt: '' })),
            el('td', {}, el('b', {}, u.nickname), u.status ? el('div', { class: 'muted' }, u.status) : null),
            el('td', {}, u.banned ? '⛔ 已停用' : u.online ? '🟢 在綫' : '⚪ 離綫'),
            el('td', {}, el('div', { style: 'display:flex;gap:4px' }, pts, el('button', { class: 'btn small', onclick: () => setUser(u, { points: Number(pts.value) }) }, '儲存'))),
            el('td', {}, u.online ? '而家' : ago(u.lastSeen)),
            el('td', { class: 'acts' }, el('button', { class: 'btn small ' + (u.banned ? 'green' : 'ghost'), onclick: () => {
              if (!u.banned && !confirm(`停用「${u.nickname}」？佢會即時被登出，並無法再進入小鎮。`)) return;
              setUser(u, { banned: !u.banned });
            } }, u.banned ? '恢復' : '停用')));
        }))))
        : el('div', { class: 'empty' }, '仲未有成員'));
  }
  async function setUser(u, patch) {
    try { await api('POST', '/api/admin/user', { id: u.id, ...patch }); toast('已更新', 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
  }

  function renderAnnounce() {
    const ta = el('textarea', { class: 'inp', rows: 3, maxLength: 300, placeholder: '例如：今晚 8 點 HQ 有 Quiz Night，記得嚟！' });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, '📢 公告')),
      el('div', { class: 'card' }, el('p', { class: 'muted', style: 'margin-top:0' }, '公告會即時彈出畀所有在綫成員，並顯示喺小鎮頂部同 HQ。'), ta,
        el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
          if (!ta.value.trim()) return;
          try { await api('POST', '/api/admin/announce', { text: ta.value }); toast('已發佈 📢', 'good'); load(); } catch (e) { toast(e.message, 'bad'); }
        } }, '發佈公告')),
      data.announcements.map((a) => el('div', { class: 'card', style: 'display:flex;gap:8px;align-items:flex-start' },
        el('div', { style: 'flex:1' }, a.text, el('div', { class: 'muted' }, fmt(a.createdAt))),
        el('button', { class: 'btn small ghost', onclick: async () => { try { await api('POST', '/api/admin/announce/delete', { id: a.id }); load(); } catch (e) { toast(e.message, 'bad'); } } }, '刪除'))));
  }

  function renderSettings() {
    const p1 = el('input', { class: 'inp', type: 'password', placeholder: '新密碼（最少 8 個字元）', autocomplete: 'new-password' });
    const p2 = el('input', { class: 'inp', type: 'password', placeholder: '再輸入一次', autocomplete: 'new-password', style: 'margin-top:6px' });
    return el('div', {},
      el('div', { class: 'toolbar' }, el('h2', {}, '⚙️ 設定')),
      el('div', { class: 'card' }, el('h3', {}, '🔑 更改後台密碼'),
        data.passwordFromEnv ? el('p', { class: 'muted' }, '而家密碼由伺服器嘅 ADMIN_PASSWORD 環境變數設定，請喺嗰度修改。')
          : el('div', {}, p1, p2, el('button', { class: 'btn primary', style: 'margin-top:8px', onclick: async () => {
            if (p1.value !== p2.value) return toast('兩次輸入唔一樣', 'bad');
            try { await api('POST', '/api/admin/password', { password: p1.value }); p1.value = p2.value = ''; toast('密碼已更改 ✅', 'good'); } catch (e) { toast(e.message, 'bad'); }
          } }, '更改密碼'))));
  }

  // ---------------------------------------------------------- boot
  if (token) start().catch(() => showLogin()); else showLogin();
})();
