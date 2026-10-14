/* =====================================================================
   RACEPOINT · 17 · BEST OF — drehbares 3D-Bike (THROWAWAY)
   Nutzt das prozedurale, moderne Bike aus Prototyp 9 (assets/v9/bike.js:
   buildBike / makeMaterials / PAINTS, nur gelesen – Scheibenbremsen, tiefe
   Carbonfelgen, Tan-Wall). Typen: rennrad · gravel · mtb · ebike.
   - ES-Modul (Import-Map wie v9-3d-studio.html), stellt window.RP17Bike3D
     bereit und meldet sich per Event „rp17:3d“
   - mount(el, opt) -> Promise<ctl>
       opt: { type, paint (PAINTS-Schluessel), tyres 'tan'|'black', baseYaw, hint }
       ctl: setPaint(k) · setTyres(t) · setType(t) · setActive(bool) · dispose()
   - sanftes Pendeln, Ziehen dreht (horizontal = Gieren, vertikal begrenzt),
     mit Traegheit; touch-action: pan-y laesst das Seiten-Scrollen in Ruhe
   - stromsparend: low-power, Pixelratio <= 1,75, rendert nur sichtbar/aktiv
   ===================================================================== */
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/RoomEnvironment.js';
import { PAINTS, makeMaterials, buildBike, disposeBike } from '../v9/bike.js';

const DEG = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}
function radialTex(stops, size = 256) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  stops.forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

