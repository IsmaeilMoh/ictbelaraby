'use strict';
const assert=require('node:assert/strict');
const source=require('../ict-public-markets-702c2.js');
assert.deepEqual(source.tradingViewLink('crypto','BTCUSDT','15'),{
 url:'https://www.tradingview.com/chart/?symbol=BYBIT%3ABTCUSDT.P&interval=15',ticker:'BYBIT:BTCUSDT.P'
});
assert.equal(source.tradingViewLink('metals','XAUUSD','60').ticker,'FOREXCOM:XAUUSD');
assert.equal(source.tradingViewLink('stocks','THYAO','15').url,'https://www.tradingview.com/symbols/THYAO/');
assert.equal(source.tradingViewLink('stocks','../bad','15'),null);
const bybit=require('./ict-live-feed-702a.js');
const now=Date.parse('2026-11-24T12:42:00Z');
const ms=900000,start=Math.floor(now/ms)*ms-35*ms;
const bars=Array.from({length:36},(_,i)=>({openTime:new Date(start+i*ms).toISOString(),open:1.08,high:1.10,low:1.07,close:1.09,isOpen:i===35}));
const ins=source.resolve('forex','EURUSD');
const payload={symbol:'EURUSD',interval:'15m',bars};
const parsed=source.parse(payload,ins,'15min',now);
assert.equal(parsed.length,36);
assert.equal(parsed[0].confirmed,true);
assert.equal(parsed.at(-1).confirmed,false);
assert.throws(()=>source.parse({...payload,symbol:'XAUUSD'},ins,'15min',now),/لا يطابق/);
assert.throws(()=>source.parse({...payload,interval:'5m'},ins,'15min',now),/لا يطابق/);
assert.throws(()=>source.parse({...payload,bars:[bars[0],bars[0]]},ins,'15min',now),/مكررة/);
const tick={symbol:'EURUSD',bid:1.08,ask:1.09,timestamp:new Date(now).toISOString(),marketState:'open',stale:false,quoteAgeSeconds:0};
assert.deepEqual(source.parseQuote(tick,ins,now),{bid:1.08,ask:1.09,at:now});
for(const change of [{stale:true},{quoteAgeSeconds:16},{marketState:'closed'},{bid:1.10},{symbol:'XAUUSD'}]){
 assert.equal(source.parseQuote({...tick,...change},ins,now),null);
}
assert.equal(source.parseQuote(tick,ins,now+15001),null);
assert.equal(source.parseQuote(tick,ins,now-1),null);
assert.equal(source.resolve('metals','XAUUSD').quote,'USD');
assert.equal(source.resolve('indices','NAS100').providerSymbol,'USTEC');
assert.equal(source.resolve('energy','USOIL').providerSymbol,'USOIL');
assert.equal(source.resolve('energy','UKOIL').providerSymbol,'UKOIL');
const b=bybit.parseHistory({retCode:0,result:{symbol:'BTCUSDT',list:[
 [start+34*ms,'100','103','99','102','25','20'],[start+33*ms,'100','104','98','101','30','20']
]}},'BTCUSDT','15',now);
assert.equal(b.length,2);assert.equal(b[0].confirmed,true);

