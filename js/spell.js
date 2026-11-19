'use strict';
/* Little Explorers — Section 1: Spell It. */

const SpellGame = {
  key: 'spell', icon: '🔤', introLine: 'Make the word!',
  start(ctx) { return new SpellRound(ctx); }
};

const TILE = 112;   // letter tile size in px (keep in sync with .tile in style.css)
const TILE_COLORS =['#FFB5C2', '#B5EAD7', '#C7CEEA', '#FFDAC1', '#E2F0CB', '#FFF1A8', '#BDE0FE', '#F1C0E8'];

class SpellRound {
  constructor(ctx) {
    this.ctx = ctx;
    const it = ctx.item;
    this.item = it;
    this.word = it.word.toUpperCase();
    this.mode = ctx.settings.classLevel === 2 ? 'end' : 'box';
    this.trace = ctx.level === 'easy';
    this.lower = ctx.settings.letterCase === 'lower';
    this.done = false;
    this.wrongDrops = 0;
    this.build();
  }

  disp(ch) { return this.lower ? ch.toLowerCase() : ch; }

  get instructionText() {
    const w = this.word.toLowerCase();
    return `This is ${this.item.say || article(w)}. Make the word ${w}!`;
  }

  build() {
    const { root } = this.ctx;
    const n = this.word.length;
    const wrap = mk('div', 'spell-root');
    wrap.innerHTML = `
      <button class="pic-card" aria-label="Hear the word">${picHTML(this.item.image, this.item.emoji, this.word)}</button>
      <div class="boxes"></div>
      <div class="tray"></div>`;
    root.appendChild(wrap);
    this.wrap = wrap;
    this.pic = $('.pic-card', wrap);
    this.pic.addEventListener('click', () => {
      Sound.sfx('tap');
      this.pic.classList.remove('wiggle'); void this.pic.offsetWidth; this.pic.classList.add('wiggle');
      Voice.speak(this.word.toLowerCase(), { rate: 0.8 });
    }, { signal: this.ctx.signal });

    // Boxes
    const boxesEl = $('.boxes', wrap);
    const size = 100;  // answer boxes: smaller than the picture, big enough for small fingers
    boxesEl.style.setProperty('--box', size + 'px');
    this.boxes = this.word.split('').map((ch, i) => {
      const b = mk('div', 'box' + (this.trace ? ' trace' : ''), `<span class="ghost">${this.disp(ch)}</span>`);
      boxesEl.appendChild(b);
      const box = { ch, i, el: b, tile: null, locked: false };
      return box;
    });

    // Letters: only the word's own letters (no extra decoys — kept simple for Class 1–2),
    // shuffled so they never already spell the word in order.
    const letters = this.word.split('').map(ch => ({ ch }));
    for (let t = 0; t < 60; t++) {
      shuffle(letters);
      if (letters.map(l => l.ch).join('') !== this.word) break;
    }

    // Tile positions in the tray (loose grid)
    const tray = $('.tray', wrap);
    const tr = Stage.rect(tray);
    const count = letters.length;
    // Landscape tray is tall: 2 columns spread the tiles over its height. Portrait tray is wide: 3 columns.
    const cols = Math.min(count, Stage.portrait ? 3 : 2);
    const rows = Math.ceil(count / cols);
    const cw = tr.w / cols, rh = Math.min(220, tr.h / rows);
    const top = tr.y + (tr.h - rh * rows) / 2;
    const jx = Math.max(0, Math.min(28, (cw - TILE) / 2 - 14));
    const jy = Math.max(0, Math.min(28, (rh - TILE) / 2 - 14));
    this.tiles = letters.map((l, i) => {
      const r = Math.floor(i / cols), c = i % cols;
      const inRow = Math.min(cols, count - r * cols);
      const left = tr.x + (tr.w - cw * inRow) / 2;
      const home = {
        x: left + cw * (c + 0.5) + (Math.random() * 2 - 1) * jx,
        y: top + rh * (r + 0.5) + (Math.random() * 2 - 1) * jy
      };
      const el = mk('div', 'tile', `<span>${this.disp(l.ch)}</span><b class="tick">✓</b>`);
      el.style.background = TILE_COLORS[i % TILE_COLORS.length];
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', 'Letter ' + l.ch);
      root.appendChild(el);
      const tile = { ch: l.ch, el, home, box: null, locked: false, pos: home };
      this.place(tile, home, false);
      Drag.attach(el, {
        enabled: () => !this.done && !tile.locked,
        onStart: (start, now, type) => {
          Sound.sfx('pick');
          Voice.speak(LETTER_SOUND[tile.ch] || tile.ch, { rate: 0.9 });
          if (tile.box) { tile.box.tile = null; tile.box = null; }
          // Keep the grabbed spot under the finger (no jump). On touch, lift the tile a little
          // above the fingertip so the child can still see the letter.
          tile.grab = { x: start.x - tile.pos.x, y: start.y - tile.pos.y + (type === 'mouse' ? 0 : 30) };
          el.classList.add('dragging');
          el.classList.remove('wrong');
          el.style.zIndex = 40;
          this.boxes.forEach(b => b.el.classList.toggle('target', !b.locked));
        },
        onMove: p => {
          this.place(tile, { x: p.x - tile.grab.x, y: p.y - tile.grab.y }, false);
          const near = this.boxAt(tile.pos);
          this.boxes.forEach(b => b.el.classList.toggle('near', b === near));
        },
        onEnd: (p, cancelled) => {
          el.classList.remove('dragging');
          el.style.zIndex = '';
          this.boxes.forEach(b => b.el.classList.remove('target', 'near'));
          const box = cancelled ? null : (this.boxAt(tile.pos) || this.boxAt(p));
          if (box) this.drop(tile, box);
          else this.toTray(tile);
        },
        onTap: () => {
          if (tile.box) { this.toTray(tile); Sound.sfx('drop'); this.ctx.api.progress(); return; }
          const box = this.boxes.find(b => !b.tile && !b.locked);
          if (!box) return;
          Voice.speak(LETTER_SOUND[tile.ch] || tile.ch, { rate: 0.9 });
          this.drop(tile, box);
        }
      }, this.ctx.signal);
      return tile;
    });
  }

