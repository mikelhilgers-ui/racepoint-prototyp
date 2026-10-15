# Traumbike-Story · Bilder und Filme tauschen

Die Story auf `v18-traumbike.html` holt **alle** Bilder und Filme aus einer
einzigen Konfiguration: `STORY` ganz oben in `assets/v18/traum.js`.
Das HTML enthält nur Platzhalter (`data-t-img="talk.main"` usw.).

## Ein Foto tauschen (Kapitel 2, 3, 5)

1. Foto nach `assets/v18/media/` legen, als WebP, etwa 1600 px breit
   (Hochformat-Fotos etwa 1000 px). Zum Beispiel mit
   `python -c "from PIL import Image; im=Image.open('neu.jpg'); im.thumbnail((1600,1600)); im.save('assets/v18/media/neu.webp', quality=80)"`.
2. In `traum.js` beim passenden Eintrag `src` und `alt` ändern:

   ```js
   talk: {
     main: { src: M + 'neu.webp', alt: 'Achim berät eine Kundin am Rennrad' },
   ```

3. Die Quelle in `assets/v18/media/QUELLEN.md` eintragen. Sind Personen
   erkennbar, das Einverständnis vermerken.

## Ein anderes Traumbike in Kapitel 1

Kapitel 1 zeigt kurze, stumme Clips vom Detail bis zum ganzen Rad
(`STORY.idea.clips`, Reihenfolge = Reihenfolge beim Scrollen) und am Ende ein
Foto des ganzen Rads (`STORY.idea.final`).

1. Pro Clip zwei Dateien erzeugen, Desktop und Handy, ohne Ton
   (ffmpeg ist per winget installiert):

   ```
   ffmpeg -i clip.mp4 -an -c:v libx264 -crf 25 -preset slow -pix_fmt yuv420p -movflags +faststart -vf scale=1280:-2 rad-detail.mp4
   ffmpeg -i clip.mp4 -an -c:v libx264 -crf 27 -preset slow -pix_fmt yuv420p -movflags +faststart -vf scale=720:-2  rad-detail-m.mp4
   ffmpeg -i clip.mp4 -frames:v 1 -vf scale=1280:-2 -c:v libwebp -quality 78 rad-detail.webp
   ```

2. In `STORY.idea.clips` je Clip `src`, `srcM`, `poster`, den Bildausschnitt
   fürs Handy (`pos`, z. B. `'40% 50%'`) und die zwei Textzeilen eintragen.
   Drei bis sechs Clips funktionieren, die Scroll-Länge passt sich an.
3. `STORY.idea.final` auf ein Foto des ganzen Rads setzen (Querformat,
   Rad mittig mit etwas Luft darüber, dort steht die Überschrift).
4. Den Hinweis „Beispiel: …“ und den Film-Knopf in `v18-traumbike.html`
   (Abschnitt `#tIdea`) anpassen.

## Werkstatt-Film und Dreambuilds (Kapitel 4)

- `STORY.build.film`: Datei und Zeitfenster (`from`/`to` in Sekunden), das beim
  Scrollen abläuft. Die Datei braucht dichte Keyframes, sonst ruckelt das
  Scrubben (`racepoint-teaser-scrub.mp4` hat alle 0,2 s einen).
- `STORY.build.steps`: die drei Detailkarten.
- `STORY.films`: YouTube-ID, Titel, Unterzeile, Titelbild. Der erste Film wird
  groß gezeigt. Filme werden nicht heruntergeladen, nur über `RP.openVideo`
  eingebettet.

## Warum keine Bleistiftskizze?

Der Auftrag sah ursprünglich vor, dass Kapitel 1 ein Foto erst als
Bleistiftskizze, dann als Blaupause zeichnet (`tools/traum-sketch.py` und
`geometry.json`). Mikel hat am 15.10.2026 entschieden: **keine Skizze, sondern
die echten Videos und Fotos des Bikes.** Das Skript bleibt im Repo, wird von
der Seite aber nicht mehr benutzt, und seine Ebenen werden nicht ausgeliefert.
