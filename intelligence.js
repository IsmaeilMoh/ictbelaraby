'use strict';
const $=id=>document.getElementById(id), esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=['XAUUSD','XAGUSD','EURUSD','GBPUSD','USDJPY','USDCHF','USDCAD','AUDUSD','NZDUSD','NAS100','SP500','DJ30','WTI','BTCUSD','ETHUSD'];
const tv={XAUUSD:'FOREXCOM:XAUUSD',XAGUSD:'FOREXCOM:XAGUSD',EURUSD:'FX:EURUSD',GBPUSD:'FX:GBPUSD',USDJPY:'FX:USDJPY',USDCHF:'FX:USDCHF',USDCAD:'FX:USDCAD',AUDUSD:'FX:AUDUSD',NZDUSD:'FX:NZDUSD',NAS100:'FOREXCOM:NSXUSD',SP500:'FOREXCOM:SPXUSD',DJ30:'FOREXCOM:DJI',WTI:'TVC:USOIL',BTCUSD:'BITSTAMP:BTCUSD',ETHUSD:'BITSTAMP:ETHUSD'};
const sets={
 gold:{title:'الذهب والدولار والعوائد',symbols:['XAUUSD','EURUSD','USDJPY'],extras:[{symbol:'DXY',tv:'TVC:DXY'},{symbol:'US02Y',tv:'TVC:US02Y'},{symbol:'US10Y',tv:'TVC:US10Y'}],note:'قارن الذهب بقوة الدولار وعائد السنتين والعشر سنوات؛ الارتباط قد يضعف أو ينعكس.',questions:['هل تحرك الذهب بسبب خبر محدد أم بسبب العوائد؟','هل يتفق اتجاه DXY والعوائد مع حركة الذهب؟','هل مستوى السيولة على الذهب متوافق مع السياق؟']},
 risk:{title:'المؤشرات والمخاطرة',symbols:['NAS100','SP500','BTCUSD','ETHUSD'],extras:[],note:'تابع شهية المخاطرة عبر مؤشرات الأسهم والعملات الرقمية مع مراعاة اختلاف ساعات التداول.',questions:['هل تتفق NAS100 وSP500 في الاتجاه؟','هل تحرك BTC مستقل أم يتبع المخاطرة العامة؟','هل الحركة حدثت خلال جلسة عالية السيولة؟']},
 fx:{title:'سوق العملات',symbols:['EURUSD','GBPUSD','USDJPY','USDCHF'],extras:[{symbol:'DXY',tv:'TVC:DXY'}],note:'قارن أزواج الدولار بعناية: USDJPY وUSDCHF يختلف اتجاه عرض الدولار فيهما عن EURUSD.',questions:['هل الحركة ناتجة من قوة الدولار أم ضعف العملة المقابلة؟','هل يوجد خبر خاص بإحدى العملتين؟','هل هناك مستويات جلسات مهمة؟']},
 energy:{title:'النفط والسوق',symbols:['WTI','SP500','NAS100'],extras:[{symbol:'DXY',tv:'TVC:DXY'}],note:'النفط يتأثر بالعرض والطلب والمخزونات والجغرافيا السياسية؛ علاقته بالدولار والأسهم ليست ثابتة.',questions:['هل يوجد تقرير مخزونات أو قرار إنتاج؟','هل تغيرت توقعات النمو والتضخم؟','هل يقود النفط الحركة أم يتبعها؟']}
};
let movers=[],moversAt=null,radarRows=[],radarAt=null,events=[],calendarAt=null,selected='XAUUSD',xrayFeed=null;
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
const radarPrefsKey='ict-radar-v6855-filters';
function radarFilter(){return {window:$('radar-window')?.value||'15',group:$('radar-group')?.value||'all',direction:$('radar-direction')?.value||'all'};}
function radarDatum(item,win){
 if(win==='previous')return Number.isFinite(item?.change)&&elapsed(moversAt)<=90*60000&&elapsed(item?.quotedAt||moversAt)<=90*60000?{value:item.change,time:item.quotedAt||moversAt,basis:'الإغلاق السابق',proxy:item.proxy}:null;
 const r=radarRows.find(x=>x.symbol===item?.symbol);
 const value=r?.[win];
 if(!Number.isFinite(value)||elapsed(r?.quotedAt)>45*60000||elapsed(radarAt)>45*60000)return null;
 return {value,time:r.quotedAt,basis:win+' دقيقة',proxy:r.proxy};
}
function renderRadar(){
 const filter=radarFilter(),base=movers.map(x=>({...x,quotedAt:x.quotedAt||moversAt}));
 const candidates=base.filter(x=>filter.group==='all'||x.category===filter.group).map(x=>({...x,metric:radarDatum(x,filter.window)}))
   .filter(x=>x.metric&&(filter.direction==='all'||filter.direction==='up'&&x.metric.value>0||filter.direction==='down'&&x.metric.value<0))
   .sort((a,b)=>Math.abs(b.metric.value)-Math.abs(a.metric.value));
 const good=candidates.length>0;const age=filter.window==='previous'?elapsed(moversAt):elapsed(radarAt);
 const reliable=age<(filter.window==='previous'?90:45)*60000;
 $('radar-feed-status').textContent=good?`آخر تحديث ${when(filter.window==='previous'?moversAt:radarAt)} · ${reliable?'بيانات دورية':'بيانات قديمة'}`:'البيانات غير متاحة أو متأخرة؛ لا نعرض حركة قديمة بوصفها حديثة';
 $('radar-feed-status').classList.toggle('bad',!good||!reliable);
 $('radar-summary').textContent=good?`${candidates.length} أصل متاح · ${candidates.filter(x=>x.metric.value>0).length} صاعد · ${candidates.filter(x=>x.metric.value<0).length} هابط · قياس ${filter.window==='previous'?'من الإغلاق السابق':filter.window+' دقيقة'}`:'لا تتوفر بيانات حديثة لهذا الاختيار. راجع وقت آخر تحديث أو انتظر تجدد المصدر؛ في العطلات قد تكون الأسواق مغلقة.';
 const row=base.find(x=>x.symbol===selected),metric=row?radarDatum(row,filter.window):null;
 const number=(n)=>`${n>0?'+':''}${n.toFixed(2)}%`;
 $('radar-snapshot').innerHTML=row?`<div class="snapshot-name"><strong dir="ltr">${esc(row.symbol)}</strong><small>${esc(row.label||'')}</small></div><div class="snapshot-val"><b>${Number.isFinite(row.price)?fmt(row.price):'—'}</b><span class="${metric?(metric.value>=0?'up':'down'):''}">${metric?number(metric.value):'لا تتوفر مقارنة حديثة'}</span></div><div class="micro-note">${metric?`تغير ${esc(metric.basis)} · وقت آخر شمعة ${when(metric.time)}.`:'لا توجد شموع كافية لهذه النافذة أو توقفت جلسة التداول.'} ${row.proxy?'الرمز عقد مرجعي وقد يختلف عن السعر الفوري.':''}</div><a target="_blank" rel="noopener noreferrer" href="${chart(tv[selected])}">فتح شارت TradingView ↗</a>`:'<p class="empty">لا تتوفر لقطة سعر لهذا الأصل في الملف الحالي.</p>';
 $('radar-leaders').innerHTML=good?candidates.slice(0,12).map(x=>`<button type="button" class="leader ${x.symbol===selected?'active':''}" data-asset="${esc(x.symbol)}"><span dir="ltr">${esc(x.symbol)}</span><b class="${x.metric.value>=0?'up':'down'}" dir="ltr">${number(x.metric.value)}</b></button>`).join(''):'<p class="empty">لا توجد تغيرات صالحة للعرض وفق الفلتر الحالي.</p>';
 $('radar-leaders').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('radar-asset').value=b.dataset.asset;selectRadar(b.dataset.asset)}));renderChecks();renderRadarEvents();
}
function selectRadar(symbol){if(!allowed.includes(symbol))return;selected=symbol;renderRadar()}
function normalizeEvents(payload){const rows=Array.isArray(payload?.events)?payload.events:[];return rows.filter(e=>e&&e.date&&e.title&&Number.isFinite(Date.parse(e.date))).map(e=>({id:String(e.id||e.date+'-'+e.title),date:e.date,title:String(e.title),currency:String(e.country||e.currency||'').toUpperCase(),impact:String(e.impact||'').toLowerCase(),forecast:String(e.forecast??'—'),actual:String(e.actual??'—'),previous:String(e.previous??'—')})).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));}
function renderRadarEvents(){const currency=selected==='XAUUSD'||selected==='XAGUSD'||selected==='NAS100'||selected==='SP500'||selected==='DJ30'||selected==='BTCUSD'||selected==='ETHUSD'?'USD':selected.slice(0,3);const next=events.filter(e=>Date.parse(e.date)>Date.now()&&Date.parse(e.date)<Date.now()+3*86400000&&e.impact==='high').sort((a,b)=>Date.parse(a.date)-Date.parse(b.date));const nearest=next.filter(e=>e.currency===currency||e.currency==='USD').slice(0,3);$('radar-events').innerHTML=nearest.length?nearest.map(e=>`<div class="event-mini"><strong>${esc(e.title)}</strong><span>${esc(e.currency)} · ${when(e.date)}</span></div>`).join(''):'<span class="empty">لا توجد أحداث مرتفعة التأثير قادمة في البيانات المتاحة خلال الأيام الثلاثة المقبلة.</span>';}
function renderXray(){const name=$('xray-set').value,group=sets[name]||sets.gold,all=[...group.symbols.map(s=>({symbol:s,tv:tv[s]})),...group.extras];const picker=$('xray-symbol'),previous=picker.value;picker.innerHTML=all.map(x=>`<option value="${esc(x.tv)}">${esc(x.symbol)} · ${esc(x.tv)}</option>`).join('');if(all.some(x=>x.tv===previous))picker.value=previous;renderChart();renderXrayData();}
function renderChart(){const name=$('xray-set').value,group=sets[name]||sets.gold,all=[...group.symbols.map(s=>({symbol:s,tv:tv[s]})),...group.extras],v=$('xray-symbol').value;if(!all.some(x=>x.tv===v))return;$('xray-code').textContent=v;$('xray-open').href=chart(v);$('xray-context').textContent=group.note;$('xray-peers').innerHTML=all.map(x=>`<button class="peer ${x.tv===v?'active':''}" type="button" data-tv="${esc(x.tv)}"><strong dir="ltr">${esc(x.symbol)}</strong><small dir="ltr">${esc(x.tv)}</small></button>`).join('');$('xray-peers').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{$('xray-symbol').value=b.dataset.tv;renderChart()}));$('xray-questions').innerHTML=group.questions.map(q=>`<p>◈ ${esc(q)}</p>`).join('');renderXrayData();const widget=$('xray-widget');widget.innerHTML='<div class="tradingview-widget-container"><div class="tradingview-widget-container__widget"></div></div>';const script=document.createElement('script');script.type='text/javascript';script.async=true;script.src='https://s3.tradingview.com/external-embedding/embed-widget-symbol-overview.js';script.textContent=JSON.stringify({symbols:[[v,v+'|1D']],chartOnly:false,width:'100%',height:'100%',locale:'en',colorTheme:'dark',autosize:true,showVolume:false,showMA:false,hideDateRanges:false,hideMarketStatus:false,hideSymbolLogo:false,scalePosition:'right',scaleMode:'Normal',fontFamily:'Arial',fontSize:'11',noTimeScale:false,valuesTracking:'1',changeMode:'price-and-percent',chartType:'area',lineWidth:2,lineType:0,dateRanges:['1d|1','1m|30','3m|60','12m|1D']});widget.querySelector('.tradingview-widget-container').appendChild(script);}
function numeric(x){let s=String(x??'').trim().replace(/[,\s]/g,'');const isPercent=s.endsWith('%');s=s.replace(/[%KMB]$/i,'');let multiplier=1;if(/[KMB]$/i.test(String(x).trim())){const z=String(x).trim().slice(-1).toUpperCase();multiplier={K:1e3,M:1e6,B:1e9}[z]||1;}if(!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s))return null;const n=Number(s)*multiplier;return Number.isFinite(n)?{value:n,unit:isPercent?'percent':'number'}:null;}
// Public data only: visitors never need to import economic results.
function savedPriority(){try{const v=localStorage.getItem('ict-economic-news-priority-v1');return ['important','high','all'].includes(v)?v:'important'}catch{return 'important'}}
let newsFilter=savedPriority(),officialRows=[],nextEvents=[],publicUpdatedAt=null;
function priorityRows(rows,mode=newsFilter){return window.ICTCalendarConsensus?.priorityFilter(rows,mode)||rows.filter(e=>mode==='all'||(mode==='high'?e.impact==='high':['high','medium'].includes(e.impact)))}
function combinedNews(){
 const map=new Map();
 for(const e of [...events,...nextEvents,...officialRows]){
  if(!e||!e.date||!e.title)continue;
  const key=[e.currency,String(e.title).trim().toLowerCase(),e.date].join('|');
  const old=map.get(key);
  // Prefer a real published Actual over a placeholder; never infer missing values.
  if(!old || (String(old.actual||'—')==='—' && String(e.actual||'—')!=='—'))map.set(key,e);
 }
 return [...map.values()].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date));
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
function resultsStatus(message,isError=false){const node=$('results-local-status');if(node){node.textContent=message;node.classList.toggle('bad',isError)}}
function refreshResultsStatus(){const pool=combinedNews(),actual=pool.filter(e=>!['—','', 'null'].includes(String(e.actual??'—'))).length;resultsStatus(pool.length?`بيانات الموقع: ${pool.length} حدث · ${actual} نتيجة فعلية متاحة · لا يلزم استيراد ملفات`:'لا تتوفر أخبار عامة من المصدر حاليًا؛ لا توجد أرقام مفترضة.',!pool.length)}
async function loadPublicOfficialResults(){
 const node=$('official-news-results');if(!node)return;
 try{
  await window.ICTCalendarConsensus?.load().catch(()=>{});
  const response=await fetch('economic-official.json?t='+Date.now(),{cache:'no-store'});
  if(!response.ok)throw Error('fetch failed');
  const feed=await response.json();
  if(feed?.source!=='BLS'||feed.status!=='ok'||!Array.isArray(feed.events))throw Error('bad feed');
  const valid=feed.events.filter(e=>e&&e.source==='BLS'&&e.period&&Number.isFinite(Number(e.actual))&&['%','K'].includes(e.unit));
  // Official BLS observations are rendered in their own section; do not fake a publication timestamp for historical periods.
  publicUpdatedAt=feed.updatedAt||null;
  if(!valid.length)throw Error('no observations');
  await Promise.all([window.ICTEditorialForecasts?.load(),window.ICTCalendarConsensus?.load()]);
  const stages=priorityRows(window.ICTCalendarConsensus?.lifecycle(valid)||[]).slice(0,18);
  const grouped=(window.ICTNewsImpact?.clusters(stages)||[]).filter(x=>x.items.some(i=>i.status!=='غير مكتمل')).slice(0,4);
  const stats=window.ICTNewsImpact?.clusterStats(stages);
  const overview=stats?.total?`<p class="macro-summary">ضمن البيانات المحمّلة: ${stats.total} تقارير متزامنة قابلة للمقارنة · ${stats.mixed} متعارضة · ${stats.partial} جزئية. لا تمثل حركة السعر أو إحصاءً تاريخيًا شاملًا.</p>`:'';
  const groupHtml=grouped.length?`<div class="card-head"><h3>قراءة التقارير الاقتصادية المتزامنة</h3></div>${overview}<div class="results-official-grid macro-report-grid">${grouped.map(x=>`<article class="card macro-report-card"><div class="macro-report-title"><strong>${esc(x.currency)} · ${esc(x.headline)}</strong><small>${when(x.date)}</small></div><ul class="macro-report-items">${x.items.map(i=>`<li><span>${esc(i.name)}</span><small>${esc(i.status)}</small></li>`).join('')}</ul><p class="micro-note">${esc(x.detail)}</p></article>`).join('')}</div>`:'';
  const stageHtml=stages.length?`<div class="card-head"><h3>الأخبار القادمة والنتائج المنتظرة</h3></div><div class="results-official-grid">${stages.map(e=>`<article class="card" style="margin:8px 0;padding:12px"><h3>${esc(e.title)}</h3><p class="micro-note">${esc(e.currency)} · ${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'} · ${when(e.date)} · ${e.stage==='upcoming'?'قادم':e.stage==='released'?'صدرت النتيجة':'بانتظار النتيجة'}</p><div class="metrics"><div><small>السابق</small><strong dir="ltr">${esc(e.previous)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${esc(e.forecast)}</strong></div><div><small>الفعلي</small><strong dir="ltr">${esc(e.actual)}</strong></div></div><p class="micro-note">${e.stage==='upcoming'?'الخبر لم يصدر بعد.':e.stage==='released'?`نتيجة BLS مطابقة للفترة. ${e.difference===null?'لا يوجد توقع صالح للمقارنة.':`الفارق: ${e.difference>0?'+':''}${esc(e.difference)} ${e.unit==='%'?'نقطة مئوية':esc(e.unit||'')}.`}${!e.verifiedBeforeRelease?' المقارنة مرجعية، وقت التوقع قبل الصدور غير مثبت.':''}`:'مر موعد الخبر ولم تظهر نتيجة فعلية في الأجندة المتاحة.'} ${esc(window.ICTNewsImpact?.analyze(e,stages).detail||'')}</p></article>`).join('')}</div>`:'<p class="micro-note">لا توجد أحداث قادمة أو نتائج منتظرة ضمن الأجندة المتاحة.</p>';
  node.innerHTML=groupHtml+stageHtml+`<div class="card-head"><h3>نتائج اقتصادية رسمية — BLS</h3><span class="tag">تحديث تلقائي · أمريكية فقط</span></div><p class="micro-note">آخر جلب ${esc(feed.updatedAt||'غير متاح')} · الفترة هي فترة الإحصاء، لا ساعة صدور الخبر. التوقعات من السجل التحريري أو الأجندة القائمة عند التطابق الصارم؛ وتُميَّز القيم غير المحفوظة قبل النشر.</p><div class="results-official-grid">${valid.map(e=>`<article class="card" style="margin:8px 0;padding:12px"><h3>${esc(e.title)}</h3><p class="micro-note">USD · ${esc(e.period)} · المصدر BLS</p><div class="metrics"><div><small>السابق</small><strong dir="ltr">${e.previous===null?'—':esc(e.previous)+esc(e.unit)}</strong></div><div><small>المتوقع</small><strong dir="ltr">${(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?esc((window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e)).value)+esc(e.unit):'—'}</strong></div><div><small>الفعلي</small><strong dir="ltr">${esc(e.actual)}${esc(e.unit)}</strong></div></div><p class="micro-note">${(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?`المصدر: ${esc((window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e)).source)} · ${window.ICTCalendarConsensus?.find(e)?.verifiedBeforeRelease===false&&!window.ICTEditorialForecasts?.find(e)?'مقارنة حسابية مرجعية: لم يُثبت حفظ التوقع قبل صدور الخبر.':'مقارنة بتوقع محفوظ قبل النشر.'} الفرق: ${((window.ICTEditorialForecasts?.find(e)?window.ICTEditorialForecasts.difference(e):window.ICTCalendarConsensus.comparison(e)?.difference)||0)>0?'+':''}${esc(String(window.ICTEditorialForecasts?.find(e)?window.ICTEditorialForecasts.difference(e):window.ICTCalendarConsensus.comparison(e)?.difference))} ${e.unit==='%'?'نقطة مئوية':esc(e.unit)}. ${esc(window.ICTCalendarConsensus?.interpretation(e)||'')}`:'لا يتوفر توقع مطابق لهذه الفترة.'} لا تمثل النتائج إشارة تداول. ${escapeHTML(window.ICTNewsImpact?.analyze({title:e.title,currency:'USD',stage:'released',actual:String(e.actual)+e.unit,forecast:(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?String((window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e)).value)+e.unit:'—',verifiedBeforeRelease:(window.ICTEditorialForecasts?.find(e)||window.ICTCalendarConsensus?.find(e))?.verifiedBeforeRelease}).detail||'')}</p></article>`).join('')}</div>`;
 }catch{
   const staged=priorityRows(window.ICTCalendarConsensus?.lifecycle([])||[]).slice(0,18);
   node.innerHTML='<div class="card-head"><h3>الأخبار القادمة والنتائج المنتظرة</h3></div>'+(staged.length?staged.map(e=>`<div class="card" style="padding:12px;margin:8px 0"><strong>${esc(e.currency)} · ${esc(e.title)}</strong><p class="micro-note">${e.impact==='high'?'تأثير مرتفع':e.impact==='medium'?'تأثير متوسط':'تأثير آخر'} · ${when(e.date)} · ${e.stage==='upcoming'?'قادم':'بانتظار النتيجة'}</p><div class="metrics"><div><small>السابق</small><strong>${esc(e.previous)}</strong></div><div><small>المتوقع</small><strong>${esc(e.forecast)}</strong></div><div><small>الفعلي</small><strong>—</strong></div></div></div>`).join(''):'<p class="micro-note">لا توجد أحداث صالحة حاليًا في الأجندة العامة.</p>')+'<p class="micro-note">بيانات BLS الرسمية غير متاحة حاليًا. لا تُعرض نتائج مفترضة.</p>';
 }
}
function eventPool(){return combinedNews()}
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
 $('news-feed-status').textContent=eventPool().length?`بيانات الموقع العامة · ${eventPool().length} حدث`:'الأجندة غير متاحة';
 $('news-feed-status').classList.toggle('bad',!eventPool().length);
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
function initEconomicResults(){
 $('news-impact').value=newsFilter;
 $('news-query').addEventListener('input',newsOptions);
 $('news-currency').addEventListener('change',newsOptions);
 $('news-impact').addEventListener('change',e=>{newsFilter=e.target.value;if(newsFilter!=='comparable')try{localStorage.setItem('ict-economic-news-priority-v1',newsFilter)}catch{}newsOptions();loadPublicOfficialResults()});
}
function reactionHistory(){const list=stored(historyKey,[]);return Array.isArray(list)?list.filter(x=>x&&typeof x==='object').slice(0,80):[];}
function renderReactionHistory(){const rows=reactionHistory();$('reaction-history').innerHTML=rows.length?rows.slice(0,12).map(r=>`<div class="history-row"><div><b>${esc(r.title)}</b><small>${esc(r.asset)} · ${esc(r.window)} دقيقة · ${when(r.saved)}</small></div><strong class="${r.percent>=0?'up':'down'}" dir="ltr">${r.percent>0?'+':''}${Number(r.percent).toFixed(3)}%</strong></div>`).join(''):'<p class="empty">لم تُحفظ قياسات بعد. اختر خبرًا وأدخل السعرين من الشارت.</p>';}
function saveReaction(ev){ev.preventDefault();const e=currentEvent();if(!e){$('reaction-result').textContent='اختر خبرًا أولًا.';return;}const form=ev.target;const a=Number(form.elements.before.value),b=Number(form.elements.after.value),windowMin=Number(form.elements.window.value);if(!Number.isFinite(a)||a<=0||!Number.isFinite(b)||b<=0||![1,5,15,30,60].includes(windowMin)){ $('reaction-result').textContent='أدخل سعرين موجبين وفترة صحيحة.';return;}const item={id:e.id,title:e.title,date:e.date,asset:form.elements.asset.value,window:windowMin,before:a,after:b,percent:(b/a-1)*100,notes:String(form.elements.notes.value||'').slice(0,180),saved:new Date().toISOString()};const result=[item,...reactionHistory()].slice(0,80);$('reaction-result').textContent=setStored(historyKey,result)?`حُفظت الحركة: ${item.percent>0?'+':''}${item.percent.toFixed(3)}% خلال ${windowMin} دقيقة — حسب الأسعار التي أدخلتها.`:'تعذر الحفظ المحلي.';renderReactionHistory();}
function exportReactions(){const rows=reactionHistory();if(!rows.length){$('reaction-result').textContent='لا توجد قياسات لتصديرها.';return;}const fields=['date','title','asset','window','before','after','percent','notes','saved'];const cell=x=>'"'+String(x??'').replace(/"/g,'""')+'"';const csv='\uFEFF'+[fields.join(','),...rows.map(r=>fields.map(k=>cell(r[k])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='ICT_News_Reactions.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}

// Public-data Market X-Ray: use only matched daily close-to-close returns, never cross-time quote comparisons.
function xrayReturns(item){
 const series=Array.isArray(item?.points)?item.points:[];
 const rows=series.filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x.date))&&Number.isFinite(Number(x.close))&&Number(x.close)>0)
   .map(x=>({date:x.date,close:Number(x.close)})).sort((a,b)=>a.date.localeCompare(b.date));
 const results=[];
 for(let i=1;i<rows.length;i++){
   // Daily returns only; missing days are not filled artificially.
   if(rows[i].date===rows[i-1].date)continue;
   const delta=(rows[i].close/rows[i-1].close-1)*100;
   if(Number.isFinite(delta)&&Math.abs(delta)<90)results.push({date:rows[i].date,value:delta});
 }
 return results;
}
function xrayCorrelation(a,b){
 const lookup=new Map(b.map(x=>[x.date,x.value]));
 const paired=a.filter(x=>lookup.has(x.date)).map(x=>[x.value,lookup.get(x.date)]).slice(-20);
 if(paired.length<10)return null;
 const mx=paired.reduce((s,x)=>s+x[0],0)/paired.length,my=paired.reduce((s,x)=>s+x[1],0)/paired.length;
 let xx=0,yy=0,xy=0;
 for(const [x,y] of paired){xx+=(x-mx)**2;yy+=(y-my)**2;xy+=(x-mx)*(y-my)}
 if(xx<=1e-14||yy<=1e-14)return null;
 return {value:Math.max(-1,Math.min(1,xy/Math.sqrt(xx*yy))),count:paired.length};
}
function renderXrayData(){
 const node=$('xray-data'),state=$('xray-feed-status');if(!node||!state)return;
 const group=sets[$('xray-set')?.value]||sets.gold;
 const all=[...group.symbols.map(s=>({symbol:s,tv:tv[s]})),...group.extras];
 const data=Array.isArray(xrayFeed?.items)?xrayFeed.items:[];
 const latest=Date.parse(xrayFeed?.updatedAt),tooOld=!Number.isFinite(latest)||Date.now()-latest>36*60*60*1000;
 state.textContent=!data.length?'البيانات غير منشورة بعد':`تحديث ${when(xrayFeed.updatedAt)}${tooOld?' · قديم':''}`;
 state.classList.toggle('bad',!data.length||tooOld);
 if(!data.length||tooOld){node.innerHTML=tooOld&&data.length?'<p class="empty">بيانات المقارنة اليومية متأخرة؛ أوقفنا مؤقتًا حساب الارتباط والتغيرات حتى يتجدد المصدر. قد يكون السوق في عطلة، ويمكنك فتح الشارت المرجعي أعلاه.</p>':'<p class="empty">بيانات المقارنة غير متاحة حاليًا. سيتم عرضها تلقائيًا بعد نجاح مهمة تحديث المصدر على الموقع، دون حاجة إلى أي ملف من الزائر.</p>';return}
 const picked=all.find(x=>x.tv===$('xray-symbol').value)||all[0];
 const base=data.find(x=>x.symbol===picked.symbol);const baseReturns=xrayReturns(base);
 const recent=baseReturns.at(-1);
 const summary=recent?`أحدث إغلاق مرجعي ${esc(recent.date)} · تغير الجلسة ${recent.value>=0?'+':''}${recent.value.toFixed(2)}%`:'السلسلة المرجعية غير متاحة لهذه الأداة';
 node.innerHTML=`<p class="micro-note xray-selected">المرجع: <strong dir="ltr">${esc(picked.symbol)}</strong> · ${summary}</p><div class="xray-metrics">${all.map(asset=>{
  const item=data.find(x=>x.symbol===asset.symbol);const r=xrayReturns(item);const now=r.at(-1);const comparison=asset.symbol===picked.symbol?null:xrayCorrelation(baseReturns,r);
  const synced=recent&&now&&recent.date===now.date;
  const label=comparison?`ارتباط 20 عائدًا مشتركًا كحد أقصى: ${comparison.value.toFixed(2)} (${comparison.count} جلسة)`:
    asset.symbol===picked.symbol?'الأصل المرجعي':'بيانات متزامنة غير كافية لحساب الارتباط';
  return `<div class="xray-metric"><div class="xray-metric-head"><strong dir="ltr">${esc(asset.symbol)}</strong>${item?.proxy?'<small>عقد/مؤشر مرجعي</small>':''}</div><div class="xray-metric-change ${now?(now.value>=0?'up':'down'):''}" dir="ltr">${now?`${now.value>=0?'+':''}${now.value.toFixed(2)}%`:'—'}</div><small>${now?`إغلاق ${esc(now.date)}`:'بيانات غير متاحة'}</small><span class="xray-metric-note">${label}${!synced&&now&&recent?' · آخر إغلاقين بتاريخين مختلفين':''}</span></div>`;
 }).join('')}</div><p class="micro-note">الارتباط محسوب من العوائد اليومية ذات التاريخ المشترك فقط (حد أقصى 20 ملاحظة)، ولا يعني تبعية أو توافقًا آنيًا. ${tooOld?'بيانات المصدر متأخرة؛ لا تستخدمها كإشارة لحظية.':''} ${!base?'لا تتوفر سلسلة مرجعية لهذا الرمز؛ لا يمكن حساب ارتباطاته.':''}</p>`;
}


