# Racepoint · Startseiten-Prototyp

Prototypen zur Richtungsentscheidung. Alle 14 aktiven Entwürfe sind über das Zahnrad unten rechts direkt auswählbar. Die ursprünglichen sechs Startseiten bleiben auch über `index.html?v=1..6` erreichbar.

> Internet noetig (Tailwind CDN, Google Fonts, YouTube). Am besten am Handy testen.

## Gemeinsame lokale Vorschau

`node preview.mjs` starten, dann http://127.0.0.1:8101/ öffnen. Die Startseite zeigt alle Entwürfe mit Vorschaubildern, neueste zuerst. Unter Windows lädt `powershell -File start-preview.ps1` vorhandene API-Zugangsdaten aus den Benutzer-Umgebungsvariablen, ohne sie in Dateien zu schreiben.

Das Zahnrad steht auf jedem Prototyp und allen Unterseiten. **16 · Motion**, **15 · Cinema**, **14 · Terrain**, **13 · Velocity**, **11 · Original**, **10 · Die Runde**, **9 · 3D-Studio** und **8 · Der Aufbau** tragen das rote **NEW**-Badge. Atelier und Kunden-Feedback sind aus der Auswahl entfernt. Beim Wechsel zwischen den vollständigen Designs bleibt die Unterseite erhalten. Cinema startet den lokalen Shop-Teaser direkt und stumm; Pause und Ton sind bedienbar.

Unser Paket unter `entwuerfe/codex-2026-10/` verwendet den echten KI-Berater mit Herstellerrecherche. Der gemeinsame lokale Server stellt dessen API bereit. Die bisherigen Berater-Simulationen der anderen Prototypen bleiben erhalten. Für eine statische Vorschau reicht weiterhin ein einfacher Webserver; dort steht die echte KI nicht zur Verfügung.

## Neu: Prototypen 8–10 (Scroll-Motion, 3D, KI-Berater 2.0)

Drei zusaetzliche Entwuerfe als eigene Seiten, ebenfalls ueber den Zahnkranz erreichbar (oder `index.html?v=8..10`):

| # | Datei | Idee |
|---|-------|------|
| 8 | `v8-aufbau.html` | **Der Aufbau** – ein Rennrad baut sich beim Scrollen aus der Explosionszeichnung Teil fuer Teil zusammen (7 Schritte, Gewichtszaehler, Lackierung im Finale), danach Achim, Kategorien, Builds, Werkstatt, Retuel-Motion-Capture. |
| 9 | `v9-3d-studio.html` | **3D-Studio** – Echtzeit-3D-Bike (WebGL), Kamerafahrt beim Scrollen, Konfigurator fuer Typ, Farbe, Laufraeder und Groesse. |
| 10 | `v10-die-runde.html` | **Die Runde** – helle Editorial-Story: Video im Schriftzug, Scroll-gesteuertes Video, Route durch Venn/Ardennen/Eifel mit Hoehenprofil. |

Alle drei haben den neuen **KI-Berater** (`assets/ki-berater.js`, gescriptete Simulation): Bike-Empfehlung mit Karten, Rahmengroessen-Rechner, Terminbuchung inkl. Kalender-Datei, Oeffnungszeiten live, Anfahrt, Uebergabe an Achim, Sprache DE/FR/NL/EN wird erkannt.

Gemeinsame Basis: `assets/rp-core.js` (Live-Oeffnungsstatus, Sprachumschalter DE/FR/NL/EN, Video-Lightbox, Prototyp-Umschalter). Animations-/3D-Bibliotheken liegen lokal in `vendor/` (GSAP, Lenis, Three.js).
