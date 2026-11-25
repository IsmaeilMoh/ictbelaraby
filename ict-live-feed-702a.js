/* ICT بالعربي 7.0 / Stage 2A. Public Bybit V5 candle connector.
 * Transport stays in the visitor's browser. No private tokens, no trade execution.
 */
(function(root,factory){
 'use strict'; const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ICTLiveFeed=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const VERSION='7.0-2A', REST='https://api.bybit.com/v5/market/kline', WS='wss://stream.bybit.com/v5/public/linear';
 const SYMBOLS=Object.freeze(['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT']);
 const INTERVALS=Object.freeze({'1':60000,'5':300000,'15':900000,'60':3600000,'240':14400000,D:86400000});
 const instruments=new Map();
 let catalogRequest=null;
 const catalogUrl='https://api.bybit.com/v5/market/instruments-info';
 function contract(symbol){
  return instruments.get(symbol)||(SYMBOLS.includes(symbol)?{symbol,category:'linear',settleCoin:'USDT'}:null);
 }
 async function readPerpetuals(fetchImpl,signal){
  const category='linear';
  const contracts=[],seen=new Set();
  let cursor='';
  do{
   const url=new URL(catalogUrl);
   url.search=new URLSearchParams({category,status:'Trading',limit:'1000'});
   if(cursor)url.searchParams.set('cursor',cursor);
   const response=await fetchImpl(url.toString(),{cache:'no-store',signal});
   if(!response.ok)throw Error('BYBIT_HTTP_'+response.status);
   const data=await response.json(),result=data?.result;
   if(data?.retCode!==0||result?.category!==category||!Array.isArray(result.list))throw Error('BYBIT_CATALOG_INVALID');
   for(const item of result.list){
    if(item?.status!=='Trading'||item.contractType!=='LinearPerpetual'||item.isPreListing===true||
       !['','innovation'].includes(item.symbolType??'')||!/^[A-Z0-9]{1,31}USDT$/.test(item.symbol??'')||
       item.settleCoin!=='USDT'||item.quoteCoin!=='USDT')continue;
    contracts.push(Object.freeze({symbol:item.symbol,category,settleCoin:item.settleCoin}));
   }
   cursor=result.nextPageCursor||'';
   if(typeof cursor!=='string'||seen.has(cursor)||seen.size>=24)throw Error('BYBIT_CATALOG_CURSOR_INVALID');
   if(cursor)seen.add(cursor);
  }while(cursor);
  return contracts;
 }
 function fetchPerpetuals(fetchImpl=globalThis.fetch){
  if(catalogRequest)return catalogRequest;
  const signal=AbortSignal.timeout(12000);
  catalogRequest=readPerpetuals(fetchImpl,signal)
   .then(contracts=>{
    const next=new Map();
    for(const item of contracts){
     if(next.has(item.symbol))throw Error('BYBIT_CATALOG_DUPLICATE');
     next.set(item.symbol,item);
    }
    if(!next.size)throw Error('BYBIT_CATALOG_EMPTY');
    instruments.clear();
    for(const [symbol,item] of next)instruments.set(symbol,item);
    return [...next.values()].sort((a,b)=>a.symbol.localeCompare(b.symbol));
   }).finally(()=>{catalogRequest=null});
  return catalogRequest;
 }
 function checkPair(symbol,interval){
  const sym=String(symbol||'').toUpperCase(),tf=String(interval||''),info=contract(sym);
  if(!info)throw Error('UNSUPPORTED_SYMBOL');
  if(!Object.hasOwn(INTERVALS,tf))throw Error('UNSUPPORTED_INTERVAL');
  return {...info,interval:tf,ms:INTERVALS[tf]};
 }
 function n(v){if(v===undefined||v===null||v==='')return null;const x=Number(v);return Number.isFinite(x)?x:null}
 function parseRow(row,pair,kind){
  if(!Array.isArray(row)&&(!row||typeof row!=='object'))throw Error('INVALID_CANDLE_ROW');
  const o=Array.isArray(row)?{start:row[0],open:row[1],high:row[2],low:row[3],close:row[4],volume:row[5],turnover:row[6]}:row;
  const start=n(o.start),open=n(o.open),high=n(o.high),low=n(o.low),close=n(o.close),volume=n(o.volume),turnover=n(o.turnover);
  if(!Number.isSafeInteger(start)||start<100000000000||![open,high,low,close].every(x=>x!==null&&x>0)||high<Math.max(open,close,low)||low>Math.min(open,close,high)||volume===null||volume<0||turnover!==null&&turnover<0)throw Error('INVALID_CANDLE_VALUES');
  return {symbol:pair.symbol,interval:pair.interval,start,at:new Date(start).toISOString(),open,high,low,close,volume,turnover,confirmed:kind==='rest'?false:!!o.confirm,source:'Bybit V5 public',market:pair.category,receivedAt:new Date().toISOString()};
 }
 function parseHistory(payload,symbol,interval,now){const pair=checkPair(symbol,interval);now=now||Date.now();
  if(!payload||payload.retCode!==0||!Array.isArray(payload.result?.list))throw Error('BYBIT_REST_INVALID_RESPONSE');
  if((payload.result.symbol&&payload.result.symbol!==pair.symbol)||(payload.result.category&&payload.result.category!==pair.category))throw Error('BYBIT_SYMBOL_MISMATCH');
  const providerTime=n(payload.time);
  const closeCutoff=providerTime===null?now:Math.min(now,providerTime);
  const array=payload.result.list.map(r=>parseRow(r,pair,'rest')).sort((a,b)=>a.start-b.start);const out=[];
  for(const c of array){if(out.length&&out[out.length-1].start===c.start)continue;if(out.length&&c.start<out[out.length-1].start)throw Error('CANDLE_ORDER');
   if(c.start>now+60000)throw Error('FUTURE_CANDLE');
   // REST includes the active candle: only mark completed if its time window has ended.
   c.confirmed=closeCutoff>=c.start+pair.ms;out.push(c);
  }
  if(!out.length)throw Error('NO_CANDLES');return out;
 }
 function parseStream(message,symbol,interval){const pair=checkPair(symbol,interval);
  if(!message||message.topic!==`kline.${pair.interval}.${pair.symbol}`||!Array.isArray(message.data))return [];
  return message.data.map(x=>parseRow(x,pair,'stream'));
 }
 function merge(history,incoming,limit){const map=new Map();for(const c of history||[])map.set(c.start,c);for(const c of incoming||[]){const old=map.get(c.start);if(!old||!old.confirmed||c.confirmed)map.set(c.start,c)}
  const result=[...map.values()].sort((a,b)=>a.start-b.start);return result.slice(-Math.max(1,Math.min(1000,limit||200)));
 }
 async function fetchHistory(options){options=options||{};const p=checkPair(options.symbol,options.interval),limit=Math.min(Math.max(Number(options.limit)||160,1),1000);
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(Math.max(options.timeout||9500,1000),20000));
  try{const u=new URL(REST);u.searchParams.set('category',p.category);u.searchParams.set('symbol',p.symbol);u.searchParams.set('interval',p.interval);u.searchParams.set('limit',String(limit));
   const res=await (options.fetch||fetch)(u.toString(),{method:'GET',cache:'no-store',headers:{Accept:'application/json'},signal:controller.signal});
   if(!res.ok)throw Error('BYBIT_HTTP_'+res.status);const data=await res.json();
   if(data.retCode!==0)throw Error('BYBIT_CODE_'+String(data.retCode));return parseHistory(data,p.symbol,p.interval,options.now||Date.now());
  }finally{clearTimeout(timer)}
 }
 function parseBook(payload,symbol,now=Date.now()){
  const market=payload?.result;
  if(payload?.retCode!==0||market?.s!==symbol)throw Error('BYBIT_ORDERBOOK_IDENTITY');
  const at=market.cts??market.ts,bid=Number(market.b?.[0]?.[0]),ask=Number(market.a?.[0]?.[0]);
  if(!Number.isSafeInteger(at)||at>now||now-at>15000||!Number.isFinite(bid)||!Number.isFinite(ask)||bid<=0||bid>=ask)throw Error('BYBIT_ORDERBOOK_STALE_OR_INVALID');
  return {at,bid,ask};
 }
 async function fetchBook(symbol,fetchImpl=globalThis.fetch){
  const pair=checkPair(symbol,'5');
  const url=new URL('/v5/market/orderbook',REST);
  url.searchParams.set('category',pair.category);
  url.searchParams.set('symbol',pair.symbol);
  url.searchParams.set('limit','1');
  const response=await fetchImpl(url.toString(),{cache:'no-store',signal:AbortSignal.timeout(5000)});
  if(!response.ok)throw Error('BYBIT_HTTP_'+response.status);
  return parseBook(await response.json(),pair.symbol);
 }
 function connect(options){options=options||{};const pair=checkPair(options.symbol,options.interval);const events=options.onEvent||(()=>{});
  const Socket=options.WebSocket||globalThis.WebSocket;if(typeof Socket!=='function')throw Error('WEBSOCKET_UNAVAILABLE');
  let socket=null,closed=false,retry=0,timer=null,lastMessage=0;
  function notify(type,extra){if(!closed)events(Object.assign({type,at:new Date().toISOString()},extra||{}))}
  function start(){if(closed)return;notify('connecting',{attempt:retry+1});try{
    socket=new Socket(WS.replace(/linear$/,pair.category));
    socket.onopen=()=>{retry=0;lastMessage=Date.now();socket.send(JSON.stringify({op:'subscribe',args:[`kline.${pair.interval}.${pair.symbol}`]}));notify('connected')};
    socket.onmessage=e=>{let m;try{m=JSON.parse(e.data)}catch(_){return}lastMessage=Date.now();if(m.op==='subscribe'){if(m.success===false)notify('error',{message:'تعذر الاشتراك في قناة الشموع'});return}
      try{const candles=parseStream(m,pair.symbol,pair.interval);if(candles.length)notify('candles',{candles})}catch(error){notify('error',{message:'بيانات شموع غير صالحة: '+error.message})}};
    socket.onerror=()=>notify('error',{message:'تعذر الاتصال بخادم Bybit من هذا المتصفح'});
    socket.onclose=()=>{if(closed)return;notify('disconnected');retry++;timer=setTimeout(start,Math.min(30000,1000*2**Math.min(retry,5)))};
  }catch(error){notify('error',{message:error.message});retry++;timer=setTimeout(start,Math.min(30000,1000*2**Math.min(retry,5)))}}
  start();return {close(){closed=true;clearTimeout(timer);if(socket){socket.onclose=null;socket.close()}},lastMessageAt(){return lastMessage}};
 }
 return Object.freeze({VERSION,REST,WS,SYMBOLS,INTERVALS,contract,fetchPerpetuals,checkPair,parseRow,parseHistory,parseStream,merge,fetchHistory,fetchBook,parseBook,connect});
});