// 6.8.96 — Event watch plan: explicit manual planning, not an automatic trading signal.
const eventWatchKey='ict-event-watch-plans-v1';
let eventWatchSelected='';
const eventWatchAssets={
 USD:['XAUUSD','EURUSD','GBPUSD','USDJPY','NAS100','SP500','DJ30','BTCUSD'],
 EUR:['EURUSD','USDCHF'],GBP:['GBPUSD'],JPY:['USDJPY'],CHF:['USDCHF'],
 CAD:['USDCAD','WTI'],AUD:['AUDUSD'],NZD:['NZDUSD']
};
function eventWatchUpcoming(){
 const now=Date.now(),to=now+7*86400000;
 return combinedNews().filter(e=>{
  const t=Date.parse(e.date);
  return Number.isFinite(t)&&t>now&&t<=to&&['high','medium'].includes(e.impact)&&e.currency;
 }).sort((a,b)=>Date.parse(a.date)-Date.parse(b.date)).slice(0,35);
}
function eventWatchPlans(){const value=stored(eventWatchKey,{});return value&&typeof value==='object'&&!Array.isArray(value)?value:{}}
function eventWatchEvent(){return eventWatchUpcoming().find(e=>e.id===eventWatchSelected)||null}
function eventWatchSummary(){
 const e=eventWatchEvent(),summary=$('event-plan-summary'),links=$('event-plan-links'),save=$('event-plan-save'),open=$('event-plan-open');
 if(!e){summary.textContent='لا توجد أحداث متوسطة أو مرتفعة التأثير خلال الأيام السبعة المقبلة ضمن البيانات المتاحة. تأكد من الأجندة لاحقًا.';links.replaceChildren();save.disabled=true;open.disabled=true;return}
 save.disabled=false;open.disabled=false;
 summary.textContent=`${e.currency} · ${when(e.date)} · ${e.impact==='high'?'تأثير مرتفع':'تأثير متوسط'} · السابق: ${e.previous} · المتوقع: ${e.forecast} · الفعلي: ${e.actual}`;
 const relevant=eventWatchAssets[e.currency]||[];
 links.replaceChildren();
 const lead=document.createElement('span');lead.textContent='أصول للمتابعة حسب عملة الخبر (دون افتراض اتجاه):';links.append(lead);
 if(!relevant.length){const msg=document.createElement('small');msg.textContent='لا توجد قائمة جاهزة لهذه العملة؛ اختر الأصل بنفسك.';links.append(msg);return}
 relevant.filter(a=>allowed.includes(a)).forEach(asset=>{
  const button=document.createElement('button');button.type='button';button.textContent=asset;button.dataset.watchAsset=asset;
  button.className=$('event-plan-asset').value===asset?'selected':'';
  button.addEventListener('click',()=>{$('event-plan-asset').value=asset;eventWatchSummary()});links.append(button);
 });
}
function eventWatchRestore(){
 const current=eventWatchEvent(),plans=eventWatchPlans(),saved=current?plans[current.id]:null;
 $('event-plan-asset').value=allowed.includes(saved?.asset)?saved.asset:(eventWatchAssets[current?.currency]?.find(a=>allowed.includes(a))||selected);
 $('event-plan-notes').value=typeof saved?.notes==='string'?saved.notes.slice(0,300):'';
 document.querySelectorAll('[data-plan-check]').forEach(c=>{c.checked=Boolean(saved?.checks?.[c.dataset.planCheck])});
 $('event-plan-status').textContent=saved?'خطة محفوظة لهذا الخبر على الجهاز.':'لم تحفظ خطة لهذا الخبر بعد.';
 eventWatchSummary();
}
function renderEventWatch(){
 const list=eventWatchUpcoming(),pick=$('event-plan-event');if(!pick)return;
 const previous=eventWatchSelected;
 pick.replaceChildren();
 if(!list.length){const option=document.createElement('option');option.value='';option.textContent='لا تتوفر أخبار قادمة خلال 7 أيام';pick.add(option);eventWatchSelected='';eventWatchRestore();return}
 list.forEach(e=>{const option=document.createElement('option');option.value=e.id;option.textContent=`${e.currency} · ${e.title} · ${when(e.date)}`;pick.add(option)});
 eventWatchSelected=list.some(x=>x.id===previous)?previous:list[0].id;
 pick.value=eventWatchSelected;
 eventWatchRestore();
}
function eventWatchSave(){
 const e=eventWatchEvent();if(!e){$('event-plan-status').textContent='لا يوجد خبر صالح لحفظ الخطة.';return}
 const checks={};document.querySelectorAll('[data-plan-check]').forEach(c=>{checks[c.dataset.planCheck]=c.checked});
 const plans=eventWatchPlans();plans[e.id]={asset:$('event-plan-asset').value,notes:$('event-plan-notes').value.trim().slice(0,300),checks,updatedAt:new Date().toISOString(),title:e.title,date:e.date,currency:e.currency};
 // Keep a bounded local-only history; no information is sent to the server.
 const entries=Object.entries(plans).sort((a,b)=>String(b[1]?.updatedAt||'').localeCompare(String(a[1]?.updatedAt||''))).slice(0,50);
 $('event-plan-status').textContent=setStored(eventWatchKey,Object.fromEntries(entries))?'تم حفظ الخطة على هذا الجهاز.':'تعذر الحفظ المحلي؛ تحقق من إعدادات التخزين.';
}
function eventWatchOpenNews(){
 const e=eventWatchEvent();if(!e)return;
 document.querySelector('[data-tab="news"]')?.click();
 $('news-impact').value='all';newsFilter='all';$('news-query').value='';$('news-currency').value='';newsOptions();
 const pick=$('news-select');if([...pick.options].some(o=>o.value===e.id)){pick.value=e.id;renderNewsReview()}else $('news-feed-status').textContent='افتح الخبر من قائمة المختبر؛ قد يكون تغيّر مع تحديث المصدر.';
 history.replaceState(null,'','#news');
 $('panel-news').scrollIntoView({behavior:'smooth',block:'start'});
}
function initEventWatch(){
 const asset=$('event-plan-asset');if(!asset||!$('event-plan-event'))return;
 allowed.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;asset.add(o)});
 $('event-plan-event').addEventListener('change',e=>{eventWatchSelected=e.target.value;eventWatchRestore()});
 asset.addEventListener('change',eventWatchSummary);
 $('event-plan-save').addEventListener('click',eventWatchSave);
 $('event-plan-open').addEventListener('click',eventWatchOpenNews);
 renderEventWatch();scenarioRenderUpcoming();
}


