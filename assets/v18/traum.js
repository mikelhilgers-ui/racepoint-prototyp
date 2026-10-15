/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE — Startseite: Traumbike, Service, Touren (THROWAWAY)
   Gliederung der Startseite (v18-traumbike.html), Reihenfolge von oben:
     Hero · Sortiment (#bikes) · Achim (#achim) · Werkstatt (#werkstatt) · Bikefitting (#bikefitting)
     · Traumbike (#traum) · YouTube (#filme) · Touren (#touren) · KI-Berater (#berater) · Kontakt (#kontakt)
   Diese Datei steuert drei Blöcke. Jeder läuft für sich und bricht ohne seine Elemente still ab:
     1) Traumbike     angeheftet: Clips (Idee, Rahmen, Farbe) als Beispiel, wie ein Bike
                      aussehen kann; Schluss mit Links zu den Bikes und zum Gespräch
     2) Service       Werkstatt (Video lädt und läuft nur in Sicht) und Bikefitting (Bild zoomt langsam
                      beim Scrollen). Bei reduzierter Bewegung bleiben Poster bzw. Bild stehen.
     3) Touren        Filmband mit Höhenlinien (wie der Hero von v18-touren.html) und drei
                      Tourenkarten mit Streckenlinie. Daten aus assets/v17/touren (nur gelesen),
                      Helfer RP18Touren aus touren-map.js
   Der YouTube-Block (#filme) ist reines Markup, die Filme öffnen über data-video im Filmfenster (RP.openVideo).
   Der Hero-Zusatz „Komm zu Achim, Elke und ihrem Team.“ steht ganz unten in dieser Datei.
   Alle Medien von 1) stehen in STORY (unten). Quellen: assets/v18/media/QUELLEN.md.
   Benötigt: gsap, ScrollTrigger, Lenis (über assets/v18/site.js), window.RP, window.RP18Touren
   ===================================================================== */
