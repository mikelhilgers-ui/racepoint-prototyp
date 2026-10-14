/* =====================================================================
   RACEPOINT · 17 · BEST OF — gemeinsamer Rahmen aller v17-Seiten (THROWAWAY)
   - setzt Header (mit Bikes-Menue), Mobil-Menue und Footer ein,
     markiert die aktive Seite (<body data-page="…">)
   - Basis: Lenis + ScrollTrigger, Header ein-/ausblenden, Anker,
     Einblenden (.rv), Zaehler ([data-count]), Oeffnungszeiten (#hours)
   Muss NACH gsap/ScrollTrigger/Lenis/rp-core und VOR den Seiten-Skripten
   geladen werden. Stellt window.RP17Site bereit.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const RM = !!(window.RP && RP.reducedMotion);
  if (RM) document.documentElement.classList.add('rm');
  if (window.gsap && window.ScrollTrigger) gsap.registerPlugin(ScrollTrigger);

  // Diese Variante ist bewusst nur deutsch (Live-Status, KI-Begruessung)
  const forceDe = () => { if (window.RP && RP.lang !== 'de') RP.setLang('de'); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', forceDe); else forceDe();

  const HOME = 'v17-best-of.html';
  // Kategorien (Texte aus dem Codex-Original „11 · Original“)
  const CATS = [
    { id: 'rennrad', href: 'v17-rennrad.html', name: 'Rennrad', short: 'Allez, Roubaix, Tarmac', img: 'assets/roadbike-shop.jpg' },
    { id: 'gravel', href: 'v17-gravel.html', name: 'Gravel', short: 'Diverge & Crux', img: 'assets/gravel-ride.jpg' },
    { id: 'mtb', href: 'v17-mtb.html', name: 'MTB', short: 'Rockhopper bis Stumpjumper', img: 'assets/mtb-action.jpg' },
    { id: 'ebike', href: 'v17-ebike.html', name: 'E-Bike', short: 'Turbo Vado & Levo', img: 'entwuerfe/codex-2026-10/prototype/assets/hero-ebike.jpg' },
    { id: 'familie', href: 'v17-familie.html', name: 'Kids & Familie', short: 'Riprock & Alltag', img: 'assets/achim-team.jpg' },
  ];
  const PAGES = [
    { id: 'werkstatt', href: 'v17-werkstatt.html', name: 'Werkstatt' },
    { id: 'bikefitting', href: 'v17-bikefitting.html', name: 'Bikefitting' },
    { id: 'filme', href: 'v17-filme.html', name: 'Filme' },
    { id: 'ueber-uns', href: 'v17-ueber-uns.html', name: 'Über uns' },
    { id: 'kontakt', href: 'v17-kontakt.html', name: 'Kontakt' },
  ];
  const page = document.body.dataset.page || 'home';
  const isCat = CATS.some(c => c.id === page) || page === 'bike';
  const cur = id => (id === page || (id === 'bikes' && isCat)) ? ' aria-current="page" class="on"' : '';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const chev = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const isHome = page === 'home';
  const bikesHref = isHome ? '#bikes' : HOME + '#bikes';

  /* ---------------- Header ---------------- */
  const header =
    '<header class="hdr" id="hdr"><div class="hdr-in">' +
      '<a class="logo" href="' + HOME + '" aria-label="Racepoint · Startseite"><img src="assets/racepoint-logo-light.svg" alt="Racepoint" width="200" height="16"></a>' +
      '<nav class="hdr-nav" aria-label="Hauptnavigation">' +
        '<div class="dd">' +
          '<a href="' + bikesHref + '"' + cur('bikes') + ' aria-haspopup="true">Bikes' + chev + '</a>' +
          '<div class="dd-p"><div class="dd-in">' +
            CATS.map(c => '<a href="' + c.href + '"' + (page === c.id ? ' aria-current="page" class="on"' : '') + '><img src="' + c.img + '" alt="" loading="lazy"><span><b>' + c.name + '</b><small>' + c.short + '</small></span></a>').join('') +
          '</div></div>' +
        '</div>' +
        PAGES.map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') +
      '</nav>' +
      '<div class="hdr-r">' +
        '<span class="pill pill-status" data-open-status></span>' +
        '<a class="btn btn-sm" data-ask="Ich möchte einen Termin vereinbaren.">Termin</a>' +
        '<button class="burger" type="button" aria-label="Menü öffnen" aria-controls="mmenu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>' +
      '</div>' +
    '</div></header>' +
    '<div class="mmenu" id="mmenu" aria-hidden="true" data-lenis-prevent>' +
      '<button class="mclose" type="button" aria-label="Menü schließen">&times;</button>' +
      '<p class="mm-k">Bikes</p>' +
      '<div class="mm-cats">' + CATS.map(c => '<a href="' + c.href + '"' + (page === c.id ? ' aria-current="page" class="on"' : '') + '><img src="' + c.img + '" alt="" loading="lazy"><b>' + c.name + '</b></a>').join('') + '</div>' +
      '<nav class="mm-links" aria-label="Seiten">' +
        '<a href="' + HOME + '"' + cur('home') + '>Start</a>' +
        PAGES.map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') +
        '<a href="v17-anfrage.html"' + cur('anfrage') + '>Anfrage</a>' +
      '</nav>' +
      '<div class="mmenu-f">' +
        '<span class="pill pill-status" data-open-status></span>' +
        '<div class="btns"><a class="btn" data-ask="Ich möchte einen Termin vereinbaren.">Termin anfragen</a><a class="btn ghost" href="tel:+3280548898">+32 80 54 88 98</a></div>' +
      '</div>' +
    '</div>';

  /* ---------------- Footer ---------------- */
  const footer =
    '<footer class="ftr"><div class="wrap ftr-grid">' +
      '<div class="ftr-brand"><img src="assets/racepoint-logo-light.svg" alt="Racepoint" width="200" height="16">' +
        '<p>Dein Bike. Dein Moment.<br>Specialized Elite Händler · Cervélo · Meisterwerkstatt · Retül-Bikefitting</p>' +
        '<span class="pill pill-status" data-open-status></span></div>' +
      '<nav aria-label="Bikes"><b>Bikes</b>' + CATS.map(c => '<a href="' + c.href + '"' + cur(c.id) + '>' + c.name + '</a>').join('') + '</nav>' +
      '<nav aria-label="Service"><b>Racepoint</b>' + PAGES.slice(0, 4).map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') + '<a href="v17-anfrage.html"' + cur('anfrage') + '>Anfrage</a></nav>' +
      '<div class="ftr-c"><b>Kontakt</b><span>K.-F. Schinkel Straße 5<br>4782 Schönberg, Belgien</span><a href="tel:+3280548898">+32 80 54 88 98</a><a href="mailto:info@racepoint.be">info@racepoint.be</a><a href="v17-kontakt.html"' + cur('kontakt') + '>Kontakt &amp; Anfahrt ' + arrow + '</a></div>' +
    '</div>' +
    '<div class="wrap ftr-bot"><span>© Racepoint · Schönberg, Ostbelgien</span><a href="https://www.youtube.com/@racepointbikeshop" target="_blank" rel="noopener">YouTube</a><a href="https://www.instagram.com/racepoint.be/" target="_blank" rel="noopener">Instagram</a><span>Prototyp 17 · Best of</span></div></footer>';

  const skip = $('.skip');
  if (skip) skip.insertAdjacentHTML('afterend', header); else document.body.insertAdjacentHTML('afterbegin', header);
  const main = $('main');
  if (main) main.insertAdjacentHTML('afterend', footer);
  if (window.RP && RP.updateStatusPills) RP.updateStatusPills();

  /* ---------------- Lenis ---------------- */
  let lenis = null;
  if (!RM && window.Lenis && window.gsap) {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  /* ---------------- Menue ---------------- */
  const mmenu = $('#mmenu'), burger = $('.burger');
  const setMenu = on => {
    mmenu.classList.toggle('on', on);
    mmenu.setAttribute('aria-hidden', String(!on));
    burger.setAttribute('aria-expanded', String(on));
    document.documentElement.classList.toggle('mm-open', on);
    if (lenis) on ? lenis.stop() : lenis.start();
    if (on) setTimeout(() => $('.mclose').focus(), 60);
  };
  burger.addEventListener('click', () => setMenu(true));
  $('.mclose').addEventListener('click', () => { setMenu(false); burger.focus(); });
  mmenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mmenu.classList.contains('on')) setMenu(false); });

  // Bikes-Dropdown: per Tastatur/Touch oeffnen
  const dd = $('.hdr .dd');
  dd.addEventListener('focusin', () => dd.classList.add('open'));
  dd.addEventListener('focusout', e => { if (!dd.contains(e.relatedTarget)) dd.classList.remove('open'); });
  dd.addEventListener('mouseleave', () => dd.classList.remove('open'));

  /* ---------------- Anker (auch HOME#bikes auf der Startseite) ---------------- */
  function scrollToEl(el) {
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 }); else el.scrollIntoView({ behavior: RM ? 'auto' : 'smooth' });
  }
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href*="#"]');
    if (!a || e.defaultPrevented) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash || url.hash === '#') return;
    const el = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!el) return;
    e.preventDefault();
    scrollToEl(el);
  });
  // Mit Anker angekommen: nach dem Pinning (ScrollTrigger) noch einmal genau hinspringen
  if (location.hash.length > 1) {
    window.addEventListener('load', () => setTimeout(() => {
      const el = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (!el) return;
      if (window.ScrollTrigger) ScrollTrigger.refresh();
      if (lenis) lenis.scrollTo(el, { immediate: true }); else el.scrollIntoView();
    }, 120));
  }

  /* ---------------- Header ein-/ausblenden ---------------- */
  const hdr = $('#hdr');
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: self => {
        const y = self.scroll();
        hdr.classList.toggle('solid', y > 60);
        hdr.classList.toggle('hide', self.direction === 1 && y > 400 && !mmenu.classList.contains('on'));
      },
    });
  }

  /* ---------------- Einblenden, Zaehler, Oeffnungszeiten ---------------- */
  const fmt = (n, d) => n.toLocaleString('de-BE', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
  function reveal(root) {
    const els = $$('.rv', root).filter(el => !el.dataset.rvOn);
    els.forEach(el => { el.dataset.rvOn = '1'; });
    if (RM || !window.ScrollTrigger) { els.forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); return; }
    ScrollTrigger.batch(els, { start: 'top 92%', once: true, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 1, stagger: 0.08, ease: 'power3.out', overwrite: true }) });
  }
  function counters(root) {
    $$('[data-count]', root).forEach(el => {
      if (el.dataset.countOn) return;
      el.dataset.countOn = '1';
      const n = +el.dataset.count, o = { v: 0 };
      if (RM || !window.ScrollTrigger) { el.textContent = fmt(n); return; }
      el.textContent = '0';
      ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: n, duration: 1.8, ease: 'power3.out', onUpdate: () => { el.textContent = fmt(o.v); } }) });
    });
  }
  function hours() {
    $$('[data-hours]').forEach(ul => {
      ul.innerHTML = RP.hoursRows('de').map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span>' + r.day + '</span><span>' + r.text + '</span></li>').join('');
    });
  }
  // Seiten-Seiten (data-page != home): Einblenden sofort aktivieren; die Startseite ruft das selbst auf
  if (!isHome) {
    reveal(document); counters(document);
    // Page-Hero: Bild oeffnet sich, Ueberschrift kommt hoch, Riesen-Wort wandert
    if (!RM && window.gsap) {
      const h = $('.phero');
      if (h) {
        gsap.from($$('.phero-txt > *', h), { autoAlpha: 0, y: 34, duration: 1, ease: 'power3.out', stagger: 0.07, delay: 0.1 });
        const fig = $('.phero-fig', h);
        if (fig) {
          gsap.fromTo(fig, { clipPath: 'inset(10% 10% 10% 10% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.4, ease: 'expo.out', delay: 0.15 });
          gsap.fromTo($('img', fig), { scale: 1.25 }, { scale: 1.06, duration: 1.8, ease: 'expo.out', delay: 0.15 });
          gsap.to($('img', fig), { yPercent: 6, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
        }
        const word = $('.phero-word', h);
        if (word) gsap.fromTo(word, { xPercent: 0 }, { xPercent: -18, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
      }
    }
  }
  hours();
  setInterval(hours, 60 * 1000);
  window.addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  window.RP17Site = { lenis, CATS, PAGES, HOME, page, reveal, counters, fmt, scrollTo: scrollToEl, setMenu, RM };
})();
