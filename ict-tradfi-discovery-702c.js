/* ICT بالعربي 7.0 / 2C — verified Bybit-native TradFi perpetuals discovery.
 * CFD/MT5 instruments are deliberately excluded: V5 market API is not their feed.
 */
(function(root,factory){'use strict';const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.ICTTradFiDiscovery=api})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const REST='https://api.bybit.com/v5/market/instruments-info';
 const GROUPS=Object.freeze({forex:{type:'forex',label:'فوركس (عقود دائمة)'},metals:{type:'commodity',label:'معادن وسلع (عقود دائمة)'},stocks:{type:'stock',label:'أسهم (عقود دائمة)'},etfs:{type:'ETF',label:'صناديق مؤشرات ETF (عقود دائمة)'}});
 const MAX_PAGES=4, LIMIT=1000;
 function clean(x){return String(x||'').trim().toUpperCase().replace(/[^A-Z0-9]/g,'')}
 function validSymbol(x){return /^[A-Z0-9]{4,25}$/.test(x)}
 function parseItem(item,group){
  const spec=GROUPS[group];if(!spec||!item||item.status!=='Trading'||item.symbolType!==spec.type)return null;
  const symbol=clean(item.symbol);if(!validSymbol(symbol)||!['USDT','USDC'].includes(String(item.settleCoin||'')))return null;
  // Do not silently equate underlying spot/CFD prices to a Bybit perpetual price.
  return Object.freeze({symbol,group,kind:'Bybit TradFi perpetual',source:'Bybit V5 public',category:'linear',symbolType:item.symbolType,
    underlying:String(item.underlyingTicker||'').trim(),title:String(item.displayName||item.fullName||item.symbol),marketRegion:String(item.marketRegion||'')});
 }
 function parsePage(payload,group){if(!GROUPS[group])throw Error('UNKNOWN_MARKET');if(!payload||payload.retCode!==0||!Array.isArray(payload.result?.list))throw Error('INVALID_BYBIT_CATALOG');return {
  items:payload.result.list.map(x=>parseItem(x,group)).filter(Boolean),cursor:String(payload.result.nextPageCursor||'')};}
 async function discover(group,options){options=options||{};const spec=GROUPS[group];if(!spec)throw Error('UNKNOWN_MARKET');const http=options.fetch||fetch;let cursor='',pages=0,all=[],seen=new Set();
  do{const url=new URL(REST);url.searchParams.set('category','linear');url.searchParams.set('symbolType',spec.type);url.searchParams.set('limit',String(LIMIT));if(cursor)url.searchParams.set('cursor',cursor);
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),Math.min(18000,Math.max(1000,options.timeout||12000)));
   let data;try{const res=await http(url.toString(),{method:'GET',cache:'no-store',signal:controller.signal});if(!res.ok)throw Error('CATALOG_HTTP_'+res.status);data=await res.json()}finally{clearTimeout(timer)}
   const p=parsePage(data,group);for(const entry of p.items)if(!seen.has(entry.symbol)){seen.add(entry.symbol);all.push(entry)}
   pages++;if(p.cursor===cursor)break;cursor=p.cursor;
  }while(cursor&&pages<MAX_PAGES);
  return {group,items:all.sort((a,b)=>a.symbol.localeCompare(b.symbol)),pages,truncated:!!cursor,at:new Date().toISOString()};
 }
 function filter(catalog,query){const q=clean(query);return (catalog?.items||[]).filter(x=>!q||x.symbol.includes(q)||clean(x.title).includes(q)||clean(x.underlying).includes(q)).slice(0,150)}
 return Object.freeze({REST,GROUPS,MAX_PAGES,parseItem,parsePage,discover,filter,clean});
});
