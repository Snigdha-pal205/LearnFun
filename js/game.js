'use strict';
/* Little Explorers — game flow: shuffle queue, rounds, rewards, adaptive difficulty, screens, teacher mode. */

const SECTION_DEF = { spell: SpellGame, map: MapGame, baby: BabyGame };
const SECTION_NAME = { spell: 'Spell It', map: 'Map Puzzle', baby: 'Find the Baby' };

/* ------------------------------------------------------------------ Content helpers */
const keyOf = (sec, it) => (sec === 'spell' ? it.word : sec === 'map' ? it.id : it.parent);
const labelOf = (sec, it) => (sec === 'spell' ? it.word : sec === 'map' ? it.country : cap(it.parent) + ' → ' + it.baby);

function allItems(sec) {
  if (sec === 'spell') {
    const custom = Store.settings.customWords.map(w => ({
      word: w.word, emoji: w.emoji || '⭐', custom: true,
      level: w.word.length <= 3 ? 'easy' : w.word.length === 4 ? 'normal' : 'hard'
    }));
    return CONTENT.spell.concat(custom);
  }
  return CONTENT[sec];
}
function enabledItems(sec) {
  const off = Store.settings.disabled[sec] || [];
  const list = allItems(sec).filter(it => !off.includes(keyOf(sec, it)));
  return list.length ? list : allItems(sec);
}
function weightOf(sec, it, L) {
  let w = 1;
  if (sec === 'spell' && it.image) w = 3;                       // favour the real pictures
  if (sec === 'baby' && (it.parentImg || it.babyImg)) w = 2;
  if (sec === 'baby' && L === 2 && it.level === 'hard') w += 2;
  return w;
}
function weighted(list, wf) {
  const total = list.reduce((s, i) => s + wf(i), 0);
  let r = Math.random() * total;
  for (const i of list) { r -= wf(i); if (r <= 0) return i; }
  return list[list.length - 1];
}
/* Random item for the level, without repeats inside a session (falls back gracefully). */
const SPELL_LEN = 3;   // Spell It uses 3-letter words only
function spellPool() {
  const off = Store.settings.disabled.spell || [];
  // Only 3-letter words that have a real picture (box, bed, bat, hat, bag)
  const three = allItems('spell').filter(it => it.word.length === SPELL_LEN && it.image);
  const on = three.filter(it => !off.includes(it.word));
  return on.length ? on : three;
}
function drawItem(sec, level, used) {
  const pool = sec === 'spell' ? spellPool() : enabledItems(sec);
  const L = LEVELS.indexOf(level);
  const rk = it => LEVELS.indexOf(it.level || 'easy');
  const tiers = sec === 'spell'
    ? [() => true]
    : [it => rk(it) <= L, () => true];
  for (const repeat of [false, true]) {
    for (const t of tiers) {
      const c = pool.filter(it => t(it) && (repeat || !used.has(keyOf(sec, it))));
      if (c.length) return weighted(c, it => weightOf(sec, it, L));
    }
  }
  return pool[0];
}

/* Fisher–Yates, re-shuffled until no section appears 3 times in a row. */
const hasTriple = q => q.some((s, i) => i >= 2 && q[i - 1] === s && q[i - 2] === s);
function buildQueue(counts) {
  const q = [];
  for (const [k, n] of Object.entries(counts)) for (let i = 0; i < n; i++) q.push(k);
  const kinds = Object.keys(counts).filter(k => counts[k] > 0);
  for (let t = 0; t < 2000; t++) {
    shuffle(q);
    if (kinds.length < 2 || !hasTriple(q)) break;
  }
  return q;
}

function starsFor(mistakes, hints) {
  if (mistakes === 0 && hints === 0) return 3;
  if ((mistakes <= 2 && hints === 0) || (mistakes === 0 && hints === 1)) return 2;
  return 1;
}

function adapt(child, sec, stars) {
  const s = child.streak[sec];
  if (stars === 3) { s.three++; s.one = 0; }
  else if (stars === 1) { s.one++; s.three = 0; }
  else { s.three = 0; s.one = 0; }
  const L = LEVELS.indexOf(child.levels[sec]);
  if (s.three >= 3) { child.levels[sec] = LEVELS[Math.min(2, L + 1)]; s.three = 0; }
  if (s.one >= 2) { child.levels[sec] = LEVELS[Math.max(0, L - 1)]; s.one = 0; }
}

