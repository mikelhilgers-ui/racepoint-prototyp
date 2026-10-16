/* Racepoint App · KI-Assistent.
   Live: Browser schickt den Verlauf an /api/app-assistant, bekommt Text und/oder tool_use zurück,
   führt die Werkzeuge hier mit A.run (dieselben Aktionen wie die Formulare) aus und schickt die
   Ergebnisse zurück; höchstens 6 Runden. Ohne KI auf dem Server: deterministischer Befehls-Parser
   (Simulation), der genau dieselben Aktionen aufruft. */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const U = A.ui, esc = A.esc, I = U.icon, V = A.views = A.views || {};
  const S = () => A.state;
  const C = A.chat = { busy: false, compose: [], api: [], carry: null, progress: '' };
  A.aiStatus = { checked: false, live: false };
  const READ = ['query_stats', 'list_appointments', 'find_article'];

  A.checkAi = async function () {
    try {
      const r = await fetch('/api/status', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const s = r.ok ? await r.json() : {};
      A.aiStatus = { checked: true, live: !!(s.appAssistant && s.appAssistant.ready), model: s.appAssistant && s.appAssistant.model, pricing: s.appAssistant && s.appAssistant.pricing };
    } catch (e) { A.aiStatus = { checked: true, live: false }; }
    A.emit('ai');
  };

  /* ---------------- Senden ---------------- */
  A.sendChat = async function (text, attIds) {
    text = String(text || '').trim();
    const atts = (attIds || []).map(id => A.attachments.get(id)).filter(Boolean);
    if (C.busy || (!text && !atts.length)) return;
    if (atts.some(a => a.processing)) { U.toast({ ok: false, error: 'Anhänge werden noch verarbeitet, einen Moment.' }); return; }
    const log = S().chat.log;
    log.push({ id: A.uid('u'), role: 'user', text, atts: atts.map(a => ({ id: a.id, kind: a.kind, name: a.name, thumbKey: a.thumbKey })), at: new Date().toISOString() });
    C.busy = true; C.progress = A.aiStatus.live ? 'Assistent denkt nach …' : 'Simulation wertet aus …'; A.save(); V.chatUpdate();
    let msg;
    try {
      if (A.aiStatus.live) {
        try { msg = await liveTurn(text, atts); } catch (e) {
          msg = await simTurn(text, atts);
          msg.note = (e.status === 429 ? 'Das KI-Kontingent ist gerade erschöpft' : 'Die echte KI ist gerade nicht erreichbar') + ' (' + e.message + '). Die Simulation hat geantwortet.';
        }
      } else msg = await simTurn(text, atts);
    } catch (e) { console.error(e); msg = { text: 'Da ist etwas schiefgegangen: ' + e.message, results: [], mode: 'sim' }; }
    log.push(Object.assign({ id: A.uid('a'), role: 'assistant', at: new Date().toISOString() }, msg));
    if (log.length > 80) log.splice(0, log.length - 80);
    C.busy = false; C.progress = ''; A.save(); V.chatUpdate(); A.emit('change', { chat: true });
  };
  const store = res => Object.assign({ rid: A.uid('r') }, res);
  function exec(name, input) {
    const res = A.run(name, input, { actor: 'KI', attachments: A.attachments, via: 'Assistent' });
    return store(res);
  }

  /* ---------------- Live (echte KI) ---------------- */
  async function post(messages) {
    const r = await fetch('/api/app-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify({ messages }) });
    let data = {}; try { data = await r.json(); } catch (e) { /* leer */ }
    if (!r.ok) throw Object.assign(new Error(data.error || 'HTTP ' + r.status), { status: r.status });
    return data;
  }
  // Ältere Bilder durch Platzhalter ersetzen und den Verlauf kurz halten
  function trimmed() {
    let api = C.api;
    if (api.length > 30) { let i = api.length - 30; while (i < api.length && !(api[i].role === 'user' && api[i].content.some(b => b.type === 'text') && !api[i].content.some(b => b.type === 'tool_result'))) i++; api = api.slice(i); C.api = api; }
    const lastTurn = (() => { for (let i = api.length - 1; i >= 0; i--) if (api[i].role === 'user' && api[i].content.some(b => b.type === 'text') && !api[i].content.some(b => b.type === 'tool_result')) return i; return 0; })();
    return api.map((m, i) => i >= lastTurn || m.role !== 'user' ? m : { role: 'user', content: m.content.map(b => b.type === 'image' ? { type: 'text', text: '[Bild aus einer früheren Nachricht]' } : b) });
  }
  async function liveTurn(text, atts) {
    const content = [];
    if (C.carry) { content.push.apply(content, C.carry); C.carry = null; }
    atts.slice(0, 4).forEach(a => { if (a.model) content.push({ type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: a.model } }); });
    const manifest = atts.map(a => a.id + ': ' + (a.kind === 'video' ? 'Video' : 'Foto') + ' „' + a.name + '“, ' + a.width + '×' + a.height + ' px' + (a.duration ? ', ' + a.duration + ' s (Bild = Standbild)' : '')).join('\n');
    content.push({ type: 'text', text: (manifest ? '[Anhänge]\n' + manifest + '\n\n' : '') + (text || 'Siehe Anhänge.') });
    C.api.push({ role: 'user', content });
    const results = [], usage = { input_tokens: 0, output_tokens: 0 };
    let cost = 0, textOut = '', rounds = 0;
    while (rounds++ < 6) {
      C.progress = rounds === 1 ? 'Assistent denkt nach …' : 'Assistent prüft die Ergebnisse …'; V.chatUpdate();
      const res = await post(trimmed());
      usage.input_tokens += res.usage ? res.usage.input_tokens : 0; usage.output_tokens += res.usage ? res.usage.output_tokens : 0; cost += res.cost ? res.cost.usd : 0;
      const blocks = (res.content || []).filter(b => b.type !== 'text' || b.text);
      if (!blocks.length) blocks.push({ type: 'text', text: 'Erledigt.' });
      C.api.push({ role: 'assistant', content: blocks });
      const t = blocks.filter(b => b.type === 'text').map(b => b.text).join('\n\n').trim();
      if (t) textOut = textOut ? textOut + '\n\n' + t : t;
      const calls = blocks.filter(b => b.type === 'tool_use');
      if (!calls.length) break;
      const out = calls.map(c => { C.progress = 'Führe aus: ' + c.name; const r = exec(c.name, c.input); results.push(r); return { type: 'tool_result', tool_use_id: c.id, content: A.resultForModel(r), ...(r.ok ? {} : { is_error: true }) }; });
      V.chatUpdate();
      // Schreibende Aktionen erfolgreich und Text schon da: keine weitere (kostenpflichtige) Runde.
      if (t && calls.every(c => !READ.includes(c.name)) && results.slice(-calls.length).every(r => r.ok)) { C.carry = out; break; }
      C.api.push({ role: 'user', content: out });
    }
    S().settings.kiLiveUsd += cost;
    return { text: textOut || 'Erledigt.', results, mode: 'live', cost, rounds: rounds > 6 ? 6 : rounds, usage };
  }

  /* ---------------- Simulation (ohne KI) ---------------- */
  async function simTurn(text, atts) {
    await new Promise(r => setTimeout(r, 450));
    const plan = SIM.parse(text, atts);
    const results = (plan.calls || []).map(c => exec(c.name, c.input));
    const reply = plan.after ? plan.after(results) : plan.reply;
    const out = { text: typeof reply === 'object' ? reply.text : reply, results: plan.hideResults ? [] : results, mode: 'sim', suggestions: (typeof reply === 'object' && reply.suggestions) || plan.suggestions || [] };
    C.lastSuggestion = out.suggestions[0] || null;
    return out;
  }
  const SIM = A.sim = {};
  const MONTHS = { januar: 1, jan: 1, februar: 2, feb: 2, 'märz': 3, maerz: 3, april: 4, apr: 4, mai: 5, juni: 6, juli: 7, august: 8, aug: 8, september: 9, sept: 9, sep: 9, oktober: 10, okt: 10, november: 11, nov: 11, dezember: 12, dez: 12 };
  const WDN = { sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 };
  const iso = (y, m, d) => y + '-' + String(m).padStart(2, '0') + '-' + String(d).padStart(2, '0');
  function resolve(d, m, y) {
    const t = A.today();
    if (y) { y = Number(y); if (y < 100) y += 2000; const s = iso(y, m, d); return A.isoDate(s) ? s : null; }
    let yy = Number(t.slice(0, 4)), s = iso(yy, m, d);
    if (A.isoDate(s) && s < t) s = iso(yy + 1, m, d);
    return A.isoDate(s) ? s : null;
  }
  const hm = (h, m) => String(h).padStart(2, '0') + ':' + (m || '00');
  SIM.times = function (c) {
    const out = {};
    let m = /(?:von\s+)?(\d{1,2})(?:[:.](\d{2}))?\s*(?:uhr\s*)?(?:bis|–|-)\s*(\d{1,2})(?:[:.](\d{2}))?\s*uhr/.exec(c);
    if (m) { out.open = hm(m[1], m[2]); out.close = hm(m[3], m[4]); c = c.replace(m[0], ' '); }
    else {
      m = /(?:nur\s+)?bis\s+(\d{1,2})(?:[:.](\d{2}))?\s*uhr/.exec(c); if (m) { out.close = hm(m[1], m[2]); c = c.replace(m[0], ' '); }
      m = /(?:erst\s+)?ab\s+(\d{1,2})(?:[:.](\d{2}))?\s*uhr/.exec(c); if (m) { out.open = hm(m[1], m[2]); c = c.replace(m[0], ' '); }
    }
    out.rest = c;
    return out;
  };
  SIM.dates = function (c) {
    c = c.replace(/(\d{1,2})\.?\s+(januar|jan|februar|feb|märz|maerz|april|apr|mai|juni|juli|august|aug|september|sept|sep|oktober|okt|november|nov|dezember|dez)\b\.?/g, (_, d, mo) => d + '.' + MONTHS[mo] + '.');
    const ranges = [], singles = [];
    const rx = /(\d{1,2})\.(?:(\d{1,2})\.?)?(?:\s*(\d{4}))?\s*(?:bis(?:\s+(?:zum|einschließlich))?|–|-)\s*(\d{1,2})\.(\d{1,2})\.?(?:\s*(\d{4}))?/g;
    let m;
    while ((m = rx.exec(c))) {
      const to = resolve(+m[4], +m[5], m[6]); if (!to) continue;
      const m1 = m[2] ? +m[2] : +m[5], y1 = Number(to.slice(0, 4)) - (m1 > +m[5] ? 1 : 0);
      const from = m[3] ? iso(+m[3], m1, +m[1]) : iso(y1, m1, +m[1]);
      if (A.isoDate(from)) ranges.push([from, to]);
    }
    c = c.replace(rx, ' ');
    const toks = []; const rx2 = /(\d{1,2})\.(?:(\d{1,2})(?:\.|\b))?(?:\s*(\d{4}))?/g;
    while ((m = rx2.exec(c))) toks.push({ d: +m[1], m: m[2] ? +m[2] : null, y: m[3] });
    for (let i = toks.length - 1, next = null; i >= 0; i--) { if (toks[i].m) next = toks[i]; else if (next) { toks[i].m = next.m; toks[i].y = next.y; } }
    toks.forEach(k => { if (k.m) { const s = resolve(k.d, k.m, k.y); if (s) singles.push(s); } });
    const t = A.today();
    if (/\bheute\b/.test(c)) singles.push(t);
    if (/\bübermorgen\b/.test(c)) singles.push(A.addDays(t, 2)); else if (/\bmorgen\b/.test(c)) singles.push(A.addDays(t, 1));
    const wd = /\b(?:am|nächsten|kommenden|diesen)?\s*(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\b/.exec(c);
    if (wd && !ranges.length && !singles.length) { let d = t; while (A.weekday(d) !== WDN[wd[1]]) d = A.addDays(d, 1); singles.push(d); }
    return { ranges, singles };
  };
  // Modellnamen im Satz finden (Tarmac SL8 vs. SL9 sauber trennen)
  const GENERIC = new Set(['s', 'works', 'specialized', 'shimano', 'sram', 'comp', 'expert', 'sport', 'alloy', 'evo', 'di2', 'cues', 'ultegra', 'tiagra', 'dura', 'ace', 'red', 'axs', 'apex', 'xplr', 'xt', '0', '3', '4', '15', '24']);
  const words = s => String(s).toLowerCase().normalize('NFC').split(/[^a-z0-9äöüß]+/).filter(Boolean);
  SIM.article = function (text) {
    const tw = new Set(words(text));
    const scored = Object.values(S().articles).map(a => {
      const mw = words(a.name.split(' · ')[0]);
      let score = 0, key = 0;
      mw.forEach(w => { if (tw.has(w)) { if (GENERIC.has(w)) score += 1; else { score += 2; key++; } } });
      return { a, score: key ? score : 0 };
    }).filter(x => x.score > 0).sort((x, y) => y.score - x.score);
    if (!scored.length) return null;
    const best = scored.filter(x => x.score === scored[0].score);
    return best.length === 1 ? best[0].a : { ambiguous: best.map(x => x.a) };
  };
  const PAGE_ALIASES = [['startseite', /startseite|homepage|\bstart\b/], ['rennrad', /rennrad/], ['gravel', /gravel/], ['mtb', /\bmtb\b|mountainbike/], ['ebike', /e-?bike/], ['familie', /familie|kinder|kids/], ['werkstatt', /werkstatt/], ['bikefitting', /bikefitting|fitting|retül/], ['filme', /filme/], ['touren', /touren/], ['ueber-uns', /über uns|ueber uns/], ['kontakt', /kontakt/]];
  SIM.page = t => { const p = PAGE_ALIASES.find(([, rx]) => rx.test(t)); return p ? p[0] : null; };
  const quoted = s => { const m = /[„“"»«‚']([^„“"»«‚']{2,})[“"«»‘']/.exec(s); return m ? m[1].trim() : null; };
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const DEMO_PHRASES = { 'wir den mit rotor-kurbel aufbauen können': 'Auf Wunsch bauen wir das S-Works Aethos mit Rotor-Kurbel auf.' };
  SIM.dassToMain = function (clause, a) {
    const key = clause.toLowerCase().replace(/[.!]+$/, '').trim();
    if (DEMO_PHRASES[key] && a && a.id === 'sworks-aethos') return DEMO_PHRASES[key];
    const w = clause.replace(/[.!]+$/, '').trim().split(/\s+/);
    if (w.length > 2 && /^(wir|ich|man|achim|er|sie|es)$/i.test(w[0])) {
      const verb = w.pop(), subj = w.shift();
      if (a && /^(den|ihn|es|das|die)$/i.test(w[0])) w[0] = 'das ' + A.shortName(a);
      return cap(subj.toLowerCase() === 'ich' ? 'ich' : subj) + ' ' + verb + ' ' + w.join(' ') + '.';
    }
    return cap(clause.replace(/[.!]+$/, '').trim()) + '.';
  };
  const ex = A.EXAMPLES || [];
  const help = (pre) => ({ text: (pre ? pre + '\n\n' : '') + 'In der Simulation verstehe ich feste Formulierungen. Mit echter KI auf dem Server klappen auch freie Sätze. Probier zum Beispiel:', suggestions: A.EXAMPLES.slice(0, 5).map(e => ({ label: e.t, cmd: e.t })) });
  const fmtList = ds => ds.map(d => A.fmtDate(d)).join(' und ');

  SIM.parse = function (raw, atts) {
    const text = raw.trim(), t = text.toLowerCase();
    const imgs = atts.filter(a => a.kind === 'image'), vids = atts.filter(a => a.kind === 'video');
    if (/^(ja|ok|okay|gerne|passt|mach das|jawohl|bitte)\b/.test(t) && C.lastSuggestion) return SIM.parse(C.lastSuggestion.cmd, atts);
    if (!text && atts.length) return { reply: { text: 'Danke! Wofür sind die ' + (vids.length ? 'Datei' + (atts.length > 1 ? 'en' : '') : 'Fotos') + '? Sag mir den Artikel oder die Seite, z. B. „Das sind Fotos vom Tarmac SL8“.' }, calls: [] };
    if (/rückgängig|\bundo\b|nimm das zurück|zurücknehmen|war falsch/.test(t)) return { calls: [{ name: 'undo', input: {} }], after: r => r[0].ok ? 'Ist zurückgenommen.' : r[0].error, hideResults: false };
    // Harte Grenzen
    if (/(impressum|\bagb\b|datenschutz|widerruf|rechtstext)/.test(t)) return { reply: 'Rechtstexte (Impressum, AGB, Datenschutz) ändere ich bewusst nicht. Die pflegt Mikel mit dir zusammen, damit nichts Rechtliches schiefgeht.', calls: [] };
    if (/\b(quellcode|programmcode|javascript|css|html|code)\b/.test(t) && !/gutschein/.test(t)) return { reply: 'Am Programmcode der Website ändere ich nichts. Neue Funktionen baut Mikel; ich kann sie danach hier ein- und ausschalten.', calls: [] };
    if (/(preis|bestand|lagerbestand|auf lager)/.test(t) && /(setz|änder|reduzier|erhöh|senk|auf \d|\d+\s*€)/.test(t) && !/(banner|aktion)/.test(t)) return { reply: 'Preise und Bestände kommen direkt aus Intec und sind hier schreibgeschützt. Bitte in Intec ändern, der Abgleich übernimmt es in wenigen Minuten auf Website und KI-Chat. Für eine Aktion kann ich ein Banner anlegen.', calls: [] };
    if (/(lösch|endgültig weg|komplett entfernen)/.test(t) && !/(ausnahme|banner|hero)/.test(t)) {
      const a = SIM.article(t);
      return { reply: { text: 'Endgültig löschen kann ich nichts, damit nie etwas verloren geht. Ich kann ' + (a && !a.ambiguous ? 'das ' + A.shortName(a) : 'es') + ' aber ausblenden, dann ist es nirgends mehr sichtbar.', suggestions: a && !a.ambiguous ? [{ label: 'Ja, ' + A.shortName(a) + ' ausblenden', cmd: 'Blende das ' + A.shortName(a) + ' aus' }] : [] }, calls: [] };
    }
    // Statistik
    if (/(wie oft|wie viele|wieviele|statistik|besuche|besucher|kosten|nicht beantwort|themen|meistgefragt|genutzt|abgleich|\berp\b|intec)/.test(t) && !/^banner/.test(t)) {
      const metric = /nicht beantwort|offen geblieben|keine antwort/.test(t) ? 'unanswered' : /kosten|ausgaben|limit|budget/.test(t) ? 'costs' : /\berp\b|intec|abgleich|sync/.test(t) ? 'erp' : /themen/.test(t) ? 'topics' : /(bikes|räder|modelle|rad).*(gefragt|beliebt)|meistgefragt/.test(t) ? 'top_bikes' : /übergab|an mich|weitergeleitet/.test(t) ? 'handoffs' : /termin/.test(t) ? 'appointments' : /besuch|website|aufruf/.test(t) && !/chat/.test(t) ? 'visits' : 'chat';
      const period = /\bheute\b/.test(t) ? 'today' : /gestern/.test(t) ? 'yesterday' : /letzte(n)? woche|vorwoche/.test(t) ? 'last_week' : /monat/.test(t) ? 'month' : /30 tage/.test(t) ? 'last30' : /7 tage/.test(t) ? 'last7' : 'week';
      return { calls: [{ name: 'query_stats', input: { metric, period } }], after: r => r[0].ok ? [r[0].summary].concat(r[0].lines).join('\n') : r[0].error, hideResults: true };
    }
    // Termine
    if (/(termin|buchung)/.test(t) && !/banner/.test(t)) {
      const id = (/t-\d{3,5}/i.exec(text) || [])[0];
      if (id && /bestätig/.test(t)) return { calls: [{ name: 'respond_appointment', input: { id: id.toUpperCase(), action: 'confirm' } }], after: r => r[0].ok ? 'Bestätigt.' : 'Das geht so nicht:' };
      if (/alle.*bestätig|bestätig.*alle/.test(t)) {
        const ok = S().appointments.requests.filter(r => r.status === 'open' && A.checkSlot(r.type, r.start, r.id).ok);
        if (!ok.length) return { reply: 'Keine der offenen Buchungen passt ohne Konflikt. Schau sie dir unter Termine an.', calls: [] };
        return { calls: ok.map(r => ({ name: 'respond_appointment', input: { id: r.id, action: 'confirm' } })), after: () => 'Alle passenden Buchungen sind bestätigt; die mit Konflikt habe ich offen gelassen.' };
      }
      return { calls: [{ name: 'list_appointments', input: { status: 'open' } }], after: r => r[0].summary + (r[0].lines.length ? '\n' + r[0].lines.map(l => '• ' + l).join('\n') : ''), hideResults: true, suggestions: [{ label: 'Alle passenden bestätigen', cmd: 'Bestätige alle passenden Termine' }] };
    }
    // Banner
    if (/^\s*(banner|aktion)\b/.test(t)) return SIM.banner(text);
    // Sichtbarkeit
    if (/(blende|ausblenden|einblenden|verstecke|nicht mehr (zeigen|anzeigen)|wieder (zeigen|anzeigen))/.test(t) && !/herstellerbild/.test(t)) {
      const show = /\bein\b|einblenden|wieder (zeigen|anzeigen|sichtbar)/.test(t);
      const cat = /alle\s+(e-?bikes|rennräder|rennrad|gravel\w*|mtbs?|mountainbikes?|kinderräder|kinder)/.exec(t);
      let ids;
      if (cat) { const c = /e-?bike/.test(cat[1]) ? 'ebike' : /renn/.test(cat[1]) ? 'rennrad' : /gravel/.test(cat[1]) ? 'gravel' : /mtb|mountain/.test(cat[1]) ? 'mtb' : 'kind'; ids = Object.values(S().articles).filter(a => a.cat === c).map(a => a.id); }
      else if (/alle (artikel|bikes|räder)/.test(t)) ids = Object.keys(S().articles);
      else {
        ids = [];
        t.split(/,|\bund\b|\bsowie\b/).forEach(part => { const a = SIM.article(part); if (a && !a.ambiguous) ids.push(a.id); else if (a && a.ambiguous) ids.push(null); });
        if (ids.includes(null) || !ids.length) { const a = SIM.article(t); if (a && a.ambiguous) return { reply: { text: 'Welches meinst du?', suggestions: a.ambiguous.map(x => ({ label: x.name, cmd: (show ? 'Blende das ' : 'Blende das ') + A.shortName(x) + (show ? ' wieder ein' : ' aus') })) }, calls: [] }; if (!ids.filter(Boolean).length) return { reply: help('Welchen Artikel soll ich ' + (show ? 'einblenden' : 'ausblenden') + '? Ich habe keinen Modellnamen erkannt.'), calls: [] }; }
        ids = ids.filter(Boolean);
      }
      return { calls: [{ name: 'set_article_visibility', input: { articles: ids, visible: show, allowMany: true } }], after: r => !r[0].ok ? 'Das ging nicht:' : r[0].needsConfirmation ? 'Das sind mehr als 5 Artikel auf einmal. Bitte kurz bestätigen, dann blende ich sie aus.' : r[0].entry === undefined && !r[0].historyId ? r[0].summary : show ? 'Ist wieder sichtbar.' : 'Erledigt, ist ausgeblendet. Gelöscht ist nichts.' };
    }
    // Öffnungszeiten
    const hoursWord = /(uhr\b|geschlossen|betriebsurlaub|urlaub|sonderöffnung|geöffnet|öffnungszeit|ruhetag|inventur|\bzu\b)/.test(t);
    if (hoursWord && !atts.length && !/\b(hero|banner)\b/.test(t)) { const plan = SIM.hours(t); if (plan) return plan; }
    // Medien und Hero
    if (atts.length || /(foto|bild|video|titelbild|herstellerbild|\bhero\b)/.test(t)) return SIM.media(text, t, atts, imgs, vids);
    // Texte
    if (/(schreib|ergänz|hinweis|kurztext|beschreibung|teaser|\btext\b|titel)/.test(t)) return SIM.text(text, t);
    return { reply: help('Das habe ich in der Simulation nicht zuordnen können.'), calls: [] };
  };

  SIM.hours = function (t) {
    const clauses = t.split(/[;,]|(?<=[a-zäöüß])\.\s+(?=(?:vom|von|am|ab)\b)|\bund\s+(?=(?:vom|von|am)\b)/).map(s => s.trim()).filter(Boolean);
    const calls = [];
    const parsed = clauses.map(cl => {
      const tm = SIM.times(cl), d = SIM.dates(tm.rest);
      const type = /betriebsurlaub|urlaub|geschlossen|\bzu\b|schließen|ruhetag|inventur/.test(cl) ? 'closed' : (tm.open && tm.close && /sonderöffnung|sonntag|geöffnet|offen|öffnen|von\s+\d/.test(cl)) ? 'special' : (tm.open || tm.close) ? 'short' : null;
      const label = /betriebsurlaub|urlaub/.test(cl) ? 'Betriebsurlaub' : /inventur/.test(cl) ? 'Inventur' : null;
      return { tm, d, type, label };
    });
    // "am 24. und am 31.12. nur bis 13 Uhr": Art und Uhrzeit vom nächsten Teil übernehmen
    for (let i = parsed.length - 2; i >= 0; i--) if (!parsed[i].type && parsed[i + 1].type) { parsed[i].type = parsed[i + 1].type; parsed[i].tm = Object.assign({}, parsed[i + 1].tm); parsed[i].label = parsed[i + 1].label; }
    parsed.forEach(({ tm, d, type, label }) => {
      if (!type || (!d.ranges.length && !d.singles.length)) return;
      const mk = (from, to) => { const lbl = label || (type === 'short' && from === to ? (from.slice(5) === '12-24' ? 'Heiligabend' : from.slice(5) === '12-31' ? 'Silvester' : null) : null) || (type === 'special' ? 'Sonderöffnung' : undefined); const inp = { type, from, to }; if (lbl) inp.label = lbl; if (type !== 'closed') { if (tm.open) inp.open = tm.open; if (tm.close) inp.close = tm.close; } calls.push({ name: 'set_hours_exception', input: inp }); };
      d.ranges.forEach(r => mk(r[0], r[1]));
      d.singles.forEach(s => mk(s, s));
    });
    if (!calls.length) return null;
    return {
      calls, after: rs => {
        const ok = rs.filter(r => r.ok), closedDays = rs.filter(r => !r.ok && r.code === 'closed_day');
        let txt = ok.length ? (ok.length === rs.length ? 'Ist eingetragen.' : 'Teilweise eingetragen.') : 'Das konnte ich so nicht eintragen.';
        const sug = [];
        if (closedDays.length) {
          const ds = closedDays.map(r => r.date), close = (calls.find(c => c.input.from === ds[0]) || {}).input.close || '13:00';
          txt += ' ' + fmtList(ds) + (ds.length > 1 ? ' sind' : ' ist') + ' bei dir ohnehin Ruhetag (' + A.WD_LONG[A.weekday(ds[0])] + ' geschlossen), da gibt es nichts zu verkürzen. Soll ich stattdessen eine Sonderöffnung von 9 bis ' + A.timeShort(close) + ' Uhr eintragen?';
          sug.push({ label: 'Ja, Sonderöffnung 9–' + A.timeShort(close) + ' Uhr', cmd: 'Sonderöffnung am ' + ds.map(d => Number(d.slice(8)) + '.' + Number(d.slice(5, 7)) + '.').join(' und ') + ' von 9 bis ' + A.timeShort(close) + ' Uhr' });
          sug.push({ label: 'Nein, so lassen', cmd: 'Danke, passt so' });
        }
        if (ok.length && S().settings.googleMaps !== false) txt += '\nGoogle Maps bekommt die Sonderzeiten automatisch mit (Demo).';
        return { text: txt, suggestions: sug };
      }
    };
  };

  SIM.banner = function (text) {
    let body = text.replace(/^\s*(banner|aktion)\s*:?\s*/i, '').trim();
    const t = body.toLowerCase();
    let datePart = '';
    const m = /,\s*([^,]*(?:bis|–|-)[^,]*)$/.exec(body);
    if (m && /(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag|\d+\.)/i.test(m[1])) { datePart = m[1].toLowerCase(); body = body.slice(0, m.index).trim(); }
    const today = A.today();
    let from, to;
    const bf = y => { let d = iso(y, 11, 1), th = 0; while (true) { if (A.weekday(d) === 4 && ++th === 4) break; d = A.addDays(d, 1); } return A.addDays(d, 1); };
    const ds = SIM.dates(datePart || t);
    if (ds.ranges.length) [from, to] = ds.ranges[0];
    else {
      const wd = /(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)\s*(?:bis|–|-)\s*(montag|dienstag|mittwoch|donnerstag|freitag|samstag|sonntag)/.exec(datePart || t);
      if (/black friday/.test(t)) { let y = Number(today.slice(0, 4)); from = bf(y); if (A.addDays(from, 3) < today) from = bf(y + 1); }
      else if (wd) { from = today; while (A.weekday(from) !== WDN[wd[1]]) from = A.addDays(from, 1); }
      else { from = today; }
      if (wd) { to = from; while (A.weekday(to) !== WDN[wd[2]] || to === from) to = A.addDays(to, 1); }
      else to = A.addDays(from, /black friday/.test(t) ? 3 : 13);
    }
    let de = body;
    if (/^black friday\s+/i.test(de) && !/^black friday:/i.test(de)) de = de.replace(/^black friday\s+/i, 'Black Friday: ');
    de = cap(de.replace(/(\d+)\s*%/g, '$1 %'));
    const pct = /(\d+)\s*%/.exec(de);
    const scope = /auf\s+([a-zäöüß-]+)/i.exec(de);
    return { calls: [{ name: 'create_banner', input: { text: { de }, from, to, mentions_price: true, discount_percent: pct ? +pct[1] : undefined, scope: scope ? scope[1] : undefined } }], after: r => !r[0].ok ? 'Das Banner konnte ich nicht anlegen:' : r[0].needsConfirmation ? 'Entwurf steht, in allen 4 Sprachen. Weil das Banner einen Rabatt nennt, geht es erst nach deiner Bestätigung live. Bitte vorher prüfen: Der Referenzpreis muss der niedrigste Preis der letzten 30 Tage sein.' : 'Banner ist angelegt.' };
  };

  SIM.media = function (text, t, atts, imgs, vids) {
    const a = SIM.article(t);
    const page = SIM.page(t);
    if (a && a.ambiguous) return { reply: { text: 'Für welches Modell?', suggestions: a.ambiguous.map(x => ({ label: x.name, cmd: text + ' (' + A.shortName(x) + ')' })) }, calls: [] };
    const isHero = /\bhero/.test(t);
    if (isHero && !a && page) {
      if (!atts.length) return { reply: 'Häng bitte das Bild oder Video an (Büroklammer unten), dann setze ich es als Hero der Seite ' + A.PAGES.find(p => p.id === page).name + '.', calls: [] };
      const d = SIM.dates(t), inp = { page, attachment: (vids[0] || imgs[0]).id };
      const q = quoted(text); if (q) inp.headline = { de: q };
      if (d.ranges.length) { inp.from = d.ranges[0][0]; inp.to = d.ranges[0][1]; }
      const lbl = /(winter|sommer|frühling|herbst|weihnacht)-?hero/.exec(t); if (lbl) inp.label = cap(lbl[1]) + '-Hero';
      if (imgs.length > 1 && /mobil/.test(t)) inp.mobile = imgs[1].id;
      return { calls: [{ name: 'set_page_hero', input: inp }], after: r => r[0].ok ? 'Neuer Hero ist gesetzt.' : 'Das ging so nicht:' };
    }
    if (!a) return { reply: help(atts.length ? 'Zu welchem Artikel oder welcher Seite gehören die Dateien? Ich habe keinen Modellnamen erkannt.' : 'Zu welchem Artikel?'), calls: [] };
    if (isHero) {
      if (!atts.length) return { reply: 'Häng bitte das Hero-' + (/video/.test(t) ? 'Video' : 'Bild') + ' an, dann setze ich es oben auf die Seite vom ' + A.shortName(a) + '.', calls: [] };
      return { calls: [{ name: 'set_article_media', input: { article: a.id, attachments: [(vids[0] || imgs[0]).id], role: 'hero' } }], after: r => r[0].ok ? 'Ist drin: das ' + (vids.length ? 'Video' : 'Bild') + ' läuft jetzt oben auf der Seite vom ' + A.shortName(a) + '.' : 'Das ging so nicht:' };
    }
    const inp = { article: a.id };
    if (atts.length) inp.attachments = atts.map(x => x.id);
    const nth = { erste: 0, '1.': 0, zweite: 1, '2.': 1, dritte: 2, '3.': 2, letzte: imgs.length - 1 };
    const cov = /(erste|zweite|dritte|letzte|1\.|2\.|3\.)[^,.]*titelbild|titelbild[^,.]*(erste|zweite|dritte|letzte)/.exec(t);
    if (cov) { const i = nth[cov[1] || cov[2]]; if (imgs[i]) inp.cover = i === 0 ? 'first' : imgs[i].id; }
    if (/herstellerbild\w*\s*(raus|weg|entfernen|ausblenden|löschen)|ohne herstellerbild|(raus|weg) mit (den )?herstellerbild/.test(t)) inp.hide_supplier_images = 'all';
    if (/herstellerbild\w*\s*(wieder|zurück|einblenden|zeigen)/.test(t)) inp.show_supplier_images = 'all';
    if (!atts.length && !inp.hide_supplier_images && !inp.show_supplier_images) return { reply: 'Häng die Fotos bitte an (Büroklammer unten), dann ordne ich sie dem ' + A.shortName(a) + ' zu.', calls: [] };
    return { calls: [{ name: 'set_article_media', input: inp }], after: r => r[0].ok ? 'Erledigt. Die Bildvarianten für alle Bildschirmgrößen sind schon erzeugt.' : 'Das ging so nicht:' };
  };

  SIM.text = function (text, t) {
    const a = SIM.article(t);
    if (!a) return { reply: help('Bei welchem Artikel soll ich das eintragen?'), calls: [] };
    if (a.ambiguous) return { reply: { text: 'Welches Modell meinst du?', suggestions: a.ambiguous.map(x => ({ label: x.name, cmd: text.replace(/beim\s+\S+/i, 'beim ' + A.shortName(x)) })) }, calls: [] };
    const field = /kurztext|teaser/.test(t) ? 'teaser' : /beschreibung/.test(t) ? 'description' : /\btitel\b/.test(t) ? 'title' : 'racepoint_note';
    if (/(zurücksetzen|lieferantentext|herstellertext|original)/.test(t)) return { calls: [{ name: 'update_article_text', input: { article: a.id, field, mode: 'reset' } }], after: r => r[0].ok ? 'Zurückgesetzt.' : 'Das ging nicht:' };
    const q = quoted(text);
    const dass = /,?\s*dass\s+(.+)$/i.exec(text);
    const de = q || (dass ? SIM.dassToMain(dass[1], a) : null);
    if (!de) return { reply: 'Was genau soll beim ' + A.shortName(a) + ' stehen? Am besten in Anführungszeichen, z. B. Kurztext „…“.', calls: [] };
    return { calls: [{ name: 'update_article_text', input: { article: a.id, field, mode: field === 'racepoint_note' && !q ? 'append' : 'set', text: { de } } }], after: r => r[0].ok ? 'Steht drin und ist live.' : 'Das ging nicht:' };
  };

  /* ---------------- Oberfläche ---------------- */
  V.assistant = {
    title: 'Assistent', keep: true,
    render() {
      const st = A.aiStatus;
      return '<div class="chat">' +
        '<header class="chat-h"><div><h1>Assistent</h1><p>Sag oder schreib, was sich ändern soll. Ich nutze dieselben Funktionen wie die Formulare – mit Rückgängig.</p></div><div class="chat-h-r">' + (st.live ? '<span class="ki-badge live"><i></i>Live</span>' : '<span class="ki-badge sim" title="Keine KI auf diesem Server: Befehls-Parser mit denselben Aktionen">Simulation</span>') + '<button class="btn btn-sm btn-ghost" data-act="chat-new">' + I('refresh') + 'Neu</button></div></header>' +
        '<div class="chat-log" id="chat-log" aria-live="polite"></div>' +
        '<form class="composer" data-submit="chat" id="composer"><div class="cmp-atts" id="cmp-atts"></div><div class="cmp-row"><label class="icon-btn cmp-clip" title="Foto oder Video anhängen" aria-label="Foto oder Video anhängen"><input type="file" accept="image/*,video/*" multiple hidden data-change="chat-file">' + I('clip') + '</label>' +
        '<textarea id="chat-in" name="q" rows="1" placeholder="Was soll sich ändern?" aria-label="Nachricht an den Assistenten"></textarea>' +
        '<button type="button" class="icon-btn cmp-mic" id="mic" data-act="mic" title="Spracheingabe" aria-label="Spracheingabe">' + I('mic') + '</button><button class="btn btn-primary cmp-send" aria-label="Senden">' + I('send') + '</button></div></form></div>';
    },
    mount() { V.chatUpdate(); V.composerUpdate(); const ta = document.getElementById('chat-in'); if (ta && C.prefill) { ta.value = C.prefill; C.prefill = null; ta.focus(); } if (!(window.SpeechRecognition || window.webkitSpeechRecognition)) { const m = document.getElementById('mic'); if (m) { m.disabled = true; m.title = 'Spracheingabe ist in diesem Browser nicht verfügbar'; } } }
  };
  function fmtText(s) { return esc(s).replace(/\n/g, '<br>'); }
  V.chatUpdate = function () {
    const box = document.getElementById('chat-log');
    if (!box) return;
    const log = S().chat.log;
    let h = '';
    if (!log.length) {
      h = '<div class="chat-empty"><div class="ce-ic">' + I('spark') + '</div><h2>Was soll sich ändern?</h2><p>Öffnungszeiten, Bilder, Texte, Banner, Termine oder Zahlen: einfach sagen. Ich führe es direkt aus und du kannst alles mit einem Tipp zurücknehmen.</p><div class="ex-list2">' + A.EXAMPLES.map(e => '<button class="ex2" data-act="example" data-text="' + esc(e.t) + '">' + I(e.i) + '<span>' + esc(e.t) + (e.needs ? '<small>' + esc(e.needs) + '</small>' : '') + '</span></button>').join('') + '</div><p class="limits">' + I('lock') + 'Ich ändere keine Preise oder Bestände (kommen aus Intec), keine Rechtstexte und keinen Code, und ich lösche nie endgültig. Banner mit Preisen und das Ausblenden von mehr als 5 Artikeln bestätigst du.</p></div>';
    } else {
      log.forEach(m => {
        if (m.role === 'user') {
          h += '<div class="msg me"><div class="bubble">' + (m.atts && m.atts.length ? '<div class="msg-atts">' + m.atts.map(a => '<span class="ma">' + U.img(S().blobs[a.thumbKey], a.name) + (a.kind === 'video' ? '<i>' + I('play') + '</i>' : '') + '</span>').join('') + '</div>' : '') + (m.text ? '<p>' + fmtText(m.text) + '</p>' : '') + '</div><time>' + esc(A.fmtStamp(m.at)) + '</time></div>';
        } else {
          h += '<div class="msg ki"><span class="ki-av">' + I('spark') + '</span><div class="bubble">' + (m.note ? '<p class="msg-note">' + esc(m.note) + '</p>' : '') + '<p>' + fmtText(m.text || '') + '</p>' + (m.results || []).map(U.resultCard).join('') +
            (m.suggestions && m.suggestions.length ? '<div class="sugs">' + m.suggestions.map(s => '<button class="chip" data-act="example" data-text="' + esc(s.cmd) + '">' + esc(s.label) + '</button>').join('') + '</div>' : '') +
            '<div class="msg-meta">' + (m.mode === 'live' ? '<span class="ki-badge live sm"><i></i>Live</span> ≈ ' + A.usd(m.cost || 0) + ' · ' + (m.rounds || 1) + (m.rounds > 1 ? ' Runden' : ' Runde') : '<span class="ki-badge sim sm">Simulation</span> keine KI-Kosten') + ' · ' + esc(A.fmtStamp(m.at)) + '</div></div></div>';
        }
      });
      if (C.busy) h += '<div class="msg ki typing"><span class="ki-av">' + I('spark') + '</span><div class="bubble"><span class="dots"><i></i><i></i><i></i></span><small>' + esc(C.progress) + '</small></div></div>';
    }
    box.innerHTML = h;
    requestAnimationFrame(() => { const ms = box.querySelectorAll('.msg'), last = ms[ms.length - 1]; if (!last) return; const prev = ms[ms.length - 2]; const target = last.classList.contains('ki') && !last.classList.contains('typing') && prev ? prev : last; const top = target.getBoundingClientRect().top + window.scrollY - 76; window.scrollTo({ top: Math.max(0, Math.min(top, document.documentElement.scrollHeight)), behavior: 'auto' }); });
  };
  V.composerUpdate = function () {
    const box = document.getElementById('cmp-atts');
    if (!box) return;
    box.innerHTML = C.compose.map(id => { const a = A.attachments.get(id) || { id, name: '…', processing: true }; return '<span class="catt">' + (a.processing ? '<span class="catt-p">' + I('refresh', 'spin') + '</span>' : U.img(S().blobs[a.thumbKey], a.name)) + '<span class="catt-n">' + esc(a.name) + '<small>' + (a.processing ? 'wird verarbeitet …' : a.kind === 'video' ? 'Video · ' + a.duration + ' s' : a.variants.length + ' Varianten') + '</small></span><button type="button" class="icon-btn" data-act="catt-rm" data-id="' + id + '" aria-label="Anhang entfernen">' + I('x') + '</button></span>'; }).join('');
    box.classList.toggle('on', C.compose.length > 0);
  };
  A.addChatFiles = async function (files) {
    const list = Array.from(files || []).slice(0, 4 - C.compose.length);
    await Promise.all(list.map(async f => {
      const p = A.attach(f), id = p.id;
      C.compose.push(id); V.composerUpdate();
      try { await p; } catch (e) { C.compose = C.compose.filter(x => x !== id); U.toast({ ok: false, error: f.name + ': ' + e.message }); }
      V.composerUpdate();
    }));
  };
  // Spracheingabe (Web Speech API)
  let rec = null;
  A.toggleMic = function () {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition, btn = document.getElementById('mic'), ta = document.getElementById('chat-in');
    if (!SR || !ta) return;
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = 'de-DE'; rec.interimResults = true; rec.continuous = false;
    const base = ta.value ? ta.value + ' ' : '';
    rec.onresult = e => { ta.value = base + Array.from(e.results).map(r => r[0].transcript).join(''); };
    rec.onend = () => { rec = null; if (btn) btn.classList.remove('rec'); };
    rec.onerror = () => { rec = null; if (btn) btn.classList.remove('rec'); };
    if (btn) btn.classList.add('rec');
    rec.start();
  };
})(window.RPA);
