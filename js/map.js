/*
 * Little Explorers — Map Puzzle.
 * The map is one illustrated picture (assets/img/map-africa.jpg). Each country is an outline traced
 * on that picture (in picture pixels). The missing country is covered by a grey dashed slot, and the
 * puzzle piece is the same outline cut out of the same picture, so it fits its slot exactly.
 */
const MAP_IMG = 'assets/img/map-africa.jpg';
const IMG_W = 1672, IMG_H = 941;

/* Country outlines on the picture: [x, y] in picture pixels */
const SHAPES = {
  DZA: [[70,215],[120,185],[170,160],[230,135],[300,150],[330,22],[410,15],[455,120],[470,95],[540,100],[560,140],[560,165],[575,200],[600,215],[622,228],[628,255],[640,280],[632,320],[612,345],[625,360],[640,372],[600,378],[560,388],[500,392],[455,400],[410,410],[370,428],[330,445],[300,452],[260,420],[220,390],[170,350],[110,325],[65,300],[60,250]],
  TUN: [[560,140],[575,105],[600,82],[700,75],[790,82],[805,130],[845,150],[875,180],[840,198],[795,212],[750,225],[700,232],[650,232],[622,228],[600,215],[575,200],[560,165]],
  LBY: [[622,228],[650,232],[700,232],[750,225],[795,212],[840,198],[875,185],[920,195],[1000,200],[1040,215],[1055,227],[1040,255],[1065,280],[1080,300],[1095,330],[1105,355],[1115,380],[1122,410],[1125,442],[1107,443],[1083,440],[1040,440],[960,430],[887,440],[830,420],[770,400],[700,387],[640,372],[625,360],[612,345],[632,320],[640,280],[628,255]],
  EGY: [[1055,227],[1060,215],[1100,212],[1171,178],[1215,200],[1256,138],[1310,190],[1351,170],[1420,225],[1456,230],[1500,270],[1540,285],[1585,330],[1605,375],[1620,420],[1625,452],[1500,455],[1440,458],[1300,450],[1200,448],[1150,442],[1125,442],[1122,410],[1115,380],[1105,355],[1095,330],[1080,300],[1065,280],[1040,255]],
  SDN: [[1125,442],[1150,442],[1200,448],[1300,450],[1440,458],[1500,455],[1625,452],[1640,520],[1640,600],[1632,680],[1626,780],[1536,805],[1436,812],[1336,808],[1236,795],[1166,790],[1147,793],[1133,753],[1120,713],[1133,673],[1153,633],[1167,593],[1173,553],[1160,513],[1133,480]],
  TCD: [[887,440],[915,434],[918,405],[945,405],[948,430],[960,430],[1040,440],[1055,438],[1058,405],[1080,405],[1083,440],[1107,443],[1125,442],[1133,480],[1160,513],[1173,553],[1167,593],[1153,633],[1133,673],[1120,713],[1133,753],[1147,793],[1100,800],[1000,805],[900,800],[830,795],[820,760],[800,700],[765,650],[773,620],[800,580],[840,533],[860,480]],
  NER: [[300,452],[330,445],[370,428],[410,410],[455,400],[500,392],[560,388],[600,378],[640,372],[700,387],[770,400],[830,420],[887,440],[860,480],[840,533],[800,580],[773,620],[765,650],[700,660],[600,655],[500,660],[400,650],[330,640],[275,615],[250,580],[251,536],[276,505],[295,486],[307,455]]
};
const SHAPE = {};
for (const id of Object.keys(SHAPES)) {
  const pts = SHAPES[id];
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  SHAPE[id] = { id, d: 'M' + pts.map(p => p.join(',')).join('L') + 'Z', bbox: { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y } };
}

