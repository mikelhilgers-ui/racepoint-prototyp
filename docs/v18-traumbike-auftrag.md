# Auftrag: Prototyp 18 · „Mein Traumbike“ (Racepoint)

Dieser Auftrag richtet sich an einen Coding-Agenten auf Mikels PC, der Internetzugriff hat.
Bitte zuerst ganz lesen und erst dann loslegen.

## 1. Worum es geht

**Racepoint** ist ein Fahrradladen in Schönberg (Ostbelgien), geführt von **Achim Leufgen** und seiner Frau **Elke**.

- Er ist Specialized-Elite-Händler, führt Cervélo und hat eine Meisterwerkstatt für alle Marken.
- Er bietet Retül-Bikefitting an und hat einen eigenen YouTube-Kanal mit „Dreambuild“-Filmen.

Mikel baut für Achim Website-Prototypen. Das Repo ist `mikelhilgers-ui/racepoint-prototyp`, der Branch ist **`claude/use-cases-b0tw49`**. Arbeite nur auf diesem Branch und erstelle keinen Pull Request.

**Ausgangspunkt ist Prototyp 17 · Best of:** `v17-best-of.html`, die Unterseiten `v17-*.html`, Logik und Styles in `assets/v17/`. Er ist fertig und bleibt **unverändert**.

**Neues Ziel ist Prototyp 18 · Mein Traumbike:** dieselbe Website, aber **ohne jede 3D-Animation**. Das Feedback lautete: „Der 3D-Konfigurator und die 3D-Animationen sind cool, passen aber nicht, weil es nicht die richtigen Bikes sind.“ Stattdessen soll alles mit **echten Fotos und Videos von Racepoint** erzählt werden. Die zentrale Story heißt:

> **Mein Traumbike – von der Idee zur Wirklichkeit. Achim hat alles für mich.**

## 2. Was schon da ist (angefangener Stand, ist committet)

- **14 Seiten `v18-*.html`:** Kopie von v17, alles auf v18 umbenannt.
  - Die Startseite heißt **`v18-traumbike.html`**.
  - Links, Pfade, Titel und `RP18`-Namen sind angepasst, und die Navigation in `assets/v18/site.js` zeigt auf v18.
- **`assets/v18/`:** Kopie der JS- und CSS-Dateien aus v17.
  - `bike3d.js` und `bike.js` sind bewusst nicht kopiert.
  - Die Aufbau-, 3D- und Drehteller-Logik ist aus `bestof.js`, `bestof.css` und `site.css` entfernt.
- **Startseite noch kaputt:** `v18-traumbike.html` enthält noch das alte Markup des Abschnitts „2 · Der Aufbau“ und lädt `assets/v18/bike.js`, das es nicht mehr gibt. Genau dort kommt die neue Story hin.
- **Bike-Detailseite:** `v18-bike.html` und `assets/v18/pages.js` enthalten noch den 3D-Konfigurator. Er muss ersetzt werden (siehe Abschnitt 5).
- **Skizzen-Werkzeug:** `tools/traum-sketch.py` (Pillow und numpy) erzeugt aus **einem** echten Bike-Foto Ebenen für eine Skizze, eine Blaupause und eine Aquarell-Flut.
  - Dafür braucht es `assets/v18/traum/geometry.json` mit der Bike-Geometrie in Foto-Pixeln: Naben, Tretlager, Sattel, Lenker usw.
  - Bei einem neuen Foto musst du die Geometrie neu setzen.
  - Das Skript wurde noch nie ausgeführt. Prüfe die Ausgabe und verbessere sie, wo nötig.
- **Touren-Seite:** `v18-touren.html` liest die GPX-Dateien aus `assets/v17/touren/`. Das bleibt so, damit es nur einen Ablageort gibt.
- **Retül-Animation:** Die Motion-Capture-Animation auf `v18-bikefitting.html` (`assets/v18/retul.js`) **bleibt**, sie ist ausdrücklich gewünscht.
- **Echtes Material im Repo:**
  - Fotos:
    - `assets/roadbike-shop.jpg` (S-Works Tarmac im Laden, nur 600×400)
    - `assets/achim-team.jpg`, `assets/shop-interior.jpg`, `assets/achim-ride.jpg`
    - `assets/gravel-ride.jpg`, `assets/bikefitting.jpg`
    - weitere in `entwuerfe/codex-2026-10/prototype/assets/`
  - Shop-Film `assets/racepoint-teaser.mp4` und dieselbe Datei fürs Scrubben (`assets/racepoint-teaser-scrub.mp4`). Zeitmarken:
    - 1–3 s: Beratung an der Theke
    - 3,5–6 s: Schuh- und Fußvermessung
    - 6,5–11,9 s: Rad wird im Montageständer aufgebaut
    - 16,5–18,5 s: Feineinstellung
    - 19,5–21,5 s: Retül-Marker und Fahrer auf der Rolle
    - 22–22,9 s: Cleat-Einstellung
  - Zehn YouTube-Filme mit IDs und Titeln in `assets/v18/data.js`, Titelbilder in `entwuerfe/codex-2026-10/prototype/assets/films/<id>.jpg`. Die Titelbilder haben große Schrift über dem Bild und taugen deshalb **nicht** für den Skizzen-Effekt.

