#!/usr/bin/env python3
"""
Racepoint · Prototyp 18 · Mein Traumbike
Erzeugt aus EINEM echten Bike-Foto die Ebenen fuer Kapitel 1 der Traumbike-Story
(Skizze -> Schattierung -> Blaupause -> echtes Foto).

    python3 tools/traum-sketch.py                      # Standard: assets/v18/traum/geometry.json
    python3 tools/traum-sketch.py --geometry pfad.json --scale 1.2
    python3 tools/traum-sketch.py --check              # nur Kontrollbild der Geometrie (traum-check.jpg)

Benoetigt Pillow und numpy (pip install pillow numpy). OpenCV wird nicht gebraucht.

Eingabe  (geometry.json): Pfad zum Foto + Bike-Geometrie in Pixeln des Originalfotos
          (Nabe hinten/vorne, Tretlager, Sitzknoten, Steuerrohr, Sattel, Lenker ...).
          Optional "extra": [{"pts": [[x,y],...], "w": Breite}] fuer weitere Teile
          (Unterlenker, Kette, Flaschenhalter, Schaltwerk), die in die Bike-Maske sollen.
Ausgabe  (assets/v18/traum/):
  traum-lines.webp   saubere Strichzeichnung   (Graphit, Alpha = Strich)
  traum-shade.webp   Bleistift-Schattierung    (Graphit, Alpha = Schraffur/Ton)
  traum-blue.webp    Blaupausen-Linien         (Weiss, Alpha = Kante) – Blau kommt aus CSS/SVG
  traum-flood.webp   Aquarell-Flutkarte (Graustufe: hell = wird frueher farbig)
  traum-data.js      window.RP18Traum = Groesse, Dateien, Geometrie (fuer assets/v18/traum.js)

Techniken: Graustufe, Invertieren, Weichzeichnen, Color-Dodge (klassische
Bleistiftskizze), Sobel-Kantenkarte, Schraffur aus Tonwerten, eine aus der Geometrie
gezeichnete Bike-Maske (damit der Hintergrund des Ladens zuruecktritt) und fBm-Rauschen
fuer den Aquarell-Rand.
"""
import argparse, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(ROOT, 'assets', 'v18', 'traum')


def blur(a, r):
    """Gauss-Weichzeichner fuer float-Arrays 0..1 (ueber Pillow, 16 bit genug)."""
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(r)), dtype=np.float32) / 255


def _box(a, r, axis):
    """Box-Filter der Breite 2r+1 entlang einer Achse (kumulierte Summe, Rand gespiegelt)."""
    p = np.pad(a, [(r + 1, r) if i == axis else (0, 0) for i in range(a.ndim)], mode='reflect')
    c = np.cumsum(p, axis=axis, dtype=np.float64)
    n = a.shape[axis]
    hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
    lo = np.take(c, np.arange(0, n), axis=axis)
    return ((hi - lo) / (2 * r + 1)).astype(np.float32)


def blur_f(a, r):
    """Weichzeichnen mit voller Genauigkeit (fuer Masken mit weichen Verlaeufen).
    Dreifacher Box-Filter ~ Gauss mit Radius r (Pillow blurt keine Float-Bilder)."""
    k = max(1, int(round(r * 0.8)))
    out = a.astype(np.float32)
    for _ in range(3):
        out = _box(_box(out, k, 0), k, 1)
    return out


def sobel(a):
    p = np.pad(a, 1, mode='edge')
    gx = (p[:-2, 2:] + 2 * p[1:-1, 2:] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[1:-1, :-2] + p[2:, :-2])
    gy = (p[2:, :-2] + 2 * p[2:, 1:-1] + p[2:, 2:]) - (p[:-2, :-2] + 2 * p[:-2, 1:-1] + p[:-2, 2:])
    return np.hypot(gx, gy)


def fbm(h, w, seed=7, octaves=5, base=6):
    rng = np.random.default_rng(seed)
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        gh, gw = base * 2 ** o, int(base * 2 ** o * w / h) + 1
        g = rng.random((gh, gw)).astype(np.float32)
        im = Image.fromarray(g, mode='F').resize((w, h), Image.BICUBIC)
        acc += np.asarray(im, np.float32) * amp
        tot += amp
        amp *= 0.5
    acc /= tot
    return (acc - acc.min()) / (acc.max() - acc.min())


