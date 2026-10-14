import * as THREE from '../../kombi/vendor/three.module.min.js';
import { GLTFLoader } from '../../kombi/vendor/GLTFLoader.js';
import { RoomEnvironment } from '../../kombi/vendor/RoomEnvironment.js';
import { MeshoptDecoder } from '../../kombi/vendor/meshopt_decoder.module.js';

export async function initBikeScene(){
  const section=document.getElementById('dreambuild'),host=document.getElementById('bike-scene');
  const range=document.getElementById('build-progress'),status=document.getElementById('model-status');
  const compact=window.matchMedia('(max-width:540px)'),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let renderer;
  const fail=()=>{status.textContent='Die 3D-Ansicht ist in diesem Browser nicht verfügbar. Hier siehst du das fertige Modell.';section.classList.add('model-unavailable');host.classList.remove('ready');range.disabled=true;range.value=100;document.getElementById('build-percent').textContent='100 %';document.getElementById('build-part').textContent='Das fertige Bike';};
  try {renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});}catch{fail();return;}
  renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact.matches?1.5:1.75));
  renderer.setClearColor(0x000000,0);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.35;
  renderer.domElement.setAttribute('aria-hidden','true');host.append(renderer.domElement);
  renderer.domElement.addEventListener('webglcontextlost',event=>{event.preventDefault();fail();});
  const scene=new THREE.Scene();
  const camera=new THREE.PerspectiveCamera(32,1,.01,100);
  const environment=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(renderer);
  const env=pmrem.fromScene(environment,.04);scene.environment=env.texture;environment.dispose();pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff,0x7b866a,2));
  const key=new THREE.DirectionalLight(0xfff8ed,3);key.position.set(-3,4,5);scene.add(key);
  const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(3,2,-3);scene.add(rim);
  const ground=document.createElement('canvas');ground.width=128;ground.height=128;
  const ctx=ground.getContext('2d');const gradient=ctx.createRadialGradient(64,64,4,64,64,64);gradient.addColorStop(0,'rgba(37,48,23,0.23)');gradient.addColorStop(1,'rgba(37,48,23,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
  const shadow=new THREE.Mesh(new THREE.PlaneGeometry(3.5,1.6),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(ground),transparent:true,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(0,-.07,0);scene.add(shadow);
  let gltf;
  try {gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(new URL('../../kombi/models/CarbonFrameBike.glb',import.meta.url).href,event=>{if(event.total)status.textContent='Dein 3D-Build lädt · '+Math.round(event.loaded/event.total*100)+' %';});}catch(error){renderer.dispose();renderer.domElement.remove();env.dispose();fail();return;}
  const bike=new THREE.Group();bike.add(gltf.scene);scene.add(bike);
  const mixer=new THREE.AnimationMixer(gltf.scene);const clip=gltf.animations.find(a=>a.name==='Holobike_Loop')||gltf.animations[0];
  if(!clip){fail();renderer.dispose();return;}
  const action=mixer.clipAction(clip);action.setLoop(THREE.LoopOnce,1);action.clampWhenFinished=true;action.play();
  // Fit the real animated components, excluding the oversized AR shadow planes.
  const fitParts=[];
  bike.traverse(mesh=>{
    if(!mesh.isMesh||/shadow/i.test(mesh.name))return;
    mesh.geometry.computeBoundingBox();const box=mesh.geometry.boundingBox;
    const local=[];for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])local.push(new THREE.Vector3(x,y,z));
    fitParts.push({mesh,local,world:local.map(()=>new THREE.Vector3())});
  });
  const fitBounds=new THREE.Box3(),fitCenter=new THREE.Vector3(),offset=new THREE.Vector3();
  const mobileDirection=new THREE.Vector3(.85,.21,.49).normalize();
  const mobileRight=new THREE.Vector3().crossVectors(new THREE.Vector3(0,1,0),mobileDirection).normalize();
  const mobileUp=new THREE.Vector3().crossVectors(mobileDirection,mobileRight).normalize();
  function fitMobileCamera(aspect){
    bike.updateMatrixWorld(true);fitBounds.makeEmpty();
    for(const part of fitParts)for(let i=0;i<8;i++)fitBounds.expandByPoint(part.world[i].copy(part.local[i]).applyMatrix4(part.mesh.matrixWorld));
    fitBounds.getCenter(fitCenter);
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const part of fitParts)for(const point of part.world){offset.copy(point).sub(fitCenter);const x=offset.dot(mobileRight),y=offset.dot(mobileUp);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);}
    fitCenter.addScaledVector(mobileRight,(minX+maxX)/2).addScaledVector(mobileUp,(minY+maxY)/2);
    const tanY=Math.tan(THREE.MathUtils.degToRad(16)),tanX=tanY*aspect;
    let distance=0;
    for(const part of fitParts)for(const point of part.world){
      offset.copy(point).sub(fitCenter);const depth=offset.dot(mobileDirection);
      distance=Math.max(distance,depth+Math.abs(offset.dot(mobileRight))/(tanX*.94),depth+Math.abs(offset.dot(mobileUp))/(tanY*.92));
    }
    camera.position.copy(fitCenter).addScaledVector(mobileDirection,distance);camera.lookAt(fitCenter);
  }
  let progress=reduced.matches?1:0,visible=true,frame=0,width=1,height=1,dragging=false;
  function paint(){
    frame=0;if(!visible||document.hidden)return;
    // Original animation: 6.2 s fully exploded, 10 s fully assembled.
    mixer.setTime(6.2+progress*3.8);
    bike.rotation.y=-.09+progress*.22;
    const aspect=width/height;camera.aspect=aspect;
    if(compact.matches){fitMobileCamera(aspect);}
    else{
      const fitWidth=3.65-progress*.85,fitHeight=2.05-progress*.42;
      const distance=Math.max(fitHeight,fitWidth/aspect)/(2*Math.tan(THREE.MathUtils.degToRad(16)));
      camera.position.set(-.20,.73+distance*.13,distance);camera.lookAt(.08,.73,0);
    }
    camera.updateProjectionMatrix();renderer.render(scene,camera);
  }
  function requestPaint(){if(!frame)frame=requestAnimationFrame(paint);}
  function setProgress(value){
    progress=Math.max(0,Math.min(1,value));range.value=Math.round(progress*100);document.getElementById('build-percent').textContent=Math.round(progress*100)+' %';
    const parts=['01 / Die Einzelteile','02 / Alles findet seinen Platz','03 / Präzision bis ins Detail','04 / Bereit für deine nächste Runde'];
    document.getElementById('build-part').textContent=parts[Math.min(3,Math.floor(progress*4))];
    range.setAttribute('aria-valuetext',Math.round(progress*100)+' Prozent zusammengebaut');requestPaint();
  }
  function onScroll(){if(reduced.matches||dragging)return;const rect=section.getBoundingClientRect();const travel=section.offsetHeight-section.querySelector('.build-sticky').offsetHeight;setProgress(travel>0?-rect.top/travel:1);}
  range.addEventListener('pointerdown',()=>{dragging=true;});
  window.addEventListener('pointerup',()=>{dragging=false;},{passive:true});
  window.addEventListener('pointercancel',()=>{dragging=false;},{passive:true});
  range.addEventListener('input',()=>{
    setProgress(Number(range.value)/100);
    // Keep the manual control and scroll position in sync, including after touch.
    if(!reduced.matches){const travel=section.offsetHeight-section.querySelector('.build-sticky').offsetHeight;if(travel>0)window.scrollTo({top:window.scrollY+section.getBoundingClientRect().top+progress*travel,behavior:'instant'});}
  });
  const resize=new ResizeObserver(()=>{width=Math.max(1,host.clientWidth);height=Math.max(1,host.clientHeight);renderer.setPixelRatio(Math.min(window.devicePixelRatio,compact.matches?1.5:1.75));renderer.setSize(width,height,false);onScroll();requestPaint();});resize.observe(host);
  new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;document.body.classList.toggle('build-in-view',visible);if(visible)requestPaint();},{rootMargin:'50px'}).observe(section);
  window.addEventListener('scroll',onScroll,{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)requestPaint();});
  const modeChange=()=>{setProgress(reduced.matches?1:progress);onScroll();};compact.addEventListener('change',modeChange);reduced.addEventListener('change',modeChange);
  host.classList.add('ready');setProgress(progress);onScroll();
}
