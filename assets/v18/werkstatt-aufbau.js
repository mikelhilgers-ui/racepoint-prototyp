/* =====================================================================
   RACEPOINT · 18 · WERKSTATT: Bildband „So arbeiten wir“ (#aufbau) (THROWAWAY)
   Angeheftet: Der Werkstatt-Film läuft mit dem Scrollen (Stück aus dem Shop-Film),
   die drei Arbeitsschritte blenden nacheinander ein. Kam von der Startseite
   (Kapitel 04 · Werkstatt, früher assets/v18/traum.js).
   Bei reduzierter Bewegung: Standbild aus dem Film, die Karten darunter, alles sichtbar.
   Film und Bilder stehen im Markup (data-*), hier nur Ablauf.
   Benötigt: gsap, ScrollTrigger, Lenis (über assets/v18/site.js), window.RP18Site
   ===================================================================== */
(function () {
  'use strict';
  const root = document.getElementById('aufbau');
  if (!root || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = !!((window.RP && RP.reducedMotion) || (window.RP18Site && RP18Site.RM));

  const stage = $('#auStage'), scrub = $('#auScrub');
  const FROM = parseFloat(scrub.dataset.from), TO = parseFloat(scrub.dataset.to);
  const refresh = () => ScrollTrigger.refresh();

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
    trigger: root, pin: stage, start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.4),
    animation: tl, scrub: 0.4, anticipatePin: 1,
  });
})();