/* ------------------------------------------------------------------ Simple flags (60×40) */
const FLAGS = {
  DZA: '<rect width="30" height="40" fill="#006233"/><rect x="30" width="30" height="40" fill="#fff"/><circle cx="31" cy="20" r="10" fill="#D21034"/><circle cx="34" cy="20" r="8" fill="#fff"/><polygon points="37,15 38.4,19 42.5,19 39.2,21.5 40.5,25.5 37,23 33.5,25.5 34.8,21.5 31.5,19 35.6,19" fill="#D21034" transform="translate(1 0) scale(.95)"/>',
  TUN: '<rect width="60" height="40" fill="#E70013"/><circle cx="30" cy="20" r="11" fill="#fff"/><circle cx="31" cy="20" r="7.5" fill="#E70013"/><circle cx="33" cy="20" r="6" fill="#fff"/><polygon points="33,16 34.1,19 37.3,19 34.7,20.9 35.7,24 33,22.1 30.3,24 31.3,20.9 28.7,19 31.9,19" fill="#E70013" transform="translate(1.5 0)"/>',
  LBY: '<rect width="60" height="10" fill="#E70013"/><rect y="10" width="60" height="20" fill="#000"/><rect y="30" width="60" height="10" fill="#239E46"/><circle cx="28" cy="20" r="6" fill="#fff"/><circle cx="30" cy="20" r="5" fill="#000"/><polygon points="34,17 34.8,19.2 37.2,19.2 35.3,20.6 36,22.9 34,21.5 32,22.9 32.7,20.6 30.8,19.2 33.2,19.2" fill="#fff"/>',
  EGY: '<rect width="60" height="13.4" fill="#CE1126"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.6" width="60" height="13.4" fill="#000"/><path d="M27 16h6l-1 7h-4z" fill="#C09300"/>',
  SDN: '<rect width="60" height="13.4" fill="#D21034"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.6" width="60" height="13.4" fill="#000"/><polygon points="0,0 22,20 0,40" fill="#007229"/>',
  TCD: '<rect width="20" height="40" fill="#002664"/><rect x="20" width="20" height="40" fill="#FECB00"/><rect x="40" width="20" height="40" fill="#C60C30"/>',
  NER: '<rect width="60" height="13.4" fill="#E05206"/><rect y="13.3" width="60" height="13.4" fill="#fff"/><rect y="26.6" width="60" height="13.4" fill="#0DB02B"/><circle cx="30" cy="20" r="4.5" fill="#E05206"/>'
};
const flagSVG = (id, cls = 'flag') => `<svg class="${cls}" viewBox="0 0 60 40" aria-hidden="true">${FLAGS[id] || ''}</svg>`;

/* ------------------------------------------------------------------ Mini-game */
const MapGame = {
  key: 'map', icon: '🌍', introLine: 'Put the country in its place!',
  start(ctx) { return new MapRound(ctx); }
};

let mapClipSeq = 0;
const PIECE_DEPTH = 12;   // thickness of the piece's 3D edge, in picture pixels

class MapRound {
  constructor(ctx) {
    this.ctx = ctx;
    // One country missing, one piece offered, with its flag and name on the card.
    this.done = false;
    this.selected = null;
    this.targets = [ctx.item];
    this.offered = [ctx.item];
    this.build();
  }

  get instructionText() {
    const t = this.targets[0];
    return `This is ${t.country}.${t.monumentSay ? ' Look, ' + t.monumentSay + '!' : ''} Put ${t.country} in its place on the map!`;
  }

