/* Racepoint App · UI-Bausteine: Icons, Toasts mit Rückgängig, Sheets, Ergebniskarten, Medienkacheln. */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const U = A.ui = {};
  const esc = A.esc;
  const P = {
    home: '<path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
    bike: '<circle cx="5.5" cy="16" r="3.5"/><circle cx="18.5" cy="16" r="3.5"/><path d="M5.5 16 9 8h6l3.5 8M9 8l3 8h-6.5M12 16l3-8M8 5h3"/>',
    spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 16l.7 2.1 2.1.7-2.1.7L19 21.6l-.7-2.1-2.1-.7 2.1-.7z"/>',
    cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    grid: '<rect x="4" y="4" width="6" height="6" rx="1.5"/><rect x="14" y="4" width="6" height="6" rx="1.5"/><rect x="4" y="14" width="6" height="6" rx="1.5"/><rect x="14" y="14" width="6" height="6" rx="1.5"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    megaphone: '<path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z"/><path d="M15 8a5 5 0 0 1 0 8M18 5a9 9 0 0 1 0 14"/>',
    puzzle: '<path d="M10 3h4v3a2 2 0 1 0 4 0V3h3v7h-3a2 2 0 1 0 0 4h3v7h-7v-3a2 2 0 1 0-4 0v3H3v-7h3a2 2 0 1 0 0-4H3V3z"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeoff: '<path d="M3 3l18 18M10.6 5.1A10.6 10.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3.2 4.1M6.6 6.6C3.9 8.4 2 12 2 12s3.5 7 10 7c1.8 0 3.4-.5 4.8-1.3M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
    upload: '<path d="M12 16V4M7 9l5-5 5 5M4 20h16"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
    clip: '<path d="m21 11-8.5 8.5a5 5 0 0 1-7-7L14 4a3.5 3.5 0 0 1 5 5l-8.5 8.5a2 2 0 0 1-3-3L15 7"/>',
    send: '<path d="M4 12 20 4l-6 16-3-7z"/><path d="m11 13 9-9"/>',
    undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    check: '<path d="m5 12 5 5L20 7"/>',
    x: '<path d="M6 6l12 12M18 6 6 18"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    up: '<path d="M12 19V5M6 11l6-6 6 6"/>',
    down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    alert: '<path d="M12 3 2 20h20z"/><path d="M12 10v4M12 17h.01"/>',
    video: '<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3z"/>',
    play: '<path d="M7 4v16l13-8z"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    target: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
    link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
    map: '<path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    refresh: '<path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4"/>',
    edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    ext: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    logout: '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 17l5-5-5-5M15 12H3"/>'
  };
  U.icon = (n, cls) => '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (P[n] || '') + '</svg>';
  const BIKE_PH = '<svg viewBox="0 0 120 70" class="ph-bike" aria-hidden="true"><circle cx="26" cy="46" r="17"/><circle cx="94" cy="46" r="17"/><path d="M26 46 44 20h30l20 26M44 20l15 26H26M59 46l15-26M40 13h12M74 20l-3-8h8"/></svg>';
  U.placeholder = label => '<div class="ph">' + BIKE_PH + '<span>' + esc(label || 'Herstellerbild') + '</span></div>';
  // Bilder von specialized.com laden im Sandbox-Screenshot nicht: dann ruhiger Platzhalter
  document.addEventListener('error', e => {
    const t = e.target;
    if (t && t.tagName === 'IMG' && t.hasAttribute('data-ph')) { const d = document.createElement('div'); d.innerHTML = U.placeholder(t.getAttribute('data-ph')); const ph = d.firstChild; ph.style.cssText = t.getAttribute('style') || ''; t.replaceWith(ph); }
  }, true);
  U.img = function (src, label, style, cls) {
    if (!src) return U.placeholder(label).replace('class="ph"', 'class="ph ' + (cls || '') + '" style="' + esc(style || '') + '"');
    return '<img class="' + (cls || '') + '" src="' + esc(src) + '" alt="' + esc(label || '') + '" data-ph="' + esc(label || 'Bild') + '" loading="lazy" style="' + esc(style || '') + '">';
  };
  U.focalStyle = f => 'object-position:' + (f ? f.x : 50) + '% ' + (f ? f.y : 50) + '%';

  /* ---------- Badges ---------- */
  U.badge = (text, kind, icon) => '<span class="badge ' + (kind || '') + '">' + (icon ? U.icon(icon) : '') + esc(text) + '</span>';
  U.src = {
    erp: () => U.badge('ERP · Intec', 'b-erp', 'lock'),
    supplier: () => U.badge('Lieferant', 'b-sup'),
    override: (by, at) => U.badge('Eigener Text' + (by ? ' · ' + by : '') + (at ? ' · ' + A.fmtStamp(at) : ''), 'b-own'),
    ki: () => U.badge('KI-übersetzt', 'b-ki', 'spark'),
    pending: () => U.badge('Übersetzung folgt (KI offline)', 'b-warn'),
    demo: t => U.badge(t || 'Demo', 'b-demo'),
    etermin: () => U.badge('eTermin', 'b-et', 'cal')
  };
  U.actor = function (a) {
    if (a === 'KI') return '<span class="av av-ki" title="KI-Assistent">' + U.icon('spark') + '</span>';
    if (a === 'Lieferant') return '<span class="av av-sup" title="Lieferant">L</span>';
    return '<span class="av av-me" title="Achim">A</span>';
  };

  /* ---------- Toast ---------- */
  let toastTimer;
  U.toast = function (res, opts) {
    opts = opts || {};
    let box = document.getElementById('toast');
    if (!box) { box = document.createElement('div'); box.id = 'toast'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
    const ok = res.ok !== false;
    box.className = 'toast on ' + (ok ? (res.needsConfirmation ? 't-warn' : 't-ok') : 't-err');
    box.innerHTML = '<span class="t-ic">' + U.icon(ok ? (res.needsConfirmation ? 'alert' : 'check') : 'alert') + '</span><div class="t-body"><b>' + esc(ok ? res.summary : res.error) + '</b>' + (ok && res.lines && res.lines.length && !opts.short ? '<small>' + res.lines.map(esc).join('<br>') + '</small>' : '') + '</div>' +
      (ok && res.historyId && !res.undo ? '<button class="t-undo" data-act="undo" data-id="' + res.historyId + '">' + U.icon('undo') + 'Rückgängig</button>' : '') + '<button class="t-x" aria-label="Schließen" data-act="toast-close">' + U.icon('x') + '</button>';
    clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('on'), ok ? 7000 : 9000);
  };
  U.closeToast = () => { const b = document.getElementById('toast'); if (b) b.classList.remove('on'); };
  // Aktion aus dem Formular: gleiche Funktion wie der Assistent, danach Toast mit Rückgängig
  U.act = function (name, input, ctx) {
    const res = A.run(name, input, Object.assign({ actor: 'Achim', via: 'Formular' }, ctx || {}));
    U.toast(res);
    return res;
  };

  /* ---------- Sheet (Dialog, auf dem Handy von unten) ---------- */
  U.sheet = function (title, html, opts) {
    opts = opts || {};
    U.closeSheet();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap'; wrap.id = 'sheet';
    wrap.innerHTML = '<div class="sheet ' + (opts.wide ? 'wide' : '') + '" role="dialog" aria-modal="true" aria-label="' + esc(title) + '"><div class="sheet-h"><h3>' + esc(title) + '</h3><button class="icon-btn" data-act="sheet-close" aria-label="Schließen">' + U.icon('x') + '</button></div><div class="sheet-b">' + html + '</div></div>';
    document.body.appendChild(wrap);
    requestAnimationFrame(() => wrap.classList.add('on'));
    wrap.addEventListener('click', e => { if (e.target === wrap) U.closeSheet(); });
    if (opts.onMount) opts.onMount(wrap.querySelector('.sheet-b'));
    return wrap;
  };
  U.closeSheet = () => { const s = document.getElementById('sheet'); if (s) s.remove(); };

  /* ---------- Ergebniskarte (Assistent + Übersicht) ---------- */
  U.resultCard = function (res) {
    const entry = res.historyId && A.state.history.find(h => h.id === res.historyId);
    const undone = entry && entry.undone;
    const cls = !res.ok ? 'rc-err' : res.needsConfirmation ? 'rc-warn' : res.read ? 'rc-read' : 'rc-ok';
    const ic = !res.ok ? 'alert' : res.needsConfirmation ? 'alert' : res.read ? 'chart' : 'check';
    let h = '<div class="rc ' + cls + (undone ? ' rc-undone' : '') + '"><div class="rc-ic">' + U.icon(ic) + '</div><div class="rc-b"><div class="rc-s">' + esc(res.ok ? res.summary : res.error) + '</div>';
    if (res.ok && res.lines && res.lines.length) h += '<ul class="rc-l">' + res.lines.slice(0, 8).map(l => '<li>' + esc(l) + '</li>').join('') + '</ul>';
    if (res.ok && res.needsConfirmation && res.confirm) {
      const done = res.confirmed;
      h += done ? '<div class="rc-confirmed">' + U.icon('check') + esc(done) + '</div>' : '<div class="rc-confirm">' + (res.confirm.omnibus ? '<label class="chk"><input type="checkbox" data-omni> Referenzpreis geprüft: niedrigster Preis der letzten 30 Tage (EU-Omnibus)</label>' : '') + '<button class="btn btn-primary btn-sm" data-act="confirm-result" data-rid="' + esc(res.rid || '') + '">' + esc(res.confirm.label) + '</button></div>';
    }
    if (res.ok && res.historyId && !res.read) {
      h += '<div class="rc-a">' + (undone ? '<span class="muted">Rückgängig gemacht · ' + esc(A.fmtStamp(undone.at)) + '</span>' + (undone.entry ? ' <button class="link" data-act="undo" data-id="' + undone.entry + '">Wiederherstellen</button>' : '') : '<button class="link" data-act="undo" data-id="' + res.historyId + '">' + U.icon('undo') + 'Rückgängig</button>') + '</div>';
    }
    return h + '</div></div>';
  };

  U.langTabs = function (name, current) {
    return '<div class="seg seg-lang" role="tablist">' + A.LANGS.map(l => '<button type="button" role="tab" aria-selected="' + (l === current) + '" data-act="lang" data-group="' + esc(name) + '" data-lang="' + l + '">' + l.toUpperCase() + '</button>').join('') + '</div>';
  };
  U.langState = {};
  U.getLang = name => U.langState[name] || 'de';

  U.switchHtml = (on, act, attrs, label) => '<button type="button" class="switch ' + (on ? 'on' : '') + '" role="switch" aria-checked="' + !!on + '" data-act="' + act + '" ' + (attrs || '') + ' aria-label="' + esc(label || '') + '"><i></i></button>';

  U.empty = (icon, title, text) => '<div class="empty">' + U.icon(icon) + '<b>' + esc(title) + '</b><span>' + esc(text || '') + '</span></div>';
  U.sparkline = function (vals, w, h) {
    w = w || 120; h = h || 32;
    const max = Math.max.apply(null, vals) || 1, min = Math.min.apply(null, vals), step = w / (vals.length - 1);
    const pts = vals.map((v, i) => [i * step, h - 3 - (v - min) / (max - min || 1) * (h - 6)]);
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true"><path d="' + d + 'L' + w + ' ' + h + 'L0 ' + h + 'Z" class="spark-a"/><path d="' + d + '" class="spark-l"/><circle cx="' + pts[pts.length - 1][0] + '" cy="' + pts[pts.length - 1][1] + '" r="2.5" class="spark-d"/></svg>';
  };
})(window.RPA);
