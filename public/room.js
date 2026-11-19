/* Personal rooms: personality quiz → job → cozy room scene. Depends on avatar.js + i18n.js. */
(function () {
  const TYPES = ['farmer', 'chef', 'artist', 'coder', 'musician', 'explorer', 'florist', 'bookworm'];
  const ICON = { farmer: '🌾', chef: '🍳', artist: '🎨', coder: '💻', musician: '🎸', explorer: '🧭', florist: '💐', bookworm: '📚' };
  const WALLS = ['#FFE3EC', '#E3F0FF', '#E8F7E0', '#FFF3C4', '#EFE6FF', '#FFE8D6'];
  const RUG = { farmer: '#C9E7A8', chef: '#FFD1A6', artist: '#FFC2E0', coder: '#BFD4FF', musician: '#E0C8FF', explorer: '#F2D29B', florist: '#FFD6E5', bookworm: '#D9C3A5' };
  // Each answer option adds a point to these personality types (same order as the questions in i18n.js).
  const SCORING = [
    [['explorer', 'farmer'], ['chef', 'florist'], ['artist', 'florist'], ['bookworm', 'coder']],
    [['farmer', 'coder'], ['chef', 'musician'], ['artist', 'musician'], ['florist', 'bookworm']],
    [['farmer', 'florist'], ['chef'], ['artist', 'musician'], ['bookworm', 'coder']],
    [['explorer', 'chef'], ['coder', 'bookworm'], ['musician', 'florist'], ['artist', 'explorer']],
    [['farmer', 'florist'], ['explorer'], ['musician', 'bookworm'], ['artist', 'coder', 'chef']],
  ];
  function score(answers) {
    const s = Object.fromEntries(TYPES.map((t) => [t, 0]));
    answers.forEach((a, qi) => { for (const t of (SCORING[qi] && SCORING[qi][a]) || []) s[t] += 1 + qi * 0.01; });
    return TYPES.reduce((best, t) => (s[t] > s[best] ? t : best), TYPES[0]);
  }

  const R = (ctx, x, y, w, h, r) => Avatar.rr(ctx, x, y, w, h, r);
  function emoji(ctx, e, x, y, size) {
    ctx.font = `${size}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e, x, y);
  }
  function box(ctx, x, y, w, h, c, r = 6) { R(ctx, x, y, w, h, r); ctx.fillStyle = c; ctx.fill(); }
  function shelf(ctx, x, y, w) { box(ctx, x, y, w, 7, '#B57A45', 3); }

  const FURNITURE = {
    farmer(ctx, t) {
      shelf(ctx, 140, 70, 110); emoji(ctx, '🥕', 158, 58, 20); emoji(ctx, '🌽', 190, 58, 20); emoji(ctx, '🍅', 222, 58, 20);
      box(ctx, 26, 170, 70, 42, '#E8C26B', 8); ctx.strokeStyle = '#C9A04C'; ctx.lineWidth = 2;
      for (let i = 1; i < 4; i++) { ctx.beginPath(); ctx.moveTo(26, 170 + i * 10.5); ctx.lineTo(96, 170 + i * 10.5); ctx.stroke(); }
      emoji(ctx, '🌻', 120, 178, 34); emoji(ctx, '🪴', 300, 186, 30); emoji(ctx, '🧺', 70, 156, 26);
      emoji(ctx, '🐔', 112 + Math.sin(t / 600) * 6, 214, 22);
    },
    chef(ctx, t) {
      box(ctx, 24, 120, 110, 92, '#D7DCE6', 8); box(ctx, 24, 116, 110, 12, '#AEB6C6', 6);
      ctx.fillStyle = '#3A3A48'; for (const x of [50, 104]) { ctx.beginPath(); ctx.arc(x, 122, 9, 0, Math.PI * 2); ctx.fill(); }
      emoji(ctx, '🍲', 50, 108, 24); emoji(ctx, '🍳', 104, 110, 22);
      for (let i = 0; i < 3; i++) { const k = ((t / 900 + i / 3) % 1); ctx.fillStyle = `rgba(255,255,255,${0.8 - k * 0.8})`; ctx.beginPath(); ctx.arc(50 + Math.sin(t / 300 + i) * 4, 92 - k * 30, 4, 0, Math.PI * 2); ctx.fill(); }
      shelf(ctx, 160, 64, 110); emoji(ctx, '🥐', 180, 52, 20); emoji(ctx, '🍰', 214, 52, 20); emoji(ctx, '🧁', 248, 52, 20);
      box(ctx, 296, 100, 46, 110, '#F2F4F8', 8); box(ctx, 296, 140, 46, 3, '#C9CED9', 1);
    },
    artist(ctx, t) {
      const frames = [[150, 30, 50, 40, '#FF7A9C'], [212, 22, 40, 52, '#4CC9F0'], [262, 34, 56, 36, '#FFD43B']];
      for (const [x, y, w, h, c] of frames) { box(ctx, x, y, w, h, '#B57A45', 3); box(ctx, x + 4, y + 4, w - 8, h - 8, c, 2); }
      ctx.strokeStyle = '#8A5A33'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(48, 214); ctx.lineTo(70, 120); ctx.lineTo(92, 214); ctx.moveTo(70, 120); ctx.lineTo(70, 214); ctx.stroke();
      box(ctx, 36, 116, 70, 56, '#fff', 3);
      ['#FF7A7A', '#FFB84D', '#FFE066', '#7ED957', '#4CC9F0', '#B07CFF'].forEach((c, i) => { ctx.strokeStyle = c; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(71, 172, 40 - i * 5, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
      emoji(ctx, '🎨', 120, 200, 26); emoji(ctx, '🖌️', 300, 196, 24);
    },
    coder(ctx, t) {
      box(ctx, 24, 150, 130, 10, '#B57A45', 4); box(ctx, 34, 160, 8, 54, '#9A6438', 2); box(ctx, 136, 160, 8, 54, '#9A6438', 2);
      box(ctx, 50, 100, 80, 50, '#2B2D42', 6); box(ctx, 55, 105, 70, 40, '#1B1F3B', 4);
      ['#7ED957', '#4CC9F0', '#FFB84D', '#FF7A9C', '#B07CFF'].forEach((c, i) => {
        const w = 18 + ((Math.sin(t / 700 + i * 1.7) + 1) * 18); ctx.fillStyle = c; ctx.fillRect(60 + (i % 2) * 6, 110 + i * 7, w, 3.5);
      });
      emoji(ctx, '☕', 146, 140, 18); emoji(ctx, '🐈', 300, 200, 30);
      shelf(ctx, 180, 70, 120); ['#FF7A7A', '#5B7CFA', '#7ED957', '#FFB84D', '#B07CFF', '#4CC9F0'].forEach((c, i) => box(ctx, 186 + i * 18, 40, 14, 30, c, 2));
    },
    musician(ctx, t) {
      box(ctx, 24, 132, 130, 70, '#2B2D42', 8); box(ctx, 30, 138, 118, 26, '#fff', 3);
      ctx.fillStyle = '#2B2D42'; for (let i = 0; i < 9; i++) if (i % 3 !== 2) ctx.fillRect(41 + i * 12.5, 138, 7, 15);
      box(ctx, 34, 202, 8, 12, '#2B2D42', 2); box(ctx, 136, 202, 8, 12, '#2B2D42', 2);
      emoji(ctx, '🎸', 230, 70, 46); emoji(ctx, '🎧', 300, 60, 28); emoji(ctx, '🔊', 304, 192, 32);
      ['🎵', '🎶', '🎵'].forEach((n, i) => { const k = ((t / 1600 + i / 3) % 1); ctx.globalAlpha = 1 - k; emoji(ctx, n, 70 + i * 30 + Math.sin(t / 400 + i) * 6, 120 - k * 70, 18); ctx.globalAlpha = 1; });
    },
    explorer(ctx, t) {
      box(ctx, 150, 26, 140, 80, '#F5E6C4', 4); ctx.strokeStyle = '#C9A46C'; ctx.lineWidth = 3; ctx.strokeRect(150, 26, 140, 80);
      ctx.fillStyle = '#9BD18A'; for (const [x, y, rx, ry] of [[190, 58, 22, 14], [246, 74, 18, 12], [262, 46, 10, 8]]) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2); ctx.fill(); }
      ctx.strokeStyle = '#E8573F'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo(176, 90); ctx.quadraticCurveTo(220, 30, 262, 46); ctx.stroke(); ctx.setLineDash([]);
      emoji(ctx, '❌', 262, 46, 12); emoji(ctx, '🌍', 60, 150, 44); box(ctx, 44, 172, 32, 40, '#B57A45', 4);
      emoji(ctx, '🎒', 120, 196, 32); emoji(ctx, '🧭', 300, 196, 28); emoji(ctx, '⛺', 300, 150, 30);
    },
    florist(ctx, t) {
      shelf(ctx, 140, 72, 150); ['🌷', '🌹', '🌼', '🌸', '🌺'].forEach((f, i) => emoji(ctx, f, 154 + i * 30, 58 + Math.sin(t / 700 + i) * 1.5, 22));
      box(ctx, 24, 160, 110, 10, '#E3B47C', 4); box(ctx, 34, 170, 8, 44, '#C98B52', 2); box(ctx, 116, 170, 8, 44, '#C98B52', 2);
      emoji(ctx, '💐', 56, 140, 34); emoji(ctx, '🪴', 104, 142, 30); emoji(ctx, '🌻', 300, 180, 34); emoji(ctx, '🌱', 150, 206, 22);
    },
    bookworm(ctx, t) {
      for (const x of [150, 236]) {
        box(ctx, x, 24, 80, 132, '#9A6438', 6);
        for (let r = 0; r < 4; r++) {
          box(ctx, x + 4, 28 + r * 32, 72, 28, '#7A4B2E', 2);
          for (let b = 0; b < 6; b++) box(ctx, x + 7 + b * 11.5, 32 + r * 32 + (b % 3), 9, 24 - (b % 3), ['#FF7A7A', '#5B7CFA', '#7ED957', '#FFB84D', '#B07CFF', '#4CC9F0'][(b + r) % 6], 1);
        }
      }
      box(ctx, 30, 150, 80, 52, '#C26A6A', 14); box(ctx, 38, 130, 64, 34, '#D98080', 12);
      emoji(ctx, '📖', 70, 156, 24); emoji(ctx, '🕯️', 130, 120, 24); emoji(ctx, '☕', 128, 196, 20); emoji(ctx, '✒️', 300, 200, 22);
    },
  };

  /** Draw a room into a 360×240 design space scaled to the canvas size. */
  function draw(ctx, w, h, room, avatar, t = 0) {
    const s = Math.min(w / 360, h / 240);
    ctx.save();
    ctx.translate((w - 360 * s) / 2, (h - 240 * s) / 2);
    ctx.scale(s, s);
    const type = room && TYPES.includes(room.type) ? room.type : null;
    const wall = WALLS[(room && room.wall) || 0] || WALLS[0];
    // wall + wallpaper
    box(ctx, 0, 0, 360, 240, wall, 18);
    ctx.save(); R(ctx, 0, 0, 360, 240, 18); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,.45)';
    for (let x = 12; x < 360; x += 26) for (let y = 12; y < 150; y += 26) { ctx.beginPath(); ctx.arc(x + ((y / 26) % 2) * 13, y, 2.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = Avatar.shade(wall, -0.12); ctx.fillRect(0, 144, 360, 8);
    // floor
    ctx.fillStyle = '#E8B97E'; ctx.fillRect(0, 152, 360, 88);
    ctx.strokeStyle = '#D9A86C'; ctx.lineWidth = 2;
    for (let y = 170; y < 240; y += 18) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(360, y); ctx.stroke(); }
    ctx.fillStyle = type ? RUG[type] : '#F2E8DA';
    ctx.beginPath(); ctx.ellipse(220, 210, 80, 20, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (!type) {
      // empty room: window + boxes
      box(ctx, 40, 30, 80, 66, '#fff', 6); box(ctx, 46, 36, 68, 54, '#BDE7FF', 4);
      emoji(ctx, '📦', 80, 196, 38); emoji(ctx, '📦', 120, 206, 28);
    } else {
      box(ctx, 34, 24, 76, 62, '#fff', 6); box(ctx, 40, 30, 64, 50, '#BDE7FF', 4);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(60 + Math.sin(t / 2500) * 6, 48, 12, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#FF9FBF'; R(ctx, 30, 22, 14, 70, 6); ctx.fill(); R(ctx, 100, 22, 14, 70, 6); ctx.fill();
      FURNITURE[type](ctx, t);
    }
    if (avatar) Avatar.draw(ctx, avatar, 220, 214, { scale: 1.15, idle: t / 1000 });
    ctx.restore();
  }

  window.Room = { TYPES, ICON, WALLS, SCORING, score, draw };
})();
