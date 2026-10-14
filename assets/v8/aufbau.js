/* =====================================================================
   RACEPOINT · PROTOTYP 8 · DER AUFBAU (THROWAWAY)
   1) SVG-Rennrad in Baugruppen (Masse in mm, Tretlager = 0/0)
   2) Gepinnte Scroll-Timeline: Explosionszeichnung -> 7 Aufbau-Schritte
      -> Lackierung + drehende Laufraeder
   3) Restliche Sektionen: Achim, Kategorien, Builds, Werkstatt, Retuel
   ===================================================================== */
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const T = o => RP.t(o);

  /* ---------------- Smooth Scroll (Lenis + ScrollTrigger) ---------------- */
  let lenis = null;
  if (!RP.reducedMotion) {
    lenis = new Lenis({ lerp: 0.11, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.querySelector(a.getAttribute('href'));
    if (!el) return;
    e.preventDefault();
    $('#mmenu').classList.remove('on');
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 }); else el.scrollIntoView({ behavior: 'smooth' });
  });
  RP.mountPicker('8');

  /* =====================================================================
     1) DAS BIKE
     ===================================================================== */
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

  /* =====================================================================
     2) AUFBAU-TIMELINE
     ===================================================================== */
  const STEPS = [
    { key: 'rahmen', kg: 0.685, pcs: 3,
      t: { de: 'Der Rahmen', fr: 'Le cadre', nl: 'Het frame', en: 'The frame' },
      x: { de: 'Das Herz jedes Builds. Achim prüft Lagersitze, Gewinde und Innenlager, bevor auch nur ein Teil montiert wird.', fr: 'Le cœur de chaque montage. Achim contrôle portées de roulement, filetages et boîtier de pédalier avant de monter la moindre pièce.', nl: 'Het hart van elke build. Achim controleert lagerzittingen, schroefdraad en trapas voordat er ook maar één onderdeel op gaat.', en: 'The heart of every build. Achim checks bearing seats, threads and bottom bracket before a single part goes on.' },
      s: 'FACT 12r Carbon · 685 g' },
    { key: 'gabel', kg: 0.375, pcs: 4,
      t: { de: 'Gabel & Steuersatz', fr: 'Fourche & jeu de direction', nl: 'Vork & balhoofd', en: 'Fork & headset' },
      x: { de: 'Steuersatz einpressen, Gabelschaft auf Maß kürzen – auf den Millimeter, denn hier gibt es kein Zurück.', fr: 'Emmancher le jeu de direction, couper le pivot à la bonne longueur – au millimètre, ici pas de retour en arrière.', nl: 'Balhoofd inpersen, vorkbuis op maat inkorten – op de millimeter, want hier is er geen weg terug.', en: 'Press in the headset, cut the steerer to length – to the millimetre, because there’s no going back.' },
      s: 'Carbon · 1 1/8"–1,5"' },
    { key: 'raeder', kg: 2.2, pcs: 6,
      t: { de: 'Die Laufräder', fr: 'Les roues', nl: 'De wielen', en: 'The wheels' },
      x: { de: 'Tiefe Carbonfelgen für Tempo, tubeless montiert, Tan-Wall-Reifen für den Look aus den Videos.', fr: 'Jantes carbone profondes pour la vitesse, montées tubeless, pneus à flancs beiges pour le look des vidéos.', nl: 'Diepe carbon velgen voor snelheid, tubeless gemonteerd, tan-wall-banden voor de look uit de video’s.', en: 'Deep carbon rims for speed, set up tubeless, tan-wall tyres for that look from the videos.' },
      s: 'Roval Rapide CLX · 28 mm' },
    { key: 'antrieb', kg: 1.66, pcs: 9,
      t: { de: 'Der Antrieb', fr: 'La transmission', nl: 'De aandrijving', en: 'The drivetrain' },
      x: { de: 'Kurbel, Kassette, Kette, Schaltwerk. Kabellos geschaltet – und so eingestellt, dass jeder Gang sitzt.', fr: 'Pédalier, cassette, chaîne, dérailleur. Sans fil – et réglé pour que chaque vitesse passe parfaitement.', nl: 'Crank, cassette, ketting, derailleur. Draadloos geschakeld – en zo afgesteld dat elke versnelling zit.', en: 'Crankset, cassette, chain, derailleur. Shifting wirelessly – and tuned so every gear lands.' },
      s: 'SRAM Red AXS · 2×12' },
    { key: 'cockpit', kg: 1.34, pcs: 7,
      t: { de: 'Das Cockpit', fr: 'Le cockpit', nl: 'De cockpit', en: 'The cockpit' },
      x: { de: 'Vorbau, Lenker, Griffe – integriert, ohne sichtbare Züge. Höhe und Länge passen wir an deinen Körper an.', fr: 'Potence, cintre, cocottes – intégrés, sans câbles visibles. Hauteur et longueur adaptées à ton corps.', nl: 'Stuurpen, stuur, shifters – geïntegreerd, zonder zichtbare kabels. Hoogte en lengte passen we aan je lichaam aan.', en: 'Stem, bar, hoods – integrated, no visible cables. Height and reach matched to your body.' },
      s: 'Integriert · 110 mm' },
    { key: 'sattel', kg: 0.37, pcs: 3,
      t: { de: 'Sattel & Stütze', fr: 'Selle & tige', nl: 'Zadel & pen', en: 'Saddle & post' },
      x: { de: 'Sitzhöhe und Setback stellen wir beim Retül-Bikefitting ein. Nicht nach Tabelle – nach dir.', fr: 'Hauteur et recul de selle se règlent au bike fitting Retül. Pas selon un tableau – selon toi.', nl: 'Zadelhoogte en setback stellen we in bij de Retül-bikefitting. Niet volgens een tabel – volgens jou.', en: 'Saddle height and setback are set at the Retül bike fit. Not by a chart – by you.' },
      s: 'S-Works Power · Retül' },
    { key: 'fein', kg: 0.17, pcs: 2,
      t: { de: 'Der Feinschliff', fr: 'La finition', nl: 'De afwerking', en: 'The finishing touch' },
      x: { de: 'Jede Schraube mit Drehmoment, jede Schaltstufe geprüft, Probefahrt auf dem Hof. Erst dann ist es dein Bike.', fr: 'Chaque vis au couple, chaque vitesse vérifiée, essai dans la cour. Alors seulement, c’est ton vélo.', nl: 'Elke schroef op koppel, elke versnelling gecontroleerd, proefrit op het erf. Pas dan is het jouw fiets.', en: 'Every bolt torqued, every gear checked, a test ride in the yard. Only then is it your bike.' },
      s: 'Drehmoment · Schaltung · Probefahrt ✓' },
  ];
  const TAGS = {
    rahmen: { de: 'Rahmen', fr: 'Cadre', nl: 'Frame', en: 'Frame' },
    gabel: { de: 'Gabel', fr: 'Fourche', nl: 'Vork', en: 'Fork' },
    wheelR: { de: 'Laufrad hinten', fr: 'Roue arrière', nl: 'Achterwiel', en: 'Rear wheel' },
    wheelF: { de: 'Laufrad vorn', fr: 'Roue avant', nl: 'Voorwiel', en: 'Front wheel' },
    kassette: { de: 'Kassette', fr: 'Cassette', nl: 'Cassette', en: 'Cassette' },
    kurbel: { de: 'Kurbel', fr: 'Pédalier', nl: 'Crankstel', en: 'Crankset' },
    schaltwerk: { de: 'Schaltwerk', fr: 'Dérailleur', nl: 'Derailleur', en: 'Derailleur' },
    cockpit: { de: 'Cockpit', fr: 'Cockpit', nl: 'Cockpit', en: 'Cockpit' },
    sattel: { de: 'Sattel', fr: 'Selle', nl: 'Zadel', en: 'Saddle' },
  };
  const TAGSHORT = [TAGS_S('Rahmen', 'Cadre', 'Frame', 'Frame'), TAGS_S('Gabel', 'Fourche', 'Vork', 'Fork'), TAGS_S('Räder', 'Roues', 'Wielen', 'Wheels'), TAGS_S('Antrieb', 'Transmission', 'Aandrijving', 'Drivetrain'),
    TAGS_S('Cockpit', 'Cockpit', 'Cockpit', 'Cockpit'), TAGS_S('Sattel', 'Selle', 'Zadel', 'Saddle'), TAGS_S('Finish', 'Finition', 'Afwerking', 'Finish')];
  function TAGS_S(de, fr, nl, en) { return { de, fr, nl, en }; }
  const STEP_OF = { rahmen: 1, gabel: 2, wheelR: 3, wheelF: 3, kassette: 4, kette: 4, kurbel: 4, schaltwerk: 4, cockpit: 5, sattel: 6 };
  // Startzeiten auf der Timeline
  const s0 = 0.8, sd = 1.1, sAt = n => s0 + (n - 1) * sd;
  const START = { rahmen: sAt(1), gabel: sAt(2), wheelR: sAt(3), wheelF: sAt(3) + 0.15, kassette: sAt(4), kurbel: sAt(4) + 0.15, schaltwerk: sAt(4) + 0.3, kette: sAt(4) + 0.55, cockpit: sAt(5), sattel: sAt(6) };
  const FIN = sAt(7) + 1.2, END = FIN + 2.6;
  // Explosionszeichnung: Versatz je Teil {x, y, r, s} – quer (Desktop) und hoch (Handy)
  const EXPLODE = {
    wide: {
      rahmen: [0, -30, -4, 1], gabel: [300, -230, 18, 1], wheelR: [-300, 150, -10, 0.95], wheelF: [330, 180, 12, 0.95],
      kassette: [-420, 300, 0, 1], kurbel: [130, 400, 35, 1], schaltwerk: [-170, 450, -15, 1], cockpit: [330, -320, -14, 1], sattel: [-270, -250, 10, 1],
    },
    narrow: {
      rahmen: [0, -10, -4, 1], gabel: [150, -330, 22, 1], wheelR: [-90, 250, -8, 0.8], wheelF: [90, 280, 10, 0.8],
      kassette: [-260, 360, 0, 1], kurbel: [170, 360, 40, 1], schaltwerk: [-340, 380, -14, 1], cockpit: [250, -380, -14, 1], sattel: [-230, -330, 12, 1],
    },
  };
  // Etiketten-Versatz (px) relativ zur Teil-Mitte
  const TAGPOS = {
    rahmen: [-60, -150], gabel: [70, -90], wheelR: [30, -210], wheelF: [70, 130], kassette: [-150, 50], kurbel: [70, 60], schaltwerk: [80, 40], cockpit: [60, -70], sattel: [-160, -70],
  };

  const stage = $('#stage'), bikebox = $('#bikebox'), col = $('#col');
  const B = buildBike(bikebox);
  const tagsEl = $('#tags'), leaders = $('#leaders');
  const tagEls = {};
  Object.keys(TAGS).forEach(k => {
    const d = document.createElement('div');
    d.className = 'tag';
    d.innerHTML = '<b>0' + STEP_OF[k] + '</b><span></span>';
    tagsEl.appendChild(d);
    const line = document.createElementNS(NS, 'line');
    line.setAttribute('stroke', 'rgba(255,255,255,.35)');
    line.setAttribute('stroke-dasharray', '3 4');
    leaders.appendChild(line);
    const dot = document.createElementNS(NS, 'circle');
    dot.setAttribute('r', 3.5); dot.setAttribute('fill', '#E83637');
    leaders.appendChild(dot);
    tagEls[k] = { d, line, dot };
  });
  const checklist = $('#checklist');
  function renderTexts() {
    Object.keys(TAGS).forEach(k => { tagEls[k].d.querySelector('span').textContent = T(TAGS[k]); });
    checklist.innerHTML = STEPS.map((s, i) => '<li data-i="' + i + '" style="left:' + (sAt(i + 1) / END * 100).toFixed(2) + '%"><i></i><span>' + String(i + 1).padStart(2, '0') + ' ' + T(TAGSHORT[i]) + '</span></li>').join('');
    fillStep(Math.max(1, Math.min(7, lastShown)));
    lastStep = -1;
    if (state.t != null) update(state.t, state.p);
  }

  const state = { t: null, p: 0, narrow: false, active: !RP.reducedMotion };
  let lastStep = -1, lastShown = 1, swapTimer = null;
  const kgEl = $('#kg'), pcsEl = $('#pcs'), progI = $('#progress > i');
  const stepCard = $('#stepCard');
  const fmtKg = v => v.toLocaleString(RP.lang === 'en' ? 'en-GB' : RP.lang + '-BE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const prog = (k, t, dur) => clamp((t - START[k]) / (dur || 1), 0, 1);

  function setStep(i) {
    if (i === lastStep) return;
    lastStep = i;
    clearTimeout(swapTimer);
    stepCard.classList.add('out');
    swapTimer = setTimeout(() => {
      if (i >= 1 && i <= 7) fillStep(i);
      stepCard.classList.remove('out');
    }, 180);
  }
  function fillStep(i) {
    const s = STEPS[i - 1];
    lastShown = i;
    $('#stepNo').textContent = String(i).padStart(2, '0');
    $('#stepOf').textContent = '/ 07';
    $('#stepTitle').textContent = T(s.t);
    $('#stepText').textContent = T(s.x);
    $('#stepSpec').textContent = s.s;
  }

  // wird bei jedem Scroll-Update der Timeline aufgerufen
  function update(t, p) {
    state.t = t; state.p = p;
    let kg = 0, pcs = 0;
    STEPS.forEach((s, i) => {
      const f = i === 6 ? clamp((t - sAt(7)) / 1, 0, 1) : clamp((t - sAt(i + 1)) / 1.1, 0, 1);
      kg += s.kg * f; pcs += s.pcs * f;
    });
    kgEl.textContent = fmtKg(kg);
    pcsEl.textContent = Math.round(pcs);
    const step = t < sAt(1) - 0.15 ? 0 : t >= FIN - 0.1 ? 8 : Math.min(7, Math.floor((t - sAt(1) + 0.15) / sd) + 1);
    setStep(step);
    col.classList.toggle('hero-mode', t < 0.7);
    $$('li', checklist).forEach((li, i) => {
      li.classList.toggle('done', t >= sAt(i + 1) + 0.9);
      li.classList.toggle('cur', step === i + 1);
    });
    progI.style.width = (p * 100) + '%';
  }

  // Etiketten folgen den Teilen (auch waehrend des Schwebens)
  function placeTags() {
    if (!state.active) return;
    const sr = stage.getBoundingClientRect();
    if (sr.bottom < 0 || sr.top > innerHeight) return;
    const t = state.t || 0, sc = state.narrow ? 0.55 : 1;
    Object.keys(tagEls).forEach(k => {
      const te = tagEls[k], f = 1 - clamp((t - START[k] + 0.05) / 0.45, 0, 1);
      // Handy: Etiketten erst nach dem Hero, damit der Titel frei bleibt
      const vis = f * (state.narrow ? 0.9 * clamp((t - 0.45) / 0.3, 0, 1) : 1);
      if (vis <= 0.01) { te.d.style.opacity = 0; te.line.setAttribute('opacity', 0); te.dot.setAttribute('opacity', 0); return; }
      const r = B.parts[k].getBoundingClientRect();
      const cx = r.left + r.width / 2 - sr.left, cy = r.top + r.height / 2 - sr.top;
      const o = TAGPOS[k], tx = cx + o[0] * sc, ty = cy + o[1] * sc;
      const w = te.d.offsetWidth, h = te.d.offsetHeight;
      const lx = o[0] < 0 ? tx : tx, ax = clamp(lx - (o[0] < 0 ? w : 0), 6, sr.width - w - 6), ay = clamp(ty - h / 2, state.narrow ? 132 : 70, sr.height - h - 10);
      te.d.style.transform = 'translate(' + ax + 'px,' + ay + 'px)';
      te.d.style.opacity = vis;
      const ex = o[0] < 0 ? ax + w : ax, ey = ay + h / 2;
      te.line.setAttribute('x1', ex); te.line.setAttribute('y1', ey); te.line.setAttribute('x2', cx); te.line.setAttribute('y2', cy);
      te.line.setAttribute('opacity', vis); te.dot.setAttribute('cx', cx); te.dot.setAttribute('cy', cy); te.dot.setAttribute('opacity', vis);
    });
  }

  // sanftes Schweben der losen Teile
  const bobs = Object.keys(B.parts).map((k, i) => ({ k, el: B.parts[k].querySelector('.bob'), ph: i * 1.7, sp: 0.9 + (i % 3) * 0.25 }));
  gsap.ticker.add(time => {
    if (!state.active) return;
    const t = state.t || 0;
    bobs.forEach(b => {
      const f = 1 - clamp((t - START[b.k]) / 0.4, 0, 1);
      b.el.setAttribute('transform', f > 0 ? 'translate(0 ' + r1(Math.sin(time * b.sp + b.ph) * 12 * f) + ') rotate(' + r1(Math.sin(time * b.sp * 0.7 + b.ph) * 1.2 * f) + ')' : '');
    });
    placeTags();
  });

  const mm = gsap.matchMedia();
  mm.add({ wide: '(min-width: 821px)', narrow: '(max-width: 820px)', reduce: '(prefers-reduced-motion: reduce)' }, ctx => {
    const { narrow, reduce } = ctx.conditions;
    state.narrow = narrow;
    if (reduce) {
      // Ohne Bewegung: fertig aufgebautes, lackiertes Bike
      state.active = false;
      gsap.set([B.bp, '#hud', '#checklist', '#progress', '#tags', stepCard], { autoAlpha: 0 });
      gsap.set(B.chainLinks, { opacity: 1 });
      gsap.set(B.shadow, { opacity: 1 });
      B.sw1.setAttribute('offset', 1.1); B.sw2.setAttribute('offset', 1.2);
      return;
    }
    state.active = true;
    const L = EXPLODE[narrow ? 'narrow' : 'wide'];
    Object.keys(L).forEach(k => {
      const v = L[k];
      gsap.set(B.parts[k], { x: v[0], y: v[1], rotation: v[2], scale: v[3], transformOrigin: '50% 50%' });
    });
    gsap.set(B.chainBase, { drawSVG: '0%' });

    const tl = gsap.timeline({
      defaults: { ease: 'power2.inOut' },
      scrollTrigger: {
        trigger: stage, start: 'top top', end: () => '+=' + Math.round(innerHeight * (narrow ? 6 : 6.5)),
        pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true,
      },
      // Anzeige folgt der (nachlaufenden) Animation, nicht der Scrollposition
      onUpdate: () => update(tl.time(), tl.progress()),
    });
    tl.set({}, {}, END);
    // Hero raus, Schrittkarte rein
    tl.to('#heroTxt', { autoAlpha: 0, y: -30, duration: 0.45 }, 0.3);
    tl.fromTo(stepCard, { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.4 }, 0.72);
    if (narrow) tl.fromTo(bikebox, { yPercent: 70 }, { yPercent: 0, duration: 0.7 }, 0.2);
    // Explosionszeichnung startet herausgezoomt und waechst mit jedem Teil
    gsap.set(B.root, { scale: narrow ? 0.86 : 0.78, svgOrigin: '94 -250' });
    tl.to(B.root, { scale: 1, svgOrigin: '94 -250', duration: sAt(6) + 1 - START.rahmen, ease: 'power1.inOut' }, START.rahmen);
    // Teile einbauen
    Object.keys(L).forEach(k => {
      tl.to(B.parts[k], { x: 0, y: 0, rotation: 0, scale: 1, duration: 1, ease: 'power3.inOut' }, START[k]);
      (B.flash[k] || []).forEach(c => tl.fromTo(c, { attr: { r: 14 }, opacity: 0.95 }, { attr: { r: 130 }, opacity: 0, duration: 0.5, ease: 'power1.out', immediateRender: false }, START[k] + 0.95));
    });
    tl.to(B.chainBase, { drawSVG: '100%', duration: 0.7, ease: 'none' }, START.kette);
    tl.to(B.chainLinks, { opacity: 1, duration: 0.3 }, START.kette + 0.6);
    tl.to(B.shadow, { opacity: 1, duration: 0.6 }, START.wheelF + 0.6);
    // 07 Feinschliff: Drehmoment-Haken
    B.checks.forEach((c, i) => tl.fromTo(c, { scale: 0, opacity: 0, transformOrigin: '0px 0px' }, { scale: 1, opacity: 1, duration: 0.22, ease: 'back.out(2.2)', immediateRender: true }, sAt(7) + 0.1 + i * 0.13));
    // Finale: Lack, Glanz, drehende Raeder
    tl.to(B.checks, { opacity: 0, duration: 0.3 }, FIN);
    tl.to(stepCard, { autoAlpha: 0, y: -20, duration: 0.35 }, FIN - 0.15);
    tl.to(['#checklist', '#tags'], { autoAlpha: 0, duration: 0.4 }, FIN);
    tl.to(B.bp, { opacity: 0, duration: 0.8 }, FIN);
    tl.to('#spot', { opacity: 1, duration: 1 }, FIN);
    const paint = { p: -0.1 };
    tl.to(paint, { p: 1.1, duration: 1.3, ease: 'power1.inOut', onUpdate: () => { B.sw1.setAttribute('offset', paint.p); B.sw2.setAttribute('offset', paint.p + 0.08); } }, FIN + 0.1);
    tl.fromTo(B.glint, { attr: { x: -900 } }, { attr: { x: 1100 }, duration: 0.9, ease: 'power1.inOut' }, FIN + 1.2);
    tl.to(B.spinR, { rotation: 540, svgOrigin: G.R.join(' '), duration: 2.4, ease: 'power1.in' }, FIN);
    tl.to(B.spinF, { rotation: 540, svgOrigin: G.F.join(' '), duration: 2.4, ease: 'power1.in' }, FIN);
    tl.fromTo('#finTxt', { autoAlpha: 0, y: 30 }, { autoAlpha: 1, y: 0, duration: 0.6 }, FIN + 0.7);
    tl.to('#hud', { autoAlpha: 0.5, duration: 0.4 }, FIN + 0.5);

    update(0, 0);
    return () => { state.active = false; };
  });

  // Lichtkegel folgt der Maus
  stage.addEventListener('pointermove', e => {
    const r = stage.getBoundingClientRect();
    stage.style.setProperty('--mx', ((e.clientX - r.left) / r.width * 100) + '%');
    stage.style.setProperty('--my', ((e.clientY - r.top) / r.height * 100) + '%');
  });

  /* =====================================================================
     3) SEKTIONEN
     ===================================================================== */

  /* ---- Header: ein-/ausblenden ---- */
  const hdr = $('#hdr');
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate: self => {
      const y = self.scroll();
      hdr.classList.toggle('solid', y > 60);
      hdr.classList.toggle('hide', self.direction === 1 && y > 300 && !$('#mmenu').classList.contains('on'));
    },
  });
  $('.burger').addEventListener('click', () => $('#mmenu').classList.add('on'));
  $('.mclose').addEventListener('click', () => $('#mmenu').classList.remove('on'));
  $$('#mmenu a').forEach(a => a.addEventListener('click', () => $('#mmenu').classList.remove('on')));

  /* ---- Einblenden beim Reinscrollen ---- */
  if (!RP.reducedMotion) {
    ScrollTrigger.batch('.rv', { start: 'top 88%', onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }) });
  } else {
    gsap.set('.rv', { opacity: 1, y: 0 });
  }

  /* ---- Achim: Foto oeffnet sich, Zitat leuchtet Wort fuer Wort auf ---- */
  if (!RP.reducedMotion) {
    gsap.to('#achimFig', { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: '#achimFig', start: 'top 90%', end: 'top 25%', scrub: true } });
    gsap.to('#achimFig img', { scale: 1, ease: 'none', scrollTrigger: { trigger: '#achimFig', start: 'top 90%', end: 'bottom 20%', scrub: true } });
  } else {
    gsap.set('#achimFig', { clipPath: 'none' });
  }
  let quoteFx = null;
  const quoteEl = $('#quote');
  // deutschen Originaltext sichern, bevor SplitText das Markup zerlegt (rp-core uebersetzt daraus)
  if (quoteEl.dataset.i18nDe == null) quoteEl.dataset.i18nDe = quoteEl.innerHTML;
  function initQuote() {
    // nach Sprachwechsel steht schon der neue Text im Element – nur neu zerlegen, nicht zuruecksetzen
    if (quoteFx) quoteFx.st.kill();
    const split = new SplitText(quoteEl, { type: 'words', wordsClass: 'wd' });
    if (RP.reducedMotion) { gsap.set(split.words, { opacity: 1 }); quoteFx = { st: { kill() {} }, split }; return; }
    const tw = gsap.to(split.words, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: '#quote', start: 'top 80%', end: 'bottom 40%', scrub: true } });
    quoteFx = { st: tw.scrollTrigger, split };
  }
  initQuote();

  /* ---- Zaehler ---- */
  function fmtCount(n) { return Math.round(n).toLocaleString(RP.lang === 'en' ? 'en-GB' : RP.lang + '-BE'); }
  $$('[data-count]').forEach(el => {
    const to = +el.dataset.count, suf = el.dataset.suffix || '';
    const o = { v: 0 };
    const set = () => { el.textContent = fmtCount(o.v) + (suf ? ({ de: ' Mio.', fr: ' mio', nl: ' mln', en: 'M' }[RP.lang] || suf) : ''); };
    ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.8, ease: 'power2.out', onUpdate: set }) });
    RP.onLang(() => set());
  });

  /* ---- Kategorien mit Mini-Bikes ---- */
  const CATS = [
    { k: 'rennrad', t: { de: 'Asphalt, Tempo, Sonntagsrunde.', fr: 'Asphalte, vitesse, sortie du dimanche.', nl: 'Asfalt, tempo, zondagsrit.', en: 'Tarmac, speed, Sunday spin.' }, q: { de: 'Ich suche ein Rennrad', fr: 'Je cherche un vélo de route', nl: 'Ik zoek een racefiets', en: 'I’m looking for a road bike' } },
    { k: 'gravel', t: { de: 'Schotter im Hohen Venn, Abenteuer in den Ardennen.', fr: 'Gravier dans les Hautes Fagnes, aventure dans les Ardennes.', nl: 'Grind in de Hoge Venen, avontuur in de Ardennen.', en: 'Gravel in the High Fens, adventure in the Ardennes.' }, q: { de: 'Ich suche ein Gravelbike', fr: 'Je cherche un gravel', nl: 'Ik zoek een gravelfiets', en: 'I’m looking for a gravel bike' } },
    { k: 'mtb', t: { de: 'Trails in der Eifel – vom Hardtail bis Enduro.', fr: 'Sentiers de l’Eifel – du semi-rigide à l’enduro.', nl: 'Trails in de Eifel – van hardtail tot enduro.', en: 'Eifel trails – from hardtail to enduro.' }, q: { de: 'Ich suche ein Mountainbike', fr: 'Je cherche un VTT', nl: 'Ik zoek een mountainbike', en: 'I’m looking for a mountain bike' } },
    { k: 'ebike', t: { de: 'Mehr Berge, gleiches Lächeln. Für Alltag und Trail.', fr: 'Plus de côtes, le même sourire. Pour le quotidien et les sentiers.', nl: 'Meer bergen, dezelfde glimlach. Voor alledag en trail.', en: 'More climbs, same smile. For everyday and trail.' }, q: { de: 'Ich suche ein E-Bike', fr: 'Je cherche un vélo électrique', nl: 'Ik zoek een e-bike', en: 'I’m looking for an e-bike' } },
    { k: 'alltag', t: { de: 'Pendeln, Einkaufen, Wochenende.', fr: 'Trajets, courses, week-end.', nl: 'Pendelen, boodschappen, weekend.', en: 'Commute, shopping, weekend.' }, q: { de: 'Ich suche ein Rad für Stadt und Alltag', fr: 'Je cherche un vélo pour la ville', nl: 'Ik zoek een fiets voor de stad', en: 'I’m looking for a city bike' } },
    { k: 'kids', t: { de: 'Das erste richtige Rad – mit Beratung, die mitwächst.', fr: 'Le premier vrai vélo – avec des conseils qui grandissent avec eux.', nl: 'De eerste echte fiets – met advies dat meegroeit.', en: 'The first real bike – with advice that grows with them.' }, q: { de: 'Ich suche ein Kinderrad', fr: 'Je cherche un vélo pour enfant', nl: 'Ik zoek een kinderfiets', en: 'I’m looking for a kids’ bike' } },
  ];
  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
  function renderCats() {
    const K = window.KIBerater;
    $('#cats').innerHTML = CATS.map(c => {
      const cat = K && K.CATS[c.k];
      return '<button class="cat rv" style="--c:' + (cat ? cat.color : '#E83637') + '" data-ask="' + T(c.q).replace(/"/g, '&quot;') + '"><span class="go">' + arrow + '</span>' +
        '<div class="art">' + (K ? K.bikeSVG(c.k) : '') + '</div><div><h3>' + (cat ? T(cat.label) : c.k) + '</h3><p>' + T(c.t) + '</p></div></button>';
    }).join('');
    $$('#cats .cat').forEach(el => {
      if (RP.reducedMotion) { el.style.opacity = 1; el.style.transform = 'none'; return; }
      const rx = gsap.quickTo(el, 'rotationX', { duration: 0.6, ease: 'power3' }), ry = gsap.quickTo(el, 'rotationY', { duration: 0.6, ease: 'power3' });
      el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); ry(((e.clientX - r.left) / r.width - 0.5) * 10); rx(-((e.clientY - r.top) / r.height - 0.5) * 10); });
      el.addEventListener('pointerleave', () => { rx(0); ry(0); });
    });
    gsap.set('#cats', { perspective: 900 });
    if (!RP.reducedMotion) ScrollTrigger.batch('#cats .rv', { start: 'top 90%', onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out' }) });
  }
  renderCats();

  /* ---- Builds: horizontaler Scroll ---- */
  const BUILDS = [
    ['9KIh7oOIPT4', 'S-Works Tarmac SL8 LTD', [['Typ', 'Unboxing · Limited'], ['Gruppe', 'SRAM Red AXS'], ['LRS', 'Roval Rapide CLX']]],
    ['MHXDMPbMypQ', 'Tarmac SL7 S-Works', [['Typ', 'Dreambuild'], ['Gruppe', 'SRAM Red AXS'], ['LRS', 'Roval Rapide CLX']]],
    ['vV_rL9yq620', 'S-Works Aethos', [['Typ', 'Bike Ahead'], ['Gruppe', 'SRAM Red AXS'], ['Gewicht', '6,1 kg']]],
    ['5TcRRpUy5T4', 'Cervélo S5', [['Typ', 'Bike Build'], ['Gruppe', 'Dura-Ace 12s'], ['LRS', 'Princeton']]],
    ['cIBBbESSOoc', 'S-Works Crux', [['Typ', 'Gravel'], ['Gruppe', 'SRAM XPLR'], ['Gewicht', '7,25 kg']]],
    ['WHggv7Jye4M', 'S-Works Shiv', [['Typ', 'Triathlon'], ['Gruppe', 'Dura-Ace'], ['Aero', 'integriert']]],
  ];
  const SPEC_L = {
    Typ: { de: 'Typ', fr: 'Type', nl: 'Type', en: 'Type' }, Gruppe: { de: 'Gruppe', fr: 'Groupe', nl: 'Groep', en: 'Groupset' },
    LRS: { de: 'LRS', fr: 'Roues', nl: 'Wielen', en: 'Wheels' }, Gewicht: { de: 'Gewicht', fr: 'Poids', nl: 'Gewicht', en: 'Weight' }, Aero: { de: 'Aero', fr: 'Aéro', nl: 'Aero', en: 'Aero' },
  };
  const FALL = ['assets/roadbike-shop.jpg', 'assets/shop-interior.jpg', 'assets/achim-team.jpg', 'assets/teaser-poster.jpg', 'assets/gravel-ride.jpg', 'assets/achim-ride.jpg'];
  const track = $('#htrack');
  function renderBuilds() {
    track.innerHTML = BUILDS.map((b, i) => '<article class="bcard" data-video="' + b[0] + '">' + RP.ytThumb(b[0], FALL[i]) +
      '<span class="no">' + String(i + 1).padStart(2, '0') + '</span><span class="play"><svg viewBox="0 0 24 24"><path fill="#fff" d="M8 5v14l11-7z"/></svg></span>' +
      '<div class="meta"><h3>' + b[1] + '</h3><dl>' + b[2].map(r => '<dt>' + T(SPEC_L[r[0]] || r[0]) + '</dt><dd>' + r[1] + '</dd>').join('') + '</dl></div></article>').join('') +
      '<article class="bcard end" data-ask="' + T({ de: 'Kann ich mir mein eigenes Traumrad aufbauen lassen?', fr: 'Puis-je faire monter mon propre vélo de rêve ?', nl: 'Kan ik mijn eigen droomfiets laten bouwen?', en: 'Can you build my own dream bike?' }) + '"><h3 class="h-xl">' +
      T({ de: 'Dein Build ist der nächste.', fr: 'Ton build est le prochain.', nl: 'Jouw build is de volgende.', en: 'Your build is next.' }) + '</h3><p>' +
      T({ de: 'Erzähl Achims KI-Berater, was dein Traumrad können soll – Achim meldet sich persönlich.', fr: 'Dis au conseiller IA d’Achim ce que doit faire ton vélo de rêve – Achim te recontacte personnellement.', nl: 'Vertel Achims AI-adviseur wat je droomfiets moet kunnen – Achim neemt persoonlijk contact op.', en: 'Tell Achim’s AI advisor what your dream bike should do – Achim gets back to you personally.' }) +
      '</p><span class="btn" style="align-self:flex-start;background:#0e0f11">' + T({ de: 'Build planen', fr: 'Planifier', nl: 'Build plannen', en: 'Plan my build' }) + ' ' + arrow + '</span></article>';
  }
  renderBuilds();
  let hTween = null;
  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const dist = () => Math.max(0, track.scrollWidth - innerWidth);
    hTween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '#hwrap', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.8, invalidateOnRefresh: true, onUpdate: s => { $('#hbar').style.width = (s.progress * 100) + '%'; } },
    });
    $$('.bcard img', track).forEach(img => gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.parentNode, containerAnimation: hTween, start: 'left right', end: 'right left', scrub: true } }));
    return () => { hTween = null; };
  });

  /* ---- Marken-Laufband reagiert auf Scroll-Tempo ---- */
  if (!RP.reducedMotion) {
    const skew = gsap.quickTo('.marq div', 'skewX', { duration: 0.5, ease: 'power3' });
    ScrollTrigger.create({ trigger: '#werkstatt', start: 'top bottom', end: 'bottom top', onUpdate: self => skew(clamp(self.getVelocity() / -260, -10, 10)) });
  }

  /* ---- Besuch: Parallax + Oeffnungszeiten ---- */
  if (!RP.reducedMotion) gsap.to('#visitBg', { yPercent: 10, ease: 'none', scrollTrigger: { trigger: '.visit', start: 'top bottom', end: 'bottom top', scrub: true } });
  function renderHours() {
    $('#hours').innerHTML = RP.hoursRows().map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day + '</span><span>' + r.text + '</span></li>').join('');
  }
  renderHours();

  /* =====================================================================
     RETUEL-MOTION-CAPTURE (laeuft nur im sichtbaren Bereich)
     ===================================================================== */
  const mocap = $('#mocap');
  const ms = S('svg', { viewBox: '-800 -1380 1800 1700' });
  mocap.insertBefore(ms, mocap.firstChild);
  const mb = S('g', { fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ms);
  S('circle', { cx: G.R[0], cy: G.R[1], r: 336 }, mb); S('circle', { cx: G.F[0], cy: G.F[1], r: 336 }, mb);
  S('path', { d: 'M' + G.R + ' L0,0 L' + G.ST + ' L' + G.TTh + ' L' + G.HTb + ' L0,0 M' + G.R + ' L-122,-398 M' + G.HTb + ' L' + G.F + ' M' + G.HTt + ' L387,-598 L500,-610 M494,-608 L560,-608 C598,-608 614,-580 608,-548 C602,-512 574,-494 536,-492' }, mb);
  S('path', { d: 'M-334,-704 C-326,-728 -264,-730 -200,-720 C-150,-712 -110,-708 -76,-710 M-148,-500 L-202,-684' }, mb);
  const crankC = S('circle', { cx: 0, cy: 0, r: 172, stroke: 'rgba(255,255,255,.1)', 'stroke-dasharray': '6 10' }, mb);
  void crankC;
  const trail = S('polyline', { fill: 'none', stroke: 'rgba(232,54,55,.35)', 'stroke-width': 5, 'stroke-linecap': 'round' }, ms);
  const bones = S('path', { fill: 'none', stroke: '#E83637', 'stroke-width': 12, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, ms);
  const head = S('circle', { r: 88, fill: 'none', stroke: 'rgba(255,255,255,.5)', 'stroke-width': 6 }, ms);
  const kneeArc = S('path', { fill: 'none', stroke: '#86efac', 'stroke-width': 6 }, ms);
  const kneeTxt = S('text', { fill: '#86efac', 'font-family': 'Roboto Mono, monospace', 'font-size': 58 }, ms);
  const crankLine = S('line', { stroke: '#9aa0a8', 'stroke-width': 14, 'stroke-linecap': 'round' }, ms);
  const joints = ['sh', 'el', 'wr', 'hip', 'kn', 'an', 'he', 'to'].reduce((o, k) => {
    const gj = S('g', {}, ms);
    S('circle', { r: 30, fill: 'rgba(232,54,55,.18)', stroke: 'rgba(232,54,55,.6)', 'stroke-width': 3 }, gj);
    S('circle', { r: 13, fill: '#fff' }, gj);
    o[k] = gj; return o;
  }, {});
  const reads = $('#readouts');
  const RD = {
    knee: { de: 'Knie aktuell', fr: 'Genou actuel', nl: 'Knie nu', en: 'Knee now' },
    kmax: { de: 'Knie max', fr: 'Genou max', nl: 'Knie max', en: 'Knee max' },
    hip: { de: 'Hüfte', fr: 'Hanche', nl: 'Heup', en: 'Hip' },
    back: { de: 'Rücken', fr: 'Dos', nl: 'Rug', en: 'Back' },
    cad: { de: 'Kadenz', fr: 'Cadence', nl: 'Cadans', en: 'Cadence' },
  };
  reads.innerHTML = '<div data-r="knee"></div><div class="ok" data-r="kmax"></div><div data-r="hip"></div><div data-r="back"></div><div data-r="cad"></div>';
  const H = [-215, -792], L1 = 468, L2 = 468, SH = [210, -1122], HAND = [612, -648], U1 = 322, U2 = 312;
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]);
  const deg = r => r * 180 / Math.PI;
  function ik(A, B, l1, l2, pickLow) {
    const v = sub(B, A), d = Math.min(len(v), l1 + l2 - 0.01), base = Math.atan2(v[1], v[0]);
    const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = [A[0] + l1 * Math.cos(base + off), A[1] + l1 * Math.sin(base + off)], c2 = [A[0] + l1 * Math.cos(base - off), A[1] + l1 * Math.sin(base - off)];
    const j = pickLow ? (c1[1] > c2[1] ? c1 : c2) : (c1[0] > c2[0] ? c1 : c2);
    return { j, ang: deg(Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1))) };
  }
  const angBetween = (o, a, b) => { const u = sub(a, o), v = sub(b, o); return deg(Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v)), -1, 1))); };
  let mcTheta = 0, mcLast = 0, mcOn = false, kneeMax = 0, kneeMaxShown = 144, trailPts = [];
  function mcFrame(now) {
    if (!mcOn) return;
    const dt = Math.min(0.05, (now - (mcLast || now)) / 1000); mcLast = now;
    mcTheta += dt * Math.PI * 2 * (78 / 60);
    const th = mcTheta % (Math.PI * 2);
    const P = [172.5 * Math.cos(th), 172.5 * Math.sin(th)];
    const A = [P[0] - 95 + 15 * Math.sin(th), P[1] - 75];
    const leg = ik(H, A, L1, L2, false), K = leg.j;
    const arm = ik(SH, HAND, U1, U2, true), E = arm.j;
    const heel = [A[0] - 62, A[1] + 12], toe = [P[0] + 62, P[1] + 6];
    bones.setAttribute('d', 'M' + HAND + ' L' + E + ' L' + SH + ' L' + H + ' L' + K + ' L' + A + ' L' + heel + ' L' + toe + ' L' + A);
    head.setAttribute('cx', SH[0] + 96); head.setAttribute('cy', SH[1] - 118);
    crankLine.setAttribute('x1', 0); crankLine.setAttribute('y1', 0); crankLine.setAttribute('x2', r1(P[0])); crankLine.setAttribute('y2', r1(P[1]));
    const pos = { sh: SH, el: E, wr: HAND, hip: H, kn: K, an: A, he: heel, to: toe };
    Object.keys(pos).forEach(k => joints[k].setAttribute('transform', 'translate(' + r1(pos[k][0]) + ' ' + r1(pos[k][1]) + ')'));
    trailPts.push(r1(K[0]) + ',' + r1(K[1])); if (trailPts.length > 46) trailPts.shift();
    trail.setAttribute('points', trailPts.join(' '));
    // Kniewinkel-Bogen
    const a1 = Math.atan2(H[1] - K[1], H[0] - K[0]), a2 = Math.atan2(A[1] - K[1], A[0] - K[0]), rr = 90;
    kneeArc.setAttribute('d', 'M' + r1(K[0] + rr * Math.cos(a1)) + ',' + r1(K[1] + rr * Math.sin(a1)) + ' A' + rr + ',' + rr + ' 0 0 1 ' + r1(K[0] + rr * Math.cos(a2)) + ',' + r1(K[1] + rr * Math.sin(a2)));
    kneeTxt.setAttribute('x', r1(K[0] + 110)); kneeTxt.setAttribute('y', r1(K[1] + 20)); kneeTxt.textContent = Math.round(leg.ang) + '°';
    kneeMax = Math.max(kneeMax, leg.ang);
    if (th < dt * 9) { kneeMaxShown = kneeMax; kneeMax = 0; }
    const hip = angBetween(H, SH, K), back = deg(Math.atan2(H[1] - SH[1], SH[0] - H[0]));
    const row = (k, v) => { reads.querySelector('[data-r="' + k + '"]').innerHTML = T(RD[k]) + '<b>' + v + '</b>'; };
    row('knee', Math.round(leg.ang) + '°'); row('kmax', Math.round(kneeMaxShown) + '° ✓'); row('hip', Math.round(hip) + '°'); row('back', Math.round(back) + '°'); row('cad', '78 rpm');
    requestAnimationFrame(mcFrame);
  }
  new IntersectionObserver(es => {
    es.forEach(e => {
      const on = e.isIntersecting && !RP.reducedMotion;
      if (on && !mcOn) { mcOn = true; mcLast = 0; requestAnimationFrame(mcFrame); }
      if (!on) mcOn = false;
    });
  }).observe(mocap);
  if (RP.reducedMotion) { mcOn = true; mcFrame(performance.now()); mcOn = false; }

  /* ---------------- Sprachwechsel ---------------- */
  renderTexts();
  RP.onLang(() => {
    renderTexts(); renderHours(); renderCats(); renderBuilds();
    initQuote();
    ScrollTrigger.refresh();
  });
  window.addEventListener('load', () => ScrollTrigger.refresh());
})();
