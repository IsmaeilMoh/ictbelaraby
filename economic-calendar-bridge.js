/* ICT بالعربي 6.8.48 — shared calendar/official-data matching.
   Reads only the economic calendar that the site already displays; does not
   publish a new dataset or scrape a new provider. Forecasts are not BLS data.
*/
(function(root){
'use strict';
const known={
 'cpi-yoy':[/^cpi y\/y$/i,/^headline cpi y\/y$/i],
 'cpi-mom':[/^cpi m\/m$/i,/^headline cpi m\/m$/i],
 'core-cpi-mom':[/^core cpi m\/m$/i],
 'unemployment':[/^unemployment rate$/i],
 'payroll-change':[/^non-farm employment change$/i,/^nonfarm payrolls$/i,/^non-farm payrolls$/i],
 'ppi-mom':[/^ppi m\/m$/i,/^producer price index m\/m$/i]
};
const storageKey='ict-consensus-snapshots-v6848';
let calendar=[],snapshots={};
function normal(s){return String(s||'').trim().replace(/\s+/g,' ')}
function validTime(s){return typeof s==='string'&&Number.isFinite(Date.parse(s))}
function parsed(raw){const m=normal(raw).replace(/,/g,'').match(/^([+-]?(?:\d+(?:\.\d+)?|\.\d+))\s*(%|K|M|B|T)?$/i);if(!m)return null;const n=Number(m[1]),u=(m[2]||'').toUpperCase();return Number.isFinite(n)?{value:n,unit:u}:null}
function monthAfter(period){if(!/^20\d\d-(0[1-9]|1[0-2])$/.test(String(period)))return null;const [y,m]=period.split('-').map(Number);return m===12?`${y+1}-01`:`${y}-${String(m+1).padStart(2,'0')}`}
function releaseMonth(date){return validTime(date)?new Date(date).toISOString().slice(0,7):null}
function matches(ev,obs){return ev&&obs&&obs.currency==='USD'&&String(ev.country||ev.currency||'').toUpperCase()==='USD'&&known[obs.indicator]?.some(r=>r.test(normal(ev.title)))&&releaseMonth(ev.date)===monthAfter(obs.period)}
function unitOK(v,obs){return v&&(obs.unit==='%'?v.unit==='%':obs.unit==='K'?v.unit==='K':'')}
function eventKey(ev){return String(ev.date)+'|'+normal(ev.title)+'|'+String(ev.country||ev.currency)}
function readSnapshots(){try{const obj=JSON.parse(root.localStorage?.getItem(storageKey)||'{}');return obj&&typeof obj==='object'&&!Array.isArray(obj)?obj:{}}catch{return {}}}
function storePreRelease(rows){snapshots=readSnapshots();let n=0;const now=Date.now();for(const ev of rows){const parsedForecast=parsed(ev.forecast);const stamp=Date.parse(ev.date);if(!parsedForecast||!Number.isFinite(stamp)||stamp<=now+60000||stamp>now+1000*86400000*60)continue;
 const key=eventKey(ev);if(!snapshots[key]){snapshots[key]={forecast:normal(ev.forecast),capturedAt:new Date(now).toISOString()};n++}}
 if(n){try{root.localStorage?.setItem(storageKey,JSON.stringify(Object.fromEntries(Object.entries(snapshots).slice(-1200))))}catch{}}}
function ingest(payloads){const all=[];for(const p of payloads){for(const e of Array.isArray(p?.events)?p.events:[]){if(e&&validTime(e.date)&&typeof e.title==='string')all.push(e)}}
 calendar=[...new Map(all.map(e=>[eventKey(e),e])).values()];storePreRelease(calendar);return calendar.length}
async function load(){const data=await Promise.all(['calendar-live.json','calendar-next.json'].map(async n=>{try{const r=await fetch(n+'?t='+Date.now(),{cache:'no-store'});return r.ok?await r.json():null}catch{return null}}));return ingest(data)}
function find(obs){const candidates=calendar.filter(e=>matches(e,obs));if(candidates.length!==1)return null;const ev=candidates[0],raw=parsed(ev.forecast);if(!unitOK(raw,obs))return null;const k=eventKey(ev),prior=snapshots[k];const preserved=prior&&validTime(prior.capturedAt)&&Date.parse(prior.capturedAt)<Date.parse(ev.date)?parsed(prior.forecast):null;
 const f=unitOK(preserved,obs)?preserved:raw;
 if(!f)return null;
 const verified=Boolean(unitOK(preserved,obs));return {value:f.value,unit:obs.unit,text:verified?prior.forecast:ev.forecast,source:'Forex Factory (الأجندة الحالية)',recordedAt:verified?prior.capturedAt:null,verifiedBeforeRelease:verified,releaseAt:ev.date,eventTitle:ev.title};}
function comparison(obs){const f=find(obs);const actual=Number(obs?.actual);if(!f||!Number.isFinite(actual))return null;const difference=Math.round((actual-f.value)*1000)/1000;return {...f,difference,kind:difference>0?'above':difference<0?'below':'equal'};}
function interpretation(obs){const c=comparison(obs);if(!c)return 'لا يمكن تقييم المفاجأة الاقتصادية دون توقع مطابق.';
 if(c.kind==='equal')return 'القراءة مطابقة للتوقعات؛ يتحدد رد فعل السوق بعوامل أخرى.';
 const inverse=obs.indicator==='unemployment';const stronger=c.kind==='above';
 const usdPositive=inverse?!stronger:stronger;
 const reading=stronger?'أعلى من المتوقع':'أقل من المتوقع';
 const context=(obs.indicator==='cpi-yoy'||obs.indicator==='cpi-mom'||obs.indicator==='core-cpi-mom'||obs.indicator==='ppi-mom')?'التضخم':obs.indicator==='unemployment'?'البطالة':'التوظيف';
 return `${context} ${reading}؛ ${usdPositive?'قد يدعم الدولار ويضغط على الذهب إذا استجابت توقعات الفائدة لذلك':'قد يضغط على الدولار ويدعم الذهب إذا استجابت توقعات الفائدة لذلك'}. تفسير احتمالي، وليس حركة سعر مؤكدة.`;}
// 6.8.50: global release lifecycle. Calendar facts are always labelled as calendar data;
// only matching BLS observations can be called officially verified US results.
const indicators=Object.keys(known);
const labels={'cpi-yoy':'CPI العام السنوي','cpi-mom':'CPI العام الشهري','core-cpi-mom':'CPI الأساسي الشهري','unemployment':'معدل البطالة','payroll-change':'الوظائف غير الزراعية','ppi-mom':'أسعار المنتجين الشهرية'};
function differenceOf(actual,forecast){
 const a=parsed(actual),f=parsed(forecast);
 if(!a||!f||a.unit!==f.unit)return null;
 const scale={K:1e3,M:1e6,B:1e9,T:1e12,'':1,'%':1};
 if(!(a.unit in scale))return null;
 return Math.round((a.value-f.value)*1000)/1000;
}
function lifecycle(observations=[],time=Date.now()){
 const unique=new Map();
 for(const ev of calendar){
  const stamp=Date.parse(ev.date);
  if(!Number.isFinite(stamp)||stamp<time-2*86400000||stamp>time+16*86400000)continue;
  const currency=String(ev.currency||ev.country||'').toUpperCase();
  if(!/^[A-Z]{3}$/.test(currency))continue;
  const key=eventKey(ev);if(unique.has(key))continue;
  const indicator=currency==='USD'?indicators.find(id=>known[id].some(pattern=>pattern.test(normal(ev.title)))):null;
  const obs=indicator?observations.find(o=>o&&o.indicator===indicator&&o.unit&&(o.period===priorMonth(releaseMonth(ev.date)))):null;
  const isFuture=stamp>time;
  const official=!isFuture&&Boolean(obs&&obs.source==='BLS'&&Number.isFinite(Number(obs.actual)));
  const calendarActual=parsed(ev.actual);
  const calendarReleased=!isFuture&&Boolean(calendarActual);
  const published=official||calendarReleased;
  const actual=official?String(obs.actual)+obs.unit:calendarReleased?normal(ev.actual):'—';
  const snapshot=snapshots[key];
  const before=snapshot&&validTime(snapshot.capturedAt)&&Date.parse(snapshot.capturedAt)<stamp?parsed(snapshot.forecast):null;
  const forecast=parsed(ev.forecast);
  const currentUnit=official?obs.unit:(calendarActual?.unit||forecast?.unit||'');
  const canUse=x=>x&&x.unit===currentUnit;
  const chosen=canUse(before)?before:canUse(forecast)?forecast:null;
  const difference=published&&chosen?differenceOf(actual,String(chosen.value)+chosen.unit):null;
  unique.set(key,{key,indicator,title:indicator?labels[indicator]:ev.title,eventTitle:ev.title,currency,impact:ev.impact||'',date:ev.date,period:obs?.period||null,
   stage:isFuture?'upcoming':published?'released':'awaiting',
   previous:normal(ev.previous)||((obs?.previous!=null)?String(obs.previous)+obs.unit:'—'),
   forecast:normal(ev.forecast)||'—',actual,difference,unit:currentUnit,
   verifiedBeforeRelease:Boolean(before&&canUse(before)),
   forecastSource:'الأجندة الحالية',officialSource:official?'BLS':null,
   actualSource:official?'BLS':calendarReleased?'الأجندة الاقتصادية':null});
 }
 const result=[...unique.values()];
 // Upcoming and just-released events nearest to now are most relevant. Keep all currencies.
 return result.sort((a,b)=>Math.abs(Date.parse(a.date)-time)-Math.abs(Date.parse(b.date)-time)||Date.parse(a.date)-Date.parse(b.date));
}
function priorMonth(v){if(!/^20\d\d-\d\d$/.test(String(v)))return null;let [y,m]=v.split('-').map(Number);return m===1?`${y-1}-12`:`${y}-${String(m-1).padStart(2,'0')}`}

root.ICTCalendarConsensus=Object.freeze({load,ingest,find,comparison,interpretation,monthAfter,parsed,lifecycle});
})(window);
