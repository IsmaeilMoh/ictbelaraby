/* ICT بالعربي 6.9.19.11 — one header/footer DOM for internal pages.
   Keeps the existing trading tools, mobile dock and theme controller intact. */
(()=>{'use strict';
 const HOME='./';
 const warning='تنبيه المخاطر: المواد المنشورة تعليمية ومعلوماتية وليست نصيحة استثمارية أو ضمانًا للنتائج. التداول بالرافعة المالية ينطوي على مخاطر عالية وقد تخسر رأس مالك. تحقّق من مصادر البيانات وتوقيتها قبل أي قرار.';
 const escIcon=(name)=>name==='light'?'☀':name==='dark'?'☾':'◐';
 function build(){
  if(document.body.dataset.ictMasterShell==='1')return;
  const original=document.querySelector('body > header');
  if(!original)return;
  const header=document.createElement('header');header.id='ict-master-header';header.className='ict-master-header';header.setAttribute('aria-label','ترويسة ICT بالعربي');
  const wrap=document.createElement('div');wrap.className='ict-master-header-inner';
  const brand=document.createElement('a');brand.className='ict-master-brand';brand.href=HOME+'#home';brand.setAttribute('aria-label','ICT بالعربي — العودة للرئيسية');
  const img=document.createElement('img');img.src=HOME+'logo-original.jpeg';img.width=46;img.height=46;img.alt='شعار ICT بالعربي';
  const caption=document.createElement('span');caption.className='ict-master-brand-text';
  const b=document.createElement('b');b.textContent='ICT بالعربي';const sub=document.createElement('small');sub.textContent='مساحة المتداول العربي';caption.append(b,sub);brand.append(img,caption);
  const switcher=document.createElement('button');switcher.type='button';switcher.className='ict-master-theme';switcher.setAttribute('aria-label','تغيير المظهر');
  const ico=document.createElement('span');ico.className='ict-master-theme-icon';ico.setAttribute('aria-hidden','true');
  const label=document.createElement('span');label.className='ict-master-theme-label';switcher.append(ico,label);
  const renderTheme=()=>{const mode=window.ICTTheme?.chosen?.()||'auto';label.textContent=mode==='light'?'فاتح':mode==='dark'?'داكن':'تلقائي';ico.textContent=escIcon(mode);switcher.title='تغيير المظهر — '+label.textContent};
  switcher.addEventListener('click',()=>{window.ICTTheme?.cycle?.();renderTheme()});
  wrap.append(brand,switcher);header.append(wrap);original.replaceWith(header);
  document.getElementById('ict68-theme-control')?.remove();
  // Remove legacy standalone switches only; no mobile navigation changes.
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
  renderTheme();document.documentElement.addEventListener('ict:themechange',renderTheme);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',build,{once:true});else build();
})();
