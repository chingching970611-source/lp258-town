/* Personal rooms: personality quiz → job → cozy room scene. Depends on avatar.js + i18n.js. */
(function () {
  const TYPES = ['farmer', 'chef', 'artist', 'coder', 'musician', 'explorer', 'florist', 'bookworm',
    'photographer', 'creator', 'lawyer', 'marketing', 'sales', 'admin', 'founder', 'student'];
  const ICON = { farmer: '🌾', chef: '🍳', artist: '🎨', coder: '💻', musician: '🎸', explorer: '🧭', florist: '💐', bookworm: '📚',
    photographer: '📷', creator: '🎬', lawyer: '⚖️', marketing: '📈', sales: '🤝', admin: '🗂️', founder: '🚀', student: '🎓' };
  const WALLS = ['#FFE3EC', '#E3F0FF', '#E8F7E0', '#FFF3C4', '#EFE6FF', '#FFE8D6'];
  const RUG = { farmer: '#C9E7A8', chef: '#FFD1A6', artist: '#FFC2E0', coder: '#BFD4FF', musician: '#E0C8FF', explorer: '#F2D29B', florist: '#FFD6E5', bookworm: '#D9C3A5',
    photographer: '#D6DCE8', creator: '#FFC9D9', lawyer: '#C9B49A', marketing: '#FFE3A3', sales: '#BFE6D2', admin: '#D3E4F5', founder: '#E2D4FF', student: '#CDEBFF' };
  // Each answer option adds a point to these personality types (same order as the 6 questions in i18n.js).
  const SCORING = [
    [['explorer', 'photographer', 'farmer'], ['chef', 'florist', 'sales'], ['artist', 'creator', 'musician'], ['bookworm', 'student', 'coder']],
    [['farmer', 'admin', 'lawyer'], ['sales', 'chef', 'creator'], ['artist', 'marketing', 'musician', 'photographer'], ['coder', 'lawyer', 'student', 'bookworm']],
    [['farmer', 'explorer', 'photographer', 'florist'], ['sales', 'marketing', 'chef'], ['founder', 'creator', 'artist', 'musician'], ['admin', 'lawyer', 'coder', 'bookworm', 'student']],
    [['founder', 'sales', 'explorer', 'chef'], ['coder', 'lawyer', 'admin'], ['marketing', 'florist', 'musician'], ['artist', 'student', 'bookworm', 'creator']],
    [['farmer', 'florist'], ['explorer', 'photographer', 'sales'], ['marketing', 'lawyer', 'creator'], ['artist', 'founder', 'coder', 'chef']],
    [['founder', 'sales', 'marketing'], ['creator', 'musician', 'photographer'], ['admin', 'lawyer', 'farmer'], ['student', 'bookworm', 'coder', 'explorer']],
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
    photographer(ctx, t) {
      const pics = [[150, 26, 44, 34, '#FFB3C7'], [200, 20, 34, 44, '#9BD18A'], [240, 30, 48, 32, '#8FD3F7'], [294, 24, 34, 40, '#FFD43B']];
      for (const [x, y, w, h, c] of pics) { box(ctx, x, y, w, h, '#fff', 2); box(ctx, x + 3, y + 3, w - 6, h - 10, c, 1); }
      ctx.strokeStyle = '#3A3A48'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(60, 214); ctx.lineTo(74, 150); ctx.lineTo(88, 214); ctx.moveTo(74, 150); ctx.lineTo(74, 214); ctx.stroke();
      emoji(ctx, '📷', 74, 138, 34);
      box(ctx, 110, 90, 40, 52, '#F5F5F5', 6); ctx.fillStyle = 'rgba(255,250,210,' + (0.5 + 0.3 * Math.sin(t / 500)) + ')'; ctx.fillRect(114, 94, 32, 44);
      ctx.fillStyle = '#3A3A48'; ctx.fillRect(128, 142, 4, 72);
      emoji(ctx, '🎞️', 300, 200, 24);
    },
    creator(ctx, t) {
      ctx.strokeStyle = 'rgba(255,255,240,' + (0.85 + 0.15 * Math.sin(t / 400)) + ')'; ctx.lineWidth = 8;
      ctx.beginPath(); ctx.arc(72, 120, 30, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#D0D0D8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(72, 120, 35, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = '#3A3A48'; ctx.fillRect(70, 150, 4, 64);
      box(ctx, 62, 106, 20, 30, '#2B2D42', 4);
      box(ctx, 160, 34, 64, 26, '#E8414B', 8); ctx.fillStyle = '#fff'; ctx.font = '800 15px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('● LIVE', 192, 47);
      emoji(ctx, '🎙️', 130, 196, 28); emoji(ctx, '💡', 270, 56, 26);
      ['❤️', '👍', '⭐'].forEach((e, i) => { const k = ((t / 1800 + i / 3) % 1); ctx.globalAlpha = 1 - k; emoji(ctx, e, 300 + Math.sin(t / 500 + i) * 8, 190 - k * 90, 16); ctx.globalAlpha = 1; });
    },
    lawyer(ctx, t) {
      box(ctx, 150, 24, 90, 128, '#7A4B2E', 6);
      for (let r = 0; r < 4; r++) { box(ctx, 154, 28 + r * 31, 82, 27, '#5A3825', 2); for (let b = 0; b < 7; b++) box(ctx, 157 + b * 11.2, 32 + r * 31, 9, 23, ['#8B1E2D', '#1F3A5F', '#2E5A3A', '#8B1E2D', '#6B4A1F', '#1F3A5F', '#8B1E2D'][(b + r) % 7], 1); }
      box(ctx, 270, 30, 54, 40, '#C9A04C', 3); box(ctx, 274, 34, 46, 32, '#FFF8E6', 2); emoji(ctx, '📜', 297, 50, 18);
      box(ctx, 24, 150, 120, 12, '#5A3825', 4); box(ctx, 32, 162, 10, 52, '#4A2E1E', 2); box(ctx, 126, 162, 10, 52, '#4A2E1E', 2);
      emoji(ctx, '⚖️', 60, 134, 30); emoji(ctx, '📁', 108, 140, 22); emoji(ctx, '🖋️', 300, 200, 22);
    },
    marketing(ctx, t) {
      box(ctx, 150, 22, 150, 96, '#fff', 6); ctx.strokeStyle = '#C9CED9'; ctx.lineWidth = 2; ctx.strokeRect(150, 22, 150, 96);
      [20, 34, 28, 48, 62].forEach((h, i) => box(ctx, 166 + i * 24, 104 - h - Math.sin(t / 900 + i) * 2, 16, h, ['#4CC9F0', '#5B7CFA', '#B07CFF', '#FF7A9C', '#FFB84D'][i], 2));
      ctx.strokeStyle = '#E8414B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(170, 80); ctx.lineTo(214, 66); ctx.lineTo(240, 72); ctx.lineTo(290, 36); ctx.stroke();
      [['#FFF3B0', 40, 30], ['#FFD1E0', 76, 40], ['#C8F0FF', 46, 66], ['#D9F5DC', 84, 74]].forEach(([c, x, y]) => box(ctx, x, y, 28, 24, c, 2));
      box(ctx, 24, 160, 110, 10, '#E3B47C', 4); box(ctx, 34, 170, 8, 44, '#C98B52', 2); box(ctx, 116, 170, 8, 44, '#C98B52', 2);
      emoji(ctx, '💻', 70, 146, 26); emoji(ctx, '📣', 300, 196, 28);
    },
    sales(ctx, t) {
      box(ctx, 24, 150, 130, 12, '#B57A45', 4); box(ctx, 34, 162, 8, 52, '#9A6438', 2); box(ctx, 136, 162, 8, 52, '#9A6438', 2);
      emoji(ctx, '☎️', 54, 136, 26); emoji(ctx, '💼', 120, 138, 26);
      ['#E8414B', '#fff', '#E8414B', '#fff'].forEach((c, i) => { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(200, 70, 34 - i * 8, 0, Math.PI * 2); ctx.fill(); });
      emoji(ctx, '🎯', 212, 60, 22);
      shelf(ctx, 254, 70, 80); emoji(ctx, '🏆', 274, 54, 26); emoji(ctx, '🥇', 312, 56, 22);
      emoji(ctx, '🤝', 300, 196, 30);
    },
    admin(ctx, t) {
      box(ctx, 26, 100, 62, 114, '#9AA3B5', 6); for (let i = 0; i < 3; i++) { box(ctx, 30, 106 + i * 36, 54, 30, '#B8C0CF', 4); box(ctx, 48, 118 + i * 36, 18, 5, '#6B7385', 2); }
      box(ctx, 110, 150, 120, 10, '#E3B47C', 4); box(ctx, 118, 160, 8, 54, '#C98B52', 2); box(ctx, 214, 160, 8, 54, '#C98B52', 2);
      emoji(ctx, '🗂️', 136, 136, 24); emoji(ctx, '📋', 170, 138, 22); emoji(ctx, '🖨️', 206, 136, 24);
      box(ctx, 240, 26, 80, 70, '#fff', 4); box(ctx, 240, 26, 80, 16, '#E8414B', 4);
      ctx.fillStyle = '#C9CED9'; for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) ctx.fillRect(246 + c * 15, 48 + r * 15, 10, 10);
      ctx.fillStyle = '#5B7CFA'; ctx.fillRect(276, 63, 10, 10);
      emoji(ctx, '☕', 300, 200, 20);
    },
    founder(ctx, t) {
      box(ctx, 150, 22, 150, 96, '#fff', 6); ctx.strokeStyle = '#C9CED9'; ctx.lineWidth = 2; ctx.strokeRect(150, 22, 150, 96);
      ctx.fillStyle = '#5B7CFA'; ctx.font = '800 13px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText('IDEA → MVP → GO!', 158, 44);
      ctx.strokeStyle = '#7ED957'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(162, 104); ctx.quadraticCurveTo(220, 100, 284, 66); ctx.stroke();
      emoji(ctx, '🚀', 288 + Math.sin(t / 400) * 2, 60 - Math.abs(Math.sin(t / 400)) * 3, 22); emoji(ctx, '💡', 200, 80, 20);
      ctx.fillStyle = '#B07CFF'; ctx.beginPath(); ctx.ellipse(70, 196, 42, 22, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#C9A6FF'; ctx.beginPath(); ctx.ellipse(70, 186, 30, 14, 0, 0, Math.PI * 2); ctx.fill();
      emoji(ctx, '💻', 70, 168, 26); emoji(ctx, '☕', 126, 200, 20); emoji(ctx, '🪴', 300, 190, 30);
    },
    student(ctx, t) {
      box(ctx, 24, 150, 130, 12, '#E3B47C', 4); box(ctx, 34, 162, 8, 52, '#C98B52', 2); box(ctx, 136, 162, 8, 52, '#C98B52', 2);
      ['#FF7A7A', '#5B7CFA', '#7ED957', '#FFB84D'].forEach((c, i) => box(ctx, 40 - i * 1.5, 140 - i * 8, 40, 7, c, 2));
      emoji(ctx, '✏️', 104, 140, 20); emoji(ctx, '💡', 132, 112, 22);
      shelf(ctx, 160, 68, 110); emoji(ctx, '🎓', 180, 52, 26); emoji(ctx, '📚', 220, 52, 24); emoji(ctx, '🌍', 254, 52, 22);
      box(ctx, 284, 26, 46, 56, '#fff', 3); box(ctx, 284, 26, 46, 12, '#5B7CFA', 3);
      ctx.fillStyle = '#E8414B'; ctx.font = '800 18px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('A+', 307, 60);
      emoji(ctx, '🎒', 300, 196, 30);
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
