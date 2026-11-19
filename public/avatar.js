/* Chibi avatar renderer — draws a cute character with feet at (x, y). */
(function () {
  const SKIN = ['#FFE3CC', '#F9D0B0', '#EDB98A', '#D49A6A', '#A86E45', '#7A4B2E'];
  const HAIR_COUNT = 11;
  const HAIR_COLOR = ['#2B2118', '#5A3825', '#A0662F', '#E8C26B', '#F4A6B8', '#7FB3E8', '#B48CE0', '#E8573F', '#EDEDED'];
  const OUTFIT_COUNT = 5;
  const OUTFIT_COLOR = ['#FF7A7A', '#FFB84D', '#FFE066', '#7ED957', '#4CC9F0', '#5B7CFA', '#B07CFF', '#FF8FCB', '#3D3D4E', '#FFFFFF'];
  const FACE_COUNT = 9;
  const ACC_COUNT = 9;
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
  // Soft rounded cap + layered tapered strands, gradient shading and a shine ring (cozy chibi style).
  function hairFill(ctx, hc) {
    const g = ctx.createLinearGradient(0, -92, 0, -30);
    g.addColorStop(0, shade(hc, 0.2)); g.addColorStop(0.5, hc); g.addColorStop(1, shade(hc, -0.16));
    ctx.fillStyle = g; ctx.fill();
  }
  const edge = (hc) => shade(hc, -0.45);
  function backVolume(ctx, hc) { ellipse(ctx, 0, -58, 27, 25); hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5; ctx.stroke(); }
  function cap(ctx, hc, w = 25.5, top = -85) {
    ctx.beginPath();
    ctx.moveTo(-w, -49);
    ctx.bezierCurveTo(-w - 2.5, -71, -15, top, 0, top);
    ctx.bezierCurveTo(15, top, w + 2.5, -71, w, -49);
    ctx.quadraticCurveTo(w - 3, -63, 14, -67);
    ctx.quadraticCurveTo(0, -71, -14, -67);
    ctx.quadraticCurveTo(-w + 3, -63, -w, -49);
    ctx.closePath();
    hairFill(ctx, hc);
    ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w, -49); ctx.bezierCurveTo(-w - 2.5, -71, -15, top, 0, top); ctx.bezierCurveTo(15, top, w + 2.5, -71, w, -49); ctx.stroke();
  }
  // One tapered strand from a root span (x0..x1 at rootY) to a curved tip; only the two long edges are outlined.
  function strand(ctx, hc, [x0, x1, rootY, tx, ty, bend = 0]) {
    const my = (rootY + ty) / 2;
    ctx.beginPath();
    ctx.moveTo(x0, rootY);
    ctx.quadraticCurveTo(x0 + bend - 1.5, my + 1, tx, ty);
    ctx.quadraticCurveTo(x1 + bend + 1.5, my - 1, x1, rootY);
    ctx.closePath();
    hairFill(ctx, hc);
    ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(x0, rootY); ctx.quadraticCurveTo(x0 + bend - 1.5, my + 1, tx, ty); ctx.quadraticCurveTo(x1 + bend + 1.5, my - 1, x1, rootY); ctx.stroke();
  }
  const BANGS = {
    soft: [[-21, -9, -69, -16, -55, 2.5], [-12, 0, -73, -5, -57.5, 2], [-2, 10, -73, 5, -58, 1.5], [8, 20, -69, 15.5, -55.5, 0.5], [-5, 5, -74, 0.5, -62, 0]],
    blunt: [[-21, -8, -69, -14.5, -57.5, 1], [-10, 2, -73, -3.5, -58.5, 0.5], [0, 12, -73, 6.5, -58.5, 0], [10, 21, -69, 16, -57.5, -1]],
    sweep: [[-23, -11, -67, -21, -52, -1], [-15, 2, -73, -12, -55.5, -2.5], [0, 13, -75, -2, -59.5, -3], [11, 22, -69, 13, -58, -1]],
    spiky: [[-21, -10, -69, -18, -54, 1], [-12, -1, -73, -7, -56, 1], [-2, 9, -74, 4, -58.5, 1], [7, 20, -70, 16, -55, 0]],
  };
  function sideLocks(ctx, hc, len, which = 'both', curl = 3.5) {
    if (which !== 'right') strand(ctx, hc, [-25.5, -18.5, -63, -22, len, curl]);
    if (which !== 'left') strand(ctx, hc, [18.5, 25.5, -63, 22, len, -curl]);
  }
  function shine(ctx, hc) {
    ctx.save();
    ctx.strokeStyle = shade(hc, 0.55); ctx.globalAlpha = 0.75; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -63, 19, Math.PI * 1.18, Math.PI * 1.4); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -63, 19, Math.PI * 1.52, Math.PI * 1.78); ctx.stroke();
    ctx.restore();
  }
  function tie(ctx, x, y, r = 3.4) { circle(ctx, x, y, r); ctx.fillStyle = '#FF6B9A'; ctx.fill(); ctx.strokeStyle = '#E04F7E'; ctx.lineWidth = 1; ctx.stroke(); }
  function tail(ctx, hc, pts) { // tapered tail through control points [[x,y]...], width shrinking
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    ctx.bezierCurveTo(pts[1][0], pts[1][1], pts[2][0], pts[2][1], pts[3][0], pts[3][1]);
    ctx.bezierCurveTo(pts[4][0], pts[4][1], pts[5][0], pts[5][1], pts[6][0], pts[6][1]);
    ctx.closePath();
    hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.4; ctx.stroke();
  }
  function hairBack(ctx, style, hc) {
    if (style === 10) return;
    if (style === 2) { // long
      ctx.beginPath(); ctx.moveTo(-26, -64); ctx.bezierCurveTo(-34, -40, -30, -20, -24, -12);
      ctx.quadraticCurveTo(-12, -8, 0, -12); ctx.quadraticCurveTo(12, -8, 24, -12); ctx.bezierCurveTo(30, -20, 34, -40, 26, -64); ctx.closePath();
      hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5; ctx.stroke();
    } else if (style === 3) { // bob
      ctx.beginPath(); ctx.moveTo(-28, -62); ctx.bezierCurveTo(-32, -44, -28, -36, -19, -35); ctx.lineTo(19, -35); ctx.bezierCurveTo(28, -36, 32, -44, 28, -62); ctx.closePath();
      hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5; ctx.stroke();
    } else if (style === 5) { // ponytail swinging to the right
      tail(ctx, hc, [[12, -78], [36, -80], [42, -52], [33, -26], [30, -36], [30, -54], [14, -66]]);
    } else if (style === 7) { // twin tails
      tail(ctx, hc, [[-18, -72], [-42, -70], [-44, -44], [-34, -22], [-33, -36], [-30, -54], [-17, -62]]);
      tail(ctx, hc, [[18, -72], [42, -70], [44, -44], [34, -22], [33, -36], [30, -54], [17, -62]]);
    } else if (style === 6) { // curly volume
      ctx.fillStyle = hc; ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.3;
      for (let a = Math.PI * 0.75; a <= Math.PI * 2.26; a += Math.PI / 7) { circle(ctx, Math.cos(a) * 26, -57 + Math.sin(a) * 24, 8.5); hairFill(ctx, hc); ctx.stroke(); }
    }
    backVolume(ctx, hc);
  }
  function hairFront(ctx, style, hc) {
    switch (style) {
      case 0: // fluffy short + cowlick
        cap(ctx, hc); BANGS.soft.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -45);
        ctx.beginPath(); ctx.moveTo(-1, -84); ctx.bezierCurveTo(-2, -96, 12, -100, 14, -93); ctx.bezierCurveTo(8, -95, 4, -91, 4, -84); ctx.closePath();
        hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.3; ctx.stroke();
        break;
      case 1: { // spiky
        const pts = [[-23, -64], [-31, -80], [-18, -78], [-16, -97], [-5, -84], [3, -101], [10, -84], [21, -95], [19, -78], [32, -79], [24, -64]];
        ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]); ctx.closePath();
        hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5; ctx.stroke();
        cap(ctx, hc); BANGS.spiky.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -47, 'both', 1.5);
        break;
      }
      case 2: cap(ctx, hc); BANGS.soft.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -27, 'both', 2.5); break;
      case 3: cap(ctx, hc, 26.5); BANGS.blunt.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -37, 'both', 5); break;
      case 4: // bun
        circle(ctx, 0, -90, 11); hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.5; ctx.stroke();
        ctx.strokeStyle = shade(hc, 0.45); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(0, -90, 6, Math.PI * 1.1, Math.PI * 1.6); ctx.stroke();
        cap(ctx, hc); BANGS.soft.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -46);
        rr(ctx, -7, -82, 14, 4, 2); ctx.fillStyle = '#FF6B9A'; ctx.fill();
        break;
      case 5: cap(ctx, hc); BANGS.sweep.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -44, 'left'); tie(ctx, 18, -74); break;
      case 6: { // curly
        cap(ctx, hc);
        ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.3;
        for (const [x, y, r] of [[-18, -64, 6.5], [-9, -67, 7], [1, -68, 7], [11, -67, 7], [19, -63, 6.5]]) { circle(ctx, x, y, r); hairFill(ctx, hc); ctx.stroke(); }
        for (const s of [-1, 1]) for (const [y, r] of [[-56, 6], [-46, 5.5]]) { circle(ctx, s * 24, y, r); hairFill(ctx, hc); ctx.stroke(); }
        break;
      }
      case 7: cap(ctx, hc); BANGS.soft.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -42); tie(ctx, -21, -70); tie(ctx, 21, -70); break;
      case 8: { // side braid on the right
        cap(ctx, hc); BANGS.sweep.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -44, 'left');
        for (let i = 0; i < 5; i++) { ellipse(ctx, 21 + i * 1.6, -47 + i * 7, 5.8 - i * 0.25, 4.6, (i % 2 ? 0.35 : -0.35)); hairFill(ctx, hc); ctx.strokeStyle = edge(hc); ctx.lineWidth = 1.2; ctx.stroke(); }
        tie(ctx, 28, -12, 2.8);
        break;
      }
      case 9: // side part, big swept fringe
        cap(ctx, hc); BANGS.sweep.forEach((b) => strand(ctx, hc, b)); sideLocks(ctx, hc, -44, 'right');
        strand(ctx, hc, [-26, -16, -60, -24, -42, 2]);
        break;
      case 10:
        ellipse(ctx, -7, -69, 6, 3, -0.4); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fill();
        return;
    }
    shine(ctx, hc);
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
          ctx.beginPath(); ctx.moveTo(s * 23, -70); ctx.lineTo(s * 20, -93); ctx.lineTo(s * 6, -80); ctx.closePath(); fillStroke(ctx, hc);
          ctx.beginPath(); ctx.moveTo(s * 19, -74); ctx.lineTo(s * 19, -87); ctx.lineTo(s * 11, -80); ctx.closePath(); ctx.fillStyle = '#FFB3C7'; ctx.fill();
        }
        break;
      case 3:
        ctx.beginPath();
        ctx.moveTo(-11, -81); ctx.lineTo(-12, -95); ctx.lineTo(-5.5, -89); ctx.lineTo(0, -98); ctx.lineTo(5.5, -89); ctx.lineTo(12, -95); ctx.lineTo(11, -81);
        ctx.closePath(); fillStroke(ctx, '#FFD43B');
        circle(ctx, 0, -87, 2); ctx.fillStyle = '#FF4D6D'; ctx.fill();
        break;
      case 4:
        ctx.fillStyle = '#FF8FCB';
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; circle(ctx, 18 + Math.cos(a) * 4.5, -76 + Math.sin(a) * 4.5, 4); ctx.fill(); }
        circle(ctx, 18, -76, 2.8); ctx.fillStyle = '#FFD43B'; ctx.fill();
        break;
      case 5:
        ctx.strokeStyle = '#4A4A5A'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.arc(0, -56, 30, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
        rr(ctx, -33, -60, 9, 15, 4); fillStroke(ctx, '#FF6B9A');
        rr(ctx, 24, -60, 9, 15, 4); fillStroke(ctx, '#FF6B9A');
        break;
      case 6:
        ctx.beginPath(); ctx.moveTo(16, -79); ctx.lineTo(5, -87); ctx.lineTo(6, -71); ctx.closePath(); fillStroke(ctx, '#FF4D6D');
        ctx.beginPath(); ctx.moveTo(16, -79); ctx.lineTo(27, -87); ctx.lineTo(26, -71); ctx.closePath(); fillStroke(ctx, '#FF4D6D');
        circle(ctx, 16, -79, 3.2); ctx.fillStyle = '#E8414B'; ctx.fill();
        break;
      case 7: // straw hat
        ellipse(ctx, 0, -73, 40, 10); fillStroke(ctx, '#F2C46D');
        ctx.beginPath(); ctx.moveTo(-21, -75); ctx.quadraticCurveTo(-21, -101, 0, -102); ctx.quadraticCurveTo(21, -101, 21, -75); ctx.closePath(); fillStroke(ctx, '#F7D488');
        rr(ctx, -21, -83, 42, 7, 2); ctx.fillStyle = '#E8573F'; ctx.fill();
        ctx.strokeStyle = 'rgba(160,110,40,.35)'; ctx.lineWidth = 1;
        for (let i = -30; i <= 30; i += 10) { ctx.beginPath(); ctx.moveTo(i, -77); ctx.lineTo(i * 1.2, -69); ctx.stroke(); }
        break;
      case 8: // bandana
        ctx.beginPath(); ctx.moveTo(-26, -66); ctx.quadraticCurveTo(0, -100, 26, -66); ctx.quadraticCurveTo(0, -76, -26, -66); ctx.closePath(); fillStroke(ctx, '#E8414B');
        ctx.fillStyle = '#fff';
        for (const [x, y] of [[-12, -78], [0, -84], [12, -78], [-5, -74], [7, -74]]) { circle(ctx, x, y, 1.6); ctx.fill(); }
        ctx.beginPath(); ctx.moveTo(25, -67); ctx.lineTo(34, -72); ctx.lineTo(31, -62); ctx.closePath(); fillStroke(ctx, '#E8414B');
        ctx.beginPath(); ctx.moveTo(25, -67); ctx.lineTo(35, -60); ctx.lineTo(27, -57); ctx.closePath(); fillStroke(ctx, '#E8414B');
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
    const season = av.seasonal === 1 ? null : (o.season !== undefined ? o.season : window.Avatar && window.Avatar.season);
    const winter = season === 'winter', summer = season === 'summer';
    const coat = oc === '#FFFFFF' ? '#9BB7E8' : oc;
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
      if (winter) { rr(ctx, lx - 4.2, -8 - lift, 8.4, 8, 3); ctx.fillStyle = '#7A4B2E'; ctx.fill(); rr(ctx, lx - 4.4, -9 - lift, 8.8, 3, 1.5); ctx.fillStyle = '#F5EDE0'; ctx.fill(); }
      else { ellipse(ctx, lx, -2.5 - lift, 5, 3); ctx.fillStyle = summer ? '#4CC9F0' : '#4B3B3B'; ctx.fill(); }
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

    // seasonal layers on the body
    if (winter) { // puffy coat with fur trim
      rr(ctx, -15.5, -38.5, 31, 28, 10); fillStroke(ctx, coat);
      ctx.strokeStyle = shade(coat, -0.18); ctx.lineWidth = 1.2;
      for (const yy of [-30, -22]) { ctx.beginPath(); ctx.moveTo(-14, yy); ctx.quadraticCurveTo(0, yy + 2, 14, yy); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(0, -37); ctx.lineTo(0, -12); ctx.stroke();
      rr(ctx, -16, -14, 32, 6, 3); ctx.fillStyle = '#F5EDE0'; ctx.fill();
    } else if (season === 'spring') {
      ctx.fillStyle = '#FFB3CF';
      for (let i = 0; i < 5; i++) { const a2 = (i / 5) * Math.PI * 2; circle(ctx, -7 + Math.cos(a2) * 2.4, -27 + Math.sin(a2) * 2.4, 2); ctx.fill(); }
      circle(ctx, -7, -27, 1.4); ctx.fillStyle = '#FFE066'; ctx.fill();
    }

    // arms
    const as = walking ? Math.sin(t) * 0.35 : 0;
    for (const [side, swing] of [[-1, as], [1, -as]]) {
      ctx.save();
      ctx.translate(side * 12.5, -34);
      ctx.rotate(side * 0.28 + swing);
      if (winter) {
        rr(ctx, -4.8, -1, 9.6, 16, 4.8); fillStroke(ctx, coat, 1.2);
        rr(ctx, -5, 11, 10, 3, 1.5); ctx.fillStyle = '#F5EDE0'; ctx.fill();
        circle(ctx, 0, 16.5, 4.3); fillStroke(ctx, '#E8414B', 1.2);
      } else if (summer && outfit !== 2) {
        rr(ctx, -3.3, 3, 6.6, 12, 3.3); fillStroke(ctx, skin, 1.1);
        rr(ctx, -4, 0, 8, 6.5, 3); fillStroke(ctx, sleeve, 1.2);
        circle(ctx, 0, 15.5, 4); fillStroke(ctx, skin, 1.2);
      } else {
        rr(ctx, -3.6, 0, 7.2, 14, 3.6); fillStroke(ctx, sleeve, 1.2);
        circle(ctx, 0, 15.5, 4); fillStroke(ctx, skin, 1.2);
      }
      ctx.restore();
    }

    // head
    circle(ctx, -21, -52, 5); fillStroke(ctx, skin, 1.3);
    circle(ctx, 21, -52, 5); fillStroke(ctx, skin, 1.3);
    circle(ctx, 0, -54, 22); fillStroke(ctx, skin, 1.6);

    drawFace(ctx, av.face || 0);
    // scarf (winter: red stripes, autumn: knitted mustard), wrapped just under the chin
    if (winter || season === 'autumn') {
      const sc = winter ? '#E8414B' : '#E8A33B';
      rr(ctx, 6, -33, 7.5, 16, 3); fillStroke(ctx, sc, 1.2);
      rr(ctx, -15, -37, 30, 8.5, 4.2); fillStroke(ctx, sc, 1.2);
      ctx.strokeStyle = winter ? '#fff' : shade(sc, -0.22); ctx.lineWidth = 1.5;
      for (const yy of [-24, -20]) { ctx.beginPath(); ctx.moveTo(6.8, yy); ctx.lineTo(12.7, yy); ctx.stroke(); }
      for (const xx of [-8, 0, 8]) { ctx.beginPath(); ctx.moveTo(xx, -36); ctx.lineTo(xx, -29.5); ctx.stroke(); }
    }

    hairFront(ctx, hair, hc);
    drawAcc(ctx, av.acc || 0, hc);
    if (!av.acc && hair !== 10) {
      if (winter) { // earmuffs
        ctx.strokeStyle = '#E8414B'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, -56, 28, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke();
        for (const sx of [-25, 25]) { circle(ctx, sx, -52, 6.5); fillStroke(ctx, '#FFFFFF', 1.2); }
      } else if (season === 'spring') { // blossom hair clip
        ctx.fillStyle = '#FFB3CF';
        for (let i = 0; i < 5; i++) { const a2 = (i / 5) * Math.PI * 2; circle(ctx, -17 + Math.cos(a2) * 3.4, -72 + Math.sin(a2) * 3.4, 3); ctx.fill(); }
        circle(ctx, -17, -72, 2); ctx.fillStyle = '#FFE066'; ctx.fill();
      } else if (summer) { // sunglasses pushed up on the head
        ctx.fillStyle = '#2B2D42'; rr(ctx, -13, -78, 11, 6, 3); ctx.fill(); rr(ctx, 2, -78, 11, 6, 3); ctx.fill();
        ctx.strokeStyle = '#2B2D42'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, -75); ctx.lineTo(2, -75); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function random() {
    const r = (n) => Math.floor(Math.random() * n);
    return { skin: r(SKIN.length), hair: r(HAIR_COUNT - 1), hairColor: r(HAIR_COLOR.length), outfit: r(OUTFIT_COUNT),
      outfitColor: r(OUTFIT_COLOR.length), face: r(FACE_COUNT), acc: Math.random() < 0.5 ? 0 : r(ACC_COUNT), seasonal: 0 };
  }

  const thumbCache = new Map();
  function thumb(av, size = 48, full = false) {
    const key = JSON.stringify(av) + size + full + (window.Avatar && window.Avatar.season);
    if (thumbCache.has(key)) return thumbCache.get(key);
    const c = document.createElement('canvas');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = size * dpr;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    if (full) draw(ctx, av, size / 2, size * 0.94, { scale: size / 100 });
    else draw(ctx, av, size / 2, size * 1.33, { scale: size / 76 });
    const url = c.toDataURL();
    if (thumbCache.size > 300) thumbCache.clear();
    thumbCache.set(key, url);
    return url;
  }

  window.Avatar = {
    draw, random, thumb, shade, rr, heart,
    // Option lists; names come from I18N ('opts' → hairNames, outfitNames, faceNames, accNames)
    OPTIONS: {
      skin: { colors: SKIN },
      hair: { count: HAIR_COUNT },
      hairColor: { colors: HAIR_COLOR },
      outfit: { count: OUTFIT_COUNT },
      outfitColor: { colors: OUTFIT_COLOR },
      face: { count: FACE_COUNT },
      acc: { count: ACC_COUNT },
      seasonal: { count: 2 },
    },
    season: null,
  };
})();
