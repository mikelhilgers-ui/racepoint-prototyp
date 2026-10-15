/* =====================================================================
   RACEPOINT · 18 · MEIN TRAUMBIKE — Logik der Unterseiten (THROWAWAY)
   - Kategorie-Seiten: echte Bikes aus RP18Data (Codex-Katalog) mit
     Filter + Sortierung, Filme der Kategorie
   - Bike-Detail (v18-bike.html?id=…): Galerie, Daten, Herstellerpreis,
     Quelle, Anfrage, aehnliche Bikes + Wunsch-Build (Farbe, Groessen-Richtwert, Extras)
   - Filme-Seite: alle Filme mit Filter, Wiedergabe ueber RP.openVideo
   - Formulare [data-mailform] -> E-Mail-Entwurf (mailto), nichts wird gesendet
   - kleine Scroll-Effekte (Ablauf-Linie, Zeitstrahl)
   Benoetigt window.RP18Data (data.js), window.RP18Site (site.js), RP
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const D = window.RP18Data, SITE = window.RP18Site;
  const RM = SITE.RM;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const eur = n => n.toLocaleString('de-BE') + ' €';
  const date = s => s.split('-').reverse().join('.');
  const MAIL = 'info@racepoint.be';
  const mailto = (subject, body) => 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const playSvg = '<span class="film-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>';
  const lineBike = '<svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="26" cy="46" r="20"/><circle cx="94" cy="46" r="20"/><path d="M26 46l18-26h34l16 26M44 20l18 26h-36M62 46l16-26M40 14h12M74 12l4 8"/></svg>';

  /* ---------------- Wunsch-Build-Daten ----------------
     Herstellerfarben: geprüft am 2026-10-15 über die Specialized-Seite des jeweiligen Bikes (URL = source in data.js).
     Es stehen nur die Varianten des Bikes selbst darin, keine Zubehörfarben der Seite.
     `main` = Index der Farbe, die das Katalogfoto zeigt (Bildname, z. B. DUNEWHT-DPLAKE = Dune White / Deep Lake).
       allez-cues                 geprüft am 2026-10-15 über https://www.specialized.com/be/nl/allez-shimano-cues/p/4221808
       roubaix-sl8-tiagra         geprüft am 2026-10-15 über https://www.specialized.com/be/nl/roubaix-sl8-shimano-tiagra/p/4263270
       tarmac-sl9-expert-di2      geprüft am 2026-10-15 über https://www.specialized.com/be/nl/tarmac-sl9-expert-shimano-ultegra-di2/p/4293531
       diverge-4-sport-alloy      geprüft am 2026-10-15 über https://www.specialized.com/be/nl/diverge-4-sport-alloy-shimano-cues/p/4223511
       crux-dsw-comp              geprüft am 2026-10-15 über https://www.specialized.com/be/nl/crux-dsw-comp-sram-apex-xplr/p/4221804
       rockhopper-comp            geprüft am 2026-10-15 über https://www.specialized.com/be/nl/rockhopper-comp/p/4221745
       stumpjumper-15-evo-expert  geprüft am 2026-10-15 über https://www.specialized.com/be/nl/stumpjumper-15-evo-expert-fact-11m-carbon-fox-performance-elite-w-genie-xt-di2/p/4291645
       levo-4-evo-comp            geprüft am 2026-10-15 über https://www.specialized.com/be/nl/turbo-levo-4-evo-comp/p/4294788
       vado-3-evo-4               geprüft am 2026-10-15 über https://www.specialized.com/be/nl/turbo-vado-3-evo-40/p/4279841
       riprock-24                 geprüft am 2026-10-15 über https://www.specialized.com/be/nl/riprock-24/p/4222032 */
  const COLORS = {
    'allez-cues': { main: 2, list: ['Obsidian / Dove Grey', 'California Sunshine / Orange Zest', 'Dune White / Deep Lake'] },
    'roubaix-sl8-tiagra': { main: 0, list: ['Satin Deep Marine Metallic / Shadow Silver'] },
    'tarmac-sl9-expert-di2': { main: 0, list: ['Gloss Pacific Blue Metallic / White', 'Gloss Black / Silver Dust'] },
    'diverge-4-sport-alloy': { main: 0, list: ['Satin Burnt Gold Metallic / Shadow Silver', 'Gloss Dark Navy / Dolomite Metallic'] },
    'crux-dsw-comp': { main: 1, list: ['Emerald Metallic / Fjord Metallic', 'Shadow Silver / California Sunshine'] },
    'rockhopper-comp': { main: 0, list: ['Gloss Pistachio / White Mountains', 'Satin Mauve Metallic / Fjord Metallic', 'Satin Nebula Metallic / Dolomite Metallic'] },
    'stumpjumper-15-evo-expert': { main: 1, list: ['Gloss Nebula Metallic / Dolomite Metallic', 'Gloss Pistachio / Dark Moss Green'] },
    'levo-4-evo-comp': { main: 0, list: ['Gloss Warm Smoke / Pistachio', 'Satin Agave Grey / Desert Metallic'] },
    'vado-3-evo-4': { main: 0, list: ['Gloss Pacific Blue / Dune White', 'Gloss Nebula Metallic / Silver Dust', 'Gloss Sandstone Metallic / Warm Smoke Metallic'] },
    'riprock-24': { main: 0, list: ['Gloss Majesty Blue Metallic / Sky Blue', 'Gloss Oasis / Emerald Metallic', 'Gloss Dolomite Metallic / Quartz Metallic', 'Gloss Smoke / Fjord Metallic'] },
  };
  const SIZES = [[160, 'XS', 49], [168, 'S', 52], [176, 'M', 54], [184, 'L', 56], [192, 'XL', 58], [206, 'XXL', 61]];

  /* ---------------- Katalog ---------------- */
  const CAT_NAME = { rennrad: 'Rennrad', gravel: 'Gravel', mtb: 'MTB', ebike: 'E-Bike', familie: 'Kinder & Familie', kind: 'Kinder & Familie' };
  const CAT_PAGE = { rennrad: 'v18-rennrad.html', gravel: 'v18-gravel.html', mtb: 'v18-mtb.html', ebike: 'v18-ebike.html', kind: 'v18-familie.html', familie: 'v18-familie.html' };
  const STYLE = { alltag: 'Alltag', sportlich: 'Sportlich', racer: 'Racer', trail: 'Trail' };
  // Familie & Alltag zeigt wie im Original das Kinder-MTB und das Alltags-E-Bike
  const inCat = (b, c) => c === 'alle' ? true : c === 'familie' ? (b.cat === 'kind' || b.id === 'vado-3-evo-4') : b.cat === c;
  const byId = id => D.bikes.find(b => b.id === id);
  const film = id => D.films.find(f => f.id === id);
  // Titelbild: eigenes "thumb" (neue Filme in assets/v18/media/films) oder Codex-Ordner
  const poster = id => (film(id) || {}).thumb || 'entwuerfe/codex-2026-10/prototype/assets/films/' + id + '.jpg';
  const FILM_CAT = { road: 'Rennrad & Triathlon', gravel: 'Gravel', mtb: 'MTB & Service', ebike: 'E-Bike', familie: 'Familie' };

  // Bilder des Herstellers: wenn sie nicht laden, bleibt eine saubere Platzhalter-Kachel
  function guardImgs(root) {
    $$('img[data-guard]', root).forEach(img => {
      const box = img.parentElement;
      const fail = () => box.classList.add('noimg');
      if (img.complete && img.naturalWidth === 0 && img.getAttribute('src')) fail();
      img.addEventListener('error', fail, { once: true });
    });
  }
  const ph = '<span class="ph">' + lineBike + '<span>Herstellerbild</span></span>';

  function card(b, cls) {
    const cat = CAT_NAME[b.cat] || '';
    return '<article class="bcard ' + (cls || '') + '" data-id="' + b.id + '">' +
      '<a class="bimg" href="v18-bike.html?id=' + encodeURIComponent(b.id) + '" aria-label="' + esc(b.name) + ' ansehen">' +
        '<span class="tag">' + (b.electric ? 'Mit Motor · ' : '') + cat + '</span>' +
        '<img data-guard src="' + esc(b.image) + '" alt="Specialized ' + esc(b.name) + '" loading="lazy" referrerpolicy="no-referrer">' + ph +
      '</a>' +
      '<div class="bbody">' +
        '<p class="kicker">Specialized · ' + b.styles.map(s => STYLE[s] || s).join(' · ') + '</p>' +
        '<h3><a href="v18-bike.html?id=' + encodeURIComponent(b.id) + '">' + esc(b.name) + '</a></h3>' +
        '<ul class="bspecs">' + b.specs.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' +
        '<div class="bprice"><b>' + eur(b.price) + '</b><small>Herstellerpreis · Belgien</small></div>' +
        '<div class="bacts"><a class="btn" href="v18-bike.html?id=' + encodeURIComponent(b.id) + '">Ansehen ' + arrow + '</a>' +
        '<a class="btn ghost" href="v18-shop.html?p=bike-' + encodeURIComponent(b.id) + '">Reservieren</a>' +
        '<a class="btn ghost bact-ask" data-ask="Ich interessiere mich für das Specialized ' + esc(b.name) + ' (' + eur(b.price) + '). Passt es zu mir und welche Größe brauche ich?">Beraten lassen</a></div>' +
      '</div></article>';
  }
  function filmCard(id, cls) {
    const f = film(id); if (!f) return '';
    return '<button class="film ' + (cls || '') + (f.format === 'portrait' ? ' pt9' : '') + ' rv" type="button" data-video="' + f.id + '" data-fcat="' + f.category + '">' +
      '<img src="' + poster(f.id) + '" alt="" loading="lazy">' + playSvg +
      '<span class="film-m"><span class="kicker">' + (f.format === 'portrait' ? 'Short · ' : 'Film · ') + (FILM_CAT[f.category] || '') + '</span><b>' + esc(f.title) + '</b><p>' + esc(f.subtitle) + '</p></span></button>';
  }

  /* ---------------- Kategorie-Seite ---------------- */
  const catEl = $('[data-cat]');
  if (catEl) {
    const c = catEl.dataset.cat;
    const grid = $('#bikeGrid'), chips = $('#fchips'), sort = $('#sort');
    const all = D.bikes.filter(b => inCat(b, c));
    const styles = [...new Set(all.flatMap(b => b.styles))];
    // Bikes-Übersicht (data-cat="alle"): nach Kategorie filtern statt nach Fahrstil
    const byCat = c === 'alle', cats = [...new Set(all.map(b => b.cat))];
    let f = 'alle';
    chips.innerHTML = '<button type="button" aria-pressed="true" data-f="alle">Alle<span>' + all.length + '</span></button>' +
      (byCat ? cats.map(k => '<button type="button" aria-pressed="false" data-f="' + k + '">' + CAT_NAME[k] + '<span>' + all.filter(b => b.cat === k).length + '</span></button>').join('') : styles.map(s => '<button type="button" aria-pressed="false" data-f="' + s + '">' + (STYLE[s] || s) + '<span>' + all.filter(b => b.styles.includes(s)).length + '</span></button>').join('')) +
      (!byCat && all.some(b => b.electric) && all.some(b => !b.electric) ? '<button type="button" aria-pressed="false" data-f="motor">Mit Motor<span>' + all.filter(b => b.electric).length + '</span></button>' : '');
    function render() {
      let list = all.filter(b => f === 'alle' || (byCat ? b.cat === f : f === 'motor' ? b.electric : b.styles.includes(f)));
      const s = sort.value;
      list = list.slice().sort((a, b) => s === 'desc' ? b.price - a.price : s === 'name' ? a.name.localeCompare(b.name, 'de') : a.price - b.price);
      grid.innerHTML = list.length ? list.map(b => card(b)).join('') :
        '<div class="empty"><p>Für diesen Filter ist hier gerade kein Modell gelistet. Im Laden steht oft mehr.</p><a class="btn" data-ask="Ich suche ein ' + CAT_NAME[c] + ' (' + (STYLE[f] || f) + '). Was könnt ihr empfehlen?">Achim fragen</a></div>';
      guardImgs(grid);
      // fromTo mit festem Endwert: .bcard hat eine CSS-Transition auf transform (Hover), sonst liest gsap.from
      // einen Zwischenstand als Ziel und eine Kachel bleibt versetzt stehen
      if (!RM && window.gsap) gsap.fromTo($$('.bcard', grid), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity,visibility' });
      const cnt = $('#bikeCount'); if (cnt) cnt.textContent = list.length + (list.length === 1 ? ' Modell' : ' Modelle');
    }
    chips.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      f = b.dataset.f;
      $$('button', chips).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      render();
    });
    sort.addEventListener('change', render);
    render();
    const fr = $('#catFilms');
    if (fr) { fr.innerHTML = (D.pageFilms[byCat ? 'bike' : c] || []).map(id => filmCard(id)).join(''); SITE.reveal(fr); }
    const from = $('#catFrom'); if (from) from.textContent = 'ab ' + eur(Math.min(...all.map(b => b.price)));
  }

  /* ---------------- Filme-Seite ---------------- */
  const fg = $('#filmGrid');
  if (fg) {
    fg.innerHTML = D.films.map(f => filmCard(f.id)).join('');
    SITE.reveal(fg);
    const fc = $('#filmChips');
    const cats = ['road', 'gravel', 'mtb', 'ebike', 'familie'];
    fc.innerHTML = '<button type="button" aria-pressed="true" data-f="alle">Alle<span>' + D.films.length + '</span></button>' +
      cats.map(k => '<button type="button" aria-pressed="false" data-f="' + k + '">' + FILM_CAT[k] + '<span>' + D.films.filter(f => f.category === k).length + '</span></button>').join('');
    fc.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      $$('button', fc).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      $$('.film', fg).forEach(x => { x.hidden = !(b.dataset.f === 'alle' || x.dataset.fcat === b.dataset.f); x.style.opacity = 1; x.style.transform = 'none'; });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  }

  /* ---------------- Bike-Detail ---------------- */
  const bd = $('#bd');
  if (bd) {
    const id = new URL(location.href).searchParams.get('id');
    const b = id && byId(id);
    if (!b) {
      document.title = 'Racepoint · Bikes';
      $('#bdTop').innerHTML = '<div class="bd-miss"><p class="kicker">Bike-Detail</p><h1 class="h2" style="margin-top:14px">Bike nicht<br><em>gefunden.</em></h1><p class="lead" style="margin-top:18px">' + (id ? 'Dieses Modell kennen wir hier nicht, vielleicht steht es nur im Laden. ' : '') + 'Hier sind alle Modelle aus unserer Auswahl.</p></div>';
      $('#bdSim h2').innerHTML = 'Alle <em>Bikes</em>';
      $('#simGrid').innerHTML = D.bikes.map(x => card(x)).join('');
      $('#cfgSec').remove();
      guardImgs(bd.parentNode);
    } else {
      renderBike(b);
    }
  }

  function renderBike(b) {
    const cat = b.cat === 'kind' ? 'familie' : b.cat;
    document.title = 'Racepoint · ' + b.name;
    const catHref = CAT_PAGE[b.cat];
    const films = (D.pageFilms[cat] || D.pageFilms.bike);
    const fId = films[0];
    const catImg = SITE.CATS.find(x => x.id === cat).img;
    $('#bdCrumbs').innerHTML = '<li><a href="' + SITE.HOME + '">Racepoint</a></li><li><a href="' + catHref + '">' + CAT_NAME[b.cat] + '</a></li><li>' + esc(b.name.split(' · ')[0]) + '</li>';
    const shots = [
      { k: 'prod', img: b.image, alt: 'Specialized ' + b.name + ' (Herstellerbild)' },
      { k: 'cat', img: catImg, alt: CAT_NAME[b.cat] + ' bei Racepoint' },
      { k: 'shop', img: 'assets/shop-interior.jpg', alt: 'Der Racepoint-Laden in Schönberg' },
      { k: 'vid', img: poster(fId), alt: 'Film: ' + (film(fId) || {}).title, video: fId },
    ];
    $('#bdGal').innerHTML =
      '<div class="bd-stage" id="bdStage"><img data-guard src="' + esc(b.image) + '" alt="' + esc(shots[0].alt) + '" referrerpolicy="no-referrer">' + ph.replace('Herstellerbild', 'Herstellerbild nicht erreichbar') + '</div>' +
      '<div class="bd-thumbs" role="group" aria-label="Bilder">' + shots.map((s, i) =>
        '<button type="button" class="t-' + s.k + '" aria-pressed="' + (i === 0) + '" data-i="' + i + '"' + (s.video ? ' data-video="' + s.video + '"' : '') + ' aria-label="' + esc(s.alt) + '"><img' + (s.k === 'prod' ? ' data-guard' : '') + ' src="' + esc(s.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>').join('') + '</div>';
    guardImgs($('#bdGal'));
    $('#bdGal .bd-thumbs').addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t || t.dataset.video) return;
      const s = shots[+t.dataset.i], st = $('#bdStage');
      $$('#bdGal .bd-thumbs button').forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      st.classList.remove('noimg');
      st.classList.toggle('photo', s.k !== 'prod');
      const img = $('img', st); img.src = s.img; img.alt = s.alt;
      if (s.k === 'prod') guardImgs(st);
    });

    const ask = 'Ich interessiere mich für das Specialized ' + b.name + ' (' + eur(b.price) + ', Herstellerpreis). Ist es verfügbar und welche Größe passt zu mir?';
    const body = 'Hallo Racepoint-Team,\n\nich interessiere mich für das Specialized ' + b.name + ' (' + eur(b.price) + ', Herstellerpreis Belgien).\n\nKörpergröße: \nWunschtermin für Beratung/Probefahrt: \n\nViele Grüße\n';
    $('#bdInfo').innerHTML =
      '<p class="kicker">Specialized · ' + CAT_NAME[b.cat] + (b.electric ? ' · Mit Motor' : '') + '</p>' +
      '<h1>' + esc(b.name.split(' · ')[0]) + (b.name.includes(' · ') ? '<small>' + esc(b.name.split(' · ').slice(1).join(' · ')) + '</small>' : '') + '</h1>' +
      '<div class="bd-tags">' + b.styles.map(s => '<span class="pill">' + (STYLE[s] || s) + '</span>').join('') + '<span class="pill pill-status" data-open-status></span></div>' +
      '<div class="bd-price"><b>' + eur(b.price) + '</b><p><strong>Herstellerpreis Belgien, kein Racepoint-Angebot.</strong> Geprüft am ' + date(b.checkedAt) + '. Ausführung, Preis, Größe und lokaler Bestand werden persönlich bestätigt.</p></div>' +
      '<ul class="bd-specs">' + b.specs.map((s, i) => '<li><span>' + ['Rahmen', 'Ausstattung', 'Details'][i] + '</span>' + esc(s) + '</li>').join('') +
        '<li><span>Verfügbar</span>Auf Anfrage, wir prüfen den Bestand</li></ul>' +
      '<div class="bd-acts"><a class="btn" href="v18-shop.html?p=bike-' + encodeURIComponent(b.id) + '">Reservieren ' + arrow + '</a><a class="btn ghost" href="' + mailto('Anfrage: Specialized ' + b.name, body) + '">Anfragen</a><a class="btn ghost" data-ask="' + esc(ask) + '">KI-Berater fragen</a></div>' +
      '<p class="bd-res">Reservieren kostet nichts. Wir legen das Rad zurück, du fährst Probe und bezahlst im Laden.</p>' +
      '<a class="bd-src" href="' + esc(b.source) + '" target="_blank" rel="noopener">Datenblatt beim Hersteller ' + arrow + '</a>';
    if (window.RP && RP.updateStatusPills) RP.updateStatusPills();

    // aehnliche Bikes: gleiche Kategorie zuerst, dann naechster Preis
    const sim = D.bikes.filter(x => x.id !== b.id).sort((x, y) => (inCat(y, cat) - inCat(x, cat)) || Math.abs(x.price - b.price) - Math.abs(y.price - b.price)).slice(0, 3);
    $('#simGrid').innerHTML = sim.map(x => card(x)).join('');
    guardImgs($('#simGrid'));
    config(b, cat);
  }

  function config(b, cat) {
    const kids = b.cat === 'kind';
    const road = b.cat === 'rennrad' || b.cat === 'gravel';
    const col = COLORS[b.id] || { main: 0, list: [] };
    const cfg = { color: col.list.length ? col.main : -1, h: 175 };
    const stage = $('#wbStage');
    stage.innerHTML = '<img data-guard src="' + esc(b.image) + '" alt="Specialized ' + esc(b.name) + ' (Herstellerbild)" referrerpolicy="no-referrer">' + ph.replace('Herstellerbild', 'Herstellerbild nicht erreichbar');
    guardImgs(stage);
    $('#wbCap').textContent = col.list.length ? 'Foto: ' + col.list[col.main] + ' · Bild des Herstellers' : 'Bild des Herstellers';

    const chips = $('#wbColors');
    if (col.list.length) {
      chips.innerHTML = col.list.map((c, i) => '<button type="button" aria-pressed="' + (i === cfg.color) + '" data-i="' + i + '">' + esc(c) + '</button>').join('');
    } else {
      $('#wbColH').parentNode.remove();
    }
    if (kids) {
      $('#wbSizeH').textContent = 'Größe';
      $('#wbSizeBox .wb-size').remove();
      $('#wbSizeBox .wb-hint').textContent = 'Bei Kinderrädern entscheidet die Schrittlänge. Dein Kind kann im Laden probesitzen.';
    }
    const h = $('#wbHeight'), out = $('#wbHeightOut');
    const sizeOf = v => SIZES.find(s => v < s[0]) || SIZES[SIZES.length - 1];
    const extras = () => $$('input[name="extra"]:checked').map(x => x.value);
    const joinDe = a => a.length > 1 ? a.slice(0, -1).join(', ') + ' und ' + a[a.length - 1] : a.join('');

    function sync() {
      const s = sizeOf(cfg.h), cname = cfg.color >= 0 ? col.list[cfg.color] : '';
      const ex = extras();
      const sizeShort = kids ? 'Probesitzen im Laden' : (road ? s[2] + ' / ' : '') + s[1];
      if (!kids) {
        out.textContent = cfg.h + ' cm';
        $('#wbSize').innerHTML = 'Richtwert: <b>' + sizeShort + '</b>';
      }
      $('#wbSum').innerHTML = '<dt>Modell</dt><dd>Specialized ' + esc(b.name) + '</dd>' +
        (cname ? '<dt>Farbe</dt><dd>' + esc(cname) + '</dd>' : '') +
        '<dt>Größe</dt><dd>' + (kids ? sizeShort : 'Richtwert ' + sizeShort + ' · bei ' + cfg.h + ' cm') + '</dd>' +
        '<dt>Extras</dt><dd>' + (ex.length ? esc(ex.join(', ')) : 'Keine ausgewählt') + '</dd>';
      const txt = 'Mein Racepoint-Wunsch-Build: Specialized ' + b.name + (cname ? ', Farbe ' + cname + ' (laut Hersteller)' : '') +
        (kids ? ', Größe nach Schrittlänge' : ', Körpergröße ' + cfg.h + ' cm (Größen-Richtwert ' + sizeShort + ')') +
        (ex.length ? ', Extras: ' + joinDe(ex) : '') + '. Ist das so machbar und verfügbar?';
      $('#wbAsk').setAttribute('data-ask', txt);
      $('#wbMail').href = mailto('Mein Build: Specialized ' + b.name, 'Hallo Racepoint-Team,\n\n' + txt + '\n\nIch würde gern einen Termin für Beratung bzw. Retül-Bikefitting vereinbaren.\n\nViele Grüße\n');
    }
    chips.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      cfg.color = +t.dataset.i;
      $$('button', chips).forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      sync();
    });
    if (h) h.addEventListener('input', () => { cfg.h = +h.value; sync(); });
    $$('input[name="extra"]').forEach(x => x.addEventListener('change', sync));
    sync();
  }

  /* ---------------- Formulare -> E-Mail-Entwurf ---------------- */
  $$('[data-mailform]').forEach(form => {
    const q = new URL(location.href).searchParams;
    const topic = q.get('thema'), bike = q.get('bike');
    if (topic) { const r = $$('input[name="thema"]', form).find(i => i.value.toLowerCase() === topic.toLowerCase()); if (r) r.checked = true; const s = $('select[name="thema"]', form); if (s) s.value = topic; }
    if (bike && byId(bike)) { const m = $('textarea', form); if (m && !m.value) m.value = 'Ich interessiere mich für das Specialized ' + byId(bike).name + '.\n'; }
    const draft = $('[data-draft]', form);
    const build = () => {
      const fd = new FormData(form), get = k => (fd.get(k) || '').toString().trim();
      const t = get('thema') || form.dataset.mailform;
      const lines = ['Hallo Racepoint-Team,', ''];
      if (get('marke') || get('modell')) lines.push('Mein Rad: ' + [get('marke'), get('modell')].filter(Boolean).join(' '));
      lines.push(get('nachricht') || '(Deine Nachricht)');
      lines.push('', 'Viele Grüße', get('name') || '');
      if (get('kontakt')) lines.push('Erreichbar unter: ' + get('kontakt'));
      return { subject: 'Anfrage: ' + t + (get('name') ? ' · ' + get('name') : ''), body: lines.join('\n') };
    };
    const upd = () => { if (draft) { const m = build(); draft.textContent = 'An: ' + MAIL + '\nBetreff: ' + m.subject + '\n\n' + m.body; } };
    form.addEventListener('input', upd); form.addEventListener('change', upd); upd();
    form.addEventListener('submit', e => {
      e.preventDefault();
      const m = build();
      location.href = mailto(m.subject, m.body);
    });
  });

  /* ---------------- Scroll-Effekte ---------------- */
  if (!RM && window.gsap) {
    $$('.flow-line i').forEach(i => gsap.to(i, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: i.closest('.flow-wrap'), start: 'top 85%', end: 'bottom 60%', scrub: true } }));
    $$('.tl-fill').forEach(i => gsap.to(i, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: i.parentElement, start: 'top 70%', end: 'bottom 60%', scrub: true } }));
  }
  if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 300);
})();
