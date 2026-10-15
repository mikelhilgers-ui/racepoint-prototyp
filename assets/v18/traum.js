/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE — Traumbike-Story (THROWAWAY)
   Fünf Kapitel mit echten Racepoint-Fotos und -Filmen, ohne 3D:
     1) Die Idee     angeheftet: Clips des Cervélo S5 „Lupine LTD“,
                     vom Detail zum ganzen Rad, Höhepunkt „Dein Traumbike“
     2) Beratung     Fotos von Team und Laden, Zitat
     3) Bikefitting  Retül-Teaser, Link auf v18-bikefitting.html
     4) Aufbau       angeheftet: Shop-Film läuft mit dem Scrollen (6,5–11,9 s),
                     danach Achims Dreambuilds (RP.openVideo über data-video)
     5) Übergabe     Ausfahrt-Foto, „Mein Traumbike planen“, „Termin anfragen“
   Alle Medien stehen in STORY (unten). Bild tauschen: siehe
   assets/v18/traum/README.md. Quellen: assets/v18/media/QUELLEN.md.
   Benötigt: gsap, ScrollTrigger, Lenis (über assets/v18/site.js), window.RP
   ===================================================================== */
(function () {
  'use strict';

  const M = 'assets/v18/media/';

  /* ================= DIE EINE KONFIGURATION ================= */
  const STORY = {
    // Kapitel 1: Clips vom Detail zum ganzen Rad. "src" = Desktop, "srcM" = Handy,
    // "pos" = Bildausschnitt im Hochformat (object-position)
    idea: {
      clips: [
        { src: M + 's5/s5-schriftzug.mp4', srcM: M + 's5/s5-schriftzug-m.mp4', poster: M + 's5/s5-schriftzug.webp', pos: '58% 50%',
          title: 'Bring deine Idee mit.', text: 'Ein Foto, ein Modell oder nur eine Farbe. Das reicht für das erste Gespräch.' },
        { src: M + 's5/s5-cockpit.mp4', srcM: M + 's5/s5-cockpit-m.mp4', poster: M + 's5/s5-cockpit.webp', pos: '50% 50%',
          title: 'Unser Beispiel: ein Cervélo S5.', text: 'Bei uns aufgebaut, in der Lackierung „Lupine LTD“.' },
        { src: M + 's5/s5-heck.mp4', srcM: M + 's5/s5-heck-m.mp4', poster: M + 's5/s5-heck.webp', pos: '42% 50%',
          title: 'Laufräder, Antrieb, Schaltung.', text: 'Was es dafür gibt und was es kostet, zeigen wir dir im Laden.' },
        { src: M + 's5/s5-rahmen.mp4', srcM: M + 's5/s5-rahmen-m.mp4', poster: M + 's5/s5-rahmen.webp', pos: '55% 50%',
          title: 'Die Farbe gehört dazu.', text: '„Lupine“ ist Blau mit Kupfer.' },
        { src: M + 's5/s5-rad.mp4', srcM: M + 's5/s5-rad-m.mp4', poster: M + 's5/s5-rad.webp', pos: '50% 50%',
          title: 'Das fertige S5.', text: '' },
      ],
      final: { src: M + 's5/s5-ganz.webp', srcM: M + 's5/s5-ganz-m.webp',
        alt: 'Cervélo S5 „Lupine LTD“ in Blau und Kupfer vor einer dunklen Holzwand' },
    },
    talk: {
      main: { src: M + 'team-laden.webp', alt: 'Achim, Elke und das Racepoint-Team mit Kindern und Bikes im Laden' },
      room: { src: M + 'showroom-2.webp', alt: 'Rennräder und Mountainbikes im Racepoint-Showroom' },
      detail: { src: M + 'detail-schaltgriff.webp', alt: 'Nahaufnahme eines Schaltgriffs an einem Rennrad' },
    },
    fit: {
      main: { src: M + 'fitting-raum.webp', alt: 'Der Retül-Fitting-Raum bei Racepoint mit Rollentrainer und Messtechnik' },
    },
    build: {
      film: { src: 'assets/racepoint-teaser-scrub.mp4', poster: 'assets/v10/film-poster.jpg', from: 6.5, to: 11.9 },
      steps: [
        { img: M + 'werkstatt-steuersatz.webp', alt: 'Steuersatz wird gefettet', title: 'Lager & Steuersatz', text: 'Gefettet und spielfrei eingepresst.' },
        { img: M + 'werkstatt-schaltwerk.webp', alt: 'Schaltwerk wird eingestellt', title: 'Antrieb', text: 'Schaltung eingestellt.' },
        { img: M + 'werkstatt-lenkerband.webp', alt: 'Lenkerband wird gewickelt', title: 'Cockpit', text: 'Lenkerband wickeln, Lenker ausrichten.' },
      ],
    },
    // Achims Dreambuilds: der erste Film wird groß gezeigt
    films: [
      { id: '5TcRRpUy5T4', title: 'Cervélo S5', sub: 'Vom Rahmen zum fertigen Rad', img: 'entwuerfe/codex-2026-10/prototype/assets/films/5TcRRpUy5T4.jpg' },
      { id: 'cIBBbESSOoc', title: 'S-Works Crux', sub: 'Ein Gravelbike entsteht', img: 'entwuerfe/codex-2026-10/prototype/assets/films/cIBBbESSOoc.jpg' },
      { id: '-84OwxUfgIQ', title: 'Turbo Levo SL', sub: 'E-MTB-Aufbau', img: 'entwuerfe/codex-2026-10/prototype/assets/films/-84OwxUfgIQ.jpg' },
      { id: 'vV_rL9yq620', title: 'S-Works Aethos', sub: 'Leichtbau aus der Werkstatt', img: 'entwuerfe/codex-2026-10/prototype/assets/films/vV_rL9yq620.jpg' },
      { id: 'WHggv7Jye4M', title: 'S-Works Shiv', sub: 'Triathlon-Build im Detail', img: 'entwuerfe/codex-2026-10/prototype/assets/films/WHggv7Jye4M.jpg' },
      { id: '17-1wlt905s', title: 'S-Works Tarmac SL9', sub: 'Das neue Tarmac im Aufbau', img: M + 'films/17-1wlt905s.jpg' },
    ],
    go: {
      ride: { src: M + 'ausfahrt-fahrer.webp', alt: 'Fahrer im Racepoint-Trikot auf einem blauen Cervélo S5 bei der Ausfahrt' },
      bike: { src: M + 's5/s5-hof.webp', alt: 'Das fertige Cervélo S5 „Lupine LTD“ steht abholbereit im Hof' },
    },
  };
  /* ========================================================== */

  const root = document.getElementById('traum');
  if (!root || !window.gsap) return;
  gsap.registerPlugin(ScrollTrigger);
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = !!(window.RP && RP.reducedMotion);
  const small = () => window.innerWidth < 820;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const playSvg = '<span class="film-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>';

  /* ---------- Bilder aus STORY in die Platzhalter setzen ---------- */
  $$('[data-t-img]', root).forEach(img => {
    const item = img.dataset.tImg.split('.').reduce((o, k) => o && o[k], STORY);
    if (!item) return;
    img.src = item.src; img.alt = item.alt || '';
  });

  /* ---------- Kapitel 1: Ebenen (Clips + finales Foto) ---------- */
  const clips = STORY.idea.clips, fin = STORY.idea.final;
  const layers = $('#tLayers');
  layers.innerHTML = clips.map((c, i) =>
    '<div class="t-layer" data-i="' + i + '"><video muted loop playsinline preload="none" data-poster="' + c.poster + '" style="object-position:' + c.pos + '" aria-hidden="true"></video></div>'
  ).join('') +
    '<div class="t-layer t-final" data-i="' + clips.length + '">' +
    '<img class="t-final-bg" src="' + fin.srcM + '" alt="" aria-hidden="true" loading="lazy">' +
    '<picture><source media="(max-width:819px)" srcset="' + fin.srcM + '"><img class="t-final-img" src="' + fin.src + '" alt="' + esc(fin.alt) + '" loading="lazy"></picture></div>';
  const vids = $$('video', layers);
  // Filme erst laden, wenn die Story näher als anderthalb Bildschirme ist (sonst bremsen sie den Seitenstart)
  const near = (el, fn) => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { rootMargin: '150% 0px' });
    io.observe(el);
  };
  near(root, () => vids.forEach((v, i) => {
    v.poster = v.dataset.poster;
    if (!RM) { v.preload = i < 2 ? 'auto' : 'metadata'; v.src = small() ? clips[i].srcM : clips[i].src; }
  }));
  $('#tCaps').innerHTML = clips.map((c, i) =>
    '<li class="t-cap"><b>0' + (i + 1) + '</b><span><strong>' + esc(c.title) + '</strong>' + (c.text ? esc(c.text) : '') + '</span></li>').join('');

  /* ---------- Kapitel 4: Arbeitsschritte + Dreambuilds ---------- */
  $('#tSteps').innerHTML = STORY.build.steps.map((s, i) =>
    '<li class="t-step"><img src="' + s.img + '" alt="' + esc(s.alt) + '" loading="lazy"><span><b>0' + (i + 1) + ' · ' + esc(s.title) + '</b>' + esc(s.text) + '</span></li>').join('');
  $('#tFilms').innerHTML = STORY.films.map((f, i) =>
    '<button class="film t-film' + (i ? '' : ' t-film-big') + ' rv" type="button" data-video="' + f.id + '">' +
    '<img src="' + f.img + '" alt="" loading="lazy">' + playSvg +
    '<span class="film-m"><span class="kicker">' + esc(f.sub) + '</span><b>' + esc(f.title) + '</b></span></button>').join('');
  // .rv blendet bestof.js ein (läuft nach dieser Datei und erfasst auch diese Karten)

  const scrub = $('#tScrub'), BF = STORY.build.film;
  scrub.poster = BF.poster;
  scrub.addEventListener('loadedmetadata', () => { scrub.currentTime = RM ? (BF.from + BF.to) / 2 : BF.from; }, { once: true });
  near($('#tBuild'), () => { scrub.preload = 'auto'; scrub.src = BF.src; });

  /* ---------- Kapitel-Leiste ---------- */
  const rail = $('#tRail'), railLinks = $$('a', rail);
  const chapters = ['#tIdea', '#tTalk', '#tFit', '#tBuild', '#tGo'];
  ScrollTrigger.create({ trigger: root, start: 'top 60%', end: 'bottom 40%', toggleClass: { targets: rail, className: 'on' } });
  chapters.forEach((sel, i) => {
    const end = i === 3 ? '#tDream' : sel;
    ScrollTrigger.create({
      trigger: sel, endTrigger: end, start: 'top 55%', end: 'bottom 55%',
      onToggle: st => { if (st.isActive) railLinks.forEach((a, k) => a.classList.toggle('cur', k === i)); },
    });
  });
  railLinks.forEach(a => a.addEventListener('click', e => {
    const t = $(a.getAttribute('href'));
    if (!t || !window.RP18Site || !RP18Site.scrollTo) return;
    e.preventDefault(); RP18Site.scrollTo(t);
  }));

  /* ---------- Reduzierte Bewegung: statische Endzustände ---------- */
  if (RM) {
    root.classList.add('t-static');
    return;
  }

  /* ---------- Kapitel 1: angeheftete Filmfolge ---------- */
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

  const tl = gsap.timeline({ defaults: { ease: 'none' } });
  // Einstieg: Titel, dann erster Clip übernimmt
  tl.to('#tIntro', { autoAlpha: 0, y: -50, duration: 0.5 }, 0.55)
    .to(caps[0], { autoAlpha: 1, y: 0, duration: 0.3 }, 0.9);
  for (let i = 1; i < n; i++) {
    const t = 0.9 + i * 1.1;
    tl.to(caps[i - 1], { autoAlpha: 0, y: -24, duration: 0.2 }, t - 0.3)
      .to(L[i], { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.inOut' }, t - 0.2)
      .fromTo($('video', L[i]), { scale: 1.18 }, { scale: 1, duration: 1.3 }, t - 0.2)
      .to(caps[i], { autoAlpha: 1, y: 0, duration: 0.25 }, t + 0.15);
  }
  // Höhepunkt: das ganze Rad, ruhig, mit großer Zeile
  const tf = 0.9 + n * 1.1;
  tl.to(caps[n - 1], { autoAlpha: 0, y: -24, duration: 0.25 }, tf - 0.4)
    .fromTo(L[n], { autoAlpha: 0, clipPath: 'inset(0% 0% 0% 0%)' }, { autoAlpha: 1, duration: 0.6 }, tf - 0.2)
    .fromTo($('.t-final-img', L[n]), { scale: 1.12 }, { scale: 1, duration: 1.2, ease: 'power2.out' }, tf - 0.2)
    .to('#tFin', { autoAlpha: 1, duration: 0.01 }, tf + 0.2)
    .to('#tFin .t-big', { yPercent: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out' }, tf + 0.2)
    .from('#tFin .t-fin-row', { autoAlpha: 0, y: 20, duration: 0.3 }, tf + 0.55)
    .to({}, { duration: 0.7 });
  const total = tl.duration();
  const marks = Array.from({ length: n + 1 }, (_, i) => i === 0 ? 0 : (i < n ? 0.9 + i * 1.1 - 0.2 : tf - 0.2));

  ScrollTrigger.create({
    trigger: '#tIdea', pin: '#tStage', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * (small() ? 5 : 5.6)),
    animation: tl, scrub: 0.6, anticipatePin: 1,
    onUpdate: st => {
      const tt = st.progress * total;
      let i = 0; marks.forEach((m, k) => { if (tt >= m + 0.25) i = k; });
      setActive(i); // i === n: finales Foto, kein Clip läuft
      gsap.set('#tTickBar', { scaleX: st.progress });
    },
    onToggle: st => { if (!st.isActive) { vids.forEach(v => v.pause()); active = -1; } else setActive(Math.max(active, 0)); },
  });
  setActive(0);

  /* ---------- Kapitel 2 + 5: ruhige Parallaxe ---------- */
  [['.t-pic-a', -40], ['.t-pic-b', 60], ['.t-pic-c', -90], ['.t-go-ride', -50]].forEach(([sel, y]) => {
    const el = $(sel, root); if (!el) return;
    gsap.fromTo(el, { y: -y / 2 }, { y: y / 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
  gsap.fromTo('.t-fit-pic img', { scale: 1.15 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.t-fit-pic', start: 'top bottom', end: 'center center', scrub: true } });

  /* ---------- Kapitel 4: Shop-Film scrubben ---------- */
  const steps = $$('.t-step', root);
  gsap.set(steps, { autoAlpha: 0, y: 40 });
  const btl = gsap.timeline({ defaults: { ease: 'none' } });
  const fp = { t: 0 };
  btl.to(fp, { t: 1, duration: 3, onUpdate: () => {
    const want = BF.from + fp.t * (BF.to - BF.from);
    if (scrub.readyState >= 1 && Math.abs(scrub.currentTime - want) > 0.03) scrub.currentTime = want;
  } }, 0);
  steps.forEach((s, i) => btl.to(s, { autoAlpha: 1, y: 0, duration: 0.35, ease: 'power2.out' }, 0.35 + i * 0.85));
  btl.to({}, { duration: 0.4 });
  ScrollTrigger.create({
    trigger: '#tBuild', pin: '#tBuildStage', start: 'top top', end: () => '+=' + Math.round(window.innerHeight * 2.4),
    animation: btl, scrub: 0.4, anticipatePin: 1,
  });
})();
