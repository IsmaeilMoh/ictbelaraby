/* ICT بالعربي 7.0: expose existing More hub in unified desktop headers only. */
(()=>{'use strict';
 const label='الأدوات';
 const directory=new URL('tools.html',document.currentScript.src).href;
 const icon='<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
 function mount(){
  const header=document.querySelector('#ict-one-header,header.header');
  if(!header)return;
  const actions=header.querySelector('.header-actions');
  if(!actions)return;
  const anchors=Array.from(header.querySelectorAll('.ict-desktop-more'));
  if(anchors.length>1)anchors.slice(1).forEach(a=>a.remove());
  const a=anchors[0]||document.createElement('a');
  a.className='ict-desktop-more';
  a.href=directory;
  a.setAttribute('aria-label','الأدوات — دليل أقسام الموقع');a.title='الأدوات';
  a.innerHTML=icon+'<span>'+label+'</span>';
  if(!a.isConnected)actions.prepend(a);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
 window.addEventListener('load',mount,{once:true});
 // Site shell can reconstruct its header after load; one scheduled check is sufficient.
 setTimeout(mount,450);
})();
