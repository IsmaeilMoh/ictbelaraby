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
async function auditEquities(instruments){
 const symbols=instruments.filter(item=>item.group==='stocks').map(item=>item.symbol).join(',');
 const [quotes,bars]=await Promise.all(['quotes','bars'].map(kind=>{
  const url=new URL('https://data.alpaca.markets/v2/stocks/'+kind+'/latest');
  url.search=new URLSearchParams({symbols,feed:'iex'});
  return get(url);
 }));
 console.log('### Alpaca IEX direct API access');
 console.log('| Symbols | Bid/Ask endpoint | Bar endpoint |');
 console.log('| --- | --- | --- |');
 const result=reply=>reply.failure??'HTTP success; data and public usage rights require review';
 console.log('| '+symbols+' | '+result(quotes)+' | '+result(bars)+' |');
 console.log('The Basic Trading API requires server credentials. Public display rights for a general website are unverified; Broker API entitlements are separate.');
 console.log('');
}

async function auditBrokerAccess(){
 const endpoint='https://api-fxpractice.oanda.com/v3/instruments/EUR_USD/candles?granularity=M15&count=2&price=BA';
 const result=await get(endpoint);
 console.log('### OANDA Practice candle access without credentials');
 console.log('EUR_USD · M15 · bid and ask candles: '+(result.failure??'HTTP success; feed not validated'));
 console.log('A v20 practice account and token are documented requirements. This probe measures access only, not quote latency or public display rights.');
 console.log('');
}

