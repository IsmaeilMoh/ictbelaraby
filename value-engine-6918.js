/* ICT بالعربي 6.9.18: Four evidence-first improvements in under-served public sections. */
(()=>{'use strict';
const root=document.getElementById('app');if(!root)return;
const E=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const F=(n,d=2)=>Number.isFinite(n)?new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(n):'—';
const num=v=>v===''||v===null||v===undefined?NaN:Number(v);
const now=()=>Date.now(),age=v=>{let t=Date.parse(v||'');return Number.isFinite(t)?(now()-t)/3600000:NaN};
const ageLabel=(h)=>!Number.isFinite(h)?'وقت المصدر غير متاح':h<-.083?'توقيت المصدر غير صالح':h<1?'أقل من ساعة':h<24?`${F(h,1)} ساعة`:`${F(h/24,1)} يوم`;
const dated=(v)=>{const t=Date.parse(v||'');return Number.isFinite(t)?new Date(t).toLocaleString('ar-EG',{dateStyle:'medium',timeStyle:'short'}):'غير معروف'};
const key='ict-value-6918';
const defaultState={watch:['XAUUSD','EURUSD','NAS100'],newsAsset:'XAUUSD',newsHorizon:72,studyDraft:'',studyAsset:'XAUUSD',studyRule:'',studyInvalidation:'',studyEvidence:'',studyOutcome:'',studyUpdated:''};
const watchSymbol=/^[A-Z0-9][A-Z0-9._-]{0,34}$/;
const watchMarkets=['crypto','forex','metals','indices','stocks','energy'];
function watchEntry(key){
 const [group,value]=key.split(':');
 return value?{market:group,symbol:value}:{market:null,symbol:group};
}
let state;try{state={...defaultState,...JSON.parse(localStorage.getItem(key)||'{}')}}catch{state={...defaultState}};
if(!Array.isArray(state.watch))state.watch=[...defaultState.watch];state.watch=state.watch.filter(key=>{
 if(typeof key!=='string')return false;
 const {market,symbol}=watchEntry(key);
 return watchSymbol.test(symbol)&&(market?watchMarkets.includes(market)&&key===market+':'+symbol:key===symbol);
}).slice(0,15);
function save(){try{localStorage.setItem(key,JSON.stringify(state))}catch{}}
const cache={};const source=async f=>{if(cache[f]&&now()-cache[f].time<60000)return cache[f].value;try{const r=await fetch('./'+f,{cache:'no-store'});if(!r.ok)throw Error('HTTP '+r.status);const x=await r.json();cache[f]={time:now(),value:x};return x}catch{return null}};
const items=x=>Array.isArray(x)?x:Array.isArray(x?.items)?x.items:[];
const symMap={XAUUSD:['USD','ذهب','الذهب','gold','xau'],XAGUSD:['USD','فضة','silver'],EURUSD:['EUR','USD','يورو','euro'],GBPUSD:['GBP','USD','جنيه','sterling','britain'],USDJPY:['USD','JPY','ين','japan'],USDCHF:['USD','CHF','فرنك','swiss'],USDCAD:['USD','CAD','كندا','canada'],AUDUSD:['AUD','USD','استراليا','australia'],NZDUSD:['NZD','USD','نيوزيلندا'],NAS100:['USD','NASDAQ','ناسداك','technology','tech'],SP500:['USD','S&P','الأسهم الأمريكية','stocks'],DJ30:['USD','dow','داو','stocks'],BTCUSD:['USD','BTC','bitcoin','بيتكوين'],ETHUSD:['USD','ETH','ethereum','إيثريوم']};
const ccy=s=>{const k=String(s||'').toUpperCase();return (symMap[k]||[k.slice(0,3),k.slice(3)]).filter(x=>/^[A-Z]{3}$/.test(x))};
const title=(n,t,p)=>`<header class="ve-head"><span class="ve-eyebrow">${E(n)} • 6.9.18</span><h2>${E(t)}</h2><p>${E(p)}</p></header>`;
const wrap=(slug,inner)=>`<section class="ve-lab" id="ve-${slug}" aria-label="${E(slug)}">${inner}</section>`;
const warning=s=>`<p class="ve-warning">${E(s)}</p>`;
const badge=s=>`<span class="ve-badge">${E(s)}</span>`;
function insert(page,html){if(location.hash.slice(1)!==page||!root)return null;const section=document.createElement('div');section.innerHTML=html;const el=section.firstElementChild;const heading=root.querySelector('.lead');const calcGrid=page==='calculators'?root.querySelector('.calc-grid'):null;if(calcGrid)calcGrid.insertAdjacentElement('afterend',el);else if(heading)heading.insertAdjacentElement('afterend',el);else root.prepend(el);return el}
function watchTable(rows,stamp,basis,catalog){
 const ts=age(stamp),stale=!Number.isFinite(ts)||ts<-.083||ts>6;
 const body=state.watch.map(key=>{
  const {market,symbol}=watchEntry(key);
  const group=market||watchMarkets.find(m=>m!=='crypto'&&catalog?.list(m).includes(symbol));
  const x=group==='crypto'?null:rows.find(row=>row.symbol===symbol);
  const h=x?age(x.quotedAt||stamp):NaN,ok=!stale&&Number.isFinite(h)&&h>=-.083&&h<=6;
  const price=num(x?.price),change=num(x?.change);
  const chart=/^https:\/\/[\w.-]+\//.test(x?.url||'')?x.url:'';
  const link=group&&catalog?catalog.marketUrl(group,symbol):null;
  return `<tr><td><strong dir="ltr">${E(symbol)}</strong>${market&&catalog?`<br><small>${E(catalog.labels[market])}</small>`:''}</td>
  <td dir="ltr">${ok&&price>0?F(price,6):'—'}</td><td dir="ltr" class="${change>=0?'ve-up':'ve-down'}">${ok&&Number.isFinite(change)?(change>0?'+':'')+F(change,2)+'%':'—'}</td>
  <td>${x?E(ageLabel(h)):'لا توجد قراءة في اللقطة'}</td>
  <td>${chart?`<a target="_blank" rel="noopener noreferrer" href="${E(chart)}">شارت ↗</a>`:''}
  ${link?`<a href="${E(link)}">افحص الأصل ↗</a>`:''}</td></tr>`;
 }).join('');
 return `<div class="ve-trust">مصدر اللقطة: ${E(basis||'غير متاح')} · عمر الملف: ${ageLabel(ts)}</div>
 ${stale?warning('لقطة الأسعار قديمة أو غير متاحة.'):''}
 <div class="ve-table-wrap"><table><thead><tr><th>الأصل</th><th>السعر المرجعي</th><th>التغير المعلن</th><th>عمر السعر</th><th>الروابط</th></tr></thead>
 <tbody>${body||'<tr><td colspan="5">أضف أصلًا لبدء المتابعة.</td></tr>'}</tbody></table></div>`;
}
function markets(box){
 const catalog=window.ICTMarketCatalog;
 box.innerHTML=title('MARKET WATCHLIST','قائمة مراقبة الأسواق','اختر الأصول من دليل مركز الفرص، وراجع سعر اللقطة عند توفره.')+`
 <div class="ve-controls"><label>فئة السوق<select id="ve-watch-market"></select></label>
 <label>بحث بالرمز<input id="ve-watch-find" type="search" autocomplete="off"></label>
 <label>أضف أصلًا من القائمة<select id="ve-watch-add"></select></label>
 <button type="button" data-ve-add>إضافة للمتابعة</button><button type="button" data-ve-clear>استعادة القائمة الأساسية</button></div>
 <p id="ve-watch-status" role="status"></p><div class="ve-chips"></div><div id="ve-watch-table"></div>`;
 const get=selector=>box.querySelector(selector);
 const market=get('#ve-watch-market'),find=get('#ve-watch-find'),select=get('#ve-watch-add'),status=get('#ve-watch-status'),add=get('[data-ve-add]');
 let snapshot,candidates=[];
 function fill(){
  const previous=select.value,term=find.value.toUpperCase().trim();
  candidates=catalog?.list(market.value)||[];
  const existing=new Set(state.watch.filter(key=>key.startsWith(market.value+':')||(!key.includes(':')&&market.value!=='crypto')).map(key=>watchEntry(key).symbol));
  const options=candidates.filter(symbol=>!existing.has(symbol)&&symbol.includes(term));
  select.replaceChildren(new Option(options.length?'اختر الأصل':'لا توجد أصول مطابقة',''),...options.map(symbol=>new Option(symbol,symbol)));
  if(options.includes(previous))select.value=previous;
  add.disabled=!select.value||state.watch.length>=15;
 }
 let request=0;
 async function refresh(){
  const id=++request,group=market.value;
  fill();
  status.textContent='جارٍ تحديث دليل الأصول…';
  try{
   const full=await catalog.load(group);
   if(!box.isConnected||id!==request)return;
   fill();render();
   status.textContent=candidates.length+' أصلًا · '+(full?'دليل المزوّد':'القائمة الأساسية');
  }catch{
   if(box.isConnected&&id===request)status.textContent='تعذّر تحديث الدليل؛ تظهر القائمة الأساسية.';
  }
 }
 function render(){
  get('.ve-chips').innerHTML=state.watch.map(key=>{
   const {symbol,market}=watchEntry(key);
   return `<button type="button" data-ve-remove="${E(key)}" title="إزالة ${E(symbol)}${market?' · '+E(catalog?.labels[market]):''}">${E(symbol)} ×</button>`;
  }).join('');
  get('#ve-watch-table').innerHTML=watchTable(items(snapshot),snapshot?.updatedAt,snapshot?.changeBasis,catalog);
 }
 select.addEventListener('change',()=>{add.disabled=!select.value||state.watch.length>=15});
 find.addEventListener('input',fill);
 market.addEventListener('change',()=>{find.value='';refresh()});
 add.addEventListener('click',()=>{
  const symbol=select.value,key=market.value+':'+symbol;
  if(candidates.includes(symbol)&&!state.watch.includes(key)&&state.watch.length<15){state.watch.push(key);save();fill();render();}
 });
 get('[data-ve-clear]').addEventListener('click',()=>{state.watch=[...defaultState.watch];save();fill();render()});
 get('.ve-chips').addEventListener('click',event=>{
  const button=event.target.closest('[data-ve-remove]');
  if(button){state.watch=state.watch.filter(key=>key!==button.dataset.veRemove);save();fill();render();}
 });
 render();
 source('market-movers.json').then(data=>{if(box.isConnected){snapshot=data;render();}});
 if(catalog){catalog.options(market);refresh();}
 else{fill();status.textContent='دليل الأصول غير متاح. حدّث الصفحة وحاول مجددًا.';}
}
function relevance(x,s){const parts=ccy(s),text=[x.title,x.sum,x.tag].filter(Boolean).join(' ').toLowerCase();const terms=[...parts,...(symMap[s]||[])];const hits=terms.filter(t=>String(t).length>2&&text.includes(String(t).toLowerCase()));const broad=/(فيدرالي|التضخم|الفائدة|البنك المركزي|cpi|nfp|fed|interest rate|employment|البطالة|الدولار)/i.test(text);return {hits:[...new Set(hits)],broad};}
async function news(box){const [p,arch]=await Promise.all([source('news-live.json'),source('news.json')]);if(!box.isConnected)return;const src=Array.isArray(p?.items)?p: Array.isArray(arch)?{items:arch,updated_at:null,mode:'archive'}:null;const h=age(src?.updated_at),invalid=!Number.isFinite(h)||h>24||h<-.083;const asset=state.newsAsset;
const selected=items(src).map(x=>({...x,match:relevance(x,asset)})).filter(x=>x.match.hits.length||x.match.broad).sort((a,b)=>(b.match.hits.length-a.match.hits.length)||Date.parse(b.date||0)-Date.parse(a.date||0)).slice(0,12);
box.innerHTML=title('NEWS RELEVANCE','غرفة فرز الأخبار حسب الأصل','بدل قراءة عشرات العناوين، اعرض الأخبار التي تذكر الأصل أو عملاته، مع فصل المطابقة المباشرة عن السياق الاقتصادي العام.')+`<div class="ve-controls"><label>الأصل محل الاهتمام<select id="ve-news-asset">${Object.keys(symMap).map(s=>`<option value="${s}" ${s===asset?'selected':''}>${s}</option>`).join('')}</select></label><a href="./#agenda">تحقق من الأجندة</a><a href="intelligence.html">مختبر الأخبار</a></div><p class="ve-trust">المصدر: ${E(src?.mode||'غير متاح')} · تغذية منذ ${ageLabel(h)} · تطابق كلمات وليست قراءة لاتجاه السعر.</p>${invalid?warning('ملف الأخبار متأخر أو غير مؤرخ؛ لا تعتبر العناوين أحداثًا جارية أو محفزات تداول حديثة.'):''}<div class="ve-news-grid">${selected.map(x=>{const direct=x.match.hits.length>0;const url=/^https:\/\//.test(x.url||'')?x.url:'';return `<article class="ve-news-card"><div>${badge(direct?'مطابقة مباشرة':'سياق عام')}${badge(x.src||'مصدر غير مذكور')}</div><h3>${E(x.title||'خبر بلا عنوان')}</h3><p>${E((x.sum||'').slice(0,190))}</p><small>${E(dated(x.date))} · ${direct?'تطابق: '+E(x.match.hits.join('، ')):'تأثير غير محدد على هذا الأصل'}</small>${url?`<a href="${E(url)}" target="_blank" rel="noopener noreferrer">اقرأ المصدر الأصلي ↗</a>`:''}</article>`}).join('')||'<p>لا توجد عناوين مرتبطة بالكلمات المفتاحية المختارة في البيانات المتاحة.</p>'}</div><p class="ve-muted">ذكر USD أو الذهب في عنوان لا يعني تحرك السعر باتجاه معيّن. افحص توقيت الحدث والنتيجة الفعلية والسياق على الشارت، ولا تستخدم عنوان الخبر وحده للدخول.</p>`;
box.querySelector('#ve-news-asset')?.addEventListener('change',e=>{state.newsAsset=e.target.value;save();news(box)});}
function riskCalc(box){const vals={balance:num(document.getElementById('calc-balance')?.value),pct:num(document.getElementById('calc-risk-pct')?.value),stop:num(document.getElementById('calc-stop')?.value),pip:num(document.getElementById('calc-value')?.value),entry:num(document.getElementById('rr-entry')?.value),sl:num(document.getElementById('rr-stop')?.value),tp:num(document.getElementById('rr-take')?.value),dir:document.getElementById('rr-dir')?.value};
const spread=num(box.querySelector('#ve-cost')?.value),slip=num(box.querySelector('#ve-slip')?.value),fee=num(box.querySelector('#ve-fee')?.value);const out=box.querySelector('#ve-risk-results');if(!out)return;
if(!(vals.balance>0&&vals.pct>0&&vals.pct<=100&&vals.stop>0&&vals.pip>0&&spread>=0&&slip>=0&&fee>=0)) {out.innerHTML=warning('أدخل رصيدًا ومخاطرة ومسافة وقف وقيمة نقطة صحيحة في الحاسبة الأساسية، ثم أدخل تكاليف غير سالبة.');return;}
const planned=vals.balance*vals.pct/100,unitCost=vals.stop+spread+slip+fee/vals.pip;
const size=planned/(unitCost*vals.pip);const naive=planned/(vals.stop*vals.pip);
const actualIfNaive=naive*(unitCost*vals.pip),riskPct=actualIfNaive/vals.balance*100;
const rRisk=(vals.dir==='sell'?vals.sl-vals.entry:vals.entry-vals.sl),rGain=(vals.dir==='sell'?vals.entry-vals.tp:vals.tp-vals.entry),rr=[rRisk,rGain].every(Number.isFinite)&&rRisk>0&&rGain>0?rGain/rRisk:NaN;
const stressed=[1,2,3,5].map(n=>`<div><small>${n} خسائر متتالية عند المخاطرة المحددة، دون تغيير الحجم</small><strong dir="ltr">-${F(planned*n)} / ${F(100*planned*n/vals.balance)}%</strong></div>`).join('');
out.innerHTML=`<div class="ve-stat-grid"><div><small>الميزانية النقدية للمخاطرة</small><strong dir="ltr">${F(planned)}</strong></div><div><small>حجم تقديري بعد التكاليف المدخلة</small><strong dir="ltr">${F(size,5)}</strong></div><div><small>الخسارة المقدرة بالحجم الأساسي بعد إضافة التكاليف</small><strong dir="ltr">${F(actualIfNaive)} (${F(riskPct)}%)</strong></div><div><small>R:R المستويات الرقمية (دون تكاليف)</small><strong dir="ltr">${F(rr)}</strong></div></div><details><summary>اختبار تحمل سلسلة خسائر (سيناريو افتراضي ثابت)</summary><div class="ve-stat-grid">${stressed}</div></details><p class="ve-muted">مسافة الوقف والسبريد والانزلاق بوحدة النقطة/البيب نفسها، والعمولة بعملة الحساب **لكل لوت**. هذه تقديرات قبل التقريب لشروط اللوت الفعلية؛ لا يُفترض أن كل رمز له نفس قيمة النقطة أو الهامش. الانزلاق الحقيقي قد يزيد، والخسائر غير مضمونة التوقف عند هذه المبالغ.</p>`;}
function calculator(box){box.innerHTML=title('RISK STRESS TEST','اختبار حساسية المخاطرة والتكلفة','جرّب أثر السبريد والانزلاق والعمولة على حجم الصفقة، بدل الاعتماد على رقم اللوت النظري وحده.')+`<div class="ve-controls ve-three"><label>سبريد إضافي (نقاط/بيب)<input id="ve-cost" type="number" min="0" step="any" value="0" inputmode="decimal"></label><label>انزلاق مفترض (نقاط/بيب)<input id="ve-slip" type="number" min="0" step="any" value="0" inputmode="decimal"></label><label>عمولة تقديرية لكل لوت (عملة الحساب)<input id="ve-fee" type="number" min="0" step="any" value="0" inputmode="decimal"></label></div><div id="ve-risk-results" aria-live="polite"></div><p class="ve-muted">يستخدم القيم المدخلة في حاسبة حجم الصفقة أعلاه. لا يحفظ أرقام حسابك ولا يتصل بالوسيط.</p>`;
['ve-cost','ve-slip','ve-fee'].forEach(id=>box.querySelector('#'+id)?.addEventListener('input',()=>riskCalc(box)));
['calc-balance','calc-risk-pct','calc-stop','calc-value','rr-entry','rr-stop','rr-take','rr-dir'].forEach(id=>document.getElementById(id)?.addEventListener('input',()=>riskCalc(box)));riskCalc(box);}
function training(box){box.innerHTML=title('FIELD EXERCISE','بطاقة تطبيق الدرس على السوق','حوّل المعلومات التعليمية إلى فرضية قابلة للتفنيد، قبل أن تختبرها تاريخيًا في مختبر الأبحاث.')+`<div class="ve-controls ve-two"><label>الأصل<select id="ve-study-asset">${Object.keys(symMap).map(s=>`<option value="${s}" ${s===state.studyAsset?'selected':''}>${s}</option>`).join('')}</select></label><label>قاعدة الدخول المحددة مسبقًا<input id="ve-study-rule" maxlength="240" placeholder="مثال: سحب سيولة ثم MSS ثم عودة لـ FVG" value="${E(state.studyRule)}"></label><label>ما الذي يبطل الفرضية؟<textarea id="ve-study-invalidation" maxlength="500" rows="3" placeholder="مستوى أو شرط محدد">${E(state.studyInvalidation)}</textarea></label><label>ما الدليل المطلوب قبل اعتبارها قابلة للاختبار؟<textarea id="ve-study-evidence" maxlength="500" rows="3" placeholder="وقت، فريم، بيانات وتكاليف">${E(state.studyEvidence)}</textarea></label></div><div class="ve-controls"><button data-ve-study-save>حفظ بطاقة الدراسة</button><button data-ve-study-export>تصدير TXT</button><a href="research.html">انتقل لمختبر الأبحاث ↗</a></div><p class="ve-note" id="ve-study-status" aria-live="polite">${state.studyUpdated?'آخر حفظ: '+E(dated(state.studyUpdated)):'لم تُحفظ بطاقة بعد.'}</p><p class="ve-muted">بطاقة تدريب ذاتية تُحفظ في هذا المتصفح. لا تثبت صلاحية النموذج ولا تنقل صفقة حقيقية أو تُعد اختبارًا تاريخيًا.</p>`;
const fields=[['ve-study-asset','studyAsset'],['ve-study-rule','studyRule'],['ve-study-invalidation','studyInvalidation'],['ve-study-evidence','studyEvidence']];const pull=()=>fields.forEach(([id,k])=>{state[k]=box.querySelector('#'+id)?.value||''});
box.querySelector('[data-ve-study-save]')?.addEventListener('click',()=>{pull();state.studyUpdated=new Date().toISOString();save();box.querySelector('#ve-study-status').textContent='حُفظت البطاقة على هذا الجهاز: '+dated(state.studyUpdated)});
box.querySelector('[data-ve-study-export]')?.addEventListener('click',()=>{pull();const output=['ICT بالعربي — بطاقة تطبيق تعليمي',`الأصل: ${state.studyAsset}`,`قاعدة الدخول: ${state.studyRule}`,`شرط الإبطال: ${state.studyInvalidation}`,`الدليل المطلوب: ${state.studyEvidence}`,'بطاقة تدريب وليست توصية مالية.'].join('\n');const a=document.createElement('a');const url=URL.createObjectURL(new Blob([output],{type:'text/plain;charset=utf-8'}));a.href=url;a.download='ICT_Study_Card.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)});}
function mount(){const page=location.hash.slice(1);const type={markets:['markets',markets],news:['news',news],calculators:['risk',calculator],academy:['practice',training]}[page];if(!type||!root||document.getElementById('ve-'+type[0]))return;const box=insert(page,wrap(type[0],''));if(!box)return;const f=type[1];try{Promise.resolve(f(box)).catch(()=>{if(box.isConnected)box.innerHTML=warning('حدث خطأ في عرض الوحدة؛ ما زالت أدوات الصفحة الأصلية متاحة.')})}catch{box.innerHTML=warning('تعذر تحميل الوحدة؛ يمكنك استخدام القسم الأساسي كما كان.')}}
document.addEventListener('ict-view-rendered',mount);
if(document.readyState==='complete')mount();
else document.addEventListener('DOMContentLoaded',mount,{once:true});
})();
