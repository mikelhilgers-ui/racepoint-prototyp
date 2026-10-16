# Racepoint · Startseiten-Prototyp

Prototypen zur Richtungsentscheidung. Alle 15 aktiven Entwürfe sind über das Zahnrad unten rechts direkt auswählbar. Die ursprünglichen sechs Startseiten bleiben auch über `index.html?v=1..6` erreichbar.

> Internet noetig (Tailwind CDN, Google Fonts, YouTube). Am besten am Handy testen.

## Gemeinsame lokale Vorschau

`node preview.mjs` starten, dann http://127.0.0.1:8101/ öffnen. Die Startseite zeigt alle Entwürfe mit Vorschaubildern, neueste zuerst. Unter Windows lädt `powershell -File start-preview.ps1` vorhandene API-Zugangsdaten aus den Benutzer-Umgebungsvariablen, ohne sie in Dateien zu schreiben.

Das Zahnrad steht auf jedem Prototyp und allen Unterseiten, außer bei 17 · Best of und 18 · Traumbike: Dort sitzt nur der KI-Berater unten rechts, die Seite wirkt wie eine fertige Website. **18 · Traumbike** steht als neuester Entwurf ganz oben, danach **17 · Best of**. **16 · Motion**, **15 · Cinema**, **14 · Terrain**, **13 · Velocity**, **11 · Original**, **10 · Die Runde**, **9 · 3D-Studio** und **8 · Der Aufbau** tragen das rote **NEW**-Badge. Atelier und Kunden-Feedback sind aus der Auswahl entfernt. Beim Wechsel zwischen den vollständigen Designs bleibt die Unterseite erhalten. Cinema startet den lokalen Shop-Teaser direkt und stumm; Pause und Ton sind bedienbar.

Unser Paket unter `entwuerfe/codex-2026-10/` verwendet den echten KI-Berater mit Herstellerrecherche. Der gemeinsame lokale Server stellt dessen API bereit. Die übrigen Prototypen nutzen ihn ebenfalls über `assets/ki-berater.js`. Für eine statische Vorschau reicht weiterhin ein einfacher Webserver; dort steht die echte KI nicht zur Verfügung.

## Öffentliche Azure-Vorschau

Testadresse: https://racepoint-prototypen.azurewebsites.net/

Alle 15 Entwürfe teilen sich diese Adresse. Alle Chats nutzen den echten KI-Agenten (`/api/chat`), sobald `/api/status` ihn meldet: Bike-Beratung mit Katalog und Herstellerrecherche, Öffnungszeiten mit Live-Status, Kontakt und Anfahrt, Terminwunsch, Rahmengröße, Übergabe ans Team und Racepoint-Filme. Antworten können solche Elemente direkt anzeigen (`show_widget`). Termine und Anfragen werden nur als E-Mail vorbereitet, gebucht wird erst durch Racepoint. Ist die KI nicht erreichbar oder das Tageskontingent aufgebraucht, fällt der KI-Berater in V1–V10 auf die Simulation zurück und zeigt den Hinweis **Simulation**.

Die Linux-App `racepoint-prototypen` liegt mit dem B1-Plan `racepoint-preview-plan` in der Ressourcengruppe `racepoint`. Sie startet mit `node server.mjs` unter Node.js 24 LTS. Der API-Schlüssel liegt ausschließlich in einer serverseitigen Azure-App-Einstellung, nicht im Repository oder im Browser. B1 wurde nach einer `QuotaExceeded`-Sperre des kostenlosen F1-Plans ausdrücklich freigegeben.

`npm test` prüft HTTP-Auslieferung, API-Grenzen, den KI-Backendvertrag und den App-Assistenten (`/api/app-assistant`). `npm run build` erstellt unter `.build/azure-<Zeitstempel>/` ein eigenständiges Paket ohne zusätzliche npm-Abhängigkeiten; `.build/latest.json` nennt den letzten Ausgabeordner. Neue öffentliche Dateien müssen zuerst mit Git erfasst werden. Nur die im Paket erzeugte Liste `public-files.json` ist öffentlich abrufbar. Backend-Dateien und lokale Konfigurationen werden nicht ausgeliefert.