def smooth(x, a, b):
    t = np.clip((x - a) / np.maximum(b - a, 1e-6), 0, 1)
    return t * t * (3 - 2 * t)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--geometry', default=os.path.join(OUT, 'geometry.json'))
    ap.add_argument('--scale', type=float, default=1.0, help='Ausgabegroesse relativ zum Foto (Standard 1; hoechstens ca. 1,5, sonst wird es unscharf)')
    ap.add_argument('--check', action='store_true', help='nur Kontrollbild traum-check.jpg mit eingezeichneter Geometrie schreiben')
    ap.add_argument('--quality', type=int, default=82)
    args = ap.parse_args()

    G = json.load(open(args.geometry, encoding='utf-8'))
    src = Image.open(os.path.join(ROOT, G['photo'])).convert('RGB')
    S = args.scale
    if S > 1.5:
        print('Warnung: --scale %.2f vergroessert das Foto stark. Lieber ein groesseres Foto nehmen.' % S)
    if args.check:
        chk = src.copy(); d = ImageDraw.Draw(chk)
        def ring(c, r, col, w=4): d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=col, width=w)
        for c, R, r in [(G['rearHub'], G['wheelR'][0], G['rimR'][0]), (G['frontHub'], G['wheelR'][1], G['rimR'][1])]:
            ring(c, R, 'red'); ring(c, r, 'yellow'); ring(c, 6, 'red', 6)
        ring(G['bb'], G['chainringR'], 'cyan')
        pl = lambda pts, col: d.line([tuple(q) for q in pts], fill=col, width=5)
        pl([G['rearHub'], G['bb'], G['headBottom'], G['headTop'], G['seatCluster'], G['bb']], 'magenta')
        pl([G['seatCluster'], G['rearHub']], 'magenta'); pl([G['headBottom'], G['frontHub']], 'magenta')
        pl([G['seatCluster'], G['seatpostTop']], 'lime'); pl(G['saddle'], 'lime')
        pl([G['headTop'], G['stem']] + G['bar'], 'orange')
        for x in G.get('extra', []): pl(x['pts'], 'white')
        out = os.path.join(OUT, 'traum-check.jpg'); chk.save(out, quality=85)
        print('Kontrollbild:', out, '(nicht einchecken)')
        return 0
    W, H = int(src.width * S), int(src.height * S)
    img = src.resize((W, H), Image.LANCZOS)
    rgb = np.asarray(img, np.float32) / 255
    gray = rgb @ np.array([0.299, 0.587, 0.114], np.float32)
    P = lambda p: (p[0] * S, p[1] * S)

    # ---------- Bike-Maske aus der Geometrie ----------
    def stroke_mask(width_scale=1.0):
        m = Image.new('L', (W, H), 0)
        d = ImageDraw.Draw(m)
        def circ(c, r, w, v=255):
            c = P(c); r *= S; w *= S
            d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], outline=v, width=int(w))
        def disk(c, r, v):
            c = P(c); r *= S
            d.ellipse([c[0] - r, c[1] - r, c[0] + r, c[1] + r], fill=v)
        def line(pts, w, v=255):
            pts = [P(p) for p in pts]
            d.line(pts, fill=v, width=int(w * S * width_scale), joint='curve')
            for p in pts:
                rr = w * S * width_scale / 2
                d.ellipse([p[0] - rr, p[1] - rr, p[0] + rr, p[1] + rr], fill=v)
        for c, R, r in [(G['rearHub'], G['wheelR'][0], G['rimR'][0]), (G['frontHub'], G['wheelR'][1], G['rimR'][1])]:
            disk(c, r, 70)                     # Speichen/Nabe: wenig Kraft (Hintergrund soll nicht durchscheinen)
            disk(c, r * 0.22, 255)
            circ(c, (R + r) / 2, (R - r) + 8)   # Reifen + Felge: volle Kraft
        b = G['bb']
        line([G['rearHub'], b, G['headBottom'], G['headTop'], G['seatCluster'], b], 22)
        line([G['seatCluster'], G['rearHub']], 16)
        line([G['headBottom'], G['frontHub']], 18)
        line([G['seatCluster'], G['seatpostTop']], 16)
        line(G['saddle'], 20)
        line([G['headTop'], G['stem']] + G['bar'], 18)
        disk(b, G['chainringR'] + 6, 255)
        for x in G.get('extra', []):
            line(x['pts'], x.get('w', 14))
        return np.asarray(m, np.float32) / 255

    mask = blur_f(stroke_mask(), 7 * S)
    mask = smooth(np.clip(mask * 1.25, 0, 1), 0.2, 0.85)   # Rand straffen: kein Kies-/Fassadenrauschen um die Reifen
    bg = 0.02                                  # Hintergrund nur als Hauch
    soft = bg + (1 - bg) * mask

    # ---------- 1) Bleistiftskizze: Graustufe -> invertieren -> Weichzeichnen -> Color-Dodge ----------
    inv = 1 - gray
    b = blur(inv, 7 * S)
    dodge = np.clip(gray / np.maximum(1 - b, 1e-3), 0, 1)
    sketch = 1 - dodge                          # 0 = Papier, 1 = Graphit
    sketch = smooth(sketch, 0.04, 0.42)

    # ---------- 2) Kantenkarte (Sobel) ----------
    g2 = blur(gray, 0.9 * S)
    e = sobel(g2)
    e = e / np.percentile(e, 99.6)
    # zweite, groebere Skala: helle Rohre (Silber vor Grau) bekommen so eine Kontur
    eg = sobel(blur(gray, 2.4 * S))
    eg = eg / np.percentile(eg, 99.6)
    edges = np.maximum(smooth(e, 0.09, 0.5), smooth(eg, 0.12, 0.6) * 0.8)

    grain = 0.72 + 0.28 * fbm(H, W, seed=3, octaves=6, base=40)
    lines = np.clip(np.maximum(sketch * 0.85, edges) * soft * grain, 0, 1)
    lines = smooth(lines, 0.06, 0.8) ** 0.9

    # ---------- 3) Schattierung: Tonwert + 45°-Schraffur ----------
    tone = blur(1 - gray, 2.2 * S)
    tone = smooth(tone, 0.35, 0.95)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    period = 5.5 * S
    hatch1 = 0.5 + 0.5 * np.cos((xx + yy) * 2 * math.pi / period)
    hatch2 = 0.5 + 0.5 * np.cos((xx - yy) * 2 * math.pi / (period * 1.15))
    h1 = smooth(hatch1, 1 - tone * 0.9, 1.0)
    h2 = smooth(hatch2, 1 - np.clip(tone - 0.45, 0, 1) * 1.6, 1.0)
    shade = np.clip((np.maximum(h1, h2) * 0.45 + tone * 0.3) * mask ** 1.6 * grain, 0, 1)

    # ---------- 4) Blaupause: feine weisse Kanten ----------
    e3 = sobel(blur(gray, 0.6 * S))
    e3 = e3 / np.percentile(e3, 99.5)
    blue = np.clip(smooth(e3, 0.12, 0.6) * (0.03 + 0.97 * mask) + sketch * 0.25 * mask, 0, 1)

    # ---------- 5) Aquarell-Flut: hell = wird zuerst farbig ----------
    cx, cy = P(G['bb'])
    d = np.hypot((xx - cx) / W, (yy - cy) / H * (H / W))
    d = d / d.max()
    n = fbm(H, W, seed=11, octaves=6, base=4)
    t = d * 0.62 + (1 - mask) * 0.22 + n * 0.30
    t = (t - t.min()) / (t.max() - t.min())
    flood = 1 - t

    os.makedirs(OUT, exist_ok=True)
    graphite = (38, 38, 44)
    def save_alpha(a, color, name):
        arr = np.zeros((H, W, 4), np.uint8)
        arr[..., 0], arr[..., 1], arr[..., 2] = color
        arr[..., 3] = np.clip(a * 255, 0, 255).astype(np.uint8)
        Image.fromarray(arr, 'RGBA').save(os.path.join(OUT, name), 'WEBP', quality=args.quality, method=6)
    save_alpha(lines, graphite, 'traum-lines.webp')
    save_alpha(shade, graphite, 'traum-shade.webp')
    save_alpha(blue, (240, 247, 255), 'traum-blue.webp')
    Image.fromarray((flood * 255).astype(np.uint8), 'L').save(os.path.join(OUT, 'traum-flood.webp'), 'WEBP', quality=90, method=6)

    data = {
        'w': W, 'h': H, 'scale': S,
        'photo': G['photo'], 'photoAlt': G.get('photoAlt', ''), 'note': G.get('note', ''),
        'files': {k: 'assets/v18/traum/traum-' + k + '.webp' for k in ('lines', 'shade', 'blue', 'flood')},
        'geo': {k: v for k, v in G.items() if not k.startswith('_') and k not in ('photo', 'photoAlt', 'note', 'extra')},
    }
    with open(os.path.join(OUT, 'traum-data.js'), 'w', encoding='utf-8') as f:
        f.write('/* Erzeugt von tools/traum-sketch.py – nicht von Hand bearbeiten. */\n')
        f.write('window.RP18Traum = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    for k in ('lines', 'shade', 'blue', 'flood'):
        p = os.path.join(OUT, 'traum-' + k + '.webp')
        print('%-18s %6.1f KB' % (os.path.basename(p), os.path.getsize(p) / 1024))
    print('traum-data.js      %dx%d' % (W, H))


if __name__ == '__main__':
    sys.exit(main())
