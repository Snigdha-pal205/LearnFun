'use strict';
/* Little Explorers — core: helpers, stage scaling, drag, sound, voice, storage, mascot, hand. */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(res => setTimeout(res, ms));
const rand = n => Math.floor(Math.random() * n);
const pick = a => a[rand(a.length)];
function shuffle(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = rand(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function mk(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
const LEVELS = ['easy', 'normal', 'hard'];
const SECTIONS = ['spell', 'map', 'baby'];
const CONTENT = window.LE_CONTENT;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const article = w => (/^[aeiou]/i.test(w) ? 'an ' : 'a ') + w;

function picHTML(img, emoji, alt) {
  return img
    ? `<img src="${img}" alt="${alt || ''}" draggable="false">`
    : `<span class="emoji-pic" role="img" aria-label="${alt || ''}">${emoji || '❓'}</span>`;
}

/* ------------------------------------------------------------------ Stage */
/* Fixed design canvas (1280×720 landscape, 720×1280 portrait), letterboxed to the window. */
const Stage = {
  el: null, W: 1280, H: 720, scale: 1, portrait: false, _orient: [],
  init() {
    this.el = $('#stage');
    addEventListener('resize', () => this.fit());
    addEventListener('orientationchange', () => setTimeout(() => this.fit(), 120));
    this.fit(true);
  },
  fit(first) {
    const w = innerWidth, h = innerHeight;
    const p = h > w;
    const changed = p !== this.portrait;
    this.portrait = p;
    this.W = p ? 720 : 1280; this.H = p ? 1280 : 720;
    this.el.style.width = this.W + 'px';
    this.el.style.height = this.H + 'px';
    this.el.classList.toggle('portrait', p);
    this.el.classList.toggle('landscape', !p);
    this.scale = Math.min(w / this.W, h / this.H);
    const ox = (w - this.W * this.scale) / 2, oy = (h - this.H * this.scale) / 2;
    this.el.style.transform = `translate(${ox}px, ${oy}px) scale(${this.scale})`;
    if (changed && !first) this._orient.forEach(f => f());
  },
  onOrientation(f) { this._orient.push(f); },
  toStage(cx, cy) {
    const r = this.el.getBoundingClientRect();
    return { x: (cx - r.left) / this.scale, y: (cy - r.top) / this.scale };
  },
  /* Element rectangle in stage units, optionally grown on every side. */
  rect(node, grow = 0) {
    const r = node.getBoundingClientRect(), s = this.el.getBoundingClientRect();
    const x = (r.left - s.left) / this.scale, y = (r.top - s.top) / this.scale;
    const w = r.width / this.scale, h = r.height / this.scale;
    return { x: x - grow, y: y - grow, w: w + grow * 2, h: h + grow * 2, cx: x + w / 2, cy: y + h / 2 };
  },
  inRect(p, r) { return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
};

/* ------------------------------------------------------------------ Drag */
/* Pointer Events + pointer capture. One drag at a time; moves under 10 px count as a tap. */
const Drag = {
  active: null,
  reset() { this.active = null; },
  attach(target, o, signal) {
    target.addEventListener('pointerdown', e => {
      if (Drag.active) return;                       // ignore a second finger / resting palm
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      if (o.enabled && !o.enabled()) return;
      e.preventDefault();
      e.stopPropagation();
      const sx = e.clientX, sy = e.clientY;
      const st = { id: e.pointerId, dragging: false, type: e.pointerType };
      Drag.active = st;
      try { target.setPointerCapture(e.pointerId); } catch (_) { /* ignore */ }
      const pt = ev => Stage.toStage(ev.clientX, ev.clientY);
      const move = ev => {
        if (ev.pointerId !== st.id || Drag.active !== st) return;
        if (!st.dragging) {
          if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 10) return;
          st.dragging = true;
          if (o.onStart) o.onStart(Stage.toStage(sx, sy), pt(ev), st.type);
        }
        if (o.onMove) o.onMove(pt(ev));
      };
      const finish = (ev, cancelled) => {
        if (ev.pointerId !== st.id) return;
        target.removeEventListener('pointermove', move);
        target.removeEventListener('pointerup', up);
        target.removeEventListener('pointercancel', cancel);
        target.removeEventListener('lostpointercapture', cancel);
        window.removeEventListener('pointerup', up, true);
        window.removeEventListener('pointercancel', cancel, true);
        if (Drag.active !== st) return;
        Drag.active = null;
        if (st.dragging) { if (o.onEnd) o.onEnd(pt(ev), cancelled); }
        else if (!cancelled && o.onTap) o.onTap(pt(ev));
      };
      const up = ev => finish(ev, false);
      const cancel = ev => finish(ev, true);
      target.addEventListener('pointermove', move);
      target.addEventListener('pointerup', up);
      target.addEventListener('pointercancel', cancel);
      target.addEventListener('lostpointercapture', cancel);
      // Safety net: if the element misses the release (e.g. capture failed), the window still sees it,
      // so a drag can never get "stuck" and block the next one.
      window.addEventListener('pointerup', up, true);
      window.addEventListener('pointercancel', cancel, true);
    }, { signal });
  }
};

/* ------------------------------------------------------------------ Storage */
const DEFAULT_SETTINGS = {
  classLevel: 1,                 // 1 = check per box, 2 = check at end
  letterCase: 'upper',
  sections: { spell: true, map: true, baby: true },
  rounds: 9,
  soundVol: 1,
  musicVol: 0.35,
  reducedMotion: false,
  smartboard: false,
  disabled: { spell: [], map: [], baby: [] },
  customWords: []
};

function newProgress() {
  return {
    levels: { spell: 'easy', map: 'easy', baby: 'easy' },
    streak: { spell: { three: 0, one: 0 }, map: { three: 0, one: 0 }, baby: { three: 0, one: 0 } },
    stickers: {},                // stickerId -> 'normal' | 'gold'
    report: { sessions: 0, rounds: 0, stars: 0, struggled: {} }
  };
}

const Store = {
  KEY: 'littleExplorers.v1',
  data: null,
  load() {
    let d = null;
    try { d = JSON.parse(localStorage.getItem(this.KEY)); } catch (_) { d = null; }
    if (!d || typeof d !== 'object') d = {};
    const s = Object.assign({}, DEFAULT_SETTINGS, d.settings || {});
    s.sections = Object.assign({}, DEFAULT_SETTINGS.sections, s.sections || {});
    s.disabled = Object.assign({ spell: [], map: [], baby: [] }, s.disabled || {});
    s.customWords = Array.isArray(s.customWords) ? s.customWords : [];
    if (!d.settings && window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) s.reducedMotion = true;
    d.settings = s;
    d.profiles = Array.isArray(d.profiles) ? d.profiles : [];
    d.progress = d.progress || {};
    this.data = d;
    if (!d.profiles.length) this.addProfile('Explorer', '🦊');
    if (!d.profiles.find(p => p.id === d.current)) d.current = d.profiles[0].id;
    this.save();
  },
  save() { try { localStorage.setItem(this.KEY, JSON.stringify(this.data)); } catch (_) { /* private mode */ } },
  get settings() { return this.data.settings; },
  get profile() { return this.data.profiles.find(p => p.id === this.data.current); },
  get child() { return this.progressFor(this.data.current); },
  progressFor(id) {
    if (!this.data.progress[id]) this.data.progress[id] = newProgress();
    const p = this.data.progress[id];
    const base = newProgress();
    for (const k of Object.keys(base)) if (p[k] == null) p[k] = base[k];
    return p;
  },
  addProfile(name, avatar) {
    const id = 'p' + Date.now().toString(36) + rand(1000);
    this.data.profiles.push({ id, name: name || 'Explorer', avatar: avatar || '🦊' });
    this.progressFor(id);
    this.save();
    return id;
  },
  removeProfile(id) {
    if (this.data.profiles.length <= 1) return;
    this.data.profiles = this.data.profiles.filter(p => p.id !== id);
    delete this.data.progress[id];
    if (this.data.current === id) this.data.current = this.data.profiles[0].id;
    this.save();
  }
};

/* ------------------------------------------------------------------ Sound effects + music (WebAudio, no files) */
const Sound = {
  ctx: null, sfxBus: null, musicBus: null, musicTimer: null,
  unlock() {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.sfxBus = this.ctx.createGain();
        this.musicBus = this.ctx.createGain();
        this.sfxBus.connect(this.ctx.destination);
        this.musicBus.connect(this.ctx.destination);
      }
      if (this.ctx.state === 'suspended') this.ctx.resume();
    } catch (_) { /* no audio */ }
    this.applyVolumes();
  },
  applyVolumes() {
    if (!this.ctx) return;
    const s = Store.settings;
    this.sfxBus.gain.value = s.soundVol * 0.5;
    this.musicBus.gain.value = s.musicVol * 0.12;
    if (s.musicVol > 0) this.startMusic(); else this.stopMusic();
  },
  tone(f, dur, o = {}) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime + (o.delay || 0);
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    const v = Math.max(0.0002, o.vol == null ? 0.5 : o.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + (o.attack || 0.012));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(o.bus || this.sfxBus);
    osc.start(t); osc.stop(t + dur + 0.05);
  },
  sfx(name) {
    switch (name) {
      case 'tap': this.tone(660, 0.08, { type: 'triangle', vol: 0.3 }); break;
      case 'pick': this.tone(520, 0.12, { to: 780, type: 'triangle', vol: 0.35 }); break;
      case 'drop': this.tone(320, 0.12, { to: 220, vol: 0.4 }); break;
      case 'snap': this.tone(660, 0.12, { type: 'triangle' }); this.tone(990, 0.22, { type: 'triangle', delay: 0.09 }); break;
      case 'boing': this.tone(440, 0.4, { to: 170, vol: 0.3 }); break;
      case 'star': [880, 1175, 1568].forEach((f, i) => this.tone(f, 0.2, { type: 'triangle', delay: i * 0.07, vol: 0.3 })); break;
      case 'win': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.28, { type: 'triangle', delay: i * 0.11, vol: 0.35 })); break;
      case 'pop': this.tone(800, 0.07, { to: 1200, vol: 0.25 }); break;
      case 'sparkle': [1319, 1568, 1760, 2093].forEach((f, i) => this.tone(f, 0.14, { delay: i * 0.06, vol: 0.18 })); break;
    }
  },
  startMusic() {
    if (this.musicTimer || !this.ctx) return;
    const mel = [392, 330, 392, 440, 392, 330, 294, 0, 262, 294, 330, 392, 330, 294, 262, 0];
    const bass = [131, 110, 98, 110];
    let i = 0;
    this.musicTimer = setInterval(() => {
      if (!this.ctx || this.ctx.state !== 'running') return;
      const n = mel[i % mel.length];
      if (n) this.tone(n, 0.5, { vol: 0.5, bus: this.musicBus, attack: 0.05 });
      if (i % 4 === 0) this.tone(bass[(i >> 2) % bass.length], 1.5, { type: 'triangle', vol: 0.4, bus: this.musicBus, attack: 0.1 });
      i++;
    }, 430);
  },
  stopMusic() { clearInterval(this.musicTimer); this.musicTimer = null; }
};

