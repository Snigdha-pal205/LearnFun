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
      const t = setTimeout(fin, 800 + text.length * 75);   // some browsers never fire onend
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

/* ------------------------------------------------------------------ Fenny the fennec fox (mascot, original drawing)
 * The object is still called Ollie in code (it was an owl before); everything the child sees is Fenny. */
const FENNY_SVG = '<svg class="fox" viewBox="0 -2 100 106" aria-hidden="true"><path d="M64 92 Q90 96 92 74 Q94 62 86 60 Q84 78 66 84Z" fill="#E9A866"/><path d="M86 60 Q94 62 92 74 Q88 70 84 66Z" fill="#FFF6E8"/><rect x="30" y="74" width="40" height="22" rx="8" fill="#C8763A"/><ellipse cx="50" cy="88" rx="16" ry="13" fill="#F2C38B"/><ellipse cx="50" cy="91" rx="9" ry="9" fill="#FFF3E2"/><path d="M38 78 Q40 90 42 100" stroke="#8A4B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/><path d="M62 78 Q60 90 58 100" stroke="#8A4B1F" stroke-width="3.5" fill="none" stroke-linecap="round"/><ellipse cx="42" cy="101" rx="6" ry="3.5" fill="#E9A866"/><ellipse cx="58" cy="101" rx="6" ry="3.5" fill="#E9A866"/><path d="M33 42 L6 4 Q4 2 7 3 L46 30Z" fill="#F2C38B"/><path d="M33 38 L13 10 L42 30Z" fill="#FFB5A7"/><path d="M67 42 L94 4 Q96 2 93 3 L54 30Z" fill="#F2C38B"/><path d="M67 38 L87 10 L58 30Z" fill="#FFB5A7"/><path d="M22 52 Q22 30 50 30 Q78 30 78 52 Q78 66 66 72 L50 78 L34 72 Q22 66 22 52Z" fill="#F2C38B"/><path d="M22 54 L16 60 L26 62 Z M78 54 L84 60 L74 62Z" fill="#F2C38B"/><path d="M32 62 Q50 82 68 62 Q64 76 50 78 Q36 76 32 62Z" fill="#FFF3E2"/><ellipse cx="50" cy="66" rx="12" ry="8" fill="#FFF3E2"/><ellipse cx="39" cy="52" rx="5.5" ry="6.5" fill="#2B1B12"/><ellipse cx="61" cy="52" rx="5.5" ry="6.5" fill="#2B1B12"/><circle cx="41" cy="49.5" r="2.2" fill="#fff"/><circle cx="63" cy="49.5" r="2.2" fill="#fff"/><circle cx="37.5" cy="55" r="1" fill="#fff"/><circle cx="59.5" cy="55" r="1" fill="#fff"/><ellipse cx="31" cy="60" rx="4.5" ry="3" fill="#FF9AA2" opacity=".7"/><ellipse cx="69" cy="60" rx="4.5" ry="3" fill="#FF9AA2" opacity=".7"/><ellipse cx="50" cy="61.5" rx="4" ry="3" fill="#2B1B12"/><path d="M44 66 Q50 72 56 66" stroke="#2B1B12" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M47 68.5 Q50 72 53 68.5Z" fill="#FF6F7D"/><ellipse cx="50" cy="34" rx="24" ry="5.5" fill="#3E8E4A"/><path d="M33 34 Q34 16 50 15 Q66 16 67 34Z" fill="#59B85F"/><path d="M34 30 Q50 33 66 30 L66.6 34 Q50 37 33.4 34Z" fill="#2E6B38"/><path d="M41 21 Q46 17 52 17" stroke="#8FD98F" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="60" cy="31.5" r="2.4" fill="#FFD93D"/></svg>';
const OLLIE_HTML = '<div class="bubble"></div><div class="ollie-body">' + FENNY_SVG + '<span class="point">👉</span></div>';
const Ollie = {
  seq: 0,
  init() {
    $$('.ollie').forEach(o => { o.innerHTML = OLLIE_HTML; o.dataset.pose = o.dataset.pose || 'idle'; });
    $$('.load-owl').forEach(o => { o.innerHTML = FENNY_SVG; });
  },
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
