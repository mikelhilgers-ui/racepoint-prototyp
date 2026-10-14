// Phones: large display headings shrink just enough that no word is broken mid-word or cut off.
const narrow=matchMedia('(max-width: 640px)');
const fitHeadings=()=>{
  for(const heading of document.querySelectorAll('main h1, main h2, main h3, .visit-section h2')){
    heading.style.removeProperty('font-size');
    if(!narrow.matches||heading.closest('dialog')||!heading.getClientRects().length)continue;
    const base=parseFloat(getComputedStyle(heading).fontSize);if(base<24)continue;
    const words=[];const walker=document.createTreeWalker(heading,NodeFilter.SHOW_TEXT);let node;
    while((node=walker.nextNode())){const pattern=/\S{4,}/g;let match;while((match=pattern.exec(node.data))){const range=document.createRange();range.setStart(node,match.index);range.setEnd(node,match.index+match[0].length);words.push(range);}}
    if(!words.length)continue;
    const box=()=>{const own=heading.getBoundingClientRect();let clip=heading.parentElement;while(clip&&clip!==document.body&&getComputedStyle(clip).overflowX==='visible')clip=clip.parentElement;const limit=clip&&clip!==document.body?clip.getBoundingClientRect():null;if(!limit||own.left<limit.left-1||own.left>=limit.right)return{left:own.left,right:own.right};return{left:Math.max(own.left,limit.left),right:Math.min(own.right,limit.right)};};
    const broken=()=>{const edge=box();return words.some(range=>{const parts=[...range.getClientRects()].filter(rect=>rect.width>0);const all=range.getBoundingClientRect();return parts.length>1||all.right>edge.right+1||all.left<edge.left-1;});};
    let size=base;while(broken()&&size>base*.6){size*=.94;heading.style.fontSize=size.toFixed(1)+'px';}
  }
  // The "BUILT FOR YOU" backdrop word in the 3D section stays whole on narrow screens, whatever font has loaded.
  for(const scene of document.querySelectorAll('.bike-scene')){
    scene.style.removeProperty('--watermark-size');
    if(!narrow.matches||!scene.getClientRects().length)continue;
    const mark=getComputedStyle(scene,'::before');if(!mark.content||mark.content==='none')continue;
    const probe=document.createElement('span');
    Object.assign(probe.style,{position:'absolute',visibility:'hidden',whiteSpace:'nowrap',font:mark.font,fontSize:mark.fontSize,fontWeight:mark.fontWeight,fontFamily:mark.fontFamily,letterSpacing:mark.letterSpacing,textTransform:mark.textTransform});
    probe.textContent=mark.content.replace(/^["']|["']$/g,'');document.body.append(probe);
    const room=Math.min(scene.clientWidth,innerWidth)-28,width=probe.getBoundingClientRect().width;probe.remove();
    if(width>room)scene.style.setProperty('--watermark-size',(parseFloat(mark.fontSize)*room/width).toFixed(1)+'px');
  }
};
let fitFrame=0;const scheduleFit=()=>{cancelAnimationFrame(fitFrame);fitFrame=requestAnimationFrame(fitHeadings);};
scheduleFit();document.fonts?.ready.then(scheduleFit);addEventListener('resize',scheduleFit,{passive:true});narrow.addEventListener('change',scheduleFit);

// Phones: the compact advisor bubble waits until the hero call-to-action has scrolled away, so it never covers it.
const hero=document.querySelector('.hero');
if(hero){
  let heroFrame=0;
  const updateHero=()=>{heroFrame=0;document.body.classList.toggle('hero-cta-in-view',hero.getBoundingClientRect().bottom>innerHeight*.45);};
  const scheduleHero=()=>{if(!heroFrame)heroFrame=requestAnimationFrame(updateHero);};
  addEventListener('scroll',scheduleHero,{passive:true});addEventListener('resize',scheduleHero,{passive:true});updateHero();
}
