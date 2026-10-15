/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE (THROWAWAY)
   1) Basis (Lenis, Header, Menü, Anker) liegt in assets/v18/site.js
   2) Hero: Shop-Film, Headline-Reveal, Film „verdichtet“ sich beim
      Scrollen in den Schriftzug RACEPOINT (Video im Schriftzug, V10)
   3) Traumbike-Story -> assets/v18/traum.js (eigene Datei)
   4) Achim, KI-Status, Samstagsrunde mit Höhenprofil (V10), Kontakt
   Benötigt: gsap, ScrollTrigger, SplitText, DrawSVGPlugin, Lenis,
   window.RP (assets/rp-core.js)
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

  /* ---- Samstagsrunde: Höhenprofil zeichnet sich beim Scrollen ---- */
  const STOPS = [
    { km: 0, t: 'Kaffee bei Achim', tag: 'Start · für alle', x: 'Treffpunkt im Laden, Reifendruck checken – los.', q: 'Welche Runde rund um Schönberg passt zu mir?', a: 'Welche Runde passt zu mir?' },
    { km: 9, t: 'Asphalt-Rampen', tag: 'Rennrad', x: 'Bis 12 %: Hier zeigt ein leichtes Rennrad, was es kann.', q: 'Welches Rennrad passt zu mir?', a: 'Welches Rennrad?' },
    { km: 21, t: 'Schotter im Venn', tag: 'Gravel', x: 'Moor links, Moor rechts, breite Reifen drunter.', q: 'Welches Gravelbike passt zu mir?', a: 'Welches Gravelbike?' },
    { km: 33, t: 'Trails in der Eifel', tag: 'MTB', x: 'Wurzeln, Anlieger – und danach Fahrwerk-Service.', q: 'Welches MTB passt zu meinen Trails?', a: 'Welches MTB?' },
    { km: 42, t: 'Der lange Anstieg', tag: 'E-Bike', x: 'Sieben Kilometer bergauf, oben noch Luft zum Reden.', q: 'Welches E-Bike passt zu mir?', a: 'Welches E-Bike?' },
    { km: 51, t: 'Stopp am See', tag: 'Kids & Einsteiger', x: 'Eis für alle – und Räder für jedes Budget.', q: 'Welches Rad passt für mein Kind oder als Einstieg?', a: 'Rad für mein Kind?' },
  ];
  const TOTAL_KM = 58, TOTAL_HM = 640;
  const CP = [[0, 425], [4, 455], [9, 565], [12, 520], [17, 590], [21, 655], [26, 610], [30, 560], [33, 495], [37, 470], [42, 690], [46, 640], [51, 470], [55, 500], [58, 425]];
  function elev(km) {
    let i = 0;
    while (i < CP.length - 2 && km > CP[i + 1][0]) i++;
    const a = CP[i], b = CP[i + 1], u = clamp((km - a[0]) / (b[0] - a[0]), 0, 1), s = u * u * (3 - 2 * u);
    return a[1] + (b[1] - a[1]) * s + Math.sin(km * 2.3) * 6 + Math.sin(km * 5.1) * 3;
  }
  const VW = 1000, VH = 240, EMIN = 380, EMAX = 720;
  const px = km => km / TOTAL_KM * VW, py = e => VH - (e - EMIN) / (EMAX - EMIN) * (VH - 16);
  const samples = [];
  for (let k = 0; k <= TOTAL_KM + 1e-6; k += 0.25) samples.push([k, elev(k)]);
  // kumulierte Höhenmeter, skaliert auf die offizielle Angabe
  let up = 0; const cum = [0];
  for (let i = 1; i < samples.length; i++) { up += Math.max(0, samples[i][1] - samples[i - 1][1]); cum.push(up); }
  const hmAt = km => cum[Math.min(cum.length - 1, Math.round(km / 0.25))] / up * TOTAL_HM;
  const d = samples.map((s, i) => (i ? 'L' : 'M') + px(s[0]).toFixed(1) + ',' + py(s[1]).toFixed(1)).join(' ');
  $('#rideLine').setAttribute('d', d);
  $('#rideLineBg').setAttribute('d', d);
  $('#rideArea2').setAttribute('d', d + ' L' + VW + ',' + VH + ' L0,' + VH + ' Z');
  $('#rideProf .grid').innerHTML = [0.25, 0.5, 0.75].map(f => '<line x1="0" x2="' + VW + '" y1="' + (VH * f) + '" y2="' + (VH * f) + '"/>').join('');
  const marks = $('#rideMarks'), stopsEl = $('#rideStops'), dot = $('#rideDot');
  const markPts = STOPS.map(s => s.km).concat([TOTAL_KM]);
  marks.innerHTML = markPts.map((k, i) => '<span style="left:' + (k / TOTAL_KM * 100).toFixed(2) + '%;top:' + (py(elev(k)) / VH * 100).toFixed(2) + '%"><em>' + (i === markPts.length - 1 ? 'Ziel' : 'km ' + k) + '</em></span>').join('');
  stopsEl.innerHTML = STOPS.map(s => '<li><span class="km">km ' + s.km + ' · ' + s.tag + '</span><h4>' + s.t + '</h4><p>' + s.x + '</p><button type="button" data-ask="' + s.q + '">' + s.a + ' →</button></li>').join('');
  const markEls = $$('span', marks), stopEls = $$('li', stopsEl), rKm = $('#rKm'), rHm = $('#rHm');
  function ride(p) {
    const km = p * TOTAL_KM;
    rKm.textContent = fmt(km);
    rHm.textContent = fmt(hmAt(km));
    markEls.forEach((m, i) => m.classList.toggle('on', km >= markPts[i] - 0.01));
    stopEls.forEach((li, i) => li.classList.toggle('on', km >= STOPS[i].km - 0.01));
    dot.style.left = (km / TOTAL_KM * 100) + '%';
    dot.style.top = (py(elev(km)) / VH * 100) + '%';
    dot.style.opacity = p > 0.002 && p < 0.998 ? 1 : 0;
  }
  if (!RM) {
    gsap.set('#rideLine', { drawSVG: '0%' });
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '#rideBox', start: 'top 72%', end: 'bottom 55%', scrub: 0.6 },
      onUpdate: () => { gsap.set('#rideLine', { drawSVG: (o.p * 100) + '%' }); ride(o.p); },
    });
    ride(0);
  } else {
    ride(1);
  }

  /* ---- Öffnungszeiten (live, belgische Zeit) ---- */
  $('#hours').innerHTML = RP.hoursRows('de').map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day + '</span><span>' + r.text + '</span></li>').join('');

  /* Gepinnte Abschnitte (Hero, Traumbike-Story): Trigger nach Seitenposition ordnen */
  ScrollTrigger.sort();
  window.addEventListener('load', () => { ScrollTrigger.sort(); ScrollTrigger.refresh(); });
})();
