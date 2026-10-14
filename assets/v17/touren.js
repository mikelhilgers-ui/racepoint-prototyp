/* =====================================================================
   RACEPOINT · 17 · BEST OF — Touren-Seite (THROWAWAY)
   - laedt assets/v17/touren/touren.json + je Tour die GPX-Datei (fetch),
     wertet sie aus (RP17Touren.parseGPX/stats) – keine Zahl ist fest eingetragen
   - Uebersicht: Tourenkarten + stilisierte Karte mit allen Routen (Hover/Tap)
   - Tour im Detail: gepinnte Scroll-Fahrt wie 10 · Die Runde (Kamera folgt,
     Route zeichnet sich, Zaehler, Stopp-Karten, Hoehenprofil, Stempel)
   - Hoehenprofil interaktiv (Maus/Finger/Pfeiltasten) -> Markierung auf der Karte
   - Echte Karte (Leaflet, vendor/leaflet) erst nach Klick, Wahl in localStorage
   Benoetigt RP17Touren (touren-map.js), RP17Site (site.js), RP17Data (data.js)
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const T = window.RP17Touren, SITE = window.RP17Site || {}, D = window.RP17Data || { bikes: [] };
  const html = document.documentElement;
  const RM = !!(SITE.RM || (window.RP && RP.reducedMotion) || !window.gsap || !window.ScrollTrigger);
  if (RM) html.classList.add('rm');
  const BASE = 'assets/v17/touren/';
  const TYPE = { rennrad: 'Rennrad', gravel: 'Gravel', mtb: 'MTB' };
  const BIKEWORD = { rennrad: 'Rennrad', gravel: 'Gravelbike', mtb: 'MTB' };
  const DIFF = { leicht: 1, mittel: 2, schwer: 3 };
  // Fahrzeit-Schaetzung: Grundtempo (km/h) + Zeit fuer Hoehenmeter (Hm pro Stunde)
  const SPEED = { rennrad: [30, 1300], gravel: [21, 900], mtb: [15, 800] };
  const WORDS = ['Kein', 'Ein', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'];
  const SURF = [['asphalt', 'Asphalt'], ['schotter', 'Schotter'], ['trail', 'Trail']];
  const MAIL = 'info@racepoint.be';
  const SVGNS = 'http://www.w3.org/2000/svg';
  const nf = (n, d) => (+n).toLocaleString('de-BE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease1 = t => t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t);            // power1.inOut
  const ease2 = t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;   // power2.inOut
  const isMobile = () => window.innerWidth <= 760;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  const ls = {
    get(k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* privat/gesperrt */ } },
  };
  const LS_OSM = 'rp17-touren-osm', LS_MODE = 'rp17-touren-karte';
  const icon = id => '<svg aria-hidden="true"><use href="#' + id + '"/></svg>';
  const scrollToY = (y, immediate) => {
    if (SITE.lenis) SITE.lenis.scrollTo(y, immediate ? { immediate: true, force: true } : { duration: 1.4, force: true });
    else window.scrollTo({ top: y, behavior: immediate || RM ? 'auto' : 'smooth' });
  };
  const absTop = el => el.getBoundingClientRect().top + window.scrollY;

  let TOURS = [], byId = {}, cur = null, filter = 'alle';

  /* =====================================================================
     Laden + Auswerten
     ===================================================================== */
  function surfaceText(s) {
    return SURF.filter(x => s && s[x[0]] > 0).map(x => s[x[0]] + ' % ' + x[1]).join(', ');
  }
  function rideTime(type, km, hm) {
    const sp = SPEED[type] || SPEED.rennrad;
    const min = Math.round((km / sp[0] + hm / sp[1]) * 60 / 5) * 5;
    return Math.floor(min / 60) + ':' + String(min % 60).padStart(2, '0');
  }
  function fill(str, t) {
    return String(str || '').replace(/\{title\}/g, '„' + t.m.title + '“').replace(/\{km\}/g, nf(t.km)).replace(/\{hm\}/g, nf(t.up)).replace(/\{surface\}/g, surfaceText(t.m.surface));
  }
  function prepare(m, g) {
    const st = T.stats(g.pts);
    const geo = T.routeGeom(g.pts, st.cum);
    const stops = [];
    (m.stops || []).forEach(s => {
      let km = null;
      if (s.start) km = 0;
      else if (s.ziel) km = st.km;
      else {
        if (isFinite(s.lat) && isFinite(s.lon)) {
          const i = T.nearestIndex(g.pts, +s.lat, +s.lon);
          if (T.haversine(g.pts[i], { lat: +s.lat, lon: +s.lon }) <= 1.5) km = st.cum[i];
        }
        if (km == null && isFinite(s.km)) km = clamp(+s.km, 0, st.km);
      }
      if (km == null) { console.warn('[Touren] Stopp ausgelassen (nicht an der Strecke):', m.id, s.name); return; }
      stops.push(Object.assign({}, s, { km }));
    });
    if (!stops.length || stops[0].km > 0.05) stops.unshift({ start: true, name: 'Racepoint', km: 0, title: 'Start bei Racepoint', tagline: 'Schönberg.', text: 'Start und Ziel ist unser Laden.', image: 'assets/v10/film-poster.jpg', alt: 'Kaffeebar im Racepoint-Laden', pause: 'kaffee' });
    if (stops[stops.length - 1].km < st.km - 0.05) stops.push({ ziel: true, name: 'Racepoint', km: st.km, title: 'Zurück bei Racepoint', tagline: 'Kaffee inklusive.', text: 'Bike abstellen, Kaffee holen.', image: 'assets/shop-interior.jpg', alt: 'Showroom von Racepoint', pause: 'kaffee' });
    stops.sort((a, b) => a.km - b.km);
    // Profil fuer Sparkline + Hoehenprofil (gleichmaessig ueber die Distanz)
    const N = 360, pk = [], pe = [];
    for (let i = 0; i <= N; i++) {
      const km = st.km * i / N, fi = T.indexAtKm(st.cum, km);
      pk.push(km); pe.push(st.hasEle ? T.lerpArr(st.ele, fi) : 0);
    }
    const t = { id: m.id, m, g, st, geo, stops, pk, pe, km: st.km, up: Math.round(st.up), type: m.type in TYPE ? m.type : 'rennrad' };
    t.time = rideTime(t.type, t.km, t.up);
    t.file = BASE + m.file;
    t.dlName = 'Racepoint-' + m.id + (m.beispiel ? '-Beispiel' : '') + '.gpx';
    t.askBike = 'Welches ' + BIKEWORD[t.type] + ' passt zur Tour „' + m.title + '“ (' + nf(t.km) + ' km, ' + nf(t.up) + ' Hm, ' + surfaceText(m.surface) + ')?';
    return t;
  }
  async function load() {
    const res = await fetch(BASE + 'touren.json', { cache: 'no-cache' });
    if (!res.ok) throw new Error('touren.json: HTTP ' + res.status);
    const man = await res.json();
    const list = await Promise.all((man.touren || []).map(async m => {
      try {
        const r = await fetch(BASE + m.file, { cache: 'no-cache' });
        if (!r.ok) throw new Error(m.file + ': HTTP ' + r.status);
        return prepare(m, T.parseGPX(await r.text()));
      } catch (e) {
        console.warn('[Touren]', m.id, e);
        return { id: m.id, m, err: e.message || String(e), type: m.type };
      }
    }));
    return list;
  }

  /* =====================================================================
     Hero: Hoehenlinien im Hintergrund
     ===================================================================== */
  function heroTopo() {
    const box = $('#heroTopo');
    if (!box) return;
    const U = T.U, reg = { x0: -26 * U, y0: -15 * U, x1: 26 * U, y1: 15 * U };
    const run = () => {
      box.innerHTML = '<svg viewBox="' + reg.x0 + ' ' + reg.y0 + ' ' + (reg.x1 - reg.x0) + ' ' + (reg.y1 - reg.y0) + '" preserveAspectRatio="xMidYMid slice">' +
        T.layersSVG(reg, { cells: 150, iv: 20, ix: 100, topoOnly: true }) + '<g class="hrt"></g></svg>';
      heroRoutes();
      requestAnimationFrame(() => box.classList.add('on'));
    };
    (window.requestIdleCallback || (f => setTimeout(f, 60)))(run);
  }
  function heroRoutes() {
    const g = $('#heroTopo .hrt');
    if (!g) return;
    g.innerHTML = TOURS.filter(t => !t.err).map(t => '<path class="hr" d="' + t.geo.d + '"/>').join('');
  }

  /* =====================================================================
     Tourenkarten
     ===================================================================== */
  function spark(t) {
    let lo = Infinity, hi = -Infinity;
    t.pe.forEach(e => { if (e < lo) lo = e; if (e > hi) hi = e; });
    const span = Math.max(80, hi - lo), W = 200, H = 44;
    const step = Math.max(1, Math.floor(t.pk.length / 90));
    let d = '';
    for (let i = 0; i < t.pk.length; i += step) d += (d ? 'L' : 'M') + (t.pk[i] / t.km * W).toFixed(1) + ',' + (H - 3 - (t.pe[i] - lo) / span * (H - 8)).toFixed(1);
    d += 'L' + W + ',' + (H - 3 - (t.pe[t.pe.length - 1] - lo) / span * (H - 8)).toFixed(1);
    return '<svg class="tc-spark" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true"><path class="a" d="' + d + 'L' + W + ',' + H + 'L0,' + H + 'Z"/><path class="l" d="' + d + '"/><line class="b" x1="0" x2="' + W + '" y1="' + (H - .5) + '" y2="' + (H - .5) + '"/></svg>';
  }
  function surfBar(s) {
    const parts = SURF.filter(x => s && s[x[0]] > 0);
    return '<div class="surf" aria-label="Untergrund: ' + esc(surfaceText(s)) + '"><div class="bar">' + parts.map(x => '<i class="s-' + x[0] + '" style="width:' + s[x[0]] + '%"></i>').join('') + '</div>' +
      '<ul>' + parts.map(x => '<li><i class="s-' + x[0] + '"></i>' + s[x[0]] + ' % ' + x[1] + '</li>').join('') + '</ul></div>';
  }
  function card(t) {
    if (t.err) {
      return '<article class="tcard" data-id="' + esc(t.id) + '" data-type="' + esc(t.type) + '"><div class="tc-top"><span class="tc-type"><i></i>' + (TYPE[t.type] || '') + '</span></div>' +
        '<h3 class="tc-h">' + esc(t.m.title) + '</h3><p class="tc-p">Die GPX-Datei konnte nicht geladen werden (' + esc(t.err) + ').</p></article>';
    }
    const m = t.m, dif = DIFF[m.difficulty] || 2;
    return '<article class="tcard" data-id="' + t.id + '" data-type="' + t.type + '">' +
      '<div class="tc-top"><span class="tc-type"><i></i>' + TYPE[t.type] + '</span>' + (m.beispiel ? '<span class="bsp">Beispielroute</span>' : '') + '</div>' +
      '<h3 class="tc-h"><a href="#tour-' + t.id + '" data-select="' + t.id + '">' + esc(m.title) + '</a></h3>' +
      '<p class="tc-p">' + esc(m.teaser) + '</p>' +
      '<div class="tc-stats"><div><b>' + nf(t.km) + '</b><span>km</span></div><div><b>' + nf(t.up) + '</b><span>Hm</span></div>' +
        '<div><b class="dif" aria-label="Schwierigkeit ' + esc(m.difficulty) + '">' + [1, 2, 3].map(i => '<i' + (i <= dif ? ' class="on"' : '') + '></i>').join('') + '</b><span>' + esc(m.difficulty || 'mittel') + '</span></div></div>' +
      spark(t) + surfBar(m.surface) +
      '<div class="tc-acts"><a class="btn" href="#tour-' + t.id + '" data-select="' + t.id + '">Details ' + icon('i-arrow') + '</a>' +
        '<a class="btn ghost" href="' + esc(t.file) + '" download="' + esc(t.dlName) + '" aria-label="GPX herunterladen: ' + esc(m.title) + '">' + icon('i-dl') + 'GPX</a>' +
        '<button class="tc-ask" type="button" data-ask="' + esc(t.askBike) + '">' + icon('i-spark') + 'Welches Bike passt?</button></div>' +
      '</article>';
  }
  function renderCards() {
    const box = $('#trCards');
    box.innerHTML = TOURS.map(card).join('');
    $$('.tcard', box).forEach(c => {
      c.addEventListener('mouseenter', () => hl(c.dataset.id, false));
      c.addEventListener('mouseleave', () => hl(null, false));
      c.addEventListener('focusin', () => hl(c.dataset.id, false));
    });
    if (!RM && window.gsap) gsap.from($$('.tcard', box), { autoAlpha: 0, y: 26, duration: 0.7, stagger: 0.06, ease: 'power3.out', clearProps: 'all' });
    const counts = { alle: 0, rennrad: 0, gravel: 0, mtb: 0 };
    TOURS.forEach(t => { counts.alle++; if (counts[t.type] != null) counts[t.type]++; });
    $$('[data-n]').forEach(el => { el.textContent = counts[el.dataset.n] || 0; });
    const c = $('#trCount');
    if (c) c.textContent = ['rennrad', 'gravel', 'mtb'].filter(k => counts[k]).map(k => counts[k] + ' ' + TYPE[k]).join(' · ');
    const bsp = TOURS.some(t => t.m && t.m.beispiel);
    $$('[data-beispiel-note]').forEach(n => { n.hidden = !bsp; });
  }

  /* =====================================================================
     Uebersichtskarte (alle Routen)
     ===================================================================== */
  const OV = { svg: null, cam: null, bb: null, groups: [], labels: null };
  function buildOverview() {
    const svg = OV.svg = $('#ovMap'), cam = OV.cam = $('.cam', svg);
    const ok = TOURS.filter(t => !t.err);
    if (!ok.length) return;
    const bb = OV.bb = ok.reduce((a, t) => ({ x0: Math.min(a.x0, t.geo.bb.x0), y0: Math.min(a.y0, t.geo.bb.y0), x1: Math.max(a.x1, t.geo.bb.x1), y1: Math.max(a.y1, t.geo.bb.y1) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, pad = Math.max(w, h) * 0.5;
    const reg = { x0: bb.x0 - pad, y0: bb.y0 - pad * 0.6, x1: bb.x1 + pad, y1: bb.y1 + pad * 0.6 };
    const routes = ok.map(t => '<g class="ov-g" data-id="' + t.id + '" data-type="' + t.type + '"><path class="ov-c" d="' + t.geo.d + '"/><path class="ov-r ov-' + t.type + '" d="' + t.geo.d + '"/><path class="ov-hit" d="' + t.geo.d + '"><title>' + esc(t.m.title) + ' · ' + nf(t.km) + ' km</title></path></g>').join('');
    cam.innerHTML = T.layersSVG(reg, { id: 'ov', cells: 190, iv: 20, ix: 100 }) + '<g class="ov-routes">' + routes + '</g>';
    // Beschriftungen + Laden in Bildschirm-Koordinaten (feste Schriftgroesse)
    OV.labels = document.createElementNS(SVGNS, 'g');
    svg.appendChild(OV.labels);
    OV.groups = $$('.ov-g', cam);
    OV.groups.forEach(g => {
      const id = g.dataset.id, hit = $('.ov-hit', g);
      hit.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hl(id, true); });
      hit.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hl(null, true); });
      hit.addEventListener('click', () => {
        if (canHover.matches) selectTour(id, { scroll: true });
        else { hl(id, true); showOvInfo(id); }
      });
    });
    svg.addEventListener('click', e => { if (!e.target.closest('.ov-hit')) { hideOvInfo(); hl(null, true); } });
    layoutOverview();
  }
  function layoutOverview() {
    const svg = OV.svg;
    if (!svg || !OV.bb) return;
    const r = svg.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H) return;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const bb = OV.bb, top = 44, bot = isMobile() ? 52 : 26, side = 22;
    const s = Math.min((W - side * 2) / (bb.x1 - bb.x0), (H - top - bot) / (bb.y1 - bb.y0));
    const tx = side + (W - side * 2 - (bb.x1 - bb.x0) * s) / 2 - bb.x0 * s, ty = top + (H - top - bot - (bb.y1 - bb.y0) * s) / 2 - bb.y0 * s;
    OV.cam.setAttribute('transform', 'matrix(' + s.toFixed(5) + ' 0 0 ' + s.toFixed(5) + ' ' + tx.toFixed(2) + ' ' + ty.toFixed(2) + ')');
    const P = (lat, lon) => { const q = T.proj(lat, lon); return [q[0] * s + tx, q[1] * s + ty]; };
    const inside = p => p[0] > 8 && p[0] < W - 8 && p[1] > 48 && p[1] < H - (isMobile() ? 44 : 14);
    let l = '';
    T.LABELS.forEach(lb => {
      if (lb.k === 'poi' && W < 420) return;
      const p = P(lb.lat, lb.lon);
      if (!inside(p)) return;
      l += '<g class="lb lb-' + lb.k + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')">' +
        (lb.peak ? '<path class="lb-peak" d="M-5,3l5,-9l5,9z"/>' : '') +
        '<text' + (lb.peak ? ' x="9" y="3"' : '') + ' text-anchor="' + (lb.peak ? 'start' : 'middle') + '"' + (lb.rot ? ' transform="rotate(' + lb.rot + ')"' : '') + '>' + esc(lb.t) + '</text></g>';
    });
    T.TOWNS.forEach(tw => {
      if (tw[5] !== 1 || tw[0] === 'Schönberg') return;
      const p = P(tw[1], tw[2]);
      if (!inside(p)) return;
      l += '<g class="lb lb-town small" transform="translate(' + (p[0] + 7).toFixed(1) + ' ' + (p[1] + 4).toFixed(1) + ')"><text>' + esc(tw[0]) + '</text></g>';
    });
    const sp = P(T.SHOP.lat, T.SHOP.lon);
    l += '<g class="shop-m" transform="translate(' + sp[0].toFixed(1) + ' ' + sp[1].toFixed(1) + ')"><circle class="halo" r="22"/><path class="pin" d="M0,0c-8,-9 -13,-15 -13,-22a13,13 0 0 1 26,0c0,7 -5,13 -13,22z"/><circle class="pin-c" cy="-22" r="5"/><text x="18" y="-14">RACEPOINT</text></g>';
    OV.labels.innerHTML = l;
  }
  function hl(id, fromMap) {
    const box = $('#ovBox');
    if (box) box.classList.toggle('has-hl', !!id);
    OV.groups.forEach(g => {
      const on = g.dataset.id === id;
      g.classList.toggle('hl', on);
      if (on) g.parentNode.appendChild(g);
    });
    if (fromMap) $$('.tcard').forEach(c => c.classList.toggle('hl', c.dataset.id === id));
  }
  function showOvInfo(id) {
    const t = byId[id], box = $('#ovInfo');
    if (!t || !box) return;
    box.style.setProperty('--c', 'var(--c-' + t.type + ')');
    box.innerHTML = '<div><span class="k">' + TYPE[t.type] + (t.m.beispiel ? ' · Beispielroute' : '') + '</span><b>' + esc(t.m.title) + '</b><span>' + nf(t.km) + ' km · ' + nf(t.up) + ' Hm · ' + esc(t.m.difficulty || '') + '</span></div>' +
      '<button class="btn" type="button" data-go="' + t.id + '">Tour ansehen ' + icon('i-arrow') + '</button>';
    box.hidden = false;
    $('[data-go]', box).addEventListener('click', () => selectTour(id, { scroll: true }));
  }
  function hideOvInfo() { const b = $('#ovInfo'); if (b) b.hidden = true; }

  /* ---------------- Filter (Alle / Rennrad / Gravel / MTB, per #anker) ---------------- */
  function applyFilter(f, opts) {
    opts = opts || {};
    if (!['alle', 'rennrad', 'gravel', 'mtb'].includes(f)) f = 'alle';
    filter = f;
    $$('#trTabs a').forEach(a => { const on = a.dataset.f === f; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    $$('.tcard').forEach(c => { c.hidden = f !== 'alle' && c.dataset.type !== f; });
    OV.groups.forEach(g => g.classList.toggle('off', f !== 'alle' && g.dataset.type !== f));
    hideOvInfo(); hl(null, true);
    if (f !== 'alle' && cur && cur.type !== f) {
      const first = TOURS.find(t => !t.err && t.type === f);
      if (first) selectTour(first.id, { quiet: true });
    }
    if (opts.hash) history.replaceState(null, '', '#' + f);
    if (opts.scroll) scrollToY(absTop($('#touren')) - (isMobile() ? 60 : 70));
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }

  /* =====================================================================
     Tour im Detail: gepinnte Scroll-Fahrt (aus 10 · Die Runde)
     ===================================================================== */
  const R = {
    sec: null, pin: null, mapEl: null, svg: null, cam: null, st: null, tl: null, proxy: { p: 0 },
    view: { km: 0, zoom: 2.4, fit: 0, hfit: 0 }, area: null, sFit: 1, bbC: { x: 0, y: 0 },
    sched: null, card: -1, stampOn: false, hoverKm: null, leaf: null, mode: 'svg', lastKm: -1,
  };

  function buildSchedule(t) {
    const N = t.stops.length, arrive = [0], legs = [];
    let time = 0.7;
    for (let k = 0; k < N - 1; k++) {
      const d = 1.1 + (t.stops[k + 1].km - t.stops[k].km) / (t.km || 1) * 5.8;
      legs.push({ t0: time, d, a: t.stops[k].km, b: t.stops[k + 1].km });
      time += d; arrive.push(time); time += 0.9;
    }
    const last = arrive[N - 1];
    return { arrive, legs, fitStart: last + 0.1, total: last + 1.7 + 1.3, last };
  }
  function stateAt(time) {
    const S = R.sched, v = R.view;
    v.zoom = lerp(2.4, 1.75, ease1(clamp(time / 1.6, 0, 1)));
    let km = 0;
    for (let i = 0; i < S.legs.length; i++) {
      const L = S.legs[i];
      if (time >= L.t0 + L.d) km = L.b;
      else { if (time > L.t0) km = lerp(L.a, L.b, ease1((time - L.t0) / L.d)); break; }
    }
    v.km = km;
    v.fit = ease2(clamp((time - S.fitStart) / 1.6, 0, 1));
    return time;
  }

  // Kartenebenen je Tour (einmal berechnen, dann aus dem Speicher)
  function tourLayers(t) {
    if (t.layers) return;
    const U = T.U, bb = t.geo.bb, mx = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0);
    const reg = { x0: bb.x0 - mx * 1.15, y0: bb.y0 - mx * 0.75, x1: bb.x1 + mx * 0.8, y1: bb.y1 + mx * 0.75 };
    const small = mx / U < 14;
    t.layers = T.layersSVG(reg, { id: 'rt', cells: 200, iv: small ? 10 : 20, ix: small ? 50 : 100 });
    t.reg = reg;
  }
  function warmLayers() {
    const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
    const next = () => { const t = TOURS.find(x => !x.err && !x.layers); if (t) idle(() => { tourLayers(t); next(); }, { timeout: 4000 }); };
    next();
  }
  function buildRouteContent() {
    const t = cur, cam = R.cam;
    const bb = t.geo.bb;
    R.bbC = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
    tourLayers(t);
    const reg = t.reg;
    const inReg = (x, y) => x > reg.x0 && x < reg.x1 && y > reg.y0 && y < reg.y1;
    // Beschriftungen (werden pro Bild gegenskaliert); Orte direkt an einem Stopp traegt der Stopp selbst
    const stopXY = t.stops.map(s => T.posAtKm(t.geo, s.km));
    const nearStop = (p, km) => stopXY.some(q => Math.hypot(q.x - p[0], q.y - p[1]) < km * T.U);
    let lb = '';
    T.LABELS.forEach(l => {
      const p = T.proj(l.lat, l.lon);
      if (!inReg(p[0], p[1]) || (l.k === 'poi' && nearStop(p, 1.3))) return;
      lb += '<g class="lb lb-' + l.k + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"><g class="lb-s">' +
        (l.peak ? '<path class="lb-peak" d="M-5,3l5,-9l5,9z"/>' : '') +
        '<text' + (l.peak ? ' x="9" y="3"' : '') + ' text-anchor="' + (l.peak ? 'start' : 'middle') + '"' + (l.rot ? ' transform="rotate(' + l.rot + ')"' : '') + '>' + esc(l.t) + '</text></g></g>';
    });
    T.TOWNS.forEach(tw => {
      const p = T.proj(tw[1], tw[2]);
      if (!inReg(p[0], p[1]) || tw[0] === 'Schönberg' || nearStop(p, 1.1)) return;
      lb += '<g class="lb lb-town r' + tw[5] + (tw[5] > 1 ? ' small' : '') + '" transform="translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')"><g class="lb-s"><text x="9" y="-7">' + esc(tw[0]) + '</text></g></g>';
    });
    // Stopps: Laden (Start/Ziel) als Pin, unterwegs nummeriert
    const N = t.stops.length;
    const wp = t.stops.map((s, k) => {
      const P = T.posAtKm(t.geo, s.km);
      if (s.ziel && t.stops[0].start) return '<g class="wp-m wp-ziel" data-k="' + k + '"></g>';
      const isShop = s.start || s.ziel;
      return '<g class="wp-m' + (isShop ? ' wp-shop' : '') + '" data-k="' + k + '" transform="translate(' + P.x.toFixed(1) + ' ' + P.y.toFixed(1) + ')"><g class="wp-s">' +
        (isShop
          ? '<circle class="o" r="15"/><path class="cup" transform="translate(-7.5 -8) scale(.62)" d="M5 9h11v5a5 5 0 01-5 5h-1a5 5 0 01-5-5z M16 11h1.5a2.5 2.5 0 010 5H16 M8 3.5c0 1.2 1 1.3 1 2.5M11.5 3.5c0 1.2 1 1.3 1 2.5"/><text class="wp-l" x="23" y="4">Racepoint · Start &amp; Ziel</text>'
          : '<circle class="o" r="12"/><text class="n" y="4.3" text-anchor="middle">' + (k + 1) + '</text><text class="wp-l" x="20" y="4">' + esc(s.name || s.title) + '</text>') +
        '</g></g>';
    }).join('');
    cam.innerHTML = t.layers +
      '<path class="r-preview" d="' + t.geo.d + '"/><path class="r-casing" d="' + t.geo.d + '"/><path class="r-draw" d="' + t.geo.d + '"/>' +
      '<g class="labels">' + lb + '</g><g class="wps">' + wp + '</g>' +
      '<g class="hov-m"><g class="hov-s"><circle r="8"/></g></g>' +
      '<g class="rider"><circle class="halo" r="28"/><circle class="core" r="12"/><path class="chev" d="M-3,-4.6 L2.6,0 L-3,4.6"/></g>';
    R.draw = $('.r-draw', cam); R.casing = $('.r-casing', cam); R.preview = $('.r-preview', cam);
    R.rider = $('.rider', cam); R.hov = $('.hov-m', cam); R.hovS = $('.hov-s', cam);
    R.wpM = $$('.wp-m', cam); R.scaled = $$('.wp-s, .lb-s', cam);
    const L = t.geo.total.toFixed(2);
    [R.draw, R.casing].forEach(p => { p.style.strokeDasharray = L + ' ' + L; });
    // Panel
    $('#rtType').textContent = TYPE[t.type];
    $('#rtTitle').textContent = t.m.title;
    $('#rtSub').textContent = nf(t.km) + ' km. ' + (WORDS[N] || N) + (N === 1 ? ' Stopp.' : ' Stopps.');
    $('#rtBsp').hidden = !t.m.beispiel;
    [$('#rtGpx'), $('#rtGpxS')].forEach(a => { a.href = t.file; a.setAttribute('download', t.dlName); });
    $('#rtAsk').setAttribute('data-ask', t.askBike);
    $('#rtSel').value = t.id;
    $('#stampKm').textContent = nf(t.km) + ' KM';
    $('#rtDots').innerHTML = t.stops.map(() => '<li></li>').join('');
    R.dots = $$('#rtDots li');
    $('#rtCards').innerHTML = t.stops.map((s, k) => {
      const where = s.start ? 'Start' : s.ziel ? 'Ziel' : esc(s.name || '');
      const ask = s.ask ? fill(s.ask, t) : t.askBike;
      return '<article class="wp-card" data-k="' + k + '">' +
        '<figure class="wp-img"><img src="' + esc(s.image || 'assets/shop-interior.jpg') + '" alt="' + esc(s.alt || '') + '" loading="lazy">' +
          (s.pause ? '<span class="pause">' + icon('i-cup') + '<span>' + (s.pause === 'kaffee' ? 'Kaffeepause' : 'Rast') + '</span></span>' : '') + '</figure>' +
        '<div class="wp-txt"><p class="kicker wp-k"><b>km ' + nf(s.km) + '</b> · ' + where + '</p>' +
          '<h3>' + esc(s.title || s.name) + '</h3>' + (s.tagline ? '<p class="wp-sub">' + esc(s.tagline) + '</p>' : '') +
          '<p class="wp-body">' + esc(s.text || '') + '</p>' +
          '<button class="wp-ask" type="button" data-ask="' + esc(ask) + '">' + icon('i-spark') + esc(s.cta || 'Welches Bike passt?') + '</button></div></article>';
    }).join('');
    R.cards = $$('#rtCards .wp-card');
    R.card = -1; R.lastKm = -1; R.stampOn = false;
    if (R.stamp && window.gsap) gsap.set(R.stamp, { autoAlpha: 0 });
    R.sched = buildSchedule(t);
    buildProfile();
    if (R.leaf) leafTour();
  }

  function layoutMap() {
    if (!cur) return;
    const svg = R.svg, r = svg.getBoundingClientRect(), W = r.width, H = r.height;
    if (!W || !H) return;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    const hd = parseFloat(getComputedStyle(html).getPropertyValue('--hd')) || 78;
    let area;
    if (RM) area = { x: 40, y: 70, w: W - 80, h: H - 110 };
    else if (isMobile()) area = { x: 16, y: 66, w: W - 32, h: H - 66 - 84 };
    else {
      const pr = $('.route-panel', R.pin).getBoundingClientRect(), pf = $('#rtProfBox').getBoundingClientRect();
      const left = pr.right - r.left + 40;
      area = { x: left, y: hd + 70, w: W - left - 80, h: (pf.top - r.top) - (hd + 70) - 30 };
    }
    area.cx = area.x + area.w / 2; area.cy = area.y + area.h / 2;
    R.area = area;
    const bb = cur.geo.bb, pad = Math.max(bb.x1 - bb.x0, bb.y1 - bb.y0) * 0.05;
    R.sFit = Math.min(area.w / (bb.x1 - bb.x0 + pad * 2), area.h / (bb.y1 - bb.y0 + pad * 2));
    const pinR = R.pin.getBoundingClientRect();
    R.stamp.style.left = (r.left - pinR.left + area.cx).toFixed(1) + 'px';
    R.stamp.style.top = (r.top - pinR.top + area.cy).toFixed(1) + 'px';
    buildProfile();
    R.lastKm = -1;
    render();
    if (R.leaf && R.mode !== 'svg') leafFit();
  }

  function render() {
    if (!cur || !R.area) return;
    const v = R.view, t = cur, F = Math.max(v.fit, v.hfit);
    const s = R.sFit * lerp(v.zoom, 1, F);
    const P = T.posAtKm(t.geo, v.km);
    const cx = lerp(P.x, R.bbC.x, F), cy = lerp(P.y, R.bbC.y, F);
    R.cam.setAttribute('transform', 'matrix(' + s.toFixed(5) + ' 0 0 ' + s.toFixed(5) + ' ' + (R.area.cx - cx * s).toFixed(2) + ' ' + (R.area.cy - cy * s).toFixed(2) + ')');
    const inv = 1 / s;
    R.draw.style.strokeWidth = 5.5 * inv;
    R.casing.style.strokeWidth = 11 * inv;
    R.preview.style.strokeWidth = 2 * inv;
    R.preview.style.strokeDasharray = (0.1 * inv) + ' ' + (7 * inv);
    const off = (t.geo.total - P.len).toFixed(2);
    R.draw.style.strokeDashoffset = off; R.casing.style.strokeDashoffset = off;
    const sc = 'scale(' + inv.toFixed(5) + ')';
    for (let i = 0; i < R.scaled.length; i++) R.scaled[i].setAttribute('transform', sc);
    R.rider.setAttribute('transform', 'translate(' + P.x.toFixed(2) + ' ' + P.y.toFixed(2) + ') rotate(' + P.ang.toFixed(1) + ') ' + sc);
    if (R.hoverKm != null) {
      const H = T.posAtKm(t.geo, R.hoverKm);
      R.hov.setAttribute('transform', 'translate(' + H.x.toFixed(2) + ' ' + H.y.toFixed(2) + ')');
      R.hovS.setAttribute('transform', sc);
    }
    // Massstab
    const pxKm = T.U * s, unit = pxKm > 70 ? 1 : pxKm > 28 ? 2 : pxKm > 12 ? 5 : 10;
    // kleinere Orte erst beim Hineinzoomen beschriften
    const zl = pxKm > 30 ? 3 : pxKm > 15 ? 2 : 1;
    if (zl !== R.zl) { R.zl = zl; R.cam.setAttribute('class', 'cam zl' + zl); }
    R.scaleBar.style.width = (pxKm * unit).toFixed(1) + 'px';
    R.scaleTxt.textContent = unit + ' km';
    // Zaehler + Profil
    if (Math.abs(v.km - R.lastKm) > 0.005) {
      R.lastKm = v.km;
      R.elKm.textContent = nf(v.km, 1);
      const fi = T.indexAtKm(t.st.cum, v.km);
      R.elHm.textContent = nf(Math.round(T.lerpArr(t.st.gain, fi)));
      if (R.pClip) {
        const e = T.lerpArr(t.st.ele, fi), x = R.profX(v.km), y = R.profY(e);
        R.pClip.setAttribute('width', x.toFixed(1));
        R.pDot.setAttribute('cx', x.toFixed(1)); R.pDot.setAttribute('cy', y.toFixed(1));
        R.pVal.textContent = t.st.hasEle ? Math.round(e) + ' m' : '';
        R.pVal.setAttribute('x', clamp(x, 26, R.PW - 26).toFixed(1));
        R.pVal.setAttribute('y', Math.max(10, y - 10).toFixed(1));
      }
      if (R.leaf && R.mode !== 'svg') leafProgress(v.km);
    }
  }

  function showCard(k) {
    if (k === R.card || !R.cards[k]) return;
    const next = R.cards[k];
    R.card = k;
    R.wpM.forEach(m => { const i = +m.dataset.k; m.classList.toggle('on', i <= k); m.classList.toggle('cur', i === k); });
    // Laden-Pin ist auch das Ziel
    const shop = R.wpM.find(m => m.classList.contains('wp-shop'));
    if (shop && k === R.cards.length - 1) shop.classList.add('cur', 'on');
    R.dots.forEach((d, i) => { d.classList.toggle('on', i < k); d.classList.toggle('cur', i === k); });
    R.elWp.textContent = (k + 1) + '/' + R.cards.length;
    if (RM) return;
    const out = R.cards.filter(c => c !== next && (gsap.getTweensOf(c).length || +gsap.getProperty(c, 'opacity') > 0));
    if (out.length) gsap.to(out, { autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in', overwrite: true });
    const d = out.length ? 0.12 : 0;
    gsap.fromTo(next, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: d, overwrite: true });
    const img = $('.wp-img img', next);
    if (img) gsap.fromTo(img, { scale: 1.18 }, { scale: 1, duration: 1.3, ease: 'expo.out', delay: d, overwrite: true });
    const mk = (k === 0 || k === R.cards.length - 1) && shop ? shop : R.wpM.find(m => +m.dataset.k === k);
    const o = mk && $('.o', mk);
    if (o) gsap.fromTo(o, { attr: { r: 22 } }, { attr: { r: mk === shop ? 15 : 12 }, duration: 0.7, ease: 'back.out(3)', overwrite: true });
  }

  function onTime(time) {
    const S = R.sched;
    let k = 0;
    for (let i = 1; i < S.arrive.length; i++) if (time >= S.arrive[i] - 0.06) k = i;
    showCard(k);
    R.sec.classList.toggle('is-done', time > S.last + 0.6);
    const on = time > S.last + 1.3;
    if (on !== R.stampOn && !RM) {
      R.stampOn = on;
      if (on) gsap.fromTo(R.stamp, { autoAlpha: 0, scale: 1.7, rotation: -24 }, { autoAlpha: 1, scale: 1, rotation: -10, duration: 0.55, ease: 'back.out(2.2)', overwrite: true });
      else gsap.to(R.stamp, { autoAlpha: 0, duration: 0.25, overwrite: true });
    }
  }
  function renderAt(p) {
    if (!cur) return;
    const time = stateAt(p * R.sched.total);
    render();
    onTime(time);
  }

  /* ---------------- Hoehenprofil (interaktiv) ---------------- */
  function niceStep(km) { return km > 70 ? 10 : km > 30 ? 5 : km > 12 ? 2 : 1; }
  function buildProfile() {
    const prof = R.prof, t = cur;
    if (!t) return;
    const r = prof.getBoundingClientRect(), PW = r.width, PH = r.height;
    if (!PW || !PH) return;
    R.PW = PW; R.PH = PH;
    prof.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH);
    const big = PH > 70, top = big ? 20 : 15, bot = PH - (big ? 16 : 2);
    let lo = Infinity, hi = -Infinity;
    t.pe.forEach(e => { if (e < lo) lo = e; if (e > hi) hi = e; });
    let emin = Math.floor((lo - 15) / 50) * 50, emax = Math.ceil((hi + 15) / 50) * 50;
    if (emax - emin < 150) emax = emin + 150;
    R.profX = km => km / t.km * PW;
    R.profY = e => bot - (e - emin) / (emax - emin) * (bot - top);
    let line = '';
    t.pk.forEach((km, i) => { line += (i ? 'L' : 'M') + R.profX(km).toFixed(1) + ',' + R.profY(t.pe[i]).toFixed(1); });
    const area = line + 'L' + PW.toFixed(1) + ',' + bot + 'L0,' + bot + 'Z';
    const N = t.stops.length;
    let ticks = '';
    t.stops.forEach((s, k) => {
      const x = R.profX(s.km);
      ticks += '<line class="ptk" x1="' + x.toFixed(1) + '" x2="' + x.toFixed(1) + '" y1="' + (top - 3) + '" y2="' + bot + '"/>' +
        '<text class="pn" x="' + x.toFixed(1) + '" y="' + (top - 6) + '" text-anchor="' + (k === 0 ? 'start' : k === N - 1 ? 'end' : 'middle') + '">' + (k + 1) + '</text>';
    });
    let kms = '';
    if (big) {
      const stp = niceStep(t.km);
      for (let km = 0; km < t.km - stp * 0.6; km += stp) kms += '<text class="pkm" x="' + R.profX(km).toFixed(1) + '" y="' + (PH - 1) + '" text-anchor="' + (km === 0 ? 'start' : 'middle') + '">' + km + '</text>';
      kms += '<text class="pkm" x="' + PW + '" y="' + (PH - 1) + '" text-anchor="end">' + nf(t.km) + ' km</text>';
    }
    prof.innerHTML = '<defs><clipPath id="profClip"><rect class="pc" x="0" y="0" width="0" height="' + PH + '"/></clipPath></defs>' +
      '<path class="pa" d="' + area + '"/><path class="pl" d="' + line + '"/>' +
      '<g clip-path="url(#profClip)"><path class="pa2" d="' + area + '"/><path class="pl2" d="' + line + '"/></g>' +
      ticks + kms + '<line class="pbase" x1="0" x2="' + PW + '" y1="' + bot + '" y2="' + bot + '"/>' +
      '<line class="phl" x1="0" x2="0" y1="' + (top - 2) + '" y2="' + bot + '"/><circle class="phd" r="4.5"/>' +
      '<text class="pval" y="0" text-anchor="middle"></text><circle class="pdot" r="4.5"/>';
    R.pClip = $('.pc', prof); R.pDot = $('.pdot', prof); R.pVal = $('.pval', prof);
    R.pHl = $('.phl', prof); R.pHd = $('.phd', prof);
    R.lastKm = -1;
    if (R.hoverKm != null) hoverAt(R.hoverKm);
  }
  function hoverAt(km) {
    const t = cur;
    if (!t || !R.profX) return;
    km = clamp(km, 0, t.km);
    R.hoverKm = km;
    const fi = T.indexAtKm(t.st.cum, km), e = T.lerpArr(t.st.ele, fi), g = T.lerpArr(t.st.gain, fi);
    const x = R.profX(km), y = R.profY(e);
    R.prof.classList.add('hov');
    R.pHl.setAttribute('x1', x.toFixed(1)); R.pHl.setAttribute('x2', x.toFixed(1));
    R.pHd.setAttribute('cx', x.toFixed(1)); R.pHd.setAttribute('cy', y.toFixed(1));
    const rd = R.read, box = R.profBox.getBoundingClientRect(), pr = R.prof.getBoundingClientRect();
    rd.innerHTML = 'km ' + nf(km, 1) + ' · ' + (t.st.hasEle ? Math.round(e) + ' m · <em>↑ ' + nf(Math.round(g)) + ' Hm</em>' : 'keine Höhendaten');
    rd.classList.add('on');
    const w = rd.offsetWidth || 160, px = pr.left - box.left + x;
    rd.style.left = clamp(px, w / 2 + 2, box.width - w / 2 - 2).toFixed(1) + 'px';
    R.hov.classList.add('on');
    render();
    if (R.leaf && R.mode !== 'svg') leafHover(km);
  }
  function hoverEnd(delay) {
    clearTimeout(R.hovT);
    R.hovT = setTimeout(() => {
      R.hoverKm = null;
      R.prof.classList.remove('hov'); R.read.classList.remove('on'); R.hov.classList.remove('on');
      if (R.leafHov) R.leafHov.remove();
      if (!RM) gsap.to(R.view, { hfit: 0, duration: 0.7, ease: 'power2.inOut', onUpdate: render, overwrite: true });
    }, delay || 0);
  }
  function hoverStart() {
    clearTimeout(R.hovT);
    if (!RM) gsap.to(R.view, { hfit: 1, duration: 0.7, ease: 'power2.inOut', onUpdate: render, overwrite: true });
  }
  function initProfile() {
    const box = R.profBox, prof = R.prof;
    const kmAtX = cx => { const r = prof.getBoundingClientRect(); return clamp((cx - r.left) / r.width, 0, 1) * (cur ? cur.km : 0); };
    let drag = false;
    box.setAttribute('tabindex', '0');
    box.setAttribute('role', 'slider');
    box.setAttribute('aria-label', 'Höhenprofil der Tour');
    box.setAttribute('aria-describedby', 'profHelp');
    box.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') hoverStart(); });
    box.addEventListener('pointermove', e => { if (e.pointerType === 'mouse' || drag) hoverAt(kmAtX(e.clientX)); });
    box.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') hoverEnd(0); });
    box.addEventListener('pointerdown', e => {
      if (e.pointerType === 'mouse') return;
      drag = true; hoverStart(); hoverAt(kmAtX(e.clientX));
    });
    const up = () => { if (drag) { drag = false; hoverEnd(1600); } };
    box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
    box.addEventListener('keydown', e => {
      if (!cur) return;
      const stp = cur.km / 60;
      let km = R.hoverKm == null ? R.view.km : R.hoverKm;
      if (e.key === 'ArrowRight' || e.key === 'ArrowUp') km += stp;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') km -= stp;
      else if (e.key === 'Home') km = 0;
      else if (e.key === 'End') km = cur.km;
      else if (e.key === 'Escape') { hoverEnd(0); return; }
      else return;
      e.preventDefault();
      if (R.hoverKm == null) hoverStart();
      hoverAt(km);
      box.setAttribute('aria-valuenow', Math.round(km * 10) / 10);
      box.setAttribute('aria-valuetext', R.read.textContent);
    });
    box.addEventListener('blur', () => hoverEnd(0));
    box.setAttribute('aria-valuemin', '0');
  }

  /* ---------------- Tour waehlen ---------------- */
  function routeStartY() { return R.st ? R.st.start : absTop(R.sec); }
  function selectTour(id, opts) {
    opts = opts || {};
    const t = byId[id];
    if (!t || t.err) return;
    const go = () => { if (opts.scroll) scrollToY(routeStartY() + 1); };
    if (cur === t) { go(); return; }
    const inPin = !!(R.st && R.st.isActive);
    const visible = inPin || (() => { const r = R.sec.getBoundingClientRect(); return r.top < innerHeight && r.bottom > 0; })();
    const apply = () => {
      cur = t;
      hoverEnd(0);
      buildRouteContent();
      layoutMap();
      if (inPin && R.st) { scrollToY(R.st.start + 1, true); if (R.tl) R.tl.progress(0); R.proxy.p = 0; }
      renderAt(RM ? 1 : (R.tl ? R.proxy.p : 0));
      fillInfo();
      $('#profHelp') && R.profBox.setAttribute('aria-valuemax', String(Math.round(t.km)));
      if (!opts.quiet) history.replaceState(null, '', '#tour-' + t.id);
    };
    if (visible && !RM && cur) {
      R.mapEl.classList.add('swap');
      setTimeout(() => { apply(); requestAnimationFrame(() => R.mapEl.classList.remove('swap')); }, 260);
    } else apply();
    go();
  }

  function initRoute() {
    R.sec = $('#tour'); R.pin = $('.route-pin', R.sec); R.mapEl = $('.route-map', R.sec);
    R.svg = $('#rtMap'); R.cam = $('.cam', R.svg); R.stamp = $('.route-stamp', R.sec);
    R.prof = $('#rtProf'); R.profBox = $('#rtProfBox'); R.read = $('#profRead');
    R.elKm = $('.st-km', R.sec); R.elHm = $('.st-hm', R.sec); R.elWp = $('.st-wp', R.sec);
    R.scaleBar = $('.mf-scale i', R.sec); R.scaleTxt = $('.mf-scale b', R.sec);
    // Auswahl im Panel
    const sel = $('#rtSel');
    sel.innerHTML = ['rennrad', 'gravel', 'mtb'].map(k => {
      const list = TOURS.filter(t => !t.err && t.type === k);
      return list.length ? '<optgroup label="' + TYPE[k] + '">' + list.map(t => '<option value="' + t.id + '">' + esc(t.m.title) + '</option>').join('') + '</optgroup>' : '';
    }).join('');
    sel.addEventListener('change', () => selectTour(sel.value, {}));
    initProfile();
    initMapSwitch();
    const first = TOURS.find(t => !t.err);
    cur = first;
    buildRouteContent();
    fillInfo();
    if (RM) {
      R.sec.classList.add('is-done');
      layoutMap();
      renderAt(1);
      window.addEventListener('resize', () => { layoutMap(); renderAt(1); });
      return;
    }
    gsap.set(R.stamp, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    R.tl = gsap.to(R.proxy, { p: 1, ease: 'none', duration: 1, paused: true, onUpdate: () => renderAt(R.proxy.p) });
    R.st = ScrollTrigger.create({
      trigger: R.sec, start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * (isMobile() ? 5.6 : 6.4)),
      pin: true, scrub: 0.8, anticipatePin: 1, animation: R.tl,
      onToggle: self => html.classList.toggle('tr-pinned', self.isActive),
      onRefresh: () => { layoutMap(); renderAt(R.proxy.p); },
    });
    layoutMap();
    renderAt(0);
  }

  /* =====================================================================
     Steckbrief
     ===================================================================== */
  function guardImg(img) {
    const box = img.parentElement, fail = () => box.classList.add('noimg');
    if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
    img.addEventListener('error', fail, { once: true });
  }
  function fillInfo() {
    const t = cur, m = t.m;
    $('#inType').textContent = TYPE[t.type];
    $('#inBsp').hidden = !m.beispiel;
    const ttl = m.title, cut = ttl.indexOf(' ') > 0 ? ttl.indexOf(' ') : ttl.indexOf('-') > 0 ? ttl.indexOf('-') + 1 : -1;
    $('#infoH').innerHTML = cut > 0 ? esc(ttl.slice(0, cut).trim()) + '<br><em>' + esc(ttl.slice(cut).trim()) + '.</em>' : '<em>' + esc(ttl) + '.</em>';
    $('#inDesc').textContent = m.description || m.teaser || '';
    const sp = SPEED[t.type];
    const maxKm = t.st.hasEle ? t.st.cum[t.st.maxI] : 0;
    $('#inStats').innerHTML =
      '<div><dt>Distanz</dt><dd>' + nf(t.km, 1) + '<small>km</small><em>Rundkurs ab Schönberg</em></dd></div>' +
      '<div><dt>Anstieg</dt><dd>' + nf(t.up) + '<small>Hm</small><em>' + nf(Math.round(t.up / t.km * 10)) + ' Hm je 10 km</em></dd></div>' +
      '<div><dt>Höchster Punkt</dt><dd>' + (t.st.hasEle ? nf(Math.round(t.st.max)) + '<small>m</small><em>bei km ' + nf(maxKm) + '</em>' : '–') + '</dd></div>' +
      '<div><dt>Fahrzeit</dt><dd>≈ ' + t.time + '<small>h</small><em>Schätzung ' + TYPE[t.type] + ': Ø ' + sp[0] + ' km/h + ' + nf(sp[1]) + ' Hm/h, ohne Pausen</em></dd></div>';
    $('#inSurf').innerHTML = surfBar(m.surface).replace(/^<div class="surf"[^>]*>|<\/div>$/g, '');
    $('#inSurf').setAttribute('aria-label', 'Untergrund: ' + surfaceText(m.surface));
    $('#inHi').innerHTML = (m.highlights || []).map(h => '<li>' + esc(h) + '</li>').join('');
    $('#inStops').innerHTML = t.stops.map(s => '<li><span class="km">km ' + nf(s.km) + '</span><span><b>' + esc(s.title || s.name) + '</b><small>' + esc(s.start ? 'Start · Racepoint' : s.ziel ? 'Ziel · Racepoint' : s.name || '') + '</small></span>' +
      (s.pause ? '<span class="pz">' + icon('i-cup') + (s.pause === 'kaffee' ? 'Kaffee' : 'Rast') + '</span>' : '<span></span>') + '</li>').join('');
    // Bike-Empfehlung aus dem Katalog (RP17Data = Kopie von catalogue.json)
    const b = (D.bikes || []).find(x => x.id === m.bike);
    const bikeBox = $('#inBike');
    if (b) {
      const href = 'v17-bike.html?id=' + encodeURIComponent(b.id);
      bikeBox.innerHTML = '<a class="bimg" href="' + href + '" aria-label="' + esc(b.name) + ' ansehen"><span class="tag">Unsere Empfehlung · ' + TYPE[t.type] + '</span>' +
        '<img src="' + esc(b.image) + '" alt="Specialized ' + esc(b.name) + '" loading="lazy" referrerpolicy="no-referrer"><span class="ph"><svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="26" cy="46" r="20"/><circle cx="94" cy="46" r="20"/><path d="M26 46l18-26h34l16 26M44 20l18 26h-36M62 46l16-26M40 14h12M74 12l4 8"/></svg><span>Herstellerbild</span></span></a>' +
        '<div class="bb"><p class="kicker">Specialized · passt zu dieser Tour</p><h3><a href="' + href + '">' + esc(b.name) + '</a></h3>' +
        (m.bikeWhy ? '<p>' + esc(m.bikeWhy) + '</p>' : '') +
        '<div class="pr"><b>' + nf(b.price) + ' €</b><small>Herstellerpreis · Belgien</small></div>' +
        '<a class="btn ghost" href="' + href + '">Bike ansehen ' + icon('i-arrow') + '</a></div>';
      guardImg($('img', bikeBox));
      bikeBox.hidden = false;
    } else bikeBox.hidden = true;
    const subj = 'Leihrad/Probefahrt für die Tour „' + m.title + '“';
    const body = 'Hallo Racepoint-Team,\n\nich möchte die Tour „' + m.title + '“ (' + TYPE[t.type] + ', ' + nf(t.km) + ' km, ' + nf(t.up) + ' Hm) fahren und interessiere mich für ein Leihrad bzw. eine Probefahrt' + (b ? ' (z. B. ' + b.name + ')' : '') + '.\n\nWunschtermin:\nKörpergröße:\nTelefon:\n\nViele Grüße\n';
    $('#inActs').innerHTML =
      '<a class="btn" href="' + esc(t.file) + '" download="' + esc(t.dlName) + '">' + '<svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>GPX herunterladen</a>' +
      '<a class="btn ghost" href="mailto:' + MAIL + '?subject=' + encodeURIComponent(subj) + '&body=' + encodeURIComponent(body) + '"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h18v12H3z M3 7l9 6 9-6"/></svg>Leihrad/Probefahrt anfragen</a>' +
      '<button type="button" class="btn ghost" data-ask="' + esc('Ich möchte mein ' + BIKEWORD[t.type] + ' vor der Tour „' + m.title + '“ (' + nf(t.km) + ' km, ' + nf(t.up) + ' Hm) in der Werkstatt checken lassen.') + '"><svg class="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 6.5a4 4 0 015-5l-2.6 2.6.6 2.4 2.4.6L22.5 4.5a4 4 0 01-5 5L9 18a2.1 2.1 0 01-3-3z"/></svg>Werkstatt-Check vor der Tour</button>';
    $('#inFine').textContent = (m.beispiel ? 'Beispielroute: Die Linie verbindet echte Orte, folgt aber keinen echten Wegen – bitte nicht zum Navigieren verwenden. Achims echte GPX-Tour folgt. ' : '') +
      'Distanz, Höhenmeter (Glättung ' + T.ASCENT_THRESHOLD + ' m) und Profil sind aus der GPX-Datei berechnet. Die Fahrzeit ist eine grobe Schätzung ohne Pausen.';
  }

  /* =====================================================================
     Echte Karte (Leaflet + OpenStreetMap) – erst nach Klick
     ===================================================================== */
  function initMapSwitch() {
    const sw = $('#mapSw');
    const consent = ls.get(LS_OSM) === '1';
    if (!consent) {
      sw.innerHTML = '<button class="osm-go" type="button" data-osm="osm">' + icon('i-map') + 'Karte laden (OpenStreetMap)</button>' +
        '<p class="osm-note">Lädt Kartenkacheln von openstreetmap.org – erst nach deinem Klick. Die Wahl wird gemerkt.</p>';
    } else {
      sw.innerHTML = '<div class="msw" role="group" aria-label="Kartenansicht"><button type="button" data-m="svg" aria-pressed="true">Stilisiert</button><button type="button" data-m="osm" aria-pressed="false">Echte Karte</button><button type="button" data-m="topo" aria-pressed="false">Topo</button></div>';
    }
    sw.onclick = e => {
      const b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.osm) { ls.set(LS_OSM, '1'); initMapSwitch(); setMode('osm'); return; }
      setMode(b.dataset.m);
    };
    $$('.msw button', sw).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === R.mode)));
  }
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (R.leafLoad) return R.leafLoad;
    R.leafLoad = new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'vendor/leaflet/leaflet.js';
      s.onload = () => res(); s.onerror = () => rej(new Error('Leaflet konnte nicht geladen werden'));
      document.head.appendChild(s);
    });
    return R.leafLoad;
  }
  async function setMode(mode) {
    if (!['svg', 'osm', 'topo'].includes(mode)) mode = 'svg';
    R.mode = mode;
    ls.set(LS_MODE, mode);
    $$('#mapSw .msw button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.m === mode)));
    const box = $('#rtLeaf');
    if (mode === 'svg') { box.hidden = true; R.pin.classList.remove('leaf-on'); R.lastKm = -1; render(); return; }
    try { await loadLeaflet(); } catch (e) { console.warn(e); R.mode = 'svg'; return; }
    box.hidden = false;
    R.pin.classList.add('leaf-on');
    if (!R.leaf) {
      const map = L.map(box, { scrollWheelZoom: false, dragging: !L.Browser.mobile, touchZoom: false, tap: false, zoomSnap: 0.25, attributionControl: true, zoomControl: true });
      map.zoomControl.setPosition('topright');
      R.leaf = {
        map,
        osm: L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende' }),
        topo: L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', { maxZoom: 17, subdomains: 'abc', attribution: 'Kartendaten © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende, SRTM | Kartendarstellung © <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener">CC-BY-SA</a>)' }),
        layers: null,
      };
    }
    const lf = R.leaf;
    [lf.osm, lf.topo].forEach(l => { if (lf.map.hasLayer(l)) lf.map.removeLayer(l); });
    (mode === 'topo' ? lf.topo : lf.osm).addTo(lf.map);
    lf.map.invalidateSize();
    leafTour();
  }
  const llAt = (t, km) => {
    const fi = T.indexAtKm(t.st.cum, km), i = Math.min(t.g.pts.length - 2, Math.floor(fi)), f = fi - i, a = t.g.pts[i], b = t.g.pts[i + 1];
    return [a.lat + (b.lat - a.lat) * f, a.lon + (b.lon - a.lon) * f];
  };
  function leafTour() {
    const lf = R.leaf, t = cur;
    if (!lf || !t || R.mode === 'svg') return;
    if (lf.layers) lf.layers.remove();
    const ll = t.g.pts.map(p => [p.lat, p.lon]);
    const grp = L.layerGroup();
    lf.full = L.polyline(ll, { color: '#E83637', weight: 4, opacity: 0.38, lineJoin: 'round' }).addTo(grp);
    lf.prog = L.polyline([], { color: '#E83637', weight: 5, opacity: 1, lineJoin: 'round' }).addTo(grp);
    t.stops.forEach((s, k) => {
      if (s.start || s.ziel) return;
      const p = llAt(t, s.km);
      L.marker(p, { icon: L.divIcon({ className: '', html: '<span class="lf-stop">' + (k + 1) + '</span>', iconSize: [24, 24], iconAnchor: [12, 12] }), keyboard: false })
        .bindTooltip(esc(s.title || s.name) + ' · km ' + nf(s.km), { direction: 'top', offset: [0, -10] }).addTo(grp);
    });
    L.marker([t.g.pts[0].lat, t.g.pts[0].lon], { icon: L.divIcon({ className: '', html: '<span class="lf-pin"><b>R</b></span>', iconSize: [30, 30], iconAnchor: [3, 30] }), zIndexOffset: 500, keyboard: false })
      .bindTooltip('Racepoint · Start &amp; Ziel', { direction: 'right', offset: [12, -16] }).addTo(grp);
    lf.rider = L.marker(ll[0], { icon: L.divIcon({ className: '', html: '<span class="lf-rider"></span>', iconSize: [20, 20], iconAnchor: [10, 10] }), zIndexOffset: 900, interactive: false, keyboard: false }).addTo(grp);
    lf.layers = grp.addTo(lf.map);
    leafFit();
    R.lastKm = -1;
    render();
  }
  function leafFit() {
    const lf = R.leaf;
    if (!lf || !lf.full) return;
    lf.map.invalidateSize();
    const a = R.area, box = $('#rtLeaf').getBoundingClientRect();
    if (!a || !box.width) { lf.map.fitBounds(lf.full.getBounds(), { padding: [30, 30] }); return; }
    lf.map.fitBounds(lf.full.getBounds(), { paddingTopLeft: [Math.max(20, a.x), Math.max(20, a.y)], paddingBottomRight: [Math.max(20, box.width - a.x - a.w), Math.max(20, box.height - a.y - a.h)], animate: false });
  }
  function leafProgress(km) {
    const lf = R.leaf, t = cur;
    if (!lf || !lf.prog) return;
    const fi = T.indexAtKm(t.st.cum, km), n = Math.floor(fi) + 1;
    const ll = t.g.pts.slice(0, n).map(p => [p.lat, p.lon]);
    ll.push(llAt(t, km));
    lf.prog.setLatLngs(ll);
    lf.rider.setLatLng(llAt(t, km));
  }
  function leafHover(km) {
    const lf = R.leaf;
    if (!lf) return;
    if (!R.leafHov) R.leafHov = L.circleMarker([0, 0], { radius: 7, color: '#121316', weight: 3, fillColor: '#fff', fillOpacity: 1 });
    R.leafHov.setLatLng(llAt(cur, km));
    if (!lf.map.hasLayer(R.leafHov)) R.leafHov.addTo(lf.map);
  }

  /* =====================================================================
     Start
     ===================================================================== */
  function handleHash(initial) {
    const h = decodeURIComponent(location.hash.slice(1));
    if (!h) return;
    if (h.startsWith('tour-')) {
      const id = h.slice(5);
      if (byId[id] && !byId[id].err) {
        if (filter !== 'alle' && byId[id].type !== filter) applyFilter('alle');
        // nach dem Pinning genau an den Anfang der Fahrt springen
        setTimeout(() => { selectTour(id, { quiet: true }); scrollToY(routeStartY() + 1, initial); }, initial ? 260 : 0);
      }
    } else if (['alle', 'rennrad', 'gravel', 'mtb'].includes(h)) {
      applyFilter(h);
      setTimeout(() => scrollToY(absTop($('#touren')) - (isMobile() ? 60 : 70), initial), initial ? 260 : 0);
    }
  }
  function bindUI() {
    $('#trTabs').addEventListener('click', e => {
      const a = e.target.closest('a[data-f]');
      if (!a) return;
      e.preventDefault();
      applyFilter(a.dataset.f, { hash: true, scroll: !!(window.scrollY < absTop($('#touren')) - 300) });
    });
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-select]');
      if (!a) return;
      e.preventDefault();
      selectTour(a.dataset.select, { scroll: true });
    });
    window.addEventListener('hashchange', () => handleHash(false));
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layoutOverview(); if (!R.st) layoutMap(); }, 160); });
  }
  async function boot() {
    heroTopo();
    bindUI();
    try {
      TOURS = await load();
    } catch (e) {
      console.warn('[Touren]', e);
      $('#trCards').innerHTML = '<div class="tr-err"><b>Die Touren konnten nicht geladen werden.</b><span>Die Seite liest die GPX-Dateien per fetch – bitte über einen Webserver öffnen (z. B. <code>npm start</code>), nicht direkt als Datei.</span></div>';
      $('#tour').hidden = true; $('#steckbrief').hidden = true;
      return;
    }
    byId = {};
    TOURS.forEach(t => { byId[t.id] = t; });
    renderCards();
    buildOverview();
    heroRoutes();
    if (!TOURS.some(t => !t.err)) { $('#tour').hidden = true; $('#steckbrief').hidden = true; return; }
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    await Promise.race([fontsReady, new Promise(r => setTimeout(r, 2000))]);
    initRoute();
    // Gemerkte Kartenansicht (nur wenn der Nutzer OSM schon einmal erlaubt hat)
    const m = ls.get(LS_MODE);
    if (ls.get(LS_OSM) === '1' && (m === 'osm' || m === 'topo')) setMode(m);
    if (window.ScrollTrigger) ScrollTrigger.refresh();
    handleHash(true);
    warmLayers();
    window.RP17TourenPage = { tours: TOURS, select: selectTour, filter: applyFilter, setMode, state: R };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
