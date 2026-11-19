/* Casual mini-games. Each game draws into a container and calls onEnd(score).
   A seeded random generator lets two players get exactly the same round in a PK. */
(function () {
  function rng(seed) {
    let a = seed >>> 0 || 1;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let x = Math.imul(a ^ (a >>> 15), 1 | a); x = (x + Math.imul(x ^ (x >>> 7), 61 | x)) ^ x; return ((x ^ (x >>> 14)) >>> 0) / 4294967296; };
  }
  function h(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function hud(container, t) {
    const bar = h('div', 'mg-hud');
    const score = h('b', '', '0'), time = h('b', '', '');
    bar.append(h('span', '', '⭐ '), score, h('span', 'mg-sp'), h('span', '', '⏱ '), time);
    container.append(bar);
    return { score, time };
  }

  // ---------------------------------------------------------------- 🃏 Memory: match the pairs
  function memory(container, { seed, onEnd, t }) {
    const R = rng(seed);
    const pool = ['🍓', '🍋', '🍇', '🍑', '🥝', '🍒', '🍉', '🍍', '🥥', '🍌', '🍄', '🌸'];
    for (let i = pool.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); [pool[i], pool[k]] = [pool[k], pool[i]]; }
    const cards = [...pool.slice(0, 8), ...pool.slice(0, 8)];
    for (let i = cards.length - 1; i > 0; i--) { const k = Math.floor(R() * (i + 1)); [cards[i], cards[k]] = [cards[k], cards[i]]; }
    const LIMIT = 90;
    const ui = hud(container, t);
    const grid = h('div', 'mg-memory');
    container.append(grid);
    let open = [], matched = 0, misses = 0, busy = false, done = false;
    const t0 = performance.now();
    const elapsed = () => (performance.now() - t0) / 1000;
    const scoreNow = () => Math.max(0, Math.round(matched * 60 + (matched === 8 ? Math.max(0, 520 - elapsed() * 6 - misses * 15) : 0)));
    const btns = cards.map((emo, i) => {
      const b = h('button', 'mg-card');
      b.type = 'button';
      b.innerHTML = '<span class="front">?</span><span class="back"></span>';
      b.querySelector('.back').textContent = emo;
      b.onclick = () => {
        if (busy || done || b.classList.contains('up')) return;
        b.classList.add('up');
        open.push(i);
        if (open.length === 2) {
          const [x, y] = open;
          if (cards[x] === cards[y]) {
            btns[x].classList.add('ok'); btns[y].classList.add('ok');
            matched++; open = [];
            ui.score.textContent = scoreNow();
            if (matched === 8) finish();
          } else {
            misses++; busy = true;
            setTimeout(() => { btns[x].classList.remove('up'); btns[y].classList.remove('up'); open = []; busy = false; }, 650);
          }
        }
      };
      grid.append(b);
      return b;
    });
    const timer = setInterval(() => { const left = Math.max(0, LIMIT - elapsed()); ui.time.textContent = Math.ceil(left) + 's'; if (left <= 0) finish(); }, 200);
    function finish() { if (done) return; done = true; clearInterval(timer); setTimeout(() => onEnd(Math.min(1000, scoreNow())), 400); }
    return () => { done = true; clearInterval(timer); };
  }

  // ---------------------------------------------------------------- 🔨 Whack: tap the critters, avoid bombs
  function whack(container, { seed, onEnd }) {
    const R = rng(seed);
    const DUR = 30;
    // a fixed schedule of pop-ups from the seed, so both PK players see the same critters
    const plan = [];
    for (let at = 600; at < DUR * 1000 - 400;) {
      const p = at / (DUR * 1000);
      const r = R();
      plan.push({ at, hole: Math.floor(R() * 9), kind: r < 0.14 ? 'bomb' : r < 0.26 ? 'gold' : 'mole', stay: 950 - 420 * p });
      at += 700 - 380 * p + R() * 160;
    }
    const ui = hud(container);
    const grid = h('div', 'mg-whack');
    container.append(grid);
    const holes = Array.from({ length: 9 }, () => { const b = h('button', 'mg-hole'); b.type = 'button'; b.append(h('span', 'mg-critter')); grid.append(b); return b; });
    const ICON = { mole: '🐹', gold: '🌟', bomb: '💣' }, PTS = { mole: 1, gold: 3, bomb: -2 };
    let score = 0, idx = 0, done = false, raf = 0;
    const live = new Map(); // hole -> {kind, until}
    holes.forEach((b, i) => {
      b.onpointerdown = (e) => {
        e.preventDefault();
        const c = live.get(i);
        if (!c || done) return;
        live.delete(i);
        score = Math.max(0, score + PTS[c.kind]);
        ui.score.textContent = score;
        b.classList.remove('up');
        b.classList.add(PTS[c.kind] > 0 ? 'hit' : 'boom');
        setTimeout(() => b.classList.remove('hit', 'boom'), 250);
      };
    });
    const t0 = performance.now();
    const frame = (now) => {
      if (done) return;
      const ms = now - t0;
      while (idx < plan.length && plan[idx].at <= ms) {
        const p = plan[idx++];
        if (!live.has(p.hole)) { live.set(p.hole, { kind: p.kind, until: ms + p.stay }); const b = holes[p.hole]; b.querySelector('.mg-critter').textContent = ICON[p.kind]; b.classList.add('up'); }
      }
      for (const [i, c] of live) if (c.until <= ms) { live.delete(i); holes[i].classList.remove('up'); }
      ui.time.textContent = Math.max(0, Math.ceil(DUR - ms / 1000)) + 's';
      if (ms >= DUR * 1000) { done = true; setTimeout(() => onEnd(score), 300); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { done = true; cancelAnimationFrame(raf); };
  }

  // ---------------------------------------------------------------- 🐛 Caterpillar: eat leaves, don't bump into walls or yourself
  function caterpillar(container, { seed, onEnd }) {
    const R = rng(seed);
    const N = 15;
    const ui = hud(container);
    ui.time.textContent = '—';
    const canvas = h('canvas', 'mg-cat');
    container.append(canvas);
    const pad = h('div', 'mg-pad');
    const dirs = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
    for (const [k, label] of [['up', '▲'], ['left', '◀'], ['right', '▶'], ['down', '▼']]) {
      const b = h('button', 'mg-pad-' + k, label); b.type = 'button';
      b.onpointerdown = (e) => { e.preventDefault(); turn(dirs[k]); };
      pad.append(b);
    }
    container.append(pad);
    let body = [[4, 7], [3, 7], [2, 7]], dir = [1, 0], queued = [1, 0], food = null, score = 0, done = false, timer = 0;
    const occupied = (x, y) => body.some(([a, b]) => a === x && b === y);
    function placeFood() { for (let i = 0; i < 400; i++) { const x = Math.floor(R() * N), y = Math.floor(R() * N); if (!occupied(x, y)) { food = [x, y]; return; } } }
    placeFood();
    function turn(d) { if (d[0] === -dir[0] && d[1] === -dir[1]) return; queued = d; }
    const key = (e) => {
      const m = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right' }[e.key];
      if (m) { e.preventDefault(); turn(dirs[m]); }
    };
    window.addEventListener('keydown', key);
    let sx = 0, sy = 0;
    canvas.addEventListener('pointerdown', (e) => { sx = e.clientX; sy = e.clientY; });
    canvas.addEventListener('pointerup', (e) => {
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? dirs.right : dirs.left) : (dy > 0 ? dirs.down : dirs.up));
    });
    function draw() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const W = canvas.clientWidth || 300;
      canvas.width = W * dpr; canvas.height = W * dpr;
      const g = canvas.getContext('2d');
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const c = W / N;
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { g.fillStyle = (x + y) % 2 ? '#BFE8A8' : '#B2E09A'; g.fillRect(x * c, y * c, c, c); }
      g.font = `${c * 0.85}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      if (food) g.fillText('🍃', food[0] * c + c / 2, food[1] * c + c / 2 + 1);
      body.slice().reverse().forEach(([x, y], ri) => {
        const i = body.length - 1 - ri;
        g.fillStyle = i === 0 ? '#7ED957' : i % 2 ? '#9BE36F' : '#8BDD62';
        g.beginPath(); g.arc(x * c + c / 2, y * c + c / 2, c * (i === 0 ? 0.5 : 0.44), 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#4E9A35'; g.lineWidth = 1.2; g.stroke();
      });
      const [hx, hy] = body[0];
      const ex = dir[0] * c * 0.12, ey = dir[1] * c * 0.12;
      g.fillStyle = '#fff';
      for (const s of [-1, 1]) { const ox = dir[1] * s * c * 0.18, oy = -dir[0] * s * c * 0.18; g.beginPath(); g.arc(hx * c + c / 2 + ox + ex, hy * c + c / 2 + oy + ey, c * 0.12, 0, Math.PI * 2); g.fill(); g.fillStyle = '#3A2A2A'; g.beginPath(); g.arc(hx * c + c / 2 + ox + ex * 1.6, hy * c + c / 2 + oy + ey * 1.6, c * 0.06, 0, Math.PI * 2); g.fill(); g.fillStyle = '#fff'; }
    }
    function step() {
      if (done) return;
      dir = queued;
      const head = [body[0][0] + dir[0], body[0][1] + dir[1]];
      if (head[0] < 0 || head[1] < 0 || head[0] >= N || head[1] >= N || occupied(head[0], head[1])) { done = true; draw(); setTimeout(() => onEnd(score), 500); return; }
      body.unshift(head);
      if (food && head[0] === food[0] && head[1] === food[1]) { score++; ui.score.textContent = score; placeFood(); } else body.pop();
      draw();
      timer = setTimeout(step, Math.max(85, 190 - score * 5));
    }
    requestAnimationFrame(() => { draw(); timer = setTimeout(step, 600); });
    return () => { done = true; clearTimeout(timer); window.removeEventListener('keydown', key); };
  }

  // ---------------------------------------------------------------- 🍉 Slice: swipe through flying fruit, avoid bombs
  function slice(container, { seed, onEnd }) {
    const R = rng(seed);
    const DUR = 30, G = 520; // gravity (px/s²) in a 340×420 design space
    const FRUITS = ['🍉', '🍊', '🍎', '🍍', '🥝', '🍑', '🍋', '🍇'];
    // launch plan from the seed so both PK players get the same throws
    const plan = [];
    for (let at = 0.5; at < DUR - 0.6;) {
      const p = at / DUR, n = R() < 0.25 + p * 0.35 ? 2 : 1;
      for (let k = 0; k < n; k++) {
        const x = 50 + R() * 240, bomb = R() < 0.13 + p * 0.07;
        plan.push({ at: at + k * 0.12, x, vx: (170 - x) * (0.5 + R() * 0.5), vy: -(520 + R() * 110), e: bomb ? '💣' : FRUITS[Math.floor(R() * FRUITS.length)], bomb });
      }
      at += 0.95 - p * 0.45 + R() * 0.35;
    }
    const ui = hud(container);
    const canvas = h('canvas', 'mg-slice');
    container.append(canvas);
    let score = 0, idx = 0, done = false, raf = 0, combo = 0, comboT = 0;
    const live = [], bits = [], texts = [], trail = [];
    const t0 = performance.now();
    let last = t0, down = false;
    const toLocal = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) * 340 / r.width, (e.clientY - r.top) * 420 / r.height]; };
    const segHit = (ax, ay, bx, by, cx, cy, rad) => { const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy || 1; let u = ((cx - ax) * dx + (cy - ay) * dy) / l; u = Math.max(0, Math.min(1, u)); const px = ax + u * dx - cx, py = ay + u * dy - cy; return px * px + py * py <= rad * rad; };
    function cut(ax, ay, bx, by, now) {
      for (let i = live.length - 1; i >= 0; i--) {
        const f = live[i];
        if (!segHit(ax, ay, bx, by, f.x, f.y, 24)) continue;
        live.splice(i, 1);
        if (f.bomb) { score = Math.max(0, score - 3); texts.push({ x: f.x, y: f.y, s: '-3', c: '#FF5E5E', t: now }); combo = 0; for (let k = 0; k < 10; k++) bits.push({ x: f.x, y: f.y, vx: (R() - 0.5) * 300, vy: (R() - 0.5) * 300, c: '#555', t: now }); }
        else {
          combo = now - comboT < 350 ? combo + 1 : 1; comboT = now;
          const pts = combo >= 3 ? 2 : 1;
          score += pts;
          texts.push({ x: f.x, y: f.y, s: combo >= 3 ? `+${pts} ×${combo}` : '+1', c: '#FFE066', t: now });
          for (const side of [-1, 1]) bits.push({ x: f.x, y: f.y, vx: side * 90 + f.vx * 0.3, vy: -120, e: f.e, half: side, rot: 0, t: now });
          for (let k = 0; k < 6; k++) bits.push({ x: f.x, y: f.y, vx: (R() - 0.5) * 240, vy: (R() - 0.7) * 240, c: ['#FF7A9C', '#FFB84D', '#7ED957'][k % 3], t: now });
        }
        ui.score.textContent = score;
      }
    }
    canvas.addEventListener('pointerdown', (e) => { down = true; trail.length = 0; trail.push([...toLocal(e), performance.now()]); try { canvas.setPointerCapture(e.pointerId); } catch {} });
    canvas.addEventListener('pointermove', (e) => {
      const now = performance.now(), p = toLocal(e);
      if (!down && e.pointerType !== 'mouse') return;
      const prev = trail[trail.length - 1];
      trail.push([p[0], p[1], now]);
      if (prev && (down || e.buttons)) cut(prev[0], prev[1], p[0], p[1], now);
    });
    const up = () => { down = false; };
    canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    const frame = (now) => {
      if (done) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      const el = (now - t0) / 1000;
      while (idx < plan.length && plan[idx].at <= el) { const p = plan[idx++]; live.push({ x: p.x, y: 440, vx: p.vx, vy: p.vy, e: p.e, bomb: p.bomb, rot: 0, vr: (R() - 0.5) * 6 }); }
      for (const f of live) { f.vy += G * dt; f.x += f.vx * dt; f.y += f.vy * dt; f.rot += f.vr * dt; }
      for (let i = live.length - 1; i >= 0; i--) if (live[i].y > 470 && live[i].vy > 0) live.splice(i, 1);
      const dpr = Math.min(2, window.devicePixelRatio || 1), W = canvas.clientWidth || 340, H = W * 420 / 340;
      canvas.width = W * dpr; canvas.height = H * dpr;
      const g = canvas.getContext('2d');
      g.setTransform(dpr * W / 340, 0, 0, dpr * W / 340, 0, 0);
      const bg = g.createLinearGradient(0, 0, 0, 420); bg.addColorStop(0, '#5B3A29'); bg.addColorStop(1, '#8A5A3C'); g.fillStyle = bg; g.fillRect(0, 0, 340, 420);
      g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; for (let y = 40; y < 420; y += 60) { g.beginPath(); g.moveTo(0, y); g.lineTo(340, y + 8); g.stroke(); }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (const f of live) { g.save(); g.translate(f.x, f.y); g.rotate(f.rot); g.font = '44px sans-serif'; g.fillText(f.e, 0, 2); g.restore(); }
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i], age = (now - b.t) / 1000;
        if (age > 1.2) { bits.splice(i, 1); continue; }
        b.vy += G * dt; b.x += b.vx * dt; b.y += b.vy * dt;
        if (b.e) { g.save(); g.translate(b.x, b.y); g.rotate(b.half * age * 3); g.beginPath(); g.rect(b.half < 0 ? -30 : 0, -30, 30, 60); g.clip(); g.font = '44px sans-serif'; g.globalAlpha = 1 - age / 1.2; g.fillText(b.e, 0, 2); g.restore(); }
        else { g.globalAlpha = 1 - age / 1.2; g.fillStyle = b.c; g.beginPath(); g.arc(b.x, b.y, 4, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
      }
      while (trail.length && now - trail[0][2] > 160) trail.shift();
      if (trail.length > 1) { g.strokeStyle = 'rgba(255,255,255,.9)'; g.lineCap = 'round'; for (let i = 1; i < trail.length; i++) { g.lineWidth = 2 + 6 * (i / trail.length); g.beginPath(); g.moveTo(trail[i - 1][0], trail[i - 1][1]); g.lineTo(trail[i][0], trail[i][1]); g.stroke(); } }
      for (let i = texts.length - 1; i >= 0; i--) { const x = texts[i], age = now - x.t; if (age > 700) { texts.splice(i, 1); continue; } g.globalAlpha = 1 - age / 700; g.fillStyle = x.c; g.font = '800 22px sans-serif'; g.fillText(x.s, x.x, x.y - age / 18); g.globalAlpha = 1; }
      ui.time.textContent = Math.max(0, Math.ceil(DUR - el)) + 's';
      if (el >= DUR) { done = true; setTimeout(() => onEnd(score), 400); return; }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => { done = true; cancelAnimationFrame(raf); };
  }

  window.MiniGames = { rng, memory, whack, caterpillar, slice };
})();
