/* =====================================================================
   RACEPOINT · 9 · 3D-Studio · Szene, Licht, Kamera, Render-Loop (THROWAWAY)
   - Dunkles Studio: RoomEnvironment (abgedunkelt + roter Lichtstreifen),
     Key-Light mit Schatten, rotes Kantenlicht, Bodenkegel, Drehteller-Ring
   - Kamera-Stationen werden in einen Layout-"Slot" eingepasst
     (Lens-Shift ueber die Projektionsmatrix, keine Verzerrung)
   - Teile-Engine: Explosion (Scroll) + Typwechsel (Teile fliegen raus/rein)
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { GEO, PAINTS, makeMaterials, buildBike, disposeBike } from './bike.js';

const gsap = window.gsap;
const TAU = Math.PI * 2, DEG = Math.PI / 180;
const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));
const clamp01 = t => Math.max(0, Math.min(1, t));
const ease = t => (t < .5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

// Radialer Verlauf als Textur (Bodenlicht, Kontaktschatten)
function radialTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createStudio(canvas, { small = false, reduced = false } = {}) {
  /* ---------------- Renderer ---------------- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.5 : 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = !small;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0c0e, 6, 15);

  /* ---------------- Umgebung + Licht ---------------- */
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  room.traverse(o => { if (o.isMesh && o.material.side === THREE.BackSide) o.material.color.setScalar(.28); });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xE83637).multiplyScalar(36) }));
  strip.position.set(3, 5, -12); strip.scale.set(16, .45, .1);
  room.add(strip);
  scene.environment = pmrem.fromScene(room, .035).texture;
  scene.environmentIntensity = .8;
  room.dispose(); pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-1.4, 3.4, 2.1);
  if (!small) {
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: .5, far: 9 });
    key.shadow.bias = -.0004; key.shadow.normalBias = .012;
  }
  const rim = new THREE.DirectionalLight(0xff3537, 3.4); rim.position.set(1.7, 1.5, -2.8);
  const rim2 = new THREE.DirectionalLight(0xff4a3c, 1.4); rim2.position.set(-2.6, .9, -1.9);
  const fill = new THREE.DirectionalLight(0xbfd0ff, .5); fill.position.set(2.8, 1.1, 2.4);
  scene.add(key, rim, rim2, fill, new THREE.HemisphereLight(0xffffff, 0x0b0c0e, .25));

  /* ---------------- Boden: Lichtkegel, Schatten, Drehteller ---------------- */
  const floor = new THREE.Group(); scene.add(floor);
  const flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const pool = flat(new THREE.Mesh(new THREE.CircleGeometry(3.2, 96), new THREE.MeshBasicMaterial({
    map: radialTex([[0, 'rgba(255,255,255,.11)'], [.42, 'rgba(255,255,255,.04)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthWrite: false })));
  floor.add(pool);
  if (!small) {
    const catcher = flat(new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: .55 })));
    catcher.position.y = .001; catcher.receiveShadow = true; floor.add(catcher);
  }
  const ringMat = new THREE.MeshBasicMaterial({ color: 0xE83637, transparent: true, opacity: .5, depthWrite: false });
  const ring = flat(new THREE.Mesh(new THREE.RingGeometry(1.14, 1.146, 192), ringMat)); ring.position.y = .003; floor.add(ring);
  const tickG = new THREE.PlaneGeometry(.0045, 1); tickG.rotateX(-Math.PI / 2);
  const ticks = new THREE.InstancedMesh(tickG, new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .2, depthWrite: false }), 120);
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion();
  for (let i = 0; i < 120; i++) {
    const a = i / 120 * TAU, len = i % 10 ? .028 : .07, r = 1.19 + len / 2;
    q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2 - a);
    ticks.setMatrixAt(i, m4.compose(new THREE.Vector3(r * Math.cos(a), .003, r * Math.sin(a)), q, new THREE.Vector3(1, 1, len)));
  }
  floor.add(ticks);
  const pulseMat = new THREE.MeshBasicMaterial({ color: 0xE83637, transparent: true, opacity: 0, depthWrite: false });
  const pulseRing = flat(new THREE.Mesh(new THREE.RingGeometry(.96, 1, 128), pulseMat)); pulseRing.position.y = .004; floor.add(pulseRing);

  /* ---------------- Drehteller + Bike ---------------- */
  const turntable = new THREE.Group(), holder = new THREE.Group();
  scene.add(turntable); turntable.add(holder);
  const contact = flat(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: radialTex([[0, 'rgba(0,0,0,.8)'], [.55, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })));
  contact.position.y = .002; holder.add(contact);

  const M = makeMaterials();
  const cfg = { type: 'rennrad', paint: 'rot', wheels: 'tief' };
  const bikes = [];
  let bike = null;
  function spawn() {
    const b = buildBike(cfg.type, cfg, M);
    b.parts.forEach(p => { p.m = 0; });
    holder.add(b.root); bikes.push(b);
    contact.scale.set(b.size.len * 1.08, .44, 1);
    return b;
  }
  function retire(b) { disposeBike(b); bikes.splice(bikes.indexOf(b), 1); }
  bike = spawn();

  /* ---------------- Zustand (wird von der Seite gesetzt) ---------------- */
  const state = {
    explode: 0,      // 0..1 Explosionsansicht (Scroll)
    pedal: 0,        // Kurbel rad/s (Kapitel Antrieb)
    wheel: 0,        // zusaetzlicher Laufrad-Dreh rad/s (Kapitel Laufraeder)
    sway: 1,         // Pendeln im Hero
    spin: 0,         // Drehteller im Konfigurator
    active: true,    // rendern ja/nein
  };
  const rot = { spin: 0, user: 0, vel: 0, drag: false, x: 0, t: 0, time: 0 };
  let wheelAngle = 0, crankAngle = 0;

  /* ---------------- Kamera mit Lens-Shift ---------------- */
  const camera = new THREE.PerspectiveCamera(30, 1, .05, 60);
  const cam = { az: .4, el: .08, dist: 4.5, tx: 0, ty: .5, tz: 0, sx: 0, sy: 0 }, goal = { ...cam };
  let vw = 1, vh = 1;
  const v3 = new THREE.Vector3();

  // Station in einen Bildschirm-Slot einpassen: ext = halbe Ausdehnung des Motivs in m
  function frame({ az, el, focus, ext, fill = .9 }, rect) {
    // Gesamtansichten: hoehere/laengere Bikes (MTB, E-Bike) kleiner einpassen, damit sie die Headline nicht verdecken
    if (focus === 'bike') { const k = Math.max(1, bike.size.h / 1.0, bike.size.len / 1.7); ext = [ext[0] * k, ext[1] * k]; }
    const s = holder.scale.x, tanH = Math.tan(camera.fov * DEG / 2), aspect = vw / vh;
    const hs = Math.max(.05, rect.h / vh), ws = Math.max(.05, rect.w / vw);
    const dist = Math.max(ext[1] * s / (hs * tanH), ext[0] * s / (ws * tanH * aspect)) / fill;
    v3.copy(bike.focus[focus] || bike.focus.bike).multiplyScalar(s).applyAxisAngle(new THREE.Vector3(0, 1, 0), turntable.rotation.y);
    return { az, el, dist, tx: v3.x, ty: v3.y, tz: v3.z, sx: (rect.x + rect.w / 2) / vw * 2 - 1, sy: 1 - (rect.y + rect.h / 2) / vh * 2 };
  }
  const setGoal = g => Object.assign(goal, g);
  const snap = () => Object.assign(cam, goal);

  function updateCamera(dt) {
    const k = reduced ? 60 : 4.2;
    for (const key in goal) cam[key] = damp(cam[key], goal[key], k, dt);
    // Nebel wandert mit: der Boden verlaeuft weich ins Dunkel, das Bike bleibt immer klar
    scene.fog.near = cam.dist + 1.2; scene.fog.far = cam.dist + 9;
    const ce = Math.cos(cam.el);
    camera.position.set(cam.tx + cam.dist * Math.sin(cam.az) * ce, cam.ty + cam.dist * Math.sin(cam.el), cam.tz + cam.dist * Math.cos(cam.az) * ce);
    camera.lookAt(cam.tx, cam.ty, cam.tz);
    camera.updateProjectionMatrix();
    const e = camera.projectionMatrix.elements;
    e[8] = -cam.sx; e[9] = -cam.sy;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  }

  /* ---------------- Ziehen zum Drehen (mit Traegheit) ---------------- */
  let onDrag = null;
  canvas.addEventListener('pointerdown', e => {
    if (e.button > 0) return;
    rot.drag = true; rot.x = e.clientX; rot.t = performance.now(); rot.vel = 0;
    if (e.pointerType === 'mouse') canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!rot.drag) return;
    const now = performance.now(), dx = (e.clientX - rot.x) * .0085;
    rot.user += dx; rot.vel = dx / Math.max(.008, (now - rot.t) / 1000);
    rot.x = e.clientX; rot.t = now;
    if (Math.abs(dx) > .02 && onDrag) { onDrag(); onDrag = null; }
  });
  const release = () => { rot.drag = false; if (performance.now() - rot.t > 90) rot.vel = 0; };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  /* ---------------- Teile bewegen: Explosion + Morph ---------------- */
  function applyParts(b) {
    const E = state.explode;
    for (const p of b.parts) {
      const le = ease(clamp01((E - p.delay) / .76)), m = p.m;
      p.node.position.copy(p.base).addScaledVector(p.dir, p.amt * (le + 1.9 * m));
      p.node.scale.setScalar(Math.max(.001, 1 - m));
      p.node.rotation.set(p.rot.x * m * 2, p.rot.y * m * 2, p.rot.z * m * 2);
      p.node.visible = m < .995;
    }
  }

  // Neues Bike bauen; filter bestimmt, welche Teile sichtbar raus-/reinfliegen
  function rebuild(filter = () => true) {
    const old = bike, nb = spawn();
    bike = nb;
    if (reduced) { retire(old); return; }
    gsap.killTweensOf(old.parts);
    nb.parts.forEach(p => { p.m = filter(p) ? 1 : 0; });
    old.parts.forEach(p => { if (!filter(p)) p.m = 1; });
    const outs = old.parts.filter(filter), ins = nb.parts.filter(filter);
    gsap.to(outs, { m: 1, duration: .55, ease: 'power2.in', overwrite: true, stagger: { amount: Math.min(outs.length * .018, .6), from: 'random' }, onComplete: () => retire(old) });
    gsap.to(ins, { m: 0, duration: 1, ease: 'expo.out', delay: .38, stagger: { amount: Math.min(ins.length * .03, .9), from: 'random' } });
    pulse(.3);
  }

  /* ---------------- API: Typ, Lack, Laufraeder, Groesse ---------------- */
  function setType(t) { if (!GEO[t] || t === cfg.type) return; cfg.type = t; rebuild(); }
  function setWheels(w) { if (w === cfg.wheels) return; cfg.wheels = w; rebuild(p => p.tag === 'wheel'); }
  function setPaint(k, instant) {
    const p = PAINTS[k]; if (!p) return;
    cfg.paint = k;
    const d = instant || reduced ? 0 : 1.1, c = new THREE.Color(p.color), dc = new THREE.Color(p.decal);
    gsap.to(M.paint.color, { r: c.r, g: c.g, b: c.b, duration: d, ease: 'power2.inOut', overwrite: true });
    gsap.to(M.paint, { metalness: p.metalness, roughness: p.roughness, clearcoatRoughness: p.clearcoatRoughness, iridescence: p.iridescence,
      bumpScale: p.bump * 1.4, duration: d, ease: 'power2.inOut', overwrite: true });
    gsap.to(M.decal.color, { r: dc.r, g: dc.g, b: dc.b, duration: d, overwrite: true });
    gsap.to(M.paint.userData.flip, { value: p.flip, duration: d, ease: 'power2.inOut', overwrite: true });
  }
  function setSize(s) { gsap.to(holder.scale, { x: s, y: s, z: s, duration: reduced ? 0 : .8, ease: 'power3.out', overwrite: true }); }
  // roter Ring laeuft ueber den Boden (Bestaetigung, z. B. "An Achim gesendet")
  function pulse(delay = 0) {
    if (reduced) return;
    gsap.fromTo(pulseRing.scale, { x: .4, y: .4 }, { x: 1.7, y: 1.7, duration: 1.3, ease: 'expo.out', delay });
    gsap.fromTo(pulseMat, { opacity: .8 }, { opacity: 0, duration: 1.3, ease: 'power2.out', delay });
  }
  // Auftakt: Bike setzt sich beim Laden aus seinen Teilen zusammen
  function intro(delay = 0) {
    if (reduced) return;
    bike.parts.forEach(p => { p.m = 1; });
    gsap.to(bike.parts, { m: 0, duration: 1.5, ease: 'expo.out', delay, stagger: { amount: Math.min(bike.parts.length * .04, 1.1), from: 'random' } });
  }

  /* ---------------- Projektion fuer HUD ---------------- */
  function project(name) {
    const a = bike.anchors[name];
    if (!a) return null;
    a.getWorldPosition(v3).project(camera);
    return { x: (v3.x + 1) / 2 * vw, y: (1 - v3.y) / 2 * vh, behind: v3.z > 1 };
  }

  /* ---------------- Render-Loop (vom gsap.ticker getaktet) ---------------- */
  function tick(dt) {
    if (!state.active || document.hidden) return;
    rot.time += dt;
    // Drehung: Pendeln (Hero), Drehteller (Konfigurator), sonst zurueck in die Seitenansicht
    if (!reduced) {
      if (!rot.drag) { rot.user += rot.vel * dt; rot.vel *= Math.exp(-dt * 3.2); }
      rot.spin += dt * .16 * state.spin;
      const settle = 1 - Math.max(state.spin, state.sway);
      if (settle > .01 && !rot.drag) {
        rot.spin = damp(rot.spin, Math.round(rot.spin / TAU) * TAU, 2.4 * settle, dt);
        rot.user = damp(rot.user, Math.round(rot.user / TAU) * TAU, 2.4 * settle, dt);
      }
      turntable.rotation.y = rot.spin + rot.user + Math.sin(rot.time * .32) * .34 * state.sway;
      ring.rotation.z = ticks.rotation.y = -rot.time * .03;
    }
    // Antrieb: Kurbel treibt Kette, Kassette und Laufraeder an
    const G = GEO[cfg.type], ratio = G.rings[0] / G.cogs[G.cog];
    crankAngle += state.pedal * dt;
    wheelAngle += (state.pedal * ratio + state.wheel) * dt;
    M.chain.map.offset.x += state.pedal * dt * (.0127 / (2 * Math.sin(Math.PI / G.rings[0]))) / .0254;
    for (const b of bikes) {
      b.spin.wheels.forEach(s => { s.rotation.z = -wheelAngle; });
      b.spin.crank.forEach(s => { s.rotation.z = -crankAngle; });
      applyParts(b);
    }
    updateCamera(dt);
    renderer.render(scene, camera);
  }

  function resize() {
    vw = window.innerWidth; vh = window.innerHeight;
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
  }
  resize();

  // Shader vorab kompilieren, damit der erste Frame nicht ruckelt – parallel im Hintergrund, wo der Browser das kann
  const prepare = () => renderer.getContext().getExtension('KHR_parallel_shader_compile')
    ? renderer.compileAsync(scene, camera) : Promise.resolve(renderer.compile(scene, camera));

  // GPU-Kontext verloren (Treiber-Reset, Speicher voll): Seite faellt aufs Foto zurueck
  let onLost = null;
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); state.active = false; if (onLost) onLost(); });

  return {
    cfg, state, M, setType, setWheels, setPaint, setSize, intro, pulse, prepare, frame, setGoal, snap, project, tick, resize,
    get partCount() { return bike.count; },
    set onDrag(fn) { onDrag = fn; },
    set onLost(fn) { onLost = fn; },
  };
}
