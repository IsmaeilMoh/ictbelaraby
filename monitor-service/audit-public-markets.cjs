'use strict';

const {PUBLIC_QUOTES}=require('../ict-public-markets-702c2.js');
const base='https://api.marketapi.app/v1/free';
const origin='https://ismaeilmoh.github.io';
const page=origin+'/ictbelaraby/decision-center.html';
const maxQuoteAgeMs=15000;

async function get(url){
 try{
  const response=await fetch(url,{headers:{Origin:origin},signal:AbortSignal.timeout(8000),cache:'no-store'});
  if(!response.ok)return {failure:'HTTP '+response.status};
  const cors=response.headers.get('access-control-allow-origin');
  return {data:await response.json(),cors:cors==='*'||cors===origin};
 }catch(error){
  return {failure:error.cause?.code||error.name};
 }
}

function inspect(symbol,reply,now){
 if(reply.failure)return reply.failure+' (unverified)';
 const row=Array.isArray(reply.data?.data)&&reply.data.data.find(item=>item?.symbol===symbol);
 if(!row){
  for(const key of ['unknown','no_data','not_live']){
   if(Array.isArray(reply.data?.[key])&&reply.data[key].some(item=>item===symbol||item?.symbol===symbol))return key;
  }
  return 'No matching quote';
 }
 if(row.status!=='LIVE')return ['STALE','MARKET_CLOSED','UNAVAILABLE','UNKNOWN'].includes(row.status)?row.status:'Unrecognized quote status';
 const bid=Number(row.bid),ask=Number(row.ask),age=now-Date.parse(row.time);
 if(!(bid>0&&ask>=bid&&Number.isFinite(ask)))return 'Invalid Bid/Ask';
 if(!Number.isFinite(age)||age<0||age>maxQuoteAgeMs)return 'Timestamp fails 15s freshness';
 return reply.cors?'Fresh Bid/Ask snapshot with CORS':'Fresh Bid/Ask snapshot, browser CORS unverified';
}

// Index and crude aliases are catalog lookups only, never instrument substitutions.
const discoveryAliases={
 NAS100:['NDX','USD'],US500:['SPX','USD'],US30:['DJI','USD'],
 USOIL:['WTI','USD'],UKOIL:['BRENT','USD']
};
function discoveryPair(group,symbol){
 if(group==='forex'||group==='metals')return [symbol.slice(0,3),symbol.slice(3)];
 return discoveryAliases[symbol]??[symbol,'USD'];
}
function countCatalogMatches(reply,[baseAsset,quoteAsset]){
 if(reply.failure)return reply.failure+' (unverified)';
 if(!Array.isArray(reply.data?.feeds))return 'Unexpected catalog response';
 const matches=reply.data.feeds.filter(feed=>feed?.status==='live'&&feed.networkType==='mainnet'&&
  feed.baseAsset===baseAsset&&feed.quoteAsset===quoteAsset);
 return matches.length?matches.length+' listed catalog entries':'No matching public catalog record';
}
async function auditDiscovery(instruments){
 const url=new URL('https://api.dataengine.chain.link/api/v1/discovery');
 const checks=instruments.map(({group,symbol})=>({group,symbol,pair:discoveryPair(group,symbol)}));
 url.searchParams.set('base_asset',[...new Set(checks.map(({pair})=>pair[0]))].join(','));
 url.searchParams.set('status','live');
 url.searchParams.set('network_type','mainnet');
 const reply=await get(url);
 console.log('### Chainlink public discovery (metadata only)');
 console.log('The catalog is free to query. Mainnet reports use authenticated subscription access; no reports or candles were requested.');
 console.log('');
 console.log('| Asset class | Site symbol | Catalog lookup | Discovery result |');
 console.log('| --- | --- | --- | --- |');
 for(const {group,symbol,pair} of checks){
  console.log('| '+group+' | '+symbol+' | '+pair.join('/')+' | '+countCatalogMatches(reply,pair)+' |');
 }
 console.log('');
}
async function main(){
 const instruments=Object.entries(PUBLIC_QUOTES).flatMap(([group,items])=>Object.keys(items).map(symbol=>({group,symbol})));
 console.log('### Traditional market source audit');
 console.log('Provider: MarketAPI documented free quote endpoint. No credentials or paid credits used.');
 console.log('');
 console.log('| Asset class | Exact site symbol requested | Quote | Free OHLC / streaming | ICT readiness |');
 console.log('| --- | --- | --- | --- | --- |');
 for(let offset=0;offset<instruments.length;offset+=5){
  const batch=instruments.slice(offset,offset+5);
  const url=new URL(base+'/prices/latest');
  url.searchParams.set('symbols',batch.map(item=>item.symbol).join(','));
  const reply=await get(url),now=Date.now();
  for(const {group,symbol} of batch){
   console.log('| '+group+' | '+symbol+' | '+inspect(symbol,reply,now)+' | Not provided by the documented free API | Blocked |');
  }
 }
 console.log('');
 console.log('A matching quote symbol does not establish contract/venue equivalence. A fresh snapshot does not establish continuous monitoring.');
 console.log('');
 await auditDiscovery(instruments);
 console.log('### Other free plans (documented limits)');
 console.log('| Provider | Relevant coverage | Limitation for this public site |');
 console.log('| --- | --- | --- |');
 console.log('| [SiftingIO](https://sifting.io/pricing) | Forex, metals, energy, US equities | Free tier is for internal use |');
 console.log('| [iTick](https://itick.io/en/pricing) | Forex, metals, indices, equities, energy futures | Free tier is for personal use |');
 console.log('| [TraderMade](https://marketdata.tradermade.com/docs/restful-api/free-tier.pdf) | Forex and CFDs | Free live REST prices are midpoint; not live Bid/Ask |');
 console.log('| [Pyth Core / Hermes](https://www.pyth.network/blog/the-pyth-core-upgrade) | FX, metals, equities and commodities | Authenticated data plan required; no verified free public package for candles plus Bid/Ask |');
 console.log('| [IEX Exchange](https://www.iex.io/products/equities/market-data-connectivity) | US equities | Public IEX API was retired; direct real-time feeds require separate connectivity |');
 console.log('');
 try{
  const result=await fetch(page,{signal:AbortSignal.timeout(8000),cache:'no-store'});
  const html=result.ok?await result.text():'';
  const hasScanControls=html.includes('id="dc-run"')&&html.includes('id="dc-monitor"');
  const hasPublicChart=html.includes('id="dc-public-quote"');
  const restored=hasScanControls&&!hasPublicChart&&!html.includes('id="dc-oanda-key"');
  console.log('GitHub Pages scan form: '+(restored?'restored layout verified':hasPublicChart?'earlier layout with embedded quote still deployed':'not verified (HTTP '+result.status+')'));
 }catch(error){
  console.log('GitHub Pages scan form: not verified ('+(error.cause?.code||error.name)+')');
 }
}

if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={inspect,countCatalogMatches};
