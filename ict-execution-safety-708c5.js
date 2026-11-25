/* 8C.5 read-only checks. Research quote checks. */
(function(){'use strict';
 const root=document.getElementById('dc-execution-safety-8c5');if(!root)return;
 const quote=document.getElementById('dc-exec-quote'),overall=document.getElementById('dc-exec-overall');
 const quoteBtn=document.getElementById('dc-exec-check-quote');
 function txt(node,value){node.textContent=value}
 function renderServer(view){if(view?.schema!=='ict-research-monitor/1'||view.readyForExecution!==false)return txt(quote,'استجابة خدمة المراقبة غير متوافقة.');
  const market=document.getElementById('dc-market')?.value,symbol=document.getElementById('dc-symbol')?.value,frame=document.getElementById('dc-frame')?.value;
  const key=[market,symbol,frame].join(':');const t=view.targets?.[key];
  if(!t)return txt(quote,'لا توجد تغطية للخادم للعقد والإطار المحددين ('+key+').');
  if(t.executionQuoteGate!=='verified_research_quote')return txt(quote,'غير صالح للتسعير التنفيذي: '+String(t.executionQuoteReason||'لا توجد تغذية Bid/Ask مؤهلة')+'.');
  const feed=view.safety?.bidAsk;
  if(!feed?.connected||!view.active||t.status!=='research_data_valid'||t.stale)return txt(quote,'معلّق: تغذية الشموع أو الأسعار التنفيذية غير متصلة/قديمة.');
  txt(quote,'سعر Bid/Ask متحقق بحثيًا من '+(t.quoteSource||'مزود البيانات')+' · السبريد '+Number(t.quoteSpreadBps).toFixed(2)+' نقطة أساس. يجب التحقق من سعر التنفيذ مجددًا قبل أي صفقة.');
 }
 quoteBtn.addEventListener('click',async()=>{const stored=(()=>{try{return localStorage.getItem('ict-background-service-url-v1')||''}catch{return ''}})();
 if(!stored){txt(quote,'الخادم غير مربوط. احفظ عنوان HTTPS أولًا في لوحة المراقبة.');return}
 let base;try{const u=new URL(stored);if(u.protocol!=='https:'&& !(u.protocol==='http:'&&['localhost','127.0.0.1'].includes(u.hostname)))throw Error('يلزم HTTPS');base=u.origin+u.pathname.replace(/\/$/,'')}catch{txt(quote,'عنوان المراقبة غير صالح.');return}
 txt(quote,'جارٍ فحص أحدث حالة للتسعير...');const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{const res=await fetch(base+'/health',{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('HTTP '+res.status);renderServer(await res.json());}
 catch(e){txt(quote,'تعذر جلب التسعير: '+String(e.message||e).slice(0,120));}finally{clearTimeout(timeout)}
 txt(overall,'تحقق السعر لا يعني سماح التنفيذ؛ المركز يظل بحثيًا حتى استيفاء جميع الضوابط.');
 });
 txt(overall,'الحالة الافتراضية: التنفيذ غير معتمد. فحص السعر مخصص للبحث.');
})();
