/* ICT بالعربي 6.9.19.16 — conservative navigation acceleration. No route hijacking. */
(()=>{'use strict';
  const sameOrigin=(link)=>{
    if(!link||link.target&&link.target!=='_self'||link.hasAttribute('download'))return null;
    let u;try{u=new URL(link.href,location.href)}catch{return null}
    if(u.origin!==location.origin||!/^https?:$/.test(u.protocol))return null;
    if(u.pathname===location.pathname)return null;
    if(!/\.html$|\/$/.test(u.pathname))return null;
    return u;
  };
  let warming=null,last='';
  function warm(link){
    const u=sameOrigin(link);if(!u||navigator.connection?.saveData)return;
    const key=u.origin+u.pathname;
    if(key===last||warming)return;
    last=key;
    const prefetch=document.createElement('link');prefetch.rel='prefetch';prefetch.as='document';prefetch.href=u.href;
    prefetch.dataset.ictNavWarm='yes';document.head.appendChild(prefetch);
    warming=prefetch;
    setTimeout(()=>{warming=null;prefetch.remove()},1800);
  }
  document.addEventListener('pointerover',(e)=>{
    if(e.pointerType&&e.pointerType!=='mouse'&&e.pointerType!=='pen')return;
    const a=e.target.closest?.('a[href]');if(a)warm(a);
  },{passive:true});
  document.addEventListener('focusin',e=>{const a=e.target.closest?.('a[href]');if(a)warm(a)});
  document.addEventListener('pointerdown',e=>{
    if(e.button&&e.button!==0)return;
    const a=e.target.closest?.('a[href]');if(!a)return;
    a.classList.add('ict-nav-pressed');
    setTimeout(()=>a.classList.remove('ict-nav-pressed'),230);
    // Never defer, override, or prevent a click: native anchors remain immediate.
  },{passive:true});
})();