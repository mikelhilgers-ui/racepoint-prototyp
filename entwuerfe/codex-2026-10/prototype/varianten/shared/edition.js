import { initialProfile, recommend, reasons, labels, formatPrice, displayText, makeSummary } from './advisor.mjs';
import { readChatResponse } from './stream.mjs';
import { filmById } from './films.mjs';

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];
const bikes = await fetch(new URL('./catalogue.json',import.meta.url)).then(r=>{if(!r.ok)throw new Error('Katalog nicht erreichbar');return r.json();}).catch(()=>[]);
let profile = initialProfile(), wish = '', selection = new Set(), currentResults = [], agentCards = null;
let conversation=[],busy=false,requestController=null,requestVersion=0,hasRecommendations=false;
const knownBikes=new Map(bikes.map(b=>[b.id,b]));
const allBikes=()=>[...knownBikes.values()];
let activeResults=null;
const fields = {category:$('#profile-category'),budget:$('#profile-budget'),style:$('#profile-style'),brand:$('#profile-brand')};
function node(tag, text, className) { const el=document.createElement(tag); if(text!==undefined)el.textContent=text; if(className)el.className=className; return el; }

// Native dialogs provide Escape, focus containment, and focus restoration.
$$('dialog [data-close]').forEach(button=>button.addEventListener('click',()=>button.closest('dialog').close()));
$$('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();}}));
$('#menu-open').addEventListener('click',()=>{$('#mobile-menu').showModal();$('#menu-open').setAttribute('aria-expanded','true');});
$('#mobile-menu').addEventListener('close',()=>$('#menu-open').setAttribute('aria-expanded','false'));
$$('#mobile-menu a').forEach(a=>a.addEventListener('click',()=>$('#mobile-menu').close()));
const chatDialog=$('#advisor-dialog');
const chatTriggers=$$('[href="#berater"], [data-chat-open], [data-chat-prompt]');
function openChat(){
  if($('#mobile-menu').open)$('#mobile-menu').close();
  if(!chatDialog.open)chatDialog.showModal();
  chatTriggers.forEach(trigger=>trigger.setAttribute('aria-expanded','true'));
  $('#wish').focus({preventScroll:true});
}
chatTriggers.forEach(trigger=>{
  trigger.setAttribute('aria-controls','advisor-dialog');trigger.setAttribute('aria-haspopup','dialog');trigger.setAttribute('aria-expanded','false');
  trigger.addEventListener('click',event=>{event.preventDefault();openChat();if(trigger.dataset.chatPrompt)$('#wish').value=trigger.dataset.chatPrompt;});
});
chatDialog.addEventListener('close',()=>chatTriggers.forEach(trigger=>trigger.setAttribute('aria-expanded','false')));
$('#chat-maximize').addEventListener('click',()=>{const expanded=chatDialog.classList.toggle('is-maximized');$('#chat-maximize').setAttribute('aria-pressed',String(expanded));$('#chat-maximize').setAttribute('aria-label',expanded?'Chat verkleinern':'Chat maximieren');$('#chat-maximize').title=expanded?'Chat verkleinern':'Chat maximieren';$('#maximize-icon').setAttribute('d',expanded?'M8 3v5H3m13-5v5h5M3 16h5v5m13-5h-5v5':'M8 3H3v5m13-5h5v5M3 16v5h5m13-5v5h-5');});
$('#chat-options-open').addEventListener('click',()=>$('#chat-tools-dialog').showModal());
function scrollToMessage(entry){
  if(!chatDialog.open)return;
  const scroller=$('#chat-scroll');
  scroller.scrollTop+=entry.getBoundingClientRect().top-scroller.getBoundingClientRect().top-16;
}

const video=$('#hero-video'), videoButton=$('#video-toggle');
if(video&&videoButton){
function updateVideoButton(){const paused=video.paused;$('#video-icon').textContent=paused?'▶':'Ⅱ';$('#video-label').textContent=paused?'Abspielen':'Pause';videoButton.setAttribute('aria-label','Hintergrundvideo '+(paused?'abspielen':'pausieren'));}
videoButton.addEventListener('click',()=>{if(video.paused)video.play().catch(updateVideoButton);else video.pause();});
video.addEventListener('play',updateVideoButton);video.addEventListener('pause',updateVideoButton);updateVideoButton();
let resumeHero=false;
new IntersectionObserver(entries=>{if(!entries[0].isIntersecting){resumeHero=!video.paused;video.pause();}else if(resumeHero){video.play().catch(()=>{});resumeHero=false;}},{threshold:.1}).observe($('.hero'));
}

function syncFields(){for(const[key,el]of Object.entries(fields))el.value=profile[key]??'';}
function readFields(){for(const[key,el]of Object.entries(fields))profile[key]=key==='budget'?(el.value===''?null:Math.max(0,Number(el.value))):el.value;}
function clearSelection(){selection.clear();$('#comparison').hidden=true;$('#selection-count').textContent='';$$('[data-compare]').forEach(button=>{button.textContent='+ Vergleichen';button.setAttribute('aria-pressed','false');});}
function setBusy(value){busy=value;$('#agent-chat').setAttribute('aria-busy',String(value));$('.send-wish').disabled=value;$$('[data-prompt]').forEach(b=>b.disabled=value);Object.values(fields).forEach(f=>f.disabled=value);$('.send-wish').textContent=value?'…':'↗';$('.send-wish').setAttribute('aria-label',value?'Recherche läuft':'Nachricht senden');}
function appendChat(text,role,sources=[]){
  const entry=node('div',undefined,'chat-message '+role);
  fillChat(entry,text,sources);
  $('#agent-chat').append(entry);scrollToMessage(entry);return entry;
}
function fillChat(entry,text,sources=[]){
  entry.replaceChildren();
  // Plain text rendering keeps provider/user content out of innerHTML.
  for(const paragraph of text.split(/\n\s*\n/)){const p=node('p');paragraph.split(/(\*\*[^*]+\*\*)/g).forEach(part=>p.append(part.startsWith('**')?node('strong',part.slice(2,-2)):document.createTextNode(part)));entry.append(p);}
  if(sources.length){const links=node('div',undefined,'chat-sources');sources.forEach(source=>{const a=node('a',source.title+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener';links.append(a);});entry.append(links);}
}
// Elemente des Agenten (show_widget): Öffnungszeiten, Kontakt, Terminwunsch, Größe, Übergabe, Film. Nur DOM-Knoten, kein innerHTML aus Antworten.
const shopContact={address:'K.-F. Schinkel Straße 5, 4782 Schönberg, Belgien',phone:'+32 80 54 88 98',tel:'+3280548898',email:'info@racepoint.be'};
const shopMail=(subject,body)=>'mailto:'+shopContact.email+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body.slice(0,1800));
function widgetLink(text,href,primary){const a=node('a',text,'chat-widget-btn'+(primary?' primary':''));a.href=href;if(href.startsWith('https:')){a.target='_blank';a.rel='noopener';}return a;}
function widgetNode(w){
  const box=node('div',undefined,'chat-widget');
  if(w.type==='hours'){box.append(node('strong','Öffnungszeiten'));[['Mo, Di, Mi, Fr','13–18 Uhr'],['Samstag','9–14 Uhr'],['Do & So','geschlossen']].forEach(([d,t])=>{const r=node('div',undefined,'chat-widget-row');r.append(node('span',d),node('span',t));box.append(r);});box.append(node('small','Werkstatt arbeitet vormittags.'));}
  else if(w.type==='contact'){box.append(node('strong','Kontakt & Anfahrt'),node('span',shopContact.address));const row=node('div',undefined,'chat-widget-actions');row.append(widgetLink('Route planen','https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('Racepoint, '+shopContact.address),true),widgetLink(shopContact.phone,'tel:'+shopContact.tel),widgetLink(shopContact.email,'mailto:'+shopContact.email));box.append(row);}
  else if(w.type==='appointment'){const kind={beratung:'Beratung',bikefitting:'Bikefitting',werkstatt:'Werkstatt'}[w.kind]||'Beratung';box.append(node('strong','Terminwunsch: '+kind),node('span','Noch nicht gebucht. Schick deinen Wunschtermin per E-Mail oder ruf an, Racepoint bestätigt ihn.'));const row=node('div',undefined,'chat-widget-actions');row.append(widgetLink('E-Mail vorbereiten',shopMail('Terminwunsch: '+kind,'Hallo Racepoint-Team,\n\nich hätte gern einen Termin ('+kind+').\nMein Wunschtermin: \n\nViele Grüße'),true),widgetLink('Anrufen','tel:'+shopContact.tel));box.append(row);}
  else if(w.type==='size'){box.append(node('strong','Rahmengröße · Richtwert'));const input=node('input');input.type='number';input.min='140';input.max='210';input.placeholder='Körpergröße in cm';const out=node('span','Exakt wird es beim Retül-Bikefitting.');input.addEventListener('input',()=>{const h=Number(input.value);if(h<140||h>210){out.textContent='Exakt wird es beim Retül-Bikefitting.';return;}const road=w.category==='rennrad'||w.category==='gravel';const t=road?[[155,'44'],[163,'49'],[170,'52'],[176,'54'],[183,'56'],[190,'58'],[999,'61']]:[[160,'S1'],[170,'S2'],[178,'S3'],[186,'S4'],[194,'S5'],[999,'S6']];out.textContent='Richtwert: '+t.find(x=>h<x[0])[1]+(road?' cm':'')+' · exakt beim Retül-Bikefitting.';});box.append(input,out);}
  else if(w.type==='handoff'){box.append(node('strong','Anliegen für das Racepoint-Team'));const ta=node('textarea');ta.value='Hallo Racepoint-Team,\n\n'+(w.summary||'')+'\n\nBitte meldet euch bei mir.';const mail=widgetLink('E-Mail an Racepoint öffnen','#',true);const sync=()=>{mail.href=shopMail('Anfrage über den Racepoint-Berater',ta.value);};ta.addEventListener('input',sync);sync();const row=node('div',undefined,'chat-widget-actions');row.append(mail);box.append(ta,row,node('small','Gesendet wird erst, wenn du die E-Mail selbst abschickst.'));}
  else if(w.type==='video'&&/^[\w-]{11}$/.test(w.video_id||'')){box.append(node('strong',w.title||'Racepoint-Film'));if(w.subtitle)box.append(node('span',w.subtitle));const row=node('div',undefined,'chat-widget-actions');row.append(widgetLink('Auf YouTube ansehen','https://www.youtube.com/watch?v='+w.video_id,true));box.append(row);}
  else return null;
  return box;
}
function appendWidgets(entry,widgets=[]){widgets.forEach(w=>{const el=widgetNode(w);if(el)entry.append(el);});}
function newResults(){
  // Retain previous cards in their original chronological position.
  activeResults?.querySelectorAll('[id]').forEach(el=>el.removeAttribute('id'));
  const section=node('section',undefined,'recommendations');
  section.innerHTML='<div class="results-heading"><h3 id="results-title">Deine Vorschläge</h3><span id="results-count"></span></div><p class="data-notice">Herstellerpreise, kein Racepoint-Angebot. Bestand und Größe klären wir persönlich.</p><div id="bike-results" class="results-grid"></div><div id="price-chart" class="price-chart" hidden></div>';
  $('#agent-chat').append(section);activeResults=section;return section;
}
async function applyWish(value){
  const text=value.trim();if(busy||!text)return;
  if(conversation.length>=16){appendChat('Starte bitte eine neue Beratung über „Zurücksetzen“, damit das Gespräch übersichtlich bleibt.','assistant');return;}
  readFields();conversation.push({role:'user',content:text});wish=conversation.filter(m=>m.role==='user').map(m=>m.content).join('\n');$('#wish').value='';appendChat(text,'user');setBusy(true);$('.quick-prompts').hidden=true;
  const version=++requestVersion;const controller=new AbortController();requestController=controller;const timeout=setTimeout(()=>controller.abort(),125000);
  let streamedAnswer=null;
  $('#agent-chat').dataset.streaming='false';$('#agent-chat').dataset.progress='Ich schaue, was zu dir passt …';
  $('#advisor-message').textContent='Ich schaue, was zu dir passt …';
  try{
    const response=await fetch('/api/chat',{method:'POST',headers:{'Content-Type':'application/json','Accept':'text/event-stream'},body:JSON.stringify({messages:conversation,profile}),signal:controller.signal});
    const result=await readChatResponse(response,(event,data)=>{
      if(version!==requestVersion)return;
      if(event==='progress'){$('#advisor-message').textContent=data.text;$('#agent-chat').dataset.progress=data.text;}
      if(event==='text'&&data.text){
        $('#agent-chat').dataset.streaming='true';
        if(!streamedAnswer){streamedAnswer=appendChat(data.text,'assistant');streamedAnswer.classList.add('is-streaming');}
        else{
          const scroller=$('#chat-scroll'),follow=scroller.scrollHeight-scroller.scrollTop-scroller.clientHeight<80;
          streamedAnswer.textContent=data.text;
          if(follow)scroller.scrollTop=scroller.scrollHeight;
        }
      }
    });if(version!==requestVersion)return;
    conversation.push({role:'assistant',content:result.text});
    const previousProfile=JSON.stringify(profile);profile={...initialProfile(),...result.profile};syncFields();
    const answer=streamedAnswer||appendChat(result.text,'assistant',result.sources||[]);
    if(streamedAnswer){fillChat(answer,result.text,result.sources||[]);answer.classList.remove('is-streaming');}
    appendWidgets(answer,result.widgets);
    if(result.cards?.length){agentCards=result.cards;result.cards.forEach(b=>knownBikes.set(b.id,b));hasRecommendations=true;newResults();renderResults();}
    else if(previousProfile!==JSON.stringify(profile)){agentCards=[];currentResults=[];hasRecommendations=false;}
    $('.chat-handoff').hidden=false;scrollToMessage(answer);
    $('#advisor-message').textContent=result.cards?.length?'Deine Bike-Vorschläge findest du direkt unter der Antwort.':'Frag gern weiter oder erzähl mir mehr über deine Wünsche.';
  }catch(error){if(version!==requestVersion)return;conversation.pop();streamedAnswer?.remove();appendChat(error.name==='AbortError'?'Die Recherche dauert zu lange. Bitte versuche eine gezieltere Frage.':error.message,'assistant');$('#wish').value=text;$('#advisor-message').textContent='Die KI-Anfrage wurde nicht abgeschlossen. Die manuelle Auswahl bleibt nutzbar.';}
  finally{clearTimeout(timeout);if(version===requestVersion){setBusy(false);requestController=null;$('#agent-chat').dataset.streaming='false';}}
}
fetch('/api/status').then(r=>r.json()).then(s=>{$('#agent-state').textContent=s.ready?'KI aktiv · mit Hersteller-Recherche':'KI nicht verbunden · manuelle Auswahl verfügbar';}).catch(()=>{$('#agent-state').textContent='Statische Vorschau · echte KI-Beratung über den lokalen Server';});
$('#wish-form').addEventListener('submit',event=>{event.preventDefault();if($('#wish').value.trim())applyWish($('#wish').value);});
$('#wish').addEventListener('keydown',event=>{if(event.key==='Enter'&&!event.shiftKey&&!event.isComposing){event.preventDefault();$('#wish-form').requestSubmit();}});
$$('[data-prompt]').forEach(button=>button.addEventListener('click',()=>applyWish(button.dataset.prompt)));
$('#profile-form').addEventListener('submit',event=>event.preventDefault());
$('#profile-form').addEventListener('input',event=>{readFields();if(event.target===fields.category){profile.motor='any';profile.terrain='any';}});
$('#manual-apply').addEventListener('click',()=>{readFields();agentCards=null;hasRecommendations=true;$('#chat-tools-dialog').close();const entry=appendChat('Deine manuelle Auswahl · '+labels.category[profile.category]+(profile.budget!==null?' bis '+formatPrice(profile.budget):''),'assistant');newResults();renderResults();$('.chat-handoff').hidden=false;scrollToMessage(entry);});
$('#profile-reset').addEventListener('click',()=>{requestVersion++;requestController?.abort();setBusy(false);conversation=[];agentCards=null;activeResults=null;currentResults=[];hasRecommendations=false;profile=initialProfile();wish='';$('#wish').value='';$('#agent-chat').replaceChildren();appendChat('Neue Runde! Was soll dein nächstes Bike können?','assistant');syncFields();clearSelection();$('.quick-prompts').hidden=false;$('.chat-handoff').hidden=true;$('.chat-preferences').open=false;$('#advisor-message').textContent='Frag nach Bikes, Ausstattung oder einem Vergleich.';$('#chat-scroll').scrollTop=0;$('#wish').focus({preventScroll:true});});

function renderResults(){
  if(!activeResults)return;
  const result=agentCards?{bikes:agentCards,total:agentCards.length}:recommend(bikes,profile);currentResults=result.bikes;
  $('#results-title').textContent=agentCards?'Deine persönlichen Vorschläge':profile.category==='any'?'Eine erste Inspiration':'Ideen für dich · '+labels.category[profile.category];
  $('#results-count').textContent=result.total?currentResults.length+' von '+result.total+' Modellen':'Kein Modell im kuratierten Katalog';
  const container=$('#bike-results');container.replaceChildren();
  if(!currentResults.length){const empty=node('div',undefined,'empty-results');empty.append(node('h4','Deine Wünsche sind wichtiger als ein Kompromiss.'),node('p','In der kuratierten Auswahl gibt es dazu kein passendes Bike. Bitte den Agenten, die Herstellerseiten zu durchsuchen, oder nimm deine Wünsche mit zu Achim.'));const contact=node('button','Beratung vorbereiten →','text-link');contact.type='button';contact.addEventListener('click',openSummary);empty.append(contact);container.append(empty);$('#price-chart').hidden=true;return;}
  currentResults.forEach(bike=>{
    const card=node('article',undefined,'bike-card');const picture=node('div',undefined,'bike-card-image');
    const img=node('img');img.loading='lazy';img.alt=displayText(bike.name)+' · Herstellerbild';
    const imageLabel=node('span',bike.image?'Herstellerbild':'Kein Produktbild verfügbar');
    if(bike.image)img.src=bike.image;else img.hidden=true;
    img.addEventListener('error',()=>{img.hidden=true;imageLabel.textContent='Produktbild auf der Herstellerseite';},{once:true});picture.append(img,imageLabel);card.append(picture);
    const body=node('div',undefined,'bike-card-body');body.append(node('h4',displayText(bike.name)));
    const price=node('p',bike.price!==null?formatPrice(bike.price):'Preis beim Hersteller prüfen','bike-card-price');price.append(node('small',bike.price!==null?(bike.market==='BE'?'Hersteller · Belgien':'Hersteller · Preisregion siehe Quelle'):'Budgetpassung noch offen'));body.append(price);
    const why=node('ul',undefined,'bike-reasons');(bike.reason?[bike.reason,...(bike.tradeoff?['Zu bedenken: '+bike.tradeoff]:[])]:reasons(bike,profile)).forEach(reason=>why.append(node('li',reason)));body.append(why,node('p',(bike.specs||[]).map(displayText).join(' · '),'bike-specs'));
    const source=node('a','Quelle: Hersteller · Stand '+bike.checkedAt,'product-source');source.href=bike.source;source.target='_blank';source.rel='noopener';body.append(source);
    const actions=node('div',undefined,'bike-card-actions');const compare=node('button',selection.has(bike.id)?'✓ Im Vergleich':'+ Vergleichen');compare.type='button';compare.dataset.compare=bike.id;compare.setAttribute('aria-pressed',String(selection.has(bike.id)));compare.setAttribute('aria-label',displayText(bike.name)+' vergleichen');
    compare.addEventListener('click',()=>{if(selection.has(bike.id))selection.delete(bike.id);else if(selection.size<3)selection.add(bike.id);renderComparison();});actions.append(compare);
    const more=node('button','Merken & beraten ↗');more.type='button';more.addEventListener('click',()=>{selection.add(bike.id);renderResults();renderComparison();openSummary();});actions.append(more);body.append(actions);card.append(body);container.append(card);
  });
  renderPriceChart();
}
function renderPriceChart(){const products=currentResults.filter(b=>typeof b.price==='number'&&b.market==='BE');const chart=$('#price-chart');chart.hidden=products.length<2;if(chart.hidden)return;chart.replaceChildren(node('h4','Herstellerpreise im Vergleich'),node('p','Gleicher Maßstab · Hersteller Belgien · kein Racepoint-Angebot'));const max=Math.max(...products.map(b=>b.price),profile.budget||0);products.forEach(b=>{const row=node('div',undefined,'price-row');const name=node('span',b.name);const track=node('div',undefined,'price-track');const fill=node('span');fill.style.width=(b.price/max*100)+'%';track.append(fill);row.append(name,track,node('strong',formatPrice(b.price)));chart.append(row);});if(profile.budget!==null)chart.append(node('p','Dein maximales Budget: '+formatPrice(profile.budget)));}
function renderComparison(){
  $('#selection-count').textContent=selection.size?'('+selection.size+')':'';
  $$('[data-compare]').forEach(button=>{const checked=selection.has(button.dataset.compare);button.textContent=checked?'✓ Im Vergleich':'+ Vergleichen';button.setAttribute('aria-pressed',String(checked));});
  const selected=allBikes().filter(b=>selection.has(b.id));$('#comparison').hidden=!selected.length;
  const container=$('#compare-content');container.replaceChildren();if(!selected.length)return;
  const scroll=node('div',undefined,'compare-scroll'),table=node('table'),head=node('thead'),hr=node('tr');hr.append(node('th','Kriterium'));
  selected.forEach(b=>{const th=node('th',displayText(b.name));th.scope='col';hr.append(th);});head.append(hr);table.append(head);const body=node('tbody');
  [['Herstellerpreis',b=>b.price===null?'Nicht verifiziert':formatPrice(b.price)+(b.market==='BE'?' · Belgien':' · Region siehe Quelle')],['Richtung',b=>labels.category[b.cat]],['Belegte Ausstattung',b=>(b.specs||[]).map(displayText).join(' · ')||'Siehe Herstellerquelle'],['Dafür interessant',b=>b.reason||reasons(b,profile).join(' · ')],['Kompromiss',b=>b.tradeoff||'Mit Achim persönlich besprechen']].forEach(([label,getValue])=>{const row=node('tr');const title=node('th',label);title.scope='row';row.append(title);selected.forEach(b=>row.append(node('td',getValue(b))));body.append(row);});
  const row=node('tr');row.append(node('th','Auswahl'));selected.forEach(b=>{const td=node('td'),button=node('button','Entfernen');button.type='button';button.setAttribute('aria-label',displayText(b.name)+' aus Vergleich entfernen');button.addEventListener('click',()=>{selection.delete(b.id);renderResults();renderComparison();});td.append(button);row.append(td);});body.append(row);table.append(body);scroll.append(table);container.append(scroll);
}
$('#compare-clear').addEventListener('click',()=>{clearSelection();renderResults();});
function openSummary(){
  readFields();
  const summary=makeSummary(profile,wish,allBikes().filter(b=>selection.has(b.id)),currentResults);
  $('#summary-text').value=summary;$('#summary-mail').href='mailto:info@racepoint.be?subject='+encodeURIComponent('Mein Bike-Briefing für Racepoint')+'&body='+encodeURIComponent(summary);
  $('#copy-status').textContent='Noch keine Anfrage versendet. Herstellerpreise sind keine Racepoint-Angebote.';$('#summary-dialog').showModal();
}
$('#summary-open').addEventListener('click',openSummary);
$('#summary-copy').addEventListener('click',async()=>{try{await navigator.clipboard.writeText($('#summary-text').value);$('#copy-status').textContent='Kopiert. Du kannst dein Briefing jetzt einfügen.';}catch{$('#summary-text').focus();$('#summary-text').select();$('#copy-status').textContent='Der Browser erlaubt kein automatisches Kopieren. Der Text ist markiert: bitte mit Strg+C oder über das Auswahlmenü kopieren.';}});

let resumeAfterFilm=false;
function openVideo(id,title){
  if(!/^[A-Za-z0-9_-]{11}$/.test(id))return;
  resumeAfterFilm=Boolean(video&&!video.paused);if(resumeAfterFilm)video.pause();
  $('#video-dialog').classList.toggle('video-portrait',filmById[id]?.format==='portrait');
  $('#video-title').textContent=title;const content=$('#video-content');content.replaceChildren();const consent=node('div',undefined,'video-consent');
  consent.append(node('p','Dieser Build wird auf YouTube abgespielt. Beim Laden stellt dein Browser eine Verbindung zu YouTube her.'));
  const play=node('button','YouTube-Video laden ▶','button button-red');play.type='button';play.addEventListener('click',()=>{const iframe=node('iframe');iframe.title=title;iframe.allow='autoplay; encrypted-media; picture-in-picture; fullscreen';iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0';content.replaceChildren(iframe);});
  const external=node('a','Direkt bei YouTube öffnen ↗');external.href='https://www.youtube.com/watch?v='+id;external.target='_blank';external.rel='noopener';consent.append(play,external);content.append(consent);$('#video-dialog').showModal();
}
$$('[data-video]').forEach(button=>button.addEventListener('click',()=>openVideo(button.dataset.video,button.dataset.title)));
$('#video-dialog').addEventListener('close',()=>{$('#video-content').replaceChildren();if(resumeAfterFilm)video.play().catch(()=>{});resumeAfterFilm=false;});

if($('#dreambuild')){
const sceneObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting)){sceneObserver.disconnect();import('./bike-scene.js').then(module=>module.initBikeScene()).catch(()=>{$('#model-status').textContent='3D ist hier nicht verfügbar. Du siehst die Modellvorschau.';$('#dreambuild').classList.add('model-unavailable');$('#build-progress').disabled=true;});}},{rootMargin:'500px'});
sceneObserver.observe($('#dreambuild'));
}