(function () {
  'use strict';

  const M = 'assets/v18/media/';
  // Länge der angehefteten Traumbike-Folge in Bildschirmhöhen (früher 4,8 Desktop, 4,2 Mobil)
  const SCROLL = 1.8;

  /* ================= DIE EINE KONFIGURATION ================= */
  const STORY = {
    // Traumbike: Clips als Beispiel, wie ein Bike aussehen kann (Idee, Rahmen, Farbe).
    // "src" = Desktop, "srcM" = Handy,
    // "pos" = Bildausschnitt im Hochformat (object-position)
    idea: {
      clips: [
        { src: M + 's5/s5-schriftzug.mp4', srcM: M + 's5/s5-schriftzug-m.mp4', poster: M + 's5/s5-schriftzug.webp', pos: '58% 50%',
          title: 'Bring deine Idee mit.', text: 'Ein Foto, ein Modell oder nur eine Farbe. Das reicht für das erste Gespräch.' },
        { src: M + 's5/s5-cockpit.mp4', srcM: M + 's5/s5-cockpit-m.mp4', poster: M + 's5/s5-cockpit.webp', pos: '50% 50%',
          title: 'Such dir den Rahmen aus.', text: 'Er bestimmt, wie sich dein Bike fährt und wie du darauf sitzt.' },
        { src: M + 's5/s5-rahmen.mp4', srcM: M + 's5/s5-rahmen-m.mp4', poster: M + 's5/s5-rahmen.webp', pos: '55% 50%',
          title: 'Dann die Farbe.', text: 'Auch die darf deine sein. Mehr braucht es für den Anfang nicht.' },
      ],
      // Standbild nur für „reduzierte Bewegung“ (statt der angehefteten Filmfolge)
      still: { src: M + 's5/s5-rahmen.webp', srcM: M + 's5/s5-rahmen.webp',
        alt: 'Lackierter Rennradrahmen in Blau mit Kupfer' },
    },
    // Touren-Teaser: eine Tour je Art (jeweils die erste dieser Art in touren.json),
    // Film im Hintergrund (Desktop -amb, Handy die normale Datei)
    tours: {
      base: 'assets/v17/touren/',
      types: ['rennrad', 'gravel', 'mtb'],
      typeName: { rennrad: 'Rennrad', gravel: 'Gravel', mtb: 'MTB' },
    },
  };
  /* ========================================================== */

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = !!(window.RP && RP.reducedMotion);
  const small = () => window.innerWidth < 820;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  // Filme erst laden, wenn der Block näher als anderthalb Bildschirme ist (sonst bremsen sie den Seitenstart)
  const near = (el, fn) => {
    if (!el) return;
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '150% 0px' });
    io.observe(el);
  };

  /* =====================================================================
     1) TRAUMBIKE: angeheftete Filmfolge
     ===================================================================== */
  function traumbike() {
    const root = $('#traum');
    if (!root) return;
    const clips = STORY.idea.clips, fin = STORY.idea.still;
    const layers = $('#tLayers');
    if (!layers) return;
    layers.innerHTML = clips.map((c, i) =>
      '<div class="t-layer" data-i="' + i + '"><video muted loop playsinline preload="none" data-poster="' + c.poster + '" style="object-position:' + c.pos + '" aria-hidden="true"></video></div>'
    ).join('') + (RM ?
      '<div class="t-layer t-final" data-i="' + clips.length + '">' +
      '<picture><img class="t-final-img" src="' + fin.src + '" alt="' + esc(fin.alt) + '" loading="lazy"></picture></div>' : '');
    const vids = $$('video', layers);
    near(root, () => vids.forEach((v, i) => {
      v.poster = v.dataset.poster;
      if (!RM) { v.preload = i < 2 ? 'auto' : 'metadata'; v.src = small() ? clips[i].srcM : clips[i].src; }
    }));
    $('#tCaps').innerHTML = clips.map((c, i) =>
      '<li class="t-cap"><b>0' + (i + 1) + '</b><span><strong>' + esc(c.title) + '</strong>' + (c.text ? esc(c.text) : '') + '</span></li>').join('');

    /* Reduzierte Bewegung (oder ohne gsap): statischer Endzustand */
    if (RM || !window.gsap || !window.ScrollTrigger) {
      root.classList.add('t-static');
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const n = clips.length;
    const L = $$('.t-layer', layers), caps = $$('.t-cap', root);
    let active = -1;
    function setActive(i) {
      if (i === active) return;
      active = i;
      vids.forEach((v, k) => {
        if (Math.abs(k - i) <= 1) { if (v.preload !== 'auto') v.preload = 'auto'; }
        if (k === i) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } else if (!v.paused) v.pause();
      });
    }
    gsap.set(L.slice(1), { clipPath: 'inset(0% 0% 0% 100%)' });
    gsap.set(caps, { autoAlpha: 0, y: 24 });
    gsap.set('#tFin', { autoAlpha: 0 });
    gsap.set('#tFin .t-big', { yPercent: 30, autoAlpha: 0 });

    // Kurze Folge: drei Clips in rund 1,8 Bildschirmhöhen (SCROLL), etwa drei Wischer
    const T0 = 0.5, STEP = 0.8;
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    // Einstieg: Titel, dann erster Clip übernimmt
    tl.to('#tIntro', { autoAlpha: 0, y: -50, duration: 0.35 }, 0.3)
      .to(caps[0], { autoAlpha: 1, y: 0, duration: 0.25 }, T0);
    for (let i = 1; i < n; i++) {
      const t = T0 + i * STEP;
      tl.to(caps[i - 1], { autoAlpha: 0, y: -24, duration: 0.15 }, t - 0.25)
        .to(L[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.45, ease: 'power2.inOut' }, t - 0.2)
        .fromTo($('video', L[i]), { scale: 1.18 }, { scale: 1, duration: 0.9 }, t - 0.2)
        .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.2 }, t + 0.1);
    }
    // Schluss: Links zu den Bikes
    const tf = T0 + n * STEP;
    tl.to(caps[n - 1], { autoAlpha: 0, y: -24, duration: 0.2 }, tf - 0.3)
      .to('#tFin', { autoAlpha: 1, duration: 0.01 }, tf - 0.1)
      .to('#tFin .t-big', { yPercent: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out' }, tf - 0.1)
      .from('#tFin .t-fin-btns', { autoAlpha: 0, y: 20, duration: 0.25 }, tf + 0.2)
      .to({}, { duration: 0.5 });
    const total = tl.duration();
    const marks = clips.map((_, i) => i === 0 ? 0 : T0 + i * STEP - 0.2);

    ScrollTrigger.create({
      trigger: '#tIdea', pin: '#tStage', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * SCROLL),
      animation: tl, scrub: 0.6, anticipatePin: 1,
      onUpdate: st => {
        const tt = st.progress * total;
        let i = 0; marks.forEach((m, k) => { if (tt >= m + 0.25) i = k; });
        setActive(i);
        gsap.set('#tTickBar', { scaleX: st.progress });
      },
      onToggle: st => { if (!st.isActive) { vids.forEach(v => v.pause()); active = -1; } else setActive(Math.max(active, 0)); },
    });
    setActive(0);
  }

  /* =====================================================================
     2) SERVICE: Werkstatt-Video (nur in Sicht) und Bikefitting-Zoom
     Die Bilder stehen im Markup (Poster bzw. Bild). Bei reduzierter Bewegung passiert hier nichts:
     kein Video, kein Zoom.
     ===================================================================== */
  function service() {
    if (RM) return;
    const wm = $('#wMedia');
    const vid = wm && $('.svc-vid', wm);
    if (vid) {
      // Video erst kurz vorher laden, nur abspielen, solange die Zeile im Bild ist
      near(wm, () => {
        vid.src = (small() && vid.dataset.srcM) || vid.dataset.src;
        vid.addEventListener('playing', () => vid.classList.add('on'), { once: true });
        vid.muted = true;
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause(); }), { threshold: 0.15 }).observe(wm);
        } else vid.play().catch(() => {});
      });
    }
    const fm = $('#fMedia');
    const img = fm && $('.svc-zoom', fm);
    if (img && window.gsap && window.ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
      gsap.fromTo(img, { scale: 1 }, { scale: 1.16, ease: 'none', scrollTrigger: { trigger: fm, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  /* =====================================================================
     3) TOUREN: Filmband, Höhenlinien, drei Karten
     Gleiche Datenquelle wie v18-touren.html (assets/v17/touren, nur gelesen). Alle Zahlen
     (Anzahl, km, Höhenmeter) rechnet die Seite aus den GPX-Dateien. Ohne Daten bleiben die Karten
     als Links mit Namen stehen, nur ohne Zahlen und Linie.
     Deep-Link einer Karte: v18-touren.html#tour-<id> (handleHash in touren.js wählt die Tour).
     ===================================================================== */
  function touren() {
    const box = $('#touren');
    if (!box) return;
    const T = window.RP18Touren, C = STORY.tours;
    const WORDS = ['Keine', 'Eine', 'Zwei', 'Drei', 'Vier', 'Fünf', 'Sechs', 'Sieben', 'Acht', 'Neun', 'Zehn', 'Elf', 'Zwölf'];
    const nf = n => (+n).toLocaleString('de-BE', { maximumFractionDigits: 0 });

    /* Film im Hintergrund: erst kurz vorher laden, nur abspielen, solange das Band zu sehen ist */
    const vid = $('.tb-vid', box);
    if (vid && !RM) {
      near(box, () => {
        vid.src = (small() && vid.dataset.srcM) || vid.dataset.src;
        vid.addEventListener('playing', () => vid.classList.add('on'), { once: true });
        vid.muted = true;
        if ('IntersectionObserver' in window) {
          new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) vid.play().catch(() => {}); else vid.pause(); })).observe(box);
        } else vid.play().catch(() => {});
      });
    }
    if (!T) return;

    /* Höhenlinien (Karten-Generator aus touren-map.js, Ausschnitt wie im Touren-Hero) */
    const topo = $('#tbTopo');
    let topoG = null;
    function drawTopo() {
      if (!topo) return;
      const U = T.U, reg = { x0: -26 * U, y0: -15 * U, x1: 26 * U, y1: 15 * U };
      topo.innerHTML = '<svg viewBox="' + reg.x0 + ' ' + reg.y0 + ' ' + (reg.x1 - reg.x0) + ' ' + (reg.y1 - reg.y0) + '" preserveAspectRatio="xMidYMid slice">' +
        T.layersSVG(reg, { cells: 150, iv: 20, ix: 100, topoOnly: true }) + '<g class="hrt"></g></svg>';
      topoG = $('.hrt', topo);
      requestAnimationFrame(() => topo.classList.add('on'));
    }

    /* kleine Streckenlinie für eine Karte */
    function routeSVG(geo) {
      const bb = geo.bb, w = bb.x1 - bb.x0, h = bb.y1 - bb.y0, p = Math.max(w, h) * 0.08, r = Math.max(w, h) * 0.035;
      const a = geo.pp[0];
      return '<svg viewBox="' + (bb.x0 - p).toFixed(1) + ' ' + (bb.y0 - p).toFixed(1) + ' ' + (w + 2 * p).toFixed(1) + ' ' + (h + 2 * p).toFixed(1) +
        '" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><path d="' + geo.d + '"/><circle cx="' + a[0].toFixed(1) + '" cy="' + a[1].toFixed(1) + '" r="' + r.toFixed(1) + '"/></svg>';
    }

    async function load() {
      const res = await fetch(C.base + 'touren.json');
      if (!res.ok) throw new Error('touren.json: HTTP ' + res.status);
      const man = await res.json();
      const all = man.touren || [];
      const list = await Promise.all(all.map(async m => {
        try {
          const r = await fetch(C.base + m.file);
          if (!r.ok) throw new Error(m.file + ': HTTP ' + r.status);
          const g = T.parseGPX(await r.text());
          const st = T.stats(g.pts);
          return { m, st, geo: T.routeGeom(g.pts, st.cum) };
        } catch (e) { console.warn('[Touren-Teaser]', m.id, e); return { m, err: true }; }
      }));
      return list;
    }
    function fill(list) {
      const ok = list.filter(t => !t.err);
      // Anzahl in der Überschrift aus den Daten
      const cnt = $('[data-tb="count"]', box);
      if (cnt && WORDS[list.length]) cnt.textContent = WORDS[list.length];
      // Höhenlinien-Hintergrund: alle Routen als rote Punktlinie, wie im Touren-Hero
      if (topoG) topoG.innerHTML = ok.map(t => '<path class="hr" d="' + t.geo.d + '"/>').join('');
      // Karten: je eine Tour pro Art
      $$('.tb-card', box).forEach(card => {
        const t = ok.find(x => x.m.type === card.dataset.type);
        if (!t) return;
        card.href = 'v18-touren.html#tour-' + t.m.id;
        $('.tb-nm', card).textContent = t.m.title;
        $('.tb-km', card).textContent = nf(t.st.km);
        $('.tb-hm', card).textContent = nf(t.st.up);
        $('.tb-route', card).innerHTML = routeSVG(t.geo);
        card.classList.add('ready');
      });
      const bsp = $('.tb-bsp', box);
      if (bsp) bsp.hidden = !ok.some(t => t.m.beispiel);
    }
    near(box, () => {
      (window.requestIdleCallback || (f => setTimeout(f, 60)))(drawTopo);
      load().then(fill).catch(e => console.warn('[Touren-Teaser]', e));
    });
  }

  service();
  traumbike();
  touren();
})();

/* ---------- Hero: die Zeile „Komm zu Achim, Elke und ihrem Team.“ läuft mit der Einblendung der
   Versal-Zeile (#knockSub) in der Hero-Timeline von bestof.js mit. Bei reduzierter Bewegung wandert sie
   in den Hero-Text und steht fest. bestof.js läuft nach dieser Datei, darum erst nach DOMContentLoaded einhängen. ---------- */
(function () {
  'use strict';
  const el = document.getElementById('knockTeam');
  if (!el) return;
  if (!window.gsap || (window.RP && RP.reducedMotion)) {
    // Ohne Animation fehlt der Schriftzug: die Zeile wandert unter die Hero-Texte und steht dort fest
    const hc = document.getElementById('heroContent');
    if (hc) { hc.appendChild(el); el.classList.add('in-flow'); }
    return;
  }
  const hook = () => {
    const st = window.ScrollTrigger && ScrollTrigger.getAll().find(t => t.animation && t.trigger === document.getElementById('heroPin'));
    if (st) st.animation.fromTo(el, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.2, ease: 'power2.out' }, 0.8);
    else el.classList.add('is-on'); // Notlösung: ohne Hero-Timeline einfach zeigen
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hook); else hook();
})();