/* ------------------------------------------------------------------ Stickers */
const STICKERS = (() => {
  const alpha = [['A', '🐜', 'Ant'], ['B', '🦋', 'Butterfly'], ['C', '🐱', 'Cat'], ['D', '🐶', 'Dog'], ['E', '🐘', 'Elephant'], ['F', '🐸', 'Frog'], ['G', '🦒', 'Giraffe'], ['H', '🐴', 'Horse'], ['K', '🦘', 'Kangaroo'], ['L', '🦁', 'Lion'], ['M', '🐒', 'Monkey'], ['O', '🦉', 'Owl'], ['P', '🐷', 'Pig'], ['R', '🐰', 'Rabbit'], ['T', '🐯', 'Tiger'], ['Z', '🦓', 'Zebra']];
  const list = [];
  alpha.forEach(([l, e, n]) => list.push({ id: 'a-' + l, page: 'spell', name: `${l} is for ${n}`, html: `<span class="st-emoji">${e}</span><span class="st-letter">${l}</span>` }));
  CONTENT.map.forEach(c => list.push({ id: 'f-' + c.id, page: 'map', name: c.country, html: `${flagSVG(c.id, 'st-flag')}<span class="st-cap">${c.country}</span>` }));
  CONTENT.baby.forEach(b => list.push({ id: 'b-' + b.parent, page: 'baby', name: `${cap(b.parent)} and ${b.baby}`, html: `<span class="st-pair">${b.parentEmoji}<small>${b.babyEmoji}</small></span>` }));
  return list;
})();