  boxCenter(box) { const r = Stage.rect(box.el); return { x: r.cx, y: r.cy }; }

  /* Very forgiving drop zone for small hands: anywhere over (or close to) the box strip counts,
     and the letter goes to the nearest open box. */
  boxAt(p) {
    const strip = Stage.rect($('.boxes', this.wrap), 60);
    const open = this.boxes.filter(b => !b.locked);
    const inStrip = Stage.inRect(p, strip);
    let best = null, bestD = Infinity;
    for (const b of open) {
      const r = Stage.rect(b.el, 50);
      if (!inStrip && !Stage.inRect(p, r)) continue;
      const d = Math.hypot(p.x - r.cx, p.y - r.cy);
      if (d < bestD) { best = b; bestD = d; }
    }
    return best;
  }

  place(tile, pos, anim) {
    tile.pos = pos;
    tile.el.classList.toggle('anim', !!anim);
    tile.el.style.left = (pos.x - TILE / 2) + 'px';
    tile.el.style.top = (pos.y - TILE / 2) + 'px';
  }

  toTray(tile) {
    if (tile.box) { tile.box.tile = null; tile.box = null; }
    tile.el.classList.remove('wrong');
    this.place(tile, tile.home, true);
  }

  drop(tile, box) {
    if (box.locked) { this.toTray(tile); return; }
    if (box.tile && box.tile !== tile) this.toTray(box.tile);
    box.tile = tile; tile.box = box;
    this.place(tile, this.boxCenter(box), true);
    Sound.sfx('drop');
    Voice.speak(LETTER_NAME[tile.ch] || tile.ch, { rate: 0.95 });

    if (this.mode === 'box') {
      if (tile.ch === box.ch) {
        this.lock(box);
        this.ctx.api.progress();
        this.checkWin();
      } else {
        this.ctx.api.mistake(this.word);
        this.wrongDrops++;
        setTimeout(() => {
          if (!this.ctx.alive() || tile.box !== box) return;
          tile.el.classList.add('wobble');
          Sound.sfx('boing');
          setTimeout(() => { tile.el.classList.remove('wobble'); if (tile.box === box) this.toTray(tile); }, 450);
        }, 300);
        if (this.wrongDrops >= 3) { this.wrongDrops = 0; this.ctx.api.offerHint(); }
      }
    } else {
      this.ctx.api.progress();
      if (this.boxes.every(b => b.tile)) setTimeout(() => this.checkEnd(), 500);
    }
  }

  lock(box) {
    box.locked = true;
    box.tile.locked = true;
    box.el.classList.add('ok');
    box.tile.el.classList.add('locked');
    box.tile.el.classList.remove('glow');
    Sound.sfx('snap');
  }

  checkEnd() {
    if (!this.ctx.alive() || this.done || !this.boxes.every(b => b.tile)) return;
    let wrong = 0;
    for (const b of this.boxes) {
      if (b.locked) continue;
      if (b.tile.ch === b.ch) this.lock(b);
      else {
        wrong++;
        const t = b.tile;
        t.el.classList.add('wrong');
        setTimeout(() => { if (t.box === b) this.toTray(t); }, 700);
      }
    }
    if (wrong) {
      Sound.sfx('boing');
      for (let i = 0; i < wrong; i++) this.ctx.api.mistake(this.word);
      this.wrongDrops += wrong;
      if (this.wrongDrops >= 3) { this.wrongDrops = 0; this.ctx.api.offerHint(); }
    }
    this.checkWin();
  }

  async checkWin() {
    if (this.done || !this.boxes.every(b => b.locked)) return;
    this.done = true;
    await sleep(200);
    if (!this.ctx.alive()) return;
    this.boxes.forEach((b, i) => setTimeout(() => {
      if (!this.ctx.alive()) return;
      b.tile.el.classList.add('bounce');
      setTimeout(() => b.tile.el.classList.remove('bounce'), 380);
    }, i * 400));
    setTimeout(() => this.ctx.alive() && this.pic.classList.add('celebrate'), this.boxes.length * 400);
    const letters = this.boxes.map(b => LETTER_NAME[b.ch] || b.ch).join(', ');
    await Voice.speak(`${letters}. ${this.word.toLowerCase()}!`, { rate: 0.95 });
    if (!this.ctx.alive()) return;
    this.ctx.api.win({ title: this.disp(this.word), word: this.word, line: this.item.sound || null });
  }

  hint() {
    const box = this.boxes.find(b => !b.locked);
    if (!box) return;
    const tile = this.tiles.find(t => !t.locked && t.ch === box.ch && t.box !== box && !t.box)
      || this.tiles.find(t => !t.locked && t.ch === box.ch);
    if (!tile) return;
    tile.el.classList.add('glow');
    setTimeout(() => tile.el.classList.remove('glow'), 4000);
    Hand.show(tile.pos, this.boxCenter(box));
  }

  demo() {
    const box = this.boxes[0];
    const tile = this.tiles.find(t => t.ch === box.ch);
    if (tile) Hand.show(tile.pos, this.boxCenter(box));
  }

  destroy() {}
}
