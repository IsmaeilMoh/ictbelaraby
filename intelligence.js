'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=['XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD'];
const tv={XAUUSD:'OANDA:XAUUSD',XAGUSD:'OANDA:XAGUSD',EURUSD:'FX:EURUSD',GBPUSD:'FX:GBPUSD',USDJPY:'FX:USDJPY',USDCHF:'FX:USDCHF',USDCAD:'FX:USDCAD',AUDUSD:'FX:AUDUSD',NZDUSD:'FX:NZDUSD',NAS100:'FOREXCOM:NSXUSD',SP500:'FOREXCOM:SPXUSD',DJ30:'FOREXCOM:DJI',WTI:'TVC:USOIL',BTCUSD:'BITSTAMP:BTCUSD',ETHUSD:'BITSTAMP:ETHUSD'};
const sets={
 gold:{title:'الذهب والدولار والعوائد',symbols:['XAUUSD','EURUSD','USDJPY'],extras:[{symbol:'DXY',tv:'TVC:DXY'},{symbol:'US02Y',tv:'TVC:US02Y'},{symbol:'US10Y',tv:'TVC:US10Y'}],note:'قارن الذهب بقوة الدولار وعائد السنتين والعشر سنوات؛ الارتباط قد يضعف أو ينعكس.',questions:['هل تحرك الذهب بسبب خبر محدد أم بسبب العوائد؟','هل يتفق اتجاه DXY والعوائد مع حركة الذهب؟','هل مستوى السيولة على الذهب متوافق مع السياق؟']},
 risk:{title:'المؤشرات والمخاطرة',symbols:['NAS100','SP500','BTCUSD','ETHUSD'],extras:[],note:'تابع شهية المخاطرة عبر مؤشرات الأسهم والعملات الرقمية مع مراعاة اختلاف ساعات التداول.',questions:['هل تتفق NAS100 وSP500 في الاتجاه؟','هل تحرك BTC مستقل أم يتبع المخاطرة العامة؟','هل الحركة حدثت خلال جلسة عالية السيولة؟']},
 fx:{title:'سوق العملات',symbols:['EURUSD','GBPUSD','USDJPY','USDCHF'],extras:[{symbol:'DXY',tv:'TVC:DXY'}],note:'قارن أزواج الدولار بعناية: USDJPY وUSDCHF يختلف اتجاه عرض الدولار فيهما عن EURUSD.',questions:['هل الحركة ناتجة من قوة الدولار أم ضعف العملة المقابلة؟','هل يوجد خبر خاص بإحدى العملتين؟','هل هناك مستويات جلسات مهمة؟']},
 energy:{title:'النفط والسوق',symbols:['WTI','SP500','NAS100'],extras:[{symbol:'DXY',tv:'TVC:DXY'}],note:'النفط يتأثر بالعرض والطلب والمخزونات والجغرافيا السياسية؛ علاقته بالدولار والأسهم ليست ثابتة.',questions:['هل يوجد تقرير مخزونات أو قرار إنتاج؟','هل تغيرت توقعات النمو والتضخم؟','هل يقود النفط الحركة أم يتبعها؟']}
};
let movers=[],moversAt=null,events=[],calendarAt=null,selected='XAUUSD';
const checks=[['sweep','تأكدت من سحب السيولة على الشارت'],['mss','تحقق MSS / تحول هيكل واضح'],['fvg','ظهرت FVG صالحة حسب قواعدي'],['session','التوقيت مناسب لجلسة الاستراتيجية'],['risk','حددت وقف الخسارة والمخاطرة والأخبار']];
const stored=(key,fallback)=>{try{const x=JSON.parse(localStorage.getItem(key));return x??fallback}catch{return fallback}};
const setStored=(key,x)=>{try{localStorage.setItem(key,JSON.stringify(x));return true}catch{return false}};
const reviewKey='ict-phase2-radar-v1',historyKey='ict-phase2-reactions-v1';
const when=x=>{const d=new Date(x);return Number.isFinite(d.getTime())?new Intl.DateTimeFormat('ar-u-nu-latn',{dateStyle:'short',timeStyle:'short'}).format(d):'غير متاح'};
const elapsed=x=>{const t=Date.parse(x);return Number.isFinite(t)?Date.now()-t:Infinity};
const fmt=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:5}).format(n);
const chart=s=>`https://www.tradingview.com/chart/?symbol=${encodeURIComponent(s)}`;
async function json(file){try{const r=await fetch(file+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error(r.status);return await r.json()}catch{return null}}
function initTabs(){document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{for(const t of document.querySelectorAll('[data-tab]')){const on=t===b;t.classList.toggle('active',on);t.setAttribute('aria-selected',String(on))}for(const p of document.querySelectorAll('.panel'))p.hidden=p.id!=='panel-'+b.dataset.tab;if(b.dataset.tab==='xray')renderXray()}));if(location.hash==='#news'){document.querySelector('[data-tab="news"]')?.click();}}
function readCheck(asset){const all=stored(reviewKey,{});return all[asset]&&typeof all[asset]==='object'?all[asset]:{}};
function renderChecks(){const current=readCheck(selected);$('radar-checks').innerHTML=checks.map(([key,label])=>`<label class="check-row"><input type="checkbox" data-check="${key}" ${current[key]?'checked':''}><span>${esc(label)}</span></label>`).join('');$('radar-checks').querySelectorAll('input').forEach(box=>box.addEventListener('change',()=>{updateScore()}));updateScore();}
function updateScore(){const count=Array.from(document.querySelectorAll('[data-check]')).filter(x=>x.checked).length;$('radar-score').textContent=`${count} / ${checks.length}`;$('radar-progress').style.width=(count/checks.length*100)+'%';$('radar-verdict').textContent=count===checks.length?'اكتملت مراجعتك اليدوية؛ القرار يتطلب تقييم السياق والمخاطرة.':count===0?'لم تُؤكَّد أي شروط بعد.':`راجعت ${count} شروط. ${checks.length-count} متبقية، وليست هذه إشارة دخول.`;}
function saveChecks(){const all=stored(reviewKey,{});all[selected]={};document.querySelectorAll('[data-check]').forEach(el=>all[selected][el.dataset.check]=el.checked);all[selected].updatedAt=new Date().toISOString();$('radar-save-status').textContent=setStored(reviewKey,all)?'تم حفظ المراجعة على هذا الجهاز.':'لم يتم الحفظ؛ مساحة التخزين غير متاحة.';}
function resetChecks(){const all=stored(reviewKey,{});delete all[selected];setStored(reviewKey,all);renderChecks();$('radar-save-status').textContent='تمت إعادة تعيين مراجعة هذا الأصل.';}
function renderRadar(){const row=movers.find(x=>x.symbol===selected);const hasRows=movers.length>0;const age=elapsed(moversAt);const freshness=age<45*60000?'حديثة نسبيًا':age<72*3600000?'قديمة':'غير صالحة للمتابعة الآنية';$('radar-feed-status').textContent=hasRows?`لقطة ${when(moversAt)} · ${freshness}`:'لا تتوفر بيانات أسعار حاليًا';$('radar-feed-status').classList.toggle('bad',age>=45*60000||!hasRows);
 $('radar-snapshot').innerHTML=row?`<div class="snapshot-name"><strong dir="ltr">${esc(row.symbol)}</strong><small>${esc(row.label||'')}</small></div><div class="snapshot-val"><b>${Number.isFinite(row.price)?fmt(row.price):'—'}</b><span class="${row.change>=0?'up':'down'}">${row.change>0?'+':''}${row.change.toFixed(2)}% ${row.change>=0?'▲':'▼'}</span></div><div class="micro-note">لقطة سعرية دورية ${row.proxy?'لعقد مرجعي؛ ليست سعر Spot أو CFD مطابقًا بالضرورة.':'وقد يختلف المصدر عن TradingView.'}</div><a target="_blank" rel="noopener noreferrer" href="${chart(tv[selected])}">الشارت المقابل على TradingView ↗</a>`:`<p class="empty">لا توجد لقطة سعرية لهذا الأصل الآن. راقب الشارت مباشرة من <a target="_blank" rel="noopener noreferrer" href="${chart(tv[selected])}">TradingView</a>.</p>`;
 const leaders=movers.filter(x=>Number.isFinite(x.change)).slice().sort((a,b)=>Math.abs(b.change)-Math.abs(a.change)).slice(0,7);$('radar-leaders').innerHTML=leaders.length?leaders.map(x=>`<button type="button" class="leader ${x.symbol===selected?'active':''}" data-asset="${esc(x.symbol)}"><span dir="ltr">${esc(x.symbol)}</span><b class="${x.change>=0?'up':'down'}" dir="ltr">${x.change>0?'+':''}${x.change.toFixed(2)}%</b></button>`).join(''):'<p class="empty">لم تصل لقطة أسواق قابلة للعرض.</p>';
 $('radar-leaders').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('radar-asset').value=b.dataset.asset;selectRadar(b.dataset.asset)}));renderChecks();renderRadarEvents();}
