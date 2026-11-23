/* ICT بالعربي 6.9.21 — restore glass identity, single mobile dock and left side drawer. */
(()=>{'use strict';
const page=location.pathname.split('/').pop()||'index.html';
if(page==='agenda.html')return;
const isHome=page==='index.html';
const theme=window.ICTTheme;
const nav=[['الرئيسية','#home','home'],['الأسواق','#markets','markets'],['الأخبار','#news','news'],['التوصيات','#recs','recs'],['الأجندة','#agenda','agenda']];
const sections=[
 ['غرفة المتداول','smart-desk.html','trader'],['مساحتي','workspace.html','workspace'],
 ['مختبر ذكاء الأسواق','intelligence.html','intelligence'],['مختبر الأبحاث','research.html','research'],
 ['رحلة الصفقة','workflow.html','workflow'],['دليل الأصول','assets.html','assets'],
 ['الأكاديمية','#academy','academy'],['حاسبات التداول','#calculators','calculator'],
 ['أدوات ICT','#ict','ict'],['موثوقية البيانات','trust.html','trust'],
 ['تحليلات الجمهور','analytics.html','analytics']
];
function href(path){return path.startsWith('#')?(isHome?path:'./'+path):'./'+path}
function icon(kind){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.9');svg.setAttribute('stroke-linecap','round');svg.setAttribute('stroke-linejoin','round');svg.classList.add('ict-unity-vector');const paths={menu:'M4 7h16 M4 12h16 M4 17h16',close:'M5 5l14 14 M19 5L5 19',theme:'M20 13.2A8.5 8.5 0 0 1 10.8 4 8.5 8.5 0 1 0 20 13.2Z',home:'M3 10 12 3l9 7 M5.5 9v11h13V9 M9 20v-6h6v6',markets:'M4 19V9 M10 19V5 M16 19v-8 M22 19V7',agenda:'M5 5h14v16H5z M8 3v4 M16 3v4 M5 10h14',recs:'M4 19 10 13l4 3 6-9 M15 7h5v5',trader:'M3 7h18 M3 12h18 M3 17h18 M7 5v4 M13 10v4 M18 15v4',workspace:'M4 9 12 3l8 6v12H4z M9 21v-7h6v7',intelligence:'M12 3v3 M12 18v3 M3 12h3 M18 12h3 M5.6 5.6l2 2 M16.4 16.4l2 2 M18.4 5.6l-2 2 M7.6 16.4l-2 2 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8',research:'M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h4',workflow:'M4 6h5 M4 12h5 M4 18h5 M13 6h7 M13 12h7 M13 18h7',assets:'M4 18l5-6 4 3 7-10 M4 21h16',academy:'M2 9l10-5 10 5-10 5z M6 12v6c4 3 8 3 12 0v-6',calculator:'M6 3h12v18H6z M9 8h6 M9 12h1 M14 12h1 M9 17h1 M14 17h1',ict:'M4 18l4-5 3 2 4-8 5 3',trust:'M12 3 20 7v6c0 5-4 7-8 9-4-2-8-4-8-9V7z M9 12l2 2 4-4',analytics:'M4 19V10 M10 19V5 M16 19v-8 M22 19V7',back:'M20 12H4 M10 6l-6 6 6 6'};const p=document.createElementNS('http://www.w3.org/2000/svg','path');p.setAttribute('d',paths[kind]||paths.menu);svg.append(p);return svg}
function makeLink(name,path,kind){const a=document.createElement('a');a.href=href(path);a.append(icon(kind),document.createTextNode(name));if(isHome&&location.hash===path||!isHome&&path===page)a.setAttribute('aria-current','page');return a}
function init(){
 document.body.dataset.ictNavOwner='unity';
 const existing=document.querySelector('body > header');if(!existing)return;
 // The home button must retain its existing event handlers (registered in app.js).
 const header=document.createElement('header');header.className='ict-unity-header';
 const inner=document.createElement('div');inner.className='ict-unity-header-inner';
 const brand=document.createElement('a');brand.className='ict-unity-brand';brand.href=href('#home');brand.setAttribute('aria-label','ICT بالعربي — الرئيسية');
 const img=document.createElement('img');img.src='logo-original.jpeg';img.alt='شعار ICT بالعربي الأصلي';img.width=44;img.height=44;
 const identity=document.createElement('span');const name=document.createElement('b');name.textContent='ICT بالعربي';const slogan=document.createElement('small');slogan.textContent='مساحة المتداول العربي';identity.append(name,slogan);brand.append(img,identity);
 const desktop=document.createElement('nav');desktop.className='ict-unity-nav';desktop.setAttribute('aria-label','الأقسام الرئيسية');nav.forEach(([n,p,k])=>desktop.append(makeLink(n,p,k)));
 const actions=document.createElement('div');actions.className='ict-unity-actions';
 let themeButton;
 if(isHome){themeButton=existing.querySelector('#theme');if(themeButton){themeButton.className='ict-unity-theme';themeButton.textContent='';themeButton.append(icon('theme'));const label=document.createElement('span');label.id='theme-label';label.className='ict-unity-theme-text';label.textContent='تلقائي';themeButton.append(label)}}
 else {themeButton=document.createElement('button');themeButton.type='button';themeButton.className='ict-unity-theme';themeButton.setAttribute('aria-label','تغيير المظهر');themeButton.append(icon('theme'));const label=document.createElement('span');label.className='ict-unity-theme-text';themeButton.append(label);themeButton.addEventListener('click',()=>theme?.cycle())}
 if(themeButton)actions.append(themeButton);
 const install=isHome?existing.querySelector('#install'):null;if(install)actions.append(install);
 const menu=document.createElement('button');menu.type='button';menu.className='ict-unity-menu-trigger';menu.setAttribute('aria-controls','ict-unity-drawer');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','فتح درج الأقسام');menu.append(icon('menu'));const menuLabel=document.createElement('span');menuLabel.textContent='الأقسام';menu.append(menuLabel);actions.append(menu);
 inner.append(brand,desktop,actions);header.append(inner);existing.replaceWith(header);
 document.getElementById('ict68-theme-control')?.remove();theme?.apply();
 // Remove deprecated mobile nav surfaces; home keeps its original bottom bar.
 document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim,.ict-unity-dock,.ict-unity-sheet,.ict-unity-dim,.ict-unity-more').forEach(n=>n.remove());document.body.classList.remove('ict65-has-dock');
 const overlay=document.createElement('div');overlay.className='ict-unity-overlay';overlay.hidden=true;
 const drawer=document.createElement('aside');drawer.id='ict-unity-drawer';drawer.className='ict-unity-drawer';drawer.hidden=true;drawer.setAttribute('role','dialog');drawer.setAttribute('aria-modal','true');drawer.setAttribute('aria-label','درج أقسام الموقع');drawer.setAttribute('tabindex','-1');
 const head=document.createElement('div');head.className='ict-unity-drawer-head';const title=document.createElement('div');title.innerHTML='<strong>أقسام ICT بالعربي</strong><small>انتقل مباشرة إلى القسم الذي تحتاجه</small>';
 const close=document.createElement('button');close.type='button';close.className='ict-unity-drawer-close';close.setAttribute('aria-label','إغلاق درج الأقسام');close.append(icon('close'));head.append(title,close);drawer.append(head);
 const mainLinks=document.createElement('nav');mainLinks.className='ict-unity-drawer-links';mainLinks.setAttribute('aria-label','الصفحات الرئيسية');nav.forEach(([n,p,k])=>mainLinks.append(makeLink(n,p,k)));
 const extraHeading=document.createElement('div');extraHeading.className='ict-unity-drawer-label';extraHeading.textContent='المختبرات والأدوات';
 const extraLinks=document.createElement('nav');extraLinks.className='ict-unity-drawer-links';extraLinks.setAttribute('aria-label','المختبرات والأدوات');sections.forEach(([n,p,k])=>extraLinks.append(makeLink(n,p,k)));
 if(page==='admin.html')extraLinks.append(makeLink('لوحة النشر','admin.html','recs'));
 drawer.append(mainLinks,extraHeading,extraLinks);
 let returnFocus=null;
 let isOpen=false;
 function toggle(open){if(isOpen===open)return;isOpen=open;drawer.hidden=!open;overlay.hidden=!open;menu.setAttribute('aria-expanded',String(open));menu.setAttribute('aria-label',open?'إغلاق درج الأقسام':'فتح درج الأقسام');document.body.classList.toggle('ict-unity-drawer-open',open);if(open){returnFocus=document.activeElement;close.focus()}else{(returnFocus?.isConnected?returnFocus:menu).focus()}}
 menu.addEventListener('click',()=>toggle(!isOpen));close.addEventListener('click',()=>toggle(false));overlay.addEventListener('click',()=>toggle(false));
 drawer.addEventListener('click',event=>{if(event.target.closest('a[href]'))toggle(false)});
 document.addEventListener('keydown',event=>{if(!isOpen)return;if(event.key==='Escape'){event.preventDefault();toggle(false)}if(event.key==='Tab'){const focusable=[...drawer.querySelectorAll('button:not([disabled]),a[href]')];const first=focusable[0],last=focusable.at(-1);if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}}});
 document.body.append(overlay,drawer);
 if(isHome){const more=document.querySelector('.ict-bottom-stack .mobile-bottom a[href="#more"]');if(more){more.addEventListener('click',event=>{if(!window.matchMedia('(max-width:760px)').matches)return;event.preventDefault();toggle(!isOpen)});more.setAttribute('aria-label','فتح درج الأقسام')}}
 else{
 const dock=document.createElement('nav');dock.className='ict-unity-dock';dock.setAttribute('aria-label','التنقل السفلي');
 [['الرئيسية','#home','home'],['الأسواق','#markets','markets'],['الأجندة','#agenda','agenda'],['التوصيات','#recs','recs']].forEach(([n,p,k])=>{const link=makeLink(n,p,k);dock.append(link)});
 const more=document.createElement('button');more.type='button';more.className='ict-unity-dock-more';more.setAttribute('aria-label','فتح درج الأقسام');more.append(icon('menu'),document.createTextNode('المزيد'));more.addEventListener('click',()=>toggle(!isOpen));dock.append(more);document.body.append(dock);
 }
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
