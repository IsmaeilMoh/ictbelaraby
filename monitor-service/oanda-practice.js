'use strict';

const { timingSafeEqual } = require('node:crypto');
const SYMBOLS = Object.freeze(['XAU_USD', 'EUR_USD']);
const FRAMES = Object.freeze({ '5':'M5', '15':'M15', '60':'H1' });
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
function candles(payload,symbol,frame,now){
 if(payload?.instrument!==symbol||payload.granularity!==FRAMES[frame]||!Array.isArray(payload.candles))throw Error('OANDA_CANDLE_IDENTITY');
 const ms=Number(frame)*60000,seen=new Set();
 return payload.candles.filter(bar=>bar?.complete===true).map(bar=>{
  const start=time(bar.time);
  const [open,high,low,close]=['o','h','l','c'].map(key=>Number(bar.mid?.[key]));
  if(!Number.isSafeInteger(start)||start%ms!==0||start+ms>now||seen.has(start)||
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
 url.search=new URLSearchParams({granularity:FRAMES[frame],price:'M',count:'250'});
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
module.exports={SYMBOLS,config,authorized,candles,quote,fetchCandles,pricing};
