/* Stage 2D — user-triggered analysis. No calls on page load, no simulated candles. */
(function(){'use strict';
const root=document.getElementById('ict-structure-2d'),engine=window.ICTStructureEngine,pub=window.ICTPublicMarkets,bybit=window.ICTLiveFeed;
if(!root||!engine||!pub||!bybit)return;
const el=id=>document.getElementById(id),kind=el('ict-2d-market'),sym=el('ict-2d-symbol'),tf=el('ict-2d-frame'),pivot=el('ict-2d-pivot'),run=el('ict-2d-run'),state=el('ict-2d-state'),stats=el('ict-2d-stats'),eventsBox=el('ict-2d-events'),zonesBox=el('ict-2d-zones'),details=el('ict-2d-details');let busy=false;
const SYMBOLS={crypto:['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT']};
function status(msg,t){state.textContent=msg;state.dataset.level=t||'info'}
function option(parent,v,label){const o=document.createElement('option');o.value=v;o.textContent=label??v;parent.append(o)}
function fillSymbols(){sym.replaceChildren();const market=kind.value,items=market==='crypto'?SYMBOLS.crypto:pub.MARKETS[market]?.map(x=>x[0])||[];for(const s of items)option(sym,s);if(market==='crypto')status('Bybit USDT: تحليل الشموع المكتملة بطلب يدوي.');else status('مصدر الأسواق التقليدية: OANDA Practice.');stats.replaceChildren();eventsBox.replaceChildren();zonesBox.replaceChildren();details.textContent=''}
kind.addEventListener('change',fillSymbols);
function item(parent,label,val){const box=document.createElement('div');box.className='ict-2d-stat';const k=document.createElement('span');k.textContent=label;const v=document.createElement('strong');v.textContent=String(val);box.append(k,v);parent.append(box)}
function num(x){return Number(x).toLocaleString('en-US',{maximumFractionDigits:7})}
function when(t){return window.ICTMarketTimes.format(t)}
function row(parent,parts){const div=document.createElement('div');div.className='ict-2d-record';for(const [a,b] of parts){const s=document.createElement('span');if(a)s.className='ict-2d-strong';s.textContent=b;div.append(s)}parent.append(div)}
async function getCandles(){const market=kind.value,frame=tf.value,interval=market==='crypto'?{'1min':'1','5min':'5','15min':'15','1h':'60','4h':'240','1day':'D'}[frame]:frame;
 if(market==='crypto'){let candles=await bybit.fetchHistory({symbol:sym.value,interval,limit:200});
  // Local previously collected Bybit candles are supplemental; keep recorded provenance and timeframe.
  if(window.ICTCandleStore){try{const saved=await window.ICTCandleStore.read(sym.value,interval,300);const map=new Map();for(const r of [...saved,...candles])if(r.source==='Bybit V5 public'&&r.symbol===sym.value&&String(r.interval)===interval)map.set(r.start,r);candles=[...map.values()].sort((a,b)=>a.start-b.start)}catch(_){}}
  return {candles,frame:interval,source:'Bybit V5 — '+sym.value+' USDT perpetual'};
 }
 const info=pub.resolve(market,sym.value),candles=await pub.get(info,frame);return {candles,frame,source:info.source+' · '+info.providerSymbol};
}
run.addEventListener('click',async()=>{if(busy)return;busy=true;run.disabled=true;stats.replaceChildren();eventsBox.replaceChildren();zonesBox.replaceChildren();details.textContent='';try{
 status('جارٍ جلب الشموع المكتملة من المصدر وفحصها…');const response=await getCandles(),result=engine.analyze(response.candles,response.frame,{pivot:Number(pivot.value)});
 const age=result.last==null?Infinity:Date.now()-result.last,ms=engine.FRAME_MS[response.frame],stale=age>Math.max(4*ms,3600000);
 item(stats,'وقت الفحص (نيويورك / فلسطين)',when(Date.now()));item(stats,'المصدر',response.source);item(stats,'شموع مكتملة',result.sourceBars);item(stats,'شموع متصلة أخيرة',result.usableBars);item(stats,'فجوات / فواصل',result.gaps.length);item(stats,'عدد FVG',result.zones.length);item(stats,'أحداث BOS / MSS',result.events.filter(x=>x.type==='BOS'||x.type==='MSS').length);
 item(stats,'آخر شمعة',result.last?when(result.last):'غير متاح');
 details.textContent='عدد الشموع الجارية المستبعدة: '+result.unconfirmed+' · سجلات غير صالحة: '+result.rejected+' · تكرار: '+result.duplicates+' · نافذة تأكيد القمة/القاع: '+result.pivot+' شموع في كل اتجاه. تُعرض النتائج من آخر مقطع زمني متصل فقط.';
 if(!result.eligible){status('عدد الشموع المتصلة في آخر مقطع أقل من '+result.minimum+'. لا يمكن اعتماد التحليل بعد فجوة أو انقطاع.','warn');return}
 const recent=[...result.events].sort((a,b)=>b.at-a.at).slice(0,14);
 if(!recent.length)row(eventsBox,[['','لم يتم اكتشاف كسر هيكلي أو سحب سيولة وفق القواعد الحالية.']]);
 for(const ev of recent){const dir=ev.direction==='bull'?'صعودي':'هبوطي';row(eventsBox,[['',when(ev.at)],['',ev.type+' · '+dir],['',num(ev.level)],['',ev.note||'']])}
 const fvg=[...result.zones].sort((a,b)=>b.at-a.at).slice(0,12);
 if(!fvg.length)row(zonesBox,[['','لم تُرصد FVG ضمن آخر مجموعة شموع متصلة.']]);
 for(const z of fvg)row(zonesBox,[['',when(z.at)],['',z.direction==='bull'?'FVG صعودية':'FVG هبوطية'],['',num(z.low)+' – '+num(z.high)],['',z.mitigated?'تم لمس المنطقة لاحقًا':'لم تُلمس ضمن العينة']]);
 if(result.range)item(stats,'توازن Premium/Discount',num(result.range.equilibrium)+' · الأعلى '+num(result.range.high)+' · الأدنى '+num(result.range.low));
 status((stale?'تحليل تاريخي: آخر شمعة قديمة/السوق ربما مغلقة. ':'')+(result.gaps.length?'توجد فواصل زمنية، تم استبعاد المقاطع الأقدم. ':'')+'تم استخراج أحداث وصفية من الشموع المكتملة؛ ليست إشارات دخول.',stale||result.gaps.length?'warn':'ok');
 }catch(err){status('لم يكتمل التحليل: '+String(err?.message||err)+'. تأكد من الاتصال وتوفر الرمز لدى المصدر.','bad')}finally{busy=false;run.disabled=false}});
fillSymbols();
})();
