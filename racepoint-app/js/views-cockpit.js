/* Racepoint App · Übersicht, Artikelliste, Artikeldetail */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const U = A.ui, esc = A.esc, I = U.icon;
  const V = A.views = A.views || {};
  const S = () => A.state;
  U.head = (title, sub, right) => '<header class="page-h"><div><h1>' + esc(title) + '</h1>' + (sub ? '<p>' + sub + '</p>' : '') + '</div>' + (right ? '<div class="page-h-r">' + right + '</div>' : '') + '</header>';

  A.EXAMPLES = [
    { t: 'Am 24. und 31.12. nur bis 13 Uhr, vom 2. bis 6.1. Betriebsurlaub', i: 'clock' },
    { t: 'Das sind Fotos vom Tarmac SL8, das erste als Titelbild, Herstellerbilder raus', i: 'image', needs: 'Fotos anhängen' },
    { t: 'Das ist das Hero-Video für die Crux-Seite', i: 'video', needs: 'Video anhängen' },
    { t: 'Schreib beim Aethos rein, dass wir den mit Rotor-Kurbel aufbauen können', i: 'edit' },
    { t: 'Banner: Black Friday 15 % auf Bekleidung, Freitag bis Montag', i: 'megaphone' },
    { t: 'Blende das Turbo Vado aus', i: 'eyeoff' },
    { t: 'Wie oft wurde der Chat diese Woche genutzt?', i: 'chart' }
  ];

  /* ================= Übersicht ================= */
  V.overview = {
    title: 'Übersicht',
    render() {
      const s = S(), now = new Date(), st = A.openStatus(), t = A.today();
      const hour = A.brussels().min / 60;
      const greet = hour < 11 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
      const today = A.statsRange(t, t), wk = A.statsRange(A.addDays(t, -13), t);
      const openReq = s.appointments.requests.filter(r => r.status === 'open');
      const cost = A.kiCost();
      const todo = [];
      Object.values(s.articles).forEach(a => Object.keys(a.supplierUpdates || {}).forEach(f => todo.push({ i: 'refresh', t: 'Lieferant hat aktualisiert – übernehmen?', d: A.FIELDS[f] + ' beim ' + A.shortName(a), href: '#/artikel/' + a.id })));
      if (openReq.length) todo.push({ i: 'cal', t: openReq.length + ' Buchungen warten auf Bestätigung', d: openReq.map(r => s.appointments.rules[r.type].name).join(', '), href: '#/termine' });
      s.banners.filter(b => !b.hidden && b.state === 'draft').forEach(b => todo.push({ i: 'megaphone', t: 'Banner wartet auf Freigabe', d: '„' + b.text.de + '“ nennt einen Preis', href: '#/banner' }));
      Object.values(s.articles).forEach(a => Object.entries(a.overrides).forEach(([f, o]) => { if (!o.hidden && o.check && !o.check.ok) todo.push({ i: 'alert', t: 'Übersetzungs-Prüfung meldet Abweichung', d: A.FIELDS[f] + ' beim ' + A.shortName(a), href: '#/artikel/' + a.id }); }));
      if (A.erpStale()) todo.push({ i: 'alert', t: 'ERP-Abgleich älter als 24 Stunden', d: 'Website zeigt „Preis im Laden erfragen“', href: '#/statistik', warn: true });
      todo.push({ i: 'spark', t: A.UNANSWERED.length + ' Fragen konnte die KI nicht beantworten', d: '„' + A.UNANSWERED[0].q + '“ …', href: '#/statistik' });
      const heroes = A.activeHero('startseite');
      const banner = s.banners.filter(b => !b.hidden && b.state === 'live' && !b.paused && b.from <= t && t <= b.to).pop();
      const dh = A.dayHours(t);
      const recent = s.history.slice().reverse().filter(h => h.kind !== 'supplier').slice(0, 5);
      return '<section class="ov-top"><div class="ov-greet"><span class="eyebrow">' + esc(A.WD_LONG[A.weekday(t)] + ', ' + Number(t.slice(8)) + '. ' + A.MONTHS[Number(t.slice(5, 7)) - 1]) + ' · Schönberg</span><h1>' + greet + ', Achim.</h1>' +
        '<a href="#/zeiten" class="status-pill ' + (st.open ? 'is-open' : 'is-closed') + '"><i class="dot"></i>' + esc(st.text) + '</a></div>' +
        '<form class="ask" data-submit="ask"><label class="ask-l" for="ask-in">' + I('spark') + 'Sag einfach, was sich ändern soll</label><div class="ask-row"><input id="ask-in" name="q" autocomplete="off" placeholder="Was soll sich ändern?"><button class="btn btn-primary" aria-label="An den Assistenten senden">' + I('send') + '</button></div>' +
        '<div class="chips">' + A.EXAMPLES.slice(0, 4).map(e => '<button type="button" class="chip" data-act="ask-example" data-text="' + esc(e.t) + '">' + I(e.i) + '<span>' + esc(e.t) + '</span></button>').join('') + '<a class="chip chip-more" href="#/assistent">Alle Beispiele ' + I('arrow') + '</a></div></form></section>' +
        '<section class="kpis">' +
        kpi('Besuche heute', today.visits.toLocaleString('de-BE'), 'Website, cookielos', U.sparkline(wk.days.map(d => d.visits)), '#/statistik') +
        kpi('KI-Gespräche heute', today.chats, Math.round(today.chats / Math.max(1, today.visits) * 100) + ' % der Besuche', U.sparkline(wk.days.map(d => d.chats)), '#/statistik') +
        kpi('Unbestätigte Buchungen', openReq.length, 'aus eTermin', '<div class="kpi-tag">' + U.src.etermin() + '</div>', '#/termine') +
        kpi('KI-Kosten ' + A.MONTHS[Number(t.slice(5, 7)) - 1], A.usd(cost.total), 'von ' + A.usd(cost.limit) + ' Limit', '<div class="meter"><i style="width:' + Math.min(100, cost.total / cost.limit * 100).toFixed(1) + '%"></i></div>', '#/statistik') +
        '</section>' +
        '<div class="ov-grid"><section class="card"><div class="card-h"><h2>Braucht deine Aufmerksamkeit</h2><span class="count">' + todo.length + '</span></div><ul class="todo">' + todo.map(x => '<li><a href="' + x.href + '" class="' + (x.warn ? 'warn' : '') + '"><span class="todo-ic">' + I(x.i) + '</span><span><b>' + esc(x.t) + '</b><small>' + esc(x.d) + '</small></span>' + I('arrow', 'chev') + '</a></li>').join('') + '</ul></section>' +
        '<section class="card"><div class="card-h"><h2>Heute auf der Website</h2><a class="link" href="../v17-best-of.html" target="_blank" rel="noopener">Website öffnen ' + I('ext') + '</a></div>' +
        '<a class="today-hero" href="#/seiten/startseite">' + heroThumb(heroes) + '<div class="today-hero-t"><span class="eyebrow">Startseite · ' + (heroes.builtin ? 'Standard-Hero' : esc(heroes.label || 'eigener Hero')) + '</span><b>' + esc(heroes.headline.de) + '</b></div></a>' +
        '<dl class="facts"><div><dt>Öffnungszeit heute</dt><dd>' + (dh.open ? A.timeShort(dh.from) + '–' + A.timeShort(dh.to) + ' Uhr' + (dh.reason !== 'regular' ? ' · ' + esc(dh.label) : '') : esc(dh.label)) + '</dd></div><div><dt>Banner</dt><dd>' + (banner ? '„' + esc(banner.text.de) + '“' : 'keiner aktiv') + '</dd></div><div><dt>ERP-Abgleich</dt><dd class="' + (A.erpStale() ? 'bad' : 'good') + '">' + I(A.erpStale() ? 'alert' : 'check') + esc(A.ago(A.erpSyncedAt())) + ' · ' + A.erp.rows.length + ' Varianten</dd></div><div><dt>Sichtbare Artikel</dt><dd>' + Object.values(s.articles).filter(a => a.visible).length + ' von ' + Object.keys(s.articles).length + '</dd></div></dl></section>' +
        '<section class="card span2"><div class="card-h"><h2>Zuletzt geändert</h2><a class="link" href="#/verlauf">Ganzer Verlauf ' + I('arrow') + '</a></div><ul class="hist">' + recent.map(V.historyRow).join('') + '</ul></section></div>';
      function kpi(l, v, sub, extra, href) { return '<a class="kpi" href="' + href + '"><span class="kpi-l">' + esc(l) + '</span><b class="kpi-v">' + esc(v) + '</b><span class="kpi-s">' + esc(sub) + '</span>' + (extra || '') + '</a>'; }
      function heroThumb(h) { return U.img(V.heroSrc(h), 'Hero', U.focalStyle(h.focal)) + ((h.media || {}).kind === 'video' ? '<span class="play">' + I('play') + '</span>' : ''); }
    }
  };
  V.heroSrc = function (h) {
    const m = h.media || {};
    if (h.builtin) return m.thumb;
    return A.mediaSrc(m) || m.src || (m.thumbKey && S().blobs[m.thumbKey]);
  };

  /* ================= Artikel ================= */
  const artFilter = V.artFilter = { q: '', cat: 'all' };
  V.articles = {
    title: 'Artikel',
    render() {
      const s = S();
      let arts = Object.values(s.articles).sort((a, b) => a.order - b.order);
      const counts = { all: arts.length, hidden: arts.filter(a => !a.visible).length };
      Object.keys(A.CATS).forEach(c => counts[c] = arts.filter(a => a.cat === c).length);
      if (artFilter.cat === 'hidden') arts = arts.filter(a => !a.visible); else if (artFilter.cat !== 'all') arts = arts.filter(a => a.cat === artFilter.cat);
      if (artFilter.q) { const hits = A.findArticles(artFilter.q); const q = artFilter.q.toLowerCase(); arts = arts.filter(a => hits.includes(a) || a.name.toLowerCase().includes(q)); }
      const chips = [['all', 'Alle'], ...Object.entries(A.CATS), ['hidden', 'Ausgeblendet']].filter(([k]) => counts[k]).map(([k, n]) => '<button class="chip ' + (artFilter.cat === k ? 'on' : '') + '" data-act="art-cat" data-cat="' + k + '">' + esc(n) + ' <small>' + counts[k] + '</small></button>').join('');
      return U.head('Artikel', 'Ein Katalog für Website, Shop und KI-Chat: <b>Preis & Bestand</b> aus Intec, <b>Texte & Bilder</b> vom Lieferanten, <b>deine Änderungen</b> gewinnen.', '<span class="erp-chip ' + (A.erpStale() ? 'bad' : '') + '">' + I('db') + 'ERP · Abgleich ' + esc(A.ago(A.erpSyncedAt())) + '</span>') +
        '<div class="toolbar"><label class="search">' + I('search') + '<input type="search" placeholder="Modell suchen" value="' + esc(artFilter.q) + '" data-input="art-q" aria-label="Artikel suchen"></label><div class="chips scroll">' + chips + '</div></div>' +
        '<div class="art-grid">' + (arts.length ? arts.map(card).join('') : U.empty('search', 'Nichts gefunden', 'Anderen Suchbegriff probieren.')) + '</div>';
      function card(a) {
        const e = A.erpFor(a.id), cover = A.coverOf(a), ups = Object.keys(a.supplierUpdates).length, ovs = Object.values(a.overrides).filter(o => !o.hidden).length;
        return '<a class="art ' + (a.visible ? '' : 'is-hidden') + '" href="#/artikel/' + a.id + '"><div class="art-img">' + U.img(A.mediaSrc(cover), cover && cover.supplier ? 'Herstellerbild' : cover ? cover.name : 'Kein Bild', U.focalStyle(cover && cover.focal)) + (a.visible ? '' : '<span class="art-flag">' + I('eyeoff') + 'Ausgeblendet</span>') + '</div>' +
          '<div class="art-b"><span class="eyebrow">' + esc(A.CATS[a.cat] || a.cat) + ' · ' + esc(a.brand === 'cervelo' ? 'Cervélo' : 'Specialized') + '</span><h3>' + esc(A.articleTitle(a)) + '</h3>' +
          '<div class="art-p"><b>' + (e.stale ? 'Preis im Laden erfragen' : e.price != null ? 'ab ' + A.money(e.price) : '–') + '</b><span class="' + (e.stock ? 'good' : 'muted') + '">' + (e.rows.length ? (e.stock ? e.stock + ' auf Lager' : 'nicht vorrätig') : 'nicht im ERP') + '</span></div>' +
          '<div class="art-badges">' + (ovs ? U.badge(ovs + ' eigene Texte', 'b-own') : '') + (a.media.filter(m => !m.hidden).length ? U.badge(a.media.filter(m => !m.hidden).length + ' eigene Medien', 'b-own') : '') + (ups ? U.badge('Lieferanten-Update', 'b-warn', 'refresh') : '') + (a.demo ? U.badge('Demo-Ergänzung', 'b-demo') : '') + '</div></div></a>';
      }
    }
  };

  /* ================= Artikeldetail ================= */
  V.article = {
    title: 'Artikel',
    render(p) {
      const a = S().articles[p.id];
      if (!a) return U.empty('search', 'Artikel nicht gefunden', '');
      const e = A.erpFor(a.id), lang = U.getLang('art-' + a.id);
      const media = A.mediaList(a);
      const hero = a.hero && a.media.find(m => m.id === a.hero && !m.hidden);
      return '<a class="back" href="#/artikel">' + I('back') + 'Alle Artikel</a>' +
        '<header class="page-h art-h"><div><span class="eyebrow">' + esc(A.CATS[a.cat]) + ' · ' + esc(a.brand === 'cervelo' ? 'Cervélo' : 'Specialized') + (a.demo ? ' · ' + 'Demo-Ergänzung, Herstellerdaten ungeprüft' : '') + '</span><h1>' + esc(A.articleTitle(a)) + '</h1></div>' +
        '<div class="vis ' + (a.visible ? 'on' : '') + '"><div><b>' + (a.visible ? 'Sichtbar' : 'Ausgeblendet') + '</b><small>Website, Shop und KI-Chat</small></div>' + U.switchHtml(a.visible, 'art-visible', 'data-id="' + a.id + '"', 'Sichtbarkeit') + '</div></header>' +
        '<div class="detail"><div class="detail-main">' +
        // Medien
        '<section class="card"><div class="card-h"><h2>Bilder & Videos</h2><span class="muted small">Herstellerbilder nur ausblenden · eigene hochladen · Reihenfolge = Website</span></div>' +
        (hero ? '<div class="hero-row" data-act="media-open" data-id="' + a.id + '" data-mid="' + hero.id + '"><div class="hero-row-img">' + U.img(A.mediaSrc(hero, 'thumb'), hero.name, U.focalStyle(hero.focal)) + (hero.kind === 'video' ? '<span class="play">' + I('play') + '</span>' : '') + '</div><div><span class="eyebrow">Hero oben auf der Artikelseite</span><b>' + esc(hero.name) + '</b><small>' + (hero.kind === 'video' ? (A.transcode(hero) < 1 ? 'Umrechnung läuft · ' + Math.round(A.transcode(hero) * 100) + ' % (Demo)' : 'Poster · MP4 1080/720/480 · 15-s-Loop (Demo)') : 'Bild · Mobil-Ausschnitt 9:16 über Fokuspunkt') + '</small></div>' + I('arrow', 'chev') + '</div>' : '') +
        '<div class="media-grid">' + media.map((m, i) => tile(a, m, i, media.length)).join('') +
        '<label class="tile tile-up" id="up-' + a.id + '"><input type="file" accept="image/*,video/*" multiple hidden data-change="art-upload" data-id="' + a.id + '">' + I('upload') + '<b>Hochladen</b><small>Fotos oder Videos<br>Varianten entstehen automatisch</small></label></div>' +
        '<form class="yt" data-submit="yt" data-id="' + a.id + '">' + I('link') + '<input name="url" placeholder="YouTube-Link als Video verknüpfen" aria-label="YouTube-Link"><button class="btn btn-sm">Verknüpfen</button></form></section>' +
        // Texte
        '<section class="card"><div class="card-h"><h2>Texte</h2>' + U.langTabs('art-' + a.id, lang) + '</div>' +
        Object.keys(A.FIELDS).map(f => textField(a, f, lang)).join('') +
        '<p class="note">' + I('globe') + 'Deutsch schreiben reicht: Die KI übersetzt automatisch nach FR/NL/EN und es geht ohne Freigabe live. Nie übersetzt werden Glossarbegriffe wie ' + A.GLOSSARY.slice(0, 6).join(', ') + ' … Eine automatische Prüfung vergleicht Zahlen, Preise und Daten zwischen den Sprachen und meldet sich nur bei Abweichungen.</p></section>' +
        '<section class="card"><div class="card-h"><h2>Technische Daten</h2>' + U.src.supplier() + '</div><ul class="specs">' + a.supplier.specs.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul><p class="muted small">Quelle: <a class="link" href="' + esc(a.source) + '" target="_blank" rel="noopener">' + esc(a.source.replace(/^https:\/\//, '').slice(0, 48)) + '…</a>' + (a.checkedAt ? ' · geprüft ' + esc(A.fmtDate(a.checkedAt, { weekday: false, year: true })) : '') + ' · UVP Hersteller ' + A.money(a.uvp) + '</p></section>' +
        '</div><aside class="detail-side">' +
        // ERP
        '<section class="card erp"><div class="card-h"><h2>Preis & Bestand</h2>' + U.src.erp() + '</div>' +
        '<div class="erp-top"><div><span class="muted small">Ladenpreis</span><b class="big">' + (e.price != null ? (e.rows.some(r => r.ladenpreis_eur !== e.price) ? 'ab ' : '') + A.money(e.price) : '–') + '</b></div><div><span class="muted small">Bestand</span><b class="big">' + e.stock + '</b></div></div>' +
        '<p class="lock-note">' + I('lock') + 'Nur lesbar · ERP · Stand ' + esc(A.fmtTime(A.erpSyncedAt())) + ' (' + esc(A.ago(A.erpSyncedAt())) + '). Preise und Bestände änderst du in Intec.</p>' +
        (e.stale ? '<p class="warnbox">' + I('alert') + 'Abgleich älter als 24 h: Die Website zeigt hier „Preis im Laden erfragen“.</p>' : '') +
        '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Größe</th><th>Farbe</th><th class="r">Bestand</th><th class="r">Preis</th></tr></thead><tbody>' + (e.rows.map(r => '<tr title="EAN ' + r.ean + (A.validEan(r.ean) ? ' (Prüfziffer ok)' : '') + '"><td>' + esc(r.groesse) + '</td><td class="ell">' + esc(r.farbe) + '</td><td class="r ' + (r.bestand ? '' : 'muted') + '">' + r.bestand + '</td><td class="r">' + A.money(r.ladenpreis_eur) + '</td></tr><tr class="ean"><td colspan="4">EAN ' + r.ean + '</td></tr>').join('') || '<tr><td colspan="4" class="muted">Keine Varianten im ERP-Export.</td></tr>') + '</tbody></table></div><p class="muted small">Demo-Export, fiktive EANs aus dem internen Bereich 200–299.</p></section>' +
        // Vorschau
        '<section class="card"><div class="card-h"><h2>So sieht es aus</h2>' + U.langTabs('prev-' + a.id, U.getLang('prev-' + a.id)) + '</div>' + preview(a, U.getLang('prev-' + a.id)) + '</section>' +
        '</aside></div>';
    }
  };
  function tile(a, m, i, n) {
    const isCover = a.cover === m.id, src = A.mediaSrc(m, 'thumb');
    const tags = [m.supplier ? U.badge('Hersteller', 'b-sup') : U.badge('Eigen', 'b-own')];
    if (isCover && !m.hidden) tags.push(U.badge('Titelbild', 'b-red', 'star'));
    if (a.hero === m.id) tags.push(U.badge('Hero', 'b-red'));
    if (m.kind !== 'image') tags.push(U.badge(m.kind === 'youtube' ? 'YouTube' : 'Video', 'b-dark', 'play'));
    const actions = (m.supplier ? '<button class="tb" data-act="sup-toggle" data-id="' + a.id + '" data-mid="' + m.id + '" aria-label="' + (m.hidden ? 'Einblenden' : 'Ausblenden') + '" title="' + (m.hidden ? 'Einblenden' : 'Ausblenden') + '">' + I(m.hidden ? 'eye' : 'eyeoff') + '</button>' : '') +
      (!m.hidden && m.kind === 'image' && !isCover ? '<button class="tb" data-act="set-cover" data-id="' + a.id + '" data-mid="' + m.id + '" title="Als Titelbild" aria-label="Als Titelbild">' + I('star') + '</button>' : '') +
      (i > 0 ? '<button class="tb" data-act="move" data-dir="-1" data-id="' + a.id + '" data-mid="' + m.id + '" title="Nach vorne" aria-label="Nach vorne">' + I('back') + '</button>' : '') +
      (i < n - 1 ? '<button class="tb" data-act="move" data-dir="1" data-id="' + a.id + '" data-mid="' + m.id + '" title="Nach hinten" aria-label="Nach hinten">' + I('arrow') + '</button>' : '') +
      (!m.supplier ? '<button class="tb" data-act="media-open" data-id="' + a.id + '" data-mid="' + m.id + '" title="Details, Fokuspunkt, Varianten" aria-label="Details">' + I('target') + '</button>' : '');
    return '<div class="tile ' + (m.hidden ? 'is-hidden' : '') + '"><div class="tile-img" ' + (!m.supplier ? 'data-act="media-open" data-id="' + a.id + '" data-mid="' + m.id + '"' : '') + '>' + U.img(src, m.supplier ? 'Herstellerbild' : m.name, U.focalStyle(m.focal)) + (m.kind !== 'image' ? '<span class="play">' + I('play') + '</span>' : '') + (m.hidden ? '<span class="hid">' + I('eyeoff') + 'ausgeblendet</span>' : '') + '</div><div class="tile-tags">' + tags.join('') + '</div><div class="tile-name">' + esc(m.name) + '</div><div class="tile-a">' + actions + '</div></div>';
  }
  const editing = {};
  function textField(a, f, lang) {
    const v = A.fieldValue(a, f), up = a.supplierUpdates[f], key = a.id + ':' + f;
    const txt = v.text[lang] || '', st = v.status[lang];
    let h = '<div class="tf ' + (v.source === 'override' ? 'tf-own' : '') + '"><div class="tf-h"><b>' + esc(A.FIELDS[f]) + '</b>' + (v.source === 'override' ? U.src.override(v.by, v.at) : v.source === 'supplier' ? U.src.supplier() : '<span class="muted small">leer</span>') +
      (lang !== 'de' && v.source === 'override' ? (st === 'pending' ? U.src.pending() : st === 'manual' ? U.badge('von Hand', 'b-sup') : U.src.ki()) : '') + '</div>';
    if (editing[key]) {
      h += '<form class="tf-edit" data-submit="text" data-id="' + a.id + '" data-field="' + f + '"><textarea name="de" rows="' + (f === 'description' ? 4 : 2) + '" aria-label="Deutscher Text">' + esc(v.text.de || '') + '</textarea><p class="muted small">Deutsch genügt, FR/NL/EN übersetzt die KI automatisch und es geht direkt live.</p><div class="row"><button class="btn btn-primary btn-sm">Speichern</button><button type="button" class="btn btn-sm btn-ghost" data-act="text-cancel" data-key="' + key + '">Abbrechen</button></div></form>';
    } else {
      h += '<p class="tf-t ' + (txt ? '' : 'muted') + '">' + (txt ? esc(txt) : lang !== 'de' && st === 'pending' ? 'Übersetzung folgt (KI offline) – bis dahin zeigt die Website den deutschen Text.' : f === 'racepoint_note' ? 'Noch kein Racepoint-Hinweis. Z. B. „Auf Wunsch mit Rotor-Kurbel“.' : '–') + '</p>';
      if (v.source === 'override' && v.check) h += v.check.ok ? '<p class="tf-check ok">' + I('check') + 'Zahlen, Preise, Daten und Glossar in allen Sprachen geprüft</p>' : '<p class="tf-check bad">' + I('alert') + esc(v.check.issues.map(i => i.msg).join(' · ')) + '</p>';
      h += '<div class="tf-a"><button class="link" data-act="text-edit" data-key="' + key + '">' + I('edit') + (v.source === 'override' ? 'Bearbeiten' : 'Eigenen Text schreiben') + '</button>' + (v.source === 'override' && f !== 'racepoint_note' ? '<button class="link" data-act="text-reset" data-id="' + a.id + '" data-field="' + f + '">' + I('refresh') + 'Auf Lieferantenwert zurücksetzen</button>' : '') + (v.source === 'override' && f === 'racepoint_note' ? '<button class="link" data-act="text-reset" data-id="' + a.id + '" data-field="' + f + '">' + I('eyeoff') + 'Hinweis entfernen</button>' : '') + '</div>';
    }
    if (up) h += '<div class="sup-up">' + I('refresh') + '<div><b>Lieferant hat aktualisiert – übernehmen?</b><p>Neu von Specialized (' + esc(A.fmtStamp(up.at)) + '): „' + esc(up.text[lang] || up.text.de) + '“</p><p class="muted small">Dein Text bleibt, bis du entscheidest. Lieferanten-Updates überschreiben nie deine Änderungen.</p><div class="row"><button class="btn btn-sm btn-primary" data-act="sup-accept" data-id="' + a.id + '" data-field="' + f + '">Übernehmen</button><button class="btn btn-sm btn-ghost" data-act="sup-ignore" data-id="' + a.id + '" data-field="' + f + '">Meinen Text behalten</button></div></div></div>';
    return h + '</div>';
  }
  V.textEditing = editing;
  function preview(a, lang) {
    const e = A.erpFor(a.id), cover = A.coverOf(a), f = k => { const v = A.fieldValue(a, k); return v.status[lang] === 'pending' || !v.text[lang] ? v.text.de : v.text[lang]; };
    const ask = { de: 'Preis im Laden erfragen', fr: 'Prix en magasin', nl: 'Prijs in de winkel', en: 'Ask in store for price' }[lang];
    const note = f('racepoint_note');
    return '<div class="pv ' + (a.visible ? '' : 'is-hidden') + '"><div class="pv-img">' + U.img(A.mediaSrc(cover), 'Titelbild', U.focalStyle(cover && cover.focal)) + '</div><div class="pv-b"><b>' + esc(f('title')) + '</b><p>' + esc(f('teaser')) + '</p>' + (note ? '<p class="pv-note">' + esc(note) + '</p>' : '') + '<div class="pv-p">' + (e.stale ? esc(ask) : e.price != null ? A.money(e.price).replace(/\s/g, ' ') : '') + '</div></div>' + (a.visible ? '' : '<div class="pv-off">' + I('eyeoff') + 'Auf der Website ausgeblendet</div>') + '</div>';
  }

  /* ---------- Medien-Detail (Fokuspunkt, Varianten, Rolle) ---------- */
  V.openMedia = function (aid, mid) {
    const a = S().articles[aid], m = a && a.media.find(x => x.id === mid);
    if (!m) return;
    const src = A.mediaSrc(m) || A.mediaSrc(m, 'thumb'), blob = A.blobs.get(m.id);
    const variants = (blob && blob.variants) || m.variants || [];
    const crops = [['16:9', 'Desktop 16:9', '16/9'], ['1:1', 'Quadrat 1:1', '1/1'], ['9:16', 'Mobil 9:16', '9/16']];
    const html = '<div class="mm"><div class="mm-l"><div class="focal" data-act="focal" data-id="' + aid + '" data-mid="' + mid + '">' + U.img(src, m.name, '') + '<i class="focal-dot" style="left:' + m.focal.x + '%;top:' + m.focal.y + '%"></i></div><p class="muted small">' + I('target') + 'Tippe auf das Motiv: Der Fokuspunkt bestimmt alle Ausschnitte.</p>' +
      '<div class="crops">' + crops.map(c => '<figure><div class="crop" style="aspect-ratio:' + c[2] + '">' + U.img(src, c[1], U.focalStyle(m.focal)) + '</div><figcaption>' + c[1] + '</figcaption></figure>').join('') + '</div></div>' +
      '<div class="mm-r"><dl class="facts"><div><dt>Datei</dt><dd>' + esc(m.name) + '</dd></div>' + (m.width ? '<div><dt>Original</dt><dd>' + m.width + ' × ' + m.height + ' px' + (m.bytes ? ' · ' + A.bytes(m.bytes) : '') + (m.duration ? ' · ' + String(m.duration).replace('.', ',') + ' s' : '') + '</dd></div>' : '') + '<div><dt>Von</dt><dd>' + esc(m.by || '–') + ' · ' + esc(m.at ? A.fmtStamp(m.at) : '') + '</dd></div></dl>' +
      '<label class="fld"><span>Rolle</span><select data-change="media-role" data-id="' + aid + '" data-mid="' + mid + '">' + [['gallery', 'Galerie'], ['hero', 'Hero (oben auf der Artikelseite)'], ['video', 'Video']].filter(r => m.kind === 'image' ? r[0] !== 'video' : r[0] !== 'gallery').map(r => '<option value="' + r[0] + '" ' + (m.role === r[0] ? 'selected' : '') + '>' + r[1] + '</option>').join('') + '</select></label>' +
      (m.kind === 'video' ? '<h4>Umrechnung ' + U.src.demo('Demo · simuliert') + '</h4><div class="tc" data-tc="' + mid + '">' + A.VIDEO_TARGETS.map(t => '<div class="tc-r"><span>' + esc(t.label) + '</span><div class="meter"><i style="width:' + Math.round(A.transcode(m) * 100) + '%"></i></div></div>').join('') + '</div><p class="muted small">Im Browser wird nur das Posterbild echt erzeugt. Echtbetrieb: ffmpeg-Job auf dem Server, Ablage im Blob-Speicher, Auslieferung über CDN.</p>' :
        '<h4>Erzeugte Varianten ' + U.src.demo(variants.length && !m.src ? 'im Browser erzeugt' : 'Demo') + '</h4>' + (variants.length ? '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Format</th><th>Größe</th><th class="r">Datei</th></tr></thead><tbody>' + variants.map(v => '<tr><td>' + v.format.toUpperCase() + '</td><td>' + v.w + ' × ' + v.h + '</td><td class="r">' + A.bytes(v.bytes) + '</td></tr>').join('') + '</tbody></table></div><p class="muted small">' + (A.canAvif() ? 'AVIF und WebP direkt im Browser kodiert.' : 'Dieser Browser kann kein AVIF kodieren: Hier entsteht JPEG als Ersatz, AVIF erzeugt im Echtbetrieb der Server-Job.') + ' Größen über dem Original werden nie hochskaliert.</p>' : '<p class="muted small">Bild aus der Mediathek, Varianten erzeugt der Server-Job.</p>')) +
      '<div class="row"><button class="btn btn-ghost btn-sm" data-act="media-hide" data-id="' + aid + '" data-mid="' + mid + '">' + I('eyeoff') + 'Ausblenden</button></div></div></div>';
    U.sheet(m.name, html, { wide: true });
  };
})(window.RPA);
