// Shared catalogue filters and briefing helpers. AI conversations use the server API.
export const labels = {
  category:{any:'Noch offen',rennrad:'Rennrad',gravel:'Gravel',mtb:'Mountainbike',ebike:'E-Bike',familie:'Familie & Alltag',kind:'Kinderrad'},
  style:{any:'Noch offen',alltag:'Komfort & Alltag',sportlich:'Sport & Touren',racer:'Tempo & Wettkampf',trail:'Trails & Abfahrten'},
  brand:{any:'Offen',specialized:'Specialized',cervelo:'Cervélo'}
};
export const initialProfile = () => ({category:'any',budget:null,style:'any',brand:'any',motor:'any',terrain:'any'});
export const isElectric = bike => bike.electric || bike.cat === 'ebike';
export const isChild = bike => bike.cat === 'kind' || bike.id === 'jett-24';
export const displayText = text => text.replace(/Cervelo/g,'Cervélo').replace(/Gepaecktraeger/g,'Gepäckträger');
export function recommend(bikes, profile) {
  const pool = bikes.filter(b => {
    if (profile.motor === 'no' && isElectric(b)) return false;
    if (profile.category === 'kind') { if (!isChild(b)) return false; }
    else {
      if (isChild(b) && profile.category!=='familie') return false;
      if (profile.category === 'ebike') { if (!isElectric(b)) return false; }
      else if (profile.category === 'familie') { if (!isChild(b) && !b.terrain?.includes('city')) return false; }
      else if (profile.category !== 'any' && b.cat !== profile.category) return false;
    }
    if (profile.brand !== 'any' && b.brand !== profile.brand) return false;
    if (profile.budget !== null && (b.price===null || b.price > profile.budget)) return false;
    if (profile.motor === 'yes' && !isElectric(b)) return false;
    if (profile.terrain && profile.terrain!=='any' && !b.terrain?.includes(profile.terrain)) return false;
    if (profile.style === 'trail' && !b.terrain?.includes('trail')) return false;
    return true;
  });
  const score = b => (profile.style !== 'any' && b.styles.includes(profile.style) ? 10 : 0);
  pool.sort((a,b) => score(b)-score(a) || a.price-b.price);
  return {total:pool.length,bikes:pool.slice(0,3)};
}
export function reasons(bike, profile) {
  const result = [isChild(bike) ? 'Kinderrad · Größe gemeinsam prüfen' : labels.category[bike.cat] + (isElectric(bike) && bike.cat !== 'ebike' ? ' · mit Motor' : '')];
  if (profile.budget !== null) result.push('Innerhalb deines Budgets');
  if (profile.style !== 'any' && bike.styles.includes(profile.style)) result.push('Ausgelegt auf ' + labels.style[profile.style]);
  else if (profile.style === 'trail') result.push('Für deinen Wunsch nach Trails');
  else if (profile.style !== 'any') result.push('Kompromiss: Einsatz mit Achim abgleichen');
  else result.push('Einsatz und Sitzposition persönlich abstimmen');
  return result;
}
export const formatPrice = price => new Intl.NumberFormat('de-DE',{style:'currency',currency:'EUR',maximumFractionDigits:0}).format(price);
export function makeSummary(profile, wish, selected, suggestions) {
  const items = selected.length ? selected : suggestions;
  return ['Hallo Achim und Racepoint-Team,','','ich möchte mich zu einem passenden Bike beraten lassen.',
    ...(wish ? ['','Mein Wunsch: '+wish] : []),'',
    'Richtung: '+labels.category[profile.category],
    'Maximales Budget: '+(profile.budget === null ? 'noch offen' : formatPrice(profile.budget)),
    'Einsatz: '+labels.style[profile.style], 'Marke: '+labels.brand[profile.brand],
    ...(profile.motor === 'no' ? ['Antrieb: ohne Motor'] : []),'',
    ...(items.length ? [(selected.length ? 'Meine Favoriten' : 'Meine Bike-Ideen')+':',...items.map(b=>'• '+displayText(b.name)+' · '+(b.price===null?'Preis ungeprüft':'Herstellerpreis '+(b.market==='BE'?'BE ':b.market?b.market+' ':'Region siehe Quelle ')+formatPrice(b.price))+'\n  Quelle: '+b.source)] : ['Ich freue mich auf eure persönliche Empfehlung.']),
    '','Bitte klärt mit mir die passende Größe, aktuelle Ausstattung, echte Preise und Verfügbarkeit.',
    '','Diese Gesprächsgrundlage stammt aus dem digitalen Bike-Berater. Herstellerpreise sind keine Racepoint-Angebote. Dies ist keine Bestellung oder Reservierung.'
  ].join('\n');
}
