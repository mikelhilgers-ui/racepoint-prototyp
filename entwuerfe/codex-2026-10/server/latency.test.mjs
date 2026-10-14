import test from 'node:test';
import assert from 'node:assert/strict';
import { readEvents, readChatResponse } from '../prototype/kombi/stream.mjs';
import { readAnthropicStream } from './anthropic-stream.mjs';
import { readManufacturer } from './manufacturers.mjs';

// A test-only credential enables the mocked transport; no external requests occur.
const previousKey=process.env.ANTHROPIC_API_KEY;
process.env.ANTHROPIC_API_KEY='test-only';
const {runAgent,validProfile}=await import('./agent.mjs');
if(previousKey===undefined)delete process.env.ANTHROPIC_API_KEY;else process.env.ANTHROPIC_API_KEY=previousKey;

function sse(events,{split=7,crlf=false}={}){
  const separator=crlf?'\r\n':'\n';
  const bytes=new TextEncoder().encode(events.map(({event='message',data})=>'event: '+event+separator+'data: '+JSON.stringify(data)+separator+separator).join(''));
  return new Response(new ReadableStream({start(controller){for(let i=0;i<bytes.length;i+=split)controller.enqueue(bytes.slice(i,i+split));controller.close();}}),{headers:{'content-type':'text/event-stream'}});
}
function provider(content,stop_reason='end_turn'){
  const events=[];
  content.forEach((block,index)=>{
    if(block.type==='text'){
      events.push({data:{type:'content_block_start',index,content_block:{type:'text',text:''}}});
      for(const text of [block.text.slice(0,5),block.text.slice(5)])events.push({data:{type:'content_block_delta',index,delta:{type:'text_delta',text}}});
    }else if(block.type==='tool_use'){
      events.push({data:{type:'content_block_start',index,content_block:{...block,input:{}}}});
      events.push({data:{type:'content_block_delta',index,delta:{type:'input_json_delta',partial_json:JSON.stringify(block.input)}}});
    }else events.push({data:{type:'content_block_start',index,content_block:block}});
    events.push({data:{type:'content_block_stop',index}});
  });
  events.push({data:{type:'message_delta',delta:{stop_reason}}},{data:{type:'message_stop'}});
  return sse(events);
}
const tool=(name,input,id=name)=>({type:'tool_use',id,name,input});
const input={messages:[{role:'user',content:'Ein Rennrad bis 2000 Euro'}],profile:validProfile()};

test('SSE erhält Umlaute bei einzelnen Bytes, CRLF, Ping und mehreren Frames',async()=>{
  const events=[];
  for await(const event of readEvents(sse([{event:'text',data:{text:'Größe und Hügel 🚲'}},{event:'result',data:{text:'Fertig'}}],{split:1,crlf:true}).body))events.push(event);
  assert.equal(events[0].data.text,'Größe und Hügel 🚲');assert.equal(events[1].event,'result');
});

test('Provider-Stream erhält Werkzeuge, Zitate und fertige Server-Suchergebnisse',async()=>{
  const citation={type:'web_search_result_location',url:'https://www.specialized.com/be/nl/',title:'Hersteller',cited_text:'Belegt',encrypted_index:'opaque'};
  const search={type:'web_search_tool_result',tool_use_id:'search1',content:[{type:'web_search_result',url:citation.url,title:citation.title,encrypted_content:'opaque'}]};
  const events=[
    {data:{type:'ping'}},
    {data:{type:'content_block_start',index:0,content_block:{type:'text',text:''}}},
    {data:{type:'content_block_delta',index:0,delta:{type:'text_delta',text:'Für dich'}}},
    {data:{type:'content_block_delta',index:0,delta:{type:'citations_delta',citation}}},
    {data:{type:'content_block_start',index:1,content_block:search}},
    {data:{type:'content_block_start',index:2,content_block:{type:'tool_use',id:'read1',name:'read_manufacturer_page',input:{}}}},
    ...['{"url":"https://www.specialized.com/', 'be/nl/"}'].map(partial_json=>({data:{type:'content_block_delta',index:2,delta:{type:'input_json_delta',partial_json}}})),
    {data:{type:'content_block_stop',index:2}},
    {data:{type:'message_delta',delta:{stop_reason:'tool_use'}}},
    {data:{type:'message_stop'}}
  ];
  const text=[];const answer=await readAnthropicStream(sse(events),{onText:value=>text.push(value)});
  assert.deepEqual(text,['Für dich']);assert.deepEqual(answer.content[0].citations,[citation]);
  assert.deepEqual(answer.content[1],search);assert.equal(answer.content[2].input.url,citation.url);assert.equal(answer.stop_reason,'tool_use');
});

test('Abgebrochene Streams und Fehler nach HTTP 200 sind keine fertigen Antworten',async()=>{
  await assert.rejects(readAnthropicStream(sse([{data:{type:'ping'}}])),/unterbrochen/);
  await assert.rejects(readAnthropicStream(sse([{data:{type:'error',error:{type:'overloaded_error'}}}])),/unterbrochen/);
  await assert.rejects(readChatResponse(sse([{event:'text',data:{text:'Unfertig'}}])),/unterbrochen/);
  await assert.rejects(readChatResponse(sse([{event:'error',data:{error:'Bitte später'}}])),/Bitte später/);
});

