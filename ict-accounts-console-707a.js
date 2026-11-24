/* 7A workspace account editor — intentional edits only, legacy data untouched. */
(()=>{'use strict';const api=window.ICTAccounts7A;if(!api)return;
 const host=document.getElementById('ict-accounts-7a');if(!host)return;
 const $=id=>document.getElementById(id),status=$('ict7a-status'),form=$('ict7a-form');
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const money=(v,c)=>new Intl.NumberFormat('en-US',{style:'currency',currency:c||'USD'}).format(v);
 const announce=(t,bad)=>{status.textContent=t;status.style.color=bad?'#f0a3a3':''};
 function toggle(){const funded=form.elements.type.value==='funded';host.querySelectorAll('[data-funded]').forEach(el=>el.hidden=!funded);}
 function render(){const rows=api.list(),current=api.selected();$('ict7a-rows').innerHTML=rows.map(a=>`<div class="ict7a-item"><div><strong>${esc(a.name)}</strong> — ${a.type==='funded'?'ممول':'شخصي'}<small>الرصيد ${money(a.balance,a.currency)} · Equity ${money(a.equity,a.currency)} · حد الصفقة ${a.riskPct}%</small></div><div class="ict7a-actions"><button type="button" data-select="${esc(a.id)}">${current===a.id?'محدد ✓':'اختيار'}</button><button type="button" data-edit="${esc(a.id)}">تعديل</button><button type="button" data-delete="${esc(a.id)}">حذف</button></div></div>`).join('')||'<p>لم تضف حسابات بعد.</p>';
  $('ict7a-count').textContent=`${rows.length} حساب · جميع القيم مدخلة يدويًا`;
 }
 form.addEventListener('change',toggle);toggle();render();
 form.addEventListener('submit',e=>{e.preventDefault();const raw=Object.fromEntries(new FormData(form)),rows=api.list();raw.id=$('ict7a-edit-id').value||undefined;raw.updatedAt=new Date().toISOString();const clean=api.clean(raw);if(!clean){announce('راجع الاسم والرصيد وEquity وحدود المخاطرة؛ القيم غير صالحة.',true);return}
  const i=rows.findIndex(a=>a.id===clean.id);if(i<0){if(rows.length>=60){announce('وصلت للحد الأقصى من الحسابات',true);return}rows.push(clean)}else rows[i]=clean;
  try{api.save(rows);if(!api.selected())api.choose(clean.id);form.reset();$('ict7a-edit-id').value='';toggle();render();announce('تم حفظ الحساب محليًا دون تعديل بيانات حارس الحساب القديم أو الصفقات.')}catch(err){announce('تعذر الحفظ: '+err.message,true)}
 });
 $('ict7a-export').addEventListener('click',()=>{const rows=api.list(),payload=JSON.stringify({schema:'ict-accounts-7a',exportedAt:new Date().toISOString(),accounts:rows},null,2),url=URL.createObjectURL(new Blob([payload],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='ICT-Accounts-7A-Backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);announce(`تم تصدير ${rows.length} حساب إلى ملف محلي`)});
 $('ict7a-import').addEventListener('change',async e=>{const file=e.target.files?.[0];if(!file)return;try{if(file.size>250000)throw Error('الملف كبير جدًا');const data=JSON.parse(await file.text());if(data.schema!=='ict-accounts-7a'||!Array.isArray(data.accounts)||data.accounts.length>60)throw Error('صيغة النسخة غير متوافقة');const imported=data.accounts.map(x=>api.clean(x));if(imported.some(x=>!x))throw Error('النسخة تحتوي حسابًا غير صالح');if(new Set(imported.map(x=>x.id)).size!==imported.length)throw Error('معرّفات حسابات مكررة');const existing=api.list(),ids=new Set(existing.map(x=>x.id));const fresh=imported.filter(x=>!ids.has(x.id));if(!fresh.length){announce('لا توجد حسابات جديدة لإضافتها؛ لم تُستبدل الحسابات الحالية');return}if(existing.length+fresh.length>60)throw Error('سيتجاوز الاستيراد حد الحسابات');if(!confirm(`إضافة ${fresh.length} حساب إلى حساباتك الموجودة دون استبدالها؟`))return;api.save([...existing,...fresh]);render();announce('تمت إضافة الحسابات الجديدة دون تغيير الموجودة')}catch(err){announce('تعذر الاستيراد: '+err.message,true)}finally{e.target.value=''}});
 $('ict7a-rows').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.select||b.dataset.edit||b.dataset.delete;const a=api.list().find(x=>x.id===id);if(!a)return;
  if(b.dataset.select){api.choose(id);render();announce('الحساب النشط: '+a.name);return}
  if(b.dataset.edit){for(const [k,v] of Object.entries(a)){const input=form.elements.namedItem(k);if(input&&v!==null)input.value=v}form.elements.type.value=a.type;$('ict7a-edit-id').value=id;toggle();form.scrollIntoView({behavior:'smooth',block:'nearest'});announce('عدّل الحساب ثم اضغط حفظ الحساب');return}
  if(b.dataset.delete){if(!confirm('حذف الحساب من القائمة؟ ستبقى الصفقات المنسوبة له محفوظة بمعرّف الحساب، لكنها ستظهر كحساب محذوف.'))return;try{api.save(api.list().filter(x=>x.id!==id));if(api.selected()===id)api.choose('');render();announce('حُذف الحساب فقط؛ لم تُحذف أي صفقة.')}catch(err){announce(err.message,true)}}
 });
 $('ict7a-clear').addEventListener('click',()=>{form.reset();$('ict7a-edit-id').value='';toggle();announce('نموذج حساب جديد')});
 $('ict7a-check').addEventListener('click',()=>{const a=api.list().find(x=>x.id===api.selected());if(!a){announce('اختر حسابًا من القائمة أولًا',true);return}const r=api.evaluate(a,$('ict7a-risk-amount').value);announce(r.message+(Number.isFinite(r.perTrade)?` · سقف الصفقة ${money(r.perTrade,a.currency)}`:'')+(Number.isFinite(r.remaining)?` · المساحة التقريبية المتاحة ${money(Math.max(0,r.remaining),a.currency)}`:''),!r.ok)});
 window.addEventListener('ict:accounts-changed',render);
})();
