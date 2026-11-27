/* Shared instrument universe for tools using the same Bybit and Biquote feeds. */
(()=>{'use strict';
 const labels=Object.freeze({
  crypto:'عقود Bybit الدائمة USDT',
  forex:'الفوركس الرئيسي والثانوي',
  metals:'المعادن',
  indices:'المؤشرات',
  stocks:'الأسهم',
  energy:'الطاقة'
 });
 const bybit=window.ICTLiveFeed, traditional=window.ICTPublicMarkets;
 if(!bybit||!traditional)return;
 let crypto=[...bybit.SYMBOLS], cryptoRequest, traditionalRequest;
 const list=market=>market==='crypto'?crypto:traditional.listed(market).map(([symbol])=>symbol);
 function loadCrypto(){
  return cryptoRequest??=bybit.fetchPerpetuals().then(contracts=>{
   crypto=contracts.map(({symbol})=>symbol);
   return contracts;
  }).catch(error=>{cryptoRequest=null;throw error});
 }
 function loadTraditional(){
  return traditionalRequest??=traditional.loadCatalog().catch(error=>{traditionalRequest=null;throw error});
 }
 function options(marketSelect,markets=Object.keys(labels)){
  const preferred=marketSelect.value;
  marketSelect.replaceChildren(...markets.map(market=>new Option(labels[market],market)));
  if(markets.includes(preferred))marketSelect.value=preferred;
 }
 function load(market){
  return (market==='crypto'?loadCrypto():loadTraditional()).then(result=>market==='crypto'||result[market].length>0);
 }
 function marketUrl(market,symbol){
  return 'decision-center.html?'+new URLSearchParams({market,symbol});
 }
 window.ICTMarketCatalog=Object.freeze({labels,list,load,loadCrypto,loadTraditional,options,marketUrl});

 // These selectors consume the same venue identities. Archive-only selectors and
 // TradingView watchlists have their own coverage and are intentionally separate.
 const pairs=[
  ['ict-live-symbol','crypto'],['ict-usd-symbol','ict-usd-group',true],
  ...['ict-2d','ict-2e','ict-3a','ict-3b','ict-3c','vc','case','cm','m3','a4','ict-rp','ict6a','ict6b','ict6c']
   .map(prefix=>[prefix+'-symbol',prefix+'-market'])
 ];
 const byMarket=new Map(pairs.map(pair=>[pair[1],pair]));
 const bySymbol=new Map(pairs.map(pair=>[pair[0],pair]));
 const notices=new WeakMap();
 function display(select,market){
  if(select.disabled)return;
  const symbols=list(market),selected=select.value;
  if(symbols.length===select.options.length&&symbols.every((symbol,i)=>symbol===select.options[i].value))return;
  select.replaceChildren(...symbols.map(symbol=>new Option(symbol,symbol)));
  if(symbols.includes(selected))select.value=selected;
 }
 function refresh(pair){
  if(!pair)return;
  const [symbolId,marketId,traditionalOnly]=pair;
  const symbol=document.getElementById(symbolId);
  if(!symbol||symbol.disabled)return;
  const marketSelect=document.getElementById(marketId);
  if(marketSelect&&!marketSelect.dataset.sharedCatalog){
   options(marketSelect,Object.keys(labels).filter(key=>!traditionalOnly||key!=='crypto'));
   marketSelect.dataset.sharedCatalog='true';
  }
  const market=marketSelect?.value||marketId;
  if(!Object.hasOwn(labels,market))return;
  display(symbol,market);
  const before=notices.get(symbol);
  if(before?.market===market)return;
  const label=symbol.closest('label');
  const notice=before?.element||document.createElement('small');
  notice.setAttribute('role','status');
  if(!before)label?.append(notice);
  const state={market,element:notice};
  notices.set(symbol,state);
  notice.textContent='جارٍ تحديث قائمة الأصول…';
  load(market).then(full=>{
   if(notices.get(symbol)!==state||!symbol.isConnected)return;
   display(symbol,market);
   notice.textContent=full?'':'تظهر قائمة الأصول الأساسية لهذه الفئة.';
  }).catch(()=>{
   if(notices.get(symbol)!==state||!symbol.isConnected)return;
   notice.textContent='تعذّر تحديث الدليل؛ تظهر القائمة الأساسية.';
   notices.set(symbol,{element:notice});
  });
 }
 document.addEventListener('focusin',event=>refresh(bySymbol.get(event.target.id)||byMarket.get(event.target.id)));
 document.addEventListener('change',event=>refresh(byMarket.get(event.target.id)));
})();

(()=>{'use strict';
 const catalog=window.ICTMarketCatalog;
 const host=document.getElementById('asset-app');
 if(!catalog||!host||document.body.dataset.asset!=='catalog')return;
 const section=document.createElement('section');
 section.className='asset-hero';
 section.id='scan-assets';
 section.innerHTML='<h2>أصول مركز الفرص</h2><p>قائمة الفحص بحسب السوق والمزوّد. افتح أي أصل لنقله إلى مركز الفرص.</p><label>السوق <select class="asset-search"></select></label><label>بحث بالرمز <input class="asset-search" type="search" autocomplete="off"></label><p role="status"></p><div class="asset-grid"></div><button class="asset-btn" type="button" hidden>عرض المزيد من الأصول</button>';
 host.after(section);
 const market=section.querySelector('select'), search=section.querySelector('input'), status=section.querySelector('[role=status]'), results=section.querySelector('.asset-grid');
 const more=section.querySelector('button');
 const pageSize=50;
 let limit=pageSize;
 catalog.options(market);
 const normalize=value=>value.toUpperCase().replace(/[\s/]/g,'');
 function render(){
  const term=normalize(search.value.trim());
  const rows=catalog.list(market.value).filter(symbol=>normalize(symbol).includes(term));
  more.hidden=rows.length<=limit;
  results.replaceChildren(...rows.slice(0,limit).map(symbol=>{
   const link=document.createElement('a');
   link.className='asset-tile';
   link.href=catalog.marketUrl(market.value,symbol);
   const code=document.createElement('strong');
   code.dir='ltr';
   code.textContent=symbol;
   link.append(code);
   return link;
  }));
  if(!rows.length)results.textContent='لا توجد أصول تطابق البحث.';
 }
 async function refresh(){
  const requested=market.value;
  render();
  status.textContent='جارٍ تحديث قائمة الأصول…';
  try{
   const full=await catalog.load(requested);
   if(market.value!==requested)return;
   render();
   status.textContent=catalog.list(requested).length+' أصلًا · '+(full?'قائمة المزوّد':'القائمة الأساسية');
  }catch{
   if(market.value===requested)status.textContent='تعذّر تحديث الدليل؛ تظهر القائمة الأساسية.';
  }
 }
 market.addEventListener('change',()=>{limit=pageSize;refresh()});
 search.addEventListener('input',()=>{limit=pageSize;render()});
 more.addEventListener('click',()=>{limit+=pageSize;render()});
 refresh();
})();
