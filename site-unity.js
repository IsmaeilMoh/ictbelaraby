/* ICT بالعربي 6.8.31 — unified header/navigation; theme delegated to ICTTheme. */
(()=>{'use strict';
const page=location.pathname.split('/').pop()||'index.html';
/* All public pages currently live in the project root. */
const base='./';
const theme=window.ICTTheme;
function syncTheme(){if(theme)theme.apply()}
function icon(name,box=false){const inner=(window.ICTSharedIcons&&window.ICTSharedIcons.makeIcon(name))||document.createElement('span');if(box){const outer=document.createElement('span');outer.className='uii-iconbox';outer.append(inner);return outer}return inner;}
const nav=[['home','الرئيسية','#home'],['markets','الأسواق','#markets'],['news','الأخبار','#news'],['recs','التوصيات','#recs'],['agenda','الأجندة','#agenda'],['ict','أدوات ICT','#ict'],['links','تابعنا','#links']];
function link(key,label,path,cls){const a=document.createElement('a');a.href=path;a.dataset.page=key;if(cls)a.className=cls;a.append(icon(key),document.createTextNode(label));return a;}
function makeHeader(){const existing=document.querySelector('body > header');if(!existing||page==='index.html')return;
 const h=document.createElement('header');h.className='ict-unity-header';h.setAttribute('aria-label','ترويسة ICT بالعربي');
 const w=document.createElement('div');w.className='ict-unity-header-inner';
 const logo=document.createElement('a');logo.className='ict-unity-brand';logo.href=base+'#home';logo.setAttribute('aria-label','ICT بالعربي - الرئيسية');
 const img=document.createElement('img');img.src=base+'logo-original.jpeg';img.alt='شعار ICT بالعربي';img.width=46;img.height=46;
 const st=document.createElement('span');const title=document.createElement('b');title.textContent='ICT بالعربي';const subtitle=document.createElement('small');subtitle.textContent='مساحة المتداول العربي';st.append(title,subtitle);logo.append(img,st);
 const menu=document.createElement('nav');menu.className='ict-unity-nav';menu.setAttribute('aria-label','القائمة الرئيسية');
 nav.forEach(([key,label,path])=>menu.append(link(key,label,base+path)));
 const actions=document.createElement('div');actions.className='ict-unity-actions';
 const btn=document.createElement('button');btn.type='button';btn.className='ict-unity-theme';btn.title='تغيير المظهر';btn.append(icon('theme'));const txt=document.createElement('span');txt.className='ict-unity-theme-text';btn.append(txt);
 btn.addEventListener('click',()=>{if(theme)theme.cycle();});actions.append(btn);
 w.append(logo,menu,actions);h.append(w);existing.replaceWith(h);
 // Legacy standalone theme control would otherwise appear as a second switch.
 const legacy=document.getElementById('ict68-theme-control');if(legacy)legacy.remove();
 syncTheme();
}
const quick=[['home','الرئيسية','#home'],['markets','الأسواق','#markets'],['agenda','الأجندة','#agenda'],['recs','التوصيات','#recs']];
function makeDock(){
 if(page==='index.html'||page==='admin.html')return;
 // Never retain two mobile navigation owners; this is the original 6.9.19 dock.
 document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim,.ict-unity-dock,.ict-unity-sheet,.ict-unity-dim').forEach(n=>n.remove());
 document.body.classList.remove('ict65-has-dock');
 const dock=document.createElement('nav');dock.className='ict-unity-dock';dock.setAttribute('aria-label','التنقل السريع');
 quick.forEach(([key,label,path])=>{
  const a=document.createElement('a');a.href=base+path;a.dataset.page=key;a.append(icon(key,true));const sp=document.createElement('span');sp.textContent=label;a.append(sp);dock.append(a);
 });
 const more=document.createElement('button');more.type='button';more.setAttribute('aria-expanded','false');more.setAttribute('aria-label','فتح قائمة المزيد');more.setAttribute('aria-controls','ict-unity-sheet');more.append(icon('more',true));const t=document.createElement('span');t.textContent='المزيد';more.append(t);dock.append(more);
 const overlay=document.createElement('div');overlay.className='ict-unity-dim';overlay.hidden=true;overlay.setAttribute('aria-hidden','true');
 const sheet=document.createElement('section');sheet.id='ict-unity-sheet';sheet.className='ict-unity-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-label','جميع أقسام الموقع');sheet.setAttribute('aria-modal','true');sheet.setAttribute('tabindex','-1');
 const close=document.createElement('button');close.type='button';close.className='ict-unity-close';close.setAttribute('aria-label','إغلاق قائمة المزيد');close.textContent='إغلاق';
 const h=document.createElement('strong');h.textContent='جميع الأقسام';sheet.append(h,close);
 const links=document.createElement('div');links.className='ict-unity-sheet-links';
 const extras=[...nav,['workspace','مساحتي','workspace.html'],['intelligence','مختبر ذكاء الأسواق','intelligence.html'],['research','مختبر الأبحاث','research.html'],['smartdesk','غرفة المتداول','smart-desk.html'],['recs','رحلة الصفقة الذكية','workflow.html'],['markets','دليل الأصول','assets.html'],['news','موثوقية البيانات','trust.html'],['markets','تحليلات الجمهور','analytics.html']];
 extras.forEach(([key,label,path])=>links.append(link(key,label,base+path)));
 sheet.append(links);document.body.append(overlay,sheet,dock);
 let opened=false;let returnFocus=more;
 function show(v){
  if(v===opened)return;
  opened=v;if(v)returnFocus=document.activeElement;
  sheet.hidden=!v;overlay.hidden=!v;
  more.setAttribute('aria-expanded',String(v));more.setAttribute('aria-label',v?'إغلاق قائمة المزيد':'فتح قائمة المزيد');
  document.body.classList.toggle('ict-unity-more-open',v);
  if(v)close.focus();else (returnFocus?.isConnected?returnFocus:more).focus();
 }
 more.addEventListener('click',e=>{e.preventDefault();show(!opened)});
 close.addEventListener('click',()=>show(false));overlay.addEventListener('click',()=>show(false));
 sheet.addEventListener('click',e=>{if(e.target.closest('a[href]'))show(false)});
 document.addEventListener('keydown',e=>{
  if(!opened)return;
  if(e.key==='Escape'){e.preventDefault();show(false);return}
  if(e.key!=='Tab')return;
  const focusable=[...sheet.querySelectorAll('button:not([disabled]),a[href]')];
  if(!focusable.length)return;
  if(e.shiftKey&&document.activeElement===focusable[0]){e.preventDefault();focusable.at(-1).focus()}
  else if(!e.shiftKey&&document.activeElement===focusable.at(-1)){e.preventDefault();focusable[0].focus()}
 });
 // Keep links on the original 6.9.19 page destinations; never register a second dock.
 document.body.dataset.ictNavOwner='unity';
}
function init(){if(page==='index.html'||page==='admin.html')return;document.body.dataset.ictNavOwner='unity';makeHeader();makeDock();syncTheme()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
