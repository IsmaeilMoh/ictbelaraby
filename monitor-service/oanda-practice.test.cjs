'use strict';
const assert=require('node:assert/strict');
const oanda=require('./oanda-practice.js');
const origin='https://ismaeilmoh.github.io';
const key='demo-test-service-key-123456789012345';
Object.assign(process.env,{ALLOWED_ORIGIN:origin,OANDA_PRACTICE_TOKEN:'upstream-mock',
 OANDA_PRACTICE_ACCOUNT:'000-000-0000-001',OANDA_RESEARCH_KEY:key});
const now=Date.parse('2026-11-25T12:00:00Z');
const iso=n=>new Date(n).toISOString();
const tick={type:'PRICE',instrument:'XAU_USD',status:'tradeable',time:iso(now),
 bids:[{price:'2500',liquidity:2}],asks:[{price:'2501',liquidity:2}]};
assert.equal(oanda.quote(tick,'EUR_USD'),null);
assert.deepEqual(oanda.quote({...tick,tradeable:false},'XAU_USD'),{status:'closed'});
assert.equal(oanda.quote({...tick,time:'2026-11-25T12:00:00'},'XAU_USD'),null);
assert.equal(oanda.quote({...tick,status:undefined,tradeable:true},'XAU_USD').ask,2501);
assert.equal(oanda.config({}),null);
assert.equal(oanda.authorized('Bearer wrong',key),false);


(async()=>{
 const nativeFetch=global.fetch,originalNow=Date.now;
 Date.now=()=>now;
 global.fetch=async(input,options)=>{
  const url=new URL(input);
  assert.equal(options.headers.Authorization,'Bearer upstream-mock');
  if(url.hostname==='stream-fxpractice.oanda.com'){
   assert.equal(url.searchParams.get('instruments'),'XAU_USD');
   const quotes=[{type:'HEARTBEAT'},tick,{...tick,status:'non-tradeable'}];
   return {ok:true,body:new Response(quotes.map(x=>JSON.stringify(x)+'\n').join('')).body};
  }
  assert.equal(url.hostname,'api-fxpractice.oanda.com');
  const granularity=url.searchParams.get('granularity'),symbol=url.pathname.split('/')[3];
  const ms=granularity==='H1'?3600000:900000;
  assert.equal(url.searchParams.get('price'),'M');
  return {ok:true,json:async()=>({instrument:symbol,granularity,candles:[
   {time:iso(now-ms),complete:true,mid:{o:'2500',h:'2510',l:'2490',c:'2502'}},
   {time:iso(now),complete:false}
  ]})};
 };
 const monitor=require('./server.js').start({noHttp:true,noSchedule:true});
 try{
  await new Promise(resolve=>monitor.httpServer.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+monitor.httpServer.address().port;
  const endpoint=base+'/oanda-research?symbol=XAU_USD&frame=15';
  const candlesEndpoint=base+'/oanda-candles?symbol=SPX500_USD&frame=15';
 const access={headers:{Origin:origin,Authorization:'Bearer '+key}};
  assert.equal((await nativeFetch(endpoint)).status,401);
  assert.equal((await nativeFetch(candlesEndpoint)).status,401);
  const index=await (await nativeFetch(candlesEndpoint,access)).json();
  assert.equal(index.symbol,'SPX500_USD');
  assert.equal(index.bars.length,1);
  const publicHealth=await (await nativeFetch(base+'/health')).json();
  const privateHealth=await (await nativeFetch(base+'/health',access)).json();
  assert.ok(!Object.hasOwn(publicHealth.targets,'metals:XAUUSD:15'));
  assert.ok(Object.hasOwn(privateHealth.targets,'metals:XAUUSD:15'));
  const preflight=await nativeFetch(endpoint,{method:'OPTIONS',headers:{Origin:origin,'Access-Control-Request-Headers':'authorization'}});
  assert.equal(preflight.status,204);
  assert.equal(preflight.headers.get('access-control-allow-headers'),'Authorization');
  const response=await nativeFetch(endpoint,access);
  const view=await response.json();
  assert.equal(response.headers.get('access-control-allow-origin'),origin);
  assert.equal(view.schema,'ict-oanda-practice/1');
  assert.equal(view.symbol,'XAU_USD');
  assert.equal(view.entry.length,1);
  assert.equal(view.entry[0].start,now-900000);
  assert.equal(view.hourly[0].start,now-3600000);
  assert.equal(view.readyForExecution,false);
  const data=await (await nativeFetch(base+'/oanda-quotes?symbol=XAU_USD&frame=15',access)).text();
  assert.deepEqual(data.trim().split('\n').map(JSON.parse),[
   {bid:2500,ask:2501,bidSize:2,askSize:2,at:now},{status:'closed'}
  ]);
  assert.ok(!data.includes('upstream-mock'));
  assert.equal((await nativeFetch(base+'/oanda-research?symbol=BTC_USD&frame=15',access)).status,400);
 }finally{await monitor.stop();global.fetch=nativeFetch;Date.now=originalNow}
 console.log('OANDA Practice: same-instrument candles, private live quotes, closed market and private background isolation PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
