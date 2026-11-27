/* Research library UI for ICT 7.0 / 4A. No fabricated cases or signals. */
(function(){'use strict';
function mount(){
 const section=document.getElementById('ict-playbooks-4a');const catalog=window.ICTPlaybooksCatalog;
 if(!section||!catalog)return;
 const query=section.querySelector('#pb-search'),group=section.querySelector('#pb-group'),level=section.querySelector('#pb-level'),list=section.querySelector('#pb-list'),detail=section.querySelector('#pb-detail'),count=section.querySelector('#pb-count'),exportBtn=section.querySelector('#pb-export');
 const models=catalog.list();let selected=models[0].id;
 const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const ul=a=>'<ul>'+a.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul>';
 function renderDetail(){let m=catalog.getById(selected);if(!m){detail.innerHTML='<p>اختر نموذجًا لعرض تفاصيله.</p>';return}
  detail.innerHTML='<h3>'+esc(m.name)+'</h3><div><span class="pb-tag">'+esc(m.group)+'</span><span class="pb-tag">'+esc(m.level)+'</span><span class="pb-tag">توقيت نيويورك</span></div><p>'+esc(m.description)+'</p><p class="pb-muted"><b>الأسواق:</b> '+esc(m.markets.join('، '))+' | <b>الأطر:</b> '+esc(m.timeframe)+'</p><p class="pb-muted"><b>الجلسة:</b> '+esc(m.session)+'</p><h4>شروط البدء</h4>'+ul(m.prerequisites)+'<h4>تسلسل الأحداث الملزم</h4><ol class="pb-steps">'+m.ordered.map(s=>'<li><strong>'+esc(s.code)+'</strong> — '+esc(s.text)+'</li>').join('')+'</ol><h4>شروط التأكيد</h4>'+ul(m.confirmation)+'<h4>شروط الإبطال أو انتهاء الصلاحية</h4>'+ul(m.invalid)+'<h4>متى نتجنب النموذج؟</h4>'+ul(m.avoid)+'<p><b>المخرج البحثي:</b> '+esc(m.output)+'</p><div class="pb-note">هذه تعريفات تشغيلية تعليمية قابلة للمراجعة، وليست نتائج اختبار تاريخي أو إشارات فورية. اختيار نموذج هنا يفتح شرحه فقط.</div><div class="pb-actions"><button type="button" id="pb-copy">نسخ قواعد النموذج</button><button type="button" id="pb-link">نسخ رابط النموذج</button></div>';
  detail.querySelector('#pb-copy').addEventListener('click',()=>copy([m.name,m.description,'شروط البدء:',...m.prerequisites,'تسلسل الأحداث:',...m.ordered.map(x=>x.code+': '+x.text),'شروط التأكيد:',...m.confirmation,'الإبطال:',...m.invalid].join('\n')));
  detail.querySelector('#pb-link').addEventListener('click',()=>copy(location.origin+location.pathname+'?pb='+encodeURIComponent(m.id)+'#ict-playbooks-4a'));
 }
 function copy(v){if(navigator.clipboard&&window.isSecureContext){navigator.clipboard.writeText(v).then(()=>status('تم النسخ'),()=>fallbackCopy(v));}else fallbackCopy(v)}
 function fallbackCopy(v){const a=document.createElement('textarea');a.value=v;document.body.appendChild(a);a.select();try{document.execCommand('copy');status('تم النسخ')}catch(_){status('تعذّر النسخ؛ استخدم تصدير JSON')}a.remove()}
 function status(v){const e=section.querySelector('#pb-status');e.textContent=v}
 function refresh(){const q=query.value.trim().toLocaleLowerCase('ar');const visible=models.filter(m=>(!group.value||m.group===group.value)&&(!level.value||m.level===level.value)&&(!q||[m.name,m.description,m.group,...m.markets].join(' ').toLocaleLowerCase('ar').includes(q)));
  count.textContent='النماذج المعروضة: '+visible.length+' من '+models.length;
  list.replaceChildren();for(const m of visible){const b=document.createElement('button');b.type='button';b.setAttribute('aria-current',m.id===selected?'true':'false');b.innerHTML='<strong>'+esc(m.name)+'</strong><small>'+esc(m.group)+' · '+esc(m.level)+'</small>';b.addEventListener('click',()=>{selected=m.id;refresh()});list.appendChild(b)}
  if(!visible.length){list.innerHTML='<p class="pb-empty">لا توجد نتائج مطابقة.</p>';detail.innerHTML='<p>غيّر البحث أو المرشحات.</p>'}else{if(!visible.some(m=>m.id===selected))selected=visible[0].id;list.querySelectorAll('button').forEach((b,i)=>b.setAttribute('aria-current',visible[i].id===selected?'true':'false'));renderDetail()}
 }
 const groups=[...new Set(models.map(m=>m.group))];for(const val of groups){const opt=document.createElement('option');opt.value=val;opt.textContent=val;group.appendChild(opt)}
 [query,group,level].forEach(x=>x.addEventListener(x===query?'input':'change',refresh));
 exportBtn.addEventListener('click',()=>{const blob=new Blob([catalog.exportJSON()],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='ICT_Arabic_Playbooks_4A.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);status('تم إعداد ملف تعريفات النماذج')});
 const given=new URLSearchParams(location.search).get('pb')||'';if(catalog.getById(given))selected=given;
 refresh();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