/* ------------------------------------------------------------------ Voice (browser text-to-speech; prefers an Indian English voice) */
const Voice = {
  voice: null, pending: new Set(),
  supported: 'speechSynthesis' in window,
  init() {
    if (!this.supported) return;
    const load = () => {
      const vs = speechSynthesis.getVoices();
      this.voice = vs.find(v => /en[-_]IN/i.test(v.lang))
        || vs.find(v => /india/i.test(v.name))
        || vs.find(v => /en[-_]GB/i.test(v.lang))
        || vs.find(v => /^en/i.test(v.lang)) || null;
    };
    load();
    speechSynthesis.onvoiceschanged = load;
  },
  speak(text, o = {}) {
    return new Promise(resolve => {
      const vol = Store.settings.soundVol;
      if (!this.supported || vol <= 0 || !text) { setTimeout(resolve, Math.min(1600, 300 + text.length * 50)); return; }
      if (!o.queue) this.cancel();
      const u = new SpeechSynthesisUtterance(text);
      if (this.voice) { u.voice = this.voice; u.lang = this.voice.lang; } else u.lang = 'en-IN';
      u.rate = o.rate || 0.88;
      u.pitch = o.pitch || 1.1;
      u.volume = Math.min(1, (o.volume == null ? 1 : o.volume) * vol);
      let done = false;
      const fin = () => {
        if (done) return; done = true;
        clearTimeout(t); this.pending.delete(fin); resolve();
      };
      const t = setTimeout(fin, 1500 + text.length * 120);   // some browsers never fire onend
      u.onend = fin; u.onerror = fin;
      this.pending.add(fin);
      speechSynthesis.speak(u);
    });
  },
  cancel() {
    if (this.supported) speechSynthesis.cancel();
    Array.from(this.pending).forEach(f => f());
  }
};

