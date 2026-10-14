/* =====================================================================
   RACEPOINT · gemeinsame Basis fuer die Prototypen 8–10 (THROWAWAY)
   - Oeffnungszeiten + Live-Status ("Jetzt geoeffnet · bis 18:00")
   - Mini-i18n DE/FR/NL/EN ueber data-i18n='{"fr":"…","nl":"…","en":"…"}'
   - Video-Lightbox (YouTube nocookie)
   - Prototyp-Umschalter (Zahnkranz unten rechts, wie in index.html)
   Wird als klassisches <script> eingebunden und stellt window.RP bereit.
   ===================================================================== */
(function () {
  'use strict';

  const LANGS = ['de', 'fr', 'nl', 'en'];
  const DAY = {
    de: ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'],
    fr: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
    nl: ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'],
    en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  };
  const DAY_SHORT = {
    de: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    fr: ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'],
    nl: ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'],
    en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  };
  // Oeffnungszeiten laut racepoint.be (Stand Prototyp): Mo, Di, Mi, Fr 13–18 · Sa 9–14 · Do & So zu
  const HOURS = { 0: null, 1: [13, 18], 2: [13, 18], 3: [13, 18], 4: null, 5: [13, 18], 6: [9, 14] };

  // Zeit immer in Ostbelgien rechnen, egal wo der Besucher sitzt
  function brusselsNow(d) {
    d = d || new Date();
    try {
      const p = new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Europe/Brussels', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(d);
      const get = t => (p.find(x => x.type === t) || {}).value;
      const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
      return { day: wd < 0 ? d.getDay() : wd, h: +get('hour'), m: +get('minute') };
    } catch (e) {
      return { day: d.getDay(), h: d.getHours(), m: d.getMinutes() };
    }
  }
  const hhmm = h => String(h).padStart(2, '0') + ':00';

  function status(d) {
    const n = brusselsNow(d), t = n.h + n.m / 60, today = HOURS[n.day];
    if (today && t >= today[0] && t < today[1]) {
      return { open: true, day: n.day, closes: hhmm(today[1]), soon: today[1] - t <= 1 };
    }
    // naechste Oeffnung suchen (heute spaeter oder an den Folgetagen)
    for (let i = 0; i < 8; i++) {
      const dd = (n.day + i) % 7, h = HOURS[dd];
      if (!h) continue;
      if (i === 0 && t >= h[0]) continue;
      return { open: false, day: n.day, nextDay: dd, inDays: i, opens: hhmm(h[0]) };
    }
    return { open: false, day: n.day };
  }

  const T = {
    openUntil: { de: 'Jetzt geöffnet · bis {t}', fr: 'Ouvert · jusqu’à {t}', nl: 'Nu open · tot {t}', en: 'Open now · until {t}' },
    closedToday: { de: 'Geschlossen · öffnet heute {t}', fr: 'Fermé · ouvre aujourd’hui à {t}', nl: 'Gesloten · opent vandaag om {t}', en: 'Closed · opens today at {t}' },
    closedTomorrow: { de: 'Geschlossen · öffnet morgen {t}', fr: 'Fermé · ouvre demain à {t}', nl: 'Gesloten · opent morgen om {t}', en: 'Closed · opens tomorrow at {t}' },
    closedDay: { de: 'Geschlossen · öffnet {d} {t}', fr: 'Fermé · ouvre {d} à {t}', nl: 'Gesloten · opent {d} om {t}', en: 'Closed · opens {d} at {t}' },
  };

  const RP = {
    LANGS, DAY, DAY_SHORT, HOURS,
    lang: 'de',
    reducedMotion: !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches),
    status,
    now: () => brusselsNow(),
    statusText(lang) {
      lang = lang || RP.lang;
      const s = status();
      const f = (k, o) => T[k][lang].replace('{t}', o.t || '').replace('{d}', o.d || '');
      if (s.open) return f('openUntil', { t: s.closes });
      if (s.inDays === 0) return f('closedToday', { t: s.opens });
      if (s.inDays === 1) return f('closedTomorrow', { t: s.opens });
      if (s.nextDay != null) return f('closedDay', { t: s.opens, d: DAY[lang][s.nextDay] });
      return '';
    },
    // t({de:'…', fr:'…'}) -> Text in aktueller Sprache (Fallback Deutsch)
    t(o) { return o == null ? '' : typeof o === 'string' ? o : (o[RP.lang] || o.de || ''); },
    hoursRows(lang) {
      lang = lang || RP.lang;
      const order = [1, 2, 3, 4, 5, 6, 0], today = brusselsNow().day;
      const closed = { de: 'geschlossen', fr: 'fermé', nl: 'gesloten', en: 'closed' }[lang];
      const span = h => ({ de: h[0] + '–' + h[1] + ' Uhr', fr: h[0] + 'h–' + h[1] + 'h', nl: h[0] + '–' + h[1] + ' u', en: hhmm(h[0]) + '–' + hhmm(h[1]) }[lang]);
      return order.map(d => ({
        day: DAY[lang][d], short: DAY_SHORT[lang][d], today: d === today,
        text: HOURS[d] ? span(HOURS[d]) : closed,
        open: !!HOURS[d],
      }));
    },
  };

  /* ---------------- i18n ---------------- */
  const langListeners = [];
  RP.onLang = fn => { langListeners.push(fn); };
  RP.applyI18n = function (root) {
    (root || document).querySelectorAll('[data-i18n]').forEach(el => {
      if (el.dataset.i18nDe == null) el.dataset.i18nDe = el.innerHTML;
      let map = {};
      try { map = JSON.parse(el.getAttribute('data-i18n')); } catch (e) { /* kaputtes JSON ignorieren */ }
      const html = RP.lang === 'de' ? el.dataset.i18nDe : (map[RP.lang] || el.dataset.i18nDe);
      if (el.innerHTML !== html) el.innerHTML = html;
    });
    (root || document).querySelectorAll('[data-i18n-ph]').forEach(el => {
      if (el.dataset.i18nPhDe == null) el.dataset.i18nPhDe = el.getAttribute('placeholder') || '';
      let map = {};
      try { map = JSON.parse(el.getAttribute('data-i18n-ph')); } catch (e) { /* ignorieren */ }
      el.setAttribute('placeholder', RP.lang === 'de' ? el.dataset.i18nPhDe : (map[RP.lang] || el.dataset.i18nPhDe));
    });
  };
  RP.setLang = function (l) {
    if (!LANGS.includes(l)) l = 'de';
    RP.lang = l;
    document.documentElement.lang = l;
    try { localStorage.setItem('rp-lang', l); } catch (e) { /* privat-Modus */ }
    RP.applyI18n();
    document.querySelectorAll('[data-lang-switch] button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === l)));
    updateStatusPills();
    langListeners.forEach(fn => { try { fn(l); } catch (e) { console.error(e); } });
  };
  function mountLangSwitches() {
    document.querySelectorAll('[data-lang-switch]').forEach(box => {
      if (box.childElementCount) return;
      LANGS.forEach(l => {
        const b = document.createElement('button');
        b.type = 'button'; b.dataset.lang = l; b.textContent = l.toUpperCase();
        b.setAttribute('aria-pressed', String(l === RP.lang));
        b.addEventListener('click', () => RP.setLang(l));
        box.appendChild(b);
      });
    });
  }

  /* ---------------- Live-Status-Pillen ---------------- */
  // <span data-open-status></span> -> "● Jetzt geoeffnet · bis 18:00"
  function updateStatusPills() {
    const s = status(), txt = RP.statusText();
    document.querySelectorAll('[data-open-status]').forEach(el => {
      el.classList.toggle('is-open', s.open);
      el.classList.toggle('is-closed', !s.open);
      el.innerHTML = '<i class="rp-dot"></i>' + txt;
    });
  }
  RP.updateStatusPills = updateStatusPills;

  /* ---------------- Video-Lightbox ---------------- */
  let lb;
  RP.openVideo = function (id) {
    if (!lb) {
      lb = document.createElement('div');
      lb.className = 'rp-lightbox';
      lb.innerHTML = '<button class="rp-lb-close" aria-label="Schließen">&times;</button><div class="rp-lb-frame"></div>';
      document.body.appendChild(lb);
      lb.addEventListener('click', e => { if (e.target === lb || e.target.classList.contains('rp-lb-close')) RP.closeVideo(); });
      document.addEventListener('keydown', e => { if (e.key === 'Escape') RP.closeVideo(); });
    }
    lb.querySelector('.rp-lb-frame').innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) +
      '?autoplay=1&rel=0&modestbranding=1" allow="autoplay; encrypted-media; fullscreen" allowfullscreen></iframe>';
    lb.classList.add('on');
  };
  RP.closeVideo = function () { if (!lb) return; lb.classList.remove('on'); lb.querySelector('.rp-lb-frame').innerHTML = ''; };
  document.addEventListener('click', e => {
    const v = e.target.closest('[data-video]');
    if (v) { e.preventDefault(); RP.openVideo(v.dataset.video); }
  });
  // YouTube-Thumbnails: maxres -> hq -> lokales Ersatzbild
  RP.ytThumb = (id, fallback) =>
    '<img loading="lazy" alt="" src="https://img.youtube.com/vi/' + id + '/maxresdefault.jpg" ' +
    'onerror="if(!this.dataset.f){this.dataset.f=1;this.src=\'https://img.youtube.com/vi/' + id + '/hqdefault.jpg\'}else{this.onerror=null;this.src=\'' + (fallback || 'assets/teaser-poster.jpg') + '\'}">';

  // Der gemeinsame Picker wird separat auf allen Prototypen geladen.
  RP.mountPicker = function () {};

  /* ---------------- Basis-Styles (Picker, Lightbox, Status, Sprachwahl) ---------------- */
  const css = `
  .rp-dot{display:inline-block;width:.5em;height:.5em;border-radius:50%;background:#9ca3af;margin-right:.5em;vertical-align:.08em}
  .is-open .rp-dot{background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:rpPulse 2s infinite}
  .is-closed .rp-dot{background:#E83637}
  @keyframes rpPulse{0%{box-shadow:0 0 0 0 rgba(34,197,94,.55)}70%{box-shadow:0 0 0 .55em rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
  [data-lang-switch]{display:inline-flex;gap:2px;border-radius:999px;padding:3px;background:rgba(255,255,255,.08);backdrop-filter:blur(8px)}
  [data-lang-switch] button{font:600 11px/1 'Roboto Condensed',sans-serif;letter-spacing:.06em;color:rgba(255,255,255,.62);padding:7px 9px;border-radius:999px;border:0;background:none;cursor:pointer;transition:background .2s,color .2s}
  [data-lang-switch] button:hover{color:#fff}
  [data-lang-switch] button[aria-pressed="true"]{background:#fff;color:#0e0f11}
  .rp-lightbox{position:fixed;inset:0;z-index:90;display:none;align-items:center;justify-content:center;background:rgba(0,0,0,.9);backdrop-filter:blur(8px);padding:16px}
  .rp-lightbox.on{display:flex}
  .rp-lb-frame{width:min(1100px,100%);aspect-ratio:16/9;border-radius:14px;overflow:hidden;background:#000}
  .rp-lb-frame iframe{width:100%;height:100%;border:0}
  .rp-lb-close{position:absolute;top:10px;right:18px;font-size:44px;line-height:1;color:#fff;background:none;border:0;cursor:pointer;opacity:.8}
  .rp-picker{position:fixed;right:20px;bottom:20px;z-index:60;display:flex;flex-direction:column;align-items:flex-end;font-family:'Roboto Condensed',sans-serif}
  .rp-pick-btn{width:56px;height:56px;border-radius:50%;border:0;background:#E83637;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 12px 30px rgba(0,0,0,.45);transition:transform .5s}
  .rp-pick-btn:hover{transform:rotate(45deg)}
  .rp-pick-btn svg{width:28px;height:28px;fill:currentColor}
  .rp-pick-panel{width:250px;max-width:calc(100vw - 40px);max-height:calc(100dvh - 112px);overflow-y:auto;overscroll-behavior:contain;box-sizing:border-box;margin-bottom:12px;padding:8px;border-radius:18px;background:rgba(24,24,27,.96);border:1px solid rgba(255,255,255,.1);box-shadow:0 20px 50px rgba(0,0,0,.5);backdrop-filter:blur(10px)}
  .rp-pick-panel a:focus-visible{outline:2px solid #E83637;outline-offset:-2px}
  .rp-pick-panel a{display:flex;justify-content:space-between;align-items:center;padding:9px 12px;border-radius:10px;color:rgba(255,255,255,.72);font-weight:600;font-size:14px;text-transform:uppercase;text-decoration:none}
  .rp-pick-panel a:hover{background:rgba(255,255,255,.07);color:#fff}
  .rp-pick-panel a.on{background:#E83637;color:#fff}
  .rp-pick-panel a span{font-size:10px;letter-spacing:.08em;padding:3px 6px;border-radius:6px;background:rgba(232,54,55,.18);color:#ff7b7c}
  .rp-pick-panel a.on span{background:rgba(255,255,255,.2);color:#fff}
  .rp-pick-panel a.fb{border-top:1px solid rgba(255,255,255,.1);margin-top:4px;border-radius:0 0 10px 10px}
  .rp-pick-h,.rp-pick-f{padding:8px 12px;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:rgba(255,255,255,.38)}
  .rp-pick-f{border-top:1px solid rgba(255,255,255,.1);margin-top:4px;text-transform:none;letter-spacing:0;color:rgba(255,255,255,.3)}
  `;
  const st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ---------------- Init ---------------- */
  function init() {
    let l = 'de';
    try { l = new URL(location).searchParams.get('lang') || localStorage.getItem('rp-lang') || 'de'; } catch (e) { /* ignorieren */ }
    mountLangSwitches();
    RP.setLang(l);
    setInterval(updateStatusPills, 60 * 1000);
    // Links ohne Ziel (Platzhalter im Prototyp) nicht springen lassen
    document.addEventListener('click', e => {
      const a = e.target.closest('a');
      if (a && !a.getAttribute('href')) e.preventDefault();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.RP = RP;
})();
