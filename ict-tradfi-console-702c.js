/* ICT بالعربي 7.0 / 2C — opt-in market catalog, no hidden background requests. */
(function(){'use strict';
 const api=window.ICTTradFiDiscovery,feed=window.ICTLiveFeed,root=document.getElementById('ict-tradfi-2c');if(!api||!feed||!root)return;
 const get=id=>document.getElementById(id),group=get('ict-tf-market'),search=get('ict-tf-search'),go=get('ict-tf-discover'),results=get('ict-tf-results'),status=get('ict-tf-status'),meta=get('ict-tf-selection'),symbol=get('ict-live-symbol'),start=get('ict-live-start');
 const catalogs=new Map();let active=null,loading=false;
 function line(text,kind){status.className='ict-live-state'+(kind?' ict-live-'+kind:'');status.textContent=text}
 function options(catalog){results.replaceChildren();const data=api.filter(catalog,search.value);for(const item of data){const opt=document.createElement('option');opt.value=item.symbol;opt.textContent=item.symbol+' • '+(item.underlying||item.title);results.appendChild(opt)}results.disabled=!data.length;get('ict-tf-apply').disabled=!data.length;return data.length}
 function message(item){return `${item.symbol} · ${item.kind} · الأصل المرجعي: ${item.underlying||'غير محدد'} · المصدر: Bybit V5 (linear). ليس سعر CFD/MT5 ولا يُفترض مطابقته لسعر الأصل المرجعي.`}
 async function discover(){if(loading)return;loading=true;go.disabled=true;results.disabled=true;get('ict-tf-apply').disabled=true;active=null;line('جارٍ التحقق من قائمة العقود مباشرة لدى Bybit...','warn');try{
  const cat=await api.discover(group.value,{timeout:12000});active=cat;catalogs.set(group.value,cat);const shown=options(cat);
  line(`عقود مؤكدة: ${cat.items.length} · نتائج البحث الظاهرة: ${shown} · ${cat.pages} صفحة API${cat.truncated?' · القائمة قد تكون غير مكتملة':''}.`,cat.items.length?'ok':'warn');
 }catch(e){line('تعذر التحقق من عقود هذا السوق: '+e.message+'. لم تتم إضافة رموز غير مؤكدة.','bad')}
 finally{loading=false;go.disabled=false}}
 group.addEventListener('change',()=>{active=catalogs.get(group.value)||null;if(active){options(active);line('بيانات قائمة سبق جلبها خلال هذه الجلسة؛ اضغط «تحديث القائمة» للتحقق مجددًا.','warn')}else{results.replaceChildren();results.disabled=true;get('ict-tf-apply').disabled=true;line('اضغط «جلب العقود من Bybit» للتحقق من توفر هذا السوق.') }});
 search.addEventListener('input',()=>{if(active)options(active)});
 go.addEventListener('click',discover);
 get('ict-tf-apply').addEventListener('click',()=>{if(!active||!results.value)return;const item=active.items.find(x=>x.symbol===results.value);if(!item){line('هذا الرمز غير متحقق منه.','bad');return}
  // Avoid switching the active WebSocket feed invisibly: user stops first.
  if(start.disabled){line('أوقف اتصال الشموع الحالي أولًا، ثم اختر العقد الجديد.','warn');return}
  try{feed.registerVerified(item);let opt=[...symbol.options].find(x=>x.value===item.symbol);if(!opt){opt=document.createElement('option');symbol.appendChild(opt)}opt.textContent=item.symbol+' • '+item.group+' (Bybit Perp)';symbol.value=item.symbol;symbol.dispatchEvent(new Event('change',{bubbles:true}));meta.textContent=message(item);line('تم اختيار عقد Bybit الموثق. اضغط «اتصال وجلب الشموع» أعلاه لبدء تحميل بياناته.','ok');
  }catch(e){line('تعذر إضافة العقد: '+e.message,'bad')}
 });
 meta.textContent='لم تختَر عقدًا من أسواق TradFi بعد. ستبقى عقود الكريبتو السابقة متاحة.';
})();
