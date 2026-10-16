/* Racepoint App · Medien-Pipeline im Browser (Demo).
   Bilder: echte Varianten per Canvas (WebP + AVIF, wenn der Browser AVIF kodieren kann, sonst JPEG)
   in 480/960/1600/2400 px, nie hochskaliert. Videos: Posterbild per <video> + Canvas; MP4 1080/720/480
   und ein 15-s-Loop werden nur simuliert (echt: ffmpeg-Job auf dem Server). */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  A.WIDTHS = [480, 960, 1600, 2400];
  let avif = null;
  A.canAvif = function () {
    if (avif !== null) return avif;
    try { const c = document.createElement('canvas'); c.width = c.height = 2; avif = c.toDataURL('image/avif').startsWith('data:image/avif'); } catch (e) { avif = false; }
    return avif;
  };
  const toBlob = (canvas, type, q) => new Promise(res => canvas.toBlob(b => res(b), type, q));
  function draw(src, w, h) {
    const c = document.createElement('canvas'); c.width = w; c.height = h;
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'; g.drawImage(src, 0, 0, w, h); return c;
  }
  const dataUrl = blob => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(blob); });
  async function loadImage(file) {
    if (window.createImageBitmap) { try { return await createImageBitmap(file); } catch (e) { /* weiter mit <img> */ } }
    const url = URL.createObjectURL(file);
    try { const img = new Image(); img.src = url; await img.decode(); return img; } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
  }
  // Kleines JPEG (<= 1024 px) für das Modell, damit es sieht, was angehängt ist
  async function modelJpeg(src, w, h) {
    const s = Math.min(1, 1024 / Math.max(w, h));
    const c = draw(src, Math.round(w * s), Math.round(h * s));
    for (const q of [0.8, 0.65, 0.5, 0.35]) { const d = c.toDataURL('image/jpeg', q); if (d.length < 600000) return d.split(',')[1]; }
    return null;
  }
  A.processImage = async function (file, id, onStep) {
    const img = await loadImage(file);
    const W = img.width, H = img.height;
    const out = { id, kind: 'image', name: file.name || 'foto.jpg', width: W, height: H, bytes: file.size, variants: [], skipped: [], urls: [] };
    const second = A.canAvif() ? ['image/avif', 'avif'] : ['image/jpeg', 'jpg'];
    const widths = A.WIDTHS.filter(w => w <= W);
    if (!widths.length) widths.push(W);
    out.skipped = A.WIDTHS.filter(w => w > W);
    for (const w of widths) {
      const h = Math.round(H * w / W), c = draw(img, w, h);
      for (const [type, fmt] of [['image/webp', 'webp'], second]) {
        const b = await toBlob(c, type, fmt === 'webp' ? 0.8 : 0.72);
        if (!b) continue;
        const url = URL.createObjectURL(b); out.urls.push(url);
        out.variants.push({ format: b.type === type ? fmt : (b.type.split('/')[1] || fmt), w, h, bytes: b.size, url });
      }
      if (onStep) onStep(out.variants.length / (widths.length * 2));
    }
    out.avifInBrowser = A.canAvif();
    const thumbC = draw(img, Math.min(480, W), Math.round(H * Math.min(480, W) / W));
    const thumb = thumbC.toDataURL('image/webp', 0.7);
    out.thumbKey = 'b-' + id + '-' + Date.now().toString(36);
    A.state.blobs[out.thumbKey] = thumb;
    out.model = await modelJpeg(img, W, H);
    const best = out.variants.filter(v => v.format === 'webp').sort((a, b) => b.w - a.w)[0];
    const orig = URL.createObjectURL(file); out.urls.push(orig);
    A.blobs.set(id, { src: orig, best: best ? best.url : orig, thumb, variants: out.variants, urls: out.urls });
    if (img.close) img.close();
    return out;
  };

  A.VIDEO_TARGETS = [{ label: 'MP4 1080p', h: 1080, kbps: 6500 }, { label: 'MP4 720p', h: 720, kbps: 3500 }, { label: 'MP4 480p', h: 480, kbps: 1500 }, { label: 'Hero-Loop (max. 15 s, ohne Ton)', h: 720, kbps: 2500, loop: true }];
  A.processVideo = function (file, id) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), v = document.createElement('video');
      v.muted = true; v.playsInline = true; v.preload = 'auto'; v.src = url;
      const fail = () => reject(new Error('Video konnte im Browser nicht gelesen werden.'));
      const timer = setTimeout(fail, 15000);
      v.onerror = () => { clearTimeout(timer); fail(); };
      v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 2) * 0.1); };
      v.onseeked = async () => {
        clearTimeout(timer);
        try {
          const W = v.videoWidth || 1280, H = v.videoHeight || 720, s = Math.min(1, 960 / W);
          const c = draw(v, Math.round(W * s), Math.round(H * s));
          const poster = c.toDataURL('image/webp', 0.75);
          const thumbKey = 'b-' + id + '-' + Date.now().toString(36);
          A.state.blobs[thumbKey] = poster;
          const d = v.duration || 0;
          const variants = A.VIDEO_TARGETS.filter(t => t.loop || t.h <= Math.max(H, 480)).map(t => ({ format: 'mp4', label: t.label, w: Math.round(W * t.h / H / 2) * 2, h: t.h, bytes: Math.round((t.loop ? Math.min(15, d) : d) * t.kbps * 125), simulated: true }));
          const mc = draw(v, Math.round(W * Math.min(1, 1024 / Math.max(W, H))), Math.round(H * Math.min(1, 1024 / Math.max(W, H))));
          A.blobs.set(id, { src: url, best: url, thumb: poster, urls: [url] });
          resolve({ id, kind: 'video', name: file.name || 'video.mp4', width: W, height: H, bytes: file.size, duration: Math.round(d * 10) / 10, thumbKey, variants, model: mc.toDataURL('image/jpeg', 0.7).split(',')[1] });
        } catch (e) { reject(e); }
      };
    });
  };
  A.processFile = function (file, id, onStep) {
    if (/^video\//.test(file.type) || /\.(mp4|mov|webm|m4v)$/i.test(file.name)) {
      if (file.size > 400 * 1048576) return Promise.reject(new Error('Video ist größer als 400 MB.'));
      return A.processVideo(file, id);
    }
    if (/^image\//.test(file.type) || /\.(jpe?g|png|webp|heic|avif)$/i.test(file.name)) {
      if (file.size > 40 * 1048576) return Promise.reject(new Error('Bild ist größer als 40 MB.'));
      return A.processImage(file, id, onStep);
    }
    return Promise.reject(new Error('Nur Fotos und Videos.'));
  };
  // Anhänge (Chat und Formulare teilen sich dieselbe Verarbeitung), IDs att_1, att_2 …
  A.attachments = new Map();
  let attN = 0;
  A.attach = function (file) {
    const id = 'att_' + (++attN);
    A.attachments.set(id, { id, name: file.name, kind: /^video\//.test(file.type) ? 'video' : 'image', processing: true });
    const p = A.processFile(file, id).then(out => { out.id = id; A.attachments.set(id, out); return out; }, e => { A.attachments.delete(id); throw e; });
    p.id = id;
    return p;
  };
  // Simulierter Transcode-Fortschritt (0..1), überlebt Neuladen über startedAt
  A.transcode = m => !m || !m.transcode ? 1 : Math.min(1, (Date.now() - m.transcode.startedAt) / 9000);
})(window.RPA);
