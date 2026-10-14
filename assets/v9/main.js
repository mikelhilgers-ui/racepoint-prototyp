/* =====================================================================
   RACEPOINT · PROTOTYP 9 · 3D-STUDIO · Seitenlogik (THROWAWAY)
   1) Smooth Scroll (Lenis), Header, Menue
   2) 3D-Buehne starten – ohne WebGL faellt die Seite aufs Foto zurueck
   3) Kamerafahrt: Stationen auf einer Scroll-Zeitachse (Einheit: vh)
   4) Tour: Kapitel-Panels, HUD-Callout, Explosionsansicht
   5) Konfigurator: Typ, Farbe, Laufraeder, Groesse -> Achim / KI-Berater
   6) Hero-Intro + Inhalte (Achim, Builds, Oeffnungszeiten)
   ===================================================================== */
import { createStudio } from './studio.js';

gsap.registerPlugin(ScrollTrigger, SplitText);
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smoother = t => t * t * t * (t * (t * 6 - 15) + 10);
const reduced = RP.reducedMotion;
const html = document.documentElement;
const mobile = matchMedia('(max-width:760px)');
const flowHero = matchMedia('(max-width:1180px)');   // Hero als Fluss-Layout (Tablet/Handy) statt Overlay

// rp-core uebersetzt erst bei DOMContentLoaded – Texte danach zerlegen (SplitText)
const rpReady = new Promise(r => {
  if (document.querySelector('[data-lang-switch] button')) r();
  else document.addEventListener('DOMContentLoaded', () => r(), { once: true });
});
const textReady = Promise.all([rpReady, document.fonts.ready]);

/* =====================================================================
   1) SMOOTH SCROLL, HEADER, MENUE
   ===================================================================== */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: .1, smoothWheel: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
function goTo(sel) {
  const el = $(sel);
  if (!el) return;
  setMenu(false);
  if (lenis) lenis.scrollTo(el, { duration: 1.8 }); else el.scrollIntoView();
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]');
  if (!a || a.getAttribute('href').length < 2) return;
  e.preventDefault();
  goTo(a.getAttribute('href'));
});

const hdr = $('#hdr');
ScrollTrigger.create({ start: 8, end: 'max', onToggle: s => hdr.classList.toggle('scrolled', s.isActive) });

