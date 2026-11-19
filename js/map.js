'use strict';
/* Little Explorers — Section 2: Map Puzzle (North Africa, Algeria to Sudan).
 *
 * Country shapes are hand-simplified from current borders (Sudan without South Sudan) and built
 * from shared border segments, so neighbouring countries — and every piece and its hole — use the
 * exact same points: no gaps, no overlap. Projection: equirectangular centred on 22°N.
 * To swap in Natural Earth paths later, replace GEO.countries[id].ring with the real coordinates.
 */

const GEO = (() => {
  const LON0 = -9.5, LON1 = 41.5, LAT0 = 6, LAT1 = 38;
  const KX = Math.cos(22 * Math.PI / 180) * 10, KY = 10;
  const W = (LON1 - LON0) * KX, H = (LAT1 - LAT0) * KY;
  const P = ([lon, lat]) => [(lon - LON0) * KX, (LAT1 - lat) * KY];

  /* Shared border segments: [lon, lat] */
  const S = {
    DZA_coast: [[-2.2, 35.1], [-0.6, 35.8], [1.2, 36.5], [3.2, 36.8], [5.3, 36.7], [7.2, 37.0], [8.6, 36.9]],
    DZA_TUN: [[8.6, 36.9], [8.4, 35.9], [8.3, 35.0], [7.6, 34.0], [7.9, 33.5], [9.1, 32.3], [9.5, 30.2]],
    TUN_coast: [[8.6, 36.9], [9.8, 37.3], [10.3, 36.9], [11.1, 37.0], [10.5, 36.3], [10.9, 35.7], [11.1, 35.2], [10.2, 34.3], [10.7, 34.0], [10.1, 33.7], [11.1, 33.3], [11.5, 33.15]],
    TUN_LBY: [[11.5, 33.15], [11.4, 32.4], [10.3, 31.7], [10.0, 30.9], [9.5, 30.2]],
    DZA_LBY: [[9.5, 30.2], [9.8, 29.0], [9.9, 27.0], [9.4, 26.2], [10.0, 25.3], [10.3, 24.4], [11.6, 24.0], [11.97, 23.5]],
    LBY_coast: [[11.5, 33.15], [12.6, 32.8], [13.9, 32.7], [15.2, 32.3], [15.7, 31.4], [17.0, 31.0], [18.6, 30.4], [19.6, 30.5], [20.1, 31.0], [19.9, 31.8], [20.6, 32.6], [21.6, 32.9], [23.0, 32.6], [24.0, 32.0], [25.1, 31.6]],
    LBY_EGY: [[25.1, 31.6], [24.8, 30.0], [25.0, 29.0], [25.0, 22.0]],
    LBY_SDN: [[25.0, 22.0], [25.0, 20.0], [24.0, 20.0], [24.0, 19.5]],
    LBY_TCD: [[24.0, 19.5], [15.0, 23.0]],
    LBY_NER: [[15.0, 23.0], [14.1, 22.5], [11.97, 23.5]],
    EGY_coast: [[25.1, 31.6], [27.5, 31.3], [29.0, 30.9], [30.1, 31.5], [31.0, 31.6], [32.3, 31.3], [34.2, 31.3]],
    EGY_east: [[34.2, 31.3], [34.9, 29.5], [34.6, 28.6], [34.3, 27.8], [33.7, 28.4], [33.0, 29.2], [32.6, 29.95], [32.35, 29.7], [32.6, 29.0], [33.2, 28.2], [33.6, 27.6], [34.1, 26.7], [35.0, 24.9], [35.6, 23.9], [35.6, 23.1], [36.9, 22.0]],
    EGY_SDN: [[36.9, 22.0], [31.4, 22.0], [25.0, 22.0]],
    SDN_coast: [[36.9, 22.0], [37.2, 21.0], [37.1, 19.8], [37.5, 18.6], [38.6, 18.0]],
    SDN_ERI: [[38.6, 18.0], [37.9, 17.4], [37.0, 17.1], [36.9, 16.0], [36.45, 14.4]],
    SDN_ETH: [[36.45, 14.4], [36.2, 12.7], [35.3, 12.1], [34.9, 11.0], [34.3, 10.6], [34.1, 9.5]],
    SDN_SSD: [[34.1, 9.5], [33.0, 10.7], [32.4, 12.1], [31.4, 10.5], [29.8, 10.0], [29.0, 9.7], [27.0, 9.6], [26.4, 10.3], [25.6, 10.4], [25.0, 10.0], [24.6, 8.8], [23.5, 8.7]],
    SDN_CAF: [[23.5, 8.7], [23.6, 9.6], [22.9, 10.9]],
    SDN_TCD: [[22.9, 10.9], [22.2, 12.7], [21.9, 13.0], [22.3, 14.3], [22.6, 14.9], [23.0, 15.7], [24.0, 15.7], [24.0, 19.5]],
    TCD_CAF: [[22.9, 10.9], [21.7, 10.6], [20.0, 9.0], [18.8, 8.9], [17.0, 7.7], [15.5, 7.5]],
    TCD_CMR: [[15.5, 7.5], [14.5, 9.0], [15.0, 10.0], [14.9, 12.0], [14.2, 12.5]],
    TCD_NGA: [[14.2, 12.5], [13.6, 13.7]],
    TCD_NER: [[13.6, 13.7], [13.5, 14.4], [13.9, 15.7], [15.3, 17.9], [15.7, 19.9], [15.9, 20.4], [15.5, 21.0], [15.0, 23.0]],
    NER_NGA: [[13.6, 13.7], [12.3, 13.2], [10.0, 13.3], [7.3, 13.1], [5.4, 13.9], [4.1, 13.5], [3.6, 11.7]],
    NER_W: [[3.6, 11.7], [2.8, 12.4], [2.2, 12.6], [1.0, 13.3], [0.4, 14.0], [0.2, 14.9], [1.3, 15.3], [3.6, 15.6], [4.3, 16.9], [4.25, 19.15]],
    DZA_NER: [[4.25, 19.15], [5.8, 19.4], [7.5, 20.9], [11.97, 23.5]],
    DZA_MLI: [[4.25, 19.15], [3.3, 19.0], [3.1, 19.7], [1.1, 20.7], [-4.85, 25.0]],
    DZA_W: [[-4.85, 25.0], [-8.7, 27.3], [-8.7, 28.7], [-5.6, 29.5], [-3.7, 30.9], [-2.9, 31.5], [-1.2, 32.1], [-1.7, 33.4], [-1.8, 34.5], [-2.2, 35.1]]
  };
  const R = a => a.slice().reverse();
  const join = (...parts) => {
    const out = [];
    parts.forEach(p => p.forEach((pt, i) => {
      if (i === 0 && out.length) { const l = out[out.length - 1]; if (l[0] === pt[0] && l[1] === pt[1]) return; }
      out.push(pt);
    }));
    return out;
  };

  const rings = {
    DZA: join(S.DZA_coast, S.DZA_TUN, S.DZA_LBY, R(S.DZA_NER), S.DZA_MLI, S.DZA_W),
    TUN: join(S.TUN_coast, S.TUN_LBY, R(S.DZA_TUN)),
    LBY: join(S.LBY_coast, S.LBY_EGY, S.LBY_SDN, S.LBY_TCD, S.LBY_NER, R(S.DZA_LBY), R(S.TUN_LBY)),
    EGY: join(S.EGY_coast, S.EGY_east, S.EGY_SDN, R(S.LBY_EGY)),
    SDN: join(R(S.EGY_SDN), S.SDN_coast, S.SDN_ERI, S.SDN_ETH, S.SDN_SSD, S.SDN_CAF, S.SDN_TCD, R(S.LBY_SDN)),
    TCD: join(R(S.LBY_TCD), R(S.SDN_TCD), S.TCD_CAF, S.TCD_CMR, S.TCD_NGA, S.TCD_NER),
    NER: join(R(S.LBY_NER), R(S.TCD_NER), S.NER_NGA, S.NER_W, S.DZA_NER)
  };

  /* Greyed neighbours (never asked) */
  const outerSouthWest = join(
    S.SDN_ERI, S.SDN_ETH, S.SDN_SSD, S.SDN_CAF, S.TCD_CAF, S.TCD_CMR, S.TCD_NGA, S.NER_NGA, S.NER_W, S.DZA_MLI, S.DZA_W,
    [[-5.3, 35.9], [-6.0, 35.8], [-6.9, 34.1], [-8.6, 33.2], [-9.6, 31.0], [-11, 30], [-11, 4], [43, 4], [43, 12.6], [42.2, 13.4], [41.2, 14.0], [40.2, 14.8], [39.7, 15.3], [39.2, 16.5]]
  );
  const east = [[34.2, 31.3], [35.1, 33.1], [35.6, 34.2], [35.9, 35.0], [36.0, 36.0], [34.6, 36.8], [32.5, 36.1], [30.5, 36.3], [28.0, 36.8], [27.3, 39], [43, 39], [43, 16.4], [41.8, 17.2], [41.0, 18.6], [40.0, 20.0], [39.1, 21.5], [38.1, 24.1], [36.6, 25.9], [35.6, 27.6], [35.0, 29.5], [34.9, 29.5]];
  const islands = [
    [[12.4, 38.1], [13.5, 38.2], [15.6, 38.3], [15.1, 37.1], [15.2, 36.7], [14.3, 37.0], [12.5, 37.6]],                 // Sicily
    [[23.5, 35.3], [24.3, 35.4], [25.4, 35.3], [26.3, 35.2], [26.1, 35.0], [24.7, 34.9], [23.5, 35.2]],                 // Crete
    [[32.3, 34.9], [33.0, 35.4], [34.6, 35.7], [33.9, 35.1], [33.0, 34.6]],                                             // Cyprus
    [[-11, 39], [-9.0, 38.5], [-8.8, 37.0], [-7.4, 37.2], [-6.4, 36.8], [-5.6, 36.0], [-4.4, 36.7], [-2.1, 36.7], [-0.7, 37.6], [0.2, 38.6], [0.5, 39]] // Spain/Portugal
  ];
  const nile = [[31.2, 31.4], [31.2, 30.0], [31.0, 27.5], [32.6, 25.5], [32.9, 24.0], [31.5, 21.8], [30.5, 20.0], [31.6, 18.3], [33.5, 17.7], [32.5, 15.6], [32.6, 12.0], [31.9, 10.6]];

  const path = ring => 'M' + ring.map(p => P(p).map(v => v.toFixed(1)).join(',')).join('L') + 'Z';
  const line = pts => 'M' + pts.map(p => P(p).map(v => v.toFixed(1)).join(',')).join('L');
  const bbox = ring => {
    const xs = ring.map(p => P(p)[0]), ys = ring.map(p => P(p)[1]);
    const x = Math.min(...xs), y = Math.min(...ys);
    return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y };
  };

  const colors = { DZA: '#FFD59E', TUN: '#FFB5C2', LBY: '#B5EAD7', EGY: '#C7CEEA', SDN: '#FFC9A8', TCD: '#D9EFA9', NER: '#F6C6EA' };
  const labels = { DZA: [2.0, 28.2], TUN: [9.4, 34.3], LBY: [17.5, 27.0], EGY: [29.6, 26.6], SDN: [30.0, 15.8], TCD: [18.8, 15.6], NER: [9.3, 17.4] };
  const countries = {};
  for (const id of Object.keys(rings)) {
    const bb = bbox(rings[id]);
    countries[id] = { id, ring: rings[id], d: path(rings[id]), bbox: bb, area: bb.w * bb.h, color: colors[id], label: P(labels[id]) };
  }
  const greyLabels = [
    ['MOROCCO', [-6.4, 32.0]], ['MALI', [-2.5, 17.5]], ['NIGERIA', [8.0, 9.6]], ['CAMEROON', [12.6, 8.0]],
    ['C. A. R.', [20.3, 7.3]], ['SOUTH SUDAN', [29.6, 7.6]], ['ETHIOPIA', [38.6, 10.0]], ['ERITREA', [38.9, 16.0]]
  ];
  return {
    W, H, P, countries,
    neighbours: [path(outerSouthWest), path(east)],
    islands: islands.map(path),
    nile: line(nile),
    lakeChad: P([14.0, 13.2]),
    greyLabels: greyLabels.map(([t, p]) => [t, P(p)])
  };
})();

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