/* ------------------------------------------------------------------ Game controller */
const Game = {
  session: null,
  round: null,

  start(mode) {
    Hand.stop(); Ollie.hush();
    const S = Store.settings;
    const counts = {};
    if (mode === 'mix') {
      let secs = SECTIONS.filter(k => S.sections[k]);
      if (!secs.length) secs = SECTIONS.slice();
      const n = S.rounds;
      secs.forEach(k => { counts[k] = Math.floor(n / secs.length); });
      shuffle(secs.slice()).slice(0, n % secs.length).forEach(k => { counts[k]++; });
    } else counts[mode] = 5;               // practice: 5 rounds of one section
    this.session = { mode, queue: buildQueue(counts), idx: 0, results: [], used: { spell: new Set(), map: new Set(), baby: new Set() }, seen: new Set() };
    Store.child.report.sessions++;
    Store.save();
    UI.show('scr-game');
    this.buildDots();
    this.nextRound();
  },

  buildDots() {
    const d = $('#dots');
    d.innerHTML = '';
    this.session.queue.forEach(() => d.appendChild(mk('span', 'dot-p')));
    this.updateDots();
  },
  updateDots() {
    const s = this.session;
    if (!s) return;
    $$('#dots .dot-p').forEach((el, i) => {
      const r = s.results[i];
      el.classList.toggle('done', !!r && !(this.round && this.round.flying && i === s.idx));
      el.classList.toggle('current', i === s.idx && !r);
      el.textContent = el.classList.contains('done') ? '★' : String(i + 1);
    });
  },

  async nextRound() {
    const s = this.session;
    if (!s) return;
    if (s.idx >= s.queue.length) { this.endSession(); return; }
    const sec = s.queue[s.idx];
    const level = Store.child.levels[sec];
    const item = drawItem(sec, level, s.used[sec]);
    s.used[sec].add(keyOf(sec, item));
    const r = { sec, level, item, mistakes: 0, hints: 0, gen: 0, won: false, dead: false, firstOfSection: !s.seen.has(sec) };
    s.seen.add(sec);
    this.round = r;
    this.updateDots();
    this.clearPlay();
    this.hideOverlays();
    // Round intro card (1.5 s) with the section icon and spoken instruction
    const def = SECTION_DEF[sec];
    const intro = $('#intro');
    $('.intro-icon', intro).textContent = def.icon;
    $('.intro-text', intro).textContent = def.introLine;
    intro.classList.add('show');
    Sound.sfx('pop');
    await sleep(Store.settings.reducedMotion ? 400 : 800);
    if (this.round !== r || r.dead) return;
    intro.classList.remove('show');
    this.launch(r, true);
  },

  launch(r, speak) {
    this.clearPlay();
    r.gen++;
    const gen = r.gen;
    r.ac = new AbortController();
    const ctx = {
      root: $('#play'),
      item: r.item,
      level: r.level,
      settings: Store.settings,
      signal: r.ac.signal,
      alive: () => this.round === r && r.gen === gen && !r.dead,
      pool: enabledItems(r.sec),
      allItems: allItems(r.sec),
      api: this.makeApi(r)
    };
    r.inst = SECTION_DEF[r.sec].start(ctx);
    this.resetIdle();
    if (speak) this.instruct(true);
  },

  async instruct(first) {
    const r = this.round;
    if (!r || !r.inst || r.won) return;
    const gen = r.gen;
    await Ollie.say(r.inst.instructionText);
    if (first && r.firstOfSection && this.round === r && r.gen === gen && !r.won && !r.dead) r.inst.demo();
  },

  makeApi(r) {
    return {
      progress: () => { if (this.round === r && !r.won) this.resetIdle(); },
      mistake: () => { if (this.round === r && !r.won) r.mistakes++; },
      offerHint: () => { if (this.round === r) this.showBulb(); },
      win: info => this.roundWon(r, info)
    };
  },

  resetIdle() {
    const r = this.round;
    if (!r) return;
    clearTimeout(r.idleT);
    $('#btn-hint').classList.remove('show');
    if (r.won) return;
    r.idleT = setTimeout(() => this.showBulb(), 15000);
  },
  showBulb() {
    const r = this.round;
    if (!r || r.won || r.dead) return;
    $('#btn-hint').classList.add('show');
    Ollie.pose('point');
  },
  useHint() {
    const r = this.round;
    if (!r || r.won || !r.inst || !$('#btn-hint').classList.contains('show')) return;
    r.hints++;
    Ollie.pose('idle');
    r.inst.hint();
    this.resetIdle();
  },

  async roundWon(r, info) {
    if (this.round !== r || r.won) return;
    r.won = true;
    clearTimeout(r.idleT);
    $('#btn-hint').classList.remove('show');
    Hand.stop();
    const s = this.session;
    const stars = starsFor(r.mistakes, r.hints);
    s.results[s.idx] = { sec: r.sec, stars, key: keyOf(r.sec, r.item) };

    const ch = Store.child;
    ch.report.rounds++;
    ch.report.stars += stars;
    if (r.mistakes > 0 || r.hints > 0) {
      const k = SECTION_NAME[r.sec] + ': ' + labelOf(r.sec, r.item);
      ch.report.struggled[k] = (ch.report.struggled[k] || 0) + 1;
    }
    adapt(ch, r.sec, stars);
    Store.save();

    const win = $('#win');
    $('.win-title', win).innerHTML = (info.flags ? info.flags.map(f => flagSVG(f, 'win-flag')).join('') : '') + `<span>${info.title}</span>`;
    const st = $('.win-stars', win);
    st.innerHTML = '';
    for (let i = 0; i < 3; i++) {
      const e = mk('span', 'ws' + (i < stars ? ' on' : ''), '★');
      e.style.animationDelay = (0.15 + i * 0.18) + 's';
      st.appendChild(e);
    }
    win.classList.add('show');
    FX.confetti();
    Sound.sfx('win');
    Ollie.pose('cheer');

    // a star flies to the progress bar
    r.flying = true;
    this.updateDots();
    const dot = $$('#dots .dot-p')[s.idx];
    const from = Stage.rect(st), to = Stage.rect(dot);
    FX.flyStar({ x: from.cx, y: from.cy }, { x: to.cx, y: to.cy }).then(() => {
      r.flying = false;
      if (this.session === s) { this.updateDots(); Sound.sfx('star'); }
    });

    await Ollie.say(info.line || pick(PRAISE), { pose: 'cheer' });
    if (this.round !== r || r.advanced) return;
    this.armAuto();
  },
  armAuto() {
    const r = this.round;
    if (!r || !r.won || r.advanced || Store.settings.smartboard) return;
    clearTimeout(r.autoT);
    r.autoT = setTimeout(() => { if (!$('#leave').classList.contains('show')) this.advance(); }, 600);
  },

  advance() {
    const r = this.round;
    if (!r || !r.won || r.advanced) return;
    r.advanced = true;
    r.flying = false;
    Voice.cancel();
    Ollie.hush();
    this.endRound();
    this.session.idx++;
    this.nextRound();
  },

  endRound() {
    const r = this.round;
    if (!r) return;
    r.dead = true;
    clearTimeout(r.idleT);
    clearTimeout(r.autoT);
    if (r.ac) r.ac.abort();
    if (r.inst && r.inst.destroy) r.inst.destroy();
    Drag.reset();
    Hand.stop();
  },

  /* Screen turned between portrait and landscape: rebuild the current round's layout. */
  relayout() {
    const r = this.round;
    if (!r || !r.inst || r.won || r.dead || !$('#scr-game').classList.contains('active')) return;
    if (r.ac) r.ac.abort();
    Drag.reset();
    Hand.stop();
    this.launch(r, false);
  },

  repeat() {
    const r = this.round;
    if (r && r.inst && !r.won) this.instruct(false);
    else if (r && r.inst) Ollie.say(r.inst.instructionText);
  },

  askLeave() {
    const r = this.round;
    if (r) clearTimeout(r.autoT);
    $('#leave').classList.add('show');
    Ollie.say('Leave?', { bubble: false });
  },
  stay() {
    $('#leave').classList.remove('show');
    Ollie.hush();
    this.armAuto();
  },
  quit() {
    this.endRound();
    this.round = null;
    this.session = null;
    Voice.cancel();
    Ollie.hush();
    this.hideOverlays();
    this.clearPlay();
    UI.goHome(false);
  },

  clearPlay() { $('#play').innerHTML = ''; },
  hideOverlays() { ['#intro', '#win', '#leave'].forEach(s => $(s).classList.remove('show')); },

  endSession() {
    const s = this.session;
    this.round = null;
    const total = s.results.reduce((a, r) => a + (r ? r.stars : 0), 0);
    const max = s.queue.length * 3;
    const golden = total >= Math.ceil(max * 20 / 27);   // 20+ of 27 (scaled for 6 / 12 rounds and practice)
    UI.showEnd(total, max, golden, s.mode);
  }
};

