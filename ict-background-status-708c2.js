/* ICT بالعربي 8C.2: read-only background service health. Never treats the service as execution-ready. */
(function(){'use strict';
 const root=document.getElementById('dc-background-8c2');if(!root)return;
 const urlInput=document.getElementById('dc-bg-url'),save=document.getElementById('dc-bg-save'),check=document.getElementById('dc-bg-check'),status=document.getElementById('dc-bg-status'),results=document.getElementById('dc-bg-results');
 const key='ict-background-service-url-v1';
 try{urlInput.value=localStorage.getItem(key)||''}catch(_){}
 function line(text){const p=document.createElement('p');p.textContent=text;results.append(p)}
 function describeError(e){status.textContent='تعذر الاتصال بالخدمة: '+String(e.message||e).slice(0,140);status.dataset.bad='1'}
 function validate(){const value=urlInput.value.trim();if(!value)throw Error('لم تُدخل عنوان الخدمة');const u=new URL(value);
 if(!['https:','http:'].includes(u.protocol)||u.username||u.password||u.search||u.hash)throw Error('عنوان غير صالح');
 if(u.protocol==='http:'&& !['localhost','127.0.0.1'].includes(u.hostname))throw Error('الخدمة البعيدة يجب أن تعمل عبر HTTPS');
 return u.origin+u.pathname.replace(/\/$/,'')}
 save.addEventListener('click',()=>{try{const u=validate();localStorage.setItem(key,u);status.textContent='تم حفظ عنوان الخدمة على هذا المتصفح فقط. لم يتم التحقق من اتصالها بعد.';status.dataset.bad='0'}catch(e){describeError(e)}});
 check.addEventListener('click',async()=>{let url;try{url=validate()}catch(e){describeError(e);return}results.replaceChildren();status.textContent='جارٍ اختبار اتصال خادم المراقبة...';status.dataset.bad='0';
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),9500);
 try{const res=await fetch(url+'/health',{cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('HTTP '+res.status);const data=await res.json();
 if(data.schema!=='ict-research-monitor/1'||data.readyForExecution!==false||typeof data.active!=='boolean')throw Error('استجابة خادم غير متوافقة');
 const heartbeat=Date.parse(data.lastCycleAt);if(!Number.isFinite(heartbeat))throw Error('الخادم لم ينجز أي دورة فحص بعد');
 const ms=Date.now()-heartbeat;if(ms< -120000||ms>Math.max(900000,(data.pollIntervalMs||300000)*3))throw Error('آخر فحص متأخر أو توقيت الخادم غير صحيح');
 const counts=data.marketSummary||{};const marketOk=data.marketDataReady===true;
 status.textContent=!data.active?'الخادم متصل، لكن دورة المراقبة متوقفة أو متأخرة':!marketOk?'الخادم متصل ويجري الفحص، لكن لا توجد شموع حديثة صالحة لأي أصل':data.allMarketDataReady?'الخادم متصل وبيانات جميع الأصول المحددة صالحة بحثيًا':'الخادم متصل لكن بعض الأصول معلقة؛ توجد شموع صالحة بحثيًا لأصول أخرى';status.dataset.bad=data.active&&marketOk?'0':'1';
 line('حالة البيانات: '+Number(counts.valid||0)+' صالح من '+Number(counts.configured||data.marketCount||0)+' · '+Number(counts.blocked||0)+' محجوب · '+Number(counts.unchecked||0)+' لم يفحص · '+Number(counts.stale||0)+' قديم/غير مؤكد');
 if(data.cycleError)line('خطأ في دورة المراقبة: '+String(data.cycleError).slice(0,140));
 line('آخر دورة فحص — نيويورك: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(heartbeat))+' | فلسطين: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'Asia/Gaza',dateStyle:'medium',timeStyle:'short'}).format(new Date(heartbeat)));
 line('عدد دورات الفحص: '+Number(data.cycleCount||0)+' · عدد الأصول: '+Number(data.marketCount||0));
 for(const [name,value] of Object.entries(data.targets||{}).slice(0,12)){line(name+' — '+(value.status==='research_data_valid'?'شموع صالحة بحثيًا'+(value.lastRecoveredAt?' · آخر تعافٍ: '+value.lastRecoveredAt:''):'معلّق: '+(value.error||value.status)+(value.consecutiveFailures?' · فشل متتالٍ: '+value.consecutiveFailures:'')))}
 const gate=data.safety||{};const news=gate.economic||{};
 line('بوابة الأخبار على الخادم: '+(news.ok?'تم جلب أجندة زمنية ('+Number(news.eventCount||0)+' حدثًا)':'غير مكتملة / معلقة: '+(news.reason||'لا توجد بيانات')));
 line('مخاطرة الحساب: غير متحقق منها على الخادم. عرض سعر Bid/Ask: '+(gate.bidAsk?.connected?'المزود متصل (تحقق من حالة كل أصل)':'غير متاح: '+(gate.bidAsk?.reason||'لم يربط بعد'))+'. لا توجد موافقة تنفيذية.');
 }catch(e){describeError(e)}finally{clearTimeout(timeout)}});
})();
