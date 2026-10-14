# Racepoint · Designstudien Oktober 2026

Separates Paket für die gemeinsam mit Codex erarbeiteten Prototypen. Die Varianten V8–V10 der parallelen Claude-Sitzung liegen außerhalb dieses Ordners und werden von diesem Paket nicht verändert.

## Enthalten

- Aktive Auswahl: Original, Velocity, Terrain, Cinema und Motion. Atelier ist aus der Auswahl entfernt.
- Jeweils Startseite und 22 Unterseiten; gemeinsame Vergleichsübersicht.
- Racepoint-Logofarben Rot (#E83637), Schwarz und Weiß, ergänzt durch neutrale Grautöne.
- Öffnender/maximierbarer Chat, echte serverseitige KI mit Herstellerrecherche, Vergleich und Briefing.
- Video-Hintergründe, 3D-Scrollaufbau, mobile Bedienung und reduzierte Bewegung.

Die Website-Dateien unter `prototype/` sind der eigenständig lauffähige, editierbare Exportstand. `EXPORT-MANIFEST.json` enthält die Dateihashes zur Zuordnung dieses Standes.

## Lokal testen

Node.js 22 oder neuer, keine zusätzlichen npm-Pakete erforderlich. Im Ordner dieses Pakets:

```sh
npm run preview
```

Danach http://127.0.0.1:8102/varianten/ öffnen. Port über die Umgebungsvariable `PORT` änderbar.

Für echte KI-Beratung wird `ANTHROPIC_API_KEY` oder `LIGNA_ASSISTENT_API_KEY` ausschließlich serverseitig aus der lokalen Umgebung gelesen. Optional: `RACEPOINT_AI_MODEL`, Standard `claude-sonnet-5-5`. Unter Windows übernimmt `powershell -File prototype/start-preview.ps1` vorhandene Benutzer-Umgebungsvariablen in den Prozess. Keine Schlüsseldatei ist enthalten oder erforderlich. Ohne Schlüssel bleibt die manuelle Bike-Auswahl verfügbar.

## Gemeinsame Prototypen-Auswahl

Der Einstieg `index.html` führt zur Auswahl. Alle statischen Asset-, Modul- und Modellpfade funktionieren auch in diesem Unterordner. `shared/` und `previews/` verwenden keine führenden Unterstriche, damit sie auch bei GitHub Pages enthalten bleiben.

GitHub Pages kann das Design anzeigen, führt aber den KI-Server nicht aus. Für echte KI ist der lokale Node-Server oder später eine eigene serverseitige Bereitstellung nötig. Der enthaltene Server bindet bewusst nur an Loopback; dies ist kein öffentlich konfiguriertes Backend.

Das gemeinsame Zahnrad steht auf jedem Prototyp und allen Unterseiten. Die 14 aktiven Entwürfe stehen auch auf der gemeinsamen Startübersicht, neueste zuerst. **16 · Motion**, **15 · Cinema**, **14 · Terrain**, **13 · Velocity**, **11 · Original** sowie **10**, **9** und **8** tragen das rote **NEW**-Badge. Atelier und Kunden-Feedback sind aus der Auswahl entfernt. Beim Wechsel zwischen unseren Designs bleibt die Unterseite erhalten. Mit `node preview.mjs` im Repository-Hauptordner läuft die gemeinsame Vorschau einschließlich unseres KI-Backends auf http://127.0.0.1:8101/.

## Checks und Quellen

`npm test` führt die 18 Backend-/Streamtests ohne echte Anbieteranfragen aus. Der Export wurde zusätzlich unter einem Unterordnerpfad auf lokale Assets, Chatdialog, 3D-Modell und Seitenwechsel geprüft.

Originalfotos und Videos stammen aus dem Racepoint-Projekt. Filmquellen: `prototype/assets/films/SOURCES.md`. Modell/Attribution: `prototype/kombi/models/LICENSE-NOTES.md` und `SOURCE.md`. Das CarbonFrameBike ist eine CC-BY-SA-4.0-Designstudie, kein Specialized-/Cervélo-Verkaufsmodell. Three.js: `prototype/kombi/vendor/THREE-LICENSE.txt`. Marken-/Produktbilder und Quellennachweise im Katalog bleiben zugeordnet.
