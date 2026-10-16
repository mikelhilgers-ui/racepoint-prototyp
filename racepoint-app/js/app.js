/* Racepoint App · Shell, Router und Ereignisse */
(function (A) {
  'use strict';
  const U = A.ui, V = A.views, I = U.icon, esc = A.esc;
  const S = () => A.state;
  const NAV = [
    { g: 'Cockpit', items: [['overview', '#/uebersicht', 'home', 'Übersicht'], ['assistant', '#/assistent', 'spark', 'Assistent']] },
    { g: 'Inhalte', items: [['articles', '#/artikel', 'bike', 'Artikel'], ['pages', '#/seiten', 'image', 'Seiten & Heroes'], ['banners', '#/banner', 'megaphone', 'Banner & Aktionen'], ['modules', '#/module', 'puzzle', 'Module']] },
    { g: 'Laden', items: [['hours', '#/zeiten', 'clock', 'Öffnungszeiten'], ['appointments', '#/termine', 'cal', 'Termine']] },
    { g: 'Auswertung', items: [['stats', '#/statistik', 'chart', 'Statistik'], ['history', '#/verlauf', 'history', 'Verlauf']] }
  ];
  const TABS = [['overview', '#/uebersicht', 'home', 'Übersicht'], ['articles', '#/artikel', 'bike', 'Artikel'], ['assistant', '#/assistent', 'spark', 'Assistent'], ['appointments', '#/termine', 'cal', 'Termine'], ['more', '#/mehr', 'grid', 'Mehr']];
  const ROUTES = { '': 'overview', uebersicht: 'overview', artikel: 'articles', assistent: 'assistant', seiten: 'pages', zeiten: 'hours', banner: 'banners', module: 'modules', termine: 'appointments', statistik: 'stats', verlauf: 'history', mehr: 'more', einstellungen: 'more' };
  let cur = { view: 'overview', params: {} };
  function parse() {
    const parts = (location.hash.replace(/^#\/?/, '') || '').split('/');
    if (parts[0] === 'artikel' && parts[1]) return { view: 'article', params: { id: decodeURIComponent(parts[1]) }, nav: 'articles' };
    if (parts[0] === 'seiten' && parts[1]) return { view: 'page', params: { id: decodeURIComponent(parts[1]) }, nav: 'pages' };
    const v = ROUTES[parts[0]] || 'overview';
    return { view: v, params: {}, nav: v };
  }
  function shell() {
    const st = A.aiStatus, open = S().appointments.requests.filter(r => r.status === 'open').length;
    document.getElementById('side-nav').innerHTML = NAV.map(g => '<div class="nav-g"><span>' + g.g + '</span>' + g.items.map(([k, h, i, n]) => '<a href="' + h + '" class="' + (cur.nav === k ? 'on' : '') + (k === 'assistant' ? ' nav-ki' : '') + '">' + I(i) + '<b>' + n + '</b>' + (k === 'appointments' && open ? '<em>' + open + '</em>' : '') + '</a>').join('') + '</div>').join('');
    document.getElementById('tabbar').innerHTML = TABS.map(([k, h, i, n]) => '<a href="' + h + '" class="' + ((cur.nav === k || (k === 'more' && ['pages', 'hours', 'banners', 'modules', 'stats', 'history'].includes(cur.nav))) ? 'on' : '') + (k === 'assistant' ? ' tab-ki' : '') + '" aria-label="' + n + '"><span class="tab-ic">' + I(i) + (k === 'appointments' && open ? '<em>' + open + '</em>' : '') + '</span><b>' + n + '</b></a>').join('');
    const title = (V[cur.view] && V[cur.view].title) || '';
    document.getElementById('top-title').textContent = cur.view === 'article' ? A.shortName(S().articles[cur.params.id] || { name: 'Artikel' }) : cur.view === 'page' ? ((A.PAGES.find(p => p.id === cur.params.id) || {}).name || 'Seite') : title;
    document.getElementById('top-status').innerHTML = '<a href="#/statistik" class="erp-chip ' + (A.erpStale() ? 'bad' : '') + '" title="Intec-Abgleich">' + I('db') + '<span>ERP ' + esc(A.ago(A.erpSyncedAt())) + '</span></a>' + (st.live ? '<span class="ki-badge live"><i></i>KI live</span>' : '<span class="ki-badge sim" title="Kein KI-Schlüssel auf dem Server: Simulation mit denselben Aktionen">Simulation</span>');
    document.getElementById('side-user').innerHTML = '<span class="av av-me">A</span><div><b>Achim Leufgen</b><small>Google-Konto</small></div><a href="#/einstellungen" class="icon-btn" aria-label="Einstellungen">' + I('gear') + '</a>';
    document.body.dataset.view = cur.view;
  }
  function render(keepScroll) {
    if (!S().settings.signedIn) { document.getElementById('login').innerHTML = V.loginHtml(); document.body.classList.add('signed-out'); return; }
    document.body.classList.remove('signed-out'); document.getElementById('login').innerHTML = '';
    const view = V[cur.view] || V.overview;
    const y = window.scrollY, main = document.getElementById('view');
    main.innerHTML = view.render(cur.params) || '';
    main.className = 'view view-' + cur.view;
    if (view.mount) view.mount(main, cur.params);
    shell();
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
  }
  A.render = render;
  function go() { cur = parse(); U.closeSheet(); render(false); }
  window.addEventListener('hashchange', go);
  A.on('change', ev => {
    if (!S()) return;
    const view = V[cur.view];
    if (view && view.keep && !(ev && ev.reset)) { V.chatUpdate(); shell(); return; }
    if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) && document.activeElement.closest('#view') && !(ev && (ev.reset || ev.entry))) return;
    render(true);
  });
  A.on('ai', () => { if (S()) render(true); });
  A.on('erp', () => { if (S()) render(true); });
  const goAssistant = (text, send) => {
    const C = A.chat;
    if (location.hash !== '#/assistent') location.hash = '#/assistent';
    setTimeout(() => { if (send) A.sendChat(text, C.compose.splice(0)); else { const ta = document.getElementById('chat-in'); if (ta) { ta.value = text; ta.focus(); } else C.prefill = text; } V.composerUpdate(); }, 30);
  };

  /* ---------- Klicks ---------- */
  const acts = {
    'toast-close': () => U.closeToast(),
    'sheet-close': () => U.closeSheet(),
    undo: el => { const r = A.run('undo', { history_id: el.dataset.id }, { actor: 'Achim', via: 'Tippen' }); U.toast(r, { short: true }); },
    'ask-example': el => { const ex = A.EXAMPLES.find(e => e.t === el.dataset.text); goAssistant(el.dataset.text, !(ex && ex.needs)); if (ex && ex.needs) U.toast({ ok: true, summary: 'Bitte zuerst ' + ex.needs.replace('anhängen', '') + 'anhängen (Büroklammer), dann senden.', lines: [] }); },
    'ask-prefill': el => goAssistant(el.dataset.text, false),
    example: el => { const ex = A.EXAMPLES.find(e => e.t === el.dataset.text); if (ex && ex.needs && !A.chat.compose.length) { const ta = document.getElementById('chat-in'); ta.value = ex.t; ta.focus(); U.toast({ ok: true, summary: 'Jetzt noch ' + ex.needs.replace('anhängen', '').trim() + ' über die Büroklammer anhängen und senden.', lines: [] }); return; } A.sendChat(el.dataset.text, A.chat.compose.splice(0)); V.composerUpdate(); },
    'art-cat': el => { V.artFilter.cat = el.dataset.cat; render(true); },
    'art-visible': el => { const a = S().articles[el.dataset.id]; U.act('set_article_visibility', { articles: [a.id], visible: !a.visible }); },
    'sup-toggle': el => { const a = S().articles[el.dataset.id], hidden = a.hiddenSupplier.includes(el.dataset.mid); U.act('set_article_media', hidden ? { article: a.id, show_supplier_images: [el.dataset.mid] } : { article: a.id, hide_supplier_images: [el.dataset.mid] }); },
    'set-cover': el => U.act('set_article_media', { article: el.dataset.id, cover: el.dataset.mid }),
    move: el => { const a = S().articles[el.dataset.id], ids = A.mediaList(a).map(m => m.id), i = ids.indexOf(el.dataset.mid), j = i + Number(el.dataset.dir); if (j < 0 || j >= ids.length) return; ids.splice(j, 0, ids.splice(i, 1)[0]); U.act('set_article_media', { article: a.id, order: ids }, { short: true }); },
    'media-open': el => V.openMedia(el.dataset.id, el.dataset.mid),
    focal: (el, ev) => { const img = el.querySelector('img,.ph'), r = img.getBoundingClientRect(); const x = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100)), y = Math.max(0, Math.min(100, (ev.clientY - r.top) / r.height * 100)); const res = A.run('set_article_media', { article: el.dataset.id, focal: { media: el.dataset.mid, x, y } }, { actor: 'Achim' }); if (res.ok) { V.openMedia(el.dataset.id, el.dataset.mid); U.toast(res, { short: true }); } },
    'media-hide': el => { U.closeSheet(); U.act('set_article_media', { article: el.dataset.id, hide_media: el.dataset.mid }); },
    lang: el => { U.langState[el.dataset.group] = el.dataset.lang; render(true); },
    'text-edit': el => { V.textEditing[el.dataset.key] = true; render(true); const ta = document.querySelector('.tf-edit textarea'); if (ta) ta.focus(); },
    'text-cancel': el => { delete V.textEditing[el.dataset.key]; render(true); },
    'text-reset': el => U.act('update_article_text', { article: el.dataset.id, field: el.dataset.field, mode: 'reset' }),
    'sup-accept': el => U.act('apply_supplier_update', { article: el.dataset.id, field: el.dataset.field, accept: true }),
    'sup-ignore': el => U.act('apply_supplier_update', { article: el.dataset.id, field: el.dataset.field, accept: false }),
    'hero-lib': el => { V.heroForm.lib = el.dataset.src; V.heroForm.att = null; render(true); },
    'hero-remove': el => U.act('set_page_hero', { page: el.dataset.page, remove: el.dataset.id }),
    gmaps: () => { const r = A.run('set_setting', { key: 'googleMaps', value: S().settings.googleMaps === false }); U.toast({ ok: true, summary: S().settings.googleMaps !== false ? 'Öffnungszeiten gehen ab jetzt auch an Google Maps (Demo).' : 'Google Maps wird nicht mehr automatisch aktualisiert.', lines: [] }); return r; },
    'ex-type': el => { V.exForm.type = el.dataset.type; render(true); },
    'ex-remove': el => U.act('set_hours_exception', { type: 'remove', id: el.dataset.id }),
    'wk-toggle': el => { const d = Number(el.dataset.day), v = S().hours.weekly[d]; U.act('set_weekly_hours', v ? { days: [d], closed: true } : { days: [d], open: '13:00', close: '18:00' }); },
    'ban-publish': el => { const box = document.querySelector('[data-omni-for="' + el.dataset.id + '"]'); U.act('publish_banner', { id: el.dataset.id, omnibus_checked: !!(box && box.checked) }, { confirmed: true }); },
    'ban-pause': el => U.act('set_banner', { id: el.dataset.id, paused: el.dataset.paused === '1' }),
    'ban-hide': el => U.act('set_banner', { id: el.dataset.id, hide: true }),
    'advent-toggle': () => U.act('set_module', { module: 'advent', enabled: !S().modules.advent.enabled }),
    door: el => V.openDoor(Number(el.dataset.n)),
    'appt-tab': el => { V.apptTab.t = el.dataset.t; render(true); },
    appt: el => U.act('respond_appointment', { id: el.dataset.id, action: el.dataset.do }),
    'appt-propose': el => { V.apptTab.propose = el.dataset.id; render(true); },
    'propose-cancel': () => { V.apptTab.propose = null; render(true); },
    'hist-who': el => { V.histFilter.who = el.dataset.who; render(true); },
    'erp-outage': () => { A.run('set_setting', { key: 'erpOutage', value: !S().settings.erpOutage }); },
    reset: () => { if (window.confirm('Demo wirklich zurücksetzen? Alle Änderungen, Uploads und der Verlauf werden verworfen.')) { A.reset(); A.chat.api = []; A.chat.carry = null; location.hash = '#/uebersicht'; render(false); U.toast({ ok: true, summary: 'Demo ist zurückgesetzt.', lines: [] }); } },
    login: () => { S().settings.signedIn = true; S().settings.user = 'achim@racepoint (Google-Konto, Demo)'; A.save(); render(false); },
    logout: () => { S().settings.signedIn = false; A.save(); render(false); },
    'chat-new': () => { S().chat.log = []; A.chat.api = []; A.chat.carry = null; A.save(); V.chatUpdate(); },
    'catt-rm': el => { A.chat.compose = A.chat.compose.filter(x => x !== el.dataset.id); V.composerUpdate(); },
    mic: () => A.toggleMic(),
    'confirm-result': el => {
      let res = null; S().chat.log.forEach(m => (m.results || []).forEach(r => { if (r.rid === el.dataset.rid) res = r; }));
      if (!res || !res.confirm) return;
      const card = el.closest('.rc'), omni = card && card.querySelector('[data-omni]');
      const input = Object.assign({}, res.confirm.input, res.confirm.omnibus ? { omnibus_checked: !!(omni && omni.checked) } : {});
      const out = A.run(res.confirm.name, input, { actor: 'Achim', confirmed: true, via: 'Bestätigung im Chat' });
      if (out.ok) { res.confirmed = 'Von dir bestätigt: ' + out.summary; if (out.historyId) res.historyId = res.historyId || out.historyId; A.save(); V.chatUpdate(); }
      U.toast(out);
    }
  };
  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const fn = acts[el.dataset.act];
    if (!fn) return;
    if (el.tagName === 'A' || el.tagName === 'BUTTON' || el.dataset.act === 'focal' || el.dataset.act === 'media-open') ev.preventDefault();
    fn(el, ev);
  });

  /* ---------- Formulare ---------- */
  const val = (f, n) => (f.elements[n] && f.elements[n].value || '').trim();
  const forms = {
    ask: f => { const q = val(f, 'q'); if (q) goAssistant(q, true); },
    chat: f => { const ta = f.elements.q, q = ta.value; ta.value = ''; ta.style.height = ''; A.sendChat(q, A.chat.compose.splice(0)); V.composerUpdate(); },
    yt: f => { const r = U.act('set_article_media', { article: f.dataset.id, youtube_url: val(f, 'url') }); if (r.ok) f.reset(); },
    text: f => { const r = U.act('update_article_text', { article: f.dataset.id, field: f.dataset.field, mode: 'set', text: { de: val(f, 'de') } }); if (r.ok) { delete V.textEditing[f.dataset.id + ':' + f.dataset.field]; A.render(true); } },
    hero: f => {
      const H = V.heroForm, inp = { page: f.dataset.page, headline: { de: val(f, 'headline') }, from: val(f, 'from') || undefined, to: val(f, 'to') || undefined, label: val(f, 'label') };
      if (H.att) inp.attachment = H.att; else if (H.lib) inp.library = H.lib;
      const r = A.run('set_page_hero', inp, { actor: 'Achim', attachments: A.attachments, via: 'Formular' }); U.toast(r);
      if (r.ok) { H.att = null; H.lib = null; render(true); }
    },
    exception: f => { const inp = { type: V.exForm.type, from: val(f, 'from'), to: val(f, 'to') || val(f, 'from'), label: val(f, 'label') }; if (val(f, 'open')) inp.open = val(f, 'open'); if (val(f, 'close')) inp.close = val(f, 'close'); const r = U.act('set_hours_exception', inp); if (r.ok) f.reset(); },
    weekly: f => {
      const W = S().hours.weekly, groups = {};
      for (let d = 0; d < 7; d++) { if (!W[d] || !f.elements['o' + d]) continue; const o = f.elements['o' + d].value, c = f.elements['c' + d].value; if (o !== W[d][0] || c !== W[d][1]) (groups[o + '|' + c] = groups[o + '|' + c] || []).push(d); }
      const keys = Object.keys(groups);
      if (!keys.length) { U.toast({ ok: true, summary: 'Keine Änderung an den Wochenzeiten.', lines: [] }); return; }
      keys.forEach(k => { const [o, c] = k.split('|'); U.act('set_weekly_hours', { days: groups[k], open: o, close: c }); });
    },
    banner: f => { const r = U.act('create_banner', { text: { de: val(f, 'text') }, from: val(f, 'from'), to: val(f, 'to'), link: val(f, 'link') || undefined }); if (r.ok) f.reset(); },
    'advent-dates': f => U.act('set_module', { module: 'advent', from: val(f, 'from'), to: val(f, 'to') }),
    door: f => { const img = f.querySelector('input[name=image]:checked'); const r = U.act('set_module', { module: 'advent', door: { n: Number(f.dataset.n), text: val(f, 'text'), code: val(f, 'code').toUpperCase(), image: img && img.value ? img.value : null } }); if (r.ok) U.closeSheet(); },
    propose: f => { const r = U.act('respond_appointment', { id: f.dataset.id, action: 'propose', start: val(f, 'start') }); if (r.ok) { V.apptTab.propose = null; render(true); } },
    'appt-note': f => U.act('set_appointment_note', { type: f.dataset.type, note: val(f, 'note') })
  };
  document.addEventListener('submit', ev => { const f = ev.target, fn = forms[f.dataset.submit]; if (!fn) return; ev.preventDefault(); fn(f); });

  /* ---------- Eingaben & Dateien ---------- */
  document.addEventListener('input', ev => {
    const el = ev.target;
    if (el.dataset.input === 'art-q') { V.artFilter.q = el.value; const pos = el.selectionStart; render(true); const n = document.querySelector('[data-input="art-q"]'); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
    if (el.dataset.input === 'ban-text') { const h = el.closest('form').querySelector('.omni-hint'); if (h) h.hidden = !/(\d\s?%|%|€|rabatt|reduziert|statt|sale)/i.test(el.value); }
    if (el.id === 'chat-in') { el.style.height = 'auto'; el.style.height = Math.min(160, el.scrollHeight) + 'px'; }
  });
  document.addEventListener('keydown', ev => { if (ev.target.id === 'chat-in' && ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); ev.target.form.requestSubmit(); } if (ev.key === 'Escape') U.closeSheet(); });
  document.addEventListener('change', async ev => {
    const el = ev.target;
    if (el.dataset.change === 'chat-file') { await A.addChatFiles(el.files); el.value = ''; }
    if (el.dataset.change === 'media-role') { const r = U.act('set_article_media', { article: el.dataset.id, set_role: { media: el.dataset.mid, role: el.value } }); if (r.ok) V.openMedia(el.dataset.id, el.dataset.mid); }
    if (el.dataset.change === 'hero-file' && el.files[0]) { const p = A.attach(el.files[0]); V.heroForm.att = p.id; V.heroForm.lib = null; render(true); try { await p; } catch (e) { V.heroForm.att = null; U.toast({ ok: false, error: e.message }); } render(true); }
    if (el.dataset.change === 'art-upload' && el.files.length) {
      const aid = el.dataset.id, files = Array.from(el.files).slice(0, 12), tile = document.getElementById('up-' + aid);
      if (tile) tile.classList.add('busy'), tile.querySelector('b').textContent = 'Erzeuge Varianten …';
      const ids = [];
      for (const f of files) { try { const out = await A.attach(f); ids.push(out.id); } catch (e) { U.toast({ ok: false, error: f.name + ': ' + e.message }); } }
      if (ids.length) U.act('set_article_media', { article: aid, attachments: ids }, { attachments: A.attachments });
      else render(true);
    }
  });

  /* ---------- Takt: Uhr, Live-Status, Transcode-Fortschritt ---------- */
  setInterval(() => {
    document.querySelectorAll('[data-clock]').forEach(el => el.textContent = 'Schönberg · ' + A.brussels().time + ' Uhr');
    document.querySelectorAll('[data-tc]').forEach(el => { const aid = Object.keys(S().articles).find(k => S().articles[k].media.some(m => m.id === el.dataset.tc)); const m = aid && S().articles[aid].media.find(x => x.id === el.dataset.tc); if (m) el.querySelectorAll('.meter i').forEach(i => i.style.width = Math.round(A.transcode(m) * 100) + '%'); });
  }, 700);
  setInterval(() => { if (!S() || !S().settings.signedIn) return; if (document.activeElement && /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return; if (document.getElementById('sheet')) return; if (['overview', 'hours', 'article'].includes(cur.view)) render(true); }, 30000);

  /* ---------- Start ---------- */
  document.documentElement.lang = 'de';
  A.load();
  cur = parse();
  render(false);
  A.loadErp();
  A.checkAi();
})(window.RPA);