async function auditGold(){
 const feed='https://standardbullion.com/spot-prices.json';
 const history='https://standardbullion.com/api/v1/market/history?metal=XAU&range=24h';
 const historyRequest=get(history);
 console.log('### XAU/USD pilot: Standard Bullion');
 console.log('USD per troy ounce. Wholesale dealer Bid/Ask; public display requires attribution. Different instrument from a broker CFD.');
 console.log('| Sample UTC | Provider timestamp | Age (s) | Valid dealer Bid/Ask | Browser CORS |');
 console.log('| --- | --- | --- | --- | --- |');
 for(let sample=0;sample<3;sample++){
  if(sample)await new Promise(resolve=>setTimeout(resolve,16000));
  const reply=await get(feed),now=Date.now();
  if(reply.failure){
   console.log('| '+new Date(now).toISOString()+' | '+reply.failure+' | — | unverified | unverified |');
   continue;
  }
  const data=reply.data;
  const gold=Array.isArray(data?.metals)&&data.metals.find(row=>row?.symbol==='XAU');
  const timestamp=Date.parse(data?.updated);
  const age=Number.isFinite(timestamp)?(now-timestamp)/1000:null;
  const valid=data?.source==='Standard Bullion'&&data.unit==='USD per troy ounce'&&
   Number.isFinite(gold?.bid)&&gold.bid>0&&Number.isFinite(gold?.ask)&&gold.ask>=gold.bid;
  console.log('| '+new Date(now).toISOString()+' | '+(age===null?'unverified':new Date(timestamp).toISOString())+
   ' | '+(age===null?'—':age.toFixed(1))+' | '+(valid?'yes':'no')+' | '+(reply.cors?'yes':'unverified')+' |');
 }
 const result=await historyRequest;
 const points=result.data?.points;
 const sample=Array.isArray(points)?points.at(-1):null;
 const closeOnly=sample&&Number.isFinite(sample.price)&&!['open','high','low','close'].some(key=>Object.hasOwn(sample,key));
 console.log('History: '+(result.failure??(closeOnly?'close-only samples confirmed':'unexpected or empty response')));
 console.log('ICT readiness: blocked. Close-only history cannot establish intrabar sweeps or FVGs. Dealer quotes do not establish the Bid/Ask at a broker.');
 console.log('[Standard Bullion API documentation](https://standardbullion.com/gold-price-api) · [Gold-API.com](https://gold-api.com/faqs) offers anonymous reference prices, with a key required for history and OHLC.');
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
 await auditEquities(instruments);
 await auditBrokerAccess();
 await auditGold();
 console.log('### Other free plans (documented limits)');
 console.log('| Provider | Relevant coverage | Limitation for this public site |');
 console.log('| --- | --- | --- |');
 console.log('| [SiftingIO](https://sifting.io/pricing) | Forex, metals, energy, US equities | Free tier is for internal use |');
 console.log('| [iTick](https://itick.io/en/pricing) | Forex, metals, indices, equities, energy futures | Free tier is for personal use |');
 console.log('| [TraderMade](https://marketdata.tradermade.com/docs/restful-api/free-tier.pdf) | Forex and CFDs | Free live REST prices are midpoint; not live Bid/Ask |');
 console.log('| [Pyth Core / Hermes](https://www.pyth.network/blog/the-pyth-core-upgrade) | FX, metals, equities and commodities | Authenticated data plan required; no verified free public package for candles plus Bid/Ask |');
 console.log('| [IEX Exchange](https://www.iex.io/resources/trading/fee-schedule) | US equities | Real-time access has a fee; the free delayed feed cannot trigger live alerts |');
 console.log('| [CME Group](https://www.cmegroup.com/market-data/market-data-api.html) | Metals, equity index and energy futures | Real-time feed requires a subscription; futures are a different product from spot or CFDs |');
 console.log('| [FOREX.com](https://www.forex.com/en-uk/help-and-support/accounts/) | FX and broker instruments | Demo API access is conditional on an open live account; public feed rights unverified |');
 console.log('| [Bybit CFD](https://www.bybit.com/en/help-center/article/FAQ-CFD) | Forex, metals, indices, equities, energy CFDs | Separate MT5 account; [Bybit CFD demo](https://www.bybit.com/en/learn/bybit-tradfi/bybit-cfd-demo-trading) lacks API access. No verified public USD CFD feed; V5 perpetuals are a different product |');
 console.log('| [Dukascopy](https://www.dukascopy.com/swiss/english/about/faq/) | Historical Bid/Ask and live broker feed via FIX | Historical export is free; FIX access requires an account and approval. Public live display rights and end-to-end latency unverified |');
 console.log('| [Twelve Data](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage) | Real-time FX rates and historical candles | Basic access serves internal use; public display permissions and fresh Bid/Ask for all site instruments are unverified |');
 console.log('| [TradingView widgets](https://www.tradingview.com/widget-docs/faq/data/) | Embeddable forex, metals, indices, equities, energy prices depending on source | Display only. [Terms](https://www.tradingview.com/policies/) restrict non-display usage; the widget cannot supply ICT calculations or entry alerts |');
 console.log('| [OANDA Practice](https://help.oanda.com/us/en/faqs/api-user-guide.htm) | Broker candles and prices, with instrument coverage depending on account | Token and account required on the service. Public display permissions, full USD coverage and live freshness have not been established |');
 console.log('');
 try{
  const result=await fetch(page,{signal:AbortSignal.timeout(8000),cache:'no-store'});
  const html=result.ok?await result.text():'';
  const hasScanControls=html.includes('id="dc-run"')&&html.includes('id="dc-monitor"');
  const hasPublicChart=html.includes('id="dc-public-quote"');
  const restored=hasScanControls&&!hasPublicChart&&!html.includes('id="dc-oanda-key"');
  console.log('GitHub Pages scan form: '+(restored?'restored layout verified':hasPublicChart?'earlier layout with embedded quote still deployed':'not verified (HTTP '+result.status+')'));
  const sections=['dc-scan-actions','dc-results','dc-lifecycle','dc-advanced'].map(id=>html.indexOf('id="'+id+'"'));
  const journey=sections.every((at,index)=>at>=0&&(index===0||at>sections[index-1]));
  console.log('GitHub Pages visitor journey: '+(journey?'scan, results, tracking and advanced sections verified':'not verified'));
  const usdtCatalog=html.includes('Bybit · عقود العملات الرقمية الدائمة USDT')&&html.includes('ict-live-feed-702a.js?v=7.0.19-usdt');
  console.log('GitHub Pages Bybit USDT catalog release: '+(usdtCatalog?'deployed #28 markers verified':'not verified (HTTP '+result.status+')'));
 }catch(error){
  console.log('GitHub Pages scan form: not verified ('+(error.cause?.code||error.name)+')');
 }
 try{
  const response=await fetch(origin+'/ictbelaraby/',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  const html=response.ok?await response.text():'';
  console.log('GitHub Pages homepage startup: '+(html.includes('app.js?v=7.0.14-startup')?'deployed #23 marker verified':'not verified (HTTP '+response.status+')'));
 }catch(error){
  console.log('GitHub Pages homepage startup: not verified ('+(error.cause?.code||error.name)+')');
 }
}

if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={inspect,countCatalogMatches};
