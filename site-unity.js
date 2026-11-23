/* ICT بالعربي 6.8.31 — unified header/navigation; theme delegated to ICTTheme. */
(()=>{'use strict';
const page=location.pathname.split('/').pop()||'index.html';
/* All public pages currently live in the project root. */
const base='./';
const theme=window.ICTTheme;
function syncTheme(){if(theme)theme.apply()}
function icon(name,box=false){const inner=(window.ICTSharedIcons&&window.ICTSharedIcons.makeIcon(name))||document.createElement('span');if(box){const outer=document.createElement('span');outer.className='uii-iconbox';outer.append(inner);return outer}return inner;}
const nav=[['home','الرئيسية','#home'],['markets','الأسواق','#markets'],['news','الأخبار','#news'],['recs','التوصيات','#recs'],['agenda','الأجندة','#agenda'],['ict','أدوات ICT','#ict'],['links','تابعنا','#links'],['more','المزيد','#more']];
function link(key,label,path,cls){const a=document.createElement('a');a.href=path;a.dataset.page=key;if(cls)a.className=cls;a.append(icon(key),document.createTextNode(label));return a;}
function makeHeader(){if(document.querySelector('body > header[data-ict-single-header="1"]'))return;const existing=document.querySelector('body > header');if(!existing||page==='index.html')return;
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
 // Original bottom navigation, with the same More destination as the homepage.
 document.querySelectorAll('.ict65-dock,.ict65-sheet,.ict65-dim,.ict-unity-dock,.ict-unity-sheet,.ict-unity-dim').forEach(n=>n.remove());
 document.body.classList.remove('ict65-has-dock','ict-unity-more-open');
 const dock=document.createElement('nav');dock.className='ict-unity-dock';dock.setAttribute('aria-label','التنقل السريع');
 quick.forEach(([key,label,path])=>{
  const a=link(key,label,base+path);const original=a.firstChild;if(original){a.removeChild(original);a.prepend(icon(key,true));}
  dock.append(a);
 });
 const more=link('more','المزيد',base+'#more');
 const oldIcon=more.firstChild;if(oldIcon)oldIcon.remove();more.prepend(icon('more',true));
 more.setAttribute('aria-label','المزيد — كل أقسام الموقع');dock.append(more);
 document.body.append(dock);document.body.dataset.ictNavOwner='unity';
}

function init(){if(page==='index.html'||page==='admin.html')return;document.body.dataset.ictNavOwner='unity';makeHeader();makeDock();syncTheme()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