Zum erneuten Bereitstellen nach dem Build `powershell -NoProfile -File hosting/package.ps1` ausführen. Das ZIP verwendet ausdrücklich Linux-kompatible Pfade. Dann mit `node hosting/deploy-azure.mjs --upload` hochladen und mit `node hosting/deploy-azure.mjs` den Status prüfen (4 = erfolgreich). Der Helfer verwendet die bestehende Azure-CLI-Anmeldung mit explizitem Abonnement, auch wenn ein anderes Azure-Konto als Standard ausgewählt ist. App-Einstellungen und Startbefehl bleiben erhalten; Basic Auth bleibt deaktiviert. `/healthz` prüft den Server; `/api/status` meldet den KI-Status. Eine erfolgreiche echte Chat-Antwort gehört zur abschließenden Prüfung.

Der öffentliche Testserver begrenzt KI-Anfragen auf zwei gleichzeitig, zwölf pro Minute und standardmäßig 100 pro UTC-Tag. Diese Zähler gelten pro Serverprozess und werden bei einem Neustart zurückgesetzt; sie sind keine dauerhafte Abrechnungsgrenze. `AI_DAILY_REQUEST_LIMIT` steuert das Tageskontingent. `PUBLIC_ORIGIN` legt die erlaubte öffentliche Adresse fest.

## Racepoint App (Prototyp)

`racepoint-app/index.html` ist das Cockpit, mit dem Achim die Website betreibt: deutsch, mobil zuerst (Tab-Leiste unten, am Desktop Seitenleiste), installierbar als Web-App (Manifest, kein Service Worker). Die Idee: **so wenig Arbeit wie möglich.** Alles geht von Hand in Formularen oder per Satz an den KI-Assistenten, und beide benutzen **dieselben Aktionsfunktionen** (`racepoint-app/js/actions.js`) mit derselben Prüfung. Die App steht bewusst nicht im Prototyp-Umschalter. Alles läuft mit Demo-Daten im Browser (`localStorage`, Knopf „Demo zurücksetzen“ unter Mehr/Einstellungen).

**Drei Datenquellen, ein Katalog** für Website, Shop und KI-Chat:

| Quelle | Inhalt | In der App |
|---|---|---|
| Intec ERP (lokaler Sync-Dienst im Laden) | je Variante EAN, Größe, Farbe, Bestand, Ladenpreis | nur lesen, Schloss und „ERP · Stand …“. Demo: `racepoint-app/data/erp-export.csv` (fiktive EANs aus dem internen GS1-Bereich 200–299) |
| Lieferanten (Specialized, Cervélo) | Texte, Bilder, technische Daten, UVP | nur Vorlage, Basis ist `assets/v17/data.js` (echter Katalog) plus zwei Demo-Ergänzungen (S-Works Tarmac SL8, S-Works Aethos) |
| Racepoint App | eigene Werte je Feld, eigene Medien, Sichtbarkeit | Achims Wert gewinnt. „Auf Lieferantenwert zurücksetzen“ holt die Vorlage zurück. Lieferanten-Updates überschreiben nie, sie setzen nur den Hinweis „Lieferant hat aktualisiert – übernehmen?“ |

Herstellerbilder werden einzeln **ausgeblendet**, eigene Fotos und Videos hochgeladen, sortiert und als Titelbild gesetzt; Rollen `hero` (oben auf der Artikelseite, Mobil-Ausschnitt über den Fokuspunkt), `gallery`, `video` (eigenes Video oder YouTube-Link).

**Medien-Pipeline (Demo im Browser):** Beim Upload entstehen echte Bildvarianten per Canvas in 480/960/1600/2400 px (nie hochskaliert) als WebP und AVIF; kann der Browser kein AVIF kodieren, entsteht JPEG und die Oberfläche sagt das. Ein Tipp auf das Bild setzt den Fokuspunkt, die Vorschau zeigt die Ausschnitte 16:9, 1:1 und 9:16. Bei Videos erzeugt der Browser das Posterbild über `<video>` und Canvas; MP4 1080/720/480 und der Hero-Loop (max. 15 s) sind nur simuliert und so beschriftet. Originale und Varianten liegen nur im Speicher der Sitzung, gespeichert wird eine kleine Vorschau.

