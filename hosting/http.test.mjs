import {test} from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,writeFile,mkdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {once} from 'node:events';
import {createRacepointServer} from './http.mjs';

async function fixture(options={}){
  const root=await mkdtemp(join(tmpdir(),'racepoint-http-'));await mkdir(join(root,'assets'));
  await writeFile(join(root,'assets','movie.mp4'),'0123456789');await writeFile(join(root,'server.mjs'),'private-source');
  const server=createRacepointServer({root,publicFiles:['assets/movie.mp4'],origin:'https://racepoint.example',agentStatus:()=>({ready:true}),runAgent:async()=>({answer:'Hallo'}),...options});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const request=(path,opts={})=>new Promise((resolve,reject)=>{
    const req=http.request({hostname:'127.0.0.1',port:server.address().port,path,method:opts.method||'GET',headers:{host:'racepoint.example',...opts.headers}},res=>{let data='';res.setEncoding('utf8');res.on('data',s=>data+=s);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data}));});req.on('error',reject);req.end(opts.body);
  });
  const post=(body='{}',headers={})=>request('/api/chat',{method:'POST',body,headers:{origin:'https://racepoint.example','content-type':'application/json',...headers}});
  return {request,post,close:()=>new Promise(resolve=>server.close(resolve))};
}
test('Nur öffentliche Dateien; richtige Startseite, Host und Video-Range',async()=>{
  const f=await fixture();try{
    assert.equal((await f.request('/')).headers.location,'/entwuerfe/codex-2026-10/prototype/varianten/');
    for(const path of ['/server.mjs','/.env','/.git/config','/assets/%2e%2e/server.mjs','/public-files.json'])assert.equal((await f.request(path)).status,404,path);
    assert.equal((await f.request('/api/status',{headers:{host:'evil.example'}})).status,403);
    const media=await f.request('/assets/movie.mp4',{headers:{range:'bytes=2-5'}});assert.equal(media.status,206);assert.equal(media.data,'2345');assert.equal(media.headers['content-range'],'bytes 2-5/10');
    assert.equal((await f.request('/assets/movie.mp4',{headers:{range:'bytes=99-'}})).status,416);
  }finally{await f.close();}
});
test('Origin, Content-Type, ungültiges JSON und tatsächliche UTF-8-Bytes begrenzt',async()=>{
  let calls=0;const f=await fixture({runAgent:async()=>{calls++;return{};}});try{
    assert.equal((await f.post('{}',{origin:'https://evil.example'})).status,403);
    assert.equal((await f.post('{}',{'content-type':'text/plain'})).status,415);
    assert.equal((await f.post('{')).status,400);
    assert.equal((await f.post(JSON.stringify({text:'ü'.repeat(18000)}))).status,413);
    assert.equal(calls,0);
  }finally{await f.close();}
});
test('Gleichzeitige Bodies umgehen das Limit nicht; Slot wird wieder freigegeben',async()=>{
  let release,started;const begun=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  const f=await fixture({maxActive:1,runAgent:async()=>{started();await gate;return{answer:'fertig'};}});
  try{const first=f.post();await begun;assert.equal((await f.post()).status,429);release();assert.equal((await first).status,200);assert.equal((await f.post()).status,200);}finally{release();await f.close();}
});
test('SSE transportiert Teilantwort und Ergebnis; Tageslimit greift',async()=>{
  const f=await fixture({maxDailyRequests:1,runAgent:async(_,{onProgress,onText})=>{onProgress?.('Suche');onText?.('Grüße');return{answer:'Grüße'};}});
  try{const result=await f.post('{}',{accept:'text/event-stream'});assert.equal(result.status,200);assert.match(result.data,/event: progress/);assert.match(result.data,/event: text/);assert.match(result.data,/Grüße/);assert.match(result.data,/event: result/);assert.equal((await f.post()).status,429);}finally{await f.close();}
});
test('App-Assistent: gleiche Herkunftsprüfung, größere Bodies, gemeinsames Tageslimit mit dem Chat',async()=>{
  let calls=0;const f=await fixture({maxDailyRequests:2,runAppAssistant:async input=>{calls++;return{content:[{type:'text',text:'Erledigt'}],echo:input.messages.length};}});
  const app=(body,headers={})=>f.request('/api/app-assistant',{method:'POST',body,headers:{origin:'https://racepoint.example','content-type':'application/json',...headers}});
  try{
    assert.equal((await f.request('/api/app-assistant')).status,405);
    assert.equal((await app('{}',{origin:'https://evil.example'})).status,403);
    assert.equal((await app('{}',{'sec-fetch-site':'cross-site'})).status,403);
    assert.equal((await app('{}',{'content-type':'text/plain'})).status,415);
    assert.equal((await app('[1]')).status,400);
    assert.equal(calls,0);
    // Ein verkleinertes Bild passt in den App-Endpunkt, nicht in den Besucher-Chat.
    const big=JSON.stringify({messages:[{role:'user',content:'x'}],pad:'a'.repeat(200000)});
    assert.equal((await f.post(big)).status,413);
    const ok=await app(big);assert.equal(ok.status,200);assert.equal(JSON.parse(ok.data).echo,1);
    assert.equal((await f.post('{}')).status,200);
    const limited=await app(JSON.stringify({messages:[]}));assert.equal(limited.status,429);assert.match(JSON.parse(limited.data).error,/Testkontingent/);
    assert.equal(calls,1);
    assert.equal((await app('x'.repeat(2000001))).status,413);
  }finally{await f.close();}
});
test('App-Assistent: ohne Backend 404, Validierungsfehler als 400 mit Text, fehlender Schlüssel als 503',async()=>{
  const none=await fixture();
  try{assert.equal((await none.request('/api/app-assistant',{method:'POST',body:'{}',headers:{origin:'https://racepoint.example','content-type':'application/json'}})).status,404);}finally{await none.close();}
  const f=await fixture({runAppAssistant:async input=>{throw Object.assign(new Error(input.kind==='bad'?'Ungültiger Verlauf.':'kein Schlüssel'),{status:input.kind==='bad'?400:503});}});
  const app=body=>f.request('/api/app-assistant',{method:'POST',body,headers:{origin:'https://racepoint.example','content-type':'application/json'}});
  try{
    const bad=await app('{"kind":"bad"}');assert.equal(bad.status,400);assert.equal(JSON.parse(bad.data).error,'Ungültiger Verlauf.');
    const off=await app('{"kind":"off"}');assert.equal(off.status,503);assert.doesNotMatch(off.data,/Schlüssel/);
  }finally{await f.close();}
});
test('CSV und Web-Manifest werden mit passendem Typ ausgeliefert',async()=>{
  const root=await mkdtemp(join(tmpdir(),'racepoint-mime-'));await mkdir(join(root,'racepoint-app','data'),{recursive:true});
  await writeFile(join(root,'racepoint-app','data','erp-export.csv'),'# DEMO\nean;bestand\n');await writeFile(join(root,'racepoint-app','manifest.webmanifest'),'{}');
  const server=createRacepointServer({root,publicFiles:['racepoint-app/data/erp-export.csv','racepoint-app/manifest.webmanifest'],origin:'https://racepoint.example',agentStatus:()=>({}),runAgent:async()=>({})});
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const get=path=>new Promise((resolve,reject)=>{http.get({hostname:'127.0.0.1',port:server.address().port,path,headers:{host:'racepoint.example'}},res=>{res.resume();res.on('end',()=>resolve(res.headers['content-type']));}).on('error',reject);});
  try{assert.match(await get('/racepoint-app/data/erp-export.csv'),/^text\/csv/);assert.match(await get('/racepoint-app/manifest.webmanifest'),/^application\/manifest\+json/);}finally{await new Promise(r=>server.close(r));}
});
