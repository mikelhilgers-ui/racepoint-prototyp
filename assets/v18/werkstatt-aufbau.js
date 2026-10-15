/* =====================================================================
   RACEPOINT · 18 · WERKSTATT: Video-Strecke (#top) und Bildband „So arbeiten wir“ (#aufbau) (THROWAWAY)
   1. Video-Strecke: Das Hero-Video bleibt beim Scrollen stehen (CSS position:sticky) und läuft weiter.
      Hier nur die Blenden: Hero-Text aus, Abdunklung ein, die Leistungskarten nacheinander ein.
      Laden und Abspielen des Videos macht weiter assets/v18/site.js (.phero.cine / .cine-bg).
      Dessen Parallax auf der Videoebene wird hier abgeschaltet, sonst rutscht das stehende Bild nach unten.
   2. Bildband: angeheftet, der Werkstatt-Film läuft mit dem Scrollen (Stück aus dem Shop-Film),
      die drei Arbeitsschritte blenden nacheinander ein. Kam von der Startseite (Kapitel 04 · Werkstatt,
      früher assets/v18/traum.js). Die Startseite verlinkt hierher (v18-werkstatt.html#aufbau).
   Bei reduzierter Bewegung: Poster statt Video, nichts bleibt stehen, Karten und Schritte sind sichtbar.
   Film und Bilder stehen im Markup (data-*), hier nur Ablauf.
   Benötigt: gsap, ScrollTrigger, Lenis (über assets/v18/site.js), window.RP18Site
   ===================================================================== */
(function () {
  'use strict';
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = !!((window.RP && RP.reducedMotion) || (window.RP18Site && RP18Site.RM));
  const refresh = () => ScrollTrigger.refresh();
  const vh = () => window.innerHeight;

  /* ---------------- 1. Video-Strecke ---------------- */
  (function film() {
    const top = $('#top.wk');
    if (!top || RM) return;
    const fig = $('.phero-fig', top), intro = $('.wk-intro', top), dim = $('.wk-dim', top);
    const cap = $('figcaption', fig), prog = $('.wk-prog i', top), cards = $$('.wk-cards .s6', top);

    // site.js schiebt die Videoebene beim Scrollen nach unten (Parallax). Bei stehendem Bild unerwünscht.
    ScrollTrigger.getAll().forEach(t => {
      if (t.trigger === top && t.animation && t.animation.targets().indexOf(fig) > -1) t.kill();
    });
    gsap.set(fig, { yPercent: 0 });

    // Hero-Text und Reel blenden beim ersten halben Bildschirm aus
    ScrollTrigger.create({ trigger: top, start: 'top top', end: () => '+=' + Math.round(vh() * 0.55), scrub: true,
      animation: gsap.fromTo(intro, { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -70, ease: 'none' }) });
    // Video wird dunkler, damit die Karten gut lesbar sind
    ScrollTrigger.create({ trigger: top, start: 'top top', end: () => '+=' + Math.round(vh() * 0.9), scrub: true,
      animation: gsap.timeline({ defaults: { ease: 'none' } }).to(dim, { opacity: 1 }, 0).to(cap, { autoAlpha: 0 }, 0) });

    // Leistungen blenden nacheinander ein; die gerade mittige Karte wird hervorgehoben
    cards.forEach(c => {
      gsap.from(c, { autoAlpha: 0, y: 48, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: c, start: 'top 90%', toggleActions: 'play none none reverse' } });
      ScrollTrigger.create({ trigger: c, start: 'top 62%', end: 'bottom 38%', toggleClass: { targets: c, className: 'is-on' } });
    });
    const list = $('.wk-cards', top);
    if (prog && list) gsap.fromTo(prog, { scaleX: 0 }, { scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: list, start: 'top 60%', end: 'bottom 60%', scrub: true } });

    // Die Video-Logik in site.js pausiert außerhalb des Heros. Hier läuft das Video die ganze Strecke,
    // also sicherstellen, dass es spielt, solange die Strecke im Bild ist.
    const bg = $('.cine-bg', top);
    if (bg && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => {
        if (e.isIntersecting && bg.src && bg.paused) bg.play().catch(() => {});
      })).observe(top);
    }
    if (window.RP18Site && RP18Site.whenFonts) RP18Site.whenFonts(refresh);
    window.addEventListener('load', refresh);
  })();

  /* ---------------- 2. Bildband #aufbau ---------------- */
  (function aufbau() {
    const root = document.getElementById('aufbau');
    if (!root) return;
    const stage = $('#auStage'), scrub = $('#auScrub');
    const FROM = parseFloat(scrub.dataset.from), TO = parseFloat(scrub.dataset.to);

    /* Film erst laden, wenn das Bildband näher als anderthalb Bildschirme ist (sonst bremst er den Seitenstart) */
    const near = (el, fn) => {
      if (!('IntersectionObserver' in window)) return fn();
      const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '150% 0px' });
      io.observe(el);
    };
    scrub.poster = scrub.dataset.poster;
    scrub.addEventListener('loadedmetadata', () => { scrub.currentTime = RM ? (FROM + TO) / 2 : FROM; }, { once: true });
    near(root, () => { scrub.preload = 'auto'; scrub.src = scrub.dataset.src; });

    /* Layout hängt an den Abschnitten darüber: nach Schrift und Seitenende neu messen */
    if (window.RP18Site && RP18Site.whenFonts) RP18Site.whenFonts(refresh);
    window.addEventListener('load', refresh);

    /* Reduzierte Bewegung: keine Anheftung, Standbild mit Karten */
    if (RM) { root.classList.add('is-static'); return; }

    const steps = $$('.t-step', root);
    gsap.set(steps, { autoAlpha: 0, y: 40 });
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    const fp = { t: 0 };
    tl.to(fp, { t: 1, duration: 3, onUpdate: () => {
      const want = FROM + fp.t * (TO - FROM);
      if (scrub.readyState >= 1 && Math.abs(scrub.currentTime - want) > 0.03) scrub.currentTime = want;
    } }, 0);
    steps.forEach((s, i) => tl.to(s, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.35 + i * 0.85));
    tl.to({}, { duration: 0.4 });
    ScrollTrigger.create({
      trigger: root, pin: stage, start: 'top top', end: () => '+=' + Math.round(vh() * 2.4),
      animation: tl, scrub: 0.4, anticipatePin: 1,
    });
  })();
})();