  build() {
    const { root } = this.ctx;
    const portrait = Stage.portrait;
    const mapW = portrait ? 690 : 900;
    const mapX = portrait ? 15 : 20;
    const s = mapW / IMG_W;
    const mapH = IMG_H * s;
    const mapY = portrait ? 116 : 104 + Math.max(0, (596 - mapH) / 2);
    this.geom = { mapX, mapY, mapW, mapH, s };

    const wrap = mk('div', 'map-root');
    let svg = `<svg class="map-svg" viewBox="0 0 ${IMG_W} ${IMG_H}" style="left:${mapX}px;top:${mapY}px;width:${mapW}px;height:${mapH}px">`;
    svg += `<image href="${MAP_IMG}" x="0" y="0" width="${IMG_W}" height="${IMG_H}"/>`;
    // The empty slot: light grey, bold dashed outline and a pulsing glow (easy to notice)
    for (const t of this.targets) {
      const c = SHAPE[t.id];
      svg += `<path class="hole-glow" data-id="${t.id}" d="${c.d}"/>`;
      svg += `<path class="hole" data-id="${t.id}" d="${c.d}"/>`;
    }
    svg += `<path class="flash" id="flash-path" d=""/>`;
    svg += `<path class="sparkle" id="sparkle-path" d="" pathLength="100"/>`;
    svg += '</svg>';
    wrap.innerHTML = svg;

    // Piece tray
    const tray = mk('div', 'piece-tray');
    if (portrait) Object.assign(tray.style, { left: '20px', top: (mapY + mapH + 24) + 'px', width: '680px', height: (Stage.H - mapY - mapH - 44) + 'px' });
    else Object.assign(tray.style, { left: '946px', top: '104px', width: '318px', height: '596px' });
    wrap.appendChild(tray);
    root.appendChild(wrap);
    this.svg = $('.map-svg', wrap);

    // Name card at the bottom of the tray: flag + country name + monument
    const INFO_H = 150;
    const main = this.targets[0];
    tray.appendChild(mk('div', 'piece-info', `${flagSVG(main.id, 'info-flag')}<div class="info-text"><span>${main.country.toUpperCase()}</span>${main.monument ? `<small>${main.monument}</small>` : ''}</div>`));

    // Pieces: the country cut out of the same picture, with a thick 3D edge
    const trFull = Stage.rect(tray);
    const tr = { x: trFull.x, y: trFull.y, w: trFull.w, h: trFull.h - INFO_H - 20 };
    const n = this.offered.length;
    const pad = PIECE_DEPTH + 6;
    this.pieces = this.offered.map((c, i) => {
      const g = SHAPE[c.id];
      const w = (g.bbox.w + pad * 2) * s, h = (g.bbox.h + pad * 2) * s;
      const el = mk('div', 'piece');
      el.style.width = w + 'px'; el.style.height = h + 'px';
      const clip = 'mclip' + (++mapClipSeq);
      el.innerHTML = `<svg viewBox="${g.bbox.x - pad} ${g.bbox.y - pad} ${g.bbox.w + pad * 2} ${g.bbox.h + pad * 2}" width="100%" height="100%">
        <defs><clipPath id="${clip}"><path d="${g.d}"/></clipPath></defs>
        <path class="p-side" d="${g.d}" transform="translate(0 ${PIECE_DEPTH})"/>
        <image href="${MAP_IMG}" x="0" y="0" width="${IMG_W}" height="${IMG_H}" clip-path="url(#${clip})"/>
        <path class="p-edge" d="${g.d}"/></svg>`;
      const sw = tr.w / n;
      const slot = { cx: tr.x + sw * (i + 0.5), cy: tr.y + tr.h / 2 + 10, w: sw - 40, h: tr.h - 40 };
      const restScale = Math.min(1, slot.w / w, slot.h / h);
      const holeC = holeCenter(c.id, this.geom);
      const piece = { c, g, el, w, h, home: { x: slot.cx, y: slot.cy }, restScale, holeC, placed: false, isTarget: this.targets.some(t => t.id === c.id) };
      root.appendChild(el);
      this.setPos(piece, piece.home, restScale, false);
      Drag.attach(el, {
        enabled: () => !this.done && !piece.placed,
        onStart: (start) => {
          this.select(null);
          Sound.sfx('pick');
          Voice.speak(c.country, { rate: 0.95 });
          // keep the grabbed point under the finger while the piece grows to full size
          const k = 1.04 / piece.scale;
          piece.grab = { x: (start.x - piece.pos.x) * k, y: (start.y - piece.pos.y) * k };
          el.classList.add('dragging');
          el.style.zIndex = 30;
        },
        onMove: p => this.setPos(piece, { x: p.x - piece.grab.x, y: p.y - piece.grab.y }, 1.04, false),
        onEnd: (p, cancelled) => {
          el.classList.remove('dragging');
          if (cancelled) { this.goHome(piece); return; }
          this.tryDrop(piece);
        },
        onTap: () => {
          Voice.speak(c.country, { rate: 0.95 });
          this.select(this.selected === piece ? null : piece);
        }
      }, this.ctx.signal);
      return piece;
    });

    // Tap-to-place: tap a piece, then tap its slot.
    this.svg.addEventListener('pointerup', e => {
      if (!this.selected || this.done || Drag.active) return;
      const p = Stage.toStage(e.clientX, e.clientY);
      const piece = this.selected;
      this.select(null);
      this.setPos(piece, p, 1, true);
      setTimeout(() => this.tryDrop(piece), 260);
    }, { signal: this.ctx.signal });
  }

