import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sourceUrl, imageUrl, parsePage } from './manufacturers.mjs';
import { validProfile, findBikes } from './agent.mjs';
import { initialProfile, recommend, makeSummary } from '../prototype/kombi/advisor.mjs';
const catalogue=JSON.parse(await readFile(new URL('../prototype/kombi/catalogue.json',import.meta.url),'utf8'));

test('Ein hartes Budget wird inklusive Grenzwert berücksichtigt',()=>{
  const profile=validProfile({category:'rennrad',budget:1499});
  assert.deepEqual(findBikes(profile).map(b=>b.id),['allez-cues']);
  assert.equal(findBikes({...profile,budget:1498}).length,0);
  assert.equal(findBikes({...profile,budget:0}).length,0);
});
test('E-MTB, E-Alltag und Kinderräder werden fachlich getrennt',()=>{
  assert.deepEqual(findBikes(validProfile({category:'ebike',motor:'yes',terrain:'trail',budget:8000})).map(b=>b.id),['levo-4-evo-comp']);
  assert.deepEqual(findBikes(validProfile({category:'ebike',motor:'yes',terrain:'city',budget:5000})).map(b=>b.id),['vado-3-evo-4']);
  assert.deepEqual(findBikes(validProfile({category:'kind',budget:750})).map(b=>b.id),['riprock-24']);
  assert.equal(findBikes(validProfile({category:'kind',budget:500})).length,0);
});
test('Manuelle Auswahl respektiert Preisgrenzen und Familie/Kinder',()=>{
  const profile={...initialProfile(),category:'familie',budget:1000};
  assert.deepEqual(recommend(catalogue,profile).bikes.map(b=>b.id),['riprock-24']);
  assert.ok(recommend(catalogue,initialProfile()).bikes.every(b=>b.cat!=='kind'));
});
test('Herstellerzugriff blockiert interne Ziele, falsche Hosts und Credentials',()=>{
  for(const url of ['http://www.specialized.com/x','https://127.0.0.1/','https://specialized.com.evil.test/','https://specialized.com@evil.test/','https://user:pass@specialized.com/','https://specialized.com:8443/'])assert.equal(sourceUrl(url),null);
  assert.equal(sourceUrl('https://www.cervelo.com/en-US/bikes/soloist'),'https://www.cervelo.com/en-US/bikes/soloist');
  assert.equal(imageUrl('javascript:alert(1)'),null);
  assert.ok(imageUrl('https://resources.specialized.com/image/test'));
});
test('Produktparser übernimmt echte Metadaten, keinen willkürlichen Seitenpreis',()=>{
  const page=parsePage('<meta content="Bike &amp; Co" property="og:title"><meta property="og:image" content="https://resources.specialized.com/a?w=100&amp;h=100"><script>secret should not be shown</script><p>Ein Testbike 1.500 Euro</p>','https://www.specialized.com/be/nl/test');
  assert.equal(page.name,'Bike & Co');assert.equal(page.price,null);assert.equal(page.image,'https://resources.specialized.com/a?w=100&h=100');assert.ok(!page.text.includes('secret'));
  const price=parsePage('<script type="application/ld+json">{"@type":"Product","name":"Belegt","offers":{"price":"2499","priceCurrency":"EUR"}}</script>','https://www.specialized.com/be/nl/test');assert.equal(price.price,2499);
});
test('Profilvalidierung lässt keine beliebigen Kategorien oder negativen Budgets zu',()=>{
  assert.equal(validProfile({category:'<script>',budget:-3}).category,'any');
  assert.equal(validProfile({budget:-3}).budget,null);
  assert.equal(validProfile({budget:Infinity}).budget,null);
});
test('Cervélo-Produktbilder werden aus den offiziellen Seitendaten gelesen',()=>{
  const picture='https://images.prismic.io/cervelo/soloist-profile.png?auto=format,compress';
  const html='<script id="__NEXT_DATA__" type="application/json">'+JSON.stringify({props:{pageProps:{page:{data:{seo_og_thumbnail_image:{url:picture}}}}}})+'</script>';
  const page=parsePage(html,'https://www.cervelo.com/de-DE/bikes/soloist');
  assert.equal(page.image,picture);assert.equal(page.market,'DE');assert.equal(page.price,null);
  assert.equal(imageUrl('https://images.prismic.io/unrelated/picture.png'),null);
});
test('Briefing enthält Quellen und trennt Herstellerpreis vom Ladenangebot',()=>{
  const text=makeSummary({...initialProfile(),category:'rennrad',budget:1500},'Für den Arbeitsweg',[],[catalogue[0]]);
  assert.match(text,/Herstellerpreis BE/);assert.match(text,/keine Racepoint-Angebote/);assert.match(text,/https:\/\/www.specialized.com/);
  const href='mailto:info@racepoint.be?body='+encodeURIComponent(text+' &bcc=evil@example.test');
  assert.equal(new URL(href).searchParams.has('bcc'),false);
});
test('Alle kuratierten Produkte haben Herstellerquelle, Datum und sinnvolle Typen',()=>{
  assert.equal(new Set(catalogue.map(b=>b.id)).size,catalogue.length);
  for(const bike of catalogue){assert.ok(sourceUrl(bike.source));assert.ok(imageUrl(bike.image));assert.equal(bike.market,'BE');assert.ok(bike.price>0);assert.ok(bike.specs.length>=2);assert.equal(bike.availability,'unknown');}
});
