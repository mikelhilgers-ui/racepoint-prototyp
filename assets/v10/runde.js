/* =====================================================================
   RACEPOINT · 10 · DIE RUNDE — Motion & Interaktion (THROWAWAY)
   Lenis (Smooth Scroll) + GSAP ScrollTrigger. Kapitel:
   1 Stage (Text-Fenster + Film-Scrub) · 2 Ticker · 3 Kinetik ·
   4 Route (Karte) · 5 Galerie · 6 Kreis-Reveal · 7 Budget · 8 Ziel
   Nutzt window.RP (rp-core.js) fuer Sprache, Status, Video-Lightbox.
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
  const lang = () => (window.RP && RP.lang) || 'de';
  const isMobile = () => window.innerWidth <= 900;
  const fmt = (n, d) => new Intl.NumberFormat(lang() === 'en' ? 'en-GB' : lang(), { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);

  if (HAS_GSAP) {
    gsap.registerPlugin(ScrollTrigger, SplitText, DrawSVGPlugin, MotionPathPlugin);
    ScrollTrigger.config({ ignoreMobileResize: true });
  }

  /* ---------------- Lenis + ScrollTrigger (Standard-Kopplung) ---------------- */
  let lenis = null;
  if (!RM && window.Lenis) {
    lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  const scrollPos = () => (lenis ? lenis.scroll : window.scrollY);

  /* ---------------- Header: verstecken / zeigen, Fortschritt, dunkel ---------------- */
  const darkSources = new Set();
  function setHdDark(key, on) {
    if (on) darkSources.add(key); else darkSources.delete(key);
    $('#hd').classList.toggle('is-dark', darkSources.size > 0);
  }
  let menuOpen = false;
  function initHeader() {
    const hd = $('#hd'), bar = $('.hd-progress i');
    let lastY = scrollPos();
    const onScroll = y => {
      const dir = y > lastY + 0.5 ? 1 : y < lastY - 0.5 ? -1 : 0;
      lastY = y;
      hd.classList.toggle('is-scrolled', y > 24);
      if (!menuOpen) {
        if (dir > 0 && y > 160) hd.classList.add('is-hidden');
        else if (dir < 0) hd.classList.remove('is-hidden');
      }
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = 'scaleX(' + (max > 0 ? clamp(y / max, 0, 1) : 0) + ')';
    };
    if (lenis) lenis.on('scroll', e => onScroll(e.scroll));
    else window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    onScroll(scrollPos());
  }

  /* ---------------- Mobil-Menue ---------------- */
  function openMenu() {
    menuOpen = true;
    document.body.classList.add('menu-open');
    $('#mnav').setAttribute('aria-hidden', 'false');
    $('.hd-burger').setAttribute('aria-expanded', 'true');
    $('#hd').classList.remove('is-hidden');
    if (lenis) lenis.stop();
    if (!RM) gsap.fromTo('.mnav-links a', { yPercent: 60, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: 0.8, ease: 'expo.out', delay: 0.15 });
  }
  function closeMenu() {
    if (!menuOpen) return;
    menuOpen = false;
    document.body.classList.remove('menu-open');
    $('#mnav').setAttribute('aria-hidden', 'true');
    $('.hd-burger').setAttribute('aria-expanded', 'false');
    if (lenis) lenis.start();
  }
  function initMenu() {
    $('.hd-burger').addEventListener('click', () => (menuOpen ? closeMenu() : openMenu()));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  }

  /* ---------------- Anker-Links: sanft, bei weiten Spruengen mit Vorhang ---------------- */
  let curtain;
  function goTo(el) {
    const t = el.parentElement && el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    const y = el.id === 'top' ? 0 : t.getBoundingClientRect().top + scrollPos();
    if (!lenis) { window.scrollTo(0, y); return; }
    const far = Math.abs(y - scrollPos()) > window.innerHeight * 2.5;
    if (!far) { lenis.scrollTo(y, { duration: 1.4 }); return; }
    gsap.to(curtain, {
      autoAlpha: 1, duration: 0.3, ease: 'power2.in', onComplete: () => {
        lenis.scrollTo(y, { immediate: true, force: true });
        ScrollTrigger.update();
        gsap.to(curtain, { autoAlpha: 0, duration: 0.6, delay: 0.25, ease: 'power2.out' });
      },
    });
  }
  function initAnchors() {
    curtain = document.createElement('div');
    curtain.className = 'curtain';
    document.body.appendChild(curtain);
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const el = document.getElementById(a.getAttribute('href').slice(1));
      if (!el) return;
      e.preventDefault();
      const wasOpen = menuOpen;
      closeMenu();
      setTimeout(() => goTo(el), wasOpen ? 250 : 0);
    });
  }

  /* =====================================================================
     1 · STAGE — Hero „Text als Fenster“ + Film-Scrub
     ===================================================================== */
  const HERO_WORDS = { de: ['DIE', 'RUNDE'], fr: ['LA', 'SORTIE'], nl: ['DE', 'RONDE'], en: ['THE', 'RIDE'] };
  // [Zeile, Zeichen] im zweizeiligen Layout: durch diesen Buchstaben fliegen wir
  const HERO_TARGET = { de: [0, 1], fr: [1, 4], nl: [0, 1], en: [1, 1] };
  const stage = { layout() {}, refreshLang() {} };

  function initStage() {
    const pin = $('.stage-pin'), video = $('.stage-video'), canvas = $('.stage-mask'), ctx = canvas.getContext('2d');
    const heroUI = $('.hero-ui'), word = $('.hero-word'), badge = $('.hero-badge');
    const film = $('.film-ui'), shade = $('.stage-shade');
    const caps = $$('.film-cap'), bars = $$('.film-bar'), tc = $('.film-tc'), num = $('.film-num span');
    const PAPER = '#f5f2ec';
    const CH = [0, 6.4, 12.0, 19.35];     // Kapitel-Startzeiten im Video (s)
    const END = 22.4;                     // letztes Bild vor der Abblende ins Schwarz
    const LOOP_END = 5.2;                 // Hero: Beratungs-Szenen in Schleife
    const PA = 0.2;                       // Anteil des Pins fuer den Zoom
    let L = null, z = -1, P = 0, mode = 'play', t0 = 0, curT = 0, targetT = 0, chap = -1;
    const easeS = gsap.parseEase('power3.in'), easeP = gsap.parseEase('power2.inOut');

    // Stamm-Position eines Buchstabens finden (erste volle Senkrechte bei 30 % Hoehe)
    const stemCache = {};
    function findStem(ch, capH) {
      if (stemCache[ch]) return stemCache[ch];
      const S = 300, c = document.createElement('canvas');
      c.width = S * 1.4; c.height = S * 1.2;
      const x = c.getContext('2d');
      x.font = S + 'px Anton'; x.fillStyle = '#000';
      x.fillText(ch, 20, S);
      const row = Math.round(S - capH * S * 0.7);
      const d = x.getImageData(0, row, c.width, 1).data;
      let a = -1, b = -1;
      for (let i = 0; i < c.width; i++) {
        const on = d[i * 4 + 3] > 140;
        if (on && a < 0) a = i;
        if (!on && a >= 0) { b = i; break; }
      }
      const res = a < 0 ? { cx: 0.12, w: 0.18 } : { cx: ((a + b) / 2 - 20) / S, w: (b - a) / S };
      return (stemCache[ch] = res);
    }

    function layout() {
      const host = RM ? heroUI : pin;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = host.clientWidth, H = host.clientHeight;
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
      // Platzhalter-Box im Layout (offset* ignoriert die Zoom-Verschiebung der hero-ui)
      const box = { x: word.offsetLeft, y: word.offsetTop, w: word.offsetWidth, h: word.offsetHeight };
      const two = W < 760 || W / heroUI.clientHeight < 0.9;
      const words = HERO_WORDS[lang()] || HERO_WORDS.de, tgt = HERO_TARGET[lang()] || HERO_TARGET.de;
      const lines = two ? words.slice() : [words.join(' ')];
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.font = '100px Anton';
      const widths = lines.map(l => ctx.measureText(l).width);
      const capH = ctx.measureText('H').actualBoundingBoxAscent / 100;
      const gap = 0.075;
      const maxW = Math.max.apply(null, widths);
      const fs = Math.min(box.w / maxW * 100, box.h / (lines.length * capH + (lines.length - 1) * gap));
      const textW = maxW * fs / 100, textH = fs * (lines.length * capH + (lines.length - 1) * gap);
      // Plakat-Trick: Anton vertikal strecken, wenn Platz da ist
      const vs = clamp(box.h / textH, 1, two ? 1.22 : 1.3);
      const x0 = box.x + (two ? 0 : (box.w - textW) / 2);
      const y0 = box.y + (box.h - textH * vs) / 2;
      const base = lines.map((_, i) => y0 + fs * capH * (i + 1) + fs * gap * i);
      const sy = y => y0 + (y - y0) * vs;      // ungestreckt -> gestreckt
      let li, ci;
      if (two) { li = tgt[0]; ci = tgt[1]; } else { li = 0; ci = tgt[0] === 0 ? tgt[1] : words[0].length + 1 + tgt[1]; }
      ctx.font = fs + 'px Anton';
      const prefixW = ctx.measureText(lines[li].slice(0, ci)).width;
      const stem = findStem(lines[li][ci], capH);
      const ox = x0 + prefixW + stem.cx * fs, oy = sy(base[li] - fs * capH / 2);
      const smax = 1.18 * Math.max(W / (stem.w * fs), H / (fs * capH * vs));
      L = { W, H, dpr, lines, fs, x0, y0, vs, base, ox, oy, smax };
      // Video-Badge platzieren
      const bw = badge.offsetWidth;
      let bx, by;
      if (two) {
        const w0 = widths[0] * fs / 100, free = box.x + box.w - (x0 + w0);
        bx = free > bw + 16 ? x0 + w0 + (free - bw) / 2 + 6 : box.x + box.w - bw;
        by = sy(base[0] - fs * capH / 2) - bw / 2;
      } else {
        bx = Math.min(x0 + textW - bw * 0.78, W - bw - 16);
        by = y0 - bw * 0.56;
      }
      badge.style.transform = 'translate(' + Math.round(bx) + 'px,' + Math.round(by) + 'px)';
      badge.classList.add('is-placed');
      z = -1;
      draw(clamp(P / PA, 0, 1));
    }

    function draw(zz) {
      if (!L) return;
      const W = L.W, H = L.H, dpr = L.dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (zz >= 1) return;
      ctx.fillStyle = PAPER;
      ctx.fillRect(0, 0, W, H);
      const s = 1 + (L.smax - 1) * easeS(zz), p = easeP(zz);
      const cx = L.ox + (W / 2 - L.ox) * p, cy = L.oy + (H / 2 - L.oy) * p;
      ctx.globalCompositeOperation = 'destination-out';
      ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * (cx - L.ox * s), dpr * (cy - L.oy * s));
      ctx.translate(0, L.y0); ctx.scale(1, L.vs); ctx.translate(0, -L.y0);
      ctx.font = L.fs + 'px Anton';
      ctx.fillStyle = '#000';
      for (let i = 0; i < L.lines.length; i++) ctx.fillText(L.lines[i], L.x0, L.base[i]);
      ctx.globalCompositeOperation = 'source-over';
    }

    // Scroll -> Videozeit (stueckweise linear; Startpunkt = wo das Video gerade war).
    // 16,4–19,35 s (Werkstatt-Details) wird im Zeitraffer durchfahren.
    function timeAt(p) {
      const K = [[0, t0], [PA, Math.min(t0 + 0.8, 6.1)], [0.36, 6.4], [0.55, 12.0], [0.72, 16.4], [0.77, 19.35], [1, END]];
      for (let i = 1; i < K.length; i++) {
        if (p <= K[i][0]) return lerp(K[i - 1][1], K[i][1], (p - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
      }
      return END;
    }
    const chapterOf = t => (t >= CH[3] ? 3 : t >= CH[2] ? 2 : t >= CH[1] ? 1 : 0);
    const fmtTC = t => {
      const m = Math.floor(t / 60), s = Math.floor(t % 60), f = Math.floor((t % 1) * 24);
      return '00:' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') + ':' + String(f).padStart(2, '0');
    };

    // Kapitelwechsel als eine Timeline: alte Zeilen nach oben raus, erst dann die neuen
    // von unten rein. Ein neuer Wechsel bricht die laufende Timeline ab und setzt alle
    // Zustaende neu – so steht nie eine halbe Caption im Bild.
    const capLines = c => c.querySelectorAll('.li');
    const capRest = c => c.querySelectorAll(':scope > .kicker, :scope > p');
    let capTl = null;
    function setChapter(i) {
      if (i === chap) return;
      const prev = caps[chap], next = caps[i];
      chap = i;
      if (capTl) capTl.kill();
      // nur eine sichtbare Caption muss erst raus
      const out = prev && +gsap.getProperty(prev, 'opacity') > 0 ? prev : null;
      caps.forEach(c => { if (c !== out) gsap.set(c, { autoAlpha: 0 }); });
      const tl = capTl = gsap.timeline();
      const inAt = out ? 0.42 : 0;
      if (out) {
        tl.to(capLines(out), { yPercent: -140, duration: 0.4, ease: 'power3.in', stagger: 0.04 }, 0)
          .to(capRest(out), { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in' }, 0)
          .set(out, { autoAlpha: 0 }, inAt);
        if (next) tl.to(num, { yPercent: -105, duration: 0.35, ease: 'power3.in' }, 0);
      }
      if (!next) return;
      tl.set(next, { autoAlpha: 1 }, inAt)
        .fromTo(capLines(next), { yPercent: 140 }, { yPercent: 0, duration: 0.95, ease: 'expo.out', stagger: 0.08, immediateRender: false }, inAt)
        .fromTo(capRest(next), { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.06, immediateRender: false }, inAt + 0.12)
        .call(() => { num.textContent = '0' + (i + 1); }, null, inAt)
        .fromTo(num, { yPercent: 105 }, { yPercent: 0, duration: 1, ease: 'expo.out', immediateRender: false }, inAt);
    }

    let lastT = -1, lastP = -1;
    function renderFilm() {
      if (curT === lastT && P === lastP) return;
      lastT = curT; lastP = P;
      setChapter(P < PA * 0.95 ? -1 : chapterOf(curT));
      const ci = chapterOf(curT);
      for (let i = 0; i < bars.length; i++) {
        const a = CH[i], e = CH[i + 1] || END;
        bars[i].style.setProperty('--p', clamp((curT - a) / (e - a), 0, 1).toFixed(4));
        bars[i].classList.toggle('on', i === ci);
      }
      tc.textContent = 'TC ' + fmtTC(curT);
    }

    function update(progress) {
      P = progress;
      const zz = clamp(P / PA, 0, 1);
      if (zz !== z) {
        z = zz;
        draw(zz);
        canvas.style.opacity = String(1 - clamp((zz - 0.86) / 0.14, 0, 1));
        heroUI.style.opacity = String(1 - clamp(zz * 3.2, 0, 1));
        heroUI.style.transform = 'translate3d(0,' + (-zz * 90).toFixed(1) + 'px,0)';
        heroUI.style.visibility = zz > 0.4 ? 'hidden' : '';
      }
      setHdDark('stage', zz > 0.55 && P < 0.999);
      const f = clamp((P - PA * 0.9) / (PA * 0.25), 0, 1);
      film.style.opacity = f;
      shade.style.opacity = f;
      if (P < 0.002) {
        if (mode !== 'play') { mode = 'play'; video.play().catch(() => {}); }
      } else {
        if (mode === 'play') {
          mode = 'scrub';
          video.pause();
          t0 = Math.min(video.currentTime || 0, LOOP_END);
          curT = video.currentTime || 0;
        }
        targetT = timeAt(P);
      }
    }

    stage.layout = layout;
    video.muted = true;

    if (RM) {
      // Reduzierte Bewegung: kein Pin, kein Zoom. Film-Kapitel als Standbild-Raster.
      caps.forEach((c, i) => {
        const img = document.createElement('img');
        img.src = 'assets/v10/film-' + (i + 1) + '.jpg'; img.alt = ''; img.loading = 'lazy'; img.className = 'film-still';
        c.prepend(img);
      });
      layout();
      return;
    }

    video.play().catch(() => {});
    layout();
    update(0);

    ScrollTrigger.create({
      trigger: '.stage', start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * (isMobile() ? 4.6 : 5.2)),
      pin: true, anticipatePin: 1,
      onUpdate: self => update(self.progress),
      onLeave: () => setHdDark('stage', false),
    });
    const spacer = $('.stage').parentElement;
    if (spacer.classList.contains('pin-spacer')) {
      ScrollTrigger.create({ trigger: spacer, start: 'bottom bottom', end: 'bottom 36px', onToggle: s => setHdDark('stage-out', s.isActive) });
    }

    // Videozeit weich nachfuehren (Lerp), Kapitel/Balken/Timecode rendern
    gsap.ticker.add(() => {
      if (mode === 'play') {
        if (video.currentTime > LOOP_END) video.currentTime = 0;
        curT = video.currentTime;
      } else {
        curT += (targetT - curT) * 0.16;
        if (Math.abs(targetT - curT) < 0.004) curT = targetT;
        if (video.readyState >= 1 && !video.seeking && Math.abs(video.currentTime - curT) > 0.02) video.currentTime = curT;
      }
      renderFilm();
    });
  }

  /* =====================================================================
     2 · TICKER — Laufband, reagiert auf Scroll-Tempo und -Richtung
     ===================================================================== */
  const MQ = {
    de: ['Specialized Elite Händler', 'Retül-Bikefitting', 'Werkstatt für alle Marken', 'DE · FR · NL · EN', 'Leasing & Finanzierung', 'Rennrad · Gravel · MTB · E-Bike · Kids', 'für jedes Budget'],
    fr: ['Revendeur Specialized Elite', 'Étude posturale Retül', 'Atelier toutes marques', 'DE · FR · NL · EN', 'Leasing & financement', 'Route · Gravel · VTT · VAE · Enfants', 'pour tous les budgets'],
    nl: ['Specialized Elite-dealer', 'Retül-bikefitting', 'Werkplaats voor alle merken', 'DE · FR · NL · EN', 'Leasing & financiering', 'Race · Gravel · MTB · E-bike · Kids', 'voor elk budget'],
    en: ['Specialized Elite dealer', 'Retül bike fitting', 'Workshop for all brands', 'DE · FR · NL · EN', 'Leasing & financing', 'Road · Gravel · MTB · E-bike · Kids', 'for every budget'],
  };
  let mqW = 0;
  function buildMarquee() {
    const track = $('.mq-track');
    const items = (MQ[lang()] || MQ.de).map((t, i) =>
      '<span class="mq-item' + (i % 2 ? ' mq-it' : '') + '">' + t.replace(/&/g, '&amp;') + '</span><svg class="mq-sep"><use href="#ic-spark"/></svg>').join('');
    track.innerHTML = '<div class="mq-seq">' + items + '</div><div class="mq-seq">' + items + '</div><div class="mq-seq">' + items + '</div>';
    mqW = track.firstElementChild.offsetWidth;
  }
  function initMarquee() {
    buildMarquee();
    RP.onLang(buildMarquee);
    window.addEventListener('resize', () => { const s = $('.mq-seq'); if (s) mqW = s.offsetWidth; });
    if (RM) return;
    const track = $('.mq-track');
    let x = 0, speed = 1;
    gsap.ticker.add((time, dt) => {
      const v = lenis ? lenis.velocity : 0;
      const dir = lenis && lenis.direction ? lenis.direction : 1;
      speed = lerp(speed, dir * (1 + Math.min(Math.abs(v) * 0.12, 7)), 0.06);
      x -= speed * 70 * dt / 1000;
      if (mqW) { while (x <= -mqW) x += mqW; while (x > 0) x -= mqW; }
      track.style.transform = 'translate3d(' + x.toFixed(2) + 'px,0,0)';
    });
  }

  /* =====================================================================
     3 · KINETISCHE TYPO — Fahrertypen, Zeilen laufen gegeneinander
     ===================================================================== */
  const KIN = {
    de: [['Rennrad', 'Gravel', 'MTB'], ['E-Bike', 'Enduro', 'Kids'], ['Einsteiger', 'Profis', 'Familien']],
    fr: [['Route', 'Gravel', 'VTT'], ['VAE', 'Enduro', 'Enfants'], ['Débutants', 'Pros', 'Familles']],
    nl: [['Racefiets', 'Gravel', 'MTB'], ['E-bike', 'Enduro', 'Kids'], ['Starters', 'Pro’s', 'Gezinnen']],
    en: [['Road', 'Gravel', 'MTB'], ['E-bike', 'Enduro', 'Kids'], ['Beginners', 'Pros', 'Families']],
  };
  const KIN_IMG = ['assets/roadbike-shop.jpg', 'assets/gravel-ride.jpg', 'assets/achim-ride.jpg', 'assets/gefuehl-moment.jpg',
    'assets/v10/film-4.jpg', 'assets/bikefitting.jpg', 'assets/achim-team.jpg', 'assets/v10/film-3.jpg', 'assets/shop-interior.jpg'];
  function buildKinetic() {
    $$('.kin-row').forEach((row, r) => {
      const words = (KIN[lang()] || KIN.de)[r];
      let h = '';
      for (let rep = 0; rep < 3; rep++) {
        words.forEach((w, i) => {
          h += '<span class="kw">' + w + '</span><span class="kp"><img src="' + KIN_IMG[(r * 3 + i + rep * 2) % KIN_IMG.length] + '" alt="" loading="lazy"></span>';
        });
      }
      row.innerHTML = h;
    });
  }
  function initKinetic() {
    buildKinetic();
    RP.onLang(buildKinetic);
    if (RM) return;
    $$('.kin-row').forEach((row, i) => {
      const a = i % 2 ? -36 : -2, b = i % 2 ? -2 : -36;
      gsap.fromTo(row, { xPercent: a }, {
        xPercent: b, ease: 'none',
        scrollTrigger: { trigger: '.kin', start: 'top bottom', end: 'bottom top', scrub: 0.6 },
      });
    });
    if (lenis) {
      const sk = gsap.quickTo('.kin-rows', 'skewX', { duration: 0.6, ease: 'power3' });
      lenis.on('scroll', e => sk(clamp(-e.velocity * 0.3, -11, 11)));
    }
  }

  /* =====================================================================
     4 · DIE RUNDE — Karte, Route, Fahrer, Wegpunkte, Profil
     ===================================================================== */
  const WP_NAMES = {
    de: ['Start · Schönberg', 'Asphalt-Rampen', 'Hohes Venn', 'Eifel-Trails', 'Langer Anstieg', 'See', 'Ziel'],
    fr: ['Départ · Schönberg', 'Rampes', 'Hautes Fagnes', 'Sentiers de l’Eifel', 'Longue montée', 'Lac', 'Arrivée'],
    nl: ['Start · Schönberg', 'Hellingen', 'Hoge Venen', 'Eifel-trails', 'Lange klim', 'Meer', 'Finish'],
    en: ['Start · Schönberg', 'Tarmac ramps', 'High Fens', 'Eifel trails', 'Long climb', 'Lake', 'Finish'],
  };
  const HM_UNIT = { de: 'Hm', fr: 'm D+', nl: 'hm', en: 'm up' };
  const route = { relabel() {} };

  function initRoute() {
    const M = window.RundeMap;
    const svg = $('.map'), camG = $('.cam', svg);
    const cards = $$('.wp-card');
    const KM = M.WP_KM, N = KM.length;

    // --- Karte aufbauen ---
    const wpHTML = KM.map((km, k) => {
      const p = M.wpPoint(k);
      return '<g class="wp-m" transform="translate(' + p[0] + ' ' + p[1] + ')"><g class="wp-s">' +
        '<circle class="o" r="12"/><text class="n" y="4.3" text-anchor="middle">' + (k + 1) + '</text>' +
        '<text class="wp-l" x="20" y="4"></text></g></g>';
    }).join('');
    const lbHTML = M.LABELS.map(l =>
      '<g class="lb lb-' + l.cls + '" transform="translate(' + l.x + ' ' + l.y + ')"><g class="lb-s"><text text-anchor="' + (l.anchor || 'middle') + '"' +
      (l.rot ? ' transform="rotate(' + l.rot + ')"' : '') + ' data-k="' + l.k + '"></text></g></g>').join('');
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
    // Laengen-Anteile der Wegpunkte (ueber exakt gleiche Teil-Kurven gemessen)
    const tmp = document.createElementNS(SVGNS, 'path');
    camG.appendChild(tmp);
    const fr = KM.map((_, k) => {
      if (k === 0) return 0;
      if (k === N - 1) return 1;
      tmp.setAttribute('d', M.routePrefixD(k));
      return tmp.getTotalLength() / Ltot;
    });
    tmp.remove();

    // Texte (Sprache)
    function relabel() {
      const l = lang();
      $$('.wp-l', camG).forEach((t, k) => { t.textContent = (WP_NAMES[l] || WP_NAMES.de)[k]; });
      $$('.lb text', camG).forEach(t => { const m = M.LABEL_TEXT[t.dataset.k]; t.textContent = m[l] || m.de; });
      $('.rm-total').textContent = '58 km · ' + fmt(Math.round(M.gainAt(58) / 10) * 10, 0) + ' ' + (HM_UNIT[l] || HM_UNIT.de);
      statsKm = -1;
    }
    route.relabel = relabel;

    // --- Profil ---
    const prof = $('.prof');
    let PW = 0, PH = 0, profX, profY, pClip, pDot, pVal;
    function buildProfile() {
      const r = prof.getBoundingClientRect();
      PW = r.width; PH = r.height;
      if (!PW || !PH) return;
      prof.setAttribute('viewBox', '0 0 ' + PW + ' ' + PH);
      const top = 18, bot = PH - (PH > 80 ? 18 : 4), emin = 360, emax = 720;
      profX = km => km / 58 * PW;
      profY = e => bot - (e - emin) / (emax - emin) * (bot - top);
      let line = '';
      for (let km = 0; km <= 58.001; km += 0.25) line += (km ? 'L' : 'M') + profX(km).toFixed(1) + ',' + profY(M.elev(km)).toFixed(1);
      const area = line + 'L' + PW + ',' + bot + 'L0,' + bot + 'Z';
      let ticks = '';
      KM.forEach((km, k) => {
        const x = profX(km);
        ticks += '<line class="pt" x1="' + x + '" x2="' + x + '" y1="' + (top - 2) + '" y2="' + bot + '"/>' +
          '<text class="pn" x="' + x + '" y="' + (top - 6) + '" text-anchor="' + (k === 0 ? 'start' : k === N - 1 ? 'end' : 'middle') + '">' + (k + 1) + '</text>';
      });
      let kms = '';
      if (PH > 80) [0, 10, 20, 30, 40, 50, 58].forEach((km, i, a) => {
        kms += '<text class="pkm" x="' + profX(km) + '" y="' + (PH - 2) + '" text-anchor="' + (i === 0 ? 'start' : i === a.length - 1 ? 'end' : 'middle') + '">' + km + (i === a.length - 1 ? ' km' : '') + '</text>';
      });
      prof.innerHTML = '<defs><clipPath id="profClip"><rect class="pc" x="0" y="0" width="0" height="' + PH + '"/></clipPath></defs>' +
        '<path class="pa" d="' + area + '"/><path class="pl" d="' + line + '"/>' +
        '<g clip-path="url(#profClip)"><path class="pa2" d="' + area + '"/><path class="pl2" d="' + line + '"/></g>' +
        ticks + kms + '<line class="pbase" x1="0" x2="' + PW + '" y1="' + bot + '" y2="' + bot + '"/>' +
        '<text class="pval" y="0"></text><circle class="pdot" r="5"/>';
      pClip = $('.pc', prof); pDot = $('.pdot', prof); pVal = $('.pval', prof);
      statsKm = -1;
    }

    // --- Kamera ---
    const stamp = $('.route-stamp');
    const cam = { f: 0, zoom: 2.9, fit: 0 };
    let W = 0, H = 0, area = null, sFit = 1, bbC = { x: 0, y: 0 };
    const pts = M.ROUTE_PTS;
    const bb = pts.reduce((a, p) => ({ x0: Math.min(a.x0, p[0]), y0: Math.min(a.y0, p[1]), x1: Math.max(a.x1, p[0]), y1: Math.max(a.y1, p[1]) }), { x0: 1e9, y0: 1e9, x1: -1e9, y1: -1e9 });
    bbC = { x: (bb.x0 + bb.x1) / 2, y: (bb.y0 + bb.y1) / 2 };
    function layoutMap() {
      const r = svg.getBoundingClientRect();
      W = r.width; H = r.height;
      if (!W || !H) return;
      svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
      if (isMobile() && !RM) {
        area = { x: 18, y: 66, w: W - 36, h: H - 66 - 92 };
      } else if (RM) {
        area = { x: 40, y: 150, w: W - 80, h: H - 190 };
      } else {
        const cardsEl = $('.route-cards');
        const left = cardsEl.offsetLeft + cardsEl.offsetWidth + 40;
        const hd = parseFloat(getComputedStyle(html).getPropertyValue('--hd')) || 72;
        area = { x: left, y: hd + 110, w: W - left - 60, h: H - (hd + 110) - 160 };
      }
      area.cx = area.x + area.w / 2; area.cy = area.y + area.h / 2;
      const pad = 70;
      sFit = Math.min(area.w / (bb.x1 - bb.x0 + pad * 2), area.h / (bb.y1 - bb.y0 + pad * 2));
      // Stempel: im Ueberblick liegt die Mitte der Runde genau auf area.cx/cy
      const pinR = $('.route-pin').getBoundingClientRect();
      stamp.style.left = (r.left - pinR.left + area.cx).toFixed(1) + 'px';
      stamp.style.top = (r.top - pinR.top + area.cy).toFixed(1) + 'px';
      buildProfile();
      render();
    }

    // --- Rendern pro Frame ---
    let statsKm = -1, statsWp = -1, curCard = -1;
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
      // Massstab: 1/2/5 km
      const pxKm = Ltot / 58 * s;
      const unit = pxKm > 70 ? 1 : pxKm > 28 ? 2 : 5;
      scaleBar.style.width = (pxKm * unit).toFixed(1) + 'px';
      scaleTxt.textContent = unit + ' km';
      // Zaehler + Profil
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
          pVal.setAttribute('y', (y - 12).toFixed(1));
          pVal.setAttribute('text-anchor', 'middle');
        }
      }
    }

    // --- Karten-Wechsel (Wegpunkt erreicht) ---
    function showCard(k) {
      if (k === curCard) return;
      const prev = cards[curCard], next = cards[k];
      curCard = k;
      if (!RM) {
        const d = prev ? 0.14 : 0;
        if (prev) gsap.to(prev, { autoAlpha: 0, y: -12, duration: 0.24, ease: 'power2.in', overwrite: true });
        gsap.fromTo(next, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 0.55, ease: 'power3.out', delay: d, overwrite: true });
        gsap.fromTo($('.wp-img', next), { clipPath: 'inset(0% 0% 100% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.9, ease: 'expo.out', delay: d, overwrite: true });
        gsap.fromTo($('.wp-img img', next), { scale: 1.25 }, { scale: 1, duration: 1.4, ease: 'expo.out', delay: d, overwrite: true });
        gsap.fromTo($$('.wp-k, h3, .wp-sub, .wp-body, .wp-ask', next), { y: 14 }, { y: 0, duration: 0.7, stagger: 0.04, ease: 'power3.out', delay: d, overwrite: true });
        const o = $('.o', wpM[k]);
        gsap.fromTo(o, { attr: { r: 22 } }, { attr: { r: 12 }, duration: 0.7, ease: 'back.out(3)', overwrite: true });
      }
      wpM.forEach((m, i) => { m.classList.toggle('on', i <= k); m.classList.toggle('cur', i === k); });
      elWp.textContent = (k + 1) + '/' + N;
    }

    relabel();
    RP.onLang(relabel);

    if (RM) {
      // Reduzierte Bewegung: ganze Runde gezeichnet, Karte komplett, Karten als Liste
      cam.f = 1; cam.fit = 1;
      gsap.set([drawPath, casing], { drawSVG: '0% 100%' });
      const end = M.wpPoint(N - 1);
      gsap.set(rider, { x: end[0], y: end[1] });
      layoutMap();
      wpM.forEach(m => m.classList.add('on'));
      elWp.textContent = N + '/' + N;
      window.addEventListener('resize', () => layoutMap());
      return;
    }

    // --- Zeitleiste: Etappen + Verweilen an jedem Wegpunkt ---
    gsap.set([drawPath, casing], { drawSVG: '0% 0%' });
    gsap.set(rider, { transformOrigin: '50% 50%' });
    const p0 = M.wpPoint(0);
    gsap.set(rider, { x: p0[0], y: p0[1] });
    const tl = gsap.timeline({ defaults: { ease: 'power1.inOut' }, onUpdate: () => { render(); onTime(); } });
    const arrive = [0];
    let t = 0.8;
    tl.fromTo(cam, { zoom: 2.9 }, { zoom: 2.15, duration: 1.6, ease: 'power1.inOut' }, 0);
    for (let k = 0; k < N - 1; k++) {
      const d = 1.1 + (KM[k + 1] - KM[k]) / 10;
      tl.to(cam, { f: fr[k + 1], duration: d }, t);
      tl.to([drawPath, casing], { drawSVG: '0% ' + (fr[k + 1] * 100).toFixed(3) + '%', duration: d }, t);
      tl.to(rider, { motionPath: { path: drawPath, start: fr[k], end: fr[k + 1], autoRotate: true }, duration: d }, t);
      t += d;
      arrive.push(t);
      t += 1;
    }
    tl.to(cam, { fit: 1, duration: 1.7, ease: 'power2.inOut' }, arrive[N - 1] + 0.15);
    tl.to({}, { duration: 1.2 }, arrive[N - 1] + 1.85);

    const sec = $('.route');
    let stampOn = false;
    gsap.set(stamp, { xPercent: -50, yPercent: -50 });
    function onTime() {
      const time = tl.time();
      let k = 0;
      for (let i = 1; i < arrive.length; i++) if (time >= arrive[i] - 0.06) k = i;
      showCard(k);
      sec.classList.toggle('is-done', time > arrive[N - 1] + 0.6);
      const on = time > arrive[N - 1] + 1.4;
      if (on !== stampOn) {
        stampOn = on;
        if (on) gsap.fromTo(stamp, { autoAlpha: 0, scale: 1.7, rotation: -24 }, { autoAlpha: 1, scale: 1, rotation: -10, duration: 0.55, ease: 'back.out(2.2)', overwrite: true });
        else gsap.to(stamp, { autoAlpha: 0, duration: 0.25, overwrite: true });
      }
    }

    layoutMap();
    showCard(0);
    ScrollTrigger.create({
      trigger: '.route', start: 'top top',
      end: () => '+=' + Math.round(window.innerHeight * (isMobile() ? 6.4 : 7.2)),
      pin: true, scrub: 0.9, anticipatePin: 1, animation: tl,
    });
    window.addEventListener('resize', () => { layoutMap(); });
  }

  /* =====================================================================
     5 · GALERIE — horizontaler Pin, Innen-Parallaxe
     ===================================================================== */
  function initGalleryThumbs() {
    $$('.yt-card').forEach(c => { $('.yt-img', c).innerHTML = RP.ytThumb(c.dataset.video, c.dataset.thumb); });
  }
  function initGallery() {
    const sec = $('.gal'), track = $('.gal-track');
    const line = $('.gal-line i'), count = $('.gal-count'), n = $$('.yt-card').length;
    if (RM) return;
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tween = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
        onUpdate: s => {
          line.style.transform = 'scaleX(' + s.progress.toFixed(4) + ')';
          count.textContent = String(clamp(Math.round(s.progress * (n - 1)) + 1, 1, n)).padStart(2, '0') + ' / ' + String(n).padStart(2, '0');
        },
      },
    });
    $$('.yt-card').forEach(card => {
      gsap.fromTo($('.yt-img', card), { xPercent: -9 }, { xPercent: 9, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
      gsap.fromTo($('.yt-num', card), { xPercent: 40 }, { xPercent: -40, ease: 'none', scrollTrigger: { trigger: card, containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    // Header dunkel, solange die Galerie oben liegt
    ScrollTrigger.create({
      trigger: sec.parentElement.classList.contains('pin-spacer') ? sec.parentElement : sec,
      start: 'top 36px', end: 'bottom 36px', onToggle: s => setHdDark('gal', s.isActive),
    });
  }

  /* =====================================================================
     6 · MOMENT — Kreis-Reveal (Text wechselt die Farbe im Kreis)
     ===================================================================== */
  function initEmotion() {
    if (RM) return;
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: '.emo', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 1.9), pin: true, scrub: 0.6, anticipatePin: 1,
        onUpdate: s => setHdDark('emo', s.progress > 0.42 && s.progress < 0.999),
        onLeave: () => setHdDark('emo', false),
      },
    });
    tl.fromTo('.emo-dot', { scale: 1 }, { scale: 3.4, duration: 0.25, ease: 'power2.in' }, 0)
      .to('.emo-dot', { autoAlpha: 0, duration: 0.08 }, 0.27)
      .fromTo('.emo-reveal', { clipPath: 'circle(0.5% at 50% 50%)' }, { clipPath: 'circle(75% at 50% 50%)', duration: 1, ease: 'power2.in' }, 0.22)
      .fromTo('.emo-reveal img', { scale: 1.45 }, { scale: 1.04, duration: 1.4, ease: 'power1.out' }, 0.22)
      .fromTo('.emo-l2', { autoAlpha: 0, y: 40, filter: 'blur(12px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.45, ease: 'power2.out' }, 1.12)
      .to({}, { duration: 0.45 });
    // nach dem Pin: Foto rollt noch unter dem Header durch
    ScrollTrigger.create({
      trigger: $('.emo').parentElement, start: 'bottom bottom', end: 'bottom 36px',
      onToggle: s => setHdDark('emo-out', s.isActive),
    });
  }

  /* =====================================================================
     7 · BUDGET — Karten faechern sich aus einem Stapel auf
     ===================================================================== */
  function initBudget() {
    if (RM) return;
    const mm = gsap.matchMedia();
    mm.add('(min-width: 901px)', () => {
      const wrap = $('.tiers'), cards = $$('.tier');
      gsap.from(cards, {
        x: (i, el) => wrap.offsetWidth / 2 - (el.offsetLeft + el.offsetWidth / 2),
        y: i => [70, 10, 70][i], rotation: i => [-8, 1.5, 8][i], scale: 0.9,
        ease: 'none',
        scrollTrigger: { trigger: wrap, start: 'top 95%', end: 'top 28%', scrub: 0.9, invalidateOnRefresh: true },
      });
    });
    mm.add('(max-width: 900px)', () => {
      $$('.tier').forEach(c => gsap.from(c, { y: 60, autoAlpha: 0, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: c, start: 'top 90%', once: true } }));
    });
  }

  /* =====================================================================
     8 · ZIEL — Oeffnungszeiten (live), Anfahrt, Foto
     ===================================================================== */
  const TODAY = { de: 'heute', fr: 'aujourd’hui', nl: 'vandaag', en: 'today' };
  function renderHours() {
    $('.hours').innerHTML = RP.hoursRows().map(r =>
      '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day +
      (r.today ? '<em class="td">' + (TODAY[lang()] || TODAY.de) + '</em>' : '') + '</span><b>' + r.text + '</b></li>').join('');
  }
  function initFinish() {
    if (RM) { $('.drive').classList.add('is-in'); return; }
    ScrollTrigger.create({ trigger: '.drive', start: 'top 88%', once: true, onEnter: () => $('.drive').classList.add('is-in') });
    gsap.fromTo('.fp-in img', { yPercent: -10 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.fin-photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.fp-in', { clipPath: 'inset(14% 10% 14% 10%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: '.fin-photo', start: 'top 82%', once: true } });
    gsap.from('.fin-card', { y: 50, autoAlpha: 0, duration: 1.1, ease: 'expo.out', stagger: 0.12, scrollTrigger: { trigger: '.fin-hours', start: 'top 90%', once: true } });
  }

  /* ---------------- Footer: „Bis Samstag.“ auf Breite einpassen ---------------- */
  function fitFooter() {
    const el = $('.ft-big'), wrap = el.parentElement;
    el.style.fontSize = '';
    const cs = getComputedStyle(wrap);
    const avail = wrap.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
    const fs = parseFloat(getComputedStyle(el).fontSize);
    if (el.offsetWidth) el.style.fontSize = (fs * avail / el.offsetWidth).toFixed(2) + 'px';
  }

  /* ---------------- Text-Reveals ---------------- */
  function splitReveal(el) {
    el.style.visibility = 'visible';
    const st = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'sl' });
    gsap.from(st.lines, { yPercent: 112, duration: 1.15, ease: 'expo.out', stagger: 0.1, onComplete: () => st.revert() });
  }
  function initReveals() {
    if (RM) return;
    $$('[data-reveal]').forEach(el => gsap.fromTo(el, { autoAlpha: 0, y: 30 }, {
      autoAlpha: 1, y: 0, duration: 1.15, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    }));
    $$('[data-split]').forEach(el => ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: () => splitReveal(el) }));
    gsap.from('.ft-big', { yPercent: 40, autoAlpha: 0, duration: 1.4, ease: 'expo.out', scrollTrigger: { trigger: '.ft', start: 'top 85%', once: true } });
  }

  /* ---------------- Cursor + magnetische Buttons (nur Maus) ---------------- */
  function initCursor() {
    if (RM || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const c = document.createElement('div');
    c.className = 'cur is-hidden';
    c.innerHTML = '<span></span>';
    document.body.appendChild(c);
    const label = c.firstChild;
    const xTo = gsap.quickTo(c, 'x', { duration: 0.35, ease: 'power3' }), yTo = gsap.quickTo(c, 'y', { duration: 0.35, ease: 'power3' });
    window.addEventListener('pointermove', e => { xTo(e.clientX); yTo(e.clientY); c.classList.remove('is-hidden'); }, { passive: true });
    document.addEventListener('pointerleave', () => c.classList.add('is-hidden'));
    document.addEventListener('pointerover', e => {
      const t = e.target.closest('a, button, [data-video], [data-ask], [data-cursor]');
      c.classList.toggle('is-link', !!t);
      const txt = t && t.dataset.cursor ? t.dataset.cursor : '';
      c.classList.toggle('no-label', !!t && !txt);
      label.textContent = txt;
    });
    $$('[data-magnetic]').forEach(el => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' }), my = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.28);
        my((e.clientY - (r.top + r.height / 2)) * 0.36);
      });
      el.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------------- Start ---------------- */
  function boot() {
    if (window.RP) RP.mountPicker('10');
    initHeader();
    initMenu();
    initAnchors();
    initMarquee();
    initGalleryThumbs();
    renderHours();
    RP.onLang(renderHours);
    if (!HAS_GSAP) return;
    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([fontsReady, new Promise(r => setTimeout(r, 3000))]).then(() => {
      // Reihenfolge = Seitenreihenfolge (wichtig fuer Pin-Abstaende)
      initStage();
      initKinetic();
      initRoute();
      initGallery();
      initEmotion();
      initBudget();
      initFinish();
      initReveals();
      fitFooter();
      initCursor();
      ScrollTrigger.refresh();
      let rt;
      const relayout = () => { clearTimeout(rt); rt = setTimeout(() => { stage.layout(); fitFooter(); ScrollTrigger.refresh(); }, 160); };
      window.addEventListener('resize', relayout);
      RP.onLang(relayout);
    });
  }
  // nach rp-core (dessen DOMContentLoaded-Init laeuft zuerst -> Sprache steht schon)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
