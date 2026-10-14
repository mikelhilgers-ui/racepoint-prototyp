const hours=document.querySelector('.quick-hours');
if(hours){
  document.addEventListener('click',event=>{if(!hours.contains(event.target))hours.open=false;});
  hours.addEventListener('keydown',event=>{if(event.key==='Escape'){hours.open=false;hours.querySelector('summary').focus();event.preventDefault();}});
}
