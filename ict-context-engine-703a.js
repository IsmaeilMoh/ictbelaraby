/* ICT بالعربي — 7.0 Stage 3A. Historical daily/weekly levels, source-day UTC.
 * Never converts daily UTC candles into New York midnight sessions.
 * UMD export for deterministic unit tests. No trading signals. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTContextEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const DAY=86400000, HOUR=3600000;
function utcDay(t){return new Date(t).toISOString().slice(0,10)}
function weekStart(t){const d=new Date(t),dow=d.getUTCDay(),shift=(dow+6)%7;return Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),d.getUTCDate()-shift)}
function normalize(rows,ms,now=Date.now()){
 if(!Array.isArray(rows))throw Error('لم تصل مصفوفة شموع');const seen=new Set(),out=[],issues={invalid:0,unconfirmed:0,duplicate:0};
 for(const r of rows){const t=Number(r?.start),o=Number(r?.open),h=Number(r?.high),l=Number(r?.low),c=Number(r?.close);
  if(!Number.isSafeInteger(t)||t<946684800000||t>now+ms||![o,h,l,c].every(x=>Number.isFinite(x)&&x>0)||h<Math.max(o,l,c)||l>Math.min(o,h,c)){issues.invalid++;continue}
  if(r.confirmed!==true||t+ms>now){issues.unconfirmed++;continue}
  if(seen.has(t)){issues.duplicate++;continue}seen.add(t);out.push({start:t,open:o,high:h,low:l,close:c});
 }
 out.sort((a,b)=>a.start-b.start);return {rows:out,issues};
}
function aggregate(rows){return {high:Math.max(...rows.map(x=>x.high)),low:Math.min(...rows.map(x=>x.low)),open:rows[0].open,close:rows.at(-1).close,count:rows.length,from:rows[0].start,to:rows.at(-1).start}}
function build(daily,hourly,opts={}){
 const now=Number.isFinite(opts.now)?opts.now:Date.now();const d=normalize(daily,DAY,now),h=normalize(hourly,HOUR,now);const days=d.rows;
 if(days.length<3)throw Error('نحتاج ثلاث شموع يومية مكتملة على الأقل لحساب السياق');
 const today=Date.UTC(new Date(now).getUTCFullYear(),new Date(now).getUTCMonth(),new Date(now).getUTCDate());
 // Last fully completed session at UTC provider boundary, not "previous New York day".
 const previousDay=days.at(-1);
 const byWeek=new Map();for(const b of days){const key=weekStart(b.start);if(!byWeek.has(key))byWeek.set(key,[]);byWeek.get(key).push(b)}
 const currentWeek=weekStart(today),pastWeeks=[...byWeek.keys()].filter(k=>k<currentWeek).sort((a,b)=>b-a);
 let priorWeek=null,weekWarning='';
 for(const k of pastWeeks){const bars=byWeek.get(k),expected=opts.market==='crypto'?7:5;
  const dates=new Set(bars.map(x=>utcDay(x.start)));const w=aggregate(bars);
  // Complete prior week needs 7 calendar days for continuous crypto and five weekdays for typical traditional sessions.
  const required=opts.market==='crypto'?[0,1,2,3,4,5,6]:[0,1,2,3,4];
  const observed=required.every(offset=>dates.has(utcDay(k+offset*DAY)));
  if(observed){priorWeek={...w,start:k,days:bars.length};break}
  if(k===pastWeeks[0])weekWarning='الأسبوع السابق غير مكتمل في البيانات أو احتوى عطلة؛ لن نعرض قمته وقاعه كمستويات أسبوعية موثوقة.';
 }
 // Do not quietly substitute older than previous week when latest previous calendar week is incomplete.
 if(pastWeeks.length&&priorWeek&&priorWeek.start!==pastWeeks[0])priorWeek=null;
 if(!pastWeeks.length)weekWarning='لا توجد شموع كافية للأسبوع السابق.';
 const lastHour=h.rows.at(-1)||null;
 const intradayAge=lastHour?now-(lastHour.start+HOUR):Infinity;
 const recent=lastHour&&intradayAge<=Math.max(3*HOUR,10800000)?lastHour:null;
 const price=recent?.close??null;
 const midpoint=(previousDay.high+previousDay.low)/2;
 const position=price==null?'لا توجد تسعيرة ساعة مكتملة وحديثة':price>previousDay.high?'فوق قمة آخر يوم مكتمل':price<previousDay.low?'تحت قاع آخر يوم مكتمل':price>midpoint?'داخل نطاق اليوم السابق — النصف العلوي':price<midpoint?'داخل نطاق اليوم السابق — النصف السفلي':'عند منتصف نطاق اليوم السابق';
 const levels=[{name:'قمة آخر يوم مكتمل',value:previousDay.high},{name:'قاع آخر يوم مكتمل',value:previousDay.low}];
 if(priorWeek)levels.push({name:'قمة الأسبوع السابق',value:priorWeek.high},{name:'قاع الأسبوع السابق',value:priorWeek.low});
 const above=price===null?null:levels.filter(x=>x.value>price).sort((a,b)=>a.value-b.value)[0]||null;
 const below=price===null?null:levels.filter(x=>x.value<price).sort((a,b)=>b.value-a.value)[0]||null;
 const liveStatus=recent?'آخر إغلاق ساعة ضمن نافذة الحداثة':'آخر إغلاق ساعة متأخر/غير متاح؛ لا نستنتج الموقع الحالي';
 // No market-direction forecast: descriptive placement only.
 return {sourceDay:'UTC',previousDay:{...previousDay,midpoint},priorWeek,weekWarning,price,priceAt:recent?.start??null,position,nearestAbove:above,nearestBelow:below,liveStatus,utcDate:utcDay(now),quality:{daily:d.issues,hourly:h.issues,dayBars:days.length,hourBars:h.rows.length},sources:opts.sources||null,disclaimer:'مستويات من شموع اليومي بحسب UTC لدى المصدر، وليست حدود جلسة نيويورك. قراءة وصفية لا تحدد اتجاه التداول.'};
}
return Object.freeze({DAY,HOUR,normalize,aggregate,weekStart,build});
});
