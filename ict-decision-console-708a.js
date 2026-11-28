/* ICT بالعربي 8A — user-invoked multi-market decision research center */
(function(){'use strict';const root=document.getElementById('ict-decision-8a');if(!root)return;
const $=id=>document.getElementById(id),marketSelect=$('dc-market'),symbol=$('dc-symbol'),frame=$('dc-frame'),modelType=$('dc-model-type'),modelPhase=$('dc-model-phase'),roll=$('dc-roll'),run=$('dc-run'),monitor=$('dc-monitor'),status=$('dc-status'),output=$('dc-output'),archive=$('dc-archive');
const api=window.ICTDecisionEngine708A,live=window.ICTLiveFeed,structure=window.ICTStructureEngine,signal=window.ICTSignalEngine,context=window.ICTContextEngine,scenario=window.ICTScenarioEngine,econ=window.ICTEconomicLink706A;
const catalog=window.ICTMarketCatalog;
const traditional=window.ICTPublicMarkets, bybitCatalog=$('dc-bybit-catalog');
const selectedMarket=()=>marketSelect.value;
const entryFrames=['5','15','60','240'];
const traditionalStatus=$('dc-traditional-status');
function displayTraditionalCatalog(preselected){
 const market=selectedMarket();
 if(market==='crypto')return;
 const items=traditional.listed(market).map(([symbol])=>symbol);
 selectOptions(symbol,[...items,'all'],preselected??symbol.value);
 if(!items.includes(symbol.value)&&symbol.value!=='all')symbol.value=items[0]||'';
}
async function loadTraditionalCatalog(preselected){
 const requestedMarket=selectedMarket();
 traditionalStatus.textContent='جارٍ تحديث دليل Biquote…';
 try{
  const expanded=await catalog.loadTraditional();
  const market=selectedMarket();
  if(market!==requestedMarket)return;
  const old=symbol.value;
  if(!busy)displayTraditionalCatalog(preselected&&old===traditional.MARKETS[market][0]?.[0]?preselected:old);
  if(old!==symbol.value)selectionChanged();
  traditionalStatus.textContent=expanded[market].length
   ? expanded[market].length+' أصلًا في دليل Biquote بأسعار مسجلة خلال آخر 7 أيام.'
   : 'لم يُرجع دليل Biquote أصولًا حديثة لهذه الفئة. تظهر القائمة الأساسية.';
 }catch{
  if(selectedMarket()===requestedMarket)traditionalStatus.textContent='تعذر تحديث دليل Biquote. تظهر القائمة الأساسية.';
 }
}
const cancelBatch=$('dc-cancel-batch');
let batchController=null;
const bybitSearch=$('dc-bybit-search'),bybitStatus=$('dc-bybit-status');
let crypto=[...live.SYMBOLS],catalogLoaded=false,catalogLoading=false;
const STORAGE='ict-8a-observation-archive-v1';let active=false,busy=false,timer=null,expiry=null,quoteExpiry=null,cardQuoteExpiry=null,generation=0;
const streamEngine=window.ICTEntryStream,streamPanel=$('dc-live-entry'),streamPrice=$('dc-live-entry-price'),
 streamStatus=$('dc-live-entry-status'),streamEvents=$('dc-live-entry-events');
let stream=null;
const reported=new Set();
function closeStream(message){
 if(stream)stream.close();
 stream=null;
 if(streamPrice)streamPrice.textContent='';
 if(message&&streamStatus)streamStatus.textContent=message;
}
function showReferenceQuotes(res){
 if(!streamPanel||!active||document.hidden)return;
 streamPanel.hidden=false;
 $('dc-live-entry-title').textContent='متابعة أسعار Biquote المرجعية';
 const instrument=traditional.resolve(res.market,res.symbol);
 const controller=new AbortController();
 let pending,expires;
 stream={close(){controller.abort();clearTimeout(pending);clearTimeout(expires)}};
 const label='Biquote · تحديث دوري للأسعار المرجعية أثناء فتح الصفحة.';
 const unavailable='Biquote · تعذر التحقق من Bid/Ask حديث للسوق المختار.';
 streamStatus.textContent=label;
 async function refresh(){
  const quote=await traditional.getQuote(instrument,{signal:controller.signal}).catch(()=>null);
  if(controller.signal.aborted)return;
  clearTimeout(expires);
  res.updateCardQuotes(quote);
  streamStatus.textContent=quote?label:unavailable;
  streamPrice.textContent=quote?res.symbol+' · Bid '+money(quote.bid)+' | Ask '+money(quote.ask)+' · '+new Date(quote.at).toISOString():'';
  if(quote)expires=setTimeout(()=>{
   streamPrice.textContent='';
   streamStatus.textContent=unavailable;
  },Math.max(0,quote.at+15000-Date.now()));
  pending=setTimeout(refresh,5000);
 }
 refresh();
}
function showEntryStream(res,news){
 if(!streamPanel||!streamEngine||!streamEngine.subscription(res.market,res.symbol,live.contract(res.symbol))||document.hidden){
  if(streamPanel)streamPanel.hidden=true;
  return;
 }
 streamPanel.hidden=false;
 $('dc-live-entry-title').textContent='مراقبة شرط الدخول لحظيًا';
 const keyFor=plan=>[res.market,res.symbol,res.frame,plan.id].join(':');
 const plans=res.opportunities.filter(plan=>api.qualifiesFocused(plan)&&!reported.has(keyFor(plan)));
 if(!(res.entryFreshUntil>res.checkedAt)){
  closeStream('الشمعة المطلوبة غير حديثة؛ أعد الفحص قبل بدء تنبيه الدخول.');
  return;
 }
 const watch=streamEngine.watch(plans,{observedAt:res.checkedAt,until:res.entryFreshUntil,allowed:now=>
  econ.scheduleCovers(news.parts||[],now)&&!api.nearNews(news.events,res.market,res.symbol,now).length
 });
 let lastPaint=0;
 const ready=plans.length?plans.length+' خطة تستوفي شروط المراقبة اللحظية.':'لا توجد خطة مستوفية لتنبيه الدخول في هذا الفحص.';
 const feedLabel='الأسعار العام';
 streamStatus.textContent='جارٍ الاتصال بتدفق '+feedLabel+'. '+ready;
 try{
  const callbacks={
   failed(reason){
    watch.pause();
    res.updateCardQuotes(null);
    closeStream(reason==='closed'?'الأداة غير قابلة للتداول حاليًا؛ توقفت التنبيهات.':reason==='wide'?'السبريد واسع؛ توقفت التنبيهات حتى فحص جديد.':
     'انقطع التدفق أو فقد حداثته؛ توقفت التنبيهات حتى فحص جديد.');
   },
   quote(quote,now){
    if(document.hidden||now>=res.entryFreshUntil){
     res.updateCardQuotes(null);
     closeStream('توقفت مراقبة الدخول؛ يلزم فحص جديد.');
     return;
    }
    if(now-lastPaint>=250){
     lastPaint=now;
     res.updateCardQuotes(quote);
     streamPrice.textContent=res.symbol+' · Bid '+money(quote.bid)+' | Ask '+money(quote.ask)+' · '+new Date(quote.at).toISOString();
    }
    const message='تدفق '+feedLabel+' متصل. '+ready+' القراءة مرجعية ولا تؤكد تنفيذ أمر.';
    if(streamStatus.textContent!==message)streamStatus.textContent=message;
    for(const event of watch.push(quote,now)){
     const key=keyFor(event.plan);
     if(reported.has(key))continue;
     reported.add(key);
     if(reported.size>500)reported.delete(reported.values().next().value);
     if(event.kind==='entry')root.dispatchEvent(new CustomEvent('ict:live-entry',{detail:{
      plan:{...event.plan,market:res.market,symbol:res.symbol,frame:res.frame},
      observedAt:now,quote:event.quote,source:res.source
     }}));
     const label=event.kind==='entry'?'تنبيه بحثي: تحقق شرط سعر الدخول':
      event.kind==='invalidated'?'أُلغي النموذج عند رصد تجاوز الوقف':'لم يمكن تأكيد عبور الدخول؛ أعد الفحص';
     const row=document.createElement('li');
     row.textContent=[label,res.symbol,res.frame+' د',event.plan.side,'السعر '+money(event.price),
      'الدخول '+money(event.plan.entry),'الوقف '+money(event.plan.stop),'الهدف '+money(event.plan.target),
      new Date(event.quote.at).toISOString()].join(' · ');
     streamEvents.prepend(row);
     if(streamEvents.children.length>6)streamEvents.lastElementChild.remove();
    }
   }
  };
  stream=streamEngine.connect(res.market,res.symbol,callbacks,{bybitContract:live.contract(res.symbol)});
  if(!stream)closeStream('التدفق اللحظي غير متاح في هذا المتصفح.');
 }catch{closeStream('تعذّر بدء تدفق الأسعار؛ أعد الفحص لاحقًا.')}
}
function labelTime(ts,zone){return new Intl.DateTimeFormat('ar-EG',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ts))}
function dual(t){return 'نيويورك: '+labelTime(t,'America/New_York')+' | فلسطين: '+labelTime(t,'Asia/Gaza')}
function money(n){return Number.isFinite(n)?n.toLocaleString('en-US',Math.abs(n)<0.01?{maximumSignificantDigits:10}:{maximumFractionDigits:6}):'غير متاح'}
function node(tag,value,parent,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;parent.append(e);return e}
function clear(el){el.replaceChildren()}
function clearScan(){
 clearTimeout(expiry);clearTimeout(quoteExpiry);clearTimeout(cardQuoteExpiry);
 closeStream('أُوقفت مراقبة الأسعار إلى أن يكتمل الفحص.');
 clear(output);
 node('p','ستظهر هنا نتائج الفحص اليدوي.',output);
 root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
}
function setState(v,bad=false){status.textContent=v;status.dataset.bad=bad?'1':'0'}
function selectOptions(select,items,choose){clear(select);for(const item of items){const opt=document.createElement('option');opt.value=item;opt.textContent=item==='all'?(selectedMarket()==='crypto'?'جميع عقود Bybit USDT':'جميع أصول الفئة'):item;select.append(opt)}if(choose&&items.includes(choose))select.value=choose}
function initCatalog(preselected){
 const market=selectedMarket();
 bybitCatalog.hidden=market!=='crypto';
 traditionalStatus.hidden=market==='crypto';
 selectOptions(symbol,market==='crypto'?crypto:[...traditional.listed(market).map(row=>row[0]),'all'],preselected??(market==='crypto'?'BTCUSDT':undefined));
 roll.value='0';
 selectionChanged();
 if(market==='crypto')loadBybitCatalog(preselected);
 else loadTraditionalCatalog(preselected);
}
function displayBybitSymbols(preselected){
 if(selectedMarket()!=='crypto')return;
 const query=bybitSearch.value.trim().toUpperCase();
 const items=crypto.filter(item=>item.includes(query));
 const selection=preselected==='all'&&catalogLoaded||items.includes(preselected)?preselected:items[0];
 selectOptions(symbol,catalogLoaded?['all',...items]:items,selection);
 if(!selection)symbol.value='';
 if(preselected!==symbol.value)selectionChanged();
 bybitStatus.textContent=catalogLoaded?items.length+' عقدًا من '+crypto.length+' في قائمة Bybit لـ USDT':
  catalogLoading?'جارٍ جلب قائمة العقود الدائمة من Bybit…':'تعذّر جلب القائمة الكاملة. تظهر قائمة محدودة. أعد تحميل الصفحة للمحاولة.';
}
async function loadBybitCatalog(preselected){
 if(catalogLoaded||catalogLoading){displayBybitSymbols(symbol.value);return}
 catalogLoading=true;
 displayBybitSymbols(symbol.value);
 const initial=symbol.value;
 try{
  const contracts=await catalog.loadCrypto();
  const preferred=symbol.value===initial?preselected||symbol.value:symbol.value;
  crypto=contracts.map(item=>item.symbol);
  catalogLoaded=true;
  displayBybitSymbols(preferred);
 }catch{
  catalogLoading=false;
  displayBybitSymbols(symbol.value);
 }finally{catalogLoading=false}
}
bybitSearch.addEventListener('input',()=>displayBybitSymbols(symbol.value));

function strip(res){return {market:res.market,symbol:res.symbol,frame:res.frame,checkedAt:res.checkedAt,source:res.source,opportunities:res.opportunities.map(o=>({id:o.id,side:o.side,formedAt:o.formedAt,status:o.status,entry:o.entry,stop:o.stop,target:o.target,blocks:o.blocks})),warnings:res.warnings,blocks:res.blocks}}
function archiveRows(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(x)?x:[]}catch{return []}}
const marketRow=row=>row?.market===selectedMarket()&&(row.market==='crypto'?/^[A-Z0-9]{1,31}USDT$/.test(row.symbol):row.source===traditional.SOURCE);
function saved(){return archiveRows().filter(marketRow).slice(0,30)}
function record(res){try{let arr=saved();arr=arr.filter(x=>!(x.symbol===res.symbol&&x.market===res.market&&x.frame===res.frame&&x.checkedAt===res.checkedAt));arr.unshift(strip(res));localStorage.setItem(STORAGE,JSON.stringify([...arr.slice(0,30),...archiveRows().filter(row=>!marketRow(row))]))}catch{}showArchive()}
function showArchive(){clear(archive);const arr=saved().slice(0,8);if(!arr.length){node('p','لا يوجد سجل فحوص محلي بعد.',archive);return}for(const x of arr){const b=node('div','',archive,'dc-archive-row');node('strong',x.symbol+' · '+x.opportunities.length+' نموذج/فرصة',b);node('small',dual(x.checkedAt)+' · فحص تاريخي محفوظ وليس عرضًا حيًا',b)}}
function block(title,parent=output){const c=document.createElement('section');c.className='dc-card';node('h3',title,c);parent.append(c);return c}
const phases={observed:'مرصودة',awaiting_confirmation:'بانتظار التأكيد',confirmed_research:'مؤكدة بحثيًا',invalidated:'ملغاة',expired:'منتهية الصلاحية'};
const types={SPOT_RESEARCH:'Spot · سوق فوري',SPOT_RESEARCH_PROXY:'Spot · سوق فوري',PERPETUAL:'عقد دائم',PROVIDER_NATIVE:'أداة المزود'};
const modelLabels={composite:'Sweep → MSS → FVG',ifvg:'IFVG','turtle-soup':'Turtle Soup',
 ote:'OTE',amd:'Power of Three (AMD)',breaker:'Breaker Block'};