  select(piece) {
    this.pieces.forEach(p => p.el.classList.toggle('selected', p === piece));
    this.selected = piece;
  }

  setPos(piece, pos, scale, anim) {
    piece.pos = { x: pos.x, y: pos.y };
    piece.scale = scale;
    piece.el.classList.toggle('anim', !!anim);
    piece.el.style.left = (pos.x - piece.w / 2) + 'px';
    piece.el.style.top = (pos.y - piece.h / 2) + 'px';
    piece.el.style.transform = `scale(${scale})`;
  }

  goHome(piece) {
    piece.el.style.zIndex = '';
    this.setPos(piece, piece.home, piece.restScale, true);
  }

  tryDrop(piece) {
    const tol = 0.12 * this.geom.mapW;
    if (piece.isTarget && Math.hypot(piece.pos.x - piece.holeC.x, piece.pos.y - piece.holeC.y) <= tol) { this.snap(piece); return; }
    Sound.sfx('drop');
    this.goHome(piece);
  }

  snap(piece) {
    piece.placed = true;
    this.ctx.api.progress();
    this.setPos(piece, piece.holeC, 1, true);
    piece.el.classList.add('snapping');
    Sound.sfx('snap');
    setTimeout(() => {
      if (!this.ctx.alive()) return;
      piece.el.remove();
      const id = piece.c.id, c = piece.g;
      $$(`[data-id="${id}"]`, this.svg).forEach(n => n.remove());   // the picture underneath now shows the country
      const fl = $('#flash-path', this.svg);
      fl.setAttribute('d', c.d);
      fl.classList.remove('run'); void fl.getBoundingClientRect(); fl.classList.add('run');
      const sp = $('#sparkle-path', this.svg);
      sp.setAttribute('d', c.d);
      sp.classList.remove('run'); void sp.getBoundingClientRect(); sp.classList.add('run');
      Sound.sfx('sparkle');
      if (this.targets.every(t => this.pieces.find(p => p.c.id === t.id && p.placed))) this.finish();
    }, 230);
  }

  async finish() {
    this.done = true;
    await sleep(250);
    if (!this.ctx.alive()) return;
    const t = this.targets[0];
    this.ctx.api.win({ title: t.country.toUpperCase(), flags: [t.id], line: `${t.country}! ${t.fact}` });
  }

  hint() {
    const piece = this.pieces.find(p => p.isTarget && !p.placed);
    if (!piece) return;
    piece.el.classList.add('glow');
    setTimeout(() => piece.el.classList.remove('glow'), 3500);
    Hand.show(piece.home, piece.holeC);
  }

  demo() { this.hint(); }

  destroy() { /* DOM is cleared by the game; listeners use the round's AbortSignal */ }
}

function holeCenter(id, geom) {
  const g = SHAPE[id].bbox;
  return { x: geom.mapX + (g.x + g.w / 2) * geom.s, y: geom.mapY + (g.y + g.h / 2) * geom.s };
}
