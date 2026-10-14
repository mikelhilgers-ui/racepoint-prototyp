/* =====================================================================
   RACEPOINT · 10 · DIE RUNDE — Kartengenerator (THROWAWAY)
   Stilisierte Topo-Karte rund um Schönberg, komplett prozedural:
   - Höhenfeld (Hügel + Value-Noise + Tal der Our)
   - Höhenlinien per Marching Squares, mit Quadratic-Glättung
   - Wald / Moor / See / Fluss / Grenze / Straßen als Andeutung
   - Route + Wegpunkte + Höhenprofil
   Stellt window.RundeMap bereit (nur Daten + SVG-Strings, kein DOM).
   ===================================================================== */
(function () {
  'use strict';

  const TAU = Math.PI * 2;

  /* ---------------- Zufall + Rauschen (deterministisch) ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(1007);
  const NG = 256, grid = new Float32Array(NG * NG);
  for (let i = 0; i < NG * NG; i++) grid[i] = rnd() * 2 - 1;
  const smooth = t => t * t * (3 - 2 * t);
  function vnoise(x, y) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const u = smooth(x - xi), v = smooth(y - yi);
    const g = (i, j) => grid[((j & 255) * NG) + (i & 255)];
    const a = g(xi, yi), b = g(xi + 1, yi), c = g(xi, yi + 1), d = g(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, oct) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < (oct || 4); i++) { s += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
    return s;
  }

  /* ---------------- Pfad-Helfer ---------------- */
  const f1 = n => Math.round(n * 10) / 10;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  // Linienzug ausduennen (Douglas-Peucker): fast gerade Stuecke brauchen keine Zwischenpunkte
  function simplify(p, tol) {
    if (p.length < 4) return p;
    const keep = new Uint8Array(p.length), stack = [[0, p.length - 1]], t2 = tol * tol;
    keep[0] = keep[p.length - 1] = 1;
    while (stack.length) {
      const [a, b] = stack.pop(), ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay, l2 = dx * dx + dy * dy;
      let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) {
        const ex = p[i][0] - ax, ey = p[i][1] - ay, c = ex * dy - ey * dx;
        const d2 = l2 ? c * c / l2 : ex * ex + ey * ey;   // Ring: Anfang = Ende -> Abstand zum Punkt
        if (d2 > best) { best = d2; bi = i; }
      }
      if (best > t2) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
    }
    return p.filter((_, i) => keep[i]);
  }
  // Hoehenlinie als weiche Kurve (Quadratic ueber Mittelpunkte), zerlegt in kurze Teilpfade:
  // gleiche Kurve, nahtlose Uebergaenge – aber der Browser ueberspringt Teile ausserhalb des Bildes
  function contourPieces(p, closed, per) {
    const P = q => f1(q[0]) + ',' + f1(q[1]), segs = [];
    if (closed) {
      let prev = mid(p[p.length - 1], p[0]);
      p.forEach((q, i) => { const m = mid(q, p[(i + 1) % p.length]); segs.push([prev, q, m]); prev = m; });
    } else {
      let prev = p[0];
      for (let i = 1; i < p.length - 1; i++) { const m = mid(p[i], p[i + 1]); segs.push([prev, p[i], m]); prev = m; }
      segs.push([prev, null, p[p.length - 1]]);
    }
    const out = [];
    for (let k = 0; k < segs.length; k += per) {
      out.push('M' + P(segs[k][0]) + segs.slice(k, k + per).map(g => (g[1] ? 'Q' + P(g[1]) + ' ' : 'L') + P(g[2])).join(''));
    }
    return out;
  }
  // weiche geschlossene Form (Wald, Moor, See)
  function smoothClosed(p) {
    const n = p.length, m0 = mid(p[n - 1], p[0]);
    let d = 'M' + f1(m0[0]) + ',' + f1(m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(p[i], p[(i + 1) % n]);
      d += 'Q' + f1(p[i][0]) + ',' + f1(p[i][1]) + ' ' + f1(m[0]) + ',' + f1(m[1]);
    }
    return d + 'Z';
  }
  // Catmull-Rom -> kubische Bezier-Segmente (fuer Route + Fluss)
  function crSegments(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = 1 / 6;
      segs.push([p1,
        [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k],
        [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k],
        p2]);
    }
    return segs;
  }
  function segsToD(segs) {
    if (!segs.length) return '';
    const P = q => f1(q[0]) + ',' + f1(q[1]);
    return 'M' + P(segs[0][0]) + segs.map(s => 'C' + P(s[1]) + ' ' + P(s[2]) + ' ' + P(s[3])).join('');
  }
  function sampleSegs(segs, per) {
    const out = [];
    segs.forEach((s, si) => {
      for (let k = si ? 1 : 0; k <= per; k++) {
        const t = k / per, u = 1 - t;
        out.push([
          u * u * u * s[0][0] + 3 * u * u * t * s[1][0] + 3 * u * t * t * s[2][0] + t * t * t * s[3][0],
          u * u * u * s[0][1] + 3 * u * u * t * s[1][1] + 3 * u * t * t * s[2][1] + t * t * t * s[3][1],
        ]);
      }
    });
    return out;
  }
  function blob(cx, cy, rx, ry, seed, wob, n) {
    n = n || 44; const p = [];
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU;
      const r = 1 + wob * fbm(Math.cos(a) * 1.4 + seed, Math.sin(a) * 1.4 + seed * 1.7, 3) * 2.2;
      p.push([cx + Math.cos(a) * rx * r, cy + Math.sin(a) * ry * r]);
    }
    return p;
  }

  /* ---------------- Welt + Route ---------------- */
  const WORLD = { x0: -700, y0: -900, x1: 2500, y1: 2000 };

  // Route in Weltkoordinaten. Drittes Feld = Wegpunkt-Nummer.
  const ROUTE = [
    [830, 820, 0],                                            // Start · Schoenberg
    [790, 812], [735, 800], [690, 772], [655, 736], [612, 744], [598, 708], [646, 690], [606, 656],
    [560, 640, 1],                                            // Asphalt-Rampen
    [520, 598], [502, 540], [512, 478], [548, 420], [600, 372], [662, 338],
    [720, 312, 2],                                            // Schotter im Hohen Venn
    [800, 292], [880, 298], [948, 326], [1004, 366], [1040, 410], [1088, 420], [1070, 456], [1116, 470], [1100, 506],
    [1150, 520, 3],                                           // Trails in der Eifel
    [1192, 555], [1252, 566], [1214, 604], [1276, 622], [1238, 660],
    [1298, 686, 4],                                           // Der lange Anstieg
    [1304, 738], [1278, 796], [1226, 846], [1152, 876],
    [1088, 884, 5],                                           // Familienstopp am See
    [1022, 884], [962, 872], [902, 852],
    [848, 830, 6],                                            // Ziel
  ];
  const ROUTE_PTS = ROUTE.map(p => [p[0], p[1]]);
  const WP_IDX = []; ROUTE.forEach((p, i) => { if (p[2] != null) WP_IDX[p[2]] = i; });
  const WP_KM = [0, 9, 21, 33, 42, 51, 58];
  const ROUTE_SEGS = crSegments(ROUTE_PTS);
  const routeD = segsToD(ROUTE_SEGS);
  // Teilpfad bis Wegpunkt k (exakt dieselben Kurven -> Laengen fuer DrawSVG/MotionPath)
  const routePrefixD = k => segsToD(ROUTE_SEGS.slice(0, WP_IDX[k]));

  const RIVER_PTS = [[1010, -900], [995, -400], [980, -100], [960, 200], [935, 420], [885, 610], [852, 760], [868, 900], [820, 1100], [770, 1400], [745, 1700], [760, 2000]];
  const RIVER_SEGS = crSegments(RIVER_PTS);
  const RIVER_SAMPLES = sampleSegs(RIVER_SEGS, 10);
  const BORDER_PTS = [[1085, -900], [1060, -400], [1040, -100], [990, 250], [1062, 560], [982, 700], [1080, 1000], [1010, 1400], [1060, 2000]];

  function distToPolyline(x, y, pts) {
    let best = 1e9;
    for (let i = 0; i < pts.length - 1; i++) {
      const ax = pts[i][0], ay = pts[i][1], bx = pts[i + 1][0], by = pts[i + 1][1];
      const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
      let t = l2 ? ((x - ax) * dx + (y - ay) * dy) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const ex = ax + dx * t - x, ey = ay + dy * t - y, d2 = ex * ex + ey * ey;
      if (d2 < best) best = d2;
    }
    return Math.sqrt(best);
  }

  /* ---------------- Hoehenfeld ---------------- */
  // [cx, cy, sx, sy, Hoehe]
  const HILLS = [
    [650, 230, 380, 210, 235],    // Hohes Venn (Plateau)
    [1180, 420, 210, 260, 165],   // Eifel-Ruecken
    [1340, 650, 150, 150, 205],   // der lange Anstieg
    [560, 1060, 280, 200, 120],
    [260, 600, 230, 320, 150],
    [1700, 300, 300, 260, 140],
    [1650, 1150, 300, 260, 120],
    [200, -250, 300, 240, 170],
    [1040, 950, 120, 90, -70],    // Senke am See
  ];
  function height(x, y) {
    let h = 380;
    for (let i = 0; i < HILLS.length; i++) {
      const c = HILLS[i], dx = (x - c[0]) / c[2], dy = (y - c[1]) / c[3];
      h += c[4] * Math.exp(-(dx * dx + dy * dy) / 2);
    }
    h += fbm(x / 430 + 3.1, y / 430 + 7.7, 4) * 120 + fbm(x / 130 + 31, y / 130 + 17, 3) * 16;
    const dr = distToPolyline(x, y, RIVER_SAMPLES);
    h -= 90 * Math.exp(-(dr * dr) / (2 * 75 * 75));
    return h;
  }

  /* ---------------- Marching Squares ---------------- */
  function contourLevel(field, cols, rows, x0, y0, step, level) {
    const pts = new Map(), segs = [];
    const P = (key, ax, ay, av, bx, by, bv) => {
      if (!pts.has(key)) { const t = (level - av) / (bv - av); pts.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]); }
      return key;
    };
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
        const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = x0 + i * step, y = y0 + j * step, cell = j * cols + i;
        const T = () => P(cell * 2, x, y, a, x + step, y, b);
        const R = () => P((cell + 1) * 2 + 1, x + step, y, b, x + step, y + step, c);
        const B = () => P((cell + cols) * 2, x, y + step, d, x + step, y + step, c);
        const L = () => P(cell * 2 + 1, x, y, a, x, y + step, d);
        switch (idx) {
          case 1: case 14: segs.push([L(), B()]); break;
          case 2: case 13: segs.push([B(), R()]); break;
          case 3: case 12: segs.push([L(), R()]); break;
          case 4: case 11: segs.push([T(), R()]); break;
          case 6: case 9: segs.push([T(), B()]); break;
          case 7: case 8: segs.push([L(), T()]); break;
          default: { // Sattel (5, 10)
            const hi = (a + b + c + d) / 4 > level;
            if ((idx === 5) === hi) { segs.push([L(), T()]); segs.push([B(), R()]); }
            else { segs.push([T(), R()]); segs.push([L(), B()]); }
          }
        }
      }
    }
    // Segmente zu Linienzuegen verketten
    const adj = new Map();
    segs.forEach((s, k) => s.forEach(e => { let l = adj.get(e); if (!l) adj.set(e, l = []); l.push(k); }));
    const used = new Uint8Array(segs.length), chains = [];
    const grow = chain => {
      for (;;) {
        const end = chain[chain.length - 1], list = adj.get(end);
        let nx = -1;
        for (let q = 0; q < list.length; q++) if (!used[list[q]]) { nx = list[q]; break; }
        if (nx < 0) return false;
        used[nx] = 1;
        const s = segs[nx], e = s[0] === end ? s[1] : s[0];
        if (e === chain[0]) return true;
        chain.push(e);
      }
    };
    for (let k = 0; k < segs.length; k++) {
      if (used[k]) continue;
      used[k] = 1;
      const chain = [segs[k][0], segs[k][1]];
      let closed = grow(chain);
      if (!closed) { chain.reverse(); closed = grow(chain); }
      if (chain.length < 5) continue;
      chains.push({ closed, p: chain.map(key => pts.get(key)) });
    }
    return chains;
  }

  let cache = null;
  function buildContours() {
    if (cache) return cache;
    const step = 18;
    const cols = Math.ceil((WORLD.x1 - WORLD.x0) / step) + 1, rows = Math.ceil((WORLD.y1 - WORLD.y0) / step) + 1;
    const field = new Float32Array(cols * rows);
    let lo = 1e9, hi = -1e9;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = height(WORLD.x0 + i * step, WORLD.y0 + j * step);
      field[j * cols + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const levels = [];
    for (let lv = Math.ceil(lo / 20) * 20; lv < hi; lv += 20) {
      const chains = contourLevel(field, cols, rows, WORLD.x0, WORLD.y0, step, lv);
      const pieces = [];
      chains.forEach(c => {
        // geschlossene Ringe: Startpunkt doppelt, damit die Vereinfachung den Ring nicht oeffnet
        const q = simplify(c.closed ? c.p.concat([c.p[0]]) : c.p, 1);
        pieces.push.apply(pieces, contourPieces(c.closed ? q.slice(0, -1) : q, c.closed, 14));
      });
      if (pieces.length) levels.push({ level: lv, index: lv % 100 === 0, pieces });
    }
    cache = { levels, lo, hi };
    return cache;
  }

  /* ---------------- Hoehenprofil (km -> m) ---------------- */
  const PROFILE_KEYS = [[0, 395], [3, 430], [6, 505], [9, 560], [12, 585], [15, 622], [18, 652], [21, 664], [24, 655], [27, 628],
    [30, 572], [32, 540], [33, 522], [34, 562], [35, 588], [36, 545], [37, 502], [38, 522], [39, 458], [41, 520], [42, 575], [44, 640],
    [46, 688], [48, 612], [50, 522], [51, 470], [53, 455], [55, 432], [58, 395]];
  // monotone kubische Interpolation (Fritsch-Carlson)
  const PX = PROFILE_KEYS.map(k => k[0]), PY = PROFILE_KEYS.map(k => k[1]);
  const PM = (() => {
    const n = PX.length, dl = [], m = new Array(n);
    for (let i = 0; i < n - 1; i++) dl.push((PY[i + 1] - PY[i]) / (PX[i + 1] - PX[i]));
    m[0] = dl[0]; m[n - 1] = dl[n - 2];
    for (let i = 1; i < n - 1; i++) m[i] = dl[i - 1] * dl[i] <= 0 ? 0 : 3 * (PX[i + 1] - PX[i - 1]) / ((2 * PX[i + 1] - PX[i] - PX[i - 1]) / dl[i - 1] + (PX[i + 1] + PX[i] - 2 * PX[i - 1]) / dl[i]);
    return m;
  })();
  function elev(km) {
    km = Math.max(0, Math.min(58, km));
    let i = 0; while (i < PX.length - 2 && km > PX[i + 1]) i++;
    const h = PX[i + 1] - PX[i], t = (km - PX[i]) / h, t2 = t * t, t3 = t2 * t;
    const base = (2 * t3 - 3 * t2 + 1) * PY[i] + (t3 - 2 * t2 + t) * h * PM[i] + (-2 * t3 + 3 * t2) * PY[i + 1] + (t3 - t2) * h * PM[i + 1];
    return base + 5 * Math.sin(km * 2.1) + 3 * Math.sin(km * 5.3 + 1);   // kleine Wellen = echte Strasse
  }
  const GAIN = (() => {
    const out = new Float32Array(581); let g = 0, prev = elev(0);
    for (let i = 1; i <= 580; i++) { const e = elev(i / 10); if (e > prev) g += e - prev; prev = e; out[i] = g; }
    return out;
  })();
  const gainAt = km => GAIN[Math.max(0, Math.min(580, Math.round(km * 10)))];

  /* ---------------- SVG-Ebenen (Weltkoordinaten) ---------------- */
  function layersSVG() {
    const c = buildContours();
    let s = '';
    // Defs: Wald- und Moor-Signatur, weiche Huegel-Toenung
    s += '<defs>' +
      '<pattern id="pForest" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.3" class="m-tree"/><circle cx="12" cy="11" r="2.3" class="m-tree"/></pattern>' +
      '<pattern id="pMarsh" width="26" height="16" patternUnits="userSpaceOnUse"><path d="M3 10h12M7 10V6M9 10V5M11 10V6" class="m-marsh"/></pattern>' +
      '<radialGradient id="gHill"><stop offset="0" stop-color="#e2d9c8" stop-opacity=".9"/><stop offset="1" stop-color="#e2d9c8" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    // Huegel-Toenung
    s += '<g class="m-tint">' + HILLS.filter(h => h[4] > 0).map(h =>
      '<ellipse cx="' + h[0] + '" cy="' + h[1] + '" rx="' + h[2] * 1.5 + '" ry="' + h[3] * 1.5 + '" fill="url(#gHill)"/>').join('') + '</g>';
    // Gitter (Kartenraster)
    let gd = '';
    for (let x = -500; x <= 2400; x += 250) gd += 'M' + x + ',' + WORLD.y0 + 'V' + WORLD.y1;
    for (let y = -750; y <= 1900; y += 250) gd += 'M' + WORLD.x0 + ',' + y + 'H' + WORLD.x1;
    s += '<path class="m-grid" d="' + gd + '"/>';
    // Wald + Moor
    const FOREST = [[1120, 470, 175, 120, 1], [1270, 380, 140, 110, 2], [1010, 575, 90, 70, 3], [700, 1000, 170, 90, 4], [370, 790, 130, 170, 5],
      [1010, 140, 130, 80, 6], [1480, 820, 160, 120, 7], [260, 260, 160, 110, 8], [1560, 120, 140, 160, 9], [560, 1300, 220, 120, 10]];
    s += '<g class="m-forest">' + FOREST.map(f => '<path d="' + smoothClosed(blob(f[0], f[1], f[2], f[3], f[4] * 3.7, 0.22)) + '"/>').join('') + '</g>';
    const MARSH = [[700, 255, 230, 105, 11], [500, 205, 120, 70, 12], [880, 210, 90, 55, 13]];
    s += '<g class="m-moor">' + MARSH.map(f => '<path d="' + smoothClosed(blob(f[0], f[1], f[2], f[3], f[4] * 2.3, 0.18)) + '"/>').join('') + '</g>';
    // Hoehenlinien
    s += '<g class="m-topo">' + c.levels.map(l => '<g' + (l.index ? ' class="ix"' : '') + '>' + l.pieces.map(d => '<path d="' + d + '"/>').join('') + '</g>').join('') + '</g>';
    // Fluss (Our) + Nebenbaeche
    s += '<path class="m-river" d="' + segsToD(RIVER_SEGS) + '"/>';
    const BROOKS = [[[600, 1180], [700, 1050], [800, 1000], [858, 930]], [[1300, 980], [1180, 1000], [1090, 975]], [[400, 420], [560, 520], [700, 560], [860, 640]]];
    s += BROOKS.map(b => '<path class="m-brook" d="' + segsToD(crSegments(b)) + '"/>').join('');
    // See mit Uferlinien
    const lake = blob(1040, 950, 82, 46, 21, 0.16, 48);
    const scaleBlob = (p, k) => p.map(q => [1040 + (q[0] - 1040) * k, 950 + (q[1] - 950) * k]);
    s += '<g class="m-lake"><path class="w" d="' + smoothClosed(lake) + '"/>' +
      '<path class="l" d="' + smoothClosed(scaleBlob(lake, 0.72)) + '"/><path class="l" d="' + smoothClosed(scaleBlob(lake, 0.44)) + '"/></g>';
    // Strassen
    const ROADS = [
      [[830, 820], [700, 880], [520, 905], [300, 950], [-200, 990], [-700, 1010]],
      [[830, 820], [870, 960], [900, 1150], [880, 1500], [900, 2000]],
      [[830, 820], [1000, 770], [1180, 760], [1420, 820], [1800, 790], [2500, 820]],
      [[560, 640], [420, 520], [160, 330], [-300, 180], [-700, 100]],
      [[720, 312], [700, 120], [740, -300], [720, -900]],
      [[1150, 520], [1400, 470], [1800, 520], [2500, 480]],
    ];
    s += '<g class="m-roads">' + ROADS.map(r => '<path d="' + segsToD(crSegments(r)) + '"/>').join('') + '</g>';
    // Landesgrenze BE | DE
    s += '<path class="m-border" d="' + segsToD(crSegments(BORDER_PTS)) + '"/>';
    // Doerfer (kleine Haus-Rechtecke)
    const VILLAGES = [[842, 846, 16, 46], [505, 905, 7, 30], [1190, 768, 8, 30], [1420, 822, 7, 26], [430, 530, 6, 26], [880, 1150, 7, 28]];
    let hs = '';
    VILLAGES.forEach((v, vi) => {
      const r = mulberry32(50 + vi);
      for (let k = 0; k < v[2]; k++) {
        const a = r() * TAU, d = Math.sqrt(r()) * v[3], w = 6 + r() * 6, h = 5 + r() * 5;
        const x = v[0] + Math.cos(a) * d, y = v[1] + Math.sin(a) * d * 0.7;
        hs += '<rect x="' + f1(x - w / 2) + '" y="' + f1(y - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" transform="rotate(' + Math.round(r() * 60 - 30) + ' ' + f1(x) + ' ' + f1(y) + ')"/>';
      }
    });
    s += '<g class="m-houses">' + hs + '</g>';
    // Gipfel-Dreieck
    s += '<path class="m-peak" d="M470,108l9,-16l9,16z"/>';
    return s;
  }

  // Ortsnamen / Regionen (werden im Bildschirm-Massstab gezeichnet)
  const LABELS = [
    { k: 'venn', x: 560, y: 175, cls: 'region' },
    { k: 'eifel', x: 1300, y: 470, cls: 'region' },
    { k: 'our', x: 908, y: 505, cls: 'water', rot: -68 },
    { k: 'botrange', x: 498, y: 104, cls: 'poi', anchor: 'start' },
    { k: 'be', x: 905, y: 40, cls: 'border', rot: -80 },
    { k: 'de', x: 1100, y: 70, cls: 'border', rot: -80 },
    { k: 'town', x: 846, y: 900, cls: 'town' },
  ];
  const LABEL_TEXT = {
    venn: { de: 'Hohes Venn', fr: 'Hautes Fagnes', nl: 'Hoge Venen', en: 'High Fens' },
    eifel: { de: 'Eifel', fr: 'Eifel', nl: 'Eifel', en: 'Eifel' },
    our: { de: 'Our', fr: 'Our', nl: 'Our', en: 'Our' },
    botrange: { de: 'Signal de Botrange · 694 m', fr: 'Signal de Botrange · 694 m', nl: 'Signal de Botrange · 694 m', en: 'Signal de Botrange · 694 m' },
    be: { de: 'Belgien', fr: 'Belgique', nl: 'België', en: 'Belgium' },
    de: { de: 'Deutschland', fr: 'Allemagne', nl: 'Duitsland', en: 'Germany' },
    town: { de: 'Schönberg', fr: 'Schönberg', nl: 'Schönberg', en: 'Schönberg' },
  };

  window.RundeMap = {
    WORLD, ROUTE_PTS, WP_IDX, WP_KM, routeD, routePrefixD, LABELS, LABEL_TEXT,
    layersSVG, elev, gainAt, height,
    wpPoint: k => ROUTE_PTS[WP_IDX[k]],
    totalKm: 58,
  };
})();
