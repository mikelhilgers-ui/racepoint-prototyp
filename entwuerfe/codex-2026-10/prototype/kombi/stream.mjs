// Decode SSE incrementally, including split UTF-8 characters and CRLF frames.
export async function* readEvents(body){
  const reader=body.getReader(),decoder=new TextDecoder();
  let buffer='',complete=false;
  const parse=frame=>{
    const lines=frame.split(/\r?\n/);
    const data=lines.filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trimStart()).join('\n');
    if(!data)return null;
    return {event:lines.find(line=>line.startsWith('event:'))?.slice(6).trim()||'message',data:JSON.parse(data)};
  };
  try{
    while(true){
      const {done,value}=await reader.read();
      buffer+=decoder.decode(value,{stream:!done});
      let boundary;
      while((boundary=/\r?\n\r?\n/.exec(buffer))){
        const frame=buffer.slice(0,boundary.index);
        buffer=buffer.slice(boundary.index+boundary[0].length);
        const event=parse(frame);if(event)yield event;
      }
      if(buffer.length>2_000_000)throw new Error('Die KI-Antwort ist zu groß.');
      if(done){complete=true;if(buffer.trim()){const event=parse(buffer);if(event)yield event;}break;}
    }
  }finally{if(!complete)await reader.cancel().catch(()=>{});reader.releaseLock();}
}

export async function readChatResponse(response,onEvent=()=>{}){
  if(!response.ok||!response.headers.get('content-type')?.includes('text/event-stream')){
    const result=await response.json();
    if(!response.ok)throw new Error(result.error||'Die Beratung ist momentan nicht erreichbar.');
    return result;
  }
  for await(const {event,data}of readEvents(response.body)){
    if(event==='error')throw new Error(data.error||'Die Beratung wurde unterbrochen.');
    if(event==='result')return data;
    onEvent(event,data);
  }
  throw new Error('Die Verbindung wurde unterbrochen. Bitte versuche es erneut.');
}
