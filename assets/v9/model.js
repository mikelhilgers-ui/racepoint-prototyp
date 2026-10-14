/* =====================================================================
   RACEPOINT · 9 · 3D-Studio · echtes Rennrad-Modell (THROWAWAY)
   „Road Bike“ von tanity (Sketchfab), CC BY 4.0 – siehe assets/models/road-bike.LICENSE.txt
   - wird erst nachgeladen, wenn die Buehne laeuft (Draco, ~0,9 MB);
     bis dahin und bei Fehlern bleibt das prozedurale Bike stehen
   - liefert dieselbe Schnittstelle wie buildBike(): Teile mit Explosions-
     Richtung, Anker fuer das HUD, Kamera-Fokuspunkte, Dreh-Gruppen
   - Rahmen bekommt den Konfigurator-Lack (M.paint), Reifen schwarz/Tan-Wall
   Modell: Y oben, faehrt nach +X, Antriebsseite +Z (wie das prozedurale Bike)
   ===================================================================== */
import * as THREE from 'three';

const URL_GLB = new URL('../models/road-bike.glb', import.meta.url).href;
const URL_DRACO = new URL('../../vendor/three/addons/libs/draco/gltf/', import.meta.url).href;
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Kernpunkte im Original-Modell (vor der Skalierung), gemessen mit gltf-transform
const HUB_F = V(1.16, .80), HUB_R = V(-1.155, .80), BB = V(-.22, .63), STEM = V(.8, 2.02), HT_TOP = V(.67, 1.96);
const WHEEL_REACH = .83;   // alles, was komplett in diesem Radius um die Nabe liegt, dreht mit dem Laufrad
const CRANK_REACH = .56;
const SCALE = .339 * 2 / 1.59;   // Reifen-Aussendurchmesser 1,59 -> 678 mm wie beim prozeduralen Rennrad

let pending = null;
// Laedt das Modell einmal und zerlegt es in eine Vorlage (Geometrien werden von allen Instanzen geteilt)
export function loadRoadBike() {
  if (pending) return pending;
  pending = (async () => {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]);
    const draco = new DRACOLoader().setDecoderPath(URL_DRACO);
    try {
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(URL_GLB);
      return template(gltf.scene);
    } finally {
      draco.dispose();
    }
  })();
  return pending;
}

function template(scene) {
  scene.updateMatrixWorld(true);
  const items = [], box = new THREE.Box3(), corners = [];
  scene.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld);
    const c = box.getCenter(V()), s = box.getSize(V());
    corners.length = 0;
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) corners.push(V(x, y));
    const within = (p, r) => corners.every(q => q.distanceTo(p) < r);
    const key = o.material.name;
    const frameMat = key === 'rama' || key === 'orange.metal';
    // Laufrad: Reifen-Teile (auch die Laufflaechen-Segmente) + alles, was mittig um die Nabe sitzt.
    // Die Bremsen liegen knapp ausserhalb von 0,665 und bleiben stehen.
    const tyre = /^wheel\./.test(key) || key === 'seat.skin' && s.x > 1;
    const nearHub = h => !frameMat && (tyre && Math.sign(c.x) === Math.sign(h.x) ||
      within(h, WHEEL_REACH) && V(c.x, c.y).distanceTo(h) < .665 || V(c.x, c.y).distanceTo(h) < .06);
    let group;
    if (nearHub(HUB_F)) group = 'wheelF';
    else if (nearHub(HUB_R)) group = 'wheelR';
    else if (!frameMat && within(BB, CRANK_REACH) && Math.abs(c.z) > .05) group = 'crank';
    else if (frameMat && c.x > .8 && c.y < 1.6) group = 'fork';
    else if (frameMat && c.y < 1.9) group = 'frame';
    else group = 'loose';
    items.push({ geo: o.geometry, matrix: o.matrixWorld.clone(), key, group, c, s, name: o.name });
  });
  // Bodenkontakt: unterste Reifenkante auf y = 0
  const minY = Math.min(...items.filter(i => i.group === 'wheelF' || i.group === 'wheelR').map(i => i.c.y - i.s.y / 2));
  return { items, minY };
}

