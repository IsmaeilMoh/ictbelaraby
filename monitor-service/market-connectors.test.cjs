'use strict';
const assert=require('node:assert/strict');
const source=require('../ict-public-markets-702c2.js')
const {candles}=require('./oanda-practice.js');;
const bybit=require('./ict-live-feed-702a.js');
const now=Date.parse('2026-11-24T12:42:00Z');
const ms=900000,start=Math.floor(now/ms)*ms-35*ms;
const rows=Array.from({length:36},(_,i)=>({time:new Date(start+i*ms).toISOString(),mid:{o:'1.08',h:'1.10',l:'1.07',c:'1.09'},complete:i!==35}));
const ins=source.resolve('forex','EURUSD');
const parsed=candles({instrument:ins.providerSymbol,granularity:'M15',candles:rows},ins.providerSymbol,'15',now);
assert.equal(parsed.length,35);assert.equal(parsed[0].confirmed,true);
assert.throws(()=>candles({instrument:'XAU_USD',granularity:'M15',candles:rows},ins.providerSymbol,'15',now),/IDENTITY/);
assert.throws(()=>candles({instrument:'EUR_USD',granularity:'M15',candles:[rows[0],rows[0]]},ins.providerSymbol,'15',now),/INVALID_CANDLE/);
const daily={instrument:'EUR_USD',granularity:'D',candles:[{...rows[0],time:'2026-03-07T22:00:00Z'}]};
assert.equal(candles(daily,'EUR_USD','1440',Date.parse('2026-03-08T21:00:00Z')).length,1);
assert.throws(()=>candles(daily,'EUR_USD','1440',Date.parse('2026-03-08T20:59:00Z')),/INVALID_CANDLE/);
daily.candles[0].time='2026-10-31T21:00:00Z';
assert.equal(candles(daily,'EUR_USD','1440',Date.parse('2026-11-01T22:00:00Z')).length,1);
const b=bybit.parseHistory({retCode:0,result:{symbol:'BTCUSDT',list:[
 [start+34*ms,'100','103','99','102','25','20'],[start+33*ms,'100','104','98','101','30','20']
]}},'BTCUSDT','15',now);
assert.equal(b.length,2);assert.equal(b[0].confirmed,true);
assert.equal(source.resolve('metals','XAUUSD').quote,'USD');
console.log('Traditional and Bybit candle connector fixtures: PASS');

(async()=>{
 const live=require('../ict-live-feed-702a.js');
 const stream=require('../ict-entry-stream.js');
 const sample=(symbol,contractType,settleCoin,extra={})=>({symbol,contractType,settleCoin,status:'Trading',...extra});
 const requests=[];
 const items=await live.fetchPerpetuals(async request=>{
  const url=new URL(request);
  const category=url.searchParams.get('category'),cursor=url.searchParams.get('cursor');
  requests.push([category,cursor]);
  const list=category==='inverse'?[sample('BTCUSD','InversePerpetual','BTC',{baseCoin:'BTC',quoteCoin:'USD'})]:
   cursor?[sample('BTCPERP','LinearPerpetual','USDC')]:
   [sample('NEWUSDT','LinearPerpetual','USDT'),sample('AAPLUSDT','LinearPerpetual','USDT',{symbolType:'stock'}),
    sample('DATEDUSDT','LinearFutures','USDT'),sample('PREUSDT','LinearPerpetual','USDT',{isPreListing:true})];
  return {ok:true,json:async()=>({retCode:0,result:{category,list,nextPageCursor:category==='linear'&&!cursor?'next':''}})};
 });
 assert.deepEqual(items.map(x=>x.symbol),['BTCPERP','BTCUSD','NEWUSDT']);
 assert.ok(requests.some(([category,cursor])=>category==='linear'&&cursor==='next'));
 const info=live.contract('BTCUSD');
 assert.equal(info.category,'inverse');
 assert.equal(stream.subscription('crypto','BTCUSD',info).url,'wss://stream.bybit.com/v5/public/inverse');
 assert.equal(stream.subscription('crypto','BTCUSD'),null);
 await live.fetchHistory({symbol:'BTCUSD',interval:'15',now,fetch:async request=>{
  assert.equal(new URL(request).searchParams.get('category'),'inverse');
  return {ok:true,json:async()=>({retCode:0,time:now,result:{category:'inverse',symbol:'BTCUSD',list:[[start,'100','103','99','102','25','20']]}})};
 }});
 assert.throws(()=>live.parseHistory({retCode:0,result:{category:'linear',symbol:'BTCUSD',list:[]}},'BTCUSD','15',now),/IDENTITY|MISMATCH/);
 assert.equal(live.contract('AAPLUSDT'),null);
 await assert.rejects(live.fetchPerpetuals(async()=>({ok:false,status:403})),/403/);
 assert.equal(live.contract('BTCUSD').category,'inverse');
 console.log('Bybit perpetual catalog pagination, product filtering and inverse routing: PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