test('Browser verarbeitet Fortschritt und Text vor dem Ergebnis, JSON bleibt kompatibel',async()=>{
  const seen=[];const result=await readChatResponse(sse([{event:'progress',data:{text:'Suche'}},{event:'text',data:{text:'Erste Wörter'}},{event:'result',data:{text:'Fertig',cards:[]}}]),(event,data)=>seen.push([event,data.text]));
  assert.deepEqual(seen,[['progress','Suche'],['text','Erste Wörter']]);assert.equal(result.text,'Fertig');
  assert.deepEqual(await readChatResponse(Response.json({text:'JSON'})),{text:'JSON'});
});

test('Hersteller-Cache bündelt Abrufe, isoliert Ergebnisse, erneuert nach Ablauf und auf Wunsch',async t=>{
  let calls=0,now=Date.now();t.mock.method(Date,'now',()=>now);
  t.mock.method(globalThis,'fetch',async()=>{calls++;await new Promise(resolve=>setTimeout(resolve,5));return new Response('<title>Bike '+calls+'</title>',{headers:{'content-type':'text/html'}});});
  const url='https://www.specialized.com/be/nl/cache-test';
  const [a,b]=await Promise.all([readManufacturer(url),readManufacturer(url)]);
  assert.equal(calls,1);a.name='Mutation';assert.notEqual(b.name,a.name);
  await readManufacturer(url);assert.equal(calls,1);
  await readManufacturer(url,{refresh:true});assert.equal(calls,2);
  now+=600001;await readManufacturer(url);assert.equal(calls,3);
});

test('Fehler werden nicht gecacht und Weiterleitungen bleiben eingeschränkt',async t=>{
  let calls=0;t.mock.method(globalThis,'fetch',async()=>{calls++;return calls===1?new Response('',{status:503}):new Response('<title>Wieder da</title>',{headers:{'content-type':'text/html'}});});
  const url='https://www.specialized.com/be/nl/cache-error';
  await assert.rejects(readManufacturer(url),/503/);assert.equal((await readManufacturer(url)).name,'Wieder da');assert.equal(calls,2);
  t.mock.method(globalThis,'fetch',async()=>new Response('',{status:302,headers:{location:'http://127.0.0.1/secret'}}));
  await assert.rejects(readManufacturer('https://www.cervelo.com/de-DE/cache-redirect'),/Weiterleitung außerhalb/);
});

test('Belegte Karten beenden die Runde ohne redundanten dritten Modellaufruf',async t=>{
  let calls=0;const texts=[];
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    assert.equal(url,'https://api.anthropic.com/v1/messages');assert.equal(JSON.parse(options.body).stream,true);calls++;
    if(calls===1)return provider([tool('find_bikes',{profile:validProfile({category:'rennrad',budget:2000})})],'tool_use');
    assert.equal(calls,2);
    return provider([{type:'text',text:'Das Allez passt. Herstellerpreis Belgien, kein Ladenangebot.'},tool('present_recommendations',{items:[{catalog_id:'allez-cues',reason:'Solider Einstieg.',tradeoff:'Einfache Ausstattung.'}]})],'tool_use');
  });
  const result=await runAgent(input,{onText:text=>texts.push(text)});
  assert.equal(calls,2);assert.equal(result.cards[0].id,'allez-cues');assert.ok(texts.length>=2);assert.equal(texts.at(-1),result.text);
});

test('Ungültige Karten werden trotz schneller Abschlussrunde nicht freigegeben',async t=>{
  let calls=0;
  t.mock.method(globalThis,'fetch',async(url,options)=>{
    calls++;
    if(calls===1)return provider([tool('find_bikes',{profile:validProfile({category:'rennrad',budget:1000})})],'tool_use');
    if(calls===2)return provider([{type:'text',text:'Ungeprüfter Vorschlag'},tool('present_recommendations',{items:[{catalog_id:'allez-cues',reason:'Test',tradeoff:'Test'}]})],'tool_use');
    assert.equal(JSON.parse(options.body).messages.at(-1).content[0].is_error,true);
    return provider([{type:'text',text:'Dafür ist kein passendes Modell im Katalog.'}]);
  });
  const result=await runAgent(input);assert.equal(calls,3);assert.deepEqual(result.cards,[]);assert.match(result.text,/kein passendes/);
});

test('Zwei unabhängige Herstellerseiten werden gleichzeitig gelesen',async t=>{
  let modelCalls=0,active=0,peak=0;
  t.mock.method(globalThis,'fetch',async url=>{
    if(url==='https://api.anthropic.com/v1/messages'){
      modelCalls++;if(modelCalls===1)return provider([tool('read_manufacturer_page',{url:'https://www.specialized.com/be/nl/parallel-a'},'a'),tool('read_manufacturer_page',{url:'https://www.cervelo.com/de-DE/parallel-b'},'b')],'tool_use');
      return provider([{type:'text',text:'Beide Quellen gelesen.'}]);
    }
    active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,10));active--;
    return new Response('<title>Hersteller</title>',{headers:{'content-type':'text/html'}});
  });
  const result=await runAgent(input);assert.equal(peak,2);assert.equal(result.sources.length,2);
});