/* ---------------- Materialien (einmal pro Studio) ---------------- */
let MM = null;
function modelMaterials(M) {
  if (MM) return MM;
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  const rubber = S({ color: 0x141416, roughness: .82, metalness: 0 });
  MM = {
    rama: M.paint,
    'orange.metal': M.paint,
    'metal.black': P({ color: 0x0f1013, metalness: .45, roughness: .3, clearcoat: .7, clearcoatRoughness: .2 }),
    'metal.silver': S({ color: 0xb9bec6, metalness: 1, roughness: .32 }),
    'metal.silver2': S({ color: 0x5b6069, metalness: 1, roughness: .26 }),
    'seat.skin': S({ color: 0x18191c, roughness: .74, metalness: 0 }),
    'seat.plastic': S({ color: 0x15161a, roughness: .55, metalness: .1 }),
    Blue: M.carbon,
    'wheel.black': rubber,
    'light.orange': S({ color: 0xff6a1a, roughness: .5, emissive: 0x401000 }),
    'spitsi1.004__0': M.spoke,
    rim: P({ color: 0x101114, metalness: .3, roughness: .28, clearcoat: 1, clearcoatRoughness: .12 }),
    tyreBlack: S({ color: 0x1a1b1e, roughness: .78, metalness: 0 }),
    tyreTan: S({ color: 0xb98a55, roughness: .72, metalness: 0 }),
  };
  return MM;
}

