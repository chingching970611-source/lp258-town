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
    spring: { bpm: 96, root: 60, lead: 'triangle', bell: false,
      chords: [[0, 4, 7], [9, 12, 16], [5, 9, 12], [7, 11, 14]],
      melody: [12, null, 14, 16, 19, null, 16, 14, 12, null, 9, null, 12, 14, 16, null, 17, null, 16, 14, 12, null, 14, 16, 14, null, 11, 12, 14, null, null, null] },
    summer: { bpm: 118, root: 55, lead: 'square', bell: false,
      chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
      melody: [12, 14, 16, null, 19, 16, 14, 12, 14, null, 19, null, 19, 16, 14, null, 16, null, 14, 16, 19, 21, 19, 16, 17, 16, 14, 12, 12, null, null, null] },
    autumn: { bpm: 84, root: 57, lead: 'sine', bell: false,
      chords: [[0, 3, 7], [8, 12, 15], [3, 7, 10], [10, 14, 17]],
      melody: [12, null, 15, null, 14, 12, 10, null, 12, null, 8, null, 10, null, null, null, 15, null, 17, 15, 14, 12, 14, null, 12, null, 10, 7, 12, null, null, null] },
    winter: { bpm: 72, root: 62, lead: 'sine', bell: true,
      chords: [[0, 4, 7, 11], [9, 12, 16], [5, 9, 12, 16], [7, 11, 14]],
      melody: [19, null, 16, null, 14, null, 12, null, 16, null, 14, 12, 11, null, null, null, 12, null, 14, 16, 19, null, 21, 19, 16, null, 14, null, 12, null, null, null] },
    // Game Zone: bouncy arcade tune
    arcade: { bpm: 138, root: 60, lead: 'square', bell: false, drums: 'pop', vol: 0.12,
      chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]],
      melody: [12, 16, 19, 16, 24, null, 19, null, 19, 23, 26, 23, 19, null, 14, null, 21, 19, 16, 19, 21, null, 24, null, 17, 19, 21, 17, 14, null, 19, null] },
    // live PK: fast and intense
    battle: { bpm: 164, root: 57, lead: 'sawtooth', bell: false, drums: 'battle', bass: 'drive', vol: 0.09,
      chords: [[0, 3, 7], [8, 12, 15], [10, 14, 17], [7, 11, 14]],
      melody: [12, null, 12, 15, 19, null, 17, 15, 20, null, 19, 17, 15, null, 12, null, 17, null, 17, 19, 22, null, 19, 17, 19, null, 23, null, 26, null, 23, null] },
    // chat café: slow, soft café tune
    cafe: { bpm: 74, root: 53, lead: 'sine', bell: false, drums: 'lofi', swing: 0.18, arpVol: 0.02, vol: 0.14,
      chords: [[0, 4, 7, 11], [2, 5, 9, 12], [4, 7, 11, 14], [5, 9, 12, 16]],
      melody: [16, null, null, 19, 17, null, 16, null, 14, null, null, 17, 16, null, 12, null, 11, null, 14, null, 16, 19, null, 17, 16, null, null, 14, 12, null, null, null] },
  };
  const DRUMS = { // which eighth-notes (0–7 in a bar) get each drum
    pop: { kick: [0, 4], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.05 },
    battle: { kick: [0, 2, 4, 6], snare: [2, 6], hat: [0, 1, 2, 3, 4, 5, 6, 7], hatVol: 0.06, fill: true },
    lofi: { kick: [0, 5], snare: [4], hat: [1, 3, 5, 7], hatVol: 0.03, soft: true },
  };
  const freq = (m) => 440 * Math.pow(2, (m - 69) / 12);
  const Music = {
    ac: null, master: null, timer: null, step: 0, next: 0, song: null, season: null, playing: false,
    ensure() {
      if (this.ac) return true;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ac = new AC();
      this.master = this.ac.createGain();
      this.master.gain.value = 0;
      this.master.connect(this.ac.destination);
      document.addEventListener('visibilitychange', () => { if (!this.ac) return; if (document.hidden) this.ac.suspend(); else if (this.playing) this.ac.resume(); });
      return true;
    },
    // key = a season name or 'arcade' / 'battle' / 'cafe'; switching tracks fades out and back in
    play(key) {
      if (!this.ensure()) return;
      this.ac.resume();
      if (this.playing && this.season === key) return;
      const song = SONGS[key] || SONGS.spring;
      const t = this.ac.currentTime, g = this.master.gain;
      g.cancelScheduledValues(t);
      if (this.playing) { g.setTargetAtTime(0, t, 0.08); this.next = t + 0.4; g.setTargetAtTime(song.vol || 0.13, t + 0.4, 0.4); }
      else { this.next = t + 0.1; g.setTargetAtTime(song.vol || 0.13, t, 0.8); }
      this.season = key; this.song = song; this.step = 0;
      this.playing = true;
      clearInterval(this.timer);
      this.timer = setInterval(() => this.tick(), 25);
    },
    stop() {
      if (!this.ac) return;
      this.playing = false;
      this.master.gain.setTargetAtTime(0, this.ac.currentTime, 0.3);
      setTimeout(() => { if (!this.playing) clearInterval(this.timer); }, 1200);
    },
    tick() {
      if (!this.playing) return;
      const s = this.song, spb = 60 / s.bpm / 2; // seconds per eighth note
      while (this.next < this.ac.currentTime + 0.15) {
        const i = this.step % 32, bar = Math.floor(i / 8), beat = i % 8, chord = s.chords[bar];
        const at = this.next + (s.swing && beat % 2 ? spb * s.swing : 0);
        if (beat === 0) for (const n of chord) this.note(s.root + n, at, spb * 7.5, 'sine', 0.05, 0.25);
        if (s.bass === 'drive') this.note(s.root - 12 + chord[0] + (beat % 2 ? 12 : 0), at, spb * 0.8, 'triangle', 0.13, 0.005);
        else if (beat === 0 || beat === 4) this.note(s.root - 12 + chord[0], at, spb * 3, 'triangle', 0.16, 0.01);
        this.note(s.root + 12 + chord[(beat >> 1) % chord.length], at, spb * 0.9, s.bell ? 'sine' : 'triangle', s.arpVol || 0.035, 0.005);
        const m = s.melody[i];
        if (m != null) {
          if (s.bell) this.bell(s.root + m, at);
          else this.note(s.root + m, at, spb * 1.6, s.lead, s.lead === 'square' ? 0.05 : s.lead === 'sawtooth' ? 0.035 : 0.11, 0.01);
        }
        const d = DRUMS[s.drums];
        if (d) {
          if (d.kick.includes(beat) || (d.fill && bar === 3 && beat === 7)) this.kick(at, d.soft);
          if (d.snare.includes(beat) || (d.fill && bar === 3 && beat === 5)) this.snare(at, d.soft);
          if (d.hat.includes(beat)) this.hat(at, d.hatVol * (beat % 2 ? 0.7 : 1));
        }
        this.next += spb; this.step++;
      }
    },
    note(m, t, dur, type, vol, attack) {
      const o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = type; o.frequency.value = freq(m);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
    },
    noise() {
      if (this.noiseBuf) return this.noiseBuf;
      const b = this.ac.createBuffer(1, this.ac.sampleRate * 0.5, this.ac.sampleRate), d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      return (this.noiseBuf = b);
    },
    kick(t, soft) {
      const o = this.ac.createOscillator(), g = this.ac.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(soft ? 110 : 150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
      g.gain.setValueAtTime(soft ? 0.28 : 0.45, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
      o.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.3);
    },
    snare(t, soft) {
      const n = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
      n.buffer = this.noise(); f.type = 'highpass'; f.frequency.value = soft ? 2500 : 1300;
      g.gain.setValueAtTime(soft ? 0.06 : 0.16, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.09 : 0.15));
      n.connect(f); f.connect(g); g.connect(this.master); n.start(t); n.stop(t + 0.2);
    },
    hat(t, vol) {
      const n = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
      n.buffer = this.noise(); f.type = 'highpass'; f.frequency.value = 7500;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.04);
      n.connect(f); f.connect(g); g.connect(this.master); n.start(t); n.stop(t + 0.06);
    },
    bell(m, t) {
      for (const [mult, vol, dur] of [[1, 0.12, 1.6], [2.76, 0.04, 0.6], [5.4, 0.015, 0.3]]) {
        const o = this.ac.createOscillator(), g = this.ac.createGain();
        o.type = 'sine'; o.frequency.value = freq(m + 12) * mult;
        g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
      }
    },
  };

  window.Season = { ORDER, ICON, THEMES, fromDate, drawWeather, Music };
})();
