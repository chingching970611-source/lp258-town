/* Chibi avatar renderer — draws a cute character with feet at (x, y). */
(function () {
  const SKIN = ['#FFE3CC', '#F9D0B0', '#EDB98A', '#D49A6A', '#A86E45', '#7A4B2E'];
  const HAIR = ['短髮', '刺蝟頭', '長髮', '冬菇頭', '丸子頭', '馬尾', '捲髮', '孖辮', '光頭'];
  const HAIR_COLOR = ['#2B2118', '#5A3825', '#A0662F', '#E8C26B', '#F4A6B8', '#7FB3E8', '#B48CE0', '#E8573F', '#EDEDED'];
  const OUTFIT = ['T恤', '連帽衫', '連身裙', '西裝', '吊帶褲'];
  const OUTFIT_COLOR = ['#FF7A7A', '#FFB84D', '#FFE066', '#7ED957', '#4CC9F0', '#5B7CFA', '#B07CFF', '#FF8FCB', '#3D3D4E', '#FFFFFF'];
  const FACE = ['開心', '大笑', '眨眼', '型格', '害羞', '驚訝', '嬲嬲', '愛心', '眼瞓'];
  const ACC = ['無', '眼鏡', '貓耳', '皇冠', '花朵', '耳機', '蝴蝶結'];
  const INK = '#3A2A2A';

  function shade(hex, amt) {
    let c = hex.replace('#', '');
    if (c.length === 3) c = c.split('').map((x) => x + x).join('');
    const n = parseInt(c, 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const f = (v) => Math.round(amt < 0 ? v * (1 + amt) : v + (255 - v) * amt);
    r = f(r); g = f(g); b = f(b);
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else {
      ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
  }
  function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); }
  function ellipse(ctx, x, y, rx, ry, rot = 0) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); }
  function fillStroke(ctx, fill, lw = 1.5) {
    ctx.fillStyle = fill; ctx.fill();
    ctx.strokeStyle = shade(fill, -0.32); ctx.lineWidth = lw; ctx.stroke();
  }
  function heart(ctx, cx, cy, s) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + s * 0.9);
    ctx.bezierCurveTo(cx - s * 1.6, cy - s * 0.2, cx - s * 0.6, cy - s * 1.3, cx, cy - s * 0.4);
    ctx.bezierCurveTo(cx + s * 0.6, cy - s * 1.3, cx + s * 1.6, cy - s * 0.2, cx, cy + s * 0.9);
    ctx.closePath();
  }

  // ---------------------------------------------------------- hair
  function hairCap(ctx, hc) {
    ctx.beginPath();
    ctx.arc(0, -54, 23.5, Math.PI, Math.PI * 2);
    ctx.lineTo(23.5, -49);
    ctx.quadraticCurveTo(19, -62, 11, -60);
    ctx.quadraticCurveTo(5, -65, -2, -60);
    ctx.quadraticCurveTo(-9, -65, -15, -59);
    ctx.quadraticCurveTo(-21, -61, -23.5, -49);
    ctx.closePath();
    fillStroke(ctx, hc);
  }
  function hairBack(ctx, style, hc) {
    if (style === 2) { rr(ctx, -25, -66, 50, 44, 14); fillStroke(ctx, hc); }
    else if (style === 3) { ellipse(ctx, 0, -52, 27.5, 24); fillStroke(ctx, hc); }
    else if (style === 5) { ellipse(ctx, 25, -46, 8, 17, 0.45); fillStroke(ctx, hc); }
    else if (style === 7) {
      ellipse(ctx, -28, -44, 8, 16, -0.35); fillStroke(ctx, hc);
      ellipse(ctx, 28, -44, 8, 16, 0.35); fillStroke(ctx, hc);
    }
  }
  function hairFront(ctx, style, hc) {
    switch (style) {
      case 0: hairCap(ctx, hc); break;
      case 1: {
        ctx.beginPath();
        const pts = [[-23, -56], [-20, -80], [-11, -70], [-5, -88], [2, -72], [10, -86], [14, -70], [22, -79], [23.5, -56]];
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
        ctx.closePath();
        fillStroke(ctx, hc);
        hairCap(ctx, hc);
        break;
      }
      case 2:
        hairCap(ctx, hc);
        rr(ctx, -25.5, -58, 7, 28, 4); fillStroke(ctx, hc);
        rr(ctx, 18.5, -58, 7, 28, 4); fillStroke(ctx, hc);
        break;
      case 3:
        hairCap(ctx, hc);
        rr(ctx, -27, -60, 8, 22, 4); fillStroke(ctx, hc);
        rr(ctx, 19, -60, 8, 22, 4); fillStroke(ctx, hc);
        break;
      case 4:
        circle(ctx, 0, -80, 10); fillStroke(ctx, hc);
        hairCap(ctx, hc);
        rr(ctx, -6, -73, 12, 4, 2); ctx.fillStyle = '#FF6B9A'; ctx.fill();
        break;
      case 5:
        hairCap(ctx, hc);
        circle(ctx, 20, -62, 3.6); ctx.fillStyle = '#FF6B9A'; ctx.fill();
        break;
      case 6: {
        ctx.fillStyle = hc;
        ctx.strokeStyle = shade(hc, -0.3); ctx.lineWidth = 1.4;
        for (let a = Math.PI * 0.95; a <= Math.PI * 2.06; a += Math.PI / 7) {
          circle(ctx, Math.cos(a) * 21, -54 + Math.sin(a) * 21, 8); ctx.fill(); ctx.stroke();
        }
        for (const [x, y, r] of [[-13, -64, 7], [-4, -67, 7.5], [6, -66, 7.5], [15, -62, 6.5]]) { circle(ctx, x, y, r); ctx.fill(); ctx.stroke(); }
        break;
      }
      case 7:
        hairCap(ctx, hc);
        circle(ctx, -22, -58, 3.4); ctx.fillStyle = '#FF6B9A'; ctx.fill();
        circle(ctx, 22, -58, 3.4); ctx.fill();
        break;
      case 8:
        ellipse(ctx, -7, -69, 6, 3, -0.4); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
        break;
    }
  }

  // ---------------------------------------------------------- face
  function eyeDot(ctx, x) {
    ellipse(ctx, x, -51, 3.2, 3.9); ctx.fillStyle = INK; ctx.fill();
    circle(ctx, x - 1, -52.6, 1.2); ctx.fillStyle = '#fff'; ctx.fill();
  }
  function caret(ctx, x) {
    ctx.beginPath(); ctx.moveTo(x - 3.8, -49.5); ctx.lineTo(x, -53.5); ctx.lineTo(x + 3.8, -49.5); ctx.stroke();
  }
  function smile(ctx) { ctx.beginPath(); ctx.arc(0, -45.5, 4.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  function openMouth(ctx) {
    ctx.beginPath(); ctx.moveTo(-5.5, -45.5); ctx.quadraticCurveTo(0, -37, 5.5, -45.5); ctx.closePath();
    ctx.fillStyle = '#C2414B'; ctx.fill();
    ellipse(ctx, 0, -41.6, 2.6, 1.4); ctx.fillStyle = '#FF8C9A'; ctx.fill();
  }
  function blush(ctx, strength = 0.45, big = false) {
    ctx.fillStyle = `rgba(255,110,130,${strength})`;
    ellipse(ctx, -14, -45, big ? 5.5 : 4.5, big ? 3.2 : 2.6); ctx.fill();
    ellipse(ctx, 14, -45, big ? 5.5 : 4.5, big ? 3.2 : 2.6); ctx.fill();
  }
  function drawFace(ctx, f) {
    ctx.strokeStyle = INK; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (f !== 3 && f !== 6) blush(ctx, f === 4 ? 0.7 : 0.42, f === 4);
    switch (f) {
      case 0: eyeDot(ctx, -8.5); eyeDot(ctx, 8.5); smile(ctx); break;
      case 1: caret(ctx, -8.5); caret(ctx, 8.5); openMouth(ctx); break;
      case 2: eyeDot(ctx, -8.5); caret(ctx, 8.5); smile(ctx);
        ctx.fillStyle = '#FFD43B'; ctx.font = '9px sans-serif'; ctx.fillText('✦', 15, -58); break;
      case 3:
        ctx.fillStyle = '#1E1E28';
        rr(ctx, -15, -56, 12, 8, 3.5); ctx.fill(); rr(ctx, 3, -56, 12, 8, 3.5); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3, -53); ctx.lineTo(3, -53); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.5)'; rr(ctx, -13, -55, 4, 2, 1); ctx.fill(); rr(ctx, 5, -55, 4, 2, 1); ctx.fill();
        ctx.beginPath(); ctx.moveTo(-3, -44.5); ctx.quadraticCurveTo(1.5, -42, 5.5, -46); ctx.stroke();
        break;
      case 4:
        for (const x of [-8.5, 8.5]) { ctx.beginPath(); ctx.arc(x, -53, 3.4, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
        ctx.beginPath(); ctx.moveTo(-3.5, -44); ctx.quadraticCurveTo(-1.75, -46, 0, -44); ctx.quadraticCurveTo(1.75, -42, 3.5, -44); ctx.stroke();
        ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(230,80,100,.8)';
        for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s * (11 + i * 2.5), -47); ctx.lineTo(s * (12.5 + i * 2.5), -43.5); ctx.stroke(); }
        break;
      case 5:
        for (const x of [-8.5, 8.5]) {
          circle(ctx, x, -51, 4.6); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.3; ctx.stroke();
          circle(ctx, x, -50.5, 2.4); ctx.fillStyle = INK; ctx.fill();
        }
        ellipse(ctx, 0, -42.5, 2.6, 3.2); ctx.fillStyle = INK; ctx.fill();
        break;
      case 6:
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(-13, -58.5); ctx.lineTo(-4.5, -55.5); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(13, -58.5); ctx.lineTo(4.5, -55.5); ctx.stroke();
        eyeDot(ctx, -8.5); eyeDot(ctx, 8.5);
        ctx.strokeStyle = INK; ctx.lineWidth = 1.8;
        ctx.beginPath(); ctx.arc(0, -40.5, 4, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke();
        ctx.strokeStyle = '#E8414B'; ctx.lineWidth = 1.8;
        for (const [a, b, c, d] of [[13, -70, 16, -67], [19, -70, 16, -67], [13, -64, 16, -67], [19, -64, 16, -67]]) {
          ctx.beginPath(); ctx.moveTo(a, b); ctx.quadraticCurveTo((a + c) / 2 + 0.6, (b + d) / 2 + 0.6, c, d); ctx.stroke();
        }
        break;
      case 7:
        ctx.fillStyle = '#FF4D6D';
        heart(ctx, -8.5, -51.5, 3.8); ctx.fill(); heart(ctx, 8.5, -51.5, 3.8); ctx.fill();
        openMouth(ctx);
        break;
      case 8:
        ctx.beginPath(); ctx.moveTo(-12, -51); ctx.lineTo(-5, -51); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(5, -51); ctx.lineTo(12, -51); ctx.stroke();
        ellipse(ctx, 0, -43, 2, 2.4); ctx.fillStyle = INK; ctx.fill();
        ctx.fillStyle = '#5B7CFA'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('z', 17, -64); ctx.font = 'bold 7px sans-serif'; ctx.fillText('z', 24, -71);
        break;
    }
  }

  // ---------------------------------------------------------- accessories
  function drawAcc(ctx, acc, hc) {
    switch (acc) {
      case 1:
        ctx.strokeStyle = '#3A3A48'; ctx.lineWidth = 1.6;
        circle(ctx, -8.5, -51, 6); ctx.stroke(); circle(ctx, 8.5, -51, 6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-2.5, -51.5); ctx.lineTo(2.5, -51.5); ctx.stroke();
        break;
      case 2:
        for (const s of [-1, 1]) {
          ctx.beginPath(); ctx.moveTo(s * 21, -64); ctx.lineTo(s * 18, -85); ctx.lineTo(s * 5, -73); ctx.closePath(); fillStroke(ctx, hc);
          ctx.beginPath(); ctx.moveTo(s * 18, -68); ctx.lineTo(s * 17, -80); ctx.lineTo(s * 10, -73); ctx.closePath(); ctx.fillStyle = '#FFB3C7'; ctx.fill();
        }
        break;
      case 3:
        ctx.beginPath();
        ctx.moveTo(-11, -73); ctx.lineTo(-12, -86); ctx.lineTo(-5.5, -80); ctx.lineTo(0, -89); ctx.lineTo(5.5, -80); ctx.lineTo(12, -86); ctx.lineTo(11, -73);
        ctx.closePath(); fillStroke(ctx, '#FFD43B');
        circle(ctx, 0, -78, 2); ctx.fillStyle = '#FF4D6D'; ctx.fill();
        break;
      case 4:
        ctx.fillStyle = '#FF8FCB';
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circle(ctx, 17 + Math.cos(a) * 4, -69 + Math.sin(a) * 4, 3.6); ctx.fill(); }
        circle(ctx, 17, -69, 2.6); ctx.fillStyle = '#FFD43B'; ctx.fill();
        break;
      case 5:
        ctx.strokeStyle = '#4A4A5A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -54, 27, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        rr(ctx, -30, -60, 9, 15, 4); fillStroke(ctx, '#FF6B9A');
        rr(ctx, 21, -60, 9, 15, 4); fillStroke(ctx, '#FF6B9A');
        break;
      case 6:
        ctx.beginPath(); ctx.moveTo(15, -72); ctx.lineTo(5, -79); ctx.lineTo(6, -65); ctx.closePath(); fillStroke(ctx, '#FF4D6D');
        ctx.beginPath(); ctx.moveTo(15, -72); ctx.lineTo(25, -79); ctx.lineTo(24, -65); ctx.closePath(); fillStroke(ctx, '#FF4D6D');
        circle(ctx, 15, -72, 3); ctx.fillStyle = '#E8414B'; ctx.fill();
        break;
    }
  }

  // ---------------------------------------------------------- body
  function draw(ctx, av, x, y, o = {}) {
    av = av || {};
    const s = o.scale || 1, t = o.phase || 0, walking = !!o.walking;
    const skin = SKIN[av.skin] || SKIN[0];
    const hc = HAIR_COLOR[av.hairColor] || HAIR_COLOR[0];
    const oc = OUTFIT_COLOR[av.outfitColor] || OUTFIT_COLOR[0];
    const outfit = av.outfit || 0, hair = av.hair || 0;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(s, s);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';

    ellipse(ctx, 0, 0, 18, 6); ctx.fillStyle = 'rgba(0,0,0,.16)'; ctx.fill();
    const bob = walking ? -Math.abs(Math.sin(t)) * 2.5 : Math.sin((o.idle || 0) * 2) * 0.7;
    ctx.translate(0, bob);

    hairBack(ctx, hair, hc);

    // legs
    const pants = outfit === 2 ? skin : outfit === 3 ? shade(oc, -0.15) : outfit === 4 ? oc : '#4A5578';
    const sw = walking ? Math.sin(t) * 3 : 0;
    for (const [lx, lift] of [[-6.5, Math.max(0, sw)], [6.5, Math.max(0, -sw)]]) {
      rr(ctx, lx - 3.6, -15, 7.2, 13 - lift, 3); fillStroke(ctx, pants, 1.2);
      ellipse(ctx, lx, -2.5 - lift, 5, 3); ctx.fillStyle = '#4B3B3B'; ctx.fill();
    }

    // torso
    const sleeve = outfit === 2 ? skin : outfit === 4 ? '#FFFFFF' : oc;
    if (outfit === 2) {
      ctx.beginPath(); ctx.moveTo(-10.5, -36); ctx.lineTo(10.5, -36); ctx.lineTo(17, -11); ctx.quadraticCurveTo(0, -6.5, -17, -11); ctx.closePath();
      fillStroke(ctx, oc);
      ctx.strokeStyle = shade(oc, 0.35); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-14, -16); ctx.quadraticCurveTo(0, -12.5, 14, -16); ctx.stroke();
    } else {
      rr(ctx, -13, -37, 26, 24, 8); fillStroke(ctx, outfit === 4 ? '#FFFFFF' : oc);
    }
    if (outfit === 0) {
      ctx.strokeStyle = shade(oc, -0.25); ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(0, -36, 5, 0.1 * Math.PI, 0.9 * Math.PI); ctx.stroke();
      ctx.fillStyle = shade(oc, 0.45); heart(ctx, 0, -24, 3.4); ctx.fill();
    } else if (outfit === 1) {
      ellipse(ctx, 0, -36, 12, 4.5); ctx.fillStyle = shade(oc, -0.12); ctx.fill();
      rr(ctx, -7.5, -24, 15, 8, 3); ctx.strokeStyle = shade(oc, -0.3); ctx.lineWidth = 1.2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-3, -34); ctx.lineTo(-3, -28); ctx.moveTo(3, -34); ctx.lineTo(3, -28); ctx.strokeStyle = '#fff'; ctx.stroke();
    } else if (outfit === 3) {
      ctx.beginPath(); ctx.moveTo(-6.5, -36.5); ctx.lineTo(6.5, -36.5); ctx.lineTo(0, -25); ctx.closePath(); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(0, -34); ctx.lineTo(2.2, -29); ctx.lineTo(0, -23); ctx.lineTo(-2.2, -29); ctx.closePath(); ctx.fillStyle = '#E8414B'; ctx.fill();
      ctx.fillStyle = shade(oc, -0.4); circle(ctx, 0, -19, 1.2); ctx.fill(); circle(ctx, 0, -15.5, 1.2); ctx.fill();
    } else if (outfit === 4) {
      rr(ctx, -9.5, -28, 19, 15, 3); fillStroke(ctx, oc, 1.2);
      ctx.strokeStyle = oc; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-8, -28); ctx.lineTo(-10, -36); ctx.moveTo(8, -28); ctx.lineTo(10, -36); ctx.stroke();
      ctx.fillStyle = '#FFD43B'; circle(ctx, -6, -25.5, 1.6); ctx.fill(); circle(ctx, 6, -25.5, 1.6); ctx.fill();
    }

    // arms
    const as = walking ? Math.sin(t) * 0.35 : 0;
    for (const [side, swing] of [[-1, as], [1, -as]]) {
      ctx.save();
      ctx.translate(side * 12.5, -34);
      ctx.rotate(side * 0.28 + swing);
      rr(ctx, -3.6, 0, 7.2, 14, 3.6); fillStroke(ctx, sleeve, 1.2);
      circle(ctx, 0, 15.5, 4); fillStroke(ctx, skin, 1.2);
      ctx.restore();
    }

    // head
    circle(ctx, -21, -52, 5); fillStroke(ctx, skin, 1.3);
    circle(ctx, 21, -52, 5); fillStroke(ctx, skin, 1.3);
    circle(ctx, 0, -54, 22); fillStroke(ctx, skin, 1.6);

    drawFace(ctx, av.face || 0);
    hairFront(ctx, hair, hc);
    drawAcc(ctx, av.acc || 0, hc);
    ctx.restore();
  }

  function random() {
    const r = (n) => Math.floor(Math.random() * n);
    return { skin: r(SKIN.length), hair: r(HAIR.length - 1), hairColor: r(HAIR_COLOR.length), outfit: r(OUTFIT.length),
      outfitColor: r(OUTFIT_COLOR.length), face: r(FACE.length), acc: r(ACC.length) };
  }

  const thumbCache = new Map();
  function thumb(av, size = 48, full = false) {
    const key = JSON.stringify(av) + size + full;
    if (thumbCache.has(key)) return thumbCache.get(key);
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = size * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    if (full) draw(ctx, av, size / 2, size * 0.94, { scale: size / 100 });
    else draw(ctx, av, size / 2, size * 1.45, { scale: size / 50 });
    const url = c.toDataURL();
    if (thumbCache.size > 300) thumbCache.clear();
    thumbCache.set(key, url);
    return url;
  }

  window.Avatar = {
    draw, random, thumb, shade, rr, heart,
    OPTIONS: {
      skin: { label: '膚色', colors: SKIN },
      hair: { label: '髮型', names: HAIR },
      hairColor: { label: '髮色', colors: HAIR_COLOR },
      outfit: { label: '衫款', names: OUTFIT },
      outfitColor: { label: '衫色', colors: OUTFIT_COLOR },
      face: { label: '表情', names: FACE },
      acc: { label: '配飾', names: ACC },
    },
  };
})();
