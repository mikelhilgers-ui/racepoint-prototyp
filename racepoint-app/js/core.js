/* Racepoint App · Kern: Zeit (Europe/Brussels), Zustand in localStorage, Verlauf mit Rückgängig,
   ERP-Import (CSV), Übersetzungs-Check. Nichts wird hart gelöscht. */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const KEY = 'racepoint-app-state-v3';
  A.blobs = new Map(); // Sitzungs-Medien (Object-URLs der Originale und Varianten)

  /* ---------- kleine Helfer ---------- */
  A.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  A.uid = p => (p || 'id') + '-' + Math.random().toString(36).slice(2, 8) + Date.now().toString(36).slice(-3);
  A.clone = o => o === undefined ? undefined : JSON.parse(JSON.stringify(o));
  A.fail = (msg, extra) => Object.assign(new Error(msg), { validation: true }, extra || {});
  const listeners = {};
  A.on = (ev, fn) => (listeners[ev] = listeners[ev] || []).push(fn);
  A.emit = (ev, data) => (listeners[ev] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });

  /* ---------- Zeit in Schönberg ---------- */
  const WD = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  A.WD = WD;
  A.WD_LONG = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
  A.MONTHS = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
  A.brussels = function (d) {
    d = d || new Date();
    try {
      const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(x => [x.type, x.value]));
      return { date: p.year + '-' + p.month + '-' + p.day, time: p.hour + ':' + p.minute, min: Number(p.hour) * 60 + Number(p.minute) };
    } catch (e) { const iso = d.toISOString(); return { date: iso.slice(0, 10), time: iso.slice(11, 16), min: d.getHours() * 60 + d.getMinutes() }; }
  };
  A.today = () => A.brussels().date;
  const utc = iso => new Date(iso + 'T12:00:00Z');
  A.isoDate = s => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !isNaN(utc(s)) && utc(s).toISOString().slice(0, 10) === s;
  A.addDays = (iso, n) => new Date(utc(iso).getTime() + n * 864e5).toISOString().slice(0, 10);
  A.weekday = iso => utc(iso).getUTCDay();
  A.daysBetween = (a, b) => Math.round((utc(b) - utc(a)) / 864e5);
  A.toMin = t => { const m = /^(\d{1,2}):(\d{2})$/.exec(t || ''); return m && +m[1] < 24 && +m[2] < 60 ? +m[1] * 60 + +m[2] : null; };
  A.fromMin = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  A.timeShort = t => { const m = A.toMin(t); return m == null ? t : (m % 60 ? Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') : String(m / 60)); };
  A.fmtDate = function (iso, o) {
    o = o || {};
    if (!iso) return '';
    const [y, m, d] = iso.split('-').map(Number);
    const yr = o.year === true || (o.year !== false && y !== Number(A.today().slice(0, 4)));
    return (o.weekday === false ? '' : WD[A.weekday(iso)] + ', ') + d + '.' + m + '.' + (yr ? y : '');
  };
  A.fmtRange = (a, b, o) => !b || a === b ? A.fmtDate(a, o) : A.fmtDate(a, Object.assign({ year: a.slice(0, 4) !== b.slice(0, 4) }, o)) + ' – ' + A.fmtDate(b, o);
  A.fmtTime = isoTs => { const d = new Date(isoTs); const b = A.brussels(d); return b.time; };
  A.fmtStamp = function (isoTs) {
    const d = new Date(isoTs), b = A.brussels(d), t = A.today();
    if (b.date === t) return 'heute ' + b.time;
    if (b.date === A.addDays(t, -1)) return 'gestern ' + b.time;
    return A.fmtDate(b.date, { weekday: false }) + ' ' + b.time;
  };
  A.ago = function (isoTs) {
    const min = Math.max(0, Math.round((Date.now() - new Date(isoTs)) / 60000));
    if (min < 1) return 'gerade eben';
    if (min < 60) return 'vor ' + min + ' Min';
    const h = Math.round(min / 60); if (h < 48) return 'vor ' + h + ' Std';
    return 'vor ' + Math.round(h / 24) + ' Tagen';
  };
  A.money = (n, dec) => n == null ? '–' : new Intl.NumberFormat('de-BE', { style: 'currency', currency: 'EUR', maximumFractionDigits: dec ? 2 : 0, minimumFractionDigits: dec ? 2 : 0 }).format(n);
  A.usd = n => '$' + (n < 0.1 ? n.toFixed(4) : n.toFixed(2)).replace('.', ',');
  A.bytes = n => n > 1048576 ? (n / 1048576).toFixed(1).replace('.', ',') + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB';

  /* ---------- Zustand ---------- */
  A.load = function () {
    let s = null;
    try { const raw = localStorage.getItem(KEY); if (raw) s = JSON.parse(raw); } catch (e) { s = null; }
    if (!s || s.v !== 3) { s = A.buildState(A.today()); A.state = s; A.seedHistory(); } else A.state = s;
    return A.state;
  };
  A.save = function () {
    for (let attempt = 0; attempt < 6; attempt++) {
      try { localStorage.setItem(KEY, JSON.stringify(A.state)); return true; } catch (e) {
        // Speicher voll: älteste Rückgängig-Daten verwerfen (Einträge bleiben sichtbar)
        const old = A.state.history.filter(h => h.before).slice(-Math.max(4, Math.ceil(A.state.history.length / 3)));
        if (!old.length) break;
        old.forEach(h => { h.before = null; h.after = null; h.noUndo = 'Speicher voll'; });
      }
    }
    return false;
  };
  A.reset = function () {
    try { localStorage.removeItem(KEY); } catch (e) { /* privat */ }
    A.blobs.forEach(v => { (v.urls || []).forEach(u => { try { URL.revokeObjectURL(u); } catch (e) { /* egal */ } }); });
    A.blobs.clear();
    A.state = A.buildState(A.today()); A.seedHistory(); A.save(); A.emit('change', { reset: true });
  };

  /* ---------- Pfade + Verlauf ---------- */
  const getPath = (o, p) => p.reduce((x, k) => x == null ? undefined : x[k], o);
  const setPath = (o, p, v) => { const last = p[p.length - 1], parent = p.slice(0, -1).reduce((x, k) => (x[k] == null ? (x[k] = {}) : x[k]), o); if (v === undefined) delete parent[last]; else parent[last] = v; };
  A.getPath = getPath;
  // Jede Änderung: Pfade vorher/nachher sichern, Eintrag in den Verlauf.
  A.tx = function ({ label, actor, kind, paths, run, at }) {
    const s = A.state, before = paths.map(p => A.clone(getPath(s, p)));
    let out;
    try { out = run(); } catch (e) { paths.forEach((p, i) => setPath(s, p, A.clone(before[i]))); throw e; }
    const after = paths.map(p => A.clone(getPath(s, p)));
    if (JSON.stringify(before) === JSON.stringify(after)) return { entry: null, out };
    const entry = { id: 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), at: at || new Date().toISOString(), actor: actor || 'Achim', kind: kind || 'edit', label, paths, before, after };
    s.history.push(entry);
    if (s.history.length > 120) s.history.splice(0, s.history.length - 120).length;
    A.save(); A.emit('change', { entry });
    return { entry, out };
  };
  A.undo = function (id, actor) {
    const s = A.state, list = s.history;
    const e = id ? list.find(h => h.id === id) : list.slice().reverse().find(h => !h.undone && h.before && h.kind !== 'undo');
    if (!e) throw A.fail(id ? 'Diese Änderung gibt es im Verlauf nicht.' : 'Es gibt keine Änderung, die sich rückgängig machen lässt.');
    if (e.undone) throw A.fail('„' + e.label + '“ ist schon rückgängig gemacht.');
    if (!e.before) throw A.fail('Für „' + e.label + '“ sind keine Rückgängig-Daten mehr gespeichert' + (e.noUndo ? ' (' + e.noUndo + ').' : '.'));
    const changed = e.paths.some((p, i) => JSON.stringify(getPath(s, p) === undefined ? null : getPath(s, p)) !== JSON.stringify(e.after[i] === undefined ? null : e.after[i]));
    if (changed) {
      const later = list.filter(h => h.at > e.at && !h.undone && h.paths && h.paths.some(p => e.paths.some(q => p.join('.').startsWith(q.join('.')) || q.join('.').startsWith(p.join('.'))))).pop();
      throw A.fail('Das wurde danach noch einmal geändert' + (later ? ' („' + later.label + '“)' : '') + '. Bitte zuerst die neuere Änderung rückgängig machen.');
    }
    const r = A.tx({ label: 'Rückgängig: ' + e.label, actor: actor || 'Achim', kind: 'undo', paths: e.paths, run: () => e.paths.forEach((p, i) => setPath(s, p, A.clone(e.before[i]))) });
    e.undone = { at: new Date().toISOString(), by: actor || 'Achim', entry: r.entry && r.entry.id };
    if (r.entry) r.entry.reverts = e.id;
    A.save(); A.emit('change', { undo: e });
    return { entry: r.entry, original: e };
  };

  /* ---------- ERP (Intec, nur lesen) ---------- */
  A.erp = { rows: [], byArticle: {}, exportedAt: null, loaded: false, error: null };
  A.loadErp = async function () {
    try {
      const res = await fetch('data/erp-export.csv', { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      A.parseErp(await res.text());
    } catch (e) { A.erp.error = 'ERP-Export nicht lesbar (' + e.message + ').'; }
    A.erp.loaded = true;
    // Der lokale Sync-Dienst im Laden meldet sich regelmäßig; im Demo: letzter Abgleich vor 7 Minuten.
    A.erp.syncedAt = new Date(Date.now() - 7 * 60000).toISOString();
    A.emit('erp');
  };
  A.parseErp = function (text) {
    const lines = text.split(/\r?\n/).filter(l => l && !l.startsWith('#'));
    const head = lines.shift().split(';');
    A.erp.rows = lines.map(l => { const c = l.split(';'), o = {}; head.forEach((h, i) => o[h] = c[i]); o.bestand = Number(o.bestand); o.ladenpreis_eur = Number(o.ladenpreis_eur); return o; });
    A.erp.byArticle = {};
    A.erp.rows.forEach(r => (A.erp.byArticle[r.artikel_id] = A.erp.byArticle[r.artikel_id] || []).push(r));
    A.erp.exportedAt = A.erp.rows[0] && A.erp.rows[0].stand;
  };
  A.erpFor = function (id) {
    const rows = A.erp.byArticle[id] || [];
    const stale = A.erpStale();
    return { rows, stock: rows.reduce((n, r) => n + r.bestand, 0), price: rows.length ? Math.min.apply(null, rows.map(r => r.ladenpreis_eur)) : null, stale };
  };
  A.erpSyncedAt = () => A.state.settings.erpOutage ? new Date(Date.now() - 26 * 3600000).toISOString() : A.erp.syncedAt;
  A.erpStale = () => { const t = A.erpSyncedAt(); return !t || Date.now() - new Date(t) > 24 * 3600000; };
  A.validEan = e => { if (!/^\d{13}$/.test(e)) return false; let s = 0; for (let i = 0; i < 12; i++) s += +e[i] * (i % 2 ? 3 : 1); return (10 - s % 10) % 10 === +e[12]; };

  /* ---------- Übersetzung + automatische Prüfung ---------- */
  A.translateDemo = function (de) {
    const key = String(de || '').trim();
    const hit = A.DEMO_TRANSLATIONS[key];
    if (hit) return { text: { de: key, fr: hit.fr, nl: hit.nl, en: hit.en }, status: { fr: 'ki', nl: 'ki', en: 'ki' } };
    return { text: { de: key, fr: '', nl: '', en: '' }, status: { fr: 'pending', nl: 'pending', en: 'pending' } };
  };
  // Zahlen normalisieren: 1.499 / 1 499 / 1,499 -> 1499; 15 % -> 15; 9:00 -> 9 und 0 bleiben getrennt
  A.numbers = function (s) {
    return (String(s || '').match(/\d+(?:[.,   ']\d{3})*(?:[.,]\d+)?/g) || []).map(n => {
      const t = n.replace(/[   ']/g, '');
      if (/^\d{1,3}([.,]\d{3})+$/.test(t)) return t.replace(/[.,]/g, '');
      return String(Number(t.replace(',', '.')));
    }).sort();
  };
  A.checkLangs = function (text, status) {
    const issues = [], de = text.de || '';
    const nde = A.numbers(de).join('|'), terms = A.GLOSSARY.filter(g => de.includes(g));
    ['fr', 'nl', 'en'].forEach(l => {
      if (status && status[l] === 'pending') return;
      const t = text[l] || '';
      if (!t.trim()) { issues.push({ lang: l, msg: l.toUpperCase() + ': Text fehlt' }); return; }
      if (A.numbers(t).join('|') !== nde) issues.push({ lang: l, msg: l.toUpperCase() + ': Zahlen/Preise/Daten weichen ab (' + (A.numbers(t).join(', ') || 'keine') + ' statt ' + (A.numbers(de).join(', ') || 'keine') + ')' });
      terms.forEach(g => { if (!t.includes(g)) issues.push({ lang: l, msg: l.toUpperCase() + ': Glossarbegriff „' + g + '“ wurde übersetzt oder fehlt' }); });
    });
    return { ok: issues.length === 0, issues, at: new Date().toISOString() };
  };

  /* ---------- Öffnungszeiten (inkl. Feiertage + Ausnahmen) ---------- */
  A.holidayOn = iso => A.state.hours.holidays.find(h => h.date === iso) || null;
  A.exceptionOn = iso => A.state.hours.exceptions.filter(e => !e.hidden && e.from <= iso && iso <= e.to).sort((a, b) => a.at < b.at ? 1 : -1)[0] || null;
  A.dayHours = function (iso) {
    const H = A.state.hours, reg = H.weekly[A.weekday(iso)], hol = A.holidayOn(iso), ex = A.exceptionOn(iso);
    const base = { date: iso, regular: reg, holiday: hol };
    if (ex) {
      if (ex.type === 'closed') return Object.assign(base, { open: false, reason: 'closed', label: ex.label || 'Geschlossen', ex });
      if (ex.type === 'special') return Object.assign(base, { open: true, from: ex.open, to: ex.close, reason: 'special', label: ex.label || 'Sonderöffnung', ex });
      if (ex.type === 'short' && reg && !hol) return Object.assign(base, { open: true, from: ex.open || reg[0], to: ex.close || reg[1], reason: 'short', label: ex.label || 'Verkürzt', ex });
    }
    if (hol) return Object.assign(base, { open: false, reason: 'holiday', label: hol.name });
    if (!reg) return Object.assign(base, { open: false, reason: 'weekly', label: 'Ruhetag' });
    return Object.assign(base, { open: true, from: reg[0], to: reg[1], reason: 'regular' });
  };
  A.openStatus = function (at) {
    const b = A.brussels(at), d = A.dayHours(b.date);
    if (d.open && b.min >= A.toMin(d.from) && b.min < A.toMin(d.to)) return { open: true, text: 'Jetzt geöffnet · bis ' + A.timeShort(d.to) + ' Uhr', day: d, soon: A.toMin(d.to) - b.min <= 60 };
    for (let i = 0; i < 40; i++) {
      const iso = A.addDays(b.date, i), x = A.dayHours(iso);
      if (!x.open || (i === 0 && b.min >= A.toMin(x.from))) continue;
      const when = i === 0 ? 'heute' : i === 1 ? 'morgen' : i < 7 ? A.WD_LONG[A.weekday(iso)] : A.fmtDate(iso);
      return { open: false, text: 'Jetzt geschlossen · öffnet ' + when + ' ' + A.timeShort(x.from) + ' Uhr', day: d, next: x };
    }
    return { open: false, text: 'Jetzt geschlossen', day: d };
  };

  /* ---------- Artikel zusammenführen: ERP + Lieferant + Overrides ---------- */
  A.FIELDS = { title: 'Titel', teaser: 'Kurztext', description: 'Beschreibung', racepoint_note: 'Racepoint-Hinweis' };
  A.fieldValue = function (a, field) {
    const o = a.overrides[field];
    if (o && !o.hidden) return { text: o.text, status: o.status || {}, source: 'override', by: o.by, at: o.at, check: o.check };
    const sup = field === 'racepoint_note' ? null : a.supplier.text[field];
    return { text: sup || { de: '', fr: '', nl: '', en: '' }, status: {}, source: sup && sup.de ? 'supplier' : 'empty' };
  };
  A.articleTitle = a => A.fieldValue(a, 'title').text.de || a.name;
  A.mediaList = function (a) {
    const sup = a.supplier.images.map(i => ({ id: i.id, supplier: true, kind: 'image', role: 'gallery', url: i.url, name: i.label, hidden: a.hiddenSupplier.includes(i.id) }));
    const own = a.media.filter(m => !m.hidden);
    const all = sup.concat(own.map(m => Object.assign({ supplier: false }, m)));
    const order = a.gallery || [];
    return all.sort((x, y) => (order.indexOf(x.id) + 1 || 999) - (order.indexOf(y.id) + 1 || 999));
  };
  A.coverOf = function (a) {
    const list = A.mediaList(a).filter(m => !m.hidden && m.kind === 'image');
    return list.find(m => m.id === a.cover) || list[0] || null;
  };
  A.mediaSrc = function (m, want) {
    if (!m) return null;
    const b = A.blobs.get(m.id);
    if (b) { if (want === 'thumb' && b.thumb) return b.thumb; return b.best || b.src; }
    if (m.supplier) return m.url;
    return m.src || (m.thumbKey && A.state.blobs[m.thumbKey]) || m.poster || null;
  };
  A.supplierUpdatesCount = () => Object.values(A.state.articles).reduce((n, a) => n + Object.keys(a.supplierUpdates || {}).length, 0);

  /* ---------- Statistik (Aggregate) ---------- */
  A.periodRange = function (period) {
    const t = A.today(), dow = (A.weekday(t) + 6) % 7; // Mo = 0
    switch (period) {
      case 'today': return [t, t, 'heute'];
      case 'yesterday': { const y = A.addDays(t, -1); return [y, y, 'gestern']; }
      case 'last_week': { const s = A.addDays(t, -dow - 7); return [s, A.addDays(s, 6), 'letzte Woche']; }
      case 'month': return [t.slice(0, 8) + '01', t, 'diesen Monat'];
      case 'last7': return [A.addDays(t, -6), t, 'in den letzten 7 Tagen'];
      case 'last30': return [A.addDays(t, -29), t, 'in den letzten 30 Tagen'];
      default: return [A.addDays(t, -dow), t, 'diese Woche'];
    }
  };
  A.statsRange = function (from, to) {
    const days = [], t = A.today(), frac = Math.min(1, Math.max(0.05, (A.brussels().min - 8 * 60) / (12 * 60)));
    for (let d = from; d <= to; d = A.addDays(d, 1)) {
      const x = A.statsForDay(d);
      if (d === t) ['visits', 'chats', 'handoffs', 'appointments', 'unanswered'].forEach(k => x[k] = Math.round(x[k] * frac));
      if (d === t) Object.keys(x.topics).forEach(k => x.topics[k] = Math.round(x.topics[k] * frac));
      days.push(x);
    }
    const sum = k => days.reduce((n, x) => n + x[k], 0);
    const topics = {}; days.forEach(x => Object.entries(x.topics).forEach(([k, v]) => topics[k] = (topics[k] || 0) + v));
    return { from, to, days, visits: sum('visits'), chats: sum('chats'), handoffs: sum('handoffs'), appointments: sum('appointments'), unanswered: sum('unanswered'), topics };
  };
  A.kiCost = function () {
    const s = A.state.settings, t = A.today(), r = A.statsRange(t.slice(0, 8) + '01', t);
    const visitorChat = r.days.reduce((n, d) => n + (d.tokensIn * 2 + d.tokensOut * 10) / 1e6, 0);
    return { visitorChat, admin: s.kiBaselineUsd + s.kiLiveUsd, total: visitorChat + s.kiBaselineUsd + s.kiLiveUsd, limit: s.kiLimitUsd };
  };
})(window.RPA);