**Vier Sprachen ohne Freigabe:** Deutsch schreiben reicht. Die KI übersetzt nach FR/NL/EN, der Text geht direkt live und trägt das Badge „KI-übersetzt“. Glossarbegriffe (Racepoint, S-Works, Retül, Modellnamen …) werden nie übersetzt. Eine automatische Prüfung vergleicht Zahlen, Preise und Daten zwischen den Sprachen und meldet sich nur bei Abweichungen. In der Simulation gibt es vorbereitete Übersetzungen für die Demo-Sätze, sonst „Übersetzung folgt (KI offline)“.

**Weitere Bereiche:** Seiten-Heroes für alle Website-Seiten (Bild oder Video, Mobilvariante oder Fokuspunkt, Überschrift in 4 Sprachen, optional Zeitraum wie „Winter-Hero 1.11.–28.2.“, sonst eingebauter Standard). Öffnungszeiten aus `assets/rp-core.js` (nur gelesen), belgische Feiertage 2026/2027 vorbelegt, Ausnahmen (geschlossen/Betriebsurlaub, verkürzt, Sonderöffnung), Live-Status in Europe/Brussels und der Schalter „Auch bei Google Maps aktualisieren“ (Demo). Banner mit Text in 4 Sprachen, Link, Zeitraum und Vorschau; nennt ein Banner Preise oder Rabatte, bleibt es Entwurf, bis Achim die Omnibus-Regel bestätigt (Referenzpreis = niedrigster Preis der letzten 30 Tage). Module wie der Adventskalender baut Mikel im Code, die App schaltet nur ein/aus und pflegt Zeitraum und Türchen. Termine zeigen die Buchungen aus eTermin. Statistik nur als Tagessummen (cookielos, keine personenbezogenen Daten): Besuche, KI-Gespräche, Themen, meistgefragte Bikes, Übergaben, Terminanfragen, unbeantwortete Fragen, KI-Kosten gegen ein Monatslimit und der ERP-Abgleich (nach 24 Stunden Warnung, die Website zeigt dann „Preis im Laden erfragen“).

**Verlauf und Rückgängig:** Jede Änderung, von Achim oder der KI („KI · heute 14:02 · Bilder beim Tarmac SL8 getauscht“), steht im Verlauf und lässt sich mit einem Tipp zurücknehmen. Wurde derselbe Bereich danach noch einmal geändert, sagt die App welche Änderung zuerst zurück muss. Nichts wird hart gelöscht, nur ausgeblendet.

### KI-Assistent ohne Freigabe-Schleife

Der Assistent (Chat, Foto- und Videoanhang, Spracheingabe über die Web Speech API, falls vorhanden) führt Aufträge direkt aus und antwortet mit dem genauen Ergebnis und einem Rückgängig-Link. Nachfragen gibt es nur bei riskanten Aktionen: mehr als 5 Artikel auf einmal ausblenden und Banner mit Preisen. Bestätigen kann nur Achim per Tippen, nie das Modell. Harte Grenzen: keine ERP-Preise oder Bestände, keine Rechtstexte, kein Code, nie endgültig löschen.

**Ablauf:** Der Browser schickt den Verlauf an `POST /api/app-assistant` (`entwuerfe/codex-2026-10/server/app-assistant.mjs`). Der Server ruft das Modell (Messages API mit Streaming, Werkzeugschemas für `set_hours_exception`, `set_weekly_hours`, `update_article_text`, `set_article_visibility`, `set_article_media`, `set_page_hero`, `create_banner`, `query_stats`, `list_appointments`, `respond_appointment`, `find_article`, `undo`) und gibt Text und Werkzeugaufrufe zurück. **Die Werkzeuge laufen im Browser** über `A.run(...)`, die Ergebnisse gehen in der nächsten Runde zurück, höchstens 6 Runden. Sind alle Aktionen schreibend und erfolgreich und hat das Modell schon einen Satz geschrieben, spart der Browser die letzte Runde und hängt die Ergebnisse an die nächste Nachricht an. Fotos gehen als verkleinertes JPEG (max. 1024 px) mit, damit das Modell sieht, was angehängt ist; bei Videos das Standbild.

