/* =====================================================================
   RACEPOINT · 17 · BEST OF — Retül-Motion-Capture (THROWAWAY)
   Basis: Mocap aus Prototyp 8 (assets/v8/aufbau.js, IK fuer Bein und Arm),
   hier als eigene, reichere Szene:
   - Fahrer:in tritt in Echtzeit (rAF), 8 LED-Marker (Handgelenk, Ellbogen,
     Schulter, Huefte, Knie, Knoechel, Ferse, Fussspitze) mit Skelett
   - Live-Werte: Kniewinkel (Streckung mit Zielbereich), Hueftwinkel,
     Sattelhoehe, Kadenz + Kniewinkel-Kurve
   - Scroll (gepinnt) steuert 4 Phasen: Marker setzen -> Messen (Sattel zu
     tief) -> Anpassen (Sattel faehrt hoch) -> „Sitzposition optimiert“
     mit Vorher-Geist und Vorher/Nachher-Werten
   - prefers-reduced-motion: kein Pinning, Endzustand als Standbild
   Benoetigt gsap + ScrollTrigger, window.RP17Site (assets/v17/site.js)
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const sec = $('#retul');
  if (!sec) return;
  const RM = !!(window.RP && RP.reducedMotion);
  const NS = 'http://www.w3.org/2000/svg';
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const r1 = n => Math.round(n * 10) / 10;
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  function S(tag, attrs, parent) {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }

  // verjuengte Kapsel von a (Radius ra) nach b (Radius rb) – Gliedmassen mit Volumen
  function capsule(a, b, ra, rb) {
    const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const s = clamp((ra - rb) / L, -0.95, 0.95), c = Math.sqrt(1 - s * s);
    // Tangentenpunkte der beiden Kreise
    const t = (p, r, sg) => [p[0] + r * (nx * c * sg + ux * s), p[1] + r * (ny * c * sg + uy * s)];
    const a1 = t(a, ra, 1), b1 = t(b, rb, 1), b2 = t(b, rb, -1), a2 = t(a, ra, -1);
    const f = v => r1(v[0]) + ',' + r1(v[1]);
    return 'M' + f(a1) + ' L' + f(b1) + ' A' + r1(rb) + ',' + r1(rb) + ' 0 ' + (s > 0 ? 0 : 1) + ' 0 ' + f(b2) + ' L' + f(a2) + ' A' + r1(ra) + ',' + r1(ra) + ' 0 ' + (s > 0 ? 1 : 0) + ' 0 ' + f(a1) + 'Z';
  }

  /* ---------------- Geometrie (mm, Tretlager = Ursprung, y nach unten) ---------------- */
  const G = { R: [-404, -72], F: [593, -72], ST: [-148, -500], HTt: [395, -572], HTb: [441, -414], TTs: [-138, -466], TTh: [390, -548] };
  const WR = 336, CRANK = 172.5, FLOOR = WR - 72;
  const H0 = [-215, -792];                 // Huefte bei optimaler Sattelhoehe
  const U = [148 / 521.45, 500 / 521.45];  // Richtung Sitzrohr nach unten
  const DELTA = 30;                        // Sattel „vorher“ 30 mm zu tief
  const SH_OFF = [425, -330], HAND = [612, -648], L1 = 468, L2 = 468, U1 = 322, U2 = 312;
  const SADDLE_MM = 742;                   // angezeigte Sattelhoehe nachher (Beispielwert)
  const ZONE = [140, 150], SCALE = [120, 165];
  const CAD = 85;

  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]], len = v => Math.hypot(v[0], v[1]);
  const deg = r => r * 180 / Math.PI;
  function ik(A, B, l1, l2, pickLow) {
    const v = sub(B, A), d = Math.min(len(v), l1 + l2 - 0.01), base = Math.atan2(v[1], v[0]);
    const off = Math.acos(clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1));
    const c1 = [A[0] + l1 * Math.cos(base + off), A[1] + l1 * Math.sin(base + off)], c2 = [A[0] + l1 * Math.cos(base - off), A[1] + l1 * Math.sin(base - off)];
    const j = pickLow ? (c1[1] > c2[1] ? c1 : c2) : (c1[0] > c2[0] ? c1 : c2);
    return { j, ang: deg(Math.acos(clamp((l1 * l1 + l2 * l2 - d * d) / (2 * l1 * l2), -1, 1))) };
  }
  const angAt = (o, a, b) => { const u = sub(a, o), v = sub(b, o); return deg(Math.acos(clamp((u[0] * v[0] + u[1] * v[1]) / (len(u) * len(v)), -1, 1))); };
  // komplette Pose fuer Kurbelwinkel th und Sattel-Absenkung d
  function pose(th, d) {
    const H = [H0[0] + U[0] * d, H0[1] + U[1] * d];
    const SH = [H[0] + SH_OFF[0], H[1] + SH_OFF[1] + d * 0.25];
    const P = [CRANK * Math.cos(th), CRANK * Math.sin(th)];
    const A = [P[0] - 95 + 15 * Math.sin(th), P[1] - 75];
    const leg = ik(H, A, L1, L2, false), K = leg.j;
    const arm = ik(SH, HAND, U1, U2, true), E = arm.j;
    const heel = [A[0] - 62, A[1] + 12], toe = [P[0] + 62, P[1] + 6];
    return { H, SH, P, A, K, E, W: HAND, heel, toe, knee: leg.ang, hip: angAt(H, SH, K) };
  }
  // Kennwerte eines ganzen Kurbelumlaufs
  function cycle(d) {
    let kmax = 0, kmin = 180, hmin = 180;
    for (let i = 0; i < 72; i++) { const q = pose(i / 72 * Math.PI * 2, d); kmax = Math.max(kmax, q.knee); kmin = Math.min(kmin, q.knee); hmin = Math.min(hmin, q.hip); }
    return { kmax, kmin, hmin };
  }
  const BEFORE = cycle(DELTA), AFTER = cycle(0);

  /* ---------------- SVG-Szene ---------------- */
  const stage = $('#rtStage');
  const svg = S('svg', { viewBox: '-770 -1360 1760 1650', preserveAspectRatio: 'xMidYMid meet', role: 'img', 'aria-label': 'Animierte Retül-Messung: Fahrer mit Markern an den Gelenken, Kniewinkel und Sattelhöhe werden live gemessen' }, stage);
  S('defs', {}, svg).innerHTML =
    '<radialGradient id="rtGlow"><stop offset="0" stop-color="#E83637" stop-opacity=".9"/><stop offset="1" stop-color="#E83637" stop-opacity="0"/></radialGradient>' +
    '<radialGradient id="rtShadow"><stop offset="0" stop-color="#000" stop-opacity=".7"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>' +
    '<linearGradient id="rtBody" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3a3b44"/><stop offset=".55" stop-color="#24252b"/><stop offset="1" stop-color="#17181c"/></linearGradient>' +
    '<linearGradient id="rtFar" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1c1d22"/><stop offset="1" stop-color="#101114"/></linearGradient>' +
    '<linearGradient id="rtShoe" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#c9c5bd"/></linearGradient>' +
    '<linearGradient id="rtScan" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E83637" stop-opacity="0"/><stop offset=".5" stop-color="#E83637" stop-opacity=".55"/><stop offset="1" stop-color="#E83637" stop-opacity="0"/></linearGradient>';

  // Boden + Schatten + Messraster
  S('ellipse', { cx: 90, cy: FLOOR + 6, rx: 900, ry: 46, fill: 'url(#rtShadow)' }, svg);
  S('line', { x1: -780, y1: FLOOR, x2: 1000, y2: FLOOR, stroke: 'rgba(255,255,255,.14)', 'stroke-width': 3 }, svg);
  const ticks = S('g', { stroke: 'rgba(255,255,255,.12)', 'stroke-width': 2 }, svg);
  for (let x = -760; x <= 980; x += 40) S('line', { x1: x, y1: FLOOR, x2: x, y2: FLOOR + (x % 200 === 0 ? 22 : 10) }, ticks);

  // ferne Koerperseite (hinter dem Rad)
  const far = S('g', { fill: 'url(#rtFar)', stroke: 'rgba(255,255,255,.04)', 'stroke-width': 3 }, svg);
  const farThigh = S('path', {}, far), farShin = S('path', {}, far), farFoot = S('path', { fill: '#3b3a37' }, far);
  const farCrank = S('line', { stroke: '#3a3d44', 'stroke-width': 16, 'stroke-linecap': 'round' }, svg);

  // Rad
  const bike = S('g', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }, svg);
  const wheel = c => {
    S('circle', { cx: c[0], cy: c[1], r: WR - 12, stroke: '#17181c', 'stroke-width': 26 }, bike);
    S('circle', { cx: c[0], cy: c[1], r: WR - 12, stroke: 'rgba(255,255,255,.08)', 'stroke-width': 2 }, bike);
    S('circle', { cx: c[0], cy: c[1], r: WR - 44, stroke: '#2a2c32', 'stroke-width': 34 }, bike);
    S('circle', { cx: c[0], cy: c[1], r: WR - 62, stroke: 'rgba(255,255,255,.1)', 'stroke-width': 2 }, bike);
    const sp = S('g', { stroke: 'rgba(200,205,214,.22)', 'stroke-width': 2.5 }, bike);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; S('line', { x1: c[0] + 18 * Math.cos(a + 0.4), y1: c[1] + 18 * Math.sin(a + 0.4), x2: c[0] + (WR - 62) * Math.cos(a), y2: c[1] + (WR - 62) * Math.sin(a) }, sp); }
    S('circle', { cx: c[0], cy: c[1], r: 22, fill: '#3a3d44', stroke: 'none' }, bike);
  };
  wheel(G.R); wheel(G.F);
  const tube = (a, b, w, col) => S('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: col || '#2b2d34', 'stroke-width': w }, bike);
  tube([-14, 4], [-396, -70], 24); tube([-396, -76], [-122, -398], 16); tube([0, -6], G.ST, 36); tube(G.TTs, G.TTh, 30); tube([6, -26], [430, -436], 50); tube(G.HTt, G.HTb, 48);
  tube([441, -414], G.F, 26);
  // Glanzlinien
  [[[-6, -40], [-136, -466]], [[-120, -470], [380, -552]], [[30, -60], [410, -440]]].forEach(l => S('line', { x1: l[0][0], y1: l[0][1], x2: l[1][0], y2: l[1][1], stroke: 'rgba(255,255,255,.12)', 'stroke-width': 4 }, bike));
  S('path', { d: 'M395,-572 L387,-610 L500,-622 M494,-620 L560,-620 C598,-620 614,-592 608,-560 C602,-524 574,-506 536,-504', stroke: '#26282e', 'stroke-width': 22 }, bike);
  S('circle', { cx: 0, cy: 0, r: 100, stroke: '#3a3d44', 'stroke-width': 10 }, bike);
  // Sattelstuetze + Sattel (fahren mit der Sattelhoehe)
  const seat = S('g', {}, bike);
  S('line', { x1: -148, y1: -500, x2: -202, y2: -690, stroke: '#9aa0a8', 'stroke-width': 20 }, seat);
  S('path', { d: 'M-334,-704 C-326,-730 -264,-732 -200,-722 C-150,-714 -110,-710 -76,-712 L-80,-694 C-150,-694 -260,-690 -334,-704 Z', fill: '#16171b', stroke: '#2f3138', 'stroke-width': 4 }, seat);
  const seatCall = S('g', { opacity: 0 }, svg);
  const callLine = S('path', { stroke: '#86efac', 'stroke-width': 4, fill: 'none', 'stroke-dasharray': '10 8' }, seatCall);
  const callArrow = S('path', { fill: '#86efac' }, seatCall);
  const callTxt = S('text', { fill: '#86efac', 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 800, 'font-style': 'italic', 'font-size': 64 }, seatCall);

  // Geist „vorher“ (gestrichelt)
  const ghost = S('g', { opacity: 0, fill: 'none', stroke: '#fbbf24', 'stroke-width': 7, 'stroke-dasharray': '16 12', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const ghostBones = S('path', {}, ghost);
  const ghostHead = S('circle', { r: 70 }, ghost);
  const ghostSeat = S('path', { 'stroke-dasharray': 'none', 'stroke-width': 4, opacity: 0.8 }, ghost);

  // nahe Koerperseite (Silhouette)
  const body = S('g', { fill: 'url(#rtBody)', stroke: 'rgba(255,255,255,.08)', 'stroke-width': 3, 'stroke-linejoin': 'round' }, svg);
  const thigh = S('path', {}, body), shin = S('path', {}, body);
  const sock = S('path', { fill: '#e9e6df', stroke: 'none' }, body);
  const shoe = S('path', { fill: 'url(#rtShoe)', stroke: 'none' }, body);
  const torso = S('path', {}, body), neck = S('path', {}, body);
  const stripe = S('path', { fill: 'none', stroke: '#E83637', 'stroke-width': 12, 'stroke-linecap': 'round' }, body);
  const face = S('circle', { r: 56 }, body);
  const helmet = S('path', { fill: '#E83637', stroke: 'rgba(0,0,0,.25)' }, body);
  const visor = S('path', { fill: '#0b0b0d', stroke: 'none' }, body);
  const uArm = S('path', {}, body), fArm = S('path', {}, body);
  const hand = S('circle', { r: 24, fill: '#1c1d22' }, body);
  const crankLine = S('line', { stroke: '#a7adb6', 'stroke-width': 18, 'stroke-linecap': 'round' }, svg);
  const pedal = S('rect', { width: 90, height: 18, rx: 6, fill: '#55595f' }, svg);

  // Messung
  const scan = S('rect', { x: -800, y: -1390, width: 1820, height: 140, fill: 'url(#rtScan)', opacity: 0 }, svg);
  const trail = S('polyline', { fill: 'none', stroke: 'rgba(232,54,55,.45)', 'stroke-width': 6, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const atrail = S('polyline', { fill: 'none', stroke: 'rgba(255,255,255,.18)', 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
  const bones = S('path', { fill: 'none', stroke: '#E83637', 'stroke-width': 9, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, svg);
  const kneeArc = S('path', { fill: 'none', stroke: '#86efac', 'stroke-width': 7 }, svg);
  const kneeTxt = S('text', { fill: '#86efac', 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 800, 'font-style': 'italic', 'font-size': 68 }, svg);
  const hipArc = S('path', { fill: 'none', stroke: '#93c5fd', 'stroke-width': 6 }, svg);
  const hipTxt = S('text', { fill: '#93c5fd', 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 800, 'font-style': 'italic', 'font-size': 56, 'text-anchor': 'end' }, svg);
  const MK = [['wr', 'Handgelenk'], ['el', 'Ellbogen'], ['sh', 'Schulter'], ['hip', 'Hüfte'], ['kn', 'Knie'], ['an', 'Knöchel'], ['he', 'Ferse'], ['to', 'Fußspitze']];
  const marks = {};
  MK.forEach(([k, label], i) => {
    const g = S('g', { opacity: 0 }, svg);
    S('circle', { r: 46, fill: 'url(#rtGlow)', opacity: 0.55 }, g);
    S('circle', { r: 24, fill: 'rgba(232,54,55,.2)', stroke: 'rgba(255,255,255,.7)', 'stroke-width': 3 }, g);
    S('circle', { r: 11, fill: '#fff' }, g);
    const lab = S('g', { opacity: 0 }, g);
    const left = k === 'he' || k === 'hip';
    S('line', { x1: left ? -30 : 30, y1: -30, x2: left ? -80 : 80, y2: -80, stroke: 'rgba(255,255,255,.5)', 'stroke-width': 3 }, lab);
    const t = S('text', { x: left ? -88 : 88, y: -88, fill: '#fff', 'font-family': 'Barlow Condensed, Arial Narrow, sans-serif', 'font-weight': 700, 'font-size': 46, 'letter-spacing': 3, 'text-anchor': left ? 'end' : 'start' }, lab);
    t.textContent = label.toUpperCase();
    marks[k] = { g, lab, i };
  });

  /* ---------------- HUD ---------------- */
  const el = id => document.getElementById(id);
  const hud = { knee: el('rtKnee'), kneeLive: el('rtKneeLive'), hip: el('rtHip'), sad: el('rtSad'), cad: el('rtCad'), bar: el('rtBar'), spark: el('rtSpark'), state: el('rtState'), time: el('rtTime') };
  const cKnee = hud.knee.closest('.rt-card');
  const zoneEl = hud.bar.querySelector('.zone'), valEl = hud.bar.querySelector('.val');
  const pct = v => clamp((v - SCALE[0]) / (SCALE[1] - SCALE[0]) * 100, 0, 100);
  zoneEl.style.left = pct(ZONE[0]) + '%'; zoneEl.style.width = (pct(ZONE[1]) - pct(ZONE[0])) + '%';
  const sparkLine = S('polyline', { fill: 'none', stroke: '#86efac', 'stroke-width': 2, 'vector-effect': 'non-scaling-stroke' }, hud.spark);
  S('rect', { x: 0, y: 100 - pct(ZONE[1]), width: 100, height: pct(ZONE[1]) - pct(ZONE[0]), fill: 'rgba(74,222,128,.12)' }, hud.spark);
  hud.spark.appendChild(sparkLine);
  $('#rtB4Knee').textContent = Math.round(BEFORE.kmax) + '°';
  $('#rtAfKnee').textContent = Math.round(AFTER.kmax) + '°';
  $('#rtB4Sad').textContent = (SADDLE_MM - DELTA) + ' mm';
  $('#rtAfSad').textContent = SADDLE_MM + ' mm';
  $('#rtB4Hip').textContent = Math.round(BEFORE.hmin) + '°';
  $('#rtAfHip').textContent = Math.round(AFTER.hmin) + '°';

  const phases = $$('.rt-ph'), progI = $$('.rt-prog i'), cmp = $('#rtCmp');

  /* ---------------- Zustand ---------------- */
  const st = { p: RM ? 1 : 0, ps: RM ? 1 : 0, th: Math.PI * 0.6, run: false, last: 0, t0: performance.now(), kneeTrail: [], ankTrail: [], spark: [], phase: -1 };
  function phaseOf(p) { return p < 0.2 ? 0 : p < 0.47 ? 1 : p < 0.74 ? 2 : 3; }
  function setPhase(i) {
    if (i === st.phase) return;
    st.phase = i;
    if (RM) return;
    phases.forEach((ph, k) => gsap.to(ph, { autoAlpha: k === i ? 1 : 0, y: k === i ? 0 : (k < i ? -24 : 24), duration: 0.45, ease: 'power2.out', overwrite: true }));
    progI.forEach((e, k) => e.classList.toggle('on', k <= i));
  }
  const pt = p => r1(p[0]) + ',' + r1(p[1]);
  const setL = (l, a, b) => { l.setAttribute('x1', r1(a[0])); l.setAttribute('y1', r1(a[1])); l.setAttribute('x2', r1(b[0])); l.setAttribute('y2', r1(b[1])); };
  const arcPath = (c, a, b, r) => {
    const a1 = Math.atan2(a[1] - c[1], a[0] - c[0]), a2 = Math.atan2(b[1] - c[1], b[0] - c[0]);
    let d = a2 - a1; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    return 'M' + r1(c[0] + r * Math.cos(a1)) + ',' + r1(c[1] + r * Math.sin(a1)) + ' A' + r + ',' + r + ' 0 0 ' + (d > 0 ? 1 : 0) + ' ' + r1(c[0] + r * Math.cos(a2)) + ',' + r1(c[1] + r * Math.sin(a2));
  };

  function draw(dt) {
    const p = st.ps;
    // Phasen-Werte aus dem Scroll-Fortschritt
    const mkIn = clamp(p / 0.17, 0, 1);                       // Marker erscheinen
    const motion = RM ? 0 : clamp((p - 0.14) / 0.1, 0, 1);    // Treten setzt ein
    const adj = ease(clamp((p - 0.5) / 0.2, 0, 1));          // Sattel faehrt hoch
    const fin = clamp((p - 0.74) / 0.08, 0, 1);               // Ergebnis
    const d = DELTA * (1 - adj);
    setPhase(phaseOf(p));

    st.th += dt * Math.PI * 2 * (CAD / 60) * (0.18 + 0.82 * motion);
    const th = st.th % (Math.PI * 2);
    const q = pose(th, d), qf = pose(th + Math.PI, d);

    // ferne Seite
    farThigh.setAttribute('d', capsule(q.H, qf.K, 62, 44)); farShin.setAttribute('d', capsule(qf.K, qf.A, 42, 28)); farFoot.setAttribute('d', capsule(qf.heel, qf.toe, 24, 16));
    setL(farCrank, [0, 0], qf.P);
    // Sattel
    seat.setAttribute('transform', 'translate(' + r1(U[0] * d) + ' ' + r1(U[1] * d) + ')');
    // Koerper
    thigh.setAttribute('d', capsule(q.H, q.K, 66, 46)); shin.setAttribute('d', capsule(q.K, q.A, 44, 28));
    const mid = [lerp(q.K[0], q.A[0], 0.72), lerp(q.K[1], q.A[1], 0.72)];
    sock.setAttribute('d', capsule(mid, q.A, 31, 27));
    shoe.setAttribute('d', capsule(q.heel, q.toe, 26, 17));
    // Rumpf: leicht gerundeter Ruecken (Kapsel + Bogen), Trikot-Streifen auf der Ruecken-Seite
    torso.setAttribute('d', capsule(q.H, q.SH, 78, 60));
    const tv = sub(q.SH, q.H), tl = len(tv), tn = [tv[1] / tl, -tv[0] / tl];   // Normale Richtung Ruecken (oben)
    stripe.setAttribute('d', 'M' + pt([q.H[0] + tn[0] * 50 + tv[0] * 0.12, q.H[1] + tn[1] * 50 + tv[1] * 0.12]) + ' L' + pt([q.SH[0] + tn[0] * 40 - tv[0] * 0.08, q.SH[1] + tn[1] * 40 - tv[1] * 0.08]));
    const hc = [q.SH[0] + 118, q.SH[1] - 86];
    neck.setAttribute('d', capsule(q.SH, hc, 40, 30));
    face.setAttribute('cx', r1(hc[0])); face.setAttribute('cy', r1(hc[1]));
    const hp = (x, y) => r1(hc[0] + x) + ',' + r1(hc[1] + y);
    helmet.setAttribute('d', 'M' + hp(-78, 4) + ' C' + hp(-92, -50) + ' ' + hp(-40, -88) + ' ' + hp(14, -82) + ' C' + hp(58, -78) + ' ' + hp(80, -46) + ' ' + hp(74, -8) + ' L' + hp(30, -14) + ' L' + hp(-20, -6) + ' Z');
    visor.setAttribute('d', 'M' + hp(30, -14) + ' L' + hp(74, -8) + ' C' + hp(76, 8) + ' ' + hp(64, 22) + ' ' + hp(46, 22) + ' L' + hp(30, 8) + ' Z');
    uArm.setAttribute('d', capsule(q.SH, q.E, 36, 28)); fArm.setAttribute('d', capsule(q.E, q.W, 28, 21));
    hand.setAttribute('cx', r1(q.W[0])); hand.setAttribute('cy', r1(q.W[1]));
    setL(crankLine, [0, 0], q.P);
    pedal.setAttribute('x', r1(q.P[0] - 45)); pedal.setAttribute('y', r1(q.P[1] - 9));

    // Skelett + Marker
    const J = { wr: q.W, el: q.E, sh: q.SH, hip: q.H, kn: q.K, an: q.A, he: q.heel, to: q.toe };
    bones.setAttribute('d', 'M' + pt(q.W) + ' L' + pt(q.E) + ' L' + pt(q.SH) + ' L' + pt(q.H) + ' L' + pt(q.K) + ' L' + pt(q.A) + ' L' + pt(q.heel) + ' L' + pt(q.toe) + ' L' + pt(q.A));
    bones.setAttribute('opacity', r1(clamp((mkIn - 0.85) / 0.15, 0, 1)));
    MK.forEach(([k], i) => {
      const m = marks[k], on = clamp(mkIn * 9 - i, 0, 1);
      m.g.setAttribute('transform', 'translate(' + pt(J[k]) + ') scale(' + r1(0.4 + 0.6 * on) + ')');
      m.g.setAttribute('opacity', on);
      m.lab.setAttribute('opacity', RM ? 0 : r1(on * (1 - clamp((p - 0.17) / 0.05, 0, 1))));
    });
    scan.setAttribute('opacity', RM ? 0 : r1(Math.sin(clamp(p / 0.18, 0, 1) * Math.PI) * 0.9));
    scan.setAttribute('y', r1(-1390 + clamp(p / 0.18, 0, 1) * 1650));

    // Spuren
    const meas = clamp((p - 0.15) / 0.06, 0, 1);
    if (dt > 0) {
      st.kneeTrail.push(pt(q.K)); if (st.kneeTrail.length > 40) st.kneeTrail.shift();
      st.ankTrail.push(pt(q.A)); if (st.ankTrail.length > 54) st.ankTrail.shift();
    }
    trail.setAttribute('points', st.kneeTrail.join(' ')); trail.setAttribute('opacity', r1(meas * motion));
    atrail.setAttribute('points', st.ankTrail.join(' ')); atrail.setAttribute('opacity', r1(meas * motion));

    // Winkel-Boegen
    kneeArc.setAttribute('d', arcPath(q.K, q.H, q.A, 96)); kneeArc.setAttribute('opacity', meas);
    kneeTxt.setAttribute('x', r1(q.K[0] + 118)); kneeTxt.setAttribute('y', r1(q.K[1] + 24)); kneeTxt.textContent = Math.round(q.knee) + '°'; kneeTxt.setAttribute('opacity', meas);
    hipArc.setAttribute('d', arcPath(q.H, q.SH, q.K, 110)); hipArc.setAttribute('opacity', meas * 0.9);
    hipTxt.setAttribute('x', r1(q.H[0] - 70)); hipTxt.setAttribute('y', r1(q.H[1] - 70)); hipTxt.textContent = Math.round(q.hip) + '°'; hipTxt.setAttribute('opacity', meas * 0.9);

    // Sattel-Hinweis
    const callOn = clamp((p - 0.47) / 0.04, 0, 1) * (1 - fin * 0.6);
    seatCall.setAttribute('opacity', r1(callOn));
    const sx = -380, sy0 = -700 + U[1] * DELTA, sy1 = -700 + U[1] * d;
    callLine.setAttribute('d', 'M' + sx + ',' + r1(sy0) + ' L' + sx + ',' + r1(sy1 - 6));
    callArrow.setAttribute('d', 'M' + (sx - 16) + ',' + r1(sy1 + 10) + ' L' + sx + ',' + r1(sy1 - 18) + ' L' + (sx + 16) + ',' + r1(sy1 + 10) + ' Z');
    callTxt.setAttribute('x', sx - 30); callTxt.setAttribute('y', r1((sy0 + sy1) / 2 + 20)); callTxt.setAttribute('text-anchor', 'end');
    callTxt.textContent = '+' + Math.round(DELTA - d) + ' mm';

    // Geist „vorher“
    const gq = pose(th, DELTA);
    ghost.setAttribute('opacity', r1(fin * 0.75));
    ghostBones.setAttribute('d', 'M' + pt(gq.W) + ' L' + pt(gq.E) + ' L' + pt(gq.SH) + ' L' + pt(gq.H) + ' L' + pt(gq.K) + ' L' + pt(gq.A));
    ghostHead.setAttribute('cx', r1(gq.SH[0] + 118)); ghostHead.setAttribute('cy', r1(gq.SH[1] - 86));
    ghostSeat.setAttribute('d', 'M' + r1(-334 + U[0] * DELTA) + ',' + r1(-704 + U[1] * DELTA) + ' L' + r1(-76 + U[0] * DELTA) + ',' + r1(-712 + U[1] * DELTA));

    // HUD
    const cy = cycle(d);
    hud.knee.innerHTML = Math.round(cy.kmax) + '<sup>°</sup>';
    hud.kneeLive.textContent = 'live ' + Math.round(q.knee) + '°';
    hud.hip.innerHTML = Math.round(cy.hmin) + '<sup>°</sup>';
    hud.sad.innerHTML = Math.round(SADDLE_MM - d) + '<sup>mm</sup>';
    hud.cad.innerHTML = Math.round(CAD * motion) + '<sup>rpm</sup>';
    valEl.style.left = pct(cy.kmax) + '%';
    const good = cy.kmax >= ZONE[0] && cy.kmax <= ZONE[1];
    cKnee.classList.toggle('good', good && p > 0.2); cKnee.classList.toggle('warn', !good && p > 0.2);
    $('#rtHip').closest('.rt-card').classList.toggle('good', good && p > 0.2);
    $('#rtSad').closest('.rt-card').classList.toggle('good', good && p > 0.2);
    if (dt > 0) { st.spark.push(q.knee); if (st.spark.length > 90) st.spark.shift(); }
    sparkLine.setAttribute('points', st.spark.map((v, i) => r1(i / 89 * 100) + ',' + r1(100 - pct(v))).join(' '));
    const ok = p >= 0.74;
    hud.state.classList.toggle('ok', ok);
    hud.state.textContent = p < 0.2 ? 'Kalibrierung' : p < 0.5 ? 'Vorher · Sattel zu tief' : p < 0.74 ? 'Anpassung läuft' : 'Sitzposition optimiert ✓';
    if (cmp && !RM) { cmp.style.opacity = fin; cmp.style.visibility = fin > 0.01 ? 'visible' : 'hidden'; }
    const sec2 = Math.floor((performance.now() - st.t0) / 1000);
    hud.time.textContent = String(Math.floor(sec2 / 60)).padStart(2, '0') + ':' + String(sec2 % 60).padStart(2, '0');
  }

  function loop(now) {
    if (!st.run) return;
    const dt = Math.min(0.05, (now - (st.last || now)) / 1000); st.last = now;
    st.ps += (st.p - st.ps) * Math.min(1, dt * 7);
    draw(dt);
    requestAnimationFrame(loop);
  }

  if (RM) {
    // Standbild: Endzustand, Kurbel unten (maximale Streckung), Vorher-Geist sichtbar
    st.th = Math.PI * 0.55; st.ps = 1;
    draw(0);
    phases.forEach(ph => { ph.style.opacity = 1; ph.style.visibility = 'visible'; });
    return;
  }

  // Scroll: Pin + Fortschritt
  ScrollTrigger.create({
    trigger: sec, start: 'top top', end: () => '+=' + Math.round(innerHeight * 3.4), pin: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: self => { st.p = self.progress; },
  });
  new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting && !st.run) { st.run = true; st.last = 0; requestAnimationFrame(loop); }
    if (!e.isIntersecting) st.run = false;
  })).observe(sec);
  draw(0);
})();
