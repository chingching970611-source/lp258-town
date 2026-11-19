/* Seasons: scenery colours, weather particles and original procedural background music (Web Audio). */
(function () {
  const ORDER = ['spring', 'summer', 'autumn', 'winter'];
  const ICON = { spring: '🌸', summer: '☀️', autumn: '🍁', winter: '❄️' };
  // Northern-hemisphere seasons (Hong Kong): Mar–May spring, Jun–Aug summer, Sep–Nov autumn, Dec–Feb winter.
  function fromDate(d = new Date()) {
    const m = d.getMonth();
    return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter';
  }

  const THEMES = {
    spring: { grass: '#A8E28E', tuft: '#92D27A', canopy: ['#FFB7D0', '#FF9FC2', '#FFD6E5'], trunk: '#A56B3F', flowers: ['#FF8FCB', '#FFFFFF', '#FFD6E5', '#FFE066'], path: ['#E3CB92', '#F6E7BF'], water: '#7FD3F7', tint: 'rgba(255,170,200,.05)', snow: false },
    summer: { grass: '#8FDB6E', tuft: '#78C95A', canopy: ['#4FB548', '#5FC657', '#86DC74'], trunk: '#9A5F36', flowers: ['#FFE066', '#FF7A7A', '#FFB84D', '#FFFFFF'], path: ['#E3CB92', '#F6E7BF'], water: '#5CC8F5', tint: 'rgba(255,220,120,.06)', snow: false },
    autumn: { grass: '#C9D77A', tuft: '#B5C366', canopy: ['#F29E4C', '#E8743B', '#FFC46B'], trunk: '#8A5530', flowers: ['#E8743B', '#FFC46B', '#B07CFF', '#FFFFFF'], path: ['#D9BE84', '#EEDCAF'], water: '#79C7E8', tint: 'rgba(255,150,60,.07)', snow: false },
    winter: { grass: '#EAF3F8', tuft: '#D2E2EB', canopy: ['#5D9C7E', '#6FAE8E', '#FFFFFF'], trunk: '#8A6A55', flowers: ['#FFFFFF', '#CFE8FF', '#FFD6E5', '#FF7A7A'], path: ['#D9CDB6', '#EFE6D6'], water: '#BFE6F5', tint: 'rgba(120,170,255,.07)', snow: true },
  };

  // ---------------------------------------------------------------- weather particles (screen space)
  let parts = [], partSeason = null;
  function rand(a, b) { return a + Math.random() * (b - a); }
  function makePart(season, w, h, anywhere) {
    const p = { x: rand(0, w), y: anywhere ? rand(0, h) : rand(-40, -10), r: 0, vr: rand(-2, 2), ph: rand(0, 6.28) };
    if (season === 'spring') Object.assign(p, { s: rand(4, 7), vx: rand(15, 40), vy: rand(25, 50), c: Math.random() < 0.7 ? '#FFC1D9' : '#FFFFFF' });
    else if (season === 'autumn') Object.assign(p, { s: rand(6, 10), vx: rand(-10, 25), vy: rand(30, 60), c: ['#E8743B', '#F29E4C', '#FFC46B', '#C9543A'][Math.floor(rand(0, 4))] });
    else if (season === 'winter') Object.assign(p, { s: rand(1.5, 4), vx: rand(-8, 8), vy: rand(25, 70), c: '#FFFFFF' });
    else Object.assign(p, { s: rand(1.5, 3), vx: rand(-6, 6), vy: rand(-8, -2), y: anywhere ? rand(0, h) : h + 10, c: 'rgba(255,250,200,.9)' });
    return p;
  }
  function drawWeather(ctx, season, w, h, dt, t) {
    const n = season === 'winter' ? Math.round(w * h / 9000) : season === 'summer' ? Math.round(w * h / 30000) : Math.round(w * h / 16000);
    if (partSeason !== season) { parts = []; partSeason = season; for (let i = 0; i < n; i++) parts.push(makePart(season, w, h, true)); }
    while (parts.length < n) parts.push(makePart(season, w, h, false));
    if (parts.length > n) parts.length = n;
    // tint
    ctx.fillStyle = THEMES[season].tint; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.ph += dt * 1.5; p.r += p.vr * dt;
      p.x += (p.vx + Math.sin(p.ph) * (season === 'autumn' ? 30 : 12)) * dt;
      p.y += p.vy * dt;
      if (p.y > h + 20 || p.y < -50 || p.x > w + 30 || p.x < -30) { parts[i] = makePart(season, w, h, false); continue; }
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c;
      if (season === 'spring') { ctx.beginPath(); ctx.ellipse(0, 0, p.s, p.s * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
      else if (season === 'autumn') {
        ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.quadraticCurveTo(p.s * 0.9, 0, 0, p.s); ctx.quadraticCurveTo(-p.s * 0.9, 0, 0, -p.s); ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,.15)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -p.s); ctx.lineTo(0, p.s); ctx.stroke();
      } else if (season === 'winter') { ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill(); }
      else { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t / 300 + p.ph * 3); ctx.beginPath(); ctx.arc(0, 0, p.s, 0, Math.PI * 2); ctx.fill(); }
      ctx.restore();
    }
    if (season === 'summer') { // soft sun glow in the corner
      const g = ctx.createRadialGradient(w - 40, 30, 10, w - 40, 30, Math.max(w, h) * 0.5);
      g.addColorStop(0, 'rgba(255,240,170,.35)'); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    }
  }

  // ---------------------------------------------------------------- music (original tunes, synthesized live)
  // Notes are semitone offsets from `root` (MIDI). null = rest. 8 eighth-notes per bar, 4 bars.
  const SONGS = {
    // town tunes: cheerful countryside folk — flute, acoustic guitar, accordion, marimba, music box
    spring: { bpm: 112, root: 60, inst: 'flute', leadVol: 0.085, comp: 'boomchick', compVol: 0.045, pad: 0.006, drums: 'folk', swing: 0.1, glock: 0.045, vol: 0.43,
      chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14, 17], [0, 4, 7]],
      melody: [16, null, 16, 17, 19, null, 16, null, 17, null, 21, null, 19, 17, 16, null, 14, null, 14, 16, 17, null, 19, null, 16, null, 12, null, null, null, 12, 14,
        16, null, 16, 17, 19, null, 24, null, 21, null, 19, null, 17, null, 16, 17, 19, null, 17, null, 14, null, 11, null, 12, null, null, null, null, null, null, null] },
    summer: { bpm: 124, root: 55, inst: 'marimba', oct: 12, leadVol: 0.13, comp: 'offbeat', compVol: 0.04, drums: 'island', glock: 0.03, vol: 0.41,
      chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14], [0, 4, 7]],
      melody: [12, 14, 16, null, 19, null, 16, 14, 17, null, 17, 16, 17, null, 21, null, 19, null, 16, null, 14, null, 12, 14, 16, null, null, null, 12, null, null, null,
        19, 21, 19, null, 16, null, 19, null, 21, null, 24, null, 21, 19, 17, null, 19, null, 17, 16, 14, null, 16, 17, 19, null, null, null, null, null, null, null] },
    autumn: { meter: 3, bpm: 138, root: 57, inst: 'accordion', leadVol: 0.032, comp: 'waltz', compVol: 0.045, pad: 0.006, drums: 'waltz', vol: 0.43,
      chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17], [0, 3, 7], [5, 8, 12], [7, 11, 14], [0, 3, 7]],
      melody: [12, null, 15, null, 19, null, 20, null, 19, null, 15, null, 15, null, 14, null, 15, 17, 19, null, null, null, 17, null,
        15, null, 12, null, 15, null, 17, null, 20, null, 17, 15, 14, null, null, null, 11, null, 12, null, null, null, null, null] },
    winter: { bpm: 80, root: 53, inst: 'musicbox', oct: 12, leadVol: 0.11, keysComp: 0.014, pad: 0.011, bass: 'half', drums: 'sleigh', vol: 0.43,
      chords: [[0, 4, 7], [4, 7, 11], [5, 9, 12], [7, 11, 14], [0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
      melody: [12, null, 16, null, 19, null, 16, null, 16, null, 19, null, 23, null, 19, null, 17, null, 21, null, 24, null, 21, 19, 19, null, null, null, 14, null, null, null,
        12, null, 16, null, 19, null, 24, null, 21, null, 19, null, 16, null, 14, null, 17, null, 16, null, 14, null, 12, null, 12, null, null, null, null, null, null, null] },
    // Game Zone: bouncy arcade pop
    arcade: { bpm: 140, root: 60, lead: 'square', leadVol: 0.05, cut: 3400, pad: 0.014, bass: 'pump', arp: 0.024, drums: 'pop', vol: 0.32,
      chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12], [0, 4, 7], [7, 11, 14], [5, 9, 12], [7, 11, 14]],
      melody: [12, null, 16, 19, 24, null, 19, 16, 14, null, 19, null, 23, 21, 19, null, 16, null, 21, null, 24, null, 21, 19, 17, null, 16, 14, 12, null, 14, null,
        19, 19, null, 19, 21, null, 19, 16, 14, 14, null, 14, 16, null, 19, null, 17, null, 17, 16, 17, null, 21, null, 19, null, 23, null, 26, 24, 23, null] },
    // live PK: fast, intense battle
    battle: { bpm: 166, root: 57, lead: 'sawtooth', leadVol: 0.05, cut: 2400, pad: 0.016, bass: 'drive', drums: 'battle', vol: 0.3,
      chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17], [0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 11, 14]],
      melody: [12, null, 12, 15, null, 12, 19, null, 20, null, 19, null, 15, null, 12, null, 15, null, 15, 19, null, 15, 22, null, 22, null, 20, 19, 17, null, 15, null,
        24, null, 24, 22, 24, null, 27, null, 24, 22, 20, null, 19, null, 15, null, 17, null, 20, null, 24, null, 20, 17, 19, null, 23, null, 26, null, 23, null] },
    // chat café: cosy acoustic café — soft piano with guitar
    cafe: { bpm: 96, root: 53, inst: 'keys', leadVol: 0.1, comp: 'boomchick', compVol: 0.035, pad: 0.008, drums: 'folk', swing: 0.18, vol: 0.44,
      chords: [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17], [0, 4, 7, 11], [4, 7, 11, 14], [2, 5, 9, 12], [7, 11, 14, 17]],
      melody: [16, null, null, 19, null, 16, 14, null, 12, null, null, null, 16, null, 19, null, 17, null, 16, null, 14, null, 12, null, 11, null, 14, null, null, null, null, null,
        19, null, 21, 19, null, 16, null, null, 16, null, 19, null, 23, null, 21, null, 17, null, null, 14, null, 17, 16, 14, 12, null, null, null, null, null, null, null] },
  };
  const DRUMS = {
    soft: { kick: [0, 4], snare: [], hat: [2, 6], kickVol: 0.32, hatVol: 0.025 },
    pop: { kick: [0, 3, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6], open: [7], kickVol: 0.5, snareVol: 0.16, hatVol: 0.045 },
    battle: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hat16: true, fill: true, kickVol: 0.55, snareVol: 0.18, hatVol: 0.04 },
    lofi: { kick: [0, 5], snare: [4], hat: [0, 1, 2, 3, 4, 5, 6, 7], kickVol: 0.38, snareVol: 0.08, hatVol: 0.022, soft: true },
    // countryside percussion
    folk: { kick: [0, 4], kickVol: 0.22, snare: [], hat: [], wood: [2, 6], woodVol: 0.05, shaker: [0, 1, 2, 3, 4, 5, 6, 7], shakerVol: 0.028 },
    island: { kick: [0, 3, 4], kickVol: 0.25, snare: [], hat: [], wood: [3, 6, 7], woodVol: 0.05, low: true, shaker: [0, 1, 2, 3, 4, 5, 6, 7], shaker16: true, shakerVol: 0.022 },
    waltz: { kick: [0], kickVol: 0.2, snare: [], hat: [], shaker: [2, 4], shakerVol: 0.03 },
    sleigh: { kick: [0], kickVol: 0.13, snare: [], hat: [], sleigh: [0, 2, 4, 6], sleighVol: 0.035 },
  };
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function impulse(ac, secs, decay) {
    const n = Math.floor(ac.sampleRate * secs), b = ac.createBuffer(2, n, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, decay); }
    return b;
  }
  function buildGraph(ac, out) {
    const E = { ac };
    E.master = ac.createGain(); E.master.gain.value = 0;
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 10; comp.ratio.value = 3; comp.attack.value = 0.01; comp.release.value = 0.2;
    E.master.connect(comp); comp.connect(out);
    E.bus = ac.createGain(); E.bus.connect(E.master);
    E.duck = ac.createGain(); E.duck.connect(E.bus); // pads + bass dip a little on each kick (the "pumping" feel)
    const rev = ac.createConvolver(); rev.buffer = impulse(ac, 2.4, 2.8);
    const revOut = ac.createGain(); revOut.gain.value = 0.3; rev.connect(revOut); revOut.connect(E.master);
    E.rev = ac.createGain(); E.rev.connect(rev);
    const dly = ac.createDelay(1.5), fb = ac.createGain(), lp = ac.createBiquadFilter(), dOut = ac.createGain();
    fb.gain.value = 0.3; lp.type = 'lowpass'; lp.frequency.value = 2600; dOut.gain.value = 0.3;
    dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(dOut); dOut.connect(E.master);
    E.dly = ac.createGain(); E.dly.connect(dly); E.delayNode = dly;
    const nb = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.5), ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    E.noise = nb;
    return E;
  }
  function sends(E, node, rev, dly) {
    if (rev) { const s = E.ac.createGain(); s.gain.value = rev; node.connect(s); s.connect(E.rev); }
    if (dly) { const s = E.ac.createGain(); s.gain.value = dly; node.connect(s); s.connect(E.dly); }
  }
  function osc(E, type, f, t, dur, dest, detune = 0) {
    const o = E.ac.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
    o.connect(dest); o.start(t); o.stop(t + dur); return o;
  }
  const I = {
    pad(E, notes, t, dur, vol) {
      const f = E.ac.createBiquadFilter(), g = E.ac.createGain();
      f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(1500, t + dur * 0.6);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + Math.min(0.5, dur * 0.3)); g.gain.setTargetAtTime(0, t + dur, 0.35);
      f.connect(g); g.connect(E.duck); sends(E, g, 0.6, 0);
      for (const m of notes) for (const det of [-8, 8]) osc(E, 'sawtooth', freq(m), t, dur + 1.6, f, det);
    },
    bass(E, m, t, dur, vol) {
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = 650;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.008); g.gain.setTargetAtTime(0, t + dur * 0.85, 0.05);
      f.connect(g); g.connect(E.duck);
      osc(E, 'triangle', freq(m), t, dur + 0.4, f);
      const sg = E.ac.createGain(); sg.gain.value = 0.8; sg.connect(f); osc(E, 'sine', freq(m - 12), t, dur + 0.4, sg);
    },
    lead(E, m, t, dur, vol, type, cut) {
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = cut || 3000; f.Q.value = 2;
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01); g.gain.setTargetAtTime(0, t + dur, 0.08);
      f.connect(g); g.connect(E.bus); sends(E, g, 0.22, 0.26);
      const lfo = E.ac.createOscillator(), lg = E.ac.createGain();
      lfo.frequency.value = 5.5; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(10, t + 0.3);
      lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.6);
      for (const det of [-6, 6]) { const o = osc(E, type, freq(m), t, dur + 0.6, f, det); lg.connect(o.detune); }
    },
    keys(E, m, t, dur, vol) { // soft electric piano
      const g = E.ac.createGain();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.9);
      g.connect(E.bus); sends(E, g, 0.4, 0.14);
      for (const [mul, v] of [[1, 1], [2, 0.22], [3.01, 0.07]]) { const og = E.ac.createGain(); og.gain.value = v; og.connect(g); osc(E, 'sine', freq(m) * mul, t, dur + 1, og); }
    },
    pluck(E, m, t, vol) {
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter();
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      f.type = 'lowpass'; f.frequency.setValueAtTime(4200, t); f.frequency.exponentialRampToValueAtTime(600, t + 0.2);
      f.connect(g); g.connect(E.bus); sends(E, g, 0.3, 0.22);
      osc(E, 'square', freq(m), t, 0.3, f);
    },
    bell(E, m, t, vol) {
      for (const [mult, v, dur] of [[1, 1, 1.8], [2.76, 0.33, 0.7], [5.4, 0.12, 0.35]]) {
        const g = E.ac.createGain();
        g.gain.setValueAtTime(vol * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        g.connect(E.bus); sends(E, g, 0.5, 0.15);
        osc(E, 'sine', freq(m + 12) * mult, t, dur + 0.05, g);
      }
    },
    guitar(E, m, t, vol, short) { // plucked acoustic string
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter(), d = short ? 0.2 : 0.65;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      f.type = 'lowpass'; f.frequency.setValueAtTime(3200, t); f.frequency.exponentialRampToValueAtTime(700, t + d * 0.6);
      f.connect(g); g.connect(E.bus); sends(E, g, 0.25, 0);
      osc(E, 'triangle', freq(m), t, d + 0.05, f);
      const sg = E.ac.createGain(); sg.gain.value = 0.35; sg.connect(f); osc(E, 'sawtooth', freq(m), t, d + 0.05, sg, 4);
    },
    strum(E, notes, t, vol, short) { notes.forEach((m, j) => I.guitar(E, m, t + j * 0.013, vol, short)); },
    flute(E, m, t, dur, vol) {
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.05); g.gain.setTargetAtTime(vol * 0.8, t + 0.05, 0.2); g.gain.setTargetAtTime(0, t + dur, 0.07);
      f.type = 'lowpass'; f.frequency.value = 3600; f.connect(g); g.connect(E.bus); sends(E, g, 0.3, 0.18);
      const lfo = E.ac.createOscillator(), lg = E.ac.createGain();
      lfo.frequency.value = 5.2; lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(12, t + 0.35); lfo.connect(lg); lfo.start(t); lfo.stop(t + dur + 0.5);
      const o1 = osc(E, 'sine', freq(m), t, dur + 0.5, f);
      const hg = E.ac.createGain(); hg.gain.value = 0.16; hg.connect(f); const o2 = osc(E, 'triangle', freq(m) * 2, t, dur + 0.5, hg);
      lg.connect(o1.detune); lg.connect(o2.detune);
      const n = E.ac.createBufferSource(), bf = E.ac.createBiquadFilter(), bg = E.ac.createGain(); // breath at the start of each note
      n.buffer = E.noise; bf.type = 'bandpass'; bf.frequency.value = freq(m) * 2; bf.Q.value = 1.5;
      bg.gain.setValueAtTime(vol * 0.5, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      n.connect(bf); bf.connect(bg); bg.connect(E.bus); n.start(t); n.stop(t + 0.15);
    },
    accordion(E, m, t, dur, vol) {
      const g = E.ac.createGain(), f = E.ac.createBiquadFilter();
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.03); g.gain.setTargetAtTime(0, t + dur, 0.06);
      const trem = E.ac.createOscillator(), tg = E.ac.createGain(); trem.frequency.value = 6; tg.gain.value = vol * 0.25; trem.connect(tg); tg.connect(g.gain); trem.start(t); trem.stop(t + dur + 0.4);
      f.type = 'lowpass'; f.frequency.value = 2200; f.Q.value = 1; f.connect(g); g.connect(E.bus); sends(E, g, 0.25, 0.12);
      for (const det of [-12, 0, 12]) osc(E, 'sawtooth', freq(m), t, dur + 0.4, f, det);
      const og = E.ac.createGain(); og.gain.value = 0.3; og.connect(f); osc(E, 'square', freq(m) / 2, t, dur + 0.4, og);
    },
    marimba(E, m, t, vol) {
      for (const [mul, v, d] of [[1, 1, 0.5], [4, 0.25, 0.12], [10, 0.06, 0.03]]) {
        const g = E.ac.createGain(); g.gain.setValueAtTime(vol * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
        g.connect(E.bus); sends(E, g, 0.3, 0.15); osc(E, 'sine', freq(m) * mul, t, d + 0.05, g);
      }
    },
    wood(E, t, vol, low) {
      const base = low ? 420 : 950;
      for (const [mul, v] of [[1, 1], [1.48, 0.5]]) { const g = E.ac.createGain(); g.gain.setValueAtTime(vol * v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06); g.connect(E.bus); sends(E, g, 0.2, 0); osc(E, 'sine', base * mul, t, 0.08, g); }
    },
    shaker(E, t, vol) {
      const n = E.ac.createBufferSource(), f = E.ac.createBiquadFilter(), g = E.ac.createGain();
      n.buffer = E.noise; f.type = 'bandpass'; f.frequency.value = 6500; f.Q.value = 1.2;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      n.connect(f); f.connect(g); g.connect(E.bus); n.start(t); n.stop(t + 0.1);
    },
    sleigh(E, t, vol) {
      const n = E.ac.createBufferSource(), f = E.ac.createBiquadFilter(), g = E.ac.createGain();
      n.buffer = E.noise; f.type = 'highpass'; f.frequency.value = 8500;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      n.connect(f); f.connect(g); g.connect(E.bus); sends(E, g, 0.3, 0); n.start(t); n.stop(t + 0.25);
      for (const [hz, dt] of [[2600, 0], [3300, 0.012], [4100, 0.025]]) { const bg = E.ac.createGain(); bg.gain.setValueAtTime(vol * 0.5, t + dt); bg.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.12); bg.connect(E.bus); osc(E, 'sine', hz, t + dt, 0.15, bg); }
    },
    kick(E, t, vol) {
      const o = E.ac.createOscillator(), g = E.ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.11);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
      o.connect(g); g.connect(E.bus); o.start(t); o.stop(t + 0.32);
      E.duck.gain.setValueAtTime(0.35, t); E.duck.gain.setTargetAtTime(1, t + 0.03, 0.09);
    },
    snare(E, t, vol, soft) {
      const n = E.ac.createBufferSource(), f = E.ac.createBiquadFilter(), g = E.ac.createGain();
      n.buffer = E.noise; f.type = 'bandpass'; f.frequency.value = soft ? 3000 : 1800; f.Q.value = 0.7;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.12 : 0.18));
      n.connect(f); f.connect(g); g.connect(E.bus); sends(E, g, 0.35, 0); n.start(t); n.stop(t + 0.25);
      const tg = E.ac.createGain(); tg.gain.setValueAtTime(vol * 0.6, t); tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); tg.connect(E.bus);
      const o = osc(E, 'triangle', 220, t, 0.1, tg); o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(120, t + 0.06);
    },
    hat(E, t, vol, open) {
      const n = E.ac.createBufferSource(), f = E.ac.createBiquadFilter(), g = E.ac.createGain();
      n.buffer = E.noise; f.type = 'highpass'; f.frequency.value = 8000;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.22 : 0.045));
      n.connect(f); f.connect(g); g.connect(E.bus); n.start(t); n.stop(t + 0.3);
    },
  };
  function noteLen(mel, i) { let n = 1; while (n < 4 && mel[(i + n) % mel.length] == null) n++; return n; }
  function schedule(E, s, i, t, spb) {
    const per = s.meter === 3 ? 6 : 8, bars = s.chords.length, k = i % (bars * per), bar = Math.floor(k / per), beat = k % per, ch = s.chords[bar];
    const at = t + (s.swing && beat % 2 ? spb * s.swing : 0);
    if (beat === 0 && s.pad) I.pad(E, ch.map((n) => s.root + n), at, spb * per, s.pad);
    const low = s.root - 12 + ch[0], low5 = s.root - 24 + (ch[2] ?? ch[0] + 7), strum = ch.map((n) => s.root + n);
    if (s.comp === 'boomchick') { // bass on 1 and 3 (root, then fifth), guitar on 2 and 4
      if (beat === 0 || beat === 4) I.bass(E, beat === 0 ? low : low5, at, spb * 1.6, 0.2);
      if (beat === 2 || beat === 6) I.strum(E, strum, at, s.compVol);
    } else if (s.comp === 'offbeat') { // island feel: short strums between the beats
      if (beat === 0 || beat === 4) I.bass(E, beat === 0 ? low : low5, at, spb * 1.4, 0.2);
      if (beat % 2 === 1) I.strum(E, strum, at, s.compVol, true);
    } else if (s.comp === 'waltz') { // oom-pah-pah
      if (beat === 0) I.bass(E, bar % 2 ? low5 : low, at, spb * 1.8, 0.2);
      if (beat === 2 || beat === 4) I.strum(E, strum, at, s.compVol, true);
    } else if (s.bass === 'drive') I.bass(E, low + (beat % 2 ? 12 : 0), at, spb * 0.9, 0.2);
    else if (s.bass === 'pump') { if ([0, 3, 4, 6].includes(beat)) I.bass(E, low, at, spb * (beat === 0 || beat === 4 ? 1.4 : 0.9), 0.22); }
    else if (s.bass === 'walk') { if (beat % 2 === 0) I.bass(E, s.root - 12 + ch[(beat / 2) % ch.length], at, spb * 1.8, 0.2); }
    else if (beat === 0 || beat === 4) I.bass(E, low, at, spb * 3, 0.2);
    if (s.arp) I.pluck(E, s.root + 12 + ch[[0, 1, 2, 1, 0, 2, 1, 2][beat] % ch.length], at, s.arp);
    if (s.keysComp && (beat === 0 || beat === 3 || beat === 6)) for (const n of ch) I.keys(E, s.root + n, at, spb * 1.5, s.keysComp);
    if (s.glock && beat === 0 && bar % 2 === 1) I.bell(E, s.root + ch[ch.length - 1] + 12, at, s.glock); // little sparkle
    const m = s.melody[k % s.melody.length];
    if (m != null) {
      const len = noteLen(s.melody, k) * spb, n = s.root + m + (s.oct || 0);
      const inst = s.inst || (s.bell ? 'musicbox' : s.keys ? 'keys' : 'synth');
      if (inst === 'flute') I.flute(E, n, at, len, s.leadVol);
      else if (inst === 'accordion') I.accordion(E, n, at, len * 0.95, s.leadVol);
      else if (inst === 'marimba') I.marimba(E, n, at, s.leadVol);
      else if (inst === 'musicbox') I.bell(E, n, at, s.leadVol || 0.11);
      else if (inst === 'keys') I.keys(E, n, at, len, s.leadVol);
      else I.lead(E, n, at, len * 0.95, s.leadVol, s.lead, s.cut);
    }
    const d = DRUMS[s.drums];
    if (d) {
      const last = bar === bars - 1;
      if (d.kick.includes(beat)) I.kick(E, at, d.kickVol);
      if (d.snare.includes(beat) || (d.fill && last && beat >= 5)) I.snare(E, at, d.snareVol || 0.15, d.soft);
      if (d.hat.includes(beat)) I.hat(E, at, d.hatVol * (beat % 2 ? 0.7 : 1));
      if (d.open && d.open.includes(beat)) I.hat(E, at, d.hatVol * 1.2, true);
      if (d.hat16) I.hat(E, at + spb / 2, d.hatVol * 0.55);
      if (d.wood && d.wood.includes(beat)) I.wood(E, at, d.woodVol, d.low);
      if (d.shaker && d.shaker.includes(beat)) I.shaker(E, at, d.shakerVol * (beat % 2 ? 0.7 : 1));
      if (d.shaker16) I.shaker(E, at + spb / 2, d.shakerVol * 0.6);
      if (d.sleigh && d.sleigh.includes(beat)) I.sleigh(E, at, d.sleighVol);
    }
  }
  const Music = {
    ac: null, E: null, timer: null, step: 0, next: 0, song: null, season: null, playing: false,
    get master() { return this.E && this.E.master; },
    ensure() {
      if (this.ac) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ac = new AC();
      this.E = buildGraph(this.ac, this.ac.destination);
      document.addEventListener('visibilitychange', () => { if (!this.ac) return; if (document.hidden) this.ac.suspend(); else if (this.playing) this.ac.resume(); });
      return true;
    },
    // key = a season name or 'arcade' / 'battle' / 'cafe'; switching tracks fades out and back in
    play(key) {
      if (!this.ensure()) return;
      this.ac.resume();
      if (this.playing && this.season === key) return;
      const song = SONGS[key] || SONGS.spring;
      const t = this.ac.currentTime, g = this.E.master.gain;
      g.cancelScheduledValues(t);
      if (this.playing) { g.setTargetAtTime(0, t, 0.08); this.next = t + 0.45; g.setTargetAtTime(song.vol, t + 0.45, 0.4); }
      else { this.next = t + 0.1; g.setTargetAtTime(song.vol, t, 0.8); }
      this.E.delayNode.delayTime.setValueAtTime((60 / song.bpm) * 0.75, this.next); // dotted-eighth echo, in time with the song
      this.season = key; this.song = song; this.step = 0;
      this.playing = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), 25);
    },
    stop() {
      if (!this.ac) return;
      this.playing = false;
      this.E.master.gain.cancelScheduledValues(this.ac.currentTime);
      this.E.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.3);
      setTimeout(() => { if (!this.playing) clearInterval(this.timer); }, 1200);
    },
    tick() {
      if (!this.playing) return;
      const s = this.song, spb = 60 / s.bpm / 2; // seconds per eighth note
      while (this.next < this.ac.currentTime + 0.2) { schedule(this.E, s, this.step, this.next, spb); this.next += spb; this.step++; }
    },
    // renders a track to an AudioBuffer (used to make sample recordings)
    render(key, secs, sr = 22050) {
      const s = SONGS[key], off = new OfflineAudioContext(2, Math.floor(sr * secs), sr), E = buildGraph(off, off.destination);
      E.master.gain.value = s.vol; E.delayNode.delayTime.value = (60 / s.bpm) * 0.75;
      const spb = 60 / s.bpm / 2;
      for (let i = 0, t = 0.05; t < secs; i++, t += spb) schedule(E, s, i, t, spb);
      return off.startRendering();
    },
  };

  window.Season = { ORDER, ICON, THEMES, fromDate, drawWeather, Music };
})();