// 6.8.97: Local scenario journal. Pre-event assertions and post-event reflections are separate.
const scenarioKey='ict-event-scenarios-v1';
let scenarioSelectedId='',scenarioHistoryId='';
const scenarioFields=['higher','lower','equal','risk'];
const scenarioLabel={higher:'أعلى من المتوقع',lower:'أقل من المتوقع',equal:'مطابق أو قريب',other:'حركة مختلفة', 'no-trade':'لم أتداول / لم أتابع'};
function scenarioRecords(){const x=stored(scenarioKey,{});return x&&typeof x==='object'&&!Array.isArray(x)?x:{}}
function scenarioIdentity(e){return [e?.currency||'',String(e?.title||'').trim().toLowerCase(),e?.date||''].join('|')}
function scenarioEvent(){return eventWatchUpcoming().find(e=>e.id===scenarioSelectedId)||null}
function scenarioCurrentRecord(){return scenarioRecords()[scenarioHistoryId]||null}
function scenarioSourceEvent(record){return combinedNews().find(e=>scenarioIdentity(e)===record.identity)||null}
function scenarioHasActual(e){return Boolean(e&&e.actual!=null&&!['','—','-','null','undefined','n/a'].includes(String(e.actual).trim().toLowerCase()))}
function scenarioIsBefore(record){return Number.isFinite(Date.parse(record?.date))&&Date.now()<Date.parse(record.date)}
function scenarioStatus(id,text){const x=$(id);if(x)x.textContent=text}
function scenarioSetFields(record){for(const f of scenarioFields){const el=$('scenario-'+f);if(el)el.value=String(record?.fields?.[f]||'').slice(0,240)}}
function scenarioRenderHistory(){
 const records=scenarioRecords(),rows=Object.entries(records).filter(([,r])=>r&&r.title&&r.date).sort((a,b)=>String(b[1].savedAt||'').localeCompare(String(a[1].savedAt||''))).slice(0,50);
 const sel=$('scenario-history'),preferred=scenarioHistoryId;
 sel.replaceChildren();const empty=document.createElement('option');empty.value='';empty.textContent=rows.length?'اختر السيناريو للمراجعة':'لا توجد سيناريوهات محفوظة';sel.append(empty);
 for(const [id,r] of rows){const option=document.createElement('option');option.value=id;option.textContent=`${r.currency||''} · ${r.title} · ${when(r.date)}`;sel.add(option)}
 scenarioHistoryId=rows.some(([id])=>id===preferred)?preferred:(rows[0]?.[0]||'');sel.value=scenarioHistoryId;
 scenarioRenderReview();
}
function scenarioRenderReview(){
 const r=scenarioCurrentRecord(),snapshot=$('scenario-review-snapshot'),save=$('scenario-review-save');
 if(!r){snapshot.textContent='لا توجد سيناريوهات محفوظة للمراجعة.';save.disabled=true;$('scenario-observed').value='';$('scenario-review-notes').value='';scenarioStatus('scenario-review-status','');return}
 const e=scenarioSourceEvent(r),passed=!scenarioIsBefore(r),actual=scenarioHasActual(e)?String(e.actual):null;
 const compare=actual?compareEvent(e):{comparable:false};
 const verdict=!actual?'النتيجة الفعلية غير منشورة في المصدر المتاح':compare.comparable?(compare.difference>0?'النتيجة أعلى حسابيًا من المتوقع':compare.difference<0?'النتيجة أقل حسابيًا من المتوقع':'النتيجة مطابقة حسابيًا للتوقع'):'النتيجة منشورة، لكن لا تتوفر مقارنة رقمية صالحة';
 snapshot.replaceChildren();
 const title=document.createElement('strong');title.textContent=`${r.currency||''} · ${r.title}`;snapshot.append(title);
 for(const message of [`الموعد المسجل: ${when(r.date)} · الأصل: ${r.asset||'—'}`,`المتوقع المحفوظ وقت إعداد السيناريو: ${r.forecast||'—'} · الفعلي من المصدر: ${actual||'—'}`,verdict,`خُزنت السيناريوهات: ${when(r.savedAt)}`]){const line=document.createElement('div');line.textContent=message;snapshot.append(line)}
 for(const field of ['higher','lower','equal','risk']){if(r.fields?.[field]){const line=document.createElement('p');line.textContent=`${field==='risk'?'حدود المخاطرة':scenarioLabel[field]}: ${r.fields[field]}`;snapshot.append(line)}}
 const observed=$('scenario-observed'),notes=$('scenario-review-notes');observed.value=r.review?.observed||'';notes.value=r.review?.notes||'';
 observed.disabled=!passed;notes.disabled=!passed;save.disabled=!passed;
 scenarioStatus('scenario-review-status',passed?'الحدث تجاوز موعده المسجل؛ أضف مراجعتك اليدوية. غياب النتيجة الفعلية لا يمنع تدوين ما شاهدته، لكنه لا يؤكد نتيجتها.':'لم يحن موعد الخبر المسجل بعد. السيناريوهات السابقة محفوظة ومفتوحة للقراءة فقط هنا.');
}
function scenarioRestoreEditor(){
 const e=scenarioEvent(),records=scenarioRecords(),record=e?records[e.id]:null,save=$('scenario-save');
 if(!e){$('scenario-snapshot').textContent='لا تتوفر أخبار قادمة مناسبة لإنشاء سيناريو الآن.';scenarioSetFields(null);save.disabled=true;scenarioStatus('scenario-save-status','');return}
 scenarioSetFields(record);
 $('scenario-snapshot').textContent=`${e.currency} · ${e.title} · ${when(e.date)} · المتوقع المنشور: ${e.forecast} · السابق: ${e.previous} · الأصل: ${$('event-plan-asset').value}`;
 save.disabled=false;scenarioStatus('scenario-save-status',record?'سيناريو محفوظ. يمكن تعديله حتى موعد الخبر المسجل.':'لم تُحفظ سيناريوهات لهذا الخبر بعد.');
}
function scenarioRenderUpcoming(){
 const pick=$('scenario-event');if(!pick)return;
 const items=eventWatchUpcoming(),prev=scenarioSelectedId;
 const oldOptions=[...pick.options].map(o=>o.value).filter(Boolean).join('|');
 const newOptions=items.map(e=>e.id).join('|');
 if(oldOptions===newOptions && items.some(e=>e.id===prev)){scenarioRenderHistory();return}
 pick.replaceChildren();if(!items.length){const empty=document.createElement('option');empty.value='';empty.textContent='لا توجد أخبار قادمة متاحة';pick.append(empty);scenarioSelectedId='';scenarioRestoreEditor();scenarioRenderHistory();return}
 items.forEach(e=>{const o=document.createElement('option');o.value=e.id;o.textContent=`${e.currency} · ${e.title} · ${when(e.date)}`;pick.append(o)});
 scenarioSelectedId=items.some(e=>e.id===prev)?prev:items[0].id;pick.value=scenarioSelectedId;
 scenarioRestoreEditor();scenarioRenderHistory();
}
function scenarioSave(){
 const e=scenarioEvent();if(!e||Date.parse(e.date)<=Date.now()){scenarioStatus('scenario-save-status','لا يمكن حفظ توقع جديد بعد موعد الخبر.');return}
 const records=scenarioRecords(),existing=records[e.id];
 const fields=Object.fromEntries(scenarioFields.map(f=>[f,$('scenario-'+f).value.trim().slice(0,240)]));
 if(!Object.values(fields).some(Boolean)){scenarioStatus('scenario-save-status','اكتب سيناريو أو حدًا للمخاطرة قبل الحفظ.');return}
 const entry={id:e.id,identity:scenarioIdentity(e),date:e.date,title:e.title,currency:e.currency,asset:$('event-plan-asset').value,forecast:e.forecast,previous:e.previous,fields,savedAt:new Date().toISOString(),review:existing?.review||null};
 records[e.id]=entry;
 const rows=Object.entries(records).sort((a,b)=>String(b[1]?.savedAt||'').localeCompare(String(a[1]?.savedAt||''))).slice(0,50);
 if(setStored(scenarioKey,Object.fromEntries(rows))){scenarioHistoryId=e.id;scenarioRenderHistory();scenarioStatus('scenario-save-status','تم حفظ السيناريوهات بتاريخ ووقت الحفظ على هذا الجهاز.')}else scenarioStatus('scenario-save-status','تعذر الحفظ المحلي؛ قد تكون المساحة أو صلاحيات التخزين غير متاحة.');
}
function scenarioSaveReview(){
 const records=scenarioRecords(),r=records[scenarioHistoryId];if(!r)return;
 if(scenarioIsBefore(r)){scenarioStatus('scenario-review-status','مراجعة ما بعد الخبر لا تُحفظ قبل الموعد المسجل.');return}
 const observed=$('scenario-observed').value,notes=$('scenario-review-notes').value.trim().slice(0,400);
 if(!observed||!notes){scenarioStatus('scenario-review-status','اختر ما لاحظته على الشارت واكتب درسًا أو ملاحظة قبل الحفظ.');return}
 r.review={observed,notes,savedAt:new Date().toISOString()};
 scenarioStatus('scenario-review-status',setStored(scenarioKey,records)?'تم حفظ مراجعة ما بعد الخبر بصورة منفصلة عن السيناريو الأصلي.':'تعذر حفظ المراجعة على الجهاز.');
}
function scenarioOpenNews(){
 const e=scenarioEvent();if(!e)return;
 eventWatchSelected=e.id;eventWatchOpenNews();
}
function initScenarios(){
 if(!$('scenario-event'))return;
 $('scenario-event').addEventListener('change',e=>{scenarioSelectedId=e.target.value;scenarioRestoreEditor()});
 $('scenario-history').addEventListener('change',e=>{scenarioHistoryId=e.target.value;scenarioRenderReview()});
 $('scenario-save').addEventListener('click',scenarioSave);
 $('scenario-review-save').addEventListener('click',scenarioSaveReview);
 $('scenario-open-news').addEventListener('click',scenarioOpenNews);
 $('event-plan-asset')?.addEventListener('change',()=>{const e=scenarioEvent();if(e)scenarioRestoreEditor()});
 scenarioRenderUpcoming();
}

