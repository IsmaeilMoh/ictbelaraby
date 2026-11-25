/* ICT بالعربي 7.0 — Stage 6A. Research-only event-to-candle linkage.
   Explicit UTC timestamps, source provenance and coverage required. No impact assertions. */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTEconomicLink706A=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const FEEDS=[['calendar-live.json','الأجندة الحية'],['calendar-next.json','الأجندة القادمة'],['economic-official.json','النتائج الرسمية']];
const ALIASES={US:'USD',USA:'USD','UNITED STATES':'USD','الولايات المتحدة':'USD',UK:'GBP','UNITED KINGDOM':'GBP','بريطانيا':'GBP','EURO AREA':'EUR','EUROZONE':'EUR','منطقة اليورو':'EUR',JAPAN:'JPY','اليابان':'JPY',SWITZERLAND:'CHF','سويسرا':'CHF',CANADA:'CAD',AUSTRALIA:'AUD','NEW ZEALAND':'NZD'};
const MARKETS={crypto:['BTCUSDT','ETHUSDT'],forex:['EURUSD','GBPUSD','USDJPY','NZDUSD'],metals:['XAUUSD','XAGUSD'],indices:['NAS100','US500','US30'],stocks:['AAPL','TSLA','NVDA'],energy:['USOIL','UKOIL']};
function absoluteTime(v){if(typeof v==='number'&&Number.isFinite(v)) {const ms=v<1e11?v*1000:v;return ms>946684800000&&ms<4102444800000?ms:null}if(typeof v!=='string')return null;const t=v.trim();if(/^\d{10,13}$/.test(t))return absoluteTime(Number(t));if(!/(?:Z|[+-]\d\d:?\d\d)$/i.test(t))return null;const parsed=Date.parse(t);return Number.isFinite(parsed)&&parsed>946684800000&&parsed<4102444800000?parsed:null}
function getRows(json){if(Array.isArray(json))return json;if(!json||typeof json!=='object')throw Error('صيغة ملف الأجندة غير صالحة');const rows=json.events||json.items||json.records;if(!Array.isArray(rows))throw Error('لا توجد قائمة أحداث واضحة');return rows}
function str(x){return x===undefined||x===null?'':String(x).trim()}
function normalizedCurrency(row){let c=str(row.currency||row.country||row.ccy).toUpperCase();return ALIASES[c]||c}
function normalizeEvent(row,feed){if(!row||typeof row!=='object')return null;const title=str(row.title||row.event||row.name),when=absoluteTime(row.date??row.datetime??row.eventTime??row.timestamp??row.release_time);if(!title)return null;return {title,when,currency:normalizedCurrency(row),importance:str(row.impact||row.importance),actual:str(row.actual),forecast:str(row.forecast),previous:str(row.previous),source:feed,sourceUrl:str(row.url||row.source_url),issue:when?'': 'تاريخ الحدث لا يحتوي منطقة زمنية صريحة أو غير صالح؛ لم يتم تخمين UTC'} }
function collect(parts){const seen=new Map(),out=[];for(const p of parts){for(const row of getRows(p.json)){const e=normalizeEvent(row,p.feed);if(!e)continue;const key=[e.title.toLowerCase(),e.currency,e.when??'unknown'].join('|');if(seen.has(key)){const old=seen.get(key);if((!old.actual&&e.actual)||(old.issue&&!e.issue))Object.assign(old,e);continue}seen.set(key,e);out.push(e)}}return out.sort((a,b)=>(b.when||0)-(a.when||0))}
function pair(candle){const start=Number(candle.start),open=Number(candle.open),high=Number(candle.high),low=Number(candle.low),close=Number(candle.close);if(!Number.isSafeInteger(start)||![open,high,low,close].every(x=>Number.isFinite(x)&&x>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high))return null;return {start,open,high,low,close,confirmed:candle.confirmed===true}}
function match(event,raw,frameMs){if(!event||!event.when)return {status:'unknown-time',before:null,during:null,after:null};if(!Number.isInteger(frameMs)||frameMs<60000)return {status:'invalid-frame'};
 const completed=(raw||[]).map(pair).filter(c=>c&&c.confirmed).sort((a,b)=>a.start-b.start),byStart=new Map(completed.map(c=>[c.start,c]));
 const eventStart=Math.floor(event.when/frameMs)*frameMs;
 const before=byStart.get(eventStart-frameMs)||null,during=byStart.get(eventStart)||null,after=byStart.get(eventStart+frameMs)||null;
 return {status:before&&during&&after?'linked':completed.length?'gap':'insufficient-history',before,during,after};}

