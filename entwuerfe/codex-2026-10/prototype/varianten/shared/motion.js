const reduced=matchMedia('(prefers-reduced-motion: reduce)'),tall=matchMedia('(min-height: 600px)');
const hero=document.querySelector('.hero'),rides=document.querySelector('.ride-section'),grid=rides?.querySelector('.ride-grid');
function wrap(section,className){if(!section)return;const inner=document.createElement('div');inner.className=className;inner.append(...section.childNodes);section.append(inner);return inner;}
const heroInner=wrap(hero,'motion-hero-sticky'),ridesInner=wrap(rides,'motion-rides-sticky');
if(hero){const title=hero.querySelector('h1'),first=title.firstChild;if(first.nodeType===Node.TEXT_NODE){const span=document.createElement('span');span.className='motion-title-first';first.replaceWith(span);span.append(first);}}
let count;
if(rides){const cue=document.createElement('div');cue.className='motion-scroll-note';cue.innerHTML='<span>Weiterscrollen, Neues entdecken</span><b aria-hidden="true">01 / 04</b><a href="#berater">Zur Beratung ↗</a>';cue.querySelector('a').addEventListener('click',event=>{event.preventDefault();event.stopImmediatePropagation();document.querySelector('.advisor-fab')?.click();});rides.querySelector('.section-heading>div').append(cue);count=cue.querySelector('b');}
const meter=document.createElement('div');meter.className='motion-meter';meter.setAttribute('aria-hidden','true');meter.innerHTML='<span></span>';document.body.append(meter);
const reveals=[...document.querySelectorAll('.advisor-intro,.advisor-invitation,.team-copy,.video-section .section-heading,.film,.service-card,.points-grid>article,.page-product,.contact-grid>article')];
const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}}),{threshold:.08});
for(const item of reveals){item.classList.add('motion-reveal');observer.observe(item);}
const photos=[...document.querySelectorAll('.team-photo,.visit-section,.page-hero-visual:not(.page-hero-film)')];
const clamp=(n,min=0,max=1)=>Math.min(max,Math.max(min,n));
const progress=section=>{const r=section.getBoundingClientRect();return clamp(-r.top/Math.max(1,r.height-section.firstElementChild.offsetHeight));};
let frame=0,active=false;
function draw(){
  frame=0;document.documentElement.style.setProperty('--page-progress',clamp(scrollY/Math.max(1,document.documentElement.scrollHeight-innerHeight)));
  if(!active)return;
  if(hero)hero.style.setProperty('--intro',progress(hero).toFixed(4));
  if(rides){const p=progress(rides),travel=Math.max(0,grid.scrollWidth-grid.clientWidth),box=rides.getBoundingClientRect();document.body.classList.toggle('motion-rides-in-view',box.top<innerHeight*.3&&box.bottom>innerHeight*.5);rides.style.setProperty('--ride-x',(p*travel).toFixed(2));count.textContent=String(1+Math.round(p*3)).padStart(2,'0')+' / 04';}
  for(const item of photos){const r=item.getBoundingClientRect();if(r.bottom>0&&r.top<innerHeight)item.style.setProperty('--photo-shift',clamp((innerHeight/2-r.top-r.height/2)*.08,-38,38).toFixed(2));}
}
function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
function configure(){active=!reduced.matches&&tall.matches;document.body.classList.toggle('scroll-cinema',active);if(!active){document.body.classList.remove('motion-rides-in-view');hero?.style.removeProperty('--intro');rides?.style.removeProperty('--ride-x');photos.forEach(p=>p.style.removeProperty('--photo-shift'));}schedule();}
addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});reduced.addEventListener('change',configure);tall.addEventListener('change',configure);
let keyboardFocus=false;addEventListener('keydown',event=>{if(event.key==='Tab')keyboardFocus=true;});addEventListener('pointerdown',()=>{keyboardFocus=false;},{passive:true});
if(grid)grid.addEventListener('focusin',event=>{if(!active||!keyboardFocus)return;const cards=[...grid.children],index=cards.indexOf(event.target.closest('.ride-card'));if(index<0)return;const top=rides.getBoundingClientRect().top+scrollY;scrollTo({top:top+index/(cards.length-1)*(rides.offsetHeight-ridesInner.offsetHeight),behavior:'instant'});});
configure();document.fonts.ready.then(schedule);
