/* =====================================================================
   RACEPOINT · 17 · BEST OF — SVG-Rennrad in Baugruppen
   Uebernommen aus Prototyp 8 (assets/v8/aufbau.js, buildBike), dort als
   IIFE ohne Export – deshalb hier als Kopie. Stellt window.RP17Bike bereit.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const NS = 'http://www.w3.org/2000/svg';
  function S(tag, attrs, parent, html) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (html != null) e.innerHTML = html;
    if (parent) parent.appendChild(e);
    return e;
  }
  const r1 = n => Math.round(n * 10) / 10;
  // konische Rohr-Silhouette mit runden Enden
  function tube(p0, p1, w0, w1) {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L;
    const a = [p0[0] + nx * w0 / 2, p0[1] + ny * w0 / 2], b = [p1[0] + nx * w1 / 2, p1[1] + ny * w1 / 2];
    const c = [p1[0] - nx * w1 / 2, p1[1] - ny * w1 / 2], d = [p0[0] - nx * w0 / 2, p0[1] - ny * w0 / 2];
    return 'M' + r1(a[0]) + ',' + r1(a[1]) + ' L' + r1(b[0]) + ',' + r1(b[1]) + ' A' + r1(w1 / 2) + ',' + r1(w1 / 2) + ' 0 0 0 ' + r1(c[0]) + ',' + r1(c[1]) +
      ' L' + r1(d[0]) + ',' + r1(d[1]) + ' A' + r1(w0 / 2) + ',' + r1(w0 / 2) + ' 0 0 0 ' + r1(a[0]) + ',' + r1(a[1]) + 'Z';
  }
  // Glanzlinie auf der Oberseite eines Rohres
  function gloss(p0, p1, w0, w1) {
    const dx = p1[0] - p0[0], dy = p1[1] - p0[1], L = Math.hypot(dx, dy);
    let nx = -dy / L, ny = dx / L;
    if (ny > 0 || (ny === 0 && nx > 0)) { nx = -nx; ny = -ny; } // Normale nach oben
    const k0 = 0.12, k1 = 0.88, o0 = w0 * 0.24, o1 = w1 * 0.24;
    const a = [p0[0] + dx * k0 + nx * o0, p0[1] + dy * k0 + ny * o0], b = [p0[0] + dx * k1 + nx * o1, p0[1] + dy * k1 + ny * o1];
    return 'M' + r1(a[0]) + ',' + r1(a[1]) + ' L' + r1(b[0]) + ',' + r1(b[1]);
  }
  // Rohr entlang einer Bezier-Kurve (Gabel)
  function bezTube(p0, c0, c1, p1, w0, w1) {
    const n = 26, L = [], R = [];
    const at = t => { const u = 1 - t; return [u * u * u * p0[0] + 3 * u * u * t * c0[0] + 3 * u * t * t * c1[0] + t * t * t * p1[0], u * u * u * p0[1] + 3 * u * u * t * c0[1] + 3 * u * t * t * c1[1] + t * t * t * p1[1]]; };
    for (let i = 0; i <= n; i++) {
      const t = i / n, p = at(t), q = at(Math.min(1, t + 0.01)), o = at(Math.max(0, t - 0.01));
      const dx = q[0] - o[0], dy = q[1] - o[1], l = Math.hypot(dx, dy), w = (w0 + (w1 - w0) * t) / 2;
      L.push([p[0] - dy / l * w, p[1] + dx / l * w]); R.push([p[0] + dy / l * w, p[1] - dx / l * w]);
    }
    return 'M' + L.map(p => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' A' + w1 / 2 + ',' + w1 / 2 + ' 0 0 1 ' + R.slice().reverse().map(p => r1(p[0]) + ',' + r1(p[1])).join(' L') + ' Z';
  }
  const arc = (cx, cy, r, a0, a1) => {
    const p = a => [r1(cx + r * Math.cos(a * Math.PI / 180)), r1(cy + r * Math.sin(a * Math.PI / 180))];
    const s = p(a0), e = p(a1);
    return 'M' + s + ' A' + r + ',' + r + ' 0 ' + (a1 - a0 > 180 ? 1 : 0) + ' 1 ' + e;
  };

  // Geometrie (mm) – Rennrad Groesse 56, Tretlager = Ursprung, y nach unten
  const G = {
    BB: [0, 0], R: [-404, -72], F: [593, -72],
    ST: [-148, -500], HTt: [395, -572], HTb: [441, -414], TTs: [-138, -466], TTh: [390, -548],
  };
  const FRAME = [ // [p0, p1, w0, w1]
    [[-14, 4], [-396, -70], 26, 16],      // Kettenstrebe
    [[-396, -76], [-122, -398], 15, 20],  // Sitzstrebe
    [[0, -6], G.ST, 40, 34],              // Sitzrohr
    [G.TTs, G.TTh, 30, 32],               // Oberrohr
    [[6, -26], [430, -436], 58, 50],      // Unterrohr
    [G.HTt, G.HTb, 46, 56],               // Steuerrohr
  ];
  const JOINTS = [[0, 0, 30], [-136, -466, 17], [392, -548, 18], [430, -434, 27], [-122, -398, 11], [-404, -72, 17]];

  function buildBike(box) {
    const svg = S('svg', { viewBox: '-850 -840 1900 1240', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Rennrad, das sich aus Einzelteilen zusammensetzt' }, box);
    const defs = S('defs', {}, svg);
    defs.innerHTML =
      '<linearGradient id="gCarbon" gradientUnits="userSpaceOnUse" x1="0" y1="-620" x2="0" y2="80"><stop offset="0" stop-color="#3a3d44"/><stop offset=".45" stop-color="#1c1d21"/><stop offset="1" stop-color="#0d0e10"/></linearGradient>' +
      '<linearGradient id="gPaint" gradientUnits="userSpaceOnUse" x1="0" y1="-620" x2="0" y2="80"><stop offset="0" stop-color="#ff7071"/><stop offset=".42" stop-color="#E83637"/><stop offset="1" stop-color="#9b1719"/></linearGradient>' +
      '<linearGradient id="gSweep" gradientUnits="userSpaceOnUse" x1="-460" y1="0" x2="660" y2="0"><stop id="sw1" offset="-0.1" stop-color="#fff"/><stop id="sw2" offset="-0.02" stop-color="#000"/></linearGradient>' +
      '<mask id="mPaint" maskUnits="userSpaceOnUse" x="-900" y="-900" width="2000" height="1400"><rect x="-900" y="-900" width="2000" height="1400" fill="url(#gSweep)"/></mask>' +
      '<linearGradient id="gGlint" gradientUnits="objectBoundingBox" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>' +
      '<radialGradient id="gDisc"><stop offset="0" stop-color="#2d3036"/><stop offset="1" stop-color="#121316"/></radialGradient>' +
      '<radialGradient id="gShadow"><stop offset="0" stop-color="#000" stop-opacity=".75"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
      '<clipPath id="cFrame">' + FRAME.map(t => '<path d="' + tube(t[0], t[1], t[2], t[3]) + '"/>').join('') + '</clipPath>';

    const root = S('g', { id: 'bike' }, svg);
    const parts = {};
    const part = id => { const g = S('g', { class: 'part', id: 'p-' + id }, root); parts[id] = g; return S('g', { class: 'bob' }, g); };

    /* ---- Blaupause (Soll-Konturen + Bemassung) ---- */
    const bp = S('g', { id: 'bp', fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 2, 'stroke-dasharray': '8 10' }, root);
    S('circle', { cx: G.R[0], cy: G.R[1], r: 339 }, bp); S('circle', { cx: G.F[0], cy: G.F[1], r: 339 }, bp);
    [[G.BB, G.ST], [G.BB, G.HTb], [G.TTs, G.TTh], [G.BB, G.R], [G.R, [-122, -398]], [[404, -650], [546, -72]], [G.HTb, G.F], [[-206, -706], [-80, -706]], [[-330, -706], [-206, -706]]]
      .forEach(l => S('line', { x1: l[0][0], y1: l[0][1], x2: l[1][0], y2: l[1][1] }, bp));
    const solid = S('g', { 'stroke-dasharray': 'none', stroke: 'rgba(255,255,255,.34)', 'stroke-width': 2 }, bp);
    [G.R, G.F, G.BB].forEach(p => { S('line', { x1: p[0] - 26, y1: p[1], x2: p[0] + 26, y2: p[1] }, solid); S('line', { x1: p[0], y1: p[1] - 26, x2: p[0], y2: p[1] + 26 }, solid); });
    // Radstand
    S('line', { x1: G.R[0], y1: 300, x2: G.F[0], y2: 300 }, solid);
    [G.R[0], G.F[0]].forEach(x => S('line', { x1: x, y1: 282, x2: x, y2: 318 }, solid));
    S('path', { d: 'M' + (G.R[0] + 18) + ',292 L' + G.R[0] + ',300 L' + (G.R[0] + 18) + ',308 M' + (G.F[0] - 18) + ',292 L' + G.F[0] + ',300 L' + (G.F[0] - 18) + ',308' }, solid);
    // Winkel
    S('path', { d: 'M456,-72 A90,90 0 0 1 519.7,-158' }, solid);
    S('path', { d: 'M-100,0 A100,100 0 0 1 -28.4,-95.9' }, solid);
    // Reach + Stack
    S('line', { x1: 0, y1: -760, x2: G.HTt[0], y2: -760 }, solid);
    [0, G.HTt[0]].forEach(x => S('line', { x1: x, y1: -778, x2: x, y2: -742 }, solid));
    S('line', { x1: 990, y1: 0, x2: 990, y2: G.HTt[1] }, solid);
    [0, G.HTt[1]].forEach(y => S('line', { x1: 972, y1: y, x2: 1008, y2: y }, solid));
    const txt = (x, y, s, rot) => S('text', { x, y, fill: 'rgba(255,255,255,.55)', stroke: 'none', 'font-family': 'Roboto Mono, monospace', 'font-size': 24, 'letter-spacing': 2, 'text-anchor': 'middle', transform: rot ? 'rotate(' + rot + ' ' + x + ' ' + y + ')' : '' }, bp, s);
    txt(94, 284, 'RADSTAND 996 MM'); txt(450, -132, '73°'); txt(-128, -60, '73,5°'); txt(197, -776, 'REACH 395'); txt(1030, -282, 'STACK 565', -90);
    root.appendChild(bp);

    /* ---- Bodenschatten ---- */
    const shadow = S('ellipse', { id: 'shadow', cx: 94, cy: 282, rx: 820, ry: 30, fill: 'url(#gShadow)', opacity: 0 }, root);

    /* ---- 06 Sattel & Stuetze (liegt hinter dem Rahmen) ---- */
    let g = part('sattel');
    S('path', { d: tube([-140, -472], [-202, -684], 32, 30), fill: 'url(#gCarbon)' }, g);
    S('path', { d: gloss([-140, -472], [-202, -684], 32, 30), stroke: 'rgba(255,255,255,.2)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    S('path', { d: tube([-200, -676], [-207, -696], 26, 36), fill: '#1d1f23' }, g);
    S('path', { d: 'M-292,-690 L-206,-682 L-112,-692', fill: 'none', stroke: '#8b9098', 'stroke-width': 6, 'stroke-linecap': 'round' }, g);
    S('path', { d: 'M-334,-704 C-326,-728 -264,-730 -200,-720 C-150,-712 -110,-708 -76,-710 C-62,-708 -64,-694 -78,-690 C-140,-688 -202,-688 -264,-689 C-304,-690 -336,-692 -334,-704 Z', fill: '#16171a' }, g);
    S('path', { d: 'M-322,-716 C-300,-728 -250,-726 -200,-718 C-150,-710 -110,-706 -80,-708', fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 3.5, 'stroke-linecap': 'round' }, g);
    S('path', { d: 'M-316,-697 C-260,-699 -170,-699 -96,-699', fill: 'none', stroke: '#E83637', 'stroke-width': 3, opacity: .85 }, g);

    /* ---- 03 Laufraeder ---- */
    function wheel(id, c) {
      const w = part(id);
      const sp = S('g', { class: 'spin', id: 'spin-' + id }, w);
      // Bremsscheibe (dahinter)
      S('circle', { cx: c[0], cy: c[1], r: 78, fill: 'none', stroke: '#7d828b', 'stroke-width': 13, opacity: .55 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 78, fill: 'none', stroke: '#0c0d10', 'stroke-width': 4, 'stroke-dasharray': '4 11', opacity: .7 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 46, fill: 'none', stroke: '#5f646c', 'stroke-width': 6, opacity: .5 }, sp);
      // Speichen (gekreuzt)
      let d = '';
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, b = a + (i % 2 ? 0.42 : -0.42);
        d += 'M' + r1(c[0] + 24 * Math.cos(a)) + ',' + r1(c[1] + 24 * Math.sin(a)) + ' L' + r1(c[0] + 262 * Math.cos(b)) + ',' + r1(c[1] + 262 * Math.sin(b));
      }
      S('path', { d, stroke: '#4d5159', 'stroke-width': 2.6 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 30, fill: '#1e2024', stroke: '#3a3d43', 'stroke-width': 3 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 21, fill: 'none', stroke: '#5a5f67', 'stroke-width': 2 }, sp);
      // Carbonfelge (tief)
      S('circle', { cx: c[0], cy: c[1], r: 286, fill: 'none', stroke: '#17181b', 'stroke-width': 50 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 261, fill: 'none', stroke: '#2b2e33', 'stroke-width': 2 }, sp);
      S('path', { d: arc(c[0], c[1], 297, 200, 285), fill: 'none', stroke: 'rgba(255,255,255,.13)', 'stroke-width': 6, 'stroke-linecap': 'round' }, sp);
      S('path', { d: arc(c[0], c[1], 272, 15, 75), fill: 'none', stroke: 'rgba(255,255,255,.06)', 'stroke-width': 4, 'stroke-linecap': 'round' }, sp);
      const pid = 'rimtxt-' + id;
      S('path', { id: pid, d: 'M' + (c[0] - 276) + ',' + c[1] + ' A276,276 0 1 1 ' + (c[0] + 276) + ',' + c[1] + ' A276,276 0 1 1 ' + (c[0] - 276) + ',' + c[1], fill: 'none' }, sp);
      ['3%', '53%'].forEach(o => S('text', { 'font-family': 'Anton, Impact, sans-serif', 'font-size': 30, 'letter-spacing': 4, fill: '#f1f1f3' }, sp,
        '<textPath href="#' + pid + '" startOffset="' + o + '">ROVAL · RAPIDE CLX</textPath>'));
      // Reifen: Tan-Wall + schwarze Lauffläche
      S('circle', { cx: c[0], cy: c[1], r: 322, fill: 'none', stroke: '#b48b55', 'stroke-width': 19 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 313, fill: 'none', stroke: '#7d5f36', 'stroke-width': 1.6 }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 334, fill: 'none', stroke: '#111214', 'stroke-width': 11 }, sp);
      S('path', { d: arc(c[0], c[1], 323, 205, 260), fill: 'none', stroke: 'rgba(255,240,220,.28)', 'stroke-width': 4, 'stroke-linecap': 'round' }, sp);
      S('circle', { cx: c[0], cy: c[1], r: 11, fill: '#9aa0a8', stroke: '#2a2c31', 'stroke-width': 3 }, w);
    }
    wheel('wheelR', G.R);
    wheel('wheelF', G.F);

    /* ---- 02 Gabel & Steuersatz ---- */
    g = part('gabel');
    S('path', { d: bezTube([437, -418], [466, -330], [556, -176], [592, -76], 46, 18), fill: 'url(#gCarbon)' }, g);
    S('path', { d: 'M452,-400 C478,-320 548,-190 580,-104', fill: 'none', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    S('circle', { cx: G.F[0], cy: G.F[1], r: 15, fill: '#1d1f23' }, g);
    const up = [-0.2914, -0.9566], at = k => [G.HTt[0] + up[0] * k, G.HTt[1] + up[1] * k];
    S('path', { d: tube(at(2), at(12), 42, 42), fill: '#24262b' }, g);
    S('path', { d: tube(at(15), at(25), 40, 40), fill: '#1b1c20' }, g);
    S('path', { d: tube(at(-10), at(0), 50, 50), fill: '#2b2e33' }, g);

    /* ---- 01 Rahmen ---- */
    g = part('rahmen');
    const base = S('g', {}, g), paint = S('g', { mask: 'url(#mPaint)' }, g);
    FRAME.forEach(t => {
      S('path', { d: tube(t[0], t[1], t[2], t[3]), fill: 'url(#gCarbon)' }, base);
      S('path', { d: tube(t[0], t[1], t[2], t[3]), fill: 'url(#gPaint)' }, paint);
    });
    JOINTS.forEach(j => { S('circle', { cx: j[0], cy: j[1], r: j[2], fill: 'url(#gCarbon)' }, base); S('circle', { cx: j[0], cy: j[1], r: j[2], fill: 'url(#gPaint)' }, paint); });
    FRAME.forEach(t => S('path', { d: gloss(t[0], t[1], t[2], t[3]), stroke: 'rgba(255,255,255,.22)', 'stroke-width': Math.max(3, t[2] * 0.12), 'stroke-linecap': 'round' }, g));
    S('text', { x: 218, y: -231, transform: 'rotate(-44.04 218 -231)', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Anton, Impact, sans-serif', 'font-size': 36, 'letter-spacing': 7, fill: '#fff', opacity: .94 }, g, 'RACEPOINT');
    S('text', { x: 140, y: -500, transform: 'rotate(-8.5 140 -500)', 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-family': 'Roboto Mono, monospace', 'font-size': 14, 'letter-spacing': 3, fill: 'rgba(255,255,255,.75)' }, g, 'BUILD Nº 01 · SCHÖNBERG');
    S('circle', { cx: 0, cy: 0, r: 20, fill: '#2a2c31' }, g);
    const glint = S('rect', { id: 'glint', x: -900, y: -700, width: 260, height: 900, fill: 'url(#gGlint)', transform: 'skewX(-18)', 'clip-path': 'url(#cFrame)', opacity: .9 }, g);
    glint.removeAttribute('transform');
    const glintWrap = S('g', { 'clip-path': 'url(#cFrame)' }, g);
    glintWrap.appendChild(glint);

    /* ---- 04 Antrieb: Kassette ---- */
    g = part('kassette');
    S('circle', { cx: G.R[0], cy: G.R[1], r: 66, fill: '#17181b' }, g);
    [64, 57, 50, 44, 39, 34, 30, 26, 23, 20].forEach((r, i) => S('circle', { cx: G.R[0], cy: G.R[1], r, fill: 'none', stroke: '#a1a7b0', 'stroke-width': 2.6, opacity: 0.95 - i * 0.06 }, g));
    S('circle', { cx: G.R[0], cy: G.R[1], r: 15, fill: '#6b7079' }, g);
    S('circle', { cx: G.R[0], cy: G.R[1], r: 7, fill: '#2a2c31' }, g);

    /* ---- 04 Antrieb: Kette ---- */
    const kette = part('kette');
    const chainD = 'M0,-106 L-404,-108 A36,36 0 0 0 -404,-36 L-392,-10 A22,22 0 0 1 -392,34 L-430,56 A22,22 0 0 0 -430,100 L0,106';
    S('path', { id: 'chainBase', d: chainD, fill: 'none', stroke: '#2b2e33', 'stroke-width': 10, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, kette);
    S('path', { id: 'chainLinks', d: chainD, fill: 'none', stroke: '#8b9098', 'stroke-width': 5, 'stroke-dasharray': '7 5', opacity: 0 }, kette);

    /* ---- 04 Antrieb: Kurbel ---- */
    g = part('kurbel');
    let teeth = '';
    const N = 52, st = Math.PI * 2 / N;
    for (let i = 0; i < N; i++) {
      const a = i * st, p = (rr, aa) => r1(rr * Math.cos(aa)) + ',' + r1(rr * Math.sin(aa));
      teeth += (i ? ' L' : 'M') + p(103, a - st * 0.34) + ' L' + p(110, a - st * 0.16) + ' L' + p(110, a + st * 0.16) + ' L' + p(103, a + st * 0.34);
    }
    S('path', { d: teeth + 'Z', fill: '#3d4047' }, g);
    S('circle', { cx: 0, cy: 0, r: 97, fill: 'none', stroke: '#2f3237', 'stroke-width': 14 }, g);
    S('circle', { cx: 0, cy: 0, r: 90, fill: 'url(#gDisc)' }, g);
    S('circle', { cx: 0, cy: 0, r: 84, fill: 'none', stroke: '#E83637', 'stroke-width': 2.4, opacity: .85 }, g);
    S('circle', { cx: 0, cy: 0, r: 58, fill: 'none', stroke: 'rgba(255,255,255,.08)', 'stroke-width': 2 }, g);
    [45, 135, 225, 315].forEach(a => S('circle', { cx: r1(72 * Math.cos(a * Math.PI / 180)), cy: r1(72 * Math.sin(a * Math.PI / 180)), r: 4.5, fill: '#6b7079' }, g));
    S('path', { d: tube([0, 0], [111, 132], 42, 28), fill: '#17181b' }, g);
    S('path', { d: gloss([0, 0], [111, 132], 42, 28), stroke: 'rgba(255,255,255,.18)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    S('circle', { cx: 0, cy: 0, r: 17, fill: '#2a2c31', stroke: '#6b7079', 'stroke-width': 2 }, g);
    S('circle', { cx: 0, cy: 0, r: 6, fill: '#9aa0a8' }, g);
    S('rect', { x: 64, y: 122, width: 94, height: 19, rx: 9.5, fill: '#1b1c1f', stroke: '#33363c', 'stroke-width': 2 }, g);
    S('circle', { cx: 111, cy: 132, r: 8, fill: '#9aa0a8' }, g);

    /* ---- 04 Antrieb: Schaltwerk + Umwerfer ---- */
    g = part('schaltwerk');
    S('path', { d: 'M-396,-64 L-446,-40 L-452,-12 L-414,-2 L-386,-36 Z', fill: '#24262b', stroke: '#3a3d43', 'stroke-width': 2 }, g);
    S('rect', { x: -480, y: -72, width: 42, height: 22, rx: 5, fill: '#30333a', transform: 'rotate(-24 -459 -61)' }, g);
    S('circle', { cx: -470, cy: -54, r: 3.5, fill: '#E83637' }, g);
    S('path', { d: tube([-392, 12], [-430, 78], 54, 54), fill: '#1c1d21', stroke: '#33363c', 'stroke-width': 2, opacity: .95 }, g);
    [[-392, 12], [-430, 78]].forEach(p => { S('circle', { cx: p[0], cy: p[1], r: 13, fill: '#2b2e33', stroke: '#5a5f67', 'stroke-width': 2 }, g); S('circle', { cx: p[0], cy: p[1], r: 5, fill: '#9aa0a8' }, g); });
    S('path', { d: 'M-64,-174 L-26,-182 L-18,-142 L-56,-134 Z', fill: '#24262b', stroke: '#3a3d43', 'stroke-width': 2 }, g);
    S('path', { d: 'M-72,-126 Q-24,-140 26,-124', fill: 'none', stroke: '#2a2c31', 'stroke-width': 10, 'stroke-linecap': 'round' }, g);

    /* ---- 05 Cockpit ---- */
    g = part('cockpit');
    S('path', { d: tube([387, -598], [500, -610], 36, 30), fill: '#1a1b1e' }, g);
    S('path', { d: gloss([387, -598], [500, -610], 36, 30), stroke: 'rgba(255,255,255,.18)', 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
    S('path', { d: 'M500,-608 L548,-624', stroke: '#26282c', 'stroke-width': 8, 'stroke-linecap': 'round' }, g);
    S('rect', { x: 528, y: -650, width: 66, height: 22, rx: 6, fill: '#0f1012', stroke: '#33363c', 'stroke-width': 2, transform: 'rotate(-6 561 -639)' }, g);
    S('path', { d: 'M536,-638 L556,-642 L566,-636 L586,-644', fill: 'none', stroke: '#E83637', 'stroke-width': 2.2, transform: 'rotate(-6 561 -639)' }, g);
    const bar = 'M494,-608 L560,-608 C598,-608 614,-580 608,-548 C602,-512 574,-494 536,-492 L504,-494';
    S('path', { d: bar, fill: 'none', stroke: '#141518', 'stroke-width': 24, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, g);
    S('path', { d: bar, fill: 'none', stroke: '#26282d', 'stroke-width': 24, 'stroke-dasharray': '3 9', opacity: .7 }, g);
    S('circle', { cx: 500, cy: -608, r: 21, fill: '#1d1f23', stroke: '#2f3238', 'stroke-width': 2 }, g);
    S('path', { d: 'M556,-606 C562,-640 592,-656 616,-650 C630,-645 626,-624 612,-606 Z', fill: '#1e1f23', stroke: '#2c2f35', 'stroke-width': 2 }, g);
    S('path', { d: 'M566,-626 C578,-644 598,-650 612,-646', fill: 'none', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 3, 'stroke-linecap': 'round' }, g);
    S('path', { d: 'M608,-606 C622,-580 622,-540 604,-506', fill: 'none', stroke: '#2a2c31', 'stroke-width': 14, 'stroke-linecap': 'round' }, g);

    /* ---- 07 Feinschliff: Drehmoment-Checks ---- */
    const checks = S('g', { id: 'checks' }, root);
    [[500, -608, '5 Nm'], [-146, -492, '6 Nm'], [593, -72, '12 Nm'], [-404, -72, '12 Nm'], [0, 0, '54 Nm'], [395, -592, '5 Nm']].forEach((c, i) => {
      const k = S('g', { class: 'chk', transform: 'translate(' + c[0] + ' ' + c[1] + ')' }, checks);
      const inner = S('g', {}, k);
      S('circle', { r: 27, fill: 'rgba(12,13,16,.88)', stroke: '#22c55e', 'stroke-width': 3.5 }, inner);
      S('path', { d: 'M-11,0 L-3,8 L12,-9', fill: 'none', stroke: '#22c55e', 'stroke-width': 4.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, inner);
      S('text', { x: 36, y: i % 2 ? 42 : -32, fill: '#86efac', 'font-family': 'Roboto Mono, monospace', 'font-size': 22, 'letter-spacing': 1 }, inner, c[2]);
    });

    /* ---- Einrast-Blitze ---- */
    const flashes = S('g', { id: 'flashes', fill: 'none', stroke: '#E83637', 'stroke-width': 4 }, root);
    const flash = p => S('circle', { cx: p[0], cy: p[1], r: 12, opacity: 0 }, flashes);

    return {
      svg, root, parts, bp, shadow, checks: $$('.chk > g', checks),
      flash: {
        rahmen: [flash([0, 0]), flash(G.HTb)], gabel: [flash(G.HTb)], wheelR: [flash(G.R)], wheelF: [flash(G.F)],
        kurbel: [flash([0, 0])], kassette: [flash(G.R)], cockpit: [flash([392, -592])], sattel: [flash([-148, -500])],
      },
      spinR: $('#spin-wheelR', svg), spinF: $('#spin-wheelF', svg),
      chainBase: $('#chainBase', svg), chainLinks: $('#chainLinks', svg),
      glint: $('#glint', svg), sw1: $('#sw1', svg), sw2: $('#sw2', svg),
    };
  }

  window.RP17Bike = { build: buildBike, G };
})();
