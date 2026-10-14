document.querySelectorAll('[data-film-filter]').forEach(button=>button.addEventListener('click',()=>{
  document.querySelectorAll('[data-film-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  document.querySelectorAll('[data-film-category]').forEach(film=>film.hidden=button.dataset.filmFilter!=='all'&&film.dataset.filmCategory!==button.dataset.filmFilter);
}));
const inquiry=document.querySelector('#inquiry-form');
if(inquiry){
  const topic=new URLSearchParams(location.search).get('thema');
  if([...inquiry.elements.topic.options].some(o=>o.value===topic))inquiry.elements.topic.value=topic;
  inquiry.addEventListener('submit',event=>{
    event.preventDefault();const values=new FormData(inquiry);
    const body=['Hallo Achim und Racepoint-Team,','',String(values.get('message')).trim(),'',values.get('name')?'Viele Grüße\n'+String(values.get('name')).trim():''].join('\n');
    const link=document.querySelector('#inquiry-mail');link.href='mailto:info@racepoint.be?subject='+encodeURIComponent('Anfrage: '+values.get('topic'))+'&body='+encodeURIComponent(body);link.hidden=false;
    document.querySelector('#inquiry-status').textContent='Dein Entwurf ist vorbereitet. Öffne ihn in deinem E-Mail-Programm, prüfe ihn und sende ihn dort selbst ab.';
    link.focus();
  });
}