/* ------------------------------------------------------------------ Screens */
const AVATARS = ['🦊', '🐼', '🐯', '🐰', '🐸', '🐵', '🐨', '🦁', '🐧', '🐙', '🦄', '🐢'];

const UI = {
  endMode: 'mix',

  show(id) {
    $$('.screen').forEach(s => s.classList.toggle('active', s.id === id));
  },

  goHome(greet) {
    this.show('scr-home');
    this.renderHome();
    if (greet) Ollie.say("Hi! I'm Ollie. Tap the big button to play!", { pose: 'wave' });
    else Ollie.say('Tap play!', { pose: 'wave' });
  },

  renderHome() {
    const p = Store.profile;
    $('#btn-profile .avatar').textContent = p.avatar;
    $('#btn-profile .pname').textContent = p.name;
    const S = Store.settings;
    $$('#scr-home .sec-btn').forEach(b => b.classList.toggle('off', !S.sections[b.dataset.sec]));
  },

  showProfiles() {
    const grid = $('#profile-pick .profile-grid');
    grid.innerHTML = '';
    Store.data.profiles.forEach(p => {
      const b = mk('button', 'profile-opt' + (p.id === Store.data.current ? ' on' : ''), `<span class="avatar">${p.avatar}</span><span>${p.name}</span>`);
      b.addEventListener('click', () => {
        Store.data.current = p.id; Store.save();
        Sound.sfx('tap');
        $('#profile-pick').classList.remove('show');
        this.renderHome();
        Voice.speak(`Hello ${p.name}!`);
      });
      grid.appendChild(b);
    });
    $('#profile-pick').classList.add('show');
  },

  /* ---------- session end */
  showEnd(total, max, golden, mode) {
    this.endMode = mode;
    this.show('scr-end');
    $('#end-total').textContent = '0';
    $('#end-max').textContent = '/ ' + max;
    const offers = $('#sticker-offers');
    offers.innerHTML = '';
    $('#scr-end').classList.toggle('golden', golden);
    $('#end-pick-hint').style.visibility = 'visible';
    Ollie.pose('dance');
    FX.confetti(110);
    Sound.sfx('win');

    // count the stars up
    let n = 0;
    const step = () => {
      if (!$('#scr-end').classList.contains('active')) return;
      n = Math.min(total, n + 1);
      $('#end-total').textContent = n;
      if (n < total) setTimeout(step, Store.settings.reducedMotion ? 0 : 70);
    };
    step();

    // offer three stickers (uncollected first)
    const have = Store.child.stickers;
    const fresh = shuffle(STICKERS.filter(s => !have[s.id]));
    const more = shuffle(STICKERS.filter(s => have[s.id] && (golden && have[s.id] !== 'gold')));
    const rest = shuffle(STICKERS.slice());
    const choice = [];
    [fresh, more, rest].forEach(l => l.forEach(s => { if (choice.length < 3 && !choice.includes(s)) choice.push(s); }));
    choice.forEach(st => {
      const b = mk('button', 'sticker offer' + (golden ? ' gold' : ''), st.html);
      b.setAttribute('aria-label', st.name);
      b.addEventListener('click', () => {
        if (offers.classList.contains('picked')) return;
        offers.classList.add('picked');
        b.classList.add('chosen');
        Sound.sfx('star');
        const cur = Store.child.stickers[st.id];
        Store.child.stickers[st.id] = golden || cur === 'gold' ? 'gold' : 'normal';
        Store.save();
        $('#end-pick-hint').style.visibility = 'hidden';
        Ollie.say(`${st.name}! It's in your sticker book.`, { pose: 'cheer' });
      });
      offers.appendChild(b);
    });

    const line = golden
      ? `Wow! You got ${total} stars! Pick a golden sticker!`
      : `You got ${total} stars! Pick a sticker!`;
    Ollie.say(line, { pose: 'dance', after: 'dance' });
  },

  /* ---------- sticker book */
  bookPage: 'spell',
  showBook(page) {
    if (page) this.bookPage = page;
    this.show('scr-book');
    $$('#scr-book .book-tab').forEach(t => t.classList.toggle('on', t.dataset.page === this.bookPage));
    const grid = $('#book-grid');
    grid.innerHTML = '';
    const have = Store.child.stickers;
    STICKERS.filter(s => s.page === this.bookPage).forEach(s => {
      const got = have[s.id];
      const b = mk('button', 'sticker' + (got ? '' : ' empty') + (got === 'gold' ? ' gold' : ''), got ? s.html : '<span class="q">?</span>');
      b.setAttribute('aria-label', got ? s.name : 'Not collected yet');
      b.addEventListener('click', () => { if (got) Voice.speak(s.name); else Sound.sfx('tap'); });
      grid.appendChild(b);
    });
    const count = STICKERS.filter(s => have[s.id]).length;
    $('#book-count').textContent = `${count} / ${STICKERS.length}`;
  },

  /* ---------- teacher mode */
  openTeacher() {
    Voice.cancel(); Ollie.hush();
    this.show('scr-teacher');
    this.renderTeacher();
  },

  renderTeacher() {
    const S = Store.settings;
    const prof = Store.profile;
    const ch = Store.child;
    const panel = $('#teacher-panel');
    const keep = panel.scrollTop;
    const seg = (key, opts, val) => `<div class="seg" data-key="${key}">${opts.map(([v, l]) => `<button data-val="${v}" class="${String(v) === String(val) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
    const tog = (key, val, label) => `<label class="tog"><input type="checkbox" data-key="${key}" ${val ? 'checked' : ''}><span>${label}</span></label>`;
    const rep = ch.report;
    const struggled = Object.entries(rep.struggled).sort((a, b) => b[1] - a[1]).slice(0, 15);
    const chips = sec => allItems(sec).map(it => {
      const k = keyOf(sec, it);
      const on = !(S.disabled[sec] || []).includes(k);
      const lab = sec === 'spell' ? it.word : sec === 'map' ? it.country : `${it.parent} → ${it.baby}`;
      return `<button class="chip${on ? ' on' : ''}" data-chip="${sec}" data-k="${k}">${lab}${it.custom ? ' <i data-del="' + k + '">✕</i>' : ''}</button>`;
    }).join('');

    panel.innerHTML = `
      <div class="t-head"><h2>🔒 Teacher settings</h2><button class="t-done" id="t-done">Done ✓</button></div>

      <section><h3>Children</h3>
        <div class="t-profiles">${Store.data.profiles.map(p => `
          <div class="t-prof${p.id === Store.data.current ? ' on' : ''}">
            <button data-prof="${p.id}"><span class="avatar">${p.avatar}</span>${p.name}</button>
            ${Store.data.profiles.length > 1 ? `<button class="t-x" data-delprof="${p.id}" aria-label="Remove ${p.name}">✕</button>` : ''}
          </div>`).join('')}</div>
        <div class="t-row">
          <input id="t-newname" maxlength="16" placeholder="Child's first name">
          <select id="t-newavatar">${AVATARS.map(a => `<option>${a}</option>`).join('')}</select>
          <button class="t-btn" id="t-addprof">Add child</button>
        </div>
        <p class="t-note">Progress is saved on this device only. No personal data leaves the device.</p>
      </section>

      <section><h3>Class and letters</h3>
        <div class="t-line"><span>Class level</span>${seg('classLevel', [[1, 'Class 1 · check each letter'], [2, 'Class 2 · check at the end']], S.classLevel)}</div>
        <div class="t-line"><span>Letters</span>${seg('letterCase', [['upper', 'UPPERCASE'], ['lower', 'lowercase']], S.letterCase)}</div>
      </section>

      <section><h3>Session</h3>
        <div class="t-line"><span>Sections on</span><div class="t-togs">
          ${SECTIONS.map(k => tog('sections.' + k, S.sections[k], SECTION_NAME[k])).join('')}</div></div>
        <div class="t-line"><span>Rounds per session</span>${seg('rounds', [[6, '6'], [9, '9'], [12, '12']], S.rounds)}</div>
      </section>

      <section><h3>Level for ${prof.avatar} ${prof.name} <small>(changes automatically as they play)</small></h3>
        ${SECTIONS.map(k => `<div class="t-line"><span>${SECTION_NAME[k]}</span>${seg('level.' + k, LEVELS.map(l => [l, cap(l)]), ch.levels[k])}</div>`).join('')}
      </section>

      <section><h3>Sound and display</h3>
        <div class="t-line"><span>Voice and sounds</span><input type="range" min="0" max="1" step="0.05" value="${S.soundVol}" data-range="soundVol"></div>
        <div class="t-line"><span>Music</span><input type="range" min="0" max="1" step="0.05" value="${S.musicVol}" data-range="musicVol"></div>
        <div class="t-line"><span>Options</span><div class="t-togs">
          ${tog('reducedMotion', S.reducedMotion, 'Reduced motion')}
          ${tog('smartboard', S.smartboard, 'Smartboard mode (bigger buttons, teacher taps Next)')}</div></div>
      </section>

      <section><h3>Content <small>(tap to switch on / off)</small></h3>
        <h4>Words</h4><div class="chips">${chips('spell')}</div>
        <div class="t-row">
          <input id="t-word" maxlength="6" placeholder="New word, e.g. MAP">
          <input id="t-emoji" maxlength="4" placeholder="Picture emoji 🗺️" class="short">
          <button class="t-btn" id="t-addword">Add word</button>
        </div>
        <h4>Countries</h4><div class="chips">${chips('map')}</div>
        <h4>Animal pairs</h4><div class="chips">${chips('baby')}</div>
      </section>

      <section><h3>Report for ${prof.avatar} ${prof.name}</h3>
        <div class="t-stats">
          <div><b>${rep.sessions}</b><span>sessions</span></div>
          <div><b>${rep.rounds}</b><span>rounds played</span></div>
          <div><b>${rep.stars}</b><span>stars</span></div>
          <div><b>${rep.rounds ? (rep.stars / rep.rounds).toFixed(1) : '–'}</b><span>stars per round</span></div>
          <div><b>${Object.keys(ch.stickers).length}</b><span>stickers</span></div>
        </div>
        <h4>Needed help with</h4>
        ${struggled.length ? `<ul class="t-list">${struggled.map(([k, v]) => `<li>${k} <b>×${v}</b></li>`).join('')}</ul>` : '<p class="t-note">Nothing yet.</p>'}
        <button class="t-btn danger" id="t-reset">Reset progress for ${prof.name}</button>
      </section>`;
    panel.scrollTop = keep;
  },

  teacherClick(e) {
    const S = Store.settings;
    const t = e.target;
    const segBtn = t.closest('.seg button');
    if (segBtn) {
      const key = segBtn.parentElement.dataset.key;
      const raw = segBtn.dataset.val;
      if (key.startsWith('level.')) Store.child.levels[key.slice(6)] = raw;
      else S[key] = /^\d+$/.test(raw) ? Number(raw) : raw;
      Store.save(); this.renderTeacher(); return;
    }
    const del = t.closest('[data-del]');
    if (del) {
      S.customWords = S.customWords.filter(w => w.word !== del.dataset.del);
      Store.save(); this.renderTeacher(); return;
    }
    const chip = t.closest('[data-chip]');
    if (chip) {
      const sec = chip.dataset.chip, k = chip.dataset.k;
      const list = S.disabled[sec] || (S.disabled[sec] = []);
      const i = list.indexOf(k);
      if (i >= 0) list.splice(i, 1); else list.push(k);
      Store.save(); this.renderTeacher(); return;
    }
    const prof = t.closest('[data-prof]');
    if (prof) { Store.data.current = prof.dataset.prof; Store.save(); this.renderTeacher(); return; }
    const delp = t.closest('[data-delprof]');
    if (delp) {
      const p = Store.data.profiles.find(x => x.id === delp.dataset.delprof);
      if (p && confirm(`Remove ${p.name} and their progress?`)) { Store.removeProfile(p.id); this.renderTeacher(); }
      return;
    }
    if (t.id === 't-addprof') {
      const name = $('#t-newname').value.trim();
      if (!name) { $('#t-newname').focus(); return; }
      Store.data.current = Store.addProfile(name, $('#t-newavatar').value);
      Store.save(); this.renderTeacher(); return;
    }
    if (t.id === 't-addword') {
      const word = $('#t-word').value.trim().toUpperCase();
      if (!/^[A-Z]{2,6}$/.test(word)) { alert('Please type a word of 2–6 letters (A–Z only).'); return; }
      if (allItems('spell').some(w => w.word === word)) { alert(word + ' is already in the list.'); return; }
      S.customWords.push({ word, emoji: $('#t-emoji').value.trim() || '⭐' });
      Store.save(); this.renderTeacher(); return;
    }
    if (t.id === 't-reset') {
      if (confirm(`Reset all progress, levels and stickers for ${Store.profile.name}?`)) {
        Store.data.progress[Store.data.current] = newProgress();
        Store.save(); this.renderTeacher();
      }
      return;
    }
    if (t.id === 't-done') { applyBodySettings(); this.goHome(false); }
  },

  teacherChange(e) {
    const S = Store.settings;
    const t = e.target;
    if (t.dataset.range) { S[t.dataset.range] = Number(t.value); Store.save(); Sound.applyVolumes(); return; }
    if (t.type === 'checkbox' && t.dataset.key) {
      const key = t.dataset.key;
      if (key.startsWith('sections.')) {
        S.sections[key.slice(9)] = t.checked;
        if (!SECTIONS.some(k => S.sections[k])) { S.sections[key.slice(9)] = true; t.checked = true; }
      } else S[key] = t.checked;
      Store.save(); applyBodySettings();
    }
  }
};

