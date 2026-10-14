# Racepoint · Startseiten-Prototyp

Prototypen zur Richtungsentscheidung. Alle 15 aktiven Entwürfe sind über das Zahnrad unten rechts direkt auswählbar. Die ursprünglichen sechs Startseiten bleiben auch über `index.html?v=1..6` erreichbar.

> Internet noetig (Tailwind CDN, Google Fonts, YouTube). Am besten am Handy testen.

## Gemeinsame lokale Vorschau

`node preview.mjs` starten, dann http://127.0.0.1:8101/ öffnen. Die Startseite zeigt alle Entwürfe mit Vorschaubildern, neueste zuerst. Unter Windows lädt `powershell -File start-preview.ps1` vorhandene API-Zugangsdaten aus den Benutzer-Umgebungsvariablen, ohne sie in Dateien zu schreiben.

Das Zahnrad steht auf jedem Prototyp und allen Unterseiten, außer bei 17 · Best of: Dort sitzt nur der KI-Berater unten rechts, die Seite wirkt wie eine fertige Website. **17 · Best of** steht als neuester Entwurf ganz oben. **16 · Motion**, **15 · Cinema**, **14 · Terrain**, **13 · Velocity**, **11 · Original**, **10 · Die Runde**, **9 · 3D-Studio** und **8 · Der Aufbau** tragen das rote **NEW**-Badge. Atelier und Kunden-Feedback sind aus der Auswahl entfernt. Beim Wechsel zwischen den vollständigen Designs bleibt die Unterseite erhalten. Cinema startet den lokalen Shop-Teaser direkt und stumm; Pause und Ton sind bedienbar.

Unser Paket unter `entwuerfe/codex-2026-10/` verwendet den echten KI-Berater mit Herstellerrecherche. Der gemeinsame lokale Server stellt dessen API bereit. Die übrigen Prototypen nutzen ihn ebenfalls über `assets/ki-berater.js`. Für eine statische Vorschau reicht weiterhin ein einfacher Webserver; dort steht die echte KI nicht zur Verfügung.

## Öffentliche Azure-Vorschau

Testadresse: https://racepoint-prototypen.azurewebsites.net/

Alle 15 Entwürfe teilen sich diese Adresse. Alle Chats nutzen den echten KI-Agenten (`/api/chat`), sobald `/api/status` ihn meldet: Bike-Beratung mit Katalog und Herstellerrecherche, Öffnungszeiten mit Live-Status, Kontakt und Anfahrt, Terminwunsch, Rahmengröße, Übergabe ans Team und Racepoint-Filme. Antworten können solche Elemente direkt anzeigen (`show_widget`). Termine und Anfragen werden nur als E-Mail vorbereitet, gebucht wird erst durch Racepoint. Ist die KI nicht erreichbar oder das Tageskontingent aufgebraucht, fällt der KI-Berater in V1–V10 auf die Simulation zurück und zeigt den Hinweis **Simulation**.

Die Linux-App `racepoint-prototypen` liegt mit dem B1-Plan `racepoint-preview-plan` in der Ressourcengruppe `racepoint`. Sie startet mit `node server.mjs` unter Node.js 24 LTS. Der API-Schlüssel liegt ausschließlich in einer serverseitigen Azure-App-Einstellung, nicht im Repository oder im Browser. B1 wurde nach einer `QuotaExceeded`-Sperre des kostenlosen F1-Plans ausdrücklich freigegeben.

`npm test` prüft HTTP-Auslieferung, API-Grenzen und den KI-Backendvertrag. `npm run build` erstellt unter `.build/azure-<Zeitstempel>/` ein eigenständiges Paket ohne zusätzliche npm-Abhängigkeiten; `.build/latest.json` nennt den letzten Ausgabeordner. Neue öffentliche Dateien müssen zuerst mit Git erfasst werden. Nur die im Paket erzeugte Liste `public-files.json` ist öffentlich abrufbar. Backend-Dateien und lokale Konfigurationen werden nicht ausgeliefert.

Zum erneuten Bereitstellen nach dem Build `powershell -NoProfile -File hosting/package.ps1` ausführen. Das ZIP verwendet ausdrücklich Linux-kompatible Pfade. Dann mit `node hosting/deploy-azure.mjs --upload` hochladen und mit `node hosting/deploy-azure.mjs` den Status prüfen (4 = erfolgreich). Der Helfer verwendet die bestehende Azure-CLI-Anmeldung mit explizitem Abonnement, auch wenn ein anderes Azure-Konto als Standard ausgewählt ist. App-Einstellungen und Startbefehl bleiben erhalten; Basic Auth bleibt deaktiviert. `/healthz` prüft den Server; `/api/status` meldet den KI-Status. Eine erfolgreiche echte Chat-Antwort gehört zur abschließenden Prüfung.

