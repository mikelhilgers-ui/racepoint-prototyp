/* =====================================================================
   RACEPOINT · 17 · BEST OF — drehbares 3D-Rennrad (THROWAWAY)
   „Road Bike“ von tanity (Sketchfab), CC BY 4.0 – assets/models/road-bike.LICENSE.txt
   - ES-Modul (Import-Map wie v9-3d-studio.html), stellt window.RP17Bike3D
     bereit und meldet sich per Event „rp17:3d“
   - mount(el, opt) -> Promise<ctl>; ctl.setColor(hex) · setTyres('tan'|'black')
     · setActive(bool) · dispose()
   - sanfte Eigendrehung, Ziehen dreht (horizontal = Gieren, vertikal begrenzt),
     mit Traegheit; touch-action: pan-y laesst das Seiten-Scrollen in Ruhe
   - stromsparend: low-power, Pixelratio <= 1,75, rendert nur sichtbar/aktiv
   Modell: Y oben, faehrt nach +X, Antriebsseite +Z
   ===================================================================== */
import * as THREE from 'three';

const URL_GLB = new URL('../models/road-bike.glb', import.meta.url).href;
const URL_DRACO = new URL('../../vendor/three/addons/libs/draco/gltf/', import.meta.url).href;
const CREDIT = '3D-Modell „Road Bike“ von tanity, CC BY 4.0';
const CREDIT_URL = 'https://sketchfab.com/3d-models/road-bike-cb03b0657fbc4693b59194124ba713db';

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

