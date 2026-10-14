/* =====================================================================
   RACEPOINT · KI-BERATER 2.0 (THROWAWAY)
   Live: spricht ueber /api/chat (SSE) mit dem echten Racepoint-Agenten
   (Claude) und zeigt Text, Produktkarten, Quellen und Elemente
   (Oeffnungszeiten, Kontakt, Terminwunsch, Groesse, Uebergabe, Video).
   Ohne Server (statische Vorschau) oder bei erschoepftem Kontingent
   laeuft die gescriptete Simulation mit denselben Elementen weiter.
   Animierter Orb, Glas-Panel, Spracherkennung DE/FR/NL/EN, Spracheingabe.
   API: KIBerater.open() · KIBerater.ask(text) · KIBerater.onBike(fn)
   Global: [data-ask="Frage"] und <form data-ask-form> oeffnen den Chat.
   Benoetigt assets/rp-core.js (window.RP) – laeuft notfalls auch ohne.
   ===================================================================== */
(function () {
  'use strict';

  const RP = window.RP || {
    lang: 'de', status: () => ({ open: false }), statusText: () => '', hoursRows: () => [], onLang() {}, openVideo() {},
    ytThumb: id => '<img alt="" src="https://img.youtube.com/vi/' + id + '/hqdefault.jpg">',
  };

  const state = { lang: RP.lang || 'de', cat: null, tier: null, height: null, inseam: null, brand: null, termin: null, busy: false, started: false };
  const tr = o => o == null ? '' : typeof o === 'string' ? o : (o[state.lang] || o.de || '');
  const fill = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] != null ? o[k] : '');
  const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const norm = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');

  // Oeffentliche Kontaktdaten laut racepoint.be/kontakt
  const CONTACT = { address: 'K.-F. Schinkel Straße 5, 4782 Schönberg, Belgien', phone: '+32 80 54 88 98', tel: '+3280548898', email: 'info@racepoint.be' };
  const mailto = (subject, body) => 'mailto:' + CONTACT.email + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body.slice(0, 1800));

  /* =================== Katalog =================== */
  const CATS = {
    rennrad: { color: '#E83637', label: { de: 'Rennrad', fr: 'Vélo de route', nl: 'Racefiets', en: 'Road' } },
    gravel: { color: '#d08a2e', label: { de: 'Gravel', fr: 'Gravel', nl: 'Gravel', en: 'Gravel' } },
    mtb: { color: '#2fa37a', label: { de: 'MTB', fr: 'VTT', nl: 'MTB', en: 'MTB' } },
    ebike: { color: '#4f8cff', label: { de: 'E-Bike', fr: 'Vélo électrique', nl: 'E-bike', en: 'E-bike' } },
    alltag: { color: '#a78bfa', label: { de: 'Stadt & Alltag', fr: 'Ville & quotidien', nl: 'Stad & dagelijks', en: 'City & everyday' } },
    kids: { color: '#f59e0b', label: { de: 'Kids', fr: 'Enfants', nl: 'Kids', en: 'Kids' } },
  };
  const TIERS = {
    a: { de: 'Einstieg', fr: 'Entrée de gamme', nl: 'Instap', en: 'Entry level' },
    b: { de: 'Mittelklasse', fr: 'Milieu de gamme', nl: 'Middenklasse', en: 'Mid-range' },
    c: { de: 'Traum-Build', fr: 'Build de rêve', nl: 'Droomfiets', en: 'Dream build' },
  };
  const ALU = { de: 'Alu-Rahmen', fr: 'Cadre alu', nl: 'Aluframe', en: 'Alloy frame' };
  const BIKES = [
    { id: 'allez-sport', name: 'Allez Sport', cat: 'rennrad', tier: 'a', specs: [ALU, { de: 'Carbon-Gabel', fr: 'Fourche carbone', nl: 'Carbon vork', en: 'Carbon fork' }, 'Shimano'],
      tag: { de: 'Der ehrliche Einstieg ins Rennrad.', fr: 'L’entrée honnête dans le vélo de route.', nl: 'De eerlijke instap in de racefiets.', en: 'The honest way into road cycling.' } },
    { id: 'roubaix-sl8', name: 'Roubaix SL8', cat: 'rennrad', tier: 'b', specs: ['Future Shock', { de: 'Komfort-Geometrie', fr: 'Géométrie confort', nl: 'Comfortgeometrie', en: 'Endurance fit' }, 'Carbon'],
      tag: { de: 'Lange Tage, glatter Rücken.', fr: 'Longues journées, dos détendu.', nl: 'Lange dagen, ontspannen rug.', en: 'Long days, happy back.' } },
    { id: 'tarmac-sl8-comp', name: 'Tarmac SL8 Comp', cat: 'rennrad', tier: 'b', specs: ['FACT 10r Carbon', 'Shimano 105 Di2', 'Aero'],
      tag: { de: 'Aero, leicht, bezahlbar schnell.', fr: 'Aéro, léger, vite sans se ruiner.', nl: 'Aero, licht, betaalbaar snel.', en: 'Aero, light, affordably fast.' } },
    { id: 's-works-tarmac-sl8', name: 'S-Works Tarmac SL8', cat: 'rennrad', tier: 'c', specs: ['FACT 12r', 'SRAM Red AXS', 'Roval Rapide CLX'], video: '9KIh7oOIPT4',
      tag: { de: 'Das Flaggschiff aus den Videos.', fr: 'Le vaisseau amiral des vidéos.', nl: 'Het vlaggenschip uit de video’s.', en: 'The flagship from the videos.' } },
    { id: 's-works-aethos', name: 'S-Works Aethos', cat: 'rennrad', tier: 'c', specs: ['6,1 kg', 'SRAM Red AXS', 'Roval Alpinist'], video: 'vV_rL9yq620',
      tag: { de: 'Pures Fahrgefühl statt Aero-Diktat.', fr: 'Le plaisir pur plutôt que l’aéro.', nl: 'Puur rijgevoel in plaats van aero.', en: 'Pure ride feel over aero rules.' } },
    { id: 'diverge-e5', name: 'Diverge E5', cat: 'gravel', tier: 'a', specs: [ALU, 'Future Shock', { de: 'Gepäck-Ösen', fr: 'Œillets bagages', nl: 'Bagage-ogen', en: 'Rack mounts' }],
      tag: { de: 'Robust, vielseitig, sofort startklar.', fr: 'Robuste, polyvalent, prêt à partir.', nl: 'Robuust, veelzijdig, meteen klaar.', en: 'Tough, versatile, ready to roll.' } },
    { id: 'crux-comp', name: 'Crux Comp', cat: 'gravel', tier: 'b', specs: ['Carbon', 'SRAM XPLR', { de: 'Race-Gravel', fr: 'Gravel course', nl: 'Race-gravel', en: 'Race gravel' }],
      tag: { de: 'Leicht und giftig – für die Ardennen gemacht.', fr: 'Léger et nerveux – fait pour les Ardennes.', nl: 'Licht en fel – gemaakt voor de Ardennen.', en: 'Light and lively – made for the Ardennes.' } },
    { id: 'diverge-comp-carbon', name: 'Diverge Comp Carbon', cat: 'gravel', tier: 'b', specs: ['Carbon', 'Future Shock 2.0', 'SWAT Box'],
      tag: { de: 'Der Allrounder für Schotter und Abenteuer.', fr: 'Le polyvalent pour gravier et aventure.', nl: 'De allrounder voor grind en avontuur.', en: 'The all-rounder for gravel and adventure.' } },
    { id: 's-works-crux', name: 'S-Works Crux', cat: 'gravel', tier: 'c', specs: ['7,25 kg', 'SRAM XPLR AXS', 'Roval Terra'], video: 'cIBBbESSOoc',
      tag: { de: 'Das leichteste Gravelbike von Specialized.', fr: 'Le gravel le plus léger de Specialized.', nl: 'De lichtste gravelfiets van Specialized.', en: 'Specialized’s lightest gravel bike.' } },
    { id: 'rockhopper', name: 'Rockhopper', cat: 'mtb', tier: 'a', specs: [ALU, { de: 'Federgabel', fr: 'Fourche suspendue', nl: 'Verende vork', en: 'Suspension fork' }, '29"'],
      tag: { de: 'Der Einstieg in den Wald.', fr: 'La porte d’entrée vers la forêt.', nl: 'De instap in het bos.', en: 'Your way into the woods.' } },
    { id: 'chisel', name: 'Chisel', cat: 'mtb', tier: 'a', specs: [ALU, 'XC', { de: 'leicht', fr: 'léger', nl: 'licht', en: 'light' }],
      tag: { de: 'Alu-Hardtail mit Race-Genen.', fr: 'Semi-rigide alu aux gènes de course.', nl: 'Alu-hardtail met racegenen.', en: 'Alloy hardtail with race genes.' } },
    { id: 'stumpjumper', name: 'Stumpjumper', cat: 'mtb', tier: 'b', specs: ['Trail', '145 mm', '29"'],
      tag: { de: 'Der Trail-Allrounder für Eifel und Ardennen.', fr: 'Le trail polyvalent pour l’Eifel et les Ardennes.', nl: 'De trail-allrounder voor Eifel en Ardennen.', en: 'The trail all-rounder for Eifel and Ardennes.' } },
    { id: 'enduro', name: 'Enduro', cat: 'mtb', tier: 'c', specs: ['170 mm', 'Enduro / Park', '29"'],
      tag: { de: 'Für die, die bergab nicht bremsen wollen.', fr: 'Pour ceux qui ne freinent pas en descente.', nl: 'Voor wie bergaf niet wil remmen.', en: 'For riders who don’t brake downhill.' } },
    { id: 's-works-epic-8', name: 'S-Works Epic 8', cat: 'mtb', tier: 'c', specs: ['XC', '120 mm', 'Carbon'],
      tag: { de: 'Marathon und XC – kompromisslos.', fr: 'Marathon et XC – sans compromis.', nl: 'Marathon en XC – compromisloos.', en: 'Marathon and XC – no compromise.' } },
    { id: 'turbo-como', name: 'Turbo Como', cat: 'ebike', tier: 'a', specs: [{ de: 'tiefer Einstieg', fr: 'cadre bas', nl: 'lage instap', en: 'step-through' }, { de: 'aufrecht', fr: 'position droite', nl: 'rechtop', en: 'upright' }, { de: 'Alltag', fr: 'quotidien', nl: 'dagelijks', en: 'everyday' }],
      tag: { de: 'Entspannt ankommen, jeden Tag.', fr: 'Arriver détendu, tous les jours.', nl: 'Elke dag ontspannen aankomen.', en: 'Arrive relaxed, every day.' } },
    { id: 'turbo-vado-sl', name: 'Turbo Vado SL', cat: 'ebike', tier: 'b', specs: [{ de: 'leicht', fr: 'léger', nl: 'licht', en: 'light' }, { de: 'Pendeln & Touren', fr: 'Trajets & balades', nl: 'Pendelen & toeren', en: 'Commute & tour' }, 'SL'],
      tag: { de: 'Fühlt sich an wie ein Rad – nur mit Rückenwind.', fr: 'Comme un vélo – avec le vent dans le dos.', nl: 'Voelt als een fiets – met rugwind.', en: 'Feels like a bike – with a tailwind.' } },
    { id: 'turbo-levo-sl', name: 'Turbo Levo SL', cat: 'ebike', tier: 'b', specs: ['E-MTB', 'Light', { de: 'natürliches Gefühl', fr: 'sensation naturelle', nl: 'natuurlijk gevoel', en: 'natural feel' }],
      tag: { de: 'Doppelt so viele Trails pro Nachmittag.', fr: 'Deux fois plus de sentiers par après-midi.', nl: 'Twee keer zoveel trails per middag.', en: 'Twice the trails per afternoon.' } },
    { id: 'turbo-creo', name: 'Turbo Creo', cat: 'ebike', tier: 'c', specs: ['E-Road / Gravel', 'Carbon', { de: 'leise', fr: 'silencieux', nl: 'stil', en: 'quiet' }],
      tag: { de: 'Mehr Berge, gleiches Lächeln.', fr: 'Plus de cols, le même sourire.', nl: 'Meer bergen, dezelfde glimlach.', en: 'More climbs, same smile.' } },
    { id: 'turbo-levo', name: 'Turbo Levo', cat: 'ebike', tier: 'c', specs: ['E-MTB', 'Full Power', { de: 'Höhenmeter satt', fr: 'du dénivelé à volonté', nl: 'hoogtemeters genoeg', en: 'endless climbing' }],
      tag: { de: 'Volle Power für Trails und Höhenmeter.', fr: 'Pleine puissance pour sentiers et dénivelé.', nl: 'Volle kracht voor trails en hoogtemeters.', en: 'Full power for trails and climbing.' } },
    { id: 'sirrus-x', name: 'Sirrus X', cat: 'alltag', tier: 'a', specs: [{ de: 'Fitness', fr: 'Fitness', nl: 'Fitness', en: 'Fitness' }, ALU, { de: 'Alltag & Wochenende', fr: 'Semaine & week-end', nl: 'Week & weekend', en: 'Weekday & weekend' }],
      tag: { de: 'Ein Rad für alles – vom Bäcker bis zum Feldweg.', fr: 'Un vélo pour tout – de la boulangerie au chemin.', nl: 'Eén fiets voor alles – van bakker tot veldweg.', en: 'One bike for everything – bakery to dirt road.' } },
    { id: 'turbo-vado', name: 'Turbo Vado', cat: 'alltag', tier: 'b', specs: ['E-Bike', { de: 'Licht & Gepäckträger', fr: 'Éclairage & porte-bagages', nl: 'Licht & bagagedrager', en: 'Lights & rack' }, { de: 'kraftvoll', fr: 'puissant', nl: 'krachtig', en: 'powerful' }],
      tag: { de: 'Das Auto bleibt öfter stehen.', fr: 'La voiture reste plus souvent au garage.', nl: 'De auto blijft vaker staan.', en: 'The car stays home more often.' } },
    { id: 'jett', name: 'Jett 20/24', cat: 'kids', tier: 'a', specs: ['Kids-MTB', '20" / 24"', { de: 'leicht', fr: 'léger', nl: 'licht', en: 'light' }],
      tag: { de: 'Für die nächste Generation Trailfahrer.', fr: 'Pour la prochaine génération de riders.', nl: 'Voor de volgende generatie trailrijders.', en: 'For the next generation of trail riders.' } },
    { id: 'riprock', name: 'Riprock', cat: 'kids', tier: 'a', specs: ['Kids', { de: 'dicke Reifen', fr: 'pneus larges', nl: 'dikke banden', en: 'fat tyres' }, '20" / 24"'],
      tag: { de: 'Dicke Reifen, breites Grinsen.', fr: 'Gros pneus, grand sourire.', nl: 'Dikke banden, brede grijns.', en: 'Fat tyres, big grin.' } },
  ];

  /* =================== Texte =================== */
  const S = {
    title: { de: 'Achims KI-Berater', fr: 'Conseiller IA d’Achim', nl: 'Achims AI-adviseur', en: 'Achim’s AI advisor' },
    simulation: { de: 'Simulation', fr: 'Simulation', nl: 'Simulatie', en: 'Simulation' },
    live: { de: 'Live-KI', fr: 'IA en direct', nl: 'Live-AI', en: 'Live AI' },
    discLive: { de: 'Echte KI · kann sich irren. Herstellerpreise sind keine Angebote; gebucht oder gesendet wird nichts.', fr: 'Vraie IA · peut se tromper. Les prix fabricant ne sont pas des offres ; rien n’est réservé ni envoyé.', nl: 'Echte AI · kan zich vergissen. Fabrieksprijzen zijn geen aanbod; er wordt niets geboekt of verstuurd.', en: 'Real AI · can make mistakes. Maker prices aren’t offers; nothing gets booked or sent.' },
    errGeneric: { de: 'Die KI-Beratung ist gerade nicht erreichbar. Versuch es gleich noch einmal.', fr: 'Le conseiller IA est momentanément indisponible. Réessaie dans un instant.', nl: 'De AI-adviseur is even niet bereikbaar. Probeer het zo opnieuw.', en: 'The AI advisor is unavailable right now. Please try again shortly.' },
    errSlow: { de: 'Das hat zu lange gedauert. Stell die Frage gern etwas gezielter.', fr: 'C’était trop long. Pose une question plus précise.', nl: 'Dat duurde te lang. Stel je vraag iets gerichter.', en: 'That took too long. Try a more specific question.' },
    errOffline: { de: 'Die echte KI ist hier nicht verfügbar – ich antworte mit der Offline-Simulation.', fr: 'L’IA réelle n’est pas disponible ici – je réponds avec la simulation hors ligne.', nl: 'De echte AI is hier niet beschikbaar – ik antwoord met de offline-simulatie.', en: 'The real AI isn’t available here – answering with the offline simulation.' },
    errQuota: { de: 'Das Test-Kontingent der echten KI ist für heute aufgebraucht – ab jetzt antwortet die Simulation.', fr: 'Le quota de test de l’IA est épuisé pour aujourd’hui – la simulation prend le relais.', nl: 'Het testquotum van de echte AI is voor vandaag op – vanaf nu antwoordt de simulatie.', en: 'Today’s test quota for the real AI is used up – the simulation takes over.' },
    retry: { de: 'Nochmal versuchen', fr: 'Réessayer', nl: 'Opnieuw proberen', en: 'Try again' },
    sources: { de: 'Quellen', fr: 'Sources', nl: 'Bronnen', en: 'Sources' },
    priceMaker: { de: 'Herstellerpreis', fr: 'Prix fabricant', nl: 'Fabrieksprijs', en: 'Maker price' },
    priceOpen: { de: 'Preis noch ungeprüft', fr: 'Prix non vérifié', nl: 'Prijs niet gecontroleerd', en: 'Price not verified' },
    tradeoff: { de: 'Kompromiss', fr: 'Compromis', nl: 'Compromis', en: 'Trade-off' },
    makerPage: { de: 'Herstellerseite', fr: 'Page fabricant', nl: 'Fabrikantpagina', en: 'Maker page' },
    interest: { de: 'Interesse an', fr: 'Intéressé par', nl: 'Interesse in', en: 'Interested in' },
    lAppt: { de: 'Probefahrt oder Beratung anfragen', fr: 'Demander un essai ou un conseil', nl: 'Proefrit of advies aanvragen', en: 'Request a test ride or consultation' },
    lTeam: { de: 'An das Racepoint-Team übergeben', fr: 'Transmettre à l’équipe Racepoint', nl: 'Doorgeven aan het Racepoint-team', en: 'Hand over to the Racepoint team' },
    lCompare: { de: 'Vergleich die Modelle', fr: 'Compare les modèles', nl: 'Vergelijk de modellen', en: 'Compare the models' },
    lHours: { de: 'Wann habt ihr geöffnet?', fr: 'Quand êtes-vous ouverts ?', nl: 'Wanneer zijn jullie open?', en: 'When are you open?' },
    lFind: { de: 'Hilf mir, ein Bike zu finden', fr: 'Aide-moi à trouver un vélo', nl: 'Help me een fiets te vinden', en: 'Help me find a bike' },
    lContact: { de: 'Wie erreiche ich euch?', fr: 'Comment vous joindre ?', nl: 'Hoe bereik ik jullie?', en: 'How do I reach you?' },
    wCall: { de: 'Anrufen', fr: 'Appeler', nl: 'Bellen', en: 'Call' },
    wMail: { de: 'E-Mail', fr: 'E-mail', nl: 'E-mail', en: 'Email' },
    wMailOpen: { de: 'E-Mail an Racepoint öffnen', fr: 'Ouvrir l’e-mail pour Racepoint', nl: 'E-mail aan Racepoint openen', en: 'Open email to Racepoint' },
    wCopy: { de: 'Text kopieren', fr: 'Copier le texte', nl: 'Tekst kopiëren', en: 'Copy text' },
    wLeadNote: { de: 'Wird erst gesendet, wenn du die E-Mail selbst abschickst.', fr: 'Rien n’est envoyé tant que tu n’envoies pas l’e-mail toi-même.', nl: 'Er wordt pas iets verstuurd als je de e-mail zelf verstuurt.', en: 'Nothing is sent until you send the email yourself.' },
    launcher: { de: 'Frag Achims KI', fr: 'Demande à l’IA', nl: 'Vraag het de AI', en: 'Ask Achim’s AI' },
    hints: {
      de: ['Welches Gravelbike passt?', 'Meine Rahmengröße?', 'Habt ihr gerade offen?', 'Repariert ihr mein Trek?'],
      fr: ['Quel gravel me convient ?', 'Ma taille de cadre ?', 'Vous êtes ouverts ?', 'Vous réparez mon Trek ?'],
      nl: ['Welke gravelfiets past?', 'Mijn framemaat?', 'Zijn jullie nu open?', 'Herstellen jullie mijn Trek?'],
      en: ['Which gravel bike fits?', 'My frame size?', 'Are you open now?', 'Do you fix my Trek?'],
    },
    hello: { de: 'Hi, ich bin Achims KI-Berater.', fr: 'Salut, je suis le conseiller IA d’Achim.', nl: 'Hoi, ik ben Achims AI-adviseur.', en: 'Hi, I’m Achim’s AI advisor.' },
    helloSub: { de: 'Frag mich zu Bikes, Größe, Werkstatt oder Terminen – auf Deutsch, Français, Nederlands oder English.', fr: 'Pose-moi tes questions sur les vélos, la taille, l’atelier ou les rendez-vous – en français, Deutsch, Nederlands ou English.', nl: 'Vraag me alles over fietsen, maat, werkplaats of afspraken – in het Nederlands, Deutsch, Français of English.', en: 'Ask me about bikes, sizing, the workshop or appointments – in English, Deutsch, Français or Nederlands.' },
    ph: { de: 'Frag mich etwas …', fr: 'Pose ta question …', nl: 'Stel je vraag …', en: 'Ask me anything …' },
    disclaimer: { de: 'Simulation · Empfehlungen und Abläufe sind Beispiele.', fr: 'Simulation · Conseils et démarches à titre d’exemple.', nl: 'Simulatie · Adviezen en stappen zijn voorbeelden.', en: 'Simulation · Recommendations and workflows are examples.' },
    thinking: { de: 'Achims KI denkt nach', fr: 'L’IA d’Achim réfléchit', nl: 'Achims AI denkt na', en: 'Achim’s AI is thinking' },
    listening: { de: 'Ich höre zu …', fr: 'J’écoute …', nl: 'Ik luister …', en: 'Listening …' },
    grow: { de: 'Fenster vergrößern', fr: 'Agrandir la fenêtre', nl: 'Venster vergroten', en: 'Enlarge window' },
    shrink: { de: 'Fenster verkleinern', fr: 'Réduire la fenêtre', nl: 'Venster verkleinen', en: 'Shrink window' },
    drag: { de: 'Ziehen, um die Breite zu ändern', fr: 'Glisser pour changer la largeur', nl: 'Sleep om de breedte te wijzigen', en: 'Drag to resize' },
    reset: { de: 'Neues Gespräch', fr: 'Nouvelle conversation', nl: 'Nieuw gesprek', en: 'New chat' },
    close: { de: 'Schließen', fr: 'Fermer', nl: 'Sluiten', en: 'Close' },
    copy: { de: 'Kopieren', fr: 'Copier', nl: 'Kopiëren', en: 'Copy' },
    copied: { de: 'Kopiert', fr: 'Copié', nl: 'Gekopieerd', en: 'Copied' },

    sug: [
      { k: 'find', i: 'bike', de: 'Welches Bike passt zu mir?', fr: 'Quel vélo me convient ?', nl: 'Welke fiets past bij mij?', en: 'Which bike suits me?' },
      { k: 'size', i: 'ruler', de: 'Meine Rahmengröße berechnen', fr: 'Calculer ma taille de cadre', nl: 'Mijn framemaat berekenen', en: 'Work out my frame size' },
      { k: 'service', i: 'wrench', de: 'Repariert ihr auch mein Trek?', fr: 'Vous réparez aussi mon Trek ?', nl: 'Herstellen jullie ook mijn Trek?', en: 'Do you service my Trek too?' },
      { k: 'hours', i: 'clock', de: 'Habt ihr gerade geöffnet?', fr: 'Vous êtes ouverts maintenant ?', nl: 'Zijn jullie nu open?', en: 'Are you open right now?' },
      { k: 'ebike', i: 'bolt', de: 'E-Bike bis 4.000 € für Touren', fr: 'Vélo électrique jusqu’à 4 000 € pour balades', nl: 'E-bike tot € 4.000 voor tochten', en: 'E-bike up to €4,000 for touring' },
      { k: 'fit', i: 'cal', de: 'Bikefitting-Termin buchen', fr: 'Réserver un bike fitting', nl: 'Bikefitting boeken', en: 'Book a bike fitting' },
    ],

    greet: { de: 'Hi! 👋 Wobei kann ich helfen – Bike finden, Werkstatt oder Termin?', fr: 'Salut ! 👋 Je peux t’aider à trouver un vélo, pour l’atelier ou un rendez-vous ?', nl: 'Hoi! 👋 Waarmee kan ik helpen – fiets zoeken, werkplaats of afspraak?', en: 'Hi! 👋 How can I help – find a bike, workshop or appointment?' },
    thanks: { de: 'Sehr gern! Wenn noch was ist – ich bin hier. Bis bald in Schönberg.', fr: 'Avec plaisir ! Je reste là si besoin. À bientôt à Schönberg.', nl: 'Graag gedaan! Als er nog iets is – ik ben hier. Tot snel in Schönberg.', en: 'You’re welcome! I’m here if you need anything. See you in Schönberg.' },
    askCat: { de: 'Gern! Worauf fährst du am liebsten – oder worauf hast du Lust?', fr: 'Avec plaisir ! Tu roules plutôt sur quoi – ou de quoi as-tu envie ?', nl: 'Graag! Waar rijd je het liefst – of waar heb je zin in?', en: 'Happy to help! What do you like to ride – or what are you dreaming of?' },
    askBudget: { de: '**{cat}** – sehr gute Wahl. In welchem Budget bewegst du dich ungefähr? Wir haben für jedes Budget etwas.', fr: '**{cat}** – excellent choix. Quel budget à peu près ? Nous avons quelque chose pour chaque budget.', nl: '**{cat}** – goede keuze. Welk budget heb je ongeveer? We hebben iets voor elk budget.', en: '**{cat}** – great choice. Roughly what budget? We have something for every budget.' },
    recIntro: { de: 'Für **{cat}** im Bereich **{tier}** würde Achim dir diese Bikes zeigen:', fr: 'Pour **{cat}** en **{tier}**, Achim te montrerait ces vélos :', nl: 'Voor **{cat}** in de **{tier}** zou Achim je deze fietsen tonen:', en: 'For **{cat}** in the **{tier}** range, Achim would show you these:' },
    recOutro: { de: 'Damit es wirklich passt, stellen wir Größe und Sitzposition beim **Retül-Bikefitting** auf dich ein. Lust auf eine Probefahrt?', fr: 'Pour un réglage parfait, on ajuste taille et position lors du **bike fitting Retül**. Envie d’un essai ?', nl: 'Zodat alles echt past, stellen we maat en zithouding af met **Retül-bikefitting**. Zin in een proefrit?', en: 'To make it fit perfectly, we dial in size and position with a **Retül bike fit**. Fancy a test ride?' },
    unsure: { de: 'Kein Problem – das finden wir gemeinsam raus. Hier ein Querschnitt vom Einstieg bis zum Traum-Build:', fr: 'Pas de souci – on trouvera ensemble. Voici un aperçu, de l’entrée de gamme au build de rêve :', nl: 'Geen probleem – dat zoeken we samen uit. Een overzicht van instap tot droomfiets:', en: 'No problem – we’ll figure it out together. Here’s a spread from entry level to dream build:' },
    sizeIntro: { de: 'Schieb die Regler auf deine Maße – ich rechne live mit:', fr: 'Règle les curseurs à tes mesures – je calcule en direct :', nl: 'Zet de schuifjes op jouw maten – ik reken live mee:', en: 'Set the sliders to your measurements – I’ll calculate live:' },
    sizeKnown: { de: 'Bei **{h} cm** Körpergröße liegst du beim {cat} meist bei **{size}**. Den letzten Millimeter holen wir beim Bikefitting raus – hier kannst du selbst nachjustieren:', fr: 'Avec **{h} cm**, tu es généralement en **{size}** pour un {cat}. Le dernier millimètre, on le règle au bike fitting – ajuste toi-même ici :', nl: 'Met **{h} cm** zit je bij een {cat} meestal op **{size}**. De laatste millimeter halen we eruit bij de bikefitting – stel hier zelf bij:', en: 'At **{h} cm** you’re usually a **{size}** on a {cat}. We find the last millimetre at the bike fit – fine-tune it here:' },
    serviceAll: { de: 'Klar – **wir warten und reparieren alle Marken**, nicht nur Specialized.', fr: 'Bien sûr – **nous entretenons et réparons toutes les marques**, pas seulement Specialized.', nl: 'Zeker – **we onderhouden en herstellen alle merken**, niet alleen Specialized.', en: 'Sure – **we service and repair every brand**, not just Specialized.' },
    serviceBrand: { de: 'Dein **{brand}** ist bei uns in guten Händen.', fr: 'Ton **{brand}** est entre de bonnes mains.', nl: 'Je **{brand}** is bij ons in goede handen.', en: 'Your **{brand}** is in good hands.' },
    serviceMore: { de: 'Die Werkstatt arbeitet vormittags – bring dein Rad am besten zur Öffnung vorbei. Was steht an?', fr: 'L’atelier travaille le matin – dépose ton vélo de préférence à l’ouverture. De quoi as-tu besoin ?', nl: 'De werkplaats werkt ’s ochtends – breng je fiets best bij opening binnen. Wat moet er gebeuren?', en: 'The workshop works in the mornings – best drop your bike off at opening time. What do you need?' },
    sInspect: { de: 'Eine komplette Inspektion dauert meist **1–2 Tage**. Wir melden uns, sobald dein Rad fertig ist.', fr: 'Une révision complète prend en général **1 à 2 jours**. On te prévient dès que ton vélo est prêt.', nl: 'Een volledige onderhoudsbeurt duurt meestal **1–2 dagen**. We laten iets weten zodra je fiets klaar is.', en: 'A full service usually takes **1–2 days**. We’ll let you know as soon as your bike is ready.' },
    sRepair: { de: 'Schreib kurz, was klemmt – Kleinigkeiten machen wir oft direkt, Größeres planen wir ein.', fr: 'Dis-moi ce qui coince – les petites choses, on les fait souvent tout de suite, le reste on le planifie.', nl: 'Zeg kort wat er scheelt – kleine dingen doen we vaak meteen, grotere klussen plannen we in.', en: 'Tell me what’s wrong – small fixes are often done on the spot, bigger jobs get scheduled.' },
    sSusp: { de: 'Gabel und Dämpfer pflegen wir regelmäßig – gerade für die Trails in Eifel und Ardennen. Plan **2–3 Tage** ein.', fr: 'Fourches et amortisseurs, on connaît – surtout pour les sentiers de l’Eifel et des Ardennes. Compte **2 à 3 jours**.', nl: 'Vork en demper onderhouden we regelmatig – zeker voor de trails in Eifel en Ardennen. Reken op **2–3 dagen**.', en: 'We service forks and shocks all the time – especially for Eifel and Ardennes trails. Allow **2–3 days**.' },
    fitting: { de: 'Beim **Retül-Bikefitting** vermessen wir dich in Bewegung – Knie, Hüfte, Rücken. Plan rund **1,5 Stunden** ein. Das Ergebnis: mehr Druck aufs Pedal, weniger Schmerzen.', fr: 'Lors du **bike fitting Retül**, on te mesure en mouvement – genoux, hanches, dos. Compte environ **1 h 30**. Résultat : plus de puissance, moins de douleurs.', nl: 'Bij de **Retül-bikefitting** meten we je in beweging – knie, heup, rug. Reken op zo’n **1,5 uur**. Resultaat: meer kracht, minder pijn.', en: 'In a **Retül bike fit** we measure you in motion – knees, hips, back. Allow about **1.5 hours**. The result: more power, less pain.' },
    hoursOpen: { de: 'Ja! **{s}**. Komm einfach vorbei – hier die ganze Woche:', fr: 'Oui ! **{s}**. Passe quand tu veux – voici toute la semaine :', nl: 'Ja! **{s}**. Kom gerust langs – hier de hele week:', en: 'Yes! **{s}**. Just drop by – here’s the whole week:' },
    hoursClosed: { de: 'Gerade nicht – **{s}**. Hier die ganze Woche:', fr: 'Pas en ce moment – **{s}**. Voici toute la semaine :', nl: 'Nu even niet – **{s}**. Hier de hele week:', en: 'Not right now – **{s}**. Here’s the whole week:' },
    where: { de: 'Du findest uns in der **K.-F. Schinkel Straße 5 in Schönberg, Ostbelgien** – mitten im Dreiländereck, gut erreichbar aus DE, BE und LU.', fr: 'Tu nous trouves à **Schönberg, dans les Cantons de l’Est** – au cœur des trois frontières, facile d’accès depuis l’Allemagne, la Belgique et le Luxembourg.', nl: 'Je vindt ons in **Schönberg, Oost-België** – midden in het drielandenpunt, vlot bereikbaar vanuit DE, BE en LU.', en: 'You’ll find us in **Schönberg, East Belgium** – right where Germany, Belgium and Luxembourg meet.' },
    termin: { de: 'Such dir einen Slot aus – Achim oder Elke bestätigen ihn dir persönlich.', fr: 'Choisis un créneau – Achim ou Elke te le confirment personnellement.', nl: 'Kies een moment – Achim of Elke bevestigen het persoonlijk.', en: 'Pick a slot – Achim or Elke will confirm it personally.' },
    leasing: { de: 'Ja, sprich uns an: **Leasing über den Arbeitgeber** und **Finanzierung** sind möglich – Achim klärt mit dir, was am meisten Sinn macht.', fr: 'Oui, parles-en avec nous : **leasing via l’employeur** et **financement** sont possibles – Achim voit avec toi ce qui convient le mieux.', nl: 'Ja, spreek ons aan: **fietsleasing via je werkgever** en **financiering** zijn mogelijk – Achim bekijkt samen met jou wat het best past.', en: 'Yes, just ask: **leasing through your employer** and **financing** are possible – Achim will work out what makes most sense for you.' },
    video: { de: 'Frisch aus der Werkstatt – das neueste Build-Video:', fr: 'Tout frais de l’atelier – la dernière vidéo de montage :', nl: 'Vers uit de werkplaats – de nieuwste build-video:', en: 'Fresh from the workshop – the latest build video:' },
    achim: { de: '**Achim Leufgen** ist Zweiradmechaniker-Meister und baut seit 18 Jahren Bikes, die wirklich passen – zusammen mit Elke und dem Team in Schönberg. Rund 80.000 Leute schauen ihm auf YouTube dabei zu.', fr: '**Achim Leufgen** est maître mécanicien cycles et construit depuis 18 ans des vélos qui vont vraiment – avec Elke et l’équipe à Schönberg. Près de 80 000 personnes le suivent sur YouTube.', nl: '**Achim Leufgen** is meester-fietsmecanicien en bouwt al 18 jaar fietsen die echt passen – samen met Elke en het team in Schönberg. Zo’n 80.000 mensen kijken mee op YouTube.', en: '**Achim Leufgen** is a master bike mechanic who has built bikes that truly fit for 18 years – with Elke and the team in Schönberg. Around 80,000 people watch him on YouTube.' },
    price: { de: 'Preise hängen stark von Ausstattung und Größe ab – Achim nennt sie dir lieber im Gespräch. Wichtig: **Wir haben Bikes für jedes Budget**, vom Einstieg bis zum S-Works.', fr: 'Les prix dépendent beaucoup de l’équipement et de la taille – Achim préfère en parler avec toi. L’essentiel : **nous avons des vélos pour chaque budget**, de l’entrée de gamme au S-Works.', nl: 'Prijzen hangen sterk af van uitrusting en maat – Achim bespreekt ze liever persoonlijk. Belangrijk: **we hebben fietsen voor elk budget**, van instap tot S-Works.', en: 'Prices depend a lot on spec and size – Achim prefers to talk them through with you. Key point: **we have bikes for every budget**, from entry level to S-Works.' },
    testride: { de: 'Probefahrt? Sehr gern! Viele Modelle stehen im Laden bereit – sag kurz Bescheid, dann ist dein Wunschrad eingestellt.', fr: 'Un essai ? Avec plaisir ! Beaucoup de modèles sont au magasin – préviens-nous et ton vélo sera réglé.', nl: 'Een proefrit? Graag! Veel modellen staan klaar in de winkel – laat het even weten, dan staat je fiets afgesteld.', en: 'A test ride? Absolutely! Lots of models are ready in store – let us know and your bike will be set up.' },
    fallback: { de: 'Gute Frage – die beantwortet Achim am besten persönlich. Ich gebe sie dir gern direkt an ihn weiter:', fr: 'Bonne question – Achim y répondra mieux en personne. Je peux la lui transmettre directement :', nl: 'Goede vraag – die beantwoordt Achim het best persoonlijk. Ik geef ze graag aan hem door:', en: 'Good question – Achim answers that best in person. I can pass it straight on to him:' },
    handoff: { de: 'Ich fasse kurz zusammen und gebe es an Achim weiter:', fr: 'Je résume et je transmets à Achim :', nl: 'Ik vat het kort samen en geef het door aan Achim:', en: 'Here’s a quick summary for Achim:' },
    offerLang: { de: 'Seite auf Deutsch anzeigen', fr: 'Afficher le site en français', nl: 'Site in het Nederlands tonen', en: 'Show the site in English' },

    // Chips
    cSize: { de: 'Rahmengröße berechnen', fr: 'Calculer ma taille', nl: 'Framemaat berekenen', en: 'Find my size' },
    cTest: { de: 'Probefahrt vereinbaren', fr: 'Réserver un essai', nl: 'Proefrit plannen', en: 'Book a test ride' },
    cSend: { de: 'An Achim senden', fr: 'Envoyer à Achim', nl: 'Naar Achim sturen', en: 'Send to Achim' },
    cOther: { de: 'Andere Kategorie', fr: 'Autre catégorie', nl: 'Andere categorie', en: 'Other category' },
    cHours: { de: 'Öffnungszeiten', fr: 'Horaires', nl: 'Openingsuren', en: 'Opening hours' },
    cWhere: { de: 'Anfahrt', fr: 'Itinéraire', nl: 'Route', en: 'Directions' },
    cTermin: { de: 'Termin buchen', fr: 'Prendre rendez-vous', nl: 'Afspraak maken', en: 'Book appointment' },
    cFind: { de: 'Bike finden', fr: 'Trouver un vélo', nl: 'Fiets zoeken', en: 'Find a bike' },
    cService: { de: 'Werkstatt', fr: 'Atelier', nl: 'Werkplaats', en: 'Workshop' },
    cLeasing: { de: 'Leasing & Finanzierung', fr: 'Leasing & financement', nl: 'Leasing & financiering', en: 'Leasing & finance' },
    cVideo: { de: 'Neuestes Video', fr: 'Dernière vidéo', nl: 'Nieuwste video', en: 'Latest video' },
    cRestart: { de: 'Von vorn', fr: 'Recommencer', nl: 'Opnieuw', en: 'Start over' },
    cInspect: { de: 'Inspektion', fr: 'Révision', nl: 'Onderhoudsbeurt', en: 'Service' },
    cRepair: { de: 'Reparatur', fr: 'Réparation', nl: 'Herstelling', en: 'Repair' },
    cSusp: { de: 'Fahrwerk-Service', fr: 'Service suspensions', nl: 'Vering-service', en: 'Suspension service' },
    cFit: { de: 'Bikefitting', fr: 'Bike fitting', nl: 'Bikefitting', en: 'Bike fitting' },
    budgets: [
      { t: 'a', de: 'bis 2.500 €', fr: 'jusqu’à 2 500 €', nl: 'tot € 2.500', en: 'up to €2,500' },
      { t: 'b', de: '2.500–5.000 €', fr: '2 500–5 000 €', nl: '€ 2.500–5.000', en: '€2,500–5,000' },
      { t: 'c', de: '5.000 € +', fr: '5 000 € et plus', nl: '€ 5.000+', en: '€5,000+' },
      { t: null, de: 'Weiß ich noch nicht', fr: 'Je ne sais pas encore', nl: 'Weet ik nog niet', en: 'Not sure yet' },
    ],

    // Widgets
    wAsk: { de: 'Anfragen', fr: 'Demander', nl: 'Aanvragen', en: 'Enquire' },
    w3d: { de: 'In 3D zeigen', fr: 'Voir en 3D', nl: 'Bekijk in 3D', en: 'View in 3D' },
    wVideo: { de: 'Video', fr: 'Vidéo', nl: 'Video', en: 'Video' },
    wHeight: { de: 'Körpergröße', fr: 'Taille', nl: 'Lichaamslengte', en: 'Height' },
    wInseam: { de: 'Schrittlänge', fr: 'Entrejambe', nl: 'Binnenbeenlengte', en: 'Inseam' },
    wFrame: { de: 'Rahmengröße', fr: 'Taille de cadre', nl: 'Framemaat', en: 'Frame size' },
    wSaddle: { de: 'Sitzhöhe ca.', fr: 'Hauteur de selle env.', nl: 'Zadelhoogte ca.', en: 'Saddle height approx.' },
    wSizeNote: { de: 'Richtwert – exakt wird’s beim Retül-Bikefitting.', fr: 'Valeur indicative – le réglage précis se fait au fitting Retül.', nl: 'Richtwaarde – exact wordt het bij de Retül-fitting.', en: 'Guide value – the Retül fit makes it exact.' },
    wWhat: { de: 'Was steht an?', fr: 'De quoi s’agit-il ?', nl: 'Waarvoor?', en: 'What for?' },
    wTypes: [
      { k: 'beratung', min: 45, de: 'Beratung', fr: 'Conseil', nl: 'Advies', en: 'Consultation' },
      { k: 'fitting', min: 90, de: 'Bikefitting', fr: 'Bike fitting', nl: 'Bikefitting', en: 'Bike fitting' },
      { k: 'service', min: 15, de: 'Werkstatt-Annahme', fr: 'Dépôt atelier', nl: 'Werkplaats-afgifte', en: 'Workshop drop-off' },
    ],
    wDay: { de: 'Tag', fr: 'Jour', nl: 'Dag', en: 'Day' },
    wTime: { de: 'Uhrzeit', fr: 'Heure', nl: 'Tijd', en: 'Time' },
    wBook: { de: 'Terminwunsch vorbereiten', fr: 'Préparer la demande', nl: 'Afspraakwens voorbereiden', en: 'Prepare request' },
    wBooked: { de: 'Terminwunsch vorbereitet', fr: 'Demande préparée', nl: 'Afspraakwens voorbereid', en: 'Request prepared' },
    wBookedSub: { de: 'Noch nicht gebucht: Schick die E-Mail ab oder ruf an – Racepoint bestätigt dir den Termin.', fr: 'Pas encore réservé : envoie l’e-mail ou appelle – Racepoint te confirme le rendez-vous.', nl: 'Nog niet geboekt: verstuur de e-mail of bel – Racepoint bevestigt je afspraak.', en: 'Not booked yet: send the email or call – Racepoint will confirm your appointment.' },
    wToday: { de: 'heute', fr: 'aujourd’hui', nl: 'vandaag', en: 'today' },
    wHoursT: { de: 'Öffnungszeiten', fr: 'Horaires', nl: 'Openingsuren', en: 'Opening hours' },
    wWorkshop: { de: 'Werkstatt arbeitet vormittags', fr: 'L’atelier travaille le matin', nl: 'Werkplaats werkt ’s ochtends', en: 'Workshop works mornings' },
    wRoute: { de: 'Route planen', fr: 'Planifier l’itinéraire', nl: 'Route plannen', en: 'Plan route' },
    wLead: { de: 'Anliegen für das Racepoint-Team', fr: 'Demande pour l’équipe Racepoint', nl: 'Vraag voor het Racepoint-team', en: 'Request for the Racepoint team' },
    wInterest: { de: 'Interesse', fr: 'Intérêt', nl: 'Interesse', en: 'Interest' },
    wBudget: { de: 'Budget', fr: 'Budget', nl: 'Budget', en: 'Budget' },
    wSizeL: { de: 'Größe', fr: 'Taille', nl: 'Maat', en: 'Size' },
    wAppt: { de: 'Termin', fr: 'Rendez-vous', nl: 'Afspraak', en: 'Appointment' },
    wPlace: { de: 'Ort', fr: 'Lieu', nl: 'Plaats', en: 'Place' },
    wName: { de: 'Dein Name (optional)', fr: 'Ton prénom (optionnel)', nl: 'Je naam (optioneel)', en: 'Your name (optional)' },
    wQuestion: { de: 'Frage', fr: 'Question', nl: 'Vraag', en: 'Question' },
    cities: [
      { de: 'St. Vith', fr: 'Saint-Vith', nl: 'Sankt Vith', en: 'St. Vith', t: '~10 min', x: 30, y: 64 },
      { de: 'Aachen', fr: 'Aix-la-Chapelle', nl: 'Aken', en: 'Aachen', t: '~1 h', x: 62, y: 14 },
      { de: 'Lüttich', fr: 'Liège', nl: 'Luik', en: 'Liège', t: '~1 h', x: 18, y: 26 },
      { de: 'Luxemburg', fr: 'Luxembourg', nl: 'Luxemburg', en: 'Luxembourg', t: '~1 h 15', x: 44, y: 92 },
      { de: 'Köln', fr: 'Cologne', nl: 'Keulen', en: 'Cologne', t: '~1 h 45', x: 92, y: 10 },
    ],
  };

  /* =================== Mini-Bike-Illustration (SVG) =================== */
  function bikeSVG(cat, color) {
    color = color || (CATS[cat] || CATS.rennrad).color;
    const fat = { mtb: 6.5, gravel: 5, ebike: 5.5, kids: 6, alltag: 4.5 }[cat] || 3.6;
    const R = cat === 'kids' ? 24 : 30, rx = cat === 'kids' ? 58 : 48, fx = cat === 'kids' ? 142 : 152, wy = cat === 'kids' ? 88 : 82;
    const bb = cat === 'kids' ? [90, 90] : [90, 86];
    const st = cat === 'mtb' || cat === 'kids' ? [80, 50] : [79, 40];
    const ht = cat === 'mtb' ? [132, 44] : cat === 'alltag' ? [131, 40] : cat === 'kids' ? [126, 54] : [136, 42];
    const hb = [ht[0] + 4, ht[1] + 13];
    const tire = '<circle cx="{x}" cy="' + wy + '" r="' + (R - fat / 2) + '" fill="none" stroke="#e7e7ea" stroke-opacity=".9" stroke-width="' + fat + '"/>' +
      '<circle cx="{x}" cy="' + wy + '" r="' + (R - fat - 3) + '" fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="' + (cat === 'rennrad' ? 5 : 2) + '"/>' +
      '<circle cx="{x}" cy="' + wy + '" r="2.4" fill="#fff" fill-opacity=".8"/>';
    const tubeW = cat === 'ebike' ? 4.5 : 4;
    let s = '<svg viewBox="0 0 200 124" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
    s += tire.replace(/\{x\}/g, rx) + tire.replace(/\{x\}/g, fx);
    s += '<g fill="none" stroke="' + color + '" stroke-width="' + tubeW + '" stroke-linecap="round" stroke-linejoin="round">';
    s += '<path d="M' + bb + ' L' + st + '"/>'; // Sitzrohr
    s += '<path d="M' + bb + ' L' + hb + '"/>'; // Unterrohr
    if (cat === 'ebike') s += '<path d="M' + (bb[0] + 7) + ',' + (bb[1] - 7) + ' L' + (hb[0] - 6) + ',' + (hb[1] + 7) + '" stroke-width="9" stroke-opacity=".85"/>';
    if (cat === 'alltag') s += '<path d="M' + (bb[0] - 2) + ',' + (bb[1] - 14) + ' Q 110,60 ' + hb + '"/>';
    else s += '<path d="M' + (st[0] + 1) + ',' + (st[1] + 6) + ' L' + ht + '"/>'; // Oberrohr
    s += '<path d="M' + ht + ' L' + hb + '" stroke-width="5.5"/>'; // Steuerrohr
    s += '<path d="M' + bb + ' L' + rx + ',' + wy + '"/>'; // Kettenstrebe
    s += '<path d="M' + rx + ',' + wy + ' L' + (st[0] + 3) + ',' + (st[1] + 12) + '"/>'; // Sitzstrebe
    s += '</g>';
    // Gabel
    if (cat === 'mtb') {
      s += '<path d="M' + hb + ' L' + (fx - 4) + ',' + (wy - 22) + '" stroke="#2b2d31" stroke-width="7" stroke-linecap="round"/>' +
        '<path d="M' + (hb[0] + 1) + ',' + (hb[1] + 2) + ' L' + (fx - 6) + ',' + (wy - 24) + '" stroke="#e8b14a" stroke-width="3.2" stroke-linecap="round"/>' +
        '<path d="M' + (fx - 5) + ',' + (wy - 23) + ' L' + fx + ',' + wy + '" stroke="#2b2d31" stroke-width="5" stroke-linecap="round"/>' +
        '<path d="M' + (st[0] + 4) + ',' + (st[1] + 18) + ' L' + (bb[0] + 12) + ',' + (bb[1] - 24) + '" stroke="#d4d4d8" stroke-width="5" stroke-linecap="round"/>';
    } else {
      s += '<path d="M' + hb + ' L' + fx + ',' + wy + '" stroke="' + color + '" stroke-width="3.6" stroke-linecap="round"/>';
    }
    // Lenker
    const bx = ht[0], by = ht[1] - 5;
    s += '<g fill="none" stroke="#e7e7ea" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">';
    s += '<path d="M' + ht + ' L' + (bx - 1) + ',' + by + ' L' + (bx + 9) + ',' + (by - 1) + '"/>';
    if (cat === 'rennrad' || cat === 'gravel') {
      const fl = cat === 'gravel' ? 3 : 0;
      s += '<path d="M' + (bx + 9) + ',' + (by - 1) + ' q 7,0 7,6 q ' + fl + ',7 -5,9"/>';
    } else if (cat === 'alltag') {
      s += '<path d="M' + (bx + 9) + ',' + (by - 1) + ' q -4,-6 -12,-6"/>';
    } else {
      s += '<path d="M' + (bx + 2) + ',' + (by - 2) + ' L' + (bx + 14) + ',' + (by - 3) + '" stroke-width="3.4"/>';
    }
    s += '</g>';
    // Sattel + Stuetze
    const sx = st[0] - 3, sy = st[1] - 7;
    s += '<path d="M' + st + ' L' + sx + ',' + sy + '" stroke="#d4d4d8" stroke-width="3" stroke-linecap="round"/>';
    s += '<path d="M' + (sx - 12) + ',' + (sy - 1) + ' q 10,-5 22,-1 q -9,4 -22,1z" fill="#f4f4f5" stroke="#f4f4f5" stroke-width="2" stroke-linejoin="round"/>';
    // Kurbel
    s += '<circle cx="' + bb[0] + '" cy="' + bb[1] + '" r="' + (cat === 'ebike' ? 9 : 7) + '" fill="' + (cat === 'ebike' ? '#2b2d31' : 'none') + '" stroke="#e7e7ea" stroke-width="2.4"/>';
    s += '<path d="M' + bb + ' l 8,9" stroke="#e7e7ea" stroke-width="3" stroke-linecap="round"/>';
    if (cat === 'alltag') s += '<path d="M' + (rx - 26) + ',' + (wy - 14) + ' A 30 30 0 0 1 ' + (rx + 20) + ',' + (wy - 24) + '" fill="none" stroke="#e7e7ea" stroke-opacity=".7" stroke-width="2.4"/><path d="M' + (rx - 6) + ',' + (wy - 34) + ' L' + (st[0] - 4) + ',' + (st[1] + 10) + '" stroke="#e7e7ea" stroke-width="2.4"/>';
    s += '</svg>';
    return s;
  }

  /* =================== Groessen-Logik =================== */
  function frameSize(h, cat) {
    if (cat === 'mtb' || cat === 'ebike' || cat === 'kids') {
      const t = [[160, 'S1 · XS'], [170, 'S2 · S'], [178, 'S3 · M'], [186, 'S4 · L'], [194, 'S5 · XL'], [999, 'S6 · XXL']];
      return t.find(x => h < x[0])[1];
    }
    if (cat === 'alltag') {
      const t = [[160, 'XS'], [170, 'S'], [178, 'M'], [186, 'L'], [999, 'XL']];
      return t.find(x => h < x[0])[1];
    }
    const t = [[155, '44'], [163, '49'], [170, '52'], [176, '54'], [183, '56'], [190, '58'], [999, '61']];
    return t.find(x => h < x[0])[1] + ' cm';
  }

  /* =================== Styles =================== */
  const css = `
  .kib,.kib *{box-sizing:border-box}
  .kib{--kr:#E83637;--ko:#ff7a45;--kp:#ffd6b0;font-family:'Roboto Condensed',system-ui,sans-serif;color:#f4f4f5;-webkit-font-smoothing:antialiased}
  .kib button{font:inherit;color:inherit;cursor:pointer}
  /* ---- Launcher-Orb ---- */
  .kib-launch{position:fixed;right:20px;bottom:88px;z-index:61;display:flex;align-items:center;gap:10px;flex-direction:row-reverse}
  .kib-orb{position:relative;width:58px;height:58px;border-radius:50%;border:0;padding:0;background:#0e0f11;box-shadow:0 14px 40px rgba(232,54,55,.35),0 4px 14px rgba(0,0,0,.5);transition:transform .35s cubic-bezier(.2,.9,.3,1.4)}
  .kib-orb:hover{transform:scale(1.08)}
  .kib-orb::before{content:"";position:absolute;inset:-2px;border-radius:50%;background:conic-gradient(from var(--a,0deg),var(--kr),var(--ko),var(--kp),#fff,var(--kr));animation:kibSpin 4s linear infinite;filter:blur(.3px)}
  .kib-orb::after{content:"";position:absolute;inset:3px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a1a1b 0%,#141518 55%,#0b0b0d 100%)}
  .kib-orb i{position:absolute;inset:0;z-index:1;display:grid;place-items:center}
  .kib-orb i svg{width:26px;height:26px}
  .kib-orb b{position:absolute;inset:12px;border-radius:50%;z-index:1;background:radial-gradient(circle,rgba(255,122,69,.55),rgba(232,54,55,0) 70%);animation:kibBreath 3.2s ease-in-out infinite}
  .kib-orb .kib-ping{position:absolute;right:2px;top:2px;width:12px;height:12px;border-radius:50%;background:#22c55e;border:2px solid #0e0f11;z-index:2}
  @property --a{syntax:'<angle>';inherits:false;initial-value:0deg}
  @keyframes kibSpin{to{--a:360deg}}
  @keyframes kibBreath{0%,100%{transform:scale(.75);opacity:.6}50%{transform:scale(1.15);opacity:1}}
  .kib-label{display:flex;flex-direction:column;align-items:flex-end;pointer-events:none;opacity:0;transform:translateX(8px);transition:opacity .5s,transform .5s}
  .kib-label.on{opacity:1;transform:none}
  .kib-label span{padding:9px 14px;border-radius:14px 14px 4px 14px;background:rgba(14,15,17,.88);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.1);font-size:14px;font-weight:700;letter-spacing:.02em;white-space:nowrap;box-shadow:0 10px 30px rgba(0,0,0,.35)}
  .kib-label small{margin-top:5px;font-size:12px;color:rgba(255,255,255,.7);background:rgba(14,15,17,.7);padding:4px 10px;border-radius:999px;backdrop-filter:blur(8px);min-height:22px}
  .kib-open .kib-launch{opacity:0;pointer-events:none;transform:scale(.6)}
  .kib-launch{transition:opacity .3s,transform .3s}
  /* ---- Panel ---- */
  .kib-panel{position:fixed;z-index:80;right:20px;top:20px;bottom:20px;width:min(var(--kib-w,430px),calc(100vw - 40px));display:flex;flex-direction:column;border-radius:28px;overflow:hidden;
    background:linear-gradient(180deg,rgba(26,27,31,.92),rgba(13,14,16,.94));backdrop-filter:blur(26px) saturate(140%);-webkit-backdrop-filter:blur(26px) saturate(140%);
    border:1px solid rgba(255,255,255,.1);box-shadow:0 40px 120px rgba(0,0,0,.6),0 0 0 1px rgba(0,0,0,.4);
    transform-origin:calc(100% - 29px) calc(100% - 97px);transform:scale(.2);opacity:0;pointer-events:none;transition:transform .55s cubic-bezier(.2,.9,.25,1),opacity .35s}
  .kib-open .kib-panel{transform:none;opacity:1;pointer-events:auto}
  .kib-panel::before{content:"";position:absolute;inset:-40% -30% auto auto;width:360px;height:360px;border-radius:50%;background:radial-gradient(circle,rgba(232,54,55,.28),rgba(232,54,55,0) 65%);pointer-events:none;filter:blur(10px)}
  .kib-head{position:relative;display:flex;align-items:center;gap:12px;padding:16px 14px 14px 18px;border-bottom:1px solid rgba(255,255,255,.07)}
  .kib-av{position:relative;width:40px;height:40px;flex:none;border-radius:50%;background:#0e0f11}
  .kib-av::before{content:"";position:absolute;inset:-1.5px;border-radius:50%;background:conic-gradient(from var(--a,0deg),var(--kr),var(--ko),var(--kp),#fff,var(--kr));animation:kibSpin 4s linear infinite}
  .kib-av::after{content:"";position:absolute;inset:2px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a1a1b,#111214 70%)}
  .kib-av i{position:absolute;inset:0;z-index:1;display:grid;place-items:center}.kib-av i svg{width:19px;height:19px}
  .kib-ttl{flex:1;min-width:0}
  .kib-ttl b{display:block;font-size:16px;letter-spacing:.01em}
  .kib-simulation{display:inline-block;margin:3px 0;padding:2px 6px;border-radius:4px;background:#ffffff1f;color:#fff;font:600 10px/1.4 Arial,sans-serif;letter-spacing:.03em}
  .kib-ttl small{display:block;font-size:12px;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kib-ttl small .rp-dot{width:7px;height:7px}
  .kib-resize{position:absolute;left:0;top:28px;bottom:28px;width:12px;z-index:3;cursor:ew-resize;touch-action:none}
  .kib-resize::after{content:"";position:absolute;left:4px;top:50%;width:4px;height:54px;margin-top:-27px;border-radius:4px;background:rgba(255,255,255,.18);opacity:0;transition:opacity .2s}
  .kib-panel:hover .kib-resize::after,.kib-resize:focus-visible::after,.kib-resizing .kib-resize::after{opacity:1}
  .kib-resizing{transition:none!important;user-select:none}
  .kib-big .kib-log{padding-inline:clamp(18px,4%,48px)}
  .kib-big .kib-bike{flex-basis:calc(50% - 5px)}
  @media (min-width:1300px){.kib-big .kib-bike{flex-basis:calc(33.333% - 7px)}}
  .kib-hbtn{width:36px;height:36px;border-radius:12px;border:0;background:transparent;display:grid;place-items:center;color:rgba(255,255,255,.65);transition:background .2s,color .2s}
  .kib-hbtn:hover{background:rgba(255,255,255,.08);color:#fff}
  .kib-hbtn svg{width:18px;height:18px}
  .kib-langs{display:inline-flex;gap:2px;padding:3px;margin-bottom:16px;border-radius:999px;background:rgba(255,255,255,.06)}
  .kib-langs button{border:0;background:none;padding:5px 7px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:.05em;color:rgba(255,255,255,.55)}
  .kib-langs button.on{background:#fff;color:#0e0f11}
  .kib-log{position:relative;flex:1;overflow-y:auto;overscroll-behavior:contain;padding:18px 18px 8px;scroll-behavior:smooth;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.15) transparent}
  /* ---- Begruessung ---- */
  .kib-hello{padding:10px 2px 6px;animation:kibUp .6s both}
  .kib-hello h3{margin:0;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:34px;line-height:1.02;text-transform:uppercase;letter-spacing:.005em}
  .kib-hello h3 em{font-style:normal;background:linear-gradient(90deg,var(--kr),var(--ko),var(--kp));-webkit-background-clip:text;background-clip:text;color:transparent}
  .kib-hello p{margin:10px 0 18px;color:rgba(255,255,255,.66);font-size:15px;line-height:1.45}
  .kib-sugs{display:grid;grid-template-columns:1fr 1fr;gap:8px}
  .kib-sug{display:flex;flex-direction:column;align-items:flex-start;gap:10px;padding:13px 13px 12px;border-radius:16px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.04);text-align:left;font-size:14px;font-weight:600;line-height:1.25;color:#f4f4f5;transition:background .25s,border-color .25s,transform .25s;animation:kibUp .6s both}
  .kib-sug:hover{background:rgba(232,54,55,.12);border-color:rgba(232,54,55,.5);transform:translateY(-2px)}
  .kib-sug svg{width:20px;height:20px;color:var(--ko)}
  /* ---- Nachrichten ---- */
  .kib-msg{display:flex;gap:10px;margin:0 0 16px;animation:kibUp .45s both}
  .kib-msg.u{justify-content:flex-end}
  .kib-u{max-width:82%;padding:10px 14px;border-radius:18px 18px 5px 18px;background:linear-gradient(135deg,var(--kr),#d42d2e);font-size:15px;line-height:1.4;box-shadow:0 8px 24px rgba(232,54,55,.25);word-wrap:break-word}
  .kib-b{flex:1;min-width:0}
  .kib-bav{width:26px;height:26px;flex:none;margin-top:2px;border-radius:50%;background:conic-gradient(from 200deg,var(--kr),var(--ko),var(--kp),var(--kr));position:relative}
  .kib-bav::after{content:"";position:absolute;inset:2px;border-radius:50%;background:#141518}
  .kib-bav i{position:absolute;inset:0;z-index:1;display:grid;place-items:center}.kib-bav i svg{width:13px;height:13px}
  .kib-txt{font-size:15.5px;line-height:1.5;color:#ececee}
  .kib-txt strong{color:#fff;font-weight:700}
  .kib-txt a{color:#ffb08a;text-decoration:underline;text-underline-offset:2px}
  .kib-txt ul,.kib-txt ol{margin:6px 0 8px;padding-left:20px}
  .kib-txt li{margin:3px 0}
  .kib-txt .kib-h{display:block;margin:8px 0 2px}
  .kib-simulation.is-live{background:rgba(34,197,94,.18);color:#86efac}
  .kib-simulation.is-live::before{content:"";display:inline-block;width:6px;height:6px;margin-right:5px;border-radius:50%;background:#22c55e;vertical-align:1px;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:rpPulse 2s infinite}
  .kib-src{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px;font-size:12px;color:rgba(255,255,255,.5)}
  .kib-src a{display:inline-flex;align-items:center;gap:4px;max-width:100%;padding:4px 9px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);color:rgba(255,255,255,.78);text-decoration:none;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .kib-src a:hover{color:#fff;border-color:rgba(255,122,69,.5)}
  .kib-note-live{margin:2px 0 10px;padding:9px 12px;border-radius:12px;background:rgba(255,255,255,.05);border:1px dashed rgba(255,255,255,.16);font-size:13px;color:rgba(255,255,255,.66)}
  .kib-prod .kib-bike-art{background:#f4f4f2;height:150px}
  .kib-prod .kib-bike-art img{width:100%;height:100%;object-fit:contain;padding:10px}
  .kib-prod .kib-bike-art svg{width:78%}
  .kib-price{display:inline-flex;margin:6px 0 4px;padding:4px 9px;border-radius:8px;background:rgba(232,54,55,.14);border:1px solid rgba(232,54,55,.35);font-size:12.5px;font-weight:700;color:#ffc2c2}
  .kib-prod .kib-trade{margin-top:-4px;font-size:12.5px;color:rgba(255,255,255,.5)}
  .kib-contact{display:grid;gap:6px;padding:12px 14px;border-top:1px solid rgba(255,255,255,.07);font-size:13.5px}
  .kib-contact a{color:#fff;text-decoration:none}
  .kib-contact span{color:rgba(255,255,255,.55);margin-right:6px}
  .kib-lead textarea{width:100%;min-height:96px;margin-bottom:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font:inherit;font-size:13.5px;line-height:1.45;resize:vertical;outline:0}
  .kib-lead textarea:focus{border-color:rgba(255,122,69,.6)}
  .kib-lead .kib-row .kib-btn{font-size:12.5px;padding:10px 12px;white-space:nowrap}
  .kib-txt .kib-caret{display:inline-block;width:8px;height:15px;margin-left:2px;vertical-align:-2px;border-radius:2px;background:var(--ko);animation:kibBlink .9s steps(2) infinite}
  @keyframes kibBlink{50%{opacity:0}}
  .kib-think{font-size:14.5px;font-weight:600;background:linear-gradient(90deg,rgba(255,255,255,.35) 0%,#fff 40%,rgba(255,255,255,.35) 80%);background-size:200% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:kibShim 1.4s linear infinite}
  .kib-think::after{content:"…"}
  @keyframes kibShim{from{background-position:100% 0}to{background-position:-100% 0}}
  .kib-acts{display:flex;gap:2px;margin-top:6px;opacity:.0;transition:opacity .25s}
  .kib-msg:hover .kib-acts,.kib-acts.on{opacity:1}
  .kib-acts button{border:0;background:none;padding:5px;border-radius:8px;color:rgba(255,255,255,.45);display:grid;place-items:center}
  .kib-acts button:hover{color:#fff;background:rgba(255,255,255,.07)}
  .kib-acts button.on{color:var(--ko)}
  .kib-acts svg{width:15px;height:15px}
  /* ---- Chips ---- */
  .kib-chips{display:flex;flex-wrap:wrap;gap:7px;padding:2px 18px 10px}
  .kib-chip{padding:8px 13px;border-radius:999px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.05);font-size:13.5px;font-weight:600;color:#f4f4f5;transition:all .2s;animation:kibUp .4s both}
  .kib-chip:hover{background:var(--kr);border-color:var(--kr)}
  .kib-chip.alt{border-style:dashed;color:rgba(255,255,255,.75)}
  /* ---- Eingabe ---- */
  .kib-foot{padding:10px 14px 12px;border-top:1px solid rgba(255,255,255,.07);background:rgba(10,10,12,.35)}
  .kib-form{position:relative;display:flex;align-items:flex-end;gap:6px;padding:6px;border-radius:22px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);transition:border-color .25s,box-shadow .25s}
  .kib-form:focus-within{border-color:rgba(255,122,69,.55);box-shadow:0 0 0 4px rgba(232,54,55,.12)}
  .kib-in{flex:1;min-width:0;max-height:110px;resize:none;border:0;outline:0;background:none;color:#fff;font:400 15.5px/1.4 'Roboto Condensed',sans-serif;padding:9px 6px 9px 10px}
  .kib-in::placeholder{color:rgba(255,255,255,.42)}
  .kib-mic,.kib-send{width:40px;height:40px;flex:none;border-radius:50%;border:0;display:grid;place-items:center;transition:transform .2s,background .2s,opacity .2s}
  .kib-mic{background:transparent;color:rgba(255,255,255,.65)}
  .kib-mic:hover{background:rgba(255,255,255,.08);color:#fff}
  .kib-mic.rec{background:var(--kr);color:#fff;animation:kibRec 1.2s infinite}
  @keyframes kibRec{0%{box-shadow:0 0 0 0 rgba(232,54,55,.6)}100%{box-shadow:0 0 0 14px rgba(232,54,55,0)}}
  .kib-send{background:linear-gradient(135deg,var(--kr),var(--ko));color:#fff}
  .kib-send:disabled{opacity:.35;cursor:default}
  .kib-send:not(:disabled):hover{transform:scale(1.06)}
  .kib-mic svg,.kib-send svg{width:19px;height:19px}
  .kib-disc{margin:8px 4px 0;font-size:11px;color:rgba(255,255,255,.38);text-align:center}
  /* ---- Widgets allgemein ---- */
  .kib-w{margin-top:12px;animation:kibUp .55s both}
  .kib-card{border-radius:18px;border:1px solid rgba(255,255,255,.09);background:rgba(255,255,255,.045);overflow:hidden}
  .kib-wh{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 0;font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:rgba(255,255,255,.5)}
  .kib-btn{display:inline-flex;align-items:center;justify-content:center;gap:7px;padding:9px 14px;border-radius:12px;border:0;font-size:13.5px;font-weight:700;letter-spacing:.02em;text-decoration:none;color:#fff;background:var(--kr);transition:background .2s,transform .2s}
  .kib-btn:hover{background:#c5282a}
  .kib-btn.ghost{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
  .kib-btn.ghost:hover{background:rgba(255,255,255,.14)}
  .kib-btn svg{width:15px;height:15px}
  /* ---- Bike-Karten ---- */
  .kib-bikes{display:flex;gap:10px;overflow-x:auto;scroll-snap-type:x mandatory;margin:0 -18px;padding:2px 18px 8px;scrollbar-width:none}
  .kib-bikes::-webkit-scrollbar{display:none}
  .kib-bike{flex:0 0 78%;scroll-snap-align:start;border-radius:20px;border:1px solid rgba(255,255,255,.09);background:#16171a;overflow:hidden;animation:kibUp .5s both;transition:transform .3s,border-color .3s}
  .kib-bike:hover{transform:translateY(-3px);border-color:rgba(255,255,255,.2)}
  .kib-bike-art{position:relative;height:128px;display:grid;place-items:center;background:radial-gradient(120% 90% at 50% 100%,var(--c,#E83637) -40%,rgba(22,23,26,0) 70%),linear-gradient(180deg,#1f2024,#16171a)}
  .kib-bike-art svg{width:84%;height:auto;filter:drop-shadow(0 10px 18px rgba(0,0,0,.5))}
  .kib-bike-art .kib-tier{position:absolute;left:10px;top:10px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:rgba(0,0,0,.45);backdrop-filter:blur(6px);border:1px solid rgba(255,255,255,.12)}
  .kib-bike-art .kib-cat{position:absolute;right:10px;top:10px;font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:4px 8px;border-radius:999px;background:var(--c);color:#fff}
  .kib-bike-b{padding:12px 14px 14px}
  .kib-bike-b h4{margin:0;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:22px;letter-spacing:.01em;text-transform:uppercase;line-height:1.05}
  .kib-bike-b p{margin:5px 0 10px;font-size:13.5px;color:rgba(255,255,255,.66);line-height:1.35}
  .kib-specs{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
  .kib-specs span{font-size:11.5px;padding:4px 8px;border-radius:8px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.08);color:rgba(255,255,255,.82)}
  .kib-bike-btns{display:flex;gap:6px;flex-wrap:wrap}
  .kib-bike-btns .kib-btn{padding:8px 11px;font-size:12.5px}
  /* ---- Groessenrechner ---- */
  .kib-size{padding:14px}
  .kib-out{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;padding:14px;border-radius:14px;background:linear-gradient(135deg,rgba(232,54,55,.18),rgba(255,122,69,.08));border:1px solid rgba(232,54,55,.3);margin-bottom:14px}
  .kib-out small{display:block;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.6)}
  .kib-out b{display:block;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:32px;line-height:1.05;letter-spacing:.01em}
  .kib-out .r{text-align:right}
  .kib-out .r b{font-size:22px}
  .kib-range{margin:0 0 12px}
  .kib-range label{display:flex;justify-content:space-between;font-size:13px;color:rgba(255,255,255,.7);margin-bottom:6px}
  .kib-range label b{color:#fff}
  .kib-range input{width:100%;-webkit-appearance:none;appearance:none;height:6px;border-radius:999px;background:linear-gradient(90deg,var(--kr) var(--p,50%),rgba(255,255,255,.12) var(--p,50%));outline:0}
  .kib-range input::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;border-radius:50%;background:#fff;border:4px solid var(--kr);box-shadow:0 4px 12px rgba(0,0,0,.4);cursor:grab}
  .kib-range input::-moz-range-thumb{width:16px;height:16px;border-radius:50%;background:#fff;border:4px solid var(--kr);cursor:grab}
  .kib-seg{display:flex;flex-wrap:wrap;gap:5px;margin-bottom:12px}
  .kib-seg button{flex:1 1 auto;padding:8px 10px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);font-size:12.5px;font-weight:700;color:rgba(255,255,255,.75);transition:all .2s}
  .kib-seg button.on{background:#fff;color:#0e0f11;border-color:#fff}
  .kib-note{font-size:12px;color:rgba(255,255,255,.5);margin:2px 0 0}
  /* ---- Termin ---- */
  .kib-term{padding:14px}
  .kib-lbl{font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:rgba(255,255,255,.5);margin:2px 0 7px}
  .kib-days{display:flex;gap:6px;overflow-x:auto;margin:0 -14px 12px;padding:0 14px 2px;scrollbar-width:none}
  .kib-days::-webkit-scrollbar{display:none}
  .kib-day{flex:none;width:60px;padding:8px 0 9px;border-radius:14px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);text-align:center;transition:all .2s}
  .kib-day small{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:rgba(255,255,255,.55)}
  .kib-day b{display:block;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:22px;line-height:1.1}
  .kib-day.on{background:var(--kr);border-color:var(--kr)}
  .kib-day.on small{color:rgba(255,255,255,.85)}
  .kib-times{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin-bottom:14px}
  .kib-times button{padding:8px 0;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.04);font-size:13px;font-weight:700;transition:all .2s}
  .kib-times button.on{background:#fff;color:#0e0f11}
  .kib-times button:disabled{opacity:.25;text-decoration:line-through;cursor:default}
  .kib-ticket{position:relative;padding:16px;border-radius:18px;background:linear-gradient(135deg,#1d1e22,#141518);border:1px solid rgba(255,255,255,.1);overflow:hidden}
  .kib-ticket::before{content:"";position:absolute;left:0;right:0;top:62px;border-top:2px dashed rgba(255,255,255,.12)}
  .kib-ticket::after{content:"";position:absolute;right:-60px;top:-60px;width:160px;height:160px;border-radius:50%;background:radial-gradient(circle,rgba(34,197,94,.3),rgba(34,197,94,0) 70%)}
  .kib-ticket h5{display:flex;align-items:center;gap:8px;margin:0 0 26px;font-family:Anton,Impact,sans-serif;font-weight:400;font-size:24px;text-transform:uppercase;letter-spacing:.01em}
  .kib-ticket h5 i{display:grid;place-items:center;width:28px;height:28px;border-radius:50%;background:#22c55e;color:#06210f;font-style:normal;font-size:16px;font-family:sans-serif;font-weight:900}
  .kib-ticket dl{display:grid;grid-template-columns:auto 1fr;gap:5px 14px;margin:0 0 14px;font-size:14px}
  .kib-ticket dt{color:rgba(255,255,255,.5)}
  .kib-ticket dd{margin:0;font-weight:700}
  .kib-ticket p{margin:0 0 12px;font-size:12.5px;color:rgba(255,255,255,.55)}
  .kib-row{display:flex;gap:6px;flex-wrap:wrap}
  /* ---- Oeffnungszeiten ---- */
  .kib-hours{padding:6px 14px 14px}
  .kib-hours li{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:14px;color:rgba(255,255,255,.78)}
  .kib-hours li:last-child{border-bottom:0}
  .kib-hours li.closed span:last-child{color:rgba(255,255,255,.35)}
  .kib-hours li.today{color:#fff;font-weight:700}
  .kib-hours li.today span:first-child::after{content:attr(data-today);margin-left:8px;font-size:10px;letter-spacing:.08em;text-transform:uppercase;padding:2px 6px;border-radius:6px;background:var(--kr);color:#fff;vertical-align:1px}
  .kib-hours ul{list-style:none;margin:0;padding:0}
  .kib-pill{display:inline-flex;align-items:center;font-size:12.5px;font-weight:700;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.07)}
  .kib-pill.is-open{background:rgba(34,197,94,.14);color:#86efac}
  .kib-pill.is-closed{background:rgba(232,54,55,.15);color:#fca5a5}
  /* ---- Karte ---- */
  .kib-map{position:relative;height:190px;background:radial-gradient(circle at 52% 58%,rgba(232,54,55,.22),rgba(232,54,55,0) 45%),linear-gradient(180deg,#1b1c20,#141518)}
  .kib-map svg{position:absolute;inset:0;width:100%;height:100%}
  .kib-map-f{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap;padding:12px 14px;border-top:1px solid rgba(255,255,255,.07);font-size:13px;color:rgba(255,255,255,.7)}
  /* ---- Lead ---- */
  .kib-lead{padding:14px}
  .kib-lead dl{display:grid;grid-template-columns:auto 1fr;gap:7px 14px;margin:0 0 12px;font-size:14px}
  .kib-lead dt{color:rgba(255,255,255,.5)}
  .kib-lead dd{margin:0;font-weight:700}
  .kib-lead dd.muted{color:rgba(255,255,255,.4);font-weight:400}
  .kib-lead input{width:100%;margin-bottom:10px;padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.05);color:#fff;font:inherit;font-size:14px;outline:0}
  .kib-lead input:focus{border-color:rgba(255,122,69,.6)}
  /* ---- Video ---- */
  .kib-vid{position:relative;display:block;aspect-ratio:16/9;overflow:hidden;border-radius:18px;border:1px solid rgba(255,255,255,.1)}
  .kib-vid img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
  .kib-vid:hover img{transform:scale(1.05)}
  .kib-vid::after{content:"";position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.75),rgba(0,0,0,0) 60%)}
  .kib-vid span{position:absolute;left:12px;bottom:10px;right:12px;z-index:1;font-weight:700;font-size:14px}
  .kib-vid i{position:absolute;left:50%;top:50%;z-index:1;width:54px;height:54px;margin:-27px 0 0 -27px;border-radius:50%;background:var(--kr);display:grid;place-items:center;box-shadow:0 10px 30px rgba(232,54,55,.5)}
  .kib-vid i svg{width:20px;height:20px;margin-left:3px}
  @keyframes kibUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  /* ---- Mobil: Vollbild-Sheet ---- */
  @media (max-width:640px){
    .kib-panel{inset:0;width:auto;border-radius:0;transform-origin:50% 100%;transform:translateY(100%);opacity:1;padding-bottom:env(safe-area-inset-bottom)}
    .kib-open .kib-panel{transform:none}
    .kib-resize,.kib-grow{display:none}
    /* Kompakter runder Launcher, sauber ueber dem Prototyp-Zahnrad (48px, rechts 14px, unten 14px) */
    .kib-launch{right:calc(14px + env(safe-area-inset-right));bottom:calc(74px + env(safe-area-inset-bottom));gap:8px}
    .kib-orb{width:48px;height:48px;box-shadow:0 10px 26px rgba(232,54,55,.32),0 3px 10px rgba(0,0,0,.5)}
    .kib-orb i svg{width:22px;height:22px}
    .kib-orb b{inset:10px}
    .kib-orb .kib-ping{right:0;top:0;width:11px;height:11px}
    .kib-label{display:none}
    .kib-in,.kib-lead input,.kib-lead textarea{font-size:16px}
    .kib-head{padding-top:calc(16px + env(safe-area-inset-top))}
    .kib-acts{opacity:1}
    .kib-hello h3{font-size:30px}
    .kib-bike{flex-basis:84%}
  }
  @media (prefers-reduced-motion:reduce){
    .kib *,.kib *::before,.kib *::after{animation-duration:.001s!important;animation-iteration-count:1!important;transition-duration:.001s!important}
  }`;

  /* =================== Icons =================== */
  const I = {
    spark: '<svg viewBox="0 0 24 24" fill="none"><path d="M12 2.5l1.9 5.6a3 3 0 001.9 1.9l5.7 2-5.7 2a3 3 0 00-1.9 1.9L12 21.5l-1.9-5.6a3 3 0 00-1.9-1.9L2.5 12l5.7-2a3 3 0 001.9-1.9z" fill="url(#kibg)"/><defs><linearGradient id="kibg" x1="3" y1="3" x2="21" y2="21"><stop stop-color="#fff"/><stop offset=".55" stop-color="#ffb08a"/><stop offset="1" stop-color="#E83637"/></linearGradient></defs></svg>',
    close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    grow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M9 21H3v-6"/><path d="M21 3l-7 7"/><path d="M3 21l7-7"/></svg>',
    shrink: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14h6v6"/><path d="M20 10h-6V4"/><path d="M14 10l7-7"/><path d="M3 21l7-7"/></svg>',
    reset: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/></svg>',
    send: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>',
    mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/></svg>',
    copy: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 01-1-1V4a1 1 0 011-1h10a1 1 0 011 1v1"/></svg>',
    up: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 10v11M15 5.9L14 10h5.8a2 2 0 012 2.3l-1.4 7A2 2 0 0118.4 21H7V10l4.3-7.1A1.9 1.9 0 0115 5.9z"/></svg>',
    down: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 14V3M9 18.1L10 14H4.2a2 2 0 01-2-2.3l1.4-7A2 2 0 015.6 3H17v11l-4.3 7.1A1.9 1.9 0 019 18.1z"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>',
    cal: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4.5" width="18" height="16.5" rx="2.5"/><path d="M3 9.5h18M8 2.5v4M16 2.5v4"/></svg>',
    bike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="5.5" cy="16.5" r="3.5"/><circle cx="18.5" cy="16.5" r="3.5"/><path d="M5.5 16.5l4-7h6l3 7M9.5 9.5L12 16.5h-2M14 6h3"/></svg>',
    ruler: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17L17 3l4 4L7 21z"/><path d="M7 13l2 2M10 10l2 2M13 7l2 2"/></svg>',
    wrench: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/></svg>',
    clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    bolt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M13 2L4 14h7l-1 8 9-12h-7z"/></svg>',
    pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    cube: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l9 5v10l-9 5-9-5V7z"/><path d="M3 7l9 5 9-5M12 12v10"/></svg>',
  };

  /* =================== DOM =================== */
  let root, log, chipsBox, input, sendBtn, micBtn, label, hintEl, titleEl, statusEl;
  const bikeFns = [];

  function build() {
    const st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    root = document.createElement('div');
    root.className = 'kib';
    root.innerHTML =
      '<div class="kib-launch"><button class="kib-orb" aria-label="KI-Berater öffnen"><b></b><i>' + I.spark + '</i><span class="kib-ping"></span></button>' +
      '<div class="kib-label"><span></span><small></small></div></div>' +
      '<section class="kib-panel" role="dialog" aria-modal="false" aria-label="KI-Berater" data-lenis-prevent>' +
        '<header class="kib-head"><div class="kib-av"><i>' + I.spark + '</i></div>' +
        '<div class="kib-ttl"><b></b><span class="kib-simulation" data-simulation-hint></span><small data-kib-status></small></div>' +
        '<button class="kib-hbtn kib-grow" data-act="size">' + I.grow + '</button><button class="kib-hbtn" data-act="reset">' + I.reset + '</button><button class="kib-hbtn" data-act="close">' + I.close + '</button></header>' +
        '<div class="kib-resize" role="separator" aria-orientation="vertical"></div><div class="kib-log" aria-live="polite"></div><div class="kib-chips"></div>' +
        '<footer class="kib-foot"><form class="kib-form"><textarea class="kib-in" rows="1"></textarea>' +
        '<button type="button" class="kib-mic" hidden>' + I.mic + '</button><button type="submit" class="kib-send" disabled aria-label="Senden">' + I.send + '</button></form>' +
        '<p class="kib-disc"></p></footer>' +
      '</section>';
    document.body.appendChild(root);
    log = root.querySelector('.kib-log');
    chipsBox = root.querySelector('.kib-chips');
    input = root.querySelector('.kib-in');
    sendBtn = root.querySelector('.kib-send');
    micBtn = root.querySelector('.kib-mic');
    label = root.querySelector('.kib-label');
    hintEl = label.querySelector('small');
    titleEl = root.querySelector('.kib-ttl b');
    statusEl = root.querySelector('[data-kib-status]');

    root.querySelector('.kib-orb').addEventListener('click', open);
    root.querySelector('[data-act="close"]').addEventListener('click', close);
    // Fenstergröße: Vergrößern-Knopf und ziehbarer linker Rand (Desktop), gemerkt pro Browser
    const panel = root.querySelector('.kib-panel'), sizeBtn = root.querySelector('[data-act="size"]'), grip = root.querySelector('.kib-resize');
    const maxW = () => Math.max(360, window.innerWidth - 40);
    const setW = (w, keep) => { w = Math.round(Math.min(maxW(), Math.max(360, w))); panel.style.setProperty('--kib-w', w + 'px'); const big = w > 600; root.classList.toggle('kib-big', big); sizeBtn.innerHTML = big ? I.shrink : I.grow; sizeBtn.title = tr(big ? S.shrink : S.grow); sizeBtn.setAttribute('aria-label', sizeBtn.title); if (keep) { try { localStorage.setItem('kib-width', String(w)); } catch (e) {} } };
    let savedW = 430; try { savedW = Number(localStorage.getItem('kib-width')) || 430; } catch (e) {}
    setW(savedW);
    sizeBtn.addEventListener('click', () => setW(root.classList.contains('kib-big') ? 430 : Math.min(980, maxW()), true));
    grip.addEventListener('pointerdown', ev => { if (window.innerWidth <= 640) return; ev.preventDefault(); grip.setPointerCapture(ev.pointerId); panel.classList.add('kib-resizing');
      const move = e => setW(window.innerWidth - 20 - e.clientX, false);
      const up = e => { grip.removeEventListener('pointermove', move); grip.removeEventListener('pointerup', up); grip.removeEventListener('pointercancel', up); panel.classList.remove('kib-resizing'); setW(window.innerWidth - 20 - e.clientX, true); };
      grip.addEventListener('pointermove', move); grip.addEventListener('pointerup', up); grip.addEventListener('pointercancel', up); });
    grip.addEventListener('keydown', ev => { if (ev.key === 'ArrowLeft' || ev.key === 'ArrowRight') { ev.preventDefault(); setW(panel.getBoundingClientRect().width + (ev.key === 'ArrowLeft' ? 40 : -40), true); } });
    grip.tabIndex = 0; grip.title = tr(S.drag); grip.setAttribute('aria-label', grip.title);
    window.addEventListener('resize', () => { const w = parseFloat(panel.style.getPropertyValue('--kib-w')) || 430; if (w > maxW()) setW(maxW()); });
    root.querySelector('[data-act="reset"]').addEventListener('click', () => { if (live.ctrl) { live.ctrl.abort(); live.ctrl = null; state.busy = false; } if (!state.busy) welcome(); });
    root.querySelector('.kib-form').addEventListener('submit', e => { e.preventDefault(); submit(); });
    input.addEventListener('input', () => { autoGrow(); sendBtn.disabled = !input.value.trim(); });
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && root.classList.contains('kib-open')) close(); });
    setupVoice();
    applyLang();
    checkLive();

    // Launcher-Label mit wechselnden Beispiel-Fragen
    // Mobil bleibt es beim kompakten Orb: das Label wuerde sonst CTAs ueberdecken
    const compact = matchMedia('(max-width:640px)');
    setTimeout(() => { if (!compact.matches) label.classList.add('on'); }, 1800);
    let hi = 0;
    const cycle = () => { const h = S.hints[state.lang] || S.hints.de; hintEl.textContent = '„' + h[hi++ % h.length] + '“'; };
    cycle(); setInterval(cycle, 3200);
    setTimeout(() => label.classList.remove('on'), 16000);
    root.querySelector('.kib-orb').addEventListener('mouseenter', () => { if (!compact.matches) label.classList.add('on'); });

    // Globale Einstiege: [data-ask] und <form data-ask-form>
    document.addEventListener('click', e => {
      const a = e.target.closest('[data-ask]');
      if (a && !root.contains(a)) { e.preventDefault(); ask(a.getAttribute('data-ask')); }
    });
    document.addEventListener('submit', e => {
      const f = e.target.closest('[data-ask-form]');
      if (!f) return;
      e.preventDefault();
      const i = f.querySelector('input,textarea');
      if (i && i.value.trim()) { ask(i.value.trim()); i.value = ''; } else open();
    });
    RP.onLang && RP.onLang(l => { setLang(l, false); });
  }

  function applyLang() {
    titleEl.textContent = tr(S.title);
    const hint = root.querySelector('[data-simulation-hint]');
    hint.textContent = tr(live.ready ? S.live : S.simulation);
    hint.classList.toggle('is-live', live.ready);
    input.placeholder = tr(S.ph);
    root.querySelector('.kib-disc').textContent = tr(live.ready ? S.discLive : S.disclaimer);
    label.querySelector('span').textContent = tr(S.launcher);
    root.querySelector('[data-act="reset"]').title = tr(S.reset);
    root.querySelector('[data-act="close"]').title = tr(S.close);
    updateStatus();
  }
  function updateStatus() {
    const s = RP.status();
    statusEl.className = s.open ? 'is-open' : 'is-closed';
    statusEl.innerHTML = '<i class="rp-dot"></i>' + esc(RP.statusText ? RP.statusText(state.lang) : '');
  }
  function setLang(l, fromChat) {
    if (state.lang === l) return;
    state.lang = l;
    applyLang();
    if (fromChat && RP.setLang && RP.lang !== l) RP.setLang(l);
    // Begruessung neu rendern, falls noch kein Gespraech laeuft
    if (log.querySelector('.kib-hello') && !log.querySelector('.kib-msg')) welcome();
  }
  function autoGrow() { input.style.height = 'auto'; input.style.height = Math.min(110, input.scrollHeight) + 'px'; }

  /* =================== Oeffnen / Fragen =================== */
  function open() {
    if (!root) return;
    document.documentElement.classList.add('kib-open-doc');
    root.classList.add('kib-open');
    label.classList.remove('on');
    if (!state.started) welcome();
    updateStatus();
    if (matchMedia('(min-width:641px)').matches) setTimeout(() => input.focus(), 350);
  }
  function close() { root.classList.remove('kib-open'); document.documentElement.classList.remove('kib-open-doc'); }
  async function ask(text) {
    open();
    if (!text) return;
    while (state.busy) await wait(120);
    await wait(state.started && log.querySelector('.kib-msg') ? 50 : 450);
    userSays(text);
    handle(text);
  }
  function submit() {
    const v = input.value.trim();
    if (!v || state.busy) return;
    input.value = ''; autoGrow(); sendBtn.disabled = true;
    userSays(v);
    handle(v);
  }
  // Live-Agent wenn verfuegbar, sonst Simulation
  function handle(text) { return live.ready ? askLive(text) : route(text); }

  /* =================== Rendering =================== */
  // Kleines, sicheres Markdown: fett, Links (nur https), Listen, Zwischentitel
  function md(s) {
    const inline = t => t.replace(/\[([^\]]+)\]\((https:\/\/[^\s)]+)\)|(https:\/\/[^\s<)]+[^\s<).,;:!?])/g, (m, label, href, bare) =>
      '<a href="' + (href || bare) + '" target="_blank" rel="noopener">' + (label || bare.replace(/^https:\/\/(www\.)?/, '')) + '</a>').replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    const out = [];
    let list = null;
    esc(s).split('\n').forEach(line => {
      const li = line.match(/^\s*(?:[-*•]|(\d+)\.)\s+(.*)$/);
      if (li) {
        const tag = li[1] ? 'ol' : 'ul';
        if (!list || list !== tag) { if (list) out.push('</' + list + '>'); list = tag; out.push('<' + tag + '>'); }
        out.push('<li>' + inline(li[2]) + '</li>');
        return;
      }
      if (list) { out.push('</' + list + '>'); list = null; }
      const h = line.match(/^\s*#{1,4}\s+(.*)$/);
      if (h) out.push('<strong class="kib-h">' + inline(h[1]) + '</strong>');
      else out.push(line.trim() ? inline(line) + '<br>' : '<br>');
    });
    if (list) out.push('</' + list + '>');
    return out.join('').replace(/(<br>){3,}/g, '<br><br>').replace(/(<br>)+$/, '');
  }
  function scrollDown() { log.scrollTop = log.scrollHeight; }
  function userSays(text) {
    const hello = log.querySelector('.kib-hello');
    if (hello) hello.remove();
    chipsBox.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'kib-msg u';
    d.innerHTML = '<div class="kib-u">' + esc(text) + '</div>';
    log.appendChild(d); scrollDown();
  }
  function welcome() {
    state.started = true;
    state.cat = state.tier = state.height = state.inseam = state.brand = state.termin = state.bike = null;
    live.conversation = []; live.profile = null;
    log.innerHTML = ''; chipsBox.innerHTML = '';
    const h = document.createElement('div');
    h.className = 'kib-hello';
    const hello = tr(S.hello).split(' ');
    const last = hello.pop();
    h.innerHTML = '<div class="kib-langs">' + ['de', 'fr', 'nl', 'en'].map(l => '<button type="button" data-l="' + l + '" class="' + (l === state.lang ? 'on' : '') + '">' + l.toUpperCase() + '</button>').join('') + '</div>' +
      '<h3>' + esc(hello.join(' ')) + ' <em>' + esc(last) + '</em></h3><p>' + esc(tr(S.helloSub)) + '</p><div class="kib-sugs"></div>';
    h.querySelector('.kib-langs').addEventListener('click', e => { const b = e.target.closest('button'); if (b) setLang(b.dataset.l, true); });
    const box = h.querySelector('.kib-sugs');
    S.sug.forEach((s, i) => {
      const b = document.createElement('button');
      b.className = 'kib-sug'; b.type = 'button';
      b.style.animationDelay = (120 + i * 60) + 'ms';
      b.innerHTML = I[s.i] + '<span>' + esc(tr(s)) + '</span>';
      b.addEventListener('click', () => { if (state.busy) return; const t = tr(s); userSays(t); handle(t); });
      box.appendChild(b);
    });
    log.appendChild(h);
  }

  // Bot-Antwort: Denk-Animation -> Text streamt -> Widgets -> Chips
  async function bot(parts, opts) {
    opts = opts || {};
    state.busy = true; chipsBox.innerHTML = '';
    const d = document.createElement('div');
    d.className = 'kib-msg';
    d.innerHTML = '<div class="kib-bav"><i>' + I.spark + '</i></div><div class="kib-b"><div class="kib-think">' + esc(tr(S.thinking)) + '</div></div>';
    log.appendChild(d); scrollDown();
    const body = d.querySelector('.kib-b');
    await wait(opts.fast ? 350 : 650 + Math.random() * 450);
    body.innerHTML = '';
    let plain = '';
    for (const p of parts) {
      if (typeof p === 'function') {
        const w = document.createElement('div');
        w.className = 'kib-w';
        p(w);
        body.appendChild(w); scrollDown();
        await wait(220);
        continue;
      }
      const txt = document.createElement('div');
      txt.className = 'kib-txt';
      if (body.querySelector('.kib-txt,.kib-w')) txt.style.marginTop = '10px';
      body.appendChild(txt);
      await stream(txt, p);
      plain += (plain ? '\n' : '') + p.replace(/\*\*/g, '');
    }
    addActs(body, plain);
    state.busy = false;
    if (opts.chips) chips(opts.chips);
    scrollDown();
  }
  // Aktionen unter einer Antwort (kopieren, Daumen)
  function addActs(body, plain) {
    const acts = document.createElement('div');
    acts.className = 'kib-acts';
    acts.innerHTML = '<button title="' + esc(tr(S.copy)) + '" data-a="copy">' + I.copy + '</button><button data-a="up">' + I.up + '</button><button data-a="down">' + I.down + '</button>';
    acts.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.a === 'copy') { try { navigator.clipboard.writeText(plain); b.title = tr(S.copied); } catch (err) { /* kein Clipboard */ } }
      else { acts.querySelectorAll('[data-a="up"],[data-a="down"]').forEach(x => x.classList.toggle('on', x === b)); }
      b.classList.add('on'); acts.classList.add('on');
    });
    body.appendChild(acts);
  }
  async function stream(el, text) {
    const words = text.split(/(\s+)/);
    let out = '';
    const fast = RP.reducedMotion;
    for (let i = 0; i < words.length; i++) {
      out += words[i];
      if (fast) continue;
      if (i % 2 === 0) {
        el.innerHTML = md(out) + '<span class="kib-caret"></span>';
        scrollDown();
        await wait(14 + Math.random() * 26);
      }
    }
    el.innerHTML = md(out);
  }
  function chips(list) {
    chipsBox.innerHTML = '';
    list.filter(Boolean).forEach((c, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'kib-chip' + (c.alt ? ' alt' : '');
      b.style.animationDelay = (i * 50) + 'ms';
      b.textContent = tr(c.label);
      b.addEventListener('click', () => {
        if (state.busy) return;
        if (!c.silent) userSays(tr(c.label));
        chipsBox.innerHTML = '';
        c.run();
      });
      chipsBox.appendChild(b);
    });
    scrollDown();
  }
  const chip = (label, run, extra) => Object.assign({ label, run }, extra || {});

  /* =================== Widgets =================== */
  function wBikes(list) {
    return w => {
      const box = document.createElement('div');
      box.className = 'kib-bikes';
      list.forEach((b, i) => {
        const c = CATS[b.cat];
        const el = document.createElement('article');
        el.className = 'kib-bike';
        el.style.setProperty('--c', c.color);
        el.style.animationDelay = (i * 90) + 'ms';
        el.innerHTML =
          '<div class="kib-bike-art"><span class="kib-tier">' + esc(tr(TIERS[b.tier])) + '</span><span class="kib-cat">' + esc(tr(c.label)) + '</span>' + bikeSVG(b.cat) + '</div>' +
          '<div class="kib-bike-b"><h4>' + esc(b.name) + '</h4><p>' + esc(tr(b.tag)) + '</p>' +
          '<div class="kib-specs">' + b.specs.map(s => '<span>' + esc(tr(s)) + '</span>').join('') + '</div>' +
          '<div class="kib-bike-btns"><button class="kib-btn" data-b="ask">' + esc(tr(S.wAsk)) + '</button>' +
          (bikeFns.length ? '<button class="kib-btn ghost" data-b="3d">' + I.cube + esc(tr(S.w3d)) + '</button>' : '') +
          (b.video ? '<button class="kib-btn ghost" data-b="video">' + I.play + esc(tr(S.wVideo)) + '</button>' : '') +
          '</div></div>';
        el.addEventListener('click', e => {
          const t = e.target.closest('[data-b]'); if (!t) return;
          if (t.dataset.b === 'ask') { state.cat = b.cat; state.tier = b.tier; state.bike = b; userSays(tr(S.wAsk) + ': ' + b.name); doHandoff(); }
          if (t.dataset.b === 'video') RP.openVideo(b.video);
          if (t.dataset.b === '3d') { bikeFns.forEach(fn => { try { fn({ id: b.id, name: b.name, cat: b.cat }); } catch (err) { console.error(err); } }); if (matchMedia('(max-width:640px)').matches) close(); }
        });
        box.appendChild(el);
      });
      w.appendChild(box);
    };
  }

  function wSize() {
    return w => {
      const cat = state.cat && CATS[state.cat] ? state.cat : 'rennrad';
      let h = state.height || 178, inseam = state.inseam || Math.round(h * 0.47), cur = cat;
      const card = document.createElement('div');
      card.className = 'kib-card kib-size';
      const segs = ['rennrad', 'gravel', 'mtb', 'ebike'];
      card.innerHTML =
        '<div class="kib-out"><div><small>' + esc(tr(S.wFrame)) + '</small><b data-o="f"></b></div><div class="r"><small>' + esc(tr(S.wSaddle)) + '</small><b data-o="s"></b></div></div>' +
        '<div class="kib-seg">' + segs.map(k => '<button type="button" data-k="' + k + '">' + esc(tr(CATS[k].label)) + '</button>').join('') + '</div>' +
        '<div class="kib-range"><label>' + esc(tr(S.wHeight)) + ' <b data-o="h"></b></label><input type="range" min="150" max="205" data-r="h"></div>' +
        '<div class="kib-range"><label>' + esc(tr(S.wInseam)) + ' <b data-o="i"></b></label><input type="range" min="65" max="100" data-r="i"></div>' +
        '<p class="kib-note">' + esc(tr(S.wSizeNote)) + '</p>';
      const rh = card.querySelector('[data-r="h"]'), ri = card.querySelector('[data-r="i"]');
      rh.value = h; ri.value = inseam;
      const upd = () => {
        h = +rh.value; inseam = +ri.value;
        state.height = h; state.inseam = inseam; state.sizeCat = cur;
        card.querySelector('[data-o="h"]').textContent = h + ' cm';
        card.querySelector('[data-o="i"]').textContent = inseam + ' cm';
        card.querySelector('[data-o="f"]').textContent = frameSize(h, cur);
        card.querySelector('[data-o="s"]').textContent = (Math.round(inseam * 8.83) / 10).toLocaleString(state.lang === 'en' ? 'en-GB' : state.lang + '-BE') + ' cm';
        [rh, ri].forEach(r => r.style.setProperty('--p', ((r.value - r.min) / (r.max - r.min) * 100) + '%'));
        card.querySelectorAll('.kib-seg button').forEach(b => b.classList.toggle('on', b.dataset.k === cur));
      };
      rh.addEventListener('input', () => { ri.value = Math.round(rh.value * 0.47); upd(); });
      ri.addEventListener('input', upd);
      card.querySelector('.kib-seg').addEventListener('click', e => { const b = e.target.closest('button'); if (b) { cur = b.dataset.k; upd(); } });
      if (!segs.includes(cur)) cur = 'rennrad';
      upd();
      w.appendChild(card);
    };
  }

  function openDays(n) {
    // naechste n Oeffnungstage ab heute (Ostbelgien-Zeit)
    const out = [], now = new Date(), s = RP.status();
    for (let i = 0; out.length < n && i < 21; i++) {
      const d = new Date(now.getTime() + i * 864e5), wd = (s.day + i) % 7, h = RP.HOURS ? RP.HOURS[wd] : null;
      if (!h) continue;
      out.push({ date: d, wd, h, today: i === 0 });
    }
    return out;
  }
  function wTermin(type) {
    return w => {
      const card = document.createElement('div');
      card.className = 'kib-card kib-term';
      const days = openDays(7);
      let day = 0, time = null, kind = type || 'beratung';
      const render = () => {
        const d = days[day];
        const slots = []; for (let t = d.h[0]; t < d.h[1]; t++) slots.push(t);
        const curHour = RP.now ? RP.now().h : new Date().getHours();
        card.innerHTML =
          '<div class="kib-lbl">' + esc(tr(S.wWhat)) + '</div><div class="kib-seg">' +
          S.wTypes.map(t => '<button type="button" data-t="' + t.k + '" class="' + (t.k === kind ? 'on' : '') + '">' + esc(tr(t)) + '</button>').join('') + '</div>' +
          '<div class="kib-lbl">' + esc(tr(S.wDay)) + '</div><div class="kib-days">' +
          days.map((x, i) => '<button type="button" class="kib-day' + (i === day ? ' on' : '') + '" data-d="' + i + '"><small>' + esc(x.today ? tr(S.wToday) : RP.DAY_SHORT[state.lang][x.wd]) + '</small><b>' + x.date.getDate() + '</b></button>').join('') + '</div>' +
          '<div class="kib-lbl">' + esc(tr(S.wTime)) + '</div><div class="kib-times">' +
          slots.map(t => '<button type="button" data-h="' + t + '"' + (d.today && t <= curHour ? ' disabled' : '') + ' class="' + (time === t ? 'on' : '') + '">' + t + ':00</button>').join('') + '</div>' +
          '<button type="button" class="kib-btn" data-go style="width:100%;' + (time == null ? 'opacity:.45' : '') + '"' + (time == null ? ' disabled' : '') + '>' + I.cal + esc(tr(S.wBook)) + '</button>';
      };
      card.addEventListener('click', e => {
        const b = e.target.closest('button'); if (!b || b.disabled) return;
        if (b.dataset.t) { kind = b.dataset.t; render(); }
        else if (b.dataset.d) { day = +b.dataset.d; time = null; render(); }
        else if (b.dataset.h) { time = +b.dataset.h; render(); }
        else if (b.hasAttribute('data-go') && time != null) {
          const d = days[day], t = S.wTypes.find(x => x.k === kind);
          state.termin = { date: d.date, h: time, kind: t };
          card.replaceWith(ticket(state.termin));
          scrollDown();
          if (!live.ready) setTimeout(() => chips([chip(S.cWhere, doWhere), chip(S.cRestart, welcome, { alt: true, silent: true })]), 300);
        }
      });
      render();
      w.appendChild(card);
    };
  }
  function dateLabel(d) {
    try { return d.toLocaleDateString({ de: 'de-DE', fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB' }[state.lang], { weekday: 'long', day: 'numeric', month: 'long' }); }
    catch (e) { return d.toDateString(); }
  }
  // Terminwunsch als E-Mail-Entwurf – gebucht wird erst durch Racepoint
  function ticket(tm) {
    const el = document.createElement('div');
    el.className = 'kib-ticket';
    const when = dateLabel(tm.date) + ' · ' + tm.h + ':00';
    const body = 'Hallo Racepoint-Team,\n\nich hätte gern einen Termin:\n' + tr(tm.kind) + ' · Wunschtermin ' + when + '\n\nBitte bestätigt mir den Termin oder schlagt eine Alternative vor.\n\nViele Grüße';
    el.innerHTML = '<h5><i>✓</i>' + esc(tr(S.wBooked)) + '</h5><dl><dt>' + esc(tr(S.wWhat)) + '</dt><dd>' + esc(tr(tm.kind)) + '</dd><dt>' + esc(tr(S.wAppt)) + '</dt><dd>' + esc(when) + '</dd><dt>' + esc(tr(S.wPlace)) + '</dt><dd>Racepoint · Schönberg</dd></dl>' +
      '<p>' + esc(tr(S.wBookedSub)) + '</p><div class="kib-row"><a class="kib-btn" href="' + esc(mailto('Terminwunsch: ' + tr(tm.kind) + ' · ' + when, body)) + '">' + I.send + esc(tr(S.wMailOpen)) + '</a>' +
      '<a class="kib-btn ghost" href="tel:' + CONTACT.tel + '">' + esc(tr(S.wCall)) + '</a></div>';
    return el;
  }

  function wHours() {
    return w => {
      const s = RP.status();
      const card = document.createElement('div');
      card.className = 'kib-card';
      card.innerHTML = '<div class="kib-wh"><span>' + esc(tr(S.wHoursT)) + '</span><span class="kib-pill ' + (s.open ? 'is-open' : 'is-closed') + '"><i class="rp-dot"></i>' + esc(RP.statusText(state.lang).split(' · ')[0]) + '</span></div>' +
        '<div class="kib-hours"><ul>' + RP.hoursRows(state.lang).map(r => '<li class="' + (r.today ? 'today ' : '') + (r.open ? '' : 'closed') + '"><span data-today="' + esc(tr(S.wToday)) + '">' + esc(r.day) + '</span><span>' + esc(r.text) + '</span></li>').join('') + '</ul>' +
        '<p class="kib-note" style="margin-top:8px">' + esc(tr(S.wWorkshop)) + '</p></div>';
      w.appendChild(card);
    };
  }

  function wMap() {
    return w => {
      const card = document.createElement('div');
      card.className = 'kib-card';
      // stilisierte Dreilaender-Karte: Schoenberg im Zentrum, Linien zu den Staedten
      const sx = 55, sy = 52;
      let svg = '<svg viewBox="0 0 100 100" preserveAspectRatio="none">';
      svg += '<path d="M30 0 C 40 30, 70 40, 66 100" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".6" stroke-dasharray="1.5 1.5"/>';
      svg += '<path d="M0 70 C 30 66, 40 80, 46 100" fill="none" stroke="rgba(255,255,255,.08)" stroke-width=".6" stroke-dasharray="1.5 1.5"/>';
      S.cities.forEach((c, i) => {
        svg += '<line x1="' + sx + '" y1="' + sy + '" x2="' + c.x + '" y2="' + c.y + '" stroke="rgba(255,122,69,.45)" stroke-width=".5" stroke-dasharray="1 1.2"><animate attributeName="stroke-dashoffset" from="10" to="0" dur="' + (2 + i * .3) + 's" repeatCount="indefinite"/></line>';
      });
      svg += '</svg>';
      let labels = '';
      S.cities.forEach(c => {
        labels += '<div style="position:absolute;left:' + c.x + '%;top:' + c.y + '%;transform:translate(-50%,-50%);text-align:center;font-size:11px;line-height:1.15;white-space:nowrap"><span style="display:block;width:6px;height:6px;margin:0 auto 3px;border-radius:50%;background:#fff;opacity:.7"></span><b style="font-weight:700">' + esc(tr(c)) + '</b><br><span style="color:rgba(255,255,255,.55)">' + esc(c.t) + '</span></div>';
      });
      labels += '<div style="position:absolute;left:' + sx + '%;top:' + sy + '%;transform:translate(-50%,-100%);text-align:center"><span style="display:grid;place-items:center;width:30px;height:30px;margin:0 auto;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#E83637;box-shadow:0 8px 20px rgba(232,54,55,.55)"><span style="width:10px;height:10px;border-radius:50%;background:#fff;transform:rotate(45deg)"></span></span></div>' +
        '<div style="position:absolute;left:' + sx + '%;top:' + (sy + 4) + '%;transform:translateX(-50%);font-family:Anton,Impact,sans-serif;font-size:14px;letter-spacing:.04em;white-space:nowrap">RACEPOINT</div>';
      card.innerHTML = '<div class="kib-map">' + svg + labels + '</div>' +
        '<div class="kib-contact"><div><span>' + I.pin.replace('<svg', '<svg width="13" height="13"') + '</span>' + esc(CONTACT.address) + '</div>' +
        '<div><span>' + esc(tr(S.wCall)) + '</span><a href="tel:' + CONTACT.tel + '">' + esc(CONTACT.phone) + '</a></div>' +
        '<div><span>' + esc(tr(S.wMail)) + '</span><a href="mailto:' + CONTACT.email + '">' + esc(CONTACT.email) + '</a></div></div>' +
        '<div class="kib-map-f"><a class="kib-btn" target="_blank" rel="noopener" href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent('Racepoint, ' + CONTACT.address) + '">' + I.pin + esc(tr(S.wRoute)) + '</a>' +
        '<a class="kib-btn ghost" href="tel:' + CONTACT.tel + '">' + esc(tr(S.wCall)) + '</a></div>';
      w.appendChild(card);
    };
  }

  // Anliegen fuer das Team: editierbarer Text -> E-Mail-Entwurf (nichts wird automatisch gesendet)
  function wLead(question, summaryText) {
    return w => {
      const card = document.createElement('div');
      card.className = 'kib-card kib-lead';
      let text = summaryText;
      if (!text) {
        const b = state.bike, rows = [];
        if (question) rows.push([tr(S.wQuestion), question]);
        rows.push([tr(S.wInterest), b ? b.name : state.cat ? tr(CATS[state.cat].label) : null]);
        rows.push([tr(S.wBudget), state.tier ? tr(TIERS[state.tier]) : null]);
        rows.push([tr(S.wSizeL), state.height ? state.height + ' cm · ' + frameSize(state.height, state.sizeCat || state.cat || 'rennrad') : null]);
        rows.push([tr(S.wAppt), state.termin ? dateLabel(state.termin.date) + ' · ' + state.termin.h + ':00' : null]);
        text = rows.filter(r => r[1]).map(r => r[0] + ': ' + r[1]).join('\n');
      }
      card.innerHTML = '<div class="kib-lbl">' + esc(tr(S.wLead)) + '</div><textarea aria-label="' + esc(tr(S.wLead)) + '"></textarea>' +
        '<input type="text" autocomplete="given-name" placeholder="' + esc(tr(S.wName)) + '"><div class="kib-row"><a class="kib-btn" data-mail style="flex:1">' + I.send + esc(tr(S.wMailOpen)) + '</a>' +
        '<button class="kib-btn ghost" data-copy>' + I.copy + esc(tr(S.wCopy)) + '</button></div><p class="kib-note" style="margin-top:8px">' + esc(tr(S.wLeadNote)) + '</p>';
      const ta = card.querySelector('textarea'), name = card.querySelector('input'), mail = card.querySelector('[data-mail]');
      ta.value = 'Hallo Racepoint-Team,\n\n' + (text || '') + '\n\nBitte meldet euch bei mir.';
      const full = () => ta.value + (name.value.trim() ? '\n\n' + name.value.trim() : '');
      const upd = () => { mail.href = mailto('Anfrage über den Racepoint-Berater', full()); };
      ta.addEventListener('input', upd); name.addEventListener('input', upd); upd();
      card.querySelector('[data-copy]').addEventListener('click', e => { try { navigator.clipboard.writeText(full()); e.currentTarget.lastChild.textContent = tr(S.copied); } catch (err) { /* kein Clipboard */ } });
      w.appendChild(card);
    };
  }

  function wVideo(id, title) {
    return w => {
      const a = document.createElement('a');
      a.className = 'kib-vid'; a.href = '#';
      a.innerHTML = RP.ytThumb ? RP.ytThumb(id, 'assets/teaser-poster.jpg') : '';
      a.innerHTML += '<i>' + I.play + '</i><span>' + esc(title) + '</span>';
      a.addEventListener('click', e => { e.preventDefault(); RP.openVideo(id); });
      w.appendChild(a);
    };
  }

  /* =================== Verstehen =================== */
  const LANG_WORDS = {
    fr: /\b(bonjour|salut|bonsoir|merci|velo|je|j|cherche|voudrais|veux|combien|ouvert|ouverts|horaires|atelier|reparation|reparer|taille|cadre|prix|electrique|rendez|vous|votre|est|quel|quelle|pour|avec|ou|aujourd|demain|mon|ma|un|une|le|la|les|des|du|suis|faire|peut|pouvez)\b/g,
    nl: /\b(hallo|hoi|bedankt|dank|fiets|fietsen|ik|zoek|wil|graag|openingsuren|openingstijden|werkplaats|herstelling|herstellen|reparatie|maat|prijs|elektrische|afspraak|jullie|wanneer|hoeveel|racefiets|kan|een|het|mijn|voor|waar|vandaag|morgen|zijn|nu|welke|past|bij|mij|ook)\b/g,
    en: /\b(hi|hello|hey|thanks|thank|looking|want|need|opening|workshop|repair|size|price|electric|appointment|you|your|when|how|much|road|which|what|where|today|tomorrow|the|for|my|is|are|do|me|bike|book|fix|service|right|now|suits|up|to)\b/g,
    de: /\b(hallo|servus|moin|danke|rad|fahrrad|ich|suche|mochte|moechte|brauche|geoffnet|offen|offnungszeiten|werkstatt|reparatur|grosse|preis|termin|ihr|euch|wann|wie|viel|rennrad|welches|welche|was|wo|heute|der|die|das|und|fur|fuer|mein|meine|ist|habt|bis|auch|gerade|zu|mir|passt|berechnen|buchen)\b/g,
  };
  function detectLang(t) {
    const n = norm(t);
    let best = state.lang, score = 0;
    const counts = {};
    Object.keys(LANG_WORDS).forEach(l => { counts[l] = (n.match(LANG_WORDS[l]) || []).length; });
    counts[state.lang] += 0.5; // leichte Praeferenz fuer die aktuelle Sprache
    Object.keys(counts).forEach(l => { if (counts[l] > score) { score = counts[l]; best = l; } });
    return score >= 1.5 || best === state.lang ? best : state.lang;
  }
  const BRANDS = ['trek', 'cube', 'canyon', 'giant', 'scott', 'cannondale', 'bmc', 'orbea', 'ktm', 'haibike', 'gazelle', 'ridley', 'rose', 'bianchi', 'pinarello', 'merida', 'focus', 'stevens', 'cervelo', 'santa cruz', 'propain', 'riese', 'kalkhoff', 'bulls', 'lapierre', 'btwin', 'vanmoof', 'colnago', 'factor', 'wilier', 'lezyne'];
  function parse(text) {
    const n = norm(text);
    const has = re => re.test(n);
    const r = { n };
    if (has(/(e-?bike|ebike|pedelec|elektro|electri|elektrisch|turbo|levo|vado|creo|como|e-?mtb)/)) r.cat = 'ebike';
    else if (has(/\b(kind|kinder|kids|enfant|junior|jett|riprock|sohn|tochter|zoon|dochter)/)) r.cat = 'kids';
    else if (has(/(gravel|crux|diverge|schotter|bikepacking|grind)/)) r.cat = 'gravel';
    else if (has(/(mtb|mountain|vtt|trail|enduro|downhill|stumpjumper|epic|rockhopper|chisel|fully|hardtail|bikepark|singletrail)/)) r.cat = 'mtb';
    else if (has(/(rennrad|road|velo de route|route|racefiets|koersfiets|tarmac|aethos|roubaix|allez|asphalt)/)) r.cat = 'rennrad';
    else if (has(/(stadt|city|alltag|pendel|commut|ville|trekking|\bstad\b|woon-werk|sirrus|einkauf|quotidien|dagelijks|everyday)/)) r.cat = 'alltag';
    // Budget
    const m = n.match(/(\d{1,2})[.\s,]?(\d{3})\b|(\d{1,2}(?:[.,]\d)?)\s?k\b|\b(\d{4,5})\b/);
    if (m) {
      let v = m[1] ? +(m[1] + m[2]) : m[3] ? parseFloat(m[3].replace(',', '.')) * 1000 : +m[4];
      if (v >= 400 && v <= 25000 && !/\bcm\b/.test(n.slice(m.index, m.index + 12))) r.tier = v <= 2500 ? 'a' : v <= 5000 ? 'b' : 'c';
    }
    if (!r.tier && has(/(gunstig|guenstig|billig|budget|pas cher|goedkoop|cheap|einsteiger|anfanger|anfaenger|debutant|beginner|instap)/)) r.tier = 'a';
    if (!r.tier && has(/(traum|high.?end|s-?works|dream|reve|droom|das beste|le meilleur|the best)/)) r.tier = 'c';
    // Koerpergroesse / Schrittlaenge
    const hm = n.match(/\b1[.,](\d{2})\s?m?\b/), hc = n.match(/\b(1[4-9]\d|20\d)\s?(cm)?\b/);
    if (hm) r.height = 100 + +hm[1];
    else if (hc && (hc[2] || /(gross|taille|maat|size|tall|bin|ben|suis|mesure)/.test(n))) r.height = +hc[1];
    const im = n.match(/(schritt|inseam|entrejambe|binnenbeen)\D{0,14}(\d{2,3})/);
    if (im) r.inseam = +im[2];
    r.brand = BRANDS.find(b => new RegExp('\\b' + b + '\\b').test(n));
    r.greet = has(/^(hi|hallo|hey|moin|servus|hoi|bonjour|salut|hello|guten (tag|morgen|abend)|goedendag|goeiedag|dag)\b/) && n.length < 22;
    r.thanks = has(/(danke|merci|bedankt|dank je|dankjewel|thanks|thank you)/);
    r.size = has(/(rahmengr|grosse|groesse|wie gross|taille|\bmaat\b|framemaat|\bsize\b|schrittl|inseam|entrejambe|binnenbeen)/) || !!r.height;
    r.fitting = has(/(fitting|retul|retuel|sitzposition|knie|rucken|ruecken|schmerz|genou|douleur|\bpijn\b|knee|back pain|position)/);
    r.service = has(/(werkstatt|reparat|repar|inspekt|service|wartung|platt|schaltung|bremse|kette|federgabel|dampfer|daempfer|fahrwerk|atelier|entretien|revision|crevaison|werkplaats|herstel|onderhoud|\blek\b|repair|workshop|tune|puncture|brake|gears|suspension|fix)/) || !!r.brand;
    r.hours = has(/(geoffnet|geoeffnet|offnungszeit|oeffnungszeit|offen|wann.*(auf|da)|ouvert|horaire|\bopen\b|openingsu|openingstijd|opening hour|jetzt da|heute da)/);
    r.where = has(/(\bwo\b|adresse|anfahrt|parken|itineraire|\bou\b.*(etes|trouve)|\badres\b|\bwaar\b|where|address|directions|wie komme|comment venir|hoe kom)/);
    r.termin = has(/(termin|buchen|vereinbar|reserv|rendez|\brdv\b|afspraak|boek|\bbook\b|appointment|slot|vorbeikommen|passer)/);
    r.leasing = has(/(leasing|finanz|raten|jobrad|financ|\blease\b)/);
    r.video = has(/(video|youtube|kanal|abonn|channel|chaine|kanaal)/);
    r.achim = has(/(achim|wer seid|wer bist|uber euch|ueber euch|\bteam\b|elke|qui etes|wie zijn|who are|about you)/);
    r.price = has(/(preis|kost|teuer|\bprix\b|\bcout\b|\bcher\b|prijs|duur|price|cost|expensive)/);
    r.test = has(/(probefahrt|testfahrt|probe fahren|essai|essayer|proefrit|test ?ride|try one)/);
    r.find = has(/(kaufen|suche|neues|acheter|cherche|kopen|\bzoek|\bbuy\b|looking for|recommend|empfehl|passt zu mir|convient|past bij|suits me|welches (bike|rad)|quel velo|welke fiets|which bike)/) ||
      (has(/(bike|\brad\b|fahrrad|velo|fiets)/) && n.split(/\s+/).length <= 4);
    return r;
  }

  async function route(text) {
    const lang = detectLang(text);
    const switched = lang !== state.lang;
    if (switched) { state.lang = lang; applyLang(); }
    const p = parse(text);
    if (p.cat) state.cat = p.cat;
    if (p.tier) state.tier = p.tier;
    if (p.height) state.height = p.height;
    if (p.inseam) state.inseam = p.inseam;
    if (p.brand) state.brand = p.brand;
    const langChip = switched && RP.lang !== lang ? chip(S.offerLang, () => RP.setLang(lang), { alt: true, silent: true }) : null;

    if (p.thanks && !p.find && !p.service) return bot([tr(S.thanks)], { chips: [chip(S.cFind, askCat), chip(S.cHours, doHours), langChip] });
    if (p.greet) return bot([tr(S.greet)], { chips: [chip(S.cFind, askCat), chip(S.cService, doService), chip(S.cTermin, () => doTermin()), langChip] });
    if (p.size) return doSize(langChip);
    if (p.fitting) return doFitting(langChip);
    if (p.service) return doService(langChip);
    if (p.hours) return doHours(langChip);
    if (p.where) return doWhere(langChip);
    if (p.leasing) return doLeasing(langChip);
    if (p.test) return bot([tr(S.testride), wTermin('beratung')], { chips: [langChip] });
    if (p.termin) return doTermin(null, langChip);
    if (p.video) return doVideo(langChip);
    if (p.achim) return bot([tr(S.achim)], { chips: [chip(S.cVideo, doVideo), chip(S.cTermin, () => doTermin()), langChip] });
    if (p.cat || p.tier || p.find) return bikeFlow(langChip);
    if (p.price) return bot([tr(S.price)], { chips: [chip(S.cFind, askCat), chip(S.cLeasing, doLeasing), langChip] });
    return bot([tr(S.fallback), wLead(text)], { chips: [chip(S.cFind, askCat), chip(S.cHours, doHours), langChip] });
  }

  /* =================== Ablaeufe =================== */
  function catChips() {
    return ['rennrad', 'gravel', 'mtb', 'ebike', 'alltag', 'kids'].map(k => chip(CATS[k].label, () => { state.cat = k; bikeFlow(); }));
  }
  function askCat() { return bot([tr(S.askCat)], { chips: catChips(), fast: true }); }
  function bikeFlow(extraChip) {
    if (!state.cat) return bot([tr(S.askCat)], { chips: catChips().concat(extraChip ? [extraChip] : []) });
    if (!state.tier && state.cat !== 'kids') {
      return bot([fill(tr(S.askBudget), { cat: tr(CATS[state.cat].label) })], {
        chips: S.budgets.map(b => chip(b, () => { if (b.t) { state.tier = b.t; recommend(); } else recommendUnsure(); })).concat(extraChip ? [extraChip] : []),
      });
    }
    return recommend(extraChip);
  }
  function pick(cat, tier) {
    const inCat = BIKES.filter(b => b.cat === cat);
    let list = inCat.filter(b => b.tier === tier);
    if (list.length < 2) {
      const order = tier === 'a' ? ['b', 'c'] : tier === 'c' ? ['b', 'a'] : ['c', 'a'];
      order.forEach(t => { if (list.length < 3) list = list.concat(inCat.filter(b => b.tier === t).slice(0, 3 - list.length)); });
    }
    return list.slice(0, 3);
  }
  function recommend(extraChip) {
    const tier = state.tier || 'a';
    const list = pick(state.cat, tier);
    return bot([fill(tr(S.recIntro), { cat: tr(CATS[state.cat].label), tier: tr(TIERS[tier]) }), wBikes(list), tr(S.recOutro)], {
      chips: [chip(S.cTest, () => doTermin('beratung')), chip(S.cSize, () => doSize()), chip(S.cSend, doHandoff), chip(S.cOther, () => { state.cat = null; state.tier = null; askCat(); }, { alt: true }), extraChip],
    });
  }
  function recommendUnsure() {
    const list = ['a', 'b', 'c'].map(t => BIKES.find(b => b.cat === state.cat && b.tier === t)).filter(Boolean);
    return bot([tr(S.unsure), wBikes(list), tr(S.recOutro)], { chips: [chip(S.cTest, () => doTermin('beratung')), chip(S.cLeasing, doLeasing), chip(S.cSize, () => doSize())] });
  }
  function doSize(extraChip) {
    const cat = state.cat || 'rennrad';
    const first = state.height ? fill(tr(S.sizeKnown), { h: state.height, size: frameSize(state.height, cat), cat: tr(CATS[cat].label) }) : tr(S.sizeIntro);
    return bot([first, wSize()], { chips: [chip(S.cFit, () => doFitting()), chip(S.cFind, () => bikeFlow()), chip(S.cSend, doHandoff), extraChip] });
  }
  function doFitting(extraChip) { return bot([tr(S.fitting), wTermin('fitting')], { chips: [chip(S.cSize, () => doSize()), extraChip] }); }
  function doService(extraChip) {
    const brand = state.brand ? state.brand.replace(/\b\w/g, c => c.toUpperCase()).replace('Bmc', 'BMC').replace('Ktm', 'KTM').replace('Cervelo', 'Cervélo') : null;
    const parts = [tr(S.serviceAll) + (brand ? ' ' + fill(tr(S.serviceBrand), { brand }) : ''), tr(S.serviceMore)];
    return bot(parts, {
      chips: [
        chip(S.cInspect, () => bot([tr(S.sInspect), wTermin('service')], { chips: [chip(S.cHours, doHours)] })),
        chip(S.cRepair, () => bot([tr(S.sRepair), wTermin('service')], { chips: [chip(S.cHours, doHours)] })),
        chip(S.cSusp, () => bot([tr(S.sSusp), wTermin('service')], { chips: [chip(S.cHours, doHours)] })),
        chip(S.cFit, () => doFitting()), extraChip,
      ],
    });
  }
  function doHours(extraChip) {
    const s = RP.status(), st = RP.statusText(state.lang);
    return bot([fill(tr(s.open ? S.hoursOpen : S.hoursClosed), { s: st }), wHours()], { chips: [chip(S.cWhere, doWhere), chip(S.cTermin, () => doTermin()), extraChip] });
  }
  function doWhere(extraChip) { return bot([tr(S.where), wMap()], { chips: [chip(S.cHours, doHours), chip(S.cTermin, () => doTermin()), extraChip] }); }
  function doTermin(kind, extraChip) { return bot([tr(S.termin), wTermin(kind)], { chips: [chip(S.cHours, doHours), extraChip] }); }
  function doLeasing(extraChip) { return bot([tr(S.leasing)], { chips: [chip(S.cFind, () => bikeFlow()), chip(S.cTermin, () => doTermin('beratung')), extraChip] }); }
  function doVideo(extraChip) {
    return bot([tr(S.video), wVideo('9KIh7oOIPT4', 'S-Works Tarmac SL8 LTD · Unboxing')], { chips: [chip(S.cFind, () => bikeFlow()), chip(S.cTermin, () => doTermin()), extraChip] });
  }
  function doHandoff() { return bot([tr(S.handoff), wLead()], { fast: true }); }

  /* =================== Live-KI (Racepoint-Agent auf dem Server) =================== */
  const live = { ready: false, conversation: [], profile: null, ctrl: null };
  async function checkLive() {
    try {
      const r = await fetch('/api/status', { headers: { Accept: 'application/json' }, cache: 'no-store' });
      const j = r.ok && /json/.test(r.headers.get('content-type') || '') ? await r.json() : null;
      live.ready = !!(j && j.ready);
    } catch (e) { live.ready = false; }
    if (root) applyLang();
  }
  // Server-Sent Events zeilenweise lesen (auch geteilte UTF-8-Zeichen)
  function parseFrame(frame) {
    const lines = frame.split(/\r?\n/);
    const data = lines.filter(l => l.startsWith('data:')).map(l => l.slice(5).trimStart()).join('\n');
    if (!data) return null;
    const ev = lines.find(l => l.startsWith('event:'));
    try { return { event: ev ? ev.slice(6).trim() : 'message', data: JSON.parse(data) }; } catch (e) { return null; }
  }
  async function* sseEvents(stream) {
    const reader = stream.getReader(), dec = new TextDecoder();
    let buf = '';
    try {
      for (;;) {
        const { done, value } = await reader.read();
        buf += dec.decode(value || new Uint8Array(), { stream: !done });
        let m;
        while ((m = /\r?\n\r?\n/.exec(buf))) {
          const ev = parseFrame(buf.slice(0, m.index));
          buf = buf.slice(m.index + m[0].length);
          if (ev) yield ev;
        }
        if (done) { const ev = buf.trim() && parseFrame(buf); if (ev) yield ev; return; }
      }
    } finally { reader.cancel().catch(() => {}); }
  }
  // Verlauf innerhalb der Server-Grenzen halten (max. 18 Nachrichten, 24.000 Zeichen)
  function trimConversation() {
    const c = live.conversation;
    while (c.length > 16 || c.reduce((n, m) => n + m.content.length, 0) > 20000) c.splice(0, 2);
    while (c.length && c[0].role !== 'user') c.shift();
  }
  const fmtEUR = v => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(v);
  const catOf = c => ({ kind: 'kids', familie: 'alltag' }[c] || (CATS[c] ? c : 'rennrad'));
  const liveChip = (label, extra) => chip(label, () => askLive(tr(label)), extra);

  async function askLive(text) {
    state.busy = true; chipsBox.innerHTML = '';
    live.conversation.push({ role: 'user', content: String(text).slice(0, 4000) });
    trimConversation();
    const d = document.createElement('div');
    d.className = 'kib-msg';
    d.innerHTML = '<div class="kib-bav"><i>' + I.spark + '</i></div><div class="kib-b"><div class="kib-think">' + esc(tr(S.thinking)) + '</div></div>';
    log.appendChild(d); scrollDown();
    const body = d.querySelector('.kib-b'), think = body.querySelector('.kib-think');
    let txt = null;
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 125000);
    live.ctrl = ctrl;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
        body: JSON.stringify({ messages: live.conversation, profile: live.profile || undefined }), signal: ctrl.signal,
      });
      let result = null;
      if (!res.ok || !/event-stream/.test(res.headers.get('content-type') || '')) {
        const j = await res.json().catch(() => ({}));
        if (!res.ok) throw Object.assign(new Error(j.error || tr(S.errGeneric)), { status: res.status });
        result = j;
      } else {
        for await (const { event, data } of sseEvents(res.body)) {
          if (event === 'progress' && data.text && think.isConnected) think.textContent = data.text;
          else if (event === 'text' && data.text) {
            if (!txt) { think.remove(); txt = document.createElement('div'); txt.className = 'kib-txt'; body.appendChild(txt); }
            txt.innerHTML = md(data.text) + '<span class="kib-caret"></span>';
            scrollDown();
          } else if (event === 'error') throw new Error((data && data.error) || tr(S.errGeneric));
          else if (event === 'result') { result = data; break; }
        }
        if (!result) throw new Error(tr(S.errGeneric));
      }
      if (live.ctrl !== ctrl) return;
      renderLive(body, think, txt, result);
      live.conversation.push({ role: 'assistant', content: String(result.text || '').slice(0, 4000) });
      live.profile = result.profile || live.profile;
    } catch (err) {
      if (live.ctrl !== ctrl) return;
      live.conversation.pop();
      think.remove(); if (txt) txt.remove();
      const quota = err.status === 429 && /Kontingent|aufgebraucht/i.test(err.message);
      const offline = [404, 405, 503].includes(err.status) || err.name === 'TypeError';
      if (quota || offline) {
        // Ohne echte KI: ehrlich sagen und mit der Simulation weitermachen
        live.ready = false; applyLang(); d.remove();
        const note = document.createElement('div');
        note.className = 'kib-note-live'; note.textContent = tr(quota ? S.errQuota : S.errOffline);
        log.appendChild(note);
        clearTimeout(timer); live.ctrl = null; state.busy = false;
        return route(text);
      }
      const t = document.createElement('div');
      t.className = 'kib-txt'; t.textContent = err.name === 'AbortError' ? tr(S.errSlow) : err.message || tr(S.errGeneric);
      body.appendChild(t);
      setTimeout(() => chips([chip(S.retry, () => askLive(text), { silent: true }), liveChip(S.lContact, { alt: true })]), 50);
    } finally {
      clearTimeout(timer);
      if (live.ctrl === ctrl) { live.ctrl = null; state.busy = false; }
    }
  }

  function renderLive(body, think, txt, result) {
    think.remove();
    if (!txt) { txt = document.createElement('div'); txt.className = 'kib-txt'; body.appendChild(txt); }
    txt.innerHTML = md(result.text || '');
    const add = fn => { const w = document.createElement('div'); w.className = 'kib-w'; fn(w); body.appendChild(w); };
    if (result.cards && result.cards.length) add(wCards(result.cards));
    (result.widgets || []).forEach(x => {
      if (x.type === 'hours') add(wHours());
      else if (x.type === 'contact') add(wMap());
      else if (x.type === 'appointment') add(wTermin({ bikefitting: 'fitting', werkstatt: 'service' }[x.kind] || 'beratung'));
      else if (x.type === 'size') { state.cat = catOf(x.category); add(wSize()); }
      else if (x.type === 'handoff') add(wLead(null, x.summary));
      else if (x.type === 'video') add(wVideo(x.video_id, x.title + (x.subtitle ? ' · ' + x.subtitle : '')));
    });
    if (result.sources && result.sources.length) {
      const src = document.createElement('div');
      src.className = 'kib-src';
      src.innerHTML = esc(tr(S.sources)) + ': ' + result.sources.slice(0, 5).map(s => '<a href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.title || new URL(s.url).hostname) + ' ↗</a>').join('');
      body.appendChild(src);
    }
    addActs(body, result.text || '');
    scrollDown();
    const types = (result.widgets || []).map(w => w.type);
    const next = result.cards && result.cards.length
      ? [liveChip(S.lAppt), liveChip(S.lCompare), liveChip(S.lTeam, { alt: true })]
      : types.length ? [liveChip(S.lFind), liveChip(S.lTeam, { alt: true })]
        : [liveChip(S.lFind), liveChip(S.lHours), liveChip(S.lContact, { alt: true })];
    setTimeout(() => chips(next), 120);
  }

  // Echte Produktkarten aus dem Herstellerkatalog (Bild, Preis, Begruendung, Quelle)
  function wCards(cards) {
    return w => {
      const box = document.createElement('div');
      box.className = 'kib-bikes';
      cards.forEach((c, i) => {
        const cat = catOf(c.cat), color = CATS[cat].color;
        const el = document.createElement('article');
        el.className = 'kib-bike kib-prod';
        el.style.setProperty('--c', color);
        el.style.animationDelay = (i * 90) + 'ms';
        const price = c.price ? fmtEUR(c.price) + ' · ' + tr(S.priceMaker) + (c.market ? ' ' + c.market : '') : tr(S.priceOpen);
        el.innerHTML =
          '<div class="kib-bike-art"><span class="kib-cat">' + esc(tr(CATS[cat].label)) + '</span>' +
          (c.image ? '<img src="' + esc(c.image) + '" alt="' + esc(c.name) + '" loading="lazy" referrerpolicy="no-referrer">' : bikeSVG(cat)) + '</div>' +
          '<div class="kib-bike-b"><h4>' + esc(c.name) + '</h4><span class="kib-price">' + esc(price) + '</span>' +
          (c.reason ? '<p>' + esc(c.reason) + '</p>' : '') + (c.tradeoff ? '<p class="kib-trade">' + esc(tr(S.tradeoff)) + ': ' + esc(c.tradeoff) + '</p>' : '') +
          ((c.specs || []).length ? '<div class="kib-specs">' + c.specs.slice(0, 3).map(s => '<span>' + esc(s) + '</span>').join('') + '</div>' : '') +
          '<div class="kib-bike-btns"><button class="kib-btn" data-b="ask">' + esc(tr(S.wAsk)) + '</button>' +
          (c.source ? '<a class="kib-btn ghost" data-b="src" href="' + esc(c.source) + '" target="_blank" rel="noopener">' + esc(tr(S.makerPage)) + ' ↗</a>' : '') +
          (bikeFns.length ? '<button class="kib-btn ghost" data-b="3d">' + I.cube + esc(tr(S.w3d)) + '</button>' : '') +
          '</div></div>';
        const img = el.querySelector('img');
        if (img) img.addEventListener('error', () => { img.outerHTML = bikeSVG(cat); }, { once: true });
        el.addEventListener('click', e => {
          const t = e.target.closest('[data-b]'); if (!t || t.dataset.b === 'src') return;
          if (t.dataset.b === 'ask') {
            userSays(tr(S.wAsk) + ': ' + c.name);
            bot([tr(S.handoff), wLead(null, tr(S.interest) + ': ' + c.name + (c.price ? ' (' + price + ')' : '') + (c.source ? '\n' + c.source : ''))], { fast: true });
          }
          if (t.dataset.b === '3d') { bikeFns.forEach(fn => { try { fn({ id: c.id, name: c.name, cat }); } catch (err) { console.error(err); } }); if (matchMedia('(max-width:640px)').matches) close(); }
        });
        box.appendChild(el);
      });
      w.appendChild(box);
    };
  }

  /* =================== Spracheingabe =================== */
  function setupVoice() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    micBtn.hidden = false;
    let rec = null;
    micBtn.addEventListener('click', () => {
      if (rec) { rec.stop(); return; }
      rec = new SR();
      rec.lang = { de: 'de-DE', fr: 'fr-BE', nl: 'nl-BE', en: 'en-GB' }[state.lang];
      rec.interimResults = true;
      micBtn.classList.add('rec');
      input.placeholder = tr(S.listening);
      rec.onresult = e => {
        const t = Array.from(e.results).map(r => r[0].transcript).join('');
        input.value = t; autoGrow(); sendBtn.disabled = !t.trim();
        if (e.results[e.results.length - 1].isFinal) setTimeout(submit, 250);
      };
      rec.onend = rec.onerror = () => { micBtn.classList.remove('rec'); input.placeholder = tr(S.ph); rec = null; };
      try { rec.start(); } catch (e) { rec = null; micBtn.classList.remove('rec'); }
    });
  }

  /* =================== API =================== */
  window.KIBerater = {
    open, close, ask,
    onBike(fn) { bikeFns.push(fn); },
    isLive: () => live.ready,
    BIKES, CATS, bikeSVG,
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();
})();
