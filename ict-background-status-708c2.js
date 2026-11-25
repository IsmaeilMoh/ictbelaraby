/* ICT بالعربي 8C.2: read-only background service health. Never treats the service as execution-ready. */
(function(){'use strict';
 const root=document.getElementById('dc-background-8c2');if(!root)return;
 const urlInput=document.getElementById('dc-bg-url'),save=document.getElementById('dc-bg-save'),check=document.getElementById('dc-bg-check'),status=document.getElementById('dc-bg-status'),results=document.getElementById('dc-bg-results');
 const key='ict-background-service-url-v1';
 try{urlInput.value=localStorage.getItem(key)||''}catch(_){}
 function line(text){const p=document.createElement('p');p.textContent=text;results.append(p)}
 const reasons={
  stale_candles:'الشموع قديمة أو وقت إغلاقها غير صالح',
  candle_gap:'توجد فجوة في تسلسل الشموع المطلوبة',
  not_enough_candles:'عدد الشموع المكتملة غير كافٍ',
  provider_access_denied:'المزوّد رفض الوصول إلى التغذية',
  provider_rate_limited:'المزوّد قيّد عدد الطلبات',
  provider_unavailable:'تعذّر الاتصال بالمزوّد أو الحصول على استجابة',
  invalid_candles:'استجابة الشموع مكررة أو غير صالحة أو غير مطابقة للأداة',
  session_history_missing:'سجل الجلسة السابقة غير مكتمل',
  instrument_mismatch:'التغذية تعود إلى أداة مختلفة'
 };
 function time(value){return typeof value==='number'?value:Date.parse(value)}
 function reasonLabel(reason,fallback){return Object.hasOwn(reasons,reason)?reasons[reason]:fallback}
 function targetNote(item,current,fresh){
  if(!fresh)return 'التقرير قديم أو دورة الفحص غير مكتملة';
  if(item?.status==='not_checked')return 'لم تُفحص الأداة بعد';
  if(current)return 'بيانات بحثية حديثة';
  if(item?.status==='research_data_valid')return reasons.stale_candles;
  const error=String(item?.error||'');
  const legacy=error==='STALE_CANDLES'?'stale_candles':error==='LATEST_SEGMENT_TOO_SHORT'?'candle_gap':
   /(?:_HTTP_|HTTP )(401|403|451)$/.test(error)?'provider_access_denied':null;
  return 'معلّق: '+reasonLabel(item?.reason||legacy,'سبب تعليق الشموع غير محدد');
 }
 function hourlyNote(item,now,side){
  const context=item?.hourlyContext;
  const close=time(context?.lastCompleteAt);
  if(context?.status==='stale'||(Number.isFinite(close)&&now-close>3*3600000))return 'سياق الساعة معلّق بسبب قدم الشموع';
  if(context?.status!=='ready'||!Number.isFinite(close)||close>now){
   const fallback=context?.status==='insufficient'?'شموع الساعة غير كافية لتحليل السياق':'سياق الساعة غير متاح';
   const detail=reasonLabel(context?.reason,null);
   return detail?'سياق الساعة معلّق: '+detail:fallback;
  }
  const closeLabel=' · آخر إغلاق '+window.ICTMarketTimes.format(close);
  if(!side)return 'سياق الساعة متاح'+closeLabel;
  const aligned=Array.isArray(context.aligned)&&context.aligned.includes(side==='BUY'?'bull':'bear');
  return (aligned?'سياق الساعة يدعم الاتجاه بحثيًا':'سياق الساعة لا يدعم اتجاه النموذج')+closeLabel;
 }
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
 for(const [name,value] of Object.entries(data.targets||{}).slice(0,16)){
  const current=data.active&&value?.status==='research_data_valid'&&!value.stale;
  line(name+' — '+targetNote(value,current,data.active)+(current?' · '+hourlyNote(value,Date.now()):'')+
   (value?.lastRecoveredAt?' · آخر تعافٍ: '+value.lastRecoveredAt:'')+
   (value?.consecutiveFailures?' · فشل متتالٍ: '+value.consecutiveFailures:''));
 }
 const gate=data.safety||{};const news=gate.economic||{};
 line('بوابة الأخبار على الخادم: '+(news.ok?'تم جلب أجندة زمنية ('+Number(news.eventCount||0)+' حدثًا)':'غير مكتملة / معلقة: '+(news.reason||'لا توجد بيانات')));
 line('مخاطرة الحساب: غير متحقق منها على الخادم. عرض سعر Bid/Ask: '+(gate.bidAsk?.connected?'المزود متصل (تحقق من حالة كل أصل)':'غير متاح: '+(gate.bidAsk?.reason||'لم يربط بعد'))+'. لا توجد موافقة تنفيذية.');
 }catch(e){describeError(e)}finally{clearTimeout(timeout)}});

 // GitHub Actions free mode: a static research snapshot, not a live server.
 const freeCheck=document.getElementById('dc-bg-free-check');
 function showIntegrated(entries,message){
  document.getElementById('ict-decision-8a')?.dispatchEvent(new CustomEvent('ict:background-scanned',{detail:{entries,message}}));
 }
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
   const now=Date.now();
   const isCurrent=(item,frame)=>{
    const complete=Date.parse(item?.lastCompleteAt);
    return fresh&&item?.status==='research_data_valid'&&!item.stale&&complete<=now&&now-complete<=3*Number(frame)*60000;
   };
   const targets=Object.entries(d.targets||{}).slice(0,16);
   const validCount=targets.filter(([key,item])=>isCurrent(item,key.split(':')[2])).length;
   const valid=d.marketDataReady===true&&validCount>0;
   status.textContent=!fresh?'التقرير قديم أو لم يكتمل؛ المراقبة غير مؤكدة':!valid?'التقرير حديث، لكن لا توجد شموع بحثية صالحة':'آخر تقرير حديث: توجد بيانات بحثية صالحة لبعض الأسواق، دون اعتماد تنفيذ';
   status.dataset.bad=valid?'0':'1';
   if(Number.isFinite(last))line('آخر فحص — '+window.ICTMarketTimes.format(last));
   line('الأسواق: '+validCount+' صالحة من '+targets.length+' · '+(targets.length-validCount)+' معلقة');
   for(const [key,item] of targets){
    const current=isCurrent(item,key.split(':')[2]);
    line(key+' — '+targetNote(item,current,fresh)+(current?' · '+hourlyNote(item,now):'')+
     (item?.source?' · المصدر: '+String(item.source).slice(0,70):''));
   }
   line('الأخبار: '+(d.safety?.economic?.ok?'تغذية متاحة':'غير مكتملة / معلقة')+' · Bid/Ask: غير متصل · المخاطرة: محلية فقط · الموافقة التنفيذية: غير متاحة');
   const entries=(valid&&Array.isArray(d.observations)?d.observations:[]).filter(x=>{
    if(!x||x.status!=='research_only_blocked'||x.executionApproved!==false||!['BUY','SELL'].includes(x.side))return false;
    const item=d.targets?.[[x.market,x.symbol,x.frame].join(':')];
    if(!isCurrent(item,x.frame)||item.marketType==='SPOT_RESEARCH_PROXY')return false;
    const checked=Date.parse(x.checkedAt||x.detectedAt),detected=Date.parse(x.detectedAt);
    return detected<=checked&&checked<=now&&now-checked<=45*60000&&[x.entry,x.stop,x.target,x.rr].every(v=>Number.isFinite(v)&&v>0)&&
     (x.side==='BUY'?x.stop<x.entry&&x.entry<x.target:x.target<x.entry&&x.entry<x.stop);
   }).slice(0,24);
   if(!entries.length)line(!fresh?'لا نعرض نماذج من تقرير قديم.':'لا توجد نماذج بحثية حديثة مستوفية لشروط النشر في هذه اللقطة.');
   for(const [key,item] of targets){
    const counts=item.patternCounts;
    if(isCurrent(item,key.split(':')[2])&&counts)line(key+' · Sweep '+counts.sweep+' · MSS '+counts.mss+' · FVG '+counts.fvg+' · نماذج مركّبة '+counts.composite+' · ضمن نافذة المتابعة '+counts.recent+' · خطط سليمة '+counts.valid);
   }
   showIntegrated(entries.map(x=>{
    const item=d.targets[[x.market,x.symbol,x.frame].join(':')];
    const at=Date.parse(x.research?.at);
    return {...x,source:item.source,marketType:item.marketType,
     detectedAt:Date.parse(x.detectedAt),formedAt:Date.parse(x.formedAt),lastCompleteAt:Date.parse(item.lastCompleteAt),
     research:Number.isFinite(at)?{phase:x.research.phase,at}:null,
     modelEvidence:['sweepAt','mssAt','fvgAt'].map(key=>Date.parse(x.evidence?.[key])),
     blocks:[x.newsGate==='clear_research_only'?'فحص الأخبار البحثي متاح':'تغطية الأخبار غير مؤكدة أو يوجد مانع',
      hourlyNote(item,now,x.side),
      'مخاطرة الحساب غير متحققة','أسعار Bid/Ask غير متحققة']};
   }),fresh?'لا توجد فرص للعرض في التقرير المجدول الحالي.':'التقرير المجدول قديم أو غير مكتمل.');
   line('GitHub Actions تشغيل مجدول بأفضل جهد، وليس مراقبة مستمرة أو إشعارات هاتف.');
  }catch(e){describeError(e);showIntegrated([],'تعذر تحديث نتائج المراقبة المجدولة.')}finally{clearTimeout(timeout);freeCheck.disabled=false}
 });
})();
