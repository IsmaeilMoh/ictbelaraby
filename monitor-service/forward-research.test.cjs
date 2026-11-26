'use strict';
const assert=require('node:assert/strict');
const journal=require('../ict-opportunity-lifecycle-708b.js');
const book=require('../ict-live-feed-702a.js');
const kraken=require('./kraken-perpetual.js');
process.env.ALLOWED_ORIGIN='https://ismaeilmoh.github.io';
const {updateForward,start}=require('./server.js');
const {publicSnapshot}=require('./github-run-once.cjs');

const ms=300000;
const now=Date.parse('2026-11-25T12:00:00Z');
const target={id:'kraken:PF_XBTUSD:5',market:'kraken',symbol:'PF_XBTUSD',tf:'5'};
const bar=(start,low,high,open=100)=>({start,open,close:open,low,high,confirmed:true});
const candidate={id:target.id+':test',market:target.market,symbol:target.symbol,frame:'5',
 side:'BUY',entry:100,stop:95,target:110,formedAt:now,research:{phase:'observed',at:now},
 newsGate:{status:'blocked'},hourlyAligned:false,evidence:{sweepAt:now-3*ms,mssAt:now-ms,fvgAt:now-ms}};
const first=updateForward([],target,[bar(now-ms,90,115)],[candidate],now+1000);
assert.equal(first[0].state,'waiting');
assert.equal(first[0].observedAt,now+1000);
assert.equal(first[0].originBlocks.length,3);
assert.equal(updateForward([],target,[bar(now-2*ms,90,115)],[candidate],now+1000).length,0);
const duplicate=updateForward(first,target,[bar(now,90,115)],[candidate],now+ms);
assert.equal(duplicate.length,1);
assert.equal(duplicate[0].state,'waiting'); // bar opened before the scan
const activated=journal.advance(first[0],[bar(now+ms,98,103)],now+2*ms);
assert.equal(activated.state,'active');
assert.equal(journal.advance(activated,[bar(now+2*ms,101,111,103)],now+3*ms).state,'won');
assert.equal(journal.advance(activated,[bar(now+2*ms,93,106)],now+3*ms).state,'lost');
assert.equal(journal.advance(activated,[bar(now+2*ms,94,112)],now+3*ms).state,'ambiguous');
assert.equal(journal.advance(activated,[bar(now+2*ms,90,94,91)],now+3*ms).state,'ambiguous');
assert.equal(journal.advance(first[0],[bar(now+ms,93,98,97)],now+2*ms).state,'invalidated');
assert.equal(journal.advance(first[0],[bar(now+2*ms,98,103)],now+3*ms).state,'gap');
assert.equal(journal.advance(first[0],[bar(now+ms,98,103)],now+ms).state,'waiting');
assert.equal(journal.advance({...first[0],maxBars:1},[bar(now+ms,101,103,102)],now+2*ms).state,'expired');
const trigger=journal.createLiveEntry({...candidate,evidence:[],blocks:[]},now+1200,
 {at:now+1000,bid:99.8,ask:99.9},'Kraken Futures');
assert.equal(trigger.modelId,candidate.id);
assert.notEqual(trigger.key,first[0].key);
assert.equal(trigger.state,'active');
assert.equal(trigger.liveQuote.price,99.9);
assert.equal(journal.advance(trigger,[bar(now,94,102)],now+ms).state,'ambiguous');
assert.equal(journal.advance(trigger,[bar(now,98,102),bar(now+ms,101,111,103)],now+2*ms).state,'won');
assert.equal(journal.advance(trigger,[bar(now+ms,101,111,103)],now+2*ms).state,'gap');
assert.equal(journal.advance(trigger,[bar(now,98,102)],now+ms).barsExamined,0);
assert.throws(()=>journal.createLiveEntry({...candidate,blocks:[]},now+7000,{at:now+1000,bid:99.8,ask:99.9}),/غير صالحة/);
const bybit={id:'crypto:BTCUSDT:5',market:'crypto',symbol:'BTCUSDT',frame:'5',status:'blocked'};
const bybitRecord={...activated,id:bybit.id+':test',market:bybit.market,symbol:bybit.symbol,source:'Bybit V5 USDT perpetual'};
const payload=publicSnapshot({schema:'ict-research-monitor/1',readyForExecution:false,active:true,
 lastCycleAt:new Date(now+2*ms).toISOString(),targets:{[target.id]:{...target,frame:'5',status:'blocked'},[bybit.id]:bybit},
 forward:{[target.id]:[activated],[bybit.id]:[{...bybitRecord,accountName:'private',unexpected:'private'}]}},now+2*ms);
