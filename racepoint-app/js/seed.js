/* Racepoint App · Demo-Daten und Ausgangszustand.
   Artikel kommen aus dem echten Katalog (assets/v17/data.js = Kopie von catalogue.json),
   Öffnungszeiten aus assets/rp-core.js (RP.HOURS). Alles andere ist klar gekennzeichnete Demo. */
window.RPA = window.RPA || {};
(function (A) {
  'use strict';
  const D = window.RP17Data || { bikes: [], films: [] };
  const FILM = id => '../entwuerfe/codex-2026-10/prototype/assets/films/' + id + '.jpg';
  A.FILMS = D.films || [];
  A.filmPoster = FILM;
  A.LANGS = ['de', 'fr', 'nl', 'en'];
  A.LANG_NAMES = { de: 'Deutsch', fr: 'Français', nl: 'Nederlands', en: 'English' };

  // Begriffe, die nie übersetzt werden
  A.GLOSSARY = ['Racepoint', 'S-Works', 'Retül', 'Specialized', 'Cervélo', 'Tarmac', 'Aethos', 'Crux', 'Diverge', 'Roubaix', 'Allez', 'Turbo', 'Vado', 'Levo', 'Stumpjumper', 'Rockhopper', 'Riprock', 'Shimano', 'SRAM', 'Rotor', 'Di2', 'Future Shock', 'Black Friday', 'Achim'];

  // Herstellertexte (Vorlage). Titel = Modellname, wird nicht übersetzt.
  const T = (de, fr, nl, en) => ({ de, fr, nl, en });
  const SUP = {
    'allez-cues': {
      teaser: T('Der leichte Alu-Einstieg ins Rennrad: sportlich, zuverlässig, alltagstauglich.', 'L’entrée sur route en aluminium léger : sportive, fiable et faite pour tous les jours.', 'De lichte aluminium instap in de koersfiets: sportief, betrouwbaar en klaar voor elke dag.', 'The lightweight alloy way into road riding: sporty, reliable and ready for every day.'),
      description: T('E5-Aluminiumrahmen mit Vollcarbongabel, Shimano CUES 2×10 und hydraulischen Scheibenbremsen. Ösen für Schutzbleche machen das Allez auch zum schnellen Pendlerrad.', 'Cadre aluminium E5 avec fourche tout carbone, Shimano CUES 2×10 et freins à disque hydrauliques. Les œillets pour garde-boue en font aussi un vélo rapide pour les trajets quotidiens.', 'E5-aluminium frame met volcarbon vork, Shimano CUES 2×10 en hydraulische schijfremmen. Dankzij de bevestigingspunten voor spatborden is de Allez ook een snelle woon-werkfiets.', 'E5 alloy frame with full-carbon fork, Shimano CUES 2×10 and hydraulic disc brakes. Fender mounts make the Allez a fast commuter, too.')
    },
    'roubaix-sl8-tiagra': {
      teaser: T('Mehr Komfort, mehr Tempo: Future Shock 3.1 und 32-mm-Reifen für lange Tage im Sattel.', 'Plus de confort, plus de vitesse : Future Shock 3.1 et pneus de 32 mm pour les longues journées en selle.', 'Meer comfort, meer snelheid: Future Shock 3.1 en 32 mm banden voor lange dagen in het zadel.', 'More comfort, more speed: Future Shock 3.1 and 32 mm tyres for long days in the saddle.'),
      description: T('FACT-10R-Carbonrahmen mit Future Shock 3.1 an der Front. Die Shimano Tiagra schaltet präzise, die breiten Reifen schlucken auch schlechte Straßen.', 'Cadre carbone FACT 10R avec Future Shock 3.1 à l’avant. Le Shimano Tiagra passe les vitesses avec précision, les pneus larges avalent les mauvaises routes.', 'FACT 10R carbon frame met Future Shock 3.1 vooraan. Shimano Tiagra schakelt precies, de brede banden slikken ook slechte wegen.', 'FACT 10R carbon frame with Future Shock 3.1 up front. Shimano Tiagra shifts precisely and the wide tyres smooth out rough roads.')
    },
    'tarmac-sl9-expert-di2': {
      teaser: T('Ein Rad für alles, was schnell ist: Aero, leicht und mit elektronischer Ultegra Di2.', 'Un vélo pour tout ce qui va vite : aéro, léger et équipé du Ultegra Di2 électronique.', 'Eén fiets voor alles wat snel is: aero, licht en met elektronische Ultegra Di2.', 'One bike for everything fast: aero, light and fitted with electronic Ultegra Di2.'),
      description: T('FACT-10r-Carbon, Shimano Ultegra Di2 12-fach und Roval C38 Carbonlaufräder. Renngeometrie für Antritte und Abfahrten.', 'Carbone FACT 10r, Shimano Ultegra Di2 12 vitesses et roues carbone Roval C38. Une géométrie course pour les relances et les descentes.', 'FACT 10r carbon, Shimano Ultegra Di2 12-speed en Roval C38 carbon wielen. Wedstrijdgeometrie voor sprints en afdalingen.', 'FACT 10r carbon, Shimano Ultegra Di2 12-speed and Roval C38 carbon wheels. Race geometry for attacks and descents.')
    },
    'diverge-4-sport-alloy': {
      teaser: T('Gravel für jeden Tag: robust, komfortabel und mit Staufach im Rahmen.', 'Le gravel au quotidien : robuste, confortable, avec rangement intégré au cadre.', 'Gravel voor elke dag: robuust, comfortabel en met opbergvak in het frame.', 'Gravel for every day: tough, comfortable and with in-frame storage.'),
      description: T('E5-Aluminium mit SWAT-Staufach, Future Shock 3.1 und Shimano CUES 1×11. Viel Reifenfreiheit für Schotter, Feldwege und Pendeln.', 'Aluminium E5 avec rangement SWAT, Future Shock 3.1 et Shimano CUES 1×11. Beaucoup de place pour les pneus, pour le gravier, les chemins et les trajets.', 'E5-aluminium met SWAT-opbergvak, Future Shock 3.1 en Shimano CUES 1×11. Veel bandenruimte voor grind, veldwegen en woon-werkverkeer.', 'E5 alloy with SWAT storage, Future Shock 3.1 and Shimano CUES 1×11. Plenty of tyre clearance for gravel, farm tracks and commuting.')
    },
    'crux-dsw-comp': {
      teaser: T('Leichtes Alu-Gravelbike für schnelle Runden auf Schotter und Asphalt.', 'Gravel en aluminium léger pour des sorties rapides sur gravier et asphalte.', 'Lichte aluminium gravelbike voor snelle rondes op grind en asfalt.', 'Light alloy gravel bike for fast loops on gravel and tarmac.'),
      description: T('E5-Aluminium in D’Aluisio-Smartweld-Bauweise, SRAM Apex XPLR 1×12 und DT Swiss G540 mit 700×40-mm-Reifen.', 'Aluminium E5 en construction D’Aluisio Smartweld, SRAM Apex XPLR 1×12 et DT Swiss G540 avec pneus 700×40 mm.', 'E5-aluminium in D’Aluisio Smartweld-bouwwijze, SRAM Apex XPLR 1×12 en DT Swiss G540 met 700×40 mm banden.', 'E5 alloy in D’Aluisio Smartweld construction, SRAM Apex XPLR 1×12 and DT Swiss G540 with 700×40 mm tyres.')
    },
    'rockhopper-comp': {
      teaser: T('Das Hardtail für den Einstieg in den Trail: verspielt, robust, fair.', 'Le semi-rigide pour débuter sur les sentiers : joueur, robuste et accessible.', 'De hardtail voor je eerste trails: speels, robuust en eerlijk geprijsd.', 'The hardtail to get into trails: playful, tough and fairly priced.'),
      description: T('A1-Aluminiumrahmen, RockShox Judy mit größenabhängigem Federweg und Shimano Deore 1×12.', 'Cadre aluminium A1, RockShox Judy avec débattement selon la taille et Shimano Deore 1×12.', 'A1-aluminium frame, RockShox Judy met maatafhankelijke veerweg en Shimano Deore 1×12.', 'A1 alloy frame, RockShox Judy with size-specific travel and Shimano Deore 1×12.')
    },
    'stumpjumper-15-evo-expert': {
      teaser: T('Trailbike für alles zwischen Feierabendrunde und Bikepark.', 'Trail bike pour tout, de la sortie du soir au bike park.', 'Trailbike voor alles tussen avondrit en bikepark.', 'Trail bike for everything from evening loops to the bike park.'),
      description: T('FACT-11m-Carbon, FOX mit 160 mm vorne und 145 mm hinten, Shimano XT Di2 mit Genie-Dämpfer.', 'Carbone FACT 11m, FOX avec 160 mm à l’avant et 145 mm à l’arrière, Shimano XT Di2 avec amortisseur Genie.', 'FACT 11m carbon, FOX met 160 mm voor en 145 mm achter, Shimano XT Di2 met Genie-demper.', 'FACT 11m carbon, FOX with 160 mm front and 145 mm rear, Shimano XT Di2 with Genie shock.')
    },
    'levo-4-evo-comp': {
      teaser: T('Volle Kraft für steile Trails: 105 Nm und 840 Wh.', 'Toute la puissance pour les sentiers raides : 105 Nm et 840 Wh.', 'Volle kracht voor steile trails: 105 Nm en 840 Wh.', 'Full power for steep trails: 105 Nm and 840 Wh.'),
      description: T('Specialized-3.1-Motor mit 105 Nm, 840-Wh-Akku und RockShox Zeb Select mit 180 mm.', 'Moteur Specialized 3.1 de 105 Nm, batterie de 840 Wh et RockShox Zeb Select de 180 mm.', 'Specialized 3.1-motor met 105 Nm, 840 Wh-accu en RockShox Zeb Select met 180 mm.', 'Specialized 3.1 motor with 105 Nm, 840 Wh battery and RockShox Zeb Select with 180 mm.')
    },
    'vado-3-evo-4': {
      teaser: T('Das E-Bike für Alltag und Touren, komplett ausgestattet.', 'Le vélo électrique pour le quotidien et les balades, entièrement équipé.', 'De e-bike voor elke dag en voor tochten, volledig uitgerust.', 'The e-bike for everyday riding and tours, fully equipped.'),
      description: T('Specialized 3.1 mit 105 Nm und 840 Wh, Farbdisplay mit USB-C, Gepäckträger, Schutzbleche und Licht.', 'Specialized 3.1 de 105 Nm et 840 Wh, écran couleur avec USB-C, porte-bagages, garde-boue et éclairage.', 'Specialized 3.1 met 105 Nm en 840 Wh, kleurendisplay met USB-C, bagagedrager, spatborden en verlichting.', 'Specialized 3.1 with 105 Nm and 840 Wh, colour display with USB-C, rack, fenders and lights.')
    },
    'riprock-24': {
      teaser: T('Echtes Mountainbike für kleine Rider ab etwa 8 Jahren.', 'Un vrai VTT pour les petits riders à partir de 8 ans environ.', 'Een echte mountainbike voor kleine riders vanaf ongeveer 8 jaar.', 'A real mountain bike for young riders from about 8 years.'),
      description: T('24-Zoll-Kinder-MTB aus Aluminium mit microSHIFT Advent 1×9 und hydraulischen Scheibenbremsen.', 'VTT enfant 24 pouces en aluminium avec microSHIFT Advent 1×9 et freins à disque hydrauliques.', 'Kinder-MTB van 24 inch in aluminium met microSHIFT Advent 1×9 en hydraulische schijfremmen.', '24-inch alloy kids’ MTB with microSHIFT Advent 1×9 and hydraulic disc brakes.')
    },
    'sworks-tarmac-sl8': {
      teaser: T('Das schnellste Tarmac aller Zeiten, in Achims Werkstatt aufgebaut.', 'Le Tarmac le plus rapide de tous les temps, monté dans l’atelier d’Achim.', 'De snelste Tarmac ooit, opgebouwd in de werkplaats van Achim.', 'The fastest Tarmac ever, built up in Achim’s workshop.'),
      description: T('FACT-12r-Carbon, Shimano Dura-Ace Di2 und Roval Rapide CLX II. Aerodynamik und Gewicht ohne Kompromiss.', 'Carbone FACT 12r, Shimano Dura-Ace Di2 et Roval Rapide CLX II. Aérodynamisme et poids sans compromis.', 'FACT 12r carbon, Shimano Dura-Ace Di2 en Roval Rapide CLX II. Aerodynamica en gewicht zonder compromis.', 'FACT 12r carbon, Shimano Dura-Ace Di2 and Roval Rapide CLX II. Aerodynamics and weight without compromise.')
    },
    'sworks-aethos': {
      teaser: T('Leichtbau pur: das Aethos für Bergfahrer und Genießer.', 'La légèreté à l’état pur : l’Aethos pour les grimpeurs et les esthètes.', 'Pure lichtgewicht: de Aethos voor klimmers en genieters.', 'Pure lightweight: the Aethos for climbers and connoisseurs.'),
      description: T('FACT-12r-Carbon, SRAM Red AXS und Roval Alpinist CLX II. Klassische Linien, extrem leicht.', 'Carbone FACT 12r, SRAM Red AXS et Roval Alpinist CLX II. Lignes classiques, extrêmement léger.', 'FACT 12r carbon, SRAM Red AXS en Roval Alpinist CLX II. Klassieke lijnen, extreem licht.', 'FACT 12r carbon, SRAM Red AXS and Roval Alpinist CLX II. Classic lines, extremely light.')
    }
  };
  // Zwei Modelle aus Achims Filmen ergänzen den kleinen Katalog (Demo, Herstellerdaten ungeprüft).
  const EXTRA = [
    { id: 'sworks-tarmac-sl8', name: 'S-Works Tarmac SL8 · Dura-Ace Di2', brand: 'specialized', cat: 'rennrad', price: 13999, electric: false, specs: ['FACT-12r-Carbon', 'Shimano Dura-Ace Di2', 'Roval Rapide CLX II'], source: 'https://www.specialized.com/be/nl/', image: null, demo: true, film: '9KIh7oOIPT4' },
    { id: 'sworks-aethos', name: 'S-Works Aethos · SRAM Red AXS', brand: 'specialized', cat: 'rennrad', price: 12499, electric: false, specs: ['FACT-12r-Carbon', 'SRAM Red AXS', 'Roval Alpinist CLX II'], source: 'https://www.specialized.com/be/nl/', image: null, demo: true, film: 'vV_rL9yq620' }
  ];
  A.CATS = { rennrad: 'Rennrad', gravel: 'Gravel', mtb: 'MTB', ebike: 'E-Bike', kind: 'Kinder' };

  // Website-Seiten mit eingebautem Standard-Hero
  A.PAGES = [
    { id: 'startseite', name: 'Startseite', def: { kind: 'video', src: '../assets/racepoint-teaser.mp4', thumb: '../assets/teaser-poster.jpg', headline: T('Dein Bike. Von Achim aufgebaut.', 'Ton vélo. Monté par Achim.', 'Jouw fiets. Opgebouwd door Achim.', 'Your bike. Built by Achim.') } },
    { id: 'rennrad', name: 'Rennrad', def: { kind: 'image', thumb: '../assets/roadbike-shop.jpg', headline: T('Rennrad', 'Vélo de route', 'Koersfiets', 'Road') } },
    { id: 'gravel', name: 'Gravel', def: { kind: 'image', thumb: '../assets/gravel-ride.jpg', headline: T('Gravel', 'Gravel', 'Gravel', 'Gravel') } },
    { id: 'mtb', name: 'MTB', def: { kind: 'image', thumb: '../assets/mtb-action.jpg', headline: T('Mountainbike', 'VTT', 'Mountainbike', 'Mountain bike') } },
    { id: 'ebike', name: 'E-Bike', def: { kind: 'image', thumb: '../assets/mtb-ridge.jpg', headline: T('E-Bike', 'Vélo électrique', 'E-bike', 'E-bike') } },
    { id: 'familie', name: 'Familie & Kids', def: { kind: 'image', thumb: '../assets/gefuehl-moment.jpg', headline: T('Für die ganze Familie', 'Pour toute la famille', 'Voor het hele gezin', 'For the whole family') } },
    { id: 'werkstatt', name: 'Werkstatt', def: { kind: 'image', thumb: '../assets/shop-interior.jpg', headline: T('Meisterwerkstatt für alle Marken', 'Atelier de maître pour toutes les marques', 'Meesterwerkplaats voor alle merken', 'Master workshop for all brands') } },
    { id: 'bikefitting', name: 'Bikefitting', def: { kind: 'image', thumb: '../assets/bikefitting.jpg', headline: T('Retül-Bikefitting', 'Bikefitting Retül', 'Retül-bikefitting', 'Retül bike fitting') } },
    { id: 'filme', name: 'Filme', def: { kind: 'image', thumb: FILM('5TcRRpUy5T4'), headline: T('Aus Achims Werkstatt', 'Depuis l’atelier d’Achim', 'Uit de werkplaats van Achim', 'From Achim’s workshop') } },
    { id: 'touren', name: 'Touren', def: { kind: 'image', thumb: '../assets/achim-ride.jpg', headline: T('Touren ab Racepoint', 'Sorties au départ de Racepoint', 'Tochten vanaf Racepoint', 'Rides from Racepoint') } },
    { id: 'ueber-uns', name: 'Über uns', def: { kind: 'image', thumb: '../assets/achim-team.jpg', headline: T('Achim, Elke und Team', 'Achim, Elke et l’équipe', 'Achim, Elke en het team', 'Achim, Elke and team') } },
    { id: 'kontakt', name: 'Kontakt', def: { kind: 'image', thumb: '../assets/shop-interior.jpg', headline: T('Besuch uns in Schönberg', 'Rends-nous visite à Schönberg', 'Bezoek ons in Schönberg', 'Visit us in Schönberg') } }
  ];
  A.LIBRARY = ['../assets/roadbike-shop.jpg', '../assets/gravel-ride.jpg', '../assets/mtb-action.jpg', '../assets/mtb-ridge.jpg', '../assets/shop-interior.jpg', '../assets/bikefitting.jpg', '../assets/achim-ride.jpg', '../assets/achim-team.jpg', '../assets/gefuehl-moment.jpg', '../assets/teaser-poster.jpg'];

  // Vorbereitete Demo-Übersetzungen (Simulation ohne KI). Schlüssel = deutscher Text.
  A.DEMO_TRANSLATIONS = {
    'Auf Wunsch bauen wir das S-Works Aethos mit Rotor-Kurbel auf.': { fr: 'Sur demande, nous montons le S-Works Aethos avec un pédalier Rotor.', nl: 'Op aanvraag bouwen we de S-Works Aethos op met een Rotor-crankstel.', en: 'On request, we build the S-Works Aethos with a Rotor crankset.' },
    'Black Friday: 15 % auf Bekleidung': { fr: 'Black Friday : 15 % sur les vêtements', nl: 'Black Friday: 15% op kleding', en: 'Black Friday: 15% off clothing' },
    'Unser Tipp für lange Ardennen-Runden: komfortabel, schnell und mit Platz für breite Reifen.': { fr: 'Notre conseil pour les longues sorties dans les Ardennes : confortable, rapide et avec de la place pour des pneus larges.', nl: 'Onze tip voor lange ritten in de Ardennen: comfortabel, snel en met ruimte voor brede banden.', en: 'Our pick for long rides in the Ardennes: comfortable, fast and with room for wide tyres.' },
    'Achims Tipp für die Ardennen: schnell auf Schotter, stabil bergab.': { fr: 'Le conseil d’Achim pour les Ardennes : rapide sur le gravier, stable en descente.', nl: 'Achims tip voor de Ardennen: snel op grind, stabiel bergaf.', en: 'Achim’s pick for the Ardennes: fast on gravel, stable downhill.' },
    'Probefahrt nach Termin möglich.': { fr: 'Essai possible sur rendez-vous.', nl: 'Proefrit mogelijk op afspraak.', en: 'Test rides by appointment.' },
    'Winter-Check jetzt buchen': { fr: 'Réserve ton check d’hiver', nl: 'Boek nu je wintercheck', en: 'Book your winter check now' },
    'Winter auf Schotter': { fr: 'L’hiver sur le gravier', nl: 'Winter op grind', en: 'Winter on gravel' },
    'Herbst-Check: Werkstatttermine im Oktober frei': { fr: 'Check d’automne : rendez-vous atelier disponibles en octobre', nl: 'Herfstcheck: werkplaatsafspraken vrij in oktober', en: 'Autumn check: workshop slots available in October' },
    'Betriebsurlaub': { fr: 'Congés annuels', nl: 'Jaarlijkse sluiting', en: 'Shop holiday' },
    'Heiligabend': { fr: 'Veille de Noël', nl: 'Kerstavond', en: 'Christmas Eve' },
    'Silvester': { fr: 'Saint-Sylvestre', nl: 'Oudejaarsavond', en: 'New Year’s Eve' },
    'Adventskalender: jeden Tag ein Türchen': { fr: 'Calendrier de l’Avent : une case chaque jour', nl: 'Adventskalender: elke dag een deurtje', en: 'Advent calendar: a new door every day' }
  };

  // Belgische gesetzliche Feiertage (Ostern nach Gauß/Anonymous Gregorian)
  function easter(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451), mo = Math.floor((h + l - 7 * m + 114) / 31), da = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(Date.UTC(y, mo - 1, da));
  }
  const iso = d => d.toISOString().slice(0, 10);
  const plus = (d, n) => new Date(d.getTime() + n * 864e5);
  A.belgianHolidays = function (y) {
    const e = easter(y);
    return [
      [y + '-01-01', 'Neujahr'], [iso(plus(e, 1)), 'Ostermontag'], [y + '-05-01', 'Tag der Arbeit'], [iso(plus(e, 39)), 'Christi Himmelfahrt'], [iso(plus(e, 50)), 'Pfingstmontag'],
      [y + '-07-21', 'Nationalfeiertag'], [y + '-08-15', 'Mariä Himmelfahrt'], [y + '-11-01', 'Allerheiligen'], [y + '-11-11', 'Waffenstillstand'], [y + '-12-25', 'Weihnachten']
    ].map(([date, name]) => ({ date, name }));
  };

  // Leistungen wie in eTermin eingerichtet (Demo-Kopie, schreibgeschützt; echt: eTermin-API). note = App-Notiz für die KI.
  A.APPT_TYPES = {
    inspektion: { name: 'Inspektion', minutes: 60, days: [1, 2, 3, 5, 6], window: ['09:00', '12:00'], perDay: 4, buffer: 15, resource: 'Werkstatt' },
    fahrwerk: { name: 'Fahrwerk-Service', minutes: 120, days: [1, 2, 3, 5], window: ['09:00', '12:00'], perDay: 2, buffer: 15, resource: 'Werkstatt' },
    ebike: { name: 'E-Bike-Diagnose', minutes: 60, days: [1, 2, 3, 5, 6], window: ['09:00', '12:00'], perDay: 3, buffer: 15, resource: 'Werkstatt' },
    retuel: { name: 'Retül-Bikefitting', minutes: 90, days: [2, 4], window: ['09:00', '17:00'], perDay: 2, buffer: 30, resource: 'Fitting-Studio', note: 'Kunde soll Radschuhe und Radhose mitbringen.' },
    beratung: { name: 'Kaufberatung', minutes: 45, days: [1, 2, 3, 5, 6], window: ['09:00', '18:00'], perDay: 6, buffer: 0, resource: 'Laden', shopHours: true }
  };

  A.buildState = function (todayIso) {
    const now = new Date().toISOString();
    const articles = {};
    const bikes = (D.bikes || []).concat(EXTRA);
    bikes.forEach((b, i) => {
      const s = SUP[b.id] || {};
      const images = [];
      if (b.image) images.push({ id: 'sup-1', url: b.image, label: 'Herstellerbild · Seitenansicht' });
      images.push({ id: 'sup-' + (images.length + 1), url: null, label: 'Herstellerbild · Detail (Demo-Platzhalter)' });
      images.push({ id: 'sup-' + (images.length + 1), url: null, label: 'Herstellerbild · Cockpit (Demo-Platzhalter)' });
      const media = [];
      if (b.film) media.push({ id: 'm-film-' + b.id, role: 'gallery', kind: 'image', name: 'Standbild aus Achims Film', src: FILM(b.film), focal: { x: 50, y: 50 }, variants: [], by: 'Achim', at: now });
      articles[b.id] = {
        id: b.id, name: b.name, brand: b.brand, cat: b.cat, electric: !!b.electric, source: b.source, checkedAt: b.checkedAt || null, demo: !!b.demo, uvp: b.price,
        film: b.film || null, order: i,
        supplier: { text: { title: T(b.name, b.name, b.name, b.name), teaser: s.teaser || T('', '', '', ''), description: s.description || T('', '', '', '') }, specs: b.specs || [], images, updatedAt: b.checkedAt || '2026-10-14' },
        overrides: {}, supplierUpdates: {}, hiddenSupplier: [], media, gallery: images.map(x => x.id).concat(media.map(m => m.id)), cover: images[0].url ? 'sup-1' : (media[0] ? media[0].id : 'sup-1'), hero: null, visible: true
      };
    });
    const h = (window.RP && window.RP.HOURS) || { 0: null, 1: [13, 18], 2: [13, 18], 3: [13, 18], 4: null, 5: [13, 18], 6: [9, 14] };
    const weekly = {};
    for (let d = 0; d < 7; d++) weekly[d] = h[d] ? [String(h[d][0]).padStart(2, '0') + ':00', String(h[d][1]).padStart(2, '0') + ':00'] : null;
    const y = Number(todayIso.slice(0, 4));
    const holidays = [y, y + 1].flatMap(A.belgianHolidays);
    const doors = Array.from({ length: 24 }, (_, i) => ({ n: i + 1, text: '', image: null, code: '' }));
    doors[0] = { n: 1, text: 'Gratis Kettencheck bei jedem Werkstattbesuch.', image: '../assets/shop-interior.jpg', code: 'ADVENT01' };
    doors[5] = { n: 6, text: 'Nikolaus: 10 % auf Handschuhe.', image: null, code: 'NIKO10' };
    doors[23] = { n: 24, text: 'Frohe Weihnachten aus Schönberg!', image: '../assets/achim-team.jpg', code: '' };
    return {
      v: 3, seededAt: now,
      articles,
      hours: { weekly, holidays, exceptions: [] },
      heroes: {},
      banners: [],
      modules: { advent: { enabled: false, from: y + '-12-01', to: y + '-12-24', doors } },
      appointments: { rules: JSON.parse(JSON.stringify(A.APPT_TYPES)), requests: A.seedRequests(todayIso) },
      history: [], blobs: {},
      chat: { log: [], api: [] },
      settings: { kiLimitUsd: 25, kiBaselineUsd: 4.82, kiLiveUsd: 0, erpOutage: false }
    };
  };

  A.seedRequests = function (today) {
    const next = (dow, minDays) => { let d = A.addDays(today, minDays || 1); while (A.weekday(d) !== dow) d = A.addDays(d, 1); return d; };
    const y = Number(today.slice(0, 4));
    let armistice = y + '-11-11'; if (armistice < today) armistice = (y + 1) + '-11-11';
    return [
      { id: 'T-1042', type: 'inspektion', who: 'M. K.', start: next(2) + 'T09:00', note: 'Schaltung springt bei Ultegra 11-fach, Kette quietscht.', via: 'KI-Chat → eTermin', lang: 'de', status: 'open', at: A.addDays(today, -1) + 'T18:42' },
      { id: 'T-1043', type: 'retuel', who: 'S. D.', start: next(5) + 'T10:00', note: 'Knieschmerzen nach langen Fahrten, neues Tarmac geplant.', via: 'KI-Chat → eTermin', lang: 'fr', status: 'open', at: today + 'T08:15' },
      { id: 'T-1044', type: 'beratung', who: 'J. W.', start: next(6) + 'T10:00', note: 'Gravelbike bis 2.700 €, eher sportlich.', via: 'KI-Chat → eTermin', lang: 'nl', status: 'open', at: today + 'T09:03' },
      { id: 'T-1045', type: 'ebike', who: 'P. L.', start: armistice + 'T10:00', note: 'Turbo Vado zeigt Fehler am Display.', via: 'KI-Chat → eTermin', lang: 'de', status: 'open', at: today + 'T10:27' },
      { id: 'T-1039', type: 'inspektion', who: 'R. H.', start: next(1) + 'T09:00', note: 'Jahresinspektion Roubaix.', via: 'KI-Chat → eTermin', lang: 'de', status: 'confirmed', at: A.addDays(today, -3) + 'T16:10' }
    ];
  };

  // Demo-Statistik: deterministisch je Tag, nur Aggregate (keine Personen, keine Cookies)
  function hash(s) { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return (x >>> 0) / 4294967296; }
  A.statsForDay = function (date) {
    const dow = A.weekday(date), r = hash(date), r2 = hash(date + 'c');
    const base = [210, 300, 280, 290, 250, 340, 380][dow];
    const visits = Math.round(base * (0.82 + r * 0.4));
    const chats = Math.round(visits * (0.075 + r2 * 0.035));
    const topicW = { Beratung: 0.31, Werkstatt: 0.19, 'Öffnungszeiten': 0.14, Termin: 0.12, 'Größe': 0.1, Leasing: 0.06, Anfahrt: 0.05, Sonstiges: 0.03 };
    const topics = {}; let left = chats;
    Object.entries(topicW).forEach(([k, w], i, arr) => { const v = i === arr.length - 1 ? left : Math.min(left, Math.round(chats * w * (0.8 + hash(date + k) * 0.4))); topics[k] = v; left -= v; });
    return { date, visits, chats, topics, handoffs: Math.round(chats * 0.06 + hash(date + 'h') * 1.5), appointments: Math.round(chats * 0.08 + hash(date + 'a') * 1.2), unanswered: Math.round(hash(date + 'u') * 2.4), tokensIn: chats * 5200, tokensOut: chats * 420 };
  };
  A.TOP_BIKES = [['Tarmac SL9 Expert', 0.21], ['Turbo Vado 3 EVO 4.0', 0.17], ['Crux DSW Comp', 0.14], ['Roubaix SL8', 0.12], ['Turbo Levo 4 EVO', 0.1], ['Diverge 4 Sport Alloy', 0.09], ['Stumpjumper 15 EVO', 0.07], ['Riprock 24', 0.05]];
  A.UNANSWERED = [
    { q: 'Habt ihr Leihräder für eine Woche Urlaub?', n: 6, topic: 'Verleih' },
    { q: 'Macht ihr auch Laufradbau mit DT-Swiss-Naben?', n: 4, topic: 'Werkstatt' },
    { q: 'Gibt es einen Rabatt für Vereinsmitglieder?', n: 3, topic: 'Preise' },
    { q: 'Kann ich mein altes Rad in Zahlung geben?', n: 3, topic: 'Ankauf' },
    { q: 'Wie lange dauert eine Lieferung vom Tarmac SL8?', n: 2, topic: 'Lieferzeit' }
  ];
})(window.RPA);
