/* ICT بالعربي | Stage 2E. On-page monitoring only; NO background alerts or trading execution. */
(function(){'use strict';
const root=document.getElementById('ict-signals-2e'),signals=window.ICTSignalEngine,structure=window.ICTStructureEngine,bybit=window.ICTLiveFeed,pub=window.ICTPublicMarkets;
if(!root||!signals||!structure||!bybit||!pub)return;
const el=id=>document.getElementById(id),market=el('ict-2e-market'),symbol=el('ict-2e-symbol'),frame=el('ict-2e-frame'),scan=el('ict-2e-scan'),monitor=el('ict-2e-monitor'),permission=el('ict-2e-permission'),statusBox=el('ict-2e-status'),report=el('ict-2e-report'),log=el('ict-2e-log');
let running=false,timer=null,busy=false,startedAt=0,monitorKey='',lastNew='';
const CRYPTO=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'];
const message=(t,level)=>{statusBox.textContent=t;statusBox.dataset.level=level||'info'};
function fill(){stop();symbol.replaceChildren();const items=market.value==='crypto'?CRYPTO:pub.MARKETS[market.value]?.map(a=>a[0])||[];for(const s of items){const o=document.createElement('option');o.value=s;o.textContent=s;symbol.append(o)}report.replaceChildren();message('اختر الأصل والإطار، واضغط «فحص النماذج». لا يبدأ الاتصال تلقائيًا.')}
function stop(){running=false;clearTimeout(timer);timer=null;monitor.textContent='بدء المراقبة أثناء فتح الصفحة';monitor.setAttribute('aria-pressed','false')}
function fmt(v){return typeof v==='number'?v.toLocaleString('en-US',{maximumFractionDigits:6}):'—'}
function date(t){return window.ICTMarketTimes.format(t)}
function note(t){const d=document.createElement('div');d.textContent='['+date(Date.now())+'] '+t;log.prepend(d);while(log.children.length>25)log.lastElementChild.remove()}
function addCell(parent,label,value){const s=document.createElement('span');const b=document.createElement('b');b.textContent=label;s.append(b,document.createTextNode(value));parent.append(s)}
function draw(models,response,quality){report.replaceChildren();if(!models.length){const p=document.createElement('p');p.textContent='لا توجد نماذج مكتملة تتبع القواعد المحددة في أحدث مقطع متصل.';report.append(p);return}
 for(const m of models.slice(0,12)){
 const div=document.createElement('article');div.className='ict-2e-record';const head=document.createElement('header'),title=document.createElement('strong'),tag=document.createElement('span');title.textContent=(m.direction==='bull'?'صعودي':'هبوطي')+' · Sweep → MSS → FVG';tag.className='ict-2e-tag';const labels={watching:'مكتمل بنيويًا — بانتظار عودة السعر',retested:'عادت الأسعار إلى المنطقة',invalidated:'مبطل',expired:'تاريخي / منتهي الصلاحية','no-risk-plan':'لا توجد مستويات مخاطرة صالحة'};tag.textContent=labels[m.status];head.append(title,tag);
 const meta=document.createElement('small');meta.textContent='تكوّن: '+date(m.formedAt)+' · سحب السيولة: '+date(m.sweepAt)+' · MSS: '+date(m.mssAt)+' · FVG: '+date(m.fvgAt);
 const metrics=document.createElement('div');metrics.className='ict-2e-metrics';addCell(metrics,'منطقة FVG',fmt(m.zone.low)+' – '+fmt(m.zone.high));addCell(metrics,'مستوى السيولة',fmt(m.level));addCell(metrics,'دخول توضيحي: منتصف FVG',fmt(m.entry));addCell(metrics,'إبطال توضيحي: خلف السحب',fmt(m.stop));addCell(metrics,'هدف افتراضي 2R',fmt(m.target));addCell(metrics,'العمر منذ الاكتمال',m.ageBars+' شمعة');
 const warn=document.createElement('small');warn.className='ict-2e-muted';warn.textContent='الخطة السعرية افتراضية للتقييم، وليست أمرًا جاهزًا أو ضمانًا لتنفيذ السعر. لا تشمل الانزلاق والسبريد. '+(quality?'تحذير: البيانات قديمة أو متقطعة.':'');
 div.append(head,meta,metrics,warn);report.append(div)
 }
}
async function load(){const type=market.value,tf=frame.value;const adapted=type==='crypto'?{'1min':'1','5min':'5','15min':'15','1h':'60','4h':'240','1day':'D'}[tf]:tf;
 if(type==='crypto'){const rows=await bybit.fetchHistory({symbol:symbol.value,interval:adapted,limit:220});return {candles:rows,frame:adapted,source:'Bybit V5 USDT perpetual'}}
 const instrument=pub.resolve(type,symbol.value);const rows=await pub.get(instrument,tf);return {candles:rows,frame:tf,source:instrument.source+' · '+instrument.providerSymbol};
}
function recentNotice(models,source,now){if(!running)return;for(const m of models){if(m.formedAt+({"1min":60000,"5min":300000,"15min":900000,"1h":3600000,"4h":14400000,"1day":86400000}[frame.value]||900000)<startedAt||m.status!=='watching'||m.ageBars>1)continue;const id=m.id;let stored=[];try{stored=JSON.parse(localStorage.getItem('ict-2e-alert-ids')||'[]');if(!Array.isArray(stored))stored=[]}catch(_){stored=[]}
 if(stored.includes(id)||id===lastNew)continue;lastNew=id;stored.push(id);try{localStorage.setItem('ict-2e-alert-ids',JSON.stringify(stored.slice(-180)))}catch(_){}
 const direction=m.direction==='bull'?'صعودي':'هبوطي',txt=symbol.value+' '+frame.value+' · '+direction+' · نموذج ICT مكتمل بنيويًا — راجع الشروط والإبطال';note('نموذج جديد: '+txt);
 if('Notification' in window&&Notification.permission==='granted')try{new Notification('ICT بالعربي — متابعة نموذج',{body:txt,tag:'ict-2e-'+id})}catch(_){}
 }
}
async function inspect(isMonitor){if(busy)return;busy=true;scan.disabled=true;try{
 message('جارٍ جلب شموع حقيقية وفحص النموذج الثلاثي…');const result=await load();const output=signals.evaluate(result.candles,result.frame,{pivot:2,market:market.value,symbol:symbol.value});const {analysis,models}=output,ms=structure.FRAME_MS[String(result.frame)],last=analysis.last;const stale=!last||Date.now()-(last+ms)>Math.max(3*ms,3600000);const warning=stale||analysis.gaps.length>0||!analysis.eligible;const checkedAt=date(Date.now());
 draw(models,result,warning);message('وقت الفحص: '+checkedAt+' · المصدر: '+result.source+' · '+analysis.usableBars+' شمعة متصلة · '+models.length+' نموذجًا مكتملًا في العينة · آخر شمعة: '+(last?date(last):'غير متاحة')+(warning?' · توجد ملاحظات حداثة أو فجوات؛ لا يُعتمد تنبيه لحظي.':''),warning?'warn':'ok');
 if(isMonitor&&!warning)recentNotice(models,result.source,Date.now());
 }catch(e){message('وقت الفحص: '+date(Date.now())+' · فشل الفحص: '+String(e?.message||e)+'. تأكد من اتصال المصدر والرمز.', 'bad');note('فشل مصدر البيانات: '+String(e?.message||e))}
 finally{busy=false;scan.disabled=false}}
function schedule(){if(!running)return;clearTimeout(timer);timer=setTimeout(async()=>{if(!running)return;if(document.visibilityState==='visible')await inspect(true);schedule()},60000)}
market.addEventListener('change',fill);symbol.addEventListener('change',stop);frame.addEventListener('change',stop);
scan.addEventListener('click',()=>inspect(false));
monitor.addEventListener('click',()=>{if(running){stop();message('تم إيقاف المراقبة. لا توجد مراقبة أثناء إغلاق الصفحة.');return}running=true;startedAt=Date.now();lastNew='';monitorKey=[market.value,symbol.value,frame.value].join('|');monitor.textContent='إيقاف المراقبة';monitor.setAttribute('aria-pressed','true');message('المراقبة بدأت. تُفحص الشموع كل دقيقة أثناء ظهور الصفحة فقط. لا تنبيهات لنماذج تاريخية.');note('المراقبة بدأت: '+monitorKey);inspect(false);schedule()});
permission.addEventListener('click',async()=>{if(!('Notification'in window)){message('هذا المتصفح لا يدعم إشعارات الصفحة. استخدم سجل التنبيهات هنا.','warn');return}try{const p=await Notification.requestPermission();message(p==='granted'?'تم السماح بإشعارات المتصفح أثناء المراقبة.':'لم يُسمح بالإشعارات؛ سيظل السجل داخل الصفحة متاحًا.',p==='granted'?'ok':'warn')}catch(_){message('تعذر طلب صلاحية الإشعارات في هذا المتصفح.','warn')}});
document.addEventListener('visibilitychange',()=>{if(running&&document.visibilityState==='visible'){inspect(true);schedule()}else if(running)clearTimeout(timer)});window.addEventListener('pagehide',stop);
fill();
})();