function matchingModels(plan,bars,index,tf){
 if(plan.modelType)return [{type:plan.modelType,label:modelLabels[plan.modelType],evidence:plan.model}];
 const matches=[{type:'composite',label:modelLabels.composite, evidence:plan.model}];
 const [,mssAt,fvgAt]=plan.modelEvidence;
 const rules=window.ICTModelValidation4C3;
 const gap=index.get(fvgAt),displacement=bars[gap-1];
 if(!rules||!displacement||!['5','15'].includes(tf)||fvgAt<mssAt)return matches;
 const bullish=plan.direction==='bull';
 if(!(bullish?displacement.close>displacement.open:displacement.close<displacement.open))return matches;
 const hour=rules.nyParts(fvgAt).h;
 const lastMinute=fvgAt+structure.FRAME_MS[tf]-1;
 if(rules.RULES.silverBulletWindows.some(([start])=>start===hour)&&
    rules.nyParts(mssAt).h===hour&&rules.nyParts(lastMinute).h===hour){
  matches.push({type:'silver-bullet',label:'Silver Bullet',evidence:'MSS وFVG في نافذة نيويورك '+hour+':00–'+(hour+1)+':00'});
 }
 if(((hour>=3&&hour<5)||(hour>=8&&hour<11))&&rules.nyParts(mssAt).h===hour){
  matches.push({type:'2022',label:'2022 Model · نسخة FVG',evidence:'سحب وMSS وفجوة بإزاحة اتجاهية خلال نافذة لندن أو نيويورك'});
 }
 return matches;
}
function confirmationDistanceLabel(o){
 const distance=o.confirmationDistanceR;
 return Number.isFinite(distance)?'المسافة إلى الدخول عند التأكيد · '+distance.toFixed(2)+'R':null;
}
// White export-size PNG derived from logo-transparent.png, embedded for offline downloads.
const cardLogoData='data:image/png;base64,'+
 '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' +
 'oPw/ZN6rxpger/YAAAAASUVORK5CYII=';
