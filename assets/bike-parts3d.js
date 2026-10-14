/* =====================================================================
   RACEPOINT · gemeinsame 3D-Bauteile fuer prozedurale Bikes (THROWAWAY)
   Genutzt von V9 (assets/v9/bike.js -> buildBike) und spaeter V17.
   Alles wird aus Geometrie + kleinen Canvas-Texturen gerechnet, kein Download.

   KOORDINATEN: Meter. x = Fahrtrichtung, y = oben, z = Antriebsseite (rechts).
   Drehende Teile drehen um die z-Achse ihres Ursprungs.

   API (alle Funktionen liefern frische Object3D, Geometrien/Texturen werden
   intern zwischengespeichert und mit geometry.userData.keep markiert –
   beim Aufraeumen nur Geometrien OHNE keep disposen):

   partMaterials()                       -> gemeinsamer Material-Satz (einmal je Seite)
     .rimCarbon .rimDecal .rubber(tan, tread) .spoke .nipple .hub .rotor .rotorCarrier
     .alloy .anodBlack .anodSilver .chainPlate .chainPin .carbon .carbonMatte .black
     .microfibre .saddleShell .red .pedalSteel
     rimDecal.color darf ersetzt/getweent werden (Felgenschriftzug folgt dem Lack).

   makeWheel(opts) -> { g, spin, hw(s), depth, bsd, tyreR }
     opts: { front, bsd=.311, rimDepth=.05, rimHalf=.0142, tyreW=.028, tyreH=.027,
             tread:'slick'|'file'|'gravel'|'knobby'|'trail', tanwall=false, decal=true,
             spokes=24, axle=.071 (halbe Achsbreite), rotorR=.08, rotorZ, mats }
     g = Achse im Ursprung (steht), spin = alles was sich dreht (rotation.z setzen).

   makeCaliper({ rotorR, mats })  -> Group; Ursprung = Scheibenmitte, Sattel sitzt auf +x.
     Platzieren: position = Achse + (0,0,rotorZ), rotation.z = Winkel des Sattels.

   makeSaddle({ length=.245, width=.143, mtb=false, mats }) -> { g }
     Ursprung = Klemmpunkt der Streben (oben auf der Stuetze), Nase zeigt nach +x.

   makeCassette(cogs[], { mats }) -> { g, z(i), r(i) }  (i = Index in cogs, 0 = kleinstes)
     Ursprung = Nabenmitte, kleinstes Ritzel aussen (groesstes z).

   makeCrankset({ rings[], zr, arm=.1725, mtb=false, motor=false, mats })
     -> { right, left, pedals[] }   beide Gruppen mit Ursprung im Tretlager;
        pedals[i].rotation.z = +Kurbelwinkel haelt die Pedale waagerecht.

   makeRearDerailleur({ p1, p2, zc, axleZ, mtb=false, mats }) -> { g, anchor }
     Koordinaten relativ zur Hinterachse; p1/p2 = Mitten der Schaltroellchen.

   makeFrontDerailleur({ ringR, zr, angle=112°, mats }) -> { g }   relativ zum Tretlager.

   makeChain(curve, { mats }) -> { g, set(s) }
     curve = geschlossene Kurve (Blatt -> Ritzel -> Roellchen); set(s) verschiebt
     die Glieder um s Meter entlang der Kurve (Kette laeuft).

   pitchR(n) -> Teilkreisradius eines Ritzels/Blatts mit n Zaehnen (1/2"-Kette).
   ===================================================================== */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const clamp01 = t => Math.max(0, Math.min(1, t));
const sstep = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
export const pitchR = n => .0127 / (2 * Math.sin(Math.PI / n));

/* ---------------- Cache ---------------- */
const CACHE = new Map();
function cached(key, fn) {
  if (!CACHE.has(key)) {
    const v = fn();
    if (v && v.isBufferGeometry) v.userData.keep = true;
    CACHE.set(key, v);
  }
  return CACHE.get(key);
}

/* ---------------- Canvas-Texturen ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function tex(c, { srgb = false, repeat = [1, 1], aniso = 8 } = {}) {
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso; t.repeat.set(...repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
// Hoehenbild (Graustufen-Canvas) -> Normal-Map (Sobel)
function heightToNormal(src, strength = 2) {
  const w = src.width, h = src.height, d = src.getContext('2d').getImageData(0, 0, w, h).data;
  const out = canvas(w, h), og = out.getContext('2d'), img = og.createImageData(w, h), o = img.data;
  const H = (x, y) => d[(((y + h) % h) * w + ((x + w) % w)) * 4] / 255;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * strength, dy = (H(x, y + 1) - H(x, y - 1)) * strength;
    const l = Math.hypot(dx, dy, 1), i = (y * w + x) * 4;
    o[i] = (-dx / l * .5 + .5) * 255; o[i + 1] = (dy / l * .5 + .5) * 255; o[i + 2] = (1 / l * .5 + .5) * 255; o[i + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return out;
}
// Carbon-Koeper 2/2 (Hoehenbild): Faserbuendel mit Rundung
function twillCanvas(n = 8, size = 128) {
  const c = canvas(size, size), g = c.getContext('2d'), s = size / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const horiz = (i + j) % 4 < 2, x = i * s, y = j * s;
    const gr = horiz ? g.createLinearGradient(x, y, x, y + s) : g.createLinearGradient(x, y, x + s, y);
    gr.addColorStop(0, '#303030'); gr.addColorStop(.5, '#d8d8d8'); gr.addColorStop(1, '#303030');
    g.fillStyle = gr; g.fillRect(x, y, s, s);
  }
  return c;
}

// Felgenschriftzug: weiss auf transparent, Farbe kommt vom Material
const FONT = '"Roboto Condensed","Arial Narrow",Arial,sans-serif';
function rimDecalTex(label) {
  const c = canvas(2048, 128), t = tex(c, { srgb: true, repeat: [1, 1] });
  t.wrapT = THREE.ClampToEdgeWrapping;
  const draw = () => {
    const g = c.getContext('2d');
    g.clearRect(0, 0, 2048, 128);
    g.fillStyle = '#fff';
    g.font = `italic 800 88px ${FONT}`;
    g.textBaseline = 'middle';
    const w = g.measureText(label).width, x0 = (2048 - w) / 2;
    g.fillText(label, x0, 66);
    // Zierstreifen links und rechts vom Schriftzug
    g.fillRect(40, 60, x0 - 90, 8); g.fillRect(x0 + w + 50, 60, 2048 - (x0 + w + 50) - 40, 8);
    g.fillRect(x0 - 40, 36, 10, 56); g.fillRect(x0 + w + 30, 36, 10, 56);
    t.needsUpdate = true;
  };
  draw();
  if (document.fonts) document.fonts.ready.then(draw);
  return t;
}

/* Reifen-Texturen. Layout: u = Umfang (4x wiederholt), v = Querschnitt von links (-z) nach rechts (+z).
   Querschnitt-Winkel f (Grad, 0 = Lauflaeche) liegt linear auf v: f = (v - .5) * 316 */