async function mount(el, opt = {}) {
  if (!webglOK()) throw new Error('kein WebGL');
  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cfg = { type: opt.type || 'rennrad', paint: opt.paint || 'rot', tyres: opt.tyres || 'tan' };

  /* ---------------- Renderer, Umgebung, Licht (angelehnt an das V9-Studio) ---------------- */
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x000000, 0);
  const cv = renderer.domElement;
  cv.setAttribute('aria-hidden', 'true');
  el.appendChild(cv);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer), room = new RoomEnvironment();
  room.traverse(o => { if (o.isMesh && o.material.side === THREE.BackSide) o.material.color.setScalar(0.28); });
  const strip = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color(0xE83637).multiplyScalar(36) }));
  strip.position.set(3, 5, -12); strip.scale.set(16, 0.45, 0.1);
  room.add(strip);
  scene.environment = pmrem.fromScene(room, 0.035).texture;
  scene.environmentIntensity = 0.85;
  room.dispose(); pmrem.dispose();

  const key = new THREE.DirectionalLight(0xffffff, 2.3);
  key.position.set(-1.4, 3.4, 2.1);
  key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 9 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.012;
  const rim = new THREE.DirectionalLight(0xff3537, 3.2); rim.position.set(1.7, 1.5, -2.8);
  const rim2 = new THREE.DirectionalLight(0xff4a3c, 1.3); rim2.position.set(-2.6, 0.9, -1.9);
  const fill = new THREE.DirectionalLight(0xbfd0ff, 0.55); fill.position.set(2.8, 1.1, 2.4);
  scene.add(key, rim, rim2, fill, new THREE.HemisphereLight(0xffffff, 0x0b0c0e, 0.3));

  const flat = m => { m.rotation.x = -Math.PI / 2; return m; };
  const pool = flat(new THREE.Mesh(new THREE.CircleGeometry(2.4, 96), new THREE.MeshBasicMaterial({
    map: radialTex([[0, 'rgba(255,255,255,.10)'], [0.45, 'rgba(255,255,255,.035)'], [1, 'rgba(255,255,255,0)']]), transparent: true, depthWrite: false })));
  scene.add(pool);
  const catcher = flat(new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.5 })));
  catcher.position.y = 0.001; catcher.receiveShadow = true; scene.add(catcher);
  const ring = flat(new THREE.Mesh(new THREE.RingGeometry(1.06, 1.066, 160), new THREE.MeshBasicMaterial({ color: 0xE83637, transparent: true, opacity: 0.45, depthWrite: false })));
  ring.position.y = 0.003; scene.add(ring);

  const pivot = new THREE.Group(); scene.add(pivot);
  const contact = flat(new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: radialTex([[0, 'rgba(0,0,0,.8)'], [0.55, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false })));
  contact.position.y = 0.002; pivot.add(contact);

  /* ---------------- Bike ---------------- */
  const M = makeMaterials();
  let bike = null;
  const wheelsOpt = () => (cfg.tyres === 'tan' ? 'tan' : 'tief');
  function applyPaint(k, instant) {
    const p = PAINTS[k] || PAINTS.rot, c = new THREE.Color(p.color), dc = new THREE.Color(p.decal);
    const g = window.gsap, d = instant || rm || !g ? 0 : 0.8;
    if (!d) {
      M.paint.color.copy(c); M.decal.color.copy(dc);
      Object.assign(M.paint, { metalness: p.metalness, roughness: p.roughness, clearcoatRoughness: p.clearcoatRoughness, iridescence: p.iridescence, bumpScale: p.bump * 1.4 });
      M.paint.userData.flip.value = p.flip;
      return;
    }
    g.to(M.paint.color, { r: c.r, g: c.g, b: c.b, duration: d, ease: 'power2.inOut', overwrite: true, onUpdate: kick });
    g.to(M.paint, { metalness: p.metalness, roughness: p.roughness, clearcoatRoughness: p.clearcoatRoughness, iridescence: p.iridescence, bumpScale: p.bump * 1.4, duration: d, ease: 'power2.inOut', overwrite: true });
    g.to(M.decal.color, { r: dc.r, g: dc.g, b: dc.b, duration: d, overwrite: true });
    g.to(M.paint.userData.flip, { value: p.flip, duration: d, ease: 'power2.inOut', overwrite: true });
  }
  function build() {
    if (bike) disposeBike(bike);
    bike = buildBike(cfg.type, { wheels: wheelsOpt(), paint: cfg.paint }, M);
    bike.root.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
    pivot.add(bike.root);
    contact.scale.set(bike.size.len * 1.08, 0.44, 1);
    resize();
  }

  /* ---------------- Kamera ---------------- */
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 60);
  function resize() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    if (!bike) return;
    const tanH = Math.tan(camera.fov * DEG / 2), len = bike.size.len, hh = bike.size.h;
    const fit = opt.fit || 0.9;
    const dist = Math.max((hh * 0.62) / tanH, (len * 0.56) / (tanH * camera.aspect)) / fit;
    const el2 = 0.1;
    camera.position.set(0, hh * 0.5 + Math.sin(el2) * dist, Math.cos(el2) * dist);
    camera.lookAt(0, hh * 0.46, 0);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  /* ---------------- Drehen: Eigenbewegung + Ziehen mit Traegheit ---------------- */
  const st = { yaw: 0, pitch: 0, vy: 0, vp: 0, user: 0, t: 0, drag: false };
  const base = opt.baseYaw != null ? opt.baseYaw : -0.35;
  let dirty = true, active = true, visible = true, raf = 0, last = 0, ptr = null, hint = null;
  el.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, on: e.pointerType === 'mouse' };
    if (ptr.on) { el.setPointerCapture(e.pointerId); st.drag = true; kick(); }
  });
  el.addEventListener('pointermove', e => {
    if (!ptr || e.pointerId !== ptr.id) return;
    const dx = e.clientX - ptr.x, dy = e.clientY - ptr.y;
    if (!ptr.on) {
      // Touch: nur klar horizontale Gesten uebernehmen, sonst scrollt die Seite
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dx) > Math.abs(dy) * 1.2) { ptr.on = true; st.drag = true; try { el.setPointerCapture(e.pointerId); } catch (_) { /* egal */ } }
      else { ptr = null; return; }
    }
    const mx = e.clientX - ptr.lx, my = e.clientY - ptr.ly;
    ptr.lx = e.clientX; ptr.ly = e.clientY;
    st.vy = mx * 0.009; st.vp = my * 0.005;
    st.yaw += st.vy; st.pitch = clamp(st.pitch + st.vp, -0.22, 0.3);
    st.user = 1; dirty = true;
    if (hint) hint.classList.add('gone');
    kick();
  });
  const up = e => { if (ptr && e.pointerId === ptr.id) { ptr = null; st.drag = false; } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  if (opt.hint !== false) {
    hint = document.createElement('span');
    hint.className = 'hint3d'; hint.textContent = '↻ Ziehen zum Drehen';
    el.appendChild(hint);
  }

  function frame(now) {
    raf = 0;
    if (!active || !visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    st.t += dt;
    if (!st.drag) {
      st.vy *= 0.93; st.vp *= 0.9;
      st.yaw += st.vy; st.pitch = clamp(st.pitch + st.vp, -0.22, 0.3);
      st.pitch *= 0.985;                       // langsam zurueck in die Seitenansicht
      st.user = Math.max(0, st.user - dt * 0.25);
    }
    const auto = rm ? 0 : Math.sin(st.t * 0.42) * 0.45;   // sanftes Pendeln
    pivot.rotation.y = base + auto * (1 - st.user) + st.yaw;
    pivot.rotation.x = st.pitch;
    renderer.render(scene, camera);
    dirty = false;
    const moving = st.drag || Math.abs(st.vy) > 1e-4 || Math.abs(st.vp) > 1e-4;
    if (!rm || moving) raf = requestAnimationFrame(frame);
  }
  function kick() {
    if (!active || !visible) return;
    if (!raf) { last = 0; raf = requestAnimationFrame(frame); }
  }
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); });
  io.observe(el);
  const ro = new ResizeObserver(() => { resize(); kick(); });
  ro.observe(el);

  applyPaint(cfg.paint, true);
  build();
  renderer.render(scene, camera);
  kick();

  return {
    el,
    setPaint(k) { cfg.paint = k; applyPaint(k); kick(); if (rm) renderer.render(scene, camera); },
    setTyres(t) { if (t === cfg.tyres) return; cfg.tyres = t; build(); kick(); renderer.render(scene, camera); },
    setType(t) { if (t === cfg.type) return; cfg.type = t; build(); kick(); renderer.render(scene, camera); },
    setActive(on) { active = !!on; if (active) kick(); },
    dispose() {
      active = false; io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf);
      if (bike) disposeBike(bike);
      renderer.dispose(); cv.remove(); if (hint) hint.remove();
    },
  };
}

window.RP17Bike3D = { mount, webglOK, PAINTS };
window.dispatchEvent(new Event('rp17:3d'));
