/* =====================================================================
   RACEPOINT · 9 · 3D-Studio · das prozedurale Bike (THROWAWAY)
   Jedes Teil wird aus Geometrie gerechnet – keine Modelle, kein Download.
   Koordinaten in Metern: x = Fahrtrichtung, y = oben, z = Antriebsseite.
   buildBike() liefert Teile-Gruppen mit Explosions-Richtung, damit das
   Studio sie auseinanderfliegen, tauschen und wieder einsetzen kann.
   ===================================================================== */
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2, DEG = Math.PI / 180;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const lerp = (a, b, t) => a + (b - a) * t;
const sstep = t => t * t * (3 - 2 * t);
const at = (p, d, s) => p.clone().addScaledVector(d, s);
const pitchR = n => .0127 / (2 * Math.sin(Math.PI / n));   // Teilkreis-Radius eines Ritzels/Blatts

/* ---------------- Geometrie je Typ (Rahmengroesse M) ---------------- */
// tireR = Reifen-Aussenradius · cs = Kettenstrebe · fc = Front-Center · drop = Tretlagerabsenkung
// sta/hta = Sitz-/Lenkwinkel · seat = Tretlager bis Sattel · rim = Felgenhoehe [tief, leicht]
export const GEO = {
  rennrad: {
    tireR: .339, tireW: .028, tireH: .027, rimW: .0142, rim: [.052, .032], tread: 'slick',
    cs: .410, fc: .580, drop: .072, sta: 73.5, hta: 73, stack: .555, reach: .385, ht: .15, st: .47, seat: .735,
    stem: .11, stemA: -12, bar: 'drop', barW: .2, flare: 0,
    rings: [52, 39], cogs: [11, 12, 13, 14, 15, 17, 19, 21, 24, 27, 30, 34], cog: 5,
    rotor: .08, spokes: 12, axle: .071,
  },
  gravel: {
    tireR: .352, tireW: .042, tireH: .041, rimW: .0152, rim: [.045, .030], tread: 'gravel',
    cs: .425, fc: .612, drop: .072, sta: 73.5, hta: 71.5, stack: .585, reach: .375, ht: .165, st: .48, seat: .73,
    stem: .09, stemA: -6, bar: 'drop', barW: .2, flare: .045,
    rings: [42], cogs: [10, 11, 13, 15, 17, 19, 21, 24, 28, 32, 38, 44], cog: 5,
    rotor: .08, spokes: 12, axle: .071, futureShock: true,
  },
  mtb: {
    tireR: .372, tireW: .060, tireH: .058, rimW: .0165, rim: [.030, .024], tread: 'mtb',
    cs: .438, fc: .800, drop: .035, sta: 76, hta: 65, stack: .625, reach: .455, ht: .11, st: .42, seat: .72,
    stem: .045, stemA: 0, bar: 'flat', barW: .39, rise: .022,
    rings: [32], cogs: [10, 12, 14, 16, 18, 21, 24, 28, 32, 36, 42, 52], cog: 6,
    rotor: .1, spokes: 14, axle: .074, susp: 'gold', rearSus: true, dropper: true,
  },
  ebike: {
    tireR: .366, tireW: .056, tireH: .054, rimW: .016, rim: [.028, .024], tread: 'trail',
    cs: .455, fc: .760, drop: .045, sta: 74.5, hta: 67.5, stack: .65, reach: .43, ht: .135, st: .44, seat: .73,
    stem: .06, stemA: 6, bar: 'flat', barW: .36, rise: .035,
    rings: [34], cogs: [11, 13, 15, 17, 19, 21, 24, 28, 32, 37, 43, 50], cog: 6,
    rotor: .1, spokes: 14, axle: .074, susp: 'dark', motor: true, dropper: true,
  },
};

/* ---------------- Lacke (werden im Studio weich ueberblendet) ---------------- */
// flip = Farbwechsel nach Blickwinkel (Chameleon): frontal FLIP_A, an den Flanken FLIP_B
export const PAINTS = {
  rot:       { color: 0xd3242a, metalness: .5,  roughness: .3,  clearcoatRoughness: .04, iridescence: .001, bump: 0, flip: 0, decal: 0xffffff },
  black:     { color: 0x0a0b0d, metalness: .35, roughness: .32, clearcoatRoughness: .03, iridescence: .001, bump: 0, flip: 0, decal: 0xE83637 },
  carbon:    { color: 0x1d1e22, metalness: .4,  roughness: .44, clearcoatRoughness: .3,  iridescence: .001, bump: 1, flip: 0, decal: 0xc9ccd2 },
  white:     { color: 0xe9e9e4, metalness: .05, roughness: .3,  clearcoatRoughness: .04, iridescence: .001, bump: 0, flip: 0, decal: 0xE83637 },
  chameleon: { color: 0x0f6f60, metalness: .45, roughness: .22, clearcoatRoughness: .04, iridescence: 1,    bump: 0, flip: 1, decal: 0xf3f0ff },
};
const FLIP_A = 0x10a07e, FLIP_B = 0x4b25c8;

/* ---------------- Texturen (Canvas, einmalig) ---------------- */
function canvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

// Carbon-Koeper (2/2 Twill) als Bump-Map: je Zelle ein Faserbuendel mit Rundung
function weaveTex() {
  const c = canvas(256, 256), g = c.getContext('2d'), n = 8, s = 256 / n;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    const horiz = (i + j) % 4 < 2, x = i * s, y = j * s;
    const gr = horiz ? g.createLinearGradient(x, y, x, y + s) : g.createLinearGradient(x, y, x + s, y);
    gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(.5, '#e0e0e0'); gr.addColorStop(1, '#2a2a2a');
    g.fillStyle = gr; g.fillRect(x, y, s, s);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return t;
}

