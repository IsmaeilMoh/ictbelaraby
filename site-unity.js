/* ICT بالعربي 6.9.20 — a single header/navigation on every site page. */
(()=>{'use strict';
const page=location.pathname.split('/').pop()||'index.html';
if(page==='agenda.html')return;
const base='./', theme=window.ICTTheme;
const nav=[
 ['الرئيسية','#home','home'],['الأسواق','#markets','markets'],['الأخبار','#news','news'],
 ['التوصيات','#recs','recs'],['الأجندة','#agenda','agenda']
];
const extras=[
 ['غرفة المتداول','smart-desk.html','smartdesk'],['مساحتي','workspace.html','workspace'],
 ['مختبر ذكاء الأسواق','intelligence.html','markets'],['مختبر الأبحاث','research.html','research'],
 ['رحلة الصفقة','workflow.html','recs'],['دليل الأصول','assets.html','markets'],
 ['الأكاديمية','#academy','ict'],['حاسبات التداول','#calculators','markets'],
 ['أدوات ICT','#ict','ict'],['موثوقية البيانات','trust.html','news'],
 ['تحليلات الجمهور','analytics.html','news']
];
const isHome=page==='index.html';
const href=(link)=>link.startsWith('#')?(isHome?link:base+link):base+link;
const makeIcon=(name)=>{
 if(window.ICTSharedIcons?.makeIcon)try{return window.ICTSharedIcons.makeIcon(name)}catch(_){/* fallback */}
 const sp=document.createElement('span');sp.textContent=({theme:'◐',more:'☷',home:'⌂',markets:'▥',agenda:'▦',recs:'↗'})[name]||'◈';sp.className='ict-unity-fallback';return sp;
};
function anchor(label,path,iconName){const a=document.createElement('a');a.href=href(path);a.textContent=label;if(iconName)a.prepend(makeIcon(iconName));const active=(isHome&&location.hash===path)||(!isHome&&path===page);if(active)a.setAttribute('aria-current','page');return a}
function makeHeader(){const existing=document.querySelector('body > header');if(!existing)return;
 const header=document.createElement('header');header.className='ict-unity-header';header.setAttribute('aria-label','ترويسة ICT بالعربي');
 const inside=document.createElement('div');inside.className='ict-unity-header-inner';
 const logo=document.createElement('a');logo.className='ict-unity-brand';logo.href=href('#home');logo.setAttribute('aria-label','ICT بالعربي - الرئيسية');
 const img=document.createElement('img');img.src='logo-original.jpeg';img.alt='شعار ICT بالعربي';img.width=44;img.height=44;
 const label=document.createElement('span');const bold=document.createElement('b');bold.textContent='ICT بالعربي';const small=document.createElement('small');small.textContent='مساحة المتداول العربي';label.append(bold,small);logo.append(img,label);
 const links=document.createElement('nav');links.className='ict-unity-nav';links.setAttribute('aria-label','التنقل الرئيسي');
 nav.forEach(([name,path,id])=>{const a=anchor(name,path,id);links.append(a)});
 const more=document.createElement('details');more.className='ict-unity-more';const summary=document.createElement('summary');summary.textContent='كل الأقسام';summary.setAttribute('aria-label','عرض جميع أقسام الموقع');summary.append(makeIcon('more'));more.append(summary);
 const dropdown=document.createElement('div');dropdown.className='ict-unity-more-list';dropdown.setAttribute('aria-label','أقسام ومختبرات الموقع');
 extras.forEach(([name,path,id])=>dropdown.append(anchor(name,path,id)));
 if(page==='admin.html')dropdown.append(anchor('لوحة النشر','admin.html','more'));
 more.append(dropdown);links.append(more);
 const actions=document.createElement('div');actions.className='ict-unity-actions';
 if(isHome){const old=existing.querySelector('#theme');if(old){old.className='ict-unity-theme';old.title='تغيير المظهر';old.textContent='';old.append(makeIcon('theme'));const txt=document.createElement('span');txt.id='theme-label';txt.className='ict-unity-theme-text';txt.textContent='تلقائي';old.append(txt);actions.append(old)}const install=existing.querySelector('#install');if(install)actions.append(install)}
 else{const btn=document.createElement('button');btn.type='button';btn.className='ict-unity-theme';btn.setAttribute('aria-label','تغيير المظهر');btn.append(makeIcon('theme'));const txt=document.createElement('span');txt.className='ict-unity-theme-text';btn.append(txt);btn.addEventListener('click',()=>theme?.cycle());actions.append(btn)}
 inside.append(logo,links,actions);header.append(inside);existing.replaceWith(header);
 document.getElementById('ict68-theme-control')?.remove();theme?.apply();
 document.addEventListener('click',e=>{if(!more.contains(e.target))more.open=false;});
 window.addEventListener('keydown',e=>{if(e.key==='Escape')more.open=false});
}
function makeDock(){if(isHome||page==='admin.html')return;
 document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim,.ict-unity-dock,.ict-unity-sheet,.ict-unity-dim').forEach(node=>node.remove());
 document.body.classList.remove('ict65-has-dock');
 const dock=document.createElement('nav');dock.className='ict-unity-dock';dock.setAttribute('aria-label','التنقل السريع');
 const quick=[['الرئيسية','#home','home'],['الأسواق','#markets','markets'],['الأجندة','#agenda','agenda'],['التوصيات','#recs','recs']];
 quick.forEach(([name,path,id])=>{const a=anchor(name,path,id),box=document.createElement('span');box.className='uii-iconbox';box.append(makeIcon(id));a.textContent='';a.append(box,document.createTextNode(name));dock.append(a)});
 const btn=document.createElement('button');btn.type='button';btn.setAttribute('aria-expanded','false');btn.setAttribute('aria-controls','ict-unity-sheet');const box=document.createElement('span');box.className='uii-iconbox';box.append(makeIcon('more'));btn.append(box,document.createTextNode('المزيد'));dock.append(btn);
 const dim=document.createElement('div');dim.className='ict-unity-dim';dim.hidden=true;
 const sheet=document.createElement('div');sheet.id='ict-unity-sheet';sheet.className='ict-unity-sheet';sheet.hidden=true;sheet.setAttribute('role','dialog');sheet.setAttribute('aria-modal','true');sheet.setAttribute('aria-label','جميع أقسام الموقع');
 const title=document.createElement('strong');title.textContent='جميع الأقسام';const close=document.createElement('button');close.type='button';close.className='ict-unity-close';close.textContent='إغلاق';sheet.append(title,close);
 const list=document.createElement('div');list.className='ict-unity-sheet-links';[...nav,...extras.map(([n,p,i])=>[n,p,i])].forEach(([name,path,id])=>list.append(anchor(name,path,id)));sheet.append(list);
 let previousFocus=null;
 const toggle=v=>{sheet.hidden=!v;dim.hidden=!v;btn.setAttribute('aria-expanded',String(v));if(v){previousFocus=document.activeElement;close.focus()}else(previousFocus?.isConnected?previousFocus:btn).focus()};
 btn.addEventListener('click',()=>toggle(sheet.hidden));close.addEventListener('click',()=>toggle(false));dim.addEventListener('click',()=>toggle(false));
 sheet.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const els=[...sheet.querySelectorAll('a[href],button:not([disabled])')];if(!els.length)return;const first=els[0],last=els[els.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!sheet.hidden)toggle(false)});
 document.body.append(dim,sheet,dock);document.body.dataset.ictNavOwner='unity';
}
function init(){document.body.dataset.ictNavOwner='unity';makeHeader();makeDock()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
