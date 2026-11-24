/* ICT 7.0 — deep links from the eight-phase tools directory. No change without a matching hash. */
(function(){'use strict';
  const tabMap={
    'tab-dna':'dna','ict-performance-7b':'dna','ict-weekly-7c':'dna',
    'tab-assistant':'assistant','tab-live':'live',
    'panel-guardian':'guardian','tab-guardian':'guardian',
    'panel-checklist':'checklist','tab-checklist':'checklist',
    'panel-replay':'replay','panel-strategy':'strategy','panel-patterns':'patterns'
  };
  function openTool(){
    let key;try{key=decodeURIComponent(location.hash.slice(1));}catch(e){return;}
    if(!Object.prototype.hasOwnProperty.call(tabMap,key))return;
    let btn=document.querySelector('button[data-tab="'+tabMap[key]+'"]');
    if(!btn)return;
    if(btn.getAttribute('aria-selected')!=='true'&&!btn.classList.contains('active'))btn.click();
    const dest=document.getElementById(key);
    if(dest){setTimeout(function(){dest.scrollIntoView({block:'start',behavior:'instant'});},160);}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',openTool,{once:true});else openTool();
  window.addEventListener('hashchange',openTool);
})();