Der öffentliche Testserver begrenzt KI-Anfragen auf zwei gleichzeitig, zwölf pro Minute und standardmäßig 100 pro UTC-Tag. Diese Zähler gelten pro Serverprozess und werden bei einem Neustart zurückgesetzt; sie sind keine dauerhafte Abrechnungsgrenze. `AI_DAILY_REQUEST_LIMIT` steuert das Tageskontingent. `PUBLIC_ORIGIN` legt die erlaubte öffentliche Adresse fest.

## Neu: Prototyp 17 · Best of

`v17-best-of.html` (Logik und Styles in `assets/v17/`) fasst die stärksten Ideen aller Entwürfe auf einer dunklen Startseite zusammen. Grundlage ist das Kunden-Feedback: Achim und Video früh zeigen, Werkstatt für alle Marken oben nennen, MTB, E-Bike, Kids und Budget sichtbar machen und den Kanal bewerben.

| Abschnitt | Idee aus |
|-----------|----------|
| Shop-Film als Hero, Live-Status, „Finde dein Bike“ öffnet den KI-Berater | V1 Cinematic, 15 Cinema |
| Beim Scrollen läuft der Film im Schriftzug RACEPOINT weiter | 10 Die Runde |
| Rennrad baut sich in vier Schritten zusammen, Link ins 3D-Studio | 8 Der Aufbau, 9 3D-Studio |
| Rennrad, Gravel, MTB, E-Bike mit Ab-Preisen, Kids, Leasing, Werkstatt | V4 Finde dein Bike, 11 Original (Katalog, Unterseiten) |
| Große Frageleiste mit Chips (Beratung, Öffnungszeiten, Termin, Größe, Kontakt) | KI-Berater 2.0 (V8–V10) |
| Achim, Meisterwerkstatt, Retül-Bikefitting | 8 Der Aufbau, 11 Original |
| Samstagsrunde mit Höhenprofil, je Etappe eine Bike-Kategorie | 10 Die Runde |
| Filme aus dem Kanal, Kontakt mit Live-Öffnungszeiten | 10 Die Runde, 8 Der Aufbau |

Reihenfolge der Startseite: Hero, Bikes, Achim, Werkstatt, Der Aufbau, Samstagsrunde, Filme, Besuch und zuletzt der KI-Berater direkt vor dem Footer.

Die Seite ist nur deutsch, nutzt nur lokale Bibliotheken aus `vendor/` und berücksichtigt `prefers-reduced-motion`.

**Unterseiten von 17:** `v17-rennrad`, `-gravel`, `-mtb`, `-ebike`, `-familie` (echte Bikes aus dem Codex-Katalog mit Filter und Sortierung), `v17-werkstatt`, `v17-bikefitting` (große scrollgesteuerte Retül-Motion-Capture-Animation mit Live-Winkeln und „Sitzposition optimiert“), `v17-filme`, `v17-ueber-uns`, `v17-kontakt`, `v17-anfrage` und `v17-bike.html?id=…` (Bike-Detail mit Konfigurator und 3D-Vorschau aus dem prozeduralen V9-Bike). Header, Mobil-Menü und Footer setzt `assets/v17/site.js` für alle v17-Seiten ein; eine neue Seite braucht nur `<body data-page="…">` und dieselben Einbindungen.

## Touren (GPX)

`v17-touren.html` zeigt 6 Touren ab dem Laden (2 Rennrad, 2 Gravel, 2 MTB): Filter (`#rennrad`, `#gravel`, `#mtb`), eine stilisierte Übersichtskarte mit allen Routen, Tourenkarten mit GPX-Download und darunter die gepinnte Scroll-Fahrt aus „10 · Die Runde“: Tour wählen, scrollen, die Route zeichnet sich mit Zählern, Stopp-Karten und Höhenprofil. Direktlink auf eine Tour: `v17-touren.html#tour-<id>`. Danach folgt der Steckbrief mit Distanz, Anstieg, höchstem Punkt, Fahrzeit-Schätzung, Untergrund, Bike-Empfehlung aus dem Katalog, Leihrad-Anfrage (E-Mail) und Werkstatt-Check (KI-Berater).

**Alle Zahlen kommen aus der GPX-Datei.** Die Seite lädt `assets/v17/touren/touren.json` und je Tour die GPX-Datei per `fetch` (daher über einen Webserver öffnen, nicht als Datei). Sie liest die Trackpunkte (`trkpt` mit `lat`/`lon`/`ele`) und berechnet Distanz (Haversine), Anstieg (leicht geglättet, Schwelle 3 m), höchsten Punkt, Höhenprofil und Kartenlinie selbst (`assets/v17/touren-map.js`).

