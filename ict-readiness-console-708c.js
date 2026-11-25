/* ICT بالعربي 8C — explicit on-demand audit; never promises live/executable quotes. */
(function(){'use strict';const root=document.getElementById('ict-decision-8a'),panel=document.getElementById('dc-readiness-8c');if(!root||!panel)return;
const $=id=>document.getElementById(id),run=$('dc-audit-run'),exp=$('dc-audit-export'),status=$('dc-audit-status'),summary=$('dc-audit-summary'),list=$('dc-audit-list');const core=window.ICTReadiness708C;let report=null,busy=false;
function line(label,detail,level){const e=document.createElement('li');e.className='dc-audit-'+level;const b=document.createElement('strong');b.textContent=(level==='pass'?'✓ ':level==='warn'?'! ':'× ')+label;const s=document.createElement('span');s.textContent=detail;e.append(b,s);list.append(e)}
function create(id,label,ok,detail,level){return core.check(id,label,Boolean(ok),detail,level)}
function localHealth(){try{const k='ict-8c-storage-probe';localStorage.setItem(k,'1');const ok=localStorage.getItem(k)==='1';localStorage.removeItem(k);return ok}catch{return false}}
function modules(){return [['مصدر Bybit',window.ICTLiveFeed],['مصدر الأسواق التقليدية',window.ICTPublicMarkets],['محرك هيكل ICT',window.ICTStructureEngine],['محرك النماذج',window.ICTSignalEngine],['محرك سياق نيويورك',window.ICTContextEngine],['محرك السيناريوهات',window.ICTScenarioEngine],['محرك الأخبار',window.ICTEconomicLink706A],['محرك القرار',window.ICTDecisionEngine708A],['تتبع النتائج',window.ICTOpportunityLifecycle708B]]}
function render(r){list.replaceChildren();r.items.forEach(x=>line(x.label,x.detail,x.level));summary.textContent='نتيجة التدقيق: '+(r.summary.status==='blocked'?'تعذر اجتياز متطلبات فحص أساسية':r.summary.status==='conditional'?'جاهزية بحثية مشروطة':'مكونات الفحص متاحة للبحث')+' · اجتاز '+(r.items.length-r.summary.failed-r.summary.caution)+'/'+r.items.length+' · متطلبات مانعة '+r.summary.failed+' · تحذيرات '+r.summary.caution;status.textContent='وقت التدقيق: نيويورك '+new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(r.at))+' | فلسطين '+new Intl.DateTimeFormat('ar-EG',{timeZone:'Asia/Gaza',dateStyle:'medium',timeStyle:'short'}).format(new Date(r.at));exp.disabled=false}
async function audit(){if(busy||!core)return;busy=true;run.disabled=true;exp.disabled=true;status.textContent='جارٍ تدقيق المحركات ومصادر البيانات الحالية…';const started=Date.now(),checks=[];
 for(const [label,api] of modules())checks.push(create('module-'+label,label,!!api,api?'محمّل داخل الصفحة':'مفقود — تأكد من الملفات أو كاش PWA'));
 checks.push(create('secure','اتصال آمن',window.isSecureContext,'يجب استخدام HTTPS لحماية التخزين وإمكانات PWA'));
 checks.push(create('storage','التخزين المحلي',localHealth(),'الحفظ في هذا المتصفح؛ امتلاء المساحة أو حذف بيانات الموقع قد يزيل السجلات'));
 checks.push(create('online','اتصال الشبكة',navigator.onLine,'يشير إلى اتصال الجهاز، لا يثبت وصول كل مصدر'));
 const market=$('dc-market').value,symbol=$('dc-symbol').value,frame=Number($('dc-frame').value);
 if(symbol==='all'){checks.push(create('symbol','الأصل المختار',false,'اختر عقدًا واحدًا لتدقيق جودة بياناته.'));}
 else if(!symbol){checks.push(create('symbol','الأصل المختار',false,'لم يتم اختيار أصل'));}
 else if(window.ICTLiveFeed&&window.ICTPublicMarkets){
  try{let bars,hour;
   if(market==='crypto'){[bars,hour]=await Promise.all([window.ICTLiveFeed.fetchHistory({symbol,interval:String(frame),limit:100,timeout:11000}),window.ICTLiveFeed.fetchHistory({symbol,interval:'60',limit:170,timeout:11000})]);}
   else{const ins=window.ICTPublicMarkets.resolve(market,symbol);[bars,hour]=await Promise.all([window.ICTPublicMarkets.get(ins,frame===5?'5min':'15min',{limit:100}),window.ICTPublicMarkets.get(ins,'1h',{limit:170})]);}
   for(const [id,label,arr,tf] of [['entry','شموع إطار الدخول',bars,frame],['hour','شموع الساعة',hour,60]]){const h=core.sample(arr,tf,Date.now());checks.push(create('bars-'+id,label,h.ok,h.message+' | مكتملة: '+h.count+' | فجوات: '+h.gaps+' | عمر آخر إغلاق: '+(h.ageMs==null?'—':Math.round(h.ageMs/60000)+' دقيقة')))}
  }catch(e){checks.push(create('feed','وصول مصدر الشموع',false,String(e.message||e)))}
 }else checks.push(create('feed','وصول مصدر الشموع',false,'موصل البيانات غير محمّل'));
 if(window.ICTEconomicLink706A){try{const link=window.ICTEconomicLink706A,news=await link.loadEvents(fetch);checks.push(create('news','الأجندة الاقتصادية',link.scheduleCovers(news.parts,Date.now()),'يشترط جدول كامل وحديث يغطي نافذة الفحص؛ الملفات المقروءة: '+news.feedsLoaded+'/3'));}catch(e){checks.push(create('news','الأجندة الاقتصادية',false,String(e.message||e)))} }
 checks.push(create('server','مراقبة مستقلة على الخادم',false,'غير منفذة — التحديثات تتوقف بعد إغلاق الصفحة','warn'));
 checks.push(create('quotes','أسعار تنفيذ Bid/Ask وسبريد',false,'غير متصلة؛ آخر إغلاق شمعة ليس سعر تنفيذ','warn'));
 checks.push(create('proof','اختبار أمامي وحقوق إعادة النشر',false,'لم يُثبت بعد قياس نتائج مستقلة أو ترخيص نشر عام لبيانات كل الأسواق','warn'));
 const sr=core.summarize(checks);report={schema:'ict-readiness-8c-v1',at:started,market,symbol,frame,items:checks,summary:sr,limits:['البحث عند الطلب فقط','لا توصيات مستقلة 24 ساعة','لا تنفيذ صفقات','لا عرض أسعار Bid/Ask تنفيذية','لا إثبات ربحية']};render(report);busy=false;run.disabled=false;
}
run.addEventListener('click',()=>audit().catch(e=>{busy=false;run.disabled=false;status.textContent='تعذر إتمام التدقيق: '+String(e.message||e)}));exp.addEventListener('click',()=>{if(!report)return;const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='ICT_8C_Readiness_'+new Date(report.at).toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1500)});
status.textContent='اضغط «فحص الجاهزية الآن» لتدقيق الاتصال والمحركات والتخزين. لن يبدأ أي فحص أو اتصال إضافي تلقائيًا.';
})();