let pending = null;
function loadModel() {
  if (pending) return pending;
  pending = (async () => {
    const [{ GLTFLoader }, { DRACOLoader }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js')]);
    const draco = new DRACOLoader().setDecoderPath(URL_DRACO);
    try {
      const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(URL_GLB);
      return gltf.scene;
    } finally { draco.dispose(); }
  })();
  pending.catch(() => { pending = null; });
  return pending;
}

function makeMaterials(color, tyres) {
  const P = o => new THREE.MeshPhysicalMaterial(o), S = o => new THREE.MeshStandardMaterial(o);
  const M = {
    paint: P({ color: new THREE.Color(color), metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
    carbon: P({ color: 0x15161a, metalness: 0.4, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    black: P({ color: 0x0f1013, metalness: 0.45, roughness: 0.3, clearcoat: 0.7, clearcoatRoughness: 0.2 }),
    rim: P({ color: 0x101114, metalness: 0.3, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12 }),
    silver: S({ color: 0xb9bec6, metalness: 1, roughness: 0.32 }),
    silver2: S({ color: 0x5b6069, metalness: 1, roughness: 0.26 }),
    saddle: S({ color: 0x18191c, roughness: 0.74 }),
    plastic: S({ color: 0x15161a, roughness: 0.55, metalness: 0.1 }),
    rubber: S({ color: 0x141416, roughness: 0.82 }),
    tyreBlack: S({ color: 0x1a1b1e, roughness: 0.78 }),
    tyreTan: S({ color: 0xb98a55, roughness: 0.72 }),
    accent: S({ color: 0xE83637, roughness: 0.5 }),
    light: S({ color: 0xff6a1a, roughness: 0.5, emissive: 0x401000 }),
    spoke: S({ color: 0x2a2c31, metalness: 0.8, roughness: 0.35 }),
  };
  M.tyre = tyres === 'black' ? M.tyreBlack : M.tyreTan;
  return M;
}

async function mount(el, opt = {}) {
  if (!webglOK()) throw new Error('kein WebGL');
  const { RoomEnvironment } = await import('three/addons/RoomEnvironment.js');
  const src = await loadModel();

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  el.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x221416, 0.5));
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(1.5, 3.2, 2.2); key.castShadow = true;
  key.shadow.mapSize.set(1024, 1024);
  Object.assign(key.shadow.camera, { left: -1.4, right: 1.4, top: 1.4, bottom: -1.4, near: 0.5, far: 8 });
  key.shadow.radius = 6;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xff4a3d, 1.3);
  rim.position.set(-2.5, 1.2, -2.2); scene.add(rim);

  // Modell klonen, einfaerben, auf Boden stellen und auf ~1,8 Einheiten Laenge normieren
  const M = makeMaterials(opt.color || '#E83637', opt.tyres || 'tan');
  const model = src.clone(true);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3(), size = new THREE.Vector3();
  const tyreMeshes = [];
  model.traverse(o => {
    if (!o.isMesh) return;
    o.geometry.computeBoundingBox();
    box.copy(o.geometry.boundingBox).applyMatrix4(o.matrixWorld).getSize(size);
    const k = o.material && o.material.name;
    let m = M.black;
    if (k === 'rama' || k === 'orange.metal') m = M.paint;
    else if (k === 'Blue') m = M.carbon;
    else if (k === 'wheel.black') m = M.rubber;
    else if (k === 'wheel.orange') { if (size.x > 1) { m = M.tyre; tyreMeshes.push(o); } else m = M.accent; }
    else if (k === 'metal.black') m = size.x > 1.3 ? M.rim : M.black;
    else if (k === 'metal.silver') m = M.silver;
    else if (k === 'metal.silver2') m = M.silver2;
    else if (k === 'seat.skin') m = size.x > 1 ? M.rubber : M.saddle;
    else if (k === 'seat.plastic') m = M.plastic;
    else if (k === 'light.orange') m = M.light;
    else if (k === 'spitsi1.004__0') m = M.spoke;
    o.material = m;
    o.castShadow = Math.max(size.x, size.y) > 0.2;
  });
  const bb = new THREE.Box3().setFromObject(model), bs = bb.getSize(new THREE.Vector3()), bc = bb.getCenter(new THREE.Vector3());
  const k = 1.8 / bs.x;
  const holder = new THREE.Group();
  model.position.set(-bc.x, -bb.min.y, -bc.z);
  holder.add(model);
  holder.scale.setScalar(k);
  const pivot = new THREE.Group();
  pivot.add(holder);
  scene.add(pivot);
  const H = bs.y * k;

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.ShadowMaterial({ opacity: 0.45 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  scene.add(ground);

  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  const target = new THREE.Vector3(0, H * 0.5, 0);
  function resize() {
    const w = Math.max(1, el.clientWidth), h = Math.max(1, el.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Bike passt in Breite und Hoehe, plus Luft fuer die Drehung
    const fit = Math.max(2.15 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect), (H * 1.6) / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))));
    camera.position.set(0, H * 0.62, fit * (opt.zoom || 1));
    camera.lookAt(target);
    camera.updateProjectionMatrix();
    dirty = true;
  }

  // Drehung: Eigenbewegung + Ziehen mit Traegheit
  const st = { yaw: 0, pitch: 0, vy: 0, vp: 0, user: 0, t: 0, drag: false };
  const base = opt.baseYaw != null ? opt.baseYaw : -0.32;
  let dirty = true, active = true, visible = true, raf = 0, last = 0, ptr = null;
  const cv = renderer.domElement;
  el.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, on: e.pointerType === 'mouse' };
    if (ptr.on) { el.setPointerCapture(e.pointerId); st.drag = true; }
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
    st.vy = mx * 0.009; st.vp = my * 0.006;
    st.yaw += st.vy; st.pitch = THREE.MathUtils.clamp(st.pitch + st.vp, -0.28, 0.32);
    st.user = 1; dirty = true;
    if (hint) hint.classList.add('gone');
  });
  const up = e => { if (ptr && e.pointerId === ptr.id) { ptr = null; st.drag = false; } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);

  // Hinweis + Lizenz sichtbar
  let hint = null;
  if (opt.hint !== false) {
    hint = document.createElement('span');
    hint.className = 'hint3d'; hint.textContent = '↻ Ziehen zum Drehen';
    el.appendChild(hint);
  }
  const cr = document.createElement('a');
  cr.className = 'credit3d'; cr.href = CREDIT_URL; cr.target = '_blank'; cr.rel = 'noopener'; cr.textContent = CREDIT;
  el.appendChild(cr);

  const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    raf = 0;
    if (!active || !visible) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    st.t += dt;
    if (!st.drag) {
      st.vy *= 0.93; st.vp *= 0.9;
      st.yaw += st.vy; st.pitch = THREE.MathUtils.clamp(st.pitch + st.vp, -0.28, 0.32);
      st.pitch *= 0.985; // langsam zurueck in die Seitenansicht
      st.user = Math.max(0, st.user - dt * 0.25);
    }
    // Eigenbewegung: sanftes Pendeln (oder Drehteller), nimmt nach Nutzer-Eingriff ab
    const auto = rm ? 0 : (opt.turntable ? st.t * 0.25 : Math.sin(st.t * 0.45) * 0.42);
    pivot.rotation.y = base + auto * (1 - st.user) + st.yaw;
    pivot.rotation.x = st.pitch;
    renderer.render(scene, camera);
    dirty = false;
    if (!rm || st.drag || Math.abs(st.vy) > 1e-4 || dirty) raf = requestAnimationFrame(frame);
  }
  const kick = () => { if (!raf && active && visible) { last = 0; raf = requestAnimationFrame(frame); } };
  el.addEventListener('pointerdown', kick);
  el.addEventListener('pointermove', () => { if (st.drag) kick(); });
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; kick(); });
  io.observe(el);
  const ro = new ResizeObserver(() => { resize(); kick(); });
  ro.observe(el);
  resize();
  renderer.render(scene, camera);
  kick();

  const ctl = {
    el, credit: CREDIT,
    setColor(hex) { M.paint.color.set(hex); dirty = true; if (!raf) renderer.render(scene, camera); },
    setTyres(t) { const m = t === 'black' ? M.tyreBlack : M.tyreTan; tyreMeshes.forEach(o => { o.material = m; }); if (!raf) renderer.render(scene, camera); },
    setActive(on) { active = !!on; if (active) kick(); },
    render() { renderer.render(scene, camera); },
    dispose() {
      active = false; io.disconnect(); ro.disconnect(); cancelAnimationFrame(raf);
      renderer.dispose(); Object.values(M).forEach(m => m.dispose && m.dispose());
      cv.remove(); if (hint) hint.remove(); cr.remove();
    },
  };
  return ctl;
}

window.RP17Bike3D = { mount, webglOK, credit: CREDIT, creditUrl: CREDIT_URL };
window.dispatchEvent(new Event('rp17:3d'));
