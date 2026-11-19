'use strict';
/* Little Explorers — Section 3: Find the Baby. */

const BabyGame = {
  key: 'baby', icon: '🐾', introLine: 'Find the baby!',
  start(ctx) { return new BabyRound(ctx); }
};

class BabyRound {
  constructor(ctx) {
    this.ctx = ctx;
    this.pair = ctx.item;
    this.level = ctx.level;
    this.done = false;
    this.wrongTries = 0;
    this.parentSelected = false;
    const decoys = this.pickDecoys();
    this.babies = shuffle([this.pair, ...decoys]);
    this.build();
  }

  get instructionText() {
    const p = this.pair.parent;
    return `This is ${article(p)}. Where is the ${p}'s baby? Draw a line!`;
  }

  pickDecoys() {
    const pair = this.pair, level = this.level;
    const all = this.ctx.allItems;
    const others = all.filter(p => p.parent !== pair.parent && p.baby !== pair.baby);
    let pref;
    if (level === 'easy') pref = others.filter(p => p.group !== pair.group && p.level === 'easy');
    else if (level === 'normal') pref = others.filter(p => (pair.similar || []).includes(p.parent));
    else pref = others;
    const chosen = [];
    const add = list => {
      for (const p of shuffle(list.slice())) {
        if (chosen.length >= 2) break;
        if (chosen.includes(p) || chosen.some(c => c.baby === p.baby)) continue;
        chosen.push(p);
      }
    };
    add(pref);
    add(others.filter(p => level === 'hard' || p.level !== 'hard'));
    add(others);
    return chosen;
  }

  build() {
    const { root } = this.ctx;
    const lower = this.ctx.settings.letterCase === 'lower';
    const name = lower ? this.pair.parent : this.pair.parent.toUpperCase();
    const wrap = mk('div', 'baby-root');
    wrap.innerHTML = `
      <div class="parent-card" role="button" aria-label="${this.pair.parent}">
        <div class="pic">${picHTML(this.pair.parentImg, this.pair.parentEmoji, this.pair.parent)}</div>
        <div class="name">${name}</div>
        <div class="dot parent-dot"></div>
      </div>
      <div class="baby-col"></div>
      <svg class="line-layer" viewBox="0 0 ${Stage.W} ${Stage.H}" width="${Stage.W}" height="${Stage.H}">
        <path class="link" d=""/>
      </svg>`;
    root.appendChild(wrap);
    this.wrap = wrap;
    this.parentEl = $('.parent-card', wrap);
    this.pdot = $('.parent-dot', wrap);
    this.link = $('.link', wrap);
    const col = $('.baby-col', wrap);
    this.cards = this.babies.map(b => {
      const el = mk('div', 'baby-card', `<div class="pic">${picHTML(b.babyImg, b.babyEmoji, b.baby)}</div><div class="dot"></div><b class="mark"></b>`);
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', b.baby);
      col.appendChild(el);
      const card = { b, el, dot: $('.dot', el), right: b === this.pair, dimmed: false };
      el.addEventListener('pointerup', e => {
        if (Drag.active || this.done) return;
        e.preventDefault();
        if (this.parentSelected) { this.parentSelected = false; this.parentEl.classList.remove('selected'); this.resolve(card); }
        else if (!card.dimmed) Voice.speak(b.baby, { pitch: 1.5, volume: 0.85 });
      }, { signal: this.ctx.signal });
      return card;
    });

    Drag.attach(this.parentEl, {
      enabled: () => !this.done,
      onStart: () => {
        Sound.sfx('pick');
        this.parentSelected = false;
        this.parentEl.classList.remove('selected');
        this.link.setAttribute('class', 'link drawing');
      },
      onMove: p => {
        this.drawTo(p);
        const over = this.cardAt(p);
        this.cards.forEach(c => c.el.classList.toggle('over', c === over));
      },
      onEnd: (p, cancelled) => {
        this.cards.forEach(c => c.el.classList.remove('over'));
        const card = cancelled ? null : this.cardAt(p);
        if (card) this.resolve(card, p);
        else this.retract(p);
      },
      onTap: () => {
        this.parentSelected = !this.parentSelected;
        this.parentEl.classList.toggle('selected', this.parentSelected);
        Voice.speak(this.pair.parent, { rate: 0.95 });
      }
    }, this.ctx.signal);
  }