let cardLogoRequest;
function loadCardLogo(){
 return cardLogoRequest??=new Promise((resolve,reject)=>{
  const logo=new Image();
  logo.onload=()=>resolve(logo);
  logo.onerror=()=>{cardLogoRequest=null;reject(Error('Card logo unavailable'));};
  logo.src=cardLogoData;
 });
}
async function saveCardImage(o,source,levelRows,status,evidence){
 const logo=await loadCardLogo();
 const canvas=document.createElement('canvas');
 const ctx=canvas.getContext('2d');
 if(!ctx)throw Error('Canvas unavailable');
 const width=1080, margin=56, contentWidth=width-2*margin;
 const family=getComputedStyle(root).fontFamily;
 const wrap=(text,max)=>{
  const lines=[];
  let line='';
  for(const word of String(text).split(/\s+/)){
   if(line&&ctx.measureText(line+' '+word).width>max){lines.push(line);line=word;}
   else line=line?line+' '+word:word;
  }
  if(line)lines.push(line);
  return lines;
 };
 const groups=[
  ['المصدر والأوقات',[source,'تكوّن النموذج · '+dual(o.formedAt),'وقت الرصد · '+dual(o.detectedAt),
   o.lastCompleteAt?'آخر إغلاق · '+dual(o.lastCompleteAt):null,confirmationDistanceLabel(o)]],
  ['أدلة النموذج',[...(o.modelMatches||[]).map(m=>[m.label,m.evidence].filter(Boolean).join(' · ')),...evidence,...(o.evidence||[])]],
  ['حالة التحقق',o.blocks||[]]
 ];
 ctx.font='25px '+family;
 const details=groups.map(([title,texts])=>[title,texts.filter(Boolean).flatMap(text=>wrap(text,contentWidth-12))])
  .filter(([,lines])=>lines.length);
 canvas.width=width;
 canvas.height=545+details.reduce((sum,[,lines])=>sum+57+lines.length*38,0);
 const bg=ctx.createLinearGradient(0,0,width,canvas.height);
 bg.addColorStop(0,'#213d42');bg.addColorStop(1,'#0c1b24');
 ctx.fillStyle=bg;ctx.fillRect(0,0,width,canvas.height);
 ctx.fillStyle='#86d8b8';ctx.fillRect(width-margin-80,48,80,5);
 const print=(str,x,y,size,color,{bold=false,dir='rtl',max=contentWidth}={})=>{
  ctx.font=(bold?'700 ':'')+size+'px '+family;ctx.fillStyle=color;
  ctx.direction=dir;ctx.textAlign='right';ctx.fillText(str,x,y,max);
 };
 const logoScale=136/Math.max(logo.naturalWidth,logo.naturalHeight);
 ctx.drawImage(logo,margin,56,logo.naturalWidth*logoScale,logo.naturalHeight*logoScale);
 const right=width-margin;
 print('ICT بالعربي  ·  مركز فرص التداول الذكي',right,99,30,'#a4dfcd',{bold:true});
 print(o.symbol,right,178,64,'#f2fcfa',{bold:true,dir:'ltr'});
 const side=o.side==='BUY'?'شراء':o.side==='SELL'?'بيع':o.side;
 print([side,o.frame+' دقيقة',status].join('  ·  '),right,230,32,'#d6e9e9',{bold:true});
 const col=(contentWidth-22)/2;
 levelRows.forEach(([label,value],i)=>{
  const x=i%2===0?right-col:margin,y=264+Math.floor(i/2)*100;
  ctx.beginPath();ctx.roundRect(x,y,col,84,14);
  ctx.fillStyle='#29484e';ctx.fill();
  print(label,x+col-22,y+30,22,'#bde3d6',{max:col-44});
  print(value,x+col-22,y+65,31,'#f2fcfa',{bold:true,dir:value==='غير متاح'?'rtl':'ltr',max:col-44});
 });
 let y=495;
 for(const [title,lines] of details){
  print(title,right,y,26,'#9adfc1',{bold:true});
  y+=37;
  for(const line of lines){print(line,right,y,25,'#e4f1ef');y+=38;}
  y+=20;
 }
 print('قراءة بحثية من الشموع · الأسعار مرجعية · لا تصدر المنصة أوامر تداول',right,y,23,'#bde3d6');
 const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
 if(!blob)throw Error('PNG unavailable');
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');
 link.href=url;
 link.download=['ICT',o.symbol,o.frame+'m',o.formedAt].join('-').replace(/[^a-z0-9-]/gi,'-')+'.png';
 document.body.append(link);link.click();link.remove();
 setTimeout(()=>URL.revokeObjectURL(url),60000);
}
const quoteFreshMs=15000;
function freshCardQuote(quote,now){
 return quote&&Number.isSafeInteger(quote.at)&&quote.at<=now&&now-quote.at<quoteFreshMs&&
  Number.isFinite(quote.bid)&&Number.isFinite(quote.ask)&&quote.bid>0&&quote.ask>quote.bid;
}
function writeCardQuote({element,plan,risk},market,quote){
 if(!quote){
  element.textContent='المسافة الحالية إلى الدخول: لا يتوفر سعر حديث.';
  return;
 }
 const buy=plan.side==='BUY';
 const price=buy?quote.ask:quote.bid;
 const distance=Math.abs(price-plan.entry)/risk;
 const relative=price===plan.entry?'عند الدخول':price>plan.entry?'فوق الدخول':'تحت الدخول';
 element.textContent=[
  'المسافة الحالية إلى الدخول · '+distance.toFixed(2)+'R '+relative,
  (buy?'Ask ':'Bid ')+money(price),market==='crypto'?'Bybit':'Biquote',
  new Date(quote.at).toISOString().slice(0,19).replace('T',' ')+' UTC'
 ].join(' · ');
}
function updateCardQuoteRows(rows,market,quote){
 clearTimeout(cardQuoteExpiry);
 const now=Date.now(),fresh=freshCardQuote(quote,now);
 for(const row of rows)writeCardQuote(row,market,fresh?quote:null);
 if(fresh&&rows.length)cardQuoteExpiry=setTimeout(()=>updateCardQuoteRows(rows,market,null),quote.at+quoteFreshMs-now);
}
function fetchCardQuote(market,symbol){
 return market==='crypto'?live.fetchBook(symbol):traditional.getQuote(traditional.resolve(market,symbol));
}
function addBatchQuoteButton(actions,row){
 const button=node('button','تحديث السعر',actions,'secondary');button.type='button';button.dataset.ictIcon='refresh';
 let expiry;
 button.addEventListener('click',async()=>{
  button.disabled=true;
  clearTimeout(expiry);
  row.element.textContent='جارٍ تحديث السعر…';
  const {market,symbol}=row.plan;
  try{
   const quote=await fetchCardQuote(market,symbol);
   const now=Date.now(),fresh=freshCardQuote(quote,now);
   writeCardQuote(row,market,fresh?quote:null);
   if(fresh&&row.element.isConnected)expiry=setTimeout(()=>writeCardQuote(row,market,null),quote.at+quoteFreshMs-now);
  }catch{writeCardQuote(row,market,null);}
  finally{button.disabled=false;}
 });
}
function card(parent,o,origin,{quoteRows,batchQuote=false}={}){
 const status=phases[o.research?.phase]||'رصد بحثي';
 const c=block([o.symbol,o.frame+' د',o.side,status].join(' · '),parent);
 c.classList.add('dc-wide');
 const source=[origin,types[o.marketType],o.source].filter(Boolean).join(' · ');
 node('p',source,c);
 const tradingView=traditional.tradingViewLink(o.market,o.symbol,o.frame);
 if(tradingView){
  const label=tradingView.ticker?'فتح الشارت على TradingView · '+tradingView.ticker:'صفحة الرمز على TradingView · '+o.symbol;
  const row=node('p','',c),link=node('a',label,row);
  link.href=tradingView.url;
  link.target='_blank';
  link.rel='noopener noreferrer';
 }
 node('p','الرصد: '+dual(o.detectedAt)+(o.lastCompleteAt?' | آخر إغلاق: '+dual(o.lastCompleteAt):''),c);
 if(o.research)node('p','وقت الحالة: '+dual(o.research.at)+' | تكوّن: '+dual(o.formedAt),c);
 if(o.research?.phase==='confirmed_research')node('p','تحقق شرط التأكيد في شموع مغلقة. التنفيذ يتطلب تحققًا مستقلًا.',c);
 const risk=Math.abs(o.entry-o.stop);
 const canQuote=(quoteRows||batchQuote)&&Number.isFinite(o.entry)&&o.entry>0&&Number.isFinite(risk)&&risk>0&&['BUY','SELL'].includes(o.side);
 const quoteRow=canQuote?{element:node('p','',c,'dc-muted'),plan:o,risk}:null;
 if(quoteRow&&quoteRows)quoteRows.push(quoteRow);
 if(quoteRow&&batchQuote)quoteRow.element.setAttribute('role','status');
 const confirmationDistance=confirmationDistanceLabel(o);
 if(confirmationDistance)node('p',confirmationDistance,c,'dc-muted');
 const levels=node('div','',c,'dc-levels');
 const levelRows=[[o.modelType==='turtle-soup'?'المستوى المسترد':o.modelType==='ifvg'?'منطقة IFVG':o.modelType==='ote'?'منطقة OTE':o.modelType==='breaker'?'منطقة Breaker':o.modelType==='amd'?'حد التراكم':'منطقة FVG',o.modelType==='turtle-soup'?money(o.entry):o.zone?money(o.zone.low)+' — '+money(o.zone.high):'غير متاحة'],['دخول مرجعي',money(o.entry)],['إبطال/وقف افتراضي',money(o.stop)],[o.liquidity?'هدف السيولة · '+o.rr.toFixed(2)+'R':'هدف مرجعي',money(o.target)]];
 for(const [name,value] of levelRows){
  const el=node('div','',levels);node('small',name,el);node('strong',value,el);
 }

 if(o.stopLiquidity)node('p',
  (o.side==='BUY'?'الوقف أسفل ':'الوقف أعلى ')+(o.stopLiquidity.type==='sweep'?'ذيل سحب السيولة':o.side==='BUY'?'قاع مؤكّد':'قمة مؤكّدة')+
  ' · '+money(o.stopLiquidity.level)+' · '+dual(o.stopLiquidity.at),c);
 if(o.liquidity)node('p',
  (o.side==='BUY'?'سيولة فوق قمة مؤكدة':'سيولة تحت قاع مؤكد')+' · '+(o.liquidity.frame==='D'?'يومي':o.liquidity.frame+' د')+
   ' · '+dual(o.liquidity.at)+' | منتصف النطاق '+money(o.midpoint),c);
 if(o.dealingRange)node('p',(o.modelType==='turtle-soup'?'نطاق السحب إلى MSS ':o.modelType==='ifvg'?'نطاق انقلاب الفجوة ':'نطاق حركة السحب والإزاحة ')+money(o.dealingRange.low)+' — '+money(o.dealingRange.high)+' · إغلاق MSS '+dual(o.dealingRange.displacementAt+structure.FRAME_MS[o.frame]),c);
 if(o.interveningLiquidity)node('p','سيولة أقرب قبل الهدف: '+money(o.interveningLiquidity.level)+' · '+o.interveningLiquidity.rr.toFixed(2)+'R',c);
 const evidence=(o.modelEvidence||[]).map((at,i)=>Number.isFinite(at)?['سحب السيولة','MSS',o.modelType==='ifvg'?'الفجوة الأصلية':'FVG'][i]+' · '+dual(at):null).filter(Boolean);
 if(evidence.length)node('p',evidence.join(' | '),c);
 if(o.modelMatches?.length){
  node('h4','النماذج المطابقة',c);
  const list=document.createElement('ul');c.append(list);
  for(const match of o.modelMatches)node('li',[match.label,match.evidence].filter(Boolean).join(' · '),list);
 }
 if(o.evidence?.length){node('h4','أدلة السياق الأعلى',c);const ul=document.createElement('ul');c.append(ul);o.evidence.forEach(s=>node('li',s,ul))}
 const list=document.createElement('ul');
 c.append(list);
 for(const text of [...(o.blocks||[]),...(o.waiting||[])])node('li',text,list);
 const actions=node('div','',c,'dc-actions');
 if(quoteRow&&batchQuote)addBatchQuoteButton(actions,quoteRow);
 const save=node('button','حفظ البطاقة كصورة',actions,'secondary');save.type='button';save.dataset.ictIcon='install';
 const feedback=node('p','',actions,'dc-muted');feedback.setAttribute('role','status');
 save.addEventListener('click',async()=>{
  save.disabled=true;feedback.textContent='';
  try{
   await saveCardImage(o,source,levelRows,status,evidence);
   feedback.textContent='تم تجهيز صورة البطاقة للتنزيل.';
  }catch{feedback.textContent='تعذر حفظ الصورة. جرّب مرة أخرى.';}
  finally{save.disabled=false;}
 });
 return c;
}
const backgroundOutput=$('dc-background-output');
let backgroundTimer;
root.addEventListener('ict:background-scanned',e=>{
 clearTimeout(backgroundTimer);
 clear(backgroundOutput);
 const {entries,message}=e.detail;
 if(!entries.length){
  const empty=block('المراقبة المجدولة',backgroundOutput);empty.classList.add('dc-wide');
  node('p',message,empty);
  return;
 }
 for(const o of entries)card(backgroundOutput,o,'مراقبة مجدولة');
 const expires=Math.min(...entries.map(o=>o.lastCompleteAt+3*Number(o.frame)*60000));
 backgroundTimer=setTimeout(()=>root.dispatchEvent(new CustomEvent('ict:background-scanned',{detail:{
  entries:entries.filter(o=>Date.now()<o.lastCompleteAt+3*Number(o.frame)*60000),
  message:'انتهت حداثة الشموع المعروضة؛ بانتظار تقرير جديد.'
 }})),Math.max(0,expires-Date.now()));
});
function show(res){
 clear(output);
 if(!res.opportunities.length){
  const empty=block('لا توجد نتائج مطابقة');empty.classList.add('dc-wide');
  node('p',modelPhase.value||modelType.value?'لم يُرصد نموذج حديث يطابق نوع النموذج والحالة المختارين.':'لم يُرصد نموذج حديث ضمن الشموع التي فُحصت.',empty);

 }
 const info=block('حالة الفحص ومصادره');info.classList.add('dc-wide');node('p','الأصل: '+res.symbol+' | المصدر: '+res.source+' | إطار الدخول '+res.frame+' دقائق | الشموع المستخدمة: '+res.sourceBars,info);node('p','وقت الفحص: '+dual(res.checkedAt)+' | آخر إغلاق لإطار الفرصة: '+(res.lastCompleteAt?dual(res.lastCompleteAt):'غير متاح'),info);
 const quote=node('p','Bid/Ask حديث غير متاح لهذه القراءة. مستويات الفرصة مرجعية.',info);
 if(res.book&&res.book.at<=res.checkedAt&&res.checkedAt-res.book.at<=15000){
  quote.textContent=(res.market==='crypto'?'دفتر Bybit العام':'تسعير Biquote المرجعي')+' · Bid '+money(res.book.bid)+' | Ask '+money(res.book.ask)+' | '+dual(res.book.at);
  quoteExpiry=setTimeout(()=>{quote.textContent='انتهت حداثة قراءة Bid/Ask؛ أعد الفحص للحصول على تسعير جديد.'},Math.max(0,res.book.at+15000-Date.now()));
 }
node('p','آخر إغلاق ساعة مرجعي: '+(res.price==null?'غير متاح':money(res.price))+' | '+(res.priceAt?dual(res.priceAt+3600000):'بيانات الساعة متأخرة'),info);
 const ctx=block('السياق بنيويورك');const day=res.context?.previousDay||{};node('p','PDH: '+money(day.high)+' | PDL: '+money(day.low),ctx);const weekly=res.context?.priorWeek||res.providerWeek;
 node('p',weekly?'PWH: '+money(weekly.high)+' | PWL: '+money(weekly.low):'بيانات الأسبوع السابق غير كافية لحساب PWH/PWL',ctx);
 if(!res.context?.priorWeek&&res.providerWeek)node('p','مرجع الأسبوع السابق من الشموع اليومية لـ '+(res.market==='crypto'?'Bybit':'Biquote')+' بتواريخ UTC · '+res.providerWeek.key,ctx);
 node('p','نظام اليوم: '+(res.context?.sourceDay||'غير متاح'),ctx);
 const safety=block('بوابات جودة البيانات والأخبار');const checks=[...res.blocks,...res.warnings];node('p',checks.length?'ملاحظات توقف اعتماد الخطة أو تحد من الوثوق:':'الفحوص العامة متاحة؛ كل نموذج يخضع أيضًا لشروطه الخاصة.',safety);if(checks.length){const ul=document.createElement('ul');safety.append(ul);checks.forEach(x=>node('li',x,ul))}if(res.nearbyNews.length){const ul=document.createElement('ul');safety.append(ul);res.nearbyNews.forEach(x=>node('li',x.title+' · '+dual(x.when),ul))}
 const quoteRows=[];
 for(const o of res.opportunities)card(output,{
  ...o,frame:res.frame,source:res.source,marketType:res.market==='crypto'?'PERPETUAL':'PROVIDER_NATIVE',
  detectedAt:res.checkedAt,lastCompleteAt:res.lastCompleteAt
 },'فحص يدوي',{quoteRows});
 res.updateCardQuotes=quote=>updateCardQuoteRows(quoteRows,res.market,quote);
 res.updateCardQuotes(res.book);
 const note=block('حدود هذا الإصدار');note.classList.add('dc-wide');node('p',res.disclaimer,note);node('p','لا يتم تداول آلي ولا حفظ توصية كصفقة منفذة. المراقبة اليدوية المتكررة تعمل أثناء فتح الصفحة. سعر المرجع آخر إغلاق شمعة، وليس Bid/Ask مباشرًا.',note);
}
async function loadNews(signal){
 try{
  const timeout=AbortSignal.timeout(12000);
  const fetchSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  const news=await econ.loadEvents((url,options={})=>fetch(url,{...options,signal:fetchSignal}));
  if(!Array.isArray(news?.events))throw Error('استجابة غير صالحة');
  return news;
 }catch(error){
  return {events:[],feedsLoaded:0,failures:['تعذّر التحقق من الأخبار: '+error.message]};
 }
}
async function getCandles(market,contract,tf,signal,requests=new Map(),weeklyReference=false){
 const higher=api.contextFrame(tf);
 const instrument=market==='crypto'?null:traditional.resolve(market,contract);
 const history=(interval,limit)=>instrument?traditional.get(instrument,traditional.FRAME_BY_MINUTES[interval],{limit,signal}):live.fetchHistory({symbol:contract,interval,limit,signal});
 const cached=(interval,limit)=>{
  if(!requests.has(interval))requests.set(interval,history(interval,interval==='240'?250:limit));
  return requests.get(interval);
 };
 const hourlyRequest=cached('60',1000);
 const [hourly,entryBars,higherCandles,weeklyDaily]=await Promise.all([
  hourlyRequest.catch(()=>[]),tf==='60'?hourlyRequest:cached(tf,250),
  (higher==='60'?hourlyRequest:cached(higher,120)).catch(()=>[]),
  weeklyReference?cached('D',higher==='D'?120:15).catch(()=>[]):[]
 ]);
 return {hourly,entryBars,higherCandles,weeklyDaily};
}
function inspectContract(market,contract,tf,{entryBars,hourly,higherCandles,weeklyDaily},news,batch=false){
 const now=Date.now();
 const res=api.inspect({market,symbol:contract,frame:tf,candles15:entryBars,candles60:hourly,higherCandles,
  rollHour:Number(roll.value),displayCompleteModels:true,includeTurtleSoup:true,includeIfvg:true,newsChecked:news.feedsLoaded>0,
  newsCovered:econ.scheduleCovers(news.parts||[],now),eventFeedsLoaded:news.feedsLoaded,events:news.events,now,
  structureEngine:structure,signalEngine:signal,contextEngine:context,scenarioEngine:scenario,advancedEngine:window.ICTAdvancedValidation4C4});
 if(weeklyDaily?.length&&!res.context?.priorWeek)res.providerWeek=context.priorProviderWeek(weeklyDaily,now,market);
 if(news.failures?.length)res.warnings.push('تعذر تحميل بعض الأجندات: '+news.failures.join('؛ '));
 if(modelPhase.value)res.opportunities=res.opportunities.filter(plan=>plan.research?.phase===modelPhase.value);
 if(res.opportunities.length){
  const bars=structure.normalize(entryBars,tf,now).segments.at(-1)||[];
  const index=new Map(bars.map((bar,i)=>[bar.start,i]));
  for(const plan of res.opportunities){
   plan.modelMatches=matchingModels(plan,bars,index,tf);
   if(plan.research?.phase!=='confirmed_research')continue;
   const candle=bars[index.get(plan.research.at-structure.FRAME_MS[tf])];
   const risk=Math.abs(plan.entry-plan.stop);
   if(candle&&risk>0)plan.confirmationDistanceR=Math.abs(candle.close-plan.entry)/risk;
  }
  if(modelType.value)res.opportunities=res.opportunities.filter(plan=>plan.modelMatches.some(match=>match.type===modelType.value));
 }
 if(batch)for(const plan of res.opportunities)plan.blocks.push('الفحص الجماعي بحثي؛ افحص الأصل منفردًا للتحقق من قراءة Bid/Ask ومتابعة السعر.');
 return res;
}
function cancelGroupedScan(){batchController?.abort()}
async function scanBatch(){
 const market=selectedMarket(),isCrypto=market==='crypto';
 const allAssets=symbol.value==='all';
 if(busy||(isCrypto&&allAssets&&!catalogLoaded)||!symbol.value)return;
 const assets=allAssets?(isCrypto?[...crypto]:traditional.listed(market).map(([symbol])=>symbol)):[symbol.value];
 const frames=frame.value==='all'?entryFrames:[frame.value];
 const total=assets.length*frames.length,id=++generation;
 const venue=isCrypto?'Bybit':'Biquote';
 const controller=new AbortController(),{signal}=controller;
 batchController=controller;
 busy=true;
 run.disabled=true;
 cancelBatch.hidden=false;
 clearScan();
 clear(output);
 const results=block('نتائج الفحص الجماعي',output);
 node('p',modelType.selectedOptions[0].textContent+' · حالة النموذج: '+(phases[modelPhase.value]||'جميع الحالات')+' · اختر أصلًا منفردًا لمتابعة سعره.',results);
 const filterControls=node('div','',results);
 filterControls.hidden=true;
 const filters=node('div','',filterControls,'dc-form dc-result-filters');
 filters.setAttribute('role','group');
 filters.setAttribute('aria-label','فلترة نتائج الفحص الجماعي');
 const addFilter=(label,all,options)=>{
  const select=node('select','',node('label',label,filters));
  select.setAttribute('aria-label',label);
  node('option',all,select).value='';
  for(const option of options)node('option',option.textContent,select).value=option.value;
  return select;
 };
 const phaseFilter=addFilter('الحالة','جميع الحالات',[...modelPhase.options].filter(o=>o.value));
 const frameFilter=addFilter('إطار الدخول','كل الأطر الزمنية',[...frame.options].filter(o=>frames.includes(o.value)));
 const typeFilter=addFilter('نوع النموذج','جميع النماذج',[...modelType.options].filter(o=>o.value));
 const filterStatus=node('p','',filterControls,'dc-muted');
 filterStatus.setAttribute('role','status');
 const cards=[];
 const matchesFilter=item=>(!phaseFilter.value||item.phase===phaseFilter.value)&&
  (!frameFilter.value||item.frame===frameFilter.value)&&
  (!typeFilter.value||item.types.includes(typeFilter.value));
 const updateFilterStatus=visible=>{
  filterStatus.textContent=visible?'عرض '+visible+' من '+cards.length+' نموذج':'لا توجد نتائج تطابق الفلاتر المحددة.';
 };
 let visibleCards=0;
 filters.addEventListener('change',()=>{
  visibleCards=0;
  for(const item of cards){
   item.element.hidden=!matchesFilter(item);
   if(!item.element.hidden)visibleCards++;
  }
  updateFilterStatus(visibleCards);
 });
 let checked=0,failed=0,models=0,halted=false;
 const matched=new Set();
 const stopPattern=isCrypto?/^BYBIT_(?:HTTP_(?:403|429|451)|CODE_(?:10006|429))$/:/^Biquote: HTTP (?:403|429|451)$/;
 try{
  setState('جارٍ تحميل الأجندة للفحص الجماعي…');
  const news=await loadNews(signal);
  for(const asset of assets){
   const requests=new Map();
   for(const tf of frames){
    if(signal.aborted)break;
    setState('جارٍ فحص '+asset+' · '+tf+' د · '+(checked+failed+1)+' من '+total);
    try{
     const data=await getCandles(market,asset,tf,signal,requests);
     if(signal.aborted)break;
     const res=inspectContract(market,asset,tf,data,news,true);
     checked++;
     if(res.opportunities.length){
      matched.add(asset);
      models+=res.opportunities.length;
      for(const opportunity of res.opportunities){
       const element=card(results,{
        ...opportunity,frame:tf,source:res.source,marketType:isCrypto?'PERPETUAL':'PROVIDER_NATIVE',detectedAt:res.checkedAt,lastCompleteAt:res.lastCompleteAt
       },'فحص جماعي',{batchQuote:true});
       const item={element,phase:opportunity.research?.phase,frame:tf,types:opportunity.modelMatches.map(match=>match.type)};
       cards.push(item);
       element.hidden=!matchesFilter(item);
       if(!element.hidden)visibleCards++;
      }
      filterControls.hidden=false;
      updateFilterStatus(visibleCards);
     }
    }catch(error){
     if(signal.aborted)break;
     failed++;
     if(stopPattern.test(error.message)){halted=true;break}
    }
   }
   if(halted||signal.aborted)break;
   if(checked+failed<total)await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(id===generation){
   if(!models)node('p',checked?'لم يُرصد نموذج مطابق في الأصول التي اكتمل فحصها.':'لم يكتمل فحص أي أصل.',results);
   setState((halted?'توقف الفحص بسبب رفض '+venue+' أو حدود الطلبات. ':signal.aborted?'أُوقف الفحص. ':'انتهى الفحص. ')+
    'تم فحص '+checked+' من '+total+' (أصل × إطار) · أصول مطابقة '+matched.size+' · نماذج '+models+
    ' · تعذّر '+failed+' · لم تُفحص '+(total-checked-failed),halted||failed>0);
  }
 }finally{
  batchController=null;
  busy=false;
  if(selectedMarket()!=='crypto')displayTraditionalCatalog();
  cancelBatch.hidden=true;
  run.disabled=!symbol.value;
 }
}
async function scan(auto=false){if(busy||(symbol.value==='all'||frame.value==='all')||auto&&document.hidden)return;if(!api||!live||!structure||!signal||!context||!scenario||!econ){setState('تعذّر تحميل أدوات فحص السوق. حدّث الصفحة وحاول مجددًا.',true);return}if(!symbol.value){setState('اختر أصلًا متاحًا.',true);return}
 const id=++generation,selection=[symbol.value,frame.value,roll.value].join('|');busy=true;run.disabled=true;clearScan();setState('جارٍ جلب شموع إطار التداول والسياق، وفحص الأجندة، ثم ربط الأدلة…');
 try{
  const contract=symbol.value,market=selectedMarket();
  const bookRequest=fetchCardQuote(market,contract);
  const [data,news,book]=await Promise.all([
   getCandles(market,contract,frame.value,undefined,new Map(),true),loadNews(),bookRequest.catch(()=>null)
  ]);
  if(id!==generation||selection!==[symbol.value,frame.value,roll.value].join('|'))return;
  const res=inspectContract(market,contract,frame.value,data,news);
  const {entryBars}=data,now=res.checkedAt;
  res.book=book;
  show(res);record(res);
  if(market==='crypto')showEntryStream(res,news);
  else showReferenceQuotes(res);
  if(res.entryFreshUntil>now)expiry=setTimeout(()=>{
   if(market==='crypto')closeStream('انتهت حداثة شمعة الدخول؛ يلزم فحص جديد.');
   root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
   setState('أصبحت شموع الدخول قديمة؛ النتائج أدناه تخص وقت الفحص. أعد الفحص للتحديث.',true);
  },res.entryFreshUntil-now);
  root.dispatchEvent(new CustomEvent('ict:decision-scanned',{detail:{result:res,bars:entryBars}}));setState(!res.opportunities.length?'اكتمل الفحص دون نماذج مطابقة.':'اكتمل التحليل البحثي. '+res.opportunities.length+' نموذج؛ '+(res.blocks.length?'راجع أسباب تعليق الفرص.':'راجع شروط الفرص.'),res.blocks.length>0);
 }catch(e){if(id!==generation)return;console.warn('Market scan failed',e);clearScan();setState('تعذّر إكمال فحص السوق. تأكد من الاتصال وحاول مجددًا.',true)}finally{busy=false;run.disabled=!symbol.value}
}
function stop(){closeStream('توقفت مراقبة الأسعار.');active=false;if(timer)clearInterval(timer);timer=null;monitor.textContent='تشغيل المراقبة أثناء فتح الصفحة';monitor.setAttribute('aria-pressed','false')}
function selectionChanged(){
 generation++;
 cancelGroupedScan();
 stop();
 showArchive();
 clearScan();
 if(streamPanel){streamPanel.hidden=true;streamEvents.replaceChildren()}
 run.disabled=!symbol.value||busy;
 monitor.disabled=!symbol.value||symbol.value==='all'||frame.value==='all';
 setState(symbol.value==='all'?(selectedMarket()==='crypto'?'الفحص الجماعي يشمل جميع العقود المتاحة، حتى عند استخدام البحث.':'الفحص الجماعي يشمل جميع أصول الفئة المختارة.'):'اختر الأصل واضغط فحص السوق.');
}
marketSelect.addEventListener('change',()=>initCatalog());
for(const field of [frame,symbol,modelType,modelPhase,roll])field.addEventListener('change',selectionChanged);
run.addEventListener('click',()=>symbol.value==='all'||frame.value==='all'?scanBatch():scan(false));
cancelBatch.addEventListener('click',cancelGroupedScan);
monitor.addEventListener('click',()=>{if(active){stop();return}active=true;monitor.textContent='إيقاف المراقبة';monitor.setAttribute('aria-pressed','true');scan(false);timer=setInterval(()=>scan(true),60000)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('pagehide',()=>{stop();cancelGroupedScan()});
const advanced=$('dc-advanced');
const advancedStatus=$('dc-advanced-loading');
const advancedRetry=$('dc-advanced-retry');
const advancedButtons=['dc-audit-run','dc-exec-check-quote'].map($);
const advancedScripts=new Map();
function loadAdvancedScript(src){
 if(advancedScripts.has(src))return advancedScripts.get(src);
 const script=document.createElement('script');
 script.src=src;
 const load=new Promise((resolve,reject)=>{
  script.onload=resolve;
  script.onerror=()=>{advancedScripts.delete(src);script.remove();reject(Error('تعذر تحميل أداة الفحص'))};
 });
 advancedScripts.set(src,load);
 document.head.append(script);
 return load;
}
let advancedBusy=false,advancedReady=false;
async function loadAdvanced(){
 if(!advanced.open||advancedBusy||advancedReady)return;
 advancedBusy=true;
 advancedRetry.hidden=true;
 advancedStatus.textContent='جارٍ تحميل أدوات الفحص المتقدمة…';
 try{
  await Promise.all([
   loadAdvancedScript('ict-readiness-core-708c.js?v=7.0.22').then(()=>loadAdvancedScript('ict-readiness-console-708c.js?v=7.0.23-research')),
   loadAdvancedScript('ict-execution-safety-708c5.js?v=7.0.23-research')
  ]);
  advancedReady=true;
  advancedButtons.forEach(button=>{button.disabled=false});
  advancedStatus.textContent='';
 }catch{
  advancedStatus.textContent='تعذر تحميل أدوات الفحص المتقدمة. تحقق من اتصالك ثم أعد المحاولة.';
  advancedRetry.hidden=false;
 }finally{advancedBusy=false}
}
advanced.addEventListener('toggle',loadAdvanced);
advancedRetry.addEventListener('click',loadAdvanced);
root.addEventListener('ict:decision-scanned',e=>{
 const scan=e.detail?.result;
 if(scan)$('dc-audit-lastscan').textContent='آخر فحص: '+scan.symbol+'، نماذج: '+scan.opportunities.length+'، موانع عامة: '+scan.blocks.length+' — النتيجة بحثية مشروطة.';
});
function openLinkedDetails(){
 const id=window.location.hash.slice(1);
 const target=$(id);
 if(target&&advanced.contains(target)){
  advanced.open=true;
  target.scrollIntoView();
 }
}
const params=new URLSearchParams(window.location.search);
const requestedMarket=params.get('market');
const requestedSymbol=params.get('symbol');
if(Object.hasOwn(traditional.MARKETS,requestedMarket))marketSelect.value=requestedMarket;
const validSelection=requestedSymbol==='all'||(selectedMarket()==='crypto'?/^[A-Z0-9]{1,31}USDT$/.test(requestedSymbol??''):true);
initCatalog(validSelection?requestedSymbol:undefined);
showArchive();
window.addEventListener('hashchange',openLinkedDetails);
openLinkedDetails();
loadAdvanced();
})();