class MapRound {
  constructor(ctx) {
    this.ctx = ctx;
    // Always the easy layout: one country missing, one piece offered, names and flag shown.
    // (The child's level still decides which countries can come up, e.g. Tunisia only at hard.)
    this.level = 'easy';
    this.done = false;
    this.selected = null;
    this.targets = [ctx.item];
    this.offered = [ctx.item];
    this.build();
  }

  get instructionText() {
    const t = this.targets;
    if (t.length > 1) return `Put ${t[0].country} and ${t[1].country} in their places!`;
    return `This is ${t[0].country}. Put ${t[0].country} in its place on the map!`;
  }

  build() {
    const { root } = this.ctx;
    const portrait = Stage.portrait;
    const showNames = this.level !== 'hard';
    const mapW = portrait ? 690 : 800;
    const mapX = portrait ? 15 : 22;
    const mapY = portrait ? 116 : 104;
    const s = mapW / GEO.W;
    const mapH = GEO.H * s;
    this.geom = { mapX, mapY, mapW, mapH, s };

    const wrap = mk('div', 'map-root');
    const holes = new Set(this.targets.map(t => t.id));
    let svg = `<svg class="map-svg" viewBox="0 0 ${GEO.W.toFixed(1)} ${GEO.H.toFixed(1)}" style="left:${mapX}px;top:${mapY}px;width:${mapW}px;height:${mapH}px">`;
    svg += `<rect class="sea" x="0" y="0" width="${GEO.W}" height="${GEO.H}"/>`;
    GEO.neighbours.forEach(d => { svg += `<path class="neighbour" d="${d}"/>`; });
    GEO.islands.forEach(d => { svg += `<path class="neighbour" d="${d}"/>`; });
    for (const id of Object.keys(GEO.countries)) {
      const c = GEO.countries[id];
      if (holes.has(id)) {
        svg += `<path class="hole-glow" data-id="${id}" d="${c.d}"/>`;
        svg += `<path class="hole" data-id="${id}" d="${c.d}"/>`;
      } else {
        svg += `<path class="country" data-id="${id}" d="${c.d}" style="fill:${c.color}"/>`;
      }
    }
    svg += `<path class="nile" d="${GEO.nile}"/>`;
    svg += `<ellipse class="lake" cx="${GEO.lakeChad[0]}" cy="${GEO.lakeChad[1]}" rx="5" ry="4"/>`;
    GEO.greyLabels.forEach(([t, p]) => { svg += `<text class="grey-label" x="${p[0].toFixed(1)}" y="${p[1].toFixed(1)}">${t}</text>`; });
    svg += `<text class="sea-label" x="${GEO.P([18, 34.6])[0]}" y="${GEO.P([18, 34.6])[1]}">Mediterranean Sea</text>`;
    svg += `<text class="sea-label" transform="translate(${GEO.P([38.3, 21.4]).join(' ')}) rotate(62)">Red Sea</text>`;
    for (const id of Object.keys(GEO.countries)) {
      const c = GEO.countries[id];
      const name = (CONTENT.map.find(m => m.id === id) || {}).country || id;
      const isHole = holes.has(id);
      // Easy: all names shown. Normal: hole name hidden. Hard: names hidden.
      const show = showNames && (!isHole || this.level === 'easy');
      svg += `<text class="c-label${id === 'TUN' ? ' small' : ''}${show ? '' : ' hidden'}" data-id="${id}" x="${c.label[0].toFixed(1)}" y="${c.label[1].toFixed(1)}">${name.toUpperCase()}</text>`;
    }
    svg += `<path class="sparkle" id="sparkle-path" d="" pathLength="100"/>`;
    svg += '</svg>';
    wrap.innerHTML = svg;

    // Compass + inset globe
    const deco = mk('div', 'map-deco');
    deco.style.left = mapX + 'px'; deco.style.top = mapY + 'px';
    deco.style.width = mapW + 'px'; deco.style.height = mapH + 'px';
    deco.innerHTML = `
      <svg class="compass" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="44" fill="#fff" stroke="#9db4d6" stroke-width="3"/>
        <polygon points="50,10 60,50 50,45 40,50" fill="#FF6B6B"/><polygon points="50,90 60,50 50,55 40,50" fill="#9db4d6"/>
        <text x="50" y="30" text-anchor="middle" font-size="16" font-weight="800" fill="#3B3355" dy="-4">N</text>
      </svg>
      <svg class="globe" viewBox="0 0 100 100" aria-hidden="true">
        <circle cx="50" cy="50" r="46" fill="#8fd3ff" stroke="#fff" stroke-width="4"/>
        <path d="M30 18 L56 12 L64 20 L58 27 L40 28 Z" fill="#b5e48c"/>
        <path d="M33 31 L62 29 L70 36 L80 40 L74 52 L67 62 L62 75 L55 84 L50 82 L46 67 L42 57 L31 52 L27 42 Z" fill="#b5e48c"/>
        <path d="M70 36 L84 40 L79 49 L72 44 Z" fill="#b5e48c"/>
        <rect x="30" y="29" width="44" height="20" rx="3" fill="rgba(255,107,107,.25)" stroke="#FF6B6B" stroke-width="3"/>
      </svg>`;
    wrap.appendChild(deco);

    // Piece tray
    const tray = mk('div', 'piece-tray');
    if (portrait) Object.assign(tray.style, { left: '20px', top: (mapY + mapH + 24) + 'px', width: '680px', height: (Stage.H - mapY - mapH - 44) + 'px' });
    else Object.assign(tray.style, { left: '846px', top: '104px', width: '414px', height: '596px' });
    wrap.appendChild(tray);
    root.appendChild(wrap);
    this.svg = $('.map-svg', wrap);

    // Pieces
    const tr = Stage.rect(tray);
    const n = this.offered.length;
    const pad = 6;
    this.pieces = this.offered.map((c, i) => {
      const g = GEO.countries[c.id];
      const w = (g.bbox.w + pad * 2) * s, h = (g.bbox.h + pad * 2) * s;
      const el = mk('div', 'piece');
      el.style.width = w + 'px'; el.style.height = h + 'px';
      const showLabel = this.level === 'easy';
      el.innerHTML = `<svg viewBox="${(g.bbox.x - pad).toFixed(1)} ${(g.bbox.y - pad).toFixed(1)} ${(g.bbox.w + pad * 2).toFixed(1)} ${(g.bbox.h + pad * 2).toFixed(1)}" width="100%" height="100%"><path d="${g.d}" style="fill:${g.color}"/></svg>`
        + `<div class="piece-label">${flagSVG(c.id)}${showLabel ? `<span>${c.country.toUpperCase()}</span>` : ''}</div>`;
      // slot in tray
      let slot;
      if (portrait) {
        const sw = tr.w / n;
        slot = { cx: tr.x + sw * (i + 0.5), cy: tr.y + tr.h / 2 - 50, w: sw - 40, h: tr.h - 160 };
      } else {
        const sh = tr.h / n;
        slot = { cx: tr.x + tr.w / 2, cy: tr.y + sh * (i + 0.5) - 50, w: tr.w - 40, h: sh - 150 };
      }
      const restScale = Math.min(1, slot.w / w, slot.h / h);
      const holeC = { x: this.geom.mapX + (g.bbox.x + g.bbox.w / 2) * s, y: this.geom.mapY + (g.bbox.y + g.bbox.h / 2) * s };
      const piece = { c, g, el, w, h, home: { x: slot.cx, y: slot.cy }, restScale, holeC, placed: false, isTarget: this.targets.some(t => t.id === c.id) };
      root.appendChild(el);
      this.setPos(piece, piece.home, restScale, false);
      Drag.attach(el, {
        enabled: () => !this.done && !piece.placed,
        onStart: (start) => {
          this.select(null);
          Sound.sfx('pick');
          Voice.speak(c.country, { rate: 0.95 });
          // keep the grabbed point under the finger while the piece grows to 110 %
          const k = 1.1 / piece.scale;
          piece.grab = { x: (start.x - piece.pos.x) * k, y: (start.y - piece.pos.y) * k };
          el.classList.add('dragging');
          el.style.zIndex = 30;
        },
        onMove: p => this.setPos(piece, { x: p.x - piece.grab.x, y: p.y - piece.grab.y }, 1.1, false),
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

    // Tap-to-place: tap a piece, then tap its hole.
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
    const near = id => {
      const t = this.pieces.find(p => p.c.id === id) || { holeC: holeCenter(id, this.geom) };
      return Math.hypot(piece.pos.x - t.holeC.x, piece.pos.y - t.holeC.y) <= tol;
    };
    if (piece.isTarget && near(piece.c.id)) { this.snap(piece); return; }
    // Wrong piece (or wrong hole) dropped on an open hole: gentle bounce back.
    const openHoles = this.targets.filter(t => !this.pieces.find(p => p.c.id === t.id && p.placed)).map(t => t.id);
    if (openHoles.some(near)) {
      Sound.sfx('boing');
      piece.el.classList.add('wobble');
      setTimeout(() => piece.el.classList.remove('wobble'), 500);
      this.ctx.api.mistake(piece.c.country);
      Voice.speak(`That is ${piece.c.country}.`, { volume: 0.8 });
    } else {
      Sound.sfx('drop');
    }
    this.goHome(piece);
  }

  snap(piece) {
    piece.placed = true;
    this.ctx.api.progress();
    const target = piece.holeC;
    this.setPos(piece, target, 1, true);
    piece.el.classList.add('snapping');
    Sound.sfx('snap');
    setTimeout(() => {
      if (!this.ctx.alive()) return;
      piece.el.remove();
      const id = piece.c.id, c = piece.g;
      $$(`.hole[data-id="${id}"], .hole-glow[data-id="${id}"]`, this.svg).forEach(n => {
        if (n.classList.contains('hole-glow')) n.remove();
        else { n.setAttribute('class', 'country filled'); n.style.fill = c.color; }
      });
      const lab = $(`.c-label[data-id="${id}"]`, this.svg);
      if (lab && this.level !== 'hard') lab.classList.remove('hidden');
      const sp = $('#sparkle-path', this.svg);
      sp.setAttribute('d', c.d);
      sp.classList.remove('run'); void sp.getBoundingClientRect(); sp.classList.add('run');
      Sound.sfx('sparkle');
      if (this.targets.every(t => this.pieces.find(p => p.c.id === t.id && p.placed))) this.finish();
    }, 230);
  }

  async finish() {
    this.done = true;
    // Remove leftover decoys gently
    this.pieces.filter(p => !p.placed).forEach(p => p.el.classList.add('fade'));
    await sleep(500);
    if (!this.ctx.alive()) return;
    const t = this.targets;
    const line = t.length > 1
      ? `${t[0].country} and ${t[1].country}! ${t[0].fact}`
      : `${t[0].country}! ${t[0].fact}`;
    this.ctx.api.win({ title: t.map(x => x.country.toUpperCase()).join(' + '), flags: t.map(x => x.id), line });
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
  const g = GEO.countries[id];
  return { x: geom.mapX + (g.bbox.x + g.bbox.w / 2) * geom.s, y: geom.mapY + (g.bbox.y + g.bbox.h / 2) * geom.s };
}
