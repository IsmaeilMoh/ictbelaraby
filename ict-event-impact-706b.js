/* ICT بالعربي 7.0 / 6B — minute-resolution event reaction research, no trading signals. */
(function(root,factory){'use strict';const lib=factory();if(typeof module==='object'&&module.exports)module.exports=lib;if(root)root.ICTEventImpact706B=lib})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const MINUTE=60000, WINDOWS=[5,15,60];
function validateBars(input,now=Date.now()){
 if(!Array.isArray(input))throw Error('لا توجد قائمة شموع دقيقة');const m=new Map();
 for(const x of input){const start=Number(x.start),open=Number(x.open),high=Number(x.high),low=Number(x.low),close=Number(x.close);
  if(!Number.isSafeInteger(start)||start%MINUTE!==0||![open,high,low,close].every(v=>Number.isFinite(v)&&v>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high))continue;
  if(x.confirmed!==true||start+MINUTE>now)continue;
  if(m.has(start))throw Error('تكرار توقيت شمعة دقيقة: '+start);
  m.set(start,{start,open,high,low,close});
 }return m;
}
function measure(eventTime,bars,now=Date.now()){
 if(!Number.isFinite(eventTime)||eventTime<946684800000||eventTime>now)return {status:'invalid-event-time',windows:[]};
 const t=Math.floor(eventTime/MINUTE)*MINUTE,byTime=validateBars(bars,now),base=byTime.get(t-MINUTE),windows=[];
 for(const minutes of WINDOWS){const missing=[];const observed=[];
  for(let i=0;i<minutes;i++){const when=t+i*MINUTE,v=byTime.get(when);if(!v)missing.push(when);else observed.push(v)}
  const end=observed.length===minutes?observed[observed.length-1]:null;
  if(!base||missing.length||!end){windows.push({minutes,status:'insufficient',missingMinutes:missing.length+(!base?1:0),baseline:base?.close??null});continue}
  const high=Math.max(...observed.map(c=>c.high)),low=Math.min(...observed.map(c=>c.low));
  const baseline=base.close,close=end.close;
  windows.push({minutes,status:'measured',baseline,close,high,low,changePct:(close/baseline-1)*100,upPct:(high/baseline-1)*100,downPct:(low/baseline-1)*100,rangePct:(high-low)/baseline*100});
 }
 return {status:windows.some(x=>x.status==='measured')?'partial-or-measured':'insufficient',at:t,windows,coveredBars:byTime.size,method:'UTC minute candles; baseline = previous completed minute close; bar windows aligned to event minute (approximate release within minute)'};
}
async function getMinuteCandles(market,symbol,eventTime,fetcher,opts={}){
 const now=opts.now??Date.now(),t=Math.floor(eventTime/MINUTE)*MINUTE;
 if(!Number.isFinite(t)||t>now)throw Error('لم يصدر الخبر بعد');
 if(market==='crypto'){
  if(!['BTCUSDT','ETHUSDT'].includes(symbol))throw Error('رمز كريبتو غير مدعوم');
  const url=new URL('https://api.bybit.com/v5/market/kline');url.searchParams.set('category','linear');url.searchParams.set('symbol',symbol);url.searchParams.set('interval','1');url.searchParams.set('start',String(t-2*MINUTE));url.searchParams.set('end',String(t+62*MINUTE));url.searchParams.set('limit','100');
  const res=await fetcher(url.toString(),{cache:'no-store'});if(!res.ok)throw Error('Bybit HTTP '+res.status);const body=await res.json();if(body.retCode!==0||!Array.isArray(body.result?.list))throw Error('استجابة Bybit غير متوقعة');
  const bars=body.result.list.map(r=>({start:Number(r[0]),open:Number(r[1]),high:Number(r[2]),low:Number(r[3]),close:Number(r[4]),confirmed:Number(r[0])+MINUTE<=now}));
  return {bars,provider:'Bybit V5 — عقود USDT الدائمة',historyConstraint:'يمكن طلب نافذة تاريخية محددة ضمن حدود واجهة Bybit'};
 }
 const adapter=opts.adapter||(typeof window!=='undefined'?window.ICTPublicMarkets:null);if(!adapter)throw Error('محرك الأسواق التقليدية غير متاح');const instrument=adapter.resolve(market,symbol);
 const bars=await adapter.get(instrument,'1min',{fetch:fetcher,now});
 return {bars,provider:instrument.source,historyConstraint:'المصدر العام يعيد أحدث 150 شمعة تقريبًا، ولا يتيح تحديد تاريخ قديم في الطلب الحالي'};
}
function summarize(entries){
 const out={};for(const min of WINDOWS){const valid=entries.map(e=>e.result?.windows?.find(w=>w.minutes===min)).filter(w=>w?.status==='measured');
 const mean=key=>valid.length?valid.reduce((a,x)=>a+x[key],0)/valid.length:null;
 out[min]={measured:valid.length,notMeasured:entries.length-valid.length,meanAbsChangePct:valid.length?valid.reduce((a,x)=>a+Math.abs(x.changePct),0)/valid.length:null,meanChangePct:mean('changePct'),meanRangePct:mean('rangePct'),upCount:valid.filter(x=>x.changePct>0).length,downCount:valid.filter(x=>x.changePct<0).length};
 }return out;
}
return Object.freeze({MINUTE,WINDOWS,validateBars,measure,getMinuteCandles,summarize});
});
