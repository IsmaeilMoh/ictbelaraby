'use strict';

const { timingSafeEqual } = require('node:crypto');
const {HOUR,nyParts} = require('../ict-context-engine-703a.js');
const {MARKETS} = require('../ict-public-markets-702c2.js');
const SYMBOLS = Object.freeze(Object.values(MARKETS).flat().map(row=>row[1]));
const FRAMES = Object.freeze({ '1':'M1', '5':'M5', '15':'M15', '60':'H1', '240':'H4', '1440':'D' });
const API = 'https://api-fxpractice.oanda.com/v3';
const STREAM = 'https://stream-fxpractice.oanda.com/v3';

function config(env=process.env){
 const { OANDA_PRACTICE_TOKEN:token, OANDA_PRACTICE_ACCOUNT:account, OANDA_RESEARCH_KEY:key }=env;
 return token&&/^\d+(?:-\d+)+$/.test(account||'')&&key?.length>=32?{token,account,key}:null;
}
function authorized(header,key){
 const expected=Buffer.from('Bearer '+key);
 const actual=Buffer.from(String(header||''));
 return actual.length===expected.length&&timingSafeEqual(actual,expected);
}
function time(value){
 return typeof value==='string'&&/(?:Z|[+-]\d\d:\d\d)$/.test(value)?Date.parse(value):NaN;
}
function closeTime(start,frame){
 if(frame!=='1440')return start+Number(frame)*60000;
 // A daily v20 candle closes at 17:00 New York, including clock changes.
 for(let hours=23;hours<=25;hours++){
  const candidate=start+hours*HOUR;
  if(nyParts(candidate).hour===17)return candidate;
 }
 return Infinity;
}
function candles(payload,symbol,frame,now){
 if(payload?.instrument!==symbol||payload.granularity!==FRAMES[frame]||!Array.isArray(payload.candles))throw Error('OANDA_CANDLE_IDENTITY');
 const ms=Number(frame)*60000,alignment=Math.min(ms,3600000),seen=new Set();
 return payload.candles.filter(bar=>bar?.complete===true).map(bar=>{
  const start=time(bar.time);
  const [open,high,low,close]=['o','h','l','c'].map(key=>Number(bar.mid?.[key]));
  if(!Number.isSafeInteger(start)||start%alignment!==0||(frame==='1440'&&nyParts(start).hour!==17)||closeTime(start,frame)>now||seen.has(start)||
     ![open,high,low,close].every(x=>Number.isFinite(x)&&x>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high))throw Error('OANDA_INVALID_CANDLE');
  seen.add(start);
  return {start,open,high,low,close,confirmed:true};
 }).sort((a,b)=>a.start-b.start);
}
function quote(message,symbol){
 if(message?.type!=='PRICE'||message.instrument!==symbol)return null;
 if(message.tradeable===false||(message.status!=='tradeable'&&message.tradeable!==true)||(message.status&&message.status!=='tradeable'))return {status:'closed'};
 const bid=Number(message.bids?.[0]?.price),ask=Number(message.asks?.[0]?.price);
 const bidSize=Number(message.bids?.[0]?.liquidity),askSize=Number(message.asks?.[0]?.liquidity);
 const at=time(message.time);
 if(!Number.isSafeInteger(at)||![bid,ask,bidSize,askSize].every(x=>Number.isFinite(x)&&x>0)||bid>=ask)return null;
 return {bid,ask,bidSize,askSize,at};
}
async function fetchCandles(symbol,frame,settings,{fetchImpl=globalThis.fetch,now=Date.now()}={}){
 if(!SYMBOLS.includes(symbol)||!Object.hasOwn(FRAMES,frame))throw Error('OANDA_UNSUPPORTED_INSTRUMENT');
 const url=new URL(API+'/instruments/'+symbol+'/candles');
 url.search=new URLSearchParams({granularity:FRAMES[frame],price:'M',count:'250',dailyAlignment:'17',alignmentTimezone:'America/New_York'});
 const response=await fetchImpl(url,{headers:{Authorization:'Bearer '+settings.token},signal:AbortSignal.timeout(8000)});
 if(!response.ok)throw Error('OANDA_HTTP_'+response.status);
 return candles(await response.json(),symbol,frame,now);
}
async function pricing(symbol,settings,signal,fetchImpl=globalThis.fetch){
 if(!SYMBOLS.includes(symbol))throw Error('OANDA_UNSUPPORTED_INSTRUMENT');
 const url=new URL(STREAM+'/accounts/'+settings.account+'/pricing/stream');
 url.searchParams.set('instruments',symbol);
 const response=await fetchImpl(url,{headers:{Authorization:'Bearer '+settings.token},signal});
 if(!response.ok||!response.body)throw Error('OANDA_HTTP_'+response.status);
 return response.body;
}
module.exports={SYMBOLS,FRAMES,config,authorized,candles,quote,fetchCandles,pricing};
