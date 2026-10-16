/* Racepoint App · Aktionen. Formulare UND KI-Assistent rufen genau diese Funktionen auf
   (A.run(name, input, ctx)), mit derselben Prüfung. Ergebnis: { ok, summary, lines, entry, ... }.
   ctx = { actor: 'Achim' | 'KI', confirmed: nur durch Tippen in der App, attachments: Map } */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const S = () => A.state;
  const fail = A.fail;
  const list = v => Array.isArray(v) ? v : v == null || v === '' ? [] : [v];
  const DAYKEYS = { so: 0, mo: 1, di: 2, mi: 3, do: 4, fr: 5, sa: 6 };
  const AI_TOOLS = ['set_hours_exception', 'set_weekly_hours', 'update_article_text', 'set_article_visibility', 'set_article_media', 'set_page_hero', 'create_banner', 'query_stats', 'list_appointments', 'respond_appointment', 'find_article', 'undo'];
  A.AI_TOOLS = AI_TOOLS;
  const google = () => S().settings.googleMaps !== false;
  const googleLine = what => google() ? 'Google Unternehmensprofil (Maps): ' + what + ' mitgeschickt · Demo' : null;

  /* ---------- Artikel finden ---------- */
  const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[·,/()]/g, ' ').replace(/\s+/g, ' ').trim();
  A.findArticles = function (q) {
    const n = norm(q);
    const arts = Object.values(S().articles);
    const exact = arts.find(a => a.id === q || norm(a.name) === n);
    if (exact) return [exact];
    const toks = n.split(' ').filter(t => t && !['das', 'den', 'die', 'der', 'beim', 'vom', 'von', 'specialized', 'bike', 'rad'].includes(t));
    if (!toks.length) return [];
    const cats = { rennrad: 'rennrad', rennraeder: 'rennrad', gravel: 'gravel', mtb: 'mtb', mountainbike: 'mtb', 'e-bike': 'ebike', ebike: 'ebike', 'e-bikes': 'ebike', kinder: 'kind' };
    return arts.map(a => {
      const hay = norm(a.name + ' ' + a.id.replace(/-/g, ' ') + ' ' + (A.CATS[a.cat] || ''));
      const words = hay.split(' ');
      let score = 0;
      toks.forEach(t => { if (words.includes(t)) score += 3; else if (hay.includes(t)) score += 1; else if (cats[t] && a.cat === cats[t]) score += 2; else score -= 4; });
      return { a, score };
    }).filter(x => x.score > 0).sort((x, y) => y.score - x.score).filter((x, i, arr) => x.score === arr[0].score).map(x => x.a);
  };
  A.resolveArticle = function (q) {
    if (!q) throw fail('Welcher Artikel? Bitte Modellname angeben.');
    const hits = A.findArticles(q);
    if (!hits.length) throw fail('Keinen Artikel zu „' + q + '“ gefunden.');
    if (hits.length > 1) throw fail('„' + q + '“ ist nicht eindeutig: ' + hits.map(a => a.name).join(' / ') + '. Welcher ist gemeint?', { candidates: hits.map(a => a.id) });
    return hits[0];
  };

  /* ---------- Öffnungszeiten ---------- */
  function checkDate(d, name) {
    if (!A.isoDate(d)) throw fail((name || 'Datum') + ' fehlt oder ist ungültig (JJJJ-MM-TT).');
    const t = A.today();
    if (d < A.addDays(t, -1)) throw fail(A.fmtDate(d, { year: true }) + ' liegt in der Vergangenheit.');
    if (d > A.addDays(t, 800)) throw fail(A.fmtDate(d, { year: true }) + ' liegt zu weit in der Zukunft.');
  }
  function checkTime(t, name) { if (A.toMin(t) == null) throw fail(name + ' fehlt oder ist ungültig (HH:MM).'); return A.fromMin(A.toMin(t)); }
  const actions = {};
  actions.set_hours_exception = function (inp, ctx) {
    const H = S().hours;
    if (inp.type === 'remove') {
      const ex = H.exceptions.find(e => e.id === inp.id && !e.hidden);
      if (!ex) throw fail('Diese Ausnahme gibt es nicht (mehr).');
      const r = A.tx({ label: 'Ausnahme entfernt: ' + describeEx(ex), actor: ctx.actor, paths: [['hours', 'exceptions']], run: () => { ex.hidden = true; } });
      return { summary: 'Ausnahme entfernt (ausgeblendet): ' + describeEx(ex) + '. Es gelten wieder die normalen Zeiten.', lines: [googleLine('Sonderzeiten')], entry: r.entry };
    }
    if (!['closed', 'short', 'special'].includes(inp.type)) throw fail('Art der Ausnahme fehlt (geschlossen, verkürzt oder Sonderöffnung).');
    const from = inp.from, to = inp.to || inp.from;
    checkDate(from, 'Startdatum'); checkDate(to, 'Enddatum');
    if (to < from) throw fail('Das Enddatum liegt vor dem Startdatum.');
    if (A.daysBetween(from, to) > 62) throw fail('Höchstens zwei Monate am Stück.');
    const ex = { id: A.uid('ex'), type: inp.type, from, to, label: String(inp.label || '').slice(0, 60) || ({ closed: 'Geschlossen', short: 'Verkürzt', special: 'Sonderöffnung' })[inp.type], by: ctx.actor, at: new Date().toISOString() };
    const lines = [];
    if (inp.type === 'short') {
      if (!inp.open && !inp.close) throw fail('Bei einem verkürzten Tag bitte angeben, bis wann (oder ab wann) geöffnet ist.');
      for (let d = from; d <= to; d = A.addDays(d, 1)) {
        const reg = H.weekly[A.weekday(d)], hol = A.holidayOn(d);
        if (hol) throw fail(A.fmtDate(d, { year: true }) + ' ist Feiertag (' + hol.name + ') und ohnehin geschlossen. Für eine Öffnung bitte eine Sonderöffnung mit Uhrzeit von–bis eintragen.');
        if (!reg) throw fail(A.fmtDate(d) + ' ist regulär Ruhetag (' + A.WD_LONG[A.weekday(d)] + ' geschlossen). Verkürzen geht nur an Öffnungstagen; für eine Öffnung an diesem Tag bitte eine Sonderöffnung mit Uhrzeit von–bis eintragen.', { code: 'closed_day', date: d });
        const o = inp.open ? A.toMin(checkTime(inp.open, 'Öffnungszeit')) : A.toMin(reg[0]), c = inp.close ? A.toMin(checkTime(inp.close, 'Schließzeit')) : A.toMin(reg[1]);
        if (o < A.toMin(reg[0]) || c > A.toMin(reg[1])) throw fail('Verkürzt heißt innerhalb der normalen Zeiten (' + A.WD[A.weekday(d)] + ' ' + A.timeShort(reg[0]) + '–' + A.timeShort(reg[1]) + ' Uhr). Für längere Zeiten bitte Sonderöffnung.');
        if (c <= o) throw fail('Die Schließzeit muss nach der Öffnungszeit liegen.');
      }
      ex.open = inp.open ? checkTime(inp.open) : null; ex.close = inp.close ? checkTime(inp.close) : null;
    }
    if (inp.type === 'special') {
      ex.open = checkTime(inp.open, 'Öffnungszeit'); ex.close = checkTime(inp.close, 'Schließzeit');
      if (A.toMin(ex.close) <= A.toMin(ex.open)) throw fail('Die Schließzeit muss nach der Öffnungszeit liegen.');
    }
    let affected = 0;
    for (let d = from; d <= to; d = A.addDays(d, 1)) if (A.dayHours(d).open) affected++;
    const r = A.tx({ label: describeEx(ex) + ' eingetragen', actor: ctx.actor, paths: [['hours', 'exceptions']], run: () => H.exceptions.push(ex) });
    const sum = ex.type === 'closed' ? 'Geschlossen ' + (from === to ? 'am ' + A.fmtDate(from) : A.fmtRange(from, to)) + (ex.label && ex.label !== 'Geschlossen' ? ' (' + ex.label + ')' : '')
      : ex.type === 'short' ? A.fmtDate(from) + (to !== from ? ' – ' + A.fmtDate(to) : '') + ': ' + (ex.open ? 'ab ' + A.timeShort(ex.open) + ' Uhr ' : '') + (ex.close ? 'nur bis ' + A.timeShort(ex.close) + ' Uhr' : '')
        : 'Sonderöffnung ' + A.fmtRange(from, to) + ', ' + A.timeShort(ex.open) + '–' + A.timeShort(ex.close) + ' Uhr';
    if (ex.type === 'closed') lines.push(affected ? affected + (affected === 1 ? ' Öffnungstag' : ' Öffnungstage') + ' betroffen; Website, KI-Chat und Terminbuchung wissen Bescheid.' : 'In diesem Zeitraum war ohnehin geschlossen.');
    lines.push(googleLine('Sonderzeiten'));
    return { summary: sum + '.', lines, entry: r.entry, data: { id: ex.id } };
  };
  function describeEx(ex) {
    const range = A.fmtRange(ex.from, ex.to);
    if (ex.type === 'closed') return (ex.label || 'Geschlossen') + ' ' + range;
    if (ex.type === 'short') return range + ' ' + (ex.open ? 'ab ' + A.timeShort(ex.open) + ' ' : '') + (ex.close ? 'bis ' + A.timeShort(ex.close) + ' Uhr' : '');
    return 'Sonderöffnung ' + range + ' ' + A.timeShort(ex.open) + '–' + A.timeShort(ex.close) + ' Uhr';
  }
  A.describeEx = describeEx;

  actions.set_weekly_hours = function (inp, ctx) {
    const days = list(inp.days).map(d => typeof d === 'number' ? d : DAYKEYS[String(d).toLowerCase().slice(0, 2)]);
    if (!days.length || days.some(d => d == null || d < 0 || d > 6)) throw fail('Wochentage fehlen oder sind ungültig.');
    let val = null;
    if (!inp.closed) {
      const o = A.toMin(inp.open), c = A.toMin(inp.close);
      if (o == null || c == null) throw fail('Bitte Öffnungs- und Schließzeit angeben (HH:MM) oder „geschlossen“.');
      if (c <= o) throw fail('Die Schließzeit muss nach der Öffnungszeit liegen.');
      if (o < 6 * 60 || c > 22 * 60) throw fail('Öffnungszeiten zwischen 6 und 22 Uhr, bitte prüfen.');
      val = [A.fromMin(o), A.fromMin(c)];
    }
    const names = days.map(d => A.WD[d]).join(', ');
    const r = A.tx({ label: 'Wochenzeiten ' + names + ': ' + (val ? A.timeShort(val[0]) + '–' + A.timeShort(val[1]) + ' Uhr' : 'geschlossen'), actor: ctx.actor, paths: [['hours', 'weekly']], run: () => days.forEach(d => S().hours.weekly[d] = val ? val.slice() : null) });
    if (!r.entry) return { summary: 'Keine Änderung: ' + names + ' ' + (val ? 'war schon ' + A.timeShort(val[0]) + '–' + A.timeShort(val[1]) + ' Uhr' : 'war schon geschlossen') + '.', lines: [] };
    return { summary: names + ': ' + (val ? A.timeShort(val[0]) + '–' + A.timeShort(val[1]) + ' Uhr' : 'ab jetzt Ruhetag') + '.', lines: ['Gilt ab sofort auf Website, im KI-Chat und für Termine (DE/FR/NL/EN).', googleLine('Öffnungszeiten')], entry: r.entry };
  };

  /* ---------- Artikeltexte ---------- */
  actions.update_article_text = function (inp, ctx) {
    const a = A.resolveArticle(inp.article);
    const field = inp.field;
    if (!A.FIELDS[field]) throw fail('Unbekanntes Feld.');
    const mode = inp.mode || 'set';
    const fname = A.FIELDS[field];
    if (mode === 'reset') {
      if (!a.overrides[field] || a.overrides[field].hidden) throw fail(fname + ' beim ' + a.name + ' hat keinen eigenen Wert.');
      const r = A.tx({ label: fname + ' beim ' + shortName(a) + ' auf Lieferantenwert zurückgesetzt', actor: ctx.actor, paths: [['articles', a.id, 'overrides', field]], run: () => { a.overrides[field].hidden = true; } });
      return { summary: field === 'racepoint_note' ? 'Racepoint-Hinweis beim ' + shortName(a) + ' entfernt (ausgeblendet).' : fname + ' beim ' + shortName(a) + ' zeigt wieder den Lieferantentext.', lines: [], entry: r.entry };
    }
    const t = inp.text || {};
    const de = String(t.de || '').trim();
    if (!de) throw fail('Der deutsche Text fehlt.');
    if (de.length > (field === 'title' ? 90 : field === 'teaser' ? 240 : 1500)) throw fail(fname + ' ist zu lang.');
    if (/<[^>]+>/.test(de)) throw fail('Bitte reinen Text ohne HTML.');
    // Übersetzungen: KI liefert sie im Aufruf; sonst Demo-Übersetzung oder "Übersetzung folgt"
    let text = { de }, status = {};
    const auto = A.translateDemo(de);
    ['fr', 'nl', 'en'].forEach(l => {
      const v = String(t[l] || '').trim();
      if (v) { text[l] = v; status[l] = ctx.actor === 'KI' ? 'ki' : (ctx.manualLangs && ctx.manualLangs.includes(l) ? 'manual' : 'ki'); }
      else { text[l] = auto.text[l]; status[l] = auto.status[l]; }
    });
    const cur = A.fieldValue(a, field);
    if (mode === 'append' && cur.text.de) {
      const joined = {};
      A.LANGS.forEach(l => { joined[l] = cur.text[l] && text[l] ? (cur.text[l].trim() + ' ' + text[l]) : (l === 'de' ? cur.text.de + ' ' + text.de : ''); if (l !== 'de' && !joined[l]) status[l] = 'pending'; });
      text = joined;
    }
    const check = A.checkLangs(text, status);
    const ov = { text, status, by: ctx.actor, at: new Date().toISOString(), check };
    const r = A.tx({ label: fname + ' beim ' + shortName(a) + (mode === 'append' && cur.text.de ? ' ergänzt' : ' geändert'), actor: ctx.actor, paths: [['articles', a.id, 'overrides', field]], run: () => { a.overrides[field] = ov; } });
    const pending = ['fr', 'nl', 'en'].filter(l => status[l] === 'pending');
    const lines = [pending.length ? 'DE ist live. ' + pending.map(x => x.toUpperCase()).join('/') + ': Übersetzung folgt (KI offline).' : 'Live in DE/FR/NL/EN, automatisch übersetzt.'];
    lines.push(check.ok ? 'Automatische Prüfung: Zahlen, Preise, Daten und Glossar stimmen in allen Sprachen.' : '⚠ Prüfung: ' + check.issues.map(i => i.msg).join('; '));
    return { summary: fname + ' beim ' + shortName(a) + ': „' + text.de + '“', lines, entry: r.entry, warn: !check.ok };
  };
  const shortName = a => a.name.split(' · ')[0];
  A.shortName = shortName;

  actions.apply_supplier_update = function (inp, ctx) {
    const a = A.resolveArticle(inp.article), up = a.supplierUpdates[inp.field];
    if (!up) throw fail('Kein Lieferanten-Update für dieses Feld.');
    const fname = A.FIELDS[inp.field];
    const r = A.tx({ label: (inp.accept ? 'Lieferanten-Update übernommen: ' : 'Lieferanten-Update ignoriert: ') + fname + ' beim ' + shortName(a), actor: ctx.actor, paths: [['articles', a.id, 'supplier', 'text', inp.field], ['articles', a.id, 'overrides', inp.field], ['articles', a.id, 'supplierUpdates', inp.field]], run: () => {
      a.supplier.text[inp.field] = up.text; // Vorlage immer aktualisieren
      if (inp.accept && a.overrides[inp.field]) a.overrides[inp.field].hidden = true;
      delete a.supplierUpdates[inp.field];
    } });
    return { summary: inp.accept ? fname + ' beim ' + shortName(a) + ' zeigt jetzt den neuen Lieferantentext.' : 'Dein eigener Text bleibt; die Lieferantenvorlage ist aktualisiert.', lines: [], entry: r.entry };
  };

  /* ---------- Sichtbarkeit ---------- */
  actions.set_article_visibility = function (inp, ctx) {
    const names = list(inp.articles);
    if (!names.length) throw fail('Welche Artikel?');
    const arts = [];
    names.forEach(n => { const hits = A.findArticles(n); if (!hits.length) throw fail('Keinen Artikel zu „' + n + '“ gefunden.'); if (hits.length > 1 && !/^(alle|all)\b/i.test(n) && hits.length > 1 && names.length === 1 && !inp.allowMany) throw fail('„' + n + '“ ist nicht eindeutig: ' + hits.map(a => a.name).join(' / ') + '.', { candidates: hits.map(a => a.id) }); hits.forEach(a => { if (!arts.includes(a)) arts.push(a); }); });
    const visible = inp.visible !== false;
    const change = arts.filter(a => a.visible !== visible);
    if (!change.length) return { summary: arts.map(shortName).join(', ') + (arts.length > 1 ? ' sind' : ' ist') + ' schon ' + (visible ? 'sichtbar' : 'ausgeblendet') + '.', lines: [] };
    if (!visible && change.length > 5 && !ctx.confirmed) return { needsConfirmation: true, summary: change.length + ' Artikel ausblenden? Das ist eine größere Änderung, bitte kurz bestätigen.', lines: change.map(a => a.name), confirm: { name: 'set_article_visibility', input: { articles: change.map(a => a.id), visible: false, allowMany: true }, label: change.length + ' Artikel ausblenden' } };
    const r = A.tx({ label: (change.length === 1 ? shortName(change[0]) : change.length + ' Artikel') + (visible ? ' eingeblendet' : ' ausgeblendet'), actor: ctx.actor, paths: change.map(a => ['articles', a.id, 'visible']), run: () => change.forEach(a => a.visible = visible) });
    return { summary: change.map(a => a.name).join(', ') + (change.length > 1 ? ' sind ' : ' ist ') + (visible ? 'wieder sichtbar.' : 'ausgeblendet.'), lines: [visible ? 'Wieder auf Website, im Shop und im KI-Chat.' : 'Nicht mehr auf Website, im Shop und im KI-Chat. Nichts gelöscht, jederzeit wieder einblendbar.'], entry: r.entry };
  };

  /* ---------- Medien ---------- */
  function attachmentMedia(id, ctx) {
    const att = ctx.attachments && ctx.attachments.get(id);
    if (!att) throw fail('Anhang ' + id + ' nicht gefunden. Bitte Datei erneut anhängen.');
    if (att.processing) throw fail('Anhang ' + id + ' wird noch verarbeitet.');
    return att;
  }
  const stripUrls = v => (v || []).map(x => { const y = Object.assign({}, x); delete y.url; return y; });
  function addMediaFromAtt(a, att, role, ctx) {
    const m = { id: A.uid('m'), role, kind: att.kind, name: att.name, focal: { x: 50, y: 50 }, variants: stripUrls(att.variants), width: att.width, height: att.height, bytes: att.bytes, duration: att.duration, by: ctx.actor, at: new Date().toISOString(), thumbKey: att.thumbKey, session: true, transcode: att.kind === 'video' ? { startedAt: Date.now() } : undefined };
    A.blobs.set(m.id, A.blobs.get(att.id));
    a.media.push(m);
    a.gallery = (a.gallery || []).concat(m.id);
    return m;
  }
  actions.set_article_media = function (inp, ctx) {
    const a = A.resolveArticle(inp.article);
    const atts = list(inp.attachments).map(id => attachmentMedia(id, ctx));
    const lines = [], parts = [];
    const ids = a.supplier.images.map(i => i.id);
    const hide = inp.hide_supplier_images === 'all' ? ids : list(inp.hide_supplier_images);
    const show = inp.show_supplier_images === 'all' ? ids : list(inp.show_supplier_images);
    hide.concat(show).forEach(id => { if (!ids.includes(id)) throw fail('Herstellerbild ' + id + ' gibt es beim ' + shortName(a) + ' nicht.'); });
    if (inp.youtube_url && !/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/.test(inp.youtube_url)) throw fail('Das ist kein gültiger YouTube-Link.');
    if (inp.order && (!Array.isArray(inp.order) || inp.order.some(id => !A.mediaList(a).some(m => m.id === id)))) throw fail('Ungültige Reihenfolge.');
    if (inp.focal && (!a.media.some(m => m.id === inp.focal.media) || !(inp.focal.x >= 0 && inp.focal.x <= 100 && inp.focal.y >= 0 && inp.focal.y <= 100))) throw fail('Ungültiger Fokuspunkt.');
    if (inp.hide_media && !a.media.some(m => m.id === inp.hide_media && !m.hidden)) throw fail('Dieses Medium gibt es nicht.');
    if (!atts.length && !hide.length && !show.length && !inp.cover && !inp.youtube_url && !inp.order && !inp.focal && !inp.hide_media && !inp.set_role) throw fail('Was soll an den Medien passieren? Bitte Dateien anhängen oder Titelbild/Herstellerbilder angeben.');
    let role = inp.role;
    const r = A.tx({ label: 'Medien', actor: ctx.actor, paths: [['articles', a.id, 'media'], ['articles', a.id, 'gallery'], ['articles', a.id, 'cover'], ['articles', a.id, 'hiddenSupplier'], ['articles', a.id, 'hero']], run: () => {
      const added = atts.map(att => {
        const rr = role || (att.kind === 'video' ? 'video' : 'gallery');
        if (rr === 'hero' && atts.length > 1 && att !== atts[0]) return addMediaFromAtt(a, att, att.kind === 'video' ? 'video' : 'gallery', ctx);
        return addMediaFromAtt(a, att, rr, ctx);
      });
      const imgs = added.filter(m => m.kind === 'image'), vids = added.filter(m => m.kind === 'video');
      if (imgs.length) parts.push(imgs.length + (imgs.length === 1 ? ' eigenes Foto' : ' eigene Fotos') + ' hinzugefügt');
      if (vids.length) parts.push(vids.length === 1 ? 'Video hinzugefügt' : vids.length + ' Videos hinzugefügt');
      const heroM = added.find(m => m.role === 'hero');
      if (heroM) { a.hero = heroM.id; parts.push('als Hero oben auf der Artikelseite gesetzt' + (heroM.kind === 'video' ? ' (Video)' : '')); if (heroM.kind === 'video') lines.push('Poster erzeugt. MP4 1080p/720p/480p und Hero-Loop (max. 15 s) werden umgerechnet (Demo-Simulation).'); lines.push('Mobil: Ausschnitt 9:16 über den Fokuspunkt, eigene Mobilvariante optional.'); }
      if (inp.set_role) { const m = a.media.find(x => x.id === inp.set_role.media); if (!m) throw fail('Dieses Medium gibt es nicht.'); m.role = inp.set_role.role; if (m.role === 'hero') { a.hero = m.id; parts.push('Hero gesetzt'); } else if (a.hero === m.id) { a.hero = null; parts.push('Hero entfernt'); } else parts.push('Rolle geändert'); }
      if (inp.youtube_url) {
        const yid = /([\w-]{11})(?:[?&].*)?$/.exec(inp.youtube_url.replace(/.*(?:v=|youtu\.be\/|shorts\/|embed\/)/, ''))[1];
        const film = A.FILMS.find(f => f.id === yid);
        const m = { id: A.uid('m'), role: 'video', kind: 'youtube', youtube: yid, name: film ? film.title : 'YouTube ' + yid, src: film ? A.filmPoster(yid) : 'https://img.youtube.com/vi/' + yid + '/hqdefault.jpg', focal: { x: 50, y: 50 }, by: ctx.actor, at: new Date().toISOString() };
        a.media.push(m); a.gallery.push(m.id); parts.push('YouTube-Video verknüpft');
      }
      if (hide.length) { hide.forEach(id => { if (!a.hiddenSupplier.includes(id)) a.hiddenSupplier.push(id); }); parts.push(hide.length === ids.length ? 'alle ' + ids.length + ' Herstellerbilder ausgeblendet' : hide.length + ' Herstellerbild' + (hide.length > 1 ? 'er' : '') + ' ausgeblendet'); }
      if (show.length) { a.hiddenSupplier = a.hiddenSupplier.filter(id => !show.includes(id)); parts.push(show.length + ' Herstellerbild' + (show.length > 1 ? 'er' : '') + ' wieder eingeblendet'); }
      if (inp.hide_media) { const m = a.media.find(x => x.id === inp.hide_media); m.hidden = true; if (a.hero === m.id) a.hero = null; parts.push('„' + m.name + '“ ausgeblendet'); }
      if (inp.order) { a.gallery = inp.order.concat((a.gallery || []).filter(id => !inp.order.includes(id))); parts.push('Reihenfolge geändert'); }
      if (inp.focal) { const m = a.media.find(x => x.id === inp.focal.media); m.focal = { x: Math.round(inp.focal.x), y: Math.round(inp.focal.y) }; parts.push('Fokuspunkt bei „' + m.name + '“ gesetzt'); }
      if (inp.cover) {
        let target = inp.cover === 'first' ? imgs[0] && imgs[0].id : inp.cover;
        if (atts.some(x => x.id === inp.cover)) target = added[atts.findIndex(x => x.id === inp.cover)].id;
        const m = A.mediaList(a).find(x => x.id === target);
        if (!m) throw fail('Das Titelbild muss ein Foto dieses Artikels sein.');
        if (m.kind !== 'image') throw fail('Titelbild muss ein Foto sein, kein Video.');
        a.cover = m.id; if (!m.supplier) { const front = inp.cover === 'first' ? added.map(x => x.id) : [m.id]; a.gallery = front.concat(a.gallery.filter(id => !front.includes(id))); }
        if (m.supplier && a.hiddenSupplier.includes(m.id)) throw fail('Dieses Herstellerbild ist ausgeblendet und kann kein Titelbild sein.');
        parts.push('Titelbild: „' + m.name + '“');
      }
      const visible = A.mediaList(a).filter(m => !m.hidden && m.kind === 'image');
      if (!visible.length) throw fail('Dann hätte der ' + shortName(a) + ' kein einziges Bild mehr. Bitte zuerst ein eigenes Foto hochladen.');
      if (!visible.some(m => m.id === a.cover)) { a.cover = visible[0].id; parts.push('Titelbild automatisch: „' + visible[0].name + '“'); }
    } });
    if (r.entry) r.entry.label = shortName(a) + ': ' + parts.join(', ');
    A.save();
    if (atts.some(x => x.kind === 'image')) { const v = atts.find(x => x.kind === 'image'); lines.unshift('Je Foto ' + (v.variants || []).length + ' Bildvarianten erzeugt (' + [...new Set((v.variants || []).map(x => x.format.toUpperCase()))].join('/') + ', ' + [...new Set((v.variants || []).map(x => x.w))].join('/') + ' px).'); }
    if (hide.length) lines.push('Herstellerbilder sind nur ausgeblendet, nicht gelöscht.');
    return { summary: shortName(a) + ': ' + parts.join(', ') + '.', lines, entry: r.entry };
  };

  /* ---------- Seiten-Hero ---------- */
  actions.set_page_hero = function (inp, ctx) {
    const page = A.PAGES.find(p => p.id === inp.page);
    if (!page) throw fail('Unbekannte Website-Seite.');
    const H = S().heroes, slots = (H[page.id] = H[page.id] || []);
    if (inp.remove) {
      const slot = slots.find(x => x.id === inp.remove && !x.hidden);
      if (!slot) throw fail('Diesen Hero gibt es nicht (mehr).');
      const r = A.tx({ label: page.name + ': Hero „' + (slot.label || slot.headline.de) + '“ entfernt', actor: ctx.actor, paths: [['heroes', page.id]], run: () => { slot.hidden = true; } });
      return { summary: page.name + ': Hero entfernt (ausgeblendet). ' + (A.activeHero(page.id).builtin ? 'Es gilt wieder der eingebaute Standard.' : ''), lines: [], entry: r.entry };
    }
    let media = null;
    if (inp.attachment) {
      const att = attachmentMedia(inp.attachment, ctx);
      const id = A.uid('hm'); A.blobs.set(id, A.blobs.get(att.id));
      media = { id, kind: att.kind, name: att.name, thumbKey: att.thumbKey, variants: stripUrls(att.variants), width: att.width, height: att.height, duration: att.duration, session: true, transcode: att.kind === 'video' ? { startedAt: Date.now() } : undefined };
    } else if (inp.library) {
      if (!A.LIBRARY.includes(inp.library)) throw fail('Bild nicht in der Mediathek.');
      media = { id: A.uid('hm'), kind: 'image', name: inp.library.split('/').pop(), src: inp.library };
    }
    if (inp.mobile) { const att = attachmentMedia(inp.mobile, ctx); const id = A.uid('hm'); A.blobs.set(id, A.blobs.get(att.id)); if (media) media.mobile = { id, thumbKey: att.thumbKey, name: att.name }; }
    if (!media) throw fail('Bitte ein Bild oder Video für den Hero anhängen oder auswählen.');
    if (inp.from || inp.to) {
      if (!inp.from || !inp.to) throw fail('Für einen Zeitraum bitte Start und Ende angeben.');
      if (!A.isoDate(inp.from) || !A.isoDate(inp.to)) throw fail('Zeitraum ungültig (JJJJ-MM-TT).');
      if (inp.to < inp.from) throw fail('Das Ende liegt vor dem Start.');
      if (inp.to < A.today()) throw fail('Dieser Zeitraum ist schon vorbei.');
    }
    const t = inp.headline || {};
    const de = String(t.de || '').trim() || page.def.headline.de;
    if (de.length > 80) throw fail('Überschrift ist zu lang (max. 80 Zeichen).');
    const auto = A.translateDemo(de), text = { de }, status = {};
    ['fr', 'nl', 'en'].forEach(l => { if (t[l]) { text[l] = t[l]; status[l] = 'ki'; } else if (de === page.def.headline.de) { text[l] = page.def.headline[l]; status[l] = 'ki'; } else { text[l] = auto.text[l]; status[l] = auto.status[l]; } });
    const slot = { id: A.uid('hero'), media, focal: inp.focal || { x: 50, y: 50 }, headline: text, status, check: A.checkLangs(text, status), from: inp.from || null, to: inp.to || null, label: String(inp.label || '').slice(0, 40), by: ctx.actor, at: new Date().toISOString() };
    const r = A.tx({ label: page.name + ': neuer Hero' + (slot.from ? ' ' + A.fmtRange(slot.from, slot.to, { weekday: false }) : ''), actor: ctx.actor, paths: [['heroes', page.id]], run: () => slots.push(slot) });
    const active = A.activeHero(page.id);
    const lines = [slot.from ? 'Aktiv ' + A.fmtRange(slot.from, slot.to) + (active.id === slot.id ? ' (läuft schon).' : '; davor und danach gilt der bisherige Hero.') : 'Gilt ab sofort dauerhaft.', 'Überschrift: „' + text.de + '“ · ' + (['fr', 'nl', 'en'].some(l => status[l] === 'pending') ? 'Übersetzung folgt (KI offline)' : 'DE/FR/NL/EN'), media.kind === 'video' ? 'Poster erzeugt, MP4 1080/720/480 + Loop (max. 15 s) laufen (Demo-Simulation).' : 'Bildvarianten 480–2400 px; Ausschnitte für 16:9, 1:1 und 9:16 über den Fokuspunkt.'];
    return { summary: page.name + '-Seite: neuer Hero (' + (media.kind === 'video' ? 'Video' : 'Bild') + ' „' + media.name + '“).', lines, entry: r.entry };
  };
  A.activeHero = function (pageId, date) {
    const d = date || A.today(), page = A.PAGES.find(p => p.id === pageId);
    const slots = (S().heroes[pageId] || []).filter(s => !s.hidden);
    const sched = slots.filter(s => s.from && s.from <= d && d <= s.to).pop();
    const perm = slots.filter(s => !s.from).pop();
    return sched || perm || { id: 'builtin', builtin: true, media: page.def, headline: page.def.headline, focal: { x: 50, y: 50 } };
  };

  /* ---------- Banner ---------- */
  const PRICE_RX = /(\d\s?%|%|€|\beur\b|\brabatt|\breduziert|\bstatt\b|\bkorting|\bremise\b|\bréduction|\bdiscount|\boff\b|\bprix\b|\bpreis|\bsale\b|\bsoldes?\b|\bgratis\b)/i;
  actions.create_banner = function (inp, ctx) {
    const t = inp.text || {}, de = String(t.de || '').trim();
    if (!de) throw fail('Bannertext fehlt.');
    if (de.length > 120) throw fail('Bannertext zu lang (max. 120 Zeichen).');
    checkDate(inp.from, 'Startdatum'); checkDate(inp.to, 'Enddatum');
    if (inp.to < inp.from) throw fail('Das Ende liegt vor dem Start.');
    if (inp.link && !/^(\/[\w\-./?#=&]*|https:\/\/(www\.)?racepoint\.be(\/.*)?)$/.test(inp.link)) throw fail('Links nur auf eigene Seiten (z. B. /werkstatt) oder racepoint.be.');
    const auto = A.translateDemo(de), text = { de }, status = {};
    ['fr', 'nl', 'en'].forEach(l => { if (t[l]) { text[l] = t[l]; status[l] = 'ki'; } else { text[l] = auto.text[l]; status[l] = auto.status[l]; } });
    // Preisnennung erkennt die App selbst, unabhängig von der Angabe der KI
    const price = !!inp.mentions_price || A.LANGS.some(l => PRICE_RX.test(text[l] || ''));
    const b = { id: A.uid('ban'), text, status, check: A.checkLangs(text, status), from: inp.from, to: inp.to, link: inp.link || '', price, discount: inp.discount_percent || null, scope: inp.scope || '', state: price ? 'draft' : 'live', by: ctx.actor, at: new Date().toISOString() };
    const r = A.tx({ label: 'Banner „' + de + '“ ' + (price ? 'als Entwurf angelegt' : 'angelegt'), actor: ctx.actor, paths: [['banners']], run: () => S().banners.push(b) });
    const lines = ['Zeitraum ' + A.fmtRange(b.from, b.to) + ' · ' + (['fr', 'nl', 'en'].some(l => status[l] === 'pending') ? 'DE, Übersetzung folgt (KI offline)' : 'DE/FR/NL/EN'), b.check.ok ? 'Prüfung: Zahlen in allen Sprachen gleich.' : '⚠ ' + b.check.issues.map(i => i.msg).join('; ')];
    if (price) {
      lines.push('Omnibus-Regel (EU): Wird ein Streichpreis oder Rabatt gezeigt, muss der Referenzpreis der niedrigste Preis der letzten 30 Tage sein.');
      return { needsConfirmation: true, summary: 'Banner „' + de + '“ für ' + A.fmtRange(b.from, b.to) + ' ist als Entwurf angelegt. Er nennt einen Preis/Rabatt, daher erst nach deiner Bestätigung live.', lines, entry: r.entry, confirm: { name: 'publish_banner', input: { id: b.id }, label: 'Prüfen & veröffentlichen', omnibus: true } };
    }
    return { summary: 'Banner „' + de + '“ für ' + A.fmtRange(b.from, b.to) + ' angelegt' + (b.from <= A.today() ? ' und live.' : ', startet automatisch.'), lines, entry: r.entry };
  };
  actions.publish_banner = function (inp, ctx) {
    const b = S().banners.find(x => x.id === inp.id && !x.hidden);
    if (!b) throw fail('Banner nicht gefunden.');
    if (b.price && !(ctx.confirmed && ctx.actor === 'Achim')) throw fail('Banner mit Preisen veröffentlicht nur Achim selbst per Bestätigung in der App.');
    if (b.price && !inp.omnibus_checked) throw fail('Bitte bestätigen, dass der Referenzpreis der niedrigste Preis der letzten 30 Tage ist (Omnibus).');
    const r = A.tx({ label: 'Banner „' + b.text.de + '“ veröffentlicht', actor: ctx.actor, paths: [['banners']], run: () => { b.state = 'live'; b.omnibusChecked = !!inp.omnibus_checked; } });
    return { summary: 'Banner „' + b.text.de + '“ ist freigegeben' + (b.from <= A.today() ? ' und live.' : ' und startet am ' + A.fmtDate(b.from) + '.'), lines: [], entry: r.entry };
  };
  actions.set_banner = function (inp, ctx) {
    const b = S().banners.find(x => x.id === inp.id && !x.hidden);
    if (!b) throw fail('Banner nicht gefunden.');
    const r = A.tx({ label: 'Banner „' + b.text.de + '“ ' + (inp.hide ? 'entfernt' : inp.paused ? 'pausiert' : 'fortgesetzt'), actor: ctx.actor, paths: [['banners']], run: () => { if (inp.hide) b.hidden = true; else b.paused = !!inp.paused; } });
    return { summary: 'Banner „' + b.text.de + '“ ' + (inp.hide ? 'entfernt (ausgeblendet).' : inp.paused ? 'pausiert.' : 'läuft wieder.'), lines: [], entry: r.entry };
  };

  /* ---------- Module (im Code gebaut, hier nur konfiguriert) ---------- */
  actions.set_module = function (inp, ctx) {
    const m = S().modules[inp.module];
    if (!m) throw fail('Unbekanntes Modul.');
    if (inp.from || inp.to) { if (!A.isoDate(inp.from || m.from) || !A.isoDate(inp.to || m.to) || (inp.to || m.to) < (inp.from || m.from)) throw fail('Zeitraum ungültig.'); }
    if (inp.door) { const d = inp.door; if (!(d.n >= 1 && d.n <= 24)) throw fail('Türchen 1–24.'); if (d.code && !/^[A-Z0-9-]{3,20}$/.test(d.code)) throw fail('Gutscheincode: 3–20 Zeichen, nur A–Z, 0–9 und Bindestrich.'); if ((d.text || '').length > 200) throw fail('Text zu lang.'); }
    const label = inp.door ? 'Adventskalender: Türchen ' + inp.door.n + ' bearbeitet' : inp.enabled !== undefined ? 'Adventskalender ' + (inp.enabled ? 'eingeschaltet' : 'ausgeschaltet') : 'Adventskalender: Zeitraum geändert';
    const r = A.tx({ label, actor: ctx.actor, paths: [['modules', inp.module]], run: () => {
      if (inp.enabled !== undefined) m.enabled = !!inp.enabled;
      if (inp.from) m.from = inp.from; if (inp.to) m.to = inp.to;
      if (inp.door) Object.assign(m.doors[inp.door.n - 1], { text: inp.door.text || '', code: inp.door.code || '', image: inp.door.image === undefined ? m.doors[inp.door.n - 1].image : inp.door.image });
    } });
    return { summary: label + '.', lines: [], entry: r.entry };
  };

  /* ---------- Termine ---------- */
  A.checkSlot = function (type, start, ignoreId) {
    const rule = S().appointments.rules[type];
    if (!rule) throw fail('Unbekannte Terminart.');
    const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})$/.exec(start || '');
    if (!m) throw fail('Termin bitte als Datum und Uhrzeit angeben.');
    const date = m[1], from = A.toMin(m[2]), to = from + rule.minutes, problems = [];
    if (date < A.today()) problems.push('liegt in der Vergangenheit');
    const dh = A.dayHours(date);
    if (dh.reason === 'holiday') problems.push('Feiertag (' + dh.label + ')');
    else if (dh.reason === 'closed') problems.push('Laden geschlossen (' + dh.label + ')');
    if (!rule.days.includes(A.weekday(date))) problems.push(rule.name + ' nur ' + rule.days.map(d => A.WD[d]).join('/'));
    if (from < A.toMin(rule.window[0]) || to > A.toMin(rule.window[1])) problems.push('außerhalb ' + A.timeShort(rule.window[0]) + '–' + A.timeShort(rule.window[1]) + ' Uhr (' + rule.minutes + ' Min.)');
    if (rule.shopHours && dh.open && (from < A.toMin(dh.from) || to > A.toMin(dh.to))) problems.push('außerhalb der Öffnungszeit ' + A.timeShort(dh.from) + '–' + A.timeShort(dh.to));
    if (rule.shopHours && !dh.open && dh.reason === 'weekly') problems.push('Ruhetag');
    const same = S().appointments.requests.filter(r => r.status === 'confirmed' && r.id !== ignoreId && r.start.slice(0, 10) === date);
    if (same.filter(r => r.type === type).length >= rule.perDay) problems.push('Tageskapazität (' + rule.perDay + ') erreicht');
    same.forEach(r => { const rr = S().appointments.rules[r.type]; if (rr.resource !== rule.resource) return; const a = A.toMin(r.start.slice(11)), b = a + rr.minutes; if (from < b + rule.buffer && a < to + rule.buffer) problems.push('überschneidet ' + rr.name + ' ' + A.timeShort(r.start.slice(11)) + ' Uhr inkl. ' + rule.buffer + ' Min. Puffer'); });
    return { ok: !problems.length, problems, date, from: A.fromMin(from), to: A.fromMin(to), rule };
  };
  A.suggestSlot = function (type, afterDate) {
    for (let i = 0; i < 30; i++) {
      const d = A.addDays(afterDate || A.today(), i + 1);
      const rule = S().appointments.rules[type];
      for (let t = A.toMin(rule.window[0]); t + rule.minutes <= A.toMin(rule.window[1]); t += 30) { const s = d + 'T' + A.fromMin(t); if (A.checkSlot(type, s).ok) return s; }
    }
    return null;
  };
  A.fmtSlot = s => A.fmtDate(s.slice(0, 10)) + ', ' + A.timeShort(s.slice(11)) + ' Uhr';
  actions.respond_appointment = function (inp, ctx) {
    const R = S().appointments.requests, req = R.find(r => r.id === inp.id);
    if (!req) throw fail('Terminanfrage ' + inp.id + ' nicht gefunden.');
    if (req.status !== 'open' && req.status !== 'proposed') throw fail('Diese Anfrage ist schon erledigt (' + req.status + ').');
    const rule = S().appointments.rules[req.type];
    if (inp.action === 'confirm') {
      const c = A.checkSlot(req.type, req.start, req.id);
      if (!c.ok) { const alt = A.suggestSlot(req.type, A.addDays(req.start.slice(0, 10), -1)); throw fail('Wunschtermin ' + A.fmtSlot(req.start) + ' geht nicht: ' + c.problems.join(', ') + '.' + (alt ? ' Nächster freier Termin: ' + A.fmtSlot(alt) + '.' : ''), { suggestion: alt }); }
      const r = A.tx({ label: 'Termin bestätigt: ' + rule.name + ' ' + A.fmtSlot(req.start) + ' (' + req.who + ')', actor: ctx.actor, paths: [['appointments', 'requests']], run: () => { req.status = 'confirmed'; req.doneAt = new Date().toISOString(); } });
      return { summary: 'Bestätigt: ' + rule.name + ', ' + A.fmtDate(c.date) + ', ' + A.timeShort(c.from) + '–' + A.timeShort(c.to) + ' Uhr (' + req.who + ').', lines: ['Über die eTermin-API bestätigt. Bestätigungsmail (' + req.lang.toUpperCase() + '), Erinnerung und Google-Kalender-Sync übernimmt eTermin (Demo).'], entry: r.entry };
    }
    if (inp.action === 'propose') {
      const c = A.checkSlot(req.type, inp.start, req.id);
      if (!c.ok) throw fail('Vorschlag ' + (inp.start ? A.fmtSlot(inp.start) : '') + ' geht nicht: ' + c.problems.join(', ') + '.');
      const r = A.tx({ label: 'Neuer Terminvorschlag an ' + req.who + ': ' + A.fmtSlot(inp.start), actor: ctx.actor, paths: [['appointments', 'requests']], run: () => { req.status = 'proposed'; req.proposed = inp.start; req.message = String(inp.message || '').slice(0, 300); req.doneAt = new Date().toISOString(); } });
      return { summary: 'Vorschlag an ' + req.who + ': ' + rule.name + ', ' + A.fmtSlot(inp.start) + '.', lines: ['Umbuchung über die eTermin-API; die E-Mail an den Kunden verschickt eTermin (Demo).'], entry: r.entry };
    }
    if (inp.action === 'decline') {
      const r = A.tx({ label: 'Terminanfrage abgelehnt: ' + rule.name + ' (' + req.who + ')', actor: ctx.actor, paths: [['appointments', 'requests']], run: () => { req.status = 'declined'; req.message = String(inp.message || '').slice(0, 300); req.doneAt = new Date().toISOString(); } });
      return { summary: 'Anfrage von ' + req.who + ' (' + rule.name + ') abgelehnt.', lines: ['In eTermin storniert; die Absage-Mail verschickt eTermin (Demo).'], entry: r.entry };
    }
    throw fail('Aktion bestätigen, vorschlagen oder ablehnen.');
  };
  // Regeln (Dauer, Tage, Kapazität) pflegt Achim in eTermin. In der App nur eine Notiz je Leistung für die KI.
  actions.set_appointment_note = function (inp, ctx) {
    const rule = S().appointments.rules[inp.type];
    if (!rule) throw fail('Unbekannte Leistung.');
    const note = String(inp.note || '').trim();
    if (note.length > 300) throw fail('Notiz zu lang (max. 300 Zeichen).');
    const r = A.tx({ label: 'KI-Notiz für ' + rule.name + (note ? ': „' + note + '“' : ' entfernt'), actor: ctx.actor, paths: [['appointments', 'rules', inp.type, 'note']], run: () => { rule.note = note; } });
    return { summary: note ? 'Der KI-Chat sagt bei ' + rule.name + ' jetzt dazu: „' + note + '“' : 'Notiz für ' + rule.name + ' entfernt.', lines: [], entry: r.entry };
  };

  /* ---------- Lesen ---------- */
  actions.list_appointments = function (inp) {
    const R = S().appointments.requests.filter(r => inp.status === 'all' || r.status === 'open');
    return { read: true, source: 'eTermin (Demo)', summary: R.length ? R.length + (inp.status === 'all' ? ' Buchungen aus eTermin' : ' unbestätigte Buchungen aus eTermin') + '.' : 'Keine unbestätigten Buchungen.', lines: R.map(r => { const c = A.checkSlot(r.type, r.start, r.id); const rn = S().appointments.rules[r.type]; return r.id + ' · ' + rn.name + (rn.note ? ' [Notiz: ' + rn.note + ']' : '') + ' · ' + A.fmtSlot(r.start) + ' · ' + r.who + (r.status === 'open' ? (c.ok ? ' · passt' : ' · Konflikt: ' + c.problems.join(', ')) : ' · ' + r.status); }), data: R.map(r => ({ id: r.id, type: r.type, start: r.start, who: r.who, status: r.status, note: r.note, fits: A.checkSlot(r.type, r.start, r.id) })), rules: S().appointments.rules };
  };
  actions.find_article = function (inp) {
    const hits = inp.query ? A.findArticles(inp.query) : Object.values(S().articles);
    const all = hits.length ? hits : Object.values(S().articles).filter(a => (a.name + a.id).toLowerCase().includes(String(inp.query || '').toLowerCase()));
    return { read: true, summary: all.length ? all.length + ' Treffer.' : 'Kein Artikel gefunden.', lines: all.map(a => a.name + (a.visible ? '' : ' (ausgeblendet)')), data: all.map(a => ({ id: a.id, name: a.name, category: A.CATS[a.cat], visible: a.visible, supplier_images: a.supplier.images.map(i => i.id), hidden_supplier_images: a.hiddenSupplier, own_media: a.media.filter(m => !m.hidden).map(m => ({ id: m.id, role: m.role, kind: m.kind, name: m.name })), cover: a.cover, overrides: Object.keys(a.overrides).filter(k => !a.overrides[k].hidden), erp: (() => { const e = A.erpFor(a.id); return { stock: e.stock, shop_price_from: e.price, variants: e.rows.length, read_only: true }; })() })) };
  };
  actions.query_stats = function (inp) {
    const metric = inp.metric || 'overview';
    const [from, to, label] = A.periodRange(inp.period || 'week');
    const r = A.statsRange(from, to);
    const len = A.daysBetween(from, to) + 1;
    const prev = A.statsRange(A.addDays(from, -7), A.addDays(to, -7), to === A.today() ? A.addDays(to, -7) : 'none');
    const pct = (a, b) => b ? (a >= b ? '+' : '') + Math.round((a - b) / b * 100) + ' %' : '';
    const range = ' (' + A.fmtRange(from, to) + ')';
    const topTopics = Object.entries(r.topics).sort((a, b) => b[1] - a[1]);
    let summary, lines = [];
    if (metric === 'chat') { summary = 'KI-Chat ' + label + range + ': ' + r.chats + ' Gespräche, Ø ' + Math.round(r.chats / len) + ' pro Tag.'; lines = [(len <= 7 ? 'Gleicher Zeitraum eine Woche davor: ' + prev.chats + ' (' + pct(r.chats, prev.chats) + ').' : ''), 'Häufigste Themen: ' + topTopics.slice(0, 3).map(([k, v]) => k + ' ' + v).join(', ') + '.', r.handoffs + ' Übergaben an dich, ' + r.appointments + ' Terminanfragen, ' + r.unanswered + ' Fragen ohne Antwort.'].filter(Boolean); }
    else if (metric === 'visits') { summary = 'Website ' + label + range + ': ' + r.visits.toLocaleString('de-BE') + ' Besuche (cookielos gezählt).'; lines = [len <= 7 ? 'Woche davor: ' + prev.visits.toLocaleString('de-BE') + ' (' + pct(r.visits, prev.visits) + ').' : '', Math.round(r.chats / Math.max(1, r.visits) * 100) + ' % der Besuche nutzen den KI-Chat.'].filter(Boolean); }
    else if (metric === 'topics') { summary = 'Themen im KI-Chat ' + label + ': ' + topTopics.map(([k, v]) => k + ' ' + v).join(', ') + '.'; }
    else if (metric === 'top_bikes') { summary = 'Meistgefragte Bikes ' + label + ': ' + A.TOP_BIKES.slice(0, 5).map(([n, w]) => n + ' (' + Math.round(r.topics.Beratung * w * 1.6) + ')').join(', ') + '.'; }
    else if (metric === 'handoffs') { summary = r.handoffs + ' Übergaben an dich ' + label + range + '.'; }
    else if (metric === 'appointments') { summary = r.appointments + ' Terminanfragen aus dem KI-Chat ' + label + '; offen: ' + S().appointments.requests.filter(x => x.status === 'open').length + '.'; }
    else if (metric === 'unanswered') { summary = 'Diese Fragen konnte die KI zuletzt nicht beantworten:'; lines = A.UNANSWERED.map(u => '„' + u.q + '“ (' + u.n + '×)'); }
    else if (metric === 'costs') { const c = A.kiCost(); summary = 'KI-Kosten diesen Monat: ' + A.usd(c.total) + ' von ' + A.usd(c.limit) + ' Limit (' + Math.round(c.total / c.limit * 100) + ' %).'; lines = ['Besucher-Chat ' + A.usd(c.visitorChat) + ', Assistent ' + A.usd(c.admin) + '.']; }
    else if (metric === 'erp') { summary = A.erpStale() ? 'ERP-Abgleich: letzter Abgleich ' + A.ago(A.erpSyncedAt()) + ' – Warnung! Die Website zeigt „Preis im Laden erfragen“.' : 'ERP-Abgleich: letzter Abgleich ' + A.ago(A.erpSyncedAt()) + ', alles aktuell (' + A.erp.rows.length + ' Varianten).'; }
    else { summary = label[0].toUpperCase() + label.slice(1) + range + ': ' + r.visits.toLocaleString('de-BE') + ' Besuche, ' + r.chats + ' KI-Gespräche, ' + r.handoffs + ' Übergaben, ' + r.appointments + ' Terminanfragen.'; }
    return { read: true, summary, lines, data: { metric, from, to, visits: r.visits, chats: r.chats, handoffs: r.handoffs, appointments: r.appointments, unanswered: r.unanswered, topics: r.topics, previous_week: { visits: prev.visits, chats: prev.chats } } };
  };
  actions.undo = function (inp, ctx) {
    const res = A.undo(inp.history_id, ctx.actor);
    return { summary: 'Rückgängig gemacht: ' + res.original.label + '.', lines: [], entry: res.entry, undo: true };
  };
  actions.set_setting = function (inp) {
    const allowed = ['googleMaps', 'erpOutage', 'kiLimitUsd'];
    if (!allowed.includes(inp.key)) throw fail('Unbekannte Einstellung.');
    S().settings[inp.key] = inp.value; A.save(); A.emit('change', {});
    return { summary: 'Gespeichert.', lines: [] };
  };

  /* ---------- Ausführen ---------- */
  A.run = function (name, input, ctx) {
    ctx = Object.assign({ actor: 'Achim' }, ctx || {});
    const fn = actions[name];
    try {
      if (!fn) throw fail('Unbekannte Aktion.');
      if (ctx.actor === 'KI' && !AI_TOOLS.includes(name)) throw fail('Diese Aktion darf der Assistent nicht ausführen.');
      if (ctx.actor === 'KI') ctx.confirmed = false; // Bestätigen kann nur Achim per Tippen
      const res = fn(input || {}, ctx) || {};
      if (res.entry) { res.entry.actor = ctx.actor; res.entry.via = ctx.via || (ctx.actor === 'KI' ? 'Assistent' : 'Formular'); A.save(); }
      res.lines = (res.lines || []).filter(Boolean);
      if (res.summary) res.summary = res.summary.replace(/\.\.$/, '.').replace(/\.\. /g, '. ');
      return Object.assign({ ok: true, name }, res, { historyId: res.entry && res.entry.id });
    } catch (e) {
      if (!e.validation) console.error(e);
      return { ok: false, name, error: e.validation ? e.message : 'Unerwarteter Fehler: ' + e.message, candidates: e.candidates, suggestion: e.suggestion, code: e.code, date: e.date };
    }
  };
  // Kurzform für das Modell (kein Base64, nur Ergebnis)
  A.resultForModel = function (res) {
    if (!res.ok) return JSON.stringify({ ok: false, error: res.error, candidates: res.candidates, suggestion: res.suggestion });
    return JSON.stringify({ ok: true, summary: res.summary, details: res.lines, needs_confirmation_in_app: !!res.needsConfirmation, history_id: res.historyId, data: res.data }).slice(0, 11000);
  };
  A.actions = actions;

  /* ---------- Demo-Verlauf beim ersten Start (über dieselben Aktionen) ---------- */
  A.seedHistory = function () {
    const s = A.state, t = A.today(), ago = (d, hm) => new Date(new Date(A.addDays(t, -d) + 'T' + hm + ':00Z').getTime() - 2 * 3600000).toISOString();
    const runAt = (at, name, inp, actor) => { const r = A.run(name, inp, { actor: actor || 'Achim', confirmed: true, via: 'Demo-Start' }); if (r.entry) { r.entry.at = at; const ov = inp.field && s.articles[inp.article] && s.articles[inp.article].overrides[inp.field]; if (ov) ov.at = at; const b = name === 'create_banner' && s.banners[s.banners.length - 1]; if (b) b.at = at; } return r; };
    runAt(ago(3, '17:20'), 'update_article_text', { article: 'roubaix-sl8-tiagra', field: 'teaser', mode: 'set', text: { de: 'Unser Tipp für lange Ardennen-Runden: komfortabel, schnell und mit Platz für breite Reifen.' } });
    runAt(ago(2, '09:41'), 'update_article_text', { article: 'tarmac-sl9-expert-di2', field: 'racepoint_note', mode: 'set', text: { de: 'Probefahrt nach Termin möglich.' } }, 'KI');
    runAt(ago(2, '14:02'), 'set_article_media', { article: 'sworks-aethos', order: ['m-film-sworks-aethos', 'sup-1', 'sup-2'], cover: 'm-film-sworks-aethos' }, 'KI');
    runAt(ago(1, '11:15'), 'create_banner', { text: { de: 'Herbst-Check: Werkstatttermine im Oktober frei' }, from: A.addDays(t, -1), to: A.addDays(t, 14), link: '/werkstatt', mentions_price: false });
    const slots = (s.heroes.startseite = s.heroes.startseite || []);
    const y = Number(t.slice(0, 4)), wFrom = (t > y + '-11-01' ? y + 1 : y) + '-11-01', wTo = (Number(wFrom.slice(0, 4)) + 1) + '-02-28';
    slots.push({ id: 'hero-winter', media: { id: 'hm-winter', kind: 'image', name: 'mtb-ridge.jpg', src: '../assets/mtb-ridge.jpg' }, focal: { x: 50, y: 40 }, headline: { de: 'Winter-Check jetzt buchen', fr: 'Réserve ton check d’hiver', nl: 'Boek nu je wintercheck', en: 'Book your winter check now' }, status: { fr: 'ki', nl: 'ki', en: 'ki' }, check: { ok: true, issues: [] }, from: wFrom, to: wTo, label: 'Winter-Hero', by: 'Achim', at: ago(4, '19:05') });
    s.history.push({ id: 'h-seed-hero', at: ago(4, '19:05'), actor: 'Achim', kind: 'edit', label: 'Startseite: Winter-Hero ' + A.fmtRange(wFrom, wTo, { weekday: false }) + ' geplant', paths: null, before: null, after: null, noUndo: 'Demo-Startwert' });
    // Lieferant hat aktualisiert: Roubaix-Kurztext (überschrieben -> nur Hinweis), Diverge (ohne Override -> direkt übernommen)
    const rb = s.articles['roubaix-sl8-tiagra'];
    if (rb) rb.supplierUpdates.teaser = { text: { de: 'Neu: Future Shock 3.2 und Platz für 35-mm-Reifen – Komfort für jeden Belag.', fr: 'Nouveau : Future Shock 3.2 et place pour des pneus de 35 mm – du confort sur tous les revêtements.', nl: 'Nieuw: Future Shock 3.2 en ruimte voor 35 mm banden – comfort op elke ondergrond.', en: 'New: Future Shock 3.2 and room for 35 mm tyres – comfort on any surface.' }, at: ago(0, '06:30') };
    s.history.push({ id: 'h-seed-sup', at: ago(0, '06:30'), actor: 'Lieferant', kind: 'supplier', label: 'Specialized-Feed: 1 Text aktualisiert (Roubaix SL8). Dein eigener Text bleibt, Hinweis gesetzt.', paths: null, before: null, after: null, noUndo: 'Lieferantenabgleich' });
    s.history.sort((a, b) => a.at < b.at ? -1 : 1);
    A.save();
  };
})(window.RPA);
