# Racepoint · Startseiten-Prototyp

Prototypen zur Richtungsentscheidung. Alle 14 aktiven Entwürfe sind über das Zahnrad unten rechts direkt auswählbar. Die ursprünglichen sechs Startseiten bleiben auch über `index.html?v=1..6` erreichbar.

> Internet noetig (Tailwind CDN, Google Fonts, YouTube). Am besten am Handy testen.

## Gemeinsame lokale Vorschau

`node preview.mjs` starten, dann http://127.0.0.1:8101/ öffnen. Die Startseite zeigt alle Entwürfe mit Vorschaubildern, neueste zuerst. Unter Windows lädt `powershell -File start-preview.ps1` vorhandene API-Zugangsdaten aus den Benutzer-Umgebungsvariablen, ohne sie in Dateien zu schreiben.

Das Zahnrad steht auf jedem Prototyp und allen Unterseiten. **16 · Motion**, **15 · Cinema**, **14 · Terrain**, **13 · Velocity**, **11 · Original**, **10 · Die Runde**, **9 · 3D-Studio** und **8 · Der Aufbau** tragen das rote **NEW**-Badge. Atelier und Kunden-Feedback sind aus der Auswahl entfernt. Beim Wechsel zwischen den vollständigen Designs bleibt die Unterseite erhalten. Cinema startet den lokalen Shop-Teaser direkt und stumm; Pause und Ton sind bedienbar.

Unser Paket unter `entwuerfe/codex-2026-10/` verwendet den echten KI-Berater mit Herstellerrecherche. Der gemeinsame lokale Server stellt dessen API bereit. Die bisherigen Berater-Simulationen der anderen Prototypen bleiben erhalten. Für eine statische Vorschau reicht weiterhin ein einfacher Webserver; dort steht die echte KI nicht zur Verfügung.

## Öffentliche Azure-Vorschau

Testadresse: https://racepoint-prototypen.azurewebsites.net/

Alle 14 Entwürfe teilen sich diese Adresse. Die Chats der ursprünglichen Entwürfe und V8–V10 tragen den Hinweis **Simulation**. Die fünf Designs Original, Velocity, Terrain, Cinema und Motion nutzen weiterhin den echten KI-Berater mit Herstellerrecherche. Die unterschiedlichen Abläufe bleiben absichtlich erhalten.

Die Linux-App `racepoint-prototypen` liegt mit dem B1-Plan `racepoint-preview-plan` in der Ressourcengruppe `racepoint`. Sie startet mit `node server.mjs` unter Node.js 24 LTS. Der API-Schlüssel liegt ausschließlich in einer serverseitigen Azure-App-Einstellung, nicht im Repository oder im Browser. B1 wurde nach einer `QuotaExceeded`-Sperre des kostenlosen F1-Plans ausdrücklich freigegeben.

`npm test` prüft HTTP-Auslieferung, API-Grenzen und den KI-Backendvertrag. `npm run build` erstellt unter `.build/azure-<Zeitstempel>/` ein eigenständiges Paket ohne zusätzliche npm-Abhängigkeiten; `.build/latest.json` nennt den letzten Ausgabeordner. Neue öffentliche Dateien müssen zuerst mit Git erfasst werden. Nur die im Paket erzeugte Liste `public-files.json` ist öffentlich abrufbar. Backend-Dateien und lokale Konfigurationen werden nicht ausgeliefert.

Zum erneuten Bereitstellen nach dem Build `powershell -NoProfile -File hosting/package.ps1` ausführen. Das ZIP verwendet ausdrücklich Linux-kompatible Pfade. Dann mit `node hosting/deploy-azure.mjs --upload` hochladen und mit `node hosting/deploy-azure.mjs` den Status prüfen (4 = erfolgreich). Der Helfer verwendet die bestehende Azure-CLI-Anmeldung mit explizitem Abonnement, auch wenn ein anderes Azure-Konto als Standard ausgewählt ist. App-Einstellungen und Startbefehl bleiben erhalten; Basic Auth bleibt deaktiviert. `/healthz` prüft den Server; `/api/status` meldet den KI-Status. Eine erfolgreiche echte Chat-Antwort gehört zur abschließenden Prüfung.

Der öffentliche Testserver begrenzt KI-Anfragen auf zwei gleichzeitig, zwölf pro Minute und standardmäßig 100 pro UTC-Tag. Diese Zähler gelten pro Serverprozess und werden bei einem Neustart zurückgesetzt; sie sind keine dauerhafte Abrechnungsgrenze. `AI_DAILY_REQUEST_LIMIT` steuert das Tageskontingent. `PUBLIC_ORIGIN` legt die erlaubte öffentliche Adresse fest.

## Neu: Prototypen 8–10 (Scroll-Motion, 3D, KI-Berater 2.0)

Drei zusaetzliche Entwuerfe als eigene Seiten, ebenfalls ueber den Zahnkranz erreichbar (oder `index.html?v=8..10`):

| # | Datei | Idee |
|---|-------|------|
| 8 | `v8-aufbau.html` | **Der Aufbau** – ein Rennrad baut sich beim Scrollen aus der Explosionszeichnung Teil fuer Teil zusammen (7 Schritte, Gewichtszaehler, Lackierung im Finale), danach Achim, Kategorien, Builds, Werkstatt, Retuel-Motion-Capture. |
| 9 | `v9-3d-studio.html` | **3D-Studio** – Echtzeit-3D-Bike (WebGL), Kamerafahrt beim Scrollen, Konfigurator fuer Typ, Farbe, Laufraeder und Groesse. |
| 10 | `v10-die-runde.html` | **Die Runde** – helle Editorial-Story: Video im Schriftzug, Scroll-gesteuertes Video, Route durch Venn/Ardennen/Eifel mit Hoehenprofil. |

Alle drei haben den neuen **KI-Berater** (`assets/ki-berater.js`, gescriptete Simulation): Bike-Empfehlung mit Karten, Rahmengroessen-Rechner, Terminbuchung inkl. Kalender-Datei, Oeffnungszeiten live, Anfahrt, Uebergabe an Achim, Sprache DE/FR/NL/EN wird erkannt.

Gemeinsame Basis: `assets/rp-core.js` (Live-Oeffnungsstatus, Sprachumschalter DE/FR/NL/EN, Video-Lightbox, Prototyp-Umschalter). Animations-/3D-Bibliotheken liegen lokal in `vendor/` (GSAP, Lenis, Three.js).
