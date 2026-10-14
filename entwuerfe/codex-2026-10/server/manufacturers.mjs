const hosts = new Set(['specialized.com','www.specialized.com','cervelo.com','www.cervelo.com','racepoint.be','www.racepoint.be']);
const imageHosts = new Set([...hosts,'resources.specialized.com','assets.specialized.com','images.ctfassets.net','cdn.sanity.io']);
export function sourceUrl(value){try{const u=new URL(value);return u.protocol==='https:'&&hosts.has(u.hostname)&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}}
export function imageUrl(value){try{const u=new URL(value);const approved=imageHosts.has(u.hostname)||(u.hostname==='images.prismic.io'&&u.pathname.startsWith('/cervelo/'));return u.protocol==='https:'&&approved&&!u.username&&!u.password&&!u.port?u.href:null;}catch{return null;}}
const decode = text => text.replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&#(?:x([0-9a-f]+)|(\d+));/gi,(_,hex,decimal)=>{const n=Number.parseInt(hex||decimal,hex?16:10);return n<=0x10ffff?String.fromCodePoint(n):'';}).replace(/&apos;|&#x27;/g,"'").replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
export function parsePage(html,url){
  const meta={};
  for(const tag of html.matchAll(/<meta\b[^>]+>/gi)){
    const attrs={};for(const a of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]);
    if(attrs.property||attrs.name)meta[attrs.property||attrs.name]=attrs.content;
  }
  const text=decode(html.replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ')).trim();
  let product=null;
  const inspect=value=>{if(!value||typeof value!=='object')return;if(value['@type']==='Product'||value['@type']?.includes?.('Product'))product=value;if(Array.isArray(value))value.forEach(inspect);else if(value['@graph'])inspect(value['@graph']);};
  for(const script of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)){try{inspect(JSON.parse(script[1]));}catch{}}
  let offer=product?.offers;if(Array.isArray(offer))offer=offer[0];
  const amount=Number(offer?.price??offer?.lowPrice),currency=offer?.priceCurrency;
  const rawImage=Array.isArray(product?.image)?product.image[0]:product?.image;
  let manufacturerImage=null;
  if(new URL(url).hostname.replace(/^www\./,'')==='cervelo.com'){
    try{const json=html.match(/<script\b[^>]*\bid=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i)?.[1];const data=JSON.parse(json).props?.pageProps?.page?.data;manufacturerImage=data?.seo_og_thumbnail_image?.url||data?.body?.find(s=>s.slice_type==='hero_image_carousel')?.items?.[0]?.hero_image?.url;}catch{}
  }
  const locale=new URL(url).pathname.split('/')[1];
  const market=/^[a-z]{2}-[a-z]{2}$/i.test(locale)?locale.split('-')[1].toUpperCase():['be','de','fr','nl','us','gb'].includes(locale)?locale.toUpperCase():null;
  const name=String(product?.name||meta['og:title']||decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]||new URL(url).hostname)).slice(0,180);
  // Main product content starts after header menus on the current manufacturer pages.
  const marker=text.search(/Productgegevens|Product Details|Produktdetails|Caractéristiques|Technische specificaties/i);
  const excerpt=marker>1500?text.slice(Math.max(0,marker-700),marker+14000):text.slice(0,16000);
  return {source:url,name,image:imageUrl(typeof rawImage==='string'?rawImage:rawImage?.url)||imageUrl(meta['og:image'])||imageUrl(manufacturerImage),price:Number.isFinite(amount)&&amount>0&&currency==='EUR'?amount:null,currency:'EUR',market,priceBasis:'Herstellerseite, Preisregion '+(market||'ungeklärt')+', kein Racepoint-Angebot',checkedAt:new Date().toISOString().slice(0,10),text:excerpt};
}
const pageCache=new Map(),pendingPages=new Map();
const cacheLifetime=10*60*1000,cacheLimit=64;
export async function readManufacturer(value,{refresh=false}={}){
  const url=sourceUrl(value);if(!url)throw new Error('Nur offizielle Hersteller- und Racepoint-Seiten sind zugelassen.');
  const cached=pageCache.get(url);
  if(!refresh&&cached&&Date.now()-cached.savedAt<cacheLifetime)return structuredClone(cached.document);
  if(!pendingPages.has(url)){
    const pending=fetchManufacturer(url).then(document=>{
      pageCache.delete(url);
      pageCache.set(url,{document,savedAt:Date.now()});
      while(pageCache.size>cacheLimit)pageCache.delete(pageCache.keys().next().value);
      return document;
    }).finally(()=>pendingPages.delete(url));
    pendingPages.set(url,pending);
  }
  return structuredClone(await pendingPages.get(url));
}
async function fetchManufacturer(value){
  let url=sourceUrl(value);if(!url)throw new Error('Nur offizielle Hersteller- und Racepoint-Seiten sind zugelassen.');
  for(let redirects=0;redirects<4;redirects++){
    const response=await fetch(url,{redirect:'manual',headers:{'User-Agent':'RacepointLocalPrototype/1.0','Accept':'text/html'},signal:AbortSignal.timeout(18000)});
    if(response.status>=300&&response.status<400){url=sourceUrl(new URL(response.headers.get('location'),url).href);if(!url)throw new Error('Weiterleitung außerhalb der freigegebenen Herstellerseiten.');continue;}
    if(!response.ok)throw new Error('Herstellerseite momentan nicht lesbar (HTTP '+response.status+').');
    if(!/text\/html|application\/xhtml/.test(response.headers.get('content-type')||''))throw new Error('Keine HTML-Produktseite.');
    const reader=response.body.getReader();const chunks=[];let size=0;
    while(true){const {done,value:chunk}=await reader.read();if(done)break;size+=chunk.byteLength;if(size>5_000_000){await reader.cancel();throw new Error('Herstellerseite zu groß.');}chunks.push(chunk);}
    return parsePage(Buffer.concat(chunks).toString('utf8'),url);
  }
  throw new Error('Zu viele Weiterleitungen.');
}