const burger = $('.burger'), menu = $('#menu');
function setMenu(on) {
  if (menu.hidden === !on) return;
  menu.hidden = !on;
  burger.setAttribute('aria-expanded', String(on));
  burger.setAttribute('aria-label', on ? 'Menü schließen' : 'Menü öffnen');
  if (lenis) on ? lenis.stop() : lenis.start();
  if (on && !reduced) gsap.from($$('nav a, .menu-foot > *', menu), { y: 34, autoAlpha: 0, duration: .7, ease: 'expo.out', stagger: .045 });
}
burger.addEventListener('click', () => setMenu(menu.hidden));
menu.addEventListener('click', e => { if (e.target.closest('a, button')) setMenu(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') setMenu(false); });
mobile.addEventListener('change', () => setMenu(false));

RP.mountPicker('9');

/* =====================================================================
   2) 3D-BUEHNE
   ===================================================================== */
const canvas = $('#studio');
function startStudio() {
  try {
    if (!document.createElement('canvas').getContext('webgl2')) return null;
    return createStudio(canvas, { small: Math.min(innerWidth, innerHeight) < 600, reduced });
  } catch (err) {
    return null;
  }
}
// Export nur fuer Konsole/Tests: import('./assets/v9/main.js').then(m => m.studio)
export const studio = startStudio();
const fallback = () => html.classList.add('no-webgl');
let live = false;   // erst rendern, wenn die Shader fertig sind

if (studio) {
  studio.onLost = fallback;
  studio.onDrag = () => $('.hint').classList.add('gone');
  addEventListener('resize', () => { studio.resize(); measure(); });
  studio.prepare().catch(() => {}).then(() => {
    live = true;
    html.classList.add('stage-ready');
    studio.intro(.15);
  });
} else {
  fallback();
}

/* =====================================================================
   3) KAMERAFAHRT
   Jede Station: Blickwinkel (az/el), Fokus-Teil, halbe Motivgroesse (ext, m)
   und der Layout-Slot, in den das Motiv eingepasst wird.
   Zusaetzlich: Explosion, Kurbel/Laufrad-Drehung, Pendeln, Drehteller.
   ===================================================================== */
const ST = {
  hero:     { slot: 'hero', az: .52,  el: .1,  focus: 'bike',    ext: [.9, .51],  sway: 1 },
  frame:    { slot: 'r',    az: .3,   el: .16, focus: 'frame',   ext: [.52, .37] },
  drive:    { slot: 'l',    az: -.62, el: .2,  focus: 'drive',   ext: [.32, .24], pedal: 4.2 },
  explode:  { slot: 'c',    az: -.1,  el: .3,  focus: 'bike',    ext: [1.2, .84], explode: 1, pedal: 1, portrait: { az: .9, ext: [.8, .9] } },
  explode2: { slot: 'c',    az: .75,  el: .2,  focus: 'bike',    ext: [1.2, .84], explode: 1, portrait: { az: 1.35, ext: [.75, .9] } },
  wheel:    { slot: 'r',    az: .2,   el: .05, focus: 'wheel',   ext: [.4, .4],   wheel: 15 },
  cockpit:  { slot: 'l',    az: -1.3, el: .62, focus: 'cockpit', ext: [.3, .2] },
  config:   { slot: 'cfg',  az: .46,  el: .1,  focus: 'bike',    ext: [.92, .57], spin: 1 },
};
// Fahrplan: [Scroll-Zeit in vh, Station]. 0–100 = Hero rollt raus (das Bike faehrt erst mit dem Hero
// nach oben, dann in die Tour), 100–960 = Tour (gepinnt), 960–1060 = Konfigurator schiebt sich herein.
const TOUR_VH = 960;
const PATH = [[0, 'hero'], [40, 'hero'], [100, 'frame'], [210, 'frame'], [290, 'drive'], [400, 'drive'], [490, 'explode'],
  [610, 'explode2'], [700, 'wheel'], [810, 'wheel'], [890, 'cockpit'], [TOUR_VH, 'cockpit'], [TOUR_VH + 100, 'config']];
// Kapitel-Fenster [ein, aus] in derselben Zeitachse
const CH_T = [[70, 200], [275, 390], [685, 800], [875, 932]];
const EXPLODE_T = [455, 600];

// Slot-Rechtecke relativ zu ihrem Bildschirm-Container (der in der Station oben am Viewport steht)
const SLOTS = { hero: ['.hero-slot', '#top'], r: ['.slot-r', '.tour-sticky'], l: ['.slot-l', '.tour-sticky'],
  c: ['.slot-c', '.tour-sticky'], cfg: ['.cfg-slot', '#konfigurator'] };
const rects = {};
const stageType = $('.stage-type'), stageTypeText = $('.stage-type span');
function measure() {
  for (const k in SLOTS) {
    const [s, box] = SLOTS[k].map(q => $(q).getBoundingClientRect());
    rects[k] = { x: s.left - box.left, y: s.top - box.top, w: s.width, h: s.height };
  }
  // Reduzierte Bewegung: Kapitel sind normale Bloecke, das Bike steht daneben
  if (reduced) {
    const w = innerWidth, h = innerHeight, top = 80, full = { x: 0, y: top, w, h: h - top };
    rects.r = mobile.matches ? full : { x: w * .46, y: top, w: w * .52, h: h - top - 40 };
    rects.l = mobile.matches ? full : { x: w * .02, y: top, w: w * .52, h: h - top - 40 };
    rects.c = full;
  }
  // grosser Modellname sitzt oben im Bike-Bereich des Konfigurators
  const c = rects.cfg;
  Object.assign(stageType.style, { left: c.x + 'px', top: c.y + c.h * .04 + 'px', width: c.w + 'px' });
}
measure();
ScrollTrigger.addEventListener('refreshInit', measure);

const CAM = ['az', 'el', 'dist', 'tx', 'ty', 'tz', 'sx', 'sy'], FX = ['explode', 'pedal', 'wheel', 'sway', 'spin'];
// Im Fluss-Layout ist der Hero hoeher als der Bildschirm: sein Slot (und damit das Bike) scrollt mit nach oben.
// Auf breiten Screens bleibt das Bike stehen, waehrend die Overlay-Bedienelemente ausblenden.
const slotRect = k => k === 'hero' && flowHero.matches ? { ...rects.hero, y: rects.hero.y - scrollY } : rects[k];
// Hochformat: Explosion schraeger von vorn, damit die seitlich fliegenden Teile ins schmale Bild passen
const view = st => studio.frame(st.portrait && innerHeight > innerWidth ? { ...st, ...st.portrait } : st, slotRect(st.slot));
let pageT = 0, rmKey = 'hero';

function steer() {
  let a, b, e = 0;
  if (reduced) a = b = ST[rmKey];
  else {
    let i = 0;
    while (i < PATH.length - 2 && pageT >= PATH[i + 1][0]) i++;
    const [t0, ka] = PATH[i], [t1, kb] = PATH[i + 1];
    a = ST[ka]; b = ST[kb]; e = smoother(clamp((pageT - t0) / (t1 - t0)));
  }
  const va = view(a), vb = a === b ? va : view(b), goal = {};
  CAM.forEach(k => { goal[k] = lerp(va[k], vb[k], e); });
  studio.setGoal(goal);
  FX.forEach(k => { studio.state[k] = lerp(a[k] || 0, b[k] || 0, e); });
}

/* =====================================================================
   4) TOUR: Kapitel, Explosion, Fortschritt, HUD
   ===================================================================== */
const chapters = $$('.chapter');
const explodeTitle = $('.explode-title'), partsEl = $('[data-parts]');
const prog = $('.tour-prog'), progItems = $$('.tour-prog > div');
let tourTl = null, cfgST = null;

if (!reduced) {
  tourTl = gsap.timeline({ defaults: { ease: 'none' },
    scrollTrigger: { trigger: '#tour', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  tourTl.set({}, {}, TOUR_VH);
  chapters.forEach((el, i) => {
    const [tIn, tOut] = CH_T[i];
    tourTl.fromTo(el, { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 32, ease: 'power3.out' }, tIn)
      .fromTo(el.children, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: 22, ease: 'power2.out', stagger: 4 }, tIn + 6);
    tourTl.to(el, { autoAlpha: 0, y: -46, duration: 24, ease: 'power2.in' }, tOut);
  });
  const [eIn, eOut] = EXPLODE_T;
  tourTl.fromTo(explodeTitle, { autoAlpha: 0, scale: .92 }, { autoAlpha: 1, scale: 1, duration: 34, ease: 'power3.out' }, eIn)
    .to(explodeTitle, { autoAlpha: 0, scale: 1.06, duration: 26, ease: 'power2.in' }, eOut)
    .fromTo(prog, { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 24 }, CH_T[0][0])
    .to(prog, { autoAlpha: 0, duration: 16 }, TOUR_VH - 18);
  cfgST = ScrollTrigger.create({ trigger: '#konfigurator', start: 'top bottom', end: 'top top' });
  gsap.fromTo(stageType, { autoAlpha: 0, yPercent: 30 }, { autoAlpha: 1, yPercent: 0, ease: 'none',
    scrollTrigger: { trigger: '#konfigurator', start: 'top 45%', end: 'top top', scrub: true } });
} else {
  // ohne Kamerafahrt: harte Schnitte auf die passende Station, sobald ein Kapitel in der Mitte steht
  const rmCut = (el, key) => ScrollTrigger.create({ trigger: el, start: 'top 60%', end: 'bottom 40%',
    onToggle: s => { if (s.isActive) { rmKey = key; } else if (rmKey === key) rmKey = 'hero'; } });
  ['frame', 'drive', 'wheel', 'cockpit'].forEach((k, i) => rmCut(chapters[i], k));
  rmCut('#konfigurator', 'config');
}

function tourProgress() {
  if (!tourTl) return;
  const starts = CH_T.map(c => c[0]).concat(TOUR_VH);
  progItems.forEach((el, i) => {
    const p = clamp((pageT - starts[i]) / (starts[i + 1] - starts[i]));
    el.style.setProperty('--p', p.toFixed(3));
    el.classList.toggle('on', p > 0 && p < 1);
  });
  if (!studio) return;
  const n = String(Math.round(studio.partCount * smoother(clamp(studio.state.explode))));
  if (partsEl.textContent !== n) partsEl.textContent = n;
}

// HUD: Linie vom 3D-Ankerpunkt zum Panel, pulsierender Punkt, kleines Datenlabel
const HUD = [
  { anchor: 'frame', label: ['01', 'FACT 12r Carbon'] },
  { anchor: 'drive', label: ['02', '12-fach · kabellos'] },
  { anchor: 'wheel', label: ['03', '51 mm Carbon'] },
  { anchor: 'cockpit', label: ['04', 'Züge intern'] },
];
const hud = $('.hud'), hudPath = $('.hud path'), hudTick = $('.hud .cross'), hudLabel = $('.hud-label');
const hudDots = $$('.hud circle');
let hudCur = -1, hudW = 0;
function drawHud() {
  let vis = 0, idx = -1;
  chapters.forEach((el, i) => { const o = +gsap.getProperty(el, 'opacity'); if (o > vis) { vis = o; idx = i; } });
  const p = idx >= 0 && vis > .02 && !reduced ? studio.project(HUD[idx].anchor) : null;
  if (!p || p.behind) { hud.style.opacity = hudLabel.style.opacity = 0; return; }
  if (idx !== hudCur) {
    hudCur = idx;
    hudLabel.firstElementChild.textContent = HUD[idx].label[0];
    hudLabel.lastElementChild.textContent = HUD[idx].label[1];
    hudW = hudLabel.offsetWidth;
  }
  const r = chapters[idx].getBoundingClientRect();
  vis *= clamp(Math.min(r.bottom, innerHeight - r.top) / 120);
  let ex, ey, d;
  if (r.top > p.y + 24) {
    // Panel unter dem Punkt (Mobil): Knick, dann senkrecht auf die Panel-Oberkante
    ex = clamp(p.x, r.left + 32, r.right - 32); ey = r.top;
    const run = Math.min(Math.abs(ex - p.x), Math.max(0, ey - p.y - 24));
    d = `M${p.x},${p.y} L${ex},${p.y + run} L${ex},${ey}`;
    hudTick.setAttribute('x1', ex - 8); hudTick.setAttribute('x2', ex + 8);
    hudTick.setAttribute('y1', ey); hudTick.setAttribute('y2', ey);
  } else {
    // Panel seitlich: 45°-Schraege, dann waagerecht an die Panel-Kante
    const left = r.right < p.x;
    ex = left ? r.right : r.left; ey = clamp(p.y, r.top + 48, r.bottom - 48);
    const dx = ex - p.x, run = Math.min(Math.abs(ey - p.y), Math.max(0, Math.abs(dx) - 36));
    d = `M${p.x},${p.y} L${p.x + Math.sign(dx) * run},${ey} L${ex},${ey}`;
    hudTick.setAttribute('x1', ex); hudTick.setAttribute('x2', ex);
    hudTick.setAttribute('y1', ey - 8); hudTick.setAttribute('y2', ey + 8);
  }
  hudPath.setAttribute('d', d);
  hudPath.style.strokeDashoffset = 1 - smoother(clamp(vis * 1.15));
  hudDots.forEach(c => { c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); });
  hud.style.opacity = hudLabel.style.opacity = vis;
  const toRight = r.right < p.x || r.top > p.y + 24;
  const lx = clamp(toRight ? p.x + 16 : p.x - 16 - hudW, 12, innerWidth - hudW - 12);
  hudLabel.style.transform = `translate(${lx}px,${p.y - 40}px)`;
}

/* ---------------- Takt: Scroll-Zeit -> Kamera -> Rendern -> HUD ---------------- */
gsap.ticker.add((time, deltaMs) => {
  if (tourTl) pageT = tourTl.time() + 100 * cfgST.progress;
  tourProgress();
  if (!studio || !studio.state.active) return;
  steer();
  if (live) studio.tick(Math.min(deltaMs / 1000, .05));
  drawHud();
});
if (studio) {
  // Unter den Inhalten wird die Buehne gedimmt, das Bike tritt zurueck – danach wird nicht mehr gerendert
  gsap.timeline({ scrollTrigger: { trigger: '.content', start: 'top bottom', end: 'top top', scrub: true,
    onLeave: () => { studio.state.active = false; }, onEnterBack: () => { studio.state.active = true; } } })
    .fromTo('.stage-dim', { opacity: 0 }, { opacity: .7, ease: 'none' }, 0)
    .fromTo(stageTypeText, { autoAlpha: 1 }, { autoAlpha: 0, ease: 'none' }, 0)
    .fromTo('#studio', { scale: 1, yPercent: 0 }, { scale: .9, yPercent: -8, ease: 'none' }, 0);
}

/* =====================================================================
   5) KONFIGURATOR
   ===================================================================== */
const TYPES = {
  rennrad: { name: 'Rennrad', hint: 'z. B. Tarmac SL8' },
  gravel: { name: 'Gravel', hint: 'z. B. Crux / Diverge' },
  mtb: { name: 'MTB', hint: 'z. B. Stumpjumper / Epic' },
  ebike: { name: 'E-Bike', hint: 'z. B. Turbo Levo / Vado' },
};
const PAINT_NAMES = { rot: 'Racepoint Rot', black: 'Gloss Black', carbon: 'Satin Carbon', white: 'Arctic White', chameleon: 'Chameleon' };
const WHEEL_NAMES = { tief: 'Carbon tief', leicht: 'Carbon leicht', tan: 'Tan-Wall' };
// Rahmengroessen nach Koerpergroesse: [bis cm, Buchstabe, Rennrad-cm, Specialized-MTB-Groesse]
const SIZES = [[160, 'XS', 49, 'S1'], [168, 'S', 52, 'S2'], [176, 'M', 54, 'S3'], [184, 'L', 56, 'S4'], [192, 'XL', 58, 'S5'], [206, 'XXL', 61, 'S6']];
const H_MIN = 150, H_MAX = 205;
const cfg = { type: 'rennrad', paint: 'rot', wheels: 'tief', height: 175 };

const sizeOf = h => SIZES.find(s => h < s[0]);
const sizeLabel = () => { const s = sizeOf(cfg.height); return s[1] + ' · ' + (cfg.type === 'mtb' || cfg.type === 'ebike' ? s[3] : s[2]); };
// Teile nicht mitten im Begriff umbrechen ("Größe M" bleibt zusammen)
const summary = () => [TYPES[cfg.type].name, PAINT_NAMES[cfg.paint], WHEEL_NAMES[cfg.wheels], 'Größe ' + sizeOf(cfg.height)[1]]
  .map(x => x.replace(/ /g, '\u00a0')).join(' · ');

// gleitender roter Indikator unter dem aktiven Segment (waagerecht oder senkrecht)
function placeInd(seg) {
  const on = $('[aria-pressed="true"]', seg), ind = $('.ind', seg);
  if (on) gsap.set(ind, { x: on.offsetLeft, y: on.offsetTop, width: on.offsetWidth, height: on.offsetHeight });
}
const press = (list, on) => list.forEach(b => b.setAttribute('aria-pressed', String(b === on)));

function render(changed) {
  $$('[data-type-seg]').forEach(seg => { press($$('[data-type]', seg), $(`[data-type="${cfg.type}"]`, seg)); placeInd(seg); });
  press($$('[data-paint]'), $(`[data-paint="${cfg.paint}"]`));
  press($$('[data-wheels]'), $(`[data-wheels="${cfg.wheels}"]`));
  $$('[data-type-hint]').forEach(el => { el.textContent = TYPES[cfg.type].hint; });
  $('#paintName').textContent = PAINT_NAMES[cfg.paint];
  $('#hVal').textContent = cfg.height;
  $('#sizeVal').textContent = sizeLabel();
  $('#height').style.setProperty('--p', ((cfg.height - H_MIN) / (H_MAX - H_MIN) * 100).toFixed(1) + '%');
  const sum = $('#sumText');
  sum.textContent = summary();
  if (changed && !reduced) gsap.fromTo(sum, { autoAlpha: .2, y: 6 }, { autoAlpha: 1, y: 0, duration: .5, ease: 'power2.out', overwrite: true });
}

function setType(t) {
  if (!TYPES[t] || t === cfg.type) return;
  cfg.type = t;
  if (studio) studio.setType(t);
  render(true);
  // Modellname rollt aus der Maske raus und neu herein
  if (reduced) { stageTypeText.textContent = TYPES[t].name; return; }
  gsap.killTweensOf(stageTypeText, 'yPercent');
  gsap.timeline()
    .to(stageTypeText, { yPercent: -110, duration: .35, ease: 'power2.in' })
    .add(() => { stageTypeText.textContent = TYPES[cfg.type].name; })
    .fromTo(stageTypeText, { yPercent: 110 }, { yPercent: 0, duration: .8, ease: 'expo.out' });
}
document.addEventListener('click', e => {
  const t = e.target.closest('[data-type]'), p = e.target.closest('[data-paint]'), w = e.target.closest('[data-wheels]');
  if (t) setType(t.dataset.type);
  if (p && p.dataset.paint !== cfg.paint) { cfg.paint = p.dataset.paint; if (studio) studio.setPaint(cfg.paint); render(true); }
  if (w && w.dataset.wheels !== cfg.wheels) { cfg.wheels = w.dataset.wheels; if (studio) studio.setWheels(cfg.wheels); render(true); }
});

// Koerpergroesse -> Rahmengroesse, das Bike waechst dezent mit
const range = $('#height');
range.value = cfg.height;
const scaleFor = h => .94 + (h - H_MIN) / (H_MAX - H_MIN) * .12;
range.addEventListener('input', () => {
  const before = sizeOf(cfg.height);
  cfg.height = +range.value;
  if (studio) studio.setSize(scaleFor(cfg.height));
  render(before !== sizeOf(cfg.height));
});
// Groessen-Skala unter dem Regler, an den echten Grenzen ausgerichtet
$('.range-scale').innerHTML = SIZES.map((s, i) => {
  const lo = i ? SIZES[i - 1][0] : H_MIN, hi = Math.min(s[0], H_MAX), mid = ((lo + hi) / 2 - H_MIN) / (H_MAX - H_MIN) * 100;
  return `<span style="left:${mid.toFixed(1)}%">${s[1]}</span>`;
}).join('');

// An Achim senden (Demo) + an den KI-Berater uebergeben
const toastEl = $('.toast');
let toastTimer;
function toast(htmlText) {
  toastEl.innerHTML = htmlText;
  toastEl.classList.add('on');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('on'), 4200);
}
$('#sendAchim').addEventListener('click', () => {
  toast('<b>Gesendet ✓</b> Achim meldet sich – Demo');
  if (studio) studio.pulse();
});
// Frage so formuliert, dass der Berater passende Modelle vorschlaegt (nicht den Groessenrechner)
$('#askBuild').addEventListener('click', () => {
  KIBerater.ask(`Mein Build aus dem 3D-Studio: ${TYPES[cfg.type].name}, ${PAINT_NAMES[cfg.paint]}, ` +
    `${WHEEL_NAMES[cfg.wheels]}, Rahmen ${sizeLabel()}. Welches Modell passt zu mir?`);
});
// "In 3D zeigen" im Chat: Typ uebernehmen, Chat schliessen (er laege ueber dem Konfigurator) und hinfahren
KIBerater.onBike(b => {
  setType({ alltag: 'ebike', kids: 'mtb' }[b.cat] || b.cat);
  KIBerater.close();
  goTo('#konfigurator');
});

// Mobil: im Konfigurator traegt das Sheet den KI-Knopf selbst – der schwebende Orb macht Platz
ScrollTrigger.create({ trigger: '#konfigurator', start: 'top 30%', end: 'bottom 70%', toggleClass: { targets: html, className: 'cfg-on' } });

render(false);
textReady.then(() => $$('[data-type-seg]').forEach(placeInd));
addEventListener('resize', () => $$('[data-type-seg]').forEach(placeInd));

/* =====================================================================
   6) HERO-INTRO + INHALTE
   ===================================================================== */
$$('[data-yt]').forEach(el => el.insertAdjacentHTML('afterbegin', RP.ytThumb(el.dataset.yt, 'assets/roadbike-shop.jpg')));

// KI-Eingabe: der Platzhalter tippt Beispielfragen – fuer jedes Budget, nicht nur Rennrad
const askInput = $('#askInput');
// [lang, kurz fuers Handy]
const EXAMPLES = [['Gravelbike für die Ardennen bis 4.000 €', 'Gravelbike bis 4.000 €'], ['E-Bike für den Arbeitsweg, 15 km hügelig', 'E-Bike für den Arbeitsweg'],
  ['Mein erstes Rennrad – was brauche ich?', 'Mein erstes Rennrad'], ['MTB für die Trails in der Eifel', 'MTB für die Eifel-Trails'],
  ['Kinderrad für meine Tochter, 7 Jahre', 'Kinderrad, 7 Jahre']];
function typewriter() {
  let ex = 0, len = EXAMPLES[0][0].length, dir = -1;
  const step = () => {
    let wait = dir > 0 ? 55 : 24;
    if (RP.lang === 'de' && !askInput.value && document.activeElement !== askInput) {
      const text = EXAMPLES[ex][mobile.matches ? 1 : 0];
      len = clamp(len + dir, 0, text.length);
      askInput.placeholder = (mobile.matches ? 'z. B. ›' : 'Frag den KI-Berater … z. B. ›') + text.slice(0, len) + '‹';
      if (dir > 0 && len === text.length) { dir = -1; wait = 2800; }
      else if (dir < 0 && len === 0) { dir = 1; ex = (ex + 1) % EXAMPLES.length; wait = 350; }
    }
    setTimeout(step, wait);
  };
  setTimeout(step, 4200);
}
if (!reduced) typewriter();
// Hinweis "Ziehen zum Drehen" verschwindet nach dem ersten Scrollen
ScrollTrigger.create({ start: 60, end: 'max', once: true, onEnter: () => $('.hint').classList.add('gone') });

textReady.then(() => {
  const title = $('.hero-title');
  gsap.set(title, { autoAlpha: 1 });
  if (reduced) return;

  // Headline: Buchstaben steigen gestaffelt auf
  const split = SplitText.create(title, { type: 'chars', charsClass: 'ch' });
  gsap.timeline({ delay: .1 })
    .from(split.chars, { yPercent: 70, autoAlpha: 0, rotateX: -70, transformPerspective: 700, filter: 'blur(10px)', duration: 1.3, ease: 'expo.out', stagger: .035 })
    .from($$('.hero-ui > *, .hero-side > *, .hint'), { y: 28, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: .07, clearProps: 'transform' }, .55);

  // Hero rollt raus: Headline steigt weg. Auf breiten Screens liegen die Bedienelemente ueber
  // der Buehne und blenden mit aus – im mobilen Fluss scrollen sie ganz normal mit.
  gsap.to(title, { yPercent: -28, autoAlpha: 0, ease: 'none', scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 55%', scrub: true } });
  gsap.matchMedia().add('(min-width:1181px)', () => {
    gsap.timeline({ scrollTrigger: { trigger: '#top', start: 'top top', end: 'bottom 55%', scrub: true } })
      .to('.hero-ui', { y: -50, autoAlpha: 0, ease: 'none' }, 0)
      .to('.hero-side', { autoAlpha: 0, ease: 'none' }, 0);
  });

  // Ueberschriften: Zeilen gleiten aus einer Maske
  $$('.reveal').forEach(el => {
    SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: s => gsap.from(s.lines, { yPercent: 105, duration: 1.1, ease: 'expo.out', stagger: .1,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true } }) });
  });
});

/* ---------------- Gebaut von Achim: Bild-Reveal + Zaehler ---------------- */
if (!reduced) {
  gsap.fromTo('.achim-img', { clipPath: 'inset(16% 14% 16% 14% round 28px)' }, { clipPath: 'inset(0% 0% 0% 0% round 22px)', ease: 'none',
    scrollTrigger: { trigger: '.achim-img', start: 'top 92%', end: 'top 28%', scrub: true } });
  gsap.fromTo('.achim-img img', { scale: 1.28 }, { scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.achim-img', start: 'top bottom', end: 'bottom 30%', scrub: true } });
  $$('.svc > img').forEach(img => gsap.fromTo(img, { yPercent: -6, scale: 1.12 }, { yPercent: 6, scale: 1.12, ease: 'none',
    scrollTrigger: { trigger: img.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } }));
}
$$('[data-count]').forEach(el => {
  const to = +el.dataset.count, suffix = el.dataset.suffix || '', o = { v: reduced ? to : 0 };
  const show = () => { el.textContent = Math.round(o.v).toLocaleString('de-BE') + suffix; };
  show();
  if (!reduced) ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true,
    onEnter: () => gsap.to(o, { v: to, duration: 2, ease: 'power3.out', onUpdate: show }) });
});

/* ---------------- Builds aus den Videos ---------------- */
const BUILDS = [
  { id: '9KIh7oOIPT4', name: 'S-Works Tarmac SL8 LTD', tag: 'Rennrad', note: 'Limitiert, Schraube für Schraube aufgebaut.', img: 'assets/roadbike-shop.jpg' },
  { id: 'vV_rL9yq620', name: 'S-Works Aethos', tag: 'Rennrad', note: 'Leicht wie kaum ein anderes.', img: 'assets/shop-interior.jpg' },
  { id: 'cIBBbESSOoc', name: 'S-Works Crux', tag: 'Gravel', note: 'Das leichteste Gravelbike von Specialized.', img: 'assets/gravel-ride.jpg' },
  { id: 'MHXDMPbMypQ', name: 'Tarmac SL7 · Rapide CLX', tag: 'Rennrad', note: 'Der Klassiker mit tiefen Felgen.', img: 'assets/teaser-poster.jpg' },
  { id: 'WHggv7Jye4M', name: 'S-Works Shiv', tag: 'Triathlon', note: 'Zeitfahren ohne Kompromisse.', img: 'assets/bikefitting.jpg' },
  { id: '5TcRRpUy5T4', name: 'Cervélo S5', tag: 'Alle Marken', note: 'Auch Fremdmarken baut Achim auf.', img: 'assets/achim-team.jpg' },
];
$('#buildsGrid').innerHTML = BUILDS.map(b => `
  <a class="build" href="" data-video="${b.id}" aria-label="Video: ${b.name}">
    <span class="build-media">${RP.ytThumb(b.id, b.img)}<span class="play"><svg><use href="#ic-play"/></svg></span><span class="build-tag mono">${b.tag}</span></span>
    <span class="build-meta"><b>${b.name}</b><span>${b.note}</span></span>
  </a>`).join('');
// nur Deckkraft + Skalierung: im mobilen Wisch-Karussell darf nichts ueber den Rand ragen
if (!reduced) gsap.from('.build', { scale: .94, autoAlpha: 0, transformOrigin: '50% 100%', duration: 1.1, ease: 'expo.out', stagger: .08,
  scrollTrigger: { trigger: '#buildsGrid', start: 'top 85%', once: true } });

/* ---------------- Oeffnungszeiten ---------------- */
function renderHours() {
  $('#hoursTable tbody').innerHTML = RP.hoursRows().map(r =>
    `<tr class="${r.today ? 'today' : ''} ${r.open ? '' : 'closed'}"><td>${r.day}</td><td>${r.text}</td></tr>`).join('');
}
renderHours();
RP.onLang(renderHours);
