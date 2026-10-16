/* Racepoint App · Seiten & Heroes, Öffnungszeiten, Banner, Module */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const U = A.ui, esc = A.esc, I = U.icon, V = A.views = A.views || {};
  const S = () => A.state;

  /* ================= Seiten & Heroes ================= */
  V.pages = {
    title: 'Seiten & Heroes',
    render() {
      return U.head('Seiten & Heroes', 'Jede Seite hat einen Hero mit Bild oder Video, Überschrift in 4 Sprachen und optional einem Zeitraum. Ohne eigenen Hero gilt der eingebaute Standard.') +
        '<div class="page-grid">' + A.PAGES.map(p => {
          const h = A.activeHero(p.id), slots = (S().heroes[p.id] || []).filter(s => !s.hidden), planned = slots.filter(s => s.from && s.from > A.today());
          return '<a class="pg" href="#/seiten/' + p.id + '"><div class="pg-img">' + U.img(V.heroSrc(h), p.name, U.focalStyle(h.focal)) + ((h.media || {}).kind === 'video' ? '<span class="play">' + I('play') + '</span>' : '') + '<span class="pg-hl">' + esc(h.headline.de) + '</span></div><div class="pg-b"><b>' + esc(p.name) + '</b><span>' + (h.builtin ? U.badge('Standard', 'b-sup') : U.badge(h.from ? 'bis ' + A.fmtDate(h.to, { weekday: false }) : 'Eigener Hero', 'b-own')) + (planned.length ? U.badge('geplant: ' + (planned[0].label || 'Hero') + ' ab ' + A.fmtDate(planned[0].from, { weekday: false }), 'b-ki', 'cal') : '') + '</span></div></a>';
        }).join('') + '</div>';
    }
  };
  const heroForm = { att: null, lib: null, busy: false };
  V.page = {
    title: 'Seite',
    render(p) {
      const page = A.PAGES.find(x => x.id === p.id);
      if (!page) return U.empty('search', 'Seite nicht gefunden');
      const lang = U.getLang('hero-' + page.id), active = A.activeHero(page.id), t = A.today();
      const slots = (S().heroes[page.id] || []).filter(s => !s.hidden);
      const src = V.heroSrc(active), hl = active.headline[lang] || active.headline.de;
      const timeline = [{ id: 'builtin', builtin: true, headline: page.def.headline, media: page.def }].concat(slots);
      const att = heroForm.att && A.attachments.get(heroForm.att);
      return '<a class="back" href="#/seiten">' + I('back') + 'Alle Seiten</a>' + U.head(page.name, 'Aktiv heute: <b>' + esc(active.builtin ? 'eingebauter Standard' : (active.label || 'eigener Hero')) + '</b>' + (active.from ? ' · ' + A.fmtRange(active.from, active.to) : ''), U.langTabs('hero-' + page.id, lang)) +
        '<div class="hero-prev"><figure class="hp-desk"><div class="hp-frame">' + U.img(src, page.name, U.focalStyle(active.focal)) + '<div class="hp-ov"><span class="eyebrow">Racepoint · ' + esc(page.name) + '</span><b>' + esc(hl) + '</b></div>' + ((active.media || {}).kind === 'video' ? '<span class="play">' + I('play') + '</span>' : '') + '</div><figcaption>Desktop 16:9</figcaption></figure>' +
        '<figure class="hp-mob"><div class="hp-frame">' + U.img((active.media && active.media.mobile && S().blobs[active.media.mobile.thumbKey]) || src, page.name, U.focalStyle(active.focal)) + '<div class="hp-ov"><b>' + esc(hl) + '</b></div></div><figcaption>Mobil 9:16' + (active.media && active.media.mobile ? ' · eigene Variante' : ' · Fokuspunkt') + '</figcaption></figure></div>' +
        '<div class="detail"><div class="detail-main"><section class="card"><div class="card-h"><h2>Hero-Plan</h2></div><ol class="tl">' + timeline.map(s => {
          const on = s.id === active.id, past = s.to && s.to < t, future = s.from && s.from > t;
          return '<li class="' + (on ? 'on' : '') + (past ? ' past' : '') + '"><div class="tl-img">' + U.img(V.heroSrc(s), '', U.focalStyle(s.focal)) + '</div><div class="tl-b"><b>' + esc(s.builtin ? 'Eingebauter Standard' : (s.label || s.headline.de)) + '</b><small>' + (s.builtin ? 'gilt, wenn nichts anderes geplant ist' : s.from ? A.fmtRange(s.from, s.to) + (future ? ' · geplant' : past ? ' · abgelaufen' : '') : 'dauerhaft') + ' · „' + esc(s.headline.de) + '“' + (s.status && ['fr', 'nl', 'en'].some(l => s.status[l] === 'pending') ? ' · Übersetzung folgt' : !s.builtin ? ' · DE/FR/NL/EN' : '') + '</small></div>' + (on ? U.badge('aktiv', 'b-green') : '') + (!s.builtin ? '<button class="icon-btn" data-act="hero-remove" data-page="' + page.id + '" data-id="' + s.id + '" aria-label="Entfernen" title="Entfernen (ausblenden)">' + I('eyeoff') + '</button>' : '') + '</li>';
        }).join('') + '</ol></section></div>' +
        '<aside class="detail-side"><section class="card"><div class="card-h"><h2>Neuer Hero</h2></div><form class="form" data-submit="hero" data-page="' + page.id + '">' +
        '<div class="fld"><span>Bild oder Video</span><label class="drop ' + (att ? 'has' : '') + '"><input type="file" accept="image/*,video/*" hidden data-change="hero-file">' + (att ? (att.processing ? I('refresh', 'spin') + '<b>Wird verarbeitet …</b>' : U.img(S().blobs[att.thumbKey], att.name) + '<b>' + esc(att.name) + '</b><small>' + (att.kind === 'video' ? 'Video · ' + att.duration + ' s · Poster erzeugt' : att.width + '×' + att.height + ' · ' + att.variants.length + ' Varianten') + '</small>') : I('upload') + '<b>Datei wählen</b><small>oder unten aus der Mediathek</small>') + '</label></div>' +
        '<div class="lib">' + A.LIBRARY.map(l => '<button type="button" class="lib-i ' + (heroForm.lib === l ? 'on' : '') + '" data-act="hero-lib" data-src="' + esc(l) + '">' + U.img(l, '') + '</button>').join('') + '</div>' +
        '<label class="fld"><span>Überschrift (Deutsch)</span><input name="headline" maxlength="80" placeholder="' + esc(page.def.headline.de) + '"></label>' +
        '<div class="fld2"><label class="fld"><span>Von (optional)</span><input type="date" name="from"></label><label class="fld"><span>Bis</span><input type="date" name="to"></label></div>' +
        '<label class="fld"><span>Name (optional)</span><input name="label" placeholder="z. B. Winter-Hero" maxlength="40"></label>' +
        '<button class="btn btn-primary btn-block">Hero speichern</button><p class="muted small">Ohne Zeitraum gilt er dauerhaft. FR/NL/EN übersetzt die KI automatisch.</p></form></section></aside></div>';
    }
  };
  V.heroForm = heroForm;

  /* ================= Öffnungszeiten ================= */
  const exForm = { type: 'closed' };
  V.hours = {
    title: 'Öffnungszeiten',
    render() {
      const H = S().hours, st = A.openStatus(), t = A.today(), lang = U.getLang('hours');
      const upcoming = H.exceptions.filter(e => !e.hidden && e.to >= t).sort((a, b) => a.from < b.from ? -1 : 1);
      const hols = H.holidays.filter(h => h.date >= A.addDays(t, -40));
      const order = [1, 2, 3, 4, 5, 6, 0];
      const days = [];
      let start = A.addDays(t, -((A.weekday(t) + 6) % 7));
      for (let i = 0; i < 56; i++) days.push(A.dayHours(A.addDays(start, i)));
      return U.head('Öffnungszeiten & Feiertage', 'Gilt für Website, KI-Chat und Termine. Zeit immer in Schönberg (Europe/Brussels).') +
        '<div class="detail"><div class="detail-main">' +
        '<section class="card live"><div class="live-row"><div class="status-big ' + (st.open ? 'is-open' : 'is-closed') + '"><i class="dot"></i><b>' + esc(st.text) + '</b></div><span class="muted small" data-clock>Schönberg · ' + A.brussels().time + ' Uhr</span></div><p class="muted small">Live-Vorschau, genau so steht es gleich auf der Website und im KI-Chat.</p>' +
        '<div class="gmaps">' + I('map') + '<div><b>Auch bei Google Maps aktualisieren ' + U.src.demo() + '</b><small>Zeiten, Feiertage und Sonderzeiten gehen über die Business Profile API an dein Google Unternehmensprofil.</small></div>' + U.switchHtml(S().settings.googleMaps !== false, 'gmaps', '', 'Google Maps') + '</div></section>' +
        '<section class="card"><div class="card-h"><h2>Ausnahmen</h2><span class="muted small">Betriebsurlaub · verkürzt · Sonderöffnung</span></div>' +
        (upcoming.length ? '<ul class="ex-list">' + upcoming.map(e => '<li class="ex ex-' + e.type + '"><span class="ex-type">' + ({ closed: 'Geschlossen', short: 'Verkürzt', special: 'Sonderöffnung' })[e.type] + '</span><div><b>' + esc(A.fmtRange(e.from, e.to)) + (e.type !== 'closed' ? ' · ' + (e.type === 'special' ? A.timeShort(e.open) + '–' + A.timeShort(e.close) + ' Uhr' : (e.open ? 'ab ' + A.timeShort(e.open) + ' ' : '') + (e.close ? 'bis ' + A.timeShort(e.close) + ' Uhr' : '')) : '') + '</b><small>' + esc(e.label) + ' · ' + U.actor(e.by) + ' ' + esc(e.by === 'KI' ? 'KI' : 'Achim') + ' · ' + esc(A.fmtStamp(e.at)) + '</small></div><button class="icon-btn" data-act="ex-remove" data-id="' + e.id + '" aria-label="Ausnahme entfernen" title="Entfernen">' + I('x') + '</button></li>').join('') + '</ul>' : U.empty('cal', 'Keine Ausnahmen geplant', 'Tipp: Sag dem Assistenten einfach „vom 2. bis 6.1. Betriebsurlaub“.')) +
        '<form class="form ex-form" data-submit="exception"><div class="seg" role="radiogroup">' + [['closed', 'Geschlossen'], ['short', 'Verkürzt'], ['special', 'Sonderöffnung']].map(([k, n]) => '<button type="button" data-act="ex-type" data-type="' + k + '" aria-pressed="' + (exForm.type === k) + '">' + n + '</button>').join('') + '</div>' +
        '<div class="fld2"><label class="fld"><span>Von</span><input type="date" name="from" required min="' + t + '"></label><label class="fld"><span>Bis</span><input type="date" name="to" min="' + t + '"></label></div>' +
        (exForm.type !== 'closed' ? '<div class="fld2"><label class="fld"><span>' + (exForm.type === 'short' ? 'Ab (optional)' : 'Öffnet') + '</span><input type="time" name="open" ' + (exForm.type === 'special' ? 'required value="10:00"' : '') + '></label><label class="fld"><span>' + (exForm.type === 'short' ? 'Bis' : 'Schließt') + '</span><input type="time" name="close" ' + (exForm.type === 'special' ? 'value="16:00" required' : 'value="13:00"') + '></label></div>' : '') +
        '<label class="fld"><span>Hinweis</span><input name="label" placeholder="' + ({ closed: 'z. B. Betriebsurlaub', short: 'z. B. Heiligabend', special: 'z. B. Adventssonntag' })[exForm.type] + '" maxlength="60"></label><button class="btn btn-primary">Eintragen</button></form></section>' +
        '<section class="card"><div class="card-h"><h2>Nächste 8 Wochen</h2><div class="legend"><i class="l-open"></i>offen <i class="l-alt"></i>geändert <i class="l-closed"></i>zu <i class="l-hol"></i>Feiertag</div></div><div class="cal8"><div class="cal-wd">' + order.map(d => '<span>' + A.WD[d] + '</span>').join('') + '</div><div class="cal-days">' + days.map(d => '<div class="cd ' + cls(d) + (d.date === t ? ' today' : '') + (d.date < t ? ' past' : '') + '" title="' + esc(A.fmtDate(d.date, { year: true }) + ': ' + (d.open ? A.timeShort(d.from) + '–' + A.timeShort(d.to) + ' Uhr' : d.label) + (d.reason !== 'regular' && d.open ? ' (' + d.label + ')' : '')) + '"><b>' + Number(d.date.slice(8)) + '</b><small>' + (d.open ? A.timeShort(d.from) + '–' + A.timeShort(d.to) : d.reason === 'holiday' ? 'Feiertag' : d.reason === 'closed' ? 'zu' : '') + '</small></div>').join('') + '</div></div></section>' +
        '</div><aside class="detail-side">' +
        '<section class="card"><div class="card-h"><h2>Wochenzeiten</h2></div><form data-submit="weekly" class="week">' + order.map(d => { const v = H.weekly[d]; return '<div class="wk-row" data-day="' + d + '"><b>' + A.WD_LONG[d] + '</b>' + U.switchHtml(!!v, 'wk-toggle', 'data-day="' + d + '"', A.WD_LONG[d] + ' geöffnet') + (v ? '<input type="time" name="o' + d + '" value="' + v[0] + '" aria-label="' + A.WD_LONG[d] + ' öffnet"><span>–</span><input type="time" name="c' + d + '" value="' + v[1] + '" aria-label="' + A.WD_LONG[d] + ' schließt">' : '<span class="muted wk-closed">Ruhetag</span>') + '</div>'; }).join('') + '<button class="btn btn-sm btn-primary">Zeiten speichern</button></form></section>' +
        '<section class="card"><div class="card-h"><h2>Website-Vorschau</h2>' + U.langTabs('hours', lang) + '</div>' + webHours(lang) + '</section>' +
        '<section class="card"><div class="card-h"><h2>Feiertage Belgien</h2>' + U.badge('vorbelegt ' + t.slice(0, 4) + '/' + (Number(t.slice(0, 4)) + 1), 'b-sup') + '</div><ul class="hol">' + hols.map(h => '<li class="' + (h.date < t ? 'past' : '') + '"><span>' + esc(A.fmtDate(h.date, { year: true })) + '</span><b>' + esc(h.name) + '</b></li>').join('') + '</ul><p class="muted small">Feiertage schließen automatisch, auch für Termine. Öffnen trotz Feiertag: Sonderöffnung eintragen.</p></section>' +
        '</aside></div>';
      function cls(d) { return d.reason === 'holiday' ? 'hol' : !d.open ? (d.reason === 'closed' ? 'closed ex' : 'closed') : d.reason === 'regular' ? 'open' : 'open alt'; }
    }
  };
  V.exForm = exForm;
  function webHours(lang) {
    const L = {
      de: { closed: 'geschlossen', title: 'Öffnungszeiten', note: 'Abweichende Zeiten', span: (a, b) => A.timeShort(a) + '–' + A.timeShort(b) + ' Uhr', days: A.WD_LONG },
      fr: { closed: 'fermé', title: 'Heures d’ouverture', note: 'Horaires exceptionnels', span: (a, b) => A.timeShort(a) + 'h–' + A.timeShort(b) + 'h', days: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] },
      nl: { closed: 'gesloten', title: 'Openingsuren', note: 'Afwijkende uren', span: (a, b) => A.timeShort(a) + '–' + A.timeShort(b) + ' u', days: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'] },
      en: { closed: 'closed', title: 'Opening hours', note: 'Special hours', span: (a, b) => a + '–' + b, days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
    }[lang];
    const H = S().hours, t = A.today();
    const ex = H.exceptions.filter(e => !e.hidden && e.to >= t).sort((a, b) => a.from < b.from ? -1 : 1).slice(0, 4);
    const tr = s => lang === 'de' ? s : ((A.DEMO_TRANSLATIONS[s] || {})[lang] || s);
    return '<div class="webbox"><b class="wb-t">' + L.title + '</b><ul>' + [1, 2, 3, 4, 5, 6, 0].map(d => '<li class="' + (A.weekday(t) === d ? 'today' : '') + '"><span>' + L.days[d] + '</span><span>' + (H.weekly[d] ? L.span(H.weekly[d][0], H.weekly[d][1]) : L.closed) + '</span></li>').join('') + '</ul>' + (ex.length ? '<b class="wb-t">' + L.note + '</b><ul>' + ex.map(e => '<li><span>' + A.fmtRange(e.from, e.to, { weekday: false }) + '</span><span>' + (e.type === 'closed' ? L.closed : L.span(e.open || H.weekly[A.weekday(e.from)][0], e.close || H.weekly[A.weekday(e.from)][1])) + (e.label ? ' · ' + esc(tr(e.label)) : '') + '</span></li>').join('') + '</ul>' : '') + '</div>';
  }

  /* ================= Banner ================= */
  V.banners = {
    title: 'Banner & Aktionen',
    render() {
      const t = A.today(), lang = U.getLang('banner');
      const list = S().banners.filter(b => !b.hidden).slice().reverse();
      const state = b => b.state === 'draft' ? ['Entwurf · wartet auf Freigabe', 'b-warn'] : b.paused ? ['Pausiert', 'b-sup'] : b.to < t ? ['Abgelaufen', 'b-sup'] : b.from > t ? ['Geplant ab ' + A.fmtDate(b.from, { weekday: false }), 'b-ki'] : ['Live', 'b-green'];
      const live = list.find(b => b.state === 'live' && !b.paused && b.from <= t && t <= b.to);
      return U.head('Banner & Aktionen', 'Text in 4 Sprachen, Link und Zeitraum. Banner mit Preisen oder Rabatten gehen erst nach deiner Bestätigung live.', U.langTabs('banner', lang)) +
        '<section class="card"><div class="card-h"><h2>Vorschau Website</h2>' + U.badge(live ? 'Aktuell live' : 'Kein Banner live', live ? 'b-green' : 'b-sup') + '</div><div class="site-bar">' + (live ? '<span>' + esc(live.text[lang] || live.text.de) + '</span>' + (live.link ? '<u>' + ({ de: 'Mehr', fr: 'Plus', nl: 'Meer', en: 'More' })[lang] + ' →</u>' : '') : '<span class="muted">– kein Banner –</span>') + '</div><div class="site-mock"><img src="../assets/racepoint-logo-white.svg" alt="Racepoint" class="sm-logo"><span></span><span></span><span></span></div></section>' +
        '<div class="detail"><div class="detail-main"><section class="card"><div class="card-h"><h2>Alle Banner</h2></div>' + (list.length ? '<ul class="ban-list">' + list.map(b => { const [s, k] = state(b); return '<li><div class="ban-b"><div class="ban-top">' + U.badge(s, k) + (b.price ? U.badge('nennt Preis/Rabatt', 'b-warn', 'alert') : '') + '</div><b>' + esc(b.text[lang] || b.text.de) + '</b>' + (lang !== 'de' && b.status && b.status[lang] === 'pending' ? U.src.pending() : lang !== 'de' ? U.src.ki() : '') + '<small>' + esc(A.fmtRange(b.from, b.to)) + (b.link ? ' · Link ' + esc(b.link) : '') + ' · ' + esc(b.by === 'KI' ? 'KI' : 'Achim') + ' ' + esc(A.fmtStamp(b.at)) + '</small>' + (b.check && !b.check.ok ? '<p class="tf-check bad">' + I('alert') + esc(b.check.issues.map(i => i.msg).join(' · ')) + '</p>' : '') +
        (b.state === 'draft' ? '<div class="omni">' + I('alert') + '<div><b>Omnibus-Regel prüfen</b><p>Wird ein Streichpreis oder Rabatt genannt, muss der Referenzpreis der niedrigste Preis der letzten 30 Tage sein.</p><label class="chk"><input type="checkbox" data-omni-for="' + b.id + '"> Referenzpreis geprüft</label><button class="btn btn-primary btn-sm" data-act="ban-publish" data-id="' + b.id + '">Veröffentlichen</button></div></div>' : '') + '</div><div class="ban-a">' + (b.state === 'live' ? '<button class="icon-btn" data-act="ban-pause" data-id="' + b.id + '" data-paused="' + (b.paused ? 0 : 1) + '" title="' + (b.paused ? 'Fortsetzen' : 'Pausieren') + '" aria-label="' + (b.paused ? 'Fortsetzen' : 'Pausieren') + '">' + I(b.paused ? 'play' : 'eyeoff') + '</button>' : '') + '<button class="icon-btn" data-act="ban-hide" data-id="' + b.id + '" aria-label="Entfernen" title="Entfernen">' + I('x') + '</button></div></li>'; }).join('') + '</ul>' : U.empty('megaphone', 'Noch keine Banner')) + '</section></div>' +
        '<aside class="detail-side"><section class="card"><div class="card-h"><h2>Neues Banner</h2></div><form class="form" data-submit="banner"><label class="fld"><span>Text (Deutsch)</span><input name="text" required maxlength="120" placeholder="z. B. Herbst-Check: Werkstatttermine frei" data-input="ban-text"></label><p class="omni-hint" hidden>' + I('alert') + 'Nennt einen Preis oder Rabatt: wird als Entwurf angelegt und erst nach Omnibus-Prüfung veröffentlicht.</p>' +
        '<div class="fld2"><label class="fld"><span>Von</span><input type="date" name="from" required value="' + t + '"></label><label class="fld"><span>Bis</span><input type="date" name="to" required value="' + A.addDays(t, 14) + '"></label></div><label class="fld"><span>Link (optional)</span><input name="link" placeholder="/werkstatt"></label><button class="btn btn-primary btn-block">Banner anlegen</button><p class="muted small">FR/NL/EN übersetzt die KI, die Prüfung vergleicht Zahlen und Prozente.</p></form></section></aside></div>';
    }
  };

  /* ================= Module ================= */
  V.modules = {
    title: 'Module',
    render() {
      const m = S().modules.advent, t = A.today();
      const active = m.enabled && m.from <= t && t <= m.to;
      return U.head('Module', 'Spezielle Funktionen baut Mikel im Code. Hier schaltest du sie ein, legst den Zeitraum fest und pflegst die Inhalte.') +
        '<section class="card mod"><div class="mod-h"><div class="mod-ic">' + I('cal') + '</div><div><h2>Adventskalender</h2><p class="muted">' + (m.enabled ? (active ? 'Läuft gerade auf der Website.' : 'Eingeschaltet · startet am ' + A.fmtDate(m.from) + '.') : 'Ausgeschaltet.') + ' 24 Türchen mit Text, Bild und Gutscheincode.</p></div>' + U.switchHtml(m.enabled, 'advent-toggle', '', 'Adventskalender') + '</div>' +
        '<form class="fld2 mod-dates" data-submit="advent-dates"><label class="fld"><span>Von</span><input type="date" name="from" value="' + m.from + '"></label><label class="fld"><span>Bis</span><input type="date" name="to" value="' + m.to + '"></label><button class="btn btn-sm">Zeitraum speichern</button></form>' +
        '<div class="doors">' + m.doors.map(d => { const date = m.from.slice(0, 8) + String(d.n).padStart(2, '0'); return '<button class="door ' + (d.text ? 'filled' : '') + (date === t ? ' today' : '') + '" data-act="door" data-n="' + d.n + '">' + (d.image ? U.img(d.image, '') : '') + '<b>' + d.n + '</b>' + (d.code ? '<small>' + esc(d.code) + '</small>' : d.text ? '' : '<small>leer</small>') + '</button>'; }).join('') + '</div></section>' +
        '<div class="mod-more">' + [['Gebrauchtrad-Börse', 'Achim stellt Inzahlungnahmen online, Anfragen landen im KI-Chat.'], ['Event-Anmeldung', 'Samstagsrunde, Workshops und Ausfahrten mit Teilnehmerlimit.'], ['Leasing-Rechner', 'Monatsrate je Bike für JobRad, Lease a Bike und Co.']].map(x => '<div class="card mod-soon">' + I('puzzle') + '<div><b>' + x[0] + '</b><small>' + x[1] + '</small></div>' + U.badge('Idee', 'b-sup') + '</div>').join('') + '</div>';
    }
  };
  V.openDoor = function (n) {
    const d = S().modules.advent.doors[n - 1];
    U.sheet('Türchen ' + n, '<form class="form" data-submit="door" data-n="' + n + '"><label class="fld"><span>Text</span><textarea name="text" rows="3" maxlength="200">' + esc(d.text) + '</textarea></label><label class="fld"><span>Gutscheincode (optional)</span><input name="code" value="' + esc(d.code) + '" placeholder="z. B. ADVENT07" style="text-transform:uppercase"></label><div class="fld"><span>Bild</span><div class="lib">' + ['', ...A.LIBRARY].map(l => '<label class="lib-i ' + ((d.image || '') === l ? 'on' : '') + '"><input type="radio" name="image" value="' + esc(l) + '" ' + ((d.image || '') === l ? 'checked' : '') + ' hidden>' + (l ? U.img(l, '') : '<span class="muted small">kein</span>') + '</label>').join('') + '</div></div><button class="btn btn-primary btn-block">Speichern</button></form>');
  };
})(window.RPA);
