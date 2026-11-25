/* ICT بالعربي 8A — user-invoked multi-market decision research center */
(function(){'use strict';const root=document.getElementById('ict-decision-8a');if(!root)return;
const $=id=>document.getElementById(id),market='crypto',symbol=$('dc-symbol'),frame=$('dc-frame'),modelType=$('dc-model-type'),modelPhase=$('dc-model-phase'),roll=$('dc-roll'),run=$('dc-run'),monitor=$('dc-monitor'),status=$('dc-status'),output=$('dc-output'),archive=$('dc-archive');
const api=window.ICTDecisionEngine708A,live=window.ICTLiveFeed,structure=window.ICTStructureEngine,signal=window.ICTSignalEngine,context=window.ICTContextEngine,scenario=window.ICTScenarioEngine,econ=window.ICTEconomicLink706A;
const cancelBatch=$('dc-cancel-batch');
let batchController=null;
const bybitSearch=$('dc-bybit-search'),bybitStatus=$('dc-bybit-status');
let crypto=[...live.SYMBOLS],catalogLoaded=false,catalogLoading=false;
const STORAGE='ict-8a-observation-archive-v1';let active=false,busy=false,timer=null,expiry=null,quoteExpiry=null,generation=0;
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
function showEntryStream(res,news){
 if(!streamPanel||!streamEngine||!streamEngine.subscription(res.market,res.symbol,live.contract(res.symbol))||document.hidden){
  if(streamPanel)streamPanel.hidden=true;
  return;
 }
 streamPanel.hidden=false;
 const keyFor=plan=>[res.market,res.symbol,res.frame,plan.id].join(':');
 const plans=res.opportunities.filter(plan=>!plan.blocks.length&&!reported.has(keyFor(plan)));
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
    closeStream(reason==='closed'?'الأداة غير قابلة للتداول حاليًا؛ توقفت التنبيهات.':reason==='wide'?'السبريد واسع؛ توقفت التنبيهات حتى فحص جديد.':
     'انقطع التدفق أو فقد حداثته؛ توقفت التنبيهات حتى فحص جديد.');
   },
   quote(quote,now){
    if(document.hidden||now>=res.entryFreshUntil){
     closeStream('توقفت مراقبة الدخول؛ يلزم فحص جديد.');
     return;
    }
    if(now-lastPaint>=250){
     lastPaint=now;
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
function money(n){return Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:6}):'غير متاح'}
function node(tag,value,parent,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;parent.append(e);return e}
function clear(el){el.replaceChildren()}
function clearScan(){
 clearTimeout(expiry);clearTimeout(quoteExpiry);
 closeStream('أُوقفت مراقبة الأسعار إلى أن يكتمل الفحص.');
 clear(output);
 node('p','ستظهر هنا نتائج الفحص اليدوي.',output);
 root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
}
function setState(v,bad=false){status.textContent=v;status.dataset.bad=bad?'1':'0'}
function selectOptions(select,items,choose){clear(select);for(const item of items){const opt=document.createElement('option');opt.value=item;opt.textContent=item==='all'?'جميع عقود Bybit USDT':item;select.append(opt)}if(choose&&items.includes(choose))select.value=choose}
function initCatalog(preselected){
 selectOptions(symbol,crypto,preselected);
 roll.value='0';
 selectionChanged();
 loadBybitCatalog(preselected);
}
function displayBybitSymbols(preselected){
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
  const contracts=await live.fetchPerpetuals();
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
const bybitRow=row=>row?.market===market&&/^[A-Z0-9]{1,31}USDT$/.test(row.symbol);
function saved(){return archiveRows().filter(bybitRow).slice(0,30)}
function record(res){try{let arr=saved();arr=arr.filter(x=>!(x.symbol===res.symbol&&x.market===res.market&&x.frame===res.frame&&x.checkedAt===res.checkedAt));arr.unshift(strip(res));localStorage.setItem(STORAGE,JSON.stringify([...arr.slice(0,30),...archiveRows().filter(row=>!bybitRow(row))]))}catch{}showArchive()}
function showArchive(){clear(archive);const arr=saved().slice(0,8);if(!arr.length){node('p','لا يوجد سجل فحوص محلي بعد.',archive);return}for(const x of arr){const b=node('div','',archive,'dc-archive-row');node('strong',x.symbol+' · '+x.opportunities.length+' نموذج/فرصة',b);node('small',dual(x.checkedAt)+' · فحص تاريخي محفوظ وليس عرضًا حيًا',b)}}
function block(title,parent=output){const c=document.createElement('section');c.className='dc-card';node('h3',title,c);parent.append(c);return c}
const phases={observed:'مرصودة',awaiting_confirmation:'بانتظار التأكيد',confirmed_research:'مؤكدة بحثيًا',invalidated:'ملغاة',expired:'منتهية الصلاحية'};
const types={SPOT_RESEARCH:'Spot · سوق فوري',SPOT_RESEARCH_PROXY:'Spot · سوق فوري',PERPETUAL:'عقد دائم',PROVIDER_NATIVE:'أداة المزود'};
function matchingModels(plan,bars,index,tf,pivots){
 const matches=[{type:'composite',label:'Sweep → MSS → FVG'}];
 const [sweepAt,mssAt,fvgAt]=plan.modelEvidence;
 const si=index.get(sweepAt),mi=index.get(mssAt);
 const rules=window.ICTModelValidation4C3,advanced=window.ICTAdvancedValidation4C4;
 if(si==null||mi==null||!index.has(fvgAt)||!rules||!advanced)return matches;
 const candidate={direction:plan.direction,sweepAt,mssAt,fvgAt,gapLow:plan.zone.low,gapHigh:plan.zone.high};
 if(rules.silverBulletMatch(candidate)){
  const hour=rules.nyParts(sweepAt).h;
  matches.push({type:'silver-bullet',label:'Silver Bullet',evidence:'نافذة نيويورك '+hour+':00–'+(hour+1)+':00'});
 }
 const displacement=rules.displacementEvidence(candidate,bars,index);
 if(displacement.pass)matches.push({type:'2022',label:'2022 Model',evidence:'شمعة الإزاحة · '+dual(displacement.at)});
 const ote=advanced.oteEntry(candidate,bars,si,mi);
 if(ote!==null)matches.push({type:'ote',label:'OTE',evidence:'تصحيح 70.5% داخل FVG · '+money(ote)});
 const range=advanced.amdRange(candidate,bars,si,tf);
 if(range)matches.push({type:'amd',label:'Power of Three (AMD)',evidence:'نطاق تراكم نيويورك 00–05 · '+money(range.accumulationLow)+' — '+money(range.accumulationHigh)});
 const breaker=advanced.breakerEvidence(candidate,bars,index,pivots);
 if(breaker)matches.push({type:'breaker',label:'Breaker Block',evidence:'الكتلة '+money(breaker.low)+' — '+money(breaker.high)+
  ' · شمعة الكتلة '+dual(breaker.blockAt)+' · الكسر '+dual(breaker.breakAt)+' · إعادة الاختبار '+dual(breaker.retestAt)});
 return matches;
}
function card(parent,o,origin){
 const c=block([o.symbol,o.frame+' د',o.side,phases[o.research?.phase]||'رصد بحثي'].join(' · '),parent);
 c.classList.add('dc-wide');
 node('p',[origin,types[o.marketType],o.source].filter(Boolean).join(' · '),c);
 node('p','الرصد: '+dual(o.detectedAt)+(o.lastCompleteAt?' | آخر إغلاق: '+dual(o.lastCompleteAt):''),c);
 if(o.research)node('p','وقت الحالة: '+dual(o.research.at)+' | تكوّن: '+dual(o.formedAt),c);
 if(o.research?.phase==='confirmed_research')node('p','عاد السعر إلى FVG بعد تكوّن النموذج، وأكّد إغلاق لاحق الاتجاه البحثي. التنفيذ يتطلب تحققًا مستقلًا.',c);
 const levels=node('div','',c,'dc-levels');
 for(const [name,value] of [['منطقة FVG',o.zone?money(o.zone.low)+' — '+money(o.zone.high):'غير متاحة'],['دخول مرجعي',money(o.entry)],['إبطال/وقف افتراضي',money(o.stop)],['هدف 2R افتراضي',money(o.target)]]){
  const el=node('div','',levels);node('small',name,el);node('strong',value,el);
 }
 const evidence=(o.modelEvidence||[]).map((at,i)=>Number.isFinite(at)?['سحب السيولة','MSS','FVG'][i]+' · '+dual(at):null).filter(Boolean);
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
 for(const o of entries)card(backgroundOutput,o,'مراقبة مجدولة · GitHub Actions');
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
  for(const message of res.blocks)node('p',message,empty);
  return;
 }
 const info=block('حالة الفحص ومصادره');info.classList.add('dc-wide');node('p','الأصل: '+res.symbol+' | المصدر: '+res.source+' | إطار الدخول '+res.frame+' دقائق | الشموع المستخدمة: '+res.sourceBars,info);node('p','وقت الفحص: '+dual(res.checkedAt)+' | آخر إغلاق لإطار الفرصة: '+(res.lastCompleteAt?dual(res.lastCompleteAt):'غير متاح'),info);
 const quote=node('p','Bid/Ask حديث غير متاح لهذه القراءة. مستويات الفرصة مرجعية.',info);
 if(res.book&&res.book.at<=res.checkedAt&&res.checkedAt-res.book.at<=15000){
  quote.textContent='دفتر Bybit العام · Bid '+money(res.book.bid)+' | Ask '+money(res.book.ask)+' | '+dual(res.book.at);
  quoteExpiry=setTimeout(()=>{quote.textContent='انتهت حداثة قراءة Bid/Ask؛ أعد الفحص للحصول على تسعير جديد.'},Math.max(0,res.book.at+15000-Date.now()));
 }
node('p','آخر إغلاق ساعة مرجعي: '+(res.price==null?'غير متاح':money(res.price))+' | '+(res.priceAt?dual(res.priceAt+3600000):'بيانات الساعة متأخرة'),info);
 const ctx=block('السياق بنيويورك');const day=res.context.previousDay;node('p','PDH: '+money(day.high)+' | PDL: '+money(day.low),ctx);node('p',res.context.priorWeek?'PWH: '+money(res.context.priorWeek.high)+' | PWL: '+money(res.context.priorWeek.low):'الأسبوع السابق غير مكتمل',ctx);node('p','نظام اليوم: '+res.context.sourceDay,ctx);
 const safety=block('بوابات جودة البيانات والأخبار');const checks=[...res.blocks,...res.warnings];node('p',checks.length?'ملاحظات توقف اعتماد الخطة أو تحد من الوثوق:':'الفحوص العامة متاحة؛ كل نموذج يخضع أيضًا لشروطه الخاصة.',safety);if(checks.length){const ul=document.createElement('ul');safety.append(ul);checks.forEach(x=>node('li',x,ul))}if(res.nearbyNews.length){const ul=document.createElement('ul');safety.append(ul);res.nearbyNews.forEach(x=>node('li',x.title+' · '+dual(x.when),ul))}
 for(const o of res.opportunities.slice(0,8))card(output,{
  ...o,frame:res.frame,source:res.source,marketType:'PERPETUAL',
  detectedAt:res.checkedAt,lastCompleteAt:res.lastCompleteAt
 },'فحص يدوي');
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
async function getCandles(contract,tf,signal){
 const higher=api.contextFrame(tf);
 const history=(interval,limit)=>live.fetchHistory({symbol:contract,interval,limit,signal});
 const hourlyRequest=history('60',1000);
 const [hourly,entryBars,higherCandles]=await Promise.all([
  hourlyRequest,tf==='60'?hourlyRequest:history(tf,250),
  higher==='60'?hourlyRequest:history(higher,120)
 ]);
 return {hourly,entryBars,higherCandles};
}
function inspectContract(contract,tf,{entryBars,hourly,higherCandles},news,batch=false){
 const now=Date.now();
 const res=api.inspect({market,symbol:contract,frame:tf,candles15:entryBars,candles60:hourly,higherCandles,
  rollHour:Number(roll.value),newsChecked:news.feedsLoaded>0,
  newsCovered:econ.scheduleCovers(news.parts||[],now),eventFeedsLoaded:news.feedsLoaded,events:news.events,now,
  structureEngine:structure,signalEngine:signal,contextEngine:context,scenarioEngine:scenario});
 if(news.failures?.length)res.warnings.push('تعذر تحميل بعض الأجندات: '+news.failures.join('؛ '));
 if(modelPhase.value)res.opportunities=res.opportunities.filter(plan=>plan.research?.phase===modelPhase.value);
 if(res.opportunities.length){
  const bars=structure.normalize(entryBars,tf,now).segments.at(-1)||[];
  const index=new Map(bars.map((bar,i)=>[bar.start,i]));
  const pivots=structure.analyze(entryBars,tf,{now}).pivots;
  for(const plan of res.opportunities)plan.modelMatches=matchingModels(plan,bars,index,tf,pivots);
  if(modelType.value)res.opportunities=res.opportunities.filter(plan=>plan.modelMatches.some(match=>match.type===modelType.value));
  // OTE is an additional research level; the existing entry stream tracks the composite midpoint.
  if(modelType.value==='breaker')for(const plan of res.opportunities)plan.blocks.push('إعادة اختبار Breaker معروضة كدليل بحثي. مستويات البطاقة تخص النموذج المركب.');
  if(modelType.value==='ote')for(const plan of res.opportunities)plan.blocks.push('مستوى OTE للبحث. الدخول المعروض للبطاقة هو الدخول المرجعي للنموذج المركب.');
 }
 if(batch)for(const plan of res.opportunities)plan.blocks.push('الفحص الجماعي بحثي؛ افحص العقد منفردًا للتحقق من Bid/Ask والمراقبة اللحظية.');
 return res;
}
function cancelGroupedScan(){batchController?.abort()}
async function scanBatch(){
 if(busy||!catalogLoaded)return;
 const contracts=[...crypto],tf=frame.value,id=++generation;
 const controller=new AbortController(),{signal}=controller;
 batchController=controller;
 busy=true;
 run.disabled=true;
 cancelBatch.hidden=false;
 clearScan();
 clear(output);
 const results=block('نتائج الفحص الجماعي',output);
 node('p',modelType.selectedOptions[0].textContent+' · حالة النموذج: '+(phases[modelPhase.value]||'جميع الحالات')+' · اختر عقدًا منفردًا لمتابعة سعر الدخول.',results);
 let checked=0,failed=0,matched=0,models=0,halted=false;
 try{
  setState('جارٍ تحميل الأجندة للفحص الجماعي…');
  const news=await loadNews(signal);
  for(const contract of contracts){
   if(signal.aborted)break;
   setState('جارٍ فحص '+contract+' · '+(checked+failed+1)+' من '+contracts.length);
   try{
    const data=await getCandles(contract,tf,signal);
    if(signal.aborted)break;
    const res=inspectContract(contract,tf,data,news,true);
    checked++;
    if(res.opportunities.length){
     matched++;
     models+=res.opportunities.length;
     for(const opportunity of res.opportunities)card(results,{
      ...opportunity,frame:tf,source:res.source,marketType:'PERPETUAL',detectedAt:res.checkedAt,lastCompleteAt:res.lastCompleteAt
     },'فحص جماعي');
    }
   }catch(error){
    if(signal.aborted)break;
    failed++;
    if(/^BYBIT_(?:HTTP_(?:403|429|451)|CODE_(?:10006|429))$/.test(error.message)){halted=true;break}
   }
   if(checked+failed<contracts.length)await new Promise(resolve=>setTimeout(resolve,200));
  }
  if(id===generation){
   if(!models)node('p',checked?'لم يُرصد نموذج مطابق في العقود التي اكتمل فحصها.':'لم يكتمل فحص أي عقد.',results);
   setState((halted?'توقف الفحص بسبب رفض Bybit أو حدود الطلبات. ':signal.aborted?'أُوقف الفحص. ':'انتهى الفحص. ')+
    'تم فحص '+checked+' من '+contracts.length+' · عقود مطابقة '+matched+' · نماذج '+models+
    ' · تعذّر '+failed+' · لم تُفحص '+(contracts.length-checked-failed),halted||failed>0);
  }
 }finally{
  batchController=null;
  busy=false;
  cancelBatch.hidden=true;
  run.disabled=!symbol.value;
 }
}
async function scan(auto=false){if(busy||symbol.value==='all'||auto&&document.hidden)return;if(!api||!live||!structure||!signal||!context||!scenario||!econ){setState('بعض محركات المراحل السابقة غير محمّلة. تأكد من رفع ملفات 2A–7A.',true);return}if(!symbol.value){setState('اختر أصلًا متاحًا.',true);return}
 const id=++generation,selection=[symbol.value,frame.value,roll.value].join('|');busy=true;run.disabled=true;clearScan();setState('جارٍ جلب شموع إطار التداول والسياق، وفحص الأجندة، ثم ربط الأدلة…');
 try{
  const contract=symbol.value;
  const [data,news,book]=await Promise.all([
   getCandles(contract,frame.value),loadNews(),live.fetchBook(contract).catch(()=>null)
  ]);
  if(id!==generation||selection!==[symbol.value,frame.value,roll.value].join('|'))return;
  const res=inspectContract(contract,frame.value,data,news);
  const {entryBars}=data,now=res.checkedAt;
  res.book=book;
  show(res);record(res);showEntryStream(res,news);
  if(res.entryFreshUntil>now)expiry=setTimeout(()=>{
   closeStream('انتهت حداثة شمعة الدخول؛ يلزم فحص جديد.');
   root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
   setState('أصبحت شموع الدخول قديمة؛ النتائج أدناه تخص وقت الفحص. أعد الفحص للتحديث.',true);
  },res.entryFreshUntil-now);
  root.dispatchEvent(new CustomEvent('ict:decision-scanned',{detail:{result:res,bars:entryBars}}));setState(!res.opportunities.length?'اكتمل الفحص دون نماذج مطابقة.':'اكتمل التحليل البحثي. '+res.opportunities.length+' نموذج؛ '+(res.blocks.length?'راجع أسباب تعليق الفرص.':'راجع شروط الفرص.'),res.blocks.length>0);
 }catch(e){if(id!==generation)return;clearScan();setState('تعذر تكوين خطة موثوقة: '+(e?.message||e)+'. لم تُنشأ توصية.',true)}finally{busy=false;run.disabled=!symbol.value}
}
function stop(){closeStream('توقفت مراقبة الأسعار.');active=false;if(timer)clearInterval(timer);timer=null;monitor.textContent='تشغيل المراقبة أثناء فتح الصفحة';monitor.setAttribute('aria-pressed','false')}
function selectionChanged(){
 generation++;
 cancelGroupedScan();
 stop();
 clearScan();
 if(streamPanel){streamPanel.hidden=true;streamEvents.replaceChildren()}
 run.disabled=!symbol.value||busy;
 monitor.disabled=!symbol.value||symbol.value==='all';
 setState(symbol.value==='all'?'الفحص الجماعي يشمل جميع العقود المتاحة، حتى عند استخدام البحث.':'اختر الأصل واضغط فحص السوق.');
}
for(const field of [frame,symbol,modelType,modelPhase,roll])field.addEventListener('change',selectionChanged);
run.addEventListener('click',()=>symbol.value==='all'?scanBatch():scan(false));
cancelBatch.addEventListener('click',cancelGroupedScan);
monitor.addEventListener('click',()=>{if(active){stop();return}active=true;monitor.textContent='إيقاف المراقبة';monitor.setAttribute('aria-pressed','true');scan(false);timer=setInterval(()=>scan(true),60000)});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop()});
window.addEventListener('pagehide',()=>{stop();cancelGroupedScan()});
if(window.ICTSharedIcons){
 for(const link of root.querySelectorAll('[data-dc-icon]')){
  link.prepend(window.ICTSharedIcons.makeIcon(link.dataset.dcIcon));
 }
}
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
const validSelection=(!requestedMarket||requestedMarket===market)&&/^[A-Z0-9]{1,31}USDT$/.test(requestedSymbol??'');
initCatalog(validSelection?requestedSymbol:undefined);
showArchive();
window.addEventListener('hashchange',openLinkedDetails);
openLinkedDetails();
loadAdvanced();
})();
