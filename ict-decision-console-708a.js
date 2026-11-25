/* ICT بالعربي 8A — user-invoked multi-market decision research center */
(function(){'use strict';const root=document.getElementById('ict-decision-8a');if(!root)return;
const $=id=>document.getElementById(id),market=$('dc-market'),symbol=$('dc-symbol'),frame=$('dc-frame'),roll=$('dc-roll'),account=$('dc-account'),risk=$('dc-risk'),run=$('dc-run'),monitor=$('dc-monitor'),status=$('dc-status'),output=$('dc-output'),archive=$('dc-archive');
const crypto=['BTCUSDT','ETHUSDT','SOLUSDT','XRPUSDT'],api=window.ICTDecisionEngine708A,live=window.ICTLiveFeed,publicFeed=window.ICTPublicMarkets,acc=window.ICTAccounts7A,structure=window.ICTStructureEngine,signal=window.ICTSignalEngine,context=window.ICTContextEngine,scenario=window.ICTScenarioEngine,econ=window.ICTEconomicLink706A;
const STORAGE='ict-8a-observation-archive-v1';let active=false,busy=false,timer=null,expiry=null,generation=0;
function labelTime(ts,zone){return new Intl.DateTimeFormat('ar-EG',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(ts))}
function dual(t){return 'نيويورك: '+labelTime(t,'America/New_York')+' | فلسطين: '+labelTime(t,'Asia/Gaza')}
function money(n){return Number.isFinite(n)?n.toLocaleString('en-US',{maximumFractionDigits:6}):'غير متاح'}
function node(tag,value,parent,cls){const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=value;parent.append(e);return e}
function clear(el){el.replaceChildren()}
function clearScan(){
 clearTimeout(expiry);
 clear(output);
 root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
}
function setState(v,bad=false){status.textContent=v;status.dataset.bad=bad?'1':'0'}
function selectOptions(select,items,choose){clear(select);for(const item of items){const opt=document.createElement('option');opt.value=item;opt.textContent=item;select.append(opt)}if(choose&&items.includes(choose))select.value=choose}
function marketsChanged(){const items=market.value==='crypto'?crypto:publicFeed?.MARKETS?.[market.value]?.map(x=>x[0])||[];selectOptions(symbol,items);roll.value=['forex','metals','energy'].includes(market.value)?'17':'0'}
function accountsChanged(){const previous=account.value,items=acc?.list()||[];clear(account);const neutral=document.createElement('option');neutral.value='';neutral.textContent='بدون حساب — فحص بحثي فقط';account.append(neutral);for(const a of items){const o=document.createElement('option');o.value=a.id;o.textContent=a.name+' — '+(a.type==='funded'?'ممول':'شخصي')+' — '+a.currency;account.append(o)}const preferred=items.some(x=>x.id===previous)?previous:acc?.selected();if(items.some(x=>x.id===preferred))account.value=preferred||''}
async function getBars(tf,limit){if(market.value==='crypto')return live.fetchHistory({symbol:symbol.value,interval:tf==='1h'?'60':String(tf==='5min'?'5':'15'),limit:limit||250});return publicFeed.get(publicFeed.resolve(market.value,symbol.value),tf,{limit:limit||200})}
function strip(res){return {market:res.market,symbol:res.symbol,frame:res.frame,checkedAt:res.checkedAt,source:res.source,opportunities:res.opportunities.map(o=>({id:o.id,side:o.side,formedAt:o.formedAt,status:o.status,entry:o.entry,stop:o.stop,target:o.target,blocks:o.blocks})),warnings:res.warnings,blocks:res.blocks}}
function saved(){try{const x=JSON.parse(localStorage.getItem(STORAGE)||'[]');return Array.isArray(x)?x.slice(0,30):[]}catch{return []}}
function record(res){try{let arr=saved();arr=arr.filter(x=>!(x.symbol===res.symbol&&x.market===res.market&&x.frame===res.frame&&x.checkedAt===res.checkedAt));arr.unshift(strip(res));localStorage.setItem(STORAGE,JSON.stringify(arr.slice(0,30)))}catch{}showArchive()}
function showArchive(){clear(archive);const arr=saved().slice(0,8);if(!arr.length){node('p','لا يوجد سجل فحوص محلي بعد.',archive);return}for(const x of arr){const b=node('div','',archive,'dc-archive-row');node('strong',x.symbol+' · '+x.opportunities.length+' نموذج/فرصة',b);node('small',dual(x.checkedAt)+' · فحص تاريخي محفوظ وليس عرضًا حيًا',b)}}
function block(title){const c=document.createElement('section');c.className='dc-card';node('h3',title,c);output.append(c);return c}
function show(res){clear(output);const info=block('حالة الفحص ومصادره');info.classList.add('dc-wide');node('p','الأصل: '+res.symbol+' | المصدر: '+res.source+' | إطار الدخول '+res.frame+' دقائق | الشموع المستخدمة: '+res.sourceBars,info);node('p','وقت الفحص: '+dual(res.checkedAt),info);node('p','آخر إغلاق ساعة مرجعي: '+(res.price==null?'غير متاح':money(res.price))+' | '+(res.priceAt?dual(res.priceAt+3600000):'بيانات الساعة متأخرة'),info);
 const ctx=block('السياق بنيويورك');const day=res.context.previousDay;node('p','PDH: '+money(day.high)+' | PDL: '+money(day.low),ctx);node('p',res.context.priorWeek?'PWH: '+money(res.context.priorWeek.high)+' | PWL: '+money(res.context.priorWeek.low):'الأسبوع السابق غير مكتمل',ctx);node('p','نظام اليوم: '+res.context.sourceDay,ctx);
 const safety=block('بوابات الجودة والأخبار والمخاطرة');const checks=[...res.blocks,...res.warnings];node('p',checks.length?'ملاحظات توقف اعتماد الخطة أو تحد من الوثوق:':'الفحوص العامة متاحة؛ كل نموذج يخضع أيضًا لشروطه الخاصة.',safety);if(checks.length){const ul=document.createElement('ul');safety.append(ul);checks.forEach(x=>node('li',x,ul))}node('p',res.accountName?'الحساب: '+res.accountName+' | '+(res.risk?.message||'المخاطرة غير متحققة'):'لم يُختر حساب — لا يمكن اعتماد المخاطرة',safety);if(res.nearbyNews.length){const ul=document.createElement('ul');safety.append(ul);res.nearbyNews.forEach(x=>node('li',x.title+' · '+dual(x.when),ul))}
 if(!res.opportunities.length){const empty=block('لم تتكوّن فرصة مستوفية');empty.classList.add('dc-wide');node('p','لا يوجد نموذج حديث مكتمل في فترة الشموع الحالية. لا نولّد BUY أو SELL لمجرد طلب الفحص.',empty)}
 for(const o of res.opportunities.slice(0,8)){const c=block(res.symbol+' · '+o.side+' · '+o.status);c.classList.add('dc-wide');node('p','النموذج: '+o.model,c);node('p','تكوّن: '+dual(o.formedAt)+' | العمر: '+o.ageBars+' شموع',c);const levels=node('div','',c,'dc-levels');for(const [name,value] of [['منطقة FVG',money(o.zone.low)+' — '+money(o.zone.high)],['دخول مرجعي',money(o.entry)],['إبطال/وقف افتراضي',money(o.stop)],['هدف 2R افتراضي',money(o.target)]]){const el=node('div','',levels);node('small',name,el);node('strong',value,el)}
  node('p',o.modelEvidence.map((at,i)=>['سحب السيولة','MSS','FVG'][i]+' · '+dual(at)).join(' | '),c);
  if(o.evidence.length){node('h4','أدلة السياق الأعلى',c);const ul=document.createElement('ul');c.append(ul);o.evidence.forEach(s=>node('li',s,ul))}
  node('h4','لماذا ليست أمر تنفيذ فوريًا؟',c);const ul=document.createElement('ul');c.append(ul);[...o.blocks,...o.waiting].forEach(s=>node('li',s,ul));
 }
 const note=block('حدود هذا الإصدار');note.classList.add('dc-wide');node('p',res.disclaimer,note);node('p','لا يتم تداول آلي ولا حفظ توصية كصفقة منفذة. خدمة المراقبة تعمل أثناء فتح الصفحة فقط. سعر المرجع آخر إغلاق شمعة، وليس Bid/Ask مباشرًا.',note);
}
async function scan(auto=false){if(busy||auto&&document.hidden)return;if(!api||!live||!publicFeed||!acc||!structure||!signal||!context||!scenario||!econ){setState('بعض محركات المراحل السابقة غير محمّلة. تأكد من رفع ملفات 2A–7A.',true);return}if(!symbol.value){setState('اختر أصلًا متاحًا.',true);return}
 const id=++generation,selection=[market.value,symbol.value,frame.value,roll.value,account.value,risk.value].join('|');busy=true;run.disabled=true;clearScan();setState('جارٍ جلب شموع 15/5 دقيقة والساعة، وفحص الأجندة، ثم ربط الأدلة…');
 try{
  // News availability must never be confused with market availability: show the
  // price/ICT research with a HARD BLOCK if the news feed fails or times out.
  const boundedFetch=(url,options={})=>{
    const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
    return fetch(url,{...options,signal:controller.signal}).then(async response=>{
      if(!response.ok)return response;
      const data=await response.json();
      return {ok:true,json:()=>data};
    }).finally(()=>clearTimeout(timeout));
  };
  const [entryBars,hourly,newsState]=await Promise.all([
    getBars(frame.value==='5'?'5min':'15min',250),
    getBars('1h',market.value==='crypto'?1000:200),
    Promise.resolve().then(()=>econ.loadEvents(boundedFetch)).then(value=>({ok:true,value}),error=>({ok:false,error}))
  ]);
  if(id!==generation||selection!==[market.value,symbol.value,frame.value,roll.value,account.value,risk.value].join('|'))return;
  const news=newsState.ok&&newsState.value&&Array.isArray(newsState.value.events)
    ? newsState.value
    : {events:[],feedsLoaded:0,failures:['تعذر التحقق من الأخبار: '+String(newsState.error?.message||newsState.error||'استجابة غير صالحة')]};
  const now=Date.now(),newsCovered=econ.scheduleCovers(news.parts||[],now);
  const a=(acc.list()||[]).find(x=>x.id===account.value)||null;const res=api.inspect({market:market.value,symbol:symbol.value,frame:frame.value,candles15:entryBars,candles60:hourly,rollHour:Number(roll.value),account:a,accountEngine:acc,riskAmount:risk.value,newsChecked:news.feedsLoaded>0,newsCovered,eventFeedsLoaded:news.feedsLoaded,events:news.events,now,structureEngine:structure,signalEngine:signal,contextEngine:context,scenarioEngine:scenario});
  if(news.failures.length)res.warnings.push('تعذر تحميل بعض الأجندات: '+news.failures.join('؛ '));
  show(res);record(res);
  if(res.entryFreshUntil>now)expiry=setTimeout(()=>{
   root.dispatchEvent(new CustomEvent('ict:decision-cleared'));
   setState('أصبحت شموع الدخول قديمة؛ النتائج أدناه تخص وقت الفحص. أعد الفحص للتحديث.',true);
  },res.entryFreshUntil-now);
  root.dispatchEvent(new CustomEvent('ict:decision-scanned',{detail:{result:res,bars:entryBars}}));setState('اكتمل التحليل البحثي. '+res.opportunities.length+' نموذج؛ '+(res.blocks.length?'راجع أسباب تعليق الفرص.':'راجع شروط الفرص.'),res.blocks.length>0);
 }catch(e){if(id!==generation)return;clearScan();setState('تعذر تكوين خطة موثوقة: '+(e?.message||e)+'. لم تُنشأ توصية.',true)}finally{busy=false;run.disabled=false}
}
function stop(){active=false;if(timer)clearInterval(timer);timer=null;monitor.textContent='تشغيل المراقبة أثناء فتح الصفحة';monitor.setAttribute('aria-pressed','false')}
function selectionChanged(){generation++;stop();clearScan();setState('أعد الفحص لتحديث نتائج الاختيار الحالي.')}
market.addEventListener('change',()=>{selectionChanged();marketsChanged()});for(const field of [frame,symbol,roll,account])field.addEventListener('change',selectionChanged);risk.addEventListener('input',selectionChanged);run.addEventListener('click',()=>scan(false));monitor.addEventListener('click',()=>{if(active){stop();return}active=true;monitor.textContent='إيقاف المراقبة';monitor.setAttribute('aria-pressed','true');scan(false);timer=setInterval(()=>scan(true),60000)});document.addEventListener('visibilitychange',()=>{if(document.hidden&&active)stop()});window.addEventListener('pagehide',stop);window.addEventListener('ict:accounts-changed',()=>{accountsChanged();selectionChanged()});accountsChanged();marketsChanged();showArchive();
})();