**Server:** gleiche Herkunftsprüfung, gleiche Limits wie `/api/chat` (zwei gleichzeitig, zwölf pro Minute, Tageskontingent `AI_DAILY_REQUEST_LIMIT` gemeinsam für Besucher-Chat und Assistent), Body höchstens 2 MB, strenge Prüfung jedes Nachrichtenblocks (nur bekannte Rollen, Blocktypen, Werkzeugnamen und Bildformate, max. 4 Bilder, Größenlimits). Der Schlüssel bleibt auf dem Server. `/api/status` meldet `appAssistant.ready`, Modell und Preise. Umgebungsvariablen: `ANTHROPIC_API_KEY`, `RACEPOINT_APP_AI_MODEL` (sonst `RACEPOINT_AI_MODEL`), `RACEPOINT_APP_AI_EFFORT` (Standard `low`), `RACEPOINT_AI_PRICE_INPUT` und `RACEPOINT_AI_PRICE_OUTPUT` in USD pro Million Token (Standard 2 und 10 für das aktuelle Standardmodell).

**Kosten:** Jede Antwort enthält `usage`, die App zeigt je Antwort die geschätzten Kosten und rechnet sie in „KI-Kosten diesen Monat“ ein. Ein typischer Auftrag braucht eine Runde mit wenigen tausend Eingabe-Token, also Bruchteile eines Cents; Systemanweisung und Werkzeuge werden gecacht.

**Simulation:** Meldet `/api/status` keine KI (wie in der Sandbox und in `node preview.mjs` ohne Schlüssel) oder ist sie nicht erreichbar, antwortet ein fester deutscher Befehls-Parser mit denselben Aktionen und dem Hinweis **Simulation**. Er versteht die sieben Demo-Sätze und Varianten davon: Sonderzeiten und Betriebsurlaub (und erkennt, dass der 24. und 31.12. donnerstags ohnehin Ruhetage sind, mit Vorschlag Sonderöffnung), Fotos mit Titelbild und „Herstellerbilder raus“, Hero-Video für eine Artikel- oder Website-Seite, Racepoint-Hinweis beim Aethos, Black-Friday-Banner (Fr–Mo, Entwurf mit Omnibus-Bestätigung), Artikel ausblenden und Chat-Statistik, dazu Rückgängig, Terminbuchungen und die harten Grenzen.

**Zuverlässigkeit:** Fehler der KI ändern nichts: Jede Aktion prüft ihre Eingaben selbst (Daten, Uhrzeiten, Ruhetage, Feiertage, Artikel eindeutig, Links nur auf racepoint.be) und meldet Fehler an das Modell zurück, das dann nachfragt. Ist die KI weg, arbeiten Formulare und Simulation weiter. Fällt der ERP-Abgleich länger als 24 Stunden aus, zeigt die Website keine veralteten Preise.

### Termine über eTermin, Anmeldung mit Google

Achim nutzt **eTermin** mit seinem Google-Kalender. Das bleibt das Buchungssystem: KI-Chat und App lesen über die eTermin-API die Leistungen und freien Zeiten je Leistung oder Mitarbeiter, legen Buchungen an und bekommen Änderungen (angelegt, geändert, storniert) über die „Web Push“-Benachrichtigungen (Webhook). Bestätigungs- und Erinnerungsmails sowie der Abgleich mit Google Kalender macht weiter eTermin. Der öffentliche und der geheime API-Schlüssel aus Achims eTermin-Konto liegen nur in den Azure-App-Einstellungen. Dauer, Tage, Kapazität und Puffer pflegt Achim in eTermin; die App zeigt sie schreibgeschützt mit „In eTermin bearbeiten“ und hat je Leistung nur eine Notiz für die KI (z. B. „Retül: Radschuhe mitbringen“). Ob Bestätigen, Umbuchen und Ablehnen aus der App per API gehen, hängt von der eTermin-Einstellung ab (API-Umfang prüfen); sonst bestätigt Achim direkt in eTermin.