const TYRE_SPAN = 316;
const vOf = f => .5 + f / TYRE_SPAN;
function tyreTextures(tread, tanwall) {
  return cached(`tyreTex:${tread}:${tanwall}`, () => {
    const W = 2048, H = 256, col = canvas(W, H), hei = canvas(W, H);
    const cg = col.getContext('2d'), hg = hei.getContext('2d');
    // Grundfarben: Lauflaeche schwarz, Flanke schwarz oder Tan
    const side = tanwall ? '#a8764a' : '#1c1d20', base = '#141518';
    for (let y = 0; y < H; y++) {
      const f = Math.abs((y / H - .5) * TYRE_SPAN), k = sstep(50, 62, f);
      const c0 = new THREE.Color(base), c1 = new THREE.Color(side);
      cg.fillStyle = '#' + c0.lerp(c1, k).getHexString(); cg.fillRect(0, y, W, 1);
    }
    hg.fillStyle = '#808080'; hg.fillRect(0, 0, W, H);
    // Gummi-Koernung
    for (let i = 0; i < 9000; i++) {
      const x = Math.random() * W, y = Math.random() * H, a = Math.random() * .05;
      cg.fillStyle = `rgba(255,255,255,${a * (tanwall ? .5 : 1)})`; cg.fillRect(x, y, 2, 1);
    }
    // Lauflaeche: Feilenprofil (Rauten) auf den Schultern, glatter Mittelstreifen
    const band = (f0, f1) => [vOf(f0) * H, vOf(f1) * H];
    const filePattern = (y0, y1, step = 7) => {
      hg.save(); hg.beginPath(); hg.rect(0, y0, W, y1 - y0); hg.clip();
      hg.strokeStyle = '#3c3c3c'; hg.lineWidth = 1.6;
      for (let x = -H; x < W + H; x += step) {
        hg.beginPath(); hg.moveTo(x, y0); hg.lineTo(x + (y1 - y0), y1); hg.stroke();
        hg.beginPath(); hg.moveTo(x, y1); hg.lineTo(x + (y1 - y0), y0); hg.stroke();
      }
      hg.restore();
    };
    if (tread === 'slick' || tread === 'file') {
      [band(-46, -12), band(12, 46)].forEach(([a, b]) => filePattern(Math.min(a, b), Math.max(a, b)));
      // Mittelrille
      hg.fillStyle = '#5a5a5a'; hg.fillRect(0, vOf(-1) * H, W, vOf(1) * H - vOf(-1) * H);
    } else if (tread === 'gravel') {
      const [a, b] = band(-40, 40); filePattern(a, b, 6);
    }
    // Flanke: feine radiale Rippen + Kante zur Lauflaeche
    [[-120, -58], [58, 120]].forEach(([f0, f1]) => {
      const [y0, y1] = band(f0, f1);
      for (let x = 0; x < W; x += 3) { hg.fillStyle = 'rgba(0,0,0,.14)'; hg.fillRect(x, y0, 1, y1 - y0); }
    });
    [-56, 56].forEach(f => { hg.fillStyle = '#6a6a6a'; hg.fillRect(0, vOf(f) * H - 1, W, 2); });
    // Flankenschriftzug (erhaben) auf beiden Seiten, rechts lesbar
    const label = tread === 'knobby' || tread === 'trail' ? 'RACEPOINT · TRAIL 29×2.4 · TUBELESS READY' : tread === 'gravel' ? 'RACEPOINT · GRAVEL 700×42 · TUBELESS' : 'RACEPOINT · ROAD 28-622 · TUBELESS';
    [[1, 92], [-1, -92]].forEach(([s, f]) => {
      const y = vOf(f) * H;
      [cg, hg].forEach((g, i) => {
        g.save(); g.translate(W * .5, y); if (s < 0) g.scale(1, -1);
        g.font = `700 15px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = i ? '#c8c8c8' : (tanwall ? 'rgba(60,35,15,.55)' : 'rgba(255,255,255,.16)');
        g.fillText(label, 0, 0);
        g.restore();
      });
    });
    const map = tex(col, { srgb: true, repeat: [4, 1] }), normalMap = tex(heightToNormal(hei, 3), { repeat: [4, 1] });
    map.wrapT = normalMap.wrapT = THREE.ClampToEdgeWrapping;
    return { map, normalMap };
  });
}

// Bremsscheibe: Lochmuster als Alpha-Textur waere flacher – hier echte Geometrie (siehe makeRotor)

/* ---------------- Materialien ---------------- */
let MATS = null;
export function partMaterials() {
  if (MATS) return MATS;
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  const twill = tex(twillCanvas(), { repeat: [1, 1] });
  const twillN = tex(heightToNormal(twillCanvas(), 1.2), { repeat: [1, 1] });
  const rimN = twillN.clone(); rimN.repeat.set(320, 14); rimN.needsUpdate = true;
  const rubberCache = {};
  MATS = {
    rimCarbon: P({ color: 0x121316, metalness: .25, roughness: .34, clearcoat: 1, clearcoatRoughness: .08,
      normalMap: rimN, normalScale: new THREE.Vector2(.35, .35), anisotropy: .5, sheen: .15, sheenColor: 0x404650 }),
    rimDecal: S({ color: 0xffffff, map: rimDecalTex('RACEPOINT  ·  CARBON 50'), transparent: true, roughness: .3, metalness: .1,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide }),
    rubber(tread = 'slick', tanwall = false) {
      const k = tread + tanwall;
      if (!rubberCache[k]) {
        const { map, normalMap } = tyreTextures(tread, tanwall);
        rubberCache[k] = S({ map, normalMap, normalScale: new THREE.Vector2(1.1, 1.1), roughness: .85, metalness: 0 });
      }
      return rubberCache[k];
    },
    knob: S({ color: 0x1a1b1e, roughness: .9 }),
    spoke: S({ color: 0x1c1d21, metalness: .85, roughness: .32 }),
    nipple: S({ color: 0x2a2c31, metalness: 1, roughness: .3 }),
    hub: S({ color: 0x15161a, metalness: .6, roughness: .32 }),
    rotor: S({ color: 0xb8bdc4, metalness: 1, roughness: .22 }),
    rotorCarrier: S({ color: 0x24262b, metalness: .9, roughness: .35 }),
    alloy: S({ color: 0xc9cdd3, metalness: 1, roughness: .24 }),
    anodBlack: S({ color: 0x1b1c20, metalness: .85, roughness: .3 }),
    anodSilver: S({ color: 0xd6d9de, metalness: 1, roughness: .18 }),
    chainPlate: S({ color: 0xaeb3ba, metalness: 1, roughness: .28 }),
    chainInner: S({ color: 0x5d6168, metalness: 1, roughness: .34 }),
    chainPin: S({ color: 0xe4e6ea, metalness: 1, roughness: .2 }),
    // ohne Normal-Map: die Bauteil-Geometrien haben keine UVs
    carbon: P({ color: 0x18191d, metalness: .3, roughness: .38, clearcoat: .8, clearcoatRoughness: .14 }),
    carbonMatte: P({ color: 0x1a1b1f, metalness: .25, roughness: .55, clearcoat: .3, clearcoatRoughness: .4 }),
    black: S({ color: 0x111215, metalness: .3, roughness: .42 }),
    rubberBlack: S({ color: 0x18191b, roughness: .8 }),
    microfibre: P({ color: 0x141416, roughness: .9, metalness: 0, sheen: .8, sheenColor: 0x3a3a40, sheenRoughness: .8 }),
    saddleShell: P({ color: 0x18191d, metalness: .3, roughness: .4, clearcoat: .7, clearcoatRoughness: .2 }),
    red: S({ color: 0xE83637, metalness: .55, roughness: .3 }),
    pedalSteel: S({ color: 0xd9dce0, metalness: 1, roughness: .16 }),
    gold: S({ color: 0xd8a64a, metalness: 1, roughness: .2 }),
  };
  return MATS;
}
const mats = o => (o && o.mats) || partMaterials();

/* ---------------- Geometrie-Helfer ---------------- */
function lathe(profile, seg = 96) {
  const g = new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg);
  g.rotateX(Math.PI / 2);   // Profil [radius, z]: Drehachse = z
  return g;
}
function smooth(g) {
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-6); m.computeVertexNormals(); g.dispose();
  return m;
}
function extrude(shape, depth, bevel = 0, seg = 12, bevelSeg = 2) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, curveSegments: seg, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: bevelSeg });
  g.translate(0, 0, -depth / 2);
  return g;
}
function rbox(w, h, d, r = .003) {
  r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const s = new THREE.Shape(), W = w / 2 - r, H = h / 2 - r, c = Math.min(W, H) * .6, D = Math.max(.0004, d - 2 * r);
  s.moveTo(-W + c, -H); s.lineTo(W - c, -H); s.quadraticCurveTo(W, -H, W, -H + c); s.lineTo(W, H - c);
  s.quadraticCurveTo(W, H, W - c, H); s.lineTo(-W + c, H); s.quadraticCurveTo(-W, H, -W, H - c);
  s.lineTo(-W, -H + c); s.quadraticCurveTo(-W, -H, -W + c, -H);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 5 });
  g.translate(0, 0, -D / 2);
  return smooth(g);
}
const rboxC = (w, h, d, r) => cached(`rbox:${w}:${h}:${d}:${r}`, () => rbox(w, h, d, r));
const circlePath = (r, x = 0, y = 0, n) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); return p; };
function mesh(geo, mat, parent, pos, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.castShadow = shadow; m.receiveShadow = false;
  parent.add(m);
  return m;
}
function cyl(r, h, segs = 24, r2 = r) {
  const g = new THREE.CylinderGeometry(r2, r, h, segs); g.rotateX(Math.PI / 2);   // Achse = z
  return g;
}
const cylC = (r, h, s = 24, r2 = r) => cached(`cyl:${r}:${h}:${s}:${r2}`, () => cyl(r, h, s, r2));
// Rohr entlang Punkten mit (elliptischem) Querschnitt – kleiner sweep fuer Kurbeln, Kabel, Streben
function sweep(pts, r, { seg = 24, rad = 12, ref = V(0, 0, 1), closed = false } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, closed, 'centripetal');
  const pos = [], idx = [], C = V(), T = V(), S = V(), U = V();
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    curve.getPointAt(t, C); curve.getTangentAt(t, T);
    S.copy(ref).addScaledVector(T, -ref.dot(T)); if (S.lengthSq() < 1e-8) S.set(0, 1, 0); S.normalize(); U.crossVectors(S, T).normalize();
    const rr = typeof r === 'function' ? r(t) : r, ru = Array.isArray(rr) ? rr[0] : rr, rs = Array.isArray(rr) ? rr[1] : rr;
    for (let j = 0; j <= rad; j++) {
      const a = j / rad * TAU;
      pos.push(C.x + U.x * Math.cos(a) * ru + S.x * Math.sin(a) * rs, C.y + U.y * Math.cos(a) * ru + S.y * Math.sin(a) * rs, C.z + U.z * Math.cos(a) * ru + S.z * Math.sin(a) * rs);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j, b = a + rad + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
  // Deckel
  [0, seg].forEach((i, k) => {
    const c0 = pos.length / 3; curve.getPointAt(k, C); pos.push(C.x, C.y, C.z);
    for (let j = 0; j < rad; j++) { const a = i * (rad + 1) + j; k ? idx.push(c0, a, a + 1) : idx.push(c0, a + 1, a); }
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
// Zahnkranz mit runden Zahnluecken (Kette/Rolle 7,75 mm) und spitz zulaufenden Zahnkoepfen
function gearShape(n, { tipH = .0034, rootD = .0039, holes = [], narrowWide = false } = {}) {
  const r = pitchR(n), s = new THREE.Shape(), w = TAU / n;
  let first = true;
  const pt = (rad, a) => { const x = rad * Math.cos(a), y = rad * Math.sin(a); if (first) { s.moveTo(x, y); first = false; } else s.lineTo(x, y); };
  for (let k = 0; k < n; k++) {
    const a = k * w, tip = r + tipH * (narrowWide && k % 2 ? .92 : 1);
    // Zahnluecke (Rollensitz) als Halbkreis-Naeherung
    for (let i = 0; i <= 4; i++) { const t = -1 + i / 2; pt(r - rootD * Math.cos(t * Math.PI / 2 * .9), a + t * w * .2); }
    // Flanke hoch, Kopf, Flanke runter
    pt(r + tipH * .45, a + w * .27); pt(tip - .0006, a + w * .4); pt(tip, a + w * .47); pt(tip, a + w * .53); pt(tip - .0006, a + w * .6); pt(r + tipH * .45, a + w * .73);
  }
  s.closePath();
  holes.forEach(h => s.holes.push(h));
  return s;
}

/* =====================================================================
   LAUFRAD
   ===================================================================== */
export function makeWheel(o = {}) {
  const M = mats(o);
  const front = !!o.front, bsd = o.bsd ?? .311, depth = o.rimDepth ?? .05, w = o.rimHalf ?? .0142;
  const tyreW = o.tyreW ?? .028, tyreH = o.tyreH ?? .027, tread = o.tread || 'slick', nSp = o.spokes ?? 24;
  const axle = o.axle ?? (front ? .05 : .071), rotorR = o.rotorR ?? .08, rotorZ = o.rotorZ ?? (front ? -.043 : -.05);
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);

  // Felgenflanke: halbe Breite ueber die Tiefe s (0 = Horn, 1 = Speichenbett) – toroidal: Bauch bei ~35 %, runde Nase
  const hw = s => w * (1 + .1 * Math.sin(Math.PI * Math.min(1, s * 1.25))) * Math.sqrt(Math.max(0, 1 - Math.max(0, (s - .6) / .4) ** 2));
  const rimKey = `rim:${bsd}:${depth}:${w}`;
  const rimGeo = cached(rimKey, () => {
    const p = [];
    // Felgenbett (Tubeless-Hump + Hakenkante), dann Flanke links runter, Nase, rechts hoch
    p.push([bsd + .0005, -w * .55], [bsd - .0015, -w * .3], [bsd - .0015, w * .3], [bsd + .0005, w * .55], [bsd + .0042, w * .8], [bsd + .0046, w * .93], [bsd + .0035, w]);
    const N = 22;
    for (let k = 0; k <= N; k++) { const s = Math.sin(k / N * Math.PI / 2); p.push([bsd + .0015 - s * (depth + .0015), hw(s) + .0002]); }
    for (let k = N - 1; k >= 0; k--) { const s = Math.sin(k / N * Math.PI / 2); p.push([bsd + .0015 - s * (depth + .0015), -hw(s) - .0002]); }
    p.push([bsd + .0035, -w], [bsd + .0046, -w * .93], [bsd + .0042, -w * .8], [bsd + .0005, -w * .55]);
    return lathe(p, 96);
  });
  mesh(rimGeo, M.rimCarbon, spin);

  // Schriftzug-Band auf beiden Flanken
  if (o.decal !== false && depth > .035) [1, -1].forEach(side => {
    const dg = cached(`rimDecal:${rimKey}:${side}`, () => {
      const nT = 192, nS = 4, s0 = .16, s1 = .62, pos = [], uv = [], idx = [];
      for (let i = 0; i <= nT; i++) {
        const th = i / nT * TAU;
        for (let j = 0; j <= nS; j++) {
          const s = lerp(s0, s1, j / nS), r = bsd + .0015 - s * (depth + .0015);
          pos.push(r * Math.cos(th), r * Math.sin(th), side * (hw(s) + .0008));
          uv.push((side > 0 ? -i : i) / nT * 4, side > 0 ? 1 - j / nS : 1 - j / nS);
        }
      }
      for (let i = 0; i < nT; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; side > 0 ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b); }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx); geo.computeVertexNormals();
      return geo;
    });
    mesh(dg, M.rimDecal, spin, null, false);
  });

  // Reifen: runder Querschnitt (28 mm), sitzt im Felgenhorn; Normal-Map mit Feilenprofil
  const hh = tyreH / 2, hwT = tyreW / 2, rc = bsd + .002 + tyreH - hh;
  const tyreGeo = cached(`tyre:${bsd}:${tyreW}:${tyreH}`, () => {
    const p = [];
    for (let k = 0; k <= 48; k++) {
      const f = (-TYRE_SPAN / 2 + TYRE_SPAN * k / 48) * DEG;
      // leicht "birnenfoermig": unten zum Horn eingezogen
      const pull = 1 - .1 * Math.max(0, Math.abs(f) / Math.PI - .55) / .45;
      p.push([rc + hh * Math.cos(f), hwT * Math.sin(f) * pull]);
    }
    return lathe(p, 96);
  });
  mesh(tyreGeo, M.rubber(tread, !!o.tanwall), spin);
  const tyreR = rc + hh;

  // Stollen (Gravel klein, MTB/Trail grob) als InstancedMesh
  const rows = {
    gravel: [[22, 72, .5, [.0045, .0016, .004]], [-22, 72, .5, [.0045, .0016, .004]], [44, 64, 0, [.0055, .0022, .005]], [-44, 64, 0, [.0055, .0022, .005]]],
    knobby: [[0, 36, .25, [.011, .006, .016]], [30, 36, .5, [.009, .0062, .009]], [-30, 36, .5, [.009, .0062, .009]], [58, 36, 0, [.011, .0066, .009]], [-58, 36, 0, [.011, .0066, .009]]],
    trail: [[0, 40, .25, [.009, .0045, .013]], [24, 40, .5, [.008, .0048, .008]], [-24, 40, .5, [.008, .0048, .008]], [54, 40, 0, [.009, .0052, .008]], [-54, 40, 0, [.009, .0052, .008]]],
  }[tread];
  if (rows) {
    const total = rows.reduce((s, r) => s + r[1], 0), knobs = new THREE.InstancedMesh(rboxC(1, 1, 1, .22), M.knob, total);
    const m4 = new THREE.Matrix4(), tX = V(), nY = V(), bZ = V(), pos = V(), sc = V();
    let k = 0;
    rows.forEach(([phiD, n, offs, size]) => {
      const f = phiD * DEG, rr = rc + hh * Math.cos(f), zz = hwT * Math.sin(f);
      const nr = Math.cos(f) / hh, nz = Math.sin(f) / hwT, nl = Math.hypot(nr, nz);
      for (let i = 0; i < n; i++) {
        const th = (i + offs) / n * TAU, e = V(Math.cos(th), Math.sin(th), 0);
        tX.set(-Math.sin(th), Math.cos(th), 0);
        nY.copy(e).multiplyScalar(nr / nl).add(V(0, 0, nz / nl));
        bZ.crossVectors(tX, nY);
        pos.copy(e).multiplyScalar(rr).add(V(0, 0, zz)).addScaledVector(nY, size[1] * .3);
        m4.makeBasis(tX, nY, bZ).scale(sc.set(...size)).setPosition(pos);
        knobs.setMatrixAt(k++, m4);
      }
    });
    knobs.castShadow = true;
    spin.add(knobs);
  }

  // Nabe: Koerper mit Flanschen; hinten Antriebsflansch innen (Freilauf), Rotoraufnahme links
  const fl = front ? [-.034, .034] : [-.035, .019], flR = front ? .021 : .025;
  const hubGeo = cached(`hub:${front}:${axle}`, () => lathe([[.0062, -axle + .002], [.013, -axle + .003], [.014, -axle + .012], [.018, rotorZ - .004], [.018, rotorZ + .004],
    [.0145, rotorZ + .007], [.0145, fl[0] - .006], [flR, fl[0] - .0025], [flR + .0012, fl[0]], [flR, fl[0] + .0025], [.0165, fl[0] + .007],
    [.0185, (fl[0] + fl[1]) / 2], [.0165, fl[1] - .007], [flR, fl[1] - .0025], [flR + .0012, fl[1]], [flR, fl[1] + .0025], [.0145, fl[1] + .006],
    [.0145, axle - .012], [.013, axle - .003], [.0062, axle - .002]], 48));
  mesh(hubGeo, M.hub, spin);
  if (!front) mesh(cylC(.0172, .036, 32), M.anodBlack, spin, V(0, 0, .042));   // Freilaufkoerper
  // Steckachse (steht): Achse + Kopf mit Inbus rechts, Kappe links
  mesh(cylC(.0058, axle * 2 + .016, 16), M.alloy, g);
  mesh(cylC(.0105, .006, 6), M.anodBlack, g, V(0, 0, axle + .008));
  mesh(cylC(.0095, .004, 24), M.anodBlack, g, V(0, 0, -axle - .006));

  // Speichen: Messer-Speichen (flach), 24 Stueck, vorn radial, hinten 2-fach gekreuzt
  const bladeGeo = cached('spokeBlade', () => { const b = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true); b.scale(.00115, 1, .00045); return b; });
  const sp = new THREE.InstancedMesh(bladeGeo, M.spoke, nSp), nip = new THREE.InstancedMesh(cylC(.0017, .009, 8), M.nipple, nSp);
  const m4 = new THREE.Matrix4(), Y = V(), X = V(), Z = V(), mid = V(), one = V(1, 1, 1);
  const half = nSp / 2, rimR = bsd - depth + .002;
  for (let i = 0; i < nSp; i++) {
    const s = i % 2 ? 1 : -1, thR = i / nSp * TAU;
    // Kreuzung: 2-fach = 2*720°/Lochzahl, abwechselnd ziehend/stossend
    const cross = front ? 0 : (s > 0 ? 2 : 1) * 4 * Math.PI / nSp * ((i >> 1) % 2 ? 1 : -1);
    const thH = thR + cross;
    const rimP = V(rimR * Math.cos(thR), rimR * Math.sin(thR), s * .0028);
    const hubP = V(flR * Math.cos(thH), flR * Math.sin(thH), s > 0 ? fl[1] : fl[0]);
    Y.copy(rimP).sub(hubP); const L = Y.length(); Y.normalize();
    X.set(0, 0, 1).cross(Y).normalize(); Z.crossVectors(X, Y);
    mid.copy(hubP).addScaledVector(Y, L / 2);
    m4.makeBasis(X, Y, Z).scale(V(1, L, 1)).setPosition(mid); sp.setMatrixAt(i, m4);
    // Nippel liegen in der Speichenrichtung im Felgenbett
    const nm = new THREE.Matrix4().makeBasis(X, Z.clone().negate(), Y);
    nm.setPosition(rimP.clone().addScaledVector(Y, -.002)); nip.setMatrixAt(i, nm);
  }
  sp.castShadow = true; spin.add(sp, nip);
  void half; void one;

  // Bremsscheibe (links): Stahlring mit Lochbild + 6-Arm-Carrier, 6 Schrauben
  const rotor = makeRotor(rotorR, M);
  rotor.position.z = rotorZ; spin.add(rotor);

  return { g, spin, hw, depth, bsd, tyreR };
}

export function makeRotor(R = .08, M = partMaterials()) {
  const g = new THREE.Group();
  const ring = cached(`rotorRing:${R}`, () => {
    const outer = new THREE.Shape();
    // leicht gewellte Aussenkante (wave rotor)
    const n = 360;
    for (let i = 0; i <= n; i++) { const a = i / n * TAU, r = R - .0006 * (1 + Math.cos(a * 36)) / 2; i ? outer.lineTo(r * Math.cos(a), r * Math.sin(a)) : outer.moveTo(r * Math.cos(a), r * Math.sin(a)); }
    const inner = R - .0185;
    outer.holes.push(circlePath(inner));
    // Lochbild: 3 versetzte Reihen
    for (let i = 0; i < 30; i++) {
      const a = i / 30 * TAU;
      [[R - .0045, 0, .0016], [R - .0092, .5, .0019], [R - .0142, 0, .0016]].forEach(([r, o, h]) => {
        const b = a + o * TAU / 30 + (r - (R - .0092)) * 4;
        outer.holes.push(circlePath(h, r * Math.cos(b), r * Math.sin(b)));
      });
    }
    return extrude(outer, .0018, 0, 6);
  });
  mesh(ring, M.rotor, g, null, false);
  const carrier = cached(`rotorCarrier:${R}`, () => {
    const s = new THREE.Shape(), r0 = .0235, r1 = R - .0165;
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * TAU;
      // geschwungener Arm: innen breit, aussen schmal, leicht verdreht
      [[r0, a - .42], [r0 + .012, a - .2], [r1, a - .05 + .12], [r1 + .003, a + .1 + .12], [r0 + .012, a + .3], [r0, a + .42]].forEach(([r, b], j) =>
        (i || j ? s.lineTo(r * Math.cos(b), r * Math.sin(b)) : s.moveTo(r * Math.cos(b), r * Math.sin(b))));
    }
    s.holes.push(circlePath(.0175));
    return extrude(s, .0022, .0004, 8, 1);
  });
  mesh(carrier, M.rotorCarrier, g, V(0, 0, .0004));
  const bolt = new THREE.InstancedMesh(cylC(.0028, .003, 6), M.anodBlack, 6), m4 = new THREE.Matrix4();
  for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + .3; m4.makeTranslation(.0205 * Math.cos(a), .0205 * Math.sin(a), -.0018); bolt.setMatrixAt(i, m4); }
  g.add(bolt);
  return g;
}

/* ---------------- Flat-Mount-Bremssattel ---------------- */
export function makeCaliper(o = {}) {
  const M = mats(o), R = o.rotorR ?? .08, g = new THREE.Group(), body = new THREE.Group();
  body.position.x = R - .006; g.add(body);
  // Kontur (x radial, y tangential): Nierenform, die die Scheibe umgreift
  const half = cached('caliperHalf', () => {
    const s = new THREE.Shape();
    s.moveTo(-.016, -.028); s.quadraticCurveTo(-.006, -.034, .006, -.03); s.quadraticCurveTo(.014, -.026, .014, -.012);
    s.lineTo(.014, .012); s.quadraticCurveTo(.014, .026, .006, .03); s.quadraticCurveTo(-.006, .034, -.016, .028);
    s.quadraticCurveTo(-.02, .0, -.016, -.028);
    return smooth(extrude(s, .009, .0025, 10, 3));
  });
  [1, -1].forEach(sd => mesh(half, M.anodBlack, body, V(0, 0, sd * .0085)));
  mesh(rboxC(.012, .05, .026, .004), M.anodBlack, body, V(.012, 0, 0));            // Bruecke ueber der Scheibe
  mesh(cylC(.0048, .006, 16), M.anodSilver, body, V(0, -.012, -.016));               // Kolbendeckel
  mesh(cylC(.0048, .006, 16), M.anodSilver, body, V(0, .012, -.016));
  const bl = mesh(cylC(.0022, .009, 8), M.anodSilver, body, V(.016, -.02, -.006)); bl.rotation.y = Math.PI / 2;  // Entlueftungsnippel
  mesh(rboxC(.006, .012, .002, .0008), M.red, body, V(.004, .0, -.0135), false);   // kleines rotes Logo
  // Schlauch-Anschluss (verschwindet in Rahmen/Gabel)
  const hose = mesh(sweep([V(.012, .022, -.01), V(.022, .03, -.012), V(.03, .028, -.02)], .0024, { seg: 10, rad: 8 }), M.black, body);
  hose.castShadow = false;
  return g;
}

/* =====================================================================
   SATTEL (Power-artig: kurz, breit hinten, Kanal mit Aussparung)
   ===================================================================== */
export function makeSaddle(o = {}) {
  const M = mats(o), L = o.length ?? .245, W = o.width ?? .143, g = new THREE.Group();
  const key = `saddle:${L}:${W}`;
  // Kontur (Draufsicht): x = vorn (+), Heck bei -L/2
  const outline = (shrink = 0) => {
    const hw = W / 2 - shrink, pts = [];
    const prof = [[.5, .19], [.47, .26], [.4, .29], [.28, .3], [.16, .34], [.04, .5], [-.08, .74], [-.2, .9], [-.31, .98], [-.4, 1], [-.46, .96], [-.495, .8], [-.5, .5], [-.505, .2], [-.505, 0]];
    prof.forEach(([x, y]) => pts.push(new THREE.Vector2(x * (L - shrink * 2), y * hw)));
    prof.slice(0, -1).reverse().forEach(([x, y]) => pts.push(new THREE.Vector2(x * (L - shrink * 2), -y * hw)));
    const s = new THREE.Shape(); s.moveTo(pts[0].x, pts[0].y); s.splineThru(pts.slice(1).concat([pts[0]]));
    return s;
  };
  // Hoehenprofil: Nase faellt ab, Mitte leicht eingesenkt, Heck flach, Raender rund nach unten
  const shapeY = (x, z) => {
    const u = x / L;                                      // -.5 .. .5
    let y = -.022 * sstep(.12, .5, u) ** 1.4;            // Nase runter
    y -= .004 * Math.exp(-(((u - .05) / .14) ** 2));        // Mulde in der Mitte
    y += .003 * sstep(-.3, -.5, u);                       // Heck minimal hoch
    const hw = Math.max(.02, W / 2 * (u < -.3 ? 1 : lerp(.3, 1, sstep(.45, -.2, u))));
    y -= .012 * Math.pow(Math.min(1, Math.abs(z) / hw), 4);   // Kanten rund nach unten
    return y;
  };
  const deform = (geo, yOff) => {
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + shapeY(p.getX(i), p.getZ(i)) + yOff);
    p.needsUpdate = true;
    return smooth(geo);
  };
  const top = cached(key + ':top', () => {
    const s = outline();
    // Aussparung: schmaler Tropfen in der Mitte
    const h = new THREE.Path(), x0 = -.085 * L / .245, x1 = .07 * L / .245, cw = .0135 * W / .143;
    h.moveTo(x1, 0); h.bezierCurveTo(x1 - .01, cw * .9, x0 + .03, cw * 1.25, x0 + .012, cw * 1.05);
    h.bezierCurveTo(x0, cw * .9, x0, -cw * .9, x0 + .012, -cw * 1.05); h.bezierCurveTo(x0 + .03, -cw * 1.25, x1 - .01, -cw * .9, x1, 0);
    s.holes.push(h);
    const geo = new THREE.ExtrudeGeometry(s, { depth: .009, bevelEnabled: true, bevelThickness: .008, bevelSize: .0075, bevelSegments: 6, curveSegments: 40 });
    geo.rotateX(-Math.PI / 2);   // Kontur liegt in x/z, Dicke nach oben (y)
    return deform(geo, .0);
  });
  mesh(top, M.microfibre, g, V(0, .03, 0));
  const shell = cached(key + ':shell', () => {
    const geo = new THREE.ExtrudeGeometry(outline(.004), { depth: .003, bevelEnabled: true, bevelThickness: .002, bevelSize: .002, bevelSegments: 2, curveSegments: 32 });
    geo.rotateX(-Math.PI / 2);
    return deform(geo, -.0005);
  });
  mesh(shell, M.saddleShell, g, V(0, .018, 0));
  // Streben (Carbon, oval) – unter der Schale von hinten nach vorn, Klemmbereich gerade
  [1, -1].forEach(sd => {
    const z = sd * .021;
    const pts = [V(-.098, .022, sd * .034), V(-.075, .008, z), V(-.03, -.0005, z), V(.035, -.0005, z), V(.07, .006, sd * .016), V(.088, .014, sd * .01)];
    mesh(cached(`rail:${sd}`, () => sweep(pts, [.0035, .0045], { seg: 30, rad: 10, ref: V(0, 1, 0) })), M.carbon, g);
  });
  // Klemme (Stuetzenkopf): Klemmbacken + Schrauben
  mesh(rboxC(.052, .012, .05, .004), M.anodBlack, g, V(0, -.009, 0));
  [1, -1].forEach(sd => mesh(rboxC(.046, .008, .009, .0025), M.anodBlack, g, V(0, .003, sd * .021)));
  [-.016, .016].forEach(x => { const b = mesh(cylC(.003, .022, 8), M.anodSilver, g, V(x, -.012, 0)); b.rotation.x = Math.PI / 2; });
  // kleines rotes Logo am Heck
  const lg = mesh(rboxC(.002, .006, .03, .0008), M.red, g, V(-L / 2 + .002, .03, 0), false);
  void lg;
  return { g };
}

/* =====================================================================
   ANTRIEB
   ===================================================================== */
export function makeCassette(cogs, o = {}) {
  const M = mats(o), g = new THREE.Group(), n = cogs.length;
  const pitch = n >= 12 ? .00385 : .0042, zOut = .062, zIn = zOut - pitch * (n - 1);
  cogs.forEach((t, i) => {
    const r = pitchR(t), z = zOut - pitch * i;
    const holes = [];
    if (t >= 24) {
      // grosse Ritzel: Aussparungen (Spider)
      const ri = r - .009, k = t >= 40 ? 10 : 8;
      for (let j = 0; j < k; j++) {
        const a = j / k * TAU, p = new THREE.Path();
        const r0 = .022, r1 = ri;
        p.moveTo(r0 * Math.cos(a - .18), r0 * Math.sin(a - .18)); p.lineTo(r1 * Math.cos(a - TAU / k / 2 + .06), r1 * Math.sin(a - TAU / k / 2 + .06));
        p.absarc(0, 0, r1, a - TAU / k / 2 + .06, a + TAU / k / 2 - .06, false); p.lineTo(r0 * Math.cos(a + .18), r0 * Math.sin(a + .18));
        p.absarc(0, 0, r0, a + .18, a - .18, true);
        holes.push(p);
      }
      holes.push(circlePath(.0175));
    } else holes.push(circlePath(Math.max(.0175, Math.min(r - .007, .019))));
    const geo = cached(`cog:${t}`, () => extrude(gearShape(t, { tipH: .0028, rootD: .0036, holes }), .0016, .0002, 4, 1));
    mesh(geo, i % 4 === 3 ? M.anodBlack : M.anodSilver, g, V(0, 0, z));
  });
  // Lockring
  mesh(cylC(.019, .003, 32), M.anodBlack, g, V(0, 0, zOut + .0025));
  return { g, z: i => zOut - pitch * i, r: i => pitchR(cogs[i]), zIn, zOut };
}

export function makeCrankset(o = {}) {
  const M = mats(o), rings = o.rings || [48, 35], zr = o.zr ?? .047, armL = o.arm ?? .1725, mtb = !!o.mtb;
  const right = new THREE.Group(), left = new THREE.Group(), pedals = [];
  // Kettenblaetter (aussen gross), mit Fraesungen
  rings.forEach((n, i) => {
    const r = pitchR(n);
    const geo = cached(`ring:${n}:${rings.length}`, () => {
      const holes = [];
      const ri = r - (i === 0 && rings.length > 1 ? .012 : .011);
      holes.push(circlePath(ri));
      return extrude(gearShape(n, { tipH: .0036, rootD: .0039, holes, narrowWide: rings.length === 1 }), .0022, .0003, 4, 1);
    });
    mesh(geo, i ? M.anodSilver : M.anodBlack, right, V(0, 0, zr - i * .0052));
  });
  // Spider mit Powermeter-Look: Scheibe + 4 Arme, rote Messring-Kante
  const Rr = pitchR(rings[0]), rIn = pitchR(rings[rings.length - 1]);
  const spider = cached(`spider:${rings.join('-')}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * TAU + .4;
      [[.032, a - .62], [rIn - .004, a - .13], [Rr - .009, a - .07], [Rr - .009, a + .07], [rIn - .004, a + .13], [.032, a + .62]].forEach(([r, b], j) =>
        (i || j ? s.lineTo(r * Math.cos(b), r * Math.sin(b)) : s.moveTo(r * Math.cos(b), r * Math.sin(b))));
    }
    s.holes.push(circlePath(.012));
    return smooth(extrude(s, .006, .0015, 8, 2));
  });
  mesh(spider, M.carbon, right, V(0, 0, zr - .0085));
  mesh(cylC(.035, .012, 48), M.anodBlack, right, V(0, 0, zr - .012));                 // Powermeter-Gehaeuse
  mesh(cylC(.0355, .0016, 48), M.red, right, V(0, 0, zr - .0055), false);              // roter Ring
  mesh(cylC(.0125, mtb ? .16 : .146, 24), M.alloy, right);                             // Achse
  // Lagerschalen (stehen, gehoeren optisch zum Rahmen – leicht genug, dass sie mitdrehen duerfen)
  [1, -1].forEach(sd => mesh(cylC(.0215, .008, 32), M.anodBlack, right, V(0, 0, sd * (mtb ? .05 : .046))));

  // Kurbelarme: Hohlkarbon, oval, verjuengt, Pedalauge rund
  const arm = side => cached(`arm:${side}:${armL}:${mtb}`, () => {
    const a0 = V(0, 0, side * (mtb ? .062 : .056)), a1 = V(armL, 0, side * (mtb ? .084 : .074));
    const pts = [a0, a0.clone().lerp(a1, .35).add(V(0, 0, side * .006)), a0.clone().lerp(a1, .75).add(V(0, 0, side * .004)), a1];
    // [Breite in der Drehebene, Dicke quer]
    return sweep(pts, t => [lerp(.017, .0115, sstep(0, 1, t)), lerp(.0088, .0074, t)], { seg: 36, rad: 18, ref: V(0, 0, 1) });
  });
  const mkArm = (grp, side, ang) => {
    const ag = new THREE.Group(); ag.rotation.z = ang; grp.add(ag);
    mesh(arm(side), M.carbon, ag);
    mesh(cylC(.016, .016, 32), M.carbon, ag, V(0, 0, side * (mtb ? .066 : .06)));       // Achsauge
    mesh(cylC(.0115, .0025, 24), M.anodBlack, ag, V(0, 0, side * (mtb ? .0745 : .0685))); // Kappe
    mesh(cylC(.0118, .013, 24), M.carbon, ag, V(armL, 0, side * (mtb ? .084 : .074)));  // Pedalauge
    // Pedal: haengt am Arm, Gegendrehung haelt es waagerecht
    const pg = new THREE.Group(); pg.position.set(armL, 0, side * (mtb ? .09 : .081)); pg.rotation.z = -ang; ag.add(pg);
    const p = makePedal({ mtb, mats: M }); if (side < 0) p.scale.z = -1;
    pg.add(p); pedals.push({ g: pg, base: -ang });
  };
  mkArm(right, 1, -55 * DEG);
  mkArm(left, -1, 125 * DEG);
  return { right, left, pedals };
}

// Klickpedal: Rennrad = Keo-artiger Carbonkoerper mit Stahlplatte, Gravel/MTB = SPD-artig beidseitig
export function makePedal(o = {}) {
  const M = mats(o), g = new THREE.Group();
  mesh(cylC(.0062, .03, 16), M.anodSilver, g, V(0, 0, .002));     // Achse
  if (!o.mtb) {
    const body = cached('pedalKeo', () => {
      // Draufsicht (x vorn, z aussen) als Shape in x/y, dann nach x/z gekippt
      const s = new THREE.Shape();
      s.moveTo(.045, 0); s.bezierCurveTo(.046, .022, .03, .034, .01, .036); s.lineTo(-.02, .036); s.bezierCurveTo(-.034, .034, -.036, .02, -.036, .008);
      s.lineTo(-.036, -.008); s.bezierCurveTo(-.036, -.02, -.034, -.034, -.02, -.036); s.lineTo(.01, -.036); s.bezierCurveTo(.03, -.034, .046, -.022, .045, 0);
      const geo = new THREE.ExtrudeGeometry(s, { depth: .009, bevelEnabled: true, bevelThickness: .004, bevelSize: .004, bevelSegments: 3, curveSegments: 14 });
      geo.translate(0, 0, -.0045); geo.rotateX(Math.PI / 2);
      return smooth(geo);
    });
    mesh(body, M.carbon, g, V(.004, 0, .044));
    const plate = mesh(rboxC(.04, .003, .05, .0012), M.pedalSteel, g, V(.008, .0072, .044));
    void plate;
    mesh(rboxC(.016, .012, .05, .003), M.black, g, V(-.03, .004, .044));       // Hinterkante (Cleat-Halter)
    mesh(rboxC(.006, .008, .02, .0015), M.red, g, V(-.039, .004, .044), false); // Spannungs-Markierung
  } else {
    // SPD: kleiner Koerper, beidseitig Bindung, Kaefig
    mesh(rboxC(.05, .016, .05, .004), M.anodBlack, g, V(0, 0, .042));
    [1, -1].forEach(sd => {
      mesh(rboxC(.012, .004, .038, .0012), M.pedalSteel, g, V(.016, sd * .009, .042));
      mesh(rboxC(.012, .004, .038, .0012), M.pedalSteel, g, V(-.016, sd * .009, .042));
    });
    mesh(rboxC(.07, .006, .06, .0025), M.black, g, V(0, -.004, .042)).scale.set(1, 1, 1);
  }
  return g;
}

// Schaltwerk (SRAM-AXS-artig): B-Knuckle am Schaltauge, Parallelogramm mit Akku, Kaefig mit 2 Roellchen
export function makeRearDerailleur(o = {}) {
  const M = mats(o), g = new THREE.Group(), mtb = !!o.mtb;
  const p1 = o.p1, p2 = o.p2, zc = o.zc, ax = o.axleZ ?? .071;
  const jR = pitchR(mtb ? 14 : 12);
  // Schaltauge + B-Knuckle hinter/unter der Achse, aussen am Ausfallende
  const hanger = V(-.004, -.014, ax + .006), bk = V(-.012, -.03, ax + .016);
  mesh(rboxC(.022, .03, .006, .002), M.anodBlack, g, hanger.clone().add(V(0, .004, 0)));
  const bkM = mesh(rboxC(.03, .024, .02, .007), M.black, g, bk); bkM.rotation.z = -.5;
  // P-Knuckle ueber dem oberen Roellchen
  const pk = V(p1.x - .002, p1.y + .03, zc + .016);
  // Parallelogramm: aeussere Platte (gross, mit Logo-Akzent) + innere Platte
  const link = (z, w, mat) => {
    const d = pk.clone().sub(bk), L = Math.hypot(d.x, d.y), a = Math.atan2(d.y, d.x);
    const m = mesh(rboxC(L + .014, w, .006, .0028), mat, g, V((pk.x + bk.x) / 2, (pk.y + bk.y) / 2, z));
    m.rotation.z = a;
    return { m, a, L };
  };
  const out = link(lerp(bk.z, pk.z, .5) + .009, .03, M.carbonMatte);
  link(lerp(bk.z, pk.z, .5) - .006, .018, M.black);
  // Akku oben auf dem Parallelogramm
  const bat = mesh(rboxC(.04, .02, .02, .005), M.black, g, V((pk.x + bk.x) / 2 - .006, (pk.y + bk.y) / 2 + .02, lerp(bk.z, pk.z, .5) + .002));
  bat.rotation.z = out.a + .15;
  mesh(rboxC(.012, .005, .021, .002), M.anodSilver, g, bat.position.clone().add(V(-.012, .006, 0)), false).rotation.z = bat.rotation.z;   // Taste
  // roter Akzent auf der Aussenplatte
  const acc = mesh(rboxC(out.L * .55, .004, .0012, .0006), M.red, g, V((pk.x + bk.x) / 2, (pk.y + bk.y) / 2 - .006, lerp(bk.z, pk.z, .5) + .0125), false);
  acc.rotation.z = out.a;
  const pkM = mesh(rboxC(.024, .022, .026, .007), M.black, g, pk); pkM.rotation.z = .3;
  // Kaefig: zwei Platten um beide Roellchen
  const dir = p2.clone().sub(p1), beta = Math.atan2(dir.y, dir.x), cr = jR + .007;
  const cageG = cached(`cage:${mtb}:${p1.x.toFixed(3)}:${p1.y.toFixed(3)}:${p2.x.toFixed(3)}:${p2.y.toFixed(3)}`, () => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 16; i++) { const a = beta + Math.PI / 2 + Math.PI * i / 16; (i ? s.lineTo : s.moveTo).call(s, p1.x + cr * Math.cos(a), p1.y + cr * Math.sin(a)); }
    for (let i = 0; i <= 16; i++) { const a = beta - Math.PI / 2 + Math.PI * i / 16; s.lineTo(p2.x + cr * .92 * Math.cos(a), p2.y + cr * .92 * Math.sin(a)); }
    // Fenster in der Platte
    const h = new THREE.Path(), m = p1.clone().lerp(p2, .5), L = dir.length() * .3, ww = .004;
    h.absellipse(m.x, m.y, L, ww, beta, beta + TAU, true, beta);
    s.holes.push(h);
    return smooth(extrude(s, .0024, .0007, 6, 2));
  });
  mesh(cageG, M.carbon, g, V(0, 0, zc + .0072));
  mesh(cageG, M.anodBlack, g, V(0, 0, zc - .0072));
  // Schaltroellchen mit Zaehnen, Lagerdeckel
  const jockey = cached(`jockey:${mtb}`, () => extrude(gearShape(mtb ? 14 : 12, { tipH: .0026, rootD: .0032, holes: [circlePath(.0042)] }), .0034, .0003, 4, 1));
  const jockeys = [p1, p2].map(p => {
    const jg = new THREE.Group(); jg.position.set(p.x, p.y, zc); g.add(jg);
    mesh(jockey, M.black, jg);
    mesh(cylC(.0062, .014, 20), M.anodSilver, jg);
    return jg;
  });
  return { g, jockeys, anchor: V((pk.x + bk.x) / 2, (pk.y + bk.y) / 2 + .01, lerp(bk.z, pk.z, .5) + .016) };
}

// Umwerfer (kabellos): Leitblech folgt dem grossen Blatt, Koerper + Akku am Sitzrohr
export function makeFrontDerailleur(o = {}) {
  const M = mats(o), g = new THREE.Group(), R = o.ringR, zr = o.zr ?? .047, a0 = (o.angle ?? 112) * DEG;
  const cage = cached(`fdCage:${R.toFixed(4)}:${a0}`, () => {
    const s = new THREE.Shape(), r0 = R + .006, r1 = R + .024, aA = a0 - .62, aB = a0 + .22;
    s.absarc(0, 0, r1, aA, aB, false); s.absarc(0, 0, r0, aB, aA, true);
    return smooth(extrude(s, .0016, .0005, 24, 2));
  });
  mesh(cage, M.anodSilver, g, V(0, 0, zr + .0065));
  mesh(cage, M.anodBlack, g, V(0, 0, zr - .0105));
  // Koerper ueber dem Leitblech
  const top = V((R + .03) * Math.cos(a0 - .12), (R + .03) * Math.sin(a0 - .12), zr + .004);
  const body = mesh(rboxC(.04, .028, .03, .007), M.black, g, top); body.rotation.z = a0 - Math.PI / 2;
  const bat = mesh(rboxC(.036, .019, .02, .005), M.black, g, top.clone().add(V(-.018, .018, -.004))); bat.rotation.z = a0 - Math.PI / 2 + .3;
  mesh(rboxC(.01, .004, .021, .0015), M.anodSilver, g, bat.position.clone().add(V(-.004, .011, 0)), false).rotation.z = bat.rotation.z;
  mesh(rboxC(.016, .004, .0012, .0006), M.red, g, top.clone().add(V(0, 0, .0155)), false).rotation.z = a0 - Math.PI / 2;
  return { g };
}

// Kette aus Gliedern (InstancedMesh): Aussen-/Innenlaschen, Rollen, Bolzenkoepfe
export function makeChain(curve, o = {}) {
  const M = mats(o), g = new THREE.Group();
  const L = curve.getLength(), N = Math.max(20, Math.round(L / .0127 / 2) * 2), pitch = L / N;
  const plate = (r, waist) => {
    const s = new THREE.Shape(), p = pitch / 2;
    s.moveTo(-p, -r); s.absarc(-p, 0, r, -Math.PI / 2, -3 * Math.PI / 2, true);
    s.quadraticCurveTo(0, waist, p, r); s.absarc(p, 0, r, Math.PI / 2, -Math.PI / 2, true);
    s.quadraticCurveTo(0, -waist, -p, -r);
    return extrude(s, .0007, 0, 5);
  };
  const outerG = cached(`chainOuter:${pitch.toFixed(5)}`, () => plate(.0044, .0033));
  const innerG = cached(`chainInner:${pitch.toFixed(5)}`, () => plate(.0047, .0037));
  const nOut = N / 2, nIn = N / 2;
  const outer = new THREE.InstancedMesh(outerG, M.chainPlate, nOut * 2), inner = new THREE.InstancedMesh(innerG, M.chainInner, nIn * 2);
  const roller = new THREE.InstancedMesh(cylC(.0039, .0024, 10), M.chainInner, N), pin = new THREE.InstancedMesh(cylC(.0018, .0062, 8), M.chainPin, N);
  [outer, inner, roller, pin].forEach(m => { m.castShadow = true; m.frustumCulled = false; g.add(m); });
  const m4 = new THREE.Matrix4(), A = V(), B = V(), X = V(), Y = V(), Z = V(), C = V(), S = V(1, 1, 1);
  function set(s0 = 0) {
    const off = ((s0 % L) + L) % L;
    let io = 0, ii = 0;
    for (let i = 0; i < N; i++) {
      const ta = ((off + i * pitch) % L) / L, tb = ((off + (i + 1) * pitch) % L) / L;
      curve.getPointAt(ta, A); curve.getPointAt(tb, B);
      X.copy(B).sub(A).normalize(); Z.set(0, 0, 1).addScaledVector(X, -X.z).normalize(); Y.crossVectors(Z, X);
      C.copy(A).add(B).multiplyScalar(.5);
      m4.makeBasis(X, Y, Z);
      // Rolle + Bolzen am Gelenk A
      m4.setPosition(A); roller.setMatrixAt(i, m4); pin.setMatrixAt(i, m4);
      const isOuter = i % 2 === 0, dz = isOuter ? .0026 : .0016;
      [1, -1].forEach(sd => {
        m4.makeBasis(X, Y, Z).scale(S).setPosition(C.x + Z.x * dz * sd, C.y + Z.y * dz * sd, C.z + Z.z * dz * sd);
        if (isOuter) outer.setMatrixAt(io++, m4); else inner.setMatrixAt(ii++, m4);
      });
    }
    [outer, inner, roller, pin].forEach(m => { m.instanceMatrix.needsUpdate = true; });
  }
  set(0);
  return { g, set, length: L, links: N };
}