## 3. Echtes Material aus dem Internet holen

Hier hast du Internet, nutze es:

- Instagram: https://instagram.com/racepoint.be
- YouTube-Seite: https://www.racepoint.be/youtube/
- Website: https://www.racepoint.be/
- Achims YouTube-Kanal

**Gesucht:**

1. **Ein großes, möglichst seitliches Foto eines fertig aufgebauten Rads**, gern vor ruhigem Hintergrund und mit mindestens 1600 px Breite. Das ist die Quelle für den Effekt von der Skizze zum echten Rad.
2. Fotos vom **Aufbau in der Werkstatt**, von **Achim bei der Beratung**, von der **Übergabe**, vom **Retül-Fitting** und von **Ausfahrten**.
3. Für alle Filme die richtigen YouTube-IDs und Titel. Die Liste in `data.js` gleichst du ab und ergänzt neue Dreambuild-Filme.

**Regeln dazu:**

- **Nur Racepoints eigenes Material** verwenden: Instagram, Website, YouTube von Racepoint. Keine Fotos Dritter, also keine Presseartikel, keine Fremdseiten, keine Herstellerbilder außer den bereits genutzten Specialized-Produktbildern.
- **Menschen:** Wenn Kunden erkennbar sind, das Foto nur mit Vermerk „Einverständnis bei Achim klären“ in die Quellenliste aufnehmen, oder lieber ein anderes nehmen.
- **YouTube-Filme nicht herunterladen** (kein yt-dlp). Einbinden über das bestehende `RP.openVideo` und die vorhandenen Titelbilder. Falls Achim Original-Videodateien liefert, kommen die später.
- Instagram verlangt oft eine Anmeldung. Wenn du nicht herankommst, nicht tricksen: Mikel sagen, welche Bilder er von Hand speichern soll.
- **Ablage:**
  - Bilder kommen nach `assets/v18/media/`, optimiert als webp oder jpg mit sinnvollen Größen (etwa 1600 px für große Bilder, 800 px für Karten).
  - Dazu eine **`assets/v18/media/QUELLEN.md`**: Datei, Original-URL, Datum, was zu sehen ist, und ob eine Einverständnis-Frage offen ist.

## 4. Die Traumbike-Story auf der Startseite

Sie ersetzt den Abschnitt „Der Aufbau“ in `v18-traumbike.html`, die Logik kommt in eine neue `assets/v18/traum.js` mit eigenem CSS.

- **Technik:** Scroll-Story mit angehefteten Kapiteln (GSAP + ScrollTrigger + Lenis aus `vendor/`, alles lokal, kein CDN).
- **Anmutung:** hochwertig wie eine Apple- oder Editorial-Produktgeschichte, kein Baukasten-Template.
- **Formulierung:** Die Story ist ein **Beispiel** und keine echte Kundengeschichte. Sie spricht den Besucher mit „du“ an: „So entsteht dein Traumbike“. Ein kleiner Hinweis wie „Beispiel: S-Works Tarmac aus unserem Laden“ ist gut.

**Die fünf Kapitel:**

1. **Die Idee**
   - Das echte Bike-Foto entsteht beim Scrollen erst als **Bleistiftskizze auf Papier**: Strich für Strich, ideal mit einer Bleistiftspitze, die mitläuft.
   - Dann folgt die Schattierung, dann eine **Blaupause** mit ein paar Maßlinien (Reach, Stack, Radstand).
   - Zum Schluss flutet Farbe wie **Aquarell** ins **echte Foto**: „Das ist es. Dein Traumbike.“ Dieser Moment ist der Höhepunkt.
   - Die Ebenen erzeugt `tools/traum-sketch.py`. Das Bild darf höchstens etwa 1,5-fach vergrößert werden, dann lieber eine kleinere Bühne.
2. **Beratung bei Achim:** echte Fotos von Achim und dem Laden, ein kurzes Zitat.
3. **Bikefitting (Retül):** Teaser mit Foto und Link auf `v18-bikefitting.html`.
4. **Aufbau in der Werkstatt:**
   - Der Shop-Film läuft beim Scrollen mit (Szene 6,5–11,9 s).
   - Dazu ein Streifen **„Achims Dreambuilds – echte Builds aus der Werkstatt“** mit den Filmen: Cervélo S5 „Vom Rahmen zum Aero-Dreambuild“ (prominent), S-Works Crux „Ein Gravelbike entsteht“, Turbo Levo SL, S-Works Aethos und S-Works Shiv.
   - Die Karten öffnen den Film über `RP.openVideo`.
5. **Übergabe und erste Ausfahrt:**
   - Ein Ausfahrt-Foto.
   - Die Knöpfe **„Mein Traumbike planen“** (öffnet den KI-Berater über `data-ask`, siehe v17) und **„Termin anfragen“**.