Anmeldung: „Mit Google anmelden“ (Google Sign-In/OIDC), nur für Achims freigegebene Google-Adressen. Öffnungszeiten, Feiertage und Sonderzeiten kann die App zusätzlich über die **Google Business Profile API** an Achims Google-Unternehmensprofil (Maps) schicken, damit Maps und Website immer übereinstimmen. Den Zugang zur Business Profile API muss man bei Google erst beantragen.

### Was für den Echtbetrieb noch fehlt

Echte Anmeldung (Google Sign-In mit Adress-Freigabe, Sitzungen, Rollen), eine Datenbank statt `localStorage` (Overrides, Verlauf mit Rückgängig, Banner, Heroes, Module), Blob-Speicher plus CDN für Medien, ein ffmpeg-Job für Bildvarianten (AVIF/WebP) und Videos (MP4 1080/720/480, Poster, Loop), der lokale ERP-Sync-Dienst für Intec, die eTermin-Anbindung (API und Webhook), der Google-Business-Profile-Abgleich, der Lieferanten-Import mit Änderungserkennung, Statistik als serverseitige Tagessummen und die Website selbst, die diese Daten liest. Bis dahin sind Termine, Statistik, ERP und Medien-Umrechnung klar gekennzeichnete Demo-Daten.

## Neu: Prototyp 18 · Mein Traumbike

`v18-traumbike.html` (Logik und Styles in `assets/v18/`) ist dieselbe Website wie 17 · Best of, aber **ohne 3D**. Grund ist das Feedback „3D ist cool, aber es sind nicht die richtigen Bikes“. Alles wird mit echten Fotos und Filmen von Racepoint erzählt. Reihenfolge der Startseite: Hero (Shop-Film), Laufband, Bikes, Achim, Werkstatt, **Traumbike-Story**, Samstagsrunde, Filme, Besuch, KI-Berater.

**Die Traumbike-Story** (`assets/v18/traum.js` + `assets/v18/traum.css`) erzählt in fünf angehefteten bzw. ruhig bewegten Kapiteln, wie ein Traumbike entsteht. Beispiel ist das Cervélo S5 „Lupine LTD“ aus dem Laden:

1. **Die Idee:** Echte Clips des S5 aus Racepoints Instagram-Beitrag laufen beim Scrollen nacheinander, vom Schriftzug über Cockpit, Antrieb und Lackierung bis zum ganzen Rad. Höhepunkt: „Das ist es. Dein Traumbike.“ mit Knopf zum S5-Aufbau-Film.
2. **Beratung:** Team- und Ladenfotos, ein Zitat von Achim (als Entwurf markiert).
3. **Bikefitting:** Foto aus dem Retül-Raum, Link auf `v18-bikefitting.html`.
4. **Aufbau:** Der Shop-Film läuft beim Scrollen mit (Szene 6,5–11,9 s), dazu drei Werkstatt-Details. Danach „Achims Dreambuilds“: S5, Crux, Levo SL, Aethos, Shiv und Tarmac SL9 öffnen den YouTube-Film.
5. **Übergabe:** Ausfahrt-Foto, „Mein Traumbike planen“ (KI-Berater) und „Termin anfragen“.

Alle Bilder und Filme der Story stehen in **einer** Konfiguration, `STORY` oben in `assets/v18/traum.js`. Wie man ein Foto oder einen Clip tauscht, steht in `assets/v18/traum/README.md`, die Herkunft jeder Datei in `assets/v18/media/QUELLEN.md`. Bei `prefers-reduced-motion` gibt es nichts Angeheftetes, die Story zeigt dann ruhige Endzustände.

**Bike-Seite:** `v18-bike.html?id=…` zeigt statt des 3D-Konfigurators einen **Wunsch-Build**: Katalogfoto, Herstellerfarben als Auswahl, Größen-Richtwert nach Körpergröße, Extras (Retül, Pedale, Leasing) und eine Zusammenfassung, die an den KI-Berater oder per E-Mail geht.

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
