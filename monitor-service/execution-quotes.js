'use strict';
/** Read-only quotes guard. Quote source must be operator configured. Never estimates Bid/Ask from candle closes. */
const MAX_AGE_MS=Number(process.env.QUOTE_MAX_AGE_MS)||30000;
const MAX_SPREAD_BPS=Number(process.env.QUOTE_MAX_SPREAD_BPS)||40;
function finite(x){return typeof x==='number'&&Number.isFinite(x)}
function parseQuote(raw,now,options={}){
 const maxAge=options.maxAgeMs||MAX_AGE_MS, maxSpread=options.maxSpreadBps||MAX_SPREAD_BPS;
 if(!raw||typeof raw!=='object')return {status:'blocked',reason:'QUOTE_MISSING'};
 const bid=raw.bid,ask=raw.ask,at=Date.parse(raw.timestamp||''),source=String(raw.source||'').trim();
 if(!finite(bid)||!finite(ask)||bid<=0||ask<=0||bid>=ask)return {status:'blocked',reason:'INVALID_BID_ASK'};
 if(!Number.isFinite(at)||!source)return {status:'blocked',reason:'QUOTE_TIMESTAMP_OR_SOURCE_MISSING'};
 const age=now-at;if(age< -5000||age>maxAge)return {status:'blocked',reason:'QUOTE_STALE_OR_FUTURE',ageMs:age};
 const spreadBps=(ask-bid)/((ask+bid)/2)*10000;
 if(!Number.isFinite(spreadBps)||spreadBps>maxSpread)return {status:'blocked',reason:'SPREAD_TOO_WIDE',spreadBps};
 return {status:'verified_research_quote',reason:'BID_ASK_FRESH',bid,ask,source,at:new Date(at).toISOString(),spreadBps,ageMs:age};
}
function parseFeed(data){const entries=Array.isArray(data?.quotes)?data.quotes:Array.isArray(data)?data:null;
 if(!entries||entries.length>300)throw Error('INVALID_QUOTES_ARRAY');
 const out=new Map();for(const q of entries){if(!q||typeof q!=='object'||typeof q.id!=='string'||!/^[a-z]+:[A-Za-z0-9.]+:(5|15)$/.test(q.id))continue;if(out.has(q.id))throw Error('DUPLICATE_QUOTE_ID');out.set(q.id,q)}return out;}
async function fetchQuotes(url,now,options={}){
 if(!url)return {ok:false,reason:'QUOTE_FEED_NOT_CONFIGURED',quotes:new Map()};
 let uri;try{uri=new URL(url)}catch{return {ok:false,reason:'QUOTE_FEED_BAD_URL',quotes:new Map()}}
 if(uri.protocol!=='https:'||uri.username||uri.password||uri.hash)return {ok:false,reason:'QUOTE_FEED_REQUIRES_HTTPS',quotes:new Map()};
 try {const r=await (options.fetch||global.fetch)(url,{headers:{Accept:'application/json'},signal:AbortSignal.timeout(7000),cache:'no-store'});
  if(!r.ok)throw Error('QUOTE_HTTP_'+r.status);
  const body=await r.text();if(body.length>250000)throw Error('QUOTE_FEED_TOO_LARGE');
  const quotes=parseFeed(JSON.parse(body));if(!quotes.size)throw Error('QUOTE_FEED_EMPTY');
  return {ok:true,reason:null,quotes,receivedAt:new Date(now).toISOString()};
 }catch(e){return {ok:false,reason:String(e.message||e).slice(0,140),quotes:new Map()}}
}
module.exports={parseQuote,parseFeed,fetchQuotes};
