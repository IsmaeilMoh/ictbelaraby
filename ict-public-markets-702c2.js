/* Traditional-market candles from the private OANDA Practice connector. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.ICTPublicMarkets=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(root){
 'use strict';
 const MARKETS=Object.freeze({
  forex:[['EURUSD','EUR_USD'],['GBPUSD','GBP_USD'],['USDJPY','USD_JPY'],['AUDUSD','AUD_USD'],['NZDUSD','NZD_USD'],['USDCHF','USD_CHF'],['USDCAD','USD_CAD']],
  metals:[['XAUUSD','XAU_USD'],['XAGUSD','XAG_USD']],
  indices:[['NAS100','NAS100_USD'],['US500','SPX500_USD'],['US30','US30_USD']],
  stocks:[],
  energy:[['USOIL','WTICO_USD'],['UKOIL','BCO_USD']]
 });
 const PUBLIC_QUOTES=Object.freeze({
  metals:{XAUUSD:'OANDA:XAUUSD',XAGUSD:'OANDA:XAGUSD'},
  forex:Object.fromEntries(['EURUSD','GBPUSD','USDJPY','AUDUSD','NZDUSD','USDCHF','USDCAD'].map(pair=>[pair,'FX:'+pair])),
  indices:{NAS100:'FOREXCOM:NSXUSD',US500:'FOREXCOM:SPXUSD',US30:'FOREXCOM:DJI'},
  stocks:{AAPL:'NASDAQ:AAPL',TSLA:'NASDAQ:TSLA',NVDA:'NASDAQ:NVDA',MSFT:'NASDAQ:MSFT',NFLX:'NASDAQ:NFLX'},
  energy:{USOIL:'TVC:USOIL',UKOIL:'TVC:UKOIL'}
 });
 const FRAMES=Object.freeze({'1min':'1','5min':'5','15min':'15','1h':'60','4h':'240','1day':'1440'});
 const SOURCE='OANDA Practice · شموع المنتصف';
 const KEY='ict-oanda-research-key-v1';
 function resolve(group,symbol){
  const found=MARKETS[group]?.find(row=>row[0]===symbol);
  if(!found)throw Error('هذه الأداة غير متاحة من OANDA Practice');
  return {symbol,providerSymbol:found[1],group,quote:found[1].split('_')[1],source:SOURCE};
 }
 function serviceAddress(){return root.localStorage?.getItem('ict-background-service-url-v1')||'';}
 function sessionKey(address=serviceAddress()){
  if(!address||address!==root.sessionStorage?.getItem(KEY+'-service'))return '';
  return root.sessionStorage.getItem(KEY)||'';
 }
 function saveKey(key){
  const address=serviceAddress();
  if(key&&address){
   root.sessionStorage?.setItem(KEY+'-service',address);
   root.sessionStorage?.setItem(KEY,key);
  }else{
   root.sessionStorage?.removeItem(KEY+'-service');
   root.sessionStorage?.removeItem(KEY);
  }
 }
 function endpoint(path,symbol,frame){
  const saved=serviceAddress();
  if(!saved)throw Error('احفظ عنوان خدمة المراقبة في مركز الفرص لتفعيل OANDA Practice');
  const base=new URL(saved);
  if(base.username||base.password||base.search||base.hash||
    (base.protocol!=='https:'&&!(base.protocol==='http:'&&['localhost','127.0.0.1'].includes(base.hostname))))throw Error('عنوان خدمة المراقبة غير صالح');
  const url=new URL(base.href.replace(/\/$/,'')+path);
  url.searchParams.set('symbol',symbol);
  url.searchParams.set('frame',frame);
  return url;
 }
 async function get(instrument,frame,opts={}){
  if(!Object.hasOwn(FRAMES,frame))throw Error('إطار غير مدعوم');
  const key=sessionKey();
  if(!key)throw Error('أدخل مفتاح خدمة OANDA في إعداد خدمة الشموع الخاصة في صفحة موثوقية البيانات');
  const url=endpoint('/oanda-candles',instrument.providerSymbol,FRAMES[frame]);
  const response=await (opts.fetch||root.fetch)(url,{headers:{Authorization:'Bearer '+key},cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error(response.status===401?'مفتاح خدمة OANDA غير صالح':'بيانات OANDA Practice غير متاحة للأداة المختارة');
  const data=await response.json();
  if(data?.schema!=='ict-oanda-candles/1'||data.symbol!==instrument.providerSymbol||data.frame!==FRAMES[frame]||!Array.isArray(data.bars))throw Error('استجابة OANDA لا تطابق الأداة أو الإطار');
  return data.bars.slice(-Math.min(250,Math.max(25,Number(opts.limit)||150))).map(bar=>({
   ...bar,source:SOURCE,symbol:instrument.symbol,providerSymbol:instrument.providerSymbol,interval:frame,market:instrument.group,quoteCurrency:instrument.quote
  }));
 }
 return Object.freeze({MARKETS,PUBLIC_QUOTES,FRAMES,SOURCE,resolve,get,sessionKey,saveKey,endpoint});
});
