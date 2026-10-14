// Progressive enhancement: content stays usable without motion or JavaScript.
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const finePointer=matchMedia('(hover: hover) and (pointer: fine)');
const progress=document.createElement('div');progress.className='reading-progress';progress.setAttribute('aria-hidden','true');document.body.append(progress);
const revealElements=[...document.querySelectorAll('main .section-heading, main .points-grid > article, main .page-product, main .film, main .service-card, main .team-photo, main .team-copy, main .advisor-invitation, main .source-card, main .team-story > div, main .contact-grid > article')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-revealed');observer.unobserve(entry.target);}}},{threshold:.08,rootMargin:'0px 0px 35px 0px'});
if(!reduced.matches){
  document.body.classList.add('motion-ready');
  revealElements.forEach((el,index)=>{el.dataset.reveal='';el.style.setProperty('--reveal-delay',`${index%3*65}ms`);observer.observe(el);});
}
const parallax=[...document.querySelectorAll('.hero-video, .page-hero-visual > img, .visit-section > img')];
let frame=0;
function updateScroll(){
  frame=0;const max=document.documentElement.scrollHeight-innerHeight;
  progress.style.transform=`scaleX(${max>0?Math.min(1,Math.max(0,scrollY/max)):0})`;
  if(reduced.matches)return;
  for(const image of parallax){const box=image.parentElement.getBoundingClientRect();if(box.bottom<0||box.top>innerHeight)continue;const shift=Math.max(-28,Math.min(38,-box.top*.07));image.style.transform=`translate3d(0,${shift}px,0) scale(1.09)`;}
}
const scheduleScroll=()=>{if(!frame)frame=requestAnimationFrame(updateScroll);};
addEventListener('scroll',scheduleScroll,{passive:true});addEventListener('resize',scheduleScroll,{passive:true});scheduleScroll();
for(const card of document.querySelectorAll('.ride-card, .page-product-image, .film-image')){
  card.classList.add('motion-card');let pointerFrame=0;
  card.addEventListener('pointermove',event=>{
    if(reduced.matches||!finePointer.matches||event.pointerType==='touch')return;
    if(pointerFrame)cancelAnimationFrame(pointerFrame);
    pointerFrame=requestAnimationFrame(()=>{const box=card.getBoundingClientRect();const x=(event.clientX-box.left)/box.width,y=(event.clientY-box.top)/box.height;card.style.setProperty('--tilt-x',`${(y-.5)*-4}deg`);card.style.setProperty('--tilt-y',`${(x-.5)*4}deg`);card.style.setProperty('--shine-x',`${x*100}%`);card.style.setProperty('--shine-y',`${y*100}%`);});
  },{passive:true});
  card.addEventListener('pointerleave',()=>{cancelAnimationFrame(pointerFrame);card.style.removeProperty('--tilt-x');card.style.removeProperty('--tilt-y');});
}
reduced.addEventListener('change',()=>{
  if(reduced.matches){document.body.classList.remove('motion-ready');observer.disconnect();revealElements.forEach(el=>el.classList.add('is-revealed'));parallax.forEach(el=>el.style.removeProperty('transform'));}
  scheduleScroll();
});
