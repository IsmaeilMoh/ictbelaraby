/* ICT بالعربي 5.4 — shared navigator; no personal data collection or third-party calls. */
(()=>{
'use strict';
const base=new URL('./',document.currentScript.src);
const routes=[
  ['home','الرئيسية','./#home'],
  ['markets','الأسواق','./#markets'],
  ['agenda','الأجندة','./#agenda'],
  ['recs','التوصيات','./#recs'],
  ['more','الأدوات','tools.html']
];
const page=location.pathname.split('/').pop()||'index.html';
if(page==='admin.html')return;
const host=document.createElement('nav');host.className='ict54-hub';host.setAttribute('aria-label','التنقل الرئيسي');
const inner=document.createElement('div');inner.className='ict54-hub-inner';
const links=document.createElement('div');links.className='ict54-hub-links';
for(const [key,label,href] of routes){
 const a=document.createElement('a');a.href=new URL(href,base).href;a.dataset.navIcon=key;a.textContent=label;links.append(a);
}
function updateCurrent(){
 const active=new URL(page==='index.html'?'./'+(location.hash||'#home'):page,base).href;
 for(const a of links.querySelectorAll('a')){
  if(a.href===active)a.setAttribute('aria-current','page');
  else a.removeAttribute('aria-current');
 }
}
updateCurrent();
window.addEventListener('hashchange',updateCurrent);
inner.append(links);
const status=document.createElement('span');status.className='ict54-current';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
function updateStatus(){status.replaceChildren();const dot=document.createElement('span');dot.className='ict54-dot'+(navigator.onLine?'':' offline');dot.setAttribute('aria-hidden','true');status.append(dot,document.createTextNode(navigator.onLine?'متصل':'دون اتصال'))}
updateStatus();window.addEventListener('online',updateStatus);window.addEventListener('offline',updateStatus);inner.append(status);host.append(inner);
const header=document.querySelector('header');if(header)header.insertAdjacentElement('afterend',host);else document.body.prepend(host);
})();