/* ------------------------------------------------------------------ Wiring */
function bindUI() {
  const tap = (sel, fn) => $(sel).addEventListener('click', e => { Sound.sfx('tap'); fn(e); });

  // Splash: the first tap also unlocks audio (browsers block sound until then)
  $('#scr-splash').addEventListener('click', () => {
    if (!$('#scr-splash').classList.contains('active')) return;
    Sound.unlock();
    Sound.sfx('tap');
    UI.goHome(true);
  });

  tap('#btn-play', () => Game.start('mix'));
  $$('#scr-home .sec-btn').forEach(b => b.addEventListener('click', () => { Sound.sfx('tap'); Game.start(b.dataset.sec); }));
  tap('#btn-profile', () => { if (Store.data.profiles.length > 1) UI.showProfiles(); else Voice.speak(`Hello ${Store.profile.name}!`); });
  tap('#btn-book', () => { UI.showBook(); Ollie.say('Your sticker book!'); });
  $('#profile-pick').addEventListener('click', e => { if (e.target.id === 'profile-pick') $('#profile-pick').classList.remove('show'); });

  // Teacher lock: hold for 3 seconds
  const lock = $('#btn-lock');
  let lockT = null;
  const lockStart = e => {
    e.preventDefault();
    lock.classList.add('holding');
    clearTimeout(lockT);
    lockT = setTimeout(() => { lock.classList.remove('holding'); UI.openTeacher(); }, 3000);
  };
  const lockStop = () => { clearTimeout(lockT); lock.classList.remove('holding'); };
  lock.addEventListener('pointerdown', lockStart);
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => lock.addEventListener(ev, lockStop));
  lock.addEventListener('contextmenu', e => e.preventDefault());

  // In-round controls
  tap('#btn-home', () => Game.askLeave());
  tap('#btn-speak', () => Game.repeat());
  $('#btn-hint').addEventListener('click', () => { Sound.sfx('tap'); Game.useHint(); });
  tap('#leave .btn-yes', () => Game.quit());
  tap('#leave .btn-no', () => Game.stay());
  $('#win').addEventListener('click', () => Game.advance());

  // Session end
  tap('#btn-again', () => Game.start(UI.endMode));
  tap('#btn-end-home', () => UI.goHome(false));

  // Sticker book
  tap('#btn-book-home', () => UI.goHome(false));
  $$('#scr-book .book-tab').forEach(t => t.addEventListener('click', () => { Sound.sfx('tap'); UI.showBook(t.dataset.page); }));

  // Teacher panel
  const panel = $('#teacher-panel');
  panel.addEventListener('click', e => UI.teacherClick(e));
  panel.addEventListener('change', e => UI.teacherChange(e));
  panel.addEventListener('input', e => { if (e.target.dataset.range) UI.teacherChange(e); });

  Stage.onOrientation(() => Game.relayout());
}

async function boot() {
  Store.load();
  Stage.init();
  Voice.init();
  Ollie.init();
  applyBodySettings();
  bindUI();

  // Preload every picture before the first round, with Ollie on the loading bar
  const imgs = new Set(['assets/img/bg-spell.jpg', 'assets/img/bg-map.jpg', 'assets/img/map-africa.jpg']);
  CONTENT.spell.forEach(i => i.image && imgs.add(i.image));
  CONTENT.baby.forEach(b => { if (b.parentImg) imgs.add(b.parentImg); if (b.babyImg) imgs.add(b.babyImg); });
  const total = imgs.size || 1;
  let done = 0;
  const fill = $('.load-fill'), owl = $('.load-owl');
  await Promise.all(Array.from(imgs).map(src => new Promise(res => {
    const im = new Image();
    im.onload = im.onerror = () => {
      done++;
      const p = done / total;
      fill.style.width = (p * 100) + '%';
      owl.style.left = (p * 100) + '%';
      res();
    };
    im.src = src;
  })));
  await sleep(400);
  UI.show('scr-splash');
  Ollie.say('Tap to play!', { pose: 'wave', after: 'wave' });   // may stay silent until the first tap
}

document.addEventListener('DOMContentLoaded', boot);