function zone(ts,timezone){const d=new Date(ts);if(!Number.isFinite(d.getTime()))return 'وقت غير صالح';return new Intl.DateTimeFormat('ar-EG',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(d)}
function timeLabel(ts){return 'نيويورك: '+zone(ts,'America/New_York')+' | فلسطين: '+zone(ts,'Asia/Gaza')}
function meaningfulEvent(event){return !!event&&!!event.when&&!!event.title}
// The calendar producer groups its weekly snapshots by Asia/Gaza dates.
const calendarDay=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Gaza',year:'numeric',month:'2-digit',day:'2-digit'});
function scheduleCovers(parts,now){
 const first=calendarDay.format(now-30*60000),last=calendarDay.format(now+30*60000);
 const weeks=parts.filter(p=>{
  const {json,file}=p;
  if(file==='economic-official.json'||json.coverage!=='full'||json.source!=='Forex Factory')return false;
  const updated=absoluteTime(json.updatedAt),start=Date.parse(json.weekStart+'T00:00:00Z');
  if(updated===null||updated>now||now-updated>24*3600000||!Number.isFinite(start)||new Date(start).getUTCDay()!==1)return false;
  const rows=getRows(json);
  const end=new Date(start+7*86400000).toISOString().slice(0,10);
  return rows.length>0&&rows.every(row=>{
   const event=normalizeEvent(row,p.feed);
   if(!event?.when||!(/^[A-Z]{3}$/.test(event.currency)))return false;
   const day=calendarDay.format(event.when);
   return day>=json.weekStart&&day<end;
  });
 }).map(({json})=>[json.weekStart,new Date(Date.parse(json.weekStart)+7*86400000).toISOString().slice(0,10)]);
 return [first,last].every(day=>weeks.some(([start,end])=>day>=start&&day<end));
}
async function loadEvents(fetcher){
 const failures=[];
 const parts=(await Promise.all(FEEDS.map(async ([file,feed])=>{
  try{
   const response=await fetcher(file+'?v='+Date.now(),{cache:'no-store'});
   if(!response.ok)throw Error('HTTP '+response.status);
   const json=await response.json();
   getRows(json);
   return {file,feed,json};
  }catch(err){failures.push(feed+': '+String(err.message||err));return null}
 }))).filter(Boolean);
 return {events:collect(parts),failures,feedsLoaded:parts.length,parts};
}
async function loadCandles(market,symbol,when,fetcher){if(market==='crypto'){
  if(!['BTCUSDT','ETHUSDT'].includes(symbol))throw Error('عقد الكريبتو غير مدعوم');
  const frameMs=3600000,window=10*frameMs,url=new URL('https://api.bybit.com/v5/market/kline');url.searchParams.set('category','linear');url.searchParams.set('symbol',symbol);url.searchParams.set('interval','60');url.searchParams.set('start',String(when-window));url.searchParams.set('end',String(when+window));url.searchParams.set('limit','100');const response=await fetcher(url.toString(),{cache:'no-store'});if(!response.ok)throw Error('Bybit HTTP '+response.status);const json=await response.json();if(json.retCode!==0||!Array.isArray(json.result?.list))throw Error('استجابة Bybit غير صالحة');const candles=json.result.list.map(r=>({start:Number(r[0]),open:+r[1],high:+r[2],low:+r[3],close:+r[4],confirmed:Number(r[0])+frameMs<=Date.now()}));return {candles,frameMs,provider:'Bybit V5 — عقود USDT الدائمة',sourceKind:'crypto-contract'};
 }
 const adapter=typeof window!=='undefined'?window.ICTPublicMarkets:null;if(!adapter)throw Error('محرك الأسواق التقليدية غير محمّل');const instrument=adapter.resolve(market,symbol);const candles=await adapter.get(instrument,'1h');return {candles,frameMs:3600000,provider:instrument.source,sourceKind:'third-party-spot-or-cfd'};
}
return Object.freeze({FEEDS,MARKETS,absoluteTime,getRows,normalizeEvent,collect,match,zone,timeLabel,meaningfulEvent,scheduleCovers,loadEvents,loadCandles});
});