**Beispielrouten:** Achims GPX-Dateien fehlen noch. Die 6 Dateien sind Platzhalter: Linien zwischen echten Orten, interpoliert und leicht gekrümmt, mit plausiblen Höhen. Sie folgen keinen echten Wegen und sind nicht zum Navigieren gedacht. Jede GPX-Datei trägt in den Metadaten „Beispielroute – die echte Tour von Achim folgt“. Solange `"beispiel": true` gesetzt ist, zeigt die Seite das Badge „Beispielroute“ und oben den Hinweis „Achims echte GPX-Touren folgen – die Strecken hier sind Platzhalter.“

**Echte Tour von Achim einsetzen:**

1. Die GPX-Datei nach `assets/v17/touren/` legen. Am einfachsten die Beispieldatei überschreiben, z. B. `venn-klassiker.gpx`. Bei einem neuen Namen in `touren.json` bei der Tour `"file"` anpassen.
2. In `touren.json` Titel, `teaser`, `description`, `highlights`, Untergrund (`surface`, Summe 100), `difficulty` (leicht/mittel/schwer) und die Bike-Empfehlung (`bike` = ID aus `entwuerfe/codex-2026-10/prototype/kombi/catalogue.json`) prüfen.
3. Stopps anpassen: `"start": true` ist der Laden, `"ziel": true` das Ende der Strecke. Alle anderen Stopps mit `"lat"`/`"lon"` angeben. Die Seite legt sie auf den nächsten Streckenpunkt. Liegt dieser mehr als 1,5 km entfernt, nimmt sie `"km"`, sonst lässt sie den Stopp weg. Bilder sind Pfade wie `assets/gravel-ride.jpg`. In `ask` setzt die Seite `{title}`, `{km}`, `{hm}` und `{surface}` ein.
4. `"beispiel": false` setzen. Badge und Hinweis verschwinden dann von selbst.
5. Neue Dateien mit `git add` erfassen, sonst fehlen sie im Azure-Paket. `npm run build` liefert `.gpx` als `application/gpx+xml` aus.

Distanz und Höhenmeter nie von Hand eintragen. Die Seite rechnet sie bei jedem Laden neu aus der GPX-Datei aus. Die Anleitung steht auch als `_hinweis` oben in `touren.json`.

**Karte:** Die Scroll-Fahrt läuft auf einer stilisierten Topo-Karte, die aus den GPX-Punkten projiziert wird (Höhenlinien, Wald, Wasser und Orte sind nur Andeutung). Leaflet 1.9.4 liegt in `vendor/leaflet/`. Kacheln von OpenStreetMap (oder OpenTopoMap) lädt die Seite erst nach einem Klick auf „Karte laden (OpenStreetMap)“. Danach merkt sie sich die Wahl in `localStorage`.

## Neu: Prototypen 8–10 (Scroll-Motion, 3D, KI-Berater 2.0)

Drei zusaetzliche Entwuerfe als eigene Seiten, ebenfalls ueber den Zahnkranz erreichbar (oder `index.html?v=8..10`):

| # | Datei | Idee |
|---|-------|------|
| 8 | `v8-aufbau.html` | **Der Aufbau** – ein Rennrad baut sich beim Scrollen aus der Explosionszeichnung Teil fuer Teil zusammen (7 Schritte, Gewichtszaehler, Lackierung im Finale), danach Achim, Kategorien, Builds, Werkstatt, Retuel-Motion-Capture. |
| 9 | `v9-3d-studio.html` | **3D-Studio** – Echtzeit-3D-Bike (WebGL), Kamerafahrt beim Scrollen, Konfigurator fuer Typ, Farbe, Laufraeder und Groesse. |
| 10 | `v10-die-runde.html` | **Die Runde** – helle Editorial-Story: Video im Schriftzug, Scroll-gesteuertes Video, Route durch Venn/Ardennen/Eifel mit Hoehenprofil. |

Alle drei haben den neuen **KI-Berater** (`assets/ki-berater.js`, live über den Agenten, sonst Simulation): Bike-Empfehlung mit Karten, Rahmengroessen-Rechner, Terminbuchung inkl. Kalender-Datei, Oeffnungszeiten live, Anfahrt, Uebergabe an Achim, Sprache DE/FR/NL/EN wird erkannt.

Gemeinsame Basis: `assets/rp-core.js` (Live-Oeffnungsstatus, Sprachumschalter DE/FR/NL/EN, Video-Lightbox, Prototyp-Umschalter). Animations-/3D-Bibliotheken liegen lokal in `vendor/` (GSAP, Lenis, Three.js).