/* Letter names and phonics, written so text-to-speech says them clearly. */
const LETTER_NAME = { A: 'ay', B: 'bee', C: 'see', D: 'dee', E: 'ee', F: 'ef', G: 'jee', H: 'aitch', I: 'eye', J: 'jay', K: 'kay', L: 'el', M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'ar', S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double you', X: 'ex', Y: 'why', Z: 'zed' };
const LETTER_SOUND = { A: 'ah', B: 'buh', C: 'kuh', D: 'duh', E: 'eh', F: 'fuh', G: 'guh', H: 'huh', I: 'ih', J: 'juh', K: 'kuh', L: 'luh', M: 'muh', N: 'nuh', O: 'aw', P: 'puh', Q: 'kwuh', R: 'ruh', S: 'sss', T: 'tuh', U: 'uh', V: 'vuh', W: 'wuh', X: 'ks', Y: 'yuh', Z: 'zzz' };

const PRAISE = ['Great job!', 'Super!', 'You did it!', 'Well done!', 'Wonderful!', 'Fantastic!', 'Hooray!', 'Brilliant!', 'Yay! Good work!'];

/* ------------------------------------------------------------------ Ollie the owl (mascot) */
const OLLIE_HTML = '<div class="bubble"></div><div class="ollie-body"><span class="owl">🦉</span><span class="bag">🎒</span><span class="point">👉</span></div>';
const Ollie = {
  seq: 0,
  init() { $$('.ollie').forEach(o => { o.innerHTML = OLLIE_HTML; o.dataset.pose = o.dataset.pose || 'idle'; }); },
  pose(p) { $$('.ollie').forEach(o => { o.dataset.pose = p; }); },
  async say(text, o = {}) {
    const id = ++this.seq;
    const bubbles = $$('.screen.active .ollie .bubble');
    if (o.bubble !== false) bubbles.forEach(b => { b.textContent = text; b.classList.add('show'); });
    this.pose(o.pose || 'talk');
    await Voice.speak(text, o);
    if (id === this.seq) {
      bubbles.forEach(b => b.classList.remove('show'));
      this.pose(o.after || 'idle');
    }
  },
  hush() { this.seq++; $$('.ollie .bubble').forEach(b => b.classList.remove('show')); this.pose('idle'); }
};

/* ------------------------------------------------------------------ Animated hand (gesture demo + hints) */
const Hand = {
  anim: null,
  show(from, to, loops = 2) {
    const h = $('#hand');
    this.stop();
    h.style.display = 'block';
    const tf = (p, s) => `translate(${p.x - 22}px, ${p.y - 8}px) scale(${s})`;
    this.anim = h.animate([
      { transform: tf(from, 1.15), opacity: 0 },
      { transform: tf(from, 1), opacity: 1, offset: 0.15 },
      { transform: tf(from, 0.9), opacity: 1, offset: 0.25 },
      { transform: tf(to, 0.9), opacity: 1, offset: 0.75 },
      { transform: tf(to, 1), opacity: 0, offset: 1 }
    ], { duration: 1700, iterations: loops, easing: 'ease-in-out' });
    this.anim.onfinish = () => this.stop();
  },
  stop() {
    if (this.anim) { this.anim.onfinish = null; this.anim.cancel(); this.anim = null; }
    const h = $('#hand'); if (h) h.style.display = 'none';
  }
};

/* ------------------------------------------------------------------ Effects */
const FX = {
  confetti(n = 70) {
    if (Store.settings.reducedMotion) return;
    const layer = $('#fx');
    const colors = ['#FF8FAB', '#FFD166', '#06D6A0', '#4D96FF', '#C77DFF', '#FF9F1C'];
    for (let i = 0; i < n; i++) {
      const c = mk('i', 'confetti');
      c.style.left = rand(Stage.W) + 'px';
      c.style.background = pick(colors);
      c.style.animationDuration = (1.4 + Math.random() * 1.2) + 's';
      c.style.animationDelay = (Math.random() * 0.4) + 's';
      c.style.setProperty('--rot', (rand(720) - 360) + 'deg');
      c.style.setProperty('--dx', (rand(160) - 80) + 'px');
      layer.appendChild(c);
      setTimeout(() => c.remove(), 3200);
    }
  },
  flyStar(from, to) {
    const s = mk('div', 'fly-star', '⭐');
    s.style.left = from.x + 'px'; s.style.top = from.y + 'px';
    $('#fx').appendChild(s);
    const dur = Store.settings.reducedMotion ? 10 : 800;
    const a = s.animate([
      { transform: 'translate(-50%,-50%) scale(1.6)' },
      { transform: `translate(calc(${to.x - from.x}px - 50%), calc(${to.y - from.y}px - 50%)) scale(.6)` }
    ], { duration: dur, easing: 'cubic-bezier(.5,-0.3,.6,1)', fill: 'forwards' });
    return new Promise(res => { a.onfinish = () => { s.remove(); res(); }; });
  }
};

function applyBodySettings() {
  const s = Store.settings;
  Stage.el.classList.toggle('reduced-motion', !!s.reducedMotion);
  Stage.el.classList.toggle('smartboard', !!s.smartboard);
  Sound.applyVolumes();
}