function selectRadar(symbol){if(!allowed.includes(symbol))return;selected=symbol;renderRadar()}
function normalizeEvents(payload){const rows=Array.isArray(payload?.events)?payload.events:[];return rows.filter(e=>e&&e.date&&e.title&&Number.isFinite(Date.parse(e.date))).map(e=>({id:String(e.id||e.date+'-'+e.title),date:e.date,title:String(e.title),currency:String(e.country||e.currency||'').toUpperCase(),impact:String(e.impact||'').toLowerCase(),forecast:String(e.forecast??'—'),actual:String(e.actual??'—'),previous:String(e.previous??'—')})).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));}
function renderRadarEvents(){const currency=selected==='XAUUSD'||selected==='XAGUSD'||selected==='NAS100'||selected==='SP500'||selected==='DJ30'||selected==='BTCUSD'||selected==='ETHUSD'?'USD':selected.slice(0,3);const next=events.filter(e=>Date.parse(e.date)>Date.now()&&Date.parse(e.date)<Date.now()+3*86400000&&e.impact==='high').sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));const nearest=next.filter(e=>e.currency===currency||e.currency==='USD').slice(0,3);$('radar-events').innerHTML=nearest.length?nearest.map(e=>`<div class="event-mini"><strong>${esc(e.title)}</strong><span>${esc(e.currency)} · ${when(e.date)}</span></div>`).join(''):'<span class="empty">لا توجد أحداث مرتفعة التأثير قادمة في البيانات المتاحة خلال الأيام الثلاثة المقبلة.</span>';}
function renderXray(){const name=$('xray-set').value,group=sets[name]||sets.gold,all=[...group.symbols.map(s=>({symbol:s,tv:tv[s]})),...group.extras];const picker=$('xray-symbol'),previous=picker.value;picker.innerHTML=all.map(x=>`<option value="${esc(x.tv)}">${esc(x.symbol)} · ${esc(x.tv)}</option>`).join('');if(all.some(x=>x.tv===previous))picker.value=previous;renderChart();}
function renderChart(){const name=$('xray-set').value,group=sets[name]||sets.gold,all=[...group.symbols.map(s=>({symbol:s,tv:tv[s]})),...group.extras],v=$('xray-symbol').value;if(!all.some(x=>x.tv===v))return;$('xray-code').textContent=v;$('xray-open').href=chart(v);$('xray-context').textContent=group.note;$('xray-peers').innerHTML=all.map(x=>`<button class="peer ${x.tv===v?'active':''}" type="button" data-tv="${esc(x.tv)}"><strong dir="ltr">${esc(x.symbol)}</strong><small dir="ltr">${esc(x.tv)}</small></button>`).join('');$('xray-peers').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('xray-symbol').value=b.dataset.tv;renderChart()}));$('xray-questions').innerHTML=group.questions.map(q=>`<p>◈ ${esc(q)}</p>`).join('');const widget=$('xray-widget');widget.innerHTML='<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';const script=document.createElement('script');script.type='text/javascript';script.async=true;script.src='https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';script.textContent=JSON.stringify({symbols:[[v,v+'|1D']],chartOnly:false,width:'100%',height:'100%',locale:'en',colorTheme:'dark',autosize:true,showVolume:false,showMA:false,hideDateRanges:false,hideMarketStatus:false,hideSymbolLogo:false,scalePosition:'right',scaleMode:'Normal',fontFamily:'Arial',fontSize:'11',noTimeScale:false,valuesTracking:'1',changeMode:'price-and-percent',chartType:'area',lineWidth:2,lineType:0,dateRanges:['1d|1','1m|30','3m|60','12m|1D']});widget.querySelector('.tradingview-widget-container').appendChild(script);}
function numeric(x){let s=String(x??'').trim().replace(/[,\s]/g,'');const isPercent=s.endsWith('%');s=s.replace(/[%KMB]$/i,'');let multiplier=1;if(/[KMB]$/i.test(String(x).trim())){const z=String(x).trim().slice(-1).toUpperCase();multiplier={K:1e3,M:1e6,B:1e9}[z]||1;}if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;const n=Number(s)*multiplier;return Number.isFinite(n)?{value:n,unit:isPercent?'percent':'number'}:null;}
// Economic Results Engine 6.8.42 — local, user-imported Forex Factory results.
// No private probe artifact is fetched or published to the public website.
const economicResultsKey='ict-economic-results-private-v1';
function savedPriority(){try{const v=localStorage.getItem('ict-economic-news-priority-v1');return ['important','high','all'].includes(v)?v:'important'}catch{return 'important'}}
let economicResults=[],resultsUpdatedAt=null,newsFilter=savedPriority();
function priorityRows(rows,mode=newsFilter){return window.ICTCalendarConsensus?.priorityFilter(rows,mode)||rows.filter(e=>mode==='all'||(mode==='high'?e.impact==='high':['high','medium'].includes(e.impact)))}

