/* =====================================================================
   RACEPOINT · 10 · DIE RUNDE — Motion & Interaktion (THROWAWAY)
   Lenis + GSAP ScrollTrigger. Kapitel:
   1 Hero (Film) · 2 Route (gepinnte Topo-Karte, Herzstück) ·
   3 Räder · 4 Filme (Scroll-Snap) · 5 Werkstatt · 6 Besuch
   Nutzt window.RP (rp-core.js) für Status, Öffnungszeiten, Video-Lightbox.
   Nur Deutsch.
   ===================================================================== */
(function () {
  'use strict';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const html = document.documentElement;
  const SVGNS = 'http://www.w3.org/2000/svg';

  const HAS_GSAP = !!(window.gsap && window.ScrollTrigger);
  if (!HAS_GSAP) html.classList.replace('motion', 'rm');
  const RM = html.classList.contains('rm');
  const isMobile = () => window.innerWidth <= 760;
  const NF = d => new Intl.NumberFormat('de-DE', { minimumFractionDigits: d, maximumFractionDigits: d });
  const fmt = (n, d) => NF(d).format(n);


  if (HAS_GSAP) {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------- Lenis ---------------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- Header, Hero-Zustand, aktive Navigation ---------------- */
  function initHeader() {
    const hd = $('#hd');
    const links = $$('.hd-nav a');
    const secs = links.map(a => $(a.getAttribute('href')));
    let lastY = window.scrollY;
    function onScroll() {
      const y = window.scrollY, vh = window.innerHeight;
      hd.classList.toggle('is-solid', y > 40);
      const down = y > lastY + 2, up = y < lastY - 2;
      if (html.classList.contains('menu-open')) hd.classList.remove('is-hidden');
      else if (down && y > vh * 0.6) hd.classList.add('is-hidden');
      else if (up || y < vh * 0.6) hd.classList.remove('is-hidden');
      lastY = y;
      html.classList.toggle('v10-hero', y < vh * 0.55);
      let cur = -1;
      secs.forEach((s, i) => { if (s && s.getBoundingClientRect().top < vh * 0.4) cur = i; });
      links.forEach((a, i) => a.classList.toggle('on', i === cur));
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------------- Mobil-Menü ---------------- */
  function initMenu() {
    const btn = $('.hd-burger'), nav = $('#mnav');
    const set = on => {
      html.classList.toggle('menu-open', on);
      btn.setAttribute('aria-expanded', String(on));
      btn.setAttribute('aria-label', on ? 'Menü schließen' : 'Menü öffnen');
      nav.setAttribute('aria-hidden', String(!on));
      if (lenis) on ? lenis.stop() : lenis.start();
    };
    btn.addEventListener('click', () => set(!html.classList.contains('menu-open')));
    nav.addEventListener('click', e => { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && html.classList.contains('menu-open')) set(false); });
  }

  /* ---------------- Anker: sanft scrollen ---------------- */
  function initAnchors() {
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      const el = id === '#top' ? document.body : $(id);
      if (!el) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(el === document.body ? 0 : el, { offset: 0, duration: 1.4 });
      else window.scrollTo({ top: el === document.body ? 0 : el.getBoundingClientRect().top + window.scrollY, behavior: 'auto' });
    });
  }

  /* ---------------- Hero: Film, nächste Runde, Intro ---------------- */
  function initHero() {
    const v = $('#heroVid'), vc = $('#heroVc');
    const setBtn = () => {
      vc.classList.toggle('paused', v.paused);
      vc.setAttribute('aria-label', v.paused ? 'Film abspielen' : 'Film pausieren');
    };
    v.addEventListener('loadedmetadata', () => { if (v.currentTime < 2) v.currentTime = 2.4; }, { once: true });
    v.addEventListener('play', setBtn); v.addEventListener('pause', setBtn);
    vc.addEventListener('click', () => { v.paused ? v.play().catch(() => {}) : v.pause(); });
    if (!RM) {
      const p = v.play();
      if (p && p.catch) p.catch(setBtn);
      // Film nur abspielen, solange der Hero sichtbar ist
      if ('IntersectionObserver' in window) {
        let user = false;
        vc.addEventListener('click', () => { user = v.paused; });
        new IntersectionObserver(es => es.forEach(en => {
          if (en.isIntersecting) { if (!user) v.play().catch(() => {}); } else v.pause();
        })).observe($('.hero'));
      }
    }
    setBtn();

    // Datum der nächsten Samstagsrunde (Belgien-Zeit grob = lokale Zeit)
    const now = new Date();
    const d = new Date(now);
    let add = (6 - now.getDay() + 7) % 7;
    if (add === 0 && now.getHours() >= 9) add = 7;
    d.setDate(now.getDate() + add);
    const label = add === 0 ? 'Heute · 9:00' : 'Sa, ' + d.getDate() + '. ' + d.toLocaleDateString('de-DE', { month: 'long' }) + ' · 9:00';
    $('#nextRide').textContent = label;

    if (RM) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.from('.hero-vid', { scale: 1.18, duration: 2.4, ease: 'power3.out' }, 0)
      .from('.hero-h .hl', { yPercent: 70, autoAlpha: 0, duration: 1.4, stagger: 0.12 }, 0.15)
      .from('.hero-k', { y: 16, autoAlpha: 0, duration: 1 }, 0.1)
      .from('.hero-txt > *', { y: 26, autoAlpha: 0, duration: 1.1, stagger: 0.08 }, 0.45)
      .from('.ticket', { y: 30, autoAlpha: 0, duration: 1.2 }, 0.7)
      .from('.hero-vc, .hero-cue', { autoAlpha: 0, duration: 1 }, 1);
    // Scroll: Film zoomt leicht, Inhalt gleitet weg
    gsap.to('.hero-media', { yPercent: 18, scale: 1.08, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero-in', { y: -90, autoAlpha: 0.15, ease: 'none', scrollTrigger: { trigger: '.hero', start: '30% top', end: 'bottom top', scrub: true } });
  }

  /* =====================================================================
     2 · DIE RUNDE — Karte, Route, Fahrer, Wegpunkte, Profil
     ===================================================================== */
  const WP_NAMES = ['Start · Schönberg', 'Asphalt-Rampen', 'Hohes Venn', 'Eifel-Trails', 'Langer Anstieg', 'See', 'Ziel'];

  function initRoute() {
    const M = window.RundeMap;
    if (!M || !HAS_GSAP) return;
    const sec = $('.route'), pin = $('.route-pin');
    const svg = $('.map'), camG = $('.cam', svg);
    const cards = $$('.wp-card'), dots = $$('.rp-dots li');
    const KM = M.WP_KM, N = KM.length;

    // --- Karte aufbauen ---
    const wpHTML = KM.map((km, k) => {
      const p = M.wpPoint(k);
      return '<g class="wp-m" transform="translate(' + p[0] + ' ' + p[1] + ')"><g class="wp-s">' +
        '<circle class="o" r="12"/><text class="n" y="4.3" text-anchor="middle">' + (k + 1) + '</text>' +
        '<text class="wp-l" x="20" y="4">' + (isMobile() && k === 4 ? 'Anstieg' : WP_NAMES[k]) + '</text></g></g>';
    }).join('');
    const lbHTML = M.LABELS.map(l =>
      '<g class="lb lb-' + l.cls + '" transform="translate(' + l.x + ' ' + l.y + ')"><g class="lb-s"><text text-anchor="' + (l.anchor || 'middle') + '"' +
      (l.rot ? ' transform="rotate(' + l.rot + ')"' : '') + '>' + M.LABEL_TEXT[l.k].de + '</text></g></g>').join('');
    camG.innerHTML = M.layersSVG() +
      '<path class="r-preview" d="' + M.routeD + '"/>' +
      '<path class="r-casing" d="' + M.routeD + '"/>' +
      '<path class="r-draw" d="' + M.routeD + '"/>' +
      '<g class="labels">' + lbHTML + '</g>' +
      '<g class="wps">' + wpHTML + '</g>' +
      '<g class="rider"><circle class="bb" r="40"/><circle class="halo" r="28"/><circle class="core" r="12"/><path class="chev" d="M-3,-4.6 L2.6,0 L-3,4.6"/></g>';

    const drawPath = $('.r-draw', camG), casing = $('.r-casing', camG), preview = $('.r-preview', camG);
    const rider = $('.rider', camG);
    const wpM = $$('.wp-m', camG), wpS = $$('.wp-s', camG), lbS = $$('.lb-s', camG);
    const Ltot = drawPath.getTotalLength();
    const tmp = document.createElementNS(SVGNS, 'path');
    camG.appendChild(tmp);
    const fr = KM.map((_, k) => {
      if (k === 0) return 0;
      if (k === N - 1) return 1;
      tmp.setAttribute('d', M.routePrefixD(k));
      return tmp.getTotalLength() / Ltot;
    });
    tmp.remove();

    // --- Höhenprofil ---
    const prof = $('.prof');
    let PW = 0, PH = 0, profX, profY, pClip, pDot, pVal;
    function buildProfile() {
      const r = prof.getBoundingClientRect();
      PW = r.width; PH = r.height;
      if (!PW || !PH) return;
      prof.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH);
      const big = PH > 70;
      const top = big ? 18 : 14, bot = PH - (big ? 16 : 2), emin = 360, emax = 720;
      profX = km => km / 58 * PW;
      profY = e => bot - (e - emin) / (emax - emin) * (bot - top);
      let line = '';
      for (let km = 0; km <= 58.001; km += 0.25) line += (km ? 'L' : 'M') + profX(km).toFixed(1) + ',' + profY(M.elev(km)).toFixed(1);
      const area = line + 'L' + PW + ',' + bot + 'L0,' + bot + 'Z';
      let ticks = '';
      KM.forEach((km, k) => {
        const x = profX(km);
        ticks += '<line class="pt" x1="' + x + '" x2="' + x + '" y1="' + (top - 2) + '" y2="' + bot + '"/>' +
          '<text class="pn" x="' + x + '" y="' + (top - 5) + '" text-anchor="' + (k === 0 ? 'start' : k === N - 1 ? 'end' : 'middle') + '">' + (k + 1) + '</text>';
      });
      let kms = '';
      if (big) [0, 10, 20, 30, 40, 50, 58].forEach((km, i, a) => {
        kms += '<text class="pkm" x="' + profX(km) + '" y="' + (PH - 1) + '" text-anchor="' + (i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle') + '">' + km + (i === a.length - 1 ? ' km' : '') + '</text>';
      });
      prof.innerHTML = '<defs><clipPath id="profClip"><rect class="pc" x="0" y="0" width="0" height="' + PH + '"/></clipPath></defs>' +
        '<path class="pa" d="' + area + '"/><path class="pl" d="' + line + '"/>' +
        '<g clip-path="url(#profClip)"><path class="pa2" d="' + area + '"/><path class="pl2" d="' + line + '"/></g>' +
        ticks + kms + '<line class="pbase" x1="0" x2="' + PW + '" y1="' + bot + '" y2="' + bot + '"/>' +
        '<text class="pval" y="0"></text><circle class="pdot" r="4.5"/>';
      pClip = $('.pc', prof); pDot = $('.pdot', prof); pVal = $('.pval', prof);
      statsKm = -1;
    }

    // --- Kamera ---
    const stamp = $('.route-stamp');
    const cam = { f: 0, zoom: 2.4, fit: 0 };
    let area = null, sFit = 1;
    const pts = M.ROUTE_PTS;
    const bb = pts.reduce((a, p) => ({ x0: Math.min(a.x0, p[0]), y0: Math.min(a.y0, p[1]), x1: Math.max(a.x1, p[0]), y1: Math.max(a.y1, p[1]) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    const bbC = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
    function layoutMap() {
      const r = svg.getBoundingClientRect();
      const W = r.width, H = r.height;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      const hd = parseFloat(getComputedStyle(html).getPropertyValue('--hd')) || 72;
      if (RM) {
        area = { x: 40, y: 60, w: W - 80, h: H - 100 };
      } else if (isMobile()) {
        area = { x: 10, y: 50, w: W - 112, h: H - 50 - 84 };
      } else {
        const pr = $('.route-panel').getBoundingClientRect(), pf = $('.route-profile').getBoundingClientRect();
        const left = pr.right - r.left + 40;
        area = { x: left, y: hd + 70, w: W - left - 70, h: (pf.top - r.top) - (hd + 70) - 30 };
      }
      area.cx = area.x + area.w / 2; area.cy = area.y + area.h / 2;
      const pad = 60;
      sFit = Math.min(area.w / (bb.x1 - bb.x0 + pad * 2), area.h / (bb.y1 - bb.y0 + pad * 2));
      const pinR = pin.getBoundingClientRect();
      stamp.style.left = (r.left - pinR.left + area.cx).toFixed(1) + 'px';
      stamp.style.top = (r.top - pinR.top + area.cy).toFixed(1) + 'px';
      buildProfile();
      render();
    }

    // --- Rendern ---
    let statsKm = -1, curCard = -1;
    const elKm = $('.st-km'), elHm = $('.st-hm'), elWp = $('.st-wp');
    const scaleBar = $('.mf-scale i'), scaleTxt = $('.mf-scale b');
    function kmAt(f) {
      for (let k = 0; k < N - 1; k++) if (f <= fr[k + 1]) return lerp(KM[k], KM[k + 1], (f - fr[k]) / (fr[k + 1] - fr[k] || 1));
      return 58;
    }
    function render() {
      if (!area) return;
      const s = sFit * lerp(cam.zoom, 1, cam.fit);
      const P = drawPath.getPointAtLength(cam.f * Ltot);
      const cx = lerp(P.x, bbC.x, cam.fit), cy = lerp(P.y, bbC.y, cam.fit);
      camG.setAttribute('transform', 'matrix(' + s.toFixed(4) + ' 0 0 ' + s.toFixed(4) + ' ' + (area.cx - cx * s).toFixed(2) + ' ' + (area.cy - cy * s).toFixed(2) + ')');
      const inv = 1 / s;
      drawPath.style.strokeWidth = 5.5 * inv;
      casing.style.strokeWidth = 11 * inv;
      preview.style.strokeWidth = 2 * inv;
      preview.style.strokeDasharray = (0.1 * inv) + ' ' + (7 * inv);
      const sc = 'scale(' + inv.toFixed(4) + ')';
      for (let i = 0; i < wpS.length; i++) wpS[i].setAttribute('transform', sc);
      for (let i = 0; i < lbS.length; i++) lbS[i].setAttribute('transform', sc);
      gsap.set(rider, { scale: inv });
      const pxKm = Ltot / 58 * s;
      const unit = pxKm > 70 ? 1 : pxKm > 28 ? 2 : 5;
      scaleBar.style.width = (pxKm * unit).toFixed(1) + 'px';
      scaleTxt.textContent = unit + ' km';
      const km = kmAt(cam.f);
      if (Math.abs(km - statsKm) > 0.01) {
        statsKm = km;
        elKm.textContent = fmt(km, 1);
        elHm.textContent = fmt(Math.round(M.gainAt(km)), 0);
        if (pClip) {
          const x = profX(km), y = profY(M.elev(km));
          pClip.setAttribute('width', x.toFixed(1));
          pDot.setAttribute('cx', x.toFixed(1)); pDot.setAttribute('cy', y.toFixed(1));
          pVal.textContent = Math.round(M.elev(km)) + ' m';
          pVal.setAttribute('x', clamp(x, 24, PW - 24).toFixed(1));
          pVal.setAttribute('y', Math.max(10, y - 10).toFixed(1));
          pVal.setAttribute('text-anchor', 'middle');
        }
      }
    }

    // --- Stopp wechseln ---
    function showCard(k) {
      if (k === curCard) return;
      const next = cards[k];
      curCard = k;
      const out = cards.filter(c => c !== next && (gsap.getTweensOf(c).length || +gsap.getProperty(c, 'opacity') > 0));
      if (out.length) gsap.to(out, { autoAlpha: 0, y: -10, duration: 0.22, ease: 'power2.in', overwrite: true });
      const d = out.length ? 0.12 : 0;
      gsap.fromTo(next, { autoAlpha: 0, y: 18 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: d, overwrite: true });
      const img = $('.wp-img img', next);
      gsap.fromTo(img, { scale: 1.2 }, { scale: 1, duration: 1.3, ease: 'expo.out', delay: d, overwrite: true });
      const o = $('.o', wpM[k]);
      gsap.fromTo(o, { attr: { r: 22 } }, { attr: { r: 12 }, duration: 0.7, ease: 'back.out(3)', overwrite: true });
      wpM.forEach((m, i) => { m.classList.toggle('on', i <= k); m.classList.toggle('cur', i === k); });
      dots.forEach((dd, i) => { dd.classList.toggle('on', i < k); dd.classList.toggle('cur', i === k); });
      elWp.textContent = (k + 1) + '/' + N;
    }

    if (RM) {
      // Reduzierte Bewegung: komplette Runde in der Übersicht, Stopps als Raster darunter
      cam.f = 1; cam.fit = 1;
      gsap.set([drawPath, casing], { drawSVG: '0% 100%' });
      const end = M.wpPoint(N - 1);
      gsap.set(rider, { x: end[0], y: end[1] });
      wpM.forEach(m => m.classList.add('on'));
      sec.classList.add('is-done');
      elWp.textContent = N + '/' + N;
      layoutMap();
      window.addEventListener('resize', layoutMap);
      return;
    }

    // --- Zeitleiste: Etappen + kurzes Verweilen an jedem Wegpunkt ---
    gsap.set([drawPath, casing], { drawSVG: '0% 0%' });
    const p0 = M.wpPoint(0);
    gsap.set(rider, { x: p0[0], y: p0[1], transformOrigin: '50% 50%' });
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' }, onUpdate: () => { render(); onTime(); } });
    const arrive = [0];
    let t = 0.7;
    tl.fromTo(cam, { zoom: 2.4 }, { zoom: 1.75, duration: 1.6 }, 0);
    for (let k = 0; k < N - 1; k++) {
      const d = 1.1 + (KM[k + 1] - KM[k]) / 10;
      tl.to(cam, { f: fr[k + 1], duration: d }, t);
      tl.to([drawPath, casing], { drawSVG: '0% ' + (fr[k + 1] * 100).toFixed(3) + '%', duration: d }, t);
      tl.to(rider, { motionPath: { path: drawPath, start: fr[k], end: fr[k + 1], autoRotate: true }, duration: d }, t);
      t += d;
      arrive.push(t);
      t += 0.9;
    }
    tl.to(cam, { fit: 1, duration: 1.6, ease: 'power2.inOut' }, arrive[N - 1] + 0.1);
    tl.to({}, { duration: 1.3 }, arrive[N - 1] + 1.7);

    let stampOn = false;
    gsap.set(stamp, { xPercent: -50, yPercent: -50 });
    function onTime() {
      const time = tl.time();
      let k = 0;
      for (let i = 1; i < arrive.length; i++) if (time >= arrive[i] - 0.06) k = i;
      showCard(k);
      sec.classList.toggle('is-done', time > arrive[N - 1] + 0.6);
      const on = time > arrive[N - 1] + 1.3;
      if (on !== stampOn) {
        stampOn = on;
        if (on) gsap.fromTo(stamp, { autoAlpha: 0, scale: 1.7, rotation: -24 }, { autoAlpha: 1, scale: 1, rotation: -10, duration: 0.55, ease: 'back.out(2.2)', overwrite: true });
        else gsap.to(stamp, { autoAlpha: 0, duration: 0.25, overwrite: true });
      }
    }

    layoutMap();
    showCard(0);
    ScrollTrigger.create({
      trigger: sec, start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * (isMobile() ? 5.6 : 6.4)),
      pin: true, scrub: 0.8, anticipatePin: 1, animation: tl,
      onToggle: self => html.classList.toggle('v10-route', self.isActive),
      onRefresh: layoutMap,
    });
  }

  /* ---------------- Filme: Scroll-Snap-Leiste ---------------- */
  function initFilms() {
    const strip = $('#filmStrip'), bar = $('#filmBar'), count = $('#filmCount');
    const prev = $('[data-film-dir="-1"]'), next = $('[data-film-dir="1"]');
    function update() {
      const max = strip.scrollWidth - strip.clientWidth;
      const ratio = strip.scrollWidth ? strip.clientWidth / strip.scrollWidth : 1;
      bar.style.width = (ratio * 100).toFixed(2) + '%';
      bar.style.transform = 'translateX(' + (max > 0 ? (strip.scrollLeft / max) * (1 / ratio - 1) * 100 : 0).toFixed(2) + '%)';
      prev.disabled = strip.scrollLeft < 8;
      next.disabled = strip.scrollLeft > max - 8;
      const films = $$('.film', strip), w = films[0].getBoundingClientRect().width + parseFloat(getComputedStyle(strip).columnGap || 18);
      const first = Math.round(strip.scrollLeft / w) + 1, vis = Math.max(1, Math.round((strip.clientWidth + 18) / w));
      const pad = n => String(n).padStart(2, '0');
      count.textContent = (vis > 1 ? pad(first) + '–' + pad(Math.min(films.length, first + vis - 1)) : pad(first)) + ' / ' + pad(films.length);
    }
    $$('[data-film-dir]').forEach(b => b.addEventListener('click', () => {
      const card = $('.film', strip);
      const step = strip.clientWidth + parseFloat(getComputedStyle(strip).columnGap || 18);
      strip.scrollBy({ left: step * +b.dataset.filmDir, behavior: RM ? 'auto' : 'smooth' });
    }));
    strip.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------------- Öffnungszeiten (live) ---------------- */
  function renderHours() {
    if (!window.RP || !RP.hoursRows) return;
    $('#hours').innerHTML = RP.hoursRows('de').map(r =>
      '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day +
      (r.today ? '<em class="td">heute</em>' : '') + '</span><b>' + r.text + '</b></li>').join('');
  }

  /* ---------------- Reveals ---------------- */
  function initReveals() {
    if (RM) return;
    ScrollTrigger.batch('.rv', {
      start: 'top 90%', once: true,
      onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1.1, ease: 'expo.out', stagger: 0.08, overwrite: true }),
    });
    gsap.from('.film', { x: 60, autoAlpha: 0, duration: 1.2, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: '#filmStrip', start: 'top 88%', once: true } });
    $$('.svc figure img, .visit-fig img').forEach(img => {
      gsap.fromTo(img, { scale: 1.14 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.from('.ft-big', { yPercent: 30, autoAlpha: 0, duration: 1.3, ease: 'expo.out', scrollTrigger: { trigger: '.ft', start: 'top 85%', once: true } });
  }

  /* ---------------- Start ---------------- */
  function boot() {
    // Seite ist nur deutsch: Status-Pillen immer auf Deutsch (unabhängig von gespeicherter Sprache)
    if (window.RP && RP.lang !== 'de') { RP.lang = 'de'; html.lang = 'de'; RP.updateStatusPills && RP.updateStatusPills(); }
    initHeader();
    initMenu();
    initAnchors();
    initHero();
    initFilms();
    renderHours();
    if (!HAS_GSAP) return;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(r => setTimeout(r, 2500))]).then(() => {
      initRoute();
      initReveals();
      ScrollTrigger.refresh();
      let rt;
      window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => ScrollTrigger.refresh(), 180); });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
