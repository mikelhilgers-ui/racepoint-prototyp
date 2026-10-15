/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE — Touren: GPX, Gelaende, stilisierte Karte (THROWAWAY)
   Adaptiert aus assets/v10/map.js (Rauschen, Marching Squares, Wald, Moor,
   Wasser, Doerfer) – hier aber mit echten Koordinaten:
   - Projektion lat/lon -> Kartenkoordinaten (1 km = 40 Einheiten, Mitte = Laden)
   - Gelaendemodell (Hoehenanker der Orte + Taeler + Rauschen) nur fuer die
     Optik der Karte. Distanz, Hoehenmeter und Profil kommen IMMER aus der GPX.
   - parseGPX (DOMParser, trkpt lat/lon/ele) und stats (Haversine, Anstieg
     mit kleiner Schwelle, min/max)
   Stellt window.RP18Touren bereit (kein DOM ausser DOMParser in parseGPX).
   ===================================================================== */
(function (root) {
  'use strict';

  const TAU = Math.PI * 2;
  const SHOP = { lat: 50.2870, lon: 6.2690 };
  const U = 40;                                             // Karteneinheiten pro km
  const KX = 111.320 * Math.cos(SHOP.lat * Math.PI / 180), KY = 110.574;
  const proj = (lat, lon) => [(lon - SHOP.lon) * KX * U, -(lat - SHOP.lat) * KY * U];
  const unproj = (x, y) => [SHOP.lat - y / (KY * U), SHOP.lon + x / (KX * U)];

  /* ---------------- GPX lesen + auswerten ---------------- */
  const R_EARTH = 6371.0088;
  function haversine(a, b) {
    const r = Math.PI / 180, dLat = (b.lat - a.lat) * r, dLon = (b.lon - a.lon) * r;
    const s = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
    return 2 * R_EARTH * Math.asin(Math.min(1, Math.sqrt(s)));
  }
  function parseGPX(text) {
    const doc = new DOMParser().parseFromString(text, 'application/xml');
    if (doc.getElementsByTagName('parsererror').length) throw new Error('GPX-Datei ist kein gültiges XML');
    const first = (el, n) => { const x = el && el.getElementsByTagNameNS('*', n)[0]; return x ? x.textContent.trim() : ''; };
    let nodes = Array.from(doc.getElementsByTagNameNS('*', 'trkpt'));
    if (!nodes.length) nodes = Array.from(doc.getElementsByTagNameNS('*', 'rtept'));
    const pts = [];
    nodes.forEach(n => {
      const lat = parseFloat(n.getAttribute('lat')), lon = parseFloat(n.getAttribute('lon'));
      if (!isFinite(lat) || !isFinite(lon)) return;
      const e = n.getElementsByTagNameNS('*', 'ele')[0];
      pts.push({ lat, lon, ele: e ? parseFloat(e.textContent) : NaN });
    });
    if (pts.length < 2) throw new Error('GPX-Datei enthält keine Trackpunkte');
    const meta = doc.getElementsByTagNameNS('*', 'metadata')[0], trk = doc.getElementsByTagNameNS('*', 'trk')[0];
    return { name: first(meta, 'name') || first(trk, 'name'), desc: first(meta, 'desc') || first(trk, 'desc'), pts };
  }
  // Distanz (Haversine), Anstieg mit kleiner Glaettung (gleitender Mittelwert ueber 3 Punkte)
  // und Schwelle (Hysterese 3 m), min/max. cum[i] = km bis Punkt i, gain[i] = Hm bis Punkt i.
  const ASCENT_THRESHOLD = 3;
  function stats(pts) {
    const n = pts.length, cum = new Float64Array(n), gain = new Float64Array(n);
    for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + haversine(pts[i - 1], pts[i]);
    const hasEle = pts.some(p => isFinite(p.ele));
    let up = 0, down = 0, min = Infinity, max = -Infinity, minI = 0, maxI = 0;
    const ele = new Float64Array(n);
    if (hasEle) {
      // fehlende Hoehen auffuellen
      let last = pts.find(p => isFinite(p.ele)).ele;
      for (let i = 0; i < n; i++) { if (isFinite(pts[i].ele)) last = pts[i].ele; ele[i] = last; }
      const sm = new Float64Array(n);
      for (let i = 0; i < n; i++) { const a = Math.max(0, i - 1), b = Math.min(n - 1, i + 1); let s = 0; for (let j = a; j <= b; j++) s += ele[j]; sm[i] = s / (b - a + 1); }
      let ref = sm[0];
      for (let i = 0; i < n; i++) {
        const d = sm[i] - ref;
        if (d >= ASCENT_THRESHOLD) { up += d; ref = sm[i]; } else if (d <= -ASCENT_THRESHOLD) { down -= d; ref = sm[i]; }
        gain[i] = up;
        if (ele[i] < min) { min = ele[i]; minI = i; }
        if (ele[i] > max) { max = ele[i]; maxI = i; }
      }
    }
    return { km: cum[n - 1], up, down, min: hasEle ? min : NaN, max: hasEle ? max : NaN, minI, maxI, hasEle, cum, gain, ele };
  }
  // Index des Trackpunkts, der einer Koordinate am naechsten liegt
  function nearestIndex(pts, lat, lon) {
    let best = Infinity, bi = 0;
    const c = Math.cos(lat * Math.PI / 180);
    for (let i = 0; i < pts.length; i++) {
      const dy = pts[i].lat - lat, dx = (pts[i].lon - lon) * c, d = dx * dx + dy * dy;
      if (d < best) { best = d; bi = i; }
    }
    return bi;
  }
  // Wert eines Arrays bei Kilometer km (lineare Interpolation ueber cum)
  function indexAtKm(cum, km) {
    let lo = 0, hi = cum.length - 1;
    if (km <= 0) return 0;
    if (km >= cum[hi]) return hi;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (cum[m] <= km) lo = m; else hi = m; }
    return lo + (km - cum[lo]) / ((cum[hi] - cum[lo]) || 1);
  }
  const lerpArr = (arr, fi) => { const i = Math.floor(fi), t = fi - i; return i >= arr.length - 1 ? arr[arr.length - 1] : arr[i] + (arr[i + 1] - arr[i]) * t; };

  /* ---------------- Zufall + Rauschen (deterministisch, wie V10) ---------------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(1707);
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
  const hash2 = (i, j) => { const r = mulberry32((i * 73856093) ^ (j * 19349663) ^ 0x5bd1e995); r(); return r; };

  /* ---------------- Pfad-Helfer (aus V10) ---------------- */
  const f1 = n => Math.round(n * 10) / 10;
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  function simplify(p, tol) {
    if (p.length < 4) return p;
    const keep = new Uint8Array(p.length), stack = [[0, p.length - 1]], t2 = tol * tol;
    keep[0] = keep[p.length - 1] = 1;
    while (stack.length) {
      const [a, b] = stack.pop(), ax = p[a][0], ay = p[a][1], dx = p[b][0] - ax, dy = p[b][1] - ay, l2 = dx * dx + dy * dy;
      let best = -1, bi = -1;
      for (let i = a + 1; i < b; i++) {
        const ex = p[i][0] - ax, ey = p[i][1] - ay, c = ex * dy - ey * dx;
        const d2 = l2 ? c * c / l2 : ex * ex + ey * ey;
        if (d2 > best) { best = d2; bi = i; }
      }
      if (best > t2) { keep[bi] = 1; stack.push([a, bi], [bi, b]); }
    }
    return p.filter((_, i) => keep[i]);
  }
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
  function smoothClosed(p) {
    const n = p.length, m0 = mid(p[n - 1], p[0]);
    let d = 'M' + f1(m0[0]) + ',' + f1(m0[1]);
    for (let i = 0; i < n; i++) {
      const m = mid(p[i], p[(i + 1) % n]);
      d += 'Q' + f1(p[i][0]) + ',' + f1(p[i][1]) + ' ' + f1(m[0]) + ',' + f1(m[1]);
    }
    return d + 'Z';
  }
  function crSegments(pts) {
    const segs = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2, k = 1 / 6;
      segs.push([p1, [p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k], [p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k], p2]);
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
  function blob(cx, cy, rx, ry, seed, wob, n, rot) {
    n = n || 44; const p = [], cr = Math.cos(rot || 0), sr = Math.sin(rot || 0);
    for (let k = 0; k < n; k++) {
      const a = k / n * TAU;
      const r = 1 + wob * fbm(Math.cos(a) * 1.4 + seed, Math.sin(a) * 1.4 + seed * 1.7, 3) * 2.2;
      const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r;
      p.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return p;
  }
  function distToPolyline(x, y, pts) {
    let best = 1e18;
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
  const P = ll => proj(ll[0], ll[1]);

  /* ---------------- Geografie (vereinfacht, Lage ungefaehr) ---------------- */
  // Orte: [Name, lat, lon, Hoehe m, Groesse (Haeuser), Rang fuer Beschriftung 1 = immer]
  const TOWNS = [
    ['Schönberg', 50.2870, 6.2690, 420, 18, 1], ['St. Vith', 50.2800, 6.1270, 480, 46, 1], ['Andler', 50.3000, 6.3100, 440, 9, 2],
    ['Manderfeld', 50.3300, 6.3400, 560, 12, 2], ['Losheimergraben', 50.3900, 6.2900, 675, 6, 2], ['Büllingen', 50.4100, 6.2500, 615, 24, 1],
    ['Honsfeld', 50.3700, 6.2700, 590, 9, 3], ['Bütgenbach', 50.4300, 6.2000, 565, 24, 1], ['Elsenborn', 50.4620, 6.2200, 600, 14, 2],
    ['Robertville', 50.4500, 6.1200, 560, 16, 1], ['Sourbrodt', 50.4800, 6.1050, 615, 12, 3], ['Weismes', 50.4150, 6.1100, 500, 24, 2],
    ['Amel', 50.3530, 6.1710, 430, 16, 2], ['Meyerode', 50.3300, 6.2000, 560, 9, 3], ['Thommen', 50.2300, 6.0800, 520, 9, 3],
    ['Burg-Reuland', 50.1980, 6.1390, 370, 14, 1], ['Ouren', 50.1400, 6.1300, 300, 7, 1], ['Lützkampen', 50.1550, 6.1900, 510, 9, 3],
    ['Winterspelt', 50.2170, 6.2230, 520, 11, 2], ['Bleialf', 50.2350, 6.2900, 490, 18, 1], ['Prüm', 50.2070, 6.4240, 440, 46, 1],
    ['Steinebrück', 50.2650, 6.1950, 385, 6, 3], ['Steffeshausen', 50.2150, 6.1680, 360, 5, 3], ['Losheim', 50.3800, 6.3350, 640, 9, 3],
    ['Auw', 50.2600, 6.3350, 560, 9, 3], ['Roth', 50.3100, 6.3700, 600, 7, 3], ['Malmedy', 50.4260, 6.0280, 340, 46, 1],
    ['Ligneuville', 50.3800, 6.0650, 410, 9, 3], ['Recht', 50.3350, 6.0450, 530, 12, 2], ['Galhausen', 50.2550, 6.1550, 470, 6, 3],
    ['Großkampenberg', 50.1750, 6.2100, 520, 6, 3], ['Brandscheid', 50.2280, 6.3550, 600, 6, 3],
  ];
  // zusaetzliche Hoehenanker (Hochflaechen, Gipfel) [lat, lon, m]
  const EXTRA = [
    [50.5010, 6.0930, 694], [50.2500, 6.3600, 697], [50.2850, 6.4100, 640], [50.2250, 6.3350, 575], [50.2700, 6.3850, 660],
    [50.36, 6.06, 540], [50.30, 6.05, 520], [50.20, 6.03, 480], [50.12, 6.05, 450], [50.10, 6.22, 470], [50.15, 6.30, 500],
    [50.17, 6.38, 520], [50.25, 6.48, 520], [50.33, 6.45, 580], [50.42, 6.37, 620], [50.47, 6.30, 610], [50.52, 6.18, 640],
    [50.55, 6.10, 650], [50.53, 6.00, 520], [50.38, 6.14, 520], [50.32, 6.25, 525], [50.25, 6.24, 500],
    [50.18, 6.08, 480], [50.31, 6.10, 500], [50.40, 6.21, 590], [50.49, 6.17, 630],
  ];
  // Fluesse/Baeche [lat, lon] von der Quelle abwaerts, w = halbe Talbreite (km), d = Taltiefe (m)
  const RIVERS = [
    { id: 'our', w: 0.55, d: 72, main: true, pts: [[50.385, 6.360], [50.355, 6.345], [50.325, 6.330], [50.305, 6.312], [50.296, 6.290], [50.2885, 6.2705], [50.280, 6.245], [50.272, 6.215], [50.263, 6.193], [50.245, 6.180], [50.225, 6.170], [50.205, 6.162], [50.185, 6.151], [50.164, 6.143], [50.142, 6.134], [50.120, 6.139], [50.090, 6.146], [50.060, 6.150]] },
    { id: 'ulf', w: 0.4, d: 45, pts: [[50.250, 6.065], [50.228, 6.098], [50.208, 6.124], [50.198, 6.139], [50.190, 6.152]] },
    { id: 'braunlauf', w: 0.35, d: 30, pts: [[50.300, 6.095], [50.286, 6.128], [50.272, 6.162], [50.263, 6.193]] },
    { id: 'amel', w: 0.45, d: 45, pts: [[50.378, 6.288], [50.370, 6.258], [50.360, 6.220], [50.353, 6.171], [50.350, 6.130], [50.362, 6.090], [50.385, 6.050], [50.405, 6.010]] },
    { id: 'warche', w: 0.42, d: 38, pts: [[50.425, 6.275], [50.428, 6.240], [50.424, 6.205], [50.434, 6.170], [50.447, 6.128], [50.441, 6.090], [50.430, 6.050], [50.420, 6.010]] },
    { id: 'pruem', w: 0.45, d: 50, pts: [[50.300, 6.470], [50.262, 6.452], [50.235, 6.430], [50.207, 6.424], [50.170, 6.430], [50.130, 6.440], [50.090, 6.450]] },
    { id: 'alf', w: 0.32, d: 28, pts: [[50.262, 6.330], [50.248, 6.308], [50.235, 6.290], [50.215, 6.262], [50.195, 6.235], [50.178, 6.200], [50.168, 6.160], [50.164, 6.143]] },
  ];
  // Fluesse maeandern (deterministisch): Spline abtasten und seitlich versetzen
  RIVERS.forEach((r, ri) => {
    const base = sampleSegs(crSegments(r.pts.map(P)), 10);
    let acc = 0;
    r.s = base.map((q, i) => {
      if (i) acc += Math.hypot(q[0] - base[i - 1][0], q[1] - base[i - 1][1]) / U;
      const a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)];
      const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1;
      const fade = Math.min(1, i / 6, (base.length - 1 - i) / 6);
      const o = (fbm(acc / 1.5 + ri * 7.1, ri * 3.3, 3) * 0.55 + fbm(acc / 0.45 + ri * 2.9, 5.5, 2) * 0.16) * r.w * 1.6 * U * fade;
      return [q[0] - dy / l * o, q[1] + dx / l * o];
    });
    const xs = r.s.map(q => q[0]), ys = r.s.map(q => q[1]), m = r.w * U * 3.2;
    r.bb = [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m];
  });
  // Seen: [lat, lon, Laenge km, Breite km, Drehung Grad, Name]
  const LAKES = [[50.4245, 6.2040, 2.3, 0.55, -6, 'Bütgenbacher See'], [50.4465, 6.1220, 1.7, 0.45, 28, 'Robertviller See']];
  // Grenzen
  const BORDER_BE_DE = [[50.600, 6.180], [50.560, 6.205], [50.520, 6.215], [50.490, 6.250], [50.450, 6.280], [50.415, 6.292], [50.390, 6.292], [50.376, 6.330], [50.356, 6.360], [50.336, 6.392], [50.312, 6.386], [50.292, 6.348], [50.276, 6.312], [50.260, 6.287], [50.245, 6.256], [50.228, 6.220], [50.212, 6.190], [50.205, 6.163], [50.185, 6.152], [50.164, 6.144], [50.142, 6.134]];
  const BORDER_LU = [[50.142, 6.134], [50.150, 6.095], [50.168, 6.050], [50.190, 6.020], [50.210, 5.990]];
  const BORDER_DE_LU = [[50.142, 6.134], [50.120, 6.139], [50.090, 6.146], [50.060, 6.150], [50.020, 6.160]];
  // Wald (feste Flaechen) [lat, lon, rx km, ry km, Drehung Grad]
  const FORESTS = [
    [50.262, 6.382, 4.4, 1.5, -48], [50.402, 6.330, 2.4, 1.6, 10], [50.488, 6.060, 2.6, 1.5, 15], [50.535, 6.090, 3.6, 1.8, -10],
    [50.192, 6.098, 1.9, 1.2, 30], [50.244, 6.198, 1.1, 0.7, -60], [50.318, 6.212, 1.4, 0.9, 20], [50.218, 6.318, 1.5, 0.9, -30],
    [50.300, 6.165, 1.3, 0.8, 50], [50.160, 6.110, 1.6, 0.8, -70], [50.365, 6.120, 1.5, 0.9, 0], [50.455, 6.255, 1.6, 1.0, 40],
    [50.225, 6.455, 1.6, 1.0, -20], [50.300, 6.430, 1.8, 1.0, -40], [50.340, 6.280, 1.0, 0.6, 15],
  ];
  // Moor im Hohen Venn
  const MOORS = [[50.505, 6.115, 2.4, 0.9, 10], [50.522, 6.065, 1.8, 0.8, -15], [50.488, 6.128, 1.2, 0.5, 30]];
  // Strassen (Orte verbinden, nur Andeutung)
  const ROADS = [
    [[50.287, 6.269], [50.283, 6.230], [50.280, 6.180], [50.280, 6.127], [50.300, 6.050], [50.330, 5.990]],
    [[50.287, 6.269], [50.300, 6.310], [50.330, 6.340], [50.380, 6.335], [50.420, 6.380]],
    [[50.287, 6.269], [50.262, 6.285], [50.235, 6.290], [50.218, 6.360], [50.207, 6.424], [50.180, 6.500]],
    [[50.280, 6.127], [50.330, 6.150], [50.353, 6.171], [50.380, 6.215], [50.410, 6.250], [50.430, 6.200], [50.450, 6.120], [50.501, 6.093], [50.560, 6.080]],
    [[50.410, 6.250], [50.390, 6.290], [50.380, 6.335]],
    [[50.280, 6.127], [50.240, 6.130], [50.198, 6.139], [50.165, 6.130], [50.140, 6.130], [50.100, 6.100]],
    [[50.280, 6.127], [50.230, 6.080], [50.200, 6.020]],
    [[50.415, 6.110], [50.426, 6.028], [50.380, 6.065], [50.335, 6.045], [50.300, 6.090], [50.280, 6.127]],
    [[50.430, 6.200], [50.462, 6.220], [50.500, 6.240]],
    [[50.235, 6.290], [50.217, 6.223], [50.190, 6.160], [50.155, 6.190], [50.120, 6.230]],
    [[50.207, 6.424], [50.250, 6.440], [50.300, 6.440], [50.330, 6.460]],
    [[50.300, 6.310], [50.330, 6.200], [50.353, 6.171]],
  ];
  // Motorway E42/A27 (St. Vith – Malmedy)
  const MOTORWAY = [[50.180, 6.105], [50.240, 6.110], [50.285, 6.100], [50.330, 6.105], [50.380, 6.100], [50.420, 6.060], [50.440, 6.000]];
  // Beschriftungen (Bildschirmgroesse): k = Klasse
  const LABELS = [
    { t: 'Hohes Venn', lat: 50.515, lon: 6.120, k: 'region' }, { t: 'Schneifel', lat: 50.262, lon: 6.392, k: 'region', rot: -46 },
    { t: 'Eifel', lat: 50.330, lon: 6.470, k: 'region' }, { t: 'Ardennen', lat: 50.330, lon: 6.050, k: 'region' },
    { t: 'Our', lat: 50.238, lon: 6.183, k: 'water', rot: -66 }, { t: 'Our', lat: 50.330, lon: 6.322, k: 'water', rot: -58 },
    { t: 'Belgien', lat: 50.405, lon: 6.255, k: 'border', rot: -72 }, { t: 'Deutschland', lat: 50.410, lon: 6.322, k: 'border', rot: -72 },
    { t: 'Luxemburg', lat: 50.105, lon: 6.085, k: 'border' },
    { t: 'Signal de Botrange · 694 m', lat: 50.5010, lon: 6.0930, k: 'poi', peak: true },
    { t: 'Schwarzer Mann · 697 m', lat: 50.2500, lon: 6.3600, k: 'poi', peak: true },
  ];

  /* ---------------- Gelaendemodell ---------------- */
  function carve(x, y) {
    let c = 0;
    for (let i = 0; i < RIVERS.length; i++) {
      const r = RIVERS[i];
      if (x < r.bb[0] || x > r.bb[2] || y < r.bb[1] || y > r.bb[3]) continue;
      const d = distToPolyline(x, y, r.s) / U;
      const v = r.d * Math.exp(-(d * d) / (2 * r.w * r.w));
      if (v > c) c = v;
    }
    return c;
  }
  const SIG = 2.3 * U, KSIG = 1 / (2 * SIG * SIG), KNEAR = 1 / (2 * (1.1 * U) * (1.1 * U));
  const ANCH = TOWNS.map(t => [t[1], t[2], t[3]]).concat(EXTRA).map(a => {
    const p = P(a); return { x: p[0], y: p[1], t: a[2], h: a[2] + carve(p[0], p[1]) };
  });
  // Hoehe in Metern an Kartenkoordinate (x, y)
  function heightXY(x, y) {
    let sw = 0.002, sh = 0.002 * 520, near = 0;
    for (let i = 0; i < ANCH.length; i++) {
      const a = ANCH[i], dx = x - a.x, dy = y - a.y, d2 = dx * dx + dy * dy;
      if (d2 > 60 * SIG * SIG) continue;
      const w = Math.exp(-d2 * KSIG); sw += w; sh += w * a.h;
      const nr = Math.exp(-d2 * KNEAR); if (nr > near) near = nr;
    }
    const kx = x / U, ky = y / U;
    return sh / sw - carve(x, y) + fbm(kx / 2.4 + 11.3, ky / 2.4 + 4.7, 4) * 54 * (1 - near) + fbm(kx / 0.65 + 3.1, ky / 0.65 + 9.4, 3) * 9;
  }
  // Anker nachfuehren, bis die geglaettete Flaeche an jedem Ort ungefaehr seine echte Hoehe hat
  for (let it = 0; it < 30; it++) ANCH.forEach(a => { a.h += (a.t - heightXY(a.x, a.y)) * 0.7; });
  const height = (lat, lon) => { const p = proj(lat, lon); return heightXY(p[0], p[1]); };

  /* ---------------- Marching Squares (aus V10) ---------------- */
  function contourLevel(field, cols, rows, x0, y0, step, level) {
    const pts = new Map(), segs = [];
    const PT = (key, ax, ay, av, bx, by, bv) => {
      if (!pts.has(key)) { const t = (level - av) / (bv - av); pts.set(key, [ax + (bx - ax) * t, ay + (by - ay) * t]); }
      return key;
    };
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = field[j * cols + i], b = field[j * cols + i + 1], c = field[(j + 1) * cols + i + 1], d = field[(j + 1) * cols + i];
        const idx = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
        if (idx === 0 || idx === 15) continue;
        const x = x0 + i * step, y = y0 + j * step, cell = j * cols + i;
        const T = () => PT(cell * 2, x, y, a, x + step, y, b);
        const R = () => PT((cell + 1) * 2 + 1, x + step, y, b, x + step, y + step, c);
        const B = () => PT((cell + cols) * 2, x, y + step, d, x + step, y + step, c);
        const L = () => PT(cell * 2 + 1, x, y, a, x, y + step, d);
        switch (idx) {
          case 1: case 14: segs.push([L(), B()]); break;
          case 2: case 13: segs.push([B(), R()]); break;
          case 3: case 12: segs.push([L(), R()]); break;
          case 4: case 11: segs.push([T(), R()]); break;
          case 6: case 9: segs.push([T(), B()]); break;
          case 7: case 8: segs.push([L(), T()]); break;
          default: {
            const hi = (a + b + c + d) / 4 > level;
            if ((idx === 5) === hi) { segs.push([L(), T()]); segs.push([B(), R()]); }
            else { segs.push([T(), R()]); segs.push([L(), B()]); }
          }
        }
      }
    }
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

  /* ---------------- Kartenebenen fuer einen Ausschnitt ---------------- */
  // reg = {x0,y0,x1,y1} in Karteneinheiten; opt = {id (Praefix fuer defs), cells (Rasterzellen laengs), iv (m), ix (m)}
  function layersSVG(reg, opt) {
    opt = opt || {};
    const pre = opt.id || 'm';
    const W = reg.x1 - reg.x0, H = reg.y1 - reg.y0;
    const step = Math.max(W, H) / (opt.cells || 180);
    const cols = Math.ceil(W / step) + 1, rows = Math.ceil(H / step) + 1;
    const field = new Float32Array(cols * rows);
    let lo = 1e9, hi = -1e9;
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = heightXY(reg.x0 + i * step, reg.y0 + j * step);
      field[j * cols + i] = v; if (v < lo) lo = v; if (v > hi) hi = v;
    }
    const iv = opt.iv || 20, ix = opt.ix || 100;
    // Hoehenlinien
    let topo = '';
    for (let lv = Math.ceil(lo / iv) * iv; lv < hi; lv += iv) {
      const chains = contourLevel(field, cols, rows, reg.x0, reg.y0, step, lv);
      const pieces = [];
      chains.forEach(c => {
        const q = simplify(c.closed ? c.p.concat([c.p[0]]) : c.p, step * 0.06);
        pieces.push.apply(pieces, contourPieces(c.closed ? q.slice(0, -1) : q, c.closed, 14));
      });
      if (pieces.length) topo += '<g' + (lv % ix === 0 ? ' class="ix"' : '') + '>' + pieces.map(d => '<path d="' + d + '"/>').join('') + '</g>';
    }
    if (opt.topoOnly) return '<g class="m-topo">' + topo + '</g>';
    const inReg = (x, y, m) => x > reg.x0 - m && x < reg.x1 + m && y > reg.y0 - m && y < reg.y1 + m;
    let s = '<defs>' +
      '<pattern id="' + pre + 'Forest" width="16" height="16" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.3" class="m-tree"/><circle cx="12" cy="11" r="2.3" class="m-tree"/></pattern>' +
      '<pattern id="' + pre + 'Marsh" width="26" height="16" patternUnits="userSpaceOnUse"><path d="M3 10h12M7 10V6M9 10V5M11 10V6" class="m-marsh"/></pattern>' +
      '<radialGradient id="' + pre + 'Hill"><stop offset="0" stop-color="#e2d9c8" stop-opacity=".95"/><stop offset="1" stop-color="#e2d9c8" stop-opacity="0"/></radialGradient>' +
      '</defs>';
    // Hoehen-Toenung an den hohen Ankern
    s += '<g class="m-tint">' + ANCH.filter(a => a.h > 600 && inReg(a.x, a.y, 8 * U)).map(a =>
      '<ellipse cx="' + f1(a.x) + '" cy="' + f1(a.y) + '" rx="' + f1(4.5 * U) + '" ry="' + f1(3.4 * U) + '" fill="url(#' + pre + 'Hill)"/>').join('') + '</g>';
    // Kartenraster alle 5 km
    let gd = '';
    const g5 = 5 * U;
    for (let x = Math.ceil(reg.x0 / g5) * g5; x <= reg.x1; x += g5) gd += 'M' + f1(x) + ',' + f1(reg.y0) + 'V' + f1(reg.y1);
    for (let y = Math.ceil(reg.y0 / g5) * g5; y <= reg.y1; y += g5) gd += 'M' + f1(reg.x0) + ',' + f1(y) + 'H' + f1(reg.x1);
    s += '<path class="m-grid" d="' + gd + '"/>';
    // Wald: feste Flaechen + prozedurale Flecken (globales Raster -> gleich in jeder Karte)
    const forests = FORESTS.map((f, i) => { const p = P(f); return [p[0], p[1], f[2] * U, f[3] * U, f[4] * Math.PI / 180, i * 3.7 + 1]; });
    const cell = 3.4 * U;
    for (let j = Math.floor((reg.y0 - 3 * U) / cell); j <= Math.ceil((reg.y1 + 3 * U) / cell); j++) {
      for (let i = Math.floor((reg.x0 - 3 * U) / cell); i <= Math.ceil((reg.x1 + 3 * U) / cell); i++) {
        const r = hash2(i, j);
        if (r() > 0.5) continue;
        const cx = (i + 0.15 + r() * 0.7) * cell, cy = (j + 0.15 + r() * 0.7) * cell;
        // nicht mitten in Orte
        if (TOWNS.some(t => { const q = P([t[1], t[2]]); return Math.hypot(q[0] - cx, q[1] - cy) < 1.1 * U; })) continue;
        forests.push([cx, cy, (0.55 + r() * 0.9) * U, (0.35 + r() * 0.55) * U, r() * Math.PI, i * 1.3 + j * 2.1]);
      }
    }
    s += '<g class="m-forest">' + forests.filter(f => inReg(f[0], f[1], Math.max(f[2], f[3]) * 1.4)).map(f =>
      '<path d="' + smoothClosed(blob(f[0], f[1], f[2], f[3], f[5], 0.2, 40, f[4])) + '" fill="url(#' + pre + 'Forest)"/>').join('') + '</g>';
    s += '<g class="m-moor">' + MOORS.map((m, i) => { const p = P(m); return inReg(p[0], p[1], 3 * U) ? '<path d="' + smoothClosed(blob(p[0], p[1], m[2] * U, m[3] * U, 11 + i * 2.3, 0.16, 40, m[4] * Math.PI / 180)) + '" fill="url(#' + pre + 'Marsh)"/>' : ''; }).join('') + '</g>';
    s += '<g class="m-topo">' + topo + '</g>';
    // Wasser
    s += RIVERS.map(r => '<path class="' + (r.main ? 'm-river' : 'm-brook') + '" d="M' + r.s.map(q => f1(q[0]) + ',' + f1(q[1])).join('L') + '"/>').join('');
    s += '<g class="m-lake">' + LAKES.map((l, i) => {
      const p = P(l), w = blob(p[0], p[1], l[2] / 2 * U, l[3] / 2 * U, 21 + i * 4, 0.14, 48, l[4] * Math.PI / 180);
      const sc = k => w.map(q => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k]);
      return '<path class="w" d="' + smoothClosed(w) + '"/><path class="l" d="' + smoothClosed(sc(0.66)) + '"/>';
    }).join('') + '</g>';
    // Strassen + Autobahn
    s += '<g class="m-roads">' + ROADS.map(r => '<path d="' + segsToD(crSegments(r.map(P))) + '"/>').join('') + '</g>';
    s += '<path class="m-motorway" d="' + segsToD(crSegments(MOTORWAY.map(P))) + '"/>';
    // Grenzen
    s += '<g class="m-border">' + [BORDER_BE_DE, BORDER_LU, BORDER_DE_LU].map(b => '<path d="' + segsToD(crSegments(b.map(P))) + '"/>').join('') + '</g>';
    // Doerfer (kleine Haus-Rechtecke)
    let hs = '';
    TOWNS.forEach((t, ti) => {
      const c = P([t[1], t[2]]);
      if (!inReg(c[0], c[1], 2 * U)) return;
      const r = mulberry32(90 + ti), rad = (0.18 + Math.sqrt(t[4]) * 0.07) * U;
      for (let k = 0; k < t[4]; k++) {
        const a = r() * TAU, d = Math.sqrt(r()) * rad, w = (0.06 + r() * 0.07) * U, h = (0.05 + r() * 0.05) * U;
        const x = c[0] + Math.cos(a) * d, y = c[1] + Math.sin(a) * d * 0.75;
        hs += '<rect x="' + f1(x - w / 2) + '" y="' + f1(y - h / 2) + '" width="' + f1(w) + '" height="' + f1(h) + '" transform="rotate(' + Math.round(r() * 60 - 30) + ' ' + f1(x) + ' ' + f1(y) + ')"/>';
      }
    });
    s += '<g class="m-houses">' + hs + '</g>';
    return s;
  }

  /* ---------------- Route als Pfad ---------------- */
  // pts -> projizierte Punkte (ausgeduennt fuer die Darstellung) + Laenge je Punkt (Karteneinheiten)
  function routeGeom(pts, cum) {
    const xy = pts.map(p => proj(p.lat, p.lon));
    // Ausduennen, aber Index behalten (fuer km-Zuordnung)
    const idx = [], tol = 0.009 * U;             // ~9 m
    const keep = simplify(xy.map((q, i) => [q[0], q[1], i]), tol);
    keep.forEach(q => idx.push(q[2]));
    const pp = idx.map(i => xy[i]);
    const len = new Float64Array(pp.length);
    for (let i = 1; i < pp.length; i++) len[i] = len[i - 1] + Math.hypot(pp[i][0] - pp[i - 1][0], pp[i][1] - pp[i - 1][1]);
    const km = idx.map(i => cum[i]);
    const d = 'M' + pp.map(q => f1(q[0]) + ',' + f1(q[1])).join('L');
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    xy.forEach(q => { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; });
    return { pp, len, km, d, total: len[len.length - 1], bb: { x0, y0, x1, y1 } };
  }
  // Position bei km (ueber die ausgeduennte Geometrie): Punkt, Laenge im Pfad, Richtung
  function posAtKm(g, km) {
    const fi = indexAtKm(g.km, km), i = Math.min(g.pp.length - 2, Math.floor(fi)), t = Math.min(1, fi - i);
    const a = g.pp[i], b = g.pp[i + 1];
    return { x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t, len: g.len[i] + (g.len[i + 1] - g.len[i]) * t, ang: Math.atan2(b[1] - a[1], b[0] - a[0]) * 180 / Math.PI };
  }

  root.RP18Touren = {
    SHOP, U, proj, unproj, haversine, parseGPX, stats, nearestIndex, indexAtKm, lerpArr,
    height, heightXY, layersSVG, routeGeom, posAtKm, LABELS, TOWNS, ASCENT_THRESHOLD,
  };
})(typeof window !== 'undefined' ? window : globalThis);