const validResultsRow=r=>r&&typeof r==='object'&&typeof r.id==='string'&&r.id.length<160&&typeof r.title==='string'&&r.title.length<260&&typeof r.date==='string'&&Number.isFinite(Date.parse(r.date))&&r.values&&typeof r.values==='object'&&String(r.source||'')==='Forex Factory';
function resultRows(input){
 const raw=Array.isArray(input?.events)?input.events:[];
 if(raw.length>15000)throw Error('الملف كبير بصورة غير متوقعة.');
 return raw.filter(validResultsRow).map(r=>({
 id:r.id,date:r.date,title:r.title,currency:String(r.country||'').toUpperCase().slice(0,8),
 impact:String(r.impact||'unknown').toLowerCase(),actual:String(r.values.actual??'—'),
 forecast:String(r.values.forecast??'—'),previous:String(r.values.previous??'—'),
 source:'Forex Factory',comparison:r.comparison&&typeof r.comparison==='object'?r.comparison:null,
 firstSeenAt:r.firstSeenAt||null,lastSeenAt:r.lastSeenAt||null,
 revisions:Array.isArray(r.revisions)?r.revisions.slice(-25):[]
 })).filter(r=>r.actual!=='—'&&r.actual!=='null'&&r.actual!==''&&r.currency);
}
function readResults(){
 try{const s=localStorage.getItem(economicResultsKey);if(!s)return [];
 const parsed=JSON.parse(s);return resultRows(parsed)}catch{return []}
}
function compareEvent(e){
 if(!e)return {comparable:false};
 const c=e.comparison;
 if(c&&c.comparable===true&&typeof c.difference==='string'&&/^[+-]?\d+(?:\.\d+)?$/.test(c.difference)&&['absolute','percentage-points'].includes(c.unit))
  return {comparable:true,difference:Number(c.difference),unit:c.unit};
 // For calendar-only events, use arithmetic fallback without pretending units are compatible.
 const f=numeric(e.forecast),a=numeric(e.actual);
 return f&&a&&f.unit===a.unit?{comparable:true,difference:a.value-f.value,unit:f.unit==='percent'?'percentage-points':'absolute'}:{comparable:false};
}
function resultsStatus(message,isError=false){
 const node=$('results-local-status');if(node){node.textContent=message;node.classList.toggle('bad',isError)}
}
function refreshResultsStatus(){
 const comparable=economicResults.filter(e=>compareEvent(e).comparable).length;
 resultsStatus(economicResults.length?`النتائج المحفوظة على هذا الجهاز: ${economicResults.length} | قابلة للمقارنة: ${comparable} | آخر استيراد: ${when(resultsUpdatedAt)}`:'لم تُستورد نتائج بعد. اختر ملف economic-results-preview.json من GitHub Artifacts.');
}
// The public BLS feed is separate from visitor-imported Forex Factory records.
async function loadPublicOfficialResults(){
 const node=$('official-news-results');if(!node)return;
 try{
  await window.ICTCalendarConsensus?.load().catch(()=>{});
  const response=await fetch('economic-official.json?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('fetch failed');
  const feed=await response.json();
  if(feed?.source!=='BLS'||feed.status!=='ok'||!Array.isArray(feed.events))throw Error('bad feed');
  const valid=feed.events.filter(e=>e&&e.source==='BLS'&&e.period&&Number.isFinite(Number(e.actual))&&['%','K'].includes(e.unit));
  if(!valid.length)throw Error('no observations');
  await Promise.all([window.ICTEditorialForecasts?.load(),window.ICTCalendarConsensus?.load()]);
  const stages=priorityRows(window.ICTCalendarConsensus?.lifecycle(valid)||[]).slice(0,18);
  const stageHtml=stages.length?`<div class="card-head"><h3>الأخبار القادمة والنتائج المنتظرة</h3></div><div class="results-official-grid">${stages.map(e=>`<article class="card" style="margin:8px 0;padding:12px"><h3>${esc(e.title)}</h3><p class="micro-note">${esc(e.currency)} · ${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'} · ${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'} · ${when(e.date)} · ${e.stage==='upcoming'?'قادم':e.stage==='released'?'صدرت النتيجة':'بانتظار النتيجة'}</p><div class="metrics"><div><small>السابق</small><strong dir="ltr">${esc(e.previous)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${esc(e.forecast)}</strong></div><div><small>الفعلي</small><strong dir="ltr">${esc(e.actual)}</strong></div></div><p class="micro-note">${e.stage==='upcoming'?'الخبر لم يصدر بعد.':e.stage==='released'?`نتيجة BLS مطابقة للفترة. ${e.difference===null?'لا يوجد توقع صالح للمقارنة.':`الفارق: ${e.difference>0?'+':''}${esc(e.difference)} ${e.unit==='%'?'نقطة مئوية':esc(e.unit||'')}.`}${!e.verifiedBeforeRelease?' المقارنة مرجعية، وقت التوقع قبل الصدور غير مثبت.':''}`:'مر موعد الخبر ولم تظهر نتيجة فعلية في الأجندة المتاحة.'} ${esc(window.ICTNewsImpact?.analyze(e,stages).detail||'')}</p></article>`).join('')}</div>`:'<p class="micro-note">لا توجد أحداث قادمة أو نتائج منتظرة ضمن الأجندة المتاحة.</p>';
  node.innerHTML=stageHtml+`<div class="card-head"><h3>نتائج اقتصادية رسمية — BLS</h3><span class="tag">تحديث تلقائي · أمريكية فقط</span></div><p class="micro-note">آخر جلب ${esc(feed.updatedAt||'غير متاح')} · الفترة هي فترة الإحصاء، لا ساعة صدور الخبر. التوقعات من السجل التحريري أو الأجندة القائمة عند التطابق الصارم؛ وتُميَّز القيم غير المحفوظة قبل النشر.</p><div class="results-official-grid">${valid.map(e=>`<article class="card" style="margin:8px 0;padding:12px"><h3>${esc(e.title)}</h3><p class="micro-note">USD · ${esc(e.period)} · المصدر BLS</p><div class="metrics"><div><small>السابق</small><strong dir="ltr">${e.previous===null?'—':esc(e.previous)+esc(e.unit)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?esc((window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e)).value)+esc(e.unit):'—'}</strong></div><div><small>الفعلي</small><strong dir="ltr">${esc(e.actual)}${esc(e.unit)}</strong></div></div><p class="micro-note">${(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?`المصدر: ${esc((window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e)).source)} · ${window.ICTCalendarConsensus?.find(e)?.verifiedBeforeRelease===false&&!window.ICTEditorialForecasts?.find(e)?'مقارنة حسابية مرجعية: لم يُثبت حفظ التوقع قبل صدور الخبر.':'مقارنة بتوقع محفوظ قبل النشر.'} الفرق: ${((window.ICTEditorialForecasts?.find(e)?window.ICTEditorialForecasts.difference(e):window.ICTCalendarConsensus.comparison(e)?.difference)||0)>0?'+':''}${esc(String(window.ICTEditorialForecasts?.find(e)?window.ICTEditorialForecasts.difference(e):window.ICTCalendarConsensus.comparison(e)?.difference))} ${e.unit==='%'?'نقطة مئوية':esc(e.unit)}. ${esc(window.ICTCalendarConsensus?.interpretation(e)||'')}`:'لا يتوفر توقع مطابق لهذه الفترة.'} لا تمثل النتائج إشارة تداول. ${escapeHTML(window.ICTNewsImpact?.analyze({title:e.title,currency:'USD',stage:'released',actual:String(e.actual)+e.unit,forecast:f?String(f.value)+f.unit:'—',verifiedBeforeRelease:f?.verifiedBeforeRelease}).detail||'')}</p></article>`).join('')}</div>`;
 }catch{
   const staged=priorityRows(window.ICTCalendarConsensus?.lifecycle([])||[]).slice(0,18);
   node.innerHTML='<div class="card-head"><h3>الأخبار القادمة والنتائج المنتظرة</h3></div>'+(staged.length?staged.map(e=>`<div class="card" style="padding:12px;margin:8px 0"><strong>${esc(e.currency)} · ${esc(e.title)}</strong><p class="micro-note">${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'} · ${when(e.date)} · ${e.stage==='upcoming'?'قادم':'بانتظار النتيجة'}</p><div class="metrics"><div><small>السابق</small><strong>${esc(e.previous)}</strong></div><div><small>المتوقع</small><strong>${esc(e.forecast)}</strong></div><div><small>الفعلي</small><strong>—</strong></div></div></div>`).join(''):'<p class="micro-note">لا توجد أحداث متاحة حاليًا في الأجندة.</p>')+'<p class="micro-note">بيانات BLS الرسمية غير متاحة حاليًا. لا تُعرض نتائج مفترضة.</p>';
 }
}
function eventPool(){return economicResults.length?economicResults:events}
function filteredNews(){
 const pool=eventPool(),q=String($('news-query')?.value||'').trim().toLowerCase(),currency=$('news-currency')?.value||'';
 return pool.filter(e=>(!q||(e.title+' '+e.currency).toLowerCase().includes(q))&&(!currency||e.currency===currency)&&(newsFilter==='comparable'?compareEvent(e).comparable:priorityRows([e]).length>0)).slice(0,500)
}
function newsOptions(){
 const pick=$('news-select'),prev=pick.value;
 const pool=eventPool(); const currencies=[...new Set(pool.map(e=>e.currency).filter(Boolean))].sort();
 const cc=$('news-currency'),last=cc.value;
 cc.innerHTML='<option value="">كل العملات</option>'+currencies.map(c=>`<option value="${esc(c)}">${esc(c)}</option>`).join('');if(currencies.includes(last))cc.value=last;
 const options=filteredNews().sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
 pick.innerHTML='<option value="">اختر خبرًا…</option>'+options.map(e=>`<option value="${esc(e.id)}">${esc(e.currency)} · ${esc(e.title)} · ${when(e.date)}</option>`).join('');
 if(options.some(e=>e.id===prev))pick.value=prev;
 $('news-feed-status').textContent=economicResults.length?`أرشيف خاص · ${economicResults.length} نتيجة`:(events.length?`أجندة عامة · ${events.length} حدث · بدون نتائج مؤرشفة`:'الأجندة غير متاحة');
 $('news-feed-status').classList.toggle('bad',!economicResults.length);
 refreshResultsStatus();renderNewsReview();
}
function currentEvent(){return eventPool().find(e=>e.id===$('news-select').value)||null}
function renderNewsReview(){
 const e=currentEvent();
 $('event-review').innerHTML=e?`<h3>${esc(e.title)}</h3><p>${esc(e.currency)} · ${when(e.date)} · ${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'}</p><div class="metrics"><div><small>السابق</small><strong dir="ltr">${esc(e.previous)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${esc(e.forecast)}</strong></div><div><small>الفعلي</small><strong dir="ltr">${esc(e.actual)}</strong></div></div>${e.source?`<p class="micro-note">المصدر: ${esc(e.source)}${e.lastSeenAt?' · رُصدت النتيجة: '+when(e.lastSeenAt):''}${e.revisions?.length?' · تعديلات محفوظة: '+e.revisions.length:''}</p>`:''}`:'<p class="empty">اختر حدثًا لعرض السابق والمتوقع والفعلي.</p>';
 const c=compareEvent(e);
 const output=!e?'اختر حدثًا لعرض المقارنة.':!c.comparable?'لا يوجد توقع قابل للمقارنة مع القيمة الفعلية لهذا الخبر.':`${Math.abs(c.difference)<1e-10?'مطابق للتوقعات':c.difference>0?'أعلى من المتوقع':'أقل من المتوقع'} · الفرق الحسابي ${c.difference>0?'+':''}${fmt(c.difference)}${c.unit==='percentage-points'?' نقطة مئوية':''}. لا يدل ذلك وحده على اتجاه السوق.`;
 $('surprise').textContent=output;
 const extra=$('economic-interpretation');
 if(extra){
  const interpretation=e&&window.ICTEconomicResults?window.ICTEconomicResults.explain(e):null;
  extra.textContent=interpretation?`${interpretation.category} — ${interpretation.description}`:'اختر خبرًا لعرض القراءة الاقتصادية.';
 }
}
async function importEconomicResults(ev){
 const file=ev.target.files?.[0];if(!file)return;
 try{
  if(file.size>8*1024*1024)throw Error('الملف أكبر من الحد المسموح (8MB).');
  const payload=JSON.parse(await file.text());
  if(payload?.source!=='Forex Factory'||!Array.isArray(payload.events))throw Error('الملف ليس تصدير نتائج Forex Factory المتوقع.');
  const fresh=resultRows(payload);if(!fresh.length)throw Error('لا يحتوي الملف على نتائج فعلية صالحة.');
  const map=new Map(economicResults.map(e=>[e.id,e]));
  for(const r of fresh){const old=map.get(r.id);if(!old||String(r.lastSeenAt||'')>=String(old.lastSeenAt||''))map.set(r.id,r)}
  const combined=[...map.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,3000);
  try{localStorage.setItem(economicResultsKey,JSON.stringify({source:'Forex Factory',events:combined.map(r=>({...r,country:r.currency,values:{actual:r.actual,forecast:r.forecast,previous:r.previous}}))}));}
  catch{throw Error('تعذر تخزين الأرشيف على الهاتف؛ قد تكون مساحة المتصفح ممتلئة.');}
  economicResults=combined;resultsUpdatedAt=new Date().toISOString();
  try{localStorage.setItem(economicResultsKey+'-date',resultsUpdatedAt)}catch{}
  $('news-query').value='';newsFilter=savedPriority();$('news-impact').value=newsFilter;$('news-currency').value='';newsOptions();
  resultsStatus(`تم استيراد ${fresh.length} نتيجة فعلية. الأرشيف المحلي يحتوي الآن على ${combined.length} نتيجة.`);
 }catch(e){resultsStatus(`لم ينجح الاستيراد: ${e.message}`,true)}
 ev.target.value='';
}
function exportEconomicResults(){
 if(!economicResults.length){resultsStatus('لا توجد نتائج محفوظة لتصديرها.',true);return}
 const content=JSON.stringify({source:'Forex Factory',updatedAt:new Date().toISOString(),events:economicResults.map(r=>({...r,country:r.currency,values:{actual:r.actual,forecast:r.forecast,previous:r.previous}}))},null,2);
 const url=URL.createObjectURL(new Blob([content],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='ICT_Economic_Results_Backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function clearEconomicResults(){
 if(!economicResults.length)return;
 if(!confirm('هل تريد حذف أرشيف النتائج من هذا الجهاز فقط؟'))return;
 try{localStorage.removeItem(economicResultsKey);localStorage.removeItem(economicResultsKey+'-date')}catch{}
 economicResults=[];resultsUpdatedAt=null;newsOptions();
}
function initEconomicResults(){
 economicResults=readResults();try{resultsUpdatedAt=localStorage.getItem(economicResultsKey+'-date')}catch{}
 $('news-impact').value=newsFilter;
 $('results-file').addEventListener('change',importEconomicResults);
 $('results-export').addEventListener('click',exportEconomicResults);
 $('results-clear').addEventListener('click',clearEconomicResults);
 $('news-query').addEventListener('input',newsOptions);
 $('news-currency').addEventListener('change',newsOptions);
 $('news-impact').addEventListener('change',e=>{newsFilter=e.target.value;if(newsFilter!=='comparable')try{localStorage.setItem('ict-economic-news-priority-v1',newsFilter)}catch{}newsOptions();loadPublicOfficialResults()});
}
function reactionHistory(){const list=stored(historyKey,[]);return Array.isArray(list)?list.filter(x=>x&&typeof x==='object').slice(0,80):[];}
function renderReactionHistory(){const rows=reactionHistory();$('reaction-history').innerHTML=rows.length?rows.slice(0,12).map(r=>`<div class="history-row"><div><b>${esc(r.title)}</b><small>${esc(r.asset)} · ${esc(r.window)} دقيقة · ${when(r.saved)}</small></div><strong class="${r.percent>=0?'up':'down'}" dir="ltr">${r.percent>0?'+':''}${Number(r.percent).toFixed(3)}%</strong></div>`).join(''):'<p class="empty">لم تُحفظ قياسات بعد. اختر خبرًا وأدخل السعرين من الشارت.</p>';}
function saveReaction(ev){ev.preventDefault();const e=currentEvent();if(!e){$('reaction-result').textContent='اختر خبرًا أولًا.';return;}const form=ev.target;const a=Number(form.elements.before.value),b=Number(form.elements.after.value),windowMin=Number(form.elements.window.value);if(!Number.isFinite(a)||a<=0||!Number.isFinite(b)||b<=0||![1,5,15,30,60].includes(windowMin)){ $('reaction-result').textContent='أدخل سعرين موجبين وفترة صحيحة.';return;}const item={id:e.id,title:e.title,date:e.date,asset:form.elements.asset.value,window:windowMin,before:a,after:b,percent:(b/a-1)*100,notes:String(form.elements.notes.value||'').slice(0,180),saved:new Date().toISOString()};const result=[item,...reactionHistory()].slice(0,80);$('reaction-result').textContent=setStored(historyKey,result)?`حُفظت الحركة: ${item.percent>0?'+':''}${item.percent.toFixed(3)}% خلال ${windowMin} دقيقة — حسب الأسعار التي أدخلتها.`:'تعذر الحفظ المحلي.';renderReactionHistory();}
function exportReactions(){const rows=reactionHistory();if(!rows.length){$('reaction-result').textContent='لا توجد قياسات لتصديرها.';return;}const fields=['date','title','asset','window','before','after','percent','notes','saved'];const cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const csv='\uFEFF'+[fields.join(','),...rows.map(r=>fields.map(k=>cell(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='ICT_News_Reactions.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
async function boot(){initTabs();$('radar-asset').innerHTML=allowed.map(s=>`<option value="${s}">${s}</option>`).join('');$('radar-asset').value=selected;$('radar-asset').addEventListener('change',e=>selectRadar(e.target.value));$('save-radar').addEventListener('click',saveChecks);$('reset-radar').addEventListener('click',resetChecks);$('xray-set').addEventListener('change',renderXray);$('xray-symbol').addEventListener('change',renderChart);$('news-select').addEventListener('change',renderNewsReview);initEconomicResults();loadPublicOfficialResults();setInterval(loadPublicOfficialResults,30*60*1000);$('reaction-form').addEventListener('submit',saveReaction);$('export-reactions').addEventListener('click',exportReactions);
 const [m,c]=await Promise.all([json('market-movers.json'),json('calendar-live.json')]);moversAt=m?.updatedAt||null;movers=Array.isArray(m?.items)?m.items.filter(x=>allowed.includes(x.symbol)&&Number.isFinite(Number(x.change))).map(x=>({symbol:x.symbol,label:x.label,change:Number(x.change),price:(x.price!=null&&Number.isFinite(Number(x.price))&&Number(x.price)>0)?Number(x.price):null,proxy:Boolean(x.proxy)})):[];calendarAt=c?.updated_at||c?.updatedAt||null;events=normalizeEvents(c);renderRadar();newsOptions();renderReactionHistory();renderXray();}
window.addEventListener('storage',event=>{if(event.key===economicResultsKey){economicResults=readResults();newsOptions()}});
boot();
