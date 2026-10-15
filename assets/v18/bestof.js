/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE (THROWAWAY)
   1) Basis (Lenis, Header, Menü, Anker) liegt in assets/v18/site.js
   2) Hero: Shop-Film, Headline-Reveal, Film „verdichtet“ sich beim
      Scrollen in den Schriftzug RACEPOINT (Video im Schriftzug, V10)
   3) Traumbike-Story -> assets/v18/traum.js (eigene Datei)
   4) Achim, KI-Status, Samstagsrunde = echter Venn-Klassiker
      (Daten aus assets/v17/touren, Helfer RP18Touren), Kontakt
   Benötigt: gsap, ScrollTrigger, SplitText, DrawSVGPlugin, Lenis,
   window.RP (assets/rp-core.js), window.RP18Touren (touren-map.js)
   ===================================================================== */
(function () {
  'use strict';
  gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const NS = 'http://www.w3.org/2000/svg';
  const RM = !!RP.reducedMotion;
  const fmt = (n, d) => n.toLocaleString('de-BE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  if (RM) document.documentElement.classList.add('rm');

  /* =====================================================================
     1) BASIS: Lenis, Header, Menue, Anker, Sprache -> assets/v18/site.js
     ===================================================================== */
  const lenis = window.RP18Site ? RP18Site.lenis : null; // eslint-disable-line no-unused-vars

  /* =====================================================================
     2) HERO
     ===================================================================== */
  const pin = $('#heroPin'), vid = $('#heroVid');
  const vcPlay = $('#vcPlay'), vcSound = $('#vcSound');
  function syncCtrl() {
    vcPlay.classList.toggle('paused', vid.paused);
    vcPlay.setAttribute('aria-label', vid.paused ? 'Film abspielen' : 'Film pausieren');
    vcSound.classList.toggle('on', !vid.muted);
    vcSound.setAttribute('aria-label', vid.muted ? 'Ton einschalten' : 'Ton ausschalten');
  }
  vid.muted = true;
  vid.addEventListener('play', syncCtrl); vid.addEventListener('pause', syncCtrl); vid.addEventListener('volumechange', syncCtrl);
  let userPaused = RM;
  vcPlay.addEventListener('click', () => {
    if (vid.paused) { userPaused = false; vid.play().catch(() => {}); } else { userPaused = true; vid.pause(); }
  });
  vcSound.addEventListener('click', () => {
    vid.muted = !vid.muted;
    if (!vid.muted && vid.paused) { userPaused = false; vid.play().catch(() => {}); }
  });
  if (!RM) vid.play().catch(() => syncCtrl());
  syncCtrl();
  // Film nur abspielen, solange der Hero sichtbar ist
  ScrollTrigger.create({
    trigger: '.hero', start: 'top bottom', end: 'bottom top',
    onToggle: self => { document.documentElement.classList.toggle('v18-hero', self.isActive); if (self.isActive) { if (!userPaused) vid.play().catch(() => {}); } else vid.pause(); },
  });

  // Schriftzug RACEPOINT als Maske: der Film läuft in den Buchstaben weiter
  const knock = $('#heroKnock'), knockText = $('#knockText'), knockLine = $('#knockLine');
  function layoutKnock() {
    const w = pin.clientWidth, h = pin.clientHeight;
    const two = w / h < 0.95;
    const lines = two ? ['RACE', 'POINT'] : ['RACEPOINT'];
    knockText.textContent = ''; knockLine.textContent = '';
    const els = lines.map(t => {
      const e = document.createElementNS(NS, 'text');
      e.setAttribute('text-anchor', 'middle'); e.setAttribute('font-size', '100');
      e.textContent = t;
      knockLine.appendChild(e);
      return e;
    });
    const maxLen = Math.max.apply(null, els.map(e => e.getComputedTextLength() || 100 * t2len(e.textContent)));
    let fs = 100 * (w * (two ? 0.88 : 0.9)) / maxLen;
    fs = Math.min(fs, h * (two ? 0.3 : 0.38));
    const lh = fs * 0.86, total = lh * (lines.length - 1);
    els.forEach((e, i) => {
      e.setAttribute('font-size', fs.toFixed(1));
      e.setAttribute('x', (w / 2).toFixed(1));
      e.setAttribute('y', (h / 2 - total / 2 + i * lh + fs * 0.34).toFixed(1));
      knockText.appendChild(e.cloneNode(true));
    });
    pin.style.setProperty('--ky', Math.round(total / 2 + fs * 0.48 + 14) + 'px');
  }
  const t2len = s => s.length * 0.5;
  layoutKnock();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layoutKnock(); ScrollTrigger.refresh(); });
  let rz;
  window.addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(layoutKnock, 150); });

  if (!RM) {
    // Headline-Reveal beim Laden
    // Erst mit geladener Schrift zerlegen, sonst springen die Zeilen; bis dahin hält html.rp-boot den Text verborgen
    RP18Site.whenFonts(() => {
      const split = SplitText.create('#heroH span', { type: 'words,chars', mask: 'chars' });
      gsap.from(split.chars, { yPercent: 110, rotate: 4, duration: 0.9, ease: 'power4.out', stagger: 0.022, delay: 0.05 });
      gsap.from(['#heroContent .kicker', '.hero-row', '.hero-pills', '.hero-badge', '#heroCtrl'], { autoAlpha: 0, y: 20, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.35 });
      document.documentElement.classList.remove('rp-boot');
    });
    $('#cue').style.display = 'flex';

    const htl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: pin, start: 'top top', end: () => '+=' + Math.round(innerHeight * 1.15), pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
    });
    htl.to('#heroContent', { autoAlpha: 0, y: -70, duration: 0.32, ease: 'power2.in' }, 0)
      .to(['.hero-badge', '#heroCtrl', '#cue'], { autoAlpha: 0, duration: 0.18 }, 0)
      .to('.hero-shade', { opacity: 0, duration: 0.5 }, 0)
      .fromTo('#heroMedia', { scale: 1, filter: 'brightness(1) saturate(1)' }, { scale: 1.14, filter: 'brightness(1.45) saturate(1.15)', duration: 1 }, 0)
      .fromTo(knock, { autoAlpha: 0, scale: 2.8 }, { autoAlpha: 1, scale: 1, duration: 0.72, ease: 'power2.out', transformOrigin: '50% 50%' }, 0.12)
      .fromTo('#knockSub', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.74)
      .to({}, { duration: 0.12 });
  } else {
    gsap.set(knock, { autoAlpha: 0 });
  }

  /* =====================================================================
     4) SEKTIONEN
     ===================================================================== */
  // Einblenden
  if (!RM) {
    RP18Site.reveal(document);
  } else {
    gsap.set('.rv', { opacity: 1, y: 0 });
  }

  // Hintergrund des Besuch-Abschnitts erst kurz vorher laden
  const visitBg = $('#visitBg');
  if (visitBg) {
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); visitBg.classList.add('lz-on'); } }, { rootMargin: '150% 0px' });
      io.observe(visitBg);
    } else visitBg.classList.add('lz-on');
  }

  // Achim: Foto öffnet sich, Zitat leuchtet Wort für Wort auf
  const quote = $('#quote');
  quote.innerHTML = quote.textContent.trim().split(/\s+/).map(w => '<span class="w">' + w + '</span>').join(' ');
  if (!RM) {
    gsap.to('#achimFig', { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none', scrollTrigger: { trigger: '#achimFig', start: 'top 92%', end: 'top 30%', scrub: true } });
    gsap.to('#achimFig img', { scale: 1, ease: 'none', scrollTrigger: { trigger: '#achimFig', start: 'top 92%', end: 'bottom 20%', scrub: true } });
    gsap.to('#quote .w', { opacity: 1, stagger: 0.12, ease: 'none', scrollTrigger: { trigger: quote, start: 'top 82%', end: 'bottom 45%', scrub: true } });
    $$('[data-count]').forEach(el => {
      const n = +el.dataset.count, o = { v: 0 };
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }) });
    });
    gsap.fromTo('#visitBg', { yPercent: -6 }, { yPercent: 6, ease: 'none', scrollTrigger: { trigger: '#kontakt', start: 'top bottom', end: 'bottom top', scrub: true } });
  }

  // KI-Status (live über /api/status oder Simulation)
  (function aiMode() {
    const el = $('#aiMode');
    let n = 0;
    const tick = () => {
      const K = window.KIBerater;
      if (K && K.isLive && K.isLive()) { el.textContent = '· Live-KI aktiv'; el.classList.add('live'); return; }
      if (++n > 16) { el.textContent = '· Vorschau-Modus'; return; }
      setTimeout(tick, 400);
    };
    tick();
  })();

  /* ---- Samstagsrunde: echte Tour (Venn-Klassiker) aus den Touren-Daten.
     Profil, Stopps und Zahlen kommen aus assets/v17/touren (wie v18-touren.html);
     beim Scrollen fährt der Punkt die Runde ab. ---- */
  (function rideInit() {
    const box = $('#rideBox');
    if (!box || !window.RP18Touren) return;
    const T = window.RP18Touren, BASE = 'assets/v17/touren/', TOUR = 'venn-klassiker';
    const VW = 1000, VH = 240;
    const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const setAll = (sel, v) => $$(sel).forEach(el => { el.textContent = v; });
    function draw(m, st, all) {
      const total = st.km, up = Math.round(st.up);
      // Stopps wie auf der Touren-Seite verorten: Start 0, Ziel = Länge, sonst nächster Streckenpunkt (max. 1,5 km), sonst km-Angabe
      const stops = (m.stops || []).map(s => {
        let km = null;
        if (s.start) km = 0;
        else if (s.ziel) km = total;
        else {
          if (isFinite(s.lat) && isFinite(s.lon)) {
            const i = T.nearestIndex(st.pts, +s.lat, +s.lon);
            if (T.haversine(st.pts[i], { lat: +s.lat, lon: +s.lon }) <= 1.5) km = st.cum[i];
          }
          if (km == null && isFinite(s.km)) km = clamp(+s.km, 0, total);
        }
        return km == null ? null : Object.assign({}, s, { km });
      }).filter(Boolean).sort((a, b) => a.km - b.km);
      // Profil gleichmäßig über die Distanz, Höhenmeter kumuliert (für die Live-Zahl)
      const N = 320, pe = [], pc = [];
      for (let i = 0; i <= N; i++) {
        const fi = T.indexAtKm(st.cum, total * i / N);
        pe.push(T.lerpArr(st.ele, fi)); pc.push(T.lerpArr(st.gain, fi));
      }
      const gMax = pc[N] || 1;
      const lo = Math.floor((st.min - 25) / 50) * 50, hi = Math.ceil((st.max + 15) / 50) * 50;
      const py = e => VH - (e - lo) / (hi - lo) * (VH - 16);
      const at = (arr, p) => T.lerpArr(arr, clamp(p, 0, 1) * N);
      const d = pe.map((e, i) => (i ? 'L' : 'M') + (i / N * VW).toFixed(1) + ',' + py(e).toFixed(1)).join(' ');
      $('#rideLine').setAttribute('d', d);
      $('#rideLineBg').setAttribute('d', d);
      $('#rideArea2').setAttribute('d', d + ' L' + VW + ',' + VH + ' L0,' + VH + ' Z');
      $('#rideProf .grid').innerHTML = [0.25, 0.5, 0.75].map(f => '<line x1="0" x2="' + VW + '" y1="' + (VH * f) + '" y2="' + (VH * f) + '"/>').join('');
      const fill = s => String(s || '').replace(/\{title\}/g, '„' + m.title + '“').replace(/\{km\}/g, fmt(total)).replace(/\{hm\}/g, fmt(up));
      const marks = $('#rideMarks'), stopsEl = $('#rideStops'), dot = $('#rideDot');
      const last = stops.length - 1;
      marks.innerHTML = stops.map((s, i) => '<span style="left:' + (s.km / total * 100).toFixed(2) + '%;top:' + (py(at(pe, s.km / total)) / VH * 100).toFixed(2) + '%"><em>' + (i === 0 ? 'Start' : i === last ? 'Ziel' : 'km ' + fmt(s.km)) + '</em></span>').join('');
      stopsEl.innerHTML = stops.map(s => '<li><span class="km">km ' + fmt(s.km) + ' · ' + esc(s.name) + '</span><h4>' + esc(s.title) + '</h4><p>' + esc(s.tagline) + '</p>' +
        (s.ask ? '<button type="button" data-ask="' + esc(fill(s.ask)) + '">' + esc(s.cta || 'Frag den KI-Berater') + ' →</button>' : '') + '</li>').join('');
      // Zahlen im Text aus den Daten
      setAll('[data-ride="km"]', fmt(total));
      setAll('[data-ride="hm"]', fmt(up));
      setAll('[data-ride="count"]', String(all.length));
      $$('[data-ride-type]').forEach(el => { const n = all.filter(t => t.type === el.dataset.rideType).length; el.textContent = n + (n === 1 ? ' Tour' : ' Touren'); });
      const bsp = $('#rideBsp'); if (bsp) bsp.hidden = !m.beispiel;
      const markEls = $$('span', marks), stopEls = $$('li', stopsEl), rKm = $('#rKm'), rHm = $('#rHm'), rEl = $('#rEl');
      function ride(p) {
        const km = p * total;
        rKm.textContent = fmt(km);
        rHm.textContent = fmt(at(pc, p) / gMax * up);
        rEl.textContent = fmt(at(pe, p));
        markEls.forEach((el, i) => el.classList.toggle('on', km >= stops[i].km - 0.05));
        stopEls.forEach((li, i) => li.classList.toggle('on', km >= stops[i].km - 0.05));
        dot.style.left = (p * 100) + '%';
        dot.style.top = (py(at(pe, p)) / VH * 100) + '%';
        dot.style.opacity = p > 0.002 && p < 0.998 ? 1 : 0;
      }
      if (!RM) {
        gsap.set('#rideLine', { drawSVG: '0%' });
        ride(0);
        const o = { p: 0 };
        gsap.to(o, {
          p: 1, ease: 'none',
          scrollTrigger: { trigger: '#rideBox', start: 'top 72%', end: 'bottom 55%', scrub: 0.6 },
          onUpdate: () => { gsap.set('#rideLine', { drawSVG: (o.p * 100) + '%' }); ride(o.p); },
        });
        ScrollTrigger.sort(); ScrollTrigger.refresh();
      } else {
        ride(1);
      }
      box.classList.add('ready');
    }
    async function load() {
      const man = await (await fetch(BASE + 'touren.json')).json();
      const all = man.touren || [];
      const m = all.find(t => t.id === TOUR) || all[0];
      const r = await fetch(BASE + m.file);
      if (!r.ok) throw new Error(m.file + ': HTTP ' + r.status);
      const g = T.parseGPX(await r.text());
      const st = Object.assign(T.stats(g.pts), { pts: g.pts });
      if (!st.hasEle) throw new Error('keine Höhendaten');
      draw(m, st, all);
    }
    // erst laden, wenn der Abschnitt in die Nähe kommt (GPX ~70 KB)
    let started = false;
    const go = () => {
      if (started) return; started = true;
      load().catch(e => {
        console.warn('[Samstagsrunde]', e);
        box.classList.add('ride-err');
        const s = $('#rideStops'); if (s) s.insertAdjacentHTML('beforebegin', '<p class="ride-msg">Das Höhenprofil lädt gerade nicht. Alle Touren mit GPX findest du auf der Touren-Seite.</p>');
      });
    };
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); go(); } }, { rootMargin: '150% 0px' });
      io.observe(box);
    } else go();
  })();

  /* ---- Öffnungszeiten (live, belgische Zeit) ---- */
  $('#hours').innerHTML = RP.hoursRows('de').map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day + '</span><span>' + r.text + '</span></li>').join('');

  /* Gepinnte Abschnitte (Hero, Traumbike-Story): Trigger nach Seitenposition ordnen */
  ScrollTrigger.sort();
  window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
