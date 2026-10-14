// Real films from Racepoint Bike Shop. Build archive, not current product offers.
export const films=[
  {id:'9KIh7oOIPT4',title:'S-Works Tarmac SL8 LTD',category:'road',subtitle:'Limited Edition · Unboxing'},
  {id:'5TcRRpUy5T4',title:'Cervélo S5',category:'road',subtitle:'Vom Rahmen zum Aero-Dreambuild'},
  {id:'cIBBbESSOoc',title:'S-Works Crux',category:'gravel',subtitle:'Ein Gravelbike entsteht'},
  {id:'vV_rL9yq620',title:'S-Works Aethos',category:'road',subtitle:'Leichtbau aus Achims Werkstatt'},
  {id:'2zD31t7mWCw',title:'Epic 8 Pro LTD',category:'mtb',subtitle:'Mountainbike · Unboxing'},
  {id:'-84OwxUfgIQ',title:'Turbo Levo SL',category:'ebike',subtitle:'Ein E-MTB als individueller Dreambuild'},
  {id:'seah_VUOGC8',title:'Áspero-5 Black Currant',category:'gravel',subtitle:'Cervélo · Limited Edition',format:'portrait'},
  {id:'Z5TqAKmey0M',title:'Hotwalk Carbon',category:'familie',subtitle:'Kleines Bike · großer Build'},
  {id:'WHggv7Jye4M',title:'S-Works Shiv',category:'road',subtitle:'Ein Triathlon-Build im Detail'},
  {id:'2XNKIGcNOMY',title:'Specialized Brain Service',category:'mtb',subtitle:'Einblick in den Fahrwerk-Service',format:'portrait'}
];
export const filmById=Object.fromEntries(films.map(film=>[film.id,film]));
export const filmPoster=id=>new URL('../../assets/films/'+id+'.jpg',import.meta.url).href;
export const pageFilms={
  rennrad:['9KIh7oOIPT4','5TcRRpUy5T4','vV_rL9yq620'],
  gravel:['cIBBbESSOoc','seah_VUOGC8'],
  mtb:['2zD31t7mWCw','2XNKIGcNOMY'],
  ebike:['-84OwxUfgIQ'],
  familie:['Z5TqAKmey0M'],
  reparatur:['2XNKIGcNOMY'],
  videos:['5TcRRpUy5T4'],
  'ueber-uns':['vV_rL9yq620','5TcRRpUy5T4'],
  anfrage:['vV_rL9yq620'],
  bike:['9KIh7oOIPT4','cIBBbESSOoc','2zD31t7mWCw']
};
