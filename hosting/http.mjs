import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {resolve,sep,extname} from 'node:path';

const home='/entwuerfe/codex-2026-10/prototype/varianten/';
const mime={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.mp4':'video/mp4','.glb':'model/gltf-binary','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8','.gpx':'application/gpx+xml','.csv':'text/csv; charset=utf-8','.webmanifest':'application/manifest+json; charset=utf-8'};

export function createRacepointServer({root,publicFiles,origin,agentStatus,runAgent,runAppAssistant,maxDailyRequests=100,maxActive=2,maxPerMinute=12,maxAppBytes=2000000}){
  const publicOrigin=new URL(origin),allowed=new Set(publicFiles),requestTimes=[];
  // These counters are shared by the public advisor chat and the app assistant.
  let active=0,day='',daily=0;
  const json=(res,status,data)=>{if(!res.destroyed)res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}).end(JSON.stringify(data));};
  const chat={run:runAgent,maxBytes:35000,forbidden:'Bitte die Beratung auf der Racepoint-Seite öffnen.',busy:'Bitte kurz warten, die Beratung bearbeitet noch Anfragen.',failure:error=>error.name==='AbortError'?'Die Recherche hat zu lange gedauert. Bitte versuche eine gezieltere Frage.':error.status===400?'Bitte beschreibe deinen Bike-Wunsch etwas genauer.':'Die KI-Beratung ist gerade nicht erreichbar. Bitte versuche es gleich noch einmal.'};
  const appAssistant={run:runAppAssistant,maxBytes:maxAppBytes,passUnavailable:true,forbidden:'Bitte den Assistenten in der Racepoint App öffnen.',busy:'Bitte kurz warten, der Assistent bearbeitet noch Anfragen.',failure:error=>error.name==='AbortError'?'Der Assistent hat zu lange gebraucht. Bitte erneut versuchen.':error.status===400?error.message:error.status===503?'Der KI-Assistent ist auf diesem Server nicht eingerichtet.':'Der KI-Assistent ist gerade nicht erreichbar. Bitte gleich noch einmal versuchen.'};
  async function handleAi(req,res,endpoint){
    if(req.method!=='POST'){json(res,405,{error:'POST erforderlich.'});return;}
    if(!endpoint.run){json(res,404,{error:'Nicht verfügbar.'});return;}
    if(req.headers.origin!==publicOrigin.origin||req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:endpoint.forbidden});return;}
    if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON erwartet.'});return;}
    if(Number(req.headers['content-length']||0)>endpoint.maxBytes){json(res,413,{error:'Nachricht zu lang.'});return;}
    const chunks=[];let bytes=0;
    for await(const chunk of req){bytes+=chunk.length;if(bytes>endpoint.maxBytes){json(res,413,{error:'Nachricht zu lang.'});return;}chunks.push(chunk);}
    let input;try{input=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{json(res,400,{error:'Ungültige Anfrage.'});return;}
    if(!input||typeof input!=='object'||Array.isArray(input)){json(res,400,{error:'Ungültige Anfrage.'});return;}
    // Check and reserve together, after the asynchronous body read.
    const now=Date.now(),today=new Date(now).toISOString().slice(0,10);
    if(day!==today){day=today;daily=0;}while(requestTimes.length&&requestTimes[0]<now-60000)requestTimes.shift();
    if(active>=maxActive||requestTimes.length>=maxPerMinute||daily>=maxDailyRequests){json(res,429,{error:daily>=maxDailyRequests?'Das Testkontingent ist heute aufgebraucht. Bitte morgen erneut versuchen.':endpoint.busy});return;}
    active++;daily++;requestTimes.push(now);
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
    res.on('close',()=>{if(!res.writableEnded)controller.abort();});
    const streaming=req.headers.accept?.includes('text/event-stream');let heartbeat;
    const emit=(event,data)=>{
      if(res.destroyed||res.writableEnded)return;
      if(!res.headersSent){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no'});res.flushHeaders();heartbeat=setInterval(()=>{if(!res.destroyed)res.write(': heartbeat\n\n');},15000);}
      res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');
    };
    try{
      const result=await endpoint.run(input,{signal:controller.signal,onProgress:streaming?text=>emit('progress',{text}):undefined,onText:streaming?text=>emit('text',{text}):undefined});
      if(streaming){emit('result',result);res.end();}else json(res,200,result);
    }catch(error){
      const failure={error:endpoint.failure(error)};
      if(res.headersSent){emit('error',failure);res.end();}else json(res,error.status===400?400:endpoint.passUnavailable&&error.status===503?503:502,failure);
    }finally{clearTimeout(timeout);clearInterval(heartbeat);active--;}
  }
  const server=http.createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('X-Robots-Tag','noindex, nofollow');res.setHeader('Referrer-Policy','strict-origin-when-cross-origin');
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/healthz'&&req.method==='GET'){json(res,200,{ok:true});return;}
      if(req.headers.host!==publicOrigin.host){json(res,403,{error:'Unbekannte Adresse.'});return;}
      if(url.pathname==='/api/status'&&req.method==='GET'){json(res,200,agentStatus());return;}
      const endpoint=url.pathname==='/api/chat'?chat:url.pathname==='/api/app-assistant'?appAssistant:null;
      if(endpoint){await handleAi(req,res,endpoint);return;}
      if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
      if(url.pathname==='/'){res.writeHead(302,{Location:home,'Cache-Control':'no-store'}).end();return;}
      let pathname;try{pathname=decodeURIComponent(url.pathname);}catch{res.writeHead(400).end();return;}
      if(pathname.includes('\\')||pathname.includes('\0')||pathname.split('/').some(part=>part.startsWith('.'))){res.writeHead(404).end();return;}
      const fileKey=(pathname.endsWith('/')?pathname+'index.html':pathname).slice(1);
      if(!allowed.has(fileKey)){res.writeHead(404).end();return;}
      const canonicalRoot=await realpath(root),file=await realpath(resolve(canonicalRoot,fileKey));
      if(!file.startsWith(canonicalRoot+sep)){res.writeHead(404).end();return;}
      const info=await stat(file),headers={'Content-Type':mime[extname(file)]||'application/octet-stream','Cache-Control':'no-cache','Accept-Ranges':'bytes'};
      let start=0,end=info.size-1,status=200;
      if(req.headers.range){
        const match=req.headers.range.match(/^bytes=(\d+)-(\d*)$/);
        if(!match){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
        start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;
        if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}
        status=206;headers['Content-Range']=`bytes ${start}-${end}/${info.size}`;
      }
      res.writeHead(status,{...headers,'Content-Length':info.size?end-start+1:0});
      if(req.method==='HEAD'||info.size===0){res.end();return;}
      const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
    }catch{if(!res.headersSent)res.writeHead(404).end();else res.end();}
  });
  server.requestTimeout=15000;server.headersTimeout=10000;server.maxConnections=100;
  return server;
}
