/* ICT بالعربي 6.9.19.11 — one header/footer DOM for internal pages.
   Keeps the existing trading tools, mobile dock and theme controller intact. */
(()=>{'use strict';
 const HOME=new URL('./',document.currentScript.src).href;
 const warning='تنبيه المخاطر: المواد المنشورة تعليمية ومعلوماتية وليست نصيحة استثمارية أو ضمانًا للنتائج. التداول بالرافعة المالية ينطوي على مخاطر عالية وقد تخسر رأس مالك. تحقّق من مصادر البيانات وتوقيتها قبل أي قرار.';
 const escIcon=(name)=>name==='light'?'☀':name==='dark'?'☾':'◐';
 function build(){
  if(document.body.dataset.ictMasterShell==='1')return;
  const original=document.querySelector('body > header');
  if(!original)return;
  // Header is supplied once in HTML; never replace it at runtime.
  if(!original.matches('[data-ict-single-header="1"]'))return;
  document.getElementById('ict68-theme-control')?.remove();
  const oldFooters=[...document.querySelectorAll('body > footer')];
  const footer=document.createElement('footer');footer.id='ict-master-footer';footer.className='ict-master-footer';footer.setAttribute('aria-label','تذييل موقع ICT بالعربي');
  const container=document.createElement('div');container.className='ict-master-footer-container';
  const row=document.createElement('div');row.className='ict-master-footer-row';
  const fbrand=document.createElement('a');fbrand.className='ict-master-footer-brand';fbrand.href=HOME+'#home';
  const fimg=document.createElement('img');fimg.src=HOME+'logo-original.jpeg';fimg.alt='';fimg.width=42;fimg.height=42;
  const fb=document.createElement('b');fb.textContent='ICT بالعربي';fbrand.append(fimg,fb);
  const nav=document.createElement('nav');nav.className='ict-master-footer-nav';nav.setAttribute('aria-label','روابط التذييل');
  [['الرئيسية','#home'],['الأسواق','#markets'],['الأجندة','#agenda'],['أدوات ICT','#ict'],['تابعنا','#links']].forEach(([txt,hash])=>{const a=document.createElement('a');a.href=HOME+hash;a.textContent=txt;nav.append(a)});
  row.append(fbrand,nav);
  const disclaimer=document.createElement('div');disclaimer.className='ict-master-footer-disclaimer';disclaimer.textContent=warning;
  const end=document.createElement('div');end.className='ict-master-footer-end';const e1=document.createElement('span');e1.textContent='© ICT بالعربي • الإصدار 3.5';const e2=document.createElement('span');e2.textContent='أخبار الأسواق • التحليلات • التقويم الاقتصادي';end.append(e1,e2);
  container.append(row,disclaimer,end);footer.append(container);
  if(oldFooters.length){oldFooters[0].replaceWith(footer);oldFooters.slice(1).forEach(x=>x.remove())}else document.body.append(footer);
  document.body.dataset.ictMasterShell='1';
  // Theme switch is owned by ict-single-home-header-691912.js.
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