  dotPos(node) { const r = Stage.rect(node); return { x: r.cx, y: r.cy }; }

  curve(a, b) {
    const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    const dx = b.x - a.x, dy = b.y - a.y;
    const cx = mx - dy * 0.12, cy = my + dx * 0.12;
    return `M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}`;
  }

  drawTo(p) { this.link.setAttribute('d', this.curve(this.dotPos(this.pdot), p)); }

  cardAt(p) {
    let best = null, bestD = Infinity;
    for (const c of this.cards) {
      if (c.dimmed) continue;
      const r = Stage.rect(c.el, 20);
      if (!Stage.inRect(p, r)) continue;
      const d = Math.hypot(p.x - r.cx, p.y - r.cy);
      if (d < bestD) { best = c; bestD = d; }
    }
    return best;
  }

  retract(from) {
    const start = this.dotPos(this.pdot);
    let end = from || start;
    const steps = Store.settings.reducedMotion ? 1 : 10;
    let i = 0;
    const tick = () => {
      if (!this.ctx.alive()) return;
      i++;
      const t = i / steps;
      const p = { x: end.x + (start.x - end.x) * t, y: end.y + (start.y - end.y) * t };
      this.link.setAttribute('d', this.curve(start, p));
      if (i < steps) requestAnimationFrame(tick);
      else { this.link.setAttribute('d', ''); this.link.setAttribute('class', 'link'); }
    };
    requestAnimationFrame(tick);
  }

  async resolve(card) {
    if (this.done || card.dimmed) return;
    const end = this.dotPos(card.dot);
    this.link.setAttribute('d', this.curve(this.dotPos(this.pdot), end));
    if (card.right) {
      this.done = true;
      this.ctx.api.progress();
      this.link.setAttribute('class', 'link ok');
      card.el.classList.add('right');
      $('.mark', card.el).textContent = '✓';
      Sound.sfx('snap');
      // the baby hops towards its parent
      const pr = Stage.rect(this.parentEl), cr = Stage.rect(card.el);
      const dx = (Stage.portrait ? pr.cx - cr.cx : (pr.x + pr.w) - cr.x + 30) * 0.35;
      const dy = (Stage.portrait ? (pr.y + pr.h) - cr.y + 30 : pr.cy - cr.cy) * 0.35;
      card.el.style.setProperty('--hx', dx + 'px');
      card.el.style.setProperty('--hy', dy + 'px');
      card.el.classList.add('hop');
      this.cards.filter(c => c !== card).forEach(c => c.el.classList.add('dim'));
      const p = this.pair;
      const line = `${p.sound ? p.sound + ' ' : ''}A baby ${p.parent} is called ${article(p.baby)}.`;
      await sleep(400);
      if (!this.ctx.alive()) return;
      const lower = this.ctx.settings.letterCase === 'lower';
      this.ctx.api.win({ title: lower ? p.baby : p.baby.toUpperCase(), line });
    } else {
      this.ctx.api.mistake(this.pair.parent);
      this.wrongTries++;
      this.link.setAttribute('class', 'link bad');
      card.el.classList.add('wobble');
      $('.mark', card.el).textContent = '✗';
      Sound.sfx('boing');
      Voice.speak(`I'm ${article(card.b.baby)}!`, { pitch: 1.6, volume: 0.75 });
      setTimeout(() => {
        if (!this.ctx.alive()) return;
        card.el.classList.remove('wobble');
        $('.mark', card.el).textContent = '';
        this.retract(end);
        if (this.wrongTries >= 2) {
          this.cards.filter(c => !c.right).forEach(c => { c.dimmed = true; c.el.classList.add('dim'); });
        }
      }, 650);
    }
  }

  hint() {
    const card = this.cards.find(c => c.right);
    card.el.classList.add('glow');
    setTimeout(() => card.el.classList.remove('glow'), 4000);
    Hand.show(this.dotPos(this.pdot), this.dotPos(card.dot));
  }

  demo() {
    // Show the gesture without giving away the answer: point at the middle card.
    Hand.show(this.dotPos(this.pdot), this.dotPos(this.cards[1].dot));
  }

  destroy() {}
}