(async()=>{
 const metadata=[
  {name:'EURJPY',type:'Forex',source:'MT5'},
  {name:'EURUSD',type:'forex',source:'MT5'},
  {name:'USDTRY',type:'Forex',source:'MT5'},
  {name:'EURSEK',type:'Forex',source:'MT5'},
  {name:'CHFCHF',type:'Forex',source:'MT5'},
  {name:'USTEC',type:'Index',source:'MT5'},
  {name:'XCUUSD',type:'Commodity',source:'MT5'},
  {name:'THYAO',type:'Stock',source:'MATRIKS'},
  {name:'BTCUSD',type:'Crypto',source:'MT5'},
  {name:'../bad',type:'Stock',source:'MT5'}
 ];
 const catalog=await source.loadCatalog(asyncOptions());
 assert.deepEqual(catalog.forex,[['EURJPY','EURJPY'],['EURUSD','EURUSD']]);
 assert.deepEqual(catalog.indices,[['NAS100','USTEC']]);
 assert.deepEqual(catalog.metals,[['XCUUSD','XCUUSD']]);
 assert.deepEqual(catalog.stocks,[['THYAO','THYAO']]);
 assert.equal(source.resolve('forex','EURJPY').quote,'JPY');
 assert.equal(source.resolve('stocks','THYAO').quote,null);
 assert.throws(()=>source.resolve('forex','BTCUSD'));
 assert.throws(()=>source.parseCatalog([]));
 function asyncOptions(){return {fetch:async url=>{
  assert.equal(url,'https://biquote.io/api/symbols?quotedWithinDays=7');
  return {ok:true,json:async()=>metadata};
 }}}
 const mockFetch=async(url,opts)=>{
  assert.equal(opts.headers.Authorization,undefined);
  assert.equal(opts.cache,'no-store');
  if(url==='https://biquote.io/api/EURUSD?allowStale=false')return {ok:true,json:async()=>tick};
  assert.equal(url,'https://biquote.io/api/EURUSD/ohlc?interval=15m&limit=1000');
  return {ok:true,json:async()=>payload};
 };
 assert.deepEqual(await source.get(ins,'15min',{fetch:mockFetch,now,limit:2000}),parsed);
 assert.deepEqual(await source.getQuote(ins,{fetch:mockFetch,now}),source.parseQuote(tick,ins,now));
 await assert.rejects(source.get(ins,'15min',{fetch:async()=>({ok:false,status:503})}),/503/);
 console.log('Biquote candle identity, quote freshness, request routing and outage: PASS');

 const live=require('../ict-live-feed-702a.js');
 const stream=require('../ict-entry-stream.js');
 const sample=(symbol,extra={})=>({symbol,contractType:'LinearPerpetual',settleCoin:'USDT',quoteCoin:'USDT',status:'Trading',...extra});
 const requests=[];
 const items=await live.fetchPerpetuals(async request=>{
  const url=new URL(request);
  assert.equal(url.searchParams.get('category'),'linear');
  const cursor=url.searchParams.get('cursor');
  requests.push(cursor);
  const list=cursor?[sample('SOLUSDT')]:[
   sample('NEWUSDT'),sample('BTCPERP',{settleCoin:'USDC',quoteCoin:'USDC'}),
   sample('BTCUSD',{contractType:'InversePerpetual',quoteCoin:'USD',settleCoin:'BTC'}),
   sample('AAPLUSDT',{symbolType:'stock'}),sample('DATEDUSDT',{contractType:'LinearFutures'}),
   sample('PREUSDT',{isPreListing:true}),sample('BADUSDT',{quoteCoin:'USDC'})
  ];
  return {ok:true,json:async()=>({retCode:0,result:{category:'linear',list,nextPageCursor:cursor?'':'next'}})};
 });
 assert.deepEqual(items.map(item=>item.symbol),['NEWUSDT','SOLUSDT']);
 assert.deepEqual(requests,[null,'next']);
 assert.equal(stream.subscription('crypto','NEWUSDT',live.contract('NEWUSDT')).url,'wss://stream.bybit.com/v5/public/linear');
 for(const symbol of ['BTCPERP','BTCUSD','AAPLUSDT','BADUSDT'])assert.equal(live.contract(symbol),null);
 await assert.rejects(live.fetchPerpetuals(async()=>({ok:false,status:403})),/403/);
 assert.equal(live.contract('NEWUSDT').settleCoin,'USDT');
 const turnover=await live.fetchTurnover24h(async request=>{
  const url=new URL(request);
  assert.equal(url.pathname,'/v5/market/tickers');
  assert.equal(url.search,'?category=linear');
  return {ok:true,json:async()=>({retCode:0,result:{category:'linear',list:[
   {symbol:'NEWUSDT',turnover24h:'29',volume24h:'9000'},
   {symbol:'SOLUSDT',turnover24h:'100',volume24h:'1'},
   {symbol:'BTCUSDT',turnover24h:' '},
   {symbol:'ETHUSDT',turnover24h:'0'},
   {symbol:'AAPLUSDT',turnover24h:'5000'}
  ]}})};
 });
 assert.deepEqual(live.rankByTurnover(['BTCUSDT','NEWUSDT','SOLUSDT','ETHUSDT'],turnover),
  ['SOLUSDT','NEWUSDT','ETHUSDT','BTCUSDT']);
 assert.equal(turnover.has('AAPLUSDT'),false);
 await assert.rejects(live.fetchTurnover24h(async()=>({ok:false,status:403})),/403/);
 await assert.rejects(live.fetchTurnover24h(async()=>({ok:true,json:async()=>({retCode:0,result:{category:'spot',list:[]}})})),/TICKERS_INVALID/);
 console.log('Bybit catalog pagination, USDT-only and product isolation: PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