**Reihenfolge der Startseite**, wie Mikel sie freigegeben hat:

1. Hero (Film)
2. Laufband
3. Bikes
4. Achim
5. Werkstatt
6. **Traumbike-Story**
7. Samstagsrunde
8. Filme (ohne die Dreambuild-Filme doppelt zu zeigen)
9. Besuch
10. **KI-Berater als letzter Abschnitt direkt vor dem Footer**

Der Hero enthält **kein 3D**.

**Austauschbarkeit:** Alle Bilder und Videos der Story stehen in **einer** Konfiguration, zum Beispiel oben in `traum.js` oder in `assets/v18/traum/story.json`. So kann Achim später Fotos tauschen. In `assets/v18/traum/README.md` steht, wie man ein neues Bike-Foto einsetzt: Geometrie setzen, Skript laufen lassen.

## 5. `v18-bike.html`: statt 3D-Konfigurator ein „Dein Wunsch-Build“

Kein 3D. Der Block enthält:

- echte Produktfotos
- Herstellerfarben als Text-Chips mit dem Hinweis „Farbe laut Hersteller – Verfügbarkeit bestätigen wir“. Die Farbnamen kannst du über die Specialized-Seiten prüfen; der Katalog in `assets/v18/data.js` hat Quell-URLs.
- Rahmengröße aus der Körpergröße, beschriftet als „Richtwert“
- Extras zum Ankreuzen: Retül-Fitting, Pedale, Leasing
- eine Zusammenfassung mit „Mit KI besprechen“ (`data-ask`) und „Per E-Mail anfragen“ (mailto wie in v17)

## 6. Feste Regeln

- Nur Deutsch. `prefers-reduced-motion` beachten: dann statische Endzustände, kein Anheften.
- **Mobil sauber bei 390 und 360 px:** kein seitliches Scrollen, und der KI-Knopf unten rechts verdeckt nichts.
- **Kein Prototyp-Zahnrad auf v18-Seiten:** `prototype-picker.js` nicht einbinden. Der KI-Knopf sitzt ganz unten rechts; die Regel steht in `site.css`.
- **Prototypen-Auswahl:** 18 · Traumbike wird als neuester Eintrag ganz oben mit NEW-Badge eingetragen. Das passiert in **beiden** Dateien:
  - `assets/prototype-picker.js`
  - `entwuerfe/codex-2026-10/prototype/assets/prototype-picker.js`

  Beide müssen danach identisch sein; die Datei unter `assets/` ist die neuere Vorlage. Falls die Übersicht (`preview.mjs`) Vorschaubilder nutzt, auch eins für 18 anlegen.
- **Azure-Paket:** `hosting/build.mjs` nimmt nur bestimmte Dateien auf. Die Regel `/^v17-[a-z0-9-]+\.html$/` muss auch `v18-*.html` erfassen. Prüfe, dass neue Dateitypen (webp, mp4, json) im Build und in den MIME-Typen in `hosting/http.mjs` stehen. Neue Dateien vor dem Build mit `git add` erfassen, sonst fehlen sie im Paket.
- **Tabu:** `assets/v9/*`, alle v17-Dateien, `assets/rp-core.js`, `assets/ki-berater.js` und `entwuerfe/codex-2026-10/server/`.
- **API-Schlüssel:** Keine Schlüssel oder Zugangsdaten ins Repo oder in den Browser. Der KI-Schlüssel liegt nur in der Azure-App-Einstellung.
- **README:** Abschnitt zu Prototyp 18 ergänzen.

## 7. Prüfen und abschließen

1. `npm test` muss grün sein (aktuell 28 von 28).
2. `node preview.mjs` starten und http://127.0.0.1:8101/ öffnen. Alle v18-Seiten prüfen, am Desktop bei 1440×900 und am Handy bei 390×740:
   - keine Fehler in der Konsole
   - kein seitliches Überlaufen
   - alle Links liefern 200
3. **Screenshots der Story an 4–5 Scroll-Positionen**, am Desktop und am Handy. Anschauen und so lange verbessern, bis es hochwertig wirkt.
4. `npm run build` ausführen und prüfen, dass `public-files.json` die v18-Seiten und Medien enthält.
5. Committen mit deutscher Nachricht und auf `claude/use-cases-b0tw49` pushen.
6. **Erst nach Mikels Okay** auf Azure veröffentlichen:

   ```
   powershell -NoProfile -File hosting/package.ps1
   node hosting/deploy-azure.mjs --upload
   node hosting/deploy-azure.mjs
   ```

   Beim letzten Befehl bedeutet Status 4 Erfolg. Danach https://racepoint-prototypen.azurewebsites.net/v18-traumbike.html prüfen und im KI-Chat eine echte Frage stellen.
7. **Abschlussbericht an Mikel:**
   - was gebaut wurde
   - welche Bilder woher stammen (QUELLEN.md)
   - offene Einverständnis-Fragen
   - was Achim noch liefern sollte: Original-Videos vom Aufbau, ein großes Seitenfoto eines Kundenrads und echte Retül-Fotos
