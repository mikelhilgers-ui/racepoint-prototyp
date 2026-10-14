(() => {
  const script = document.currentScript;
  const source = new URL(script.src);
  const marker = '/entwuerfe/codex-2026-10/prototype/';
  const markerIndex = source.pathname.indexOf(marker);
  const standalone = script.dataset.prototypeScope === 'package' && markerIndex < 0;
  const repository = markerIndex >= 0
    ? new URL(source.pathname.slice(0, markerIndex) + '/', source)
    : new URL('../', source);
  const packageBase = script.dataset.prototypeScope === 'package'
    ? new URL('../', source)
    : new URL('entwuerfe/codex-2026-10/prototype/', repository);
  const designs = [
    [16, 'Motion', 'varianten/motion/'], [15, 'Cinema', 'varianten/cinema/'],
    [14, 'Terrain', 'varianten/terrain/'], [13, 'Velocity', 'varianten/velocity/'],
    [11, 'Original', 'kombi/']
  ];
  const older = [
    [1, 'Cinematic', 'index.html?v=1'], [2, 'Emotion', 'index.html?v=2'],
    [3, 'Neueste Bikes', 'index.html?v=3'], [4, 'Finde dein Bike', 'index.html?v=4'],
    [5, 'Bold/Sportlich', 'index.html?v=5'], [6, 'Immersive', 'index.html?v=6'],
    [8, 'Der Aufbau', 'v8-aufbau.html'], [9, '3D-Studio', 'v9-3d-studio.html'],
    [10, 'Die Runde', 'v10-die-runde.html'], [17, 'Best of', 'v17-best-of.html']
  ];
  function mount() {
    if (document.querySelector('.prototype-picker')) return;
    let current = null, page = 'index.html';
    for (const [id, , path] of designs) {
      const prefix = new URL(path, packageBase).pathname;
      if (location.pathname.startsWith(prefix)) {
        current = id;
        page = location.pathname.slice(prefix.length) || 'index.html';
      }
    }
    if (current === null && !standalone) {
      const match = older.find(([, , path]) => new URL(path, repository).pathname === location.pathname);
      if (match) current = match[0] < 7 ? Number(new URL(location.href).searchParams.get('v') || 1) : match[0];
      if (location.pathname === repository.pathname) current = Number(new URL(location.href).searchParams.get('v') || 1);
    }
    const wrap = document.createElement('div');
    wrap.className = 'prototype-picker';
    wrap.innerHTML = `<nav class="prototype-panel" id="prototype-panel" aria-label="Alle Prototypen" data-lenis-prevent hidden>
      <p class="prototype-heading">Prototyp wählen</p>
      <div class="prototype-links"></div>
      <a class="prototype-overview" href="${new URL('varianten/', packageBase).href}">Alle Entwürfe im Überblick <span aria-hidden="true">↗</span></a>
    </nav>
    <button class="prototype-toggle" type="button" title="Prototyp wählen" aria-label="Prototyp wählen" aria-controls="prototype-panel" aria-expanded="false">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.14 12.94a7.49 7.49 0 000-1.88l2.03-1.58a.5.5 0 00.12-.64l-1.92-3.32a.5.5 0 00-.6-.22l-2.39.96a7.3 7.3 0 00-1.63-.94l-.36-2.54a.5.5 0 00-.5-.42h-3.84a.5.5 0 00-.5.42l-.36 2.54c-.59.24-1.13.56-1.63.94l-2.39-.96a.5.5 0 00-.6.22L2.69 8.84a.5.5 0 00.12.64l2.03 1.58a7.49 7.49 0 000 1.88l-2.03 1.58a.5.5 0 00-.12.64l1.92 3.32a.5.5 0 00.6.22l2.39-.96c.5.38 1.04.7 1.63.94l.36 2.54a.5.5 0 00.5.42h3.84a.5.5 0 00.5-.42l.36-2.54c.59-.24 1.13-.56 1.63-.94l2.39.96a.5.5 0 00.6-.22l1.92-3.32a.5.5 0 00-.12-.64l-2.03-1.58zM12 15.5A3.5 3.5 0 1112 8.5a3.5 3.5 0 010 7z"/></svg>
    </button>`;
    const links = wrap.querySelector('.prototype-links');
    const add = (id, label, url, group) => {
      const a = document.createElement('a');
      a.href = url;
      a.dataset.prototype = id;
      a.innerHTML = `<span>${id} · ${label}</span>${group ? '<small>' + group + '</small>' : ''}`;
      if (id === current) a.setAttribute('aria-current', 'page');
      links.append(a);
    };
    // Neuere Einzelseiten (z. B. 17 · Best of) stehen als Neueste ganz oben
    const newest = Math.max(...designs.map(([id]) => id));
    const older2 = standalone ? [] : [...older].reverse();
    for (const [id, label, path] of older2) if (id > newest) add(id, label, new URL(path, repository).href, 'NEW');
    for (const [id, label, path] of designs) add(id, label, new URL(path + page, packageBase).href, 'NEW');
    for (const [id, label, path] of older2) if (id <= newest) add(id, label, new URL(path, repository).href, id >= 8 ? 'NEW' : '');
    document.body.append(wrap);
    const panel = wrap.querySelector('.prototype-panel'), button = wrap.querySelector('button');
    const setOpen = (open, focus = false) => {
      panel.hidden = !open;
      button.setAttribute('aria-expanded', String(open));
      if (open) {
        panel.scrollTop = 0;
        if (focus) links.querySelector('a')?.focus({preventScroll: true});
      }
    };
    button.addEventListener('click', e => { setOpen(panel.hidden, e.detail === 0); });
    document.addEventListener('click', e => { if (!panel.hidden && !wrap.contains(e.target)) setOpen(false); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !panel.hidden) { setOpen(false); button.focus({preventScroll: true}); }
    });
    const url = new URL(location.href);
    if (url.searchParams.get('picker') === 'open') {
      setOpen(true);
      url.searchParams.delete('picker');
      history.replaceState(history.state, '', url);
    }
  }
  const style = document.createElement('style');
  style.textContent = `
    .prototype-picker{position:fixed;right:max(20px,env(safe-area-inset-right));bottom:max(20px,env(safe-area-inset-bottom));z-index:70;display:flex;flex-direction:column;align-items:flex-end;font:600 14px/1.35 'Roboto Condensed',Arial,sans-serif;color:#fff;text-align:left}
    .prototype-picker *{box-sizing:border-box}
    .prototype-toggle{width:56px;height:56px;flex:none;border:0;border-radius:50%;background:#E83637;color:#fff;display:grid;place-items:center;cursor:pointer;box-shadow:0 12px 30px #0006;transition:transform .25s}
    .prototype-toggle:hover{transform:rotate(30deg)}.prototype-toggle svg{width:28px;height:28px;fill:currentColor}
    .prototype-panel{position:relative;width:300px;max-width:calc(100vw - 40px);max-height:calc(100dvh - 116px - env(safe-area-inset-bottom));overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;scrollbar-width:thin;scrollbar-color:#666 transparent;margin:0 0 12px;padding:8px;border-radius:18px;background:rgba(19,21,26,.97);color:#fff;border:1px solid #ffffff26;box-shadow:0 20px 50px #0007;backdrop-filter:blur(10px)}
    .prototype-panel[hidden]{display:none}.prototype-heading{margin:0;padding:12px;font:inherit;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#aaa}
    .prototype-panel a{display:flex;justify-content:space-between;align-items:center;gap:10px;min-height:44px;padding:10px 12px;border-radius:9px;color:#ccc;font:inherit;text-transform:uppercase;text-decoration:none}
    .prototype-panel a:hover{background:#ffffff12;color:#fff}.prototype-panel a[aria-current]{background:#E83637;color:#fff}
    .prototype-panel small{font:800 11px/1.3 Arial,sans-serif;letter-spacing:.07em;flex-shrink:0;padding:5px 8px;border-radius:5px;background:#E83637;color:#fff;box-shadow:0 2px 8px #E8363733}
    .prototype-panel a[aria-current] small{background:#fff;color:#b51e20}.prototype-panel a[data-prototype="6"]{border-top:1px solid #ffffff26;margin-top:6px}
    .prototype-panel .prototype-overview{font-size:12px;text-transform:none;border-top:1px solid #ffffff26;border-radius:0;margin-top:6px;padding-top:14px}
    .prototype-picker :is(a,button):focus-visible{outline:2px solid #fff;outline-offset:-3px}
    .design-switch{display:none!important}
    body:has(dialog[open]) .prototype-picker{display:none}
    html.kib-open-doc .prototype-picker,body:has(#chatPanel:not(.hidden)) .prototype-picker{display:none}
    body:has(.prototype-picker) .advisor-fab{bottom:88px!important}
    @media(max-width:600px){.prototype-picker{right:max(14px,env(safe-area-inset-right));bottom:max(14px,env(safe-area-inset-bottom))}.prototype-panel{max-height:calc(100dvh - 104px - env(safe-area-inset-bottom));max-width:calc(100vw - 28px)}body:has(.prototype-picker) .advisor-fab{bottom:82px!important}}
    @media(prefers-reduced-motion:reduce){.prototype-toggle{transition:none}.prototype-toggle:hover{transform:none}}
  `;
  document.head.append(style);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once: true});
  else mount();
})();
