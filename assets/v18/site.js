/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE — gemeinsamer Rahmen aller v18-Seiten (THROWAWAY)
   - setzt Header (mit Bikes-Menue), Mobil-Menue und Footer ein,
     markiert die aktive Seite (<body data-page="…">)
   - Basis: Lenis + ScrollTrigger, Header ein-/ausblenden, Anker,
     Einblenden (.rv), Zaehler ([data-count]), Oeffnungszeiten (#hours)
   Muss NACH gsap/ScrollTrigger/Lenis/rp-core und VOR den Seiten-Skripten
   geladen werden. Stellt window.RP18Site bereit.
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

  const HOME = 'v18-traumbike.html';
  // Kategorien (Texte aus dem Codex-Original „11 · Original“)
  const CATS = [
    { id: 'rennrad', href: 'v18-rennrad.html', name: 'Rennrad', short: 'Allez, Roubaix, Tarmac', img: 'assets/roadbike-shop.jpg' },
    { id: 'gravel', href: 'v18-gravel.html', name: 'Gravel', short: 'Diverge & Crux', img: 'assets/gravel-ride.jpg' },
    { id: 'mtb', href: 'v18-mtb.html', name: 'MTB', short: 'Rockhopper bis Stumpjumper', img: 'assets/mtb-action.jpg' },
    { id: 'ebike', href: 'v18-ebike.html', name: 'E-Bike', short: 'Turbo Vado & Levo', img: 'entwuerfe/codex-2026-10/prototype/assets/hero-ebike.jpg' },
    { id: 'familie', href: 'v18-familie.html', name: 'Kinder & Familie', short: 'Riprock, Hotwalk & Co.', img: 'assets/achim-team.jpg' },
  ];
  // Shop: Bikes (Kategorie-Seiten, reservieren), Zubehör und Kollektion (kaufen) unter einem Menüpunkt
  const SHOP = 'v18-shop.html';
  const ZUB = { id: 'zubehoer', href: 'v18-zubehoer.html', name: 'Zubehör', short: 'Schuhe, Helme, Bekleidung', img: 'assets/v18/media/cine/kleid-3.webp' };
  const KOLL = { id: 'kollektion', href: 'v18-kollektion.html', name: 'Kollektion', short: 'Shirts, Hoodies, Gutscheine', img: 'assets/v18/media/shop/hoodie-bw-w-3.webp' };
  const EXTRA = [ZUB, KOLL];
  const BIKES = 'v18-bikes.html';
  const PAGES = [
    { id: 'werkstatt', href: 'v18-werkstatt.html', name: 'Werkstatt' },
    { id: 'bikefitting', href: 'v18-bikefitting.html', name: 'Bikefitting' },
    { id: 'touren', href: 'v18-touren.html', name: 'Touren' },
    { id: 'filme', href: 'v18-filme.html', name: 'Filme' },
    { id: 'ueber-uns', href: 'v18-ueber-uns.html', name: 'Über uns' },
    { id: 'kontakt', href: 'v18-kontakt.html', name: 'Kontakt' },
  ];
  const page = document.body.dataset.page || 'home';
  const isCat = CATS.some(c => c.id === page) || page === 'bike' || page === 'bikes' || page === 'shop' || page === ZUB.id || page === KOLL.id;
  const cur = id => (id === page || (id === 'bikes' && isCat)) ? ' aria-current="page" class="on"' : '';
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const chev = '<svg class="chev" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  const isHome = page === 'home';
  const bikesHref = SHOP;
  // Warenkorb-Zähler für den Header (Inhalt verwaltet shop.js, hier nur lesen)
  let cartN = 0;
  try { cartN = JSON.parse(localStorage.getItem('rp18-cart') || '[]').reduce((n, i) => n + (i.qty || 0), 0); } catch (e) {}
  const bag = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 8V6.5a3 3 0 016 0V8"/></svg>';

  /* ---------------- Hell/Dunkel/Mix: Icons + Segment-Schalter ---------------- */
  const THEMES = [
    { id: 'dark', name: 'Dunkel' },
    { id: 'light', name: 'Hell' },
    { id: 'mix', name: 'Mix' },
  ];
  const ICON = {
    dark: '<svg class="ic-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg>',
    light: '<svg class="ic-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M4.6 4.6l1.6 1.6M17.8 17.8l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.6 19.4l1.6-1.6M17.8 6.2l1.6-1.6"/></svg>',
    mix: '<svg class="ic-mix" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path class="half" d="M12 3.5a8.5 8.5 0 0 1 0 17z"/></svg>',
  };
  const themeSeg = '<div class="theme-seg" role="group" aria-label="Darstellung">' +
    THEMES.map(t => '<button type="button" data-set-theme="' + t.id + '" aria-pressed="false" title="' + t.name + '">' + ICON[t.id] + '<span>' + t.name + '</span></button>').join('') + '</div>';

  /* ---------------- Header ---------------- */
  const header =
    '<header class="hdr" id="hdr"><div class="hdr-in">' +
      '<a class="logo" href="' + HOME + '" aria-label="Racepoint · Startseite"><img class="lg-l" src="assets/racepoint-logo-light.svg" alt="Racepoint" width="200" height="16"><img class="lg-d" src="assets/racepoint-logo-dark.svg" alt="Racepoint" width="200" height="16"></a>' +
      '<nav class="hdr-nav" aria-label="Hauptnavigation">' +
        '<div class="dd">' +
          '<a href="' + bikesHref + '"' + cur('bikes') + ' aria-haspopup="true">Shop' + chev + '</a>' +
          '<div class="dd-p"><div class="dd-in">' +
            CATS.concat(EXTRA).map(c => '<a href="' + c.href + '" class="' + (c === ZUB ? 'dd-zub' : '') + (page === c.id ? ' on" aria-current="page"' : '"') + '><img data-src="' + c.img + '" alt=""><span><b>' + c.name + '</b><small>' + c.short + '</small></span></a>').join('') +
            '<div class="dd-foot"><a class="dd-all" href="' + BIKES + '"' + (page === 'bikes' ? ' aria-current="page"' : '') + '>Alle Bikes ' + arrow + '</a>' +
            '<a class="dd-all" href="' + SHOP + '"' + (page === 'shop' ? ' aria-current="page"' : '') + '>Ganzer Shop ' + arrow + '</a></div>' +
          '</div></div>' +
        '</div>' +
        PAGES.map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') +
      '</nav>' +
      '<div class="hdr-r">' +
        '<span class="pill pill-status" data-open-status></span>' +
        '<a class="btn btn-sm" data-ask="Ich möchte einen Termin vereinbaren.">Termin</a>' +
        '<a class="hdr-cart' + (cartN ? ' has' : '') + '" href="' + SHOP + '#warenkorb" data-cart-open aria-label="Warenkorb">' + bag + '<span data-cart-count>' + cartN + '</span></a>' +
        themeSeg +
        '<button class="theme-tg" type="button" data-theme-next>' + ICON.dark + ICON.light + ICON.mix + '</button>' +
        '<button class="burger" type="button" aria-label="Menü öffnen" aria-controls="mmenu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg></button>' +
      '</div>' +
    '</div></header>' +
    '<div class="mmenu" id="mmenu" aria-hidden="true" data-lenis-prevent>' +
      '<button class="mclose" type="button" aria-label="Menü schließen">&times;</button>' +
      // Mobil zuerst das, was man unterwegs braucht: Status, Zeiten, Anrufen, Route. Bikes kommen ans Ende.
      '<div class="mm-info">' +
        '<span class="pill pill-status" data-open-status></span>' +
        '<ul class="mm-week" data-hours-week aria-label="Öffnungszeiten"></ul>' +
        '<div class="mm-act">' +
          '<a class="btn" href="tel:+3280548898">Anrufen</a>' +
          '<a class="btn ghost" data-ask="Ich möchte einen Termin vereinbaren.">Termin</a>' +
          '<a class="btn ghost" href="https://www.google.com/maps/search/?api=1&amp;query=Racepoint+Sch%C3%B6nberg+Belgien" target="_blank" rel="noopener">Route</a>' +
        '</div>' +
        '<p class="mm-adr">K.-F. Schinkel Straße 5 · 4782 Schönberg</p>' +
      '</div>' +
      '<div class="mm-theme"><p>Darstellung</p>' + themeSeg + '</div>' +
      '<nav class="mm-links" aria-label="Seiten">' +
        '<a href="' + HOME + '"' + cur('home') + '>Start</a>' +
        PAGES.map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') +
      '</nav>' +
      '<p class="mm-k"><a href="' + SHOP + '"' + (page === 'shop' ? ' aria-current="page"' : '') + '>Shop ' + arrow + '</a> · <a href="' + BIKES + '"' + (page === 'bikes' ? ' aria-current="page"' : '') + '>Alle Bikes ' + arrow + '</a></p>' +
      '<div class="mm-cats">' + CATS.concat(EXTRA).map(c => '<a href="' + c.href + '"' + (page === c.id ? ' aria-current="page" class="on"' : '') + '><img data-src="' + c.img + '" alt=""><b>' + c.name + '</b></a>').join('') + '</div>' +
    '</div>';

  /* ---------------- Footer ---------------- */
  // Kanäle (Zahlen gerundet, Stand IST-Analyse 10/2026)
  const SOCIAL = [
    { k: 'yt', href: 'https://www.youtube.com/@racepointbikeshop', name: 'YouTube', handle: '@racepointbikeshop', n: '80.000', unit: 'Abos · 18 Mio. Aufrufe', cta: 'Abonnieren',
      svg: '<path d="M21.6 7.2a2.5 2.5 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.5 2.5 0 0 0 2.4 7.2 26 26 0 0 0 2 12a26 26 0 0 0 .4 4.8 2.5 2.5 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.5 2.5 0 0 0 1.8-1.8A26 26 0 0 0 22 12a26 26 0 0 0-.4-4.8z" class="f"/><path d="M10 15.2V8.8l5.4 3.2z" class="p"/>' },
    { k: 'ig', href: 'https://www.instagram.com/racepoint.be/', name: 'Instagram', handle: '@racepoint.be', n: '14.000', unit: 'Follower · Builds & Ausfahrten', cta: 'Folgen',
      svg: '<rect x="3" y="3" width="18" height="18" rx="5.2" class="s"/><circle cx="12" cy="12" r="4.2" class="s"/><circle cx="17.3" cy="6.7" r="1.2" class="d"/>' },
    { k: 'fb', href: 'https://www.facebook.com/racepoint.be/', name: 'Facebook', handle: '/racepoint.be', n: '5.000', unit: 'Fans · News aus dem Laden', cta: 'Folgen',
      svg: '<path d="M13.6 21v-7.6h2.6l.4-3h-3V8.5c0-.9.3-1.5 1.6-1.5h1.6V4.3c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4V10.4H8v3h2.6V21z" class="f"/>' },
  ];
  const social =
    '<div class="wrap ftr-soc">' +
      '<div class="ftr-soc-h"><p class="kicker">Racepoint online</p><p class="ftr-soc-t">Rund <b>100.000</b> Abos und Follower auf allen Kanälen.</p></div>' +
      '<div class="ftr-soc-g">' + SOCIAL.map(c =>
        '<a class="soc soc-' + c.k + '" href="' + c.href + '" target="_blank" rel="noopener">' +
          '<span class="soc-ic"><svg viewBox="0 0 24 24" aria-hidden="true">' + c.svg + '</svg></span>' +
          '<span class="soc-m"><b>' + c.name + '</b><small>' + c.handle + '</small></span>' +
          '<span class="soc-n"><strong>' + c.n + '</strong><small>' + c.unit + '</small></span>' +
          '<span class="soc-go">' + c.cta + ' ' + arrow + '</span>' +
        '</a>').join('') +
      '</div>' +
    '</div>';
  const footer =
    '<footer class="ftr">' + social + '<div class="wrap ftr-grid">' +
      '<div class="ftr-brand"><a class="ftr-logo" href="' + HOME + '" aria-label="Racepoint · Startseite"><img src="assets/racepoint-logo-light.svg" alt="Racepoint" width="200" height="16"></a>' +
        '<p>Dein Radladen in Schönberg<br>Specialized Elite Händler · Cervélo · Meisterwerkstatt · Retül-Bikefitting</p>' +
        '<span class="pill pill-status" data-open-status></span></div>' +
      '<nav aria-label="Shop"><b>Shop</b><a href="' + SHOP + '"' + cur('shop') + '>Ganzer Shop</a><a href="' + BIKES + '"' + (page === 'bikes' ? ' aria-current="page" class="on"' : '') + '>Alle Bikes</a>' + CATS.concat(EXTRA).map(c => '<a href="' + c.href + '"' + (page === c.id ? ' aria-current="page" class="on"' : '') + '>' + c.name + '</a>').join('') + '</nav>' +
      '<nav aria-label="Service"><b>Racepoint</b>' + PAGES.filter(p => p.id !== 'kontakt').map(p => '<a href="' + p.href + '"' + cur(p.id) + '>' + p.name + '</a>').join('') + '</nav>' +
      '<div class="ftr-c"><b>Kontakt</b><span>K.-F. Schinkel Straße 5<br>4782 Schönberg, Belgien</span><a href="tel:+3280548898">+32 80 54 88 98</a><a href="mailto:info@racepoint.be">info@racepoint.be</a><a href="v18-kontakt.html"' + cur('kontakt') + '>Kontakt &amp; Anfahrt ' + arrow + '</a></div>' +
    '</div>' +
    '<div class="wrap ftr-bot"><span>© Racepoint · Schönberg, Ostbelgien</span><span>Prototyp 18 · Mein Traumbike</span></div></footer>';

  const skip = $('.skip');
  if (skip) skip.insertAdjacentHTML('afterend', header); else document.body.insertAdjacentHTML('afterbegin', header);
  const main = $('main');
  // Störer unten auf jeder Shop-Seite: verlinkt das Gegenstück (Rad ↔ Zubehör)
  const ZUB_IMG = 'assets/v18/media/cine/helme.webp', BIKE_IMG = 'assets/roadbike-shop.jpg';
  const toZub = (k, h1, h2, p) => ({ k, h1, h2, p, href: ZUB.href, btn: 'Zu Zubehör & Bekleidung', img: ZUB_IMG, alt: 'Helmwand im Racepoint-Laden' });
  const STOER = {
    rennrad: toZub('Passt zum Rennrad', 'Jetzt noch', 'Schuhe und Helm.', 'S-Works Torch, Evade-Helm und Trikots. Anprobieren geht in Schönberg.'),
    gravel: toZub('Passt zum Gravelbike', 'Schotter ruft.', 'Schuhe auch?', 'Recon SL für Pedal und Feldweg, dazu Helm und Trikot.'),
    mtb: toZub('Passt zum MTB', 'Fürs Trail', 'fehlt noch was.', 'S-Works Recon, Helm und Trikots. Anprobieren geht in Schönberg.'),
    ebike: toZub('Passt zum E-Bike', 'Motor hat es.', 'Helm auch?', 'Helme, Schuhe und Bekleidung für jede Runde.'),
    familie: toZub('Für die Großen', 'Die Eltern', 'fahren ja mit.', 'Helme, Schuhe und Trikots für alle, die hinterherkommen müssen.'),
    bikes: toZub('Passt zum neuen Rad', 'Rad gefunden?', 'Jetzt Helm und Schuhe.', 'Schuhe, Helme und Trikots. Anprobieren geht in Schönberg.'),
    bike: toZub('Passt zum neuen Rad', 'Rad gefunden?', 'Jetzt Helm und Schuhe.', 'Schuhe, Helme und Trikots. Anprobieren geht in Schönberg.'),
    zubehoer: { k: 'Passt zu den Schuhen', h1: 'Schuhe sitzen?', h2: 'Fehlt nur das Rad.', p: 'Vom Allez bis zum S-Works: reservieren, Probe fahren, im Laden zahlen.', href: BIKES, btn: 'Bikes ansehen', img: BIKE_IMG, alt: 'S-Works Rennrad im Showroom' },
    kollektion: { k: 'Passt zum Shirt', h1: 'Shirt sitzt?', h2: 'Jetzt das Rad dazu.', p: 'Vom Allez bis zum S-Works: reservieren, Probe fahren, im Laden zahlen.', href: BIKES, btn: 'Bikes ansehen', img: BIKE_IMG, alt: 'S-Works Rennrad im Showroom' },
    shop: { k: 'Passt zum neuen Rad', h1: 'Erst vermessen,', h2: 'dann kaufen.', p: 'Beim Retül-Bikefitting vermessen wir deine Haltung in 3D, damit das neue Rad von Anfang an passt.', href: 'v18-bikefitting.html', btn: 'Zum Bikefitting', img: 'assets/v18/media/cine/fitting-3.webp', alt: 'Retül-Bikefitting bei Racepoint' },
  };
  const st = STOER[page];
  const stoerer = st ? '<aside class="stoer" aria-label="' + st.k + '"><div class="wrap stoer-in">' +
    '<div class="stoer-txt"><p class="stoer-k">' + st.k + '</p><h2 class="stoer-h">' + st.h1 + '<br><em>' + st.h2 + '</em></h2><p class="stoer-p">' + st.p + '</p>' +
    '<a class="btn stoer-btn" href="' + st.href + '">' + st.btn + ' ' + arrow + '</a></div>' +
    '<a class="stoer-fig" href="' + st.href + '" tabindex="-1" aria-hidden="true"><img src="' + st.img + '" alt="" loading="lazy"><span class="stoer-badge">Passt<br>dazu!</span></a>' +
    '</div></aside>' : '';
  // KI-Berater ganz unten (auf Shop-Seiten vor dem Störer): überall gleicher Block, Text je Seite. Die Werkstatt hat ihn schon im Inhalt
  const TERMIN_HINWEIS = 'Ein Termin ist nur eine Anfrage. Gebucht ist er erst, wenn das Racepoint-Team ihn bestätigt.';
  const KIB = {
    home: { k: 'KI-Berater <span class="ai-mode" id="aiMode">· verbindet …</span>', h1: 'Frag den', h2: 'KI-Berater.', p: 'Er empfiehlt Bikes aus dem Katalog, hilft bei der Rahmengröße, nennt Öffnungszeiten und bereitet Terminanfragen vor. Wird es persönlich, übernimmt Achim.', ph: 'Z. B. „Gravelbike bis 3.000 € für Touren im Venn“',
      chips: [['Bike-Beratung', 'Welches Bike passt zu mir? Ich hätte gern eine Beratung.'], ['Öffnungszeiten', 'Habt ihr heute geöffnet? Wie sind eure Öffnungszeiten?'], ['Termin', 'Ich möchte einen Termin vereinbaren.'], ['Rahmengröße', 'Welche Rahmengröße brauche ich?']] },
    kontakt: { k: 'KI-Berater', h1: 'Schneller gefragt', h2: 'als angerufen.', p: 'Öffnungszeiten, Anfahrt, Termin oder eine Frage zum Rad: Der KI-Berater antwortet sofort und bereitet deine Anfrage vor. Wird es persönlich, übernimmt Achim.', ph: 'Z. B. „Habt ihr Samstag offen?“',
      chips: [['Öffnungszeiten', 'Habt ihr heute geöffnet? Wie sind eure Öffnungszeiten?'], ['Anfahrt', 'Wie komme ich zu Racepoint in Schönberg?'], ['Termin', 'Ich möchte einen Termin vereinbaren.'], ['Anfrage vorbereiten', 'Hilf mir, meine Anfrage an Racepoint vorzubereiten.']] },
    bikes: { k: 'KI-Berater', h1: 'Der KI-Berater', h2: 'hilft bei der Auswahl.', p: 'Beschreib, wo du fährst und was du ausgeben möchtest. Der KI-Berater sucht passende Modelle aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Erstes Rennrad, Budget 2.000 €“',
      chips: [['Welches Bike?', 'Welches Bike passt zu mir?'], ['Rennrad', 'Welches Rennrad passt zu mir?'], ['E-Bike', 'Welches E-Bike passt zu mir?'], ['Leasing', 'Bietet ihr Leasing oder Finanzierung an?']] },
    rennrad: { k: 'KI-Berater', h1: 'Das passende Rennrad', h2: 'mit dem KI-Berater.', p: 'Schreib, wie weit du fährst und wie viel du ausgeben willst. Der KI-Berater sucht passende Modelle aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Rennrad für lange Sonntagsrunden bis 3.000 €“',
      chips: [['Welches Rennrad?', 'Welches Rennrad passt zu mir? Ich hätte gern eine Beratung.'], ['Rahmengröße', 'Welche Rahmengröße brauche ich für ein Rennrad?'], ['Probefahrt', 'Kann ich ein Rennrad bei euch probefahren?'], ['Retül-Fitting', 'Ich möchte einen Termin für ein Retül-Bikefitting.']] },
    gravel: { k: 'KI-Berater', h1: 'Gravelbike für', h2: 'Venn und Eifel.', p: 'Schreib, wo du fährst und wie viel Gepäck mitkommt. Der KI-Berater sucht passende Modelle aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Gravelbike bis 3.000 € für Touren im Venn“',
      chips: [['Welches Gravelbike?', 'Welches Gravelbike passt zu mir?'], ['Diverge oder Crux?', 'Diverge oder Crux: Was ist der Unterschied?'], ['Rahmengröße', 'Welche Rahmengröße brauche ich?'], ['Leasing', 'Bietet ihr Leasing oder Finanzierung an?']] },
    mtb: { k: 'KI-Berater', h1: 'MTB-Auswahl', h2: 'mit dem KI-Berater.', p: 'Nenn uns dein Gelände und dein Budget. Der KI-Berater sucht passende Modelle aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Erstes Hardtail für Waldwege bis 1.500 €“',
      chips: [['Welches MTB?', 'Welches MTB passt zu meinen Trails?'], ['Hardtail oder Fully?', 'Hardtail oder Fully: Was passt zu mir?'], ['Fahrwerk-Service', 'Ich brauche einen Fahrwerk-Service für Gabel und Dämpfer.'], ['Rahmengröße', 'Welche Rahmengröße brauche ich?']] },
    ebike: { k: 'KI-Berater', h1: 'E-Bike für Pendeln', h2: 'oder Trail.', p: 'Schreib uns deine Strecke und die Höhenmeter. Der KI-Berater sucht passende E-Bikes aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „E-Bike zum Pendeln, 15 km mit Steigung“',
      chips: [['Welches E-Bike?', 'Welches E-Bike passt zu mir?'], ['Probefahrt', 'Kann ich ein E-Bike probefahren?'], ['E-Bike-Service', 'Macht ihr E-Bike-Service für Motor, Akku und Software?'], ['Leasing', 'Bietet ihr Leasing oder Finanzierung an?']] },
    familie: { k: 'KI-Berater', h1: 'Das richtige Rad', h2: 'fürs Kind.', p: 'Schreib uns, wie groß dein Kind ist und wie es fährt. Der KI-Berater sucht passende Modelle aus dem Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Erstes MTB für meine 9-jährige Tochter“',
      chips: [['Rad fürs Kind?', 'Welches Rad passt für mein Kind?'], ['Radgröße', 'Welche Radgröße braucht mein Kind?'], ['Alltags-E-Bike', 'Welches E-Bike passt für den Familienalltag?'], ['Leasing', 'Bietet ihr Leasing oder Finanzierung an?']] },
    bike: { k: 'KI-Berater', h1: 'Passt das Rad', h2: 'zu dir?', p: 'Frag nach Rahmengröße, Ausstattung oder Probefahrt. Der KI-Berater kennt den Katalog. Wenn es persönlich wird, übernimmt Achim.', ph: 'Z. B. „Welche Rahmengröße bei 1,82 m?“',
      chips: [['Rahmengröße', 'Welche Rahmengröße brauche ich?'], ['Probefahrt', 'Kann ich das Rad bei euch probefahren?'], ['Leasing', 'Bietet ihr Leasing oder Finanzierung an?'], ['Retül-Fitting', 'Ich möchte einen Termin für ein Retül-Bikefitting.']] },
    shop: { k: 'Größe, Geschenk, Gutschein', h1: 'Unsicher bei', h2: 'der Größe?', p: 'Der KI-Berater hilft bei Größe und Geschenkideen. Oder du kommst vorbei und probierst an.', ph: 'Z. B. „Welche Hoodie-Größe bei 182 cm?“',
      chips: [['Welches Bike?', 'Welches Bike passt zu mir?'], ['Kleidergröße', 'Welche Größe brauche ich bei Trikot oder Hoodie?'], ['Geschenkidee', 'Ich suche ein Geschenk für jemanden, der Rad fährt.'], ['Öffnungszeiten', 'Habt ihr heute geöffnet? Wie sind eure Öffnungszeiten?']] },
    kollektion: { k: 'Größe, Geschenk, Gutschein', h1: 'Unsicher bei', h2: 'der Größe?', p: 'Der KI-Berater hilft bei Größe und Geschenkideen. Oder du kommst vorbei und probierst an.', ph: 'Z. B. „Welche Hoodie-Größe bei 182 cm?“',
      chips: [['Hoodie-Größe', 'Welche Hoodie-Größe brauche ich?'], ['Geschenkidee', 'Ich suche ein Geschenk für jemanden, der Rad fährt.'], ['Gutschein', 'Ich möchte einen Racepoint-Gutschein kaufen.'], ['Racepoint-Trikot', 'Gibt es das Racepoint-Trikot gerade im Laden?']] },
    zubehoer: { k: 'Größe, Passform, Geschenk', h1: 'Größe und', h2: 'Passform.', p: 'Der KI-Berater gibt dir eine erste Einschätzung zu Schuhgröße, Helm oder Geschenk. Anprobiert wird im Laden.', ph: 'Z. B. „Welcher Helm passt zum Rennrad?“',
      chips: [['Schuhgröße', 'Welche Schuhgröße brauche ich bei Specialized-Schuhen?'], ['Helm', 'Welcher Helm passt zu mir?'], ['Racepoint-Trikot', 'Gibt es das Racepoint-Trikot gerade im Laden?'], ['Geschenkidee', 'Ich suche ein Geschenk für jemanden, der Rad fährt.']] },
    bikefitting: { k: 'Termin · Retül-Bikefitting', h1: 'Fitting-Termin', h2: 'anfragen.', p: 'Sag uns, welches Rad du fährst und was dich stört. Der KI-Berater bereitet deine Anfrage vor, Achim bestätigt den Termin persönlich.', ph: 'Z. B. „Knieschmerzen nach langen Runden: hilft ein Fitting?“',
      chips: [['Fitting-Termin', 'Ich möchte einen Termin für ein Retül-Bikefitting.'], ['Dauer & Kosten', 'Was kostet ein Retül-Bikefitting und wie lange dauert es?'], ['Beschwerden', 'Ich habe Knieschmerzen beim Radfahren. Kann ein Bikefitting helfen?'], ['Rahmengröße', 'Welche Rahmengröße brauche ich?']] },
    touren: { k: 'KI-Berater', h1: 'Welches Rad', h2: 'für die Runde?', p: 'Sag, welche Tour dich reizt. Der KI-Berater schlägt ein passendes Bike vor und bereitet auf Wunsch einen Check vor der Tour vor.', ph: 'Z. B. „Welches Bike für eine Runde im Venn?“',
      chips: [['Welches Bike?', 'Welches Bike passt zu meinen Touren?'], ['Check vor der Tour', 'Ich möchte mein Rad vor einer Tour durchsehen lassen.'], ['Probefahrt', 'Kann ich ein Bike bei euch probefahren?'], ['Öffnungszeiten', 'Habt ihr heute geöffnet? Wie sind eure Öffnungszeiten?']] },
    filme: { k: 'Eigener Dreambuild', h1: 'Dein Bike', h2: 'nach Wunsch.', p: 'Was du dir wünschst und was möglich ist, besprechen wir persönlich. Dass es schon das dritte Rad wird, bleibt unter uns.', ph: 'Z. B. „Aero-Rennrad als Dreambuild, was ist möglich?“',
      chips: [['Dreambuild', 'Ich möchte eine Beratung für einen individuellen Bike-Build.'], ['Rennrad', 'Welches Rennrad passt zu mir?'], ['Gravel', 'Welches Gravelbike passt zu mir?'], ['E-Bike', 'Welches E-Bike passt zu mir?']] },
    'ueber-uns': { k: 'Kontakt', h1: 'Komm vorbei', h2: 'in Schönberg.', p: 'Komm mit deinem Bike oder mit einer Frage. Oder frag vorab den KI-Berater.', ph: 'Z. B. „Wann seid ihr am Samstag da?“',
      chips: [['Öffnungszeiten', 'Habt ihr heute geöffnet? Wie sind eure Öffnungszeiten?'], ['Kontakt & Anfahrt', 'Wie erreiche ich euch? Adresse, Telefon und E-Mail bitte.'], ['Termin', 'Ich möchte einen Termin vereinbaren.']] },
  };
  const ki = KIB[page];
  const escA = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  const STAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3l2.2 5.6L20 9.5l-4.5 3.8L17 19l-5-3.2L7 19l1.5-5.7L4 9.5l5.8-.9z"/></svg>';
  const kiEnde = ki ? '<aside class="sec ai cta kib-end" id="berater" aria-labelledby="aiTitle"><div class="ai-glow" aria-hidden="true"></div><div class="wrap ai-in">' +
    '<div class="ai-orb" aria-hidden="true"><i></i><b></b>' +
    '<svg class="ai-spark" viewBox="0 0 24 24"><path d="M12 2.5l1.9 5.6a3 3 0 001.9 1.9l5.7 2-5.7 2a3 3 0 00-1.9 1.9L12 21.5l-1.9-5.6a3 3 0 00-1.9-1.9L2.5 12l5.7-2a3 3 0 001.9-1.9z" fill="url(#aiSparkG)"/><defs><linearGradient id="aiSparkG" x1="3" y1="3" x2="21" y2="21"><stop stop-color="#fff"/><stop offset=".55" stop-color="#ffb08a"/><stop offset="1" stop-color="#E83637"/></linearGradient></defs></svg>' +
    '<span class="ai-ping"></span></div>' +
    '<p class="kicker rv">' + ki.k + '</p><h2 class="h2 rv" id="aiTitle">' + ki.h1 + '<br><em>' + ki.h2 + '</em></h2><p class="lead rv">' + ki.p + '</p>' +
    '<form class="ask rv" data-ask-form><label class="sr-only" for="askInput">Frage an den KI-Berater</label><input id="askInput" type="text" autocomplete="off" placeholder="' + escA(ki.ph) + '">' +
    '<button type="submit" aria-label="Frage senden"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></form>' +
    '<div class="chips rv" role="list">' + ki.chips.map(c => '<button type="button" role="listitem" data-ask="' + escA(c[1]) + '">' + STAR + escA(c[0]) + '</button>').join('') + '</div>' +
    '<p class="fine rv">' + TERMIN_HINWEIS + '</p></div></aside>' : '';
  if (main) main.insertAdjacentHTML('afterend', kiEnde + stoerer + footer);
  const kibEnd = document.querySelector('.kib-end');
  if (kibEnd && 'IntersectionObserver' in window) new IntersectionObserver(es => es.forEach(e => document.documentElement.classList.toggle('v18-kib-end', e.isIntersecting)), { threshold: 0.25 }).observe(kibEnd);
  if (window.RP && RP.updateStatusPills) RP.updateStatusPills();

  /* ---------------- Hell/Dunkel/Mix (Startwert setzt der Seitenkopf, Mix ist Standard) ---------------- */
  const curTheme = () => { const t = document.documentElement.getAttribute('data-theme'); return t === 'light' || t === 'dark' ? t : 'mix'; };
  const syncTheme = () => {
    const t = curTheme(), i = THEMES.findIndex(x => x.id === t), next = THEMES[(i + 1) % THEMES.length];
    $$('[data-set-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.setTheme === t)));
    $$('[data-theme-next]').forEach(b => b.setAttribute('aria-label', 'Darstellung: ' + THEMES[i].name + '. Wechseln zu ' + next.name));
  };
  const setTheme = t => {
    const root = document.documentElement;
    if (!RM) { root.classList.add('theme-anim'); setTimeout(() => root.classList.remove('theme-anim'), 450); }
    root.setAttribute('data-theme', t);
    try { localStorage.setItem('rp18-theme', t); } catch (e) {}
    syncTheme();
  };
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-set-theme],[data-theme-next]');
    if (!b) return;
    if (b.dataset.setTheme) return setTheme(b.dataset.setTheme);
    const i = THEMES.findIndex(x => x.id === curTheme());
    setTheme(THEMES[(i + 1) % THEMES.length].id);
  });
  syncTheme();

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
  // Bilder in Dropdown und Mobil-Menü erst laden, wenn das Menü gebraucht wird (sonst ~850 KB beim Start)
  const loadImgs = box => $$('img[data-src]', box).forEach(i => { i.src = i.dataset.src; i.removeAttribute('data-src'); });
  burger.addEventListener('pointerenter', () => loadImgs(mmenu), { once: true });
  burger.addEventListener('click', () => { loadImgs(mmenu); setMenu(true); });
  $('.mclose').addEventListener('click', () => { setMenu(false); burger.focus(); });
  mmenu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && mmenu.classList.contains('on')) setMenu(false); });

  // Bikes-Dropdown: per Tastatur/Touch oeffnen
  const dd = $('.hdr .dd');
  ['pointerenter', 'focusin'].forEach(ev => dd.addEventListener(ev, () => loadImgs(dd), { once: true }));
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
  // Hintergrund auch ohne Scroll-Ereignis setzen (Anker, Neuladen mitten auf der Seite, Sprung per Skript)
  const hdrSolid = () => hdr.classList.toggle('solid', (window.scrollY || document.documentElement.scrollTop) > 60);
  hdrSolid();
  window.addEventListener('scroll', hdrSolid, { passive: true });
  window.addEventListener('load', hdrSolid);
  if (window.ScrollTrigger) {
    ScrollTrigger.create({
      start: 0, end: 'max',
      onRefresh: hdrSolid,
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
    // Früh starten (kurz bevor das Element den unteren Rand erreicht) und kurz halten, damit nichts hinterherhinkt.
    // Was beim Laden schon sichtbar ist, löst sofort aus.
    ScrollTrigger.batch(els, { start: 'top bottom-=40', once: true, interval: 0.05, onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: 0.65, stagger: 0.05, ease: 'power2.out', overwrite: true }) });
  }
  // Schrift abwarten (höchstens 800 ms), dann fn einmal ausführen
  function whenFonts(fn) {
    let done = false;
    const go = () => { if (!done) { done = true; fn(); } };
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(go);
    setTimeout(go, 800);
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
    $$('[data-hours-week]').forEach(ul => {
      ul.innerHTML = RP.hoursRows('de').map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"' + (r.today ? ' aria-current="date"' : '') + '><b>' + r.short + '</b><span>' + (r.open ? r.text.replace(' Uhr', '') : 'zu') + '</span></li>').join('');
    });
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
        whenFonts(() => {
          gsap.from($$('.phero-txt > *', h), { autoAlpha: 0, y: 24, duration: 0.75, ease: 'power3.out', stagger: 0.06 });
          document.documentElement.classList.remove('rp-boot');
        });
        const fig = $('.phero-fig', h);
        if (fig && h.classList.contains('cine')) {
          // Kino-Einstieg: Bühne zoomt sanft auf, beim Scrollen bleibt das Bild etwas zurück
          gsap.fromTo(fig, { scale: 1.12 }, { scale: 1, duration: 2.4, ease: 'expo.out' });
          gsap.to(fig, { yPercent: 16, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
          const side = $('.phero-side', h);
          if (side) gsap.from(side, { y: 50, autoAlpha: 0, duration: 1.1, ease: 'power3.out', delay: 0.45 });
        } else if (fig) {
          gsap.fromTo(fig, { clipPath: 'inset(10% 10% 10% 10% round 22px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.4, ease: 'expo.out', delay: 0.15 });
          gsap.fromTo($('img', fig), { scale: 1.25 }, { scale: 1.06, duration: 1.8, ease: 'expo.out', delay: 0.15 });
          gsap.to($('img', fig), { yPercent: 6, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
        }
        const word = $('.phero-word', h);
        if (word) gsap.fromTo(word, { xPercent: 0 }, { xPercent: -18, ease: 'none', scrollTrigger: { trigger: h, start: 'top top', end: 'bottom top', scrub: true } });
      }
    }
  }
  if (!isHome && !$('.phero')) document.documentElement.classList.remove('rp-boot');

  /* ---------------- Kino-Einstieg: Filme und Galerie ----------------
     Hintergrund: Desktop den Querformat-Film (-amb), Handy das Hochformat.
     Bei reduzierter Bewegung bleiben die Standbilder stehen. */
  const cine = $('.phero.cine');
  if (cine && !RM) {
    const small = matchMedia('(max-width:820px)').matches;
    const vids = [];
    const bg = $('.cine-bg', cine);
    if (bg) {
      bg.src = (small && bg.dataset.srcM) || bg.dataset.src;
      bg.addEventListener('playing', () => bg.classList.add('on'), { once: true });
      vids.push(bg);
    }
    const reel = $('.phero-reel video', cine);
    if (reel && !small) { reel.src = reel.dataset.src; vids.push(reel); }
    vids.forEach(v => { v.muted = true; v.play().catch(() => {}); });
    // ausserhalb des Bildschirms anhalten (Akku, CPU)
    if (vids.length && 'IntersectionObserver' in window) {
      new IntersectionObserver(es => es.forEach(e => vids.forEach(v => { if (e.isIntersecting) v.play().catch(() => {}); else v.pause(); }))).observe(cine);
    }
    const slides = $$('.cine-slide', cine);
    if (slides.length > 1) {
      let i = 0;
      setInterval(() => {
        if (document.hidden) return;
        slides[i].classList.remove('on');
        i = (i + 1) % slides.length;
        slides[i].classList.add('on');
      }, 6000);
    }
  }

  /* ---------------- Reel-Kacheln: laufen nur, solange sie zu sehen sind ----------------
     <video data-inview data-src="…" poster="…">; bei reduzierter Bewegung bleibt das Standbild. */
  const tiles = $$('video[data-inview]');
  if (tiles.length && !RM && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      const v = e.target;
      if (e.isIntersecting) {
        if (!v.src) v.src = v.dataset.src;
        v.muted = true; v.play().catch(() => {});
      } else v.pause();
    }), { threshold: 0.35 });
    tiles.forEach(v => io.observe(v));
  }
  hours();
  setInterval(hours, 60 * 1000);
  window.addEventListener('load', () => { if (window.ScrollTrigger) ScrollTrigger.refresh(); });

  window.RP18Site = { lenis, CATS, PAGES, HOME, page, reveal, counters, fmt, scrollTo: scrollToEl, setMenu, RM, whenFonts };
})();
