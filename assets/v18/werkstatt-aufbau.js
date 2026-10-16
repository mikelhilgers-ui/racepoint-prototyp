/* =====================================================================
   RACEPOINT · 18 · WERKSTATT: Kachel-Vorauswahl (THROWAWAY)
   Kacheln (#leistungen): Klick wählt im Formular (#anfrage) das passende Thema vor.
   Der Hero ist der normale Kino-Einstieg der Unterseiten (Video und Animation macht assets/v18/site.js).
   (Das Scrub-Bildband „So arbeiten wir“ ist von dieser Seite entfernt.)
   Dateiname historisch (werkstatt-aufbau), damit die Seite ihre Einbindung behält.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------------- 1. Kacheln: Thema im Formular vorwählen ----------------
     Jede Kachel (und der Termin-Link in der Fahrwerk-Kachel) trägt data-thema="…" und führt per #anfrage zum Formular.
     Hier wird nur das Thema im Auswahlfeld gesetzt (und der E-Mail-Entwurf in pages.js über "change" aktualisiert).
     Das Scrollen übernimmt der Anker-Handler in site.js. */
  $$('[data-thema]').forEach(a => a.addEventListener('click', () => {
    const form = document.getElementById('anfrage');
    const sel = form && $('select[name="thema"]', form);
    if (!sel) return;
    const want = a.dataset.thema.toLowerCase();
    const opt = Array.from(sel.options).find(o => o.textContent.trim().toLowerCase() === want);
    if (!opt) return;
    sel.value = opt.value || opt.textContent;
    form.dispatchEvent(new Event('change', { bubbles: true }));
  }));
})();
