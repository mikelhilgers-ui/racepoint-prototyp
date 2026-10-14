import { readEvents } from '../prototype/kombi/stream.mjs';

// Preserve full provider content for tool continuations; only text goes to the UI.
export async function readAnthropicStream(response,{onText=()=>{},onProgress=()=>{}}={}){
  const content=[],inputs=new Map();let stop_reason=null,complete=false;
  for await(const {data}of readEvents(response.body)){
    if(data.type==='error')throw new Error('Die Verbindung zum KI-Anbieter wurde unterbrochen. Bitte versuche es erneut.');
    if(data.type==='content_block_start'){
      const block=structuredClone(data.content_block);content[data.index]=block;
      if(block.type==='tool_use'||block.type==='server_tool_use')inputs.set(data.index,'');
      if(block.type==='server_tool_use'&&block.name==='web_search')onProgress('Ich durchsuche die offiziellen Herstellerseiten …');
    }else if(data.type==='content_block_delta'){
      const block=content[data.index],delta=data.delta;if(!block)continue;
      if(delta.type==='text_delta'){
        block.text=(block.text||'')+delta.text;
        onText(content.filter(b=>b?.type==='text').map(b=>b.text).join('\n\n'));
      }else if(delta.type==='input_json_delta')inputs.set(data.index,(inputs.get(data.index)||'')+delta.partial_json);
      else if(delta.type==='citations_delta')(block.citations??=[]).push(delta.citation);
      else if(delta.type==='thinking_delta')block.thinking=(block.thinking||'')+delta.thinking;
      else if(delta.type==='signature_delta')block.signature=delta.signature;
    }else if(data.type==='content_block_stop'){
      const input=inputs.get(data.index);if(input)content[data.index].input=JSON.parse(input);
    }else if(data.type==='message_delta')stop_reason=data.delta.stop_reason??stop_reason;
    else if(data.type==='message_stop'){complete=true;break;}
  }
  if(!complete)throw new Error('Die KI-Antwort wurde unterbrochen. Bitte versuche es erneut.');
  return {content,stop_reason};
}
