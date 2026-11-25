'use strict';
/** Binance SPOT market data: independent research market. NOT perpetual execution pricing. */
const ROOT='https://data-api.binance.vision/api/v3/klines';
const MS=Object.freeze({'5':300000,'15':900000,'60':3600000});
const PAIRS=Object.freeze(['BTCUSDT','ETHUSDT']);
const SOURCE='Binance Spot (research only; NOT Bybit perpetual)';
function parse(rows,symbol,frame,now=Date.now()){
 if(!PAIRS.includes(symbol)||!MS[frame])throw Error('BACKUP_UNSUPPORTED_PAIR_OR_FRAME');
 if(!Array.isArray(rows)||rows.length<30||rows.length>500)throw Error('BACKUP_INVALID_RESPONSE');
 let last=-1;
 return rows.map(r=>{
  if(!Array.isArray(r)||r.length<6)throw Error('BACKUP_INVALID_ROW');
  const [start,open,high,low,close,volume]=r.slice(0,6).map(Number);
  if(!Number.isSafeInteger(start)||start<=last||start>now+60000||![open,high,low,close].every(x=>Number.isFinite(x)&&x>0)||high<Math.max(open,low,close)||low>Math.min(open,high,close)||!Number.isFinite(volume)||volume<0)throw Error('BACKUP_INVALID_CANDLE');
  last=start;
  return {start,at:new Date(start).toISOString(),open,high,low,close,volume,confirmed:start+MS[frame]<=now,market:'spot',source:SOURCE,symbol,interval:frame,receivedAt:new Date(now).toISOString()};
 });
}
async function fetchHistory(symbol,frame,{fetchImpl=globalThis.fetch,now=Date.now()}={}){
 if(!PAIRS.includes(symbol)||!MS[frame])throw Error('BACKUP_UNSUPPORTED_PAIR_OR_FRAME');
 const url=new URL(ROOT);url.searchParams.set('symbol',symbol);url.searchParams.set('interval',frame==='60'?'1h':frame+'m');url.searchParams.set('limit','200');
 const res=await fetchImpl(url.toString(),{method:'GET',headers:{Accept:'application/json'},cache:'no-store',signal:AbortSignal.timeout(9000)});
 if(!res.ok)throw Error('BINANCE_SPOT_HTTP_'+res.status);
 return parse(await res.json(),symbol,frame,now);
}
module.exports={parse,fetchHistory,ROOT,PAIRS,SOURCE};
