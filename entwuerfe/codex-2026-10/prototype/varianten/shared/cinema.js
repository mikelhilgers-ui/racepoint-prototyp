// Official IFrame API: https://developers.google.com/youtube/iframe_api_reference
const stage=document.querySelector('.teaser-stage'),hero=document.querySelector('.hero,.page-hero');
const button=document.getElementById('video-toggle'),icon=document.getElementById('video-icon'),label=document.getElementById('video-label');
const local=document.getElementById('teaser-local'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
let player=null,ready=false,playing=false,userPaused=reduced.matches,inView=true,failed=false;
const dialog=document.getElementById('video-dialog');
const shouldPlay=()=>!userPaused&&inView&&!document.hidden&&!dialog?.open;
function state(value){playing=value;icon.textContent=value?'Ⅱ':'▶';label.textContent=failed?'Film öffnen':value?'Pause':'Video starten';button.setAttribute('aria-label',failed?'Originalfilm auf YouTube öffnen':value?'Hintergrundvideo pausieren':'Hintergrundvideo abspielen');if(value)stage.classList.add('is-ready');}
function sync(){
  if(!ready)return;
  if(local){if(shouldPlay())local.play().catch(()=>state(false));else local.pause();}
  else if(player){if(shouldPlay()){player.mute();player.playVideo();}else player.pauseVideo();}
}
function fail(){failed=true;stage.classList.remove('is-ready');state(false);}
button.addEventListener('click',()=>{
  if(failed&&stage.dataset.teaserId){window.open('https://www.youtube.com/watch?v='+stage.dataset.teaserId,'_blank','noopener');return;}
  userPaused=playing;sync();
});
new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;document.body.classList.toggle('cinema-intro',inView);sync();},{threshold:0}).observe(hero);
document.addEventListener('visibilitychange',sync);
if(dialog)new MutationObserver(sync).observe(dialog,{attributes:true,attributeFilter:['open']});
reduced.addEventListener('change',()=>{if(reduced.matches)userPaused=true;sync();});
state(false);
if(local){
  ready=true;local.muted=true;
  const sound=document.createElement('button');sound.type='button';sound.className='teaser-sound';sound.textContent='Ton an';sound.setAttribute('aria-label','Hintergrundvideo mit Ton abspielen');sound.setAttribute('aria-pressed','false');button.after(sound);
  sound.addEventListener('click',()=>{local.muted=!local.muted;sound.textContent=local.muted?'Ton an':'Ton aus';sound.setAttribute('aria-pressed',String(!local.muted));sound.setAttribute('aria-label',local.muted?'Hintergrundvideo mit Ton abspielen':'Hintergrundvideo stummschalten');});
  local.addEventListener('playing',()=>state(true));local.addEventListener('pause',()=>state(false));local.addEventListener('error',fail);sync();
  if(!local.paused&&local.readyState>=2)state(true);
}else{
  const id=stage.dataset.teaserId;
  const iframe=document.createElement('iframe');iframe.id='teaser-player';iframe.title=stage.dataset.teaserTitle+' · stummer Hintergrundfilm';iframe.tabIndex=-1;iframe.setAttribute('aria-hidden','true');iframe.allow='autoplay; encrypted-media';iframe.referrerPolicy='strict-origin-when-cross-origin';
  const params=new URLSearchParams({enablejsapi:'1',origin:location.origin,playsinline:'1',controls:'0',fs:'0',disablekb:'1',rel:'0',loop:'1',playlist:id,start:'12',end:'52'});
  iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?'+params;
  document.getElementById('teaser-player').replaceWith(iframe);
  new ResizeObserver(()=>{const w=Math.max(stage.clientWidth,stage.clientHeight*16/9),h=Math.max(stage.clientHeight,stage.clientWidth*9/16);iframe.style.width=w+'px';iframe.style.height=h+'px';}).observe(stage);
  const timeout=setTimeout(fail,18000);
  function connect(){
    player=new YT.Player(iframe,{events:{
      onReady:()=>{clearTimeout(timeout);ready=true;failed=false;player.mute();sync();},
      onStateChange:event=>{state(event.data===YT.PlayerState.PLAYING);if(event.data===YT.PlayerState.ENDED&&shouldPlay()){player.mute();player.loadVideoById({videoId:id,startSeconds:12,endSeconds:52});}},
      onAutoplayBlocked:()=>state(false),onError:()=>{clearTimeout(timeout);fail();}
    }});
  }
  if(window.YT?.Player)connect();else{window.onYouTubeIframeAPIReady=connect;const script=document.createElement('script');script.src='https://www.youtube.com/iframe_api';script.onerror=()=>{clearTimeout(timeout);fail();};document.head.append(script);}
}
