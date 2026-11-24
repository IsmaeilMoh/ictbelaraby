'use strict';
/** Research-only news and structural plan checks. No account balance or execution approval. */
const IMPACT_HIGH=new Set(['high','high impact','3','red','مرتفع','عالي','عالية']);
function isoTime(v){if(typeof v==='number'&&Number.isFinite(v)&&v>1e9)return v<1e12?v*1000:v;
 if(typeof v!=='string'||!/^\d{4}-\d\d-\d\dT\d\d:\d\d(?::\d\d(?:\.\d+)?)?(?:Z|[+-]\d\d:\d\d)$/i.test(v.trim()))return NaN;
 return Date.parse(v.trim());}
function normalizeFeed(data){const raw=Array.isArray(data)?data:(data?.events||data?.items||data?.data);
 if(!Array.isArray(raw)||!raw.length||raw.length>3000)throw Error('ECONOMIC_FEED_EMPTY_OR_INVALID');
 const events=[];let invalid=0;
 for(const e of raw){if(!e||typeof e!=='object'){invalid++;continue}
 const time=isoTime(e.time_utc??e.datetime??e.dateTime??e.timestamp??e.date);
 const currency=String(e.currency??e.countryCurrency??e.ccy??'').trim().toUpperCase();
 const impact=String(e.impact??e.importance??e.severity??'unknown').trim().toLowerCase();
 if(!Number.isFinite(time)||!(/^[A-Z]{3}$/.test(currency))){invalid++;continue}
 events.push({time,currency,impact,title:String(e.title??e.event??e.name??'حدث اقتصادي').slice(0,110)});
 }
 if(!events.length)throw Error('NO_EVENTS_WITH_EXPLICIT_TIMEZONE');
 return {events,invalid};}
function currenciesFor(target){if(target.market==='forex'&&/^[A-Z]{6}$/.test(target.symbol))return [target.symbol.slice(0,3),target.symbol.slice(3)];
 // USD denominated exposure for remaining supported feeds; not proof of sensitivity.
 return ['USD'];}
function checkNews(feed,target,now,windowBeforeMin=30,windowAfterMin=15){if(!feed?.events?.length)return {status:'blocked',reason:'ECONOMIC_FEED_UNAVAILABLE'};
 if(feed.invalid)return {status:'blocked',reason:'ECONOMIC_FEED_HAS_UNVERIFIED_TIMES',invalid:feed.invalid};
 const affected=currenciesFor(target),near=feed.events.filter(e=>affected.includes(e.currency)&&(!e.impact||IMPACT_HIGH.has(e.impact)||e.impact==='unknown')&&now>=e.time-windowBeforeMin*60000&&now<=e.time+windowAfterMin*60000);
 if(near.length)return {status:'blocked',reason:'HIGH_IMPACT_NEARBY',count:near.length,events:near.slice(0,3).map(e=>({title:e.title,at:new Date(e.time).toISOString(),currency:e.currency}))};
 return {status:'clear_research_only',reason:'NO_NEARBY_HIGH_IMPACT_IN_FEED'};}
function checkStructure(model,maxStopDistancePct=5){const {entry,stop,target,direction}=model;const all=[entry,stop,target].every(x=>Number.isFinite(x)&&x>0);
 if(!all)return {status:'blocked',reason:'MISSING_PLAN_LEVELS'};
 const dist=Math.abs(entry-stop)/entry*100;
 if(!(dist>0&&dist<=maxStopDistancePct))return {status:'blocked',reason:'STOP_DISTANCE_OUT_OF_POLICY',stopDistancePct:dist};
 if(direction==='bull'&&!(stop<entry&&entry<target)||direction==='bear'&&!(target<entry&&entry<stop))return {status:'blocked',reason:'WRONG_LEVEL_ORDER'};
 return {status:'clear_research_only',reason:'STRUCTURAL_LEVELS_VALID',stopDistancePct:dist};}
async function fetchEconomic(url,now,options={}){if(!url)return {ok:false,reason:'ECONOMIC_FEED_NOT_CONFIGURED'};
 let parsed;try{parsed=new URL(url)}catch(_){return {ok:false,reason:'INVALID_ECONOMIC_FEED_URL'}}
 if(parsed.protocol!=='https:'||parsed.username||parsed.password||parsed.hash)return {ok:false,reason:'ECONOMIC_FEED_MUST_BE_HTTPS'};
 try{const response=await (options.fetch||global.fetch)(url,{signal:AbortSignal.timeout(7000),headers:{Accept:'application/json'},cache:'no-store'});
 if(!response.ok)throw Error('HTTP_'+response.status);
 const text=await response.text();if(text.length>1000000)throw Error('ECONOMIC_FEED_TOO_LARGE');
 const normalized=normalizeFeed(JSON.parse(text));
 // A feed of only past events cannot establish that there are no upcoming news releases.
 if(!normalized.events.some(e=>e.time>=now-3600000&&e.time<=now+7*86400000))throw Error('NO_CURRENT_OR_UPCOMING_EVENT_COVERAGE');
 return {ok:true,feed:normalized,receivedAt:new Date(now).toISOString(),eventCount:normalized.events.length,invalid:normalized.invalid};
 }catch(e){return {ok:false,reason:String(e.message||e).slice(0,120)}}}
module.exports={normalizeFeed,checkNews,checkStructure,fetchEconomic,isoTime,currenciesFor};
