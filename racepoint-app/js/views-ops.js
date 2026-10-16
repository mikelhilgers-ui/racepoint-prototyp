/* Racepoint App · Termine (eTermin), Statistik, Verlauf, Mehr, Anmeldung */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const U = A.ui, esc = A.esc, I = U.icon, V = A.views = A.views || {};
  const S = () => A.state;

  /* ================= Termine ================= */
  const apptTab = { t: 'bookings', propose: null };
  V.appointments = {
    title: 'Termine',
    render() {
      const R = S().appointments.requests, rules = S().appointments.rules;
      const open = R.filter(r => r.status === 'open'), done = R.filter(r => r.status !== 'open').sort((a, b) => (a.proposed || a.start) < (b.proposed || b.start) ? -1 : 1);
      const head = U.head('Termine', 'Buchungen kommen aus <b>eTermin</b>: Der KI-Chat liest dort Leistungen und freie Zeiten und legt die Buchung an. Mails, Erinnerungen und den Abgleich mit deinem Google Kalender macht eTermin.', U.src.etermin() + U.src.demo('Demo-Daten')) +
        '<div class="seg tabs"><button data-act="appt-tab" data-t="bookings" aria-pressed="' + (apptTab.t === 'bookings') + '">Buchungen <small>' + open.length + '</small></button><button data-act="appt-tab" data-t="services" aria-pressed="' + (apptTab.t === 'services') + '">Leistungen</button></div>';
      if (apptTab.t === 'services') {
        return head + '<section class="card"><div class="card-h"><h2>Leistungen in eTermin</h2><a class="btn btn-sm" href="https://www.etermin.net/" target="_blank" rel="noopener">In eTermin bearbeiten ' + I('ext') + '</a></div><p class="muted small">' + I('lock') + 'Dauer, Tage, Zeitfenster, Kapazität und Puffer pflegst du in eTermin. Die App zeigt sie nur an (Stand der letzten Abfrage über die eTermin-API). Feiertage und Ausnahmen aus den Öffnungszeiten blocken automatisch.</p>' +
          '<div class="svc">' + Object.entries(rules).map(([k, r]) => '<div class="svc-r"><div class="svc-h"><b>' + esc(r.name) + '</b>' + U.badge(r.minutes + ' Min.', 'b-sup') + '</div><dl class="facts compact"><div><dt>Tage</dt><dd>' + r.days.map(d => A.WD[d]).join(', ') + '</dd></div><div><dt>Zeitfenster</dt><dd>' + A.timeShort(r.window[0]) + '–' + A.timeShort(r.window[1]) + ' Uhr</dd></div><div><dt>Pro Tag</dt><dd>max. ' + r.perDay + '</dd></div><div><dt>Puffer</dt><dd>' + r.buffer + ' Min.</dd></div><div><dt>Ressource</dt><dd>' + esc(r.resource) + '</dd></div></dl>' +
            '<form class="note-f" data-submit="appt-note" data-type="' + k + '"><label class="fld"><span>' + I('spark') + 'Notiz für den KI-Chat (nur in der App)</span><input name="note" value="' + esc(r.note || '') + '" maxlength="300" placeholder="z. B. Rad bitte sauber bringen"></label><button class="btn btn-sm">Speichern</button></form></div>').join('') + '</div></section>';
      }
      return head + '<section class="card"><div class="card-h"><h2>Warten auf deine Bestätigung</h2><span class="count">' + open.length + '</span></div>' +
        '<p class="muted small">' + I('alert') + 'Bestätigen in der App läuft über die eTermin-API, wenn eTermin auf „Buchung bestätigen“ eingestellt ist. Abhängig von eTermin-Einstellung / API-Umfang prüfen. Sonst bestätigst du direkt in eTermin.</p>' +
        (open.length ? '<ul class="appts">' + open.map(r => apptCard(r, rules)).join('') + '</ul>' : U.empty('check', 'Alles bestätigt', 'Neue Buchungen aus dem KI-Chat erscheinen hier.')) + '</section>' +
        '<section class="card"><div class="card-h"><h2>Bestätigt & erledigt</h2></div><ul class="appts small">' + done.map(r => { const rule = rules[r.type]; return '<li class="appt done"><div class="appt-when"><b>' + A.fmtDate((r.proposed || r.start).slice(0, 10)) + '</b><span>' + A.timeShort((r.proposed || r.start).slice(11)) + ' Uhr</span></div><div class="appt-b"><b>' + esc(rule.name) + ' · ' + esc(r.who) + '</b><small>' + esc(r.note) + '</small></div>' + U.badge({ confirmed: 'Bestätigt', proposed: 'Neuer Vorschlag', declined: 'Abgelehnt' }[r.status], r.status === 'confirmed' ? 'b-green' : r.status === 'declined' ? 'b-sup' : 'b-ki') + '</li>'; }).join('') + '</ul></section>';
    }
  };
  function apptCard(r, rules) {
    const rule = rules[r.type], c = A.checkSlot(r.type, r.start, r.id), alt = !c.ok || apptTab.propose === r.id ? A.suggestSlot(r.type, A.addDays(r.start.slice(0, 10), -1)) : null;
    return '<li class="appt"><div class="appt-when"><b>' + A.fmtDate(r.start.slice(0, 10)) + '</b><span>' + A.timeShort(r.start.slice(11)) + ' Uhr</span></div><div class="appt-b"><div class="appt-top"><b>' + esc(rule.name) + '</b>' + U.badge(rule.minutes + ' Min.', 'b-sup') + U.src.etermin() + U.badge(r.lang.toUpperCase(), 'b-sup') + '</div><p>' + esc(r.who) + ' · „' + esc(r.note) + '“</p><small class="muted">' + esc(r.via) + ' · ' + esc(r.id) + ' · eingegangen ' + esc(A.fmtStamp(new Date(r.at + ':00+02:00').toISOString())) + '</small>' +
      (c.ok ? '<p class="fit ok">' + I('check') + 'Passt: frei laut eTermin, innerhalb der Regeln</p>' : '<p class="fit bad">' + I('alert') + esc(c.problems.join(' · ')) + '</p>') +
      (rule.note ? '<p class="muted small">' + I('spark') + 'KI-Hinweis an Kunden: ' + esc(rule.note) + '</p>' : '') +
      (apptTab.propose === r.id ? '<form class="propose" data-submit="propose" data-id="' + r.id + '"><input type="datetime-local" name="start" value="' + esc(alt || '') + '" required aria-label="Neuer Termin"><button class="btn btn-sm btn-primary">Vorschlag senden</button><button type="button" class="btn btn-sm btn-ghost" data-act="propose-cancel">Abbrechen</button></form>' :
        '<div class="row appt-a"><button class="btn btn-sm btn-primary" data-act="appt" data-do="confirm" data-id="' + r.id + '" ' + (c.ok ? '' : 'disabled title="Wunschtermin passt nicht"') + '>' + I('check') + 'Bestätigen</button><button class="btn btn-sm" data-act="appt-propose" data-id="' + r.id + '">' + I('cal') + 'Anderen Termin vorschlagen</button><button class="btn btn-sm btn-ghost" data-act="appt" data-do="decline" data-id="' + r.id + '">Ablehnen</button></div>' + (!c.ok && alt ? '<p class="muted small">Nächster freier Termin: <button class="link" data-act="appt-propose" data-id="' + r.id + '">' + esc(A.fmtSlot(alt)) + '</button></p>' : '')) + '</div></li>';
  }
  V.apptTab = apptTab;

  /* ================= Statistik ================= */
  V.stats = {
    title: 'Statistik',
    render() {
      const t = A.today(), r = A.statsRange(A.addDays(t, -29), t), prev = A.statsRange(A.addDays(t, -59), A.addDays(t, -30));
      const cost = A.kiCost(), pct = Math.min(100, cost.total / cost.limit * 100);
      const topics = Object.entries(r.topics).sort((a, b) => b[1] - a[1]);
      const bikes = A.TOP_BIKES.map(([n, w]) => [n, Math.round(r.topics.Beratung * w * 1.6)]);
      const delta = (a, b) => { const d = Math.round((a - b) / Math.max(1, b) * 100); return '<span class="delta ' + (d >= 0 ? 'up' : 'down') + '">' + (d >= 0 ? '+' : '') + d + ' %</span>'; };
      const stale = A.erpStale();
      return U.head('Statistik', 'Letzte 30 Tage. Gezählt wird cookielos, gespeichert werden nur Summen pro Tag, keine Personen, keine IP-Adressen, keine Chatverläufe.') +
        '<section class="kpis">' + [['Website-Besuche', r.visits.toLocaleString('de-BE'), delta(r.visits, prev.visits)], ['KI-Gespräche', r.chats.toLocaleString('de-BE'), delta(r.chats, prev.chats)], ['Übergaben an dich', r.handoffs, delta(r.handoffs, prev.handoffs)], ['Terminanfragen', r.appointments, delta(r.appointments, prev.appointments)]].map(k => '<div class="kpi"><span class="kpi-l">' + k[0] + '</span><b class="kpi-v">' + k[1] + '</b><span class="kpi-s">' + k[2] + ' zu den 30 Tagen davor</span></div>').join('') + '</section>' +
        '<div class="ov-grid"><section class="card span2"><div class="card-h"><h2>Website-Besuche pro Tag</h2></div>' + bars(r.days, 'visits', 'bar-ink') + '</section>' +
        '<section class="card span2"><div class="card-h"><h2>KI-Chat-Gespräche pro Tag</h2></div>' + bars(r.days, 'chats', 'bar-red') + '</section>' +
        '<section class="card"><div class="card-h"><h2>Themen im KI-Chat</h2></div>' + hbars(topics) + '</section>' +
        '<section class="card"><div class="card-h"><h2>Meistgefragte Bikes</h2></div>' + hbars(bikes) + '</section>' +
        '<section class="card"><div class="card-h"><h2>Konnte die KI nicht beantworten</h2></div><ul class="unans">' + A.UNANSWERED.map(u => '<li><span class="n">' + u.n + '×</span><div><b>' + esc(u.q) + '</b><small>' + esc(u.topic) + '</small></div><button class="link" data-act="ask-prefill" data-text="' + esc('Antwort für den KI-Chat hinterlegen: ' + u.q + ' → ') + '">Antwort hinterlegen</button></li>').join('') + '</ul></section>' +
        '<section class="card"><div class="card-h"><h2>KI-Kosten ' + A.MONTHS[Number(t.slice(5, 7)) - 1] + '</h2>' + U.badge('Schätzung', 'b-sup') + '</div><div class="cost"><b class="big">' + A.usd(cost.total) + '</b><span class="muted">von ' + A.usd(cost.limit) + ' Monatslimit</span></div><div class="meter lg ' + (pct > 80 ? 'warn' : '') + '"><i style="width:' + pct.toFixed(1) + '%"></i></div><dl class="facts compact"><div><dt>Besucher-Chat</dt><dd>' + A.usd(cost.visitorChat) + '</dd></div><div><dt>Assistent (diese App)</dt><dd>' + A.usd(cost.admin) + '</dd></div><div><dt>Preisbasis</dt><dd>$2 Eingabe / $10 Ausgabe je 1 Mio. Token</dd></div></dl><p class="muted small">Bei 100 % schaltet der Besucher-Chat auf die Offline-Antworten um; der Assistent fragt vorher nach.</p></section>' +
        '<section class="card span2"><div class="card-h"><h2>ERP-Abgleich (Intec)</h2>' + U.src.erp() + '</div><div class="erp-st ' + (stale ? 'bad' : 'good') + '">' + I(stale ? 'alert' : 'check') + '<div><b>Letzter Abgleich ' + esc(A.ago(A.erpSyncedAt())) + '</b><small>' + A.erp.rows.length + ' Varianten · lokaler Sync-Dienst im Laden · Demo-Export (data/erp-export.csv)</small></div></div>' +
        (stale ? '<p class="warnbox">' + I('alert') + 'Älter als 24 Stunden: Die Website zeigt bei allen Preisen „Preis im Laden erfragen“ und der KI-Chat nennt keine Bestände. Bitte den PC im Laden und den Sync-Dienst prüfen.</p>' : '<p class="muted small">Nach 24 Stunden ohne Abgleich erscheint hier eine Warnung und die Website zeigt „Preis im Laden erfragen“.</p>') +
        '<label class="chk">' + U.switchHtml(S().settings.erpOutage, 'erp-outage', '', 'Ausfall simulieren') + ' Demo: Ausfall des Sync-Dienstes simulieren (> 24 h)</label></section></div>';
    }
  };
  // Einfache Balken: eine Reihe pro Diagramm, Tooltip per <title> und Tabellenansicht
  function bars(days, key, cls) {
    const max = Math.max.apply(null, days.map(d => d[key])) || 1, W = 600, H = 120, bw = W / days.length;
    const ticks = [0, Math.round(max / 2), max];
    return '<div class="chart"><svg viewBox="0 0 ' + W + ' ' + (H + 18) + '" preserveAspectRatio="none" role="img" aria-label="' + key + ' pro Tag">' + ticks.map(tk => '<line x1="0" x2="' + W + '" y1="' + (H - tk / max * (H - 8)) + '" y2="' + (H - tk / max * (H - 8)) + '" class="grid"/>').join('') +
      days.map((d, i) => { const h = Math.max(2, d[key] / max * (H - 8)); return '<g class="bar-g"><rect x="' + (i * bw) + '" y="0" width="' + bw + '" height="' + H + '" class="hit"><title>' + A.fmtDate(d.date) + ': ' + d[key] + '</title></rect><path class="' + cls + '" d="M' + (i * bw + 1) + ' ' + H + 'V' + (H - h + 3) + 'q0 -3 3 -3h' + (bw - 8) + 'q3 0 3 3V' + H + 'z"/></g>'; }).join('') +
      '</svg><div class="chart-x"><span>' + A.fmtDate(days[0].date, { weekday: false }) + '</span><span>max. ' + max + '</span><span>heute</span></div><details class="tbl-toggle"><summary>Als Tabelle</summary><div class="tbl-wrap"><table class="tbl"><tbody>' + days.slice().reverse().map(d => '<tr><td>' + A.fmtDate(d.date) + '</td><td class="r">' + d[key] + '</td></tr>').join('') + '</tbody></table></div></details></div>';
  }
  function hbars(rows) {
    const max = Math.max.apply(null, rows.map(r => r[1])) || 1;
    return '<ul class="hbars">' + rows.map(r => '<li><span class="hb-l">' + esc(r[0]) + '</span><span class="hb-t"><i style="width:' + (r[1] / max * 100).toFixed(1) + '%"></i></span><b>' + r[1] + '</b></li>').join('') + '</ul>';
  }

  /* ================= Verlauf ================= */
  const histFilter = { who: 'all' };
  V.historyRow = function (h) {
    const undone = h.undone;
    const canUndo = h.before && !undone && h.kind !== 'supplier';
    return '<li class="hrow ' + (undone ? 'undone' : '') + '">' + U.actor(h.actor) + '<div class="hrow-b"><b>' + esc(h.label) + '</b><small>' + esc(h.actor === 'KI' ? 'KI' : h.actor) + ' · ' + esc(A.fmtStamp(h.at)) + (h.via && h.via !== 'Formular' ? ' · ' + esc(h.via) : '') + (h.reverts ? ' · macht eine Änderung rückgängig' : '') + '</small></div>' +
      (canUndo ? '<button class="btn btn-sm btn-ghost" data-act="undo" data-id="' + h.id + '">' + I('undo') + (h.kind === 'undo' ? 'Wiederherstellen' : 'Rückgängig') + '</button>' : undone ? '<span class="muted small">rückgängig · ' + esc(A.fmtStamp(undone.at)) + '</span>' : h.noUndo ? '<span class="muted small">' + esc(h.noUndo) + '</span>' : '') + '</li>';
  };
  V.history = {
    title: 'Verlauf',
    render() {
      const all = S().history.slice().reverse();
      const list = all.filter(h => histFilter.who === 'all' || h.actor === histFilter.who || (histFilter.who === 'Achim' && h.actor !== 'KI' && h.actor !== 'Lieferant'));
      const groups = {};
      list.forEach(h => { const d = A.brussels(new Date(h.at)).date; (groups[d] = groups[d] || []).push(h); });
      return U.head('Verlauf', 'Jede Änderung, von dir oder der KI, mit einem Tipp rückgängig. Gelöscht wird nie etwas, nur ausgeblendet.') +
        '<div class="toolbar"><div class="chips">' + [['all', 'Alle'], ['Achim', 'Achim'], ['KI', 'KI-Assistent'], ['Lieferant', 'Lieferant']].map(([k, n]) => '<button class="chip ' + (histFilter.who === k ? 'on' : '') + '" data-act="hist-who" data-who="' + k + '">' + n + ' <small>' + all.filter(h => k === 'all' || h.actor === k).length + '</small></button>').join('') + '</div></div>' +
        (list.length ? Object.entries(groups).map(([d, hs]) => '<section class="card hist-day"><h3>' + esc(d === A.today() ? 'Heute' : d === A.addDays(A.today(), -1) ? 'Gestern' : A.WD_LONG[A.weekday(d)] + ', ' + A.fmtDate(d, { weekday: false })) + '</h3><ul class="hist">' + hs.map(V.historyRow).join('') + '</ul></section>').join('') : U.empty('history', 'Noch nichts geändert'));
    }
  };
  V.histFilter = histFilter;

  /* ================= Mehr / Einstellungen ================= */
  V.more = {
    title: 'Mehr',
    render() {
      const items = [['pages', '#/seiten', 'image', 'Seiten & Heroes'], ['hours', '#/zeiten', 'clock', 'Öffnungszeiten'], ['banners', '#/banner', 'megaphone', 'Banner & Aktionen'], ['modules', '#/module', 'puzzle', 'Module'], ['stats', '#/statistik', 'chart', 'Statistik'], ['history', '#/verlauf', 'history', 'Verlauf']];
      const st = A.aiStatus || {};
      return U.head('Mehr') + '<div class="more-grid">' + items.map(i => '<a class="more-i" href="' + i[1] + '">' + I(i[2]) + '<b>' + i[3] + '</b></a>').join('') + '</div>' + V.settingsHtml(st);
    }
  };
  V.settingsHtml = function (st) {
    const s = S().settings;
    return '<section class="card set"><div class="card-h"><h2>Einstellungen & Demo</h2></div>' +
      '<div class="set-r">' + I('logout') + '<div><b>Angemeldet mit Google</b><small>' + esc(s.user || 'achim@… (Demo)') + ' · nur freigegebene Google-Adressen</small></div><button class="btn btn-sm btn-ghost" data-act="logout">Abmelden</button></div>' +
      '<div class="set-r">' + I('spark') + '<div><b>KI-Assistent: ' + (st.live ? 'Live' : 'Simulation') + '</b><small>' + (st.live ? 'Modell über den Racepoint-Server, Schlüssel nur auf dem Server.' : 'Kein KI-Schlüssel auf diesem Server: Ein fester Befehls-Parser antwortet mit denselben Aktionen.') + '</small></div>' + U.badge(st.live ? 'Live' : 'Simulation', st.live ? 'b-green' : 'b-warn') + '</div>' +
      '<div class="set-r">' + I('map') + '<div><b>Öffnungszeiten an Google Maps</b><small>Business Profile API · Demo</small></div>' + U.switchHtml(s.googleMaps !== false, 'gmaps', '', 'Google Maps') + '</div>' +
      '<div class="set-r">' + I('refresh') + '<div><b>Demo zurücksetzen</b><small>Alle Änderungen, Uploads und den Verlauf verwerfen.</small></div><button class="btn btn-sm" data-act="reset">Zurücksetzen</button></div></section>';
  };

  /* ================= Anmeldung ================= */
  V.loginHtml = function () {
    return '<div class="login"><div class="login-card"><img src="../assets/racepoint-logo-white.svg" alt="Racepoint" class="login-logo"><span class="eyebrow">Racepoint App</span><h1>Website, Shop und KI-Chat. An einem Ort.</h1><p>Formulare oder einfach sagen, was sich ändern soll. Der Assistent erledigt den Rest.</p>' +
      '<button class="btn btn-google" data-act="login"><span class="g">G</span>Mit Google anmelden</button><p class="muted small">Nur freigegebene Google-Adressen von Racepoint. Demo: Die Anmeldung wird simuliert, es werden keine Daten an Google gesendet.</p></div></div>';
  };
})(window.RPA);
