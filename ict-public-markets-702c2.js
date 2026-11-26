/* ICT 7.0 / 2C2 — public OHLC for traditional markets; never remap CFD to USDT. */
(function(root,factory){'use strict';const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;if(root)root.ICTPublicMarkets=v})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const MARKETS=Object.freeze({
 forex:[['EURUSD','EURUSD'],['GBPUSD','GBPUSD'],['USDJPY','USDJPY'],['AUDUSD','AUDUSD'],['NZDUSD','NZDUSD'],['USDCHF','USDCHF'],['USDCAD','USDCAD']],
 metals:[['XAUUSD','XAUUSD'],['XAGUSD','XAGUSD']],
 indices:[['NAS100','USTEC'],['US500','US500'],['US30','US30']],
 stocks:[['AAPL','AAPL'],['TSLA','TSLA'],['NVDA','NVDA'],['MSFT','MSFT'],['NFLX','NFLX']],
 energy:[['USOIL','USOIL'],['UKOIL','UKOIL']]
});
const FRAMES=Object.freeze({'1min':['1m',60000],'5min':['5m',300000],'15min':['15m',900000],'1h':['1h',3600000],'4h':['4h',14400000],'1day':['1d',86400000]});
 const PUBLIC_QUOTES=Object.freeze({
  metals:{XAUUSD:'FOREXCOM:XAUUSD',XAGUSD:'FOREXCOM:XAGUSD'},
  forex:Object.fromEntries(['EURUSD','GBPUSD','USDJPY','AUDUSD','NZDUSD','USDCHF','USDCAD'].map(pair=>[pair,'FX:'+pair])),
  indices:{NAS100:'FOREXCOM:NSXUSD',US500:'FOREXCOM:SPXUSD',US30:'FOREXCOM:DJI'},
  stocks:{AAPL:'NASDAQ:AAPL',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',MSFT:'NASDAQ:MSFT',NFLX:'NASDAQ:NFLX'},
  energy:{USOIL:'TVC:USOIL',UKOIL:'TVC:UKOIL'}
 });

const SOURCE='Biquote · بيانات السوق من طرف ثالث';
const FRAME_BY_MINUTES=Object.freeze({'5':'5min','15':'15min','60':'1h','240':'4h','1440':'1day','D':'1day'});
let catalog=MARKETS;
const listed=group=>catalog[group]||[];
const validSymbol=s=>typeof s==='string'&&/^[A-Z0-9][A-Z0-9._-]{0,29}$/.test(s);
const metal=/^X(?:AU|AG|PT|PD|AL|CU|NI|PB|ZN)[A-Z]{3}$/;
function classify({name,type,description}){
 if(type==='Forex')return /^[A-Z]{6}$/.test(name)?'forex':null;
 if(type==='Stock')return 'stocks';
 if(type==='Index')return 'indices';
 if(type!=='Commodity')return null;
 if(metal.test(name)||/\b(gold|silver|platinum|palladium|aluminum|aluminium|copper|nickel|lead|zinc|tin)\b/i.test(description||''))return 'metals';
 if(/\b(oil|natural gas|heating oil|gasoline|brent)\b/i.test(description||''))return 'energy';
 return null;
}
function parseCatalog(payload){
 if(!Array.isArray(payload))throw Error('استجابة دليل Biquote غير صالحة');
 const groups=Object.fromEntries(Object.keys(MARKETS).map(group=>[group,new Map()]));
 for(const row of payload){
  if(!row||!validSymbol(row.name)||!['MT5','MATRIKS'].includes(row.source))continue;
  const group=classify(row);
  if(!group)continue;
  const alias=MARKETS[group].find(([,provider])=>provider===row.name)?.[0]||row.name;
  groups[group].set(alias,Object.freeze([alias,row.name]));
 }
 if(!Object.values(groups).some(group=>group.size))throw Error('دليل Biquote فارغ');
 return Object.freeze(Object.fromEntries(Object.entries(groups).map(([group,rows])=>[
  group,Object.freeze([...rows.values()].sort((a,b)=>a[0].localeCompare(b[0])))
 ])));
}
async function loadCatalog(opts){
 const expanded=parseCatalog(await request('symbols?quotedWithinDays=7',opts));
 catalog=Object.freeze(Object.fromEntries(Object.keys(MARKETS).map(group=>[
  group,expanded[group].length?expanded[group]:MARKETS[group]
 ])));
 return expanded;
}
function resolve(group,symbol){const found=listed(group).find(r=>r[0]===symbol)||MARKETS[group]?.find(r=>r[0]===symbol);if(!found)throw Error('رمز غير مدعوم في القائمة');const quote=group==='forex'||metal.test(found[1])?found[1].slice(3):MARKETS[group]?.some(([name])=>name===symbol)?'USD':null;return Object.freeze({symbol,providerSymbol:found[1],group,quote,source:SOURCE})}
function parse(payload,ins,frame,now){if(!FRAMES[frame])throw Error('إطار زمني غير صالح');if(!payload||!Array.isArray(payload.bars))throw Error('لم يُرجع المزود مصفوفة شموع صالحة');if(payload.symbol!==ins.providerSymbol)throw Error('رمز الاستجابة لا يطابق الرمز المطلوب');if(payload.interval!==FRAMES[frame][0])throw Error('إطار الاستجابة لا يطابق المطلوب');const timestamp=Number.isFinite(now)?now:Date.now(),ms=FRAMES[frame][1],map=new Map();
for(const raw of payload.bars){const t=Date.parse(raw.openTime),o=Number(raw.open),h=Number(raw.high),l=Number(raw.low),c=Number(raw.close);if(!/(?:Z|[+-]00:00)$/i.test(raw.openTime)||!Number.isFinite(t)||t<946684800000||t>timestamp||![o,h,l,c].every(x=>Number.isFinite(x)&&x>0)||h<Math.max(o,c,l)||l>Math.min(o,c,h))throw Error('شمعة بتاريخ أو أسعار OHLC غير صالحة');if(typeof raw.isOpen!=='boolean')throw Error('حالة اكتمال الشمعة غير واضحة لدى المصدر');if(map.has(t))throw Error('شموع مكررة عند المصدر');const completed=!raw.isOpen&&t+ms<=timestamp;map.set(t,Object.freeze({start:t,open:o,high:h,low:l,close:c,confirmed:completed,source:SOURCE,symbol:ins.symbol,providerSymbol:ins.providerSymbol,interval:frame,market:ins.group,quoteCurrency:ins.quote}));}
return [...map.values()].sort((a,b)=>a.start-b.start)}
const BASE='https://biquote.io/api/';
async function request(path,{fetch:fetcher=globalThis.fetch,signal}={}){
 const timeout=AbortSignal.timeout(14000);
 const response=await fetcher(BASE+path,{
  headers:{Accept:'application/json'},cache:'no-store',signal:signal?AbortSignal.any([signal,timeout]):timeout,referrerPolicy:'no-referrer'
 });
 if(!response.ok)throw Error('Biquote: HTTP '+response.status);
 return response.json();
}
async function get(ins,frame,opts={}){
 if(!FRAMES[frame])throw Error('إطار غير مدعوم');
 const limit=Math.min(1000,Math.max(1,Math.trunc(Number(opts.limit))||150));
 const payload=await request(encodeURIComponent(ins.providerSymbol)+'/ohlc?interval='+FRAMES[frame][0]+'&limit='+limit,opts);
 return parse(payload,ins,frame,opts.now);
}
function parseQuote(payload,ins,now=Date.now()){
 if(payload?.symbol!==ins.providerSymbol||payload.marketState!=='open'||payload.stale!==false||
   !Number.isFinite(payload.quoteAgeSeconds)||payload.quoteAgeSeconds<0||payload.quoteAgeSeconds>15)return null;
 const {bid,ask,timestamp}=payload,at=Date.parse(timestamp);
 if(!/(?:Z|[+-]00:00)$/i.test(timestamp)||!Number.isFinite(at)||at>now||now-at>15000||
    !Number.isFinite(bid)||!Number.isFinite(ask)||bid<=0||ask<=bid)return null;
 return {bid,ask,at};
}
async function getQuote(ins,opts={}){
 return parseQuote(await request(encodeURIComponent(ins.providerSymbol)+'?allowStale=false',opts),ins,opts.now);
}
return Object.freeze({MARKETS,FRAMES,FRAME_BY_MINUTES,PUBLIC_QUOTES,SOURCE,listed,validSymbol,parseCatalog,loadCatalog,resolve,parse,get,parseQuote,getQuote});
});