async function refreshMarketSources(){
 const [m,c,r,n,x]=await Promise.all(['market-movers.json','calendar-live.json','market-radar.json','calendar-next.json','market-xray.json'].map(json));
 nextEvents=normalizeEvents(n);radarAt=r?.updatedAt||null;
 radarRows=Array.isArray(r?.items)?r.items.filter(x=>allowed.includes(x.symbol)&&typeof x.quotedAt==='string').map(x=>({symbol:x.symbol,quotedAt:x.quotedAt,proxy:Boolean(x.proxy),...Object.fromEntries(['5','15','60'].map(k=>[k,Number.isFinite(Number(x[k]))&&x[k]!=null?Number(x[k]):null]))})):[];
 moversAt=m?.updatedAt||null;
 movers=Array.isArray(m?.items)?m.items.filter(x=>allowed.includes(x.symbol)&&Number.isFinite(Number(x.change))).map(x=>({symbol:x.symbol,label:x.label,category:String(x.category||''),quotedAt:x.quotedAt||m?.updatedAt,change:Number(x.change),price:(x.price!=null&&Number.isFinite(Number(x.price))&&Number(x.price)>0)?Number(x.price):null,proxy:Boolean(x.proxy)})):[];
 calendarAt=c?.updated_at||c?.updatedAt||null;events=normalizeEvents(c);
 xrayFeed=x;renderRadar();newsOptions();renderReactionHistory();renderXray();renderEventWatch();scenarioRenderUpcoming();
}
async function boot(){initTabs();$('radar-asset').innerHTML=allowed.map(s=>`<option value="${s}">${s}</option>`).join('');$('radar-asset').value=selected;$('radar-asset').addEventListener('change',e=>selectRadar(e.target.value));const radarSaved=stored(radarPrefsKey,{});for(const [id,key] of [['radar-window','window'],['radar-group','group'],['radar-direction','direction']]){const el=$(id);if(el&&Array.from(el.options).some(o=>o.value===radarSaved[key]))el.value=radarSaved[key];el?.addEventListener('change',()=>{setStored(radarPrefsKey,radarFilter());renderRadar()});}$('save-radar').addEventListener('click',saveChecks);$('reset-radar').addEventListener('click',resetChecks);$('xray-set').addEventListener('change',renderXray);$('xray-symbol').addEventListener('change',renderChart);$('news-select').addEventListener('change',renderNewsReview);initEconomicResults();loadPublicOfficialResults();setInterval(loadPublicOfficialResults,30*60*1000);$('reaction-form').addEventListener('submit',saveReaction);$('export-reactions').addEventListener('click',exportReactions);
 initEventWatch();initScenarios();await refreshMarketSources();setInterval(refreshMarketSources,10*60*1000);}

boot();