/* ---------------- Ein Bike aus der Vorlage bauen ---------------- */
// gleiche Rueckgabe wie buildBike(): { root, parts, anchors, focus, spin, count, size, shared }
export function buildModelBike(tpl, opt, M) {
  const mats = modelMaterials(M);
  const s = SCALE, root = new THREE.Group(), inner = new THREE.Group();
  root.add(inner);
  inner.scale.setScalar(s);                 // alles darunter in Modell-Einheiten
  inner.position.y = -tpl.minY * s;
  const parts = [], anchors = {}, wheelSpin = [], crankSpin = [];
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // deterministisch: jedes Bike explodiert gleich
  // Teil: Gruppe an Position base, fliegt entlang dir um amt (Meter) – Explosion skaliert mit 1/s in Modell-Einheiten
  const part = (parent, base, dir, amt, delay = 0, tag = '') => {
    const g = new THREE.Group(); g.position.copy(base); parent.add(g);
    parts.push({ node: g, base: base.clone(), dir: dir.clone().normalize(), amt: amt / s, delay, tag,
      rot: V(rnd() - .5, rnd() - .5, rnd() - .5).multiplyScalar(1.2) });
    return g;
  };
  const tyreMat = opt.wheels === 'tan' ? mats.tyreTan : mats.tyreBlack;
  const pos = V(), quat = new THREE.Quaternion(), scl = V();
  const add = (it, parent, origin) => {
    let mat = mats[it.key] || mats['metal.black'];
    if (it.key === 'wheel.orange') mat = it.s.x > 1 ? tyreMat : M.red;   // Reifenflanke bzw. Sattel-Akzent
    if (it.key === 'metal.black' && it.s.x > 1.3) mat = mats.rim;
    if (it.key === 'metal.black' && /^wheel/.test(it.group) && Math.abs(it.s.x - .3) < .02) mat = mats['metal.silver2'];   // Nabenkoerper
    const m = new THREE.Mesh(it.geo, mat);
    it.matrix.decompose(pos, quat, scl);
    m.position.copy(pos).sub(origin); m.quaternion.copy(quat); m.scale.copy(scl);
    m.castShadow = Math.max(it.s.x, it.s.y) > .2;
    parent.add(m);
    return m;
  };
  const by = g => tpl.items.filter(i => i.group === g);

  // Rahmen bleibt stehen, alles andere fliegt raeumlich auseinander (auch auf die Kamera zu)
  const F = part(inner, V(-.2, 1.25), V(0, 1, 0), 0);
  by('frame').forEach(it => add(it, F, F.position));
  const FK = part(inner, V(.97, 1.19), V(1, -.15, .35), .16, .06);
  by('fork').forEach(it => add(it, FK, FK.position));

  // Laufraeder: Nabe als Drehpunkt; Speichen, Reifen und Nabenteile spreizen sich zusaetzlich auf
  const wheel = (g, hub, dir, delay) => {
    const W = part(inner, hub, dir, .34, delay, 'wheel');
    const spin = new THREE.Group(); W.add(spin); wheelSpin.push(spin);
    by(g).forEach(it => {
      const rel = V(it.c.x - hub.x, it.c.y - hub.y, it.c.z);
      const tyre = it.key === 'wheel.black' || it.key === 'wheel.orange' || it.key === 'seat.skin' && it.s.x > 1;
      const rim = it.key === 'metal.black' && it.s.x > 1.3, spoke = /spitsi/.test(it.name) || it.key === 'spitsi1.004__0';
      let d, a;
      if (tyre || rim) { d = V(0, 0, 1); a = tyre ? .05 : 0; }
      else if (spoke) { d = V(rel.x, rel.y, rel.z * 4); a = .035 + rnd() * .03; }
      else { d = V(rel.x * .2, rel.y * .2, Math.sign(rel.z || 1)); a = .05 + rnd() * .05; }
      const sub = part(spin, rel, d, a, delay + .05 + rnd() * .1);
      add(it, sub, V(it.c.x, it.c.y, it.c.z));
    });
    return W;
  };
  const WF = wheel('wheelF', HUB_F, V(1, -.05, .55), .1);
  const WR = wheel('wheelR', HUB_R, V(-1, -.05, -.45), .12);

  // Kurbel: dreht um das Tretlager, Pedale und Schrauben fliegen einzeln
  const CK = part(inner, BB, V(.1, -.55, 1), .3, .08);
  const ckSpin = new THREE.Group(); CK.add(ckSpin); crankSpin.push(ckSpin);
  by('crank').forEach(it => {
    const rel = V(it.c.x - BB.x, it.c.y - BB.y, it.c.z);
    const small = Math.max(it.s.x, it.s.y) < .1;
    const sub = part(ckSpin, rel, V(rel.x * .4, rel.y * .4, Math.sign(rel.z)), small ? .08 + rnd() * .06 : .05, .14 + rnd() * .1);
    add(it, sub, V(it.c.x, it.c.y, it.c.z));
  });

  // Rest (Cockpit, Bremsen, Sattel, Kette, Zuege): jedes Teil einzeln, radial vom Bike-Zentrum weg
  const mid = V(-.1, 1.15);
  by('loose').forEach(it => {
    const rel = V(it.c.x - mid.x, it.c.y - mid.y, 0);
    const side = it.c.z > .02 ? 1 : it.c.z < -.02 ? -1 : (rnd() > .5 ? 1 : -1);
    const d = rel.normalize().add(V((rnd() - .5) * .5, (rnd() - .5) * .3, side * (.7 + rnd() * .6)));
    if (d.y > 0) d.y *= .45;   // nicht in die grosse Ueberschrift fliegen
    const chain = it.s.x > 1;
    const p = part(inner, it.c, chain ? V(-.15, -.6, 1) : d, chain ? .28 : .17 + rnd() * .15, .04 + rnd() * .16);
    add(it, p, it.c);
  });

  // HUD-Anker (Modell-Einheiten, im jeweiligen Teil)
  const anchor = (name, parent, p) => { const o = new THREE.Object3D(); o.position.copy(p).sub(parent.position); parent.add(o); anchors[name] = o; };
  anchor('frame', F, V(.05, 1.68, .05));
  anchor('drive', CK, V(BB.x - .2, BB.y + .12, .12));   // Kettenblatt-Zaehne (das Modell hat kein Schaltwerk)
  anchor('wheel', WF, V(HUB_F.x + .715 * Math.cos(.9), HUB_F.y + .715 * Math.sin(.9), .04));
  anchor('cockpit', F, V(STEM.x, STEM.y, .04));

  const toRoot = p => V(p.x * s, (p.y - tpl.minY) * s, (p.z || 0) * s);
  const h = (2.35 - tpl.minY) * s;
  const focus = {
    bike: V(0, h / 2, 0),
    frame: toRoot(BB.clone().lerp(HT_TOP, .5)).add(V(-.06, -.02)),
    drive: toRoot(BB.clone().lerp(HUB_R, .3)).add(V(0, .02, .05)),
    wheel: toRoot(HUB_F),
    cockpit: toRoot(STEM).add(V(.06, -.06)),
  };
  let count = 0;
  root.traverse(o => { if (o.isMesh) count++; });
  return { root, parts, anchors, focus, spin: { wheels: wheelSpin, crank: crankSpin }, count, shared: true,
    size: { len: (HUB_F.x - HUB_R.x + 1.59) * s, h } };
}
