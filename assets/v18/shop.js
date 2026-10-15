/* =====================================================================
   RACEPOINT · 18 · Shop (THROWAWAY)
   Produkte, Filter, Produktansicht und Warenkorb für v18-shop.html.
   Racepoint-Kollektion: Daten und Fotos aus racepoint-shop.com (Stand 15.10.2026).
   Artikel mit beispiel:true sind erfunden. Später liefert Shopify die Daten
   (Storefront API), die Kasse bleibt bei Shopify. Hier wird nichts bestellt.
   Muss NACH site.js geladen werden.
   ===================================================================== */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const S = 'assets/v18/media/shop/', C = 'assets/v18/media/cine/';

  /* ---------------- Daten ---------------- */
  const FIT_W = 'Chriddle (160 cm) trägt XS, Elena (167 cm) trägt S.';
  const FIT_M = 'Leon (178 cm) trägt M, Achim (188 cm) trägt L.';
  const FIT_H = 'Marco (173 cm) trägt M, Achim (188 cm) trägt L.';
  const TEE = 'Bio-Baumwolle mit 5 % Viskose.';
  const HOOD = 'Laut Achim gut zum Schrauben am Bike und für kühlere Tage nach dem Training. Sitzt bequem, mit etwas höherem Kragen und Kängurutasche. 60 % Baumwolle, 40 % Polyester.';
  const W = ['XS', 'S', 'M', 'L', 'XL', 'XXL'], M = ['S', 'M', 'L', 'XL', 'XXL'];
  const RP = 'Racepoint-Kollektion';

  const P = [
    { id: 'tee-rb-m', cat: 'merch', name: 'T-Shirt Rainbow', sub: RP + ' · Herren', price: 29.9, sizes: M, imgs: ['tee-rb-m-1', 'tee-rb-m-2'],
      text: 'Das Shirt im Rainbow-Design aus unseren YouTube-Videos, Racepoint-Logo auf der Brust. ' + TEE, fit: FIT_M },
    { id: 'tee-rb-w', cat: 'merch', name: 'T-Shirt Rainbow', sub: RP + ' · Damen', price: 29.9, sizes: W, imgs: ['tee-rb-w-1', 'tee-rb-w-2'],
      text: 'Das Shirt im Rainbow-Design aus unseren YouTube-Videos, Schriftzug auf der Brust. ' + TEE, fit: FIT_W },
    { id: 'tee-classic-m', cat: 'merch', name: 'T-Shirt Classic', sub: RP + ' · Herren', price: 29.9, sizes: M, imgs: ['tee-classic-m-1', 'tee-classic-m-2'],
      text: 'Schwarz mit goldenem Schriftzug vorne und „The Specialist in Moving You“ auf dem Rücken. ' + TEE, fit: FIT_M },
    { id: 'tee-classic-w', cat: 'merch', name: 'T-Shirt Classic', sub: RP + ' · Damen', price: 29.9, sizes: W, imgs: ['tee-classic-w-1', 'tee-classic-w-2'],
      text: 'Schwarz mit goldenem Schriftzug vorne und „The Specialist in Moving You“ auf dem Rücken. ' + TEE, fit: FIT_W },
    { id: 'tee-oak-m', cat: 'merch', name: 'T-Shirt Oak Green', sub: RP + ' · Herren', price: 34.9, sizes: M, imgs: ['tee-oak-m-1', 'tee-oak-m-2'],
      text: 'In Olivgrün, Logo vorne, großer Racepoint-Print auf dem Rücken. ' + TEE, fit: FIT_M },
    { id: 'tee-oak-w', cat: 'merch', name: 'T-Shirt Oak Green', sub: RP + ' · Damen', price: 34.9, sizes: W, imgs: ['tee-oak-w-1', 'tee-oak-w-2'],
      text: 'In Olivgrün, Logo vorne, großer Racepoint-Print auf dem Rücken. ' + TEE, fit: FIT_W },
    { id: 'hoodie-bw-m', cat: 'merch', name: 'Hoodie Black & White', sub: RP + ' · Herren', price: 74.9, sizes: M, imgs: ['hoodie-bw-m-1', 'hoodie-bw-m-2', 'hoodie-bw-m-3'],
      text: 'Schwarz, weißer Print vorne und auf dem Rücken. ' + HOOD, fit: FIT_H },
    { id: 'hoodie-bw-w', cat: 'merch', name: 'Hoodie Black & White', sub: RP + ' · Damen', price: 74.9, sizes: W, imgs: ['hoodie-bw-w-1', 'hoodie-bw-w-2', 'hoodie-bw-w-3'],
      text: 'Schwarz, weißer Print vorne und auf dem Rücken. ' + HOOD, fit: FIT_W },
    { id: 'hoodie-rb-m', cat: 'merch', name: 'Hoodie Rainbow', sub: RP + ' · Herren', price: 64.9, sizes: M, imgs: ['hoodie-rb-m-1', 'hoodie-rb-m-2'],
      text: 'Der Rainbow-Schriftzug aus den Videos, diesmal mit Kapuze. ' + HOOD, fit: FIT_H },
    { id: 'hoodie-rb-w', cat: 'merch', name: 'Hoodie Rainbow', sub: RP + ' · Damen', price: 64.9, sizes: W, imgs: ['hoodie-rb-w-1', 'hoodie-rb-w-2'],
      text: 'Der Rainbow-Schriftzug aus den Videos, diesmal mit Kapuze. ' + HOOD, fit: FIT_W },
    { id: 'cap', cat: 'merch', name: 'Racepoint Cap', sub: RP + ' · Einheitsgröße', price: 29.95, sizes: null, imgs: ['cap-1', 'cap-2'],
      text: 'Snapback mit gesticktem RP-Logo, gebogener Schirm, stabile Front. 100 % Polyester. Laut Achim für die Freizeit, zum Beispiel zum Eis essen.' },

    // Erfunden: Beispiele, wie Specialized-Ware und Gutscheine im Shop aussähen
    { id: 'recon', cat: 'schuhe', beispiel: true, name: 'S-Works Recon', sub: 'Specialized · MTB-Schuh', price: 425, sizes: ['40', '41', '42', '43', '44', '45', '46'], imgs: [C + 'schuh-recon'],
      text: 'Carbonsohle, BOA-Verschluss, für Trail und Rennen. Probier ihn im Laden an, Schuhgrößen fallen je nach Modell unterschiedlich aus.' },
    { id: 'recon-sl', cat: 'schuhe', beispiel: true, name: 'S-Works Recon SL', sub: 'Specialized · Gravel- und XC-Schuh', price: 475, sizes: ['40', '41', '42', '43', '44', '45', '46'], imgs: [C + 'schuh-reconsl'],
      text: 'Die leichtere Variante in Oak Green, für Gravel und Cross-Country.' },
    { id: 'helm', cat: 'schuhe', beispiel: true, name: 'Specialized Helm Hi-Vis', sub: 'Specialized · Rennradhelm', price: 129.9, sizes: ['S', 'M', 'L'], imgs: [C + 'helme'],
      text: 'In Neongelb, gut zu sehen auch bei Nebel im Venn. Den Kopfumfang messen wir im Laden.' },
    { id: 'trikot-rp', cat: 'bekleidung', beispiel: true, name: 'Racepoint-Trikot', sub: 'Racepoint · Kurzarm', price: 89.9, sizes: M, imgs: [C + 'kleid-9'],
      text: 'Schwarz und Weiß, enger Schnitt, drei Rückentaschen. Für die Samstagsrunde und den Kaffee danach.' },
    { id: 'trikot-verlauf', cat: 'bekleidung', beispiel: true, name: 'Trikot Farbverlauf', sub: 'Specialized · Damen', price: 99.9, sizes: ['XS', 'S', 'M', 'L'], imgs: [C + 'kleid-1'],
      text: 'Von Blau zu Rot, leichter Stoff für warme Tage.' },
    { id: 'cap-spz', cat: 'bekleidung', beispiel: true, name: 'Specialized Cap', sub: 'Specialized · Einheitsgröße', price: 24.9, sizes: null, imgs: [C + 'kleid-4'],
      text: 'In Grau oder Schwarz mit rotem S. Hängt im Laden gleich neben der Racepoint-Cap.' },

    { id: 'gs-geschenk', cat: 'gutschein', beispiel: true, gift: { k: 'Geschenk', t: 'Für alles im Laden' }, name: 'Geschenkgutschein', sub: 'Racepoint · Betrag wählbar', amounts: [25, 50, 100, 250],
      text: 'Gilt für alles bei uns: Bikes, Zubehör, Werkstatt und Fitting. Kommt als Karte oder per E-Mail.' },
    { id: 'gs-werkstatt', cat: 'gutschein', beispiel: true, gift: { k: 'Werkstatt', t: 'Für alle Marken' }, name: 'Werkstatt-Gutschein', sub: 'Racepoint · Betrag wählbar', amounts: [50, 100],
      text: 'Für Inspektion, Reparatur oder Fahrwerk-Service. Gut für alle, deren Kette seit dem letzten Frühling kein Öl gesehen hat.' },
    { id: 'gs-retul', cat: 'gutschein', beispiel: true, gift: { k: 'Retül', t: 'Bikefitting in 3D' }, name: 'Retül-Bikefitting', sub: 'Racepoint · Gutschein', price: 249,
      text: 'Ein komplettes Retül-Fitting bei Achim, rund 1,5 Stunden. Den Termin macht die beschenkte Person selbst mit uns aus.' },
    { id: 'kaffee', cat: 'gutschein', beispiel: true, laden: true, gift: { k: 'Kaffee', t: 'Nach der Runde' }, name: 'Kaffee nach der Runde', sub: 'Nur im Laden', price: 0,
      text: 'Den gibt es nicht online, nur nach der Runde bei uns im Laden. Bezahlt wird in Höhenmetern.' },
  ];
  const byId = Object.fromEntries(P.map(p => [p.id, p]));
  const FILTERS = [
    { id: 'alle', name: 'Alle' },
    { id: 'merch', name: RP },
    { id: 'bekleidung', name: 'Bekleidung' },
    { id: 'schuhe', name: 'Schuhe & Helme' },
    { id: 'gutschein', name: 'Gutscheine' },
  ];

  const eur = n => n.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
  const src = f => (f.indexOf('/') >= 0 ? f : S + f) + '.webp';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const priceOf = p => p.amounts ? 'ab ' + eur(p.amounts[0]) : p.laden ? 'unbezahlbar' : eur(p.price);
  const giftArt = (p, amount) =>
    '<span class="sh-gift' + (p.laden ? ' sh-gift-k' : '') + '" aria-hidden="true"><img src="assets/racepoint-logo-light.svg" alt="" width="120" height="10">' +
    '<b>' + (amount ? eur(amount).replace(',00', '') : esc(p.gift.k)) + '</b><small>' + esc(amount ? p.gift.k + ' · ' + p.gift.t : p.gift.t) + '</small></span>';

  /* ---------------- Warenkorb (nur in diesem Browser) ---------------- */
  const KEY = 'rp18-cart';
  let cart = [];
  try { cart = JSON.parse(localStorage.getItem(KEY) || '[]').filter(i => byId[i.id]); } catch (e) { cart = []; }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} };
  const unit = i => i.amount || byId[i.id].price;
  const count = () => cart.reduce((n, i) => n + i.qty, 0);
  const total = () => cart.reduce((n, i) => n + unit(i) * i.qty, 0);

  /* ---------------- Raster + Filter ---------------- */
  const grid = $('#shGrid'), chips = $('#shChips');
  if (!grid) return;
  const card = p =>
    '<article class="sh-card" data-cat="' + p.cat + '">' +
      '<button type="button" class="sh-img' + (p.gift ? ' is-gift' : '') + '" data-open="' + p.id + '" aria-label="' + esc(p.name + ' · ' + p.sub) + ' ansehen">' +
        (p.gift ? giftArt(p) :
          '<img src="' + src(p.imgs[0]) + '" alt="" loading="lazy">' + (p.imgs[1] ? '<img class="alt" src="' + src(p.imgs[1]) + '" alt="" loading="lazy">' : '')) +
        (p.beispiel ? '<span class="sh-tag">Beispiel</span>' : '') +
      '</button>' +
      '<div class="sh-b"><p class="sh-sub">' + esc(p.sub) + '</p><h3>' + esc(p.name) + '</h3><p class="sh-price">' + priceOf(p) + '</p></div>' +
    '</article>';
  grid.innerHTML = P.map(card).join('');
  chips.innerHTML = FILTERS.map((f, i) => {
    const n = f.id === 'alle' ? P.length : P.filter(p => p.cat === f.id).length;
    return '<button type="button" data-f="' + f.id + '" aria-pressed="' + (i === 0) + '">' + f.name + '<span>' + n + '</span></button>';
  }).join('');
  const setFilter = f => {
    $$('button', chips).forEach(b => b.setAttribute('aria-pressed', b.dataset.f === f));
    $$('.sh-card', grid).forEach(c => { c.hidden = f !== 'alle' && c.dataset.cat !== f; });
    if (window.gsap && !(window.RP18Site && RP18Site.RM)) gsap.fromTo($$('.sh-card:not([hidden])', grid), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, stagger: 0.03, ease: 'power2.out', overwrite: true });
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  };
  chips.addEventListener('click', e => { const b = e.target.closest('button[data-f]'); if (b) setFilter(b.dataset.f); });
  $$('[data-shop-filter]').forEach(a => a.addEventListener('click', () => setFilter(a.dataset.shopFilter)));

  /* ---------------- Dialoge (Produkt, Warenkorb) ---------------- */
  const lenis = () => window.RP18Site && RP18Site.lenis;
  const openDlg = d => { if (!d.open) { d.showModal(); if (lenis()) lenis().stop(); } };
  const closeDlg = d => { if (d.open) d.close(); };
  $$('dialog.sh-dlg').forEach(d => {
    d.addEventListener('close', () => { if (!$('dialog.sh-dlg[open]') && lenis()) lenis().start(); });
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) closeDlg(d); });
  });

  /* Produktansicht */
  const pd = $('#shProduct');
  let curP = null, curOpt = null;
  const renderProduct = p => {
    curP = p; curOpt = p.amounts ? p.amounts[1] || p.amounts[0] : null;
    const opts = p.amounts || p.sizes;
    const media = p.gift ? '<div class="sh-pd-gift">' + giftArt(p, p.amounts ? curOpt : 0) + '</div>' :
      '<div class="sh-pd-main"><img src="' + src(p.imgs[0]) + '" alt="' + esc(p.name + ', ' + p.sub) + '"></div>' +
      (p.imgs.length > 1 ? '<div class="sh-thumbs">' + p.imgs.map((f, i) => '<button type="button" data-img="' + src(f) + '" aria-label="Bild ' + (i + 1) + '"' + (i ? '' : ' aria-current="true"') + '><img src="' + src(f) + '" alt=""></button>').join('') + '</div>' : '');
    $('.sh-pd', pd).innerHTML =
      '<div class="sh-pd-media">' + media + '</div>' +
      '<div class="sh-pd-txt">' +
        '<p class="sh-sub">' + esc(p.sub) + (p.beispiel ? ' <span class="sh-tag">Beispiel</span>' : '') + '</p>' +
        '<h2 id="shPdTitle">' + esc(p.name) + '</h2>' +
        '<p class="sh-pd-price" id="shPdPrice">' + (p.amounts ? eur(curOpt) : priceOf(p)) + '</p>' +
        '<p class="sh-pd-text">' + esc(p.text) + '</p>' +
        (p.fit ? '<p class="sh-fit"><b>Größenfinder</b>' + esc(p.fit) + '</p>' : '') +
        (opts ? '<fieldset class="sh-opts"><legend>' + (p.amounts ? 'Betrag' : 'Größe') + '</legend><div>' + opts.map(o =>
          '<button type="button" data-opt="' + o + '" aria-pressed="' + (o === curOpt) + '">' + (p.amounts ? o + ' €' : o) + '</button>').join('') + '</div></fieldset>' : '') +
        (p.laden ? '<a class="btn" href="v18-touren.html">Zu den Touren</a>' :
          '<button type="button" class="btn sh-add" id="shAdd"' + (opts && !curOpt ? ' aria-disabled="true"' : '') + '>' + (opts && !curOpt ? 'Erst ' + (p.amounts ? 'Betrag' : 'Größe') + ' wählen' : 'In den Warenkorb') + '</button>') +
        '<p class="fine">Abholen im Laden in Schönberg oder Versand, das regelt später die Kasse.</p>' +
      '</div>';
  };
  const openProduct = id => { const p = byId[id]; if (!p) return; renderProduct(p); openDlg(pd); $('.sh-pd', pd).scrollTop = 0; };
  grid.addEventListener('click', e => { const b = e.target.closest('[data-open]'); if (b) openProduct(b.dataset.open); });
  $$('[data-shop-open]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); openProduct(a.dataset.shopOpen); }));
  pd.addEventListener('click', e => {
    const t = e.target.closest('[data-img]');
    if (t) {
      $('.sh-pd-main img', pd).src = t.dataset.img;
      $$('[data-img]', pd).forEach(b => b.toggleAttribute('aria-current', b === t));
      return;
    }
    const o = e.target.closest('[data-opt]');
    if (o) {
      curOpt = curP.amounts ? +o.dataset.opt : o.dataset.opt;
      $$('[data-opt]', pd).forEach(b => b.setAttribute('aria-pressed', b === o));
      if (curP.amounts) { $('#shPdPrice').textContent = eur(curOpt); $('.sh-pd-gift', pd).innerHTML = giftArt(curP, curOpt); }
      const add = $('#shAdd'); add.removeAttribute('aria-disabled'); add.textContent = 'In den Warenkorb';
      return;
    }
    const add = e.target.closest('#shAdd');
    if (add) {
      if (add.getAttribute('aria-disabled')) { $('.sh-opts', pd).classList.add('shake'); setTimeout(() => $('.sh-opts', pd).classList.remove('shake'), 500); return; }
      const key = curP.id + '|' + (curOpt || '');
      const hit = cart.find(i => i.key === key);
      if (hit) hit.qty++; else cart.push({ key, id: curP.id, size: curP.amounts ? null : curOpt, amount: curP.amounts ? curOpt : null, qty: 1 });
      save(); renderCart(); closeDlg(pd); toast(curP.name + (curOpt && !curP.amounts ? ' · ' + curOpt : '') + ' liegt im Warenkorb.');
    }
  });

  /* Warenkorb */
  const cd = $('#shCart'), list = $('#shCartList');
  const renderCart = () => {
    const n = count();
    $$('[data-cart-count]').forEach(el => { el.textContent = n; });
    $$('.sh-cart-btn').forEach(b => b.classList.toggle('has', n > 0));
    $('#shFab').hidden = n === 0;
    if (!cart.length) {
      list.innerHTML = '<p class="sh-empty">Noch leer. Die Cap wäre ein Anfang.</p>';
    } else {
      list.innerHTML = cart.map((i, k) => {
        const p = byId[i.id];
        return '<div class="sh-line">' +
          (p.gift ? '<span class="sh-line-img">' + giftArt(p, i.amount) + '</span>' : '<img class="sh-line-img" src="' + src(p.imgs[0]) + '" alt="">') +
          '<div><b>' + esc(p.name) + '</b><small>' + esc(p.sub.replace(RP + ' · ', '')) + (i.size ? ' · Größe ' + i.size : '') + (i.amount ? ' · ' + eur(i.amount) : '') + '</small>' +
            '<div class="sh-qty"><button type="button" data-q="-1" data-k="' + k + '" aria-label="Eins weniger">−</button><span>' + i.qty + '</span><button type="button" data-q="1" data-k="' + k + '" aria-label="Eins mehr">+</button></div></div>' +
          '<p>' + eur(unit(i) * i.qty) + '</p></div>';
      }).join('');
    }
    $('#shTotal').textContent = eur(total());
    $('#shCheckout').disabled = !cart.length;
  };
  list.addEventListener('click', e => {
    const b = e.target.closest('[data-q]'); if (!b) return;
    const i = cart[+b.dataset.k]; i.qty += +b.dataset.q;
    if (i.qty <= 0) cart.splice(+b.dataset.k, 1);
    save(); renderCart();
  });
  const showCheckout = on => { $('#shCartMain').hidden = on; $('#shCheckoutInfo').hidden = !on; };
  $$('[data-cart-open]').forEach(b => b.addEventListener('click', () => { showCheckout(false); renderCart(); openDlg(cd); }));
  $('#shCheckout').addEventListener('click', () => showCheckout(true));
  $('#shBack').addEventListener('click', () => showCheckout(false));

  /* Kurze Bestätigung */
  const tst = $('#shToast');
  let tt;
  const toast = msg => {
    tst.textContent = msg; tst.classList.add('on');
    clearTimeout(tt); tt = setTimeout(() => tst.classList.remove('on'), 2600);
  };

  renderCart();
  if (window.RP18Site && RP18Site.reveal) RP18Site.reveal();
})();