// Kettenglieder: abwechselnd Aussen- und Innenlasche mit Bolzen
function chainTex() {
  const c = canvas(128, 32), g = c.getContext('2d');
  g.fillStyle = '#1d1f23'; g.fillRect(0, 0, 128, 32);
  [0, 64].forEach((x, i) => {
    g.fillStyle = i ? '#6f757e' : '#c3c8cf';
    g.beginPath(); g.ellipse(x + 32, 16, 31, 12, 0, 0, TAU); g.fill();
    g.fillStyle = '#eef0f3';
    g.beginPath(); g.arc(x + 9, 16, 5, 0, TAU); g.arc(x + 55, 16, 5, 0, TAU); g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Racepoint-Schriftzug (echtes Logo, weiss) fuer Unterrohr und Felgen
let logoImg;
function logoTex(w, h, logoH) {
  const c = canvas(w, h), t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = THREE.RepeatWrapping;
  logoImg = logoImg || new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = 'assets/racepoint-logo-white.svg'; });
  logoImg.then(img => {
    const lw = logoH * 12.5;
    c.getContext('2d').drawImage(img, (w - lw) / 2, (h - logoH) / 2, lw, logoH);
    t.needsUpdate = true;
  });
  return t;
}

// weicher Lichthof fuer die E-Bike-Lampen
function glowTex() {
  const c = canvas(128, 128), g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(.25, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// E-Bike-Display: Akkustand + Modus
function screenTex() {
  const c = canvas(256, 160), g = c.getContext('2d');
  g.fillStyle = '#05070a'; g.fillRect(0, 0, 256, 160);
  g.fillStyle = '#E83637'; g.font = '700 30px "Roboto Condensed", sans-serif'; g.fillText('TURBO', 18, 44);
  g.fillStyle = '#ffffff'; g.font = '700 64px "Roboto Condensed", sans-serif'; g.fillText('87%', 18, 118);
  for (let i = 0; i < 10; i++) { g.fillStyle = i < 9 ? '#22c55e' : '#2a2d33'; g.fillRect(18 + i * 22, 132, 18, 12); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------------- Materialien (einmal, von allen Bikes geteilt) ---------------- */
export function makeMaterials() {
  const weave = weaveTex(), rimWeave = weave.clone();
  rimWeave.repeat.set(56, 3); rimWeave.needsUpdate = true;
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  const decal = map => S({ map, transparent: true, roughness: .35, metalness: .1, depthWrite: false,
    polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4, side: THREE.DoubleSide });
  const glow = color => new THREE.SpriteMaterial({ map: glowTex(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const p = PAINTS.rot;
  const paint = P({ color: p.color, metalness: p.metalness, roughness: p.roughness, clearcoat: 1, clearcoatRoughness: p.clearcoatRoughness,
    iridescence: p.iridescence, iridescenceIOR: 1.9, iridescenceThicknessRange: [260, 820], bumpMap: weave, bumpScale: 0 });
  // Chameleon: Grundfarbe kippt mit dem Blickwinkel (Fresnel) von Smaragd nach Violett
  const flip = { value: 0 }, flipA = { value: new THREE.Color(FLIP_A) }, flipB = { value: new THREE.Color(FLIP_B) };
  paint.userData.flip = flip;
  paint.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uFlip: flip, uFlipA: flipA, uFlipB: flipB });
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uFlip;\nuniform vec3 uFlipA, uFlipB;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float facing = abs(dot(normalize(vNormal), normalize(vViewPosition)));
        diffuseColor.rgb = mix(diffuseColor.rgb, mix(uFlipB, uFlipA, smoothstep(.4, .97, facing)), uFlip);`);
  };
  return {
    paint,
    carbon: P({ color: 0x17181c, metalness: .35, roughness: .4, clearcoat: .6, clearcoatRoughness: .25, bumpMap: weave, bumpScale: .25 }),
    rim: P({ color: 0x141518, metalness: .3, roughness: .36, clearcoat: .8, clearcoatRoughness: .18, bumpMap: rimWeave, bumpScale: .35 }),
    black: S({ color: 0x121316, metalness: .25, roughness: .46 }),
    rubber: S({ color: 0xffffff, vertexColors: true, roughness: .86, metalness: 0 }),
    knob: S({ color: 0x1b1c1f, roughness: .9 }),
    tape: S({ color: 0x141517, roughness: .78 }),
    saddle: P({ color: 0x141518, roughness: .5, metalness: .05, sheen: .5, sheenColor: 0x555555, sheenRoughness: .6 }),
    alloy: S({ color: 0xc9cdd3, metalness: 1, roughness: .24 }),
    dark: S({ color: 0x3a3d43, metalness: 1, roughness: .3 }),
    spoke: S({ color: 0x24262a, metalness: .8, roughness: .35 }),
    chain: S({ color: 0xffffff, metalness: .9, roughness: .38, map: chainTex() }),
    gold: S({ color: 0xdca94f, metalness: 1, roughness: .18 }),
    red: S({ color: 0xE83637, metalness: .55, roughness: .3 }),
    decal: decal(logoTex(1024, 128, 72)),
    rimDecal: decal(logoTex(2048, 128, 90)),
    lamp: new THREE.MeshBasicMaterial({ color: new THREE.Color(3, 3, 2.8) }),
    lampRed: new THREE.MeshBasicMaterial({ color: new THREE.Color(4, .2, .2) }),
    glow: glow(0xfff1d6),
    glowRed: glow(0xff2a2a),
    screen: new THREE.MeshBasicMaterial({ map: screenTex() }),
  };
}

/* ---------------- Geometrie-Helfer ---------------- */
// Rohr entlang einer Kurve: elliptischer, verjuengter Querschnitt (Aero-Rohre, Streben, Gabel)
// r(t) -> Zahl oder [Tiefe in der Rahmenebene, Breite quer]. rmf = mitlaufender Rahmen fuer runde 3D-Kurven.
export function sweep(pts, o = {}) {
  const curve = pts.isCurve ? pts : new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const seg = o.seg || 40, rad = o.rad || 24, t0 = o.t0 ?? 0, t1 = o.t1 ?? 1, a0 = o.a0 ?? 0, a1 = o.a1 ?? TAU;
  const rf = typeof o.r === 'function' ? o.r : () => o.r, ref = o.ref || V(0, 0, 1), off = o.offset || 0, uvS = .06;
  const frames = o.rmf ? curve.computeFrenetFrames(seg, false) : null;
  const L = curve.getLength(), ring = rad + 1;
  const pos = [], nor = [], uv = [], idx = [];
  const C = V(), T = V(), S = V(), U = V(), n = V();
  const r0 = rf(.5), vRep = Math.max(1, Math.round(Math.PI * ((r0[0] || r0) + (r0[1] || r0)) / uvS));
  const ends = [];
  for (let i = 0; i <= seg; i++) {
    const t = t0 + (t1 - t0) * i / seg;
    curve.getPointAt(t, C);
    if (frames) { T.copy(frames.tangents[i]); U.copy(frames.normals[i]); S.copy(frames.binormals[i]); }
    else {
      curve.getTangentAt(t, T);
      S.copy(ref).addScaledVector(T, -ref.dot(T));
      if (S.lengthSq() < 1e-6) S.set(0, 1, 0).addScaledVector(T, -T.y);
      S.normalize(); U.crossVectors(S, T).normalize();
    }
    const r = rf(t), ru = Array.isArray(r) ? r[0] : r, rs = Array.isArray(r) ? r[1] : r;
    if (i === 0 || i === seg) ends.push({ c: C.clone(), t: T.clone().multiplyScalar(i ? 1 : -1), base: (pos.length / 3) });
    for (let j = 0; j <= rad; j++) {
      const a = a0 + (a1 - a0) * j / rad, ca = Math.cos(a), sa = Math.sin(a);
      n.copy(U).multiplyScalar(ca / ru).addScaledVector(S, sa / rs).normalize();
      pos.push(C.x + U.x * ca * ru + S.x * sa * rs + n.x * off, C.y + U.y * ca * ru + S.y * sa * rs + n.y * off, C.z + U.z * ca * ru + S.z * sa * rs + n.z * off);
      nor.push(n.x, n.y, n.z);
      if (o.patch) {
        const u = i / seg, v = j / rad;
        uv.push(o.flipU ? 1 - u : u, o.flipV ? 1 - v : v);
      } else uv.push(t * L / uvS, j / rad * vRep);
    }
  }
  for (let i = 0; i < seg; i++) for (let j = 0; j < rad; j++) {
    const a = i * ring + j, b = a + ring;
    idx.push(a, a + 1, b, a + 1, b + 1, b);
  }
  // Deckel: flacher Faecher, Wicklung passend zur Normalen
  const caps = o.caps === true ? [0, 1] : o.caps === 'start' ? [0] : o.caps === 'end' ? [1] : [];
  caps.forEach(k => {
    const e = ends[k], c0 = pos.length / 3;
    pos.push(e.c.x, e.c.y, e.c.z); nor.push(e.t.x, e.t.y, e.t.z); uv.push(0, 0);
    for (let j = 0; j <= rad; j++) {
      const q = (e.base + j) * 3;
      pos.push(pos[q], pos[q + 1], pos[q + 2]); nor.push(e.t.x, e.t.y, e.t.z); uv.push(0, 0);
    }
    const P = i => V(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    const fn = P(c0 + 1).sub(P(c0)).cross(P(c0 + 2).sub(P(c0)));
    const flip = fn.dot(e.t) < 0;
    for (let j = 0; j < rad; j++) flip ? idx.push(c0, c0 + 2 + j, c0 + 1 + j) : idx.push(c0, c0 + 1 + j, c0 + 2 + j);
  });
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

// Rotationskoerper um die z-Achse (Felgen, Reifen, Naben, Griffe): Profil [radius, axial]
function lathe(profile, seg = 96) {
  const g = new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(p[0], p[1])), seg);
  g.rotateX(Math.PI / 2);
  return g;
}

// Kassette, Kettenblatt, Schaltroellchen: Zahnkontur als Shape
function toothShape(n, rTip, rRoot, holes = []) {
  const s = new THREE.Shape(), w = TAU / n;
  for (let k = 0; k < n; k++) {
    const a = k * w;
    [[rRoot, a - .36 * w], [rTip, a - .12 * w], [rTip, a + .12 * w], [rRoot, a + .36 * w]].forEach(([r, b], i) => {
      if (!k && !i) s.moveTo(r * Math.cos(b), r * Math.sin(b)); else s.lineTo(r * Math.cos(b), r * Math.sin(b));
    });
  }
  s.closePath();
  holes.forEach(h => s.holes.push(h));
  return s;
}
const circlePath = (r, x = 0, y = 0) => { const p = new THREE.Path(); p.absarc(x, y, r, 0, TAU, true); return p; };
function extrude(shape, depth, bevel = 0, curveSegments = 24) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, curveSegments, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2 });
  g.translate(0, 0, -depth / 2);
  return g;
}
// weich gerundeter Quader (Bremssaettel, Schaltwerk, Motor, Akku-Deckel …)
function rbox(w, h, d, r = .003) {
  r = Math.min(r, w / 2.2, h / 2.2, d / 2.2);
  const s = new THREE.Shape(), W = w / 2 - r, H = h / 2 - r, c = Math.min(W, H) * .6, D = Math.max(.0004, d - 2 * r);
  s.moveTo(-W + c, -H); s.lineTo(W - c, -H); s.quadraticCurveTo(W, -H, W, -H + c); s.lineTo(W, H - c);
  s.quadraticCurveTo(W, H, W - c, H); s.lineTo(-W + c, H); s.quadraticCurveTo(-W, H, -W, H - c);
  s.lineTo(-W, -H + c); s.quadraticCurveTo(-W, -H, -W + c, -H);
  const g = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 3, curveSegments: 5 });
  g.translate(0, 0, -D / 2);
  return smoothNormals(g);
}
// Extrusionen sind facettiert – fuer glatte, polierte Oberflaechen Normalen mitteln
function smoothNormals(g) {
  g.deleteAttribute('uv'); g.deleteAttribute('normal');
  const m = mergeVertices(g, 1e-5); m.computeVertexNormals();
  g.dispose();
  return m;
}

// Sattel: Draufsicht als Kontur mit Mittelkanal, dick extrudiert, Heck leicht hochgezogen
function saddleGeo(L, W) {
  const hw = W / 2, right = [[.5, 0], [.46, .2], [.36, .34], [.18, .42], [.02, .5], [-.12, .72], [-.25, .93], [-.37, 1], [-.46, .92], [-.5, .62], [-.5, .3]];
  const pts = right.concat([[-.47, 0]], right.slice(1).reverse().map(([x, y]) => [x, -y])).map(([x, y]) => new THREE.Vector2(x * L, y * hw));
  const s = new THREE.Shape(); s.moveTo(pts[0].x, pts[0].y); s.splineThru(pts.slice(1).concat([pts[0]]));
  const hole = new THREE.Path(); hole.absellipse(-.07 * L, 0, .19 * L, .13 * hw, 0, TAU, true);
  s.holes.push(hole);
  const g = new THREE.ExtrudeGeometry(s, { depth: .011, bevelEnabled: true, bevelThickness: .009, bevelSize: .008, bevelSegments: 5, curveSegments: 48 });
  g.rotateX(-Math.PI / 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setY(i, p.getY(i) + .45 * Math.min(0, x + .03) ** 2 - .5 * Math.max(0, x - .06) ** 2);
  }
  return smoothNormals(g);
}

/* ---------------- Mesh-Helfer ---------------- */
function mesh(geo, mat, parent, pos, shadow = true) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.copy(pos);
  m.castShadow = shadow;
  parent.add(m);
  return m;
}
// Zylinder zwischen zwei Punkten
function rod(a, b, r, mat, parent, segs = 24, r2 = r) {
  const d = b.clone().sub(a), L = d.length();
  const m = mesh(new THREE.CylinderGeometry(r2, r, L, segs), mat, parent, at(a, d, .5));
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
  return m;
}
// kurzer Zylinder quer zur Rahmenebene (Lager, Augen, Tretlager)
function disc(r, h, mat, parent, pos, segs = 32) {
  const g = new THREE.CylinderGeometry(r, r, h, segs); g.rotateX(Math.PI / 2);
  return mesh(g, mat, parent, pos);
}
// Ellipsoid als weicher Uebergang an Rohrknoten
function blob(pos, sx, sy, sz, mat, parent, rotZ = 0) {
  const m = mesh(new THREE.SphereGeometry(1, 32, 20), mat, parent, pos);
  m.scale.set(sx, sy, sz); m.rotation.z = rotZ;
  return m;
}
const tube = (pts, o, mat, parent) => mesh(sweep(pts, o), mat, parent);
// Rohrradius: Verlauf a -> b, an den Enden leicht aufgedickt (verschliffene Knoten wie bei Carbon)
const tubeR = (a, b, sw = .2) => t => {
  const s = 1 + sw * (Math.exp(-t / .07) + Math.exp(-(1 - t) / .07)), e = sstep(t);
  return [lerp(a[0], b[0], e) * s, lerp(a[1], b[1], e) * s];
};

/* ---------------- Laufrad ---------------- */
// Achse im Ursprung, Drehachse z. Alles, was sich dreht, haengt an "spin".
function buildWheel(G, opt, M, front) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const bsd = .311, depth = G.rim[opt.wheels === 'leicht' ? 1 : 0], w = G.rimW;
  const hw = s => w * (1 + .08 * Math.sin(Math.PI * Math.min(1, s * 1.3))) * Math.sqrt(Math.max(0, 1 - s ** 4));

  // Felge: tiefes U-Profil, Bett oben, runde Flanke unten
  const prof = [[bsd + .0034, -w * .86], [bsd + .0034, w * .86], [bsd + .0012, w]];
  const N = 16;
  for (let k = 0; k <= N; k++) { const s = Math.sin(k / N * Math.PI / 2); prof.push([bsd - s * depth, hw(s)]); }
  for (let k = N - 1; k >= 0; k--) { const s = Math.sin(k / N * Math.PI / 2); prof.push([bsd - s * depth, -hw(s)]); }
  prof.push([bsd + .0012, -w], [bsd + .0034, -w * .86]);
  mesh(lathe(prof, 144), M.rim, spin);

  // Schriftzug auf der Felgenflanke (nur tiefe Felgen)
  if (opt.wheels !== 'leicht' && depth > .035) [1, -1].forEach(side => {
    const nT = 192, nS = 4, s0 = .2, s1 = .74, pos = [], uv = [], idx = [];
    for (let i = 0; i <= nT; i++) {
      const th = i / nT * TAU;
      for (let j = 0; j <= nS; j++) {
        const s = lerp(s0, s1, j / nS), r = bsd - s * depth;
        pos.push(r * Math.cos(th), r * Math.sin(th), side * (hw(s) + .0006));
        uv.push((side > 0 ? -i : i) / nT * 4, 1 - j / nS);
      }
    }
    for (let i = 0; i < nT; i++) for (let j = 0; j < nS; j++) { const a = i * (nS + 1) + j, b = a + nS + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    dg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    dg.setIndex(idx); dg.computeVertexNormals();
    mesh(dg, M.rimDecal, spin, null, false);
  });

  // Reifen: elliptischer Querschnitt, Lauflaeche schwarz, Flanke schwarz oder Tan-Wall
  const hh = G.tireH / 2, hwT = G.tireW / 2, rc = bsd + hh - .0015, tp = [];
  for (let k = 0; k <= 40; k++) { const f = (-158 + 316 * k / 40) * DEG; tp.push([rc + hh * Math.cos(f), hwT * Math.sin(f), f]); }
  const tg = lathe(tp, 144), cols = [], tread = new THREE.Color(0x141518), side = new THREE.Color(opt.wheels === 'tan' ? 0x9a6a3a : 0x1a1b1e), c = new THREE.Color();
  for (let i = 0; i <= 144; i++) tp.forEach(p => {
    const k = THREE.MathUtils.smoothstep(Math.abs(p[2]) / DEG, 46, 56);
    c.copy(tread).lerp(side, k); cols.push(c.r, c.g, c.b);
  });
  tg.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  mesh(tg, M.rubber, spin);

  // Stollen als InstancedMesh (Gravel fein, MTB grob)
  const rows = {
    gravel: [[0, 64, .25, [.004, .0016, .007]], [22, 64, .5, [.005, .002, .004]], [-22, 64, .5, [.005, .002, .004]], [46, 64, 0, [.006, .0026, .006]], [-46, 64, 0, [.006, .0026, .006]]],
    mtb: [[0, 36, .25, [.011, .006, .016]], [30, 36, .5, [.009, .0062, .009]], [-30, 36, .5, [.009, .0062, .009]], [58, 36, 0, [.011, .0066, .009]], [-58, 36, 0, [.011, .0066, .009]]],
    trail: [[0, 40, .25, [.009, .004, .013]], [24, 40, .5, [.008, .0045, .008]], [-24, 40, .5, [.008, .0045, .008]], [54, 40, 0, [.009, .005, .008]], [-54, 40, 0, [.009, .005, .008]]],
  }[G.tread];
  if (rows) {
    const total = rows.reduce((s, r) => s + r[1], 0), knobs = new THREE.InstancedMesh(rbox(1, 1, 1, .2), M.knob, total);
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

  // Nabe mit Flanschen; hinten sitzt der Antriebsflansch weiter innen (Freilauf)
  const fl = front ? [-.036, .033] : [-.034, .019];
  mesh(lathe([[.008, -.052], [.015, -.05], [.015, fl[0] - .006], [.027, fl[0] - .003], [.027, fl[0] + .003], [.017, fl[0] + .009],
    [.019, (fl[0] + fl[1]) / 2], [.017, fl[1] - .009], [.027, fl[1] - .003], [.027, fl[1] + .003], [.016, fl[1] + .007], [.016, .05], [.008, .052]], 48), M.black, spin);
  if (!front) disc(.0175, .05, M.dark, spin, V(0, 0, .044));
  disc(.006, G.axle * 2 + .012, M.alloy, g, null, 16);

  // Speichen: vorn fast radial, hinten zweifach gekreuzt
  const n = G.spokes, sp = new THREE.InstancedMesh(new THREE.CylinderGeometry(.00105, .00105, 1, 6, 1, true), M.spoke, n * 2);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), Y = V(0, 1, 0);
  let k = 0;
  [1, -1].forEach(s => {
    for (let i = 0; i < n; i++) {
      const thR = (i + (s > 0 ? 0 : .5)) / n * TAU, thH = thR + (front ? .12 : .55) * (i % 2 ? 1 : -1);
      const rimP = V((bsd - depth + .004) * Math.cos(thR), (bsd - depth + .004) * Math.sin(thR), s * .003);
      const hubP = V(.025 * Math.cos(thH), .025 * Math.sin(thH), s > 0 ? fl[1] : fl[0]);
      const d = rimP.clone().sub(hubP), L = d.length();
      q.setFromUnitVectors(Y, d.normalize());
      m4.compose(at(hubP, d, L / 2), q, V(1, L, 1));
      sp.setMatrixAt(k++, m4);
    }
  });
  sp.castShadow = true;
  spin.add(sp);

  // Bremsscheibe (links) mit Lochkranz und Spider
  const rr = G.rotor, rz = front ? -.043 : -.05, holes = [circlePath(rr - .021)];
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * TAU, b = a + TAU / 48;
    holes.push(circlePath(.0024, (rr - .0125) * Math.cos(a), (rr - .0125) * Math.sin(a)));
    holes.push(circlePath(.0018, (rr - .006) * Math.cos(b), (rr - .006) * Math.sin(b)));
  }
  const outer = new THREE.Shape(); outer.absarc(0, 0, rr, 0, TAU, false); outer.holes = holes;
  mesh(extrude(outer, .0018, 0, 64), M.alloy, spin, V(0, 0, rz));
  const star = new THREE.Shape();
  for (let i = 0; i < 6; i++) {
    const a = i / 6 * TAU, pts = [[.016, a - .5], [rr - .019, a - .1], [rr - .019, a + .1], [.016, a + .5]];
    pts.forEach(([r, b], j) => (i || j ? star.lineTo(r * Math.cos(b), r * Math.sin(b)) : star.moveTo(r * Math.cos(b), r * Math.sin(b))));
  }
  star.holes.push(circlePath(.007));
  mesh(extrude(star, .003, 0, 8), M.dark, spin, V(0, 0, rz));

  return { g, spin, hw, depth, bsd };
}

/* ---------------- Kette (geschlossene Kurve um Blatt, Ritzel, Roellchen) ---------------- */
function chainPath(ring, Rr, zr, cog, rc, zc, p1, p2, rp) {
  const pts = [], arc = (c, r, a0, a1, z, n) => { for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; pts.push(V(c.x + r * Math.cos(a), c.y + r * Math.sin(a), z)); } };
  const line = (a, b, n) => { for (let i = 1; i < n; i++) pts.push(a.clone().lerp(b, i / n)); };
  const ang = (a, b) => Math.atan2(b.y - a.y, b.x - a.x), dist = (a, b) => Math.hypot(b.x - a.x, b.y - a.y);
  const top = ang(ring, cog) - Math.acos((Rr - rc) / dist(ring, cog));       // obere Tangente (Zugtrum)
  let bot = ang(ring, p2) + Math.acos((Rr - rp) / dist(ring, p2));          // untere Tangente (Leertrum)
  if (bot > Math.PI) bot -= TAU;
  arc(ring, Rr, bot, top, zr, 28);
  const a = pts[pts.length - 1].clone(), b = V(cog.x + rc * Math.cos(top), cog.y + rc * Math.sin(top), zc);
  line(a, b, 8);
  arc(cog, rc, top, top + 2.05, zc, 12);
  arc(p1, rp, .8, -.9, zc, 8);
  arc(p2, rp, 2.8, bot + TAU, zc, 8);
  const c = pts[pts.length - 1].clone(), d = V(ring.x + Rr * Math.cos(bot), ring.y + Rr * Math.sin(bot), zr);
  line(c, d, 8);
  return new THREE.CatmullRomCurve3(pts, true, 'centripetal');
}

/* =====================================================================
   buildBike(type, { wheels }, M)
   -> { root, parts[{node, dir, amt, delay, tag}], anchors, focus, spin, count }
   ===================================================================== */
export function buildBike(type, opt, M) {
  const G = GEO[type], root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  const parts = [], anchors = {}, wheelSpin = [], crankSpin = [];
  const part = (name, dir, amt, delay = 0, tag = '') => {
    const g = new THREE.Group(); g.name = name; inner.add(g);
    parts.push({ node: g, dir: V(...dir).normalize(), amt, delay, tag,
      rot: V(Math.sin(parts.length * 7.1), Math.cos(parts.length * 3.7), Math.sin(parts.length * 1.3)).multiplyScalar(.6) });
    return g;
  };
  const anchor = (name, parent, p) => { const o = new THREE.Object3D(); o.position.copy(p); parent.add(o); anchors[name] = o; };

  // Kernpunkte der Geometrie
  const R = G.tireR, BB = V(0, R - G.drop), RA = V(-Math.sqrt(G.cs ** 2 - G.drop ** 2), R), FA = V(Math.sqrt(G.fc ** 2 - G.drop ** 2), R);
  const sAx = V(Math.cos(G.hta * DEG), -Math.sin(G.hta * DEG)), up = sAx.clone().negate();
  const fwd = V(Math.sin(G.hta * DEG), Math.cos(G.hta * DEG));          // senkrecht zur Lenkachse, nach vorn
  const HTt = V(G.reach, BB.y + G.stack), HTb = at(HTt, sAx, G.ht);
  const stDir = V(-Math.cos(G.sta * DEG), Math.sin(G.sta * DEG)), STt = at(BB, stDir, G.st);
  const drop = G.bar === 'drop', zSide = s => V(0, 0, s);

  /* ---------- Rahmen ---------- */
  const F = part('frame', [0, 0, 0], 0);
  const htR = G.motor ? [[.027, .022], [.034, .027]] : G.rearSus ? [[.024, .021], [.031, .026]] : [[.021, .018], [.029, .023]];
  tube([at(HTt, up, .012), at(HTb, sAx, .014)], { r: tubeR(...htR, 0), seg: 12, caps: true }, M.paint, F);

  let dtPts, dtR, ttEnd, ssTop;
  if (G.motor) {
    dtPts = [at(HTb, up, .03), at(HTb, up, .03).lerp(BB, .5).add(V(.004, -.004)), BB.clone().add(V(.085, .07))];
    dtR = tubeR([.04, .033], [.045, .036], .12);
    ttEnd = at(BB, stDir, .4); ssTop = at(ttEnd, stDir, -.03);
  } else if (G.rearSus) {
    dtPts = [at(HTb, up, .03), at(HTb, up, .03).lerp(BB, .5).add(V(.006, -.006)), BB.clone().add(V(.012, .01))];
    dtR = tubeR([.029, .026], [.035, .031]);
    ttEnd = at(BB, stDir, .40);
  } else {
    dtPts = [at(HTb, up, .028), at(HTb, up, .028).lerp(BB, .5).add(V(.003, -.003)), BB.clone().add(V(.012, .008))];
    dtR = tubeR([.026, .0215], [.031, .027]);
    ttEnd = at(STt, stDir, -.022); ssTop = at(STt, stDir, -.085);
  }
  tube(dtPts, { r: dtR }, M.paint, F);
  // Schriftzug beidseitig auf dem Unterrohr
  [1, -1].forEach(s => mesh(sweep(dtPts, { r: dtR, t0: .2, t1: .8, a0: s * Math.PI / 2 - .78, a1: s * Math.PI / 2 + .78, offset: .0006, patch: true,
    flipU: s > 0, flipV: s < 0, seg: 40, rad: 12 }), M.decal, F, null, false));

  const ttA = at(HTt, sAx, G.rearSus || G.motor ? .03 : .024);
  const ttPts = [ttA, ttA.clone().lerp(ttEnd, .5).add(V(0, G.rearSus ? .018 : .006)), ttEnd];
  tube(ttPts, { r: tubeR(G.motor ? [.023, .019] : [.0175, .0158], [.015, .0136], .12) }, M.paint, F);
  // Sitzrohr
  const stBase = G.motor ? BB.clone().add(V(-.03, .075)) : at(BB, stDir, -.004);
  tube([stBase, at(STt, stDir, .014)], { r: tubeR(G.rearSus ? [.021, .019] : [.022, .019], [.0168, .0148], .1), seg: 24, caps: 'end' }, M.paint, F);
  disc(.024, .088, M.paint, F, BB);
  blob(at(STt, stDir, -.028), .019, .026, .016, M.paint, F);
  disc(.0175, .012, M.black, F, at(STt, stDir, .006)).quaternion.setFromUnitVectors(V(0, 0, 1), stDir);
  anchor('frame', F, ttPts[0].clone().lerp(ttPts[1], .45).add(V(0, 0, .02)));

  // Hinterbau
  const mp = BB.clone().add(V(-.03, .055));                    // Hauptlager (Fully)
  [1, -1].forEach(s => {
    const csA = G.rearSus ? mp.clone().add(zSide(s * .042)) : BB.clone().add(V(G.motor ? -.07 : -.025, G.motor ? .01 : -.004, s * .038));
    const csB = RA.clone().add(V(.016, -.006, s * (G.axle - .008)));
    const csM = csA.clone().lerp(csB, .45).add(V(0, .006, 0)); csM.z = s * (s > 0 ? .062 : .056) * (G.axle / .071);
    tube([csA, csM, csB], { r: tubeR(G.rearSus || G.motor ? [.016, .013] : [.0145, .0118], [.0092, .0076], .15), caps: true }, M.paint, F);
    if (!G.rearSus) {
      const ssA = ssTop.clone().add(zSide(s * .016)), ssB = RA.clone().add(V(.012, .014, s * (G.axle - .009)));
      tube([ssA, ssA.clone().lerp(ssB, .5).add(zSide(s * .012)), ssB], { r: tubeR([.0105, .0078], [.0074, .0063], .15), caps: true }, M.paint, F);
    }
    mesh(rbox(.034, .028, .008, .003), M.paint, F, RA.clone().add(V(.004, .002, s * (G.axle - .006))));
  });

  // Fully: Wippe, Sitzstreben bis zur Wippe, Hauptlager
  let rf;
  if (G.rearSus) {
    const rp = at(BB, stDir, .3), rr = rp.clone().add(V(-.055, .03)), ff = rp.clone().add(V(.07, .02));
    rf = ff;
    [1, -1].forEach(s => {
      const z = zSide(s * .03);
      tube([rr.clone().add(z), rp.clone().add(z), ff.clone().add(z)], { r: [.011, .005], caps: true, seg: 20 }, M.dark, F);
      const ssB = RA.clone().add(V(.012, .016, s * (G.axle - .009)));
      tube([ssB, ssB.clone().lerp(rr, .5).add(zSide(s * .022)), rr.clone().add(zSide(s * .034))], { r: tubeR([.0095, .0082], [.012, .009], .12), caps: true }, M.paint, F);
    });
    disc(.009, .075, M.alloy, F, rp); disc(.009, .075, M.alloy, F, rr); disc(.011, .09, M.dark, F, mp);
  }

  /* ---------- Gabel ---------- */
  const FK = part('fork', [1, -.25, 0], .32, .05);
  let crownC;
  if (!G.susp) {
    [1, -1].forEach(s => {
      const a = at(HTb, sAx, .02).add(zSide(s * .036)), b = FA.clone().add(V(-.004, .012, s * .05));
      tube([a, a.clone().lerp(b, .5).add(V(.008, 0, s * .009)), b], { r: tubeR([.0195, .0125], [.0115, .0079], .1), caps: true }, M.paint, FK);
      mesh(rbox(.022, .03, .007, .003), M.paint, FK, FA.clone().add(zSide(s * .052)));
    });
    blob(at(HTb, sAx, .028), .03, .02, .052, M.paint, FK, Math.atan2(sAx.y, sAx.x) + Math.PI / 2);
  } else {
    // Federgabel: Krone, Standrohre (Gold/dunkel), Tauchrohre, Bruecke
    const cRef = at(HTb, sAx, .035), lam = FA.clone().sub(cRef).dot(sAx);
    crownC = at(FA, sAx, -lam);
    const stanchion = G.susp === 'gold' ? M.gold : M.dark, zS = .068;
    tube([crownC.clone().add(zSide(-.085)), crownC.clone().add(zSide(.085))], { r: [.026, .019], ref: V(0, 1, 0), caps: true, seg: 12 }, M.black, FK);
    tube([cRef, crownC], { r: [.018, .024], caps: true, seg: 6 }, M.black, FK);
    [1, -1].forEach(s => {
      const z = zSide(s * zS);
      rod(crownC.clone().add(z), at(crownC, sAx, .22).add(z), .0175, stanchion, FK, 28);
      rod(at(crownC, sAx, .19).add(z), at(FA, sAx, .016).add(z), .0232, M.black, FK, 28, .0245);
      disc(.0245, .006, M.dark, FK, at(crownC, sAx, .19).add(z)).quaternion.setFromUnitVectors(V(0, 0, 1), sAx);
      mesh(rbox(.04, .03, .02, .006), M.black, FK, FA.clone().add(z));
    });
    const aTop = at(crownC, sAx, .2).add(V(fwd.x * .022, fwd.y * .022));
    tube([aTop.clone().add(zSide(-zS)), at(aTop, up, .045).add(V(fwd.x * .012, fwd.y * .012)), aTop.clone().add(zSide(zS))], { r: .013, rmf: true, caps: true }, M.black, FK);
  }

  /* ---------- Laufraeder ---------- */
  const mkWheel = (front, p) => {
    const W = part(front ? 'wheelF' : 'wheelR', [front ? 1 : -1, 0, 0], .52, front ? 0 : .02, 'wheel');
    const w = buildWheel(G, opt, M, front);
    w.g.position.copy(p); W.add(w.g); wheelSpin.push(w.spin);
    return { W, w };
  };
  const wf = mkWheel(true, FA), wr = mkWheel(false, RA);
  const wa = 40 * DEG, wrr = wf.w.bsd - wf.w.depth * .45;
  anchor('wheel', wf.W, FA.clone().add(V(wrr * Math.cos(wa), wrr * Math.sin(wa), wf.w.hw(.45) + .003)));

  /* ---------- Antrieb ---------- */
  const rings = G.rings, Rr = pitchR(rings[0]), zr = drop ? .047 : .052;
  const CK = part('crank', [0, -.2, 1], .42, .06), CL = part('crankL', [0, -.2, -1], .36, .06);
  const crankAt = (grp, side) => { const s = new THREE.Group(); s.position.copy(BB); grp.add(s); crankSpin.push(s); return s; };
  const ck = crankAt(CK, 1), cl = crankAt(CL, -1);
  rings.forEach((n, i) => {
    const r = pitchR(n);
    mesh(extrude(toothShape(n, r + .0032, r - .0025, [circlePath(r - .013)]), .0024, 0, 8), i ? M.dark : M.black, ck, V(0, 0, zr - i * .0048));
  });
  // Spider: 4 Arme vom Kurbelstern zum Blatt
  const spider = new THREE.Shape();
  for (let i = 0; i < 4; i++) {
    const a = i / 4 * TAU + .4;
    [[.022, a - .55], [Rr - .006, a - .14], [Rr - .006, a + .14], [.022, a + .55]].forEach(([r, b], j) =>
      (i || j ? spider.lineTo(r * Math.cos(b), r * Math.sin(b)) : spider.moveTo(r * Math.cos(b), r * Math.sin(b))));
  }
  mesh(extrude(spider, .006, .0015, 8), M.carbon, ck, V(0, 0, zr - .006));
  disc(.0145, G.motor ? .18 : .15, M.alloy, ck, null, 20);
  const crankArm = (grp, side, ang) => {
    const tip = V(.1725 * Math.cos(ang), .1725 * Math.sin(ang), side * (G.bar === 'flat' ? .085 : .075));
    const a = V(0, 0, side * (G.motor ? .075 : .056));
    tube([a, a.clone().lerp(tip, .5).add(zSide(side * .012)), tip], { r: t => [lerp(.021, .0135, t), lerp(.0095, .0075, t)], caps: true }, M.carbon, grp);
    disc(.021, .014, M.carbon, grp, a.clone().add(zSide(side * .002)));
    // Pedal: Rennrad = Keo-Form, sonst Flatpedal
    const pz = tip.z + side * .045;
    rod(tip, V(tip.x, tip.y, pz + side * .02), .0055, M.alloy, grp, 12);
    mesh(drop ? rbox(.085, .017, .06, .006) : rbox(.1, .014, .095, .004), drop ? M.black : M.dark, grp, V(tip.x, tip.y, pz));
  };
  crankArm(ck, 1, -55 * DEG);
  crankArm(cl, -1, 125 * DEG);

  // Kassette an der Hinterachse (dreht mit dem Laufrad)
  const KS = part('cassette', [-.45, 0, 1], .36, .12), ks = new THREE.Group();
  ks.position.copy(RA); KS.add(ks); wheelSpin.push(ks);
  const z0 = .022, dz = .0039 * 11 / (G.cogs.length - 1);
  [...G.cogs].reverse().forEach((n, i) => {
    const r = pitchR(n);
    mesh(extrude(toothShape(n, r + .0026, r - .0022, [circlePath(.0175)]), .0018, 0, 6), i % 3 === 1 ? M.dark : M.alloy, ks, V(0, 0, z0 + i * dz));
  });
  const ci = G.cogs.length - 1 - G.cog, zc = z0 + ci * dz, rc = pitchR(G.cogs[G.cog]);

  // Schaltwerk: Koerper, Akku, Kaefig mit zwei Roellchen
  const RD = part('rd', [-.3, -.7, 1], .36, .18);
  const big = !drop, rpR = .019, p1 = RA.clone().add(V(-.027, -rc - (big ? .052 : .03))), p2 = p1.clone().add(V(.024, -(big ? .086 : .07)));
  [p1, p2].forEach(p => mesh(extrude(toothShape(12, rpR + .0018, rpR - .002, [circlePath(.004)]), .004, 0, 6), M.black, RD, V(p.x, p.y, zc)));
  [p1, p2].forEach(p => disc(.008, .02, M.alloy, RD, V(p.x, p.y, zc)));
  const dir = p2.clone().sub(p1), beta = Math.atan2(dir.y, dir.x), cage = new THREE.Shape(), cr = .026;
  for (let i = 0; i <= 16; i++) { const a = beta + Math.PI / 2 + Math.PI * i / 16; (i ? cage.lineTo : cage.moveTo).call(cage, p1.x + cr * Math.cos(a), p1.y + cr * Math.sin(a)); }
  for (let i = 0; i <= 16; i++) { const a = beta - Math.PI / 2 + Math.PI * i / 16; cage.lineTo(p2.x + cr * Math.cos(a), p2.y + cr * Math.sin(a)); }
  const cageG = extrude(cage, .0026, .0008, 6);
  mesh(cageG, M.carbon, RD, zSide(zc + .0085));
  mesh(cageG.clone(), M.dark, RD, zSide(zc - .0085));
  const body0 = RA.clone().add(V(.004, -.012, G.axle + .004)), body1 = p1.clone().add(V(-.006, .02, zc + .014));
  tube([body0, body0.clone().lerp(body1, .5).add(V(-.016, -.004, .012)), body1], { r: [.0145, .011], caps: true, seg: 16 }, M.black, RD);
  const bat = mesh(rbox(.036, .022, .016, .005), M.black, RD, body0.clone().lerp(body1, .45).add(V(-.026, .006, .022)));
  bat.rotation.z = -.5;
  mesh(rbox(.006, .012, .002, .001), M.red, RD, bat.position.clone().add(V(-.004, .002, .009)), false).rotation.z = -.5;
  anchor('drive', RD, body0.clone().lerp(body1, .5).add(V(-.016, -.004, .028)));

  // Umwerfer (nur 2-fach)
  if (rings.length > 1) {
    const FD = part('fd', [.1, .5, 1], .26, .2), a = 112 * DEG, p = BB.clone().add(V((Rr + .014) * Math.cos(a), (Rr + .014) * Math.sin(a), zr + .006));
    const cg = mesh(rbox(.07, .016, .003, .001), M.alloy, FD, p.clone().add(zSide(.005))); cg.rotation.z = a - Math.PI / 2;
    const bd = mesh(rbox(.04, .03, .02, .006), M.black, FD, at(BB, stDir, .19).add(V(.02, 0, .03))); bd.rotation.z = a - Math.PI / 2;
  }

  // Kette
  const CH = part('chain', [0, -.3, 1], .26, .14);
  const cc = chainPath(BB, Rr, zr, RA, rc, zc, p1, p2, rpR);
  const chainG = new THREE.TubeGeometry(cc, 420, .0034, 8, true);
  const chainMat = M.chain; chainMat.map.repeat.set(cc.getLength() / .0254, 1);
  mesh(chainG, chainMat, CH);

  // Bremssaettel links (Flat-Mount)
  const BR = part('brakes', [0, .1, -1], .26, .2);
  [[FA, 128 * DEG, -.043, G.rotor], [RA, 28 * DEG, -.05, G.rotor]].forEach(([c, a, z, rr]) => {
    const m = mesh(rbox(.056, .026, .028, .006), M.black, BR, c.clone().add(V((rr - .008) * Math.cos(a), (rr - .008) * Math.sin(a), z - .004)));
    m.rotation.z = a + Math.PI / 2;
  });

  /* ---------- Cockpit ---------- */
  const CP = part('cockpit', [.35, 1, 0], .32, .12);
  const spTop = at(HTt, up, G.futureShock ? .045 : .025);
  if (G.futureShock) {
    // Future Shock: Faltenbalg ueber dem Steuerrohr
    const bel = [];
    for (let i = 0; i <= 24; i++) bel.push([.019 + .0035 * Math.abs(Math.sin(i / 24 * Math.PI * 5)), .045 * i / 24]);
    const bm = mesh(lathe(bel, 32), M.black, CP, at(HTt, up, -.002));
    bm.quaternion.setFromUnitVectors(V(0, 0, 1), up);
  } else rod(at(HTt, up, -.002), spTop, .0186, M.black, CP);
  const SC = at(spTop, up, .021), stemDir = fwd.clone().applyAxisAngle(V(0, 0, 1), G.stemA * DEG);
  rod(at(SC, up, -.022), at(SC, up, .022), .021, M.carbon, CP, 28);
  rod(at(SC, up, .022), at(SC, up, .027), .0185, M.dark, CP, 28);
  const B = at(SC, stemDir, G.stem);
  if (drop) {
    tube([at(SC, stemDir, -.014), at(SC, stemDir, .045), B], { r: t => [lerp(.0195, .016, t), lerp(.019, .0185, t)], caps: 'start', seg: 16 }, M.carbon, CP);
    // Aero-Oberlenker flach, dann runde, umwickelte Drops mit Flare
    tube([B.clone().add(V(.012, 0, -.155)), B.clone().add(V(0, 0, -.07)), B.clone(), B.clone().add(V(0, 0, .07)), B.clone().add(V(.012, 0, .155))],
      { r: [.016, .0075], ref: V(0, 1, 0), seg: 30 }, M.carbon, CP);
    const w2 = G.barW, fl = G.flare;
    [1, -1].forEach(s => {
      const z = k => s * (w2 + fl * k);
      const P = [V(.01, 0, s * .14), V(.03, 0, s * .19), V(.07, -.004, z(0)), V(.09, -.036, z(.15)), V(.086, -.078, z(.4)), V(.056, -.116, z(.7)), V(.014, -.129, z(.9)), V(-.035, -.13, z(1))].map(p => p.add(B));
      tube(P, { r: .0119, rmf: true, caps: 'end', seg: 60, rad: 16 }, M.tape, CP);
      const H = P[2];
      tube([H.clone().add(V(-.014, .001)), H.clone().add(V(.012, .012)), H.clone().add(V(.036, .02)), H.clone().add(V(.049, .016))],
        { r: t => { const b = .0105 + .0048 * Math.sin(Math.PI * Math.min(1, t * 1.05)); return [b * 1.15, b * .86]; }, caps: true, seg: 24 }, M.black, CP);
      tube([H.clone().add(V(.044, .01)), B.clone().add(V(.1, -.042, z(.2))), B.clone().add(V(.092, -.088, z(.5))), B.clone().add(V(.068, -.116, z(.75)))],
        { r: [.0058, .0036], caps: true, seg: 24 }, M.carbon, CP);
      if (s > 0) anchor('cockpit', CP, H.clone().add(V(.012, .026, .004)));
    });
  } else {
    tube([at(SC, stemDir, -.012), B], { r: [.017, .02], caps: true, seg: 8 }, M.dark, CP);
    const rise = G.rise, hw = G.barW;
    const bp = [-1, -.77, -.5, -.2, 0, .2, .5, .77, 1].map(f => {
      const a = Math.abs(f) * hw;
      return B.clone().add(V(-Math.max(0, a - .1) * .14, rise * sstep(Math.min(1, Math.max(0, (a - .05) / .15))), f * hw));
    });
    tube(bp, { r: t => lerp(.0111, .0175, Math.exp(-(((t - .5) / .13) ** 2))), rmf: true, caps: true, seg: 70, rad: 18 }, M.carbon, CP);
    [1, -1].forEach(s => {
      // Griffe mit Rippen + roter Lock-on-Klemme
      const e = bp[s > 0 ? 8 : 0], i0 = bp[s > 0 ? 7 : 1], d = e.clone().sub(i0).normalize();
      const gp = [];
      for (let k = 0; k <= 30; k++) gp.push([.0158 + .0012 * Math.sin(k * 1.6) + (k > 27 ? .003 : 0), .13 * k / 30 - .065]);
      const gm = mesh(lathe(gp, 32), M.tape, CP, at(e, d, -.067));
      gm.quaternion.setFromUnitVectors(V(0, 0, 1), d);
      const lk = disc(.0185, .009, M.red, CP, at(e, d, -.137)); lk.quaternion.setFromUnitVectors(V(0, 0, 1), d);
      // Bremshebel
      const lb = at(e, d, -.165).add(V(.012, .006));
      mesh(rbox(.03, .022, .03, .006), M.black, CP, lb);
      tube([lb.clone().add(V(.012, -.002)), lb.clone().add(V(.04, -.006, s * .02)), lb.clone().add(V(.048, -.012, s * .075))], { r: [.0052, .0034], caps: true, seg: 16 }, M.dark, CP);
      if (s > 0) {
        mesh(rbox(.035, .02, .025, .005), M.black, CP, at(e, d, -.21).add(V(-.012, -.02)));
        anchor('cockpit', CP, lb.clone().add(V(.01, .02, .02)));
      }
    });
    if (G.motor) {
      // Display mit Akkustand
      const tilt = .35, n = V(-Math.sin(tilt), Math.cos(tilt)), dp = B.clone().add(V(-.004, .03));
      mesh(rbox(.062, .012, .044, .005), M.black, CP, dp).rotation.z = tilt;
      const sc = mesh(new THREE.PlaneGeometry(.052, .036), M.screen, CP, at(dp, n, .0066), false);
      sc.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(V(0, 0, 1), V(Math.cos(tilt), Math.sin(tilt)), n));
      anchor('cockpit', CP, B.clone().add(V(0, .045, .01)));
    }
  }

  /* ---------- Sattelstuetze + Sattel ---------- */
  const SP = part('seatpost', [-.25, 1, 0], .22, .1), seatTop = at(BB, stDir, G.seat);
  if (G.dropper) {
    rod(at(STt, stDir, -.05), at(STt, stDir, .12), .0172, M.black, SP, 28);
    rod(at(STt, stDir, .118), at(seatTop, stDir, -.035), .0152, M.dark, SP, 28);
    rod(at(STt, stDir, .112), at(STt, stDir, .128), .0195, M.black, SP, 28);
  } else {
    tube([at(STt, stDir, -.06), at(seatTop, stDir, -.03)], { r: [.0165, .0118], caps: true, seg: 6 }, M.carbon, SP);
  }
  mesh(rbox(.05, .016, .03, .005), M.dark, SP, at(seatTop, stDir, -.03));
  const SD = part('saddle', [-.2, 1, 0], .38, .16);
  const sg = mesh(saddleGeo(drop ? .245 : .26, drop ? .143 : .14), M.saddle, SD, seatTop.clone().add(V(.012, -.021)));
  [1, -1].forEach(s => tube([V(-.075, -.011), V(-.03, -.022), V(.03, -.022), V(.08, -.008)].map(p => p.add(sg.position).add(zSide(s * .021))),
    { r: .0034, rmf: true, seg: 20, rad: 8 }, M.dark, SD));

  /* ---------- Extras je Typ ---------- */
  if (G.rearSus) {
    // Daempfer: Luftkammer, rote Ausgleichskammer, goldene Kolbenstange
    const SH = part('shock', [0, .25, 1], .4, .14), dtDir = HTb.clone().sub(BB).normalize(), nrm = V(-dtDir.y, dtDir.x);
    const sm = at(BB, dtDir, .2).addScaledVector(nrm, .032), d = rf.clone().sub(sm), L = d.length(), u = d.clone().normalize();
    rod(sm, at(sm, u, L * .55), .0115, M.black, SH, 28);
    rod(at(sm, u, L * .52), at(sm, u, L * .78), .0128, M.gold, SH, 28);
    rod(at(sm, u, L * .28), at(sm, u, L * .52), .0205, M.dark, SH, 32);
    rod(at(sm, u, L * .75), at(sm, u, L * .95), .0215, M.black, SH, 32);
    rod(at(sm, u, L * .8), at(sm, u, L * .86), .0222, M.red, SH, 32);
    [sm, rf].forEach(p => disc(.0095, .03, M.alloy, SH, p));
  }
  if (G.motor) {
    // Motor am Tretlager, Akku als Deckel unter dem Unterrohr, Lichter
    const MO = part('motor', [0, -1, .35], .3, .1);
    const mb = mesh(rbox(.2, .15, .105, .028), M.black, MO, BB.clone().add(V(.025, .012))); mb.rotation.z = -.32;
    mesh(lathe([[.0, .0], [.058, 0], [.062, .004], [.056, .008], [.0, .008]], 48), M.dark, MO, BB.clone().add(V(.012, .004, .051)));
    const BA = part('battery', [.45, -1, 0], .34, .16);
    const dtDir = dtPts[2].clone().sub(dtPts[0]).normalize(), under = V(dtDir.y, -dtDir.x).multiplyScalar(-1);
    const off = under.clone().multiplyScalar(.024);
    tube(dtPts.map(p => p.clone().add(off)), { r: [.021, .0285], t0: .1, t1: .86, caps: true }, M.black, BA);
    anchor('frame', BA, dtPts[0].clone().lerp(dtPts[2], .5).add(off).add(V(0, 0, .03)));
    const LI = part('lights', [1, .35, 0], .3, .22), lp = at(crownC, up, .012).add(V(fwd.x * .05, fwd.y * .05));
    mesh(rbox(.045, .032, .05, .008), M.black, LI, lp);
    disc(.013, .004, M.lamp, LI, lp.clone().add(V(.023, 0))).rotation.set(0, Math.PI / 2, 0);
    const gl = new THREE.Sprite(M.glow); gl.position.copy(lp).add(V(.03, 0)); gl.scale.setScalar(.22); LI.add(gl);
    const tl = ssTop.clone().add(V(-.03, -.02));
    mesh(rbox(.012, .034, .03, .004), M.lampRed, LI, tl, false);
    const gr = new THREE.Sprite(M.glowRed); gr.position.copy(tl).add(V(-.01, 0)); gr.scale.setScalar(.14); LI.add(gr);
  }

  /* ---------- Teile zentrieren, Bike mittig stellen ---------- */
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3(), c = V();
  parts.forEach(p => {
    box.setFromObject(p.node); box.getCenter(c);
    p.node.children.forEach(ch => ch.position.sub(c));
    p.node.position.copy(c); p.base = c.clone();
  });
  const xc = ((RA.x - R) + (FA.x + R)) / 2;
  inner.position.x = -xc;
  const off = V(-xc, 0, 0);
  const focus = {
    bike: V(0, (seatTop.y + .04) / 2, 0),
    frame: BB.clone().lerp(HTt, .5).add(off).add(V(-.06, -.02)),
    drive: BB.clone().lerp(RA, .55).add(off).add(V(0, -.02, .05)),
    wheel: FA.clone().add(off),
    cockpit: B.clone().add(off).add(V(.03, -.04)),
  };
  let count = 0;
  root.traverse(o => { if (o.isMesh) count += o.isInstancedMesh ? o.count : 1; });
  return { root, parts, anchors, focus, spin: { wheels: wheelSpin, crank: crankSpin }, count, size: { len: FA.x - RA.x + 2 * R, h: seatTop.y + .04 } };
}

// Speicher eines alten Bikes freigeben (Materialien bleiben geteilt)
export function disposeBike(b) {
  b.root.traverse(o => { if (o.geometry) o.geometry.dispose(); });
  b.root.removeFromParent();
}
