/* ICT بالعربي 7.0/3B NY sessions correction — compute PDH/PDL PWH/PWL from
 * completed intraday OHLC candles grouped by America/New_York calendar time.
 * UTC timestamps remain storage keys only. 00:00 New York is the ICT chart-day
 * convention used in this module; provider/exchange daily sessions can differ.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTContextEngine=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const DAY=86400000,HOUR=3600000,ZONE='America/New_York';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',hourCycle:'h23'});
function nyParts(t){const p=Object.fromEntries(formatter.formatToParts(new Date(t)).filter(x=>['year','month','day','hour'].includes(x.type)).map(x=>[x.type,Number(x.value)]));return {year:p.year,month:p.month,day:p.day,hour:p.hour,key:[p.year,String(p.month).padStart(2,'0'),String(p.day).padStart(2,'0')].join('-')}}
function nyDay(t,rollHour=0){const p=nyParts(t);return rollHour===17&&p.hour>=17?shiftDay(p.key,1):p.key}
function shiftDay(key,offset){const [y,m,d]=key.split('-').map(Number);return new Date(Date.UTC(y,m-1,d+offset)).toISOString().slice(0,10)}
function nyWeek(key){const [y,m,d]=key.split('-').map(Number),dow=new Date(Date.UTC(y,m-1,d)).getUTCDay();return shiftDay(key,-((dow+6)%7))}
// Find UTC instant at which local New York calendar day begins (DST aware).
function nyMidnight(key){const [y,m,d]=key.split('-').map(Number),guess=Date.UTC(y,m-1,d);for(let t=guess-8*HOUR;t<=guess+8*HOUR;t+=HOUR){const p=nyParts(t);if(p.key===key&&p.hour===0)return t}throw Error('تعذّر تحديد منتصف ليل نيويورك')}
function sessionStart(key,rollHour=0){
 if(rollHour!==17)return nyMidnight(key);
 // The 17:00 New York session begins on the preceding local calendar day.
 // Adding 17 UTC hours to midnight is WRONG on DST transition days (23h/25h).
 const localDay=shiftDay(key,-1),[y,m,d]=localDay.split('-').map(Number),guess=Date.UTC(y,m-1,d,17);
 for(let t=guess-12*HOUR;t<=guess+12*HOUR;t+=HOUR){const p=nyParts(t);if(p.key===localDay&&p.hour===17)return t}
 throw Error('تعذّر تحديد بداية جلسة 17:00 نيويورك');
}
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
function build(unusedDaily,hourly,opts={}){
 const now=Number.isFinite(opts.now)?opts.now:Date.now(),market=opts.market||'forex',crypto=market==='crypto',rollHour=opts.rollHour===17?17:0;
 const h=normalize(hourly,HOUR,now),bars=h.rows; if(!bars.length){
  if(opts.allowUnavailable)return null;
  throw Error('لا توجد شموع ساعة مكتملة؛ لا يمكن حساب حدود نيويورك');
 }
 const currentDay=nyDay(now,rollHour),lastWeekKey=shiftDay(nyWeek(currentDay),-7),byDay=new Map();
 for(const b of bars){const k=nyDay(b.start,rollHour);if(!byDay.has(k))byDay.set(k,[]);byDay.get(k).push(b)}
 const dayEntries=[...byDay.entries()].sort((a,b)=>a[0].localeCompare(b[0]));
 function dayValid(key,list){if(key>=currentDay||!list?.length)return false;
  const dow=new Date(key+'T00:00:00Z').getUTCDay();if(!crypto&&(dow===0||dow===6))return false;
  const start=sessionStart(key,rollHour),end=sessionStart(shiftDay(key,1),rollHour),expected=(end-start)/HOUR;
  const min=crypto?expected:market==='stocks'?4:market==='indices'?5:market==='energy'?5:(rollHour===17?22:(dow===5?15:18));
  if(list.length<min)return false;
  // The first bar must begin at NY midnight for continuously quoted products.
  if(crypto&&list[0].start!==start)return false;
  if(!crypto&&['forex','metals'].includes(market)&&list[0].start>start+HOUR)return false;
  // Reject discontinuities within a continuous session, except DST clock changes (UTC remains hourly).
  if(crypto||market==='forex'||market==='metals')for(let i=1;i<list.length;i++){if(list[i].start-list[i-1].start!==HOUR)return false}
  return true;
 }
 const priorCandidates=dayEntries.filter(([k,list])=>dayValid(k,list));const prev=priorCandidates.at(-1);
 if(!prev){
  if(opts.allowUnavailable)return null;
  throw Error('لا توجد جلسة يوم نيويورك مكتملة بالشموع الساعية. يلزم تاريخ إضافي أو مصدر مختلف.');
 }
 const previousDay={...aggregate(prev[1]),start:sessionStart(prev[0],rollHour),key:prev[0],midpoint:(Math.max(...prev[1].map(x=>x.high))+Math.min(...prev[1].map(x=>x.low)))/2};
 const req=crypto?[0,1,2,3,4,5,6]:[0,1,2,3,4];const weekDays=req.map(i=>shiftDay(lastWeekKey,i));
 let priorWeek=null,weekWarning='';
 if(weekDays.every(k=>dayValid(k,byDay.get(k)))){
  const wBars=weekDays.flatMap(k=>byDay.get(k)).sort((a,b)=>a.start-b.start);priorWeek={...aggregate(wBars),start:sessionStart(lastWeekKey,rollHour),key:lastWeekKey,days:weekDays.length};
 }else weekWarning='الأسبوع السابق بتوقيت نيويورك غير مكتمل في الشموع الساعية المتاحة؛ لا نعرض PWH/PWL تخمينيًا. قد تحتاج مصدرًا يسمح بتاريخ أطول.';
 const lastHour=bars.at(-1),intradayAge=now-(lastHour.start+HOUR),recent=intradayAge>=0&&intradayAge<=3*HOUR?lastHour:null,price=recent?.close??null;
 const midpoint=previousDay.midpoint;
 const position=price==null?'لا توجد تسعيرة ساعة مكتملة وحديثة':price>previousDay.high?'فوق قمة يوم نيويورك السابق':price<previousDay.low?'تحت قاع يوم نيويورك السابق':price>midpoint?'داخل نطاق اليوم السابق — النصف العلوي':price<midpoint?'داخل نطاق اليوم السابق — النصف السفلي':'عند منتصف نطاق اليوم السابق';
 const levels=[{name:'PDH قمة يوم نيويورك السابق',value:previousDay.high},{name:'PDL قاع يوم نيويورك السابق',value:previousDay.low}];
 if(priorWeek)levels.push({name:'PWH قمة أسبوع نيويورك السابق',value:priorWeek.high},{name:'PWL قاع أسبوع نيويورك السابق',value:priorWeek.low});
 const above=price===null?null:levels.filter(x=>x.value>price).sort((a,b)=>a.value-b.value)[0]||null;
 const below=price===null?null:levels.filter(x=>x.value<price).sort((a,b)=>b.value-a.value)[0]||null;
 return {sourceDay:'America/New_York '+String(rollHour).padStart(2,'0')+':00',previousDay,priorWeek,weekWarning,price,priceAt:recent?.start??null,position,nearestAbove:above,nearestBelow:below,liveStatus:recent?'آخر إغلاق ساعة ضمن نافذة الحداثة':'آخر إغلاق ساعة متأخر/غير متاح',nyDate:currentDay,quality:{daily:{invalid:0,unconfirmed:0,duplicate:0},hourly:h.issues,dayBars:priorCandidates.length,hourBars:bars.length,source:'1h'},sources:opts.sources||null,disclaimer:'PDH/PDL وPWH/PWL محسوبة من شموع الساعة المكتملة حسب إغلاق يوم نيويورك '+String(rollHour).padStart(2,'0')+':00، مع مراعاة التوقيت الصيفي. للمطابقة مع TradingView يجب توحيد رمز ومصدر الشموع وإعداد الجلسة (17:00 شائع في الفوركس، و00:00 مستخدم لمراجع ICT). لا تضمن الساعة وحدها تطابق مزودين مختلفين.'};
}
return Object.freeze({DAY,HOUR,normalize,aggregate,nyParts,nyDay,nyMidnight,nyWeek,sessionStart,build});
});
