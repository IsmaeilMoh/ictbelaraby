/* ICT 7.0 / 2C2 — public OHLC for traditional markets; never remap CFD to USDT. */
(function(root,factory){'use strict';const v=factory();if(typeof module==='object'&&module.exports)module.exports=v;if(root)root.ICTPublicMarkets=v})(typeof globalThis!=='undefined'?globalThis:null,function(){
'use strict';
const MARKETS=Object.freeze({
 forex:[['EURUSD','EURUSD'],['GBPUSD','GBPUSD'],['USDJPY','USDJPY'],['AUDUSD','AUDUSD'],['NZDUSD','NZDUSD'],['USDCHF','USDCHF'],['USDCAD','USDCAD']],
 metals:[['XAUUSD','XAUUSD'],['XAGUSD','XAGUSD']],
 indices:[['NAS100','USTEC'],['US500','US500'],['US30','US30']],
 stocks:[['AAPL','AAPL'],['TSLA','TSLA'],['NVDA','NVDA'],['MSFT','MSFT'],['NFLX','NFLX']],
 energy:[['USOIL','WTI'],['UKOIL','BRENT']]
});
const FRAMES=Object.freeze({'1min':['1m',60000],'5min':['5m',300000],'15min':['15m',900000],'1h':['1h',3600000],'4h':['4h',14400000],'1day':['1d',86400000]});
const SOURCE='Biquote (مصدر طرف ثالث — ليس Bybit CFD)';
function resolve(group,symbol){const found=MARKETS[group]?.find(r=>r[0]===symbol);if(!found)throw Error('رمز غير مدعوم في القائمة');const quote=group==='forex'?symbol.slice(3):'USD';return Object.freeze({symbol,providerSymbol:found[1],group,quote,source:SOURCE})}
function parse(payload,ins,frame,now){if(!FRAMES[frame])throw Error('إطار زمني غير صالح');if(!payload||!Array.isArray(payload.bars))throw Error('لم يُرجع المزود مصفوفة شموع صالحة');if(payload.symbol&&String(payload.symbol).toUpperCase()!==ins.providerSymbol.toUpperCase())throw Error('رمز الاستجابة لا يطابق الرمز المطلوب');if(payload.interval&&String(payload.interval).toLowerCase()!==FRAMES[frame][0])throw Error('إطار الاستجابة لا يطابق المطلوب');const timestamp=Number.isFinite(now)?now:Date.now(),ms=FRAMES[frame][1],map=new Map();
for(const raw of payload.bars){const t=Date.parse(raw.openTime),o=Number(raw.open),h=Number(raw.high),l=Number(raw.low),c=Number(raw.close);if(!Number.isFinite(t)||t<946684800000||t>timestamp+ms||![o,h,l,c].every(x=>Number.isFinite(x)&&x>0)||h<Math.max(o,c,l)||l>Math.min(o,c,h))throw Error('شمعة بتاريخ أو أسعار OHLC غير صالحة');if(typeof raw.isOpen!=='boolean')throw Error('حالة اكتمال الشمعة غير واضحة لدى المصدر');if(map.has(t))throw Error('شموع مكررة عند المصدر');const completed=!raw.isOpen&&t+ms<=timestamp;map.set(t,Object.freeze({start:t,open:o,high:h,low:l,close:c,confirmed:completed,source:SOURCE,symbol:ins.symbol,providerSymbol:ins.providerSymbol,interval:frame,market:ins.group,quoteCurrency:ins.quote}));}
return [...map.values()].sort((a,b)=>a.start-b.start)}
async function get(ins,frame,opts){opts=opts||{};if(!FRAMES[frame])throw Error('إطار غير مدعوم');const endpoint='https://biquote.io/api/'+encodeURIComponent(ins.providerSymbol)+'/ohlc?interval='+encodeURIComponent(FRAMES[frame][0])+'&limit=150';const controller=new AbortController(),clock=(opts.setTimeout||setTimeout)(()=>controller.abort(),14000);try{const response=await (opts.fetch||fetch)(endpoint,{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:controller.signal,referrerPolicy:'no-referrer'});if(!response.ok)throw Error('مزود البيانات: HTTP '+response.status);return parse(await response.json(),ins,frame,opts.now)}finally{(opts.clearTimeout||clearTimeout)(clock)}}
return Object.freeze({MARKETS,FRAMES,SOURCE,resolve,parse,get});
});