assert.equal(payload.forward.counts.active,1);
assert.equal(payload.forward.records[0].source,'Bybit V5 USDT perpetual');
assert.equal(payload.forward.records[0].accountName,undefined);
assert.equal(payload.forward.records[0].executionApproved,false);
assert.equal(payload.observations.length,0);

const orderbook={retCode:0,result:{s:'BTCUSDT',cts:now,b:[['100']],a:[['101']]}};
assert.deepEqual(book.parseBook(orderbook,'BTCUSDT',now),{at:now,bid:100,ask:101});
assert.throws(()=>book.parseBook(orderbook,'ETHUSDT',now),/IDENTITY/);
assert.throws(()=>book.parseBook(orderbook,'BTCUSDT',now+15001),/STALE/);
assert.throws(()=>book.parseBook(orderbook,'BTCUSDT',now-1),/STALE/);

(async()=>{
 const instruments=new Set([target.symbol]);
 const mock=async url=>{
  assert.equal(new URL(url).searchParams.get('symbol'),target.symbol);
  return {ok:true,json:async()=>({result:'success',history:[{price:100,time:new Date(now).toISOString()}]})};
 };
 assert.deepEqual(await kraken.fetchLastTrade(target.symbol,{instruments,fetchImpl:mock,clock:()=>now}),{at:now,price:100});
 await assert.rejects(()=>kraken.fetchLastTrade(target.symbol,{instruments,fetchImpl:mock,clock:()=>now+15001}),/STALE/);
 const upstream=global.fetch;
 const originalNow=Date.now;
 Date.now=()=>now;
 global.fetch=async input=>{
  const url=new URL(input);
  if(url.pathname.endsWith('/instruments'))return {ok:true,json:async()=>({result:'success',
   instruments:[{symbol:target.symbol,type:'flexible_futures',tradeable:true}]})};
  if(url.pathname.endsWith('/history'))return mock(input);
  assert.match(url.pathname,/PF_XBTUSD/);
  const ms=url.pathname.endsWith('/1h')?3600000:300000;
  return {ok:true,json:async()=>({candles:[{time:now-ms,open:'100',high:'102',low:'99',close:'101'}]})};
 };
 const service=start({noHttp:true,noSchedule:true});
 try{
  await new Promise(resolve=>service.httpServer.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+service.httpServer.address().port+'/market-research';
  const res=await upstream(base+'?symbol=PF_XBTUSD&frame=5',{headers:{Origin:process.env.ALLOWED_ORIGIN}});
  assert.equal(res.status,200);
  assert.equal(res.headers.get('access-control-allow-origin'),process.env.ALLOWED_ORIGIN);
  const view=await res.json();
  assert.equal(view.symbol,target.symbol);
  assert.equal(view.readyForExecution,false);
  assert.equal(view.lastTrade.price,100);
  assert.equal(view.hourly[0].interval,'60');
  assert.equal((await upstream(base+'?symbol=BTCUSDT&frame=5')).status,400);
 }finally{
  await service.stop();
  global.fetch=upstream;
  Date.now=originalNow;
 }
 console.log('Forward research and direct market data: activation, stop, target, ambiguous, expiration, gaps, identity and freshness PASS');
})().catch(error=>{console.error(error);process.exitCode=1});

{
 const {refine}=require('./ifvg-finer-replay.cjs');
 const fine=300000,start=Date.parse('2026-11-25T14:00:00Z');
 const bars=[
  {start,open:101,high:103,low:98,close:99,confirmed:true},
  {start:start+fine,open:99,high:100,low:94,close:96,confirmed:true},
  {start:start+2*fine,open:96,high:111,low:96,close:109,confirmed:true}
 ];
 const parent={start,open:101,high:111,low:94,close:109,confirmed:true};
 const before={side:'BUY',entry:100,stop:95,target:110,formedAt:start,observedAt:start,frame:'15',
  state:'waiting',lastProcessedStart:null,maxBars:24,barsExamined:0,events:[]};
 const item={start,ms:3*fine,frame:'15',parent,before,bars:[parent]};
 const indexed=new Map(bars.map(bar=>[bar.start,bar]));
 assert.equal(refine(item,indexed,'5').state,'lost');
 assert.equal(refine(item,new Map(bars.slice(0,2).map(bar=>[bar.start,bar])),'5').state,'missing');
 assert.equal(refine({...item,parent:{...parent,high:112}},indexed,'5').state,'mismatch');
 const minutes=bars.flatMap(bar=>Array.from({length:5},(_,i)=>({
  ...bar,start:bar.start+i*60000,open:i?bar.close:bar.open
 })));
 const minuteIndex=new Map(minutes.map(bar=>[bar.start,bar]));
 assert.equal(refine(item,minuteIndex,'1').state,'lost');
 minuteIndex.delete(start+60000);
 assert.equal(refine(item,minuteIndex,'1').state,'missing');
}
