/* =====================================================================
   RACEPOINT · 17 · BEST OF — Logik der Unterseiten (THROWAWAY)
   - Kategorie-Seiten: echte Bikes aus RP17Data (Codex-Katalog) mit
     Filter + Sortierung, Filme der Kategorie
   - Bike-Detail (v17-bike.html?id=…): Galerie, Daten, Herstellerpreis,
     Quelle, Anfrage, aehnliche Bikes + Konfigurator (3D bei Rennrad/Gravel)
   - Filme-Seite: alle Filme mit Filter, Wiedergabe ueber RP.openVideo
   - Formulare [data-mailform] -> E-Mail-Entwurf (mailto), nichts wird gesendet
   - kleine Scroll-Effekte (Ablauf-Linie, Zeitstrahl)
   Benoetigt window.RP17Data (data.js), window.RP17Site (site.js), RP
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const D = window.RP17Data, SITE = window.RP17Site;
  const RM = SITE.RM;
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const eur = n => n.toLocaleString('de-BE') + ' €';
  const date = s => s.split('-').reverse().join('.');
  const MAIL = 'info@racepoint.be';
  const mailto = (subject, body) => 'mailto:' + MAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
  const arrow = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17L17 7M9 7h8v8"/></svg>';
  const playSvg = '<span class="film-play" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 5.5v13l11-6.5z"/></svg></span>';
  const lineBike = '<svg viewBox="0 0 120 70" aria-hidden="true"><circle cx="26" cy="46" r="20"/><circle cx="94" cy="46" r="20"/><path d="M26 46l18-26h34l16 26M44 20l18 26h-36M62 46l16-26M40 14h12M74 12l4 8"/></svg>';

  /* ---------------- Konfigurator-Daten (Lacke wie im 3D-Studio V9, assets/v9/bike.js PAINTS) ---------------- */
  const PAINT = [
    ['rot', 'Racepoint-Rot', '#d3242a'], ['black', 'Gloss Black', '#0a0b0d'], ['carbon', 'Carbon', '#1d1e22'],
    ['white', 'Weiß', '#e9e9e4'], ['chameleon', 'Chameleon', 'linear-gradient(135deg,#10a07e,#4b25c8)'],
  ];
  const SIZES = [[160, 'XS', 49], [168, 'S', 52], [176, 'M', 54], [184, 'L', 56], [192, 'XL', 58], [206, 'XXL', 61]];

  /* ---------------- Katalog ---------------- */
  const CAT_NAME = { rennrad: 'Rennrad', gravel: 'Gravel', mtb: 'MTB', ebike: 'E-Bike', familie: 'Kids & Familie', kind: 'Kids & Familie' };
  const CAT_PAGE = { rennrad: 'v17-rennrad.html', gravel: 'v17-gravel.html', mtb: 'v17-mtb.html', ebike: 'v17-ebike.html', kind: 'v17-familie.html', familie: 'v17-familie.html' };
  const STYLE = { alltag: 'Alltag', sportlich: 'Sportlich', racer: 'Racer', trail: 'Trail' };
  // Familie & Alltag zeigt wie im Original das Kinder-MTB und das Alltags-E-Bike
  const inCat = (b, c) => c === 'familie' ? (b.cat === 'kind' || b.id === 'vado-3-evo-4') : b.cat === c;
  const byId = id => D.bikes.find(b => b.id === id);
  const film = id => D.films.find(f => f.id === id);
  const poster = id => 'entwuerfe/codex-2026-10/prototype/assets/films/' + id + '.jpg';
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
      '<a class="bimg" href="v17-bike.html?id=' + encodeURIComponent(b.id) + '" aria-label="' + esc(b.name) + ' ansehen">' +
        '<span class="tag">' + (b.electric ? 'Mit Motor · ' : '') + cat + '</span>' +
        '<img data-guard src="' + esc(b.image) + '" alt="Specialized ' + esc(b.name) + '" loading="lazy" referrerpolicy="no-referrer">' + ph +
      '</a>' +
      '<div class="bbody">' +
        '<p class="kicker">Specialized · ' + b.styles.map(s => STYLE[s] || s).join(' · ') + '</p>' +
        '<h3><a href="v17-bike.html?id=' + encodeURIComponent(b.id) + '">' + esc(b.name) + '</a></h3>' +
        '<ul class="bspecs">' + b.specs.map(s => '<li>' + esc(s) + '</li>').join('') + '</ul>' +
        '<div class="bprice"><b>' + eur(b.price) + '</b><small>Herstellerpreis · Belgien</small></div>' +
        '<div class="bacts"><a class="btn" href="v17-bike.html?id=' + encodeURIComponent(b.id) + '">Ansehen ' + arrow + '</a>' +
        '<a class="btn ghost" data-ask="Ich interessiere mich für das Specialized ' + esc(b.name) + ' (' + eur(b.price) + '). Passt es zu mir und welche Größe brauche ich?">Beraten lassen</a></div>' +
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
    let f = 'alle';
    chips.innerHTML = '<button type="button" aria-pressed="true" data-f="alle">Alle<span>' + all.length + '</span></button>' +
      styles.map(s => '<button type="button" aria-pressed="false" data-f="' + s + '">' + (STYLE[s] || s) + '<span>' + all.filter(b => b.styles.includes(s)).length + '</span></button>').join('') +
      (all.some(b => b.electric) && all.some(b => !b.electric) ? '<button type="button" aria-pressed="false" data-f="motor">Mit Motor<span>' + all.filter(b => b.electric).length + '</span></button>' : '');
    function render() {
      let list = all.filter(b => f === 'alle' || (f === 'motor' ? b.electric : b.styles.includes(f)));
      const s = sort.value;
      list = list.slice().sort((a, b) => s === 'desc' ? b.price - a.price : s === 'name' ? a.name.localeCompare(b.name, 'de') : a.price - b.price);
      grid.innerHTML = list.length ? list.map(b => card(b)).join('') :
        '<div class="empty"><p>Für diesen Filter haben wir hier gerade kein Modell gelistet – im Laden steht oft mehr.</p><a class="btn" data-ask="Ich suche ein ' + CAT_NAME[c] + ' (' + (STYLE[f] || f) + '). Was könnt ihr empfehlen?">Achim fragen</a></div>';
      guardImgs(grid);
      if (!RM && window.gsap) gsap.from($$('.bcard', grid), { autoAlpha: 0, y: 26, duration: 0.6, stagger: 0.07, ease: 'power3.out' });
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
    if (fr) { fr.innerHTML = (D.pageFilms[c] || []).map(id => filmCard(id)).join(''); SITE.reveal(fr); }
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
      $('#bdTop').innerHTML = '<div class="bd-miss"><p class="kicker">Bike-Detail</p><h1 class="h2" style="margin-top:14px">Welches Bike<br><em>darf es sein?</em></h1><p class="lead" style="margin-top:18px">' + (id ? 'Dieses Modell kennen wir hier nicht. ' : '') + 'Hier sind alle Modelle aus unserer Auswahl.</p></div>';
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
        '<button type="button" class="t-' + s.k + '" aria-pressed="' + (i === 0) + '" data-i="' + i + '"' + (s.video ? ' data-video="' + s.video + '"' : '') + ' aria-label="' + esc(s.alt) + '"><img src="' + esc(s.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer"></button>').join('') + '</div>';
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
        '<li><span>Verfügbar</span>Auf Anfrage – wir prüfen den Bestand</li></ul>' +
      '<div class="bd-acts"><a class="btn" href="' + mailto('Anfrage: Specialized ' + b.name, body) + '">Anfragen ' + arrow + '</a><a class="btn ghost" data-ask="' + esc(ask) + '">KI-Berater fragen</a></div>' +
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
    // 3D nur, wenn der prozedurale Typ passt: Rennrad, Gravel, MTB, E-MTB (nicht Stadt-E-Bike, nicht Kinderrad)
    const type3d = road || b.cat === 'mtb' ? b.cat : b.cat === 'ebike' && b.terrain.includes('trail') ? 'ebike' : null;
    const cfg = { paint: 0, tyres: 'tan', h: 176 };
    const stage = $('#cfgStage');
    $('#cfgNote').textContent = type3d
      ? '3D-Vorschau, nicht das exakte Modell: ein ' + (type3d === 'ebike' ? 'E-MTB' : CAT_NAME[b.cat]) + ' als Symbol für deinen Build. Verfügbare Herstellerfarben bestätigen wir persönlich.'
      : 'Für dieses Modell zeigen wir bewusst das echte Herstellerbild statt eines unpassenden 3D-Modells. Wunschfarbe und Größe nehmen wir in deine Anfrage auf.';
    if (!type3d) {
      stage.innerHTML = '<div class="bd-stage" id="cfgPhoto"><img data-guard src="' + esc(b.image) + '" alt="Specialized ' + esc(b.name) + '" referrerpolicy="no-referrer">' + ph + '<span class="tag3d" id="cfgChip"></span></div>';
      guardImgs(stage);
    } else {
      stage.innerHTML = '<div class="bd-stage v3wrap"><img data-guard src="' + esc(b.image) + '" alt="" referrerpolicy="no-referrer">' + ph + '<div class="v3d" id="v3d" aria-label="3D-Ansicht, mit Ziehen drehbar"></div><span class="tag3d">3D-Vorschau · nicht das exakte Modell</span></div>';
      guardImgs(stage);
    }
    if (!type3d || !road) $('#rowTyres').remove();
    if (kids) $('#rowSize').querySelector('p').innerHTML = 'Größe <b id="cfgSize">nach Schrittlänge</b>';
    $('#cfgSw').innerHTML = PAINT.map((p, i) => '<button type="button" style="--c:' + p[2] + '" aria-pressed="' + (i === 0) + '" aria-label="' + p[1] + '" title="' + p[1] + '" data-i="' + i + '"></button>').join('');
    const h = $('#cfgH'), out = $('#cfgHOut');
    let ctl = null;
    const sizeOf = v => SIZES.find(s => v < s[0]) || SIZES[SIZES.length - 1];
    function sync() {
      const p = PAINT[cfg.paint], s = sizeOf(cfg.h);
      $('#cfgPaint').textContent = p[1];
      out.textContent = cfg.h + ' cm';
      const sizeTxt = kids ? 'Probesitzen im Laden' : s[1] + (road ? ' · ca. ' + s[2] + ' cm' : '') + ' (Richtwert)';
      if (!kids) $('#cfgSize').textContent = s[1] + (road ? ' · ' + s[2] : '');
      const tyreTxt = cfg.tyres === 'tan' ? 'Tan-Wall' : 'Schwarz';
      const withTyres = !!(type3d && road);
      $('#sumList').innerHTML = '<dt>Modell</dt><dd>Specialized ' + esc(b.name) + '</dd><dt>Farbe</dt><dd>' + p[1] + ' (Wunsch)</dd>' +
        (withTyres ? '<dt>Reifen</dt><dd>' + tyreTxt + '</dd>' : '') +
        '<dt>Größe</dt><dd>' + sizeTxt + ' · bei ' + cfg.h + ' cm</dd><dt>Preis</dt><dd>' + eur(b.price) + ' Herstellerpreis</dd>';
      const txt = 'Mein Racepoint-Build: Specialized ' + b.name + ', Wunschfarbe ' + p[1] + (withTyres ? ', Reifen ' + tyreTxt : '') + ', Körpergröße ' + cfg.h + ' cm (Größen-Richtwert ' + (kids ? 'offen' : s[1]) + '). Ist das so machbar und verfügbar?';
      $('#sumAsk').setAttribute('data-ask', txt);
      $('#sumMail').href = mailto('Mein Build: Specialized ' + b.name, 'Hallo Racepoint-Team,\n\n' + txt + '\n\nIch würde gern einen Termin für Beratung bzw. Retül-Bikefitting vereinbaren.\n\nViele Grüße\n');
      const chip = $('#cfgChip'); if (chip) chip.textContent = 'Wunschfarbe: ' + p[1];
      if (ctl) { ctl.setPaint(p[0]); ctl.setTyres(cfg.tyres); }
    }
    $('#cfgSw').addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      cfg.paint = +t.dataset.i;
      $$('#cfgSw button').forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      sync();
    });
    const seg = $('#cfgTyres');
    if (seg) seg.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return;
      cfg.tyres = t.dataset.t;
      $$('button', seg).forEach(x => x.setAttribute('aria-pressed', String(x === t)));
      sync();
    });
    h.addEventListener('input', () => { cfg.h = +h.value; sync(); });
    sync();
    if (type3d) {
      // 3D erst laden, wenn der Konfigurator in die Naehe kommt
      const box = $('#v3d');
      const start = () => {
        const go = () => window.RP17Bike3D.mount(box, { type: type3d, paint: PAINT[cfg.paint][0], tyres: road ? cfg.tyres : 'black', baseYaw: -0.45 })
          .then(c => { ctl = c; box.parentElement.classList.add('has3d'); sync(); })
          .catch(err => { console.info('3D nicht verfügbar, Foto bleibt:', err && err.message); box.remove(); });
        if (window.RP17Bike3D) go(); else window.addEventListener('rp17:3d', go, { once: true });
      };
      const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); start(); } }, { rootMargin: '400px 0px' });
      io.observe(box);
    }
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
      return { subject: 'Anfrage: ' + t + (get('name') ? ' – ' + get('name') : ''), body: lines.join('\n') };
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
