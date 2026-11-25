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

 // GitHub Actions free mode: a static research snapshot, not a live server.
 const freeCheck=document.getElementById('dc-bg-free-check');
 if(freeCheck)freeCheck.addEventListener('click',async()=>{
  const snapshotUrl='https://raw.githubusercontent.com/ismaeilmoh/ictbelaraby/ict-monitor-feed/monitor-status.json';
  status.textContent='جارٍ قراءة آخر تقرير بحثي منشور على GitHub...';status.dataset.bad='1';results.replaceChildren();freeCheck.disabled=true;
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
  try{
   const res=await fetch(snapshotUrl+'?read='+Date.now(),{cache:'no-store',signal:controller.signal});
   if(!res.ok)throw Error(res.status===404?'لم يُنشر أول تقرير بعد. شغّل المهمة يدويًا من GitHub Actions.':'HTTP '+res.status);
   const d=await res.json();
   if(d.schema!=='ict-research-monitor/1'||d.transport!=='github-actions-static'||d.readyForExecution!==false||d.safety?.executionApproved!==false)throw Error('صيغة التقرير غير متوافقة أو لا تضمن رفض التنفيذ');
   const last=Date.parse(d.lastCycleAt),age=Date.now()-last;
   const fresh=Number.isFinite(last)&&age>=-120000&&age<=45*60000&&d.active===true;
   const valid=fresh&&d.marketDataReady===true;
   status.textContent=!fresh?'التقرير قديم أو لم يكتمل؛ المراقبة غير مؤكدة':!valid?'التقرير حديث، لكن لا توجد شموع بحثية صالحة':'آخر تقرير حديث: توجد بيانات بحثية صالحة لبعض الأسواق، دون اعتماد تنفيذ';
   status.dataset.bad=valid?'0':'1';
   if(Number.isFinite(last))line('آخر فحص — نيويورك: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',dateStyle:'medium',timeStyle:'short'}).format(new Date(last))+' | فلسطين: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'Asia/Gaza',dateStyle:'medium',timeStyle:'short'}).format(new Date(last)));
   const c=d.marketSummary||{};line('الأسواق: '+Number(c.valid||0)+' صالحة من '+Number(c.configured||0)+' · '+Number(c.blocked||0)+' معلقة');
   for(const [symbol,item] of Object.entries(d.targets||{}).slice(0,12))line(symbol+' — '+(fresh&&item.status==='research_data_valid'&&!item.stale?'بيانات بحثية حديثة':'معلّق أو قديم')+(item.error?' · '+String(item.error).slice(0,90):'')+(item.status==='research_data_valid'&&item.source?' · المصدر: '+String(item.source).slice(0,70):''));
   line('الأخبار: '+(d.safety?.economic?.ok?'تغذية متاحة':'غير مكتملة / معلقة')+' · Bid/Ask: غير متصل · المخاطرة: محلية فقط · الموافقة التنفيذية: غير متاحة');
   const entries=Array.isArray(d.observations)?d.observations.slice(0,16):[];
   const heading=document.createElement('h3');heading.textContent='النماذج المرصودة في آخر فحوص مجانية';results.append(heading);
   if(!fresh||!entries.length){line(!fresh?'لا نعرض نماذج من تقرير قديم.':'لا توجد نماذج بحثية حديثة مستوفية لشروط النشر في هذه اللقطة.');}
   else for(const x of entries){
    if(!x||x.status!=='research_only_blocked'||x.executionApproved!==false||!['BUY','SELL'].includes(x.side))continue;
    const age=Date.now()-Date.parse(x.detectedAt||'');if(!Number.isFinite(age)||age< -120000||age>45*60000)continue;
    const box=document.createElement('article');box.className='dc-research-observation';results.append(box);
    const h=document.createElement('h4');h.textContent=String(x.symbol||'')+' · '+x.side+' · رصد بحثي فقط';box.append(h);
    const p=document.createElement('p');p.textContent='الدخول المرجعي: '+Number(x.entry)+' | الوقف الافتراضي: '+Number(x.stop)+' | الهدف الافتراضي: '+Number(x.target)+' | R:R '+Number(x.rr);box.append(p);
    const t=document.createElement('p');t.textContent='رُصد: '+new Intl.DateTimeFormat('ar-EG',{timeZone:'America/New_York',dateStyle:'short',timeStyle:'short'}).format(new Date(x.detectedAt))+' نيويورك · '+String(x.model||'ICT');box.append(t);
    const warning=document.createElement('p');warning.className='dc-warning';warning.textContent='معلّق: مخاطرة الحساب والسعر التنفيذي غير متحقق منهما. لا توجد موافقة تنفيذ.';box.append(warning);
   }
   line('GitHub Actions تشغيل مجدول بأفضل جهد، وليس مراقبة مستمرة أو إشعارات هاتف.');
  }catch(e){describeError(e)}finally{clearTimeout(timeout);freeCheck.disabled=false}
 });
})();
