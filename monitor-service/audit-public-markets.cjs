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
 try{
  const result=await fetch(page,{signal:AbortSignal.timeout(8000),cache:'no-store'});
  const html=result.ok?await result.text():'';
  const deployed=html.includes('id="dc-public-quote"')&&!html.includes('id="dc-oanda-key"');
  console.log('GitHub Pages public-price UI: '+(deployed?'verified on deployed HTML':'not verified (HTTP '+result.status+')'));
 }catch(error){
  console.log('GitHub Pages public-price UI: not verified ('+(error.cause?.code||error.name)+')');
 }
}

if(require.main===module)main().catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={inspect};
