import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { dirname, resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { agentStatus, runAgent } from '../server/agent.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 8102);
let activeRequests = 0;
const requestTimes = [];
const allowedHosts = new Set(['127.0.0.1:'+port, 'localhost:'+port]);
function json(res,status,value){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(JSON.stringify(value));}
const types = { '.html':'text/html; charset=utf-8', '.css':'text/css', '.js':'text/javascript', '.mjs':'text/javascript', '.svg':'image/svg+xml', '.jpg':'image/jpeg', '.png':'image/png', '.webp':'image/webp', '.mp4':'video/mp4', '.json':'application/json', '.glb':'model/gltf-binary' };
http.createServer(async (req, res) => {
  try {
    if (!allowedHosts.has(req.headers.host)) { res.writeHead(403).end(); return; }
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname === '/api/status' && req.method === 'GET') { json(res,200,agentStatus()); return; }
    if (url.pathname === '/api/chat') {
      if(req.method!=='POST'){json(res,405,{error:'POST erforderlich.'});return;}
      if((req.headers.origin && !['http://127.0.0.1:'+port,'http://localhost:'+port].includes(req.headers.origin)) || req.headers['sec-fetch-site']==='cross-site'){json(res,403,{error:'Nur aus der lokalen Racepoint-Seite möglich.'});return;}
      if(!req.headers['content-type']?.startsWith('application/json')){json(res,415,{error:'JSON erwartet.'});return;}
      const now=Date.now();while(requestTimes.length&&requestTimes[0]<now-60000)requestTimes.shift();
      if(activeRequests>=2||requestTimes.length>=12){json(res,429,{error:'Bitte kurz warten, die Beratung bearbeitet noch Anfragen.'});return;}
      let body='';for await(const chunk of req){body+=chunk.toString();if(body.length>35000){json(res,413,{error:'Nachricht zu lang.'});return;}}
      let input;try{input=JSON.parse(body);}catch{json(res,400,{error:'Ungültige Anfrage.'});return;}
      activeRequests++;requestTimes.push(now);
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),120000);
      res.on('close',()=>{if(!res.writableEnded)controller.abort();});
      const streaming=req.headers.accept?.includes('text/event-stream');
      const emit=(event,data)=>{
        if(res.destroyed||res.writableEnded)return;
        if(!res.headersSent){res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Accel-Buffering':'no'});res.flushHeaders();}
        res.write('event: '+event+'\ndata: '+JSON.stringify(data)+'\n\n');
      };
      try{
        const result=await runAgent(input,{signal:controller.signal,onProgress:streaming?text=>emit('progress',{text}):undefined,onText:streaming?text=>emit('text',{text}):undefined});
        if(streaming){emit('result',result);res.end();}else json(res,200,result);
      }catch(error){
        const failure={error:error.name==='AbortError'?'Die Recherche hat zu lange gedauert. Bitte versuche eine gezieltere Frage.':error.message==='fetch failed'?'Die Verbindung zum KI-Anbieter ist momentan nicht verfügbar.':error.message};
        if(res.headersSent){emit('error',failure);res.end();}else if(!res.destroyed)json(res,error.status||502,failure);
      }finally{clearTimeout(timeout);activeRequests--;}
      return;
    }
    if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
    let path = resolve(root, '.' + decodeURIComponent(url.pathname));
    if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    if ((await stat(path)).isDirectory()) path = resolve(path, 'index.html');
    const data = await readFile(path);
    const headers = { 'Content-Type': types[extname(path)] || 'application/octet-stream', 'Cache-Control':'no-cache' };
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range) {
      const start = Number(range[1]), end = range[2] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (start > end || start >= data.length) { res.writeHead(416, { 'Content-Range':`bytes */${data.length}` }).end(); return; }
      res.writeHead(206, { ...headers, 'Accept-Ranges':'bytes', 'Content-Range':`bytes ${start}-${end}/${data.length}`, 'Content-Length':end-start+1 });
      res.end(req.method === 'HEAD' ? undefined : data.subarray(start, end+1));
    } else {
      res.writeHead(200, { ...headers, 'Content-Length':data.length, 'Accept-Ranges':'bytes' });
      res.end(req.method === 'HEAD' ? undefined : data);
    }
  } catch { res.writeHead(404).end('Nicht gefunden'); }
}).listen(port, '127.0.0.1', () => console.log(`Racepoint: http://127.0.0.1:${port}/varianten/`));